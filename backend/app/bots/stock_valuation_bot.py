import logging
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal

logger = logging.getLogger(__name__)

class StockValuationBot:
    """Calculate inventory valuation using FIFO, LIFO, Average, and Standard cost methods"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "stock_valuation"
        self.name = "StockValuationBot"
        self.db = db
        self.capabilities = [
            "calculate_valuation", "fifo_valuation", "lifo_valuation", "average_cost",
            "standard_cost", "valuation_report", "cost_variance_analysis"
        ]
        self.methods = ['FIFO', 'LIFO', 'Weighted_Average', 'Standard_Cost']
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'calculate_valuation':
                return self._calculate_valuation(context.get('method'), context.get('filters', {}))
            elif action == 'fifo_valuation':
                return self._fifo_valuation(context.get('item_id'), context.get('quantity'))
            elif action == 'lifo_valuation':
                return self._lifo_valuation(context.get('item_id'), context.get('quantity'))
            elif action == 'average_cost':
                return self._average_cost(context.get('item_id'))
            elif action == 'standard_cost':
                return self._standard_cost(context.get('item_id'))
            elif action == 'valuation_report':
                return self._valuation_report(context.get('as_of_date'), context.get('method'))
            elif action == 'cost_variance_analysis':
                return self._cost_variance_analysis(context.get('period'))
            else:
                return {'success': False, 'error': 'Unknown action', 'bot_id': self.bot_id}
                
        except Exception as e:
            logger.error(f"Stock valuation error: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
    
    def _calculate_valuation(self, method: str, filters: Dict) -> Dict:
        """Calculate total inventory valuation using specified method"""
        if method not in self.methods:
            return {'success': False, 'error': f'Invalid method. Must be: {", ".join(self.methods)}', 'bot_id': self.bot_id}
        
        valuation = {
            'method': method,
            'filters': filters,
            'total_value': Decimal('0'),
            'total_quantity': 0,
            'avg_unit_cost': Decimal('0'),
            'by_category': {},
            'by_warehouse': {},
            'calculation_date': datetime.now().isoformat()
        }
        
        return {
            'success': True,
            'valuation': valuation,
            'methodology_description': self._get_method_description(method),
            'bot_id': self.bot_id
        }
    
    def _fifo_valuation(self, item_id: int, quantity: float) -> Dict:
        """Calculate FIFO (First-In-First-Out) cost"""
        layers = []  # Would fetch from inventory_layers table
        
        remaining_qty = quantity
        total_cost = Decimal('0')
        layers_used = []
        
        # Process oldest layers first
        for layer in layers:
            if remaining_qty <= 0:
                break
            
            qty_from_layer = min(remaining_qty, layer['quantity'])
            cost_from_layer = qty_from_layer * layer['unit_cost']
            
            layers_used.append({
                'layer_date': layer['received_date'],
                'quantity': qty_from_layer,
                'unit_cost': layer['unit_cost'],
                'total_cost': float(cost_from_layer)
            })
            
            total_cost += cost_from_layer
            remaining_qty -= qty_from_layer
        
        avg_cost = total_cost / Decimal(str(quantity)) if quantity > 0 else Decimal('0')
        
        return {
            'success': True,
            'method': 'FIFO',
            'item_id': item_id,
            'quantity': quantity,
            'total_cost': float(total_cost),
            'average_unit_cost': float(avg_cost),
            'layers_used': layers_used,
            'bot_id': self.bot_id
        }
    
    def _lifo_valuation(self, item_id: int, quantity: float) -> Dict:
        """Calculate LIFO (Last-In-First-Out) cost"""
        layers = []  # Would fetch from inventory_layers table, reverse order
        
        remaining_qty = quantity
        total_cost = Decimal('0')
        layers_used = []
        
        # Process newest layers first
        for layer in reversed(layers):
            if remaining_qty <= 0:
                break
            
            qty_from_layer = min(remaining_qty, layer['quantity'])
            cost_from_layer = qty_from_layer * layer['unit_cost']
            
            layers_used.append({
                'layer_date': layer['received_date'],
                'quantity': qty_from_layer,
                'unit_cost': layer['unit_cost'],
                'total_cost': float(cost_from_layer)
            })
            
            total_cost += cost_from_layer
            remaining_qty -= qty_from_layer
        
        avg_cost = total_cost / Decimal(str(quantity)) if quantity > 0 else Decimal('0')
        
        return {
            'success': True,
            'method': 'LIFO',
            'item_id': item_id,
            'quantity': quantity,
            'total_cost': float(total_cost),
            'average_unit_cost': float(avg_cost),
            'layers_used': layers_used,
            'bot_id': self.bot_id
        }
    
    def _average_cost(self, item_id: int) -> Dict:
        """Calculate weighted average cost"""
        total_value = Decimal('0')
        total_quantity = 0
        
        # Would sum all inventory layers
        avg_cost = total_value / Decimal(str(total_quantity)) if total_quantity > 0 else Decimal('0')
        
        return {
            'success': True,
            'method': 'Weighted_Average',
            'item_id': item_id,
            'total_quantity': total_quantity,
            'total_value': float(total_value),
            'average_unit_cost': float(avg_cost),
            'bot_id': self.bot_id
        }
    
    def _standard_cost(self, item_id: int) -> Dict:
        """Get standard cost for item"""
        standard_cost = Decimal('0')  # Would fetch from item master
        
        return {
            'success': True,
            'method': 'Standard_Cost',
            'item_id': item_id,
            'standard_unit_cost': float(standard_cost),
            'last_updated': None,
            'bot_id': self.bot_id
        }
    
    def _valuation_report(self, as_of_date: str, method: str) -> Dict:
        """Generate complete valuation report"""
        report = {
            'as_of_date': as_of_date or datetime.now().date().isoformat(),
            'method': method or 'Weighted_Average',
            'summary': {
                'total_inventory_value': 0,
                'total_quantity': 0,
                'unique_items': 0,
                'by_category': {},
                'by_warehouse': {},
                'top_value_items': []
            }
        }
        
        return {
            'success': True,
            'report': report,
            'bot_id': self.bot_id
        }
    
    def _cost_variance_analysis(self, period: str) -> Dict:
        """Analyze cost variances between methods"""
        analysis = {
            'period': period,
            'fifo_total': 0,
            'lifo_total': 0,
            'average_total': 0,
            'standard_total': 0,
            'variances': {
                'fifo_vs_lifo': 0,
                'actual_vs_standard': 0
            },
            'impact_on_cogs': 0
        }
        
        return {
            'success': True,
            'analysis': analysis,
            'bot_id': self.bot_id
        }
    
    def _get_method_description(self, method: str) -> str:
        """Get description of valuation method"""
        descriptions = {
            'FIFO': 'First-In-First-Out: Costs from oldest inventory used first',
            'LIFO': 'Last-In-First-Out: Costs from newest inventory used first',
            'Weighted_Average': 'Average cost of all inventory on hand',
            'Standard_Cost': 'Predetermined standard cost per unit'
        }
        return descriptions.get(method, 'Unknown method')
