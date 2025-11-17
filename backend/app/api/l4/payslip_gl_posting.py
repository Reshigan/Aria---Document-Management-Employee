"""
L4 API: Payslip GL Posting
Tracks GL postings generated from payslips
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from datetime import date

try:
    from core.database import get_db
except ImportError:
    try:
        from auth import get_db
    except ImportError:
        import sys
        sys.path.insert(0, '/var/www/aria/backend')
        from auth import get_db

try:
    from core.auth import get_current_user
except ImportError:
    try:
        from app.auth import get_current_user
    except ImportError:
        from auth_integrated import get_current_user

router = APIRouter()


@router.get("/payslip/{payslip_id}/gl-postings")
async def list_payslip_gl_postings(
    payslip_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all GL postings for a specific payslip"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                je.id as journal_entry_id,
                je.entry_number,
                je.entry_date,
                jel.id as line_id,
                jel.account_id,
                coa.account_code,
                coa.account_name,
                jel.debit_amount,
                jel.credit_amount,
                jel.description
            FROM journal_entries je
            JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
            LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE je.source_document_type = 'PAYSLIP'
                AND je.source_document_id = :payslip_id
                AND je.company_id = :company_id
            ORDER BY jel.id
        """)
        
        result = db.execute(query, {
            "payslip_id": payslip_id,
            "company_id": company_id
        })
        
        postings = []
        for row in result.fetchall():
            postings.append({
                "journal_entry_id": row[0],
                "entry_number": row[1],
                "entry_date": str(row[2]) if row[2] else None,
                "line_id": row[3],
                "account_id": row[4],
                "account_code": row[5],
                "account_name": row[6],
                "debit_amount": float(row[7]) if row[7] else 0,
                "credit_amount": float(row[8]) if row[8] else 0,
                "description": row[9]
            })
        
        return {"postings": postings, "count": len(postings)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payslip-gl-posting/{line_id}")
async def get_payslip_gl_posting(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a specific payslip GL posting line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                jel.id,
                je.id as journal_entry_id,
                je.entry_number,
                je.entry_date,
                je.source_document_id as payslip_id,
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
            LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE jel.id = :line_id 
                AND je.source_document_type = 'PAYSLIP'
                AND je.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Payslip GL posting not found")
        
        return {
            "posting": {
                "id": result[0],
                "journal_entry_id": result[1],
                "entry_number": result[2],
                "entry_date": str(result[3]) if result[3] else None,
                "payslip_id": result[4],
                "account_id": result[5],
                "account_code": result[6],
                "account_name": result[7],
                "debit_amount": float(result[8]) if result[8] else 0,
                "credit_amount": float(result[9]) if result[9] else 0,
                "description": result[10],
                "posted_by": result[11],
                "posted_at": str(result[12]) if result[12] else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payslip/{payslip_id}/generate-gl-postings")
async def generate_payslip_gl_postings(
    payslip_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Generate GL postings for a payslip"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        payslip_query = text("""
            SELECT id, gross_pay, payment_date
            FROM payslips
            WHERE id = :payslip_id AND company_id = :company_id
        """)
        
        payslip_result = db.execute(payslip_query, {
            "payslip_id": payslip_id,
            "company_id": company_id
        }).fetchone()
        
        if not payslip_result:
            raise HTTPException(status_code=404, detail="Payslip not found")
        
        gross_pay = float(payslip_result[1]) if payslip_result[1] else 0
        payment_date = payslip_result[2]
        
        # Create journal entry
        je_query = text("""
            INSERT INTO journal_entries (
                entry_number, entry_date, description,
                source_document_type, source_document_id,
                posted_by, posted_at, company_id, created_at
            ) VALUES (
                'JE-PS-' || :payslip_id,
                :entry_date, 'Payslip GL Posting',
                'PAYSLIP', :payslip_id,
                :posted_by, NOW(), :company_id, NOW()
            ) RETURNING id
        """)
        
        je_result = db.execute(je_query, {
            "payslip_id": payslip_id,
            "entry_date": payment_date,
            "posted_by": user_email,
            "company_id": company_id
        })
        
        journal_entry_id = je_result.fetchone()[0]
        
        lines_query = text("""
            INSERT INTO journal_entry_lines (
                journal_entry_id, account_id, debit_amount, credit_amount,
                description, company_id, created_at
            ) VALUES 
            (:je_id, (SELECT id FROM chart_of_accounts WHERE account_code = '6100' AND company_id = :company_id LIMIT 1), :amount, 0, 'Salary Expense', :company_id, NOW()),
            (:je_id, (SELECT id FROM chart_of_accounts WHERE account_code = '2100' AND company_id = :company_id LIMIT 1), 0, :amount, 'Salaries Payable', :company_id, NOW())
        """)
        
        db.execute(lines_query, {
            "je_id": journal_entry_id,
            "amount": gross_pay,
            "company_id": company_id
        })
        
        db.commit()
        
        return {
            "message": "GL postings generated successfully",
            "journal_entry_id": journal_entry_id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "payslip_gl_posting"}
