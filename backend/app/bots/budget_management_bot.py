"""
Budget Management Bot - REAL IMPLEMENTATION
Automate budget creation, tracking, and variance analysis

Features:
- Create and approve budgets
- Update actuals from GL
- Variance analysis and reporting
- Budget availability checking
- Real database operations
"""
import logging
from typing import Dict, Optional, Any
from sqlalchemy.orm import Session
from decimal import Decimal

from ..services.budget_service import BudgetService

logger = logging.getLogger(__name__)


class BudgetManagementBot:
    """Budget Management Bot - Real budget tracking and analysis"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "budget_management"
        self.name = "Budget Management Bot"
        self.description = "Automate budget management with real database operations"
        self.db = db
        self.budget_service = BudgetService(db) if db else None
        self.capabilities = [
            "create_budget",
            "approve_budget",
            "update_actuals",
            "variance_report",
            "check_availability"
        ]
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        """Execute bot query asynchronously"""
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        """
        Execute budget management operations
        
        Supported actions:
        - create_budget: Create a new budget
        - approve_budget: Approve a budget
        - update_actuals: Update budget with GL actuals
        - variance_report: Generate variance analysis
        - check_availability: Check budget availability
        """
        if not self.budget_service:
            return {
                'success': False,
                'error': 'Database connection not available',
                'bot_id': self.bot_id
            }
        
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'create_budget':
                return self._create_budget(context.get('budget_data', {}))
            elif action == 'approve_budget':
                return self._approve_budget(
                    context.get('budget_id'),
                    context.get('user_id')
                )
            elif action == 'update_actuals':
                return self._update_actuals(context.get('budget_id'))
            elif action == 'variance_report':
                return self._variance_report(context.get('budget_id'))
            elif action == 'check_availability':
                return self._check_availability(
                    context.get('account_number'),
                    context.get('amount'),
                    context.get('fiscal_year')
                )
            else:
                return {
                    'success': False,
                    'error': f'Unknown action: {action}',
                    'supported_actions': self.capabilities,
                    'bot_id': self.bot_id
                }
        except Exception as e:
            logger.error(f"Error in Budget Management bot: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'bot_id': self.bot_id
            }
    
    def _create_budget(self, budget_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new budget"""
        logger.info(f"Creating budget: {budget_data.get('budget_name')}")
        result = self.budget_service.create_budget(budget_data)
        result['bot_id'] = self.bot_id
        return result
    
    def _approve_budget(self, budget_id: int, user_id: int = None) -> Dict[str, Any]:
        """Approve a budget"""
        logger.info(f"Approving budget ID: {budget_id}")
        result = self.budget_service.approve_budget(budget_id, user_id)
        result['bot_id'] = self.bot_id
        return result
    
    def _update_actuals(self, budget_id: int) -> Dict[str, Any]:
        """Update budget with actuals"""
        logger.info(f"Updating actuals for budget ID: {budget_id}")
        result = self.budget_service.update_actuals(budget_id)
        result['bot_id'] = self.bot_id
        return result
    
    def _variance_report(self, budget_id: int) -> Dict[str, Any]:
        """Generate variance report"""
        logger.info(f"Generating variance report for budget ID: {budget_id}")
        result = self.budget_service.get_variance_report(budget_id)
        result['bot_id'] = self.bot_id
        return result
    
    def _check_availability(self, account_number: str, amount: float, 
                           fiscal_year: int = None) -> Dict[str, Any]:
        """Check budget availability"""
        logger.info(f"Checking budget availability for account: {account_number}")
        result = self.budget_service.check_budget_availability(
            account_number,
            Decimal(str(amount)),
            fiscal_year
        )
        result['bot_id'] = self.bot_id
        return result
