"""Tenant Management API Routes"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from backend.auth.jwt_auth import get_current_user, require_role
from backend.database.multi_tenant import get_current_tenant_db

logger = logging.getLogger(__name__)
router = APIRouter()

class TenantUpdateRequest(BaseModel):
    company_name: Optional[str] = None
    subscription_tier: Optional[str] = None
    
@router.get("/me")
async def get_current_tenant(current_user: Dict[str, Any] = Depends(get_current_user), db = Depends(get_current_tenant_db)):
    """Get current tenant info."""
    from backend.models.tenant import Tenant
    tenant = db.query(Tenant).filter(Tenant.tenant_id == current_user["tenant_id"]).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant.to_dict()

@router.patch("/me")
async def update_tenant(request: TenantUpdateRequest, current_user: Dict[str, Any] = Depends(require_role("admin")), db = Depends(get_current_tenant_db)):
    """Update tenant settings (admin only)."""
    from backend.models.tenant import Tenant
    tenant = db.query(Tenant).filter(Tenant.tenant_id == current_user["tenant_id"]).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if request.company_name:
        tenant.company_name = request.company_name
    if request.subscription_tier:
        tenant.subscription_tier = request.subscription_tier
    
    db.commit()
    logger.info(f"Tenant updated: {tenant.tenant_id}")
    return tenant.to_dict()
