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


@router.get("/opportunity-product/{opportunity_product_id}/pricing-history")
async def get_opportunity_product_pricing_history(
    opportunity_product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get pricing history for an opportunity product"""
    try:
        company_id = current_user.get("company_id", "default")
        
        product_query = text("""
            SELECT 
                op.id,
                op.opportunity_id,
                o.opportunity_name,
                o.customer_id,
                c.name as customer_name,
                op.product_id,
                p.product_code,
                p.name as product_name,
                op.quantity,
                op.unit_price,
                op.discount_percent,
                op.total_price,
                p.standard_cost,
                p.list_price
            FROM opportunity_products op
            JOIN opportunities o ON op.opportunity_id = o.id
            JOIN customers c ON o.customer_id = c.id
            JOIN products p ON op.product_id = p.id
            WHERE op.id = :opportunity_product_id AND o.company_id = :company_id
        """)
        
        product_result = db.execute(product_query, {
            "opportunity_product_id": opportunity_product_id,
            "company_id": company_id
        }).fetchone()
        
        if not product_result:
            raise HTTPException(status_code=404, detail="Opportunity product not found")
        
        history_query = text("""
            SELECT 
                at.id,
                at.field_name,
                at.old_value,
                at.new_value,
                at.changed_by,
                at.changed_at,
                at.change_reason
            FROM audit_trail at
            WHERE at.entity_type = 'OPPORTUNITY_PRODUCT'
                AND at.entity_id = :opportunity_product_id
                AND at.field_name IN ('unit_price', 'discount_percent', 'total_price', 'quantity')
                AND at.company_id = :company_id
            ORDER BY at.changed_at DESC
        """)
        
        history_result = db.execute(history_query, {
            "opportunity_product_id": opportunity_product_id,
            "company_id": company_id
        })
        
        pricing_history = []
        for row in history_result.fetchall():
            pricing_history.append({
                "id": row[0],
                "field_name": row[1],
                "old_value": row[2],
                "new_value": row[3],
                "changed_by": row[4],
                "changed_at": str(row[5]) if row[5] else None,
                "change_reason": row[6]
            })
        
        competitor_query = text("""
            SELECT 
                cp.id,
                cp.competitor_name,
                cp.competitor_price,
                cp.notes,
                cp.created_at
            FROM competitor_pricing cp
            WHERE cp.opportunity_id = :opportunity_id
                AND cp.product_id = :product_id
                AND cp.company_id = :company_id
            ORDER BY cp.created_at DESC
        """)
        
        competitor_result = db.execute(competitor_query, {
            "opportunity_id": product_result[1],
            "product_id": product_result[5],
            "company_id": company_id
        })
        
        competitor_pricing = []
        for row in competitor_result.fetchall():
            competitor_pricing.append({
                "id": row[0],
                "competitor_name": row[1],
                "competitor_price": float(row[2]) if row[2] else 0,
                "notes": row[3],
                "created_at": str(row[4]) if row[4] else None
            })
        
        customer_history_query = text("""
            SELECT 
                sol.id,
                so.order_number,
                so.order_date,
                sol.quantity,
                sol.unit_price,
                sol.discount_percent
            FROM sales_order_lines sol
            JOIN sales_orders so ON sol.sales_order_id = so.id
            WHERE so.customer_id = :customer_id
                AND sol.product_id = :product_id
                AND so.company_id = :company_id
            ORDER BY so.order_date DESC
            LIMIT 10
        """)
        
        customer_history_result = db.execute(customer_history_query, {
            "customer_id": product_result[3],
            "product_id": product_result[5],
            "company_id": company_id
        })
        
        customer_sales_history = []
        for row in customer_history_result.fetchall():
            customer_sales_history.append({
                "id": row[0],
                "order_number": row[1],
                "order_date": str(row[2]) if row[2] else None,
                "quantity": float(row[3]) if row[3] else 0,
                "unit_price": float(row[4]) if row[4] else 0,
                "discount_percent": float(row[5]) if row[5] else 0
            })
        
        unit_price = float(product_result[9]) if product_result[9] else 0
        standard_cost = float(product_result[12]) if product_result[12] else 0
        list_price = float(product_result[13]) if product_result[13] else 0
        
        margin = unit_price - standard_cost
        margin_percent = (margin / unit_price * 100) if unit_price > 0 else 0
        discount_from_list = ((list_price - unit_price) / list_price * 100) if list_price > 0 else 0
        
        return {
            "opportunity_product": {
                "id": product_result[0],
                "opportunity_id": product_result[1],
                "opportunity_name": product_result[2],
                "customer_id": product_result[3],
                "customer_name": product_result[4],
                "product_id": product_result[5],
                "product_code": product_result[6],
                "product_name": product_result[7],
                "quantity": float(product_result[8]) if product_result[8] else 0,
                "unit_price": unit_price,
                "discount_percent": float(product_result[10]) if product_result[10] else 0,
                "total_price": float(product_result[11]) if product_result[11] else 0,
                "standard_cost": standard_cost,
                "list_price": list_price
            },
            "pricing_metrics": {
                "margin": margin,
                "margin_percent": margin_percent,
                "discount_from_list": discount_from_list,
                "is_below_cost": unit_price < standard_cost
            },
            "pricing_history": pricing_history,
            "competitor_pricing": competitor_pricing,
            "customer_sales_history": customer_sales_history
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
