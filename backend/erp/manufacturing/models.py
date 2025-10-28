"""Manufacturing ERP Database Models"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum

# ============================================================================
# ENUMS
# ============================================================================

class ProductionOrderStatus(str, Enum):
    PLANNED = "planned"
    RELEASED = "released"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CLOSED = "closed"
    CANCELLED = "cancelled"

class WorkCenterStatus(str, Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"

class BOMType(str, Enum):
    STANDARD = "standard"
    PHANTOM = "phantom"
    CONFIGURABLE = "configurable"

# ============================================================================
# WORK CENTER MODELS
# ============================================================================

class WorkCenter(BaseModel):
    """Work Center - Production resource (machine, line, station)"""
    id: str
    code: str
    name: str
    description: Optional[str] = None
    capacity_hours_per_day: float = 8.0
    efficiency: float = 85.0  # Percentage
    cost_per_hour: float = 0.0  # ZAR
    status: WorkCenterStatus = WorkCenterStatus.AVAILABLE
    department: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class WorkCenterCapacity(BaseModel):
    """Work Center Capacity Planning"""
    work_center_id: str
    date: str  # YYYY-MM-DD
    available_hours: float
    planned_hours: float
    actual_hours: float
    utilization: float  # Percentage

# ============================================================================
# BOM (BILL OF MATERIALS) MODELS
# ============================================================================

class BOMComponent(BaseModel):
    """BOM Component - Single line item"""
    id: str
    component_part_number: str
    component_description: str
    quantity: float
    uom: str = "EA"  # Unit of measure
    scrap_factor: float = 0.0  # Percentage
    operation_sequence: Optional[int] = None
    notes: Optional[str] = None

class BOM(BaseModel):
    """Bill of Materials"""
    id: str
    bom_number: str
    parent_part_number: str
    parent_description: str
    version: str = "1"
    bom_type: BOMType = BOMType.STANDARD
    effective_date: datetime = Field(default_factory=datetime.now)
    expiry_date: Optional[datetime] = None
    components: List[BOMComponent] = []
    base_quantity: float = 1.0  # BOM base quantity
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

# ============================================================================
# ROUTING MODELS
# ============================================================================

class RoutingOperation(BaseModel):
    """Routing Operation - Single production step"""
    id: str
    operation_number: int
    operation_name: str
    work_center_id: str
    setup_time_minutes: float = 0.0
    run_time_minutes_per_unit: float = 0.0
    queue_time_minutes: float = 0.0
    move_time_minutes: float = 0.0
    description: Optional[str] = None
    quality_check_required: bool = False

class Routing(BaseModel):
    """Routing - Sequence of operations to produce a product"""
    id: str
    routing_number: str
    part_number: str
    version: str = "1"
    operations: List[RoutingOperation] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

# ============================================================================
# PRODUCTION ORDER MODELS
# ============================================================================

class ProductionOrderMaterial(BaseModel):
    """Material required for production order"""
    id: str
    part_number: str
    description: str
    required_quantity: float
    issued_quantity: float = 0.0
    returned_quantity: float = 0.0
    uom: str = "EA"
    warehouse_location: Optional[str] = None

class ProductionOrderOperation(BaseModel):
    """Production order operation instance"""
    id: str
    operation_number: int
    operation_name: str
    work_center_id: str
    work_center_name: str
    status: str = "pending"  # pending, in_progress, completed
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    setup_hours: float = 0.0
    run_hours: float = 0.0
    labor_hours_reported: float = 0.0
    quantity_completed: float = 0.0
    quantity_rejected: float = 0.0

class ProductionOrder(BaseModel):
    """Production Order - Main manufacturing document"""
    id: str
    production_order_number: str
    part_number: str
    part_description: str
    order_quantity: float
    quantity_completed: float = 0.0
    quantity_rejected: float = 0.0
    uom: str = "EA"
    status: ProductionOrderStatus = ProductionOrderStatus.PLANNED
    priority: int = 5  # 1=highest, 10=lowest
    customer_order_ref: Optional[str] = None
    bom_id: Optional[str] = None
    routing_id: Optional[str] = None
    scheduled_start_date: Optional[datetime] = None
    scheduled_completion_date: Optional[datetime] = None
    actual_start_date: Optional[datetime] = None
    actual_completion_date: Optional[datetime] = None
    materials: List[ProductionOrderMaterial] = []
    operations: List[ProductionOrderOperation] = []
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

# ============================================================================
# LABOR REPORTING MODELS
# ============================================================================

class LaborTransaction(BaseModel):
    """Labor Time Reporting"""
    id: str
    production_order_number: str
    operation_id: str
    employee_id: str
    employee_name: str
    work_center_id: str
    transaction_date: datetime = Field(default_factory=datetime.now)
    clock_in: datetime
    clock_out: Optional[datetime] = None
    hours: float = 0.0
    quantity_completed: float = 0.0
    quantity_rejected: float = 0.0
    notes: Optional[str] = None

# ============================================================================
# SHOP FLOOR CONTROL MODELS
# ============================================================================

class ShopFloorStatus(BaseModel):
    """Real-time shop floor status"""
    work_center_id: str
    work_center_name: str
    current_status: WorkCenterStatus
    current_production_order: Optional[str] = None
    current_operation: Optional[str] = None
    operator: Optional[str] = None
    quantity_target: float = 0.0
    quantity_completed: float = 0.0
    quantity_rejected: float = 0.0
    efficiency: float = 0.0  # Percentage
    downtime_minutes: float = 0.0
    last_updated: datetime = Field(default_factory=datetime.now)

# ============================================================================
# COST MODELS
# ============================================================================

class ProductionCost(BaseModel):
    """Production Order Cost Tracking"""
    production_order_number: str
    material_cost: float = 0.0
    labor_cost: float = 0.0
    overhead_cost: float = 0.0
    total_cost: float = 0.0
    cost_per_unit: float = 0.0
    currency: str = "ZAR"
    calculated_at: datetime = Field(default_factory=datetime.now)

# ============================================================================
# PRODUCTION REPORTING MODELS
# ============================================================================

class ProductionMetrics(BaseModel):
    """Production KPIs and Metrics"""
    period_start: datetime
    period_end: datetime
    total_orders: int = 0
    completed_orders: int = 0
    on_time_delivery: float = 0.0  # Percentage
    overall_equipment_effectiveness: float = 0.0  # OEE %
    first_pass_yield: float = 0.0  # Percentage
    scrap_rate: float = 0.0  # Percentage
    average_cycle_time_days: float = 0.0
    capacity_utilization: float = 0.0  # Percentage
