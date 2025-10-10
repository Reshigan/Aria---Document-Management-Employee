"""
User Management API Routes
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, select, update, delete
from sqlalchemy.orm import selectinload

from core.database import get_db
from api.routes.auth_enhanced import get_current_user
from models import User, Role, UserRole, ActivityLog
from schemas.user import (
    UserResponse, UserCreate, UserUpdate, UserListResponse,
    UserProfileUpdate, PasswordChangeRequest
)
from services.auth_service import auth_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List users with filtering and pagination (Admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    query = select(User).options(selectinload(User.roles))
    
    # Apply filters
    if search:
        search_filter = or_(
            User.username.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%"),
            User.full_name.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
    
    if role:
        query = query.join(UserRole).join(Role).where(Role.name == role)
    
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    
    # Get total count
    count_query = select(User.id)
    if search:
        count_query = count_query.where(search_filter)
    if role:
        count_query = count_query.join(UserRole).join(Role).where(Role.name == role)
    if is_active is not None:
        count_query = count_query.where(User.is_active == is_active)
    
    total_result = await db.execute(count_query)
    total = len(total_result.fetchall())
    
    # Apply pagination
    query = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()
    
    return UserListResponse(
        items=[UserResponse.from_orm(user) for user in users],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size
    )


@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new user (Admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Check if username already exists
    username_query = select(User).where(User.username == user_data.username)
    username_result = await db.execute(username_query)
    if username_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    email_query = select(User).where(User.email == user_data.email)
    email_result = await db.execute(email_query)
    if email_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password strength
    is_valid, errors = auth_service.validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password validation failed: {', '.join(errors)}"
        )
    
    # Create user
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=auth_service.get_password_hash(user_data.password),
        is_active=user_data.is_active,
        is_superuser=user_data.is_superuser,
        department=user_data.department,
        job_title=user_data.job_title,
        phone_number=user_data.phone_number
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "user_created", "user", new_user.id,
        f"Created user: {new_user.username}"
    )
    
    return UserResponse.from_orm(new_user)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile"""
    return UserResponse.from_orm(current_user)


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's profile"""
    # Update allowed fields
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name
    if profile_data.department is not None:
        current_user.department = profile_data.department
    if profile_data.job_title is not None:
        current_user.job_title = profile_data.job_title
    if profile_data.phone_number is not None:
        current_user.phone_number = profile_data.phone_number
    if profile_data.preferences is not None:
        current_user.preferences = profile_data.preferences
    
    await db.commit()
    await db.refresh(current_user)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "profile_updated", "user", current_user.id,
        "Updated profile information"
    )
    
    return UserResponse.from_orm(current_user)


@router.post("/me/change-password")
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change current user's password"""
    # Verify current password
    if not auth_service.verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password strength
    is_valid, errors = auth_service.validate_password_strength(password_data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password validation failed: {', '.join(errors)}"
        )
    
    # Update password
    current_user.hashed_password = auth_service.get_password_hash(password_data.new_password)
    await db.commit()
    
    # Logout all sessions except current one (if we had session tracking)
    # auth_service.logout_all_sessions(db, current_user.id)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "password_changed", "security", current_user.id,
        "Password changed successfully"
    )
    
    return {"message": "Password changed successfully"}


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user by ID (Admin only or own profile)"""
    if not current_user.is_superuser and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.from_orm(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user (Admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check for username conflicts
    if user_data.username and user_data.username != user.username:
        username_query = select(User).where(User.username == user_data.username)
        username_result = await db.execute(username_query)
        if username_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
    
    # Check for email conflicts
    if user_data.email and user_data.email != user.email:
        email_query = select(User).where(User.email == user_data.email)
        email_result = await db.execute(email_query)
        if email_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
    
    # Update fields
    update_data = user_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(user, field):
            setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "user_updated", "user", user.id,
        f"Updated user: {user.username}"
    )
    
    return UserResponse.from_orm(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete user (Admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Soft delete - deactivate instead of hard delete
    user.is_active = False
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "user_deleted", "user", user.id,
        f"Deactivated user: {user.username}"
    )
    
    return {"message": "User deactivated successfully"}


@router.post("/{user_id}/activate")
async def activate_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Activate user (Admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = True
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "user_activated", "user", user.id,
        f"Activated user: {user.username}"
    )
    
    return {"message": "User activated successfully"}


@router.get("/{user_id}/activity", response_model=List[dict])
async def get_user_activity(
    user_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user activity log (Admin only or own activity)"""
    if not current_user.is_superuser and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    query = select(ActivityLog).where(
        ActivityLog.user_id == user_id
    ).order_by(
        ActivityLog.created_at.desc()
    ).offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    activities = result.scalars().all()
    
    return [
        {
            "id": activity.id,
            "action": activity.action,
            "resource_type": activity.resource_type,
            "resource_id": activity.resource_id,
            "description": activity.description,
            "ip_address": activity.ip_address,
            "user_agent": activity.user_agent,
            "created_at": activity.created_at
        }
        for activity in activities
    ]