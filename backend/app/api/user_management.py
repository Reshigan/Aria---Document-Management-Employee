from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr
from core.database import get_db
from app.services.user_management_service import UserManagementService
from app.services.cache_service import monitor_performance

router = APIRouter(prefix="/users", tags=["User Management"])
security = HTTPBearer()

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, regex='^[a-zA-Z0-9_]+$')
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    display_name: Optional[str] = Field(None, max_length=200)
    job_title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    manager_id: Optional[int] = None
    timezone: str = Field(default='UTC', max_length=50)
    language: str = Field(default='en', max_length=10)

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    display_name: Optional[str] = Field(None, max_length=200)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, max_length=20)
    job_title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    manager_id: Optional[int] = None
    timezone: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field(None, max_length=10)
    theme: Optional[str] = Field(None, regex='^(light|dark|auto)$')
    avatar_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None

class LoginRequest(BaseModel):
    username_or_email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

class PasswordChangeRequest(BaseModel):
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

class RoleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, regex='^[a-zA-Z0-9_]+$')
    display_name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    priority: int = Field(default=0, ge=0, le=100)
    color: str = Field(default='#6B7280', regex='^#[0-9A-Fa-f]{6}$')
    icon: Optional[str] = Field(None, max_length=50)

class RoleAssignment(BaseModel):
    user_id: int = Field(..., gt=0)
    role_id: int = Field(..., gt=0)
    expires_at: Optional[datetime] = None
    reason: Optional[str] = Field(None, max_length=500)

def get_user_service(db: Session = Depends(get_db)) -> UserManagementService:
    return UserManagementService(db)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    service: UserManagementService = Depends(get_user_service)
):
    """Get current authenticated user"""
    try:
        user = service.validate_session(credentials.credentials)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token"
            )
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

@router.post("/register", status_code=status.HTTP_201_CREATED)
@monitor_performance
async def register_user(
    user_data: UserCreate,
    service: UserManagementService = Depends(get_user_service)
):
    """Register a new user"""
    try:
        user = service.create_user(
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            display_name=user_data.display_name,
            job_title=user_data.job_title,
            department=user_data.department,
            manager_id=user_data.manager_id,
            timezone=user_data.timezone,
            language=user_data.language
        )
        
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "display_name": user.display_name,
            "created_at": user.created_at.isoformat(),
            "message": "User registered successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login")
@monitor_performance
async def login_user(
    login_data: LoginRequest,
    x_forwarded_for: Optional[str] = Header(None),
    user_agent: Optional[str] = Header(None),
    service: UserManagementService = Depends(get_user_service)
):
    """Authenticate user and create session"""
    try:
        # Get IP address from header or use default
        ip_address = x_forwarded_for or "127.0.0.1"
        
        auth_result = service.authenticate_user(
            username_or_email=login_data.username_or_email,
            password=login_data.password,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        if not auth_result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials or account locked"
            )
        
        return {
            "message": "Login successful",
            "user": auth_result['user'],
            "session": auth_result['session']
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.post("/logout")
@monitor_performance
async def logout_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    service: UserManagementService = Depends(get_user_service)
):
    """Logout user and invalidate session"""
    try:
        success = service.logout_user(credentials.credentials)
        if not success:
            raise HTTPException(status_code=400, detail="Invalid session token")
        
        return {"message": "Logout successful"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )

@router.get("/me")
@monitor_performance
async def get_current_user_info(
    current_user = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_service)
):
    """Get current user information"""
    try:
        return service._serialize_user(current_user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user info: {str(e)}"
        )

@router.put("/me")
@monitor_performance
async def update_current_user(
    user_updates: UserUpdate,
    current_user = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_service)
):
    """Update current user information"""
    try:
        # Convert to dict and remove None values
        updates = {k: v for k, v in user_updates.dict().items() if v is not None}
        
        updated_user = service.update_user(
            user_id=current_user.id,
            updated_by=current_user.id,
            **updates
        )
        
        return {
            "message": "User updated successfully",
            "user": service._serialize_user(updated_user)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Update failed: {str(e)}"
        )

@router.post("/change-password")
@monitor_performance
async def change_password(
    password_data: PasswordChangeRequest,
    current_user = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_service)
):
    """Change user password"""
    try:
        success = service.change_password(
            user_id=current_user.id,
            old_password=password_data.old_password,
            new_password=password_data.new_password
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid old password"
            )
        
        return {"message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password change failed: {str(e)}"
        )

@router.get("/{user_id}")
@monitor_performance
async def get_user(
    user_id: int,
    current_user = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_service)
):
    """Get user by ID"""
    try:
        # Check if user has permission to view other users
        if user_id != current_user.id:
            has_permission = service.check_user_permission(current_user.id, 'users.read')
            if not has_permission:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions to view user"
                )
        
        user = service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return service._serialize_user(user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user: {str(e)}"
        )

@router.get("")
@monitor_performance
async def list_users(
    skip: int = Query(0, ge=0, description="Number of users to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of users to return"),
    department: Optional[str] = Query(None, description="Filter by department"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_service)
):
    """List users with filtering and pagination"""
    try:
        # Check permission
        has_permission = service.check_user_permission(current_user.id, 'users.read')
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to list users"
            )
        
        # This would implement actual user listing with filters
        # For now, return mock data
        return {
            "users": [],
            "total": 0,
            "skip": skip,
            "limit": limit
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list users: {str(e)}"
        )

@router.post("/roles", status_code=status.HTTP_201_CREATED)
@monitor_performance
async def create_role(
    role_data: RoleCreate,
    current_user = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_service)
):
    """Create a new role"""
    try:
        # Check permission
        has_permission = service.check_user_permission(current_user.id, 'roles.create')
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create role"
            )
        
        role = service.create_role(
            name=role_data.name,
            display_name=role_data.display_name,
            description=role_data.description,
            created_by=current_user.id,
            priority=role_data.priority,
            color=role_data.color,
            icon=role_data.icon
        )
        
        return {
            "id": role.id,
            "name": role.name,
            "display_name": role.display_name,
            "description": role.description,
            "created_at": role.created_at.isoformat(),
            "message": "Role created successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Role creation failed: {str(e)}"
        )

@router.post("/roles/assign")
@monitor_performance
async def assign_role(
    assignment: RoleAssignment,
    current_user = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_service)
):
    """Assign role to user"""
    try:
        # Check permission
        has_permission = service.check_user_permission(current_user.id, 'roles.assign')
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to assign role"
            )
        
        user_role = service.assign_role_to_user(
            user_id=assignment.user_id,
            role_id=assignment.role_id,
            assigned_by=current_user.id,
            expires_at=assignment.expires_at,
            reason=assignment.reason
        )
        
        return {
            "id": user_role.id,
            "user_id": user_role.user_id,
            "role_id": user_role.role_id,
            "assigned_at": user_role.assigned_at.isoformat(),
            "expires_at": user_role.expires_at.isoformat() if user_role.expires_at else None,
            "message": "Role assigned successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Role assignment failed: {str(e)}"
        )

@router.get("/me/permissions")
@monitor_performance
async def get_user_permissions(
    current_user = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_service)
):
    """Get current user's permissions"""
    try:
        permissions = service.get_user_permissions(current_user.id)
        
        return {
            "permissions": [
                {
                    "id": perm.id,
                    "name": perm.name,
                    "display_name": perm.display_name,
                    "category": perm.category,
                    "resource": perm.resource,
                    "action": perm.action
                }
                for perm in permissions
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get permissions: {str(e)}"
        )

@router.post("/me/2fa/enable")
@monitor_performance
async def enable_2fa(
    current_user = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_service)
):
    """Enable two-factor authentication"""
    try:
        result = service.enable_2fa(current_user.id)
        
        return {
            "message": "Two-factor authentication setup initiated",
            "secret": result['secret'],
            "qr_code": result['qr_code'],
            "backup_codes": result['backup_codes']
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"2FA setup failed: {str(e)}"
        )

@router.post("/me/2fa/verify")
@monitor_performance
async def verify_2fa_setup(
    token: str = Query(..., description="6-digit TOTP token"),
    current_user = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_service)
):
    """Verify and complete 2FA setup"""
    try:
        success = service.verify_2fa_setup(current_user.id, token)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token"
            )
        
        return {"message": "Two-factor authentication enabled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"2FA verification failed: {str(e)}"
        )

@router.get("/statistics")
@monitor_performance
async def get_user_statistics(
    current_user = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_service)
):
    """Get user management statistics"""
    try:
        # Check permission
        has_permission = service.check_user_permission(current_user.id, 'users.statistics')
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view statistics"
            )
        
        stats = service.get_user_statistics()
        return stats
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )

@router.get("/health")
@monitor_performance
async def get_user_system_health(
    current_user = Depends(get_current_user),
    service: UserManagementService = Depends(get_user_service)
):
    """Get user management system health"""
    try:
        stats = service.get_user_statistics()
        
        # Determine health status
        health_status = "healthy"
        issues = []
        
        # Check for high number of locked accounts
        if stats['locked_users'] > stats['total_users'] * 0.1:  # More than 10% locked
            health_status = "warning"
            issues.append(f"{stats['locked_users']} accounts are locked")
        
        # Check login success rate
        if stats['user_activity']['login_success_rate'] < 80:  # Less than 80% success rate
            health_status = "warning"
            issues.append(f"Low login success rate: {stats['user_activity']['login_success_rate']:.1f}%")
        
        return {
            "status": health_status,
            "issues": issues,
            "statistics": stats,
            "system_info": {
                "total_users": stats['total_users'],
                "active_sessions": stats['active_sessions'],
                "recent_registrations": stats['recent_registrations']
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get health status: {str(e)}"
        )
