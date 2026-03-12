"""
Admin Module Management Routes
API endpoints for admins to assign and manage user modules
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from backend.database.multi_tenant import get_current_tenant_db
from backend.auth.jwt_auth import get_current_user, require_role
from backend.services.module_service import ModuleService
from backend.models.module_models import Module, UserModule
from backend.schemas.module_schemas import (
    ModuleCreate, ModuleUpdate, ModuleResponse, ModuleListResponse,
    UserModuleAssign, UserModuleAssignBulk, UserModuleUpdate, UserModuleDeactivate,
    UserModuleResponse, UserModuleListResponse, UserModulesInfo,
    ModuleUsageStats, SystemModuleOverview, ModuleCategoryEnum, ModuleStatusEnum
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/modules", tags=["Admin - Module Management"])


# ==================== Module Management Endpoints ====================

@router.post("/", response_model=ModuleResponse, status_code=status.HTTP_201_CREATED)
async def create_module(
    module_data: ModuleCreate,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Create a new system module (Admin only)
    
    Requires admin role.
    """
    try:
        service = ModuleService(db)
        module = service.create_module(module_data, current_user["id"])
        return module
    except Exception as e:
        logger.error(f"Error creating module: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/", response_model=ModuleListResponse)
async def list_modules(
    category: Optional[ModuleCategoryEnum] = None,
    status_filter: Optional[ModuleStatusEnum] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_current_tenant_db)
):
    """
    List all system modules
    
    Can be filtered by category and status.
    """
    try:
        service = ModuleService(db)
        result = service.list_modules(
            category=category,
            status=status_filter,
            skip=skip,
            limit=limit
        )
        return result
    except Exception as e:
        logger.error(f"Error listing modules: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{module_id}", response_model=ModuleResponse)
async def get_module(
    module_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Get module details by ID
    """
    try:
        service = ModuleService(db)
        module = service.get_module(module_id)
        return module
    except Exception as e:
        logger.error(f"Error getting module: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/{module_id}", response_model=ModuleResponse)
async def update_module(
    module_id: int,
    update_data: ModuleUpdate,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Update module information (Admin only)
    """
    try:
        service = ModuleService(db)
        module = service.update_module(module_id, update_data)
        return module
    except Exception as e:
        logger.error(f"Error updating module: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{module_id}")
async def delete_module(
    module_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Delete a module (Admin only)
    
    Sets module status to DEPRECATED. Cannot delete if active user assignments exist.
    """
    try:
        service = ModuleService(db)
        service.delete_module(module_id)
        return {"message": "Module deleted successfully", "module_id": module_id}
    except Exception as e:
        logger.error(f"Error deleting module: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==================== User Module Assignment Endpoints ====================

@router.post("/assignments", response_model=UserModuleResponse, status_code=status.HTTP_201_CREATED)
async def assign_module_to_user(
    assignment: UserModuleAssign,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Assign a module to a user (Admin only)
    
    Grants user access to the specified module with custom permissions and limits.
    """
    try:
        service = ModuleService(db)
        user_module = service.assign_module_to_user(assignment, current_user["id"])
        
        # Build response
        module = service.get_module(user_module.module_id)
        return {
            "id": user_module.id,
            "user_id": user_module.user_id,
            "module_id": user_module.module_id,
            "module_name": module.name,
            "module_display_name": module.display_name,
            "module_category": module.category.value,
            "is_active": user_module.is_active,
            "access_level": user_module.access_level,
            "custom_permissions": user_module.custom_permissions,
            "approval_limit": user_module.approval_limit,
            "assigned_by": user_module.assigned_by,
            "assigned_at": user_module.assigned_at,
            "expires_at": user_module.expires_at,
            "last_accessed": user_module.last_accessed,
            "access_count": user_module.access_count,
            "notes": user_module.notes
        }
    except Exception as e:
        logger.error(f"Error assigning module: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/assignments/bulk")
async def bulk_assign_modules(
    assignment: UserModuleAssignBulk,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Assign multiple modules to multiple users (Admin only)
    
    Bulk operation to assign modules to multiple users at once.
    """
    try:
        service = ModuleService(db)
        results = service.bulk_assign_modules(assignment, current_user["id"])
        return results
    except Exception as e:
        logger.error(f"Error bulk assigning modules: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/assignments/user/{user_id}", response_model=UserModuleListResponse)
async def get_user_modules(
    user_id: int,
    include_inactive: bool = False,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Get all modules assigned to a specific user (Admin only)
    """
    try:
        service = ModuleService(db)
        user_modules = service.get_user_modules(user_id, include_inactive)
        
        # Build response
        user_module_responses = []
        for um in user_modules:
            module = service.get_module(um.module_id)
            user_module_responses.append({
                "id": um.id,
                "user_id": um.user_id,
                "module_id": um.module_id,
                "module_name": module.name,
                "module_display_name": module.display_name,
                "module_category": module.category.value,
                "is_active": um.is_active,
                "access_level": um.access_level,
                "custom_permissions": um.custom_permissions,
                "approval_limit": um.approval_limit,
                "assigned_by": um.assigned_by,
                "assigned_at": um.assigned_at,
                "expires_at": um.expires_at,
                "last_accessed": um.last_accessed,
                "access_count": um.access_count,
                "notes": um.notes
            })
        
        return {
            "user_modules": user_module_responses,
            "total": len(user_module_responses)
        }
    except Exception as e:
        logger.error(f"Error getting user modules: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/assignments/module/{module_id}")
async def get_module_users(
    module_id: int,
    include_inactive: bool = False,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Get all users assigned to a specific module (Admin only)
    """
    try:
        service = ModuleService(db)
        user_modules = service.get_module_users(module_id, include_inactive)
        
        return {
            "user_modules": user_modules,
            "total": len(user_modules)
        }
    except Exception as e:
        logger.error(f"Error getting module users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/assignments/{assignment_id}", response_model=UserModuleResponse)
async def update_user_module_assignment(
    assignment_id: int,
    update_data: UserModuleUpdate,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Update user module assignment (Admin only)
    
    Update access level, permissions, approval limits, etc.
    """
    try:
        service = ModuleService(db)
        user_module = service.update_user_module(assignment_id, update_data, current_user["id"])
        
        # Build response
        module = service.get_module(user_module.module_id)
        return {
            "id": user_module.id,
            "user_id": user_module.user_id,
            "module_id": user_module.module_id,
            "module_name": module.name,
            "module_display_name": module.display_name,
            "module_category": module.category.value,
            "is_active": user_module.is_active,
            "access_level": user_module.access_level,
            "custom_permissions": user_module.custom_permissions,
            "approval_limit": user_module.approval_limit,
            "assigned_by": user_module.assigned_by,
            "assigned_at": user_module.assigned_at,
            "expires_at": user_module.expires_at,
            "last_accessed": user_module.last_accessed,
            "access_count": user_module.access_count,
            "notes": user_module.notes
        }
    except Exception as e:
        logger.error(f"Error updating user module: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/assignments/{assignment_id}/deactivate")
async def deactivate_user_module(
    assignment_id: int,
    deactivation: UserModuleDeactivate,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Deactivate user module assignment (Admin only)
    
    Removes user's access to the module with a reason.
    """
    try:
        service = ModuleService(db)
        user_module = service.deactivate_user_module(assignment_id, deactivation, current_user["id"])
        return {
            "message": "User module deactivated successfully",
            "assignment_id": assignment_id,
            "deactivated_at": user_module.deactivated_at,
            "reason": deactivation.reason
        }
    except Exception as e:
        logger.error(f"Error deactivating user module: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/assignments/user/{user_id}/module/{module_id}")
async def remove_module_from_user(
    user_id: int,
    module_id: int,
    reason: str = "Removed by admin",
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Remove module from user (Admin only)
    
    Convenience endpoint to deactivate by user_id and module_id.
    """
    try:
        service = ModuleService(db)
        service.remove_module_from_user(user_id, module_id, current_user["id"], reason)
        return {
            "message": "Module removed from user successfully",
            "user_id": user_id,
            "module_id": module_id
        }
    except Exception as e:
        logger.error(f"Error removing module from user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==================== Analytics Endpoints ====================

@router.get("/analytics/module/{module_id}", response_model=ModuleUsageStats)
async def get_module_usage_stats(
    module_id: int,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Get usage statistics for a specific module (Admin only)
    """
    try:
        service = ModuleService(db)
        stats = service.get_module_usage_stats(module_id)
        return stats
    except Exception as e:
        logger.error(f"Error getting module stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/analytics/overview", response_model=SystemModuleOverview)
async def get_system_module_overview(
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Get system-wide module overview and statistics (Admin only)
    """
    try:
        service = ModuleService(db)
        overview = service.get_system_module_overview()
        return overview
    except Exception as e:
        logger.error(f"Error getting system overview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==================== User-Facing Endpoints ====================

@router.get("/my-modules", response_model=UserModuleListResponse)
async def get_my_modules(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Get modules assigned to current user
    
    Returns all active modules the current user has access to.
    """
    try:
        service = ModuleService(db)
        user_modules = service.get_user_modules(current_user["id"], include_inactive=False)
        
        # Build response
        user_module_responses = []
        for um in user_modules:
            module = service.get_module(um.module_id)
            user_module_responses.append({
                "id": um.id,
                "user_id": um.user_id,
                "module_id": um.module_id,
                "module_name": module.name,
                "module_display_name": module.display_name,
                "module_category": module.category.value,
                "is_active": um.is_active,
                "access_level": um.access_level,
                "custom_permissions": um.custom_permissions,
                "approval_limit": um.approval_limit,
                "assigned_by": um.assigned_by,
                "assigned_at": um.assigned_at,
                "expires_at": um.expires_at,
                "last_accessed": um.last_accessed,
                "access_count": um.access_count,
                "notes": None  # Don't expose admin notes to users
            })
        
        return {
            "user_modules": user_module_responses,
            "total": len(user_module_responses)
        }
    except Exception as e:
        logger.error(f"Error getting my modules: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/check-access/{module_id}")
async def check_module_access(
    module_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Check if current user has access to a specific module
    """
    try:
        service = ModuleService(db)
        has_access = service.check_user_module_access(current_user["id"], module_id)
        
        return {
            "module_id": module_id,
            "has_access": has_access,
            "user_id": current_user["id"]
        }
    except Exception as e:
        logger.error(f"Error checking module access: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
