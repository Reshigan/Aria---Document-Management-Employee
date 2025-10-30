"""
Bank Reconciliation Bot - REAL IMPLEMENTATION
Automate bank statement import and transaction matching

Features:
- Import bank statements
- Auto-match transactions with GL entries
- Manual transaction matching
- Complete reconciliation
- Track unreconciled items
"""
import logging
from typing import Dict, Optional, Any
from sqlalchemy.orm import Session

from ..services.bank_reconciliation_service import BankReconciliationService

logger = logging.getLogger(__name__)


class BankReconciliationBot:
    """Bank Reconciliation Bot - Real statement import and matching"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "bank_reconciliation"
        self.name = "Bank Reconciliation Bot"
        self.description = "Automate bank reconciliation with real database operations"
        self.db = db
        self.recon_service = BankReconciliationService(db) if db else None
        self.capabilities = [
            "create_bank_account",
            "import_statement",
            "auto_match",
            "match_transaction",
            "complete_reconciliation",
            "unreconciled_items"
        ]
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        """Execute bot query asynchronously"""
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        """
        Execute bank reconciliation operations
        
        Supported actions:
        - create_bank_account: Register a bank account
        - import_statement: Import bank statement with transactions
        - auto_match: Auto-match transactions with GL entries
        - match_transaction: Manually match a transaction
        - complete_reconciliation: Complete statement reconciliation
        - unreconciled_items: Get unreconciled transactions
        """
        if not self.recon_service:
            return {
                'success': False,
                'error': 'Database connection not available',
                'bot_id': self.bot_id
            }
        
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'create_bank_account':
                return self._create_bank_account(context.get('account_data', {}))
            elif action == 'import_statement':
                return self._import_statement(context.get('statement_data', {}))
            elif action == 'auto_match':
                return self._auto_match(context.get('statement_id'))
            elif action == 'match_transaction':
                return self._match_transaction(context.get('match_data', {}))
            elif action == 'complete_reconciliation':
                return self._complete_reconciliation(
                    context.get('statement_id'),
                    context.get('user_id')
                )
            elif action == 'unreconciled_items':
                return self._unreconciled_items(context.get('bank_account_id'))
            else:
                return {
                    'success': False,
                    'error': f'Unknown action: {action}',
                    'supported_actions': self.capabilities,
                    'bot_id': self.bot_id
                }
        except Exception as e:
            logger.error(f"Error in Bank Reconciliation bot: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'bot_id': self.bot_id
            }
    
    def _create_bank_account(self, account_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a bank account"""
        logger.info(f"Creating bank account: {account_data.get('account_name')}")
        result = self.recon_service.create_bank_account(account_data)
        result['bot_id'] = self.bot_id
        return result
    
    def _import_statement(self, statement_data: Dict[str, Any]) -> Dict[str, Any]:
        """Import bank statement"""
        logger.info(f"Importing statement: {statement_data.get('statement_number')}")
        result = self.recon_service.import_statement(statement_data)
        result['bot_id'] = self.bot_id
        return result
    
    def _auto_match(self, statement_id: int) -> Dict[str, Any]:
        """Auto-match transactions"""
        logger.info(f"Auto-matching transactions for statement ID: {statement_id}")
        result = self.recon_service.auto_match_transactions(statement_id)
        result['bot_id'] = self.bot_id
        return result
    
    def _match_transaction(self, match_data: Dict[str, Any]) -> Dict[str, Any]:
        """Manually match transaction"""
        logger.info(f"Matching transaction ID: {match_data.get('bank_transaction_id')}")
        result = self.recon_service.match_transaction(match_data)
        result['bot_id'] = self.bot_id
        return result
    
    def _complete_reconciliation(self, statement_id: int, user_id: int = None) -> Dict[str, Any]:
        """Complete reconciliation"""
        logger.info(f"Completing reconciliation for statement ID: {statement_id}")
        result = self.recon_service.complete_reconciliation(statement_id, user_id)
        result['bot_id'] = self.bot_id
        return result
    
    def _unreconciled_items(self, bank_account_id: int) -> Dict[str, Any]:
        """Get unreconciled items"""
        logger.info(f"Getting unreconciled items for account ID: {bank_account_id}")
        result = self.recon_service.get_unreconciled_items(bank_account_id)
        result['bot_id'] = self.bot_id
        return result
