from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class PayslipLineCreate(BaseModel):
    payslip_id: int
    line_type: str  # EARNING, DEDUCTION, TAX, BENEFIT
    code: str
    description: str
    amount: float
    is_taxable: bool = False


@router.get("/payslip/{payslip_id}/breakdown")
async def get_payslip_breakdown(
    payslip_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed breakdown of a payslip"""
    try:
        company_id = current_user.get("company_id", "default")
        
        payslip_query = text("""
            SELECT 
                ps.payslip_number,
                ps.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                e.employee_number,
                ps.pay_period_start,
                ps.pay_period_end,
                ps.payment_date,
                ps.gross_pay,
                ps.total_deductions,
                ps.net_pay,
                ps.status
            FROM payslips ps
            JOIN employees e ON ps.employee_id = e.id
            WHERE ps.id = :payslip_id AND ps.company_id = :company_id
        """)
        
        payslip_result = db.execute(payslip_query, {
            "payslip_id": payslip_id,
            "company_id": company_id
        }).fetchone()
        
        if not payslip_result:
            raise HTTPException(status_code=404, detail="Payslip not found")
        
        lines_query = text("""
            SELECT 
                psl.id,
                psl.line_number,
                psl.line_type,
                psl.code,
                psl.description,
                psl.amount,
                psl.is_taxable,
                psl.notes
            FROM payslip_lines psl
            JOIN payslips ps ON psl.payslip_id = ps.id
            WHERE ps.id = :payslip_id AND ps.company_id = :company_id
            ORDER BY 
                CASE psl.line_type
                    WHEN 'EARNING' THEN 1
                    WHEN 'BENEFIT' THEN 2
                    WHEN 'DEDUCTION' THEN 3
                    WHEN 'TAX' THEN 4
                    ELSE 5
                END,
                psl.line_number
        """)
        
        lines_result = db.execute(lines_query, {
            "payslip_id": payslip_id,
            "company_id": company_id
        })
        
        earnings = []
        deductions = []
        taxes = []
        benefits = []
        
        total_earnings = 0
        total_deductions = 0
        total_taxes = 0
        total_benefits = 0
        
        for row in lines_result.fetchall():
            line_data = {
                "id": row[0],
                "line_number": row[1],
                "line_type": row[2],
                "code": row[3],
                "description": row[4],
                "amount": float(row[5]) if row[5] else 0,
                "is_taxable": row[6],
                "notes": row[7]
            }
            
            amount = float(row[5]) if row[5] else 0
            
            if row[2] == "EARNING":
                earnings.append(line_data)
                total_earnings += amount
            elif row[2] == "DEDUCTION":
                deductions.append(line_data)
                total_deductions += amount
            elif row[2] == "TAX":
                taxes.append(line_data)
                total_taxes += amount
            elif row[2] == "BENEFIT":
                benefits.append(line_data)
                total_benefits += amount
        
        return {
            "payslip": {
                "payslip_number": payslip_result[0],
                "employee_id": payslip_result[1],
                "employee_name": payslip_result[2],
                "employee_number": payslip_result[3],
                "pay_period_start": str(payslip_result[4]) if payslip_result[4] else None,
                "pay_period_end": str(payslip_result[5]) if payslip_result[5] else None,
                "payment_date": str(payslip_result[6]) if payslip_result[6] else None,
                "gross_pay": float(payslip_result[7]) if payslip_result[7] else 0,
                "total_deductions": float(payslip_result[8]) if payslip_result[8] else 0,
                "net_pay": float(payslip_result[9]) if payslip_result[9] else 0,
                "status": payslip_result[10]
            },
            "earnings": earnings,
            "benefits": benefits,
            "deductions": deductions,
            "taxes": taxes,
            "totals": {
                "total_earnings": total_earnings,
                "total_benefits": total_benefits,
                "total_deductions": total_deductions,
                "total_taxes": total_taxes,
                "gross_pay": total_earnings + total_benefits,
                "net_pay": total_earnings + total_benefits - total_deductions - total_taxes
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employee/{employee_id}/payslip-history")
async def get_employee_payslip_history(
    employee_id: int,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get payslip history for an employee"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["ps.company_id = :company_id", "ps.employee_id = :employee_id"]
        params = {"company_id": company_id, "employee_id": employee_id}
        
        if year:
            where_clauses.append("EXTRACT(YEAR FROM ps.pay_period_end) = :year")
            params["year"] = year
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                ps.id,
                ps.payslip_number,
                ps.pay_period_start,
                ps.pay_period_end,
                ps.payment_date,
                ps.gross_pay,
                ps.total_deductions,
                ps.net_pay,
                ps.status
            FROM payslips ps
            WHERE {where_clause}
            ORDER BY ps.pay_period_end DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        payslips = []
        ytd_gross = 0
        ytd_deductions = 0
        ytd_net = 0
        
        for row in rows:
            gross = float(row[5]) if row[5] else 0
            deductions = float(row[6]) if row[6] else 0
            net = float(row[7]) if row[7] else 0
            
            ytd_gross += gross
            ytd_deductions += deductions
            ytd_net += net
            
            payslips.append({
                "id": row[0],
                "payslip_number": row[1],
                "pay_period_start": str(row[2]) if row[2] else None,
                "pay_period_end": str(row[3]) if row[3] else None,
                "payment_date": str(row[4]) if row[4] else None,
                "gross_pay": gross,
                "total_deductions": deductions,
                "net_pay": net,
                "status": row[8]
            })
        
        return {
            "payslips": payslips,
            "ytd_totals": {
                "ytd_gross": ytd_gross,
                "ytd_deductions": ytd_deductions,
                "ytd_net": ytd_net
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payslip/{payslip_id}/line")
async def add_payslip_line(
    payslip_id: int,
    line: PayslipLineCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a line to a payslip"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        line_query = text("""
            SELECT COALESCE(MAX(line_number), 0) + 1
            FROM payslip_lines psl
            JOIN payslips ps ON psl.payslip_id = ps.id
            WHERE ps.id = :payslip_id AND ps.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {"payslip_id": payslip_id, "company_id": company_id}).fetchone()
        next_line = line_result[0] if line_result else 1
        
        insert_query = text("""
            INSERT INTO payslip_lines (
                payslip_id, line_number, line_type, code, description,
                amount, is_taxable, company_id, created_by, created_at
            ) VALUES (
                :payslip_id, :line_number, :line_type, :code, :description,
                :amount, :is_taxable, :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "payslip_id": payslip_id,
            "line_number": next_line,
            "line_type": line.line_type,
            "code": line.code,
            "description": line.description,
            "amount": line.amount,
            "is_taxable": line.is_taxable,
            "company_id": company_id,
            "created_by": user_email
        })
        
        recalc_query = text("""
            UPDATE payslips ps
            SET 
                gross_pay = (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM payslip_lines
                    WHERE payslip_id = ps.id AND line_type IN ('EARNING', 'BENEFIT')
                ),
                total_deductions = (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM payslip_lines
                    WHERE payslip_id = ps.id AND line_type IN ('DEDUCTION', 'TAX')
                ),
                net_pay = (
                    SELECT COALESCE(SUM(CASE WHEN line_type IN ('EARNING', 'BENEFIT') THEN amount ELSE -amount END), 0)
                    FROM payslip_lines
                    WHERE payslip_id = ps.id
                ),
                updated_at = NOW()
            WHERE ps.id = :payslip_id AND ps.company_id = :company_id
        """)
        
        db.execute(recalc_query, {"payslip_id": payslip_id, "company_id": company_id})
        
        db.commit()
        line_id = result.fetchone()[0]
        
        return {"id": line_id, "message": "Payslip line added successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/payslip-line/{line_id}")
async def delete_payslip_line(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a payslip line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        get_query = text("""
            SELECT psl.payslip_id
            FROM payslip_lines psl
            JOIN payslips ps ON psl.payslip_id = ps.id
            WHERE psl.id = :line_id AND ps.company_id = :company_id
        """)
        
        payslip_result = db.execute(get_query, {"line_id": line_id, "company_id": company_id}).fetchone()
        
        if not payslip_result:
            raise HTTPException(status_code=404, detail="Payslip line not found")
        
        payslip_id = payslip_result[0]
        
        delete_query = text("""
            DELETE FROM payslip_lines psl
            USING payslips ps
            WHERE psl.payslip_id = ps.id
                AND psl.id = :line_id
                AND ps.company_id = :company_id
        """)
        
        db.execute(delete_query, {"line_id": line_id, "company_id": company_id})
        
        recalc_query = text("""
            UPDATE payslips ps
            SET 
                gross_pay = (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM payslip_lines
                    WHERE payslip_id = ps.id AND line_type IN ('EARNING', 'BENEFIT')
                ),
                total_deductions = (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM payslip_lines
                    WHERE payslip_id = ps.id AND line_type IN ('DEDUCTION', 'TAX')
                ),
                net_pay = (
                    SELECT COALESCE(SUM(CASE WHEN line_type IN ('EARNING', 'BENEFIT') THEN amount ELSE -amount END), 0)
                    FROM payslip_lines
                    WHERE payslip_id = ps.id
                ),
                updated_at = NOW()
            WHERE ps.id = :payslip_id AND ps.company_id = :company_id
        """)
        
        db.execute(recalc_query, {"payslip_id": payslip_id, "company_id": company_id})
        
        db.commit()
        
        return {"message": "Payslip line deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
