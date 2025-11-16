from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

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


class TimeBookingUpdate(BaseModel):
    hours_worked: float
    notes: str = None


@router.get("/time-booking-entry/{entry_id}/atomic-detail")
async def get_time_booking_entry_atomic_detail(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single time booking entry"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                tb.id,
                tb.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                e.hourly_rate as employee_rate,
                tb.work_order_id,
                wo.work_order_number,
                tb.operation_id,
                woo.operation_name,
                woo.standard_duration,
                woo.standard_cost,
                tb.booking_date,
                tb.hours_worked,
                tb.hourly_rate,
                tb.total_cost,
                tb.notes,
                tb.created_at,
                tb.created_by
            FROM time_bookings tb
            JOIN employees e ON tb.employee_id = e.id
            LEFT JOIN work_orders wo ON tb.work_order_id = wo.id
            LEFT JOIN work_order_operations woo ON tb.operation_id = woo.id
            WHERE tb.id = :entry_id AND tb.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "entry_id": entry_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Time booking entry not found")
        
        hours_worked = float(result[11]) if result[11] else 0
        hourly_rate = float(result[12]) if result[12] else 0
        total_cost = float(result[13]) if result[13] else 0
        standard_duration = float(result[8]) if result[8] else 0
        standard_cost = float(result[9]) if result[9] else 0
        
        time_variance = hours_worked - standard_duration if standard_duration > 0 else 0
        cost_variance = total_cost - standard_cost if standard_cost > 0 else 0
        efficiency_percent = (standard_duration / hours_worked * 100) if hours_worked > 0 else 0
        
        employee_history_query = text("""
            SELECT 
                tb.id,
                tb.booking_date,
                tb.hours_worked,
                tb.total_cost,
                AVG(tb.hours_worked) OVER() as avg_hours
            FROM time_bookings tb
            WHERE tb.employee_id = :employee_id
                AND tb.operation_id = :operation_id
                AND tb.id != :entry_id
                AND tb.company_id = :company_id
            ORDER BY tb.booking_date DESC
            LIMIT 10
        """)
        
        employee_history_result = db.execute(employee_history_query, {
            "employee_id": result[1],
            "operation_id": result[6],
            "entry_id": entry_id,
            "company_id": company_id
        })
        
        employee_history = []
        avg_hours = 0
        
        for row in employee_history_result.fetchall():
            avg_hours = float(row[4]) if row[4] else 0
            employee_history.append({
                "id": row[0],
                "booking_date": str(row[1]) if row[1] else None,
                "hours_worked": float(row[2]) if row[2] else 0,
                "total_cost": float(row[3]) if row[3] else 0
            })
        
        operation_stats_query = text("""
            SELECT 
                COUNT(*) as total_bookings,
                AVG(hours_worked) as avg_hours,
                MIN(hours_worked) as min_hours,
                MAX(hours_worked) as max_hours,
                SUM(total_cost) as total_cost
            FROM time_bookings
            WHERE operation_id = :operation_id
                AND company_id = :company_id
        """)
        
        operation_stats_result = db.execute(operation_stats_query, {
            "operation_id": result[6],
            "company_id": company_id
        }).fetchone()
        
        operation_stats = None
        if operation_stats_result:
            operation_stats = {
                "total_bookings": operation_stats_result[0],
                "avg_hours": float(operation_stats_result[1]) if operation_stats_result[1] else 0,
                "min_hours": float(operation_stats_result[2]) if operation_stats_result[2] else 0,
                "max_hours": float(operation_stats_result[3]) if operation_stats_result[3] else 0,
                "total_cost": float(operation_stats_result[4]) if operation_stats_result[4] else 0
            }
        
        return {
            "time_booking_entry": {
                "id": result[0],
                "employee_id": result[1],
                "employee_name": result[2],
                "employee_rate": float(result[3]) if result[3] else 0,
                "work_order_id": result[4],
                "work_order_number": result[5],
                "operation_id": result[6],
                "operation_name": result[7],
                "standard_duration": standard_duration,
                "standard_cost": standard_cost,
                "booking_date": str(result[10]) if result[10] else None,
                "hours_worked": hours_worked,
                "hourly_rate": hourly_rate,
                "total_cost": total_cost,
                "notes": result[14],
                "created_at": str(result[15]) if result[15] else None,
                "created_by": result[16]
            },
            "efficiency_metrics": {
                "time_variance": time_variance,
                "time_variance_percent": (time_variance / standard_duration * 100) if standard_duration > 0 else 0,
                "cost_variance": cost_variance,
                "cost_variance_percent": (cost_variance / standard_cost * 100) if standard_cost > 0 else 0,
                "efficiency_percent": efficiency_percent,
                "is_efficient": efficiency_percent >= 100
            },
            "employee_performance": {
                "avg_hours_for_operation": avg_hours,
                "recent_bookings": employee_history
            },
            "operation_statistics": operation_stats
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/time-booking-entry/{entry_id}")
async def update_time_booking_entry(
    entry_id: int,
    update_data: TimeBookingUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a time booking entry"""
    try:
        company_id = current_user.get("company_id", "default")
        
        rate_query = text("""
            SELECT hourly_rate FROM time_bookings
            WHERE id = :entry_id AND company_id = :company_id
        """)
        
        rate_result = db.execute(rate_query, {
            "entry_id": entry_id,
            "company_id": company_id
        }).fetchone()
        
        if not rate_result:
            raise HTTPException(status_code=404, detail="Time booking entry not found")
        
        hourly_rate = float(rate_result[0]) if rate_result[0] else 0
        new_total_cost = update_data.hours_worked * hourly_rate
        
        update_query = text("""
            UPDATE time_bookings
            SET 
                hours_worked = :hours_worked,
                total_cost = :total_cost,
                notes = COALESCE(:notes, notes),
                updated_at = NOW()
            WHERE id = :entry_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "hours_worked": update_data.hours_worked,
            "total_cost": new_total_cost,
            "notes": update_data.notes,
            "entry_id": entry_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Time booking entry updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
