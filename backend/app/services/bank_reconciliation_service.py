"""
Bank Reconciliation Service - Real Implementation
Handles bank statement import, transaction matching, and reconciliation
"""

from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any
import logging

from ..models.bank_account import BankAccount, BankAccountStatus
from ..models.bank_statement import BankStatement, BankTransaction, StatementStatus
from ..models.journal_entry import JournalEntry
from .general_ledger_service import GeneralLedgerService


logger = logging.getLogger(__name__)


class BankReconciliationService:
    """Service for managing bank reconciliation"""
    
    def __init__(self, db: Session):
        self.db = db
        self.gl_service = GeneralLedgerService(db)
    
    def create_bank_account(self, account_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new bank account"""
        try:
            # Check for duplicate
            existing = self.db.query(BankAccount).filter_by(
                account_code=account_data['account_code']
            ).first()
            if existing:
                return {
                    'success': False,
                    'error': f"Account code {account_data['account_code']} already exists"
                }
            
            # Create bank account
            account = BankAccount(**account_data)
            self.db.add(account)
            self.db.commit()
            self.db.refresh(account)
            
            logger.info(f"Created bank account: {account.account_code} - {account.account_name}")
            
            return {
                'success': True,
                'account_id': account.id,
                'account_code': account.account_code,
                'account_name': account.account_name
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating bank account: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def import_statement(self, statement_data: Dict[str, Any]) -> Dict[str, Any]:
        """Import a bank statement with transactions"""
        try:
            # Validate bank account
            account = self.db.query(BankAccount).filter_by(
                id=statement_data['bank_account_id']
            ).first()
            if not account:
                return {'success': False, 'error': 'Bank account not found'}
            
            # Check for duplicate
            existing = self.db.query(BankStatement).filter_by(
                statement_number=statement_data['statement_number']
            ).first()
            if existing:
                return {
                    'success': False,
                    'error': f"Statement {statement_data['statement_number']} already imported"
                }
            
            # Create statement
            statement = BankStatement(
                bank_account_id=account.id,
                statement_number=statement_data['statement_number'],
                statement_date=datetime.strptime(statement_data['statement_date'], '%Y-%m-%d').date(),
                period_start_date=datetime.strptime(statement_data['period_start_date'], '%Y-%m-%d').date(),
                period_end_date=datetime.strptime(statement_data['period_end_date'], '%Y-%m-%d').date(),
                opening_balance=Decimal(str(statement_data['opening_balance'])),
                closing_balance=Decimal(str(statement_data['closing_balance'])),
                status=StatementStatus.IMPORTED,
                created_by=statement_data.get('user_id')
            )
            self.db.add(statement)
            self.db.flush()
            
            # Import transactions
            transactions = statement_data.get('transactions', [])
            for txn_data in transactions:
                transaction = BankTransaction(
                    bank_account_id=account.id,
                    statement_id=statement.id,
                    transaction_date=datetime.strptime(txn_data['transaction_date'], '%Y-%m-%d').date(),
                    reference_number=txn_data.get('reference_number'),
                    description=txn_data['description'],
                    debit_amount=Decimal(str(txn_data.get('debit_amount', 0))),
                    credit_amount=Decimal(str(txn_data.get('credit_amount', 0))),
                    balance=Decimal(str(txn_data.get('balance', 0)))
                )
                self.db.add(transaction)
            
            self.db.commit()
            
            logger.info(f"Imported statement {statement.statement_number} with {len(transactions)} transactions")
            
            return {
                'success': True,
                'statement_id': statement.id,
                'statement_number': statement.statement_number,
                'transaction_count': len(transactions)
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error importing statement: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def match_transaction(self, match_data: Dict[str, Any]) -> Dict[str, Any]:
        """Match a bank transaction with a GL entry"""
        try:
            # Get bank transaction
            bank_txn = self.db.query(BankTransaction).filter_by(
                id=match_data['bank_transaction_id']
            ).first()
            if not bank_txn:
                return {'success': False, 'error': 'Bank transaction not found'}
            
            if bank_txn.is_reconciled:
                return {'success': False, 'error': 'Transaction already reconciled'}
            
            # Get GL entry
            gl_entry = self.db.query(JournalEntry).filter_by(
                id=match_data['gl_entry_id']
            ).first()
            if not gl_entry:
                return {'success': False, 'error': 'GL entry not found'}
            
            # Match
            bank_txn.gl_entry_id = gl_entry.id
            bank_txn.is_reconciled = True
            bank_txn.reconciled_at = date.today()
            bank_txn.reconciled_by = match_data.get('user_id')
            
            self.db.commit()
            
            logger.info(f"Matched bank transaction {bank_txn.id} with GL entry {gl_entry.id}")
            
            return {
                'success': True,
                'bank_transaction_id': bank_txn.id,
                'gl_entry_id': gl_entry.id
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error matching transaction: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def auto_match_transactions(self, statement_id: int) -> Dict[str, Any]:
        """Automatically match bank transactions with GL entries"""
        try:
            statement = self.db.query(BankStatement).filter_by(id=statement_id).first()
            if not statement:
                return {'success': False, 'error': 'Statement not found'}
            
            # Get unreconciled transactions
            unreconciled = self.db.query(BankTransaction).filter_by(
                statement_id=statement_id,
                is_reconciled=False
            ).all()
            
            matched_count = 0
            
            for bank_txn in unreconciled:
                # Try to find matching GL entry by amount and date
                amount = bank_txn.credit_amount - bank_txn.debit_amount
                
                # Look for GL entries around the same date (±3 days)
                date_range_start = bank_txn.transaction_date - timedelta(days=3)
                date_range_end = bank_txn.transaction_date + timedelta(days=3)
                
                # Find GL entries with matching amount
                gl_entries = self.db.query(JournalEntry).filter(
                    and_(
                        JournalEntry.entry_date >= date_range_start,
                        JournalEntry.entry_date <= date_range_end,
                        JournalEntry.reference.isnot(None)
                    )
                ).all()
                
                for gl_entry in gl_entries:
                    # Check if any line matches our bank account
                    for line in gl_entry.lines:
                        if line.account_number == statement.bank_account.gl_account_number:
                            line_amount = line.debit - line.credit
                            if abs(line_amount - amount) < Decimal('0.01'):  # Match within 1 cent
                                # Found a match
                                bank_txn.gl_entry_id = gl_entry.id
                                bank_txn.is_reconciled = True
                                bank_txn.reconciled_at = date.today()
                                matched_count += 1
                                break
                        
                        if bank_txn.is_reconciled:
                            break
            
            self.db.commit()
            
            logger.info(f"Auto-matched {matched_count} transactions")
            
            return {
                'success': True,
                'matched_count': matched_count,
                'total_transactions': len(unreconciled)
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error auto-matching transactions: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def complete_reconciliation(self, statement_id: int, user_id: int = None) -> Dict[str, Any]:
        """Complete reconciliation for a statement"""
        try:
            statement = self.db.query(BankStatement).filter_by(id=statement_id).first()
            if not statement:
                return {'success': False, 'error': 'Statement not found'}
            
            # Check if all transactions are reconciled
            unreconciled_count = self.db.query(BankTransaction).filter_by(
                statement_id=statement_id,
                is_reconciled=False
            ).count()
            
            if unreconciled_count > 0:
                return {
                    'success': False,
                    'error': f'{unreconciled_count} transactions still unreconciled'
                }
            
            # Mark statement as reconciled
            statement.status = StatementStatus.RECONCILED
            statement.reconciled_at = date.today()
            statement.reconciled_by = user_id
            
            # Update bank account
            account = statement.bank_account
            account.reconciled_balance = statement.closing_balance
            account.last_reconciled_date = statement.period_end_date
            
            self.db.commit()
            
            logger.info(f"Completed reconciliation for statement {statement.statement_number}")
            
            return {
                'success': True,
                'statement_number': statement.statement_number,
                'reconciled_balance': float(statement.closing_balance)
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error completing reconciliation: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_unreconciled_items(self, bank_account_id: int) -> Dict[str, Any]:
        """Get unreconciled items for a bank account"""
        try:
            account = self.db.query(BankAccount).filter_by(id=bank_account_id).first()
            if not account:
                return {'success': False, 'error': 'Bank account not found'}
            
            # Get unreconciled transactions
            unreconciled = self.db.query(BankTransaction).filter_by(
                bank_account_id=bank_account_id,
                is_reconciled=False
            ).order_by(BankTransaction.transaction_date).all()
            
            transactions = [
                {
                    'id': txn.id,
                    'transaction_date': txn.transaction_date.isoformat(),
                    'description': txn.description,
                    'reference': txn.reference_number,
                    'debit_amount': float(txn.debit_amount),
                    'credit_amount': float(txn.credit_amount),
                    'balance': float(txn.balance) if txn.balance else None
                }
                for txn in unreconciled
            ]
            
            total_debits = sum(float(t.debit_amount) for t in unreconciled)
            total_credits = sum(float(t.credit_amount) for t in unreconciled)
            
            return {
                'success': True,
                'account_code': account.account_code,
                'account_name': account.account_name,
                'unreconciled_transactions': transactions,
                'count': len(transactions),
                'total_debits': total_debits,
                'total_credits': total_credits,
                'net_difference': total_credits - total_debits
            }
            
        except Exception as e:
            logger.error(f"Error getting unreconciled items: {str(e)}")
            return {'success': False, 'error': str(e)}
