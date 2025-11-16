from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

try:
    from auth import get_db
except ImportError:
    try:
        from auth_integrated import get_db
    except ImportError:
        import sys
        sys.path.insert(0, '/var/www/aria/backend')
        from auth import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/exchange-rate/{rate_id}/atomic-detail")
async def get_exchange_rate_atomic_detail(
    rate_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single exchange rate record"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                er.id,
                er.currency_code,
                er.exchange_rate,
                er.effective_date,
                er.rate_type,
                er.rate_source,
                er.created_at,
                er.created_by
            FROM exchange_rates er
            WHERE er.id = :rate_id AND er.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "rate_id": rate_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Exchange rate not found")
        
        exchange_rate = float(result[2]) if result[2] else 0
        currency_code = result[1]
        effective_date = result[3]
        
        prev_rate_query = text("""
            SELECT 
                exchange_rate,
                effective_date
            FROM exchange_rates
            WHERE currency_code = :currency_code
                AND effective_date < :effective_date
                AND company_id = :company_id
            ORDER BY effective_date DESC
            LIMIT 1
        """)
        
        prev_rate_result = db.execute(prev_rate_query, {
            "currency_code": currency_code,
            "effective_date": effective_date,
            "company_id": company_id
        }).fetchone()
        
        prev_rate_info = None
        rate_change = None
        rate_change_percent = None
        
        if prev_rate_result:
            prev_rate = float(prev_rate_result[0]) if prev_rate_result[0] else 0
            rate_change = exchange_rate - prev_rate
            rate_change_percent = (rate_change / prev_rate * 100) if prev_rate > 0 else 0
            
            prev_rate_info = {
                "exchange_rate": prev_rate,
                "effective_date": str(prev_rate_result[1]) if prev_rate_result[1] else None,
                "rate_change": rate_change,
                "rate_change_percent": rate_change_percent
            }
        
        open_transactions_query = text("""
            SELECT 
                'SALES_ORDER' as transaction_type,
                so.id,
                so.order_number,
                so.order_date,
                so.total_amount,
                so.exchange_rate as current_rate
            FROM sales_orders so
            WHERE so.currency_code = :currency_code
                AND so.status NOT IN ('COMPLETED', 'CANCELLED')
                AND so.company_id = :company_id
            UNION ALL
            SELECT 
                'PURCHASE_ORDER' as transaction_type,
                po.id,
                po.po_number,
                po.order_date,
                po.total_amount,
                po.exchange_rate as current_rate
            FROM purchase_orders po
            WHERE po.currency_code = :currency_code
                AND po.status NOT IN ('COMPLETED', 'CANCELLED')
                AND po.company_id = :company_id
            LIMIT 20
        """)
        
        open_transactions_result = db.execute(open_transactions_query, {
            "currency_code": currency_code,
            "company_id": company_id
        })
        
        open_transactions = []
        total_exposure = 0
        
        for row in open_transactions_result.fetchall():
            amount = float(row[4]) if row[4] else 0
            current_rate = float(row[5]) if row[5] else 0
            
            current_base_amount = amount * current_rate
            new_base_amount = amount * exchange_rate
            impact = new_base_amount - current_base_amount
            total_exposure += abs(impact)
            
            open_transactions.append({
                "transaction_type": row[0],
                "id": row[1],
                "number": row[2],
                "date": str(row[3]) if row[3] else None,
                "foreign_amount": amount,
                "current_rate": current_rate,
                "potential_impact": impact
            })
        
        history_query = text("""
            SELECT 
                id,
                exchange_rate,
                effective_date,
                rate_source
            FROM exchange_rates
            WHERE currency_code = :currency_code
                AND company_id = :company_id
            ORDER BY effective_date DESC
            LIMIT 30
        """)
        
        history_result = db.execute(history_query, {
            "currency_code": currency_code,
            "company_id": company_id
        })
        
        rate_history = []
        for row in history_result.fetchall():
            rate_history.append({
                "id": row[0],
                "exchange_rate": float(row[1]) if row[1] else 0,
                "effective_date": str(row[2]) if row[2] else None,
                "rate_source": row[3]
            })
        
        return {
            "exchange_rate": {
                "id": result[0],
                "currency_code": currency_code,
                "exchange_rate": exchange_rate,
                "effective_date": str(effective_date) if effective_date else None,
                "rate_type": result[4],
                "rate_source": result[5],
                "created_at": str(result[6]) if result[6] else None,
                "created_by": result[7]
            },
            "rate_comparison": prev_rate_info,
            "impact_analysis": {
                "open_transactions_count": len(open_transactions),
                "total_exposure": total_exposure,
                "open_transactions": open_transactions
            },
            "rate_history": rate_history
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
