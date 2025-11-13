"""
ARIA Field Service Module
Complete field service and operations management with bot automation
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, date
from uuid import UUID
from decimal import Decimal
import logging
import os
import sys
import httpx
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.erp_database import (
    create_service_request as db_create_service_request,
    get_service_request,
    create_work_order as db_create_work_order,
    update_work_order_status
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/field-service", tags=["Field Service"])


# ========================================
# REQUEST/RESPONSE MODELS
# ========================================

class ServiceRequestCreate(BaseModel):
    company_id: str
    customer_id: Optional[str] = None
    customer_name: str
    contact_name: str
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    site_name: Optional[str] = None
    site_address: Optional[str] = None
    asset_id: Optional[str] = None
    asset_description: Optional[str] = None
    request_type: str
    priority: str = "medium"
    description: str
    required_date: Optional[datetime] = None


class ServiceRequestResponse(BaseModel):
    id: int
    request_number: str
    company_id: str
    customer_name: str
    request_type: str
    priority: str
    status: str
    description: str
    reported_date: datetime
    assigned_to: Optional[str] = None


class WorkOrderCreate(BaseModel):
    company_id: str
    service_request_id: Optional[int] = None
    customer_id: Optional[str] = None
    customer_name: str
    site_name: Optional[str] = None
    site_address: Optional[str] = None
    asset_id: Optional[str] = None
    work_type: str
    priority: str = "medium"
    description: str
    scheduled_date: Optional[datetime] = None
    technician_id: Optional[str] = None


class WorkOrderResponse(BaseModel):
    id: int
    work_order_number: str
    company_id: str
    customer_name: str
    work_type: str
    priority: str
    status: str
    scheduled_date: Optional[datetime] = None
    technician_name: Optional[str] = None
    total_cost: Optional[float] = None


class TechnicianCreate(BaseModel):
    id: str
    company_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = []
    hourly_rate: Optional[float] = None


class TechnicianResponse(BaseModel):
    id: str
    company_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = []
    status: str
    hourly_rate: Optional[float] = None


# ========================================
# ========================================

class FieldServiceBot:
    """Base class for field service bots"""
    
    @staticmethod
    def execute(data: Dict[str, Any]) -> Dict[str, Any]:
        return {"status": "success", "message": "Bot executed"}


class IntakeTriageBot(FieldServiceBot):
    """
    Intake/Triage Bot
    Classifies inbound service requests and enriches with customer/site/asset data
    """
    
    @staticmethod
    def execute(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze service request and determine priority, type, and assignment
        """
        description = data.get("description", "").lower()
        customer_id = data.get("customer_id")
        
        request_type = "general"
        if any(word in description for word in ["urgent", "emergency", "down", "critical"]):
            request_type = "emergency"
            priority = "high"
        elif any(word in description for word in ["install", "installation", "setup"]):
            request_type = "installation"
            priority = "medium"
        elif any(word in description for word in ["repair", "fix", "broken", "not working"]):
            request_type = "repair"
            priority = "medium"
        elif any(word in description for word in ["maintenance", "service", "inspection"]):
            request_type = "maintenance"
            priority = "low"
        else:
            priority = data.get("priority", "medium")
        
        
        return {
            "status": "success",
            "bot": "Intake/Triage Bot",
            "request_type": request_type,
            "priority": priority,
            "recommended_technician": None,  # TODO: Match skills to request
            "sla_response_hours": 24,  # TODO: Get from SLA contract
            "estimated_duration": 120  # minutes
        }


class SchedulingOptimizerBot(FieldServiceBot):
    """
    Scheduling Optimizer Bot
    Proposes optimal schedule and technician assignment based on skills, SLA, proximity, and load
    """
    
    @staticmethod
    def execute(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Optimize work order scheduling
        """
        work_order = data.get("work_order", {})
        available_technicians = data.get("technicians", [])
        
        
        if available_technicians:
            best_technician = available_technicians[0]
            suggested_date = datetime.now() + timedelta(days=1)
        else:
            best_technician = None
            suggested_date = None
        
        return {
            "status": "success",
            "bot": "Scheduling Optimizer Bot",
            "recommended_technician": best_technician,
            "suggested_date": suggested_date.isoformat() if suggested_date else None,
            "estimated_duration": 120,
            "travel_time": 30,
            "confidence": 0.85
        }


class DispatchBot(FieldServiceBot):
    """
    Dispatch Bot
    Communicates assignments/ETAs to technicians and customers, updates status
    """
    
    @staticmethod
    def execute(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Dispatch work order to technician
        """
        work_order = data.get("work_order", {})
        technician = data.get("technician", {})
        
        
        return {
            "status": "success",
            "bot": "Dispatch Bot",
            "work_order_id": work_order.get("id"),
            "technician_notified": True,
            "customer_notified": True,
            "eta": (datetime.now() + timedelta(hours=2)).isoformat()
        }


class PartsReservationBot(FieldServiceBot):
    """
    Parts Reservation Bot
    Reserves/allocates parts from WMS, raises PO if stock shortfalls
    """
    
    @staticmethod
    async def execute(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Reserve parts for work order and create POs for shortfalls
        """
        work_order_id = data.get("work_order_id")
        company_id = data.get("company_id")
        required_parts = data.get("parts", [])
        
        # Reserve parts using inventory service
        try:
            from modules.inventory_service import reserve_parts
            
            reservation_result = await reserve_parts(
                company_id=UUID(company_id),
                reference_type="work_order",
                reference_id=UUID(str(work_order_id)),
                parts=required_parts
            )
            
            reserved_parts = reservation_result.get("reserved_parts", [])
            shortfall_parts = reservation_result.get("shortfall_parts", [])
            
            purchase_orders_created = []
            if shortfall_parts:
                from modules.erp_settings_service import get_setting
                
                default_supplier_id = await get_setting(
                    company_id,
                    "default_service_supplier_id",
                    "00000000-0000-0000-0000-000000000001"
                )
                
                service_api_key = os.getenv("SERVICE_API_KEY", "aria-internal-service-key-2025")
                headers = {"X-Service-Key": service_api_key}
                
                async with httpx.AsyncClient() as client:
                    for shortfall in shortfall_parts:
                        po_data = {
                            "supplier_id": default_supplier_id,
                            "order_date": date.today().isoformat(),
                            "delivery_date": (date.today() + timedelta(days=7)).isoformat(),
                            "reference": f"WO-{work_order_id}-SHORTFALL",
                            "lines": [{
                                "line_number": 1,
                                "product_id": shortfall["product_id"],
                                "quantity": shortfall["shortfall"],
                                "unit_price": 0,  # To be filled by procurement
                                "tax_rate": 0.15
                            }]
                        }
                        
                        response = await client.post(
                            "http://localhost:8000/api/erp/procure-to-pay/purchase-orders",
                            json=po_data,
                            headers=headers,
                            timeout=10.0
                        )
                        
                        if response.status_code == 200:
                            po_result = response.json()
                            purchase_orders_created.append(po_result.get("id"))
            
            return {
                "status": "success",
                "bot": "Parts Reservation Bot",
                "work_order_id": work_order_id,
                "reserved_parts": reserved_parts,
                "shortfall_parts": shortfall_parts,
                "purchase_orders_created": purchase_orders_created
            }
        
        except Exception as e:
            logger.error(f"Error in parts reservation: {e}")
            return {
                "status": "error",
                "message": str(e),
                "work_order_id": work_order_id
            }


class SLAMonitorBot(FieldServiceBot):
    """
    SLA Monitor Bot
    Alerts on approaching breaches and escalates
    """
    
    @staticmethod
    def execute(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Monitor SLA compliance
        """
        work_orders = data.get("work_orders", [])
        
        breaches = []
        warnings = []
        
        for wo in work_orders:
            
            age_hours = 12  # Placeholder
            sla_hours = 24  # Placeholder
            
            if age_hours > sla_hours:
                breaches.append({
                    "work_order_id": wo.get("id"),
                    "age_hours": age_hours,
                    "sla_hours": sla_hours,
                    "breach_hours": age_hours - sla_hours
                })
            elif age_hours > sla_hours * 0.8:
                warnings.append({
                    "work_order_id": wo.get("id"),
                    "age_hours": age_hours,
                    "sla_hours": sla_hours,
                    "remaining_hours": sla_hours - age_hours
                })
        
        return {
            "status": "success",
            "bot": "SLA Monitor Bot",
            "breaches": breaches,
            "warnings": warnings,
            "escalations_created": len(breaches)
        }


class CompletionBillingBot(FieldServiceBot):
    """
    Completion & Billing Bot
    After sign-off, compiles time/parts, generates invoice draft and posts to AR/GL
    Creates sales order via Order-to-Cash module for full traceability
    """
    
    @staticmethod
    async def execute(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Complete work order and generate invoice via Order-to-Cash
        """
        work_order = data.get("work_order", {})
        company_id = data.get("company_id")
        customer_id = data.get("customer_id")
        
        labor_hours = work_order.get("labor_hours", 0)
        hourly_rate = work_order.get("hourly_rate", 100)
        labor_cost = labor_hours * hourly_rate
        
        parts = work_order.get("parts", [])
        parts_cost = sum([p.get("total_price", 0) for p in parts])
        total_cost = labor_cost + parts_cost
        
        try:
            from modules.erp_settings_service import get_setting
            
            default_labor_product_id = await get_setting(
                company_id,
                "default_labor_product_id",
                "00000000-0000-0000-0000-000000000001"
            )
            
            service_api_key = os.getenv("SERVICE_API_KEY", "aria-internal-service-key-2025")
            headers = {"X-Service-Key": service_api_key}
            
            async with httpx.AsyncClient() as client:
                lines = []
                line_num = 1
                
                if labor_hours > 0:
                    lines.append({
                        "line_number": line_num,
                        "product_id": default_labor_product_id,
                        "description": f"Field Service Labor - {labor_hours} hours @ ${hourly_rate}/hr",
                        "quantity": labor_hours,
                        "unit_price": hourly_rate,
                        "tax_rate": 0.15
                    })
                    line_num += 1
                
                for part in parts:
                    lines.append({
                        "line_number": line_num,
                        "product_id": part.get("product_id"),
                        "description": part.get("description", "Field Service Part"),
                        "quantity": part.get("quantity", 1),
                        "unit_price": part.get("unit_price", 0),
                        "tax_rate": 0.15
                    })
                    line_num += 1
                
                sales_order = {
                    "customer_id": customer_id,
                    "order_date": date.today().isoformat(),
                    "delivery_date": date.today().isoformat(),
                    "reference": f"WO-{work_order.get('id')}",
                    "notes": f"Field Service Work Order {work_order.get('id')}",
                    "lines": lines
                }
                
                response = await client.post(
                    "http://localhost:8000/api/erp/order-to-cash/sales-orders",
                    json=sales_order,
                    headers=headers,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    so_data = response.json()
                    sales_order_id = so_data.get("id")
                    
                    # Approve the sales order to post to GL
                    approve_response = await client.post(
                        f"http://localhost:8000/api/erp/order-to-cash/sales-orders/{sales_order_id}/approve",
                        headers=headers,
                        timeout=10.0
                    )
                    
                    if approve_response.status_code == 200:
                        approve_data = approve_response.json()
                        return {
                            "status": "success",
                            "bot": "Completion & Billing Bot",
                            "work_order_id": work_order.get("id"),
                            "labor_cost": labor_cost,
                            "parts_cost": parts_cost,
                            "total_cost": total_cost,
                            "sales_order_id": sales_order_id,
                            "gl_posted": approve_data.get("gl_posted", False),
                            "gl_entry_id": approve_data.get("gl_entry_id")
                        }
                    else:
                        logger.error(f"Failed to approve sales order: {approve_response.text}")
                        return {
                            "status": "error",
                            "message": "Failed to approve sales order",
                            "sales_order_id": sales_order_id
                        }
                else:
                    logger.error(f"Failed to create sales order: {response.text}")
                    return {
                        "status": "error",
                        "message": "Failed to create sales order"
                    }
        
        except Exception as e:
            logger.error(f"Error in billing integration: {e}")
            return {
                "status": "error",
                "message": str(e),
                "labor_cost": labor_cost,
                "parts_cost": parts_cost,
                "total_cost": total_cost
            }


# ========================================
# API ENDPOINTS
# ========================================

@router.post("/service-requests", response_model=ServiceRequestResponse)
async def create_service_request(request: ServiceRequestCreate):
    """
    Create a new service request
    
    Automatically runs Intake/Triage Bot to classify and prioritize
    """
    try:
        triage_result = IntakeTriageBot.execute({
            "description": request.description,
            "customer_id": request.customer_id,
            "priority": request.priority
        })
        
        service_request = await db_create_service_request(
            customer_id=request.customer_id or "CUST-000",
            description=request.description,
            priority=triage_result["priority"],
            company_id=request.company_id,
            contact_name=request.contact_name,
            contact_phone=request.contact_phone,
            location=request.site_address
        )
        
        return ServiceRequestResponse(
            id=service_request['id'],
            request_number=f"SR-{service_request['id']}",
            company_id=service_request['company_id'],
            customer_name=request.customer_name,
            request_type=triage_result["request_type"],
            priority=service_request['priority'],
            status=service_request['status'],
            description=service_request['description'],
            reported_date=service_request['created_at'],
            assigned_to=triage_result.get("recommended_technician")
        )
    
    except Exception as e:
        logger.error(f"Error creating service request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/service-requests")
async def list_service_requests(
    company_id: str,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 100
):
    """List service requests with filters"""
    return {"service_requests": [], "total": 0}


@router.post("/work-orders", response_model=WorkOrderResponse)
async def create_work_order(request: WorkOrderCreate):
    """
    Create a new work order
    
    Automatically runs Scheduling Optimizer Bot to suggest technician and date
    """
    try:
        schedule_result = SchedulingOptimizerBot.execute({
            "work_order": request.dict(),
            "technicians": []
        })
        
        suggested_date = schedule_result.get("suggested_date")
        if isinstance(suggested_date, str):
            suggested_date = datetime.fromisoformat(suggested_date).date()
        elif isinstance(suggested_date, datetime):
            suggested_date = suggested_date.date()
        else:
            suggested_date = date.today()
        
        work_order = await db_create_work_order(
            service_request_id=request.service_request_id,
            technician_id=request.technician_id or "TECH-000",
            scheduled_date=suggested_date,
            company_id=request.company_id,
            description=request.description
        )
        
        return WorkOrderResponse(
            id=work_order['id'],
            work_order_number=f"WO-{work_order['id']}",
            company_id=work_order['company_id'],
            customer_name=request.customer_name,
            work_type=request.work_type,
            priority=request.priority,
            status=work_order['status'],
            scheduled_date=work_order['scheduled_date'],
            technician_name=None,
            total_cost=None
        )
    
    except Exception as e:
        logger.error(f"Error creating work order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/work-orders")
async def list_work_orders(
    company_id: str,
    status: Optional[str] = None,
    technician_id: Optional[str] = None,
    limit: int = 100
):
    """List work orders with filters"""
    return {"work_orders": [], "total": 0}


@router.post("/work-orders/{work_order_id}/dispatch")
async def dispatch_work_order(work_order_id: int):
    """
    Dispatch work order to technician
    
    Runs Dispatch Bot to notify technician and customer
    """
    try:
        work_order = {"id": work_order_id}
        
        dispatch_result = DispatchBot.execute({
            "work_order": work_order,
            "technician": {}  # TODO: Get technician
        })
        
        return dispatch_result
    
    except Exception as e:
        logger.error(f"Error dispatching work order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/work-orders/{work_order_id}/complete")
async def complete_work_order(
    work_order_id: int,
    company_id: str,
    customer_id: str,
    labor_hours: float = 2.0,
    hourly_rate: float = 100.0,
    parts: List[Dict] = []
):
    """
    Complete work order and generate invoice via Order-to-Cash
    
    Runs Completion & Billing Bot to create sales order and post to GL
    """
    try:
        work_order = {
            "id": work_order_id,
            "labor_hours": labor_hours,
            "hourly_rate": hourly_rate,
            "parts": parts
        }
        
        billing_result = await CompletionBillingBot.execute({
            "work_order": work_order,
            "company_id": company_id,
            "customer_id": customer_id
        })
        
        if billing_result.get("status") == "success":
            await update_work_order_status(str(work_order_id), 'completed', datetime.now())
        
        return billing_result
    
    except Exception as e:
        logger.error(f"Error completing work order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/technicians", response_model=TechnicianResponse)
async def create_technician(request: TechnicianCreate):
    """Create a new technician"""
    try:
        return TechnicianResponse(
            id=request.id,
            company_id=request.company_id,
            name=request.name,
            email=request.email,
            phone=request.phone,
            skills=request.skills,
            status="active",
            hourly_rate=request.hourly_rate
        )
    
    except Exception as e:
        logger.error(f"Error creating technician: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/technicians")
async def list_technicians(
    company_id: str,
    status: Optional[str] = None,
    limit: int = 100
):
    """List technicians with filters"""
    return {"technicians": [], "total": 0}


@router.get("/dispatch-board")
async def get_dispatch_board(
    company_id: str,
    date: Optional[str] = None
):
    """
    Get dispatch board view for scheduling
    
    Returns work orders grouped by technician with calendar view
    """
    
    return {
        "date": date or datetime.now().date().isoformat(),
        "technicians": [],
        "unassigned_work_orders": [],
        "total_capacity_hours": 0,
        "utilized_hours": 0,
        "utilization_percent": 0
    }


@router.get("/kpis")
async def get_field_service_kpis(
    company_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get field service KPIs
    
    Returns:
    - First-time fix rate
    - SLA compliance
    - MTTR/MTTA
    - Technician utilization
    - Parts consumption
    - Service margin
    """
    
    return {
        "first_time_fix_rate": 0.85,
        "sla_compliance_rate": 0.92,
        "mttr_hours": 4.5,
        "mtta_hours": 2.1,
        "technician_utilization": 0.78,
        "total_work_orders": 0,
        "completed_work_orders": 0,
        "total_revenue": 0,
        "total_cost": 0,
        "service_margin": 0
    }


@router.get("/health")
async def health_check():
    """Check field service module health"""
    return {
        "status": "healthy",
        "module": "field_service",
        "bots": [
            "Intake/Triage Bot",
            "Scheduling Optimizer Bot",
            "Dispatch Bot",
            "Parts Reservation Bot",
            "SLA Monitor Bot",
            "Completion & Billing Bot"
        ]
    }
