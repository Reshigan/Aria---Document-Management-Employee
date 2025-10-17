"""
User management endpoints for the Aria API.

This module provides endpoints for user CRUD operations,
user profile management, and user statistics.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from aria.core.database import get_db
from aria.core.logging import get_logger
from aria.dependencies.auth import get_current_superuser, get_current_user
from aria.schemas.base import PaginatedResponse, SuccessResponse
from aria.schemas.user import (
    UserCreate,
    UserListResponse,
    UserProfileUpdate,
    UserResponse,
    UserStatsResponse,
    UserUpdate,
)
from aria.services.user_service import UserService

# Create router
router = APIRouter()

# Logger
logger = get_logger(__name__)


@router.get("/", response_model=UserListResponse)
async def get_users(
    skip: int = Query(0, ge=0, description="Number of users to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of users to return"),
    search: Optional[str] = Query(None, description="Search term for username, email, or full name"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    role_id: Optional[UUID] = Query(None, description="Filter by role ID"),
    current_user: UserResponse = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
) -> UserListResponse:
    """
    Get users with filtering and pagination.
    
    Requires superuser permissions.
    
    Args:
        skip: Number of users to skip
        limit: Maximum number of users to return
        search: Search term for username, email, or full name
        is_active: Filter by active status
        role_id: Filter by role ID
        current_user: Current authenticated superuser
        db: Database session
        
    Returns:
        Paginated list of users
    """
    user_service = UserService(db)
    
    users, total = await user_service.get_users(
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
        role_id=role_id,
    )
    
    # Convert to response models
    user_responses = [UserResponse.model_validate(user) for user in users]
    
    return PaginatedResponse.create(
        items=user_responses,
        total=total,
        page=(skip // limit) + 1,
        size=limit,
    )


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: UserResponse = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Create a new user.
    
    Requires superuser permissions.
    
    Args:
        user_data: User creation data
        current_user: Current authenticated superuser
        db: Database session
        
    Returns:
        Created user data
        
    Raises:
        HTTPException: If username or email already exists
    """
    user_service = UserService(db)
    
    try:
        user = await user_service.create_user(user_data)
        logger.info(
            "User created by admin",
            created_username=user.username,
            admin_username=current_user.username,
        )
        return UserResponse.model_validate(user)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """
    Get current user's profile.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current user's profile data
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    profile_data: UserProfileUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Update current user's profile.
    
    Args:
        profile_data: Profile update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated user profile data
        
    Raises:
        HTTPException: If update fails
    """
    user_service = UserService(db)
    
    # Convert profile update to user update
    user_update = UserUpdate(**profile_data.model_dump(exclude_unset=True))
    
    try:
        updated_user = await user_service.update_user(current_user.id, user_update)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        logger.info("User profile updated", username=current_user.username)
        return UserResponse.model_validate(updated_user)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: UserResponse = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Get user by ID.
    
    Requires superuser permissions.
    
    Args:
        user_id: User ID
        current_user: Current authenticated superuser
        db: Database session
        
    Returns:
        User data
        
    Raises:
        HTTPException: If user not found
    """
    user_service = UserService(db)
    
    user = await user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    current_user: UserResponse = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Update user by ID.
    
    Requires superuser permissions.
    
    Args:
        user_id: User ID
        user_data: User update data
        current_user: Current authenticated superuser
        db: Database session
        
    Returns:
        Updated user data
        
    Raises:
        HTTPException: If user not found or update fails
    """
    user_service = UserService(db)
    
    try:
        updated_user = await user_service.update_user(user_id, user_data)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        logger.info(
            "User updated by admin",
            updated_username=updated_user.username,
            admin_username=current_user.username,
        )
        return UserResponse.model_validate(updated_user)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{user_id}", response_model=SuccessResponse)
async def delete_user(
    user_id: UUID,
    current_user: UserResponse = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse:
    """
    Delete user by ID (soft delete).
    
    Requires superuser permissions.
    
    Args:
        user_id: User ID
        current_user: Current authenticated superuser
        db: Database session
        
    Returns:
        Success response
        
    Raises:
        HTTPException: If user not found or is the current user
    """
    # Prevent self-deletion
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )
    
    user_service = UserService(db)
    
    # Get user first to log the username
    user = await user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    success = await user_service.delete_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    logger.info(
        "User deleted by admin",
        deleted_username=user.username,
        admin_username=current_user.username,
    )
    
    return SuccessResponse(
        message=f"User '{user.username}' has been deactivated successfully"
    )


@router.get("/stats/overview", response_model=UserStatsResponse)
async def get_user_stats(
    current_user: UserResponse = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
) -> UserStatsResponse:
    """
    Get user statistics overview.
    
    Requires superuser permissions.
    
    Args:
        current_user: Current authenticated superuser
        db: Database session
        
    Returns:
        User statistics
    """
    user_service = UserService(db)
    
    # Get basic stats
    all_users, total_users = await user_service.get_users(limit=1000000)  # Get all users for stats
    
    active_users = sum(1 for user in all_users if user.is_active)
    verified_users = sum(1 for user in all_users if user.is_verified)
    
    # Group users by role
    users_by_role = {}
    for user in all_users:
        for role in user.roles:
            if role.name not in users_by_role:
                users_by_role[role.name] = 0
            users_by_role[role.name] += 1
    
    # Calculate recent logins and new users (simplified for now)
    # In a real implementation, you would query the database with date filters
    recent_logins = sum(1 for user in all_users if user.last_login)  # Simplified
    new_users_this_month = 0  # Would need date filtering
    
    return UserStatsResponse(
        total_users=total_users,
        active_users=active_users,
        verified_users=verified_users,
        users_by_role=users_by_role,
        recent_logins=recent_logins,
        new_users_this_month=new_users_this_month,
    )