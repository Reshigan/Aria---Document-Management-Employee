from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

try:
    from app.auth import get_db, get_current_user
except ImportError:
    try:
        from auth_integrated import get_db, get_current_user
    except ImportError:
        from app.database import SessionLocal
        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        from auth_integrated import get_current_user

router = APIRouter()


class DeliveryScheduleCreate(BaseModel):
    sales_order_line_id: int
    scheduled_date: str
    scheduled_quantity: float
    warehouse_id: Optional[int] = None
    notes: Optional[str] = None


@router.get("/sales-order-line/{line_id}/delivery-schedules")
async def get_delivery_schedules(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all delivery schedules for a sales order line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        line_query = text("""
            SELECT 
                sol.sales_order_id,
                so.order_number,
                sol.product_id,
                p.name as product_name,
                sol.quantity,
                sol.quantity_delivered
            FROM sales_order_lines sol
            JOIN sales_orders so ON sol.sales_order_id = so.id
            JOIN products p ON sol.product_id = p.id
            WHERE sol.id = :line_id AND so.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {"line_id": line_id, "company_id": company_id}).fetchone()
        
        if not line_result:
            raise HTTPException(status_code=404, detail="Sales order line not found")
        
        schedules_query = text("""
            SELECT 
                ds.id,
                ds.scheduled_date,
                ds.scheduled_quantity,
                ds.delivered_quantity,
                ds.warehouse_id,
                w.name as warehouse_name,
                ds.status,
                ds.notes,
                ds.actual_delivery_date
            FROM delivery_schedules ds
            LEFT JOIN warehouses w ON ds.warehouse_id = w.id
            WHERE ds.sales_order_line_id = :line_id AND ds.company_id = :company_id
            ORDER BY ds.scheduled_date
        """)
        
        schedules_result = db.execute(schedules_query, {"line_id": line_id, "company_id": company_id})
        
        schedules = []
        total_scheduled = 0
        total_delivered = 0
        
        for row in schedules_result.fetchall():
            scheduled_qty = float(row[2]) if row[2] else 0
            delivered_qty = float(row[3]) if row[3] else 0
            
            total_scheduled += scheduled_qty
            total_delivered += delivered_qty
            
            schedules.append({
                "id": row[0],
                "scheduled_date": str(row[1]) if row[1] else None,
                "scheduled_quantity": scheduled_qty,
                "delivered_quantity": delivered_qty,
                "warehouse_id": row[4],
                "warehouse_name": row[5],
                "status": row[6],
                "notes": row[7],
                "actual_delivery_date": str(row[8]) if row[8] else None
            })
        
        return {
            "line": {
                "sales_order_id": line_result[0],
                "order_number": line_result[1],
                "product_id": line_result[2],
                "product_name": line_result[3],
                "quantity": float(line_result[4]) if line_result[4] else 0,
                "quantity_delivered": float(line_result[5]) if line_result[5] else 0
            },
            "schedules": schedules,
            "summary": {
                "total_scheduled": total_scheduled,
                "total_delivered": total_delivered,
                "remaining_to_schedule": float(line_result[4]) - total_scheduled if line_result[4] else 0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sales-order-line/{line_id}/delivery-schedule")
async def create_delivery_schedule(
    line_id: int,
    schedule: DeliveryScheduleCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a delivery schedule for a sales order line"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        validation_query = text("""
            SELECT 
                sol.quantity,
                COALESCE(SUM(ds.scheduled_quantity), 0) as total_scheduled
            FROM sales_order_lines sol
            JOIN sales_orders so ON sol.sales_order_id = so.id
            LEFT JOIN delivery_schedules ds ON sol.id = ds.sales_order_line_id
            WHERE sol.id = :line_id AND so.company_id = :company_id
            GROUP BY sol.quantity
        """)
        
        validation_result = db.execute(validation_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not validation_result:
            raise HTTPException(status_code=404, detail="Sales order line not found")
        
        line_quantity = float(validation_result[0]) if validation_result[0] else 0
        total_scheduled = float(validation_result[1]) if validation_result[1] else 0
        
        if total_scheduled + schedule.scheduled_quantity > line_quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot schedule {schedule.scheduled_quantity}. Only {line_quantity - total_scheduled} remaining to schedule."
            )
        
        insert_query = text("""
            INSERT INTO delivery_schedules (
                sales_order_line_id, scheduled_date, scheduled_quantity,
                warehouse_id, notes, company_id, created_by, created_at
            ) VALUES (
                :sales_order_line_id, :scheduled_date, :scheduled_quantity,
                :warehouse_id, :notes, :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "sales_order_line_id": line_id,
            "scheduled_date": schedule.scheduled_date,
            "scheduled_quantity": schedule.scheduled_quantity,
            "warehouse_id": schedule.warehouse_id,
            "notes": schedule.notes,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        schedule_id = result.fetchone()[0]
        
        return {"id": schedule_id, "message": "Delivery schedule created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/delivery-schedule/{schedule_id}")
async def update_delivery_schedule(
    schedule_id: int,
    scheduled_date: Optional[str] = None,
    scheduled_quantity: Optional[float] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a delivery schedule"""
    try:
        company_id = current_user.get("company_id", "default")
        
        updates = []
        params = {"schedule_id": schedule_id, "company_id": company_id}
        
        if scheduled_date is not None:
            updates.append("scheduled_date = :scheduled_date")
            params["scheduled_date"] = scheduled_date
        
        if scheduled_quantity is not None:
            updates.append("scheduled_quantity = :scheduled_quantity")
            params["scheduled_quantity"] = scheduled_quantity
        
        if notes is not None:
            updates.append("notes = :notes")
            params["notes"] = notes
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        update_clause = ", ".join(updates)
        
        query = text(f"""
            UPDATE delivery_schedules
            SET {update_clause}
            WHERE id = :schedule_id AND company_id = :company_id
        """)
        
        db.execute(query, params)
        db.commit()
        
        return {"message": "Delivery schedule updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delivery-schedule/{schedule_id}")
async def delete_delivery_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a delivery schedule"""
    try:
        company_id = current_user.get("company_id", "default")
        
        check_query = text("""
            SELECT delivered_quantity
            FROM delivery_schedules
            WHERE id = :schedule_id AND company_id = :company_id
        """)
        
        check_result = db.execute(check_query, {
            "schedule_id": schedule_id,
            "company_id": company_id
        }).fetchone()
        
        if not check_result:
            raise HTTPException(status_code=404, detail="Delivery schedule not found")
        
        if check_result[0] and float(check_result[0]) > 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete schedule with delivered quantity"
            )
        
        delete_query = text("""
            DELETE FROM delivery_schedules
            WHERE id = :schedule_id AND company_id = :company_id
        """)
        
        db.execute(delete_query, {"schedule_id": schedule_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Delivery schedule deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delivery-schedule/{schedule_id}/fulfill")
async def fulfill_delivery_schedule(
    schedule_id: int,
    delivered_quantity: float,
    actual_delivery_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark a delivery schedule as fulfilled"""
    try:
        company_id = current_user.get("company_id", "default")
        
        if not actual_delivery_date:
            actual_delivery_date = str(__import__('datetime').date.today())
        
        update_query = text("""
            UPDATE delivery_schedules
            SET 
                delivered_quantity = :delivered_quantity,
                actual_delivery_date = :actual_delivery_date,
                status = CASE 
                    WHEN :delivered_quantity >= scheduled_quantity THEN 'FULFILLED'
                    WHEN :delivered_quantity > 0 THEN 'PARTIAL'
                    ELSE 'PENDING'
                END,
                updated_at = NOW()
            WHERE id = :schedule_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "delivered_quantity": delivered_quantity,
            "actual_delivery_date": actual_delivery_date,
            "schedule_id": schedule_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Delivery schedule fulfilled successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
