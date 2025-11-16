"""
Financial Reports API
Provides 5 comprehensive financial reports with drill-down to L5:
1. Trial Balance Report (with drill-down to transactions)
2. Balance Sheet Report (with drill-down to GL accounts)
3. Income Statement Report (with drill-down to GL accounts)
4. GL Ledger Analysis Report (with drill-down to journal entries)
5. Financial Ratios Report (with drill-down to source data)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, date
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

router = APIRouter(prefix="/api/reports/financial", tags=["Financial Reports"])

# ============================================================================
# ============================================================================

class TrialBalanceLineItem(BaseModel):
    account_code: str
    account_name: str
    account_type: str
    debit_balance: Decimal
    credit_balance: Decimal
    net_balance: Decimal

class TrialBalanceReport(BaseModel):
    company_id: str
    report_date: date
    total_debits: Decimal
    total_credits: Decimal
    line_items: List[TrialBalanceLineItem]
    is_balanced: bool

@router.get("/trial-balance", response_model=TrialBalanceReport)
def get_trial_balance(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    as_of_date: date = Query(..., description="Report as of date"),
    db: Session = Depends(get_db)
):
    """Generate Trial Balance report with drill-down capability"""
    query = """
        WITH account_balances AS (
            SELECT 
                coa.code,
                coa.name,
                coa.account_type,
                COALESCE(SUM(jel.debit_amount), 0) as total_debits,
                COALESCE(SUM(jel.credit_amount), 0) as total_credits
            FROM chart_of_accounts coa
            LEFT JOIN journal_entry_lines jel ON coa.code = jel.account_code
            LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
                AND je.company_id = :company_id
                AND je.posting_date <= :as_of_date
                AND je.status = 'POSTED'
            WHERE coa.company_id = :company_id
                AND coa.is_active = TRUE
            GROUP BY coa.code, coa.name, coa.account_type
        )
        SELECT 
            code as account_code,
            name as account_name,
            account_type,
            total_debits as debit_balance,
            total_credits as credit_balance,
            (total_debits - total_credits) as net_balance
        FROM account_balances
        WHERE total_debits != 0 OR total_credits != 0
        ORDER BY account_code
    """
    
    result = db.execute(text(query), {"company_id": company_id, "as_of_date": as_of_date})
    line_items = [TrialBalanceLineItem(**dict(row._mapping)) for row in result]
    
    total_debits = sum(item.debit_balance for item in line_items)
    total_credits = sum(item.credit_balance for item in line_items)
    
    return TrialBalanceReport(
        company_id=company_id,
        report_date=as_of_date,
        total_debits=total_debits,
        total_credits=total_credits,
        line_items=line_items,
        is_balanced=(abs(total_debits - total_credits) < 0.01)
    )

@router.get("/trial-balance/drill-down/{account_code}")
def get_trial_balance_drilldown(
    account_code: str,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    as_of_date: date = Query(..., description="Report as of date"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Drill down to journal entry lines for a specific account"""
    query = """
        SELECT 
            je.id as journal_entry_id,
            je.reference as journal_number,
            je.posting_date,
            je.description as journal_description,
            jel.description as line_description,
            CASE WHEN jel.debit_amount > 0 THEN 'DEBIT' ELSE 'CREDIT' END as debit_credit,
            CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE jel.credit_amount END as amount,
            je.source_document_type,
            je.source_document_id
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE je.company_id = :company_id
            AND jel.account_code = :account_code
            AND je.posting_date <= :as_of_date
            AND je.status = 'POSTED'
        ORDER BY je.posting_date DESC, je.reference as journal_number DESC
        OFFSET :skip LIMIT :limit
    """
    
    result = db.execute(text(query), {
        "company_id": company_id,
        "account_code": account_code,
        "as_of_date": as_of_date,
        "skip": skip,
        "limit": limit
    })
    
    return [dict(row._mapping) for row in result]

# ============================================================================
# ============================================================================

class BalanceSheetSection(BaseModel):
    section_name: str
    accounts: List[Dict[str, Any]]
    section_total: Decimal

class BalanceSheetReport(BaseModel):
    company_id: str
    report_date: date
    assets: BalanceSheetSection
    liabilities: BalanceSheetSection
    equity: BalanceSheetSection
    total_assets: Decimal
    total_liabilities_equity: Decimal
    is_balanced: bool

@router.get("/balance-sheet", response_model=BalanceSheetReport)
def get_balance_sheet(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    as_of_date: date = Query(..., description="Report as of date"),
    db: Session = Depends(get_db)
):
    """Generate Balance Sheet report with drill-down capability"""
    query = """
        WITH account_balances AS (
            SELECT 
                coa.code,
                coa.name,
                coa.account_type,
                coa.account_category,
                COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as balance
            FROM chart_of_accounts coa
            LEFT JOIN journal_entry_lines jel ON coa.code = jel.account_code
            LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
                AND je.company_id = :company_id
                AND je.posting_date <= :as_of_date
                AND je.status = 'POSTED'
            WHERE coa.company_id = :company_id
                AND coa.is_active = TRUE
                AND coa.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
            GROUP BY coa.code, coa.name, coa.account_type, coa.account_category
        )
        SELECT 
            code as account_code,
            name as account_name,
            account_type,
            account_category,
            balance
        FROM account_balances
        WHERE balance != 0
        ORDER BY account_type, account_code
    """
    
    result = db.execute(text(query), {"company_id": company_id, "as_of_date": as_of_date})
    all_accounts = [dict(row._mapping) for row in result]
    
    assets = [acc for acc in all_accounts if acc['account_type'] == 'ASSET']
    liabilities = [acc for acc in all_accounts if acc['account_type'] == 'LIABILITY']
    equity = [acc for acc in all_accounts if acc['account_type'] == 'EQUITY']
    
    total_assets = sum(Decimal(str(acc['balance'])) for acc in assets)
    total_liabilities = sum(Decimal(str(acc['balance'])) for acc in liabilities)
    total_equity = sum(Decimal(str(acc['balance'])) for acc in equity)
    total_liabilities_equity = total_liabilities + total_equity
    
    return BalanceSheetReport(
        company_id=company_id,
        report_date=as_of_date,
        assets=BalanceSheetSection(
            section_name="Assets",
            accounts=assets,
            section_total=total_assets
        ),
        liabilities=BalanceSheetSection(
            section_name="Liabilities",
            accounts=liabilities,
            section_total=total_liabilities
        ),
        equity=BalanceSheetSection(
            section_name="Equity",
            accounts=equity,
            section_total=total_equity
        ),
        total_assets=total_assets,
        total_liabilities_equity=total_liabilities_equity,
        is_balanced=(abs(total_assets - total_liabilities_equity) < 0.01)
    )

# ============================================================================
# ============================================================================

class IncomeStatementSection(BaseModel):
    section_name: str
    accounts: List[Dict[str, Any]]
    section_total: Decimal

class IncomeStatementReport(BaseModel):
    company_id: str
    period_start: date
    period_end: date
    revenue: IncomeStatementSection
    cost_of_sales: IncomeStatementSection
    gross_profit: Decimal
    operating_expenses: IncomeStatementSection
    operating_income: Decimal
    other_income: IncomeStatementSection
    other_expenses: IncomeStatementSection
    net_income: Decimal

@router.get("/income-statement", response_model=IncomeStatementReport)
def get_income_statement(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    db: Session = Depends(get_db)
):
    """Generate Income Statement report with drill-down capability"""
    query = """
        WITH account_balances AS (
            SELECT 
                coa.code,
                coa.name,
                coa.account_type,
                coa.account_category,
                COALESCE(SUM(jel.credit_amount), 0) - COALESCE(SUM(jel.debit_amount), 0) as balance
            FROM chart_of_accounts coa
            LEFT JOIN journal_entry_lines jel ON coa.code = jel.account_code
            LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
                AND je.company_id = :company_id
                AND je.posting_date BETWEEN :period_start AND :period_end
                AND je.status = 'POSTED'
            WHERE coa.company_id = :company_id
                AND coa.is_active = TRUE
                AND coa.account_type IN ('REVENUE', 'EXPENSE', 'COST_OF_SALES')
            GROUP BY coa.code, coa.name, coa.account_type, coa.account_category
        )
        SELECT 
            code as account_code,
            name as account_name,
            account_type,
            account_category,
            balance
        FROM account_balances
        WHERE balance != 0
        ORDER BY account_type, account_code
    """
    
    result = db.execute(text(query), {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end
    })
    all_accounts = [dict(row._mapping) for row in result]
    
    revenue = [acc for acc in all_accounts if acc['account_type'] == 'REVENUE']
    cost_of_sales = [acc for acc in all_accounts if acc['account_type'] == 'COST_OF_SALES']
    expenses = [acc for acc in all_accounts if acc['account_type'] == 'EXPENSE']
    
    operating_expenses = [acc for acc in expenses if acc.get('account_category') == 'OPERATING']
    other_income = [acc for acc in revenue if acc.get('account_category') == 'OTHER']
    other_expenses = [acc for acc in expenses if acc.get('account_category') == 'OTHER']
    
    total_revenue = sum(Decimal(str(acc['balance'])) for acc in revenue)
    total_cost_of_sales = sum(Decimal(str(acc['balance'])) for acc in cost_of_sales)
    gross_profit = total_revenue - total_cost_of_sales
    
    total_operating_expenses = sum(Decimal(str(acc['balance'])) for acc in operating_expenses)
    operating_income = gross_profit - total_operating_expenses
    
    total_other_income = sum(Decimal(str(acc['balance'])) for acc in other_income)
    total_other_expenses = sum(Decimal(str(acc['balance'])) for acc in other_expenses)
    net_income = operating_income + total_other_income - total_other_expenses
    
    return IncomeStatementReport(
        company_id=company_id,
        period_start=period_start,
        period_end=period_end,
        revenue=IncomeStatementSection(
            section_name="Revenue",
            accounts=revenue,
            section_total=total_revenue
        ),
        cost_of_sales=IncomeStatementSection(
            section_name="Cost of Sales",
            accounts=cost_of_sales,
            section_total=total_cost_of_sales
        ),
        gross_profit=gross_profit,
        operating_expenses=IncomeStatementSection(
            section_name="Operating Expenses",
            accounts=operating_expenses,
            section_total=total_operating_expenses
        ),
        operating_income=operating_income,
        other_income=IncomeStatementSection(
            section_name="Other Income",
            accounts=other_income,
            section_total=total_other_income
        ),
        other_expenses=IncomeStatementSection(
            section_name="Other Expenses",
            accounts=other_expenses,
            section_total=total_other_expenses
        ),
        net_income=net_income
    )

# ============================================================================
# ============================================================================

@router.get("/gl-ledger-analysis")
def get_gl_ledger_analysis(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    account_code: Optional[str] = None,
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """GL Ledger Analysis with drill-down to journal entries"""
    query = """
        SELECT 
            je.posting_date,
            je.reference as journal_number,
            je.description as journal_description,
            jel.account_code,
            coa.name,
            jel.description as line_description,
            CASE WHEN jel.debit_amount > 0 THEN 'DEBIT' ELSE 'CREDIT' END as debit_credit,
            CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE jel.credit_amount END as amount,
            je.source_document_type,
            je.source_document_id,
            je.created_by,
            SUM(jel.debit_amount - jel.credit_amount) 
                OVER (PARTITION BY jel.account_code ORDER BY je.posting_date, je.reference) as running_balance
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        JOIN chart_of_accounts coa ON jel.account_code = coa.code AND coa.company_id = :company_id
        WHERE je.company_id = :company_id
            AND je.posting_date BETWEEN :period_start AND :period_end
            AND je.status = 'POSTED'
    """
    
    params = {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end,
        "skip": skip,
        "limit": limit
    }
    
    if account_code:
        query += " AND jel.account_code = :account_code"
        params["account_code"] = account_code
    
    query += " ORDER BY je.posting_date DESC, je.reference DESC OFFSET :skip LIMIT :limit"
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

# ============================================================================
# ============================================================================

class FinancialRatiosReport(BaseModel):
    company_id: str
    report_date: date
    liquidity_ratios: Dict[str, Decimal]
    profitability_ratios: Dict[str, Decimal]
    leverage_ratios: Dict[str, Decimal]
    efficiency_ratios: Dict[str, Decimal]

@router.get("/financial-ratios", response_model=FinancialRatiosReport)
def get_financial_ratios(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    as_of_date: date = Query(..., description="Report as of date"),
    db: Session = Depends(get_db)
):
    """Calculate financial ratios with drill-down to source data"""
    
    balance_sheet_query = """
        WITH account_balances AS (
            SELECT 
                coa.account_type,
                coa.account_category,
                COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as balance
            FROM chart_of_accounts coa
            LEFT JOIN journal_entry_lines jel ON coa.code = jel.account_code
            LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
                AND je.company_id = :company_id
                AND je.posting_date <= :as_of_date
                AND je.status = 'POSTED'
            WHERE coa.company_id = :company_id
                AND coa.is_active = TRUE
            GROUP BY coa.account_type, coa.account_category
        )
        SELECT account_type, account_category, SUM(balance) as total_balance
        FROM account_balances
        GROUP BY account_type, account_category
    """
    
    result = db.execute(text(balance_sheet_query), {"company_id": company_id, "as_of_date": as_of_date})
    balances = {(row.account_type, row.account_category or 'DEFAULT'): Decimal(str(row.total_balance)) for row in result}
    
    current_assets = balances.get(('ASSET', 'CURRENT'), Decimal('0'))
    total_assets = sum(v for k, v in balances.items() if k[0] == 'ASSET')
    current_liabilities = balances.get(('LIABILITY', 'CURRENT'), Decimal('0'))
    total_liabilities = sum(v for k, v in balances.items() if k[0] == 'LIABILITY')
    total_equity = sum(v for k, v in balances.items() if k[0] == 'EQUITY')
    
    income_query = """
        SELECT 
            COALESCE(SUM(CASE WHEN coa.account_type = 'REVENUE' THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0) as revenue,
            COALESCE(SUM(CASE WHEN coa.account_type = 'EXPENSE' THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) as expenses,
            COALESCE(SUM(CASE WHEN coa.account_type = 'COST_OF_SALES' THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) as cogs
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        JOIN chart_of_accounts coa ON jel.account_code = coa.code AND coa.company_id = :company_id
        WHERE je.company_id = :company_id
            AND je.posting_date BETWEEN DATE_TRUNC('year', CAST(:as_of_date AS date)) AND :as_of_date
            AND je.status = 'POSTED'
            AND coa.account_type IN ('REVENUE', 'EXPENSE', 'COST_OF_SALES')
    """
    
    income_result = db.execute(text(income_query), {"company_id": company_id, "as_of_date": as_of_date}).fetchone()
    revenue = Decimal(str(income_result.revenue)) if income_result else Decimal('0')
    expenses = Decimal(str(income_result.expenses)) if income_result else Decimal('0')
    cogs = Decimal(str(income_result.cogs)) if income_result else Decimal('0')
    net_income = revenue - expenses - cogs
    
    liquidity_ratios = {
        "current_ratio": (current_assets / current_liabilities) if current_liabilities != 0 else Decimal('0'),
        "quick_ratio": ((current_assets - balances.get(('ASSET', 'INVENTORY'), Decimal('0'))) / current_liabilities) if current_liabilities != 0 else Decimal('0'),
        "cash_ratio": (balances.get(('ASSET', 'CASH'), Decimal('0')) / current_liabilities) if current_liabilities != 0 else Decimal('0')
    }
    
    profitability_ratios = {
        "gross_profit_margin": ((revenue - cogs) / revenue * 100) if revenue != 0 else Decimal('0'),
        "net_profit_margin": (net_income / revenue * 100) if revenue != 0 else Decimal('0'),
        "return_on_assets": (net_income / total_assets * 100) if total_assets != 0 else Decimal('0'),
        "return_on_equity": (net_income / total_equity * 100) if total_equity != 0 else Decimal('0')
    }
    
    leverage_ratios = {
        "debt_to_equity": (total_liabilities / total_equity) if total_equity != 0 else Decimal('0'),
        "debt_to_assets": (total_liabilities / total_assets) if total_assets != 0 else Decimal('0'),
        "equity_multiplier": (total_assets / total_equity) if total_equity != 0 else Decimal('0')
    }
    
    efficiency_ratios = {
        "asset_turnover": (revenue / total_assets) if total_assets != 0 else Decimal('0'),
        "inventory_turnover": (cogs / balances.get(('ASSET', 'INVENTORY'), Decimal('1'))) if balances.get(('ASSET', 'INVENTORY'), Decimal('0')) != 0 else Decimal('0')
    }
    
    return FinancialRatiosReport(
        company_id=company_id,
        report_date=as_of_date,
        liquidity_ratios=liquidity_ratios,
        profitability_ratios=profitability_ratios,
        leverage_ratios=leverage_ratios,
        efficiency_ratios=efficiency_ratios
    )
