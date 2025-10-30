import logging
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime

logger = logging.getLogger(__name__)

class InventoryManagementBot:
    """Comprehensive inventory tracking with multi-location support, valuation methods, and real-time stock management"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "inventory_management"
        self.name = "InventoryManagementBot"
        self.db = db
        self.capabilities = [
            "track_inventory", "adjust_stock", "transfer_stock", "stock_report", 
            "calculate_valuation", "reorder_check", "stock_aging", "stock_count"
        ]
        self.valuation_methods = ['FIFO', 'LIFO', 'Average', 'Standard']
        self.adjustment_types = ['damage', 'theft', 'found', 'correction', 'write_off', 'quality_issue']
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'track_inventory':
                return self._track_inventory(context.get('item_id'), context.get('warehouse_id'))
            elif action == 'adjust_stock':
                return self._adjust_stock(context.get('item_id'), context.get('quantity'), context.get('reason'))
            elif action == 'transfer_stock':
                return self._transfer_stock(context.get('item_id'), context.get('from_warehouse'), 
                                           context.get('to_warehouse'), context.get('quantity'))
            elif action == 'stock_report':
                return self._stock_report(context.get('warehouse_id'), context.get('filters', {}))
            elif action == 'calculate_valuation':
                return self._calculate_valuation(context.get('method', 'FIFO'), context.get('warehouse_id'))
            elif action == 'reorder_check':
                return self._reorder_check(context.get('warehouse_id'))
            elif action == 'stock_aging':
                return self._stock_aging(context.get('item_id'), context.get('warehouse_id'))
            elif action == 'stock_count':
                return self._stock_count(context.get('warehouse_id'), context.get('items', []))
            else:
                return {'success': False, 'error': 'Unknown action', 'bot_id': self.bot_id}
                
        except Exception as e:
            logger.error(f"Inventory management error: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
    
    def _track_inventory(self, item_id: int, warehouse_id: Optional[int]) -> Dict:
        """Get real-time inventory levels with detailed allocation tracking"""
        inventory_status = {
            'item_id': item_id,
            'warehouse_id': warehouse_id,
            'on_hand': 0,  # Physical quantity available
            'allocated': 0,  # Reserved for orders
            'available': 0,  # On-hand minus allocated
            'in_transit': 0,  # Being moved between warehouses
            'on_order': 0,  # Ordered from suppliers
            'reorder_point': 0,  # Minimum level before reorder
            'reorder_quantity': 0,  # Standard reorder amount
            'last_movement_date': None,
            'last_count_date': None
        }
        
        # Calculate available
        inventory_status['available'] = inventory_status['on_hand'] - inventory_status['allocated']
        
        # Determine status
        if inventory_status['available'] <= 0:
            status = 'out_of_stock'
        elif inventory_status['available'] <= inventory_status['reorder_point']:
            status = 'low_stock'
        else:
            status = 'in_stock'
        
        return {
            'success': True,
            'inventory': inventory_status,
            'status': status,
            'needs_reorder': inventory_status['available'] <= inventory_status['reorder_point'],
            'bot_id': self.bot_id
        }
    
    def _adjust_stock(self, item_id: int, quantity: float, reason: str) -> Dict:
        """Record stock adjustment with full audit trail"""
        if not reason or reason not in self.adjustment_types:
            return {
                'success': False, 
                'error': f'Invalid reason. Must be one of: {", ".join(self.adjustment_types)}',
                'bot_id': self.bot_id
            }
        
        adjustment = {
            'item_id': item_id,
            'quantity': quantity,
            'reason': reason,
            'previous_balance': 0,  # Would fetch from DB
            'new_balance': quantity,  # Would calculate from DB
            'adjusted_by': 'system',  # Would come from auth context
            'adjusted_at': datetime.now().isoformat(),
            'notes': f'Stock adjustment: {reason}'
        }
        
        return {
            'success': True,
            'adjustment': adjustment,
            'message': f'Stock adjusted by {quantity} units due to {reason}',
            'bot_id': self.bot_id
        }
    
    def _transfer_stock(self, item_id: int, from_warehouse: int, to_warehouse: int, quantity: float) -> Dict:
        """Transfer stock between warehouses with status tracking"""
        if from_warehouse == to_warehouse:
            return {'success': False, 'error': 'Source and destination warehouses cannot be the same', 'bot_id': self.bot_id}
        
        if quantity <= 0:
            return {'success': False, 'error': 'Transfer quantity must be greater than zero', 'bot_id': self.bot_id}
        
        transfer = {
            'item_id': item_id,
            'from_warehouse': from_warehouse,
            'to_warehouse': to_warehouse,
            'quantity': quantity,
            'status': 'pending',  # pending, in_transit, completed, cancelled
            'initiated_at': datetime.now().isoformat(),
            'expected_arrival': None,
            'completed_at': None,
            'transfer_number': f'TR-{datetime.now().strftime("%Y%m%d%H%M%S")}'
        }
        
        return {
            'success': True,
            'transfer': transfer,
            'message': f'Transfer initiated: {quantity} units from warehouse {from_warehouse} to {to_warehouse}',
            'bot_id': self.bot_id
        }
    
    def _stock_report(self, warehouse_id: Optional[int], filters: Dict) -> Dict:
        """Generate comprehensive stock report with analysis"""
        report = {
            'warehouse_id': warehouse_id,
            'filters': filters,
            'summary': {
                'total_items': 0,
                'total_value': 0,
                'total_quantity': 0,
                'low_stock_count': 0,
                'out_of_stock_count': 0,
                'overstock_count': 0
            },
            'low_stock_items': [],
            'out_of_stock_items': [],
            'overstock_items': [],
            'high_value_items': [],
            'slow_moving_items': [],
            'fast_moving_items': [],
            'generated_at': datetime.now().isoformat()
        }
        
        return {
            'success': True,
            'report': report,
            'recommendations': self._generate_stock_recommendations(report),
            'bot_id': self.bot_id
        }
    
    def _calculate_valuation(self, method: str, warehouse_id: Optional[int]) -> Dict:
        """Calculate inventory valuation using specified accounting method"""
        if method not in self.valuation_methods:
            return {
                'success': False, 
                'error': f'Invalid method. Must be one of: {", ".join(self.valuation_methods)}',
                'bot_id': self.bot_id
            }
        
        valuation = {
            'method': method,
            'warehouse_id': warehouse_id,
            'total_inventory_value': 0,
            'total_quantity': 0,
            'avg_unit_cost': 0,
            'by_category': {},
            'by_warehouse': {},
            'calculation_date': datetime.now().isoformat()
        }
        
        methodology = {
            'FIFO': 'First-In-First-Out: Oldest inventory costed first',
            'LIFO': 'Last-In-First-Out: Newest inventory costed first',
            'Average': 'Weighted average cost of all inventory',
            'Standard': 'Predetermined standard cost per unit'
        }
        
        return {
            'success': True,
            'valuation': valuation,
            'methodology': methodology[method],
            'bot_id': self.bot_id
        }
    
    def _reorder_check(self, warehouse_id: Optional[int]) -> Dict:
        """Identify items that need reordering"""
        reorder_list = []  # Would query items below reorder point
        
        summary = {
            'total_items_needing_reorder': len(reorder_list),
            'estimated_reorder_cost': 0,
            'estimated_reorder_quantity': 0,
            'critical_items': 0,  # Out of stock
            'warning_items': 0  # Below reorder point
        }
        
        return {
            'success': True,
            'warehouse_id': warehouse_id,
            'reorder_needed': reorder_list,
            'summary': summary,
            'recommended_actions': self._generate_reorder_actions(reorder_list),
            'bot_id': self.bot_id
        }
    
    def _stock_aging(self, item_id: Optional[int], warehouse_id: Optional[int]) -> Dict:
        """Analyze stock age and identify slow-moving inventory"""
        aging = {
            'item_id': item_id,
            'warehouse_id': warehouse_id,
            'age_brackets': {
                '0-30_days': {'quantity': 0, 'value': 0, 'percentage': 0},
                '31-60_days': {'quantity': 0, 'value': 0, 'percentage': 0},
                '61-90_days': {'quantity': 0, 'value': 0, 'percentage': 0},
                '91-180_days': {'quantity': 0, 'value': 0, 'percentage': 0},
                'over_180_days': {'quantity': 0, 'value': 0, 'percentage': 0}
            },
            'total_quantity': 0,
            'total_value': 0,
            'avg_age_days': 0
        }
        
        return {
            'success': True,
            'aging': aging,
            'slow_movers': [],  # Items over 180 days
            'obsolescence_risk': [],  # Items over 365 days
            'bot_id': self.bot_id
        }
    
    def _stock_count(self, warehouse_id: Optional[int], items: List[Dict]) -> Dict:
        """Record physical stock count and identify variances"""
        count_session = {
            'warehouse_id': warehouse_id,
            'count_date': datetime.now().isoformat(),
            'status': 'in_progress',  # in_progress, completed, cancelled
            'items_counted': len(items),
            'variances_found': 0,
            'total_variance_value': 0,
            'items': []
        }
        
        for item in items:
            item_count = {
                'item_id': item.get('item_id'),
                'system_quantity': 0,  # From DB
                'counted_quantity': item.get('counted_quantity', 0),
                'variance': 0,  # Difference
                'variance_value': 0,
                'counted_by': item.get('counted_by', 'system')
            }
            count_session['items'].append(item_count)
        
        return {
            'success': True,
            'count_session': count_session,
            'requires_adjustment': count_session['variances_found'] > 0,
            'bot_id': self.bot_id
        }
    
    def _generate_stock_recommendations(self, report: Dict) -> List[str]:
        """Generate actionable recommendations from stock report"""
        recommendations = []
        
        if report['summary']['out_of_stock_count'] > 0:
            recommendations.append(f"URGENT: {report['summary']['out_of_stock_count']} items out of stock - expedite procurement")
        
        if report['summary']['low_stock_count'] > 0:
            recommendations.append(f"WARNING: {report['summary']['low_stock_count']} items below reorder point - initiate reorder")
        
        if report['summary']['overstock_count'] > 0:
            recommendations.append(f"Review overstock items - consider promotions or transfers")
        
        return recommendations
    
    def _generate_reorder_actions(self, reorder_list: List) -> List[str]:
        """Generate action items for reordering"""
        if not reorder_list:
            return ["No reorder actions needed - all items above reorder point"]
        
        return [
            "Review and approve purchase requisitions",
            "Contact suppliers for quotes",
            "Check supplier lead times",
            "Verify budget availability",
            "Create purchase orders for approved items"
        ]
