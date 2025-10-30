"""
Multi-Currency Bot - Handle multiple currencies and exchange rates
"""
import logging
from typing import Dict, Optional
from sqlalchemy.orm import Session
from datetime import datetime, date
from decimal import Decimal
from ..models.currency import Currency, ExchangeRate

logger = logging.getLogger(__name__)


class MultiCurrencyBot:
    def __init__(self, db: Session = None):
        self.bot_id = "multi_currency"
        self.name = "Multi-Currency Bot"
        self.description = "Manage currencies and exchange rates"
        self.db = db
        self.capabilities = ["create_currency", "set_exchange_rate", "convert_amount"]
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        if not self.db:
            return {'success': False, 'error': 'Database not available', 'bot_id': self.bot_id}
        
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'create_currency':
                data = context.get('currency_data', {})
                curr = Currency(
                    currency_code=data['currency_code'],
                    currency_name=data['currency_name'],
                    symbol=data.get('symbol', '')
                )
                self.db.add(curr)
                self.db.commit()
                return {'success': True, 'currency_id': curr.id, 'bot_id': self.bot_id}
            
            elif action == 'set_exchange_rate':
                data = context.get('rate_data', {})
                rate = ExchangeRate(
                    from_currency=data['from_currency'],
                    to_currency=data['to_currency'],
                    rate_date=datetime.strptime(data['rate_date'], '%Y-%m-%d').date(),
                    exchange_rate=Decimal(str(data['exchange_rate']))
                )
                self.db.add(rate)
                self.db.commit()
                return {'success': True, 'rate_id': rate.id, 'bot_id': self.bot_id}
            
            elif action == 'convert_amount':
                amount = Decimal(str(context.get('amount', 0)))
                from_curr = context.get('from_currency')
                to_curr = context.get('to_currency')
                
                # Get latest rate
                rate_obj = self.db.query(ExchangeRate).filter_by(
                    from_currency=from_curr,
                    to_currency=to_curr
                ).order_by(ExchangeRate.rate_date.desc()).first()
                
                if not rate_obj:
                    return {'success': False, 'error': 'Exchange rate not found', 'bot_id': self.bot_id}
                
                converted = amount * rate_obj.exchange_rate
                return {
                    'success': True,
                    'original_amount': float(amount),
                    'converted_amount': float(converted),
                    'exchange_rate': float(rate_obj.exchange_rate),
                    'bot_id': self.bot_id
                }
            
            return {'success': False, 'error': f'Unknown action: {action}', 'bot_id': self.bot_id}
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error in Multi-Currency bot: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
