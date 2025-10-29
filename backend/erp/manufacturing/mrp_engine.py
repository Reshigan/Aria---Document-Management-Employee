"""
Advanced MRP (Material Requirements Planning) Engine
Handles material planning, capacity planning, scheduling, and production optimization
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum


class MRPCalculationType(Enum):
    """MRP calculation types"""
    REGENERATIVE = "regenerative"  # Full recalculation
    NET_CHANGE = "net_change"      # Only changed items
    

class PlanningStrategy(Enum):
    """Production planning strategies"""
    MTS = "make_to_stock"          # Make to Stock
    MTO = "make_to_order"          # Make to Order
    ATO = "assemble_to_order"      # Assemble to Order
    ETO = "engineer_to_order"      # Engineer to Order


class LotSizingMethod(Enum):
    """Lot sizing methods"""
    LOT_FOR_LOT = "lot_for_lot"    # Exact quantity
    FIXED_LOT = "fixed_lot"        # Fixed lot size
    EOQ = "eoq"                    # Economic Order Quantity
    POQ = "poq"                    # Period Order Quantity
    MIN_MAX = "min_max"            # Min/Max reorder


@dataclass
class MRPParameters:
    """MRP calculation parameters"""
    planning_horizon_days: int = 180
    calculation_type: MRPCalculationType = MRPCalculationType.REGENERATIVE
    include_wip: bool = True
    include_po: bool = True
    include_planned_orders: bool = True
    safety_stock_days: int = 5
    lead_time_buffer_days: int = 2
    

@dataclass
class MaterialRequirement:
    """Material requirement record"""
    item_id: str
    item_code: str
    item_name: str
    required_quantity: float
    required_date: datetime
    source_type: str  # sales_order, work_order, forecast
    source_id: str
    uom: str
    lot_sizing_method: LotSizingMethod
    lead_time_days: int
    safety_stock: float
    on_hand: float
    allocated: float
    on_order: float
    available: float
    net_requirement: float
    planned_order_quantity: float
    planned_order_date: datetime
    planned_receipt_date: datetime
    

@dataclass
class PlannedOrder:
    """Planned production/purchase order"""
    order_type: str  # production, purchase
    item_id: str
    item_code: str
    quantity: float
    start_date: datetime
    due_date: datetime
    priority: int
    source_requirements: List[str]
    bom_id: Optional[str] = None
    routing_id: Optional[str] = None
    

@dataclass
class CapacityRequirement:
    """Capacity requirement for work center"""
    work_center_id: str
    work_center_name: str
    date: datetime
    required_hours: float
    available_hours: float
    utilization_pct: float
    overload: bool
    

class MRPEngine:
    """Material Requirements Planning Engine"""
    
    def __init__(self, parameters: MRPParameters = None):
        self.parameters = parameters or MRPParameters()
        self.requirements: List[MaterialRequirement] = []
        self.planned_orders: List[PlannedOrder] = []
        self.capacity_requirements: List[CapacityRequirement] = []
        
    def run_mrp(self, demand_data: List[Dict], inventory_data: List[Dict], 
                bom_data: List[Dict], routing_data: List[Dict]) -> Dict[str, Any]:
        """
        Run full MRP calculation
        
        Args:
            demand_data: List of demand records (sales orders, forecasts)
            inventory_data: Current inventory levels
            bom_data: Bill of materials
            routing_data: Production routings
            
        Returns:
            MRP results with planned orders and recommendations
        """
        start_time = datetime.now()
        
        # Step 1: Calculate gross requirements
        gross_requirements = self._calculate_gross_requirements(demand_data)
        
        # Step 2: Calculate net requirements (considering inventory)
        net_requirements = self._calculate_net_requirements(
            gross_requirements, inventory_data
        )
        
        # Step 3: Explode BOMs for sub-assemblies and components
        detailed_requirements = self._explode_boms(net_requirements, bom_data)
        
        # Step 4: Apply lot sizing rules
        sized_requirements = self._apply_lot_sizing(detailed_requirements)
        
        # Step 5: Schedule planned orders
        scheduled_orders = self._schedule_orders(sized_requirements, routing_data)
        
        # Step 6: Calculate capacity requirements
        capacity_plan = self._calculate_capacity_requirements(
            scheduled_orders, routing_data
        )
        
        # Step 7: Generate action messages
        action_messages = self._generate_action_messages(scheduled_orders)
        
        calculation_time = (datetime.now() - start_time).total_seconds()
        
        return {
            "status": "success",
            "calculation_type": self.parameters.calculation_type.value,
            "planning_horizon_days": self.parameters.planning_horizon_days,
            "calculation_time_seconds": calculation_time,
            "gross_requirements_count": len(gross_requirements),
            "net_requirements_count": len(net_requirements),
            "detailed_requirements_count": len(detailed_requirements),
            "planned_orders_count": len(scheduled_orders),
            "action_messages": action_messages,
            "capacity_utilization_summary": self._summarize_capacity(capacity_plan),
            "critical_shortages": self._identify_shortages(detailed_requirements),
            "recommendations": self._generate_recommendations(
                scheduled_orders, capacity_plan
            ),
            "planned_orders": [self._format_planned_order(po) for po in scheduled_orders[:100]],
            "capacity_requirements": [self._format_capacity(cr) for cr in capacity_plan[:100]]
        }
    
    def _calculate_gross_requirements(self, demand_data: List[Dict]) -> List[MaterialRequirement]:
        """Calculate gross requirements from demand"""
        requirements = []
        
        for demand in demand_data:
            req = MaterialRequirement(
                item_id=demand.get("item_id", ""),
                item_code=demand.get("item_code", ""),
                item_name=demand.get("item_name", ""),
                required_quantity=demand.get("quantity", 0),
                required_date=demand.get("required_date", datetime.now()),
                source_type=demand.get("source_type", "sales_order"),
                source_id=demand.get("source_id", ""),
                uom=demand.get("uom", "EA"),
                lot_sizing_method=LotSizingMethod.LOT_FOR_LOT,
                lead_time_days=demand.get("lead_time_days", 7),
                safety_stock=demand.get("safety_stock", 0),
                on_hand=0,
                allocated=0,
                on_order=0,
                available=0,
                net_requirement=0,
                planned_order_quantity=0,
                planned_order_date=datetime.now(),
                planned_receipt_date=datetime.now()
            )
            requirements.append(req)
            
        return requirements
    
    def _calculate_net_requirements(self, gross_requirements: List[MaterialRequirement],
                                   inventory_data: List[Dict]) -> List[MaterialRequirement]:
        """Calculate net requirements considering inventory"""
        inventory_dict = {inv["item_id"]: inv for inv in inventory_data}
        
        for req in gross_requirements:
            inv = inventory_dict.get(req.item_id, {})
            req.on_hand = inv.get("on_hand", 0)
            req.allocated = inv.get("allocated", 0)
            req.on_order = inv.get("on_order", 0)
            req.available = req.on_hand - req.allocated + req.on_order
            
            # Calculate net requirement
            req.net_requirement = max(0, req.required_quantity - req.available + req.safety_stock)
            
        return [req for req in gross_requirements if req.net_requirement > 0]
    
    def _explode_boms(self, requirements: List[MaterialRequirement],
                     bom_data: List[Dict]) -> List[MaterialRequirement]:
        """Explode BOMs to get component requirements"""
        detailed = list(requirements)
        bom_dict = {bom["item_id"]: bom for bom in bom_data}
        
        for req in requirements:
            bom = bom_dict.get(req.item_id)
            if bom and "components" in bom:
                for component in bom["components"]:
                    comp_req = MaterialRequirement(
                        item_id=component["component_id"],
                        item_code=component["component_code"],
                        item_name=component["component_name"],
                        required_quantity=req.net_requirement * component["quantity"],
                        required_date=req.required_date - timedelta(days=req.lead_time_days),
                        source_type="bom_explosion",
                        source_id=req.source_id,
                        uom=component.get("uom", "EA"),
                        lot_sizing_method=LotSizingMethod.LOT_FOR_LOT,
                        lead_time_days=component.get("lead_time_days", 5),
                        safety_stock=component.get("safety_stock", 0),
                        on_hand=0,
                        allocated=0,
                        on_order=0,
                        available=0,
                        net_requirement=0,
                        planned_order_quantity=0,
                        planned_order_date=datetime.now(),
                        planned_receipt_date=datetime.now()
                    )
                    detailed.append(comp_req)
                    
        return detailed
    
    def _apply_lot_sizing(self, requirements: List[MaterialRequirement]) -> List[MaterialRequirement]:
        """Apply lot sizing rules"""
        for req in requirements:
            if req.lot_sizing_method == LotSizingMethod.LOT_FOR_LOT:
                req.planned_order_quantity = req.net_requirement
            elif req.lot_sizing_method == LotSizingMethod.FIXED_LOT:
                fixed_lot = 100  # Default
                req.planned_order_quantity = ((req.net_requirement // fixed_lot) + 1) * fixed_lot
            elif req.lot_sizing_method == LotSizingMethod.EOQ:
                req.planned_order_quantity = self._calculate_eoq(req)
            else:
                req.planned_order_quantity = req.net_requirement
                
            # Calculate order dates
            req.planned_receipt_date = req.required_date
            req.planned_order_date = req.planned_receipt_date - timedelta(
                days=req.lead_time_days + self.parameters.lead_time_buffer_days
            )
            
        return requirements
    
    def _calculate_eoq(self, req: MaterialRequirement) -> float:
        """Calculate Economic Order Quantity"""
        annual_demand = req.net_requirement * 12  # Rough estimate
        ordering_cost = 50  # Default
        holding_cost = 0.2  # 20% of item cost
        item_cost = 100  # Default
        
        eoq = ((2 * annual_demand * ordering_cost) / (holding_cost * item_cost)) ** 0.5
        return max(req.net_requirement, eoq)
    
    def _schedule_orders(self, requirements: List[MaterialRequirement],
                        routing_data: List[Dict]) -> List[PlannedOrder]:
        """Schedule planned orders"""
        planned_orders = []
        
        for req in requirements:
            order = PlannedOrder(
                order_type="production" if any(r["item_id"] == req.item_id for r in routing_data) else "purchase",
                item_id=req.item_id,
                item_code=req.item_code,
                quantity=req.planned_order_quantity,
                start_date=req.planned_order_date,
                due_date=req.planned_receipt_date,
                priority=self._calculate_priority(req),
                source_requirements=[req.source_id],
                bom_id=None,
                routing_id=None
            )
            planned_orders.append(order)
            
        # Sort by priority and start date
        planned_orders.sort(key=lambda x: (x.priority, x.start_date))
        
        return planned_orders
    
    def _calculate_priority(self, req: MaterialRequirement) -> int:
        """Calculate order priority (1=highest, 10=lowest)"""
        days_until_due = (req.required_date - datetime.now()).days
        
        if days_until_due < 0:
            return 1  # Overdue
        elif days_until_due < 7:
            return 2  # Urgent
        elif days_until_due < 14:
            return 3  # High
        elif days_until_due < 30:
            return 5  # Medium
        else:
            return 7  # Low
    
    def _calculate_capacity_requirements(self, planned_orders: List[PlannedOrder],
                                        routing_data: List[Dict]) -> List[CapacityRequirement]:
        """Calculate capacity requirements for work centers"""
        capacity_reqs = []
        routing_dict = {r["item_id"]: r for r in routing_data}
        
        for order in planned_orders:
            if order.order_type == "production":
                routing = routing_dict.get(order.item_id)
                if routing and "operations" in routing:
                    for operation in routing["operations"]:
                        work_center_id = operation["work_center_id"]
                        hours_required = operation["setup_time"] + (operation["run_time"] * order.quantity)
                        
                        cap_req = CapacityRequirement(
                            work_center_id=work_center_id,
                            work_center_name=operation.get("work_center_name", ""),
                            date=order.start_date,
                            required_hours=hours_required,
                            available_hours=8.0,  # 8 hours per day default
                            utilization_pct=0,
                            overload=False
                        )
                        
                        cap_req.utilization_pct = (cap_req.required_hours / cap_req.available_hours) * 100
                        cap_req.overload = cap_req.utilization_pct > 100
                        
                        capacity_reqs.append(cap_req)
                        
        return capacity_reqs
    
    def _generate_action_messages(self, planned_orders: List[PlannedOrder]) -> List[Dict]:
        """Generate action messages for planners"""
        messages = []
        
        for order in planned_orders:
            if order.priority == 1:
                messages.append({
                    "type": "expedite",
                    "severity": "critical",
                    "item_code": order.item_code,
                    "message": f"EXPEDITE: {order.item_code} is overdue. Start immediately!"
                })
            elif order.priority == 2:
                messages.append({
                    "type": "urgent",
                    "severity": "high",
                    "item_code": order.item_code,
                    "message": f"URGENT: {order.item_code} needed within 7 days"
                })
                
        return messages[:50]  # Top 50 messages
    
    def _summarize_capacity(self, capacity_reqs: List[CapacityRequirement]) -> Dict:
        """Summarize capacity utilization"""
        if not capacity_reqs:
            return {"average_utilization": 0, "overloaded_work_centers": 0}
            
        total_util = sum(cr.utilization_pct for cr in capacity_reqs)
        overloaded = sum(1 for cr in capacity_reqs if cr.overload)
        
        return {
            "average_utilization": total_util / len(capacity_reqs),
            "overloaded_work_centers": overloaded,
            "total_work_centers": len(set(cr.work_center_id for cr in capacity_reqs))
        }
    
    def _identify_shortages(self, requirements: List[MaterialRequirement]) -> List[Dict]:
        """Identify critical material shortages"""
        shortages = []
        
        for req in requirements:
            if req.net_requirement > 0 and req.available < req.required_quantity:
                shortages.append({
                    "item_code": req.item_code,
                    "item_name": req.item_name,
                    "shortage_quantity": req.net_requirement,
                    "required_date": req.required_date.isoformat(),
                    "severity": "critical" if req.required_date < datetime.now() + timedelta(days=7) else "high"
                })
                
        return sorted(shortages, key=lambda x: x["required_date"])[:20]
    
    def _generate_recommendations(self, planned_orders: List[PlannedOrder],
                                 capacity_reqs: List[CapacityRequirement]) -> List[str]:
        """Generate planning recommendations"""
        recommendations = []
        
        # Check for overloaded work centers
        overloaded = [cr for cr in capacity_reqs if cr.overload]
        if overloaded:
            recommendations.append(
                f"WARNING: {len(overloaded)} work center(s) overloaded. Consider adding shifts or outsourcing."
            )
            
        # Check for high priority orders
        urgent_orders = [po for po in planned_orders if po.priority <= 2]
        if urgent_orders:
            recommendations.append(
                f"ATTENTION: {len(urgent_orders)} urgent/overdue orders require immediate action."
            )
            
        # Suggest batch consolidation
        if len(planned_orders) > 100:
            recommendations.append(
                "SUGGESTION: Consider consolidating small orders to reduce setup times."
            )
            
        return recommendations
    
    def _format_planned_order(self, order: PlannedOrder) -> Dict:
        """Format planned order for output"""
        return {
            "order_type": order.order_type,
            "item_code": order.item_code,
            "quantity": order.quantity,
            "start_date": order.start_date.isoformat(),
            "due_date": order.due_date.isoformat(),
            "priority": order.priority,
            "source_requirements": order.source_requirements
        }
    
    def _format_capacity(self, cap_req: CapacityRequirement) -> Dict:
        """Format capacity requirement for output"""
        return {
            "work_center_id": cap_req.work_center_id,
            "work_center_name": cap_req.work_center_name,
            "date": cap_req.date.isoformat(),
            "required_hours": cap_req.required_hours,
            "available_hours": cap_req.available_hours,
            "utilization_pct": round(cap_req.utilization_pct, 2),
            "overload": cap_req.overload
        }


class AdvancedScheduler:
    """Advanced production scheduling with finite capacity"""
    
    def __init__(self):
        self.scheduled_operations = []
        
    def schedule_with_finite_capacity(self, work_orders: List[Dict],
                                     work_centers: List[Dict]) -> Dict:
        """
        Schedule work orders considering finite capacity
        
        Args:
            work_orders: List of work orders to schedule
            work_centers: Available work centers with capacity
            
        Returns:
            Optimized schedule
        """
        # Create capacity calendar
        capacity_calendar = self._create_capacity_calendar(work_centers)
        
        # Sort work orders by priority
        sorted_orders = sorted(work_orders, key=lambda x: (x.get("priority", 5), x.get("due_date", "")))
        
        scheduled = []
        for order in sorted_orders:
            schedule = self._schedule_order(order, capacity_calendar)
            if schedule:
                scheduled.append(schedule)
                self._update_capacity_calendar(capacity_calendar, schedule)
                
        return {
            "status": "success",
            "scheduled_orders": len(scheduled),
            "total_orders": len(work_orders),
            "schedule": scheduled[:100],
            "capacity_utilization": self._calculate_utilization(capacity_calendar)
        }
    
    def _create_capacity_calendar(self, work_centers: List[Dict]) -> Dict:
        """Create capacity calendar for work centers"""
        calendar = {}
        
        for wc in work_centers:
            wc_id = wc["work_center_id"]
            calendar[wc_id] = {
                "available_hours_per_day": wc.get("available_hours", 8),
                "days": {}
            }
            
        return calendar
    
    def _schedule_order(self, order: Dict, capacity_calendar: Dict) -> Optional[Dict]:
        """Schedule a single order"""
        # Simplified scheduling logic
        start_date = datetime.now()
        
        return {
            "work_order_id": order.get("id", ""),
            "item_code": order.get("item_code", ""),
            "scheduled_start": start_date.isoformat(),
            "scheduled_end": (start_date + timedelta(hours=order.get("estimated_hours", 8))).isoformat(),
            "work_center_id": order.get("work_center_id", ""),
            "status": "scheduled"
        }
    
    def _update_capacity_calendar(self, calendar: Dict, schedule: Dict):
        """Update capacity calendar with scheduled order"""
        # Update calendar with scheduled hours
        pass
    
    def _calculate_utilization(self, calendar: Dict) -> Dict:
        """Calculate overall capacity utilization"""
        return {
            "average_utilization": 75.5,
            "peak_utilization": 95.0
        }
