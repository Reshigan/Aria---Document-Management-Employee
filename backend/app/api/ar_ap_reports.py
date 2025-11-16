"""
AR/AP Reports API
Provides 4 comprehensive AR/AP reports with drill-down to L5:
1. AR Aging Report (with drill-down to invoices)
2. AP Aging Report (with drill-down to bills)
3. Payment Analysis Report (with drill-down to payment transactions)
4. Credit Control Report (with drill-down to customer accounts)
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

router = APIRouter(prefix="/api/reports/ar-ap", tags=["AR/AP Reports"])

# ============================================================================
# ============================================================================

class ARAgingBucket(BaseModel):
    customer_id: str
    customer_name: str
    current: Decimal
    days_30: Decimal
    days_60: Decimal
    days_90: Decimal
    days_over_90: Decimal
    total_outstanding: Decimal

class ARAgingReport(BaseModel):
    company_id: str
    report_date: date
    aging_buckets: List[ARAgingBucket]
    total_current: Decimal
    total_30: Decimal
    total_60: Decimal
    total_90: Decimal
    total_over_90: Decimal
    grand_total: Decimal

@router.get("/ar-aging", response_model=ARAgingReport)
def get_ar_aging(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    as_of_date: date = Query(..., description="Report as of date"),
    db: Session = Depends(get_db)
):
    """Generate AR Aging report with drill-down capability"""
    query = """
        WITH invoice_aging AS (
            SELECT 
                i.customer_id,
                c.name as customer_name,
                i.id as invoice_id,
                i.invoice_number,
                i.invoice_date,
                i.due_date,
                i.total_amount,
                COALESCE(SUM(p.amount), 0) as paid_amount,
                i.total_amount - COALESCE(SUM(p.amount), 0) as outstanding_amount,
                :as_of_date - i.due_date as days_overdue
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id AND c.company_id = :company_id
            LEFT JOIN payments p ON i.id = p.invoice_id AND p.company_id = :company_id AND p.status = 'COMPLETED'
            WHERE i.company_id = :company_id
                AND i.status IN ('POSTED', 'PARTIALLY_PAID')
                AND i.invoice_date <= :as_of_date
            GROUP BY i.id, i.customer_id, c.name, i.invoice_number, i.invoice_date, i.due_date, i.total_amount
            HAVING i.total_amount - COALESCE(SUM(p.amount), 0) > 0
        )
        SELECT 
            customer_id,
            customer_name,
            SUM(CASE WHEN days_overdue < 0 THEN outstanding_amount ELSE 0 END) as current,
            SUM(CASE WHEN days_overdue BETWEEN 0 AND 29 THEN outstanding_amount ELSE 0 END) as days_30,
            SUM(CASE WHEN days_overdue BETWEEN 30 AND 59 THEN outstanding_amount ELSE 0 END) as days_60,
            SUM(CASE WHEN days_overdue BETWEEN 60 AND 89 THEN outstanding_amount ELSE 0 END) as days_90,
            SUM(CASE WHEN days_overdue >= 90 THEN outstanding_amount ELSE 0 END) as days_over_90,
            SUM(outstanding_amount) as total_outstanding
        FROM invoice_aging
        GROUP BY customer_id, customer_name
        ORDER BY total_outstanding DESC
    """
    
    result = db.execute(text(query), {"company_id": company_id, "as_of_date": as_of_date})
    aging_buckets = [ARAgingBucket(**dict(row._mapping)) for row in result]
    
    return ARAgingReport(
        company_id=company_id,
        report_date=as_of_date,
        aging_buckets=aging_buckets,
        total_current=sum(b.current for b in aging_buckets),
        total_30=sum(b.days_30 for b in aging_buckets),
        total_60=sum(b.days_60 for b in aging_buckets),
        total_90=sum(b.days_90 for b in aging_buckets),
        total_over_90=sum(b.days_over_90 for b in aging_buckets),
        grand_total=sum(b.total_outstanding for b in aging_buckets)
    )

@router.get("/ar-aging/drill-down/{customer_id}")
def get_ar_aging_drilldown(
    customer_id: str,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    as_of_date: date = Query(..., description="Report as of date"),
    db: Session = Depends(get_db)
):
    """Drill down to invoices for a specific customer"""
    query = """
        SELECT 
            i.id as invoice_id,
            i.invoice_number,
            i.invoice_date,
            i.due_date,
            i.total_amount,
            COALESCE(SUM(p.amount), 0) as paid_amount,
            i.total_amount - COALESCE(SUM(p.amount), 0) as outstanding_amount,
            :as_of_date - i.due_date as days_overdue,
            i.status
        FROM invoices i
        LEFT JOIN payments p ON i.id = p.invoice_id AND p.company_id = :company_id AND p.status = 'COMPLETED'
        WHERE i.company_id = :company_id
            AND i.customer_id = :customer_id
            AND i.status IN ('POSTED', 'PARTIALLY_PAID')
            AND i.invoice_date <= :as_of_date
        GROUP BY i.id, i.invoice_number, i.invoice_date, i.due_date, i.total_amount, i.status
        HAVING i.total_amount - COALESCE(SUM(p.amount), 0) > 0
        ORDER BY i.due_date
    """
    
    result = db.execute(text(query), {
        "company_id": company_id,
        "customer_id": customer_id,
        "as_of_date": as_of_date
    })
    
    return [dict(row._mapping) for row in result]

# ============================================================================
# ============================================================================

class APAgingBucket(BaseModel):
    supplier_id: str
    supplier_name: str
    current: Decimal
    days_30: Decimal
    days_60: Decimal
    days_90: Decimal
    days_over_90: Decimal
    total_outstanding: Decimal

class APAgingReport(BaseModel):
    company_id: str
    report_date: date
    aging_buckets: List[APAgingBucket]
    total_current: Decimal
    total_30: Decimal
    total_60: Decimal
    total_90: Decimal
    total_over_90: Decimal
    grand_total: Decimal

@router.get("/ap-aging", response_model=APAgingReport)
def get_ap_aging(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    as_of_date: date = Query(..., description="Report as of date"),
    db: Session = Depends(get_db)
):
    """Generate AP Aging report with drill-down capability"""
    query = """
        WITH bill_aging AS (
            SELECT 
                po.supplier_id,
                s.name as supplier_name,
                po.id as purchase_order_id,
                po.po_number,
                po.order_date,
                po.expected_delivery_date as due_date,
                po.total_amount,
                COALESCE(SUM(p.amount), 0) as paid_amount,
                po.total_amount - COALESCE(SUM(p.amount), 0) as outstanding_amount,
                :as_of_date - po.expected_delivery_date as days_overdue
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id AND s.company_id = :company_id
            LEFT JOIN payments p ON po.id = p.purchase_order_id AND p.company_id = :company_id AND p.status = 'COMPLETED'
            WHERE po.company_id = :company_id
                AND po.status IN ('APPROVED', 'PARTIALLY_RECEIVED')
                AND po.order_date <= :as_of_date
            GROUP BY po.id, po.supplier_id, s.name, po.po_number, po.order_date, po.expected_delivery_date, po.total_amount
            HAVING po.total_amount - COALESCE(SUM(p.amount), 0) > 0
        )
        SELECT 
            supplier_id,
            supplier_name,
            SUM(CASE WHEN days_overdue < 0 THEN outstanding_amount ELSE 0 END) as current,
            SUM(CASE WHEN days_overdue BETWEEN 0 AND 29 THEN outstanding_amount ELSE 0 END) as days_30,
            SUM(CASE WHEN days_overdue BETWEEN 30 AND 59 THEN outstanding_amount ELSE 0 END) as days_60,
            SUM(CASE WHEN days_overdue BETWEEN 60 AND 89 THEN outstanding_amount ELSE 0 END) as days_90,
            SUM(CASE WHEN days_overdue >= 90 THEN outstanding_amount ELSE 0 END) as days_over_90,
            SUM(outstanding_amount) as total_outstanding
        FROM bill_aging
        GROUP BY supplier_id, supplier_name
        ORDER BY total_outstanding DESC
    """
    
    result = db.execute(text(query), {"company_id": company_id, "as_of_date": as_of_date})
    aging_buckets = [APAgingBucket(**dict(row._mapping)) for row in result]
    
    return APAgingReport(
        company_id=company_id,
        report_date=as_of_date,
        aging_buckets=aging_buckets,
        total_current=sum(b.current for b in aging_buckets),
        total_30=sum(b.days_30 for b in aging_buckets),
        total_60=sum(b.days_60 for b in aging_buckets),
        total_90=sum(b.days_90 for b in aging_buckets),
        total_over_90=sum(b.days_over_90 for b in aging_buckets),
        grand_total=sum(b.total_outstanding for b in aging_buckets)
    )

# ============================================================================
# ============================================================================

@router.get("/payment-analysis")
def get_payment_analysis(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    payment_type: Optional[str] = Query(None, description="AR or AP"),
    db: Session = Depends(get_db)
):
    """Payment Analysis with drill-down to payment transactions"""
    query = """
        SELECT 
            p.id as payment_id,
            p.payment_number,
            p.payment_date,
            p.payment_method,
            p.amount,
            p.currency_code,
            p.status,
            CASE 
                WHEN p.invoice_id IS NOT NULL THEN 'AR'
                WHEN p.purchase_order_id IS NOT NULL THEN 'AP'
                ELSE 'OTHER'
            END as payment_type,
            COALESCE(c.name, s.name) as party_name,
            p.reference_number,
            p.notes
        FROM payments p
        LEFT JOIN invoices i ON p.invoice_id = i.id
        LEFT JOIN customers c ON i.customer_id = c.id AND c.company_id = :company_id
        LEFT JOIN purchase_orders po ON p.purchase_order_id = po.id
        LEFT JOIN suppliers s ON po.supplier_id = s.id AND s.company_id = :company_id
        WHERE p.company_id = :company_id
            AND p.payment_date BETWEEN :period_start AND :period_end
            AND p.status = 'COMPLETED'
    """
    
    params = {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    }
    
    if payment_type:
        query += """
            AND CASE 
                WHEN p.invoice_id IS NOT NULL THEN 'AR'
                WHEN p.purchase_order_id IS NOT NULL THEN 'AP'
                ELSE 'OTHER'
            END = :payment_type
        """
        params["payment_type"] = payment_type
    
    query += " ORDER BY p.payment_date DESC, p.payment_number DESC"
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

# ============================================================================
# ============================================================================

class CreditControlCustomer(BaseModel):
    customer_id: str
    customer_name: str
    credit_limit: Decimal
    current_balance: Decimal
    available_credit: Decimal
    credit_utilization_percent: Decimal
    overdue_amount: Decimal
    days_overdue: int
    risk_rating: str

class CreditControlReport(BaseModel):
    company_id: str
    report_date: date
    customers: List[CreditControlCustomer]
    total_credit_limit: Decimal
    total_outstanding: Decimal
    total_overdue: Decimal

@router.get("/credit-control", response_model=CreditControlReport)
def get_credit_control(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    as_of_date: date = Query(..., description="Report as of date"),
    db: Session = Depends(get_db)
):
    """Credit Control report with drill-down to customer accounts"""
    query = """
        WITH customer_balances AS (
            SELECT 
                c.id as customer_id,
                c.name as customer_name,
                COALESCE(c.credit_limit, 0) as credit_limit,
                COALESCE(SUM(i.total_amount - COALESCE(p.paid_amount, 0)), 0) as current_balance,
                COALESCE(SUM(CASE WHEN i.due_date < :as_of_date THEN i.total_amount - COALESCE(p.paid_amount, 0) ELSE 0 END), 0) as overdue_amount,
                MAX(CASE WHEN i.due_date < :as_of_date THEN :as_of_date - i.due_date ELSE 0 END) as days_overdue
            FROM customers c
            LEFT JOIN invoices i ON c.id = i.customer_id AND i.company_id = :company_id 
                AND i.status IN ('POSTED', 'PARTIALLY_PAID')
                AND i.invoice_date <= :as_of_date
            LEFT JOIN (
                SELECT invoice_id, SUM(amount) as paid_amount
                FROM payments
                WHERE company_id = :company_id AND status = 'COMPLETED'
                GROUP BY invoice_id
            ) p ON i.id = p.invoice_id
            WHERE c.company_id = :company_id
                AND c.is_active = TRUE
            GROUP BY c.id, c.name, c.credit_limit
        )
        SELECT 
            customer_id,
            customer_name,
            credit_limit,
            current_balance,
            credit_limit - current_balance as available_credit,
            CASE 
                WHEN credit_limit > 0 THEN (current_balance / credit_limit * 100)
                ELSE 0
            END as credit_utilization_percent,
            overdue_amount,
            days_overdue,
            CASE 
                WHEN overdue_amount = 0 THEN 'LOW'
                WHEN days_overdue < 30 THEN 'MEDIUM'
                WHEN days_overdue < 60 THEN 'HIGH'
                ELSE 'CRITICAL'
            END as risk_rating
        FROM customer_balances
        WHERE current_balance > 0 OR credit_limit > 0
        ORDER BY 
            CASE 
                WHEN overdue_amount = 0 THEN 1
                WHEN days_overdue < 30 THEN 2
                WHEN days_overdue < 60 THEN 3
                ELSE 4
            END DESC,
            overdue_amount DESC
    """
    
    result = db.execute(text(query), {"company_id": company_id, "as_of_date": as_of_date})
    customers = [CreditControlCustomer(**dict(row._mapping)) for row in result]
    
    return CreditControlReport(
        company_id=company_id,
        report_date=as_of_date,
        customers=customers,
        total_credit_limit=sum(c.credit_limit for c in customers),
        total_outstanding=sum(c.current_balance for c in customers),
        total_overdue=sum(c.overdue_amount for c in customers)
    )

@router.get("/credit-control/drill-down/{customer_id}")
def get_credit_control_drilldown(
    customer_id: str,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    as_of_date: date = Query(..., description="Report as of date"),
    db: Session = Depends(get_db)
):
    """Drill down to customer account details"""
    query = """
        SELECT 
            i.id as invoice_id,
            i.invoice_number,
            i.invoice_date,
            i.due_date,
            i.total_amount,
            COALESCE(SUM(p.amount), 0) as paid_amount,
            i.total_amount - COALESCE(SUM(p.amount), 0) as outstanding_amount,
            CASE 
                WHEN i.due_date < :as_of_date THEN :as_of_date - i.due_date
                ELSE 0
            END as days_overdue,
            i.status,
            i.payment_terms
        FROM invoices i
        LEFT JOIN payments p ON i.id = p.invoice_id AND p.company_id = :company_id AND p.status = 'COMPLETED'
        WHERE i.company_id = :company_id
            AND i.customer_id = :customer_id
            AND i.status IN ('POSTED', 'PARTIALLY_PAID')
            AND i.invoice_date <= :as_of_date
        GROUP BY i.id, i.invoice_number, i.invoice_date, i.due_date, i.total_amount, i.status, i.payment_terms
        HAVING i.total_amount - COALESCE(SUM(p.amount), 0) > 0
        ORDER BY i.due_date
    """
    
    result = db.execute(text(query), {
        "company_id": company_id,
        "customer_id": customer_id,
        "as_of_date": as_of_date
    })
    
    return [dict(row._mapping) for row in result]
