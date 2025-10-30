"""
Budget Service - Real Implementation
Handles budget creation, variance analysis, and tracking
"""

from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Optional, Any
import logging

from ..models.budget import Budget, BudgetLine, BudgetStatus
from ..models.journal_entry import JournalEntry, JournalEntryLine


logger = logging.getLogger(__name__)


class BudgetService:
    """Service for managing budgets and variance analysis"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_budget(self, budget_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new budget"""
        try:
            # Generate budget code if not provided
            if 'budget_code' not in budget_data:
                budget_data['budget_code'] = self._generate_budget_code(budget_data['fiscal_year'])
            
            # Check for duplicate
            existing = self.db.query(Budget).filter_by(
                budget_code=budget_data['budget_code']
            ).first()
            if existing:
                return {
                    'success': False,
                    'error': f"Budget code {budget_data['budget_code']} already exists"
                }
            
            # Calculate total budget
            lines = budget_data.get('lines', [])
            total_budget = sum(Decimal(str(line['budget_amount'])) for line in lines)
            
            # Create budget
            budget = Budget(
                budget_code=budget_data['budget_code'],
                budget_name=budget_data['budget_name'],
                description=budget_data.get('description', ''),
                fiscal_year=budget_data['fiscal_year'],
                start_date=datetime.strptime(budget_data['start_date'], '%Y-%m-%d').date(),
                end_date=datetime.strptime(budget_data['end_date'], '%Y-%m-%d').date(),
                department=budget_data.get('department'),
                cost_center=budget_data.get('cost_center'),
                business_unit=budget_data.get('business_unit'),
                total_budget_amount=total_budget,
                total_available_amount=total_budget,
                status=BudgetStatus.DRAFT,
                created_by=budget_data.get('user_id')
            )
            self.db.add(budget)
            self.db.flush()
            
            # Create budget lines
            for line_data in lines:
                budget_amount = Decimal(str(line_data['budget_amount']))
                line = BudgetLine(
                    budget_id=budget.id,
                    account_number=line_data['account_number'],
                    line_description=line_data.get('line_description', ''),
                    budget_amount=budget_amount,
                    available_amount=budget_amount,
                    cost_center=line_data.get('cost_center'),
                    project_code=line_data.get('project_code'),
                    department=line_data.get('department')
                )
                self.db.add(line)
            
            self.db.commit()
            self.db.refresh(budget)
            
            logger.info(f"Created budget: {budget.budget_code} for FY{budget.fiscal_year}")
            
            return {
                'success': True,
                'budget_id': budget.id,
                'budget_code': budget.budget_code,
                'fiscal_year': budget.fiscal_year,
                'total_budget': float(total_budget)
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating budget: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def approve_budget(self, budget_id: int, user_id: int = None) -> Dict[str, Any]:
        """Approve a budget"""
        try:
            budget = self.db.query(Budget).filter_by(id=budget_id).first()
            if not budget:
                return {'success': False, 'error': 'Budget not found'}
            
            if budget.status == BudgetStatus.APPROVED:
                return {'success': False, 'error': 'Budget already approved'}
            
            budget.status = BudgetStatus.APPROVED
            budget.approved_at = date.today()
            budget.approved_by = user_id
            
            self.db.commit()
            
            logger.info(f"Approved budget: {budget.budget_code}")
            
            return {
                'success': True,
                'budget_code': budget.budget_code,
                'approved_at': budget.approved_at.isoformat()
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error approving budget: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def update_actuals(self, budget_id: int) -> Dict[str, Any]:
        """Update budget with actual spending from GL"""
        try:
            budget = self.db.query(Budget).filter_by(id=budget_id).first()
            if not budget:
                return {'success': False, 'error': 'Budget not found'}
            
            # Get all budget lines
            lines = self.db.query(BudgetLine).filter_by(budget_id=budget_id).all()
            
            total_actual = Decimal('0')
            
            for line in lines:
                # Query GL for actual spending
                actual = self.db.query(
                    func.sum(JournalEntryLine.debit - JournalEntryLine.credit)
                ).join(JournalEntry).filter(
                    and_(
                        JournalEntryLine.account_number == line.account_number,
                        JournalEntry.entry_date >= budget.start_date,
                        JournalEntry.entry_date <= budget.end_date
                    )
                ).scalar() or Decimal('0')
                
                # Update line
                line.actual_amount = actual
                line.available_amount = line.budget_amount - actual - line.committed_amount
                line.variance_amount = line.budget_amount - actual
                if line.budget_amount != 0:
                    line.variance_percent = (line.variance_amount / line.budget_amount) * Decimal('100')
                
                total_actual += actual
            
            # Update budget totals
            budget.total_actual_amount = total_actual
            budget.total_available_amount = budget.total_budget_amount - total_actual - budget.total_committed_amount
            
            self.db.commit()
            
            logger.info(f"Updated actuals for budget: {budget.budget_code}")
            
            return {
                'success': True,
                'budget_code': budget.budget_code,
                'total_budget': float(budget.total_budget_amount),
                'total_actual': float(total_actual),
                'total_available': float(budget.total_available_amount),
                'utilization_percent': float((total_actual / budget.total_budget_amount) * Decimal('100')) if budget.total_budget_amount else 0
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating actuals: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_variance_report(self, budget_id: int) -> Dict[str, Any]:
        """Generate budget variance report"""
        try:
            budget = self.db.query(Budget).filter_by(id=budget_id).first()
            if not budget:
                return {'success': False, 'error': 'Budget not found'}
            
            # Get budget lines with variances
            lines = self.db.query(BudgetLine).filter_by(budget_id=budget_id).all()
            
            variance_lines = [
                {
                    'account_number': line.account_number,
                    'description': line.line_description,
                    'budget_amount': float(line.budget_amount),
                    'actual_amount': float(line.actual_amount),
                    'variance_amount': float(line.variance_amount),
                    'variance_percent': float(line.variance_percent),
                    'available_amount': float(line.available_amount),
                    'over_budget': line.actual_amount > line.budget_amount
                }
                for line in lines
            ]
            
            # Calculate summary
            over_budget_lines = [l for l in variance_lines if l['over_budget']]
            under_budget_lines = [l for l in variance_lines if not l['over_budget']]
            
            return {
                'success': True,
                'budget_code': budget.budget_code,
                'budget_name': budget.budget_name,
                'fiscal_year': budget.fiscal_year,
                'period': f"{budget.start_date.isoformat()} to {budget.end_date.isoformat()}",
                'summary': {
                    'total_budget': float(budget.total_budget_amount),
                    'total_actual': float(budget.total_actual_amount),
                    'total_variance': float(budget.total_budget_amount - budget.total_actual_amount),
                    'utilization_percent': float((budget.total_actual_amount / budget.total_budget_amount) * Decimal('100')) if budget.total_budget_amount else 0,
                    'over_budget_lines': len(over_budget_lines),
                    'under_budget_lines': len(under_budget_lines)
                },
                'variance_lines': variance_lines
            }
            
        except Exception as e:
            logger.error(f"Error generating variance report: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def check_budget_availability(self, account_number: str, amount: Decimal, 
                                  fiscal_year: int = None) -> Dict[str, Any]:
        """Check if budget is available for a transaction"""
        try:
            # Get current fiscal year if not provided
            if not fiscal_year:
                today = date.today()
                fiscal_year = today.year
            
            # Find active budget
            budget = self.db.query(Budget).filter(
                and_(
                    Budget.fiscal_year == fiscal_year,
                    Budget.status.in_([BudgetStatus.APPROVED, BudgetStatus.ACTIVE]),
                    Budget.start_date <= date.today(),
                    Budget.end_date >= date.today()
                )
            ).first()
            
            if not budget:
                return {
                    'success': True,
                    'budget_available': True,
                    'message': 'No active budget found - transaction allowed'
                }
            
            # Find budget line
            line = self.db.query(BudgetLine).filter(
                and_(
                    BudgetLine.budget_id == budget.id,
                    BudgetLine.account_number == account_number
                )
            ).first()
            
            if not line:
                return {
                    'success': True,
                    'budget_available': True,
                    'message': 'No budget line for this account - transaction allowed'
                }
            
            # Check availability
            available = line.available_amount
            budget_available = available >= amount
            
            return {
                'success': True,
                'budget_available': budget_available,
                'budget_line_id': line.id,
                'budgeted_amount': float(line.budget_amount),
                'actual_amount': float(line.actual_amount),
                'available_amount': float(available),
                'requested_amount': float(amount),
                'shortfall': float(amount - available) if not budget_available else 0,
                'message': 'Budget available' if budget_available else 'Insufficient budget'
            }
            
        except Exception as e:
            logger.error(f"Error checking budget availability: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _generate_budget_code(self, fiscal_year: int) -> str:
        """Generate unique budget code"""
        prefix = f"BUD-FY{fiscal_year}"
        
        # Get count for this fiscal year
        count = self.db.query(func.count(Budget.id)).filter(
            Budget.budget_code.like(f"{prefix}%")
        ).scalar()
        
        return f"{prefix}-{count + 1:03d}"
