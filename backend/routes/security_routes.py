from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from core.database import get_db
from services.security_service import SecurityService
from schemas.security_schemas import *
from models.user import User
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/security", tags=["security"])
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Get current authenticated user"""
    security_service = SecurityService(db)
    
    try:
        payload = security_service.verify_token(credentials.credentials)
        user_id = int(payload.get("sub"))
        session_id = payload.get("session_id")
        
        # Verify session is still valid
        session = db.query(UserSession).filter(UserSession.id == session_id).first()
        if not session or not session.is_valid():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired or invalid"
            )
        
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return user
        
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

def get_client_info(request: Request) -> Dict[str, str]:
    """Extract client information from request"""
    return {
        "ip_address": request.client.host,
        "user_agent": request.headers.get("user-agent", "")
    }

# Authentication Endpoints
@router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """User login"""
    security_service = SecurityService(db)
    client_info = get_client_info(request)
    
    try:
        # Authenticate user
        user = security_service.authenticate_user(
            email=login_data.email,
            password=login_data.password,
            ip_address=client_info["ip_address"],
            user_agent=client_info["user_agent"]
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if 2FA is required
        two_factor = db.query(TwoFactorAuth).filter(
            TwoFactorAuth.user_id == user.id,
            TwoFactorAuth.is_enabled == True
        ).first()
        
        if two_factor and not login_data.two_factor_code:
            return LoginResponse(
                access_token="",
                refresh_token="",
                expires_in=0,
                user={},
                requires_2fa=True
            )
        
        # Verify 2FA if provided
        if two_factor and login_data.two_factor_code:
            if not security_service.verify_2fa_code(user.id, login_data.two_factor_code):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid two-factor authentication code"
                )
        
        # Create session
        session = security_service.create_session(
            user=user,
            ip_address=client_info["ip_address"],
            user_agent=client_info["user_agent"]
        )
        
        # Generate tokens
        access_token = security_service.create_access_token(user, session)
        refresh_token = security_service.create_refresh_token(user, session)
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=security_service.access_token_expire_minutes * 60,
            user={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/auth/refresh", response_model=LoginResponse)
async def refresh_token(refresh_data: RefreshTokenRequest, request: Request, db: Session = Depends(get_db)):
    """Refresh access token"""
    security_service = SecurityService(db)
    
    try:
        payload = security_service.verify_token(refresh_data.refresh_token)
        
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        user_id = int(payload.get("sub"))
        session_id = payload.get("session_id")
        
        # Verify session
        session = db.query(UserSession).filter(UserSession.id == session_id).first()
        if not session or not session.is_valid():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired"
            )
        
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Generate new access token
        access_token = security_service.create_access_token(user, session)
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_data.refresh_token,
            expires_in=security_service.access_token_expire_minutes * 60,
            user={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )

@router.post("/auth/logout")
async def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """User logout"""
    security_service = SecurityService(db)
    
    # Get current session from token
    # This would need to be extracted from the current request context
    # For now, we'll revoke all sessions
    count = security_service.revoke_all_user_sessions(current_user.id)
    
    return {"message": f"Logged out successfully. {count} sessions revoked."}

@router.post("/auth/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    security_service = SecurityService(db)
    
    try:
        success = security_service.change_password(
            user_id=current_user.id,
            current_password=password_data.current_password,
            new_password=password_data.new_password
        )
        
        if success:
            return {"message": "Password changed successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to change password"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )

# Session Management
@router.get("/sessions", response_model=SessionList)
async def get_user_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user's active sessions"""
    security_service = SecurityService(db)
    sessions = security_service.get_user_sessions(current_user.id)
    
    return SessionList(
        sessions=[SessionInfo.from_orm(session) for session in sessions],
        current_session_id=0  # Would need to be determined from current request
    )

@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke specific session"""
    security_service = SecurityService(db)
    
    success = security_service.revoke_session(session_id, current_user.id)
    
    if success:
        return {"message": "Session revoked successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

@router.delete("/sessions")
async def revoke_all_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Revoke all user sessions except current"""
    security_service = SecurityService(db)
    
    count = security_service.revoke_all_user_sessions(current_user.id)
    
    return {"message": f"Revoked {count} sessions"}

# Two-Factor Authentication
@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
async def setup_2fa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Setup two-factor authentication"""
    security_service = SecurityService(db)
    
    try:
        setup_data = security_service.setup_2fa(current_user.id)
        
        return TwoFactorSetupResponse(
            secret_key=setup_data["secret_key"],
            qr_code_url=setup_data["qr_code_url"],
            backup_codes=setup_data["backup_codes"]
        )
        
    except Exception as e:
        logger.error(f"2FA setup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to setup two-factor authentication"
        )

@router.post("/2fa/verify")
async def verify_2fa_setup(
    verify_data: TwoFactorVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify and enable two-factor authentication"""
    security_service = SecurityService(db)
    
    success = security_service.verify_2fa_setup(current_user.id, verify_data.code)
    
    if success:
        return {"message": "Two-factor authentication enabled successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )

@router.post("/2fa/disable")
async def disable_2fa(
    disable_data: TwoFactorDisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable two-factor authentication"""
    security_service = SecurityService(db)
    
    success = security_service.disable_2fa(
        user_id=current_user.id,
        password=disable_data.password,
        code=disable_data.code
    )
    
    if success:
        return {"message": "Two-factor authentication disabled successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to disable two-factor authentication"
        )

@router.get("/2fa/status", response_model=TwoFactorStatus)
async def get_2fa_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get two-factor authentication status"""
    two_factor = db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == current_user.id).first()
    
    if two_factor:
        return TwoFactorStatus.from_orm(two_factor)
    else:
        return TwoFactorStatus(is_enabled=False)

# API Key Management
@router.post("/api-keys", response_model=APIKeyWithSecret)
async def create_api_key(
    key_data: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new API key"""
    security_service = SecurityService(db)
    
    try:
        api_key_data = security_service.create_api_key(current_user.id, key_data)
        
        return APIKeyWithSecret(**api_key_data)
        
    except Exception as e:
        logger.error(f"API key creation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create API key"
        )

@router.get("/api-keys", response_model=List[APIKeyResponse])
async def get_api_keys(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user's API keys"""
    api_keys = db.query(APIKey).filter(APIKey.user_id == current_user.id).all()
    
    return [APIKeyResponse.from_orm(key) for key in api_keys]

@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke API key"""
    api_key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    api_key.is_active = False
    db.commit()
    
    return {"message": "API key revoked successfully"}

# Role Management (Admin only)
@router.post("/roles", response_model=Role)
async def create_role(
    role_data: RoleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new role (Admin only)"""
    security_service = SecurityService(db)
    
    # Check if user has admin permissions
    if not security_service.has_permission(current_user.id, "admin.roles.create"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    try:
        role = security_service.create_role(role_data)
        return Role.from_orm(role)
        
    except Exception as e:
        logger.error(f"Role creation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create role"
        )

@router.get("/roles", response_model=List[Role])
async def get_roles(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all roles"""
    security_service = SecurityService(db)
    
    if not security_service.has_permission(current_user.id, "admin.roles.read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    roles = db.query(Role).all()
    return [Role.from_orm(role) for role in roles]

@router.post("/users/{user_id}/roles")
async def assign_role(
    user_id: int,
    assignment: UserRoleAssignment,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign role to user"""
    security_service = SecurityService(db)
    
    if not security_service.has_permission(current_user.id, "admin.users.manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    try:
        user_role = security_service.assign_role_to_user(
            user_id=user_id,
            role_id=assignment.role_id,
            assigned_by=current_user.id,
            expires_at=assignment.expires_at
        )
        
        return {"message": "Role assigned successfully"}
        
    except Exception as e:
        logger.error(f"Role assignment error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign role"
        )

# Security Dashboard
@router.get("/dashboard", response_model=SecurityDashboard)
async def get_security_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get security dashboard data"""
    security_service = SecurityService(db)
    
    if not security_service.has_permission(current_user.id, "admin.security.dashboard"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    try:
        dashboard_data = security_service.get_security_dashboard()
        
        return SecurityDashboard(
            active_sessions=dashboard_data["active_sessions"],
            failed_logins_24h=dashboard_data["failed_logins_24h"],
            security_events_24h=dashboard_data["security_events_24h"],
            locked_accounts=dashboard_data["locked_accounts"],
            api_key_usage=dashboard_data["api_key_usage"],
            two_factor_enabled_users=dashboard_data["two_factor_enabled_users"],
            recent_security_events=[
                SecurityEvent.from_orm(event) 
                for event in dashboard_data["recent_security_events"]
            ],
            login_attempts_chart=[],  # Would need to be implemented
            security_events_by_type={}  # Would need to be implemented
        )
        
    except Exception as e:
        logger.error(f"Security dashboard error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load security dashboard"
        )

# Audit Logs
@router.get("/audit-logs", response_model=List[AuditLog])
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get audit logs"""
    security_service = SecurityService(db)
    
    if not security_service.has_permission(current_user.id, "admin.audit.read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    audit_logs = db.query(AuditLog).offset(skip).limit(limit).all()
    
    return [AuditLog.from_orm(log) for log in audit_logs]

# Security Events
@router.get("/security-events", response_model=List[SecurityEvent])
async def get_security_events(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get security events"""
    security_service = SecurityService(db)
    
    if not security_service.has_permission(current_user.id, "admin.security.events"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    events = db.query(SecurityEvent).offset(skip).limit(limit).all()
    
    return [SecurityEvent.from_orm(event) for event in events]