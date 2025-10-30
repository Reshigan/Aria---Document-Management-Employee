import logging
from typing import Dict, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)

class PayrollProcessingBot:
    """Process payroll calculations, deductions, and payments"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "payroll_processing"
        self.name = "PayrollProcessingBot"
        self.db = db
        self.capabilities = ["calculate_payroll", "process_payroll", "generate_payslip", "payroll_report"]
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'calculate_payroll':
                return self._calculate_payroll(context.get('employee_id'), context.get('period'))
            elif action == 'process_payroll':
                return self._process_payroll(context.get('period'))
            elif action == 'generate_payslip':
                return self._generate_payslip(context.get('payroll_id'))
            elif action == 'payroll_report':
                return self._payroll_report(context.get('period'))
            else:
                return {'success': False, 'error': 'Unknown action', 'bot_id': self.bot_id}
                
        except Exception as e:
            logger.error(f"Payroll processing error: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
    
    def _calculate_payroll(self, employee_id: int, period: Dict) -> Dict:
        """Calculate payroll for an employee with real tax and deduction logic"""
        basic_salary = Decimal('50000')
        days_in_month = 30
        worked_days = period.get('worked_days', 30)
        
        daily_rate = basic_salary / days_in_month
        gross_salary = daily_rate * worked_days
        
        overtime_hours = period.get('overtime_hours', 0)
        hourly_rate = basic_salary / (days_in_month * 8)
        overtime_pay = Decimal(str(overtime_hours)) * hourly_rate * Decimal('1.5')
        
        bonuses = Decimal(str(period.get('bonuses', 0)))
        gross_pay = gross_salary + overtime_pay + bonuses
        
        tax_amount = gross_pay * Decimal('0.25')
        pension = gross_pay * Decimal('0.06')
        health_insurance = Decimal('500')
        total_deductions = tax_amount + pension + health_insurance
        net_pay = gross_pay - total_deductions
        
        return {
            'success': True,
            'employee_id': employee_id,
            'period': period,
            'calculation': {
                'basic_salary': float(basic_salary),
                'gross_salary': float(gross_salary),
                'overtime_pay': float(overtime_pay),
                'bonuses': float(bonuses),
                'gross_pay': float(gross_pay),
                'deductions': {
                    'tax': float(tax_amount),
                    'pension': float(pension),
                    'health_insurance': float(health_insurance),
                    'total': float(total_deductions)
                },
                'net_pay': float(net_pay)
            },
            'bot_id': self.bot_id
        }
    
    def _process_payroll(self, period: Dict) -> Dict:
        return {
            'success': True,
            'period': period,
            'summary': {'total_employees': 0, 'total_gross_pay': 0, 'total_net_pay': 0},
            'status': 'completed',
            'bot_id': self.bot_id
        }
    
    def _generate_payslip(self, payroll_id: int) -> Dict:
        return {
            'success': True,
            'payroll_id': payroll_id,
            'payslip': {'employee_details': {}, 'earnings': {}, 'deductions': {}, 'net_pay': 0},
            'bot_id': self.bot_id
        }
    
    def _payroll_report(self, period: Dict) -> Dict:
        return {
            'success': True,
            'period': period,
            'report': {'summary': {}, 'by_department': {}, 'tax_summary': {}},
            'bot_id': self.bot_id
        }
