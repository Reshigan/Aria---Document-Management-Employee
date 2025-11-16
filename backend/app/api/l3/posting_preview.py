from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List

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


@router.get("/posting-preview/sales-order/{order_id}")
async def preview_sales_order_posting(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Preview GL postings for a sales order"""
    try:
        company_id = current_user.get("company_id", "default")
        
        order_query = text("""
            SELECT 
                so.order_number,
                so.order_date,
                so.customer_id,
                c.name as customer_name,
                so.total_amount
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.id
            WHERE so.id = :order_id AND so.company_id = :company_id
        """)
        
        order_result = db.execute(order_query, {
            "order_id": order_id,
            "company_id": company_id
        }).fetchone()
        
        if not order_result:
            raise HTTPException(status_code=404, detail="Sales order not found")
        
        lines_query = text("""
            SELECT 
                sol.product_id,
                p.name as product_name,
                sol.quantity,
                sol.unit_price,
                sol.line_total,
                p.revenue_account_id,
                p.cogs_account_id,
                p.inventory_account_id
            FROM sales_order_lines sol
            JOIN products p ON sol.product_id = p.id
            WHERE sol.sales_order_id = :order_id
        """)
        
        lines_result = db.execute(lines_query, {"order_id": order_id})
        
        posting_lines = []
        total_revenue = 0
        
        for row in lines_result.fetchall():
            line_total = float(row[4]) if row[4] else 0
            total_revenue += line_total
            
            posting_lines.append({
                "account_type": "AR",
                "account_id": None,  # Will use default AR account
                "account_code": "1200",
                "account_name": "Accounts Receivable",
                "debit_amount": line_total,
                "credit_amount": 0,
                "description": f"Sales to {order_result[3]} - {row[1]}"
            })
            
            posting_lines.append({
                "account_type": "REVENUE",
                "account_id": row[5],
                "account_code": None,  # Will fetch from account
                "account_name": "Revenue",
                "debit_amount": 0,
                "credit_amount": line_total,
                "description": f"Revenue from {row[1]}"
            })
        
        return {
            "document": {
                "type": "SALES_ORDER",
                "number": order_result[0],
                "date": str(order_result[1]) if order_result[1] else None,
                "customer_name": order_result[3],
                "total_amount": float(order_result[4]) if order_result[4] else 0
            },
            "posting_lines": posting_lines,
            "summary": {
                "total_debits": total_revenue,
                "total_credits": total_revenue,
                "is_balanced": True
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posting-preview/purchase-order/{order_id}")
async def preview_purchase_order_posting(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Preview GL postings for a purchase order"""
    try:
        company_id = current_user.get("company_id", "default")
        
        order_query = text("""
            SELECT 
                po.order_number,
                po.order_date,
                po.supplier_id,
                s.name as supplier_name,
                po.total_amount
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.id = :order_id AND po.company_id = :company_id
        """)
        
        order_result = db.execute(order_query, {
            "order_id": order_id,
            "company_id": company_id
        }).fetchone()
        
        if not order_result:
            raise HTTPException(status_code=404, detail="Purchase order not found")
        
        lines_query = text("""
            SELECT 
                pol.product_id,
                p.name as product_name,
                pol.quantity,
                pol.unit_price,
                pol.line_total,
                p.inventory_account_id,
                p.expense_account_id
            FROM purchase_order_lines pol
            JOIN products p ON pol.product_id = p.id
            WHERE pol.purchase_order_id = :order_id
        """)
        
        lines_result = db.execute(lines_query, {"order_id": order_id})
        
        posting_lines = []
        total_cost = 0
        
        for row in lines_result.fetchall():
            line_total = float(row[4]) if row[4] else 0
            total_cost += line_total
            
            posting_lines.append({
                "account_type": "INVENTORY",
                "account_id": row[5] or row[6],
                "account_code": None,
                "account_name": "Inventory/Expense",
                "debit_amount": line_total,
                "credit_amount": 0,
                "description": f"Purchase of {row[1]}"
            })
            
            posting_lines.append({
                "account_type": "AP",
                "account_id": None,
                "account_code": "2000",
                "account_name": "Accounts Payable",
                "debit_amount": 0,
                "credit_amount": line_total,
                "description": f"Payable to {order_result[3]}"
            })
        
        return {
            "document": {
                "type": "PURCHASE_ORDER",
                "number": order_result[0],
                "date": str(order_result[1]) if order_result[1] else None,
                "supplier_name": order_result[3],
                "total_amount": float(order_result[4]) if order_result[4] else 0
            },
            "posting_lines": posting_lines,
            "summary": {
                "total_debits": total_cost,
                "total_credits": total_cost,
                "is_balanced": True
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posting-preview/invoice/{invoice_id}")
async def preview_invoice_posting(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Preview GL postings for an invoice"""
    try:
        company_id = current_user.get("company_id", "default")
        
        invoice_query = text("""
            SELECT 
                i.invoice_number,
                i.invoice_date,
                i.customer_id,
                c.name as customer_name,
                i.subtotal,
                i.tax_amount,
                i.total_amount
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            WHERE i.id = :invoice_id AND i.company_id = :company_id
        """)
        
        invoice_result = db.execute(invoice_query, {
            "invoice_id": invoice_id,
            "company_id": company_id
        }).fetchone()
        
        if not invoice_result:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        subtotal = float(invoice_result[4]) if invoice_result[4] else 0
        tax_amount = float(invoice_result[5]) if invoice_result[5] else 0
        total_amount = float(invoice_result[6]) if invoice_result[6] else 0
        
        posting_lines = []
        
        posting_lines.append({
            "account_type": "AR",
            "account_id": None,
            "account_code": "1200",
            "account_name": "Accounts Receivable",
            "debit_amount": total_amount,
            "credit_amount": 0,
            "description": f"Invoice {invoice_result[0]} - {invoice_result[3]}"
        })
        
        posting_lines.append({
            "account_type": "REVENUE",
            "account_id": None,
            "account_code": "4000",
            "account_name": "Sales Revenue",
            "debit_amount": 0,
            "credit_amount": subtotal,
            "description": f"Revenue from {invoice_result[0]}"
        })
        
        if tax_amount > 0:
            posting_lines.append({
                "account_type": "TAX",
                "account_id": None,
                "account_code": "2300",
                "account_name": "Sales Tax Payable",
                "debit_amount": 0,
                "credit_amount": tax_amount,
                "description": f"Sales tax on {invoice_result[0]}"
            })
        
        return {
            "document": {
                "type": "INVOICE",
                "number": invoice_result[0],
                "date": str(invoice_result[1]) if invoice_result[1] else None,
                "customer_name": invoice_result[3],
                "subtotal": subtotal,
                "tax_amount": tax_amount,
                "total_amount": total_amount
            },
            "posting_lines": posting_lines,
            "summary": {
                "total_debits": total_amount,
                "total_credits": total_amount,
                "is_balanced": True
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posting-preview/payment/{payment_id}")
async def preview_payment_posting(
    payment_id: int,
    payment_type: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Preview GL postings for a payment"""
    try:
        company_id = current_user.get("company_id", "default")
        
        if payment_type == "CUSTOMER":
            payment_query = text("""
                SELECT 
                    cp.payment_number,
                    cp.payment_date,
                    cp.customer_id,
                    c.name as party_name,
                    cp.payment_amount,
                    cp.bank_account_id
                FROM customer_payments cp
                JOIN customers c ON cp.customer_id = c.id
                WHERE cp.id = :payment_id AND cp.company_id = :company_id
            """)
        else:
            payment_query = text("""
                SELECT 
                    sp.payment_number,
                    sp.payment_date,
                    sp.supplier_id,
                    s.name as party_name,
                    sp.payment_amount,
                    sp.bank_account_id
                FROM supplier_payments sp
                JOIN suppliers s ON sp.supplier_id = s.id
                WHERE sp.id = :payment_id AND sp.company_id = :company_id
            """)
        
        payment_result = db.execute(payment_query, {
            "payment_id": payment_id,
            "company_id": company_id
        }).fetchone()
        
        if not payment_result:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        payment_amount = float(payment_result[4]) if payment_result[4] else 0
        
        posting_lines = []
        
        if payment_type == "CUSTOMER":
            posting_lines.append({
                "account_type": "BANK",
                "account_id": payment_result[5],
                "account_code": "1000",
                "account_name": "Bank Account",
                "debit_amount": payment_amount,
                "credit_amount": 0,
                "description": f"Payment received from {payment_result[3]}"
            })
            
            posting_lines.append({
                "account_type": "AR",
                "account_id": None,
                "account_code": "1200",
                "account_name": "Accounts Receivable",
                "debit_amount": 0,
                "credit_amount": payment_amount,
                "description": f"Payment from {payment_result[3]}"
            })
        else:
            posting_lines.append({
                "account_type": "AP",
                "account_id": None,
                "account_code": "2000",
                "account_name": "Accounts Payable",
                "debit_amount": payment_amount,
                "credit_amount": 0,
                "description": f"Payment to {payment_result[3]}"
            })
            
            posting_lines.append({
                "account_type": "BANK",
                "account_id": payment_result[5],
                "account_code": "1000",
                "account_name": "Bank Account",
                "debit_amount": 0,
                "credit_amount": payment_amount,
                "description": f"Payment made to {payment_result[3]}"
            })
        
        return {
            "document": {
                "type": f"{payment_type}_PAYMENT",
                "number": payment_result[0],
                "date": str(payment_result[1]) if payment_result[1] else None,
                "party_name": payment_result[3],
                "payment_amount": payment_amount
            },
            "posting_lines": posting_lines,
            "summary": {
                "total_debits": payment_amount,
                "total_credits": payment_amount,
                "is_balanced": True
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posting-preview/journal-entry/{entry_id}")
async def preview_journal_entry_posting(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Preview GL postings for a journal entry (already in GL format)"""
    try:
        company_id = current_user.get("company_id", "default")
        
        entry_query = text("""
            SELECT 
                je.entry_number,
                je.entry_date,
                je.description,
                je.status
            FROM journal_entries je
            WHERE je.id = :entry_id AND je.company_id = :company_id
        """)
        
        entry_result = db.execute(entry_query, {
            "entry_id": entry_id,
            "company_id": company_id
        }).fetchone()
        
        if not entry_result:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        lines_query = text("""
            SELECT 
                jel.line_number,
                jel.account_id,
                coa.account_code,
                coa.account_name,
                jel.debit_amount,
                jel.credit_amount,
                jel.description
            FROM journal_entry_lines jel
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE jel.journal_entry_id = :entry_id
            ORDER BY jel.line_number
        """)
        
        lines_result = db.execute(lines_query, {"entry_id": entry_id})
        
        posting_lines = []
        total_debits = 0
        total_credits = 0
        
        for row in lines_result.fetchall():
            debit = float(row[4]) if row[4] else 0
            credit = float(row[5]) if row[5] else 0
            
            total_debits += debit
            total_credits += credit
            
            posting_lines.append({
                "line_number": row[0],
                "account_id": row[1],
                "account_code": row[2],
                "account_name": row[3],
                "debit_amount": debit,
                "credit_amount": credit,
                "description": row[6]
            })
        
        return {
            "document": {
                "type": "JOURNAL_ENTRY",
                "number": entry_result[0],
                "date": str(entry_result[1]) if entry_result[1] else None,
                "description": entry_result[2],
                "status": entry_result[3]
            },
            "posting_lines": posting_lines,
            "summary": {
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


@router.get("/posting-rules")
async def get_posting_rules(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get configured posting rules"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                pr.id,
                pr.rule_name,
                pr.document_type,
                pr.debit_account_id,
                pr.credit_account_id,
                pr.condition_field,
                pr.condition_value,
                pr.is_active
            FROM posting_rules pr
            WHERE pr.company_id = :company_id
            ORDER BY pr.document_type, pr.rule_name
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        rules = []
        for row in rows:
            rules.append({
                "id": row[0],
                "rule_name": row[1],
                "document_type": row[2],
                "debit_account_id": row[3],
                "credit_account_id": row[4],
                "condition_field": row[5],
                "condition_value": row[6],
                "is_active": row[7]
            })
        
        return {"posting_rules": rules}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
