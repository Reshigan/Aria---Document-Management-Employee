"""
Super Admin API for ARIA ERP
Provides system-wide administrative capabilities
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import json

from app.core.super_admin import get_super_admin_dashboard

router = APIRouter(prefix="/super-admin", tags=["Super Admin"])

# In a real implementation, this would check for super admin permissions
def verify_super_admin(current_user = Depends(lambda: {"role": "super_admin"})):
    """Verify user has super admin privileges"""
    if not current_user or current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


@router.get("/system-overview")
async def get_system_overview(current_user = Depends(verify_super_admin)):
    """Get comprehensive system overview"""
    dashboard = get_super_admin_dashboard()
    return dashboard.get_system_overview()


@router.get("/bot-report")
async def get_bot_report(
    bot_id: Optional[str] = None,
    current_user = Depends(verify_super_admin)
):
    """Get detailed bot performance report"""
    dashboard = get_super_admin_dashboard()
    return dashboard.get_detailed_bot_report(bot_id)


@router.post("/maintenance/{maintenance_type}")
async def initiate_maintenance(
    maintenance_type: str,
    current_user = Depends(verify_super_admin)
):
    """Initiate system maintenance"""
    dashboard = get_super_admin_dashboard()
    return dashboard.initiate_system_maintenance(maintenance_type)


@router.get("/security-report")
async def get_security_report(current_user = Depends(verify_super_admin)):
    """Get security and compliance report"""
    dashboard = get_super_admin_dashboard()
    return dashboard.get_security_compliance_report()


@router.put("/config")
async def update_system_config(
    config_changes: dict,
    current_user = Depends(verify_super_admin)
):
    """Update global system configuration"""
    dashboard = get_super_admin_dashboard()
    return dashboard.manage_system_configuration(config_changes)