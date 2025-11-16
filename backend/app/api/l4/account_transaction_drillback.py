from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/account-transaction/{transaction_id}/drillback")
async def get_account_transaction_drillback(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get complete drill-back from GL account transaction to source document"""
    try:
        company_id = current_user.get("company_id", "default")
        
        jel_query = text("""
            SELECT 
                jel.id,
                jel.journal_entry_id,
                je.entry_number,
                je.entry_date,
                je.description,
                jel.account_id,
                coa.account_code,
                coa.account_name,
                jel.debit_amount,
                jel.credit_amount,
                je.source_document_type,
                je.source_document_id,
                je.posted_by,
                je.posted_at
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE jel.id = :transaction_id AND je.company_id = :company_id
        """)
        
        jel_result = db.execute(jel_query, {
            "transaction_id": transaction_id,
            "company_id": company_id
        }).fetchone()
        
        if not jel_result:
            raise HTTPException(status_code=404, detail="Account transaction not found")
        
        source_document = None
        source_type = jel_result[10]
        source_id = jel_result[11]
        
        if source_type == "SALES_ORDER":
            source_query = text("""
                SELECT 
                    so.order_number,
                    so.order_date,
                    so.customer_id,
                    c.name as customer_name,
                    so.total_amount,
                    so.status
                FROM sales_orders so
                JOIN customers c ON so.customer_id = c.id
                WHERE so.id = :source_id AND so.company_id = :company_id
            """)
            
            source_result = db.execute(source_query, {
                "source_id": source_id,
                "company_id": company_id
            }).fetchone()
            
            if source_result:
                source_document = {
                    "type": "SALES_ORDER",
                    "order_number": source_result[0],
                    "order_date": str(source_result[1]) if source_result[1] else None,
                    "customer_id": source_result[2],
                    "customer_name": source_result[3],
                    "total_amount": float(source_result[4]) if source_result[4] else 0,
                    "status": source_result[5]
                }
        
        elif source_type == "INVOICE":
            source_query = text("""
                SELECT 
                    i.invoice_number,
                    i.invoice_date,
                    i.customer_id,
                    c.name as customer_name,
                    i.total_amount,
                    i.status
                FROM invoices i
                JOIN customers c ON i.customer_id = c.id
                WHERE i.id = :source_id AND i.company_id = :company_id
            """)
            
            source_result = db.execute(source_query, {
                "source_id": source_id,
                "company_id": company_id
            }).fetchone()
            
            if source_result:
                source_document = {
                    "type": "INVOICE",
                    "invoice_number": source_result[0],
                    "invoice_date": str(source_result[1]) if source_result[1] else None,
                    "customer_id": source_result[2],
                    "customer_name": source_result[3],
                    "total_amount": float(source_result[4]) if source_result[4] else 0,
                    "status": source_result[5]
                }
        
        elif source_type == "PAYMENT":
            source_query = text("""
                SELECT 
                    cp.payment_number,
                    cp.payment_date,
                    cp.customer_id,
                    c.name as customer_name,
                    cp.payment_amount,
                    cp.payment_method
                FROM customer_payments cp
                JOIN customers c ON cp.customer_id = c.id
                WHERE cp.id = :source_id AND cp.company_id = :company_id
            """)
            
            source_result = db.execute(source_query, {
                "source_id": source_id,
                "company_id": company_id
            }).fetchone()
            
            if source_result:
                source_document = {
                    "type": "PAYMENT",
                    "payment_number": source_result[0],
                    "payment_date": str(source_result[1]) if source_result[1] else None,
                    "customer_id": source_result[2],
                    "customer_name": source_result[3],
                    "payment_amount": float(source_result[4]) if source_result[4] else 0,
                    "payment_method": source_result[5]
                }
        
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
                AND jel.id != :transaction_id
            ORDER BY jel.id
        """)
        
        related_result = db.execute(related_lines_query, {
            "journal_entry_id": jel_result[1],
            "transaction_id": transaction_id
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
        
        return {
            "transaction": {
                "id": jel_result[0],
                "journal_entry_id": jel_result[1],
                "entry_number": jel_result[2],
                "entry_date": str(jel_result[3]) if jel_result[3] else None,
                "description": jel_result[4],
                "account_id": jel_result[5],
                "account_code": jel_result[6],
                "account_name": jel_result[7],
                "debit_amount": float(jel_result[8]) if jel_result[8] else 0,
                "credit_amount": float(jel_result[9]) if jel_result[9] else 0,
                "source_document_type": source_type,
                "source_document_id": source_id,
                "posted_by": jel_result[12],
                "posted_at": str(jel_result[13]) if jel_result[13] else None
            },
            "source_document": source_document,
            "related_journal_lines": related_lines
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
