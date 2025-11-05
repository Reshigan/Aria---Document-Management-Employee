"""
Financial Reports API
Provides endpoints for P&L, Balance Sheet, Cash Flow, Aged AR/AP, Trial Balance
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from decimal import Decimal
from pydantic import BaseModel, Field

from core.database import get_db
from core.auth import get_current_user
from models.user import User

router = APIRouter(prefix="/api/reports", tags=["Financial Reports"])

# ===================== SCHEMAS =====================

class ReportPeriod(BaseModel):
    from_date: date
    to_date: date
    comparison_from_date: Optional[date] = None
    comparison_to_date: Optional[date] = None

class TrialBalanceResponse(BaseModel):
    report_date: date
    accounts: List[Dict[str, Any]]
    total_debits: Decimal
    total_credits: Decimal
    difference: Decimal

class ProfitAndLossResponse(BaseModel):
    period_start: date
    period_end: date
    revenue: Dict[str, Any]
    cost_of_sales: Dict[str, Any]
    gross_profit: Decimal
    operating_expenses: Dict[str, Any]
    operating_profit: Decimal
    other_income: Dict[str, Any]
    other_expenses: Dict[str, Any]
    net_profit_before_tax: Decimal
    tax: Decimal
    net_profit_after_tax: Decimal

class BalanceSheetResponse(BaseModel):
    as_of_date: date
    assets: Dict[str, Any]
    liabilities: Dict[str, Any]
    equity: Dict[str, Any]
    total_assets: Decimal
    total_liabilities: Decimal
    total_equity: Decimal

class CashFlowResponse(BaseModel):
    period_start: date
    period_end: date
    operating_activities: Dict[str, Any]
    investing_activities: Dict[str, Any]
    financing_activities: Dict[str, Any]
    net_cash_flow: Decimal
    opening_cash: Decimal
    closing_cash: Decimal


def get_account_balance(db: Session, tenant_id: int, account_code: str, from_date: date, to_date: date) -> Decimal:
    """Get account balance for a period"""
    query = text("""
        SELECT COALESCE(SUM(debit_amount - credit_amount), 0) as balance
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE je.tenant_id = :tenant_id
        AND jel.account_code = :account_code
        AND je.entry_date BETWEEN :from_date AND :to_date
        AND je.status = 'POSTED'
    """)
    
    result = db.execute(query, {
        "tenant_id": tenant_id,
        "account_code": account_code,
        "from_date": from_date,
        "to_date": to_date
    }).fetchone()
    
    return Decimal(str(result[0])) if result else Decimal("0")

def get_accounts_by_type(db: Session, tenant_id: int, account_type: str) -> List[Dict[str, Any]]:
    """Get all accounts of a specific type"""
    query = text("""
        SELECT account_code, account_name, account_type, parent_account_code
        FROM chart_of_accounts
        WHERE tenant_id = :tenant_id
        AND account_type = :account_type
        AND is_active = true
        ORDER BY account_code
    """)
    
    result = db.execute(query, {
        "tenant_id": tenant_id,
        "account_type": account_type
    }).fetchall()
    
    return [
        {
            "account_code": row[0],
            "account_name": row[1],
            "account_type": row[2],
            "parent_account_code": row[3]
        }
        for row in result
    ]


@router.get("/trial-balance")
def get_trial_balance(
    as_of_date: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get trial balance report"""
    query = text("""
        SELECT coa.account_code, coa.account_name, coa.account_type,
               COALESCE(SUM(jel.debit_amount), 0) as total_debits,
               COALESCE(SUM(jel.credit_amount), 0) as total_credits
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.account_code = jel.account_code
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.tenant_id = :tenant_id
        AND coa.is_active = true
        AND (je.entry_date IS NULL OR je.entry_date <= :as_of_date)
        AND (je.status IS NULL OR je.status = 'POSTED')
        GROUP BY coa.account_code, coa.account_name, coa.account_type
        HAVING COALESCE(SUM(jel.debit_amount), 0) != 0 OR COALESCE(SUM(jel.credit_amount), 0) != 0
        ORDER BY coa.account_code
    """)
    
    result = db.execute(query, {
        "tenant_id": current_user.tenant_id,
        "as_of_date": as_of_date
    }).fetchall()
    
    accounts = []
    total_debits = Decimal("0")
    total_credits = Decimal("0")
    
    for row in result:
        debit_balance = Decimal(str(row[3]))
        credit_balance = Decimal(str(row[4]))
        net_balance = debit_balance - credit_balance
        
        accounts.append({
            "account_code": row[0],
            "account_name": row[1],
            "account_type": row[2],
            "debit_balance": float(debit_balance),
            "credit_balance": float(credit_balance),
            "net_balance": float(net_balance)
        })
        
        total_debits += debit_balance
        total_credits += credit_balance
    
    return {
        "report_date": as_of_date,
        "accounts": accounts,
        "total_debits": float(total_debits),
        "total_credits": float(total_credits),
        "difference": float(total_debits - total_credits)
    }


@router.get("/profit-and-loss")
def get_profit_and_loss(
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get profit and loss statement"""
    revenue_query = text("""
        SELECT coa.account_code, coa.account_name,
               COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as amount
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.account_code = jel.account_code
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.tenant_id = :tenant_id
        AND coa.account_code LIKE '4%'
        AND je.entry_date BETWEEN :from_date AND :to_date
        AND je.status = 'POSTED'
        GROUP BY coa.account_code, coa.account_name
        HAVING COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) != 0
        ORDER BY coa.account_code
    """)
    
    revenue_result = db.execute(revenue_query, {
        "tenant_id": current_user.tenant_id,
        "from_date": from_date,
        "to_date": to_date
    }).fetchall()
    
    revenue_items = []
    total_revenue = Decimal("0")
    for row in revenue_result:
        amount = Decimal(str(row[2]))
        revenue_items.append({
            "account_code": row[0],
            "account_name": row[1],
            "amount": float(amount)
        })
        total_revenue += amount
    
    cogs_query = text("""
        SELECT coa.account_code, coa.account_name,
               COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as amount
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.account_code = jel.account_code
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.tenant_id = :tenant_id
        AND coa.account_code LIKE '5%'
        AND je.entry_date BETWEEN :from_date AND :to_date
        AND je.status = 'POSTED'
        GROUP BY coa.account_code, coa.account_name
        HAVING COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) != 0
        ORDER BY coa.account_code
    """)
    
    cogs_result = db.execute(cogs_query, {
        "tenant_id": current_user.tenant_id,
        "from_date": from_date,
        "to_date": to_date
    }).fetchall()
    
    cogs_items = []
    total_cogs = Decimal("0")
    for row in cogs_result:
        amount = Decimal(str(row[2]))
        cogs_items.append({
            "account_code": row[0],
            "account_name": row[1],
            "amount": float(amount)
        })
        total_cogs += amount
    
    gross_profit = total_revenue - total_cogs
    
    opex_query = text("""
        SELECT coa.account_code, coa.account_name,
               COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as amount
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.account_code = jel.account_code
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.tenant_id = :tenant_id
        AND coa.account_code LIKE '6%'
        AND je.entry_date BETWEEN :from_date AND :to_date
        AND je.status = 'POSTED'
        GROUP BY coa.account_code, coa.account_name
        HAVING COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) != 0
        ORDER BY coa.account_code
    """)
    
    opex_result = db.execute(opex_query, {
        "tenant_id": current_user.tenant_id,
        "from_date": from_date,
        "to_date": to_date
    }).fetchall()
    
    opex_items = []
    total_opex = Decimal("0")
    for row in opex_result:
        amount = Decimal(str(row[2]))
        opex_items.append({
            "account_code": row[0],
            "account_name": row[1],
            "amount": float(amount)
        })
        total_opex += amount
    
    operating_profit = gross_profit - total_opex
    
    other_income_query = text("""
        SELECT coa.account_code, coa.account_name,
               COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as amount
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.account_code = jel.account_code
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.tenant_id = :tenant_id
        AND coa.account_code LIKE '7%'
        AND je.entry_date BETWEEN :from_date AND :to_date
        AND je.status = 'POSTED'
        GROUP BY coa.account_code, coa.account_name
        HAVING COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) != 0
        ORDER BY coa.account_code
    """)
    
    other_income_result = db.execute(other_income_query, {
        "tenant_id": current_user.tenant_id,
        "from_date": from_date,
        "to_date": to_date
    }).fetchall()
    
    other_income_items = []
    total_other_income = Decimal("0")
    for row in other_income_result:
        amount = Decimal(str(row[2]))
        other_income_items.append({
            "account_code": row[0],
            "account_name": row[1],
            "amount": float(amount)
        })
        total_other_income += amount
    
    other_expenses_query = text("""
        SELECT coa.account_code, coa.account_name,
               COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as amount
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.account_code = jel.account_code
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.tenant_id = :tenant_id
        AND coa.account_code LIKE '8%'
        AND je.entry_date BETWEEN :from_date AND :to_date
        AND je.status = 'POSTED'
        GROUP BY coa.account_code, coa.account_name
        HAVING COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) != 0
        ORDER BY coa.account_code
    """)
    
    other_expenses_result = db.execute(other_expenses_query, {
        "tenant_id": current_user.tenant_id,
        "from_date": from_date,
        "to_date": to_date
    }).fetchall()
    
    other_expenses_items = []
    total_other_expenses = Decimal("0")
    for row in other_expenses_result:
        amount = Decimal(str(row[2]))
        other_expenses_items.append({
            "account_code": row[0],
            "account_name": row[1],
            "amount": float(amount)
        })
        total_other_expenses += amount
    
    net_profit_before_tax = operating_profit + total_other_income - total_other_expenses
    
    tax = net_profit_before_tax * Decimal("0.28") if net_profit_before_tax > 0 else Decimal("0")
    net_profit_after_tax = net_profit_before_tax - tax
    
    return {
        "period_start": from_date,
        "period_end": to_date,
        "revenue": {
            "items": revenue_items,
            "total": float(total_revenue)
        },
        "cost_of_sales": {
            "items": cogs_items,
            "total": float(total_cogs)
        },
        "gross_profit": float(gross_profit),
        "gross_profit_margin": float((gross_profit / total_revenue * 100) if total_revenue > 0 else 0),
        "operating_expenses": {
            "items": opex_items,
            "total": float(total_opex)
        },
        "operating_profit": float(operating_profit),
        "other_income": {
            "items": other_income_items,
            "total": float(total_other_income)
        },
        "other_expenses": {
            "items": other_expenses_items,
            "total": float(total_other_expenses)
        },
        "net_profit_before_tax": float(net_profit_before_tax),
        "tax": float(tax),
        "net_profit_after_tax": float(net_profit_after_tax),
        "net_profit_margin": float((net_profit_after_tax / total_revenue * 100) if total_revenue > 0 else 0)
    }


@router.get("/balance-sheet")
def get_balance_sheet(
    as_of_date: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get balance sheet"""
    assets_query = text("""
        SELECT coa.account_code, coa.account_name,
               COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as amount
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.account_code = jel.account_code
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.tenant_id = :tenant_id
        AND coa.account_code LIKE '1%'
        AND (je.entry_date IS NULL OR je.entry_date <= :as_of_date)
        AND (je.status IS NULL OR je.status = 'POSTED')
        GROUP BY coa.account_code, coa.account_name
        HAVING COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) != 0
        ORDER BY coa.account_code
    """)
    
    assets_result = db.execute(assets_query, {
        "tenant_id": current_user.tenant_id,
        "as_of_date": as_of_date
    }).fetchall()
    
    assets_items = []
    total_assets = Decimal("0")
    for row in assets_result:
        amount = Decimal(str(row[2]))
        assets_items.append({
            "account_code": row[0],
            "account_name": row[1],
            "amount": float(amount)
        })
        total_assets += amount
    
    liabilities_query = text("""
        SELECT coa.account_code, coa.account_name,
               COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as amount
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.account_code = jel.account_code
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.tenant_id = :tenant_id
        AND coa.account_code LIKE '2%'
        AND (je.entry_date IS NULL OR je.entry_date <= :as_of_date)
        AND (je.status IS NULL OR je.status = 'POSTED')
        GROUP BY coa.account_code, coa.account_name
        HAVING COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) != 0
        ORDER BY coa.account_code
    """)
    
    liabilities_result = db.execute(liabilities_query, {
        "tenant_id": current_user.tenant_id,
        "as_of_date": as_of_date
    }).fetchall()
    
    liabilities_items = []
    total_liabilities = Decimal("0")
    for row in liabilities_result:
        amount = Decimal(str(row[2]))
        liabilities_items.append({
            "account_code": row[0],
            "account_name": row[1],
            "amount": float(amount)
        })
        total_liabilities += amount
    
    equity_query = text("""
        SELECT coa.account_code, coa.account_name,
               COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as amount
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.account_code = jel.account_code
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.tenant_id = :tenant_id
        AND coa.account_code LIKE '3%'
        AND (je.entry_date IS NULL OR je.entry_date <= :as_of_date)
        AND (je.status IS NULL OR je.status = 'POSTED')
        GROUP BY coa.account_code, coa.account_name
        HAVING COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) != 0
        ORDER BY coa.account_code
    """)
    
    equity_result = db.execute(equity_query, {
        "tenant_id": current_user.tenant_id,
        "as_of_date": as_of_date
    }).fetchall()
    
    equity_items = []
    total_equity = Decimal("0")
    for row in equity_result:
        amount = Decimal(str(row[2]))
        equity_items.append({
            "account_code": row[0],
            "account_name": row[1],
            "amount": float(amount)
        })
        total_equity += amount
    
    return {
        "as_of_date": as_of_date,
        "assets": {
            "items": assets_items,
            "total": float(total_assets)
        },
        "liabilities": {
            "items": liabilities_items,
            "total": float(total_liabilities)
        },
        "equity": {
            "items": equity_items,
            "total": float(total_equity)
        },
        "total_assets": float(total_assets),
        "total_liabilities": float(total_liabilities),
        "total_equity": float(total_equity),
        "balance_check": float(total_assets - (total_liabilities + total_equity))
    }


@router.get("/cash-flow")
def get_cash_flow(
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get cash flow statement"""
    cash_accounts_query = text("""
        SELECT account_code FROM chart_of_accounts
        WHERE tenant_id = :tenant_id
        AND (account_code LIKE '1000%' OR account_code LIKE '1100%')
        AND is_active = true
    """)
    
    cash_accounts = db.execute(cash_accounts_query, {
        "tenant_id": current_user.tenant_id
    }).fetchall()
    
    opening_cash = Decimal("0")
    closing_cash = Decimal("0")
    
    for account in cash_accounts:
        account_code = account[0]
        
        opening_query = text("""
            SELECT COALESCE(SUM(debit_amount - credit_amount), 0)
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            WHERE je.tenant_id = :tenant_id
            AND jel.account_code = :account_code
            AND je.entry_date < :from_date
            AND je.status = 'POSTED'
        """)
        
        opening_result = db.execute(opening_query, {
            "tenant_id": current_user.tenant_id,
            "account_code": account_code,
            "from_date": from_date
        }).fetchone()
        
        opening_cash += Decimal(str(opening_result[0])) if opening_result else Decimal("0")
        
        closing_query = text("""
            SELECT COALESCE(SUM(debit_amount - credit_amount), 0)
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            WHERE je.tenant_id = :tenant_id
            AND jel.account_code = :account_code
            AND je.entry_date <= :to_date
            AND je.status = 'POSTED'
        """)
        
        closing_result = db.execute(closing_query, {
            "tenant_id": current_user.tenant_id,
            "account_code": account_code,
            "to_date": to_date
        }).fetchone()
        
        closing_cash += Decimal(str(closing_result[0])) if closing_result else Decimal("0")
    
    net_cash_flow = closing_cash - opening_cash
    
    return {
        "period_start": from_date,
        "period_end": to_date,
        "operating_activities": {
            "items": [],
            "total": float(net_cash_flow)  # Simplified
        },
        "investing_activities": {
            "items": [],
            "total": 0.0
        },
        "financing_activities": {
            "items": [],
            "total": 0.0
        },
        "net_cash_flow": float(net_cash_flow),
        "opening_cash": float(opening_cash),
        "closing_cash": float(closing_cash)
    }


@router.get("/aged-receivables")
def get_aged_receivables(
    as_of_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get aged receivables report"""
    if not as_of_date:
        as_of_date = date.today()
    
    return {
        "as_of_date": as_of_date,
        "customers": [],
        "totals": {
            "current": 0,
            "1_30_days": 0,
            "31_60_days": 0,
            "61_90_days": 0,
            "90_plus_days": 0
        },
        "grand_total": 0
    }


@router.get("/aged-payables")
def get_aged_payables(
    as_of_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get aged payables report"""
    if not as_of_date:
        as_of_date = date.today()
    
    return {
        "as_of_date": as_of_date,
        "vendors": [],
        "totals": {
            "current": 0,
            "1_30_days": 0,
            "31_60_days": 0,
            "61_90_days": 0,
            "90_plus_days": 0
        },
        "grand_total": 0
    }
