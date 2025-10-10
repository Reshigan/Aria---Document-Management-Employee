"""
User Profile Management API Routes
Handles user profile operations, avatar uploads, activity tracking, and preferences
"""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from core.database import get_db
from api.gateway.dependencies.auth import get_current_user
from models.user import User
from schemas.user import (
    UserProfileUpdate, UserPreferencesUpdate, UserProfileResponse,
    UserActivityListResponse, AvatarUploadResponse
)
from services.user_profile_service import get_user_profile_service

router = APIRouter(prefix="/api/v1/users", tags=["User Profiles"])


@router.get("/me/profile", response_model=UserProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's complete profile"""
    service = get_user_profile_service(db)
    profile = service.get_user_profile(current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.get("/{user_id}/profile", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user profile by ID (with privacy settings applied)"""
    service = get_user_profile_service(db)
    profile = service.get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Apply privacy settings if not viewing own profile
    if current_user.id != user_id and not current_user.is_superuser:
        # Get the target user's privacy settings
        target_user = db.query(User).filter(User.id == user_id).first()
        if target_user and target_user.privacy_settings:
            privacy = target_user.privacy_settings
            
            # Hide email if privacy setting is set
            if not privacy.get('show_email', False):
                profile.email = None
            
            # Hide phone if privacy setting is set
            if not privacy.get('show_phone', False):
                profile.phone_number = None
            
            # Hide department if privacy setting is set
            if not privacy.get('show_department', True):
                profile.department = None
            
            # Check profile visibility
            visibility = privacy.get('profile_visibility', 'internal')
            if visibility == 'private':
                raise HTTPException(status_code=403, detail="Profile is private")
    
    return profile


@router.put("/me/profile", response_model=UserProfileResponse)
async def update_my_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile"""
    service = get_user_profile_service(db)
    return service.update_user_profile(current_user.id, profile_data)


@router.put("/me/preferences", response_model=UserProfileResponse)
async def update_my_preferences(
    preferences: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's preferences"""
    service = get_user_profile_service(db)
    return service.update_user_preferences(current_user.id, preferences)


@router.post("/me/avatar", response_model=AvatarUploadResponse)
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload avatar for current user"""
    service = get_user_profile_service(db)
    return await service.upload_avatar(current_user.id, file)


@router.get("/{user_id}/avatar")
async def get_user_avatar(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get user avatar file"""
    service = get_user_profile_service(db)
    file_path = service.get_avatar_file_path(user_id)
    
    if not file_path:
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    return FileResponse(file_path)


@router.delete("/me/avatar")
async def delete_my_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete current user's avatar"""
    service = get_user_profile_service(db)
    return service.delete_avatar(current_user.id)


@router.get("/me/activity", response_model=UserActivityListResponse)
async def get_my_activity(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    activity_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's activity history"""
    service = get_user_profile_service(db)
    return service.get_user_activity(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        activity_type=activity_type
    )


@router.get("/me/stats")
async def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's statistics"""
    service = get_user_profile_service(db)
    return service.get_user_stats(current_user.id)


@router.get("/search")
async def search_users(
    q: str = Query(..., min_length=2, description="Search query"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    department: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search users by name, email, or username"""
    service = get_user_profile_service(db)
    return service.search_users(
        query=q,
        page=page,
        page_size=page_size,
        department=department
    )


# Admin-only routes
@router.get("/{user_id}/activity", response_model=UserActivityListResponse)
async def get_user_activity(
    user_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    activity_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user activity history (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    service = get_user_profile_service(db)
    return service.get_user_activity(
        user_id=user_id,
        page=page,
        page_size=page_size,
        activity_type=activity_type
    )


@router.get("/{user_id}/stats")
async def get_user_stats(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user statistics (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    service = get_user_profile_service(db)
    return service.get_user_stats(user_id)


@router.put("/{user_id}/profile", response_model=UserProfileResponse)
async def update_user_profile(
    user_id: int,
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    service = get_user_profile_service(db)
    return service.update_user_profile(user_id, profile_data)


# Activity logging helper for other services
@router.post("/activity/log")
async def log_activity(
    activity_data: Dict[str, Any],
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log user activity (internal use)"""
    service = get_user_profile_service(db)
    
    # Extract IP and user agent from request
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    activity = service.log_user_activity(
        user_id=current_user.id,
        activity_type=activity_data.get("activity_type"),
        activity_description=activity_data.get("activity_description"),
        resource_type=activity_data.get("resource_type"),
        resource_id=activity_data.get("resource_id"),
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=activity_data.get("metadata")
    )
    
    return {"message": "Activity logged successfully", "activity_id": activity.id}