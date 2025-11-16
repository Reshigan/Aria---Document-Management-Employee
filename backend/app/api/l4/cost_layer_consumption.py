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


@router.get("/cost-layer/{layer_id}/consumption-history")
async def get_cost_layer_consumption_history(
    layer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get consumption history for a specific cost layer"""
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
                cl.receipt_quantity,
                cl.remaining_quantity,
                cl.unit_cost,
                cl.total_cost,
                cl.costing_method,
                cl.reference_type,
                cl.reference_id,
                cl.lot_number,
                cl.created_at
            FROM cost_layers cl
            JOIN products p ON cl.product_id = p.id
            LEFT JOIN warehouses w ON cl.warehouse_id = w.id
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
                clc.quantity_consumed,
                clc.unit_cost,
                (clc.quantity_consumed * clc.unit_cost) as total_value,
                clc.transaction_type,
                clc.reference_type,
                clc.reference_id,
                clc.created_by,
                clc.created_at
            FROM cost_layer_consumption clc
            WHERE clc.cost_layer_id = :layer_id
                AND clc.company_id = :company_id
            ORDER BY clc.consumption_date DESC, clc.created_at DESC
        """)
        
        consumption_result = db.execute(consumption_query, {
            "layer_id": layer_id,
            "company_id": company_id
        })
        
        consumption_history = []
        total_consumed = 0
        total_value_consumed = 0
        
        for row in consumption_result.fetchall():
            qty = float(row[2]) if row[2] else 0
            value = float(row[4]) if row[4] else 0
            total_consumed += qty
            total_value_consumed += value
            
            consumption_history.append({
                "id": row[0],
                "consumption_date": str(row[1]) if row[1] else None,
                "quantity_consumed": qty,
                "unit_cost": float(row[3]) if row[3] else 0,
                "total_value": value,
                "transaction_type": row[5],
                "reference_type": row[6],
                "reference_id": row[7],
                "created_by": row[8],
                "created_at": str(row[9]) if row[9] else None
            })
        
        for consumption in consumption_history:
            if consumption["reference_type"] == "SALES_ORDER":
                doc_query = text("""
                    SELECT order_number, customer_id, c.name as customer_name
                    FROM sales_orders so
                    JOIN customers c ON so.customer_id = c.id
                    WHERE so.id = :ref_id AND so.company_id = :company_id
                """)
                
                doc_result = db.execute(doc_query, {
                    "ref_id": consumption["reference_id"],
                    "company_id": company_id
                }).fetchone()
                
                if doc_result:
                    consumption["source_document"] = {
                        "order_number": doc_result[0],
                        "customer_id": doc_result[1],
                        "customer_name": doc_result[2]
                    }
            
            elif consumption["reference_type"] == "MANUFACTURING_ORDER":
                doc_query = text("""
                    SELECT mo_number, product_id, p.name as product_name
                    FROM manufacturing_orders mo
                    JOIN products p ON mo.product_id = p.id
                    WHERE mo.id = :ref_id AND mo.company_id = :company_id
                """)
                
                doc_result = db.execute(doc_query, {
                    "ref_id": consumption["reference_id"],
                    "company_id": company_id
                }).fetchone()
                
                if doc_result:
                    consumption["source_document"] = {
                        "mo_number": doc_result[0],
                        "product_id": doc_result[1],
                        "product_name": doc_result[2]
                    }
        
        return {
            "cost_layer": {
                "id": layer_result[0],
                "product_id": layer_result[1],
                "product_code": layer_result[2],
                "product_name": layer_result[3],
                "warehouse_id": layer_result[4],
                "warehouse_name": layer_result[5],
                "receipt_date": str(layer_result[6]) if layer_result[6] else None,
                "receipt_quantity": float(layer_result[7]) if layer_result[7] else 0,
                "remaining_quantity": float(layer_result[8]) if layer_result[8] else 0,
                "unit_cost": float(layer_result[9]) if layer_result[9] else 0,
                "total_cost": float(layer_result[10]) if layer_result[10] else 0,
                "costing_method": layer_result[11],
                "reference_type": layer_result[12],
                "reference_id": layer_result[13],
                "lot_number": layer_result[14],
                "created_at": str(layer_result[15]) if layer_result[15] else None
            },
            "consumption_history": consumption_history,
            "consumption_summary": {
                "total_quantity_consumed": total_consumed,
                "total_value_consumed": total_value_consumed,
                "remaining_quantity": float(layer_result[8]) if layer_result[8] else 0,
                "remaining_value": (float(layer_result[8]) * float(layer_result[9])) if layer_result[8] and layer_result[9] else 0,
                "consumption_count": len(consumption_history)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product/{product_id}/cost-layers-with-consumption")
async def get_product_cost_layers_with_consumption(
    product_id: int,
    warehouse_id: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all cost layers for a product with consumption summary"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clause = "cl.product_id = :product_id AND cl.company_id = :company_id"
        params = {"product_id": product_id, "company_id": company_id}
        
        if warehouse_id:
            where_clause += " AND cl.warehouse_id = :warehouse_id"
            params["warehouse_id"] = warehouse_id
        
        query = text(f"""
            SELECT 
                cl.id,
                cl.receipt_date,
                cl.receipt_quantity,
                cl.remaining_quantity,
                cl.unit_cost,
                cl.total_cost,
                w.name as warehouse_name,
                cl.lot_number,
                COALESCE(
                    (SELECT SUM(clc.quantity_consumed)
                     FROM cost_layer_consumption clc
                     WHERE clc.cost_layer_id = cl.id),
                    0
                ) as total_consumed
            FROM cost_layers cl
            LEFT JOIN warehouses w ON cl.warehouse_id = w.id
            WHERE {where_clause}
            ORDER BY cl.receipt_date ASC, cl.created_at ASC
        """)
        
        result = db.execute(query, params)
        
        cost_layers = []
        total_remaining_qty = 0
        total_remaining_value = 0
        
        for row in result.fetchall():
            remaining_qty = float(row[3]) if row[3] else 0
            unit_cost = float(row[4]) if row[4] else 0
            remaining_value = remaining_qty * unit_cost
            
            total_remaining_qty += remaining_qty
            total_remaining_value += remaining_value
            
            cost_layers.append({
                "id": row[0],
                "receipt_date": str(row[1]) if row[1] else None,
                "receipt_quantity": float(row[2]) if row[2] else 0,
                "remaining_quantity": remaining_qty,
                "unit_cost": unit_cost,
                "total_cost": float(row[5]) if row[5] else 0,
                "warehouse_name": row[6],
                "lot_number": row[7],
                "total_consumed": float(row[8]) if row[8] else 0,
                "remaining_value": remaining_value
            })
        
        return {
            "cost_layers": cost_layers,
            "summary": {
                "total_layers": len(cost_layers),
                "total_remaining_quantity": total_remaining_qty,
                "total_remaining_value": total_remaining_value,
                "weighted_average_cost": total_remaining_value / total_remaining_qty if total_remaining_qty > 0 else 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cost-layer/{layer_id}/consume")
async def consume_from_cost_layer(
    layer_id: int,
    quantity: float,
    reference_type: str,
    reference_id: int,
    transaction_type: str = "SALES",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Record consumption from a cost layer"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        layer_query = text("""
            SELECT 
                remaining_quantity,
                unit_cost
            FROM cost_layers
            WHERE id = :layer_id AND company_id = :company_id
        """)
        
        layer_result = db.execute(layer_query, {
            "layer_id": layer_id,
            "company_id": company_id
        }).fetchone()
        
        if not layer_result:
            raise HTTPException(status_code=404, detail="Cost layer not found")
        
        remaining_qty = float(layer_result[0]) if layer_result[0] else 0
        
        if quantity > remaining_qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient quantity in cost layer. Available: {remaining_qty}, Requested: {quantity}"
            )
        
        consumption_query = text("""
            INSERT INTO cost_layer_consumption (
                cost_layer_id, consumption_date, quantity_consumed,
                unit_cost, transaction_type, reference_type, reference_id,
                company_id, created_by, created_at
            ) VALUES (
                :layer_id, CURRENT_DATE, :quantity,
                :unit_cost, :transaction_type, :reference_type, :reference_id,
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        consumption_result = db.execute(consumption_query, {
            "layer_id": layer_id,
            "quantity": quantity,
            "unit_cost": layer_result[1],
            "transaction_type": transaction_type,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "company_id": company_id,
            "created_by": user_email
        })
        
        consumption_id = consumption_result.fetchone()[0]
        
        update_query = text("""
            UPDATE cost_layers
            SET 
                remaining_quantity = remaining_quantity - :quantity,
                updated_at = NOW()
            WHERE id = :layer_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "quantity": quantity,
            "layer_id": layer_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {
            "message": "Consumption recorded successfully",
            "consumption_id": consumption_id,
            "quantity_consumed": quantity,
            "unit_cost": float(layer_result[1]) if layer_result[1] else 0,
            "total_value": quantity * (float(layer_result[1]) if layer_result[1] else 0)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
