"""
ARIA - Complete ERP Backend System
Full-featured ERP with Manufacturing, Quality, Maintenance, and Advanced Features
Bot-Driven Enterprise Resource Planning
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta
from enum import Enum
import uuid
import json

app = FastAPI(
    title="ARIA - Complete ERP System",
    description="Bot-Driven Enterprise Resource Planning with Full Manufacturing Suite",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== ENUMS ====================

class OrderStatus(str, Enum):
    DRAFT = "draft"
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class QualityStatus(str, Enum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    REWORK = "rework"

class MaintenanceType(str, Enum):
    PREVENTIVE = "preventive"
    CORRECTIVE = "corrective"
    PREDICTIVE = "predictive"

class SubscriptionTier(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

# ==================== MODELS ====================

# Manufacturing Models
class BOMItem(BaseModel):
    item_code: str
    item_name: str
    quantity: float
    unit: str
    cost: float

class BillOfMaterials(BaseModel):
    bom_id: str = Field(default_factory=lambda: f"BOM-{uuid.uuid4().hex[:8].upper()}")
    product_code: str
    product_name: str
    version: str = "1.0"
    items: List[BOMItem]
    total_cost: float
    lead_time_days: int
    created_at: datetime = Field(default_factory=datetime.now)
    status: str = "active"

class WorkOrder(BaseModel):
    wo_id: str = Field(default_factory=lambda: f"WO-{uuid.uuid4().hex[:8].upper()}")
    product_code: str
    product_name: str
    quantity: int
    bom_id: str
    start_date: date
    end_date: date
    status: OrderStatus = OrderStatus.DRAFT
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    efficiency: Optional[float] = None
    defects: int = 0

class ProductionPlan(BaseModel):
    plan_id: str = Field(default_factory=lambda: f"PLAN-{uuid.uuid4().hex[:8].upper()}")
    period: str
    work_orders: List[str]
    total_capacity_hours: float
    used_capacity_hours: float
    utilization: float
    created_at: datetime = Field(default_factory=datetime.now)

# Quality Management Models
class QualityInspection(BaseModel):
    inspection_id: str = Field(default_factory=lambda: f"QI-{uuid.uuid4().hex[:8].upper()}")
    wo_id: str
    product_code: str
    inspector: str
    inspection_date: datetime = Field(default_factory=datetime.now)
    sample_size: int
    passed: int
    failed: int
    defect_types: List[str]
    status: QualityStatus
    notes: Optional[str] = None

class NonConformance(BaseModel):
    ncr_id: str = Field(default_factory=lambda: f"NCR-{uuid.uuid4().hex[:8].upper()}")
    wo_id: str
    product_code: str
    description: str
    severity: str  # "critical", "major", "minor"
    root_cause: Optional[str] = None
    corrective_action: Optional[str] = None
    preventive_action: Optional[str] = None
    status: str = "open"
    created_at: datetime = Field(default_factory=datetime.now)

class CAPA(BaseModel):
    """Corrective and Preventive Action"""
    capa_id: str = Field(default_factory=lambda: f"CAPA-{uuid.uuid4().hex[:8].upper()}")
    ncr_id: str
    action_type: str  # "corrective", "preventive"
    description: str
    responsible_person: str
    due_date: date
    completion_date: Optional[date] = None
    status: str = "open"
    effectiveness: Optional[str] = None

# Maintenance Management Models
class Asset(BaseModel):
    asset_id: str = Field(default_factory=lambda: f"AST-{uuid.uuid4().hex[:8].upper()}")
    asset_name: str
    asset_type: str  # "machine", "equipment", "vehicle", "building"
    location: str
    purchase_date: date
    purchase_cost: float
    current_value: float
    condition: str = "good"  # "excellent", "good", "fair", "poor"
    last_maintenance: Optional[date] = None
    next_maintenance: Optional[date] = None

class MaintenanceOrder(BaseModel):
    mo_id: str = Field(default_factory=lambda: f"MO-{uuid.uuid4().hex[:8].upper()}")
    asset_id: str
    maintenance_type: MaintenanceType
    description: str
    scheduled_date: date
    completed_date: Optional[date] = None
    technician: str
    cost: float = 0
    status: str = "scheduled"
    downtime_hours: float = 0
    notes: Optional[str] = None

# Procurement Models
class RFQ(BaseModel):
    """Request for Quotation"""
    rfq_id: str = Field(default_factory=lambda: f"RFQ-{uuid.uuid4().hex[:8].upper()}")
    items: List[Dict[str, Any]]
    suppliers: List[str]
    due_date: date
    created_at: datetime = Field(default_factory=datetime.now)
    status: str = "draft"

class PurchaseOrder(BaseModel):
    po_id: str = Field(default_factory=lambda: f"PO-{uuid.uuid4().hex[:8].upper()}")
    supplier: str
    items: List[Dict[str, Any]]
    total_amount: float
    delivery_date: date
    payment_terms: str
    status: str = "draft"
    created_at: datetime = Field(default_factory=datetime.now)

class Contract(BaseModel):
    contract_id: str = Field(default_factory=lambda: f"CTR-{uuid.uuid4().hex[:8].upper()}")
    vendor: str
    contract_type: str
    start_date: date
    end_date: date
    value: float
    terms: str
    auto_renew: bool = False
    status: str = "active"

# Multi-Tenancy Models
class Organization(BaseModel):
    org_id: str = Field(default_factory=lambda: f"ORG-{uuid.uuid4().hex[:8].upper()}")
    name: str
    subscription_tier: SubscriptionTier
    industry: str
    country: str = "South Africa"
    employees: int
    created_at: datetime = Field(default_factory=datetime.now)
    active: bool = True

class Subscription(BaseModel):
    subscription_id: str = Field(default_factory=lambda: f"SUB-{uuid.uuid4().hex[:8].upper()}")
    org_id: str
    tier: SubscriptionTier
    start_date: date
    end_date: date
    monthly_cost: float
    bots_limit: int
    users_limit: int
    status: str = "active"

# Analytics Models
class KPI(BaseModel):
    name: str
    value: float
    target: float
    unit: str
    trend: str  # "up", "down", "stable"
    period: str

# ==================== DATA STORES ====================

boms: Dict[str, BillOfMaterials] = {}
work_orders: Dict[str, WorkOrder] = {}
production_plans: Dict[str, ProductionPlan] = {}
quality_inspections: Dict[str, QualityInspection] = {}
non_conformances: Dict[str, NonConformance] = {}
capas: Dict[str, CAPA] = {}
assets: Dict[str, Asset] = {}
maintenance_orders: Dict[str, MaintenanceOrder] = {}
rfqs: Dict[str, RFQ] = {}
purchase_orders: Dict[str, PurchaseOrder] = {}
contracts: Dict[str, Contract] = {}
organizations: Dict[str, Organization] = {}
subscriptions: Dict[str, Subscription] = {}

# ==================== MANUFACTURING ENDPOINTS ====================

@app.post("/api/erp/manufacturing/bom", tags=["Manufacturing"])
async def create_bom(bom: BillOfMaterials):
    """Create Bill of Materials"""
    boms[bom.bom_id] = bom
    return {"status": "success", "bom_id": bom.bom_id, "data": bom}

@app.get("/api/erp/manufacturing/bom", tags=["Manufacturing"])
async def list_boms():
    """List all BOMs"""
    return {"status": "success", "count": len(boms), "boms": list(boms.values())}

@app.get("/api/erp/manufacturing/bom/{bom_id}", tags=["Manufacturing"])
async def get_bom(bom_id: str):
    """Get specific BOM"""
    if bom_id not in boms:
        raise HTTPException(status_code=404, detail="BOM not found")
    return {"status": "success", "data": boms[bom_id]}

@app.post("/api/erp/manufacturing/work-order", tags=["Manufacturing"])
async def create_work_order(wo: WorkOrder):
    """Create Work Order"""
    work_orders[wo.wo_id] = wo
    return {"status": "success", "wo_id": wo.wo_id, "data": wo}

@app.get("/api/erp/manufacturing/work-order", tags=["Manufacturing"])
async def list_work_orders(status: Optional[str] = None):
    """List all work orders"""
    orders = list(work_orders.values())
    if status:
        orders = [wo for wo in orders if wo.status == status]
    return {"status": "success", "count": len(orders), "work_orders": orders}

@app.put("/api/erp/manufacturing/work-order/{wo_id}/start", tags=["Manufacturing"])
async def start_work_order(wo_id: str):
    """Start work order"""
    if wo_id not in work_orders:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    work_orders[wo_id].status = OrderStatus.IN_PROGRESS
    work_orders[wo_id].actual_start = datetime.now()
    
    return {"status": "success", "message": "Work order started", "data": work_orders[wo_id]}

@app.put("/api/erp/manufacturing/work-order/{wo_id}/complete", tags=["Manufacturing"])
async def complete_work_order(wo_id: str):
    """Complete work order"""
    if wo_id not in work_orders:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    work_orders[wo_id].status = OrderStatus.COMPLETED
    work_orders[wo_id].actual_end = datetime.now()
    
    # Calculate efficiency
    if work_orders[wo_id].actual_start:
        planned_duration = (work_orders[wo_id].end_date - work_orders[wo_id].start_date).days
        actual_duration = (work_orders[wo_id].actual_end - work_orders[wo_id].actual_start).days
        if actual_duration > 0:
            work_orders[wo_id].efficiency = (planned_duration / actual_duration) * 100
    
    return {"status": "success", "message": "Work order completed", "data": work_orders[wo_id]}

@app.post("/api/erp/manufacturing/production-plan", tags=["Manufacturing"])
async def create_production_plan(plan: ProductionPlan):
    """Create production plan"""
    production_plans[plan.plan_id] = plan
    return {"status": "success", "plan_id": plan.plan_id, "data": plan}

@app.get("/api/erp/manufacturing/production-plan", tags=["Manufacturing"])
async def list_production_plans():
    """List production plans"""
    return {"status": "success", "count": len(production_plans), "plans": list(production_plans.values())}

@app.get("/api/erp/manufacturing/dashboard", tags=["Manufacturing"])
async def manufacturing_dashboard():
    """Manufacturing dashboard with KPIs"""
    total_wos = len(work_orders)
    in_progress = len([wo for wo in work_orders.values() if wo.status == OrderStatus.IN_PROGRESS])
    completed = len([wo for wo in work_orders.values() if wo.status == OrderStatus.COMPLETED])
    avg_efficiency = sum([wo.efficiency or 0 for wo in work_orders.values() if wo.efficiency]) / max(completed, 1)
    
    return {
        "status": "success",
        "dashboard": {
            "total_work_orders": total_wos,
            "in_progress": in_progress,
            "completed": completed,
            "completion_rate": (completed / max(total_wos, 1)) * 100,
            "average_efficiency": avg_efficiency,
            "total_boms": len(boms),
            "production_plans": len(production_plans)
        }
    }

# ==================== QUALITY MANAGEMENT ENDPOINTS ====================

@app.post("/api/erp/quality/inspection", tags=["Quality"])
async def create_inspection(inspection: QualityInspection):
    """Create quality inspection"""
    quality_inspections[inspection.inspection_id] = inspection
    
    # Auto-create NCR if failed
    if inspection.status == QualityStatus.FAILED:
        ncr = NonConformance(
            wo_id=inspection.wo_id,
            product_code=inspection.product_code,
            description=f"Quality inspection failed: {', '.join(inspection.defect_types)}",
            severity="major"
        )
        non_conformances[ncr.ncr_id] = ncr
    
    return {"status": "success", "inspection_id": inspection.inspection_id, "data": inspection}

@app.get("/api/erp/quality/inspection", tags=["Quality"])
async def list_inspections(status: Optional[str] = None):
    """List quality inspections"""
    inspections = list(quality_inspections.values())
    if status:
        inspections = [qi for qi in inspections if qi.status == status]
    return {"status": "success", "count": len(inspections), "inspections": inspections}

@app.post("/api/erp/quality/ncr", tags=["Quality"])
async def create_ncr(ncr: NonConformance):
    """Create Non-Conformance Report"""
    non_conformances[ncr.ncr_id] = ncr
    return {"status": "success", "ncr_id": ncr.ncr_id, "data": ncr}

@app.get("/api/erp/quality/ncr", tags=["Quality"])
async def list_ncrs(status: Optional[str] = None):
    """List Non-Conformance Reports"""
    ncrs = list(non_conformances.values())
    if status:
        ncrs = [ncr for ncr in ncrs if ncr.status == status]
    return {"status": "success", "count": len(ncrs), "ncrs": ncrs}

@app.post("/api/erp/quality/capa", tags=["Quality"])
async def create_capa(capa: CAPA):
    """Create CAPA (Corrective and Preventive Action)"""
    capas[capa.capa_id] = capa
    return {"status": "success", "capa_id": capa.capa_id, "data": capa}

@app.get("/api/erp/quality/capa", tags=["Quality"])
async def list_capas(status: Optional[str] = None):
    """List CAPAs"""
    capa_list = list(capas.values())
    if status:
        capa_list = [c for c in capa_list if c.status == status]
    return {"status": "success", "count": len(capa_list), "capas": capa_list}

@app.get("/api/erp/quality/dashboard", tags=["Quality"])
async def quality_dashboard():
    """Quality dashboard with metrics"""
    total_inspections = len(quality_inspections)
    passed = len([qi for qi in quality_inspections.values() if qi.status == QualityStatus.PASSED])
    failed = len([qi for qi in quality_inspections.values() if qi.status == QualityStatus.FAILED])
    
    return {
        "status": "success",
        "dashboard": {
            "total_inspections": total_inspections,
            "passed": passed,
            "failed": failed,
            "pass_rate": (passed / max(total_inspections, 1)) * 100,
            "open_ncrs": len([ncr for ncr in non_conformances.values() if ncr.status == "open"]),
            "open_capas": len([c for c in capas.values() if c.status == "open"]),
            "total_ncrs": len(non_conformances),
            "total_capas": len(capas)
        }
    }

# ==================== MAINTENANCE MANAGEMENT ENDPOINTS ====================

@app.post("/api/erp/maintenance/asset", tags=["Maintenance"])
async def create_asset(asset: Asset):
    """Create asset"""
    assets[asset.asset_id] = asset
    return {"status": "success", "asset_id": asset.asset_id, "data": asset}

@app.get("/api/erp/maintenance/asset", tags=["Maintenance"])
async def list_assets():
    """List all assets"""
    return {"status": "success", "count": len(assets), "assets": list(assets.values())}

@app.post("/api/erp/maintenance/order", tags=["Maintenance"])
async def create_maintenance_order(mo: MaintenanceOrder):
    """Create maintenance order"""
    maintenance_orders[mo.mo_id] = mo
    return {"status": "success", "mo_id": mo.mo_id, "data": mo}

@app.get("/api/erp/maintenance/order", tags=["Maintenance"])
async def list_maintenance_orders(status: Optional[str] = None):
    """List maintenance orders"""
    orders = list(maintenance_orders.values())
    if status:
        orders = [mo for mo in orders if mo.status == status]
    return {"status": "success", "count": len(orders), "orders": orders}

@app.put("/api/erp/maintenance/order/{mo_id}/complete", tags=["Maintenance"])
async def complete_maintenance(mo_id: str):
    """Complete maintenance order"""
    if mo_id not in maintenance_orders:
        raise HTTPException(status_code=404, detail="Maintenance order not found")
    
    maintenance_orders[mo_id].status = "completed"
    maintenance_orders[mo_id].completed_date = date.today()
    
    # Update asset
    asset_id = maintenance_orders[mo_id].asset_id
    if asset_id in assets:
        assets[asset_id].last_maintenance = date.today()
        # Schedule next maintenance (90 days for preventive)
        if maintenance_orders[mo_id].maintenance_type == MaintenanceType.PREVENTIVE:
            assets[asset_id].next_maintenance = date.today() + timedelta(days=90)
    
    return {"status": "success", "message": "Maintenance completed", "data": maintenance_orders[mo_id]}

@app.get("/api/erp/maintenance/dashboard", tags=["Maintenance"])
async def maintenance_dashboard():
    """Maintenance dashboard"""
    total_assets = len(assets)
    total_orders = len(maintenance_orders)
    completed = len([mo for mo in maintenance_orders.values() if mo.status == "completed"])
    overdue = len([mo for mo in maintenance_orders.values() 
                   if mo.status == "scheduled" and mo.scheduled_date < date.today()])
    
    return {
        "status": "success",
        "dashboard": {
            "total_assets": total_assets,
            "total_orders": total_orders,
            "completed_orders": completed,
            "overdue_orders": overdue,
            "completion_rate": (completed / max(total_orders, 1)) * 100,
            "preventive_orders": len([mo for mo in maintenance_orders.values() 
                                     if mo.maintenance_type == MaintenanceType.PREVENTIVE]),
            "corrective_orders": len([mo for mo in maintenance_orders.values() 
                                     if mo.maintenance_type == MaintenanceType.CORRECTIVE])
        }
    }

# ==================== PROCUREMENT ENDPOINTS ====================

@app.post("/api/erp/procurement/rfq", tags=["Procurement"])
async def create_rfq(rfq: RFQ):
    """Create Request for Quotation"""
    rfqs[rfq.rfq_id] = rfq
    return {"status": "success", "rfq_id": rfq.rfq_id, "data": rfq}

@app.get("/api/erp/procurement/rfq", tags=["Procurement"])
async def list_rfqs():
    """List RFQs"""
    return {"status": "success", "count": len(rfqs), "rfqs": list(rfqs.values())}

@app.post("/api/erp/procurement/purchase-order", tags=["Procurement"])
async def create_purchase_order(po: PurchaseOrder):
    """Create Purchase Order"""
    purchase_orders[po.po_id] = po
    return {"status": "success", "po_id": po.po_id, "data": po}

@app.get("/api/erp/procurement/purchase-order", tags=["Procurement"])
async def list_purchase_orders():
    """List Purchase Orders"""
    return {"status": "success", "count": len(purchase_orders), "pos": list(purchase_orders.values())}

@app.post("/api/erp/procurement/contract", tags=["Procurement"])
async def create_contract(contract: Contract):
    """Create Contract"""
    contracts[contract.contract_id] = contract
    return {"status": "success", "contract_id": contract.contract_id, "data": contract}

@app.get("/api/erp/procurement/contract", tags=["Procurement"])
async def list_contracts():
    """List Contracts"""
    return {"status": "success", "count": len(contracts), "contracts": list(contracts.values())}

@app.get("/api/erp/procurement/dashboard", tags=["Procurement"])
async def procurement_dashboard():
    """Procurement dashboard"""
    return {
        "status": "success",
        "dashboard": {
            "active_rfqs": len([rfq for rfq in rfqs.values() if rfq.status != "closed"]),
            "total_pos": len(purchase_orders),
            "pending_pos": len([po for po in purchase_orders.values() if po.status == "draft"]),
            "active_contracts": len([c for c in contracts.values() if c.status == "active"]),
            "total_rfqs": len(rfqs),
            "total_contracts": len(contracts)
        }
    }

# ==================== MULTI-TENANCY ENDPOINTS ====================

@app.post("/api/organizations", tags=["Multi-Tenancy"])
async def create_organization(org: Organization):
    """Create organization"""
    organizations[org.org_id] = org
    
    # Auto-create subscription
    subscription = Subscription(
        org_id=org.org_id,
        tier=org.subscription_tier,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=365),
        monthly_cost=get_tier_price(org.subscription_tier),
        bots_limit=get_tier_bots_limit(org.subscription_tier),
        users_limit=get_tier_users_limit(org.subscription_tier)
    )
    subscriptions[subscription.subscription_id] = subscription
    
    return {"status": "success", "org_id": org.org_id, "subscription_id": subscription.subscription_id}

@app.get("/api/organizations", tags=["Multi-Tenancy"])
async def list_organizations():
    """List organizations"""
    return {"status": "success", "count": len(organizations), "organizations": list(organizations.values())}

@app.get("/api/organizations/{org_id}/subscription", tags=["Multi-Tenancy"])
async def get_subscription(org_id: str):
    """Get organization subscription"""
    subs = [s for s in subscriptions.values() if s.org_id == org_id]
    if not subs:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"status": "success", "subscription": subs[0]}

def get_tier_price(tier: SubscriptionTier) -> float:
    prices = {
        SubscriptionTier.FREE: 0,
        SubscriptionTier.STARTER: 499,
        SubscriptionTier.PROFESSIONAL: 1999,
        SubscriptionTier.ENTERPRISE: 4999
    }
    return prices.get(tier, 0)

def get_tier_bots_limit(tier: SubscriptionTier) -> int:
    limits = {
        SubscriptionTier.FREE: 5,
        SubscriptionTier.STARTER: 20,
        SubscriptionTier.PROFESSIONAL: 44,
        SubscriptionTier.ENTERPRISE: 999
    }
    return limits.get(tier, 5)

def get_tier_users_limit(tier: SubscriptionTier) -> int:
    limits = {
        SubscriptionTier.FREE: 3,
        SubscriptionTier.STARTER: 10,
        SubscriptionTier.PROFESSIONAL: 50,
        SubscriptionTier.ENTERPRISE: 9999
    }
    return limits.get(tier, 3)

# ==================== ANALYTICS & REPORTING ====================

@app.get("/api/analytics/overview", tags=["Analytics"])
async def analytics_overview():
    """Overall analytics overview"""
    return {
        "status": "success",
        "analytics": {
            "manufacturing": {
                "total_work_orders": len(work_orders),
                "completion_rate": (len([wo for wo in work_orders.values() 
                                        if wo.status == OrderStatus.COMPLETED]) / max(len(work_orders), 1)) * 100,
                "total_boms": len(boms)
            },
            "quality": {
                "total_inspections": len(quality_inspections),
                "pass_rate": (len([qi for qi in quality_inspections.values() 
                                  if qi.status == QualityStatus.PASSED]) / max(len(quality_inspections), 1)) * 100,
                "open_ncrs": len([ncr for ncr in non_conformances.values() if ncr.status == "open"])
            },
            "maintenance": {
                "total_assets": len(assets),
                "total_orders": len(maintenance_orders),
                "overdue": len([mo for mo in maintenance_orders.values() 
                               if mo.status == "scheduled" and mo.scheduled_date < date.today()])
            },
            "procurement": {
                "active_rfqs": len([rfq for rfq in rfqs.values() if rfq.status != "closed"]),
                "total_pos": len(purchase_orders),
                "active_contracts": len([c for c in contracts.values() if c.status == "active"])
            },
            "organizations": {
                "total": len(organizations),
                "active_subscriptions": len([s for s in subscriptions.values() if s.status == "active"])
            }
        }
    }

@app.get("/api/analytics/kpis", tags=["Analytics"])
async def get_kpis():
    """Get Key Performance Indicators"""
    kpis = [
        KPI(name="OEE", value=85.5, target=90, unit="%", trend="up", period="This Month"),
        KPI(name="First Pass Yield", value=92.3, target=95, unit="%", trend="stable", period="This Month"),
        KPI(name="On-Time Delivery", value=88.7, target=95, unit="%", trend="down", period="This Month"),
        KPI(name="Quality Cost", value=2.1, target=2.0, unit="%", trend="stable", period="This Month"),
        KPI(name="MTBF", value=450, target=500, unit="hours", trend="up", period="This Month"),
        KPI(name="MTTR", value=3.2, target=2.5, unit="hours", trend="down", period="This Month"),
    ]
    return {"status": "success", "kpis": kpis}

# ==================== HEALTH & STATUS ====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "modules": {
            "manufacturing": True,
            "quality": True,
            "maintenance": True,
            "procurement": True,
            "multi_tenancy": True,
            "analytics": True
        },
        "data_counts": {
            "boms": len(boms),
            "work_orders": len(work_orders),
            "quality_inspections": len(quality_inspections),
            "assets": len(assets),
            "maintenance_orders": len(maintenance_orders),
            "purchase_orders": len(purchase_orders),
            "organizations": len(organizations)
        }
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "ARIA - Complete ERP System",
        "version": "2.0.0",
        "description": "Bot-Driven Enterprise Resource Planning",
        "modules": [
            "Manufacturing (MRP, Production Planning, BOM, Work Orders)",
            "Quality Management (Inspections, NCR, CAPA)",
            "Maintenance Management (PM, CM, Asset Management)",
            "Procurement (RFQ, PO, Contracts)",
            "Multi-Tenancy & Organizations",
            "Analytics & Reporting"
        ],
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
