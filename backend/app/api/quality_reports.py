"""
Quality Reports API
Provides 3 comprehensive quality reports with drill-down to L5:
1. Yield Analysis Report (with drill-down to work orders)
2. Defects Analysis Report (with drill-down to inspection results)
3. Nonconformance Report (with drill-down to NCR details)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, date, timedelta
from decimal import Decimal

try:
    from app.database import get_db
except ImportError:
    from database import get_db

router = APIRouter(prefix="/api/reports/quality", tags=["Quality Reports"])

# ============================================================================
# ============================================================================

class YieldAnalysisItem(BaseModel):
    work_order_id: str
    work_order_number: str
    item_code: str
    item_name: str
    quantity_ordered: Decimal
    quantity_completed: Decimal
    quantity_scrapped: Decimal
    yield_percent: Decimal
    first_pass_yield: Decimal
    status: str

class YieldAnalysisReport(BaseModel):
    company_id: str
    period_start: date
    period_end: date
    work_orders: List[YieldAnalysisItem]
    total_ordered: Decimal
    total_completed: Decimal
    total_scrapped: Decimal
    overall_yield: Decimal

@router.get("/yield-analysis", response_model=YieldAnalysisReport)
def get_yield_analysis(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    item_id: Optional[str] = None,
    work_center_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Generate Yield Analysis report with drill-down capability"""
    query = """
        WITH work_order_yield AS (
            SELECT 
                wo.id as work_order_id,
                wo.work_order_number,
                i.item_code,
                i.item_name,
                wo.quantity_ordered,
                wo.quantity_completed,
                COALESCE(wo.quantity_scrapped, 0) as quantity_scrapped,
                CASE 
                    WHEN wo.quantity_ordered > 0 
                    THEN (wo.quantity_completed::DECIMAL / wo.quantity_ordered * 100)
                    ELSE 0
                END as yield_percent,
                CASE 
                    WHEN wo.quantity_ordered > 0 
                    THEN ((wo.quantity_completed - COALESCE(wo.quantity_reworked, 0))::DECIMAL / wo.quantity_ordered * 100)
                    ELSE 0
                END as first_pass_yield,
                wo.status
            FROM work_orders wo
            JOIN items i ON wo.item_id = i.id AND i.company_id = :company_id
            WHERE wo.company_id = :company_id
                AND wo.start_date BETWEEN :period_start AND :period_end
    """
    
    params = {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    }
    
    if item_id:
        query += " AND wo.item_id = :item_id"
        params["item_id"] = item_id
    
    if work_center_id:
        query += " AND wo.work_center_id = :work_center_id"
        params["work_center_id"] = work_center_id
    
    query += """
        )
        SELECT *
        FROM work_order_yield
        ORDER BY yield_percent ASC
    """
    
    result = db.execute(text(query), params)
    work_orders = [YieldAnalysisItem(**dict(row._mapping)) for row in result]
    
    total_ordered = sum(wo.quantity_ordered for wo in work_orders)
    total_completed = sum(wo.quantity_completed for wo in work_orders)
    total_scrapped = sum(wo.quantity_scrapped for wo in work_orders)
    overall_yield = (total_completed / total_ordered * 100) if total_ordered > 0 else Decimal('0')
    
    return YieldAnalysisReport(
        company_id=company_id,
        period_start=period_start,
        period_end=period_end,
        work_orders=work_orders,
        total_ordered=total_ordered,
        total_completed=total_completed,
        total_scrapped=total_scrapped,
        overall_yield=overall_yield
    )

@router.get("/yield-analysis/drill-down/{work_order_id}")
def get_yield_analysis_drilldown(
    work_order_id: str,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Drill down to quality inspection results for a specific work order"""
    query = """
        SELECT 
            qi.id as inspection_id,
            qi.inspection_date,
            qi.inspector_name,
            qi.inspection_type,
            qi.result,
            qi.quantity_inspected,
            qi.quantity_passed,
            qi.quantity_failed,
            qi.defect_count,
            qi.notes
        FROM quality_inspections qi
        WHERE qi.company_id = :company_id
            AND qi.work_order_id = :work_order_id
        ORDER BY qi.inspection_date DESC
    """
    
    result = db.execute(text(query), {
        "company_id": company_id,
        "work_order_id": work_order_id
    })
    
    return [dict(row._mapping) for row in result]

# ============================================================================
# ============================================================================

@router.get("/defects-analysis")
def get_defects_analysis(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    group_by: str = Query("defect_type", description="Group by: defect_type, item, work_center, inspector"),
    db: Session = Depends(get_db)
):
    """Defects Analysis with drill-down to inspection results"""
    
    if group_by == "defect_type":
        query = """
            SELECT 
                qd.defect_type,
                qd.defect_code,
                qd.defect_description,
                COUNT(DISTINCT qd.id) as defect_count,
                SUM(qd.quantity) as total_quantity,
                COUNT(DISTINCT qi.work_order_id) as affected_work_orders
            FROM quality_defects qd
            JOIN quality_inspections qi ON qd.inspection_id = qi.id AND qi.company_id = :company_id
            WHERE qd.company_id = :company_id
                AND qi.inspection_date BETWEEN :period_start AND :period_end
            GROUP BY qd.defect_type, qd.defect_code, qd.defect_description
            ORDER BY defect_count DESC
        """
    elif group_by == "item":
        query = """
            SELECT 
                i.id as item_id,
                i.item_code,
                i.item_name,
                COUNT(DISTINCT qd.id) as defect_count,
                SUM(qd.quantity) as total_defect_quantity,
                SUM(qi.quantity_inspected) as total_inspected,
                CASE 
                    WHEN SUM(qi.quantity_inspected) > 0 
                    THEN (SUM(qd.quantity)::DECIMAL / SUM(qi.quantity_inspected) * 100)
                    ELSE 0
                END as defect_rate
            FROM quality_defects qd
            JOIN quality_inspections qi ON qd.inspection_id = qi.id AND qi.company_id = :company_id
            JOIN work_orders wo ON qi.work_order_id = wo.id AND wo.company_id = :company_id
            JOIN items i ON wo.item_id = i.id AND i.company_id = :company_id
            WHERE qd.company_id = :company_id
                AND qi.inspection_date BETWEEN :period_start AND :period_end
            GROUP BY i.id, i.item_code, i.item_name
            ORDER BY defect_count DESC
        """
    elif group_by == "work_center":
        query = """
            SELECT 
                wc.id as work_center_id,
                wc.name as work_center_name,
                COUNT(DISTINCT qd.id) as defect_count,
                SUM(qd.quantity) as total_defect_quantity,
                SUM(qi.quantity_inspected) as total_inspected,
                CASE 
                    WHEN SUM(qi.quantity_inspected) > 0 
                    THEN (SUM(qd.quantity)::DECIMAL / SUM(qi.quantity_inspected) * 100)
                    ELSE 0
                END as defect_rate
            FROM quality_defects qd
            JOIN quality_inspections qi ON qd.inspection_id = qi.id AND qi.company_id = :company_id
            JOIN work_orders wo ON qi.work_order_id = wo.id AND wo.company_id = :company_id
            JOIN work_centers wc ON wo.work_center_id = wc.id AND wc.company_id = :company_id
            WHERE qd.company_id = :company_id
                AND qi.inspection_date BETWEEN :period_start AND :period_end
            GROUP BY wc.id, wc.name
            ORDER BY defect_count DESC
        """
    else:  # inspector
        query = """
            SELECT 
                qi.inspector_name,
                COUNT(DISTINCT qd.id) as defect_count,
                COUNT(DISTINCT qi.id) as inspection_count,
                SUM(qd.quantity) as total_defect_quantity,
                SUM(qi.quantity_inspected) as total_inspected
            FROM quality_defects qd
            JOIN quality_inspections qi ON qd.inspection_id = qi.id AND qi.company_id = :company_id
            WHERE qd.company_id = :company_id
                AND qi.inspection_date BETWEEN :period_start AND :period_end
            GROUP BY qi.inspector_name
            ORDER BY defect_count DESC
        """
    
    result = db.execute(text(query), {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    })
    
    return [dict(row._mapping) for row in result]

@router.get("/defects-analysis/drill-down")
def get_defects_drilldown(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    defect_type: Optional[str] = None,
    item_id: Optional[str] = None,
    work_center_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Drill down to individual defects"""
    query = """
        SELECT 
            qd.id as defect_id,
            qi.inspection_date,
            qi.inspection_type,
            wo.work_order_number,
            i.item_code,
            i.item_name,
            wc.name as work_center_name,
            qd.defect_type,
            qd.defect_code,
            qd.defect_description,
            qd.quantity,
            qd.severity,
            qi.inspector_name,
            qd.corrective_action
        FROM quality_defects qd
        JOIN quality_inspections qi ON qd.inspection_id = qi.id AND qi.company_id = :company_id
        JOIN work_orders wo ON qi.work_order_id = wo.id AND wo.company_id = :company_id
        JOIN items i ON wo.item_id = i.id AND i.company_id = :company_id
        LEFT JOIN work_centers wc ON wo.work_center_id = wc.id AND wc.company_id = :company_id
        WHERE qd.company_id = :company_id
            AND qi.inspection_date BETWEEN :period_start AND :period_end
    """
    
    params = {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end,
        "skip": skip,
        "limit": limit
    }
    
    if defect_type:
        query += " AND qd.defect_type = :defect_type"
        params["defect_type"] = defect_type
    
    if item_id:
        query += " AND wo.item_id = :item_id"
        params["item_id"] = item_id
    
    if work_center_id:
        query += " AND wo.work_center_id = :work_center_id"
        params["work_center_id"] = work_center_id
    
    query += " ORDER BY qi.inspection_date DESC, qd.id DESC OFFSET :skip LIMIT :limit"
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

# ============================================================================
# ============================================================================

class NonconformanceItem(BaseModel):
    ncr_id: int
    ncr_number: str
    ncr_date: date
    item_code: str
    item_name: str
    quantity_affected: Decimal
    severity: str
    status: str
    root_cause: Optional[str]
    corrective_action: Optional[str]
    days_open: int

class NonconformanceReport(BaseModel):
    company_id: str
    period_start: date
    period_end: date
    ncrs: List[NonconformanceItem]
    total_ncrs: int
    open_ncrs: int
    closed_ncrs: int
    avg_days_to_close: Decimal

@router.get("/nonconformance", response_model=NonconformanceReport)
def get_nonconformance_report(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    status: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Generate Nonconformance report with drill-down capability"""
    query = """
        SELECT 
            ncr.id as ncr_id,
            ncr.ncr_number,
            ncr.ncr_date,
            i.item_code,
            i.item_name,
            ncr.quantity_affected,
            ncr.severity,
            ncr.status,
            ncr.root_cause,
            ncr.corrective_action,
            CASE 
                WHEN ncr.status = 'CLOSED' AND ncr.closure_date IS NOT NULL 
                THEN ncr.closure_date - ncr.ncr_date
                ELSE CURRENT_DATE - ncr.ncr_date
            END as days_open
        FROM nonconformance_reports ncr
        JOIN items i ON ncr.item_id = i.id AND i.company_id = :company_id
        WHERE ncr.company_id = :company_id
            AND ncr.ncr_date BETWEEN :period_start AND :period_end
    """
    
    params = {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    }
    
    if status:
        query += " AND ncr.status = :status"
        params["status"] = status
    
    if severity:
        query += " AND ncr.severity = :severity"
        params["severity"] = severity
    
    query += " ORDER BY ncr.ncr_date DESC, ncr.severity DESC"
    
    result = db.execute(text(query), params)
    ncrs = [NonconformanceItem(**dict(row._mapping)) for row in result]
    
    total_ncrs = len(ncrs)
    open_ncrs = sum(1 for ncr in ncrs if ncr.status != 'CLOSED')
    closed_ncrs = sum(1 for ncr in ncrs if ncr.status == 'CLOSED')
    
    closed_days = [ncr.days_open for ncr in ncrs if ncr.status == 'CLOSED']
    avg_days_to_close = Decimal(str(sum(closed_days) / len(closed_days))) if closed_days else Decimal('0')
    
    return NonconformanceReport(
        company_id=company_id,
        period_start=period_start,
        period_end=period_end,
        ncrs=ncrs,
        total_ncrs=total_ncrs,
        open_ncrs=open_ncrs,
        closed_ncrs=closed_ncrs,
        avg_days_to_close=avg_days_to_close
    )

@router.get("/nonconformance/drill-down/{ncr_id}")
def get_nonconformance_drilldown(
    ncr_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Drill down to NCR details including related inspections and defects"""
    ncr_query = """
        SELECT 
            ncr.id as ncr_id,
            ncr.ncr_number,
            ncr.ncr_date,
            ncr.closure_date,
            i.item_code,
            i.item_name,
            ncr.quantity_affected,
            ncr.severity,
            ncr.status,
            ncr.description,
            ncr.root_cause,
            ncr.corrective_action,
            ncr.preventive_action,
            ncr.reported_by,
            ncr.assigned_to,
            wo.work_order_number,
            s.name as supplier_name
        FROM nonconformance_reports ncr
        JOIN items i ON ncr.item_id = i.id AND i.company_id = :company_id
        LEFT JOIN work_orders wo ON ncr.work_order_id = wo.id AND wo.company_id = :company_id
        LEFT JOIN suppliers s ON ncr.supplier_id = s.id AND s.company_id = :company_id
        WHERE ncr.company_id = :company_id
            AND ncr.id = :ncr_id
    """
    
    related_defects_query = """
        SELECT 
            qd.id as defect_id,
            qi.inspection_date,
            qd.defect_type,
            qd.defect_code,
            qd.defect_description,
            qd.quantity,
            qd.severity
        FROM quality_defects qd
        JOIN quality_inspections qi ON qd.inspection_id = qi.id AND qi.company_id = :company_id
        WHERE qd.company_id = :company_id
            AND qd.ncr_id = :ncr_id
        ORDER BY qi.inspection_date DESC
    """
    
    params = {"company_id": company_id, "ncr_id": ncr_id}
    
    ncr_result = db.execute(text(ncr_query), params).fetchone()
    defects_result = db.execute(text(related_defects_query), params)
    
    if not ncr_result:
        raise HTTPException(status_code=404, detail="NCR not found")
    
    return {
        "ncr": dict(ncr_result._mapping),
        "related_defects": [dict(row._mapping) for row in defects_result]
    }

@router.get("/nonconformance/summary")
def get_nonconformance_summary(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    db: Session = Depends(get_db)
):
    """NCR Summary by severity and status"""
    query = """
        SELECT 
            severity,
            status,
            COUNT(*) as ncr_count,
            SUM(quantity_affected) as total_quantity_affected,
            AVG(CASE 
                WHEN status = 'CLOSED' AND closure_date IS NOT NULL 
                THEN closure_date - ncr_date
                ELSE CURRENT_DATE - ncr_date
            END) as avg_days_open
        FROM nonconformance_reports
        WHERE company_id = :company_id
            AND ncr_date BETWEEN :period_start AND :period_end
        GROUP BY severity, status
        ORDER BY 
            CASE severity
                WHEN 'CRITICAL' THEN 1
                WHEN 'MAJOR' THEN 2
                WHEN 'MINOR' THEN 3
                ELSE 4
            END,
            status
    """
    
    result = db.execute(text(query), {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    })
    
    return [dict(row._mapping) for row in result]
