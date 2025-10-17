"""
Authentication endpoints for the Aria API.

This module provides endpoints for user authentication, token management,
and password operations.
"""

from datetime import timedelta
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from aria.core.config import settings
from aria.core.database import get_db
from aria.core.logging import get_logger
from aria.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password_reset_token,
    verify_token,
)
from aria.dependencies.auth import get_current_user
from aria.schemas.base import SuccessResponse
from aria.schemas.user import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    ResetPasswordConfirm,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from aria.services.user_service import UserService

# Create router
router = APIRouter()

# Security scheme
security = HTTPBearer()

# Logger
logger = get_logger(__name__)


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """
    Authenticate user and return access tokens.
    
    Args:
        login_data: Login credentials
        db: Database session
        
    Returns:
        LoginResponse with user data and tokens
        
    Raises:
        HTTPException: If authentication fails
    """
    logger.info("Login attempt", username=login_data.username)
    
    user_service = UserService(db)
    
    # Authenticate user
    user = await user_service.authenticate_user(
        username=login_data.username,
        password=login_data.password
    )
    
    if not user:
        logger.warning("Login failed - invalid credentials", username=login_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    
    if not user.is_active:
        logger.warning("Login failed - inactive user", username=login_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
        )
    
    # Create tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.username,
        expires_delta=access_token_expires,
        additional_claims={"user_id": str(user.id), "is_superuser": user.is_superuser}
    )
    
    refresh_token = create_refresh_token(subject=user.username)
    
    # Update last login
    await user_service.update_last_login(user.id)
    
    logger.info("Login successful", username=login_data.username, user_id=str(user.id))
    
    return LoginResponse(
        user=UserResponse.model_validate(user),
        tokens=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Refresh access token using refresh token.
    
    Args:
        refresh_data: Refresh token data
        db: Database session
        
    Returns:
        New access and refresh tokens
        
    Raises:
        HTTPException: If refresh token is invalid
    """
    # Verify refresh token
    payload = verify_token(refresh_data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    # Get user
    user_service = UserService(db)
    user = await user_service.get_user_by_username(username)
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    
    # Create new tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.username,
        expires_delta=access_token_expires,
        additional_claims={"user_id": str(user.id), "is_superuser": user.is_superuser}
    )
    
    refresh_token = create_refresh_token(subject=user.username)
    
    logger.info("Token refreshed", username=username, user_id=str(user.id))
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", response_model=SuccessResponse)
async def logout(
    current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse:
    """
    Logout current user.
    
    Note: In a stateless JWT system, logout is handled client-side
    by removing the token. This endpoint is provided for consistency
    and potential future token blacklisting.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Success response
    """
    logger.info("User logged out", username=current_user.username, user_id=str(current_user.id))
    
    return SuccessResponse(
        message="Successfully logged out",
        data={"username": current_user.username}
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """
    Get current user information.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current user data
    """
    return current_user


@router.post("/change-password", response_model=SuccessResponse)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse:
    """
    Change current user's password.
    
    Args:
        password_data: Password change data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success response
        
    Raises:
        HTTPException: If current password is incorrect
    """
    user_service = UserService(db)
    
    # Verify current password
    user = await user_service.get_user_by_id(current_user.id)
    if not user or not user_service.verify_password(password_data.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    
    # Update password
    await user_service.update_password(user.id, password_data.new_password)
    
    logger.info("Password changed", username=current_user.username, user_id=str(current_user.id))
    
    return SuccessResponse(
        message="Password changed successfully"
    )


@router.post("/reset-password", response_model=SuccessResponse)
async def reset_password_request(
    reset_data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse:
    """
    Request password reset for user.
    
    Args:
        reset_data: Password reset request data
        db: Database session
        
    Returns:
        Success response (always returns success for security)
    """
    user_service = UserService(db)
    
    # Check if user exists
    user = await user_service.get_user_by_email(reset_data.email)
    
    if user and user.is_active:
        # Generate reset token and send email
        # This would typically send an email with the reset link
        # For now, just log the action
        logger.info("Password reset requested", email=reset_data.email, user_id=str(user.id))
        
        # In a real implementation, you would:
        # 1. Generate a password reset token
        # 2. Send an email with the reset link
        # 3. Store the token temporarily (Redis, database, etc.)
    else:
        # Log the attempt but don't reveal if user exists
        logger.warning("Password reset requested for non-existent user", email=reset_data.email)
    
    # Always return success to prevent user enumeration
    return SuccessResponse(
        message="If the email address exists in our system, you will receive password reset instructions."
    )


@router.post("/reset-password/confirm", response_model=SuccessResponse)
async def reset_password_confirm(
    reset_data: ResetPasswordConfirm,
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse:
    """
    Confirm password reset with token.
    
    Args:
        reset_data: Password reset confirmation data
        db: Database session
        
    Returns:
        Success response
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    # Verify reset token
    email = verify_password_reset_token(reset_data.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    
    user_service = UserService(db)
    
    # Get user by email
    user = await user_service.get_user_by_email(email)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found or inactive",
        )
    
    # Update password
    await user_service.update_password(user.id, reset_data.new_password)
    
    logger.info("Password reset completed", email=email, user_id=str(user.id))
    
    return SuccessResponse(
        message="Password reset successfully"
    )


@router.get("/verify-token", response_model=Dict[str, Any])
async def verify_access_token(
    current_user: UserResponse = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Verify access token validity.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Token verification result
    """
    return {
        "valid": True,
        "user_id": str(current_user.id),
        "username": current_user.username,
        "is_superuser": current_user.is_superuser,
        "is_active": current_user.is_active,
    }