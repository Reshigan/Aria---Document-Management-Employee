"""
Priority 11: Comprehensive Reporting Module
Provides KPIs, dashboards, scheduled reports, and analytics for all ERP modules
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import asyncpg
import os

router = APIRouter(prefix="/api/erp/reporting", tags=["reporting"])

async def get_db_connection():
    return await asyncpg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "aria_erp")
    )

# Pydantic Models
class KPIDefinition(BaseModel):
    kpi_name: str
    kpi_category: str
    calculation_method: str
    target_value: Optional[float] = None
    unit: str
    is_active: bool = True

class Dashboard(BaseModel):
    dashboard_name: str
    dashboard_type: str
    layout_config: Dict[str, Any]
    is_default: bool = False
    is_active: bool = True

class ScheduledReport(BaseModel):
    report_name: str
    report_type: str
    schedule_cron: str
    recipients: List[str]
    parameters: Optional[Dict[str, Any]] = None
    is_active: bool = True

class ReportExecution(BaseModel):
    report_id: str
    execution_status: str = "pending"
    output_format: str = "pdf"

@router.get("/kpis")
async def list_kpis(
    company_id: str = Query(...),
    category: Optional[str] = None
):
    """List all KPI definitions"""
    conn = await get_db_connection()
    try:
        query = """
            SELECT id, company_id, kpi_name, kpi_category, calculation_method,
                   target_value, unit, is_active, created_at
            FROM kpi_definitions
            WHERE company_id = $1
        """
        params = [company_id]
        
        if category:
            query += " AND kpi_category = $2"
            params.append(category)
        
        query += " ORDER BY kpi_category, kpi_name"
        
        rows = await conn.fetch(query, *params)
        kpis = [dict(row) for row in rows]
        
        return {"kpis": kpis}
    finally:
        await conn.close()

@router.post("/kpis")
async def create_kpi(
    company_id: str = Query(...),
    kpi: KPIDefinition = None
):
    """Create a new KPI definition"""
    conn = await get_db_connection()
    try:
        query = """
            INSERT INTO kpi_definitions (
                company_id, kpi_name, kpi_category, calculation_method,
                target_value, unit, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, created_at
        """
        
        row = await conn.fetchrow(
            query,
            company_id,
            kpi.kpi_name,
            kpi.kpi_category,
            kpi.calculation_method,
            kpi.target_value,
            kpi.unit,
            kpi.is_active
        )
        
        return {
            "id": row["id"],
            "created_at": row["created_at"],
            "message": "KPI definition created successfully"
        }
    finally:
        await conn.close()

@router.get("/kpis/{kpi_id}/values")
async def get_kpi_values(
    kpi_id: str,
    company_id: str = Query(...),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """Get KPI values for a specific period"""
    conn = await get_db_connection()
    try:
        query = """
            SELECT id, kpi_id, period_start, period_end, kpi_value,
                   actual_value, variance, created_at
            FROM kpi_values
            WHERE kpi_id = $1 AND company_id = $2
        """
        params = [kpi_id, company_id]
        
        if start_date:
            query += " AND period_start >= $3"
            params.append(start_date)
        
        if end_date:
            query += f" AND period_end <= ${len(params) + 1}"
            params.append(end_date)
        
        query += " ORDER BY period_start DESC"
        
        rows = await conn.fetch(query, *params)
        values = [dict(row) for row in rows]
        
        return {"kpi_values": values}
    finally:
        await conn.close()

@router.post("/kpis/{kpi_id}/calculate")
async def calculate_kpi(
    kpi_id: str,
    company_id: str = Query(...),
    period_start: date = Query(...),
    period_end: date = Query(...)
):
    """Calculate KPI value for a specific period"""
    conn = await get_db_connection()
    try:
        kpi_query = """
            SELECT kpi_name, kpi_category, calculation_method, target_value
            FROM kpi_definitions
            WHERE id = $1 AND company_id = $2
        """
        kpi = await conn.fetchrow(kpi_query, kpi_id, company_id)
        
        if not kpi:
            raise HTTPException(status_code=404, detail="KPI not found")
        
        calculated_value = 0.0
        
        if kpi["kpi_category"] == "financial":
            if "revenue" in kpi["kpi_name"].lower():
                revenue_query = """
                    SELECT COALESCE(SUM(total_amount), 0) as total
                    FROM customer_invoices
                    WHERE company_id = $1 AND invoice_date BETWEEN $2 AND $3
                    AND status = 'posted'
                """
                result = await conn.fetchrow(revenue_query, company_id, period_start, period_end)
                calculated_value = float(result["total"])
        
        insert_query = """
            INSERT INTO kpi_values (
                company_id, kpi_id, period_start, period_end,
                kpi_value, actual_value, variance
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, created_at
        """
        
        target = kpi["target_value"] or 0
        variance = calculated_value - target if target > 0 else 0
        
        row = await conn.fetchrow(
            insert_query,
            company_id,
            kpi_id,
            period_start,
            period_end,
            calculated_value,
            calculated_value,
            variance
        )
        
        return {
            "id": row["id"],
            "kpi_value": calculated_value,
            "target_value": target,
            "variance": variance,
            "created_at": row["created_at"]
        }
    finally:
        await conn.close()

@router.get("/dashboards")
async def list_dashboards(
    company_id: str = Query(...),
    dashboard_type: Optional[str] = None
):
    """List all dashboards"""
    conn = await get_db_connection()
    try:
        query = """
            SELECT id, company_id, dashboard_name, dashboard_type,
                   layout_config, is_default, is_active, created_at
            FROM dashboards
            WHERE company_id = $1
        """
        params = [company_id]
        
        if dashboard_type:
            query += " AND dashboard_type = $2"
            params.append(dashboard_type)
        
        query += " ORDER BY is_default DESC, dashboard_name"
        
        rows = await conn.fetch(query, *params)
        dashboards = [dict(row) for row in rows]
        
        return {"dashboards": dashboards}
    finally:
        await conn.close()

@router.post("/dashboards")
async def create_dashboard(
    company_id: str = Query(...),
    dashboard: Dashboard = None
):
    """Create a new dashboard"""
    conn = await get_db_connection()
    try:
        query = """
            INSERT INTO dashboards (
                company_id, dashboard_name, dashboard_type,
                layout_config, is_default, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, created_at
        """
        
        row = await conn.fetchrow(
            query,
            company_id,
            dashboard.dashboard_name,
            dashboard.dashboard_type,
            dashboard.layout_config,
            dashboard.is_default,
            dashboard.is_active
        )
        
        return {
            "id": row["id"],
            "created_at": row["created_at"],
            "message": "Dashboard created successfully"
        }
    finally:
        await conn.close()

@router.get("/dashboards/{dashboard_id}")
async def get_dashboard(
    dashboard_id: str,
    company_id: str = Query(...)
):
    """Get dashboard with all widgets and data"""
    conn = await get_db_connection()
    try:
        dashboard_query = """
            SELECT id, company_id, dashboard_name, dashboard_type,
                   layout_config, is_default, is_active, created_at
            FROM dashboards
            WHERE id = $1 AND company_id = $2
        """
        dashboard = await conn.fetchrow(dashboard_query, dashboard_id, company_id)
        
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        widgets_query = """
            SELECT id, widget_type, widget_config, position_x, position_y,
                   width, height, is_visible
            FROM dashboard_widgets
            WHERE dashboard_id = $1
            ORDER BY position_y, position_x
        """
        widgets = await conn.fetch(widgets_query, dashboard_id)
        
        return {
            "dashboard": dict(dashboard),
            "widgets": [dict(w) for w in widgets]
        }
    finally:
        await conn.close()

@router.get("/scheduled-reports")
async def list_scheduled_reports(
    company_id: str = Query(...)
):
    """List all scheduled reports"""
    conn = await get_db_connection()
    try:
        query = """
            SELECT id, company_id, report_name, report_type, schedule_cron,
                   recipients, parameters, last_run_at, next_run_at,
                   is_active, created_at
            FROM scheduled_reports
            WHERE company_id = $1
            ORDER BY report_name
        """
        
        rows = await conn.fetch(query, company_id)
        reports = [dict(row) for row in rows]
        
        return {"scheduled_reports": reports}
    finally:
        await conn.close()

@router.post("/scheduled-reports")
async def create_scheduled_report(
    company_id: str = Query(...),
    report: ScheduledReport = None
):
    """Create a new scheduled report"""
    conn = await get_db_connection()
    try:
        query = """
            INSERT INTO scheduled_reports (
                company_id, report_name, report_type, schedule_cron,
                recipients, parameters, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, created_at
        """
        
        row = await conn.fetchrow(
            query,
            company_id,
            report.report_name,
            report.report_type,
            report.schedule_cron,
            report.recipients,
            report.parameters,
            report.is_active
        )
        
        return {
            "id": row["id"],
            "created_at": row["created_at"],
            "message": "Scheduled report created successfully"
        }
    finally:
        await conn.close()

@router.get("/report-executions")
async def list_report_executions(
    company_id: str = Query(...),
    report_id: Optional[str] = None,
    status: Optional[str] = None
):
    """List report execution history"""
    conn = await get_db_connection()
    try:
        query = """
            SELECT id, company_id, report_id, execution_status,
                   output_format, output_path, error_message,
                   started_at, completed_at, created_at
            FROM report_executions
            WHERE company_id = $1
        """
        params = [company_id]
        
        if report_id:
            query += " AND report_id = $2"
            params.append(report_id)
        
        if status:
            query += f" AND execution_status = ${len(params) + 1}"
            params.append(status)
        
        query += " ORDER BY created_at DESC LIMIT 100"
        
        rows = await conn.fetch(query, *params)
        executions = [dict(row) for row in rows]
        
        return {"report_executions": executions}
    finally:
        await conn.close()

@router.post("/report-executions")
async def execute_report(
    company_id: str = Query(...),
    execution: ReportExecution = None
):
    """Execute a report immediately"""
    conn = await get_db_connection()
    try:
        query = """
            INSERT INTO report_executions (
                company_id, report_id, execution_status, output_format,
                started_at
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING id, created_at
        """
        
        row = await conn.fetchrow(
            query,
            company_id,
            execution.report_id,
            "processing",
            execution.output_format,
            datetime.utcnow()
        )
        
        
        return {
            "id": row["id"],
            "execution_status": "processing",
            "created_at": row["created_at"],
            "message": "Report execution started"
        }
    finally:
        await conn.close()

# Analytics Endpoints
@router.get("/analytics/financial-summary")
async def get_financial_summary(
    company_id: str = Query(...),
    period_start: date = Query(...),
    period_end: date = Query(...)
):
    """Get financial summary analytics"""
    conn = await get_db_connection()
    try:
        revenue_query = """
            SELECT COALESCE(SUM(total_amount), 0) as total_revenue
            FROM customer_invoices
            WHERE company_id = $1 AND invoice_date BETWEEN $2 AND $3
            AND status = 'posted'
        """
        revenue = await conn.fetchrow(revenue_query, company_id, period_start, period_end)
        
        expenses_query = """
            SELECT COALESCE(SUM(total_amount), 0) as total_expenses
            FROM supplier_invoices
            WHERE company_id = $1 AND invoice_date BETWEEN $2 AND $3
            AND status = 'posted'
        """
        expenses = await conn.fetchrow(expenses_query, company_id, period_start, period_end)
        
        ar_query = """
            SELECT COALESCE(SUM(total_amount - amount_paid), 0) as outstanding_ar
            FROM customer_invoices
            WHERE company_id = $1 AND status IN ('posted', 'partial')
        """
        ar = await conn.fetchrow(ar_query, company_id)
        
        ap_query = """
            SELECT COALESCE(SUM(total_amount - amount_paid), 0) as outstanding_ap
            FROM supplier_invoices
            WHERE company_id = $1 AND status IN ('posted', 'partial')
        """
        ap = await conn.fetchrow(ap_query, company_id)
        
        total_revenue = float(revenue["total_revenue"])
        total_expenses = float(expenses["total_expenses"])
        profit = total_revenue - total_expenses
        profit_margin = (profit / total_revenue * 100) if total_revenue > 0 else 0
        
        return {
            "period_start": period_start,
            "period_end": period_end,
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "profit": profit,
            "profit_margin": profit_margin,
            "outstanding_ar": float(ar["outstanding_ar"]),
            "outstanding_ap": float(ap["outstanding_ap"])
        }
    finally:
        await conn.close()

@router.get("/analytics/sales-pipeline")
async def get_sales_pipeline(
    company_id: str = Query(...)
):
    """Get sales pipeline analytics"""
    conn = await get_db_connection()
    try:
        query = """
            SELECT 
                status,
                COUNT(*) as count,
                COALESCE(SUM(total_amount), 0) as total_value
            FROM quotes
            WHERE company_id = $1
            GROUP BY status
            ORDER BY 
                CASE status
                    WHEN 'draft' THEN 1
                    WHEN 'sent' THEN 2
                    WHEN 'accepted' THEN 3
                    WHEN 'rejected' THEN 4
                    ELSE 5
                END
        """
        
        rows = await conn.fetch(query, company_id)
        pipeline = [dict(row) for row in rows]
        
        return {"sales_pipeline": pipeline}
    finally:
        await conn.close()

@router.get("/analytics/inventory-turnover")
async def get_inventory_turnover(
    company_id: str = Query(...),
    period_start: date = Query(...),
    period_end: date = Query(...)
):
    """Get inventory turnover analytics"""
    conn = await get_db_connection()
    try:
        query = """
            SELECT 
                p.product_code,
                p.product_name,
                COUNT(sm.id) as movement_count,
                COALESCE(SUM(CASE WHEN sm.movement_type = 'issue' THEN sm.quantity ELSE 0 END), 0) as total_issued,
                COALESCE(SUM(CASE WHEN sm.movement_type = 'receipt' THEN sm.quantity ELSE 0 END), 0) as total_received
            FROM products p
            LEFT JOIN stock_movements sm ON p.id = sm.product_id
                AND sm.company_id = $1
                AND sm.movement_date BETWEEN $2 AND $3
            WHERE p.company_id = $1
            GROUP BY p.id, p.product_code, p.product_name
            HAVING COUNT(sm.id) > 0
            ORDER BY total_issued DESC
            LIMIT 20
        """
        
        rows = await conn.fetch(query, company_id, period_start, period_end)
        turnover = [dict(row) for row in rows]
        
        return {"inventory_turnover": turnover}
    finally:
        await conn.close()

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "module": "reporting",
        "timestamp": datetime.utcnow().isoformat()
    }
