"""
ARIA ERP - Field Service Work Orders Alias API
Provides work-orders endpoints that map to service_requests backend
This maintains business-friendly naming while using existing database tables
"""
from fastapi import APIRouter, HTTPException, Path, Depends, Body, Query
from typing import Dict, Any, List, Optional
from app.api.field_service_pg import (
    service_requests_router,
    list_service_requests,
    get_service_request,
    create_service_request,
    update_service_request,
    complete_service_request,
    cancel_service_request,
    delete_service_request,
)
from core.auth import get_current_user

work_orders_router = APIRouter(prefix="/api/field-service/work-orders", tags=["Field Service Work Orders"])

@work_orders_router.get("")
async def list_work_orders(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all work orders (alias for service requests)"""
    result = await list_service_requests(status=status, priority=priority, current_user=current_user)
    return {"work_orders": result, "total": len(result)}

@work_orders_router.get("/{order_id}")
async def get_work_order(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single work order (alias for service request)"""
    return await get_service_request(request_id=order_id, current_user=current_user)

@work_orders_router.post("")
async def create_work_order(
    order_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new work order (alias for service request)"""
    return await create_service_request(request_data=order_data, current_user=current_user)

@work_orders_router.put("/{order_id}")
async def update_work_order(
    order_id: str = Path(...),
    order_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a work order (alias for service request)"""
    return await update_service_request(request_id=order_id, request_data=order_data, current_user=current_user)

@work_orders_router.post("/{order_id}/complete")
async def complete_work_order(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Complete a work order (alias for service request)"""
    return await complete_service_request(request_id=order_id, current_user=current_user)

@work_orders_router.post("/{order_id}/cancel")
async def cancel_work_order(
    order_id: str = Path(...),
    cancel_data: Dict[str, Any] = Body(default={}),
    current_user: Dict = Depends(get_current_user)
):
    """Cancel a work order (alias for service request)"""
    return await cancel_service_request(request_id=order_id, cancel_data=cancel_data, current_user=current_user)

@work_orders_router.delete("/{order_id}")
async def delete_work_order(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a work order (alias for service request)"""
    return await delete_service_request(request_id=order_id, current_user=current_user)

@work_orders_router.get("/dashboard/stats", include_in_schema=False)
async def get_dashboard_stats(
    company_id: int = Query(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get dashboard statistics for field service"""
    return {
        "total_work_orders": 0,
        "open_work_orders": 0,
        "in_progress_work_orders": 0,
        "completed_today": 0,
        "active_technicians": 0,
        "scheduled_today": 0,
    }

@work_orders_router.get("/{order_id}/time-entries")
async def get_time_entries(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get time entries for a work order"""
    return {"time_entries": []}

@work_orders_router.get("/{order_id}/parts")
async def get_parts_used(
    order_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get parts used for a work order"""
    return {"parts": []}
