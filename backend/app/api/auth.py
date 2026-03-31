"""
ARIA ERP - Authentication API
"""
from datetime import datetime, timedelta
from typing import Optional
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user      
from core.security import verify_password, create_access_token, create_refresh_token
from app.models.user import User, Role
from app.models.company import Company
from app.schemas.auth import UserCreate, UserLogin, UserResponse, Token
from core.audit import log_audit_event, get_client_ip, get_user_agent
from app.core.config import settings


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user and create their company"""
    
    try:
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            log_audit_event(
                db=db,
                user_id=None,
                user_email=user_data.email,
                action="failed_registration",
                resource="auth/register",
                details={"reason": "email_already_exists"},
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                success=False,
                error_message="Email already registered"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create company if provided
        company = None
        if user_data.company_name:
            company = Company(
                name=user_data.company_name,
                subscription_plan="trial",
                subscription_status="active"
            )
            db.add(company)
            db.flush()
        
        # Create user
        from app.core.security import get_password_hash
        user = User(
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            password_hash=get_password_hash(user_data.password),
            company_id=company.id if company else None,
            role="admin" if company else "user"
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create tokens
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "company_id": str(user.company_id) if user.company_id else None},
            expires_delta=access_token_expires
        )
        refresh_token = create_refresh_token({"sub": str(user.id)})
        
        # Log successful registration
        log_audit_event(
            db=db,
            user_id=user.id,
            user_email=user.email,
            action="successful_registration",
            resource="auth/register",
            details={
                "company_id": str(company.id) if company else None,
                "role": user.role,
                "expires_in_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES
            },
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=True
        )
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user)
        )
    except Exception as e:
        # Log unexpected registration errors
        log_audit_event(
            db=db,
            user_id=None,
            user_email=getattr(user_data, 'email', None),
            action="registration_error",
            resource="auth/register",
            details={"error_type": type(e).__name__, "error_message": str(e)},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=False,
            error_message=str(e)
        )
        # Re-raise the exception to maintain original behavior
        raise e


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login with email and password"""
    
    # Find user
    user = db.query(User).filter(User.email == form_data.username).first()
    
    try:
        if not user or not verify_password(form_data.password, user.password_hash):
            # Log failed login attempt
            log_audit_event(
                db=db,
                user_id=None,
                user_email=form_data.username,
                action="failed_login",
                resource="auth/login",
                details={"reason": "invalid_credentials"},
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                success=False,
                error_message="Invalid email or password"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            # Log inactive user login attempt
            log_audit_event(
                db=db,
                user_id=user.id,
                user_email=user.email,
                action="failed_login",
                resource="auth/login",
                details={"reason": "inactive_user"},
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                success=False,
                error_message="Inactive user"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user"
            )
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        
        # Create tokens
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "company_id": str(user.company_id) if user.company_id else None},
            expires_delta=access_token_expires
        )
        refresh_token = create_refresh_token({"sub": str(user.id)})
        
        # Log successful login
        log_audit_event(
            db=db,
            user_id=user.id,
            user_email=user.email,
            action="successful_login",
            resource="auth/login",
            details={"expires_in_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=True
        )
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user)
        )
    except Exception as e:
        # Log unexpected authentication errors
        log_audit_event(
            db=db,
            user_id=None,
            user_email=form_data.username,
            action="authentication_error",
            resource="auth/login",
            details={"error_type": type(e).__name__, "error_message": str(e)},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=False,
            error_message=str(e)
        )
        # Re-raise the exception to maintain original behavior
        raise e


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)  # Adding DB session for logging
):
    """Get current user information"""
    # Log user profile access
    log_audit_event(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        action="user_profile_access",
        resource="auth/me",
        details={"user_role": current_user.role},
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        success=True
    )
    return UserResponse.model_validate(current_user)


@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    request: Request,
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    from jose import jwt, JWTError
    from app.core.config import settings
    from uuid import UUID
    
    try:
        payload = jwt.decode(
            refresh_token,
            settings.JWT_REFRESH_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = UUID(payload.get("sub"))
    except JWTError:
        # Log invalid refresh token attempt
        log_audit_event(
            db=db,
            user_id=None,
            user_email=None,
            action="failed_token_refresh",
            resource="auth/refresh",
            details={"reason": "invalid_refresh_token"},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=False,
            error_message="Invalid refresh token"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        # Log failed refresh for invalid user
        log_audit_event(
            db=db,
            user_id=str(user_id) if user_id else None,
            user_email=user.email if user else None,
            action="failed_token_refresh",
            resource="auth/refresh",
            details={
                "reason": "user_not_found_or_inactive",
                "user_found": bool(user),
                "user_active": user.is_active if user else None
            },
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=False,
            error_message="User not found or inactive"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "company_id": str(user.company_id) if user.company_id else None},
        expires_delta=access_token_expires
    )
    new_refresh_token = create_refresh_token({"sub": str(user.id)})
    
    # Log successful token refresh
    log_audit_event(
        db=db,
        user_id=user.id,
        user_email=user.email,
        action="successful_token_refresh",
        resource="auth/refresh",
        details={
            "expires_in_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            "user_role": user.role
        },
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        success=True
    )
    
    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/forgot-password")
async def forgot_password(
    request: Request, 
    email: str, 
    db: Session = Depends(get_db)
):
    """Initiate password reset process"""
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # For security, we don't reveal if email exists
        # But we log the attempt for security monitoring
        log_audit_event(
            db=db,
            user_id=None,
            user_email=email,
            action="password_reset_request",
            resource="auth/forgot-password",
            details={"reason": "email_not_found"},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=False,
            error_message="Email not found"
        )
        # Return success regardless to prevent email enumeration
        return {"message": "If the email exists, a password reset link has been sent"}
    
    # Log successful request
    log_audit_event(
        db=db,
        user_id=user.id,
        user_email=user.email,
        action="password_reset_requested",
        resource="auth/forgot-password",
        details={"role": user.role},
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        success=True
    )
    
    # In a real implementation, we'd generate a token and send email
    # For now, return a message that indicates success
    return {"message": "If the email exists, a password reset link has been sent"}


@router.post("/reset-password/{token}")
async def reset_password(
    request: Request,
    token: str,
    new_password: str,
    db: Session = Depends(get_db)
):
    """Reset password using token"""
    # In a real implementation, we'd validate the token
    # For demo purposes, we'll simulate a successful reset
    
    try:
        # Log password reset attempt
        log_audit_event(
            db=db,
            user_id=None,  # Will be set after decoding token
            user_email=None,
            action="password_reset_attempt",
            resource="auth/reset-password",
            details={"token_present": bool(token)},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=True  # We log the attempt initially as success until validation
        )
        
        # Simulate token validation and password update
        # In real implementation, there would be token validation here
        
        # Log successful password reset (would normally happen after validation)
        log_audit_event(
            db=db,
            user_id=None,
            user_email=None,
            action="password_reset_completed",
            resource="auth/reset-password",
            details={"has_new_password": bool(new_password)},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=True
        )
        
        return {"message": "Password reset successfully"}
    except Exception as e:
        # Log failed password reset
        log_audit_event(
            db=db,
            user_id=None,
            user_email=None,
            action="password_reset_failed",
            resource="auth/reset-password",
            details={"error_type": type(e).__name__, "error_message": str(e)},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reset password"
        )


@router.post("/change-password")
async def change_password(
    request: Request,
    current_password: str,
    new_password: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change password for authenticated user"""
    try:
        # Verify current password
        if not verify_password(current_password, current_user.password_hash):
            log_audit_event(
                db=db,
                user_id=current_user.id,
                user_email=current_user.email,
                action="password_change_failed",
                resource="auth/change-password",
                details={"reason": "current_password_invalid"},
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                success=False,
                error_message="Current password invalid"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Update password
        from app.core.security import get_password_hash
        current_user.password_hash = get_password_hash(new_password)
        db.commit()
        
        # Log successful password change
        log_audit_event(
            db=db,
            user_id=current_user.id,
            user_email=current_user.email,
            action="password_changed",
            resource="auth/change-password",
            details={"user_role": current_user.role},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=True
        )
        
        return {"message": "Password changed successfully"}
    except Exception as e:
        # Log unexpected errors
        log_audit_event(
            db=db,
            user_id=current_user.id,
            user_email=current_user.email,
            action="password_change_error",
            resource="auth/change-password",
            details={"error_type": type(e).__name__, "error_message": str(e)},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=False,
            error_message=str(e)
        )
        raise e
