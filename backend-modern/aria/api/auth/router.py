"""Authentication API routes."""

from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from aria.core.database import get_db
from aria.core.security import (
    create_access_token, 
    create_refresh_token, 
    security, 
    security_manager,
    verify_password
)
from aria.models.user import User
from aria.schemas.auth import (
    LoginRequest, 
    LoginResponse, 
    RefreshRequest, 
    RegisterRequest, 
    UserResponse
)
from aria.services.auth.service import AuthService

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Register a new user."""
    auth_service = AuthService(db)
    
    # Check if user already exists
    existing_user = await auth_service.get_user_by_email(request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    existing_user = await auth_service.get_user_by_username(request.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    user = await auth_service.create_user(
        username=request.username,
        email=request.email,
        password=request.password,
        full_name=request.full_name
    )
    
    return UserResponse.from_orm(user)


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Authenticate user and return tokens."""
    auth_service = AuthService(db)
    
    # Authenticate user
    user = await auth_service.authenticate_user(request.username, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Update last login
    user.last_login_at = datetime.utcnow()
    await auth_service.update_user(user)
    
    # Create tokens
    token_data = {"sub": str(user.id), "username": user.username}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.from_orm(user)
    )


@router.post("/refresh", response_model=Dict[str, str])
async def refresh_token(
    request: RefreshRequest,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Refresh access token using refresh token."""
    try:
        payload = security_manager.verify_token(request.refresh_token, "refresh")
        user_id = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        auth_service = AuthService(db)
        user = await auth_service.get_user_by_id(int(user_id))
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new access token
        token_data = {"sub": str(user.id), "username": user.username}
        new_access_token = create_access_token(token_data)
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get current authenticated user."""
    user_id = security_manager.get_current_user_id(credentials)
    
    auth_service = AuthService(db)
    user = await auth_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.from_orm(user)


@router.post("/logout")
async def logout() -> Dict[str, str]:
    """Logout user (client should discard tokens)."""
    return {"message": "Successfully logged out"}


@router.get("/verify-token")
async def verify_token_endpoint(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """Verify if token is valid."""
    try:
        payload = security_manager.verify_token(credentials.credentials)
        return {
            "valid": True,
            "user_id": payload.get("sub"),
            "username": payload.get("username"),
            "expires_at": payload.get("exp")
        }
    except HTTPException:
        return {"valid": False}