"""
Authentication API Routes

Handles user login, registration, token refresh, and password management.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from datetime import datetime

from backend.auth.jwt_auth import AuthService, JWTManager, PasswordManager, get_current_user
from backend.database.multi_tenant import get_db_manager

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models
class LoginRequest(BaseModel):
    """Login request."""
    email: EmailStr
    password: str = Field(..., min_length=8)


class LoginResponse(BaseModel):
    """Login response with tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    """Refresh token response."""
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    """User registration request."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    company_name: str = Field(..., min_length=1, max_length=255)
    company_registration: Optional[str] = None
    phone: Optional[str] = None


class RegisterResponse(BaseModel):
    """Registration response."""
    message: str
    tenant_id: str
    user_id: str
    email: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    """Change password request."""
    current_password: str
    new_password: str = Field(..., min_length=8)


class ResetPasswordRequest(BaseModel):
    """Password reset request."""
    email: EmailStr


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    """
    Login with email and password.
    
    Returns JWT access token (1 hour) and refresh token (30 days).
    """
    db_manager = get_db_manager()
    
    # Use public schema for authentication (no tenant context)
    with db_manager.get_db() as db:
        try:
            result = AuthService.login(
                email=request.email,
                password=request.password,
                db=db
            )
            
            logger.info(f"User logged in: {request.email}")
            return result
        
        except HTTPException:
            raise
        
        except Exception as e:
            logger.error(f"Login error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Login failed"
            )


@router.post("/refresh", response_model=RefreshTokenResponse)
def refresh_token(request: RefreshTokenRequest):
    """
    Refresh access token using refresh token.
    
    Returns new access token (1 hour).
    """
    db_manager = get_db_manager()
    
    with db_manager.get_db() as db:
        try:
            result = AuthService.refresh_token(
                refresh_token=request.refresh_token,
                db=db
            )
            
            logger.info("Token refreshed successfully")
            return result
        
        except HTTPException:
            raise
        
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Token refresh failed"
            )


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest):
    """
    Register new user and create tenant.
    
    This creates:
    1. New tenant (company)
    2. PostgreSQL schema for tenant
    3. Admin user for tenant
    4. Starts trial period (14 days)
    """
    from backend.models.tenant import Tenant, calculate_monthly_price
    from backend.models.user import User
    import uuid
    from datetime import timedelta
    
    db_manager = get_db_manager()
    
    with db_manager.get_db() as db:
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == request.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Generate IDs
        tenant_id = f"tenant_{uuid.uuid4().hex[:12]}"
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        
        # Create tenant
        tenant = Tenant(
            tenant_id=tenant_id,
            company_name=request.company_name,
            company_registration=request.company_registration,
            admin_email=request.email,
            admin_name=f"{request.first_name} {request.last_name}",
            admin_phone=request.phone,
            subscription_tier="starter",  # Start with starter tier
            subscription_status="trial",  # Trial period
            trial_ends_at=datetime.utcnow() + timedelta(days=14),  # 14-day trial
            monthly_price_zar=calculate_monthly_price("starter", is_beta=False),
            is_active=True,
            is_beta=False,
            database_schema=f"tenant_{tenant_id}",
            enabled_bots=["meta_bot_orchestrator", "whatsapp_helpdesk", "analytics"],  # Starter bots
            bbbee_enabled=False,
            sars_payroll_enabled=False
        )
        
        db.add(tenant)
        
        # Create admin user
        user = User(
            user_id=user_id,
            tenant_id=tenant_id,
            email=request.email,
            first_name=request.first_name,
            last_name=request.last_name,
            phone=request.phone,
            role="admin",  # First user is admin
            is_active=True,
            is_verified=False,
            language="en",
            timezone="Africa/Johannesburg"
        )
        
        # Hash password
        user.set_password(request.password)
        
        db.add(user)
        db.commit()
        
        # Generate tokens for immediate login
        access_token = JWTManager.create_access_token(
            user_id=user_id,
            tenant_id=tenant_id,
            email=request.email,
            role="admin"
        )
        
        refresh_token = JWTManager.create_refresh_token(
            user_id=user_id,
            tenant_id=tenant_id
        )
        
        logger.info(f"New tenant registered: {tenant_id} ({request.company_name})")
    
    # Create tenant schema in database
    success = db_manager.create_tenant_schema(tenant_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create tenant database"
        )
    
    # TODO: Send welcome email
    # TODO: Send email verification
    
    return RegisterResponse(
        message="Registration successful! Welcome to ARIA.",
        tenant_id=tenant_id,
        user_id=user_id,
        email=request.email,
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user information.
    
    Requires valid JWT token.
    """
    return {
        "user_id": current_user["user_id"],
        "tenant_id": current_user["tenant_id"],
        "email": current_user["email"],
        "role": current_user["role"]
    }


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Change user password.
    
    Requires current password for verification.
    """
    from backend.models.user import User
    
    db_manager = get_db_manager()
    
    with db_manager.get_db() as db:
        # Get user
        user = db.query(User).filter(User.user_id == current_user["user_id"]).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if not user.verify_password(request.current_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Set new password
        user.set_password(request.new_password)
        user.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Password changed for user: {user.email}")
        
        return {"message": "Password changed successfully"}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """
    Request password reset email.
    
    Sends email with password reset link.
    """
    from backend.models.user import User
    
    db_manager = get_db_manager()
    
    with db_manager.get_db() as db:
        # Check if user exists
        user = db.query(User).filter(User.email == request.email).first()
        
        # Don't reveal if email exists (security)
        if not user:
            logger.warning(f"Password reset requested for non-existent email: {request.email}")
        else:
            # TODO: Generate reset token
            # TODO: Send reset email
            logger.info(f"Password reset requested for: {request.email}")
        
        return {
            "message": "If the email exists, a password reset link has been sent."
        }


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout user.
    
    In JWT-based auth, logout is client-side (delete token).
    This endpoint is for logging purposes only.
    """
    logger.info(f"User logged out: {current_user['email']}")
    
    return {"message": "Logged out successfully"}


@router.get("/verify-email/{token}")
async def verify_email(token: str):
    """
    Verify user email with token.
    
    Token is sent via email during registration.
    """
    # TODO: Implement email verification
    # 1. Decode token
    # 2. Mark user as verified
    # 3. Update email_verified_at
    
    return {"message": "Email verification not yet implemented"}
