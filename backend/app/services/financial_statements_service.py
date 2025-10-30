"""
Financial Statements Service
Generates Income Statement, Balance Sheet, Cash Flow Statement from real data
"""
from typing import Dict, Any, List, Optional
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import logging

from ..models.gl_balance import GLBalance
from ..models.account import Account
from ..models.accounting_period import AccountingPeriod

logger = logging.getLogger(__name__)


class FinancialStatementsService:
    """
    Generate financial statements from actual GL data
    REAL calculations, NO mock data!
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_income_statement(
        self,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Generate Income Statement (Profit & Loss)
        
        Format:
        Revenue
        - Cost of Goods Sold
        = Gross Profit
        - Operating Expenses
        = Operating Income
        +/- Other Income/Expense
        = Net Income
        """
        try:
            # Get periods for date range
            periods = self._get_periods_in_range(start_date, end_date)
            if not periods:
                return {
                    'success': False,
                    'error': 'No accounting periods found for date range'
                }
            
            # Get revenue accounts (account type = REVENUE)
            revenue = self._get_account_balances(periods, 'REVENUE')
            total_revenue = sum(acc['balance'] for acc in revenue)
            
            # Get COGS accounts (typically 5000-5999)
            cogs = self._get_account_balances_by_range(periods, '5000', '5999')
            total_cogs = sum(acc['balance'] for acc in cogs)
            
            # Gross profit
            gross_profit = total_revenue - total_cogs
            gross_margin = (gross_profit / total_revenue * 100) if total_revenue != 0 else 0
            
            # Get operating expenses (typically 6000-6999)
            operating_expenses = self._get_account_balances_by_range(periods, '6000', '6999')
            total_opex = sum(acc['balance'] for acc in operating_expenses)
            
            # Operating income
            operating_income = gross_profit - total_opex
            operating_margin = (operating_income / total_revenue * 100) if total_revenue != 0 else 0
            
            # Other income and expenses (7000-7999, 8000-8999)
            other_income = self._get_account_balances_by_range(periods, '7000', '7999')
            other_expense = self._get_account_balances_by_range(periods, '8000', '8999')
            
            total_other_income = sum(acc['balance'] for acc in other_income)
            total_other_expense = sum(acc['balance'] for acc in other_expense)
            
            # Net income
            net_income = operating_income + total_other_income - total_other_expense
            net_margin = (net_income / total_revenue * 100) if total_revenue != 0 else 0
            
            return {
                'success': True,
                'statement_type': 'Income Statement',
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'currency': 'ZAR',
                'revenue': {
                    'accounts': revenue,
                    'total': float(total_revenue)
                },
                'cost_of_goods_sold': {
                    'accounts': cogs,
                    'total': float(total_cogs)
                },
                'gross_profit': {
                    'amount': float(gross_profit),
                    'margin_pct': round(float(gross_margin), 2)
                },
                'operating_expenses': {
                    'accounts': operating_expenses,
                    'total': float(total_opex)
                },
                'operating_income': {
                    'amount': float(operating_income),
                    'margin_pct': round(float(operating_margin), 2)
                },
                'other_income': {
                    'accounts': other_income,
                    'total': float(total_other_income)
                },
                'other_expenses': {
                    'accounts': other_expense,
                    'total': float(total_other_expense)
                },
                'net_income': {
                    'amount': float(net_income),
                    'margin_pct': round(float(net_margin), 2)
                },
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating income statement: {str(e)}")
            return {
                'success': False,
                'error': f'Income statement generation failed: {str(e)}'
            }
    
    def generate_balance_sheet(
        self,
        as_of_date: date
    ) -> Dict[str, Any]:
        """
        Generate Balance Sheet
        
        Format:
        ASSETS = LIABILITIES + EQUITY
        """
        try:
            # Get period
            period = self._get_period(as_of_date)
            if not period:
                return {
                    'success': False,
                    'error': f'No accounting period found for {as_of_date}'
                }
            
            periods = [period]
            
            # Get assets (typically 1000-1999)
            current_assets = self._get_account_balances_by_range(periods, '1000', '1499')
            fixed_assets = self._get_account_balances_by_range(periods, '1500', '1999')
            
            total_current_assets = sum(acc['balance'] for acc in current_assets)
            total_fixed_assets = sum(acc['balance'] for acc in fixed_assets)
            total_assets = total_current_assets + total_fixed_assets
            
            # Get liabilities (typically 2000-2999)
            current_liabilities = self._get_account_balances_by_range(periods, '2000', '2499')
            long_term_liabilities = self._get_account_balances_by_range(periods, '2500', '2999')
            
            total_current_liabilities = sum(acc['balance'] for acc in current_liabilities)
            total_long_term_liabilities = sum(acc['balance'] for acc in long_term_liabilities)
            total_liabilities = total_current_liabilities + total_long_term_liabilities
            
            # Get equity (typically 3000-3999)
            equity_accounts = self._get_account_balances_by_range(periods, '3000', '3999')
            total_equity = sum(acc['balance'] for acc in equity_accounts)
            
            # Calculate net income YTD and add to equity
            year_start = date(as_of_date.year, 1, 1)
            income_stmt = self.generate_income_statement(year_start, as_of_date)
            
            if income_stmt['success']:
                net_income_ytd = Decimal(str(income_stmt['net_income']['amount']))
                total_equity += net_income_ytd
            else:
                net_income_ytd = Decimal('0')
            
            # Total liabilities and equity
            total_liabilities_equity = total_liabilities + total_equity
            
            # Check if balanced
            is_balanced = abs(total_assets - total_liabilities_equity) < Decimal('0.01')
            difference = total_assets - total_liabilities_equity
            
            return {
                'success': True,
                'statement_type': 'Balance Sheet',
                'as_of_date': as_of_date.isoformat(),
                'currency': 'ZAR',
                'assets': {
                    'current_assets': {
                        'accounts': current_assets,
                        'total': float(total_current_assets)
                    },
                    'fixed_assets': {
                        'accounts': fixed_assets,
                        'total': float(total_fixed_assets)
                    },
                    'total': float(total_assets)
                },
                'liabilities': {
                    'current_liabilities': {
                        'accounts': current_liabilities,
                        'total': float(total_current_liabilities)
                    },
                    'long_term_liabilities': {
                        'accounts': long_term_liabilities,
                        'total': float(total_long_term_liabilities)
                    },
                    'total': float(total_liabilities)
                },
                'equity': {
                    'accounts': equity_accounts,
                    'retained_earnings': float(net_income_ytd),
                    'total': float(total_equity)
                },
                'total_liabilities_equity': float(total_liabilities_equity),
                'is_balanced': is_balanced,
                'difference': float(difference),
                'ratios': {
                    'current_ratio': float(total_current_assets / total_current_liabilities) if total_current_liabilities != 0 else 0,
                    'debt_to_equity': float(total_liabilities / total_equity) if total_equity != 0 else 0,
                    'quick_ratio': 0  # TODO: Calculate based on liquid assets
                },
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating balance sheet: {str(e)}")
            return {
                'success': False,
                'error': f'Balance sheet generation failed: {str(e)}'
            }
    
    def generate_cash_flow_statement(
        self,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Generate Cash Flow Statement (Indirect Method)
        
        Format:
        Operating Activities (Net Income +/- adjustments)
        Investing Activities
        Financing Activities
        = Net Change in Cash
        """
        try:
            # Get net income from P&L
            income_stmt = self.generate_income_statement(start_date, end_date)
            if not income_stmt['success']:
                return {
                    'success': False,
                    'error': 'Failed to get net income for cash flow'
                }
            
            net_income = Decimal(str(income_stmt['net_income']['amount']))
            
            periods = self._get_periods_in_range(start_date, end_date)
            
            # Operating activities adjustments
            # Add back: Depreciation, amortization (non-cash expenses)
            depreciation = self._get_account_activity(periods, '6300')  # Depreciation expense account
            
            # Changes in working capital
            # TODO: Calculate changes in AR, AP, Inventory
            working_capital_changes = Decimal('0')
            
            operating_cash_flow = net_income + depreciation + working_capital_changes
            
            # Investing activities
            # Purchase/sale of fixed assets
            investing_activities = self._get_account_activity(periods, '1500', '1999')
            
            # Financing activities
            # Loans, dividends
            financing_activities = self._get_account_activity(periods, '2500', '2999')
            
            # Net change in cash
            net_change = operating_cash_flow + investing_activities + financing_activities
            
            # Get beginning and ending cash
            cash_account = '1000'  # Assuming 1000 is cash account
            beginning_cash = self._get_opening_balance(cash_account, periods[0])
            ending_cash = beginning_cash + net_change
            
            return {
                'success': True,
                'statement_type': 'Cash Flow Statement',
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'currency': 'ZAR',
                'operating_activities': {
                    'net_income': float(net_income),
                    'adjustments': {
                        'depreciation': float(depreciation),
                        'working_capital_changes': float(working_capital_changes)
                    },
                    'total': float(operating_cash_flow)
                },
                'investing_activities': {
                    'total': float(investing_activities)
                },
                'financing_activities': {
                    'total': float(financing_activities)
                },
                'net_change_in_cash': float(net_change),
                'beginning_cash': float(beginning_cash),
                'ending_cash': float(ending_cash),
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating cash flow statement: {str(e)}")
            return {
                'success': False,
                'error': f'Cash flow statement generation failed: {str(e)}'
            }
    
    # Helper methods
    
    def _get_periods_in_range(self, start_date: date, end_date: date) -> List[Dict[str, Any]]:
        """Get all accounting periods in date range"""
        periods_query = self.db.query(AccountingPeriod).filter(
            or_(
                and_(
                    AccountingPeriod.start_date >= start_date,
                    AccountingPeriod.start_date <= end_date
                ),
                and_(
                    AccountingPeriod.end_date >= start_date,
                    AccountingPeriod.end_date <= end_date
                )
            )
        ).all()
        
        return [{
            'fiscal_year': p.fiscal_year,
            'period_number': p.period_number,
            'period_name': p.name
        } for p in periods_query]
    
    def _get_period(self, as_of_date: date) -> Optional[Dict[str, Any]]:
        """Get accounting period for date"""
        period = self.db.query(AccountingPeriod).filter(
            and_(
                AccountingPeriod.start_date <= as_of_date,
                AccountingPeriod.end_date >= as_of_date
            )
        ).first()
        
        if not period:
            return None
        
        return {
            'fiscal_year': period.fiscal_year,
            'period_number': period.period_number,
            'period_name': period.name
        }
    
    def _get_account_balances(
        self,
        periods: List[Dict[str, Any]],
        account_type: str
    ) -> List[Dict[str, Any]]:
        """Get account balances for specific type"""
        results = []
        
        for period in periods:
            balances = self.db.query(
                GLBalance, Account
            ).join(
                Account, GLBalance.account_number == Account.account_number
            ).filter(
                and_(
                    GLBalance.fiscal_year == period['fiscal_year'],
                    GLBalance.period_number == period['period_number'],
                    Account.account_type == account_type,
                    Account.is_active == True,
                    Account.is_header == False
                )
            ).all()
            
            for balance, account in balances:
                # Find existing account in results
                existing = next((r for r in results if r['account_number'] == account.account_number), None)
                
                if existing:
                    # Add to existing
                    if account_type in ['REVENUE', 'LIABILITY', 'EQUITY']:
                        existing['balance'] += balance.credit_amount - balance.debit_amount
                    else:
                        existing['balance'] += balance.debit_amount - balance.credit_amount
                else:
                    # Create new
                    if account_type in ['REVENUE', 'LIABILITY', 'EQUITY']:
                        bal = balance.credit_amount - balance.debit_amount
                    else:
                        bal = balance.debit_amount - balance.credit_amount
                    
                    results.append({
                        'account_number': account.account_number,
                        'account_name': account.account_name,
                        'balance': float(bal)
                    })
        
        return results
    
    def _get_account_balances_by_range(
        self,
        periods: List[Dict[str, Any]],
        start_account: str,
        end_account: str
    ) -> List[Dict[str, Any]]:
        """Get account balances for account number range"""
        results = []
        
        for period in periods:
            balances = self.db.query(
                GLBalance, Account
            ).join(
                Account, GLBalance.account_number == Account.account_number
            ).filter(
                and_(
                    GLBalance.fiscal_year == period['fiscal_year'],
                    GLBalance.period_number == period['period_number'],
                    Account.account_number >= start_account,
                    Account.account_number <= end_account,
                    Account.is_active == True,
                    Account.is_header == False
                )
            ).all()
            
            for balance, account in balances:
                existing = next((r for r in results if r['account_number'] == account.account_number), None)
                
                if existing:
                    existing['balance'] += balance.closing_balance
                else:
                    results.append({
                        'account_number': account.account_number,
                        'account_name': account.account_name,
                        'balance': float(balance.closing_balance)
                    })
        
        return results
    
    def _get_account_activity(
        self,
        periods: List[Dict[str, Any]],
        start_account: str,
        end_account: str = None
    ) -> Decimal:
        """Get total activity for account(s)"""
        if end_account is None:
            end_account = start_account
        
        total = Decimal('0')
        
        for period in periods:
            balances = self.db.query(GLBalance).filter(
                and_(
                    GLBalance.fiscal_year == period['fiscal_year'],
                    GLBalance.period_number == period['period_number'],
                    GLBalance.account_number >= start_account,
                    GLBalance.account_number <= end_account
                )
            ).all()
            
            for balance in balances:
                total += balance.debit_amount - balance.credit_amount
        
        return total
    
    def _get_opening_balance(
        self,
        account_number: str,
        period: Dict[str, Any]
    ) -> Decimal:
        """Get opening balance for account in period"""
        balance = self.db.query(GLBalance).filter(
            and_(
                GLBalance.account_number == account_number,
                GLBalance.fiscal_year == period['fiscal_year'],
                GLBalance.period_number == period['period_number']
            )
        ).first()
        
        return balance.opening_balance if balance else Decimal('0')
