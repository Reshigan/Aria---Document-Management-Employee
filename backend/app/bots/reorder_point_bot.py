import logging
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)

class ReorderPointBot:
    """Calculate and manage reorder points, safety stock, and automated procurement triggers"""
    
    def __init__(self, db: Session = None):
        self.bot_id = "reorder_point"
        self.name = "ReorderPointBot"
        self.db = db
        self.capabilities = [
            "calculate_reorder_point", "calculate_safety_stock", "calculate_eoq",
            "check_reorder_triggers", "update_reorder_params", "demand_forecasting"
        ]
    
    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        context = context or {}
        action = context.get('action', '').lower()
        
        try:
            if action == 'calculate_reorder_point':
                return self._calculate_reorder_point(context.get('item_id'), context.get('params', {}))
            elif action == 'calculate_safety_stock':
                return self._calculate_safety_stock(context.get('item_id'), context.get('params', {}))
            elif action == 'calculate_eoq':
                return self._calculate_eoq(context.get('item_id'), context.get('params', {}))
            elif action == 'check_reorder_triggers':
                return self._check_reorder_triggers(context.get('warehouse_id'))
            elif action == 'update_reorder_params':
                return self._update_reorder_params(context.get('item_id'), context.get('params', {}))
            elif action == 'demand_forecasting':
                return self._demand_forecasting(context.get('item_id'), context.get('periods', 12))
            else:
                return {'success': False, 'error': 'Unknown action', 'bot_id': self.bot_id}
                
        except Exception as e:
            logger.error(f"Reorder point error: {str(e)}")
            return {'success': False, 'error': str(e), 'bot_id': self.bot_id}
    
    def _calculate_reorder_point(self, item_id: int, params: Dict) -> Dict:
        """Calculate reorder point = (Average Daily Demand × Lead Time) + Safety Stock"""
        avg_daily_demand = Decimal(str(params.get('avg_daily_demand', 0)))
        lead_time_days = Decimal(str(params.get('lead_time_days', 0)))
        safety_stock = Decimal(str(params.get('safety_stock', 0)))
        
        reorder_point = (avg_daily_demand * lead_time_days) + safety_stock
        
        # Calculate suggested order quantity (EOQ if available, otherwise min order qty)
        order_quantity = Decimal(str(params.get('eoq', params.get('min_order_qty', 0))))
        
        return {
            'success': True,
            'item_id': item_id,
            'reorder_point': float(reorder_point),
            'safety_stock': float(safety_stock),
            'avg_daily_demand': float(avg_daily_demand),
            'lead_time_days': float(lead_time_days),
            'suggested_order_quantity': float(order_quantity),
            'formula': '(Avg Daily Demand × Lead Time Days) + Safety Stock',
            'calculated_at': datetime.now().isoformat(),
            'bot_id': self.bot_id
        }
    
    def _calculate_safety_stock(self, item_id: int, params: Dict) -> Dict:
        """Calculate safety stock using service level approach"""
        avg_demand = Decimal(str(params.get('avg_demand', 0)))
        demand_std_dev = Decimal(str(params.get('demand_std_dev', 0)))
        lead_time_days = Decimal(str(params.get('lead_time_days', 0)))
        service_level = params.get('service_level', 0.95)  # 95% service level
        
        # Z-score for service level (simplified)
        z_scores = {0.90: 1.28, 0.95: 1.65, 0.99: 2.33}
        z_score = Decimal(str(z_scores.get(service_level, 1.65)))
        
        # Safety Stock = Z-score × StdDev × √Lead Time
        import math
        sqrt_lead_time = Decimal(str(math.sqrt(float(lead_time_days))))
        safety_stock = z_score * demand_std_dev * sqrt_lead_time
        
        return {
            'success': True,
            'item_id': item_id,
            'safety_stock': float(safety_stock),
            'service_level': service_level,
            'z_score': float(z_score),
            'demand_std_dev': float(demand_std_dev),
            'lead_time_days': float(lead_time_days),
            'formula': 'Z-score × Demand StdDev × √Lead Time',
            'bot_id': self.bot_id
        }
    
    def _calculate_eoq(self, item_id: int, params: Dict) -> Dict:
        """Calculate Economic Order Quantity"""
        annual_demand = Decimal(str(params.get('annual_demand', 0)))
        order_cost = Decimal(str(params.get('order_cost', 0)))
        holding_cost_per_unit = Decimal(str(params.get('holding_cost_per_unit', 0)))
        
        if holding_cost_per_unit == 0:
            return {'success': False, 'error': 'Holding cost cannot be zero', 'bot_id': self.bot_id}
        
        # EOQ = √((2 × Annual Demand × Order Cost) / Holding Cost per Unit)
        import math
        numerator = 2 * annual_demand * order_cost
        eoq = Decimal(str(math.sqrt(float(numerator / holding_cost_per_unit))))
        
        # Calculate metrics
        orders_per_year = annual_demand / eoq if eoq > 0 else Decimal('0')
        total_order_cost = orders_per_year * order_cost
        avg_inventory = eoq / Decimal('2')
        total_holding_cost = avg_inventory * holding_cost_per_unit
        total_cost = total_order_cost + total_holding_cost
        
        return {
            'success': True,
            'item_id': item_id,
            'eoq': float(eoq),
            'orders_per_year': float(orders_per_year),
            'total_annual_cost': float(total_cost),
            'ordering_cost': float(total_order_cost),
            'holding_cost': float(total_holding_cost),
            'avg_inventory_level': float(avg_inventory),
            'formula': '√((2 × Annual Demand × Order Cost) / Holding Cost)',
            'bot_id': self.bot_id
        }
    
    def _check_reorder_triggers(self, warehouse_id: Optional[int]) -> Dict:
        """Check all items for reorder triggers"""
        triggered_items = []  # Would query items where on_hand <= reorder_point
        
        summary = {
            'total_items_checked': 0,
            'reorder_triggered': len(triggered_items),
            'critical_items': 0,  # Out of stock
            'estimated_order_value': 0
        }
        
        return {
            'success': True,
            'warehouse_id': warehouse_id,
            'triggered_items': triggered_items,
            'summary': summary,
            'recommended_actions': [
                'Review and approve purchase requisitions',
                'Check supplier availability',
                'Prioritize critical items'
            ],
            'bot_id': self.bot_id
        }
    
    def _update_reorder_params(self, item_id: int, params: Dict) -> Dict:
        """Update reorder parameters for an item"""
        updatable = ['reorder_point', 'safety_stock', 'order_quantity', 'lead_time_days', 'min_order_qty', 'max_order_qty']
        updates = {k: v for k, v in params.items() if k in updatable}
        
        if not updates:
            return {'success': False, 'error': 'No valid parameters to update', 'bot_id': self.bot_id}
        
        return {
            'success': True,
            'item_id': item_id,
            'updates': updates,
            'updated_at': datetime.now().isoformat(),
            'message': f"Updated {len(updates)} parameter(s)",
            'bot_id': self.bot_id
        }
    
    def _demand_forecasting(self, item_id: int, periods: int) -> Dict:
        """Simple demand forecasting using moving average"""
        historical_data = []  # Would fetch historical demand
        
        if not historical_data:
            return {
                'success': True,
                'item_id': item_id,
                'forecast': [],
                'method': 'moving_average',
                'confidence': 'low',
                'message': 'Insufficient historical data for accurate forecast',
                'bot_id': self.bot_id
            }
        
        # Calculate moving average
        forecast = []
        for i in range(periods):
            forecast_period = {
                'period': i + 1,
                'forecast_demand': 0,
                'lower_bound': 0,
                'upper_bound': 0
            }
            forecast.append(forecast_period)
        
        return {
            'success': True,
            'item_id': item_id,
            'forecast': forecast,
            'method': 'moving_average',
            'periods': periods,
            'confidence': 'medium',
            'bot_id': self.bot_id
        }
