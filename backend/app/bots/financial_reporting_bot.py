"""
Financial Reporting Bot - Generates financial reports from GL
"""
import logging
from typing import Dict, Optional
from sqlalchemy.orm import Session
from ..services.general_ledger_service import GeneralLedgerService

logger = logging.getLogger(__name__)


class FinancialReportingBot:
    def __init__(self, db: Session = None):
        self.bot_id = "financial_reporting"
        self.name = "Financial Reporting Bot"
        self.description = "Generate financial reports and statements"
        self.db = db
        self.gl_service = GeneralLedgerService(db) if db else None
        self.capabilities = ["income_statement", "balance_sheet", "cash_flow", "trial_balance"]
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        if not self.gl_service:
            return {'success': False, 'error': 'Database not available', 'bot_id': self.bot_id}
        
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'income_statement':
                result = self.gl_service.generate_income_statement(
                    context.get('start_date'), context.get('end_date')
                )
            elif action == 'balance_sheet':
                result = self.gl_service.generate_balance_sheet(context.get('as_of_date'))
            elif action == 'cash_flow':
                result = self.gl_service.generate_cash_flow_statement(
                    context.get('start_date'), context.get('end_date')
                )
            elif action == 'trial_balance':
                result = self.gl_service.generate_trial_balance(context.get('as_of_date'))
            else:
                return {'success': False, 'error': f'Unknown action: {action}', 'bot_id': self.bot_id}
            
            result['bot_id'] = self.bot_id
            return result
        except Exception as e:
            logger.error(f"Error in Financial Reporting bot: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
