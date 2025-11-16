from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class JournalLineCreate(BaseModel):
    journal_entry_id: int
    account_id: int
    debit: float = 0
    credit: float = 0
    description: Optional[str] = None
    cost_center: Optional[str] = None
    project_code: Optional[str] = None


@router.get("/journal-entry/{entry_id}/lines")
async def get_journal_entry_lines(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all lines for a journal entry with drill-down to source documents"""
    try:
        company_id = current_user.get("company_id", "default")
        
        header_query = text("""
            SELECT 
                je.entry_number,
                je.entry_date,
                je.description,
                je.status,
                je.posted_date,
                je.posted_by,
                je.source_type,
                je.source_id,
                je.source_number
            FROM journal_entries je
            WHERE je.id = :entry_id AND je.company_id = :company_id
        """)
        
        header_result = db.execute(header_query, {
            "entry_id": entry_id,
            "company_id": company_id
        }).fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        lines_query = text("""
            SELECT 
                jel.id,
                jel.line_number,
                jel.account_id,
                coa.account_code,
                coa.account_name,
                coa.account_type,
                jel.debit,
                jel.credit,
                jel.description,
                jel.cost_center,
                jel.project_code,
                jel.reference,
                jel.created_by,
                jel.created_at
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE je.id = :entry_id AND je.company_id = :company_id
            ORDER BY jel.line_number
        """)
        
        lines_result = db.execute(lines_query, {
            "entry_id": entry_id,
            "company_id": company_id
        })
        
        lines = []
        total_debit = 0
        total_credit = 0
        
        for row in lines_result.fetchall():
            debit = float(row[6]) if row[6] else 0
            credit = float(row[7]) if row[7] else 0
            total_debit += debit
            total_credit += credit
            
            lines.append({
                "id": row[0],
                "line_number": row[1],
                "account_id": row[2],
                "account_code": row[3],
                "account_name": row[4],
                "account_type": row[5],
                "debit": debit,
                "credit": credit,
                "description": row[8],
                "cost_center": row[9],
                "project_code": row[10],
                "reference": row[11],
                "created_by": row[12],
                "created_at": str(row[13]) if row[13] else None
            })
        
        return {
            "journal_entry": {
                "entry_number": header_result[0],
                "entry_date": str(header_result[1]) if header_result[1] else None,
                "description": header_result[2],
                "status": header_result[3],
                "posted_date": str(header_result[4]) if header_result[4] else None,
                "posted_by": header_result[5],
                "source_type": header_result[6],
                "source_id": header_result[7],
                "source_number": header_result[8]
            },
            "lines": lines,
            "totals": {
                "total_debit": total_debit,
                "total_credit": total_credit,
                "balanced": abs(total_debit - total_credit) < 0.01
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/journal-entry/{entry_id}/source-document")
async def get_source_document(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get source document details for a journal entry (drill-down)"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                je.source_type,
                je.source_id,
                je.source_number
            FROM journal_entries je
            WHERE je.id = :entry_id AND je.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "entry_id": entry_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        source_type = result[0]
        source_id = result[1]
        source_number = result[2]
        
        if not source_type or not source_id:
            return {
                "source_type": None,
                "source_id": None,
                "source_number": None,
                "source_document": None
            }
        
        source_document = None
        
        if source_type == "CUSTOMER_INVOICE":
            doc_query = text("""
                SELECT 
                    ci.invoice_number,
                    ci.invoice_date,
                    ci.customer_id,
                    c.name as customer_name,
                    ci.total_amount,
                    ci.status
                FROM customer_invoices ci
                JOIN customers c ON ci.customer_id = c.id
                WHERE ci.id = :source_id AND ci.company_id = :company_id
            """)
            doc_result = db.execute(doc_query, {"source_id": source_id, "company_id": company_id}).fetchone()
            
            if doc_result:
                source_document = {
                    "invoice_number": doc_result[0],
                    "invoice_date": str(doc_result[1]) if doc_result[1] else None,
                    "customer_id": doc_result[2],
                    "customer_name": doc_result[3],
                    "total_amount": float(doc_result[4]) if doc_result[4] else 0,
                    "status": doc_result[5]
                }
        
        elif source_type == "AP_INVOICE":
            doc_query = text("""
                SELECT 
                    ai.invoice_number,
                    ai.invoice_date,
                    ai.supplier_id,
                    s.name as supplier_name,
                    ai.total_amount,
                    ai.status
                FROM ap_invoices ai
                JOIN suppliers s ON ai.supplier_id = s.id
                WHERE ai.id = :source_id AND ai.company_id = :company_id
            """)
            doc_result = db.execute(doc_query, {"source_id": source_id, "company_id": company_id}).fetchone()
            
            if doc_result:
                source_document = {
                    "invoice_number": doc_result[0],
                    "invoice_date": str(doc_result[1]) if doc_result[1] else None,
                    "supplier_id": doc_result[2],
                    "supplier_name": doc_result[3],
                    "total_amount": float(doc_result[4]) if doc_result[4] else 0,
                    "status": doc_result[5]
                }
        
        elif source_type == "PAYMENT":
            doc_query = text("""
                SELECT 
                    cp.payment_number,
                    cp.payment_date,
                    cp.customer_id,
                    c.name as customer_name,
                    cp.amount,
                    cp.payment_method
                FROM customer_payments cp
                JOIN customers c ON cp.customer_id = c.id
                WHERE cp.id = :source_id AND cp.company_id = :company_id
            """)
            doc_result = db.execute(doc_query, {"source_id": source_id, "company_id": company_id}).fetchone()
            
            if doc_result:
                source_document = {
                    "payment_number": doc_result[0],
                    "payment_date": str(doc_result[1]) if doc_result[1] else None,
                    "customer_id": doc_result[2],
                    "customer_name": doc_result[3],
                    "amount": float(doc_result[4]) if doc_result[4] else 0,
                    "payment_method": doc_result[5]
                }
        
        return {
            "source_type": source_type,
            "source_id": source_id,
            "source_number": source_number,
            "source_document": source_document
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/account/{account_id}/ledger")
async def get_account_ledger(
    account_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get general ledger for an account with drill-down to journal entries"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["je.company_id = :company_id", "jel.account_id = :account_id", "je.status = 'POSTED'"]
        params = {"company_id": company_id, "account_id": account_id}
        
        if start_date:
            where_clauses.append("je.entry_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("je.entry_date <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                jel.id,
                je.entry_number,
                je.entry_date,
                je.description,
                jel.debit,
                jel.credit,
                jel.description as line_description,
                je.source_type,
                je.source_number,
                je.id as journal_entry_id
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            WHERE {where_clause}
            ORDER BY je.entry_date, je.entry_number, jel.line_number
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        entries = []
        running_balance = 0
        
        for row in rows:
            debit = float(row[4]) if row[4] else 0
            credit = float(row[5]) if row[5] else 0
            running_balance += debit - credit
            
            entries.append({
                "id": row[0],
                "entry_number": row[1],
                "entry_date": str(row[2]) if row[2] else None,
                "description": row[3],
                "debit": debit,
                "credit": credit,
                "line_description": row[6],
                "source_type": row[7],
                "source_number": row[8],
                "journal_entry_id": row[9],
                "running_balance": running_balance
            })
        
        return {"entries": entries, "total_count": len(entries), "ending_balance": running_balance}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
