"""
ARIA ERP - MRP Bot
Material Requirements Planning with AI optimization
"""
from typing import Dict, List, Any
from datetime import datetime, timedelta
import json

class MRPPBot:
    """Material Requirements Planning Bot"""
    
    def __init__(self):
        self.name = "mrp_bot"
        self.description = "Material Requirements Planning with AI optimization"
        self.capabilities = ["demand_planning", "inventory_optimization", "procurement_scheduling"]
        
    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, str]:
        """Validate input data"""
        required_fields = ['product_id', 'demand_forecast', 'current_inventory']
        for field in required_fields:
            if field not in input_data:
                return False, f"Missing required field: {field}"
        return True, ""
        
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute MRP planning"""
        try:
            product_id = input_data['product_id']
            demand_forecast = input_data['demand_forecast']  # {'2024-01': 100, '2024-02': 150, ...}
            current_inventory = input_data['current_inventory']
            safety_stock = input_data.get('safety_stock', 50)
            lead_time_days = input_data.get('lead_time_days', 7)
            
            # Calculate material requirements
            requirements = []
            planned_orders = []
            
            for month, forecast_demand in demand_forecast.items():
                # Net requirements calculation
                net_requirement = max(0, forecast_demand + safety_stock - current_inventory)
                
                if net_requirement > 0:
                    # Plan purchase order
                    order_date = datetime.strptime(month, '%Y-%m') - timedelta(days=lead_time_days)
                    planned_orders.append({
                        'material': product_id,
                        'quantity': net_requirement,
                        'due_date': order_date.strftime('%Y-%m-%d'),
                        'priority': 'high' if net_requirement > safety_stock else 'normal'
                    })
                
                requirements.append({
                    'period': month,
                    'gross_demand': forecast_demand,
                    'current_inventory': current_inventory,
                    'safety_stock': safety_stock,
                    'net_requirement': net_requirement
                })
            
            return {
                'success': True,
                'bot': 'MRP Bot',
                'results': {
                    'planned_orders': planned_orders,
                    'requirements_analysis': requirements,
                    'total_planned_purchases': sum(order['quantity'] for order in planned_orders),
                    'recommendation': f'Plan {len(planned_orders)} purchase orders for optimal inventory levels'
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'bot': 'MRP Bot',
                'error': str(e)
            }

# Global instance
mrp_bot = MRPPBot()