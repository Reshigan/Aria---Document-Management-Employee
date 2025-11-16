from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

try:
    from app.auth import get_db, get_current_user
except ImportError:
    try:
        from auth_integrated import get_db, get_current_user
    except ImportError:
        from core.database_pg import SessionLocal
        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        from auth_integrated import get_current_user

router = APIRouter()


@router.get("/payroll-run/{run_id}/gl-posting-preview")
async def get_payroll_gl_posting_preview(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get GL posting preview for a payroll run"""
    try:
        company_id = current_user.get("company_id", "default")
        
        run_query = text("""
            SELECT 
                pr.run_number,
                pr.pay_period_start,
                pr.pay_period_end,
                pr.payment_date,
                pr.status
            FROM payroll_runs pr
            WHERE pr.id = :run_id AND pr.company_id = :company_id
        """)
        
        run_result = db.execute(run_query, {
            "run_id": run_id,
            "company_id": company_id
        }).fetchone()
        
        if not run_result:
            raise HTTPException(status_code=404, detail="Payroll run not found")
        
        lines_query = text("""
            SELECT 
                pgp.account_id,
                coa.account_code,
                coa.account_name,
                pgp.debit_amount,
                pgp.credit_amount,
                pgp.description,
                pgp.cost_center_id,
                cc.name as cost_center_name
            FROM payroll_gl_postings pgp
            JOIN chart_of_accounts coa ON pgp.account_id = coa.id
            LEFT JOIN cost_centers cc ON pgp.cost_center_id = cc.id
            WHERE pgp.payroll_run_id = :run_id AND pgp.company_id = :company_id
            ORDER BY coa.account_code
        """)
        
        lines_result = db.execute(lines_query, {
            "run_id": run_id,
            "company_id": company_id
        })
        
        lines = []
        total_debits = 0
        total_credits = 0
        
        for row in lines_result.fetchall():
            debit = float(row[3]) if row[3] else 0
            credit = float(row[4]) if row[4] else 0
            
            total_debits += debit
            total_credits += credit
            
            lines.append({
                "account_id": row[0],
                "account_code": row[1],
                "account_name": row[2],
                "debit_amount": debit,
                "credit_amount": credit,
                "description": row[5],
                "cost_center_id": row[6],
                "cost_center_name": row[7]
            })
        
        return {
            "payroll_run": {
                "run_number": run_result[0],
                "pay_period_start": str(run_result[1]) if run_result[1] else None,
                "pay_period_end": str(run_result[2]) if run_result[2] else None,
                "payment_date": str(run_result[3]) if run_result[3] else None,
                "status": run_result[4]
            },
            "gl_posting_lines": lines,
            "summary": {
                "total_lines": len(lines),
                "total_debits": total_debits,
                "total_credits": total_credits,
                "difference": abs(total_debits - total_credits),
                "is_balanced": abs(total_debits - total_credits) < 0.01
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payroll-run/{run_id}/generate-gl-postings")
async def generate_payroll_gl_postings(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Generate GL postings for a payroll run"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        delete_query = text("""
            DELETE FROM payroll_gl_postings
            WHERE payroll_run_id = :run_id AND company_id = :company_id
        """)
        
        db.execute(delete_query, {"run_id": run_id, "company_id": company_id})
        
        summary_query = text("""
            SELECT 
                ps.employee_id,
                e.department_id,
                SUM(ps.gross_pay) as total_gross,
                SUM(ps.total_deductions) as total_deductions,
                SUM(ps.net_pay) as total_net
            FROM payslips ps
            JOIN employees e ON ps.employee_id = e.id
            WHERE ps.payroll_run_id = :run_id AND ps.company_id = :company_id
            GROUP BY ps.employee_id, e.department_id
        """)
        
        summary_result = db.execute(summary_query, {
            "run_id": run_id,
            "company_id": company_id
        })
        
        for row in summary_result.fetchall():
            employee_id = row[0]
            department_id = row[1]
            gross_pay = float(row[2]) if row[2] else 0
            deductions = float(row[3]) if row[3] else 0
            net_pay = float(row[4]) if row[4] else 0
            
            insert_query = text("""
                INSERT INTO payroll_gl_postings (
                    payroll_run_id, account_id, debit_amount, credit_amount,
                    description, cost_center_id, company_id, created_by, created_at
                ) VALUES (
                    :payroll_run_id, 
                    (SELECT id FROM chart_of_accounts WHERE account_code = '6100' AND company_id = :company_id LIMIT 1),
                    :gross_pay, 0,
                    'Salary Expense',
                    :cost_center_id, :company_id, :created_by, NOW()
                )
            """)
            
            db.execute(insert_query, {
                "payroll_run_id": run_id,
                "gross_pay": gross_pay,
                "cost_center_id": department_id,
                "company_id": company_id,
                "created_by": user_email
            })
            
            insert_query = text("""
                INSERT INTO payroll_gl_postings (
                    payroll_run_id, account_id, debit_amount, credit_amount,
                    description, cost_center_id, company_id, created_by, created_at
                ) VALUES (
                    :payroll_run_id,
                    (SELECT id FROM chart_of_accounts WHERE account_code = '2100' AND company_id = :company_id LIMIT 1),
                    0, :net_pay,
                    'Payroll Payable',
                    :cost_center_id, :company_id, :created_by, NOW()
                )
            """)
            
            db.execute(insert_query, {
                "payroll_run_id": run_id,
                "net_pay": net_pay,
                "cost_center_id": department_id,
                "company_id": company_id,
                "created_by": user_email
            })
            
            if deductions > 0:
                insert_query = text("""
                    INSERT INTO payroll_gl_postings (
                        payroll_run_id, account_id, debit_amount, credit_amount,
                        description, cost_center_id, company_id, created_by, created_at
                    ) VALUES (
                        :payroll_run_id,
                        (SELECT id FROM chart_of_accounts WHERE account_code = '2200' AND company_id = :company_id LIMIT 1),
                        0, :deductions,
                        'Tax Payable',
                        :cost_center_id, :company_id, :created_by, NOW()
                    )
                """)
                
                db.execute(insert_query, {
                    "payroll_run_id": run_id,
                    "deductions": deductions,
                    "cost_center_id": department_id,
                    "company_id": company_id,
                    "created_by": user_email
                })
        
        db.commit()
        
        return {"message": "GL postings generated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payroll-run/{run_id}/post-to-gl")
async def post_payroll_to_gl(
    run_id: int,
    posting_date: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Post payroll to general ledger"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        check_query = text("""
            SELECT gl_posted
            FROM payroll_runs
            WHERE id = :run_id AND company_id = :company_id
        """)
        
        check_result = db.execute(check_query, {
            "run_id": run_id,
            "company_id": company_id
        }).fetchone()
        
        if not check_result:
            raise HTTPException(status_code=404, detail="Payroll run not found")
        
        if check_result[0]:
            raise HTTPException(status_code=400, detail="Payroll run already posted to GL")
        
        run_query = text("""
            SELECT run_number
            FROM payroll_runs
            WHERE id = :run_id AND company_id = :company_id
        """)
        
        run_result = db.execute(run_query, {
            "run_id": run_id,
            "company_id": company_id
        }).fetchone()
        
        run_number = run_result[0]
        
        # Create journal entry
        je_query = text("""
            INSERT INTO journal_entries (
                entry_number, entry_date, description, status,
                company_id, created_by, created_at
            ) VALUES (
                'JE-PAY-' || :run_number,
                :posting_date,
                'Payroll Posting - ' || :run_number,
                'POSTED',
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        je_result = db.execute(je_query, {
            "run_number": run_number,
            "posting_date": posting_date,
            "company_id": company_id,
            "created_by": user_email
        })
        
        je_id = je_result.fetchone()[0]
        
        postings_query = text("""
            SELECT 
                account_id,
                debit_amount,
                credit_amount,
                description,
                cost_center_id
            FROM payroll_gl_postings
            WHERE payroll_run_id = :run_id AND company_id = :company_id
        """)
        
        postings_result = db.execute(postings_query, {
            "run_id": run_id,
            "company_id": company_id
        })
        
        line_number = 1
        for row in postings_result.fetchall():
            jel_query = text("""
                INSERT INTO journal_entry_lines (
                    journal_entry_id, line_number, account_id,
                    debit_amount, credit_amount, description,
                    cost_center_id, company_id, created_by, created_at
                ) VALUES (
                    :journal_entry_id, :line_number, :account_id,
                    :debit_amount, :credit_amount, :description,
                    :cost_center_id, :company_id, :created_by, NOW()
                )
            """)
            
            db.execute(jel_query, {
                "journal_entry_id": je_id,
                "line_number": line_number,
                "account_id": row[0],
                "debit_amount": row[1],
                "credit_amount": row[2],
                "description": row[3],
                "cost_center_id": row[4],
                "company_id": company_id,
                "created_by": user_email
            })
            
            line_number += 1
        
        update_query = text("""
            UPDATE payroll_runs
            SET 
                gl_posted = true,
                gl_journal_entry_id = :je_id,
                updated_at = NOW()
            WHERE id = :run_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "je_id": je_id,
            "run_id": run_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {
            "message": "Payroll posted to GL successfully",
            "journal_entry_id": je_id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payroll-run/{run_id}/gl-posting-status")
async def get_payroll_gl_posting_status(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get GL posting status for a payroll run"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                pr.gl_posted,
                pr.gl_journal_entry_id,
                je.entry_number,
                je.entry_date
            FROM payroll_runs pr
            LEFT JOIN journal_entries je ON pr.gl_journal_entry_id = je.id
            WHERE pr.id = :run_id AND pr.company_id = :company_id
        """)
        
        result = db.execute(query, {"run_id": run_id, "company_id": company_id})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Payroll run not found")
        
        return {
            "gl_posted": row[0] if row[0] else False,
            "journal_entry_id": row[1],
            "journal_entry_number": row[2],
            "posting_date": str(row[3]) if row[3] else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payroll-gl-postings/summary")
async def get_payroll_gl_postings_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get summary of payroll GL postings"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["pr.company_id = :company_id"]
        params = {"company_id": company_id}
        
        if start_date:
            where_clauses.append("pr.payment_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("pr.payment_date <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                coa.account_code,
                coa.account_name,
                SUM(pgp.debit_amount) as total_debits,
                SUM(pgp.credit_amount) as total_credits
            FROM payroll_gl_postings pgp
            JOIN payroll_runs pr ON pgp.payroll_run_id = pr.id
            JOIN chart_of_accounts coa ON pgp.account_id = coa.id
            WHERE {where_clause}
            GROUP BY coa.account_code, coa.account_name
            ORDER BY coa.account_code
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        summary = []
        for row in rows:
            summary.append({
                "account_code": row[0],
                "account_name": row[1],
                "total_debits": float(row[2]) if row[2] else 0,
                "total_credits": float(row[3]) if row[3] else 0
            })
        
        return {"payroll_gl_summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
