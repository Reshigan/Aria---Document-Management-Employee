"""
User Profile Management Service
Handles user profile operations, avatar uploads, activity tracking, and preferences
"""
import os
import uuid
import shutil
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import UploadFile, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_

from models.user import User, UserActivity
from schemas.user import (
    UserProfileUpdate, UserPreferencesUpdate, UserProfileResponse,
    UserActivityResponse, UserActivityListResponse
)
from core.storage import storage_service
from core.config import settings


class UserProfileService:
    """Service for managing user profiles"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_profile(self, user_id: int) -> Optional[UserProfileResponse]:
        """Get complete user profile"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        # Convert to response model
        profile_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone_number': user.phone_number,
            'department': user.department,
            'job_title': user.job_title,
            'bio': user.bio,
            'avatar_url': user.avatar_url,
            'location': user.location,
            'website': user.website,
            'linkedin_url': user.linkedin_url,
            'github_url': user.github_url,
            'is_active': user.is_active,
            'is_verified': user.is_verified,
            'last_login': user.last_login,
            'created_at': user.created_at,
            'updated_at': user.updated_at,
            'language': user.language,
            'timezone': user.timezone,
            'theme': user.theme,
            'date_format': user.date_format,
            'time_format': user.time_format,
            'email_notifications': user.email_notifications,
            'slack_notifications': user.slack_notifications,
            'push_notifications': user.push_notifications,
            'notification_preferences': user.notification_preferences,
            'ui_preferences': user.ui_preferences,
            'privacy_settings': user.privacy_settings,
            'roles': [role.name for role in user.roles]
        }
        
        return UserProfileResponse(**profile_data)
    
    def update_user_profile(self, user_id: int, profile_data: UserProfileUpdate) -> UserProfileResponse:
        """Update user profile information"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update fields that are provided
        update_data = profile_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(user, field):
                setattr(user, field, value)
        
        # Auto-generate full_name if first_name and last_name are provided
        if profile_data.first_name is not None or profile_data.last_name is not None:
            first_name = profile_data.first_name or user.first_name or ""
            last_name = profile_data.last_name or user.last_name or ""
            user.full_name = f"{first_name} {last_name}".strip()
        
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        
        # Log activity
        self.log_user_activity(
            user_id=user_id,
            activity_type="profile_update",
            activity_description="User profile updated",
            metadata={"updated_fields": list(update_data.keys())}
        )
        
        return self.get_user_profile(user_id)
    
    def update_user_preferences(self, user_id: int, preferences: UserPreferencesUpdate) -> UserProfileResponse:
        """Update user preferences"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update simple preferences
        if preferences.email_notifications is not None:
            user.email_notifications = preferences.email_notifications
        if preferences.slack_notifications is not None:
            user.slack_notifications = preferences.slack_notifications
        if preferences.push_notifications is not None:
            user.push_notifications = preferences.push_notifications
        
        # Update JSON preferences
        if preferences.notification_preferences is not None:
            user.notification_preferences = preferences.notification_preferences
        if preferences.ui_preferences is not None:
            user.ui_preferences = preferences.ui_preferences
        if preferences.privacy_settings is not None:
            user.privacy_settings = preferences.privacy_settings
        
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        
        # Log activity
        self.log_user_activity(
            user_id=user_id,
            activity_type="preferences_update",
            activity_description="User preferences updated"
        )
        
        return self.get_user_profile(user_id)
    
    async def upload_avatar(self, user_id: int, file: UploadFile) -> Dict[str, str]:
        """Upload user avatar"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail="Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."
            )
        
        # Validate file size (5MB max)
        max_size = 5 * 1024 * 1024  # 5MB
        file_content = await file.read()
        if len(file_content) > max_size:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        unique_filename = f"avatar_{user_id}_{uuid.uuid4().hex}.{file_extension}"
        
        # Create avatars directory if it doesn't exist
        avatars_dir = os.path.join(str(storage_service.base_path), "avatars")
        os.makedirs(avatars_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(avatars_dir, unique_filename)
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Remove old avatar if exists
        if user.avatar_filename:
            old_file_path = os.path.join(avatars_dir, user.avatar_filename)
            if os.path.exists(old_file_path):
                os.remove(old_file_path)
        
        # Update user record
        user.avatar_filename = unique_filename
        user.avatar_url = f"/api/v1/users/{user_id}/avatar"
        user.updated_at = datetime.utcnow()
        self.db.commit()
        
        # Log activity
        self.log_user_activity(
            user_id=user_id,
            activity_type="avatar_upload",
            activity_description="User avatar updated"
        )
        
        return {
            "avatar_url": user.avatar_url,
            "message": "Avatar uploaded successfully"
        }
    
    def get_avatar_file_path(self, user_id: int) -> Optional[str]:
        """Get avatar file path for serving"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.avatar_filename:
            return None
        
        avatars_dir = os.path.join(str(storage_service.base_path), "avatars")
        file_path = os.path.join(avatars_dir, user.avatar_filename)
        
        if os.path.exists(file_path):
            return file_path
        return None
    
    def delete_avatar(self, user_id: int) -> Dict[str, str]:
        """Delete user avatar"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user.avatar_filename:
            # Remove file
            avatars_dir = os.path.join(str(storage_service.base_path), "avatars")
            file_path = os.path.join(avatars_dir, user.avatar_filename)
            if os.path.exists(file_path):
                os.remove(file_path)
            
            # Update user record
            user.avatar_filename = None
            user.avatar_url = None
            user.updated_at = datetime.utcnow()
            self.db.commit()
            
            # Log activity
            self.log_user_activity(
                user_id=user_id,
                activity_type="avatar_delete",
                activity_description="User avatar deleted"
            )
        
        return {"message": "Avatar deleted successfully"}
    
    def log_user_activity(
        self, 
        user_id: int, 
        activity_type: str, 
        activity_description: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UserActivity:
        """Log user activity"""
        activity = UserActivity(
            user_id=user_id,
            activity_type=activity_type,
            activity_description=activity_description,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            activity_metadata=metadata
        )
        
        self.db.add(activity)
        self.db.commit()
        self.db.refresh(activity)
        
        return activity
    
    def get_user_activity(
        self, 
        user_id: int, 
        page: int = 1, 
        page_size: int = 50,
        activity_type: Optional[str] = None
    ) -> UserActivityListResponse:
        """Get user activity history with pagination"""
        query = self.db.query(UserActivity).filter(UserActivity.user_id == user_id)
        
        if activity_type:
            query = query.filter(UserActivity.activity_type == activity_type)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        activities = query.order_by(desc(UserActivity.created_at)).offset(offset).limit(page_size).all()
        
        # Convert to response models
        activity_responses = [
            UserActivityResponse(
                id=activity.id,
                activity_type=activity.activity_type,
                activity_description=activity.activity_description,
                resource_type=activity.resource_type,
                resource_id=activity.resource_id,
                ip_address=activity.ip_address,
                metadata=activity.activity_metadata,
                created_at=activity.created_at
            )
            for activity in activities
        ]
        
        pages = (total + page_size - 1) // page_size
        
        return UserActivityListResponse(
            items=activity_responses,
            total=total,
            page=page,
            page_size=page_size,
            pages=pages
        )
    
    def get_user_stats(self, user_id: int) -> Dict[str, Any]:
        """Get user statistics"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Count documents uploaded by user
        from models.document import Document
        documents_count = self.db.query(Document).filter(Document.uploaded_by == user_id).count()
        
        # Count recent activities (last 30 days)
        from datetime import timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_activities = self.db.query(UserActivity).filter(
            and_(
                UserActivity.user_id == user_id,
                UserActivity.created_at >= thirty_days_ago
            )
        ).count()
        
        # Get last login
        last_login = user.last_login
        
        return {
            "user_id": user_id,
            "documents_uploaded": documents_count,
            "recent_activities": recent_activities,
            "last_login": last_login,
            "account_created": user.created_at,
            "profile_completion": self._calculate_profile_completion(user)
        }
    
    def _calculate_profile_completion(self, user: User) -> float:
        """Calculate profile completion percentage"""
        fields_to_check = [
            'full_name', 'first_name', 'last_name', 'phone_number', 
            'department', 'job_title', 'bio', 'location', 'avatar_url'
        ]
        
        completed_fields = 0
        for field in fields_to_check:
            value = getattr(user, field, None)
            if value and str(value).strip():
                completed_fields += 1
        
        return (completed_fields / len(fields_to_check)) * 100
    
    def search_users(
        self, 
        query: str, 
        page: int = 1, 
        page_size: int = 20,
        department: Optional[str] = None
    ) -> Dict[str, Any]:
        """Search users by name, email, or username"""
        search_query = self.db.query(User).filter(User.is_active == True)
        
        # Apply text search
        if query:
            search_filter = or_(
                User.username.ilike(f"%{query}%"),
                User.email.ilike(f"%{query}%"),
                User.full_name.ilike(f"%{query}%"),
                User.first_name.ilike(f"%{query}%"),
                User.last_name.ilike(f"%{query}%")
            )
            search_query = search_query.filter(search_filter)
        
        # Apply department filter
        if department:
            search_query = search_query.filter(User.department == department)
        
        # Get total count
        total = search_query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        users = search_query.offset(offset).limit(page_size).all()
        
        # Convert to response format (limited info for search results)
        user_results = []
        for user in users:
            user_results.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "department": user.department,
                "job_title": user.job_title,
                "avatar_url": user.avatar_url,
                "is_active": user.is_active
            })
        
        pages = (total + page_size - 1) // page_size
        
        return {
            "items": user_results,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": pages
        }


def get_user_profile_service(db: Session) -> UserProfileService:
    """Get user profile service instance"""
    return UserProfileService(db)