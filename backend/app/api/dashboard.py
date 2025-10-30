"""
ARIA ERP - Dashboard API
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from decimal import Decimal

from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.financial import CustomerInvoice, SupplierInvoice, Payment

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get dashboard statistics"""
    
    # Calculate date ranges
    today = datetime.now().date()
    month_start = today.replace(day=1)
    last_month = (month_start - timedelta(days=1)).replace(day=1)
    
    # Customer Invoices Stats
    total_receivables = db.query(func.sum(CustomerInvoice.total_amount)).filter(
        CustomerInvoice.company_id == current_user.company_id,
        CustomerInvoice.status.in_(['draft', 'sent', 'overdue'])
    ).scalar() or Decimal('0')
    
    overdue_receivables = db.query(func.sum(CustomerInvoice.total_amount)).filter(
        CustomerInvoice.company_id == current_user.company_id,
        CustomerInvoice.status == 'overdue'
    ).scalar() or Decimal('0')
    
    # Supplier Invoices Stats
    total_payables = db.query(func.sum(SupplierInvoice.total_amount)).filter(
        SupplierInvoice.company_id == current_user.company_id,
        SupplierInvoice.status.in_(['draft', 'approved', 'overdue'])
    ).scalar() or Decimal('0')
    
    overdue_payables = db.query(func.sum(SupplierInvoice.total_amount)).filter(
        SupplierInvoice.company_id == current_user.company_id,
        SupplierInvoice.status == 'overdue'
    ).scalar() or Decimal('0')
    
    # Monthly Revenue
    monthly_revenue = db.query(func.sum(CustomerInvoice.total_amount)).filter(
        CustomerInvoice.company_id == current_user.company_id,
        CustomerInvoice.invoice_date >= month_start,
        CustomerInvoice.status == 'paid'
    ).scalar() or Decimal('0')
    
    last_month_revenue = db.query(func.sum(CustomerInvoice.total_amount)).filter(
        CustomerInvoice.company_id == current_user.company_id,
        CustomerInvoice.invoice_date >= last_month,
        CustomerInvoice.invoice_date < month_start,
        CustomerInvoice.status == 'paid'
    ).scalar() or Decimal('0')
    
    # Monthly Expenses
    monthly_expenses = db.query(func.sum(SupplierInvoice.total_amount)).filter(
        SupplierInvoice.company_id == current_user.company_id,
        SupplierInvoice.invoice_date >= month_start,
        SupplierInvoice.status == 'paid'
    ).scalar() or Decimal('0')
    
    last_month_expenses = db.query(func.sum(SupplierInvoice.total_amount)).filter(
        SupplierInvoice.company_id == current_user.company_id,
        SupplierInvoice.invoice_date >= last_month,
        SupplierInvoice.invoice_date < month_start,
        SupplierInvoice.status == 'paid'
    ).scalar() or Decimal('0')
    
    # Cash Flow
    cash_in = db.query(func.sum(Payment.amount)).filter(
        Payment.company_id == current_user.company_id,
        Payment.payment_type == 'received',
        Payment.payment_date >= month_start
    ).scalar() or Decimal('0')
    
    cash_out = db.query(func.sum(Payment.amount)).filter(
        Payment.company_id == current_user.company_id,
        Payment.payment_type == 'paid',
        Payment.payment_date >= month_start
    ).scalar() or Decimal('0')
    
    # Calculate growth rates
    revenue_growth = 0
    if last_month_revenue > 0:
        revenue_growth = float((monthly_revenue - last_month_revenue) / last_month_revenue * 100)
    
    expense_growth = 0
    if last_month_expenses > 0:
        expense_growth = float((monthly_expenses - last_month_expenses) / last_month_expenses * 100)
    
    return {
        "receivables": {
            "total": float(total_receivables),
            "overdue": float(overdue_receivables),
            "current": float(total_receivables - overdue_receivables)
        },
        "payables": {
            "total": float(total_payables),
            "overdue": float(overdue_payables),
            "current": float(total_payables - overdue_payables)
        },
        "revenue": {
            "current_month": float(monthly_revenue),
            "last_month": float(last_month_revenue),
            "growth_rate": round(revenue_growth, 2)
        },
        "expenses": {
            "current_month": float(monthly_expenses),
            "last_month": float(last_month_expenses),
            "growth_rate": round(expense_growth, 2)
        },
        "cash_flow": {
            "cash_in": float(cash_in),
            "cash_out": float(cash_out),
            "net_cash_flow": float(cash_in - cash_out)
        },
        "profit": {
            "current_month": float(monthly_revenue - monthly_expenses),
            "last_month": float(last_month_revenue - last_month_expenses)
        }
    }


@router.get("/recent-activity")
def get_recent_activity(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get recent activity (invoices and payments)"""
    
    # Recent customer invoices
    recent_customer_invoices = db.query(CustomerInvoice).filter(
        CustomerInvoice.company_id == current_user.company_id
    ).order_by(CustomerInvoice.created_at.desc()).limit(limit).all()
    
    # Recent supplier invoices
    recent_supplier_invoices = db.query(SupplierInvoice).filter(
        SupplierInvoice.company_id == current_user.company_id
    ).order_by(SupplierInvoice.created_at.desc()).limit(limit).all()
    
    # Recent payments
    recent_payments = db.query(Payment).filter(
        Payment.company_id == current_user.company_id
    ).order_by(Payment.created_at.desc()).limit(limit).all()
    
    return {
        "customer_invoices": [
            {
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "customer_name": inv.customer.name if inv.customer else "Unknown",
                "amount": float(inv.total_amount),
                "status": inv.status,
                "date": inv.invoice_date.isoformat()
            }
            for inv in recent_customer_invoices
        ],
        "supplier_invoices": [
            {
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "supplier_name": inv.supplier.name if inv.supplier else "Unknown",
                "amount": float(inv.total_amount),
                "status": inv.status,
                "date": inv.invoice_date.isoformat()
            }
            for inv in recent_supplier_invoices
        ],
        "payments": [
            {
                "id": str(pay.id),
                "reference": pay.reference_number,
                "type": pay.payment_type,
                "amount": float(pay.amount),
                "method": pay.payment_method,
                "date": pay.payment_date.isoformat()
            }
            for pay in recent_payments
        ]
    }
