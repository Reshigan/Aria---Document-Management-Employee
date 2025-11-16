from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

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


@router.get("/sales-order-line-allocation/{allocation_id}")
async def get_allocation_detail(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a specific sales order line allocation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                sola.id,
                sola.sales_order_line_id,
                sol.line_number,
                sol.product_id,
                p.product_code,
                p.name as product_name,
                so.order_number,
                so.customer_id,
                c.name as customer_name,
                sola.warehouse_id,
                w.name as warehouse_name,
                sola.allocated_quantity,
                sola.picked_quantity,
                sola.shipped_quantity,
                sola.allocation_status,
                sola.bin_location,
                sola.lot_number,
                sola.serial_number,
                sola.allocated_at,
                sola.picked_at,
                sola.shipped_at,
                sola.allocated_by,
                sola.picked_by,
                sola.shipped_by
            FROM sales_order_line_allocations sola
            JOIN sales_order_lines sol ON sola.sales_order_line_id = sol.id
            JOIN sales_orders so ON sol.sales_order_id = so.id
            JOIN customers c ON so.customer_id = c.id
            JOIN products p ON sol.product_id = p.id
            LEFT JOIN warehouses w ON sola.warehouse_id = w.id
            WHERE sola.id = :allocation_id AND so.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "allocation_id": allocation_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Allocation not found")
        
        availability_query = text("""
            SELECT 
                COALESCE(SUM(
                    CASE il.transaction_type
                        WHEN 'IN' THEN il.quantity
                        WHEN 'OUT' THEN -il.quantity
                        ELSE 0
                    END
                ), 0) as available_quantity
            FROM item_ledger il
            WHERE il.product_id = :product_id
                AND il.warehouse_id = :warehouse_id
                AND il.company_id = :company_id
                AND il.transaction_date <= :allocated_at
        """)
        
        availability_result = db.execute(availability_query, {
            "product_id": result[3],
            "warehouse_id": result[9],
            "company_id": company_id,
            "allocated_at": result[18]
        }).fetchone()
        
        tracking_details = None
        if result[16]:  # lot_number
            lot_query = text("""
                SELECT 
                    lot_number,
                    expiry_date,
                    manufacture_date,
                    quantity_on_hand
                FROM inventory_lot_tracking
                WHERE lot_number = :lot_number
                    AND product_id = :product_id
                    AND company_id = :company_id
            """)
            
            lot_result = db.execute(lot_query, {
                "lot_number": result[16],
                "product_id": result[3],
                "company_id": company_id
            }).fetchone()
            
            if lot_result:
                tracking_details = {
                    "type": "LOT",
                    "lot_number": lot_result[0],
                    "expiry_date": str(lot_result[1]) if lot_result[1] else None,
                    "manufacture_date": str(lot_result[2]) if lot_result[2] else None,
                    "quantity_on_hand": float(lot_result[3]) if lot_result[3] else 0
                }
        
        if result[17]:  # serial_number
            serial_query = text("""
                SELECT 
                    serial_number,
                    status,
                    warranty_expiry,
                    last_transaction_date
                FROM inventory_serial_tracking
                WHERE serial_number = :serial_number
                    AND product_id = :product_id
                    AND company_id = :company_id
            """)
            
            serial_result = db.execute(serial_query, {
                "serial_number": result[17],
                "product_id": result[3],
                "company_id": company_id
            }).fetchone()
            
            if serial_result:
                tracking_details = {
                    "type": "SERIAL",
                    "serial_number": serial_result[0],
                    "status": serial_result[1],
                    "warranty_expiry": str(serial_result[2]) if serial_result[2] else None,
                    "last_transaction_date": str(serial_result[3]) if serial_result[3] else None
                }
        
        return {
            "allocation": {
                "id": result[0],
                "sales_order_line_id": result[1],
                "line_number": result[2],
                "product_id": result[3],
                "product_code": result[4],
                "product_name": result[5],
                "order_number": result[6],
                "customer_id": result[7],
                "customer_name": result[8],
                "warehouse_id": result[9],
                "warehouse_name": result[10],
                "allocated_quantity": float(result[11]) if result[11] else 0,
                "picked_quantity": float(result[12]) if result[12] else 0,
                "shipped_quantity": float(result[13]) if result[13] else 0,
                "allocation_status": result[14],
                "bin_location": result[15],
                "lot_number": result[16],
                "serial_number": result[17],
                "allocated_at": str(result[18]) if result[18] else None,
                "picked_at": str(result[19]) if result[19] else None,
                "shipped_at": str(result[20]) if result[20] else None,
                "allocated_by": result[21],
                "picked_by": result[22],
                "shipped_by": result[23]
            },
            "inventory_context": {
                "available_at_allocation": float(availability_result[0]) if availability_result else 0
            },
            "tracking_details": tracking_details
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/sales-order-line-allocation/{allocation_id}/pick")
async def record_pick(
    allocation_id: int,
    picked_quantity: float,
    bin_location: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Record picking for an allocation"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE sales_order_line_allocations sola
            SET 
                picked_quantity = :picked_quantity,
                bin_location = COALESCE(:bin_location, bin_location),
                allocation_status = CASE 
                    WHEN :picked_quantity >= allocated_quantity THEN 'PICKED'
                    ELSE 'PARTIALLY_PICKED'
                END,
                picked_at = NOW(),
                picked_by = :picked_by,
                updated_at = NOW()
            FROM sales_order_lines sol
            JOIN sales_orders so ON sol.sales_order_id = so.id
            WHERE sola.sales_order_line_id = sol.id
                AND sola.id = :allocation_id
                AND so.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "picked_quantity": picked_quantity,
            "bin_location": bin_location,
            "picked_by": user_email,
            "allocation_id": allocation_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Pick recorded successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/sales-order-line-allocation/{allocation_id}/ship")
async def record_shipment(
    allocation_id: int,
    shipped_quantity: float,
    tracking_number: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Record shipment for an allocation"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE sales_order_line_allocations sola
            SET 
                shipped_quantity = :shipped_quantity,
                allocation_status = CASE 
                    WHEN :shipped_quantity >= allocated_quantity THEN 'SHIPPED'
                    ELSE 'PARTIALLY_SHIPPED'
                END,
                shipped_at = NOW(),
                shipped_by = :shipped_by,
                updated_at = NOW()
            FROM sales_order_lines sol
            JOIN sales_orders so ON sol.sales_order_id = so.id
            WHERE sola.sales_order_line_id = sol.id
                AND sola.id = :allocation_id
                AND so.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "shipped_quantity": shipped_quantity,
            "shipped_by": user_email,
            "allocation_id": allocation_id,
            "company_id": company_id
        })
        
        get_allocation_query = text("""
            SELECT 
                sol.product_id,
                sola.warehouse_id,
                sol.unit_price
            FROM sales_order_line_allocations sola
            JOIN sales_order_lines sol ON sola.sales_order_line_id = sol.id
            JOIN sales_orders so ON sol.sales_order_id = so.id
            WHERE sola.id = :allocation_id AND so.company_id = :company_id
        """)
        
        allocation_data = db.execute(get_allocation_query, {
            "allocation_id": allocation_id,
            "company_id": company_id
        }).fetchone()
        
        if allocation_data:
            inventory_query = text("""
                INSERT INTO item_ledger (
                    product_id, warehouse_id, transaction_type,
                    transaction_date, quantity, unit_cost,
                    reference_type, reference_id,
                    company_id, created_by, created_at
                ) VALUES (
                    :product_id, :warehouse_id, 'OUT',
                    CURRENT_DATE, :quantity, :unit_cost,
                    'SALES_ORDER_ALLOCATION', :allocation_id,
                    :company_id, :created_by, NOW()
                )
            """)
            
            db.execute(inventory_query, {
                "product_id": allocation_data[0],
                "warehouse_id": allocation_data[1],
                "quantity": shipped_quantity,
                "unit_cost": allocation_data[2],
                "allocation_id": allocation_id,
                "company_id": company_id,
                "created_by": user_email
            })
        
        db.commit()
        
        return {"message": "Shipment recorded successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sales-order-line-allocation/{allocation_id}/history")
async def get_allocation_history(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get history of changes for an allocation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                at.id,
                at.field_name,
                at.old_value,
                at.new_value,
                at.changed_by,
                at.changed_at,
                at.change_reason
            FROM audit_trail at
            WHERE at.entity_type = 'SALES_ORDER_LINE_ALLOCATION'
                AND at.entity_id = :allocation_id
                AND at.company_id = :company_id
            ORDER BY at.changed_at DESC
        """)
        
        result = db.execute(query, {
            "allocation_id": allocation_id,
            "company_id": company_id
        })
        
        history = []
        for row in result.fetchall():
            history.append({
                "id": row[0],
                "field_name": row[1],
                "old_value": row[2],
                "new_value": row[3],
                "changed_by": row[4],
                "changed_at": str(row[5]) if row[5] else None,
                "change_reason": row[6]
            })
        
        return {"allocation_history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
