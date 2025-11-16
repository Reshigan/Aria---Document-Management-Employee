"""
Sales/Purchase Reports API
Provides 4 comprehensive sales/purchase reports with drill-down to L5:
1. Sales KPIs Report (with drill-down to orders)
2. Purchase KPIs Report (with drill-down to POs)
3. Sales Trends Report (with drill-down to line items)
4. Profitability Analysis Report (with drill-down to transactions)
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

router = APIRouter(prefix="/api/reports/sales-purchase", tags=["Sales/Purchase Reports"])

# ============================================================================
# ============================================================================

class SalesKPIs(BaseModel):
    total_orders: int
    total_revenue: Decimal
    total_invoiced: Decimal
    total_delivered: Decimal
    average_order_value: Decimal
    conversion_rate: Decimal
    top_customer_id: Optional[str]
    top_customer_name: Optional[str]
    top_customer_revenue: Decimal

class SalesKPIsReport(BaseModel):
    company_id: str
    period_start: date
    period_end: date
    kpis: SalesKPIs
    by_customer: List[Dict[str, Any]]
    by_item: List[Dict[str, Any]]

@router.get("/sales-kpis", response_model=SalesKPIsReport)
def get_sales_kpis(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    db: Session = Depends(get_db)
):
    """Generate Sales KPIs report with drill-down capability"""
    
    kpis_query = """
        WITH sales_data AS (
            SELECT 
                COUNT(DISTINCT so.id) as total_orders,
                COALESCE(SUM(so.total_amount), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN i.status IN ('POSTED', 'PAID') THEN i.total_amount ELSE 0 END), 0) as total_invoiced,
                COALESCE(SUM(CASE WHEN d.status = 'COMPLETED' THEN so.total_amount ELSE 0 END), 0) as total_delivered,
                COUNT(DISTINCT q.id) as total_quotes
            FROM sales_orders so
            LEFT JOIN invoices i ON so.id = i.sales_order_id AND i.company_id = :company_id
            LEFT JOIN deliveries d ON so.id = d.sales_order_id AND d.company_id = :company_id
            LEFT JOIN quotes q ON so.customer_id = q.customer_id AND q.company_id = :company_id 
                AND q.quote_date BETWEEN :period_start AND :period_end
            WHERE so.company_id = :company_id
                AND so.order_date BETWEEN :period_start AND :period_end
        ),
        top_customer AS (
            SELECT 
                c.id as customer_id,
                c.name as customer_name,
                SUM(so.total_amount) as revenue
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.id AND c.company_id = :company_id
            WHERE so.company_id = :company_id
                AND so.order_date BETWEEN :period_start AND :period_end
            GROUP BY c.id, c.name
            ORDER BY revenue DESC
            LIMIT 1
        )
        SELECT 
            sd.total_orders,
            sd.total_revenue,
            sd.total_invoiced,
            sd.total_delivered,
            CASE WHEN sd.total_orders > 0 THEN sd.total_revenue / sd.total_orders ELSE 0 END as average_order_value,
            CASE WHEN sd.total_quotes > 0 THEN (sd.total_orders::DECIMAL / sd.total_quotes * 100) ELSE 0 END as conversion_rate,
            tc.customer_id as top_customer_id,
            tc.customer_name as top_customer_name,
            COALESCE(tc.revenue, 0) as top_customer_revenue
        FROM sales_data sd
        LEFT JOIN top_customer tc ON true
    """
    
    result = db.execute(text(kpis_query), {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    }).fetchone()
    
    kpis = SalesKPIs(**dict(result._mapping))
    
    by_customer_query = """
        SELECT 
            c.id as customer_id,
            c.name as customer_name,
            COUNT(DISTINCT so.id) as order_count,
            SUM(so.total_amount) as total_revenue,
            AVG(so.total_amount) as avg_order_value
        FROM sales_orders so
        JOIN customers c ON so.customer_id = c.id AND c.company_id = :company_id
        WHERE so.company_id = :company_id
            AND so.order_date BETWEEN :period_start AND :period_end
        GROUP BY c.id, c.name
        ORDER BY total_revenue DESC
        LIMIT 10
    """
    
    by_customer_result = db.execute(text(by_customer_query), {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    })
    
    by_item_query = """
        SELECT 
            i.id as item_id,
            i.item_code,
            i.item_name,
            SUM(sol.quantity) as total_quantity,
            SUM(sol.quantity * sol.unit_price) as total_revenue
        FROM sales_order_lines sol
        JOIN sales_orders so ON sol.sales_order_id = so.id AND so.company_id = :company_id
        JOIN items i ON sol.item_id = i.id AND i.company_id = :company_id
        WHERE sol.company_id = :company_id
            AND so.order_date BETWEEN :period_start AND :period_end
        GROUP BY i.id, i.item_code, i.item_name
        ORDER BY total_revenue DESC
        LIMIT 10
    """
    
    by_item_result = db.execute(text(by_item_query), {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    })
    
    return SalesKPIsReport(
        company_id=company_id,
        period_start=period_start,
        period_end=period_end,
        kpis=kpis,
        by_customer=[dict(row._mapping) for row in by_customer_result],
        by_item=[dict(row._mapping) for row in by_item_result]
    )

# ============================================================================
# ============================================================================

class PurchaseKPIs(BaseModel):
    total_orders: int
    total_spend: Decimal
    total_received: Decimal
    average_order_value: Decimal
    on_time_delivery_rate: Decimal
    top_supplier_id: Optional[str]
    top_supplier_name: Optional[str]
    top_supplier_spend: Decimal

class PurchaseKPIsReport(BaseModel):
    company_id: str
    period_start: date
    period_end: date
    kpis: PurchaseKPIs
    by_supplier: List[Dict[str, Any]]
    by_item: List[Dict[str, Any]]

@router.get("/purchase-kpis", response_model=PurchaseKPIsReport)
def get_purchase_kpis(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    db: Session = Depends(get_db)
):
    """Generate Purchase KPIs report with drill-down capability"""
    
    kpis_query = """
        WITH purchase_data AS (
            SELECT 
                COUNT(DISTINCT po.id) as total_orders,
                COALESCE(SUM(po.total_amount), 0) as total_spend,
                COALESCE(SUM(CASE WHEN gr.status = 'COMPLETED' THEN po.total_amount ELSE 0 END), 0) as total_received,
                COUNT(CASE WHEN gr.receipt_date <= po.expected_delivery_date THEN 1 END) as on_time_deliveries,
                COUNT(DISTINCT gr.id) as total_deliveries
            FROM purchase_orders po
            LEFT JOIN goods_receipts gr ON po.id = gr.purchase_order_id AND gr.company_id = :company_id
            WHERE po.company_id = :company_id
                AND po.order_date BETWEEN :period_start AND :period_end
        ),
        top_supplier AS (
            SELECT 
                s.id as supplier_id,
                s.name as supplier_name,
                SUM(po.total_amount) as spend
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.id AND s.company_id = :company_id
            WHERE po.company_id = :company_id
                AND po.order_date BETWEEN :period_start AND :period_end
            GROUP BY s.id, s.name
            ORDER BY spend DESC
            LIMIT 1
        )
        SELECT 
            pd.total_orders,
            pd.total_spend,
            pd.total_received,
            CASE WHEN pd.total_orders > 0 THEN pd.total_spend / pd.total_orders ELSE 0 END as average_order_value,
            CASE WHEN pd.total_deliveries > 0 THEN (pd.on_time_deliveries::DECIMAL / pd.total_deliveries * 100) ELSE 0 END as on_time_delivery_rate,
            ts.supplier_id as top_supplier_id,
            ts.supplier_name as top_supplier_name,
            COALESCE(ts.spend, 0) as top_supplier_spend
        FROM purchase_data pd
        LEFT JOIN top_supplier ts ON true
    """
    
    result = db.execute(text(kpis_query), {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    }).fetchone()
    
    kpis = PurchaseKPIs(**dict(result._mapping))
    
    by_supplier_query = """
        SELECT 
            s.id as supplier_id,
            s.name as supplier_name,
            COUNT(DISTINCT po.id) as order_count,
            SUM(po.total_amount) as total_spend,
            AVG(po.total_amount) as avg_order_value
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id AND s.company_id = :company_id
        WHERE po.company_id = :company_id
            AND po.order_date BETWEEN :period_start AND :period_end
        GROUP BY s.id, s.name
        ORDER BY total_spend DESC
        LIMIT 10
    """
    
    by_supplier_result = db.execute(text(by_supplier_query), {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    })
    
    by_item_query = """
        SELECT 
            i.id as item_id,
            i.item_code,
            i.item_name,
            SUM(pol.quantity) as total_quantity,
            SUM(pol.quantity * pol.unit_price) as total_spend
        FROM purchase_order_lines pol
        JOIN purchase_orders po ON pol.purchase_order_id = po.id AND po.company_id = :company_id
        JOIN items i ON pol.item_id = i.id AND i.company_id = :company_id
        WHERE pol.company_id = :company_id
            AND po.order_date BETWEEN :period_start AND :period_end
        GROUP BY i.id, i.item_code, i.item_name
        ORDER BY total_spend DESC
        LIMIT 10
    """
    
    by_item_result = db.execute(text(by_item_query), {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    })
    
    return PurchaseKPIsReport(
        company_id=company_id,
        period_start=period_start,
        period_end=period_end,
        kpis=kpis,
        by_supplier=[dict(row._mapping) for row in by_supplier_result],
        by_item=[dict(row._mapping) for row in by_item_result]
    )

# ============================================================================
# ============================================================================

@router.get("/sales-trends")
def get_sales_trends(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    group_by: str = Query("month", description="Group by: day, week, month, quarter"),
    db: Session = Depends(get_db)
):
    """Sales Trends report with drill-down to line items"""
    
    if group_by == "day":
        date_trunc = "day"
    elif group_by == "week":
        date_trunc = "week"
    elif group_by == "quarter":
        date_trunc = "quarter"
    else:  # month
        date_trunc = "month"
    
    query = f"""
        SELECT 
            DATE_TRUNC('{date_trunc}', so.order_date) as period,
            COUNT(DISTINCT so.id) as order_count,
            COUNT(DISTINCT so.customer_id) as customer_count,
            SUM(so.total_amount) as total_revenue,
            AVG(so.total_amount) as avg_order_value,
            SUM(sol.quantity) as total_units_sold
        FROM sales_orders so
        LEFT JOIN sales_order_lines sol ON so.id = sol.sales_order_id AND sol.company_id = :company_id
        WHERE so.company_id = :company_id
            AND so.order_date BETWEEN :period_start AND :period_end
        GROUP BY DATE_TRUNC('{date_trunc}', so.order_date)
        ORDER BY period
    """
    
    result = db.execute(text(query), {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    })
    
    return [dict(row._mapping) for row in result]

@router.get("/sales-trends/drill-down")
def get_sales_trends_drilldown(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_date: date = Query(..., description="Period date to drill down"),
    group_by: str = Query("month", description="Group by: day, week, month, quarter"),
    db: Session = Depends(get_db)
):
    """Drill down to sales orders for a specific period"""
    
    if group_by == "day":
        period_start = period_date
        period_end = period_date
    elif group_by == "week":
        period_start = period_date
        period_end = period_date + timedelta(days=6)
    elif group_by == "quarter":
        quarter = (period_date.month - 1) // 3
        period_start = date(period_date.year, quarter * 3 + 1, 1)
        if quarter == 3:
            period_end = date(period_date.year, 12, 31)
        else:
            period_end = date(period_date.year, (quarter + 1) * 3 + 1, 1) - timedelta(days=1)
    else:  # month
        period_start = date(period_date.year, period_date.month, 1)
        if period_date.month == 12:
            period_end = date(period_date.year, 12, 31)
        else:
            period_end = date(period_date.year, period_date.month + 1, 1) - timedelta(days=1)
    
    query = """
        SELECT 
            so.id as sales_order_id,
            so.order_number,
            so.order_date,
            c.name as customer_name,
            so.total_amount,
            so.status
        FROM sales_orders so
        JOIN customers c ON so.customer_id = c.id AND c.company_id = :company_id
        WHERE so.company_id = :company_id
            AND so.order_date BETWEEN :period_start AND :period_end
        ORDER BY so.order_date DESC
    """
    
    result = db.execute(text(query), {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    })
    
    return [dict(row._mapping) for row in result]

# ============================================================================
# ============================================================================

@router.get("/profitability-analysis")
def get_profitability_analysis(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    analysis_by: str = Query("customer", description="Analyze by: customer, item, sales_order"),
    db: Session = Depends(get_db)
):
    """Profitability Analysis with drill-down to transactions"""
    
    if analysis_by == "customer":
        query = """
            WITH customer_revenue AS (
                SELECT 
                    c.id as customer_id,
                    c.name as customer_name,
                    SUM(so.total_amount) as revenue
                FROM sales_orders so
                JOIN customers c ON so.customer_id = c.id AND c.company_id = :company_id
                WHERE so.company_id = :company_id
                    AND so.order_date BETWEEN :period_start AND :period_end
                GROUP BY c.id, c.name
            ),
            customer_costs AS (
                SELECT 
                    so.customer_id,
                    SUM(sol.quantity * COALESCE(cl.unit_cost, 0)) as cost_of_goods
                FROM sales_order_lines sol
                JOIN sales_orders so ON sol.sales_order_id = so.id AND so.company_id = :company_id
                LEFT JOIN cost_layers cl ON sol.item_id = cl.item_id AND cl.company_id = :company_id
                WHERE sol.company_id = :company_id
                    AND so.order_date BETWEEN :period_start AND :period_end
                GROUP BY so.customer_id
            )
            SELECT 
                cr.customer_id,
                cr.customer_name,
                cr.revenue,
                COALESCE(cc.cost_of_goods, 0) as cost_of_goods,
                cr.revenue - COALESCE(cc.cost_of_goods, 0) as gross_profit,
                CASE 
                    WHEN cr.revenue > 0 THEN ((cr.revenue - COALESCE(cc.cost_of_goods, 0)) / cr.revenue * 100)
                    ELSE 0
                END as gross_profit_margin
            FROM customer_revenue cr
            LEFT JOIN customer_costs cc ON cr.customer_id = cc.customer_id
            ORDER BY gross_profit DESC
        """
    elif analysis_by == "item":
        query = """
            WITH item_revenue AS (
                SELECT 
                    i.id as item_id,
                    i.item_code,
                    i.item_name,
                    SUM(sol.quantity) as quantity_sold,
                    SUM(sol.quantity * sol.unit_price) as revenue
                FROM sales_order_lines sol
                JOIN sales_orders so ON sol.sales_order_id = so.id AND so.company_id = :company_id
                JOIN items i ON sol.item_id = i.id AND i.company_id = :company_id
                WHERE sol.company_id = :company_id
                    AND so.order_date BETWEEN :period_start AND :period_end
                GROUP BY i.id, i.item_code, i.item_name
            ),
            item_costs AS (
                SELECT 
                    sol.item_id,
                    SUM(sol.quantity * COALESCE(cl.unit_cost, 0)) as cost_of_goods
                FROM sales_order_lines sol
                JOIN sales_orders so ON sol.sales_order_id = so.id AND so.company_id = :company_id
                LEFT JOIN cost_layers cl ON sol.item_id = cl.item_id AND cl.company_id = :company_id
                WHERE sol.company_id = :company_id
                    AND so.order_date BETWEEN :period_start AND :period_end
                GROUP BY sol.item_id
            )
            SELECT 
                ir.item_id,
                ir.item_code,
                ir.item_name,
                ir.quantity_sold,
                ir.revenue,
                COALESCE(ic.cost_of_goods, 0) as cost_of_goods,
                ir.revenue - COALESCE(ic.cost_of_goods, 0) as gross_profit,
                CASE 
                    WHEN ir.revenue > 0 THEN ((ir.revenue - COALESCE(ic.cost_of_goods, 0)) / ir.revenue * 100)
                    ELSE 0
                END as gross_profit_margin
            FROM item_revenue ir
            LEFT JOIN item_costs ic ON ir.item_id = ic.item_id
            ORDER BY gross_profit DESC
        """
    else:  # sales_order
        query = """
            WITH order_revenue AS (
                SELECT 
                    so.id as sales_order_id,
                    so.order_number,
                    so.order_date,
                    c.name as customer_name,
                    so.total_amount as revenue
                FROM sales_orders so
                JOIN customers c ON so.customer_id = c.id AND c.company_id = :company_id
                WHERE so.company_id = :company_id
                    AND so.order_date BETWEEN :period_start AND :period_end
            ),
            order_costs AS (
                SELECT 
                    sol.sales_order_id,
                    SUM(sol.quantity * COALESCE(cl.unit_cost, 0)) as cost_of_goods
                FROM sales_order_lines sol
                LEFT JOIN cost_layers cl ON sol.item_id = cl.item_id AND cl.company_id = :company_id
                WHERE sol.company_id = :company_id
                GROUP BY sol.sales_order_id
            )
            SELECT 
                orv.sales_order_id,
                orv.order_number,
                orv.order_date,
                orv.customer_name,
                orv.revenue,
                COALESCE(oc.cost_of_goods, 0) as cost_of_goods,
                orv.revenue - COALESCE(oc.cost_of_goods, 0) as gross_profit,
                CASE 
                    WHEN orv.revenue > 0 THEN ((orv.revenue - COALESCE(oc.cost_of_goods, 0)) / orv.revenue * 100)
                    ELSE 0
                END as gross_profit_margin
            FROM order_revenue orv
            LEFT JOIN order_costs oc ON orv.sales_order_id = oc.sales_order_id
            ORDER BY gross_profit DESC
        """
    
    result = db.execute(text(query), {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    })
    
    return [dict(row._mapping) for row in result]
