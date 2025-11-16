from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/journal-entry-line/{line_id}/atomic-detail")
async def get_journal_entry_line_atomic_detail(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single journal entry line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        line_query = text("""
            SELECT 
                jel.id,
                jel.journal_entry_id,
                je.entry_number,
                je.entry_date,
                je.description as entry_description,
                jel.account_id,
                coa.account_code,
                coa.account_name,
                coa.account_type,
                jel.debit_amount,
                jel.credit_amount,
                jel.description as line_description,
                jel.cost_center_id,
                cc.cost_center_code,
                cc.cost_center_name,
                je.source_document_type,
                je.source_document_id,
                je.posted_by,
                je.posted_at,
                jel.created_at
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            LEFT JOIN cost_centers cc ON jel.cost_center_id = cc.id
            WHERE jel.id = :line_id AND je.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not line_result:
            raise HTTPException(status_code=404, detail="Journal entry line not found")
        
        related_lines_query = text("""
            SELECT 
                jel.id,
                jel.account_id,
                coa.account_code,
                coa.account_name,
                jel.debit_amount,
                jel.credit_amount,
                jel.description
            FROM journal_entry_lines jel
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE jel.journal_entry_id = :journal_entry_id
                AND jel.id != :line_id
            ORDER BY jel.id
        """)
        
        related_result = db.execute(related_lines_query, {
            "journal_entry_id": line_result[1],
            "line_id": line_id
        })
        
        related_lines = []
        for row in related_result.fetchall():
            related_lines.append({
                "id": row[0],
                "account_id": row[1],
                "account_code": row[2],
                "account_name": row[3],
                "debit_amount": float(row[4]) if row[4] else 0,
                "credit_amount": float(row[5]) if row[5] else 0,
                "description": row[6]
            })
        
        drill_back_chain = []
        source_type = line_result[15]
        source_id = line_result[16]
        
        drill_back_chain.append({
            "level": "JOURNAL_ENTRY_LINE",
            "id": line_result[0],
            "reference": line_result[2]
        })
        
        drill_back_chain.append({
            "level": "JOURNAL_ENTRY",
            "id": line_result[1],
            "reference": line_result[2]
        })
        
        if source_type and source_id:
            drill_back_chain.append({
                "level": source_type,
                "id": source_id,
                "reference": None
            })
        
        balance_query = text("""
            SELECT 
                SUM(CASE 
                    WHEN coa.normal_balance = 'DEBIT' THEN jel.debit_amount - jel.credit_amount
                    ELSE jel.credit_amount - jel.debit_amount
                END) as account_balance
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE jel.account_id = :account_id
                AND je.entry_date <= :entry_date
                AND je.company_id = :company_id
        """)
        
        balance_result = db.execute(balance_query, {
            "account_id": line_result[5],
            "entry_date": line_result[3],
            "company_id": company_id
        }).fetchone()
        
        account_balance = float(balance_result[0]) if balance_result and balance_result[0] else 0
        
        return {
            "journal_entry_line": {
                "id": line_result[0],
                "journal_entry_id": line_result[1],
                "entry_number": line_result[2],
                "entry_date": str(line_result[3]) if line_result[3] else None,
                "entry_description": line_result[4],
                "account_id": line_result[5],
                "account_code": line_result[6],
                "account_name": line_result[7],
                "account_type": line_result[8],
                "debit_amount": float(line_result[9]) if line_result[9] else 0,
                "credit_amount": float(line_result[10]) if line_result[10] else 0,
                "line_description": line_result[11],
                "cost_center_id": line_result[12],
                "cost_center_code": line_result[13],
                "cost_center_name": line_result[14],
                "source_document_type": source_type,
                "source_document_id": source_id,
                "posted_by": line_result[17],
                "posted_at": str(line_result[18]) if line_result[18] else None,
                "created_at": str(line_result[19]) if line_result[19] else None
            },
            "related_lines": related_lines,
            "drill_back_chain": drill_back_chain,
            "account_balance_after_posting": account_balance
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
