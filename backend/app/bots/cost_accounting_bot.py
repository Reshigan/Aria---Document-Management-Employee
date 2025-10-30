"""
Cost Accounting Bot - Track costs by cost center
"""
import logging
from typing import Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime
from decimal import Decimal
from ..models.cost_center import CostCenter, CostAllocation

logger = logging.getLogger(__name__)


class CostAccountingBot:
    def __init__(self, db: Session = None):
        self.bot_id = "cost_accounting"
        self.name = "Cost Accounting Bot"
        self.description = "Track and allocate costs by cost center"
        self.db = db
        self.capabilities = ["create_cost_center", "allocate_cost", "cost_report"]
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        if not self.db:
            return {'success': False, 'error': 'Database not available', 'bot_id': self.bot_id}
        
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'create_cost_center':
                data = context.get('cost_center_data', {})
                cc = CostCenter(
                    cost_center_code=data['cost_center_code'],
                    cost_center_name=data['cost_center_name'],
                    description=data.get('description', '')
                )
                self.db.add(cc)
                self.db.commit()
                return {'success': True, 'cost_center_id': cc.id, 'bot_id': self.bot_id}
            
            elif action == 'allocate_cost':
                data = context.get('allocation_data', {})
                alloc = CostAllocation(
                    cost_center_id=data['cost_center_id'],
                    allocation_date=datetime.strptime(data['allocation_date'], '%Y-%m-%d').date(),
                    account_number=data['account_number'],
                    amount=Decimal(str(data['amount'])),
                    description=data.get('description', '')
                )
                self.db.add(alloc)
                self.db.commit()
                return {'success': True, 'allocation_id': alloc.id, 'bot_id': self.bot_id}
            
            elif action == 'cost_report':
                cc_id = context.get('cost_center_id')
                total = self.db.query(func.sum(CostAllocation.amount)).filter_by(
                    cost_center_id=cc_id
                ).scalar() or 0
                return {'success': True, 'total_cost': float(total), 'bot_id': self.bot_id}
            
            return {'success': False, 'error': f'Unknown action: {action}', 'bot_id': self.bot_id}
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error in Cost Accounting bot: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
