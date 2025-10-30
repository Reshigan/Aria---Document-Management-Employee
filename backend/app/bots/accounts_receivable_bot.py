"""
Accounts Receivable Bot - REAL IMPLEMENTATION
Automate customer invoicing, payment tracking, and collections

Features:
- Create customer invoices with GL posting
- Record customer payments
- Generate aging reports
- Customer management
- Credit limit enforcement
- Real database operations
"""
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session

from ..services.accounts_receivable_service import AccountsReceivableService

logger = logging.getLogger(__name__)


class AccountsReceivableBot:
    """Accounts Receivable Bot - Real customer invoicing and payment tracking"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "accounts_receivable"
        self.name = "Accounts Receivable Bot"
        self.description = "Automate customer invoicing and payment tracking with real database operations"
        self.db = db
        self.ar_service = AccountsReceivableService(db) if db else None
        self.capabilities = [
            "create_customer",
            "create_invoice",
            "record_payment",
            "aging_report",
            "customer_balance"
        ]
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        """Execute bot query asynchronously"""
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        """
        Execute accounts receivable operations with REAL database operations
        
        Supported actions:
        - create_customer: Create a new customer
        - create_invoice: Create customer invoice and post to GL
        - record_payment: Record customer payment
        - aging_report: Generate AR aging report
        - customer_balance: Get customer balance and outstanding invoices
        """
        if not self.ar_service:
            return {
                'success': False,
                'error': 'Database connection not available',
                'bot_id': self.bot_id
            }
        
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'create_customer':
                return self._create_customer(context.get('customer_data', {}))
            elif action == 'create_invoice':
                return self._create_invoice(context.get('invoice_data', {}))
            elif action == 'record_payment':
                return self._record_payment(context.get('payment_data', {}))
            elif action == 'aging_report':
                return self._aging_report(context.get('as_of_date'))
            elif action == 'customer_balance':
                return self._customer_balance(context.get('customer_id'))
            else:
                return {
                    'success': False,
                    'error': f'Unknown action: {action}',
                    'supported_actions': self.capabilities,
                    'bot_id': self.bot_id
                }
        except Exception as e:
            logger.error(f"Error in AR bot: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'bot_id': self.bot_id
            }
    
    def _create_customer(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new customer"""
        logger.info(f"Creating customer: {customer_data.get('name')}")
        result = self.ar_service.create_customer(customer_data)
        result['bot_id'] = self.bot_id
        return result
    
    def _create_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create customer invoice and post to GL"""
        logger.info(f"Creating invoice: {invoice_data.get('invoice_number')}")
        result = self.ar_service.create_invoice(invoice_data)
        result['bot_id'] = self.bot_id
        return result
    
    def _record_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Record customer payment"""
        logger.info(f"Recording payment for invoice ID: {payment_data.get('invoice_id')}")
        result = self.ar_service.record_payment(payment_data)
        result['bot_id'] = self.bot_id
        return result
    
    def _aging_report(self, as_of_date: str = None) -> Dict[str, Any]:
        """Generate AR aging report"""
        logger.info(f"Generating AR aging report as of: {as_of_date or 'today'}")
        result = self.ar_service.get_aging_report(as_of_date)
        result['bot_id'] = self.bot_id
        return result
    
    def _customer_balance(self, customer_id: int) -> Dict[str, Any]:
        """Get customer balance"""
        logger.info(f"Getting balance for customer ID: {customer_id}")
        result = self.ar_service.get_customer_balance(customer_id)
        result['bot_id'] = self.bot_id
        return result
