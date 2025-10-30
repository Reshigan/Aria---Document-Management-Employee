import logging
from typing import Dict, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class LeaveManagementBot:
    """Manage employee leave requests, approvals, and balance tracking"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "leave_management"
        self.name = "LeaveManagementBot"
        self.db = db
        self.capabilities = ["request_leave", "approve_leave", "leave_balance", "leave_calendar"]
        
        self.leave_types = {
            'annual': {'days_per_year': 20, 'requires_approval': True},
            'sick': {'days_per_year': 10, 'requires_approval': False},
            'unpaid': {'days_per_year': None, 'requires_approval': True}
        }
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'request_leave':
                return self._request_leave(context.get('data', {}))
            elif action == 'approve_leave':
                return self._approve_leave(context.get('leave_id'))
            elif action == 'leave_balance':
                return self._leave_balance(context.get('employee_id'))
            elif action == 'leave_calendar':
                return self._leave_calendar(context.get('department'))
            else:
                return {'success': False, 'error': 'Unknown action', 'bot_id': self.bot_id}
                
        except Exception as e:
            logger.error(f"Leave management error: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
    
    def _request_leave(self, data: Dict) -> Dict:
        """Submit leave request with validation"""
        required = ['employee_id', 'leave_type', 'start_date', 'end_date']
        missing = [f for f in required if f not in data]
        if missing:
            return {'success': False, 'error': f'Missing fields: {", ".join(missing)}', 'bot_id': self.bot_id}
        
        leave_type = data['leave_type']
        if leave_type not in self.leave_types:
            return {'success': False, 'error': f'Invalid leave type: {leave_type}', 'bot_id': self.bot_id}
        
        start = datetime.fromisoformat(data['start_date'])
        end = datetime.fromisoformat(data['end_date'])
        days = (end - start).days + 1
        
        requires_approval = self.leave_types[leave_type]['requires_approval']
        
        return {
            'success': True,
            'leave_request': {
                'employee_id': data['employee_id'],
                'leave_type': leave_type,
                'start_date': data['start_date'],
                'end_date': data['end_date'],
                'days': days,
                'status': 'pending' if requires_approval else 'approved'
            },
            'requires_approval': requires_approval,
            'bot_id': self.bot_id
        }
    
    def _approve_leave(self, leave_id: int) -> Dict:
        return {
            'success': True,
            'leave_id': leave_id,
            'status': 'approved',
            'approved_at': datetime.now().isoformat(),
            'bot_id': self.bot_id
        }
    
    def _leave_balance(self, employee_id: int) -> Dict:
        balances = {}
        for leave_type, config in self.leave_types.items():
            if config['days_per_year']:
                balances[leave_type] = {
                    'total': config['days_per_year'],
                    'used': 0,
                    'remaining': config['days_per_year']
                }
        
        return {
            'success': True,
            'employee_id': employee_id,
            'balances': balances,
            'bot_id': self.bot_id
        }
    
    def _leave_calendar(self, department: Optional[str]) -> Dict:
        return {
            'success': True,
            'department': department,
            'leave_schedule': [],
            'bot_id': self.bot_id
        }
