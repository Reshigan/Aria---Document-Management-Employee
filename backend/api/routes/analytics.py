"""Analytics API Routes"""
import logging
from fastapi import APIRouter, Depends
from typing import Dict, Any
from backend.auth.jwt_auth import get_current_user
from backend.database.multi_tenant import get_current_tenant_db

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/dashboard")
async def get_dashboard(current_user: Dict[str, Any] = Depends(get_current_user), db = Depends(get_current_tenant_db)):
    """Get dashboard analytics."""
    from backend.models.tenant import Tenant
    tenant = db.query(Tenant).filter(Tenant.tenant_id == current_user["tenant_id"]).first()
    
    return {
        "tenant_id": tenant.tenant_id,
        "company_name": tenant.company_name,
        "subscription_tier": tenant.subscription_tier,
        "bot_requests_count": tenant.bot_requests_count,
        "user_count": tenant.user_count,
        "storage_used_mb": tenant.storage_used_mb,
        "bbbee_enabled": tenant.bbbee_enabled,
        "sars_payroll_enabled": tenant.sars_payroll_enabled
    }
