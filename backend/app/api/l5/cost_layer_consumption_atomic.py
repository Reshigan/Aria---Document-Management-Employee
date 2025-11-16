from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/cost-layer-consumption/{consumption_id}/atomic-detail")
async def get_cost_layer_consumption_atomic_detail(
    consumption_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single cost layer consumption record"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                clc.id,
                clc.cost_layer_id,
                cl.product_id,
                p.product_code,
                p.name as product_name,
                cl.warehouse_id,
                w.name as warehouse_name,
                cl.receipt_date,
                cl.unit_cost as layer_unit_cost,
                clc.consumption_date,
                clc.consumption_type,
                clc.consumption_id,
                clc.quantity_consumed,
                clc.cost_amount,
                clc.created_by,
                clc.created_at
            FROM cost_layer_consumption clc
            JOIN cost_layers cl ON clc.cost_layer_id = cl.id
            JOIN products p ON cl.product_id = p.id
            JOIN warehouses w ON cl.warehouse_id = w.id
            WHERE clc.id = :consumption_id AND clc.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "consumption_id": consumption_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Cost layer consumption not found")
        
        consuming_transaction = None
        consumption_type = result[10]
        consumption_id_ref = result[11]
        
        if consumption_type == "SALES_ORDER_LINE":
            trans_query = text("""
                SELECT 
                    sol.id,
                    so.order_number,
                    so.order_date,
                    sol.quantity,
                    sol.unit_price
                FROM sales_order_lines sol
                JOIN sales_orders so ON sol.sales_order_id = so.id
                WHERE sol.id = :consumption_id AND so.company_id = :company_id
            """)
            
            trans_result = db.execute(trans_query, {
                "consumption_id": consumption_id_ref,
                "company_id": company_id
            }).fetchone()
            
            if trans_result:
                consuming_transaction = {
                    "type": "SALES_ORDER_LINE",
                    "id": trans_result[0],
                    "order_number": trans_result[1],
                    "order_date": str(trans_result[2]) if trans_result[2] else None,
                    "quantity": float(trans_result[3]) if trans_result[3] else 0,
                    "unit_price": float(trans_result[4]) if trans_result[4] else 0
                }
        
        elif consumption_type == "MATERIAL_ISSUE":
            trans_query = text("""
                SELECT 
                    mi.id,
                    mi.issue_number,
                    mi.issue_date,
                    mi.work_order_id,
                    wo.work_order_number
                FROM material_issues mi
                LEFT JOIN work_orders wo ON mi.work_order_id = wo.id
                WHERE mi.id = :consumption_id AND mi.company_id = :company_id
            """)
            
            trans_result = db.execute(trans_query, {
                "consumption_id": consumption_id_ref,
                "company_id": company_id
            }).fetchone()
            
            if trans_result:
                consuming_transaction = {
                    "type": "MATERIAL_ISSUE",
                    "id": trans_result[0],
                    "issue_number": trans_result[1],
                    "issue_date": str(trans_result[2]) if trans_result[2] else None,
                    "work_order_id": trans_result[3],
                    "work_order_number": trans_result[4]
                }
        
        layer_status_query = text("""
            SELECT 
                quantity_received,
                quantity_remaining
            FROM cost_layers
            WHERE id = :cost_layer_id AND company_id = :company_id
        """)
        
        layer_status_result = db.execute(layer_status_query, {
            "cost_layer_id": result[1],
            "company_id": company_id
        }).fetchone()
        
        layer_status = None
        if layer_status_result:
            layer_status = {
                "quantity_received": float(layer_status_result[0]) if layer_status_result[0] else 0,
                "quantity_remaining": float(layer_status_result[1]) if layer_status_result[1] else 0,
                "utilization_percent": ((float(layer_status_result[0]) - float(layer_status_result[1])) / float(layer_status_result[0]) * 100) if layer_status_result[0] and float(layer_status_result[0]) > 0 else 0
            }
        
        other_consumptions_query = text("""
            SELECT 
                clc.id,
                clc.consumption_date,
                clc.consumption_type,
                clc.quantity_consumed,
                clc.cost_amount
            FROM cost_layer_consumption clc
            WHERE clc.cost_layer_id = :cost_layer_id
                AND clc.id != :consumption_id
                AND clc.company_id = :company_id
            ORDER BY clc.consumption_date DESC
            LIMIT 10
        """)
        
        other_consumptions_result = db.execute(other_consumptions_query, {
            "cost_layer_id": result[1],
            "consumption_id": consumption_id,
            "company_id": company_id
        })
        
        other_consumptions = []
        for row in other_consumptions_result.fetchall():
            other_consumptions.append({
                "id": row[0],
                "consumption_date": str(row[1]) if row[1] else None,
                "consumption_type": row[2],
                "quantity_consumed": float(row[3]) if row[3] else 0,
                "cost_amount": float(row[4]) if row[4] else 0
            })
        
        qty_consumed = float(result[12]) if result[12] else 0
        cost_amount = float(result[13]) if result[13] else 0
        layer_unit_cost = float(result[8]) if result[8] else 0
        
        return {
            "cost_layer_consumption": {
                "id": result[0],
                "cost_layer_id": result[1],
                "product_id": result[2],
                "product_code": result[3],
                "product_name": result[4],
                "warehouse_id": result[5],
                "warehouse_name": result[6],
                "layer_receipt_date": str(result[7]) if result[7] else None,
                "layer_unit_cost": layer_unit_cost,
                "consumption_date": str(result[9]) if result[9] else None,
                "consumption_type": consumption_type,
                "consumption_id": consumption_id_ref,
                "quantity_consumed": qty_consumed,
                "cost_amount": cost_amount,
                "created_by": result[14],
                "created_at": str(result[15]) if result[15] else None
            },
            "consuming_transaction": consuming_transaction,
            "cost_layer_status": layer_status,
            "other_consumptions_from_layer": other_consumptions,
            "cost_analysis": {
                "effective_unit_cost": cost_amount / qty_consumed if qty_consumed > 0 else 0,
                "matches_layer_cost": abs((cost_amount / qty_consumed if qty_consumed > 0 else 0) - layer_unit_cost) < 0.01
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
