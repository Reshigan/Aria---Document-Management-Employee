"""
Financial (GAAP) ERP Module - API Routes
Chart of accounts, general ledger, financial reports
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_db
import json

router = APIRouter(prefix="/api/erp/financial", tags=["Financial-ERP"])


# ============================================================================
# CHART OF ACCOUNTS
# ============================================================================

@router.post("/chart-of-accounts")
async def create_account(account_data: dict):
    """Create new GL account"""
    return {
        "id": 1,
        "account_code": account_data.get("account_code"),
        "account_name": account_data.get("account_name"),
        "account_type": account_data.get("account_type"),
        "status": "created"
    }


@router.get("/chart-of-accounts")
async def get_chart_of_accounts(account_type: Optional[str] = None):
    """Get chart of accounts with optional filtering"""
    # Sample IFRS-compliant chart of accounts
    accounts = [
        # ASSETS
        {"id": 1, "code": "1000", "name": "Current Assets", "type": "asset", "category": "current_asset", "balance": 0},
        {"id": 2, "code": "1100", "name": "Cash and Cash Equivalents", "type": "asset", "category": "current_asset", "balance": 250000, "parent_id": 1},
        {"id": 3, "code": "1110", "name": "Bank - Standard Bank", "type": "asset", "category": "current_asset", "balance": 180000, "parent_id": 2, "is_bank": True},
        {"id": 4, "code": "1120", "name": "Petty Cash", "type": "asset", "category": "current_asset", "balance": 5000, "parent_id": 2},
        {"id": 5, "code": "1200", "name": "Trade Receivables", "type": "asset", "category": "current_asset", "balance": 450000, "parent_id": 1},
        {"id": 6, "code": "1210", "name": "Accounts Receivable", "type": "asset", "category": "current_asset", "balance": 450000, "parent_id": 5},
        {"id": 7, "code": "1300", "name": "Inventory", "type": "asset", "category": "current_asset", "balance": 380000, "parent_id": 1},
        {"id": 8, "code": "1310", "name": "Raw Materials", "type": "asset", "category": "current_asset", "balance": 150000, "parent_id": 7},
        {"id": 9, "code": "1320", "name": "Work in Progress", "type": "asset", "category": "current_asset", "balance": 80000, "parent_id": 7},
        {"id": 10, "code": "1330", "name": "Finished Goods", "type": "asset", "category": "current_asset", "balance": 150000, "parent_id": 7},
        
        # Fixed Assets
        {"id": 11, "code": "1500", "name": "Fixed Assets", "type": "asset", "category": "fixed_asset", "balance": 0},
        {"id": 12, "code": "1510", "name": "Property, Plant & Equipment", "type": "asset", "category": "fixed_asset", "balance": 2500000, "parent_id": 11},
        {"id": 13, "code": "1520", "name": "Accumulated Depreciation", "type": "asset", "category": "fixed_asset", "balance": -500000, "parent_id": 11},
        
        # LIABILITIES
        {"id": 20, "code": "2000", "name": "Current Liabilities", "type": "liability", "category": "current_liability", "balance": 0},
        {"id": 21, "code": "2100", "name": "Trade Payables", "type": "liability", "category": "current_liability", "balance": 320000, "parent_id": 20},
        {"id": 22, "code": "2110", "name": "Accounts Payable", "type": "liability", "category": "current_liability", "balance": 320000, "parent_id": 21},
        {"id": 23, "code": "2200", "name": "VAT Payable", "type": "liability", "category": "current_liability", "balance": 45000, "parent_id": 20},
        {"id": 24, "code": "2300", "name": "PAYE Payable", "type": "liability", "category": "current_liability", "balance": 28000, "parent_id": 20},
        {"id": 25, "code": "2400", "name": "UIF Payable", "type": "liability", "category": "current_liability", "balance": 3500, "parent_id": 20},
        
        # Long-term Liabilities
        {"id": 26, "code": "2500", "name": "Long-term Liabilities", "type": "liability", "category": "long_term_liability", "balance": 0},
        {"id": 27, "code": "2510", "name": "Long-term Loans", "type": "liability", "category": "long_term_liability", "balance": 500000, "parent_id": 26},
        
        # EQUITY
        {"id": 30, "code": "3000", "name": "Equity", "type": "equity", "category": "equity", "balance": 0},
        {"id": 31, "code": "3100", "name": "Share Capital", "type": "equity", "category": "equity", "balance": 1000000, "parent_id": 30},
        {"id": 32, "code": "3200", "name": "Retained Earnings", "type": "equity", "category": "equity", "balance": 1283500, "parent_id": 30},
        {"id": 33, "code": "3300", "name": "Current Year Earnings", "type": "equity", "category": "equity", "balance": 450000, "parent_id": 30},
        
        # REVENUE
        {"id": 40, "code": "4000", "name": "Revenue", "type": "revenue", "category": "operating_revenue", "balance": 0},
        {"id": 41, "code": "4100", "name": "Sales Revenue", "type": "revenue", "category": "operating_revenue", "balance": 2500000, "parent_id": 40},
        {"id": 42, "code": "4110", "name": "Product Sales", "type": "revenue", "category": "operating_revenue", "balance": 2200000, "parent_id": 41},
        {"id": 43, "code": "4120", "name": "Service Revenue", "type": "revenue", "category": "operating_revenue", "balance": 300000, "parent_id": 41},
        {"id": 44, "code": "4200", "name": "Other Revenue", "type": "revenue", "category": "other_revenue", "balance": 25000, "parent_id": 40},
        
        # COST OF SALES
        {"id": 50, "code": "5000", "name": "Cost of Sales", "type": "expense", "category": "cost_of_sales", "balance": 0},
        {"id": 51, "code": "5100", "name": "Material Costs", "type": "expense", "category": "cost_of_sales", "balance": 800000, "parent_id": 50},
        {"id": 52, "code": "5200", "name": "Direct Labor", "type": "expense", "category": "cost_of_sales", "balance": 400000, "parent_id": 50},
        {"id": 53, "code": "5300", "name": "Manufacturing Overhead", "type": "expense", "category": "cost_of_sales", "balance": 250000, "parent_id": 50},
        
        # OPERATING EXPENSES
        {"id": 60, "code": "6000", "name": "Operating Expenses", "type": "expense", "category": "operating_expense", "balance": 0},
        {"id": 61, "code": "6100", "name": "Salaries and Wages", "type": "expense", "category": "operating_expense", "balance": 320000, "parent_id": 60},
        {"id": 62, "code": "6200", "name": "Rent Expense", "type": "expense", "category": "operating_expense", "balance": 120000, "parent_id": 60},
        {"id": 63, "code": "6300", "name": "Utilities", "type": "expense", "category": "operating_expense", "balance": 45000, "parent_id": 60},
        {"id": 64, "code": "6400", "name": "Depreciation Expense", "type": "expense", "category": "operating_expense", "balance": 85000, "parent_id": 60},
        {"id": 65, "code": "6500", "name": "Marketing & Advertising", "type": "expense", "category": "operating_expense", "balance": 75000, "parent_id": 60},
    ]
    
    if account_type:
        accounts = [a for a in accounts if a["type"] == account_type]
    
    return {
        "accounts": accounts,
        "total": len(accounts)
    }


@router.get("/chart-of-accounts/{account_id}")
async def get_account(account_id: int):
    """Get single account details"""
    return {
        "id": account_id,
        "account_code": "1110",
        "account_name": "Bank - Standard Bank",
        "account_type": "asset",
        "current_balance": 180000,
        "ytd_debit": 2500000,
        "ytd_credit": 2320000
    }


# ============================================================================
# JOURNAL ENTRIES
# ============================================================================

@router.post("/journal-entries")
async def create_journal_entry(entry_data: dict):
    """Create journal entry"""
    lines = entry_data.get("lines", [])
    total_debit = sum(line.get("debit", 0) for line in lines)
    total_credit = sum(line.get("credit", 0) for line in lines)
    
    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(status_code=400, detail=f"Entry not balanced: Dr {total_debit} != Cr {total_credit}")
    
    return {
        "id": 1,
        "journal_number": f"JE-{datetime.now().strftime('%Y%m%d')}-001",
        "status": "posted",
        "total_debit": total_debit,
        "total_credit": total_credit
    }


@router.get("/journal-entries")
async def get_journal_entries(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    journal_type: Optional[str] = None,
    status: Optional[str] = None
):
    """Get journal entries with filtering"""
    entries = [
        {
            "id": 1,
            "journal_number": "JE-20251001-001",
            "journal_type": "sales",
            "date": "2025-10-01",
            "description": "Sales invoice #INV-001",
            "total_debit": 5750.00,
            "total_credit": 5750.00,
            "status": "posted"
        },
        {
            "id": 2,
            "journal_number": "JE-20251002-002",
            "journal_type": "purchase",
            "date": "2025-10-02",
            "description": "Supplier invoice #SINV-456",
            "total_debit": 11500.00,
            "total_credit": 11500.00,
            "status": "posted"
        }
    ]
    
    return {"entries": entries, "total": len(entries)}


# ============================================================================
# GENERAL LEDGER
# ============================================================================

@router.get("/general-ledger")
async def get_general_ledger(
    account_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get general ledger report"""
    transactions = [
        {
            "date": "2025-10-01",
            "journal_number": "JE-20251001-001",
            "description": "Sales invoice #INV-001",
            "debit": 5750.00,
            "credit": 0.00,
            "balance": 185750.00
        },
        {
            "date": "2025-10-03",
            "journal_number": "JE-20251003-003",
            "description": "Payment to supplier",
            "debit": 0.00,
            "credit": 5000.00,
            "balance": 180750.00
        }
    ]
    
    return {
        "account": {"code": "1110", "name": "Bank - Standard Bank"},
        "opening_balance": 180000.00,
        "transactions": transactions,
        "closing_balance": 180750.00,
        "total_debits": 5750.00,
        "total_credits": 5000.00
    }


# ============================================================================
# FINANCIAL REPORTS
# ============================================================================

@router.get("/reports/trial-balance")
async def get_trial_balance(date: Optional[str] = None):
    """Trial balance report"""
    accounts = [
        {"code": "1110", "name": "Bank - Standard Bank", "debit": 180000, "credit": 0},
        {"code": "1210", "name": "Accounts Receivable", "debit": 450000, "credit": 0},
        {"code": "1310", "name": "Raw Materials", "debit": 150000, "credit": 0},
        {"code": "1510", "name": "Property, Plant & Equipment", "debit": 2500000, "credit": 0},
        {"code": "1520", "name": "Accumulated Depreciation", "debit": 0, "credit": 500000},
        {"code": "2110", "name": "Accounts Payable", "debit": 0, "credit": 320000},
        {"code": "2200", "name": "VAT Payable", "debit": 0, "credit": 45000},
        {"code": "3100", "name": "Share Capital", "debit": 0, "credit": 1000000},
        {"code": "3200", "name": "Retained Earnings", "debit": 0, "credit": 1283500},
        {"code": "4110", "name": "Product Sales", "debit": 0, "credit": 2200000},
        {"code": "5100", "name": "Material Costs", "debit": 800000, "credit": 0},
        {"code": "6100", "name": "Salaries and Wages", "debit": 320000, "credit": 0},
    ]
    
    total_debit = sum(a["debit"] for a in accounts)
    total_credit = sum(a["credit"] for a in accounts)
    
    return {
        "report_date": date or datetime.now().isoformat(),
        "accounts": accounts,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "balanced": abs(total_debit - total_credit) < 0.01
    }


@router.get("/reports/balance-sheet")
async def get_balance_sheet(date: Optional[str] = None):
    """Balance sheet (Statement of Financial Position)"""
    return {
        "report_date": date or "2025-10-28",
        "company": "Aria Demo Company (Pty) Ltd",
        "currency": "ZAR",
        "assets": {
            "current_assets": {
                "cash_and_equivalents": 185000,
                "trade_receivables": 450000,
                "inventory": 380000,
                "other_current_assets": 25000,
                "total": 1040000
            },
            "non_current_assets": {
                "property_plant_equipment": 2500000,
                "accumulated_depreciation": -500000,
                "net_ppe": 2000000,
                "total": 2000000
            },
            "total_assets": 3040000
        },
        "liabilities": {
            "current_liabilities": {
                "trade_payables": 320000,
                "vat_payable": 45000,
                "paye_payable": 28000,
                "uif_payable": 3500,
                "other_payables": 10000,
                "total": 406500
            },
            "non_current_liabilities": {
                "long_term_loans": 500000,
                "total": 500000
            },
            "total_liabilities": 906500
        },
        "equity": {
            "share_capital": 1000000,
            "retained_earnings": 1283500,
            "current_year_profit": 450000,
            "total_equity": 2133500
        },
        "total_liabilities_and_equity": 3040000,
        "balanced": True
    }


@router.get("/reports/income-statement")
async def get_income_statement(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Income statement (P&L)"""
    return {
        "period": f"{start_date or '2025-01-01'} to {end_date or '2025-10-28'}",
        "company": "Aria Demo Company (Pty) Ltd",
        "currency": "ZAR",
        "revenue": {
            "product_sales": 2200000,
            "service_revenue": 300000,
            "other_revenue": 25000,
            "total_revenue": 2525000
        },
        "cost_of_sales": {
            "material_costs": 800000,
            "direct_labor": 400000,
            "manufacturing_overhead": 250000,
            "total_cogs": 1450000
        },
        "gross_profit": 1075000,
        "gross_profit_margin": 42.6,
        "operating_expenses": {
            "salaries_and_wages": 320000,
            "rent": 120000,
            "utilities": 45000,
            "depreciation": 85000,
            "marketing": 75000,
            "other_expenses": 30000,
            "total_opex": 675000
        },
        "operating_profit": 400000,
        "operating_margin": 15.8,
        "other_income": 50000,
        "finance_costs": 0,
        "profit_before_tax": 450000,
        "tax_expense": 121500,
        "profit_after_tax": 328500,
        "net_profit_margin": 13.0
    }


@router.get("/reports/cash-flow")
async def get_cash_flow_statement(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Cash flow statement"""
    return {
        "period": f"{start_date or '2025-01-01'} to {end_date or '2025-10-28'}",
        "company": "Aria Demo Company (Pty) Ltd",
        "currency": "ZAR",
        "operating_activities": {
            "profit_before_tax": 450000,
            "adjustments": {
                "depreciation": 85000,
                "interest_expense": 0
            },
            "working_capital_changes": {
                "increase_in_receivables": -50000,
                "increase_in_inventory": -30000,
                "increase_in_payables": 45000
            },
            "cash_from_operations": 500000,
            "tax_paid": -121500,
            "net_cash_from_operating": 378500
        },
        "investing_activities": {
            "purchase_of_ppe": -150000,
            "net_cash_from_investing": -150000
        },
        "financing_activities": {
            "loan_proceeds": 200000,
            "dividends_paid": -100000,
            "net_cash_from_financing": 100000
        },
        "net_increase_in_cash": 328500,
        "cash_beginning": 180000,
        "cash_ending": 508500
    }


# ============================================================================
# FISCAL PERIODS
# ============================================================================

@router.get("/fiscal-periods")
async def get_fiscal_periods(fiscal_year: Optional[int] = None):
    """Get fiscal periods"""
    year = fiscal_year or 2025
    periods = [
        {"id": i, "name": f"{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i-1]} {year}", 
         "period_number": i, "fiscal_year": year, "is_closed": i < 10}
        for i in range(1, 13)
    ]
    return {"periods": periods, "total": len(periods)}


@router.post("/fiscal-periods/{period_id}/close")
async def close_fiscal_period(period_id: int):
    """Close fiscal period"""
    return {"id": period_id, "status": "closed", "closed_date": datetime.now().isoformat()}


# ============================================================================
# DASHBOARDS & KPIs
# ============================================================================

@router.get("/dashboard")
async def get_financial_dashboard():
    """Financial dashboard with KPIs"""
    return {
        "kpis": {
            "revenue_ytd": 2525000,
            "revenue_growth": 15.2,
            "gross_profit_margin": 42.6,
            "operating_profit_margin": 15.8,
            "net_profit_margin": 13.0,
            "current_ratio": 2.56,
            "quick_ratio": 1.62,
            "debt_to_equity": 0.42,
            "return_on_equity": 15.4,
            "return_on_assets": 10.8
        },
        "cash_position": {
            "cash_and_equivalents": 185000,
            "accounts_receivable": 450000,
            "accounts_payable": 320000,
            "working_capital": 633500
        },
        "monthly_trends": [
            {"month": "Jan", "revenue": 220000, "expenses": 180000, "profit": 40000},
            {"month": "Feb", "revenue": 235000, "expenses": 185000, "profit": 50000},
            {"month": "Mar", "revenue": 245000, "expenses": 190000, "profit": 55000},
            {"month": "Apr", "revenue": 250000, "expenses": 195000, "profit": 55000},
            {"month": "May", "revenue": 255000, "expenses": 195000, "profit": 60000},
            {"month": "Jun", "revenue": 260000, "expenses": 200000, "profit": 60000},
            {"month": "Jul", "revenue": 265000, "expenses": 200000, "profit": 65000},
            {"month": "Aug", "revenue": 270000, "expenses": 205000, "profit": 65000},
            {"month": "Sep", "revenue": 275000, "expenses": 205000, "profit": 70000},
            {"month": "Oct", "revenue": 250000, "expenses": 195000, "profit": 55000},
        ]
    }
