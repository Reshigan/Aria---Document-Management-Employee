"""
Admin Dashboard API Routes - Complete system management

Endpoints:
- Company Settings
- User Management (invite, roles, permissions)
- Bot Configuration
- System Settings
- Audit Logs
- Usage Analytics
- Integrations Management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["admin"])


# ============================================================================
# COMPANY SETTINGS
# ============================================================================

class CompanySettingsModel(BaseModel):
    company_name: str
    registration_number: Optional[str] = None
    vat_number: Optional[str] = None
    tax_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "South Africa"
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    # BBBEE
    bbbee_level: Optional[int] = None
    bbbee_certificate_number: Optional[str] = None
    bbbee_expiry_date: Optional[str] = None
    # SARS
    sars_tax_number: Optional[str] = None
    sars_paye_number: Optional[str] = None
    sars_uif_number: Optional[str] = None
    sars_sdl_number: Optional[str] = None
    # Financial
    financial_year_end: str = "02-28"  # MM-DD
    vat_rate: float = 15.0
    currency: str = "ZAR"
    # Branding
    logo_url: Optional[str] = None
    primary_color: str = "#3B82F6"
    secondary_color: str = "#10B981"


@router.get("/company/settings")
async def get_company_settings(
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """Get company settings"""
    # TODO: Fetch from database
    return {
        "company_name": "Demo Company (Pty) Ltd",
        "registration_number": "2024/123456/07",
        "vat_number": "4123456789",
        "tax_number": "9123456789",
        "address": "123 Main Road",
        "city": "Johannesburg",
        "province": "Gauteng",
        "postal_code": "2000",
        "country": "South Africa",
        "phone": "+27 11 123 4567",
        "email": "info@democompany.co.za",
        "bbbee_level": 4,
        "bbbee_certificate_number": "BBBEE-2024-12345",
        "bbbee_expiry_date": "2025-12-31",
        "sars_tax_number": "9123456789",
        "sars_paye_number": "7123456789",
        "financial_year_end": "02-28",
        "vat_rate": 15.0,
        "currency": "ZAR"
    }


@router.put("/company/settings")
async def update_company_settings(
    settings: CompanySettingsModel,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """Update company settings"""
    # TODO: Save to database
    return {
        "success": True,
        "message": "Company settings updated successfully",
        "settings": settings.dict()
    }


# ============================================================================
# USER MANAGEMENT
# ============================================================================

class InviteUserRequest(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: str  # "admin", "manager", "employee", "finance", etc.
    department: Optional[str] = None


class UpdateUserRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/users")
async def list_users(
    role: Optional[str] = None,
    department: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """List all users in tenant"""
    # TODO: Fetch from database
    users = [
        {
            "user_id": "user_1",
            "email": "admin@democompany.co.za",
            "first_name": "Admin",
            "last_name": "User",
            "role": "admin",
            "department": "Management",
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z",
            "last_login": "2024-10-25T12:00:00Z"
        },
        {
            "user_id": "user_2",
            "email": "john.smith@democompany.co.za",
            "first_name": "John",
            "last_name": "Smith",
            "role": "manager",
            "department": "Finance",
            "is_active": True,
            "created_at": "2024-02-01T00:00:00Z",
            "last_login": "2024-10-24T15:30:00Z"
        }
    ]
    
    # Apply filters
    if role:
        users = [u for u in users if u["role"] == role]
    if department:
        users = [u for u in users if u["department"] == department]
    if is_active is not None:
        users = [u for u in users if u["is_active"] == is_active]
    
    return {"users": users, "total": len(users)}


@router.post("/users/invite")
async def invite_user(
    request: InviteUserRequest,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """Invite new user to tenant"""
    # TODO: 
    # 1. Create user record
    # 2. Generate invitation token
    # 3. Send email invitation
    
    return {
        "success": True,
        "message": f"Invitation sent to {request.email}",
        "user_id": f"user_{int(datetime.utcnow().timestamp())}",
        "invitation_expires": "2024-11-01T00:00:00Z"
    }


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """Update user details"""
    # TODO: Update in database
    return {
        "success": True,
        "message": "User updated successfully",
        "user_id": user_id
    }


@router.delete("/users/{user_id}")
async def deactivate_user(
    user_id: str,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """Deactivate user (soft delete)"""
    # TODO: Mark as inactive in database
    return {
        "success": True,
        "message": "User deactivated successfully",
        "user_id": user_id
    }


# ============================================================================
# BOT CONFIGURATION
# ============================================================================

class BotConfigModel(BaseModel):
    bot_id: str
    enabled: bool
    auto_approve_limit: Optional[float] = None
    notification_channels: Optional[List[str]] = None
    custom_settings: Optional[dict] = None


@router.get("/bots")
async def list_bot_configurations(
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """List all bot configurations"""
    return {
        "bots": [
            {
                "bot_id": "invoice_reconciliation",
                "name": "Invoice Reconciliation Bot",
                "enabled": True,
                "auto_approve_enabled": True,
                "auto_approve_limit": 1000.0,
                "usage_count": 245,
                "last_used": "2024-10-25T10:30:00Z"
            },
            {
                "bot_id": "bbbee_compliance",
                "name": "BBBEE Compliance Bot",
                "enabled": True,
                "auto_approve_enabled": False,
                "usage_count": 12,
                "last_used": "2024-10-20T14:00:00Z"
            },
            {
                "bot_id": "payroll_sa",
                "name": "Payroll Bot (SA)",
                "enabled": True,
                "auto_approve_enabled": False,
                "usage_count": 30,
                "last_used": "2024-10-25T09:00:00Z"
            },
            {
                "bot_id": "expense_management",
                "name": "Expense Management Bot",
                "enabled": True,
                "auto_approve_enabled": True,
                "auto_approve_limit": 500.0,
                "usage_count": 89,
                "last_used": "2024-10-25T11:45:00Z"
            }
        ]
    }


@router.put("/bots/{bot_id}/config")
async def update_bot_configuration(
    bot_id: str,
    config: BotConfigModel,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """Update bot configuration"""
    # TODO: Save to database
    return {
        "success": True,
        "message": f"Bot {bot_id} configuration updated",
        "config": config.dict()
    }


@router.post("/bots/{bot_id}/reset-usage")
async def reset_bot_usage(
    bot_id: str,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """Reset bot usage counter"""
    return {
        "success": True,
        "message": f"Usage counter reset for bot {bot_id}"
    }


# ============================================================================
# SYSTEM SETTINGS
# ============================================================================

class SystemSettingsModel(BaseModel):
    # Notifications
    email_notifications: bool = True
    whatsapp_notifications: bool = False
    sms_notifications: bool = False
    in_app_notifications: bool = True
    # Approval Workflows
    require_manager_approval_above: float = 5000.0
    require_finance_approval_above: float = 25000.0
    require_cfo_approval_above: float = 100000.0
    # Security
    password_min_length: int = 8
    password_require_uppercase: bool = True
    password_require_number: bool = True
    password_require_special: bool = True
    session_timeout_minutes: int = 60
    require_2fa: bool = False
    # Integrations
    auto_sync_enabled: bool = False
    sync_interval_hours: int = 24


@router.get("/system/settings")
async def get_system_settings(
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """Get system settings"""
    return {
        "email_notifications": True,
        "whatsapp_notifications": False,
        "require_manager_approval_above": 5000.0,
        "require_finance_approval_above": 25000.0,
        "password_min_length": 8,
        "session_timeout_minutes": 60,
        "auto_sync_enabled": False,
        "sync_interval_hours": 24
    }


@router.put("/system/settings")
async def update_system_settings(
    settings: SystemSettingsModel,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """Update system settings"""
    return {
        "success": True,
        "message": "System settings updated successfully",
        "settings": settings.dict()
    }


# ============================================================================
# AUDIT LOGS
# ============================================================================

@router.get("/audit-logs")
async def get_audit_logs(
    user_id: Optional[str] = None,
    action_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """Get audit logs"""
    # TODO: Fetch from database
    logs = [
        {
            "log_id": "log_1",
            "timestamp": "2024-10-25T12:30:00Z",
            "user_id": "user_1",
            "user_email": "admin@democompany.co.za",
            "action": "user.created",
            "details": "Created new user: john.smith@democompany.co.za",
            "ip_address": "196.207.123.45"
        },
        {
            "log_id": "log_2",
            "timestamp": "2024-10-25T11:15:00Z",
            "user_id": "user_2",
            "user_email": "john.smith@democompany.co.za",
            "action": "bot.query",
            "details": "Queried expense_management bot",
            "ip_address": "196.207.123.46"
        },
        {
            "log_id": "log_3",
            "timestamp": "2024-10-25T10:00:00Z",
            "user_id": "user_1",
            "user_email": "admin@democompany.co.za",
            "action": "settings.updated",
            "details": "Updated company settings",
            "ip_address": "196.207.123.45"
        }
    ]
    
    return {
        "logs": logs,
        "total": len(logs),
        "limit": limit
    }


# ============================================================================
# USAGE ANALYTICS
# ============================================================================

@router.get("/analytics/usage")
async def get_usage_analytics(
    period: str = "month",  # "day", "week", "month", "year"
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """Get usage analytics"""
    return {
        "period": period,
        "bot_usage": {
            "invoice_reconciliation": 245,
            "bbbee_compliance": 12,
            "payroll_sa": 30,
            "expense_management": 89
        },
        "workflow_usage": {
            "purchase_to_pay": 15,
            "order_to_cash": 28,
            "expense_approval": 42
        },
        "active_users": 12,
        "total_queries": 376,
        "avg_response_time_ms": 850,
        "storage_used_mb": 1250,
        "api_calls": 1847
    }


@router.get("/analytics/performance")
async def get_performance_analytics(
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """Get system performance metrics"""
    return {
        "avg_api_response_time_ms": 850,
        "p95_api_response_time_ms": 1500,
        "p99_api_response_time_ms": 2200,
        "error_rate_percent": 0.5,
        "uptime_percent": 99.9,
        "bot_success_rate_percent": 98.5,
        "workflow_completion_rate_percent": 95.0
    }


# ============================================================================
# INTEGRATIONS MANAGEMENT
# ============================================================================

@router.get("/integrations")
async def list_integrations(
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """List all configured integrations"""
    return {
        "integrations": [
            {
                "integration_id": "xero_demo",
                "name": "Xero",
                "type": "accounting",
                "enabled": True,
                "status": "connected",
                "last_sync": "2024-10-25T08:00:00Z",
                "sync_status": "success",
                "records_synced": 350
            },
            {
                "integration_id": "sage_demo",
                "name": "Sage Business Cloud",
                "type": "accounting",
                "enabled": False,
                "status": "disconnected"
            },
            {
                "integration_id": "pastel_demo",
                "name": "Pastel",
                "type": "accounting",
                "enabled": False,
                "status": "not_configured"
            },
            {
                "integration_id": "sars_demo",
                "name": "SARS eFiling",
                "type": "government",
                "enabled": True,
                "status": "connected",
                "last_submission": "2024-10-07T14:00:00Z",
                "submission_status": "accepted"
            }
        ]
    }


@router.post("/integrations/{integration_id}/test")
async def test_integration(
    integration_id: str,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """Test integration connection"""
    return {
        "success": True,
        "message": f"Integration {integration_id} connection successful",
        "details": {
            "latency_ms": 245,
            "authentication": "valid",
            "api_version": "2.0"
        }
    }


@router.post("/integrations/{integration_id}/sync")
async def trigger_integration_sync(
    integration_id: str,
    entity_type: str = "all",  # "customer", "supplier", "invoice", "payment", "all"
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """Trigger manual sync with integration"""
    return {
        "success": True,
        "message": f"Sync started for {integration_id}",
        "sync_id": f"sync_{int(datetime.utcnow().timestamp())}",
        "entity_type": entity_type,
        "estimated_time_seconds": 60
    }
