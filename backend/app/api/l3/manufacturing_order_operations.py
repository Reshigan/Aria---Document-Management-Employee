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


@router.get("/manufacturing-order/{mo_id}/operations")
async def get_manufacturing_order_operations(
    mo_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all operations for a manufacturing order with detailed status"""
    try:
        company_id = current_user.get("company_id", "default")
        
        mo_query = text("""
            SELECT 
                mo.mo_number,
                mo.product_id,
                p.name as product_name,
                mo.quantity,
                mo.status
            FROM manufacturing_orders mo
            JOIN products p ON mo.product_id = p.id
            WHERE mo.id = :mo_id AND mo.company_id = :company_id
        """)
        
        mo_result = db.execute(mo_query, {
            "mo_id": mo_id,
            "company_id": company_id
        }).fetchone()
        
        if not mo_result:
            raise HTTPException(status_code=404, detail="Manufacturing order not found")
        
        ops_query = text("""
            SELECT 
                moo.id,
                moo.operation_number,
                moo.operation_name,
                moo.work_center_id,
                wc.name as work_center_name,
                moo.setup_time,
                moo.run_time_per_unit,
                moo.total_time,
                moo.actual_setup_time,
                moo.actual_run_time,
                moo.quantity_completed,
                moo.quantity_scrapped,
                moo.status,
                moo.started_at,
                moo.completed_at
            FROM manufacturing_order_operations moo
            LEFT JOIN work_centers wc ON moo.work_center_id = wc.id
            WHERE moo.manufacturing_order_id = :mo_id
            ORDER BY moo.operation_number
        """)
        
        ops_result = db.execute(ops_query, {"mo_id": mo_id})
        
        operations = []
        total_planned_time = 0
        total_actual_time = 0
        completed_ops = 0
        
        for row in ops_result.fetchall():
            planned_time = float(row[7]) if row[7] else 0
            actual_time = (float(row[8]) if row[8] else 0) + (float(row[9]) if row[9] else 0)
            
            total_planned_time += planned_time
            total_actual_time += actual_time
            
            if row[12] == "COMPLETED":
                completed_ops += 1
            
            operations.append({
                "id": row[0],
                "operation_number": row[1],
                "operation_name": row[2],
                "work_center_id": row[3],
                "work_center_name": row[4],
                "setup_time": float(row[5]) if row[5] else 0,
                "run_time_per_unit": float(row[6]) if row[6] else 0,
                "total_planned_time": planned_time,
                "actual_setup_time": float(row[8]) if row[8] else 0,
                "actual_run_time": float(row[9]) if row[9] else 0,
                "total_actual_time": actual_time,
                "quantity_completed": float(row[10]) if row[10] else 0,
                "quantity_scrapped": float(row[11]) if row[11] else 0,
                "status": row[12],
                "started_at": str(row[13]) if row[13] else None,
                "completed_at": str(row[14]) if row[14] else None,
                "efficiency": (planned_time / actual_time * 100) if actual_time > 0 else 0
            })
        
        return {
            "manufacturing_order": {
                "mo_number": mo_result[0],
                "product_id": mo_result[1],
                "product_name": mo_result[2],
                "quantity": float(mo_result[3]) if mo_result[3] else 0,
                "status": mo_result[4]
            },
            "operations": operations,
            "summary": {
                "total_operations": len(operations),
                "completed_operations": completed_ops,
                "pending_operations": len(operations) - completed_ops,
                "total_planned_time": total_planned_time,
                "total_actual_time": total_actual_time,
                "overall_efficiency": (total_planned_time / total_actual_time * 100) if total_actual_time > 0 else 0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/manufacturing-order-operation/{operation_id}/start")
async def start_operation(
    operation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Start a manufacturing operation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE manufacturing_order_operations moo
            SET 
                status = 'IN_PROGRESS',
                started_at = NOW(),
                updated_at = NOW()
            FROM manufacturing_orders mo
            WHERE moo.manufacturing_order_id = mo.id
                AND moo.id = :operation_id
                AND mo.company_id = :company_id
        """)
        
        db.execute(update_query, {"operation_id": operation_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Operation started successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/manufacturing-order-operation/{operation_id}/complete")
async def complete_operation(
    operation_id: int,
    quantity_completed: float,
    quantity_scrapped: float = 0,
    actual_setup_time: Optional[float] = None,
    actual_run_time: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Complete a manufacturing operation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE manufacturing_order_operations moo
            SET 
                status = 'COMPLETED',
                quantity_completed = :quantity_completed,
                quantity_scrapped = :quantity_scrapped,
                actual_setup_time = COALESCE(:actual_setup_time, actual_setup_time),
                actual_run_time = COALESCE(:actual_run_time, actual_run_time),
                completed_at = NOW(),
                updated_at = NOW()
            FROM manufacturing_orders mo
            WHERE moo.manufacturing_order_id = mo.id
                AND moo.id = :operation_id
                AND mo.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "quantity_completed": quantity_completed,
            "quantity_scrapped": quantity_scrapped,
            "actual_setup_time": actual_setup_time,
            "actual_run_time": actual_run_time,
            "operation_id": operation_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Operation completed successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/work-center/{work_center_id}/operations")
async def get_work_center_operations(
    work_center_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all operations for a work center"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["moo.work_center_id = :work_center_id", "mo.company_id = :company_id"]
        params = {"work_center_id": work_center_id, "company_id": company_id}
        
        if status:
            where_clauses.append("moo.status = :status")
            params["status"] = status
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                moo.id,
                mo.mo_number,
                p.name as product_name,
                moo.operation_number,
                moo.operation_name,
                moo.status,
                moo.total_time,
                moo.started_at,
                moo.completed_at
            FROM manufacturing_order_operations moo
            JOIN manufacturing_orders mo ON moo.manufacturing_order_id = mo.id
            JOIN products p ON mo.product_id = p.id
            WHERE {where_clause}
            ORDER BY 
                CASE moo.status
                    WHEN 'IN_PROGRESS' THEN 1
                    WHEN 'PENDING' THEN 2
                    WHEN 'COMPLETED' THEN 3
                END,
                moo.started_at DESC NULLS LAST
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        operations = []
        for row in rows:
            operations.append({
                "id": row[0],
                "mo_number": row[1],
                "product_name": row[2],
                "operation_number": row[3],
                "operation_name": row[4],
                "status": row[5],
                "total_time": float(row[6]) if row[6] else 0,
                "started_at": str(row[7]) if row[7] else None,
                "completed_at": str(row[8]) if row[8] else None
            })
        
        return {
            "work_center_operations": operations,
            "total_count": len(operations)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/manufacturing-order-operation/{operation_id}/time-bookings")
async def get_operation_time_bookings(
    operation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get time bookings for an operation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                tb.id,
                tb.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                tb.start_time,
                tb.end_time,
                tb.hours_worked,
                tb.notes
            FROM time_bookings tb
            JOIN employees e ON tb.employee_id = e.id
            JOIN manufacturing_order_operations moo ON tb.operation_id = moo.id
            JOIN manufacturing_orders mo ON moo.manufacturing_order_id = mo.id
            WHERE tb.operation_id = :operation_id AND mo.company_id = :company_id
            ORDER BY tb.start_time DESC
        """)
        
        result = db.execute(query, {"operation_id": operation_id, "company_id": company_id})
        rows = result.fetchall()
        
        bookings = []
        total_hours = 0
        
        for row in rows:
            hours = float(row[5]) if row[5] else 0
            total_hours += hours
            
            bookings.append({
                "id": row[0],
                "employee_id": row[1],
                "employee_name": row[2],
                "start_time": str(row[3]) if row[3] else None,
                "end_time": str(row[4]) if row[4] else None,
                "hours_worked": hours,
                "notes": row[6]
            })
        
        return {
            "time_bookings": bookings,
            "total_hours": total_hours
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/manufacturing-order/{mo_id}/operation-efficiency")
async def get_operation_efficiency_report(
    mo_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get efficiency report for all operations in a manufacturing order"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                moo.operation_number,
                moo.operation_name,
                moo.total_time as planned_time,
                COALESCE(moo.actual_setup_time, 0) + COALESCE(moo.actual_run_time, 0) as actual_time,
                moo.quantity_completed,
                moo.quantity_scrapped,
                CASE 
                    WHEN (COALESCE(moo.actual_setup_time, 0) + COALESCE(moo.actual_run_time, 0)) > 0 
                    THEN (moo.total_time / (COALESCE(moo.actual_setup_time, 0) + COALESCE(moo.actual_run_time, 0))) * 100
                    ELSE 0
                END as efficiency_percent
            FROM manufacturing_order_operations moo
            JOIN manufacturing_orders mo ON moo.manufacturing_order_id = mo.id
            WHERE mo.id = :mo_id AND mo.company_id = :company_id
            ORDER BY moo.operation_number
        """)
        
        result = db.execute(query, {"mo_id": mo_id, "company_id": company_id})
        rows = result.fetchall()
        
        efficiency_data = []
        for row in rows:
            efficiency_data.append({
                "operation_number": row[0],
                "operation_name": row[1],
                "planned_time": float(row[2]) if row[2] else 0,
                "actual_time": float(row[3]) if row[3] else 0,
                "quantity_completed": float(row[4]) if row[4] else 0,
                "quantity_scrapped": float(row[5]) if row[5] else 0,
                "efficiency_percent": float(row[6]) if row[6] else 0
            })
        
        return {"operation_efficiency": efficiency_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
