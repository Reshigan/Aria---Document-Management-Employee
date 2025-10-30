"""
Trial Balance Service
Generates trial balance from real GL data
"""
from typing import Dict, Any, List, Optional
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
import logging

from ..models.gl_balance import GLBalance
from ..models.account import Account
from ..models.accounting_period import AccountingPeriod

logger = logging.getLogger(__name__)


class TrialBalanceService:
    """
    Generate trial balance reports from actual GL data
    NO MORE MOCK DATA!
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_trial_balance(
        self,
        as_of_date: date,
        include_zero_balances: bool = False
    ) -> Dict[str, Any]:
        """
        Generate trial balance as of a specific date
        
        Args:
            as_of_date: Date for trial balance
            include_zero_balances: Include accounts with zero balance
            
        Returns:
            Trial balance with all accounts and totals
        """
        try:
            # Get accounting period
            period = self._get_period(as_of_date)
            if not period:
                return {
                    'success': False,
                    'error': f'No accounting period found for {as_of_date}'
                }
            
            # Get all balances for this period
            balances = self.db.query(
                GLBalance,
                Account
            ).join(
                Account, GLBalance.account_number == Account.account_number
            ).filter(
                and_(
                    GLBalance.fiscal_year == period['fiscal_year'],
                    GLBalance.period_number == period['period_number'],
                    Account.is_active == True,
                    Account.is_header == False
                )
            ).all()
            
            # Build trial balance
            accounts = []
            total_debits = Decimal('0')
            total_credits = Decimal('0')
            
            for balance, account in balances:
                # Skip zero balances if requested
                if not include_zero_balances and balance.closing_balance == 0:
                    continue
                
                # Determine debit or credit balance based on account type
                debit_balance = Decimal('0')
                credit_balance = Decimal('0')
                
                if account.account_type in ['ASSET', 'EXPENSE']:
                    # Normal debit balance
                    if balance.closing_balance >= 0:
                        debit_balance = balance.closing_balance
                    else:
                        credit_balance = abs(balance.closing_balance)
                else:
                    # Normal credit balance (LIABILITY, EQUITY, REVENUE)
                    if balance.closing_balance >= 0:
                        credit_balance = balance.closing_balance
                    else:
                        debit_balance = abs(balance.closing_balance)
                
                accounts.append({
                    'account_number': account.account_number,
                    'account_name': account.account_name,
                    'account_type': account.account_type,
                    'opening_balance': float(balance.opening_balance),
                    'debit_activity': float(balance.debit_amount),
                    'credit_activity': float(balance.credit_amount),
                    'closing_balance': float(balance.closing_balance),
                    'debit_balance': float(debit_balance),
                    'credit_balance': float(credit_balance)
                })
                
                total_debits += debit_balance
                total_credits += credit_balance
            
            # Sort by account number
            accounts.sort(key=lambda x: x['account_number'])
            
            # Check if balanced
            is_balanced = abs(total_debits - total_credits) < Decimal('0.01')
            difference = total_debits - total_credits
            
            return {
                'success': True,
                'as_of_date': as_of_date.isoformat(),
                'period': period['period_name'],
                'fiscal_year': period['fiscal_year'],
                'period_number': period['period_number'],
                'accounts': accounts,
                'total_debits': float(total_debits),
                'total_credits': float(total_credits),
                'is_balanced': is_balanced,
                'difference': float(difference),
                'account_count': len(accounts),
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating trial balance: {str(e)}")
            return {
                'success': False,
                'error': f'Trial balance generation failed: {str(e)}'
            }
    
    def generate_comparative_trial_balance(
        self,
        current_date: date,
        prior_date: date
    ) -> Dict[str, Any]:
        """
        Generate comparative trial balance for two periods
        """
        try:
            current_tb = self.generate_trial_balance(current_date, include_zero_balances=True)
            prior_tb = self.generate_trial_balance(prior_date, include_zero_balances=True)
            
            if not current_tb['success'] or not prior_tb['success']:
                return {
                    'success': False,
                    'error': 'Failed to generate one or both trial balances'
                }
            
            # Build comparative view
            current_accounts = {acc['account_number']: acc for acc in current_tb['accounts']}
            prior_accounts = {acc['account_number']: acc for acc in prior_tb['accounts']}
            
            # Get all unique account numbers
            all_accounts = set(current_accounts.keys()) | set(prior_accounts.keys())
            
            comparative = []
            for acc_num in sorted(all_accounts):
                current = current_accounts.get(acc_num, {})
                prior = prior_accounts.get(acc_num, {})
                
                current_balance = Decimal(str(current.get('closing_balance', 0)))
                prior_balance = Decimal(str(prior.get('closing_balance', 0)))
                variance = current_balance - prior_balance
                
                if prior_balance != 0:
                    variance_pct = float((variance / prior_balance) * 100)
                else:
                    variance_pct = 100.0 if variance != 0 else 0.0
                
                comparative.append({
                    'account_number': acc_num,
                    'account_name': current.get('account_name') or prior.get('account_name'),
                    'account_type': current.get('account_type') or prior.get('account_type'),
                    'current_balance': float(current_balance),
                    'prior_balance': float(prior_balance),
                    'variance': float(variance),
                    'variance_pct': round(variance_pct, 2)
                })
            
            return {
                'success': True,
                'current_period': current_tb['period'],
                'prior_period': prior_tb['period'],
                'accounts': comparative,
                'current_total_debits': current_tb['total_debits'],
                'prior_total_debits': prior_tb['total_debits'],
                'current_total_credits': current_tb['total_credits'],
                'prior_total_credits': prior_tb['total_credits'],
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating comparative trial balance: {str(e)}")
            return {
                'success': False,
                'error': f'Comparative trial balance failed: {str(e)}'
            }
    
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
