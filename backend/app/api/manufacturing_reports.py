"""
Manufacturing Reports API
Provides 4 comprehensive manufacturing reports with drill-down to L5:
1. WIP Variance Report (with drill-down to work orders)
2. Production Efficiency Report (with drill-down to operations)
3. Time Booking Analysis Report (with drill-down to time entries)
4. Material Consumption Report (with drill-down to consumption entries)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, date, timedelta
from decimal import Decimal

try:
    from auth import get_db
except ImportError:
    try:
        from auth_integrated import get_db
    except ImportError:
        import sys
        sys.path.insert(0, '/var/www/aria/backend')
        from auth import get_db

router = APIRouter(prefix="/api/reports/manufacturing", tags=["Manufacturing Reports"])

# ============================================================================
# ============================================================================

class WIPVarianceItem(BaseModel):
    work_order_id: str
    work_order_number: str
    item_code: str
    item_name: str
    quantity_ordered: Decimal
    quantity_completed: Decimal
    standard_cost: Decimal
    actual_cost: Decimal
    cost_variance: Decimal
    variance_percent: Decimal
    status: str

class WIPVarianceReport(BaseModel):
    company_id: str
    report_date: date
    work_orders: List[WIPVarianceItem]
    total_standard_cost: Decimal
    total_actual_cost: Decimal
    total_variance: Decimal

@router.get("/wip-variance", response_model=WIPVarianceReport)
def get_wip_variance(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    as_of_date: date = Query(..., description="Report as of date"),
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Generate WIP Variance report with drill-down capability"""
    query = """
        WITH work_order_costs AS (
            SELECT 
                wo.id as work_order_id,
                wo.wo_number,
                i.item_code,
                i.item_name,
                wo.quantity_to_produce,
                wo.quantity_produced,
                wo.status,
                COALESCE(sc.standard_cost, 0) * wo.quantity_to_produce as standard_cost,
                COALESCE(SUM(mc.quantity_consumed * mc.unit_cost), 0) + 
                COALESCE(SUM(tb.hours_worked * tb.hourly_rate), 0) as actual_cost
            FROM work_orders wo
            JOIN items i ON wo.product_id = i.id AND i.company_id = :company_id
            LEFT JOIN items i_std ON wo.product_id = i_std.id AND i_std.company_id = :company_id
            LEFT JOIN standard_costs sc ON i_std.item_code = sc.item_id AND sc.company_id = :company_id AND sc.is_active = TRUE
            LEFT JOIN work_order_material_usage mc ON wo.id = mc.work_order_id AND mc.company_id = :company_id
            LEFT JOIN time_bookings tb ON wo.wo_number::text = tb.manufacturing_order_id::text AND tb.company_id = :company_id
            WHERE wo.company_id = :company_id
                AND wo.start_date <= :as_of_date
    """
    
    params = {"company_id": company_id, "as_of_date": as_of_date}
    
    if status:
        query += " AND wo.status = :status"
        params["status"] = status
    
    query += """
            GROUP BY wo.id, wo.wo_number, i.item_code, i.item_name, 
                     wo.quantity_to_produce, wo.quantity_produced, wo.status, sc.standard_cost
        )
        SELECT 
            work_order_id,
            work_order_number,
            item_code,
            item_name,
            quantity_ordered,
            quantity_completed,
            standard_cost,
            actual_cost,
            actual_cost - standard_cost as cost_variance,
            CASE 
                WHEN standard_cost > 0 THEN ((actual_cost - standard_cost) / standard_cost * 100)
                ELSE 0
            END as variance_percent,
            status
        FROM work_order_costs
        WHERE standard_cost > 0 OR actual_cost > 0
        ORDER BY ABS(actual_cost - standard_cost) DESC
    """
    
    result = db.execute(text(query), params)
    work_orders = [WIPVarianceItem(**dict(row._mapping)) for row in result]
    
    return WIPVarianceReport(
        company_id=company_id,
        report_date=as_of_date,
        work_orders=work_orders,
        total_standard_cost=sum(wo.standard_cost for wo in work_orders),
        total_actual_cost=sum(wo.actual_cost for wo in work_orders),
        total_variance=sum(wo.cost_variance for wo in work_orders)
    )

@router.get("/wip-variance/drill-down/{work_order_id}")
def get_wip_variance_drilldown(
    work_order_id: str,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Drill down to cost details for a specific work order"""
    material_query = """
        SELECT 
            mc.id as consumption_id,
            mc.consumption_date,
            i.item_code,
            i.item_name,
            mc.quantity_consumed,
            mc.unit_cost,
            mc.quantity_consumed * mc.unit_cost as total_cost,
            'MATERIAL' as cost_type
        FROM work_order_material_usage mc
        JOIN items i ON mc.item_id = i.id AND i.company_id = :company_id
        WHERE mc.company_id = :company_id
            AND mc.work_order_id = :work_order_id
        ORDER BY mc.consumption_date DESC
    """
    
    labor_query = """
        SELECT 
            tb.id as time_entry_id,
            tb.work_date,
            u.email as employee_name,
            tb.hours_worked,
            tb.hourly_rate,
            tb.hours_worked * tb.hourly_rate as total_cost,
            'LABOR' as cost_type
        FROM time_bookings tb
        LEFT JOIN users u ON tb.employee_id = u.id
        WHERE tb.company_id = :company_id
            AND tb.manufacturing_order_id = :work_order_id
        ORDER BY tb.work_date DESC
    """
    
    params = {"company_id": company_id, "work_order_id": work_order_id}
    
    material_result = db.execute(text(material_query), params)
    labor_result = db.execute(text(labor_query), params)
    
    return {
        "materials": [dict(row._mapping) for row in material_result],
        "labor": [dict(row._mapping) for row in labor_result]
    }

# ============================================================================
# ============================================================================

@router.get("/production-efficiency")
def get_production_efficiency(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    work_center_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Production Efficiency report with drill-down to operations"""
    query = """
        WITH work_order_efficiency AS (
            SELECT 
                wo.id as work_order_id,
                wo.wo_number,
                i.item_code,
                i.item_name,
                wh.name as warehouse_name,
                wo.quantity_to_produce,
                wo.quantity_produced,
                wo.start_date,
                wo.completion_date,
                COALESCE(SUM(tb.hours_worked), 0) as actual_hours,
                wo.estimated_hours as standard_hours,
                CASE 
                    WHEN COALESCE(SUM(tb.hours_worked), 0) > 0 
                    THEN (wo.quantity_produced / COALESCE(SUM(tb.hours_worked), 1))
                    ELSE 0
                END as units_per_hour,
                CASE 
                    WHEN wo.estimated_hours > 0 AND COALESCE(SUM(tb.hours_worked), 0) > 0
                    THEN ((wo.estimated_hours - COALESCE(SUM(tb.hours_worked), 0)) / wo.estimated_hours * 100)
                    ELSE 0
                END as efficiency_percent,
                wo.status
            FROM work_orders wo
            JOIN items i ON wo.product_id = i.id AND i.company_id = :company_id
            LEFT JOIN warehouses wh ON wo.warehouse_id = wh.id AND wh.company_id = :company_id
            LEFT JOIN time_bookings tb ON wo.wo_number::text = tb.manufacturing_order_id::text AND tb.company_id = :company_id
            WHERE wo.company_id = :company_id
                AND wo.start_date BETWEEN :period_start AND :period_end
    """
    
    params = {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    }
    
    if work_center_id:
        query += " AND wo.warehouse_id = :work_center_id"
        params["work_center_id"] = work_center_id
    
    query += """
            GROUP BY wo.id, wo.wo_number, i.item_code, i.item_name, 
                     wh.name, wo.quantity_to_produce, wo.quantity_produced,
                     wo.start_date, wo.completion_date, wo.estimated_hours, wo.status
        )
        SELECT *
        FROM work_order_efficiency
        ORDER BY efficiency_percent DESC
    """
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

# ============================================================================
# ============================================================================

@router.get("/time-booking-analysis")
def get_time_booking_analysis(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    employee_id: Optional[str] = None,
    work_order_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Time Booking Analysis with drill-down to time entries"""
    query = """
        SELECT 
            tb.id as time_entry_id,
            tb.work_date,
            u.email as employee_name,
            wo.wo_number,
            i.item_code,
            i.item_name,
            wh.name as warehouse_name,
            tb.hours_worked,
            tb.hourly_rate,
            tb.hours_worked * tb.hourly_rate as labor_cost,
            tb.operation_type,
            tb.notes
        FROM time_bookings tb
        LEFT JOIN users u ON tb.employee_id = u.id
        LEFT JOIN work_orders wo ON tb.manufacturing_order_id = wo.id AND wo.company_id = :company_id
        LEFT JOIN items i ON wo.product_id = i.id AND i.company_id = :company_id
        LEFT JOIN warehouses wh ON wo.warehouse_id = wh.id AND wh.company_id = :company_id
        WHERE tb.company_id = :company_id
            AND tb.work_date BETWEEN :period_start AND :period_end
    """
    
    params = {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end,
        "skip": skip,
        "limit": limit
    }
    
    if employee_id:
        query += " AND tb.employee_id = :employee_id"
        params["employee_id"] = employee_id
    
    if work_order_id:
        query += " AND tb.manufacturing_order_id = :work_order_id"
        params["work_order_id"] = work_order_id
    
    query += " ORDER BY tb.work_date DESC, tb.id DESC OFFSET :skip LIMIT :limit"
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.get("/time-booking-analysis/summary")
def get_time_booking_summary(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    group_by: str = Query("employee", description="Group by: employee, work_order, work_center"),
    db: Session = Depends(get_db)
):
    """Time Booking Summary grouped by employee, work order, or work center"""
    
    if group_by == "employee":
        query = """
            SELECT 
                u.id as employee_id,
                u.email as employee_name,
                COUNT(DISTINCT tb.id) as total_entries,
                SUM(tb.hours_worked) as total_hours,
                AVG(tb.hourly_rate) as avg_hourly_rate,
                SUM(tb.hours_worked * tb.hourly_rate) as total_labor_cost
            FROM time_bookings tb
            LEFT JOIN users u ON tb.employee_id = u.id
            WHERE tb.company_id = :company_id
                AND tb.work_date BETWEEN :period_start AND :period_end
            GROUP BY u.id, u.email
            ORDER BY total_hours DESC
        """
    elif group_by == "work_order":
        query = """
            SELECT 
                wo.id as work_order_id,
                wo.wo_number,
                i.item_code,
                i.item_name,
                COUNT(DISTINCT tb.id) as total_entries,
                SUM(tb.hours_worked) as total_hours,
                SUM(tb.hours_worked * tb.hourly_rate) as total_labor_cost
            FROM time_bookings tb
            JOIN work_orders wo ON tb.manufacturing_order_id = wo.id AND wo.company_id = :company_id
            JOIN items i ON wo.product_id = i.id AND i.company_id = :company_id
            WHERE tb.company_id = :company_id
                AND tb.work_date BETWEEN :period_start AND :period_end
            GROUP BY wo.id, wo.wo_number, i.item_code, i.item_name
            ORDER BY total_hours DESC
        """
    else:  # work_center
        query = """
            SELECT 
                wc.id as work_center_id,
                wh.name as warehouse_name,
                COUNT(DISTINCT tb.id) as total_entries,
                SUM(tb.hours_worked) as total_hours,
                SUM(tb.hours_worked * tb.hourly_rate) as total_labor_cost
            FROM time_bookings tb
            JOIN work_orders wo ON tb.manufacturing_order_id = wo.id AND wo.company_id = :company_id
            JOIN work_centers wc ON wo.warehouse_id = wc.id AND wh.company_id = :company_id
            WHERE tb.company_id = :company_id
                AND tb.work_date BETWEEN :period_start AND :period_end
            GROUP BY wc.id, wh.name
            ORDER BY total_hours DESC
        """
    
    result = db.execute(text(query), {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    })
    
    return [dict(row._mapping) for row in result]

# ============================================================================
# ============================================================================

@router.get("/material-consumption")
def get_material_consumption(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    item_id: Optional[str] = None,
    work_order_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Material Consumption report with drill-down to consumption entries"""
    query = """
        SELECT 
            mc.id as consumption_id,
            mc.consumption_date,
            wo.wo_number,
            i_wo.item_code as finished_item_code,
            i_wo.item_name as finished_item_name,
            i.item_code as consumed_item_code,
            i.item_name as consumed_item_name,
            mc.quantity_consumed,
            mc.unit_cost,
            mc.quantity_consumed * mc.unit_cost as total_cost,
            w.name as warehouse_name,
            mc.lot_number,
            mc.serial_number,
            mc.notes
        FROM work_order_material_usage mc
        JOIN items i ON mc.item_id = i.id AND i.company_id = :company_id
        JOIN work_orders wo ON mc.work_order_id = wo.id AND wo.company_id = :company_id
        JOIN items i_wo ON wo.product_id = i_wo.id AND i_wo.company_id = :company_id
        LEFT JOIN warehouses w ON mc.warehouse_id = w.id AND w.company_id = :company_id
        WHERE mc.company_id = :company_id
            AND mc.consumption_date BETWEEN :period_start AND :period_end
    """
    
    params = {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end,
        "skip": skip,
        "limit": limit
    }
    
    if item_id:
        query += " AND mc.item_id = :item_id"
        params["item_id"] = item_id
    
    if work_order_id:
        query += " AND mc.work_order_id = :work_order_id"
        params["work_order_id"] = work_order_id
    
    query += " ORDER BY mc.consumption_date DESC, mc.id DESC OFFSET :skip LIMIT :limit"
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.get("/material-consumption/summary")
def get_material_consumption_summary(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    group_by: str = Query("item", description="Group by: item, work_order"),
    db: Session = Depends(get_db)
):
    """Material Consumption Summary grouped by item or work order"""
    
    if group_by == "item":
        query = """
            SELECT 
                i.id as item_id,
                i.item_code,
                i.item_name,
                COUNT(DISTINCT mc.id) as total_consumptions,
                SUM(mc.quantity_consumed) as total_quantity,
                AVG(mc.unit_cost) as avg_unit_cost,
                SUM(mc.quantity_consumed * mc.unit_cost) as total_cost
            FROM work_order_material_usage mc
            JOIN items i ON mc.item_id = i.id AND i.company_id = :company_id
            WHERE mc.company_id = :company_id
                AND mc.consumption_date BETWEEN :period_start AND :period_end
            GROUP BY i.id, i.item_code, i.item_name
            ORDER BY total_cost DESC
        """
    else:  # work_order
        query = """
            SELECT 
                wo.id as work_order_id,
                wo.wo_number,
                i.item_code,
                i.item_name,
                COUNT(DISTINCT mc.id) as total_consumptions,
                SUM(mc.quantity_consumed * mc.unit_cost) as total_material_cost
            FROM work_order_material_usage mc
            JOIN work_orders wo ON mc.work_order_id = wo.id AND wo.company_id = :company_id
            JOIN items i ON wo.product_id = i.id AND i.company_id = :company_id
            WHERE mc.company_id = :company_id
                AND mc.consumption_date BETWEEN :period_start AND :period_end
            GROUP BY wo.id, wo.wo_number, i.item_code, i.item_name
            ORDER BY total_material_cost DESC
        """
    
    result = db.execute(text(query), {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    })
    
    return [dict(row._mapping) for row in result]
