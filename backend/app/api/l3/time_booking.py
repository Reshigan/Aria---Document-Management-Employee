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
        from core.database_pg import SessionLocal
        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        from auth_integrated import get_current_user

router = APIRouter()


class TimeBookingCreate(BaseModel):
    manufacturing_order_id: int
    routing_operation_id: int
    employee_id: int
    work_date: str
    hours_worked: float
    notes: Optional[str] = None


@router.get("/manufacturing-order/{mo_id}/time-bookings")
async def get_mo_time_bookings(
    mo_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all time bookings for a manufacturing order"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                tb.id,
                tb.work_date,
                tb.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                tb.routing_operation_id,
                ro.operation_name,
                tb.hours_worked,
                tb.hourly_rate,
                tb.hours_worked * tb.hourly_rate as labor_cost,
                tb.status,
                tb.notes
            FROM time_bookings tb
            JOIN employees e ON tb.employee_id = e.id
            JOIN routing_operations ro ON tb.routing_operation_id = ro.id
            WHERE tb.manufacturing_order_id = :mo_id AND tb.company_id = :company_id
            ORDER BY tb.work_date DESC, ro.operation_sequence
        """)
        
        result = db.execute(query, {"mo_id": mo_id, "company_id": company_id})
        rows = result.fetchall()
        
        bookings = []
        total_hours = 0
        total_cost = 0
        
        for row in rows:
            hours = float(row[6]) if row[6] else 0
            cost = float(row[8]) if row[8] else 0
            
            total_hours += hours
            total_cost += cost
            
            bookings.append({
                "id": row[0],
                "work_date": str(row[1]) if row[1] else None,
                "employee_id": row[2],
                "employee_name": row[3],
                "routing_operation_id": row[4],
                "operation_name": row[5],
                "hours_worked": hours,
                "hourly_rate": float(row[7]) if row[7] else 0,
                "labor_cost": cost,
                "status": row[9],
                "notes": row[10]
            })
        
        return {
            "time_bookings": bookings,
            "summary": {
                "total_bookings": len(bookings),
                "total_hours": total_hours,
                "total_labor_cost": total_cost
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/routing-operation/{operation_id}/time-bookings")
async def get_operation_time_bookings(
    operation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all time bookings for a routing operation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        operation_query = text("""
            SELECT 
                ro.operation_name,
                ro.operation_sequence,
                ro.standard_hours,
                mo.mo_number
            FROM routing_operations ro
            JOIN manufacturing_orders mo ON ro.manufacturing_order_id = mo.id
            WHERE ro.id = :operation_id AND ro.company_id = :company_id
        """)
        
        operation_result = db.execute(operation_query, {
            "operation_id": operation_id,
            "company_id": company_id
        }).fetchone()
        
        if not operation_result:
            raise HTTPException(status_code=404, detail="Routing operation not found")
        
        bookings_query = text("""
            SELECT 
                tb.id,
                tb.work_date,
                tb.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                tb.hours_worked,
                tb.hourly_rate,
                tb.hours_worked * tb.hourly_rate as labor_cost,
                tb.status,
                tb.notes
            FROM time_bookings tb
            JOIN employees e ON tb.employee_id = e.id
            WHERE tb.routing_operation_id = :operation_id AND tb.company_id = :company_id
            ORDER BY tb.work_date DESC
        """)
        
        bookings_result = db.execute(bookings_query, {
            "operation_id": operation_id,
            "company_id": company_id
        })
        
        bookings = []
        total_hours = 0
        total_cost = 0
        
        for row in bookings_result.fetchall():
            hours = float(row[4]) if row[4] else 0
            cost = float(row[6]) if row[6] else 0
            
            total_hours += hours
            total_cost += cost
            
            bookings.append({
                "id": row[0],
                "work_date": str(row[1]) if row[1] else None,
                "employee_id": row[2],
                "employee_name": row[3],
                "hours_worked": hours,
                "hourly_rate": float(row[5]) if row[5] else 0,
                "labor_cost": cost,
                "status": row[7],
                "notes": row[8]
            })
        
        standard_hours = float(operation_result[2]) if operation_result[2] else 0
        variance_hours = total_hours - standard_hours
        
        return {
            "operation": {
                "operation_name": operation_result[0],
                "operation_sequence": operation_result[1],
                "standard_hours": standard_hours,
                "mo_number": operation_result[3]
            },
            "time_bookings": bookings,
            "summary": {
                "total_bookings": len(bookings),
                "total_hours": total_hours,
                "total_labor_cost": total_cost,
                "variance_hours": variance_hours,
                "efficiency_percent": (standard_hours / total_hours * 100) if total_hours > 0 else 0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/time-booking")
async def create_time_booking(
    booking: TimeBookingCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a time booking"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        employee_query = text("""
            SELECT hourly_rate
            FROM employees
            WHERE id = :employee_id AND company_id = :company_id
        """)
        
        employee_result = db.execute(employee_query, {
            "employee_id": booking.employee_id,
            "company_id": company_id
        }).fetchone()
        
        if not employee_result:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        hourly_rate = float(employee_result[0]) if employee_result[0] else 0
        
        insert_query = text("""
            INSERT INTO time_bookings (
                manufacturing_order_id, routing_operation_id, employee_id,
                work_date, hours_worked, hourly_rate, notes,
                company_id, created_by, created_at
            ) VALUES (
                :manufacturing_order_id, :routing_operation_id, :employee_id,
                :work_date, :hours_worked, :hourly_rate, :notes,
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "manufacturing_order_id": booking.manufacturing_order_id,
            "routing_operation_id": booking.routing_operation_id,
            "employee_id": booking.employee_id,
            "work_date": booking.work_date,
            "hours_worked": booking.hours_worked,
            "hourly_rate": hourly_rate,
            "notes": booking.notes,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        booking_id = result.fetchone()[0]
        
        return {"id": booking_id, "message": "Time booking created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/time-booking/{booking_id}")
async def update_time_booking(
    booking_id: int,
    hours_worked: Optional[float] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a time booking"""
    try:
        company_id = current_user.get("company_id", "default")
        
        updates = []
        params = {"booking_id": booking_id, "company_id": company_id}
        
        if hours_worked is not None:
            updates.append("hours_worked = :hours_worked")
            params["hours_worked"] = hours_worked
        
        if notes is not None:
            updates.append("notes = :notes")
            params["notes"] = notes
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        update_clause = ", ".join(updates)
        
        query = text(f"""
            UPDATE time_bookings
            SET {update_clause}
            WHERE id = :booking_id AND company_id = :company_id
        """)
        
        db.execute(query, params)
        db.commit()
        
        return {"message": "Time booking updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/time-booking/{booking_id}")
async def delete_time_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a time booking"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM time_bookings
            WHERE id = :booking_id AND company_id = :company_id
        """)
        
        db.execute(delete_query, {"booking_id": booking_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Time booking deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employee/{employee_id}/time-bookings")
async def get_employee_time_bookings(
    employee_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get time bookings for an employee"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["tb.employee_id = :employee_id", "tb.company_id = :company_id"]
        params = {"employee_id": employee_id, "company_id": company_id}
        
        if start_date:
            where_clauses.append("tb.work_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("tb.work_date <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                tb.work_date,
                mo.mo_number,
                ro.operation_name,
                tb.hours_worked,
                tb.hourly_rate,
                tb.hours_worked * tb.hourly_rate as labor_cost,
                tb.status
            FROM time_bookings tb
            JOIN manufacturing_orders mo ON tb.manufacturing_order_id = mo.id
            JOIN routing_operations ro ON tb.routing_operation_id = ro.id
            WHERE {where_clause}
            ORDER BY tb.work_date DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        bookings = []
        total_hours = 0
        total_earnings = 0
        
        for row in rows:
            hours = float(row[3]) if row[3] else 0
            earnings = float(row[5]) if row[5] else 0
            
            total_hours += hours
            total_earnings += earnings
            
            bookings.append({
                "work_date": str(row[0]) if row[0] else None,
                "mo_number": row[1],
                "operation_name": row[2],
                "hours_worked": hours,
                "hourly_rate": float(row[4]) if row[4] else 0,
                "labor_cost": earnings,
                "status": row[6]
            })
        
        return {
            "time_bookings": bookings,
            "summary": {
                "total_bookings": len(bookings),
                "total_hours": total_hours,
                "total_earnings": total_earnings
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/time-bookings/labor-efficiency")
async def get_labor_efficiency_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get labor efficiency report"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["tb.company_id = :company_id"]
        params = {"company_id": company_id}
        
        if start_date:
            where_clauses.append("tb.work_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("tb.work_date <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                ro.operation_name,
                ro.standard_hours,
                SUM(tb.hours_worked) as actual_hours,
                COUNT(DISTINCT tb.manufacturing_order_id) as mo_count,
                SUM(tb.hours_worked * tb.hourly_rate) as total_cost
            FROM time_bookings tb
            JOIN routing_operations ro ON tb.routing_operation_id = ro.id
            WHERE {where_clause}
            GROUP BY ro.operation_name, ro.standard_hours
            ORDER BY total_cost DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        efficiency = []
        for row in rows:
            standard = float(row[1]) if row[1] else 0
            actual = float(row[2]) if row[2] else 0
            
            efficiency.append({
                "operation_name": row[0],
                "standard_hours": standard,
                "actual_hours": actual,
                "mo_count": row[3],
                "total_cost": float(row[4]) if row[4] else 0,
                "efficiency_percent": (standard / actual * 100) if actual > 0 else 0,
                "variance_hours": actual - standard
            })
        
        return {"labor_efficiency": efficiency}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
