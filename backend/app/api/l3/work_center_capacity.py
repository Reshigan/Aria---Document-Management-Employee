from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
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


@router.get("/work-center/{work_center_id}/capacity")
async def get_work_center_capacity(
    work_center_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get capacity information for a work center"""
    try:
        company_id = current_user.get("company_id", "default")
        
        wc_query = text("""
            SELECT 
                wc.name,
                wc.capacity_hours_per_day,
                wc.efficiency_percent,
                wc.utilization_percent,
                wc.hourly_rate,
                wc.status
            FROM work_centers wc
            WHERE wc.id = :work_center_id AND wc.company_id = :company_id
        """)
        
        wc_result = db.execute(wc_query, {
            "work_center_id": work_center_id,
            "company_id": company_id
        }).fetchone()
        
        if not wc_result:
            raise HTTPException(status_code=404, detail="Work center not found")
        
        where_clauses = ["mo.company_id = :company_id", "ro.work_center_id = :work_center_id"]
        params = {"company_id": company_id, "work_center_id": work_center_id}
        
        if start_date:
            where_clauses.append("mo.scheduled_start_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("mo.scheduled_end_date <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        operations_query = text(f"""
            SELECT 
                mo.id as mo_id,
                mo.mo_number,
                mo.product_id,
                p.name as product_name,
                mo.quantity,
                ro.operation_sequence,
                ro.operation_description,
                ro.setup_time_minutes,
                ro.run_time_per_unit_minutes,
                mo.scheduled_start_date,
                mo.scheduled_end_date,
                mo.status,
                (ro.setup_time_minutes + (ro.run_time_per_unit_minutes * mo.quantity)) as total_time_minutes
            FROM manufacturing_orders mo
            JOIN routings r ON mo.routing_id = r.id
            JOIN routing_operations ro ON r.id = ro.routing_id
            JOIN products p ON mo.product_id = p.id
            WHERE {where_clause}
            ORDER BY mo.scheduled_start_date, ro.operation_sequence
        """)
        
        operations_result = db.execute(operations_query, params)
        
        scheduled_operations = []
        total_scheduled_hours = 0
        
        for row in operations_result.fetchall():
            total_time_minutes = float(row[12]) if row[12] else 0
            total_time_hours = total_time_minutes / 60.0
            total_scheduled_hours += total_time_hours
            
            scheduled_operations.append({
                "mo_id": row[0],
                "mo_number": row[1],
                "product_id": row[2],
                "product_name": row[3],
                "quantity": float(row[4]) if row[4] else 0,
                "operation_sequence": row[5],
                "operation_description": row[6],
                "setup_time_minutes": row[7],
                "run_time_per_unit_minutes": float(row[8]) if row[8] else 0,
                "scheduled_start_date": str(row[9]) if row[9] else None,
                "scheduled_end_date": str(row[10]) if row[10] else None,
                "status": row[11],
                "total_time_hours": total_time_hours
            })
        
        capacity_hours_per_day = float(wc_result[1]) if wc_result[1] else 8
        efficiency_percent = float(wc_result[2]) if wc_result[2] else 100
        
        effective_capacity_per_day = capacity_hours_per_day * (efficiency_percent / 100.0)
        
        if start_date and end_date:
            from datetime import datetime
            start = datetime.fromisoformat(start_date)
            end = datetime.fromisoformat(end_date)
            days = (end - start).days + 1
        else:
            days = 1
        
        total_available_hours = effective_capacity_per_day * days
        utilization = (total_scheduled_hours / total_available_hours * 100) if total_available_hours > 0 else 0
        
        return {
            "work_center": {
                "name": wc_result[0],
                "capacity_hours_per_day": capacity_hours_per_day,
                "efficiency_percent": efficiency_percent,
                "utilization_percent": float(wc_result[3]) if wc_result[3] else 0,
                "hourly_rate": float(wc_result[4]) if wc_result[4] else 0,
                "status": wc_result[5]
            },
            "capacity_analysis": {
                "period_days": days,
                "total_available_hours": total_available_hours,
                "total_scheduled_hours": total_scheduled_hours,
                "remaining_capacity_hours": total_available_hours - total_scheduled_hours,
                "utilization_percent": utilization,
                "is_overloaded": total_scheduled_hours > total_available_hours
            },
            "scheduled_operations": scheduled_operations,
            "total_operations": len(scheduled_operations)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/work-center/{work_center_id}/load-by-day")
async def get_work_center_load_by_day(
    work_center_id: int,
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get daily load breakdown for a work center"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                mo.scheduled_start_date::date as work_date,
                COUNT(DISTINCT mo.id) as operation_count,
                SUM(ro.setup_time_minutes + (ro.run_time_per_unit_minutes * mo.quantity)) / 60.0 as total_hours
            FROM manufacturing_orders mo
            JOIN routings r ON mo.routing_id = r.id
            JOIN routing_operations ro ON r.id = ro.routing_id
            WHERE ro.work_center_id = :work_center_id
                AND mo.company_id = :company_id
                AND mo.scheduled_start_date BETWEEN :start_date AND :end_date
            GROUP BY mo.scheduled_start_date::date
            ORDER BY work_date
        """)
        
        result = db.execute(query, {
            "work_center_id": work_center_id,
            "company_id": company_id,
            "start_date": start_date,
            "end_date": end_date
        })
        rows = result.fetchall()
        
        daily_load = []
        for row in rows:
            daily_load.append({
                "date": str(row[0]) if row[0] else None,
                "operation_count": row[1],
                "total_hours": float(row[2]) if row[2] else 0
            })
        
        return {"daily_load": daily_load}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/work-centers/capacity-comparison")
async def compare_work_center_capacities(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Compare capacity across all work centers"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["mo.company_id = :company_id"]
        params = {"company_id": company_id}
        
        if start_date:
            where_clauses.append("mo.scheduled_start_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("mo.scheduled_end_date <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses) if len(where_clauses) > 1 else where_clauses[0]
        
        query = text(f"""
            SELECT 
                wc.id,
                wc.name,
                wc.capacity_hours_per_day,
                wc.efficiency_percent,
                wc.status,
                COUNT(DISTINCT mo.id) as scheduled_orders,
                COALESCE(SUM((ro.setup_time_minutes + (ro.run_time_per_unit_minutes * mo.quantity)) / 60.0), 0) as scheduled_hours
            FROM work_centers wc
            LEFT JOIN routing_operations ro ON wc.id = ro.work_center_id
            LEFT JOIN routings r ON ro.routing_id = r.id
            LEFT JOIN manufacturing_orders mo ON r.id = mo.routing_id AND {where_clause}
            WHERE wc.company_id = :company_id
            GROUP BY wc.id, wc.name, wc.capacity_hours_per_day, wc.efficiency_percent, wc.status
            ORDER BY wc.name
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        comparison = []
        for row in rows:
            capacity_per_day = float(row[2]) if row[2] else 8
            efficiency = float(row[3]) if row[3] else 100
            scheduled_hours = float(row[6]) if row[6] else 0
            
            if start_date and end_date:
                from datetime import datetime
                start = datetime.fromisoformat(start_date)
                end = datetime.fromisoformat(end_date)
                days = (end - start).days + 1
            else:
                days = 1
            
            available_hours = capacity_per_day * (efficiency / 100.0) * days
            utilization = (scheduled_hours / available_hours * 100) if available_hours > 0 else 0
            
            comparison.append({
                "work_center_id": row[0],
                "work_center_name": row[1],
                "capacity_hours_per_day": capacity_per_day,
                "efficiency_percent": efficiency,
                "status": row[4],
                "scheduled_orders": row[5],
                "scheduled_hours": scheduled_hours,
                "available_hours": available_hours,
                "utilization_percent": utilization,
                "is_overloaded": scheduled_hours > available_hours
            })
        
        return {"work_centers": comparison}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/work-center/{work_center_id}/bottleneck-analysis")
async def analyze_work_center_bottlenecks(
    work_center_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Analyze bottlenecks for a work center"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                mo.id,
                mo.mo_number,
                mo.product_id,
                p.name as product_name,
                mo.quantity,
                mo.scheduled_start_date,
                mo.scheduled_end_date,
                mo.actual_start_date,
                mo.status,
                ro.operation_description,
                (ro.setup_time_minutes + (ro.run_time_per_unit_minutes * mo.quantity)) / 60.0 as required_hours
            FROM manufacturing_orders mo
            JOIN routings r ON mo.routing_id = r.id
            JOIN routing_operations ro ON r.id = ro.routing_id
            JOIN products p ON mo.product_id = p.id
            WHERE ro.work_center_id = :work_center_id
                AND mo.company_id = :company_id
                AND mo.status IN ('PENDING', 'IN_PROGRESS')
                AND (
                    mo.actual_start_date IS NULL 
                    OR mo.actual_start_date > mo.scheduled_start_date
                )
            ORDER BY mo.scheduled_start_date
        """)
        
        result = db.execute(query, {
            "work_center_id": work_center_id,
            "company_id": company_id
        })
        rows = result.fetchall()
        
        bottlenecks = []
        for row in rows:
            bottlenecks.append({
                "mo_id": row[0],
                "mo_number": row[1],
                "product_id": row[2],
                "product_name": row[3],
                "quantity": float(row[4]) if row[4] else 0,
                "scheduled_start_date": str(row[5]) if row[5] else None,
                "scheduled_end_date": str(row[6]) if row[6] else None,
                "actual_start_date": str(row[7]) if row[7] else None,
                "status": row[8],
                "operation_description": row[9],
                "required_hours": float(row[10]) if row[10] else 0
            })
        
        return {
            "bottlenecks": bottlenecks,
            "total_delayed_operations": len(bottlenecks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
