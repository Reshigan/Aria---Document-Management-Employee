from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/journal-entry-line/{line_id}/source-trace")
async def get_journal_entry_line_source_trace(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get complete source document trace for a journal entry line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        line_query = text("""
            SELECT 
                jel.id,
                jel.journal_entry_id,
                je.journal_entry_number,
                je.posting_date,
                je.description as je_description,
                jel.line_number,
                jel.account_id,
                coa.account_code,
                coa.account_name,
                coa.account_type,
                jel.debit_amount,
                jel.credit_amount,
                jel.description as line_description,
                je.source_document_type,
                je.source_document_id,
                je.status,
                je.created_by,
                je.created_at
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE jel.id = :line_id AND je.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not line_result:
            raise HTTPException(status_code=404, detail="Journal entry line not found")
        
        source_doc_type = line_result[13]
        source_doc_id = line_result[14]
        
        source_document = None
        source_chain = []
        
        if source_doc_type == "SALES_ORDER":
            source_query = text("""
                SELECT 
                    so.id,
                    so.order_number,
                    so.order_date,
                    so.customer_id,
                    c.name as customer_name,
                    so.total_amount,
                    so.status
                FROM sales_orders so
                JOIN customers c ON so.customer_id = c.id
                WHERE so.id = :doc_id AND so.company_id = :company_id
            """)
            
            source_result = db.execute(source_query, {
                "doc_id": source_doc_id,
                "company_id": company_id
            }).fetchone()
            
            if source_result:
                source_document = {
                    "type": "SALES_ORDER",
                    "id": source_result[0],
                    "number": source_result[1],
                    "date": str(source_result[2]) if source_result[2] else None,
                    "customer_id": source_result[3],
                    "customer_name": source_result[4],
                    "amount": float(source_result[5]) if source_result[5] else 0,
                    "status": source_result[6]
                }
                
                source_chain.append({
                    "level": 1,
                    "document_type": "SALES_ORDER",
                    "document_number": source_result[1],
                    "description": f"Sales Order to {source_result[4]}"
                })
                
                invoice_query = text("""
                    SELECT 
                        i.id,
                        i.invoice_number,
                        i.invoice_date,
                        i.total_amount
                    FROM invoices i
                    WHERE i.sales_order_id = :so_id AND i.company_id = :company_id
                """)
                
                invoice_result = db.execute(invoice_query, {
                    "so_id": source_doc_id,
                    "company_id": company_id
                }).fetchone()
                
                if invoice_result:
                    source_chain.append({
                        "level": 2,
                        "document_type": "INVOICE",
                        "document_number": invoice_result[1],
                        "description": f"Invoice {invoice_result[1]} generated from Sales Order"
                    })
        
        elif source_doc_type == "INVOICE":
            source_query = text("""
                SELECT 
                    i.id,
                    i.invoice_number,
                    i.invoice_date,
                    i.customer_id,
                    c.name as customer_name,
                    i.total_amount,
                    i.status,
                    i.sales_order_id,
                    so.order_number
                FROM invoices i
                JOIN customers c ON i.customer_id = c.id
                LEFT JOIN sales_orders so ON i.sales_order_id = so.id
                WHERE i.id = :doc_id AND i.company_id = :company_id
            """)
            
            source_result = db.execute(source_query, {
                "doc_id": source_doc_id,
                "company_id": company_id
            }).fetchone()
            
            if source_result:
                source_document = {
                    "type": "INVOICE",
                    "id": source_result[0],
                    "number": source_result[1],
                    "date": str(source_result[2]) if source_result[2] else None,
                    "customer_id": source_result[3],
                    "customer_name": source_result[4],
                    "amount": float(source_result[5]) if source_result[5] else 0,
                    "status": source_result[6]
                }
                
                if source_result[7]:
                    source_chain.append({
                        "level": 1,
                        "document_type": "SALES_ORDER",
                        "document_number": source_result[8],
                        "description": f"Original Sales Order {source_result[8]}"
                    })
                
                source_chain.append({
                    "level": 2,
                    "document_type": "INVOICE",
                    "document_number": source_result[1],
                    "description": f"Invoice to {source_result[4]}"
                })
        
        elif source_doc_type == "PURCHASE_ORDER":
            source_query = text("""
                SELECT 
                    po.id,
                    po.po_number,
                    po.order_date,
                    po.supplier_id,
                    s.name as supplier_name,
                    po.total_amount,
                    po.status
                FROM purchase_orders po
                JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.id = :doc_id AND po.company_id = :company_id
            """)
            
            source_result = db.execute(source_query, {
                "doc_id": source_doc_id,
                "company_id": company_id
            }).fetchone()
            
            if source_result:
                source_document = {
                    "type": "PURCHASE_ORDER",
                    "id": source_result[0],
                    "number": source_result[1],
                    "date": str(source_result[2]) if source_result[2] else None,
                    "supplier_id": source_result[3],
                    "supplier_name": source_result[4],
                    "amount": float(source_result[5]) if source_result[5] else 0,
                    "status": source_result[6]
                }
                
                source_chain.append({
                    "level": 1,
                    "document_type": "PURCHASE_ORDER",
                    "document_number": source_result[1],
                    "description": f"Purchase Order from {source_result[4]}"
                })
        
        elif source_doc_type == "PAYMENT":
            source_query = text("""
                SELECT 
                    cp.id,
                    cp.payment_number,
                    cp.payment_date,
                    cp.customer_id,
                    c.name as customer_name,
                    cp.payment_amount,
                    cp.payment_method
                FROM customer_payments cp
                JOIN customers c ON cp.customer_id = c.id
                WHERE cp.id = :doc_id AND cp.company_id = :company_id
            """)
            
            source_result = db.execute(source_query, {
                "doc_id": source_doc_id,
                "company_id": company_id
            }).fetchone()
            
            if source_result:
                source_document = {
                    "type": "PAYMENT",
                    "id": source_result[0],
                    "number": source_result[1],
                    "date": str(source_result[2]) if source_result[2] else None,
                    "customer_id": source_result[3],
                    "customer_name": source_result[4],
                    "amount": float(source_result[5]) if source_result[5] else 0,
                    "payment_method": source_result[6]
                }
                
                source_chain.append({
                    "level": 1,
                    "document_type": "PAYMENT",
                    "document_number": source_result[1],
                    "description": f"Payment from {source_result[4]}"
                })
        
        elif source_doc_type == "MANUFACTURING_ORDER":
            source_query = text("""
                SELECT 
                    mo.id,
                    mo.mo_number,
                    mo.start_date,
                    mo.product_id,
                    p.name as product_name,
                    mo.quantity,
                    mo.status
                FROM manufacturing_orders mo
                JOIN products p ON mo.product_id = p.id
                WHERE mo.id = :doc_id AND mo.company_id = :company_id
            """)
            
            source_result = db.execute(source_query, {
                "doc_id": source_doc_id,
                "company_id": company_id
            }).fetchone()
            
            if source_result:
                source_document = {
                    "type": "MANUFACTURING_ORDER",
                    "id": source_result[0],
                    "number": source_result[1],
                    "date": str(source_result[2]) if source_result[2] else None,
                    "product_id": source_result[3],
                    "product_name": source_result[4],
                    "quantity": float(source_result[5]) if source_result[5] else 0,
                    "status": source_result[6]
                }
                
                source_chain.append({
                    "level": 1,
                    "document_type": "MANUFACTURING_ORDER",
                    "document_number": source_result[1],
                    "description": f"Manufacturing Order for {source_result[4]}"
                })
        
        related_lines_query = text("""
            SELECT 
                jel.id,
                jel.line_number,
                coa.account_code,
                coa.account_name,
                jel.debit_amount,
                jel.credit_amount,
                jel.description
            FROM journal_entry_lines jel
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE jel.journal_entry_id = :je_id
                AND jel.id != :line_id
            ORDER BY jel.line_number
        """)
        
        related_result = db.execute(related_lines_query, {
            "je_id": line_result[1],
            "line_id": line_id
        })
        
        related_lines = []
        for row in related_result.fetchall():
            related_lines.append({
                "id": row[0],
                "line_number": row[1],
                "account_code": row[2],
                "account_name": row[3],
                "debit_amount": float(row[4]) if row[4] else 0,
                "credit_amount": float(row[5]) if row[5] else 0,
                "description": row[6]
            })
        
        return {
            "journal_entry_line": {
                "id": line_result[0],
                "journal_entry_id": line_result[1],
                "journal_entry_number": line_result[2],
                "posting_date": str(line_result[3]) if line_result[3] else None,
                "je_description": line_result[4],
                "line_number": line_result[5],
                "account_id": line_result[6],
                "account_code": line_result[7],
                "account_name": line_result[8],
                "account_type": line_result[9],
                "debit_amount": float(line_result[10]) if line_result[10] else 0,
                "credit_amount": float(line_result[11]) if line_result[11] else 0,
                "line_description": line_result[12],
                "status": line_result[15],
                "created_by": line_result[16],
                "created_at": str(line_result[17]) if line_result[17] else None
            },
            "source_document": source_document,
            "source_chain": source_chain,
            "related_lines": related_lines
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/journal-entry-line/{line_id}/drill-back")
async def drill_back_to_source(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Drill back from journal entry line to original source document"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                je.source_document_type,
                je.source_document_id
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            WHERE jel.id = :line_id AND je.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Journal entry line not found")
        
        return {
            "source_document_type": result[0],
            "source_document_id": result[1],
            "drill_back_url": f"/api/{result[0].lower().replace('_', '-')}/{result[1]}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
