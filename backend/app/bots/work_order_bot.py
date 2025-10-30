import logging
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)

class WorkOrderBot:
    """Manufacturing Work Order management - create, schedule, track, close"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "work_order"
        self.name = "WorkOrderBot"
        self.db = db
        self.capabilities = [
            "create_work_order", "schedule_work_order", "issue_materials", "record_production",
            "close_work_order", "work_order_status", "capacity_planning"
        ]
        self.statuses = ['planned', 'released', 'in_progress', 'completed', 'closed']
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'create_work_order':
                return self._create_work_order(context.get('data', {}))
            elif action == 'schedule_work_order':
                return self._schedule_work_order(context.get('wo_id'), context.get('schedule', {}))
            elif action == 'issue_materials':
                return self._issue_materials(context.get('wo_id'), context.get('materials', []))
            elif action == 'record_production':
                return self._record_production(context.get('wo_id'), context.get('production_data', {}))
            elif action == 'close_work_order':
                return self._close_work_order(context.get('wo_id'))
            elif action == 'work_order_status':
                return self._work_order_status(context.get('wo_id'))
            elif action == 'capacity_planning':
                return self._capacity_planning(context.get('period'), context.get('workcenter_id'))
            else:
                return {'success': False, 'error': 'Unknown action', 'bot_id': self.bot_id}
                
        except Exception as e:
            logger.error(f"Work order error: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
    
    def _create_work_order(self, data: Dict) -> Dict:
        """Create manufacturing work order"""
        required = ['product_id', 'quantity', 'due_date']
        missing = [f for f in required if f not in data]
        if missing:
            return {'success': False, 'error': f'Missing: {", ".join(missing)}', 'bot_id': self.bot_id}
        
        wo = {
            'work_order_number': f"WO-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'product_id': data['product_id'],
            'product_name': data.get('product_name'),
            'quantity_ordered': Decimal(str(data['quantity'])),
            'quantity_completed': Decimal('0'),
            'quantity_scrapped': Decimal('0'),
            'status': 'planned',
            'priority': data.get('priority', 'normal'),
            'due_date': data['due_date'],
            'start_date': data.get('start_date'),
            'workcenter': data.get('workcenter'),
            'created_at': datetime.now().isoformat()
        }
        
        return {
            'success': True,
            'work_order': wo,
            'message': f"Work Order {wo['work_order_number']} created",
            'next_steps': ['Schedule', 'Issue materials', 'Start production'],
            'bot_id': self.bot_id
        }
    
    def _schedule_work_order(self, wo_id: int, schedule: Dict) -> Dict:
        """Schedule work order on work centers"""
        scheduling = {
            'wo_id': wo_id,
            'start_date': schedule.get('start_date'),
            'end_date': schedule.get('end_date'),
            'workcenter_allocations': [],
            'constraints': schedule.get('constraints', [])
        }
        
        return {
            'success': True,
            'scheduling': scheduling,
            'status': 'scheduled',
            'bot_id': self.bot_id
        }
    
    def _issue_materials(self, wo_id: int, materials: List[Dict]) -> Dict:
        """Issue materials to work order"""
        issued_materials = []
        
        for material in materials:
            issued = {
                'material_id': material['material_id'],
                'quantity_issued': material['quantity'],
                'lot_number': material.get('lot_number'),
                'issued_at': datetime.now().isoformat()
            }
            issued_materials.append(issued)
        
        return {
            'success': True,
            'wo_id': wo_id,
            'issued_materials': issued_materials,
            'total_items': len(issued_materials),
            'bot_id': self.bot_id
        }
    
    def _record_production(self, wo_id: int, production_data: Dict) -> Dict:
        """Record production output"""
        production = {
            'wo_id': wo_id,
            'quantity_produced': production_data.get('quantity_produced', 0),
            'quantity_scrapped': production_data.get('quantity_scrapped', 0),
            'operation': production_data.get('operation'),
            'operator': production_data.get('operator'),
            'machine': production_data.get('machine'),
            'start_time': production_data.get('start_time'),
            'end_time': production_data.get('end_time'),
            'recorded_at': datetime.now().isoformat()
        }
        
        return {
            'success': True,
            'production': production,
            'bot_id': self.bot_id
        }
    
    def _close_work_order(self, wo_id: int) -> Dict:
        """Close completed work order"""
        closing = {
            'wo_id': wo_id,
            'closed_at': datetime.now().isoformat(),
            'variance_analysis': {
                'quantity_variance': 0,
                'cost_variance': 0,
                'time_variance': 0
            }
        }
        
        return {
            'success': True,
            'closing': closing,
            'status': 'closed',
            'bot_id': self.bot_id
        }
    
    def _work_order_status(self, wo_id: int) -> Dict:
        """Get work order status"""
        status = {
            'wo_id': wo_id,
            'current_status': 'in_progress',
            'completion_percentage': 65,
            'materials_issued': True,
            'operations_completed': 2,
            'operations_remaining': 1
        }
        
        return {
            'success': True,
            'status': status,
            'bot_id': self.bot_id
        }
    
    def _capacity_planning(self, period: str, workcenter_id: Optional[int]) -> Dict:
        """Analyze capacity requirements"""
        capacity = {
            'period': period,
            'workcenter_id': workcenter_id,
            'available_hours': 0,
            'planned_hours': 0,
            'utilization_percentage': 0,
            'bottlenecks': []
        }
        
        return {
            'success': True,
            'capacity': capacity,
            'bot_id': self.bot_id
        }
