"""
Double-Entry Posting Engine
Real implementation of accounting posting logic
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import logging

from ..models.journal_entry import JournalEntry, JournalLine
from ..models.account import Account
from ..models.gl_balance import GLBalance
from ..models.accounting_period import AccountingPeriod

logger = logging.getLogger(__name__)


class PostingEngine:
    """
    Core double-entry accounting posting engine
    Handles all GL postings with proper validation
    """
    
    def __init__(self, db: Session):
        self.db = db
        
    def post_journal_entry(
        self,
        entry_date: date,
        description: str,
        lines: List[Dict[str, Any]],
        reference: Optional[str] = None,
        source: str = "MANUAL"
    ) -> Dict[str, Any]:
        """
        Post a journal entry with full double-entry validation
        
        Args:
            entry_date: Posting date
            description: Entry description
            lines: List of journal lines [{account, debit, credit, description}]
            reference: Optional reference number
            source: Source system/module
            
        Returns:
            Dict with success status and entry details
        """
        try:
            # Step 1: Validate entry is balanced
            total_debits = sum(Decimal(str(line.get('debit', 0))) for line in lines)
            total_credits = sum(Decimal(str(line.get('credit', 0))) for line in lines)
            
            if abs(total_debits - total_credits) > Decimal('0.01'):
                return {
                    'success': False,
                    'error': 'Entry is not balanced',
                    'total_debits': float(total_debits),
                    'total_credits': float(total_credits),
                    'difference': float(total_debits - total_credits)
                }
            
            # Step 2: Validate period is open
            period_check = self._validate_period(entry_date)
            if not period_check['is_open']:
                return {
                    'success': False,
                    'error': f"Period {period_check['period_name']} is {period_check['status']}"
                }
            
            # Step 3: Validate all accounts exist and are active
            account_validation = self._validate_accounts(lines)
            if not account_validation['valid']:
                return {
                    'success': False,
                    'error': 'Invalid accounts',
                    'details': account_validation['errors']
                }
            
            # Step 4: Create journal entry header
            journal_entry = JournalEntry(
                entry_date=entry_date,
                posting_date=datetime.now().date(),
                description=description,
                reference=reference or self._generate_reference(),
                source=source,
                status='POSTED',
                total_debit=total_debits,
                total_credit=total_credits,
                created_at=datetime.now(),
                posted_at=datetime.now()
            )
            
            self.db.add(journal_entry)
            self.db.flush()  # Get the entry ID
            
            # Step 5: Create journal lines
            line_count = 0
            for line_data in lines:
                line = JournalLine(
                    journal_entry_id=journal_entry.id,
                    line_number=line_count + 1,
                    account_number=line_data['account'],
                    debit_amount=Decimal(str(line_data.get('debit', 0))),
                    credit_amount=Decimal(str(line_data.get('credit', 0))),
                    description=line_data.get('description', description),
                    cost_center=line_data.get('cost_center'),
                    project_code=line_data.get('project_code')
                )
                self.db.add(line)
                line_count += 1
            
            # Step 6: Update GL balances
            self._update_gl_balances(journal_entry.id, entry_date, lines)
            
            # Commit transaction
            self.db.commit()
            
            return {
                'success': True,
                'entry_id': journal_entry.id,
                'reference': journal_entry.reference,
                'total_debits': float(total_debits),
                'total_credits': float(total_credits),
                'lines_posted': line_count,
                'posted_at': journal_entry.posted_at.isoformat()
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error posting journal entry: {str(e)}")
            return {
                'success': False,
                'error': f"Posting failed: {str(e)}"
            }
    
    def _validate_period(self, entry_date: date) -> Dict[str, Any]:
        """Check if accounting period is open for posting"""
        period = self.db.query(AccountingPeriod).filter(
            and_(
                AccountingPeriod.start_date <= entry_date,
                AccountingPeriod.end_date >= entry_date
            )
        ).first()
        
        if not period:
            return {
                'is_open': False,
                'period_name': 'Unknown',
                'status': 'NOT_FOUND'
            }
        
        return {
            'is_open': period.status == 'OPEN',
            'period_name': period.name,
            'status': period.status
        }
    
    def _validate_accounts(self, lines: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate all accounts in the entry"""
        errors = []
        
        for line in lines:
            account_number = line.get('account')
            if not account_number:
                errors.append({'line': line, 'error': 'Missing account number'})
                continue
            
            account = self.db.query(Account).filter(
                Account.account_number == account_number
            ).first()
            
            if not account:
                errors.append({
                    'account': account_number,
                    'error': 'Account does not exist'
                })
            elif not account.is_active:
                errors.append({
                    'account': account_number,
                    'error': 'Account is inactive'
                })
            elif account.is_header:
                errors.append({
                    'account': account_number,
                    'error': 'Cannot post to header account'
                })
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    def _update_gl_balances(
        self,
        entry_id: int,
        entry_date: date,
        lines: List[Dict[str, Any]]
    ):
        """Update GL account balances"""
        period = self._get_accounting_period(entry_date)
        
        for line in lines:
            account_number = line['account']
            debit = Decimal(str(line.get('debit', 0)))
            credit = Decimal(str(line.get('credit', 0)))
            
            # Get or create GL balance record
            balance = self.db.query(GLBalance).filter(
                and_(
                    GLBalance.account_number == account_number,
                    GLBalance.fiscal_year == period['fiscal_year'],
                    GLBalance.period_number == period['period_number']
                )
            ).first()
            
            if not balance:
                # Get opening balance from previous period
                opening_balance = self._get_opening_balance(
                    account_number,
                    period['fiscal_year'],
                    period['period_number']
                )
                
                balance = GLBalance(
                    account_number=account_number,
                    fiscal_year=period['fiscal_year'],
                    period_number=period['period_number'],
                    opening_balance=opening_balance,
                    debit_amount=Decimal('0'),
                    credit_amount=Decimal('0'),
                    closing_balance=opening_balance
                )
                self.db.add(balance)
            
            # Update balance
            balance.debit_amount += debit
            balance.credit_amount += credit
            
            # Calculate closing balance based on account type
            account = self.db.query(Account).filter(
                Account.account_number == account_number
            ).first()
            
            if account.account_type in ['ASSET', 'EXPENSE']:
                # Normal debit balance
                balance.closing_balance = balance.opening_balance + balance.debit_amount - balance.credit_amount
            else:
                # Normal credit balance (LIABILITY, EQUITY, REVENUE)
                balance.closing_balance = balance.opening_balance + balance.credit_amount - balance.debit_amount
            
            balance.last_updated = datetime.now()
    
    def _get_accounting_period(self, entry_date: date) -> Dict[str, Any]:
        """Get accounting period for date"""
        period = self.db.query(AccountingPeriod).filter(
            and_(
                AccountingPeriod.start_date <= entry_date,
                AccountingPeriod.end_date >= entry_date
            )
        ).first()
        
        if not period:
            # Default to current year/month if period not found
            return {
                'fiscal_year': entry_date.year,
                'period_number': entry_date.month,
                'period_name': entry_date.strftime('%Y-%m')
            }
        
        return {
            'fiscal_year': period.fiscal_year,
            'period_number': period.period_number,
            'period_name': period.name
        }
    
    def _get_opening_balance(
        self,
        account_number: str,
        fiscal_year: int,
        period_number: int
    ) -> Decimal:
        """Get opening balance for account/period"""
        if period_number == 1:
            # First period - get from previous year's closing
            prev_year_balance = self.db.query(GLBalance).filter(
                and_(
                    GLBalance.account_number == account_number,
                    GLBalance.fiscal_year == fiscal_year - 1,
                    GLBalance.period_number == 12
                )
            ).first()
            
            return prev_year_balance.closing_balance if prev_year_balance else Decimal('0')
        else:
            # Get from previous period this year
            prev_period = self.db.query(GLBalance).filter(
                and_(
                    GLBalance.account_number == account_number,
                    GLBalance.fiscal_year == fiscal_year,
                    GLBalance.period_number == period_number - 1
                )
            ).first()
            
            return prev_period.closing_balance if prev_period else Decimal('0')
    
    def _generate_reference(self) -> str:
        """Generate unique journal entry reference"""
        now = datetime.now()
        
        # Count entries today
        today_start = datetime.combine(now.date(), datetime.min.time())
        count = self.db.query(JournalEntry).filter(
            JournalEntry.created_at >= today_start
        ).count()
        
        return f"JE-{now.strftime('%Y%m%d')}-{count + 1:04d}"
    
    def reverse_entry(
        self,
        original_entry_id: int,
        reversal_date: date,
        reason: str
    ) -> Dict[str, Any]:
        """
        Reverse a journal entry
        Creates a new entry with opposite signs
        """
        try:
            # Get original entry
            original = self.db.query(JournalEntry).filter(
                JournalEntry.id == original_entry_id
            ).first()
            
            if not original:
                return {
                    'success': False,
                    'error': 'Original entry not found'
                }
            
            if original.status == 'REVERSED':
                return {
                    'success': False,
                    'error': 'Entry is already reversed'
                }
            
            # Get original lines
            original_lines = self.db.query(JournalLine).filter(
                JournalLine.journal_entry_id == original_entry_id
            ).all()
            
            # Create reversal lines (swap debits and credits)
            reversal_lines = []
            for line in original_lines:
                reversal_lines.append({
                    'account': line.account_number,
                    'debit': float(line.credit_amount),
                    'credit': float(line.debit_amount),
                    'description': f"Reversal: {line.description}"
                })
            
            # Post reversal entry
            result = self.post_journal_entry(
                entry_date=reversal_date,
                description=f"REVERSAL: {original.description} - {reason}",
                lines=reversal_lines,
                reference=f"REV-{original.reference}",
                source="REVERSAL"
            )
            
            if result['success']:
                # Mark original as reversed
                original.status = 'REVERSED'
                original.reversed_by = result['entry_id']
                original.reversal_date = reversal_date
                self.db.commit()
                
                result['original_entry'] = original.reference
                result['reversal_reason'] = reason
            
            return result
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error reversing entry: {str(e)}")
            return {
                'success': False,
                'error': f"Reversal failed: {str(e)}"
            }
