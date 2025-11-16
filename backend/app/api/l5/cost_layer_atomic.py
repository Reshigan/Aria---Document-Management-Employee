from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

try:
    from app.database import get_db
except ImportError:
    from database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class CostLayerUpdate(BaseModel):
    unit_cost: float = None
    notes: str = None


@router.get("/cost-layer/{layer_id}/atomic-detail")
async def get_cost_layer_atomic_detail(
    layer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single cost layer"""
    try:
        company_id = current_user.get("company_id", "default")
        
        layer_query = text("""
            SELECT 
                cl.id,
                cl.product_id,
                p.product_code,
                p.name as product_name,
                cl.warehouse_id,
                w.name as warehouse_name,
                cl.receipt_date,
                cl.receipt_type,
                cl.receipt_id,
                cl.quantity_received,
                cl.quantity_remaining,
                cl.unit_cost,
                cl.total_cost,
                cl.costing_method,
                cl.created_at,
                cl.created_by
            FROM cost_layers cl
            JOIN products p ON cl.product_id = p.id
            JOIN warehouses w ON cl.warehouse_id = w.id
            WHERE cl.id = :layer_id AND cl.company_id = :company_id
        """)
        
        layer_result = db.execute(layer_query, {
            "layer_id": layer_id,
            "company_id": company_id
        }).fetchone()
        
        if not layer_result:
            raise HTTPException(status_code=404, detail="Cost layer not found")
        
        consumption_query = text("""
            SELECT 
                clc.id,
                clc.consumption_date,
                clc.consumption_type,
                clc.consumption_id,
                clc.quantity_consumed,
                clc.cost_amount,
                clc.created_by
            FROM cost_layer_consumption clc
            WHERE clc.cost_layer_id = :layer_id
                AND clc.company_id = :company_id
            ORDER BY clc.consumption_date DESC
        """)
        
        consumption_result = db.execute(consumption_query, {
            "layer_id": layer_id,
            "company_id": company_id
        })
        
        consumption_records = []
        total_consumed_qty = 0
        total_consumed_cost = 0
        
        for row in consumption_result.fetchall():
            qty = float(row[4]) if row[4] else 0
            cost = float(row[5]) if row[5] else 0
            total_consumed_qty += qty
            total_consumed_cost += cost
            
            consumption_records.append({
                "id": row[0],
                "consumption_date": str(row[1]) if row[1] else None,
                "consumption_type": row[2],
                "consumption_id": row[3],
                "quantity_consumed": qty,
                "cost_amount": cost,
                "created_by": row[6]
            })
        
        receipt_source = None
        receipt_type = layer_result[7]
        receipt_id = layer_result[8]
        
        if receipt_type == "GOODS_RECEIPT":
            source_query = text("""
                SELECT 
                    gr.receipt_number,
                    gr.receipt_date,
                    gr.supplier_id,
                    s.name as supplier_name
                FROM goods_receipts gr
                JOIN suppliers s ON gr.supplier_id = s.id
                WHERE gr.id = :receipt_id AND gr.company_id = :company_id
            """)
            
            source_result = db.execute(source_query, {
                "receipt_id": receipt_id,
                "company_id": company_id
            }).fetchone()
            
            if source_result:
                receipt_source = {
                    "type": "GOODS_RECEIPT",
                    "receipt_number": source_result[0],
                    "receipt_date": str(source_result[1]) if source_result[1] else None,
                    "supplier_id": source_result[2],
                    "supplier_name": source_result[3]
                }
        
        qty_received = float(layer_result[9]) if layer_result[9] else 0
        qty_remaining = float(layer_result[10]) if layer_result[10] else 0
        unit_cost = float(layer_result[11]) if layer_result[11] else 0
        total_cost = float(layer_result[12]) if layer_result[12] else 0
        
        return {
            "cost_layer": {
                "id": layer_result[0],
                "product_id": layer_result[1],
                "product_code": layer_result[2],
                "product_name": layer_result[3],
                "warehouse_id": layer_result[4],
                "warehouse_name": layer_result[5],
                "receipt_date": str(layer_result[6]) if layer_result[6] else None,
                "receipt_type": receipt_type,
                "receipt_id": receipt_id,
                "quantity_received": qty_received,
                "quantity_remaining": qty_remaining,
                "unit_cost": unit_cost,
                "total_cost": total_cost,
                "costing_method": layer_result[13],
                "created_at": str(layer_result[14]) if layer_result[14] else None,
                "created_by": layer_result[15]
            },
            "receipt_source": receipt_source,
            "consumption_summary": {
                "total_consumed_quantity": total_consumed_qty,
                "total_consumed_cost": total_consumed_cost,
                "consumption_count": len(consumption_records),
                "utilization_percent": (total_consumed_qty / qty_received * 100) if qty_received > 0 else 0
            },
            "consumption_records": consumption_records
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/cost-layer/{layer_id}")
async def update_cost_layer(
    layer_id: int,
    update_data: CostLayerUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a cost layer record"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE cost_layers
            SET 
                unit_cost = COALESCE(:unit_cost, unit_cost),
                updated_at = NOW()
            WHERE id = :layer_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "unit_cost": update_data.unit_cost,
            "layer_id": layer_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Cost layer updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
