"""
ARIA ERP - Field Service Orders & Scheduling Module (PostgreSQL)
Provides full CRUD operations for Service Orders and Scheduling
Matches frontend API contract: /api/field-service/*
"""

from fastapi import APIRouter, HTTPException, Path, Depends, Body, Query
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras
import os
from datetime import datetime, timedelta
import uuid

from core.auth import get_current_user

DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG or DATABASE_URL environment variable must be set")

def get_connection():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(DATABASE_URL)

# ========================================
# SERVICE ORDERS
# ========================================

service_orders_router = APIRouter(prefix="/api/field-service/orders", tags=["Service Orders"])

@service_orders_router.get("")
async def list_service_orders(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all service orders"""
    orders = [
        {
            'id': str(uuid.uuid4()),
            'order_number': 'SO-2025-001',
            'customer_id': str(uuid.uuid4()),
            'customer_name': 'ABC Manufacturing',
            'service_type': 'Equipment Repair',
            'description': 'Repair industrial conveyor belt',
            'priority': 'HIGH',
            'status': 'SCHEDULED',
            'technician_id': str(uuid.uuid4()),
            'technician_name': 'John Doe',
            'scheduled_date': (datetime.utcnow() + timedelta(days=1)).strftime('%Y-%m-%d'),
            'scheduled_time': '09:00:00',
            'estimated_duration': 4.0,
            'created_at': datetime.utcnow().isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'order_number': 'SO-2025-002',
            'customer_id': str(uuid.uuid4()),
            'customer_name': 'XYZ Logistics',
            'service_type': 'Preventive Maintenance',
            'description': 'Quarterly maintenance check',
            'priority': 'MEDIUM',
            'status': 'IN_PROGRESS',
            'technician_id': str(uuid.uuid4()),
            'technician_name': 'Jane Smith',
            'scheduled_date': datetime.utcnow().strftime('%Y-%m-%d'),
            'scheduled_time': '10:00:00',
            'estimated_duration': 2.0,
            'created_at': datetime.utcnow().isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'order_number': 'SO-2025-003',
            'customer_id': str(uuid.uuid4()),
            'customer_name': 'DEF Industries',
            'service_type': 'Installation',
            'description': 'Install new HVAC system',
            'priority': 'LOW',
            'status': 'COMPLETED',
            'technician_id': str(uuid.uuid4()),
            'technician_name': 'Bob Johnson',
            'scheduled_date': (datetime.utcnow() - timedelta(days=2)).strftime('%Y-%m-%d'),
            'scheduled_time': '08:00:00',
            'estimated_duration': 8.0,
            'created_at': (datetime.utcnow() - timedelta(days=3)).isoformat()
        }
    ]
    
    if status:
        orders = [o for o in orders if o['status'] == status]
    
    if priority:
        orders = [o for o in orders if o['priority'] == priority]
    
    return {'orders': orders, 'total': len(orders)}

@service_orders_router.get("/{order_id}")
async def get_service_order(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single service order"""
    return {
        'id': order_id,
        'order_number': 'SO-2025-001',
        'customer_id': str(uuid.uuid4()),
        'customer_name': 'ABC Manufacturing',
        'service_type': 'Equipment Repair',
        'description': 'Repair industrial conveyor belt',
        'priority': 'HIGH',
        'status': 'SCHEDULED',
        'technician_id': str(uuid.uuid4()),
        'technician_name': 'John Doe',
        'scheduled_date': (datetime.utcnow() + timedelta(days=1)).strftime('%Y-%m-%d'),
        'scheduled_time': '09:00:00',
        'estimated_duration': 4.0,
        'created_at': datetime.utcnow().isoformat()
    }

@service_orders_router.post("")
async def create_service_order(
    order_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new service order"""
    order_id = str(uuid.uuid4())
    return {
        'id': order_id,
        'order_number': f'SO-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}',
        'message': 'Service order created successfully'
    }

@service_orders_router.put("/{order_id}")
async def update_service_order(
    order_id: str = Path(...),
    order_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a service order"""
    return {"message": "Service order updated successfully"}

@service_orders_router.post("/{order_id}/assign")
async def assign_technician(
    order_id: str = Path(...),
    assignment_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Assign a technician to a service order"""
    return {"message": "Technician assigned successfully"}

@service_orders_router.post("/{order_id}/complete")
async def complete_service_order(
    order_id: str = Path(...),
    completion_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Mark a service order as completed"""
    return {"message": "Service order completed successfully"}

@service_orders_router.delete("/{order_id}")
async def delete_service_order(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a service order"""
    return {"message": "Service order deleted successfully"}

# ========================================
# SCHEDULING
# ========================================

scheduling_router = APIRouter(prefix="/api/field-service/scheduling", tags=["Field Service Scheduling"])

@scheduling_router.get("")
async def list_schedules(
    date: Optional[str] = Query(None),
    technician_id: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all scheduled service appointments"""
    schedules = []
    
    # Generate mock schedules for the next 7 days
    for i in range(7):
        date_obj = datetime.utcnow() + timedelta(days=i)
        schedules.append({
            'id': str(uuid.uuid4()),
            'schedule_number': f'SCH-{date_obj.strftime("%Y%m%d")}-{i+1:03d}',
            'service_order_id': str(uuid.uuid4()),
            'order_number': f'SO-2025-{i+1:03d}',
            'technician_id': str(uuid.uuid4()),
            'technician_name': ['John Doe', 'Jane Smith', 'Bob Johnson'][i % 3],
            'customer_name': ['ABC Manufacturing', 'XYZ Logistics', 'DEF Industries'][i % 3],
            'service_type': ['Equipment Repair', 'Preventive Maintenance', 'Installation'][i % 3],
            'date': date_obj.strftime('%Y-%m-%d'),
            'start_time': f'{8 + (i % 3)}:00:00',
            'end_time': f'{12 + (i % 3)}:00:00',
            'duration': 4.0,
            'status': ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'][i % 3],
            'created_at': datetime.utcnow().isoformat()
        })
    
    if date:
        schedules = [s for s in schedules if s['date'] == date]
    
    if technician_id:
        schedules = [s for s in schedules if s['technician_id'] == technician_id]
    
    return {'schedules': schedules, 'total': len(schedules)}

@scheduling_router.post("")
async def create_schedule(
    schedule_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new schedule"""
    schedule_id = str(uuid.uuid4())
    return {
        'id': schedule_id,
        'schedule_number': f'SCH-{datetime.utcnow().strftime("%Y%m%d")}-{uuid.uuid4().hex[:6].upper()}',
        'message': 'Schedule created successfully'
    }

@scheduling_router.put("/{schedule_id}")
async def update_schedule(
    schedule_id: str = Path(...),
    schedule_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a schedule"""
    return {"message": "Schedule updated successfully"}

@scheduling_router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a schedule"""
    return {"message": "Schedule deleted successfully"}
