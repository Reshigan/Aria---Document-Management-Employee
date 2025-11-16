from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/payslip-line/{line_id}/gl-posting-detail")
async def get_payslip_line_gl_posting_detail(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed GL posting information for a payslip line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        line_query = text("""
            SELECT 
                pl.id,
                pl.payslip_id,
                ps.payslip_number,
                ps.pay_period_start,
                ps.pay_period_end,
                ps.payment_date,
                pl.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                e.employee_number,
                pl.line_type,
                pl.description,
                pl.amount,
                pl.is_deduction,
                pl.account_id,
                coa.account_code,
                coa.account_name,
                pl.cost_center_id,
                cc.cost_center_code,
                cc.cost_center_name
            FROM payslip_lines pl
            JOIN payslips ps ON pl.payslip_id = ps.id
            JOIN employees e ON ps.employee_id = e.id
            LEFT JOIN chart_of_accounts coa ON pl.account_id = coa.id
            LEFT JOIN cost_centers cc ON pl.cost_center_id = cc.id
            WHERE pl.id = :line_id AND ps.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not line_result:
            raise HTTPException(status_code=404, detail="Payslip line not found")
        
        gl_query = text("""
            SELECT 
                jel.id,
                jel.journal_entry_id,
                je.entry_number,
                je.entry_date,
                jel.account_id,
                coa.account_code,
                coa.account_name,
                jel.debit_amount,
                jel.credit_amount,
                jel.description,
                je.posted_by,
                je.posted_at
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE je.source_document_type = 'PAYSLIP_LINE'
                AND je.source_document_id = :line_id
                AND je.company_id = :company_id
            ORDER BY jel.id
        """)
        
        gl_result = db.execute(gl_query, {
            "line_id": line_id,
            "company_id": company_id
        })
        
        gl_postings = []
        total_debit = 0
        total_credit = 0
        
        for row in gl_result.fetchall():
            debit = float(row[7]) if row[7] else 0
            credit = float(row[8]) if row[8] else 0
            total_debit += debit
            total_credit += credit
            
            gl_postings.append({
                "id": row[0],
                "journal_entry_id": row[1],
                "entry_number": row[2],
                "entry_date": str(row[3]) if row[3] else None,
                "account_id": row[4],
                "account_code": row[5],
                "account_name": row[6],
                "debit_amount": debit,
                "credit_amount": credit,
                "description": row[9],
                "posted_by": row[10],
                "posted_at": str(row[11]) if row[11] else None
            })
        
        tax_query = text("""
            SELECT 
                tw.id,
                tw.tax_type,
                tw.tax_rate,
                tw.taxable_amount,
                tw.tax_amount,
                tw.account_id,
                coa.account_code,
                coa.account_name
            FROM tax_withholdings tw
            LEFT JOIN chart_of_accounts coa ON tw.account_id = coa.id
            WHERE tw.payslip_line_id = :line_id
                AND tw.company_id = :company_id
        """)
        
        tax_result = db.execute(tax_query, {
            "line_id": line_id,
            "company_id": company_id
        })
        
        tax_withholdings = []
        for row in tax_result.fetchall():
            tax_withholdings.append({
                "id": row[0],
                "tax_type": row[1],
                "tax_rate": float(row[2]) if row[2] else 0,
                "taxable_amount": float(row[3]) if row[3] else 0,
                "tax_amount": float(row[4]) if row[4] else 0,
                "account_id": row[5],
                "account_code": row[6],
                "account_name": row[7]
            })
        
        benefit_query = text("""
            SELECT 
                ba.id,
                ba.benefit_type,
                ba.employer_contribution,
                ba.employee_contribution,
                ba.account_id,
                coa.account_code,
                coa.account_name
            FROM benefit_allocations ba
            LEFT JOIN chart_of_accounts coa ON ba.account_id = coa.id
            WHERE ba.payslip_line_id = :line_id
                AND ba.company_id = :company_id
        """)
        
        benefit_result = db.execute(benefit_query, {
            "line_id": line_id,
            "company_id": company_id
        })
        
        benefit_allocations = []
        for row in benefit_result.fetchall():
            benefit_allocations.append({
                "id": row[0],
                "benefit_type": row[1],
                "employer_contribution": float(row[2]) if row[2] else 0,
                "employee_contribution": float(row[3]) if row[3] else 0,
                "account_id": row[4],
                "account_code": row[5],
                "account_name": row[6]
            })
        
        return {
            "payslip_line": {
                "id": line_result[0],
                "payslip_id": line_result[1],
                "payslip_number": line_result[2],
                "pay_period_start": str(line_result[3]) if line_result[3] else None,
                "pay_period_end": str(line_result[4]) if line_result[4] else None,
                "payment_date": str(line_result[5]) if line_result[5] else None,
                "employee_id": line_result[6],
                "employee_name": line_result[7],
                "employee_number": line_result[8],
                "line_type": line_result[9],
                "description": line_result[10],
                "amount": float(line_result[11]) if line_result[11] else 0,
                "is_deduction": line_result[12],
                "account_id": line_result[13],
                "account_code": line_result[14],
                "account_name": line_result[15],
                "cost_center_id": line_result[16],
                "cost_center_code": line_result[17],
                "cost_center_name": line_result[18]
            },
            "gl_postings": gl_postings,
            "gl_summary": {
                "total_debit": total_debit,
                "total_credit": total_credit,
                "is_balanced": abs(total_debit - total_credit) < 0.01
            },
            "tax_withholdings": tax_withholdings,
            "benefit_allocations": benefit_allocations
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payslip-line/{line_id}/post-to-gl")
async def post_payslip_line_to_gl(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Post a payslip line to the general ledger"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        line_query = text("""
            SELECT 
                pl.amount,
                pl.is_deduction,
                pl.account_id,
                pl.description,
                ps.payment_date
            FROM payslip_lines pl
            JOIN payslips ps ON pl.payslip_id = ps.id
            WHERE pl.id = :line_id AND ps.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not line_result:
            raise HTTPException(status_code=404, detail="Payslip line not found")
        
        amount = float(line_result[0]) if line_result[0] else 0
        is_deduction = line_result[1]
        account_id = line_result[2]
        description = line_result[3]
        entry_date = line_result[4]
        
        # Create journal entry
        je_query = text("""
            INSERT INTO journal_entries (
                entry_number, entry_date, description,
                source_document_type, source_document_id,
                posted_by, posted_at, company_id, created_at
            ) VALUES (
                'JE-' || LPAD(NEXTVAL('journal_entry_seq')::TEXT, 8, '0'),
                :entry_date, :description,
                'PAYSLIP_LINE', :line_id,
                :posted_by, NOW(), :company_id, NOW()
            ) RETURNING id
        """)
        
        je_result = db.execute(je_query, {
            "entry_date": entry_date,
            "description": description,
            "line_id": line_id,
            "posted_by": user_email,
            "company_id": company_id
        })
        
        je_id = je_result.fetchone()[0]
        
        if is_deduction:
            jel_query = text("""
                INSERT INTO journal_entry_lines (
                    journal_entry_id, account_id, debit_amount, credit_amount,
                    description, company_id, created_at
                ) VALUES 
                (:je_id, :account_id, 0, :amount, :description, :company_id, NOW()),
                (:je_id, (SELECT id FROM chart_of_accounts WHERE account_code = '2100' AND company_id = :company_id LIMIT 1), :amount, 0, :description, :company_id, NOW())
            """)
        else:
            jel_query = text("""
                INSERT INTO journal_entry_lines (
                    journal_entry_id, account_id, debit_amount, credit_amount,
                    description, company_id, created_at
                ) VALUES 
                (:je_id, :account_id, :amount, 0, :description, :company_id, NOW()),
                (:je_id, (SELECT id FROM chart_of_accounts WHERE account_code = '2100' AND company_id = :company_id LIMIT 1), 0, :amount, :description, :company_id, NOW())
            """)
        
        db.execute(jel_query, {
            "je_id": je_id,
            "account_id": account_id,
            "amount": amount,
            "description": description,
            "company_id": company_id
        })
        
        db.commit()
        
        return {
            "message": "Payslip line posted to GL successfully",
            "journal_entry_id": je_id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
