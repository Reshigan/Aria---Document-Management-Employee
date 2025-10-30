"""
General Ledger Service
High-level GL operations using the posting engine
"""
from typing import Dict, Any, List, Optional
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
import logging

from ..models.journal_entry import JournalEntry, JournalLine
from ..models.account import Account
from ..models.gl_balance import GLBalance
from .posting_engine import PostingEngine
from .trial_balance_service import TrialBalanceService

logger = logging.getLogger(__name__)


class GeneralLedgerService:
    """
    General Ledger Service
    Handles all GL operations with real business logic
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.posting_engine = PostingEngine(db)
        self.trial_balance_service = TrialBalanceService(db)
    
    def post_journal_entry(
        self,
        entry_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Post a journal entry
        
        Args:
            entry_data: {
                'date': '2025-10-27',
                'description': 'Monthly depreciation',
                'reference': 'JE-001' (optional),
                'lines': [
                    {'account': '6200', 'debit': 5000, 'credit': 0, 'description': '...'},
                    ...
                ]
            }
        """
        try:
            entry_date = datetime.strptime(entry_data['date'], '%Y-%m-%d').date()
            description = entry_data['description']
            lines = entry_data['lines']
            reference = entry_data.get('reference')
            
            result = self.posting_engine.post_journal_entry(
                entry_date=entry_date,
                description=description,
                lines=lines,
                reference=reference
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error in post_journal_entry: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to post journal entry: {str(e)}'
            }
    
    def get_trial_balance(
        self,
        as_of_date: str,
        include_zero_balances: bool = False
    ) -> Dict[str, Any]:
        """Get trial balance as of date"""
        try:
            date_obj = datetime.strptime(as_of_date, '%Y-%m-%d').date()
            return self.trial_balance_service.generate_trial_balance(
                date_obj,
                include_zero_balances
            )
        except Exception as e:
            logger.error(f"Error getting trial balance: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to get trial balance: {str(e)}'
            }
    
    def get_account_ledger(
        self,
        account_number: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Get account ledger with all transactions
        
        Args:
            account_number: Account to query
            start_date: Optional start date filter
            end_date: Optional end date filter
            limit: Max number of transactions
        """
        try:
            # Validate account exists
            account = self.db.query(Account).filter(
                Account.account_number == account_number
            ).first()
            
            if not account:
                return {
                    'success': False,
                    'error': f'Account {account_number} not found'
                }
            
            # Build query
            query = self.db.query(
                JournalLine, JournalEntry
            ).join(
                JournalEntry, JournalLine.journal_entry_id == JournalEntry.id
            ).filter(
                JournalLine.account_number == account_number
            )
            
            if start_date:
                start = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(JournalEntry.entry_date >= start)
            
            if end_date:
                end = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(JournalEntry.entry_date <= end)
            
            # Order by date descending
            query = query.order_by(desc(JournalEntry.entry_date), desc(JournalLine.id))
            
            # Limit results
            results = query.limit(limit).all()
            
            # Build response
            transactions = []
            running_balance = Decimal('0')
            
            for line, entry in reversed(results):  # Reverse to calculate running balance
                debit = line.debit_amount
                credit = line.credit_amount
                
                # Update running balance based on account type
                if account.account_type in ['ASSET', 'EXPENSE']:
                    running_balance += debit - credit
                else:
                    running_balance += credit - debit
                
                transactions.append({
                    'date': entry.entry_date.isoformat(),
                    'reference': entry.reference,
                    'description': line.description,
                    'debit': float(debit),
                    'credit': float(credit),
                    'balance': float(running_balance),
                    'entry_id': entry.id,
                    'status': entry.status
                })
            
            # Reverse back to show newest first
            transactions.reverse()
            
            return {
                'success': True,
                'account_number': account_number,
                'account_name': account.account_name,
                'account_type': account.account_type,
                'transactions': transactions,
                'transaction_count': len(transactions),
                'current_balance': float(running_balance)
            }
            
        except Exception as e:
            logger.error(f"Error getting account ledger: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to get account ledger: {str(e)}'
            }
    
    def reverse_journal_entry(
        self,
        entry_id: int,
        reversal_date: str,
        reason: str
    ) -> Dict[str, Any]:
        """Reverse a journal entry"""
        try:
            reversal_date_obj = datetime.strptime(reversal_date, '%Y-%m-%d').date()
            
            result = self.posting_engine.reverse_entry(
                original_entry_id=entry_id,
                reversal_date=reversal_date_obj,
                reason=reason
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error reversing entry: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to reverse entry: {str(e)}'
            }
    
    def get_journal_entry(
        self,
        entry_id: int
    ) -> Dict[str, Any]:
        """Get full journal entry details"""
        try:
            entry = self.db.query(JournalEntry).filter(
                JournalEntry.id == entry_id
            ).first()
            
            if not entry:
                return {
                    'success': False,
                    'error': f'Journal entry {entry_id} not found'
                }
            
            lines = self.db.query(JournalLine).filter(
                JournalLine.journal_entry_id == entry_id
            ).order_by(JournalLine.line_number).all()
            
            return {
                'success': True,
                'entry': {
                    'id': entry.id,
                    'reference': entry.reference,
                    'entry_date': entry.entry_date.isoformat(),
                    'posting_date': entry.posting_date.isoformat(),
                    'description': entry.description,
                    'source': entry.source,
                    'status': entry.status,
                    'total_debit': float(entry.total_debit),
                    'total_credit': float(entry.total_credit),
                    'created_at': entry.created_at.isoformat() if entry.created_at else None,
                    'posted_at': entry.posted_at.isoformat() if entry.posted_at else None,
                    'lines': [
                        {
                            'line_number': line.line_number,
                            'account_number': line.account_number,
                            'debit': float(line.debit_amount),
                            'credit': float(line.credit_amount),
                            'description': line.description,
                            'cost_center': line.cost_center,
                            'project_code': line.project_code
                        }
                        for line in lines
                    ]
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting journal entry: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to get journal entry: {str(e)}'
            }
    
    def search_journal_entries(
        self,
        search_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Search journal entries
        
        Args:
            search_params: {
                'start_date': '2025-01-01',
                'end_date': '2025-12-31',
                'reference': 'JE-',
                'description': 'depreciation',
                'account': '6200',
                'status': 'POSTED',
                'limit': 50
            }
        """
        try:
            query = self.db.query(JournalEntry)
            
            if 'start_date' in search_params:
                start = datetime.strptime(search_params['start_date'], '%Y-%m-%d').date()
                query = query.filter(JournalEntry.entry_date >= start)
            
            if 'end_date' in search_params:
                end = datetime.strptime(search_params['end_date'], '%Y-%m-%d').date()
                query = query.filter(JournalEntry.entry_date <= end)
            
            if 'reference' in search_params:
                query = query.filter(JournalEntry.reference.ilike(f"%{search_params['reference']}%"))
            
            if 'description' in search_params:
                query = query.filter(JournalEntry.description.ilike(f"%{search_params['description']}%"))
            
            if 'status' in search_params:
                query = query.filter(JournalEntry.status == search_params['status'])
            
            if 'account' in search_params:
                # Filter by entries that have lines with this account
                query = query.join(JournalLine).filter(
                    JournalLine.account_number == search_params['account']
                )
            
            # Order by date descending
            query = query.order_by(desc(JournalEntry.entry_date))
            
            # Limit
            limit = search_params.get('limit', 50)
            entries = query.limit(limit).all()
            
            return {
                'success': True,
                'entries': [
                    {
                        'id': entry.id,
                        'reference': entry.reference,
                        'entry_date': entry.entry_date.isoformat(),
                        'description': entry.description,
                        'status': entry.status,
                        'total_debit': float(entry.total_debit),
                        'total_credit': float(entry.total_credit)
                    }
                    for entry in entries
                ],
                'count': len(entries)
            }
            
        except Exception as e:
            logger.error(f"Error searching journal entries: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to search journal entries: {str(e)}'
            }
