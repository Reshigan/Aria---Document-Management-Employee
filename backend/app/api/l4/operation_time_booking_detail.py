from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class TimeBookingUpdate(BaseModel):
    actual_hours: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None


@router.get("/time-booking/{booking_id}/detail")
async def get_time_booking_detail(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a specific time booking"""
    try:
        company_id = current_user.get("company_id", "default")
        
        booking_query = text("""
            SELECT 
                tb.id,
                tb.manufacturing_order_id,
                mo.mo_number,
                tb.operation_id,
                r.operation_name,
                r.work_center_id,
                wc.name as work_center_name,
                tb.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                tb.booking_date,
                tb.start_time,
                tb.end_time,
                tb.actual_hours,
                tb.standard_hours,
                tb.efficiency_percent,
                tb.status,
                tb.notes,
                mo.product_id,
                p.name as product_name,
                mo.quantity as mo_quantity,
                tb.quantity_completed,
                tb.quantity_rejected,
                tb.created_by,
                tb.created_at
            FROM time_bookings tb
            JOIN manufacturing_orders mo ON tb.manufacturing_order_id = mo.id
            JOIN routing_operations r ON tb.operation_id = r.id
            JOIN work_centers wc ON r.work_center_id = wc.id
            JOIN employees e ON tb.employee_id = e.id
            JOIN products p ON mo.product_id = p.id
            WHERE tb.id = :booking_id AND mo.company_id = :company_id
        """)
        
        booking_result = db.execute(booking_query, {
            "booking_id": booking_id,
            "company_id": company_id
        }).fetchone()
        
        if not booking_result:
            raise HTTPException(status_code=404, detail="Time booking not found")
        
        actual_hours = float(booking_result[12]) if booking_result[12] else 0
        standard_hours = float(booking_result[13]) if booking_result[13] else 0
        efficiency = float(booking_result[14]) if booking_result[14] else 0
        
        if actual_hours > 0 and standard_hours > 0:
            calculated_efficiency = (standard_hours / actual_hours) * 100
        else:
            calculated_efficiency = 0
        
        labor_cost_query = text("""
            SELECT 
                e.hourly_rate,
                wc.hourly_rate as work_center_rate
            FROM employees e
            JOIN time_bookings tb ON e.id = tb.employee_id
            JOIN routing_operations r ON tb.operation_id = r.id
            JOIN work_centers wc ON r.work_center_id = wc.id
            WHERE tb.id = :booking_id
        """)
        
        cost_result = db.execute(labor_cost_query, {
            "booking_id": booking_id
        }).fetchone()
        
        employee_rate = float(cost_result[0]) if cost_result and cost_result[0] else 0
        wc_rate = float(cost_result[1]) if cost_result and cost_result[1] else 0
        
        labor_cost = actual_hours * employee_rate
        overhead_cost = actual_hours * wc_rate
        total_cost = labor_cost + overhead_cost
        
        related_bookings_query = text("""
            SELECT 
                tb.id,
                tb.booking_date,
                e.first_name || ' ' || e.last_name as employee_name,
                tb.actual_hours,
                tb.quantity_completed,
                tb.status
            FROM time_bookings tb
            JOIN employees e ON tb.employee_id = e.id
            JOIN manufacturing_orders mo ON tb.manufacturing_order_id = mo.id
            WHERE tb.manufacturing_order_id = :mo_id
                AND tb.operation_id = :operation_id
                AND tb.id != :booking_id
                AND mo.company_id = :company_id
            ORDER BY tb.booking_date DESC
        """)
        
        related_result = db.execute(related_bookings_query, {
            "mo_id": booking_result[1],
            "operation_id": booking_result[3],
            "booking_id": booking_id,
            "company_id": company_id
        })
        
        related_bookings = []
        for row in related_result.fetchall():
            related_bookings.append({
                "id": row[0],
                "booking_date": str(row[1]) if row[1] else None,
                "employee_name": row[2],
                "actual_hours": float(row[3]) if row[3] else 0,
                "quantity_completed": float(row[4]) if row[4] else 0,
                "status": row[5]
            })
        
        approval_query = text("""
            SELECT 
                ah.id,
                ah.action,
                ah.approver_email,
                ah.approval_date,
                ah.comments
            FROM approval_history ah
            WHERE ah.entity_type = 'TIME_BOOKING'
                AND ah.entity_id = :booking_id
                AND ah.company_id = :company_id
            ORDER BY ah.approval_date DESC
        """)
        
        approval_result = db.execute(approval_query, {
            "booking_id": booking_id,
            "company_id": company_id
        })
        
        approval_history = []
        for row in approval_result.fetchall():
            approval_history.append({
                "id": row[0],
                "action": row[1],
                "approver_email": row[2],
                "approval_date": str(row[3]) if row[3] else None,
                "comments": row[4]
            })
        
        return {
            "time_booking": {
                "id": booking_result[0],
                "manufacturing_order_id": booking_result[1],
                "mo_number": booking_result[2],
                "operation_id": booking_result[3],
                "operation_name": booking_result[4],
                "work_center_id": booking_result[5],
                "work_center_name": booking_result[6],
                "employee_id": booking_result[7],
                "employee_name": booking_result[8],
                "booking_date": str(booking_result[9]) if booking_result[9] else None,
                "start_time": str(booking_result[10]) if booking_result[10] else None,
                "end_time": str(booking_result[11]) if booking_result[11] else None,
                "actual_hours": actual_hours,
                "standard_hours": standard_hours,
                "efficiency_percent": efficiency,
                "calculated_efficiency": calculated_efficiency,
                "status": booking_result[15],
                "notes": booking_result[16],
                "product_id": booking_result[17],
                "product_name": booking_result[18],
                "mo_quantity": float(booking_result[19]) if booking_result[19] else 0,
                "quantity_completed": float(booking_result[20]) if booking_result[20] else 0,
                "quantity_rejected": float(booking_result[21]) if booking_result[21] else 0,
                "created_by": booking_result[22],
                "created_at": str(booking_result[23]) if booking_result[23] else None
            },
            "cost_analysis": {
                "employee_hourly_rate": employee_rate,
                "work_center_hourly_rate": wc_rate,
                "labor_cost": labor_cost,
                "overhead_cost": overhead_cost,
                "total_cost": total_cost,
                "cost_per_unit": total_cost / booking_result[20] if booking_result[20] and booking_result[20] > 0 else 0
            },
            "related_bookings": related_bookings,
            "approval_history": approval_history
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/time-booking/{booking_id}")
async def update_time_booking(
    booking_id: int,
    update_data: TimeBookingUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a time booking"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_fields = []
        params = {"booking_id": booking_id, "company_id": company_id}
        
        if update_data.actual_hours is not None:
            update_fields.append("actual_hours = :actual_hours")
            params["actual_hours"] = update_data.actual_hours
            
            update_fields.append("efficiency_percent = (standard_hours / :actual_hours) * 100")
        
        if update_data.notes is not None:
            update_fields.append("notes = :notes")
            params["notes"] = update_data.notes
        
        if update_data.status is not None:
            update_fields.append("status = :status")
            params["status"] = update_data.status
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_fields.append("updated_at = NOW()")
        
        update_query = text(f"""
            UPDATE time_bookings tb
            SET {", ".join(update_fields)}
            FROM manufacturing_orders mo
            WHERE tb.manufacturing_order_id = mo.id
                AND tb.id = :booking_id
                AND mo.company_id = :company_id
        """)
        
        db.execute(update_query, params)
        db.commit()
        
        return {"message": "Time booking updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/time-booking/{booking_id}/submit-for-approval")
async def submit_for_approval(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Submit time booking for approval"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE time_bookings tb
            SET 
                status = 'PENDING_APPROVAL',
                updated_at = NOW()
            FROM manufacturing_orders mo
            WHERE tb.manufacturing_order_id = mo.id
                AND tb.id = :booking_id
                AND mo.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "booking_id": booking_id,
            "company_id": company_id
        })
        
        approval_query = text("""
            INSERT INTO approval_history (
                entity_type, entity_id, action,
                approver_email, approval_date, comments,
                company_id, created_at
            ) VALUES (
                'TIME_BOOKING', :booking_id, 'SUBMITTED',
                :user_email, NOW(), 'Submitted for approval',
                :company_id, NOW()
            )
        """)
        
        db.execute(approval_query, {
            "booking_id": booking_id,
            "user_email": user_email,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Time booking submitted for approval"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/time-booking/{booking_id}/approve")
async def approve_time_booking(
    booking_id: int,
    comments: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Approve a time booking"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE time_bookings tb
            SET 
                status = 'APPROVED',
                updated_at = NOW()
            FROM manufacturing_orders mo
            WHERE tb.manufacturing_order_id = mo.id
                AND tb.id = :booking_id
                AND mo.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "booking_id": booking_id,
            "company_id": company_id
        })
        
        approval_query = text("""
            INSERT INTO approval_history (
                entity_type, entity_id, action,
                approver_email, approval_date, comments,
                company_id, created_at
            ) VALUES (
                'TIME_BOOKING', :booking_id, 'APPROVED',
                :user_email, NOW(), :comments,
                :company_id, NOW()
            )
        """)
        
        db.execute(approval_query, {
            "booking_id": booking_id,
            "user_email": user_email,
            "comments": comments or "Approved",
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Time booking approved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/time-booking/{booking_id}/reject")
async def reject_time_booking(
    booking_id: int,
    rejection_reason: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Reject a time booking"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE time_bookings tb
            SET 
                status = 'REJECTED',
                notes = COALESCE(notes || ' | ', '') || 'REJECTED: ' || :rejection_reason,
                updated_at = NOW()
            FROM manufacturing_orders mo
            WHERE tb.manufacturing_order_id = mo.id
                AND tb.id = :booking_id
                AND mo.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "rejection_reason": rejection_reason,
            "booking_id": booking_id,
            "company_id": company_id
        })
        
        approval_query = text("""
            INSERT INTO approval_history (
                entity_type, entity_id, action,
                approver_email, approval_date, comments,
                company_id, created_at
            ) VALUES (
                'TIME_BOOKING', :booking_id, 'REJECTED',
                :user_email, NOW(), :rejection_reason,
                :company_id, NOW()
            )
        """)
        
        db.execute(approval_query, {
            "booking_id": booking_id,
            "user_email": user_email,
            "rejection_reason": rejection_reason,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Time booking rejected"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
