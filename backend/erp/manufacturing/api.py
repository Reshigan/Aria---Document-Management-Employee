"""Manufacturing ERP API Endpoints"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timedelta
from .models import (
    ProductionOrder, ProductionOrderStatus, WorkCenter, WorkCenterStatus,
    BOM, BOMType, Routing, LaborTransaction, ShopFloorStatus,
    ProductionCost, ProductionMetrics
)
from .mrp_engine import MRPEngine, MRPParameters, MRPCalculationType, AdvancedScheduler

router = APIRouter(prefix="/api/v1/erp/manufacturing", tags=["Manufacturing ERP"])

# ============================================================================
# PRODUCTION ORDER ENDPOINTS
# ============================================================================

@router.post("/production-orders", response_model=ProductionOrder)
async def create_production_order(order: ProductionOrder):
    """Create new production order"""
    # Generate PO number if not provided
    if not order.production_order_number:
        order.production_order_number = f"PO-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Set timestamps
    order.created_at = datetime.now()
    order.updated_at = datetime.now()
    
    # TODO: Save to database
    # db.production_orders.insert(order.dict())
    
    return order

@router.get("/production-orders", response_model=List[ProductionOrder])
async def get_production_orders(
    status: Optional[ProductionOrderStatus] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """Get all production orders with optional filters"""
    # TODO: Query from database with filters
    return []

@router.get("/production-orders/{po_number}", response_model=ProductionOrder)
async def get_production_order(po_number: str):
    """Get specific production order by number"""
    # TODO: Query from database
    raise HTTPException(status_code=404, detail="Production order not found")

@router.put("/production-orders/{po_number}", response_model=ProductionOrder)
async def update_production_order(po_number: str, order: ProductionOrder):
    """Update production order"""
    order.updated_at = datetime.now()
    # TODO: Update in database
    return order

@router.post("/production-orders/{po_number}/release")
async def release_production_order(po_number: str):
    """Release production order to shop floor"""
    # TODO: Change status to RELEASED
    return {"success": True, "po_number": po_number, "status": "released"}

@router.post("/production-orders/{po_number}/start")
async def start_production_order(po_number: str):
    """Start production order"""
    # TODO: Change status to IN_PROGRESS
    return {"success": True, "po_number": po_number, "status": "in_progress", "started_at": datetime.now().isoformat()}

@router.post("/production-orders/{po_number}/complete")
async def complete_production_order(po_number: str, quantity_completed: float, quantity_rejected: float = 0.0):
    """Complete production order"""
    # TODO: Update quantities and status
    return {
        "success": True,
        "po_number": po_number,
        "status": "completed",
        "quantity_completed": quantity_completed,
        "quantity_rejected": quantity_rejected,
        "completed_at": datetime.now().isoformat()
    }

# ============================================================================
# WORK CENTER ENDPOINTS
# ============================================================================

@router.post("/work-centers", response_model=WorkCenter)
async def create_work_center(wc: WorkCenter):
    """Create new work center"""
    wc.created_at = datetime.now()
    wc.updated_at = datetime.now()
    # TODO: Save to database
    return wc

@router.get("/work-centers", response_model=List[WorkCenter])
async def get_work_centers(status: Optional[WorkCenterStatus] = None):
    """Get all work centers"""
    # TODO: Query from database
    return []

@router.get("/work-centers/{wc_id}", response_model=WorkCenter)
async def get_work_center(wc_id: str):
    """Get specific work center"""
    # TODO: Query from database
    raise HTTPException(status_code=404, detail="Work center not found")

@router.get("/work-centers/{wc_id}/capacity")
async def get_work_center_capacity(wc_id: str, date: str):
    """Get work center capacity for specific date"""
    # TODO: Calculate capacity
    return {
        "work_center_id": wc_id,
        "date": date,
        "available_hours": 8.0,
        "planned_hours": 6.5,
        "actual_hours": 5.8,
        "utilization": 72.5
    }

# ============================================================================
# BOM (BILL OF MATERIALS) ENDPOINTS
# ============================================================================

@router.post("/boms", response_model=BOM)
async def create_bom(bom: BOM):
    """Create new BOM"""
    bom.created_at = datetime.now()
    bom.updated_at = datetime.now()
    # TODO: Save to database
    return bom

@router.get("/boms", response_model=List[BOM])
async def get_boms(part_number: Optional[str] = None, is_active: bool = True):
    """Get all BOMs"""
    # TODO: Query from database
    return []

@router.get("/boms/{bom_id}", response_model=BOM)
async def get_bom(bom_id: str):
    """Get specific BOM"""
    # TODO: Query from database
    raise HTTPException(status_code=404, detail="BOM not found")

@router.post("/boms/{bom_id}/explode")
async def explode_bom(bom_id: str, quantity: float = 1.0, levels: int = 99):
    """Explode BOM to get all components (multi-level)"""
    # TODO: Recursive BOM explosion
    return {
        "bom_id": bom_id,
        "quantity": quantity,
        "components": [
            {"part": "PART-001", "qty": 2 * quantity, "level": 1},
            {"part": "PART-002", "qty": 4 * quantity, "level": 1},
            {"part": "PART-003", "qty": 8 * quantity, "level": 2}
        ]
    }

@router.post("/boms/{bom_id}/cost-rollup")
async def bom_cost_rollup(bom_id: str):
    """Calculate total BOM cost (cost roll-up)"""
    # TODO: Calculate material + labor + overhead
    return {
        "bom_id": bom_id,
        "material_cost": 150.00,
        "labor_cost": 50.00,
        "overhead_cost": 25.00,
        "total_cost": 225.00,
        "currency": "ZAR"
    }

@router.get("/boms/where-used/{part_number}")
async def where_used(part_number: str):
    """Find where a part is used (where-used query)"""
    # TODO: Query all BOMs containing this part
    return {
        "part_number": part_number,
        "used_in": ["BOM-001", "BOM-005", "BOM-012"],
        "parent_parts": ["ASSY-100", "ASSY-200", "ASSY-300"]
    }

# ============================================================================
# ROUTING ENDPOINTS
# ============================================================================

@router.post("/routings", response_model=Routing)
async def create_routing(routing: Routing):
    """Create new routing"""
    routing.created_at = datetime.now()
    routing.updated_at = datetime.now()
    # TODO: Save to database
    return routing

@router.get("/routings", response_model=List[Routing])
async def get_routings(part_number: Optional[str] = None):
    """Get all routings"""
    # TODO: Query from database
    return []

@router.get("/routings/{routing_id}", response_model=Routing)
async def get_routing(routing_id: str):
    """Get specific routing"""
    # TODO: Query from database
    raise HTTPException(status_code=404, detail="Routing not found")

# ============================================================================
# LABOR REPORTING ENDPOINTS
# ============================================================================

@router.post("/labor-transactions", response_model=LaborTransaction)
async def report_labor(transaction: LaborTransaction):
    """Report labor time"""
    if not transaction.id:
        transaction.id = f"LBR-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Calculate hours if clock_out provided
    if transaction.clock_out and transaction.clock_in:
        delta = transaction.clock_out - transaction.clock_in
        transaction.hours = delta.total_seconds() / 3600.0
    
    # TODO: Save to database and update production order
    return transaction

@router.get("/labor-transactions")
async def get_labor_transactions(
    po_number: Optional[str] = None,
    employee_id: Optional[str] = None,
    from_date: Optional[str] = None
):
    """Get labor transactions"""
    # TODO: Query from database
    return []

# ============================================================================
# SHOP FLOOR CONTROL ENDPOINTS
# ============================================================================

@router.get("/shop-floor/status", response_model=List[ShopFloorStatus])
async def get_shop_floor_status():
    """Get real-time shop floor status for all work centers"""
    # TODO: Query current status
    return []

@router.post("/shop-floor/clock-in")
async def clock_in(po_number: str, operation_id: str, employee_id: str, work_center_id: str):
    """Clock in to operation"""
    return {
        "success": True,
        "po_number": po_number,
        "operation_id": operation_id,
        "employee_id": employee_id,
        "clock_in_time": datetime.now().isoformat()
    }

@router.post("/shop-floor/clock-out")
async def clock_out(po_number: str, operation_id: str, employee_id: str, quantity_completed: float, quantity_rejected: float = 0.0):
    """Clock out from operation"""
    return {
        "success": True,
        "po_number": po_number,
        "operation_id": operation_id,
        "employee_id": employee_id,
        "clock_out_time": datetime.now().isoformat(),
        "quantity_completed": quantity_completed,
        "quantity_rejected": quantity_rejected
    }

# ============================================================================
# PRODUCTION COSTING ENDPOINTS
# ============================================================================

@router.get("/production-orders/{po_number}/cost", response_model=ProductionCost)
async def get_production_cost(po_number: str):
    """Get production order cost breakdown"""
    # TODO: Calculate actual costs from transactions
    return ProductionCost(
        production_order_number=po_number,
        material_cost=5000.00,
        labor_cost=1500.00,
        overhead_cost=750.00,
        total_cost=7250.00,
        cost_per_unit=72.50,
        currency="ZAR"
    )

# ============================================================================
# PRODUCTION REPORTING ENDPOINTS
# ============================================================================

@router.get("/reports/production-metrics", response_model=ProductionMetrics)
async def get_production_metrics(from_date: str, to_date: str):
    """Get production metrics for period"""
    # TODO: Calculate KPIs from production data
    return ProductionMetrics(
        period_start=datetime.fromisoformat(from_date),
        period_end=datetime.fromisoformat(to_date),
        total_orders=50,
        completed_orders=45,
        on_time_delivery=90.0,
        overall_equipment_effectiveness=85.0,
        first_pass_yield=95.0,
        scrap_rate=2.5,
        average_cycle_time_days=5.2,
        capacity_utilization=78.5
    )

@router.get("/reports/production-summary")
async def get_production_summary(period: str = "month"):
    """Get production summary"""
    return {
        "period": period,
        "total_production_orders": 50,
        "completed": 45,
        "in_progress": 3,
        "planned": 2,
        "total_quantity_produced": 15000,
        "total_quantity_rejected": 375,
        "yield": 96.2,
        "on_time_delivery": 90.0
    }

@router.get("/reports/work-center-performance")
async def get_work_center_performance(from_date: str, to_date: str):
    """Get work center performance report"""
    # TODO: Aggregate performance data
    return {
        "period_start": from_date,
        "period_end": to_date,
        "work_centers": [
            {
                "id": "WC-001",
                "name": "Assembly Line 1",
                "utilization": 85.5,
                "efficiency": 92.0,
                "downtime_hours": 12.5,
                "orders_completed": 25
            },
            {
                "id": "WC-002",
                "name": "Machining Center",
                "utilization": 78.2,
                "efficiency": 88.5,
                "downtime_hours": 18.0,
                "orders_completed": 30
            }
        ]
    }


# ============================================================================
# MRP (MATERIAL REQUIREMENTS PLANNING) ENDPOINTS
# ============================================================================

@router.post("/mrp/run")
async def run_mrp(
    planning_horizon_days: Optional[int] = 180,
    calculation_type: Optional[str] = "regenerative",
    include_wip: bool = True,
    include_po: bool = True
):
    """
    Run MRP calculation
    
    This calculates material requirements based on:
    - Sales orders and forecasts (demand)
    - Current inventory levels
    - Bills of materials (BOMs)
    - Production routings
    - Lead times and safety stock
    """
    # Sample demand data (in production, query from sales orders & forecasts)
    demand_data = [
        {
            "item_id": "ITEM-001",
            "item_code": "WIDGET-A",
            "item_name": "Widget Assembly A",
            "quantity": 500,
            "required_date": datetime.now() + timedelta(days=30),
            "source_type": "sales_order",
            "source_id": "SO-001",
            "uom": "EA",
            "lead_time_days": 7,
            "safety_stock": 50
        },
        {
            "item_id": "ITEM-002",
            "item_code": "GADGET-B",
            "item_name": "Gadget B",
            "quantity": 300,
            "required_date": datetime.now() + timedelta(days=45),
            "source_type": "sales_order",
            "source_id": "SO-002",
            "uom": "EA",
            "lead_time_days": 10,
            "safety_stock": 30
        }
    ]
    
    # Sample inventory data
    inventory_data = [
        {
            "item_id": "ITEM-001",
            "on_hand": 150,
            "allocated": 50,
            "on_order": 200
        },
        {
            "item_id": "ITEM-002",
            "on_hand": 80,
            "allocated": 30,
            "on_order": 0
        }
    ]
    
    # Sample BOM data
    bom_data = [
        {
            "item_id": "ITEM-001",
            "item_code": "WIDGET-A",
            "components": [
                {
                    "component_id": "COMP-001",
                    "component_code": "FRAME-A",
                    "component_name": "Frame A",
                    "quantity": 1,
                    "uom": "EA",
                    "lead_time_days": 5,
                    "safety_stock": 20
                },
                {
                    "component_id": "COMP-002",
                    "component_code": "MOTOR-B",
                    "component_name": "Motor B",
                    "quantity": 2,
                    "uom": "EA",
                    "lead_time_days": 14,
                    "safety_stock": 10
                }
            ]
        }
    ]
    
    # Sample routing data
    routing_data = [
        {
            "item_id": "ITEM-001",
            "routing_code": "ROUTE-001",
            "operations": [
                {
                    "operation_seq": 10,
                    "work_center_id": "WC-001",
                    "work_center_name": "Assembly Line 1",
                    "operation_desc": "Assembly",
                    "setup_time": 0.5,
                    "run_time": 0.1
                },
                {
                    "operation_seq": 20,
                    "work_center_id": "WC-003",
                    "work_center_name": "Quality Control",
                    "operation_desc": "QC Inspection",
                    "setup_time": 0.25,
                    "run_time": 0.05
                }
            ]
        }
    ]
    
    # Configure and run MRP
    calc_type = MRPCalculationType.REGENERATIVE if calculation_type == "regenerative" else MRPCalculationType.NET_CHANGE
    parameters = MRPParameters(
        planning_horizon_days=planning_horizon_days,
        calculation_type=calc_type,
        include_wip=include_wip,
        include_po=include_po
    )
    
    mrp_engine = MRPEngine(parameters)
    results = mrp_engine.run_mrp(demand_data, inventory_data, bom_data, routing_data)
    
    return results


@router.get("/mrp/planned-orders")
async def get_planned_orders(
    item_code: Optional[str] = None,
    order_type: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """Get planned orders from latest MRP run"""
    return {
        "status": "success",
        "planned_orders": [
            {
                "order_type": "production",
                "item_code": "WIDGET-A",
                "item_name": "Widget Assembly A",
                "quantity": 500,
                "start_date": (datetime.now() + timedelta(days=23)).isoformat(),
                "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
                "priority": 3,
                "status": "planned"
            },
            {
                "order_type": "purchase",
                "item_code": "MOTOR-B",
                "item_name": "Motor B",
                "quantity": 1000,
                "start_date": (datetime.now() + timedelta(days=9)).isoformat(),
                "due_date": (datetime.now() + timedelta(days=23)).isoformat(),
                "priority": 2,
                "status": "planned"
            }
        ]
    }


@router.post("/mrp/firm-planned-order/{order_id}")
async def firm_planned_order(order_id: str):
    """Convert planned order to firm production or purchase order"""
    return {
        "status": "success",
        "message": f"Planned order {order_id} converted to firm order",
        "firm_order_id": f"PO-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    }


# ============================================================================
# CAPACITY PLANNING ENDPOINTS
# ============================================================================

@router.get("/capacity/requirements")
async def get_capacity_requirements(
    work_center_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """Get capacity requirements by work center and date"""
    return {
        "status": "success",
        "capacity_requirements": [
            {
                "work_center_id": "WC-001",
                "work_center_name": "Assembly Line 1",
                "date": (datetime.now() + timedelta(days=1)).isoformat(),
                "required_hours": 12.5,
                "available_hours": 16.0,
                "utilization_pct": 78.1,
                "overload": False
            },
            {
                "work_center_id": "WC-001",
                "work_center_name": "Assembly Line 1",
                "date": (datetime.now() + timedelta(days=2)).isoformat(),
                "required_hours": 18.0,
                "available_hours": 16.0,
                "utilization_pct": 112.5,
                "overload": True
            }
        ],
        "summary": {
            "average_utilization": 85.3,
            "overloaded_days": 1,
            "total_days": 2
        }
    }


@router.get("/capacity/work-center/{work_center_id}")
async def get_work_center_capacity(work_center_id: str):
    """Get detailed capacity analysis for specific work center"""
    return {
        "work_center_id": work_center_id,
        "work_center_name": "Assembly Line 1",
        "available_hours_per_day": 16.0,
        "shifts": 2,
        "efficiency": 85.0,
        "utilization_7_days": 82.5,
        "utilization_30_days": 78.3,
        "overloaded_days_next_7": 2,
        "overloaded_days_next_30": 5,
        "bottleneck_score": 7.5,
        "recommendations": [
            "Consider adding overtime on days 2 and 5",
            "Potential bottleneck - monitor closely"
        ]
    }


# ============================================================================
# ADVANCED SCHEDULING ENDPOINTS
# ============================================================================

@router.post("/scheduling/optimize")
async def optimize_schedule(
    work_center_ids: Optional[List[str]] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """
    Run advanced scheduling with finite capacity
    
    Optimizes production schedule considering:
    - Work center capacity constraints
    - Material availability
    - Due dates and priorities
    - Setup times and changeovers
    """
    # Sample work orders to schedule
    work_orders = [
        {
            "id": "WO-001",
            "item_code": "WIDGET-A",
            "quantity": 500,
            "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "priority": 3,
            "estimated_hours": 50,
            "work_center_id": "WC-001"
        },
        {
            "id": "WO-002",
            "item_code": "GADGET-B",
            "quantity": 300,
            "due_date": (datetime.now() + timedelta(days=20)).isoformat(),
            "priority": 2,
            "estimated_hours": 30,
            "work_center_id": "WC-001"
        }
    ]
    
    # Sample work centers
    work_centers = [
        {
            "work_center_id": "WC-001",
            "name": "Assembly Line 1",
            "available_hours": 16
        },
        {
            "work_center_id": "WC-002",
            "name": "Machining Center",
            "available_hours": 24
        }
    ]
    
    scheduler = AdvancedScheduler()
    results = scheduler.schedule_with_finite_capacity(work_orders, work_centers)
    
    return results


@router.get("/scheduling/gantt-chart")
async def get_gantt_chart(
    work_center_ids: Optional[List[str]] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """Get Gantt chart data for production schedule"""
    return {
        "status": "success",
        "gantt_data": [
            {
                "work_order_id": "WO-001",
                "item_code": "WIDGET-A",
                "work_center_id": "WC-001",
                "work_center_name": "Assembly Line 1",
                "start_date": (datetime.now() + timedelta(days=1)).isoformat(),
                "end_date": (datetime.now() + timedelta(days=4)).isoformat(),
                "progress_pct": 0,
                "status": "scheduled"
            },
            {
                "work_order_id": "WO-002",
                "item_code": "GADGET-B",
                "work_center_id": "WC-001",
                "work_center_name": "Assembly Line 1",
                "start_date": (datetime.now() + timedelta(days=5)).isoformat(),
                "end_date": (datetime.now() + timedelta(days=7)).isoformat(),
                "progress_pct": 0,
                "status": "scheduled"
            }
        ]
    }
