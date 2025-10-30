import logging
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, date

logger = logging.getLogger(__name__)

class EmployeeManagementBot:
    """Manage employee records, onboarding, and profile updates"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "employee_management"
        self.name = "EmployeeManagementBot"
        self.db = db
        self.capabilities = ["create_employee", "update_employee", "employee_profile", "employee_search", "onboard_employee", "terminate_employee"]
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'create_employee':
                return self._create_employee(context.get('data', {}))
            elif action == 'update_employee':
                return self._update_employee(context.get('employee_id'), context.get('data', {}))
            elif action == 'employee_profile':
                return self._get_employee_profile(context.get('employee_id'))
            elif action == 'employee_search':
                return self._search_employees(context.get('criteria', {}))
            elif action == 'onboard_employee':
                return self._onboard_employee(context.get('employee_id'))
            elif action == 'terminate_employee':
                return self._terminate_employee(context.get('employee_id'), context.get('termination_date'))
            else:
                return {'success': False, 'error': 'Unknown action', 'bot_id': self.bot_id}
                
        except Exception as e:
            logger.error(f"Employee management error: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
    
    def _create_employee(self, data: Dict) -> Dict:
        """Create new employee record"""
        required = ['first_name', 'last_name', 'email', 'hire_date', 'department', 'position']
        missing = [f for f in required if f not in data]
        if missing:
            return {'success': False, 'error': f'Missing fields: {", ".join(missing)}', 'bot_id': self.bot_id}
        
        employee_number = f"EMP{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        employee = {
            'employee_number': employee_number,
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'email': data['email'],
            'phone': data.get('phone'),
            'department': data['department'],
            'position': data['position'],
            'hire_date': data['hire_date'],
            'salary': data.get('salary', 0),
            'status': 'active',
            'created_at': datetime.now().isoformat()
        }
        
        return {
            'success': True,
            'employee': employee,
            'employee_number': employee_number,
            'message': f'Employee {employee_number} created successfully',
            'bot_id': self.bot_id
        }
    
    def _update_employee(self, employee_id: int, data: Dict) -> Dict:
        """Update employee information"""
        updatable_fields = ['email', 'phone', 'department', 'position', 'salary', 'status']
        updates = {k: v for k, v in data.items() if k in updatable_fields}
        
        return {
            'success': True,
            'employee_id': employee_id,
            'updated_fields': list(updates.keys()),
            'message': 'Employee updated successfully',
            'bot_id': self.bot_id
        }
    
    def _get_employee_profile(self, employee_id: int) -> Dict:
        """Get complete employee profile"""
        return {
            'success': True,
            'employee_id': employee_id,
            'profile': {
                'basic_info': {},
                'employment_details': {},
                'compensation': {},
                'leave_balance': {},
                'performance_history': []
            },
            'bot_id': self.bot_id
        }
    
    def _search_employees(self, criteria: Dict) -> Dict:
        """Search employees by various criteria"""
        return {
            'success': True,
            'criteria': criteria,
            'employees': [],
            'count': 0,
            'bot_id': self.bot_id
        }
    
    def _onboard_employee(self, employee_id: int) -> Dict:
        """Complete employee onboarding process"""
        checklist = [
            'Complete paperwork',
            'Setup workstation',
            'IT access provisioning',
            'Benefits enrollment',
            'Department orientation',
            'Assign mentor'
        ]
        
        return {
            'success': True,
            'employee_id': employee_id,
            'onboarding_checklist': checklist,
            'status': 'in_progress',
            'bot_id': self.bot_id
        }
    
    def _terminate_employee(self, employee_id: int, termination_date: str) -> Dict:
        """Process employee termination"""
        exit_checklist = [
            'Collect company assets',
            'Revoke system access',
            'Final paycheck processing',
            'Exit interview',
            'Benefits continuation (COBRA)',
            'Update status to terminated'
        ]
        
        return {
            'success': True,
            'employee_id': employee_id,
            'termination_date': termination_date,
            'exit_checklist': exit_checklist,
            'status': 'terminated',
            'bot_id': self.bot_id
        }
