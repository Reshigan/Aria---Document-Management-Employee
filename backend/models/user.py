"""
User related database models
"""
from datetime import datetime, timedelta
from typing import Optional
import secrets
import json
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
from .base import BaseModel





class User(BaseModel):
    """User model"""
    __tablename__ = "users"
    
    # Basic info
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(100))
    first_name = Column(String(50))
    last_name = Column(String(50))
    phone_number = Column(String(20))
    department = Column(String(100))
    job_title = Column(String(100))
    
    # Profile information
    bio = Column(Text)
    avatar_url = Column(String(500))
    avatar_filename = Column(String(255))  # For file storage
    location = Column(String(100))
    website = Column(String(255))
    linkedin_url = Column(String(255))
    github_url = Column(String(255))
    
    # Authentication
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime)
    
    # Two-Factor Authentication
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255))  # Encrypted TOTP secret
    backup_codes = Column(Text)  # JSON array of backup codes
    
    # Preferences
    email_notifications = Column(Boolean, default=True)
    slack_notifications = Column(Boolean, default=False)
    push_notifications = Column(Boolean, default=True)
    language = Column(String(10), default='en')
    timezone = Column(String(50), default='UTC')
    theme = Column(String(20), default='light')
    date_format = Column(String(20), default='YYYY-MM-DD')
    time_format = Column(String(10), default='24h')
    
    # Advanced preferences stored as JSON
    notification_preferences = Column(JSON, default=lambda: {
        'email': {'documents': True, 'comments': True, 'shares': True, 'mentions': True},
        'push': {'documents': True, 'comments': True, 'shares': True, 'mentions': True},
        'frequency': 'immediate'  # immediate, daily, weekly
    })
    ui_preferences = Column(JSON, default=lambda: {
        'sidebar_collapsed': False,
        'table_density': 'default',
        'default_view': 'list',
        'items_per_page': 20
    })
    privacy_settings = Column(JSON, default=lambda: {
        'profile_visibility': 'internal',  # public, internal, private
        'show_email': False,
        'show_phone': False,
        'show_department': True
    })
    
    # Relationships
    documents = relationship("Document", foreign_keys="[Document.uploaded_by]", back_populates="uploaded_by_user")
    folder_permissions = relationship("FolderPermission", foreign_keys="[FolderPermission.user_id]", back_populates="user")
    activities = relationship("UserActivity", back_populates="user", cascade="all, delete-orphan")
    
    # Notification relationships
    received_notifications = relationship("Notification", foreign_keys="[Notification.recipient_id]", back_populates="recipient")
    sent_notifications = relationship("Notification", foreign_keys="[Notification.sender_id]", back_populates="sender")
    notification_preferences = relationship("NotificationPreference", back_populates="user", cascade="all, delete-orphan")
    notification_subscriptions = relationship("NotificationSubscription", back_populates="user", cascade="all, delete-orphan")
    
    # Integration relationships
    created_integrations = relationship("Integration", foreign_keys="[Integration.created_by]", back_populates="creator")
    
    # Document processing relationships
    processing_jobs = relationship("DocumentProcessingJob", back_populates="user")
    processing_templates = relationship("ProcessingTemplate", back_populates="created_by")
    
    @hybrid_property
    def role_names(self):
        """Get list of role names for this user"""
        # This will be handled by the security system
        return []
    
    def has_permission(self, permission_name: str) -> bool:
        """Check if user has a specific permission"""
        # This will be handled by the security system
        return self.is_superuser
    
    def has_role(self, role_name: str) -> bool:
        """Check if user has a specific role"""
        # This will be handled by the security system
        return self.is_superuser




class PasswordResetToken(BaseModel):
    """Password reset token model"""
    __tablename__ = "password_reset_tokens"
    
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    token = Column(String(100), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    used_at = Column(DateTime)
    
    # Relationships
    user = relationship("User")
    
    @staticmethod
    def generate_token() -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def create_for_user(user_id: int, expires_in_hours: int = 24) -> 'PasswordResetToken':
        """Create a new password reset token for a user"""
        token = PasswordResetToken(
            user_id=user_id,
            token=PasswordResetToken.generate_token(),
            expires_at=datetime.utcnow() + timedelta(hours=expires_in_hours)
        )
        return token
    
    def is_valid(self) -> bool:
        """Check if token is still valid"""
        return not self.used and datetime.utcnow() < self.expires_at
    
    def mark_as_used(self):
        """Mark token as used"""
        self.used = True
        self.used_at = datetime.utcnow()


class UserActivity(BaseModel):
    """User activity tracking model"""
    __tablename__ = "user_activities"
    
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    activity_type = Column(String(50), nullable=False)  # login, logout, document_upload, document_view, etc.
    activity_description = Column(Text)
    resource_type = Column(String(50))  # document, folder, user, etc.
    resource_id = Column(Integer)  # ID of the resource
    ip_address = Column(String(45))  # IPv4 or IPv6
    user_agent = Column(Text)
    activity_metadata = Column(JSON)  # Additional activity metadata
    
    # Relationships
    user = relationship("User", back_populates="activities")
    
    def __repr__(self):
        return f"<UserActivity(user_id={self.user_id}, type={self.activity_type}, created_at={self.created_at})>"



