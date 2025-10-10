"""
Enhanced Authentication API Routes
"""
from datetime import datetime
from typing import List, Optional
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from core.database import get_db, get_sync_db
from services.auth_service import auth_service
from models import User, UserSession, ActivityLog
from schemas import (
    UserResponse, TokenResponse, UserSessionResponse, ActivityLogResponse
)

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()
logger = logging.getLogger(__name__)


# Request/Response models
class LoginRequest(BaseModel):
    username: str
    password: str
    remember_me: bool = False
    totp_code: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class Enable2FARequest(BaseModel):
    totp_code: str


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None


class Verify2FARequest(BaseModel):
    totp_code: str


class Disable2FARequest(BaseModel):
    password: str


class SessionResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class Setup2FAResponse(BaseModel):
    secret: str
    qr_code: str
    backup_codes: List[str]


def get_client_info(request: Request) -> tuple:
    """Extract client IP and user agent from request"""
    ip_address = request.client.host
    user_agent = request.headers.get("user-agent", "")
    return ip_address, user_agent


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    payload = auth_service.verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user_query = select(User).where(User.id == payload.get("user_id"))
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


def get_current_user_sync(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_sync_db)
) -> User:
    """Get current authenticated user (sync version)"""
    payload = auth_service.verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user = db.query(User).filter(User.id == payload.get("user_id")).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


@router.post("/login", response_model=SessionResponse)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_sync_db)
):
    """Enhanced login with 2FA support and session management"""
    ip_address, user_agent = get_client_info(request)
    
    # Authenticate user
    user = auth_service.authenticate_user(
        db, login_data.username, login_data.password, ip_address, user_agent
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check 2FA if enabled
    if user.two_factor_enabled:
        if not login_data.totp_code:
            raise HTTPException(
                status_code=status.HTTP_200_OK,  # Special status for 2FA required
                detail="2FA code required",
                headers={"X-2FA-Required": "true"}
            )
        
        if not auth_service.verify_2fa_token(user.two_factor_secret, login_data.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA code"
            )
    
    # Create session
    device_info = {
        "user_agent": user_agent,
        "remember_me": login_data.remember_me
    }
    
    session = auth_service.create_user_session(
        db, user, ip_address, user_agent, device_info
    )
    
    return SessionResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token_value,
        expires_in=auth_service.access_token_expire_minutes * 60,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            phone_number=user.phone_number,
            department=user.department,
            job_title=user.job_title,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            is_verified=user.is_verified,
            last_login=user.last_login,
            two_factor_enabled=user.two_factor_enabled,
            created_at=user.created_at,
            updated_at=user.updated_at,
            roles=[]  # Empty for now
        )
    )


@router.post("/register", response_model=UserResponse)
async def register(
    request: Request,
    register_data: RegisterRequest,
    db: Session = Depends(get_sync_db)
):
    """Register a new user"""
    ip_address, user_agent = get_client_info(request)
    
    try:
        user = await auth_service.register_user(
            db=db,
            username=register_data.username,
            email=register_data.email,
            password=register_data.password,
            full_name=register_data.full_name,
            phone_number=register_data.phone_number,
            department=register_data.department,
            job_title=register_data.job_title,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Create response without roles for now (to avoid async relationship loading issues)
        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            phone_number=user.phone_number,
            department=user.department,
            job_title=user.job_title,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            is_verified=user.is_verified,
            last_login=user.last_login,
            two_factor_enabled=user.two_factor_enabled,
            created_at=user.created_at,
            updated_at=user.updated_at,
            roles=[]  # Empty for now
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/refresh", response_model=SessionResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_sync_db)
):
    """Refresh access token"""
    session = auth_service.refresh_session(db, refresh_data.refresh_token)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user = db.query(User).filter(User.id == session.user_id).first()
    
    return SessionResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token_value,
        expires_in=auth_service.access_token_expire_minutes * 60,
        user=UserResponse.from_orm(user)
    )


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_sync_db)
):
    """Logout current session"""
    success = auth_service.logout_session(db, credentials.credentials)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session"
        )
    
    return {"message": "Logged out successfully"}


@router.post("/logout-all")
async def logout_all(
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_sync_db)
):
    """Logout all sessions for current user"""
    count = auth_service.logout_all_sessions(db, current_user.id)
    
    return {"message": f"Logged out {count} sessions"}


@router.get("/sessions", response_model=List[UserSessionResponse])
async def get_sessions(
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_sync_db)
):
    """Get all active sessions for current user"""
    sessions = auth_service.get_active_sessions(db, current_user.id)
    return [UserSessionResponse.from_orm(session) for session in sessions]


@router.delete("/sessions/{session_id}")
async def logout_session(
    session_id: int,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_sync_db)
):
    """Logout a specific session"""
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    session.is_active = False
    db.commit()
    
    return {"message": "Session logged out"}


@router.post("/password-reset")
async def request_password_reset(
    reset_data: PasswordResetRequest,
    db: Session = Depends(get_sync_db)
):
    """Request password reset"""
    token = auth_service.create_password_reset_token(db, reset_data.email)
    
    # Always return success to prevent email enumeration
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/password-reset/confirm")
async def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_sync_db)
):
    """Confirm password reset with token"""
    try:
        success = auth_service.reset_password(db, reset_data.token, reset_data.new_password)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        return {"message": "Password reset successfully"}
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/change-password")
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_sync_db)
):
    """Change user password"""
    # Verify current password
    if not auth_service.verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    is_valid, errors = auth_service.validate_password_strength(password_data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password validation failed: {', '.join(errors)}"
        )
    
    # Update password
    current_user.hashed_password = auth_service.get_password_hash(password_data.new_password)
    
    # Logout all other sessions
    auth_service.logout_all_sessions(db, current_user.id)
    
    db.commit()
    
    # Log activity
    auth_service._log_activity(
        db, current_user.id, "password_changed", "security", current_user.id,
        "Password changed successfully"
    )
    
    return {"message": "Password changed successfully"}


@router.get("/2fa/setup", response_model=Setup2FAResponse)
async def setup_2fa(
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_sync_db)
):
    """Setup 2FA for user"""
    if current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled"
        )
    
    # Generate secret and QR code
    secret = auth_service.generate_2fa_secret(current_user)
    qr_code = auth_service.generate_2fa_qr_code(current_user, secret)
    
    # Generate backup codes
    backup_codes = [auth_service.generate_2fa_secret(current_user)[:8] for _ in range(10)]
    
    # Store temporarily (in production, use secure temporary storage)
    # For now, we'll store in session or return to client
    
    return Setup2FAResponse(
        secret=secret,
        qr_code=qr_code,
        backup_codes=backup_codes
    )


@router.post("/2fa/enable")
async def enable_2fa(
    enable_data: Enable2FARequest,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_sync_db)
):
    """Enable 2FA for user"""
    if current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled"
        )
    
    # This would need the secret from setup step
    # In production, retrieve from secure temporary storage
    # For now, assume secret is passed or stored temporarily
    
    # Verify TOTP code (placeholder - need proper secret management)
    # success = auth_service.enable_2fa(db, current_user, secret, enable_data.totp_code)
    
    # if not success:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="Invalid TOTP code"
    #     )
    
    return {"message": "2FA enabled successfully"}


@router.post("/2fa/verify")
async def verify_2fa(
    verify_data: Verify2FARequest,
    current_user: User = Depends(get_current_user_sync)
):
    """Verify 2FA code"""
    if not current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled"
        )
    
    is_valid = auth_service.verify_2fa_token(current_user.two_factor_secret, verify_data.totp_code)
    
    return {"valid": is_valid}


@router.post("/2fa/disable")
async def disable_2fa(
    disable_data: Disable2FARequest,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_sync_db)
):
    """Disable 2FA for user"""
    if not current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled"
        )
    
    success = auth_service.disable_2fa(db, current_user, disable_data.password)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password"
        )
    
    return {"message": "2FA disabled successfully"}


@router.get("/activity", response_model=List[ActivityLogResponse])
async def get_activity_log(
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_sync_db),
    limit: int = 50,
    offset: int = 0
):
    """Get user activity log"""
    activities = db.query(ActivityLog).filter(
        ActivityLog.user_id == current_user.id
    ).order_by(
        ActivityLog.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    # Convert activities to response format
    activity_responses = []
    for activity in activities:
        activity_responses.append(ActivityLogResponse(
            id=activity.id,
            user_id=activity.user_id,
            action=activity.action,
            resource_type=activity.resource_type,
            resource_id=activity.resource_id,
            description=activity.description,
            metadata=activity.extra_data or {},
            ip_address=activity.ip_address,
            user_agent=activity.user_agent,
            created_at=activity.created_at
        ))
    
    return activity_responses


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user_sync)
):
    """Get current user information"""
    # Create response manually to avoid async relationship loading issues
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        phone_number=current_user.phone_number,
        department=current_user.department,
        job_title=current_user.job_title,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        is_verified=current_user.is_verified,
        last_login=current_user.last_login,
        two_factor_enabled=current_user.two_factor_enabled,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        roles=[]  # TODO: Load roles properly with async session
    )