from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

try:
    from app.database import get_db
except ImportError:
    from database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/transaction/{transaction_type}/{transaction_id}/currency-impact")
async def get_currency_exchange_rate_impact(
    transaction_type: str,
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get currency exchange rate impact analysis for a transaction"""
    try:
        company_id = current_user.get("company_id", "default")
        
        transaction_details = None
        
        if transaction_type == "SALES_ORDER":
            query = text("""
                SELECT 
                    so.id,
                    so.order_number,
                    so.order_date,
                    so.currency_code,
                    so.exchange_rate,
                    so.total_amount,
                    so.total_amount_base_currency,
                    c.name as customer_name
                FROM sales_orders so
                JOIN customers c ON so.customer_id = c.id
                WHERE so.id = :transaction_id AND so.company_id = :company_id
            """)
            
            result = db.execute(query, {
                "transaction_id": transaction_id,
                "company_id": company_id
            }).fetchone()
            
            if result:
                transaction_details = {
                    "type": "SALES_ORDER",
                    "id": result[0],
                    "number": result[1],
                    "date": str(result[2]) if result[2] else None,
                    "currency_code": result[3],
                    "exchange_rate": float(result[4]) if result[4] else 1.0,
                    "foreign_amount": float(result[5]) if result[5] else 0,
                    "base_amount": float(result[6]) if result[6] else 0,
                    "party_name": result[7]
                }
        
        elif transaction_type == "INVOICE":
            query = text("""
                SELECT 
                    i.id,
                    i.invoice_number,
                    i.invoice_date,
                    i.currency_code,
                    i.exchange_rate,
                    i.total_amount,
                    i.total_amount_base_currency,
                    c.name as customer_name
                FROM invoices i
                JOIN customers c ON i.customer_id = c.id
                WHERE i.id = :transaction_id AND i.company_id = :company_id
            """)
            
            result = db.execute(query, {
                "transaction_id": transaction_id,
                "company_id": company_id
            }).fetchone()
            
            if result:
                transaction_details = {
                    "type": "INVOICE",
                    "id": result[0],
                    "number": result[1],
                    "date": str(result[2]) if result[2] else None,
                    "currency_code": result[3],
                    "exchange_rate": float(result[4]) if result[4] else 1.0,
                    "foreign_amount": float(result[5]) if result[5] else 0,
                    "base_amount": float(result[6]) if result[6] else 0,
                    "party_name": result[7]
                }
        
        elif transaction_type == "PURCHASE_ORDER":
            query = text("""
                SELECT 
                    po.id,
                    po.po_number,
                    po.order_date,
                    po.currency_code,
                    po.exchange_rate,
                    po.total_amount,
                    po.total_amount_base_currency,
                    s.name as supplier_name
                FROM purchase_orders po
                JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.id = :transaction_id AND po.company_id = :company_id
            """)
            
            result = db.execute(query, {
                "transaction_id": transaction_id,
                "company_id": company_id
            }).fetchone()
            
            if result:
                transaction_details = {
                    "type": "PURCHASE_ORDER",
                    "id": result[0],
                    "number": result[1],
                    "date": str(result[2]) if result[2] else None,
                    "currency_code": result[3],
                    "exchange_rate": float(result[4]) if result[4] else 1.0,
                    "foreign_amount": float(result[5]) if result[5] else 0,
                    "base_amount": float(result[6]) if result[6] else 0,
                    "party_name": result[7]
                }
        
        if not transaction_details:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        current_rate_query = text("""
            SELECT 
                exchange_rate,
                effective_date
            FROM exchange_rates
            WHERE currency_code = :currency_code
                AND company_id = :company_id
            ORDER BY effective_date DESC
            LIMIT 1
        """)
        
        current_rate_result = db.execute(current_rate_query, {
            "currency_code": transaction_details["currency_code"],
            "company_id": company_id
        }).fetchone()
        
        current_rate = float(current_rate_result[0]) if current_rate_result else transaction_details["exchange_rate"]
        current_rate_date = str(current_rate_result[1]) if current_rate_result and current_rate_result[1] else None
        
        original_rate = transaction_details["exchange_rate"]
        foreign_amount = transaction_details["foreign_amount"]
        original_base_amount = transaction_details["base_amount"]
        
        current_base_amount = foreign_amount * current_rate
        exchange_gain_loss = current_base_amount - original_base_amount
        
        history_query = text("""
            SELECT 
                effective_date,
                exchange_rate
            FROM exchange_rates
            WHERE currency_code = :currency_code
                AND company_id = :company_id
            ORDER BY effective_date DESC
            LIMIT 30
        """)
        
        history_result = db.execute(history_query, {
            "currency_code": transaction_details["currency_code"],
            "company_id": company_id
        })
        
        rate_history = []
        for row in history_result.fetchall():
            rate_history.append({
                "effective_date": str(row[0]) if row[0] else None,
                "exchange_rate": float(row[1]) if row[1] else 0
            })
        
        realized_gl_query = text("""
            SELECT 
                jel.id,
                je.entry_date,
                jel.debit_amount,
                jel.credit_amount,
                jel.description
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE je.source_document_type = :transaction_type
                AND je.source_document_id = :transaction_id
                AND coa.account_code IN ('7100', '8100')
                AND je.company_id = :company_id
        """)
        
        realized_result = db.execute(realized_gl_query, {
            "transaction_type": transaction_type,
            "transaction_id": transaction_id,
            "company_id": company_id
        })
        
        realized_gains_losses = []
        total_realized = 0
        
        for row in realized_result.fetchall():
            amount = float(row[2]) if row[2] else -float(row[3]) if row[3] else 0
            total_realized += amount
            
            realized_gains_losses.append({
                "id": row[0],
                "entry_date": str(row[1]) if row[1] else None,
                "amount": amount,
                "description": row[4]
            })
        
        return {
            "transaction": transaction_details,
            "exchange_rate_analysis": {
                "original_rate": original_rate,
                "current_rate": current_rate,
                "current_rate_date": current_rate_date,
                "rate_change_percent": ((current_rate - original_rate) / original_rate * 100) if original_rate > 0 else 0,
                "foreign_amount": foreign_amount,
                "original_base_amount": original_base_amount,
                "current_base_amount": current_base_amount,
                "unrealized_gain_loss": exchange_gain_loss,
                "is_gain": exchange_gain_loss > 0
            },
            "realized_gains_losses": realized_gains_losses,
            "total_realized_gain_loss": total_realized,
            "rate_history": rate_history
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
