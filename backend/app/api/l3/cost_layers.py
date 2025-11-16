from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/product/{product_id}/cost-layers")
async def get_product_cost_layers(
    product_id: int,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get cost layers for a product (for FIFO/LIFO costing)"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["cl.company_id = :company_id", "cl.product_id = :product_id", "cl.quantity_remaining > 0"]
        params = {"company_id": company_id, "product_id": product_id}
        
        if warehouse_id:
            where_clauses.append("cl.warehouse_id = :warehouse_id")
            params["warehouse_id"] = warehouse_id
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                cl.id,
                cl.receipt_date,
                cl.document_type,
                cl.document_number,
                cl.warehouse_id,
                w.name as warehouse_name,
                cl.lot_number,
                cl.serial_number,
                cl.quantity_received,
                cl.quantity_consumed,
                cl.quantity_remaining,
                cl.unit_cost,
                cl.total_cost,
                cl.quantity_remaining * cl.unit_cost as remaining_value,
                cl.costing_method
            FROM cost_layers cl
            LEFT JOIN warehouses w ON cl.warehouse_id = w.id
            WHERE {where_clause}
            ORDER BY cl.receipt_date, cl.id
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        layers = []
        total_quantity = 0
        total_value = 0
        
        for row in rows:
            qty_remaining = float(row[10]) if row[10] else 0
            remaining_value = float(row[13]) if row[13] else 0
            
            total_quantity += qty_remaining
            total_value += remaining_value
            
            layers.append({
                "id": row[0],
                "receipt_date": str(row[1]) if row[1] else None,
                "document_type": row[2],
                "document_number": row[3],
                "warehouse_id": row[4],
                "warehouse_name": row[5],
                "lot_number": row[6],
                "serial_number": row[7],
                "quantity_received": float(row[8]) if row[8] else 0,
                "quantity_consumed": float(row[9]) if row[9] else 0,
                "quantity_remaining": qty_remaining,
                "unit_cost": float(row[11]) if row[11] else 0,
                "total_cost": float(row[12]) if row[12] else 0,
                "remaining_value": remaining_value,
                "costing_method": row[14]
            })
        
        avg_cost = total_value / total_quantity if total_quantity > 0 else 0
        
        return {
            "layers": layers,
            "summary": {
                "total_quantity": total_quantity,
                "total_value": total_value,
                "average_cost": avg_cost
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product/{product_id}/cost-history")
async def get_product_cost_history(
    product_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get cost history for a product over time"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["cl.company_id = :company_id", "cl.product_id = :product_id"]
        params = {"company_id": company_id, "product_id": product_id}
        
        if start_date:
            where_clauses.append("cl.receipt_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("cl.receipt_date <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                cl.receipt_date,
                cl.unit_cost,
                cl.quantity_received,
                cl.document_type,
                cl.document_number,
                cl.costing_method
            FROM cost_layers cl
            WHERE {where_clause}
            ORDER BY cl.receipt_date DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "receipt_date": str(row[0]) if row[0] else None,
                "unit_cost": float(row[1]) if row[1] else 0,
                "quantity_received": float(row[2]) if row[2] else 0,
                "document_type": row[3],
                "document_number": row[4],
                "costing_method": row[5]
            })
        
        return {"history": history, "total_count": len(history)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/product/{product_id}/consume-cost-layer")
async def consume_cost_layer(
    product_id: int,
    quantity: float,
    warehouse_id: Optional[int] = None,
    costing_method: str = "FIFO",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Consume quantity from cost layers (FIFO/LIFO)"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["cl.company_id = :company_id", "cl.product_id = :product_id", "cl.quantity_remaining > 0"]
        params = {"company_id": company_id, "product_id": product_id}
        
        if warehouse_id:
            where_clauses.append("cl.warehouse_id = :warehouse_id")
            params["warehouse_id"] = warehouse_id
        
        where_clause = " AND ".join(where_clauses)
        
        order_clause = "cl.receipt_date, cl.id" if costing_method == "FIFO" else "cl.receipt_date DESC, cl.id DESC"
        
        query = text(f"""
            SELECT 
                cl.id,
                cl.quantity_remaining,
                cl.unit_cost
            FROM cost_layers cl
            WHERE {where_clause}
            ORDER BY {order_clause}
            FOR UPDATE
        """)
        
        result = db.execute(query, params)
        layers = result.fetchall()
        
        if not layers:
            raise HTTPException(status_code=400, detail="No cost layers available")
        
        remaining_qty = quantity
        total_cost = 0
        consumed_layers = []
        
        for layer in layers:
            if remaining_qty <= 0:
                break
            
            layer_id = layer[0]
            layer_qty = float(layer[1]) if layer[1] else 0
            layer_cost = float(layer[2]) if layer[2] else 0
            
            consume_qty = min(remaining_qty, layer_qty)
            consume_cost = consume_qty * layer_cost
            
            update_query = text("""
                UPDATE cost_layers
                SET 
                    quantity_consumed = quantity_consumed + :consume_qty,
                    quantity_remaining = quantity_remaining - :consume_qty,
                    updated_at = NOW()
                WHERE id = :layer_id AND company_id = :company_id
            """)
            
            db.execute(update_query, {
                "consume_qty": consume_qty,
                "layer_id": layer_id,
                "company_id": company_id
            })
            
            consumed_layers.append({
                "layer_id": layer_id,
                "quantity_consumed": consume_qty,
                "unit_cost": layer_cost,
                "total_cost": consume_cost
            })
            
            remaining_qty -= consume_qty
            total_cost += consume_cost
        
        if remaining_qty > 0:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient quantity in cost layers. Short by {remaining_qty}"
            )
        
        db.commit()
        
        avg_cost = total_cost / quantity if quantity > 0 else 0
        
        return {
            "consumed_layers": consumed_layers,
            "total_quantity": quantity,
            "total_cost": total_cost,
            "average_cost": avg_cost
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
