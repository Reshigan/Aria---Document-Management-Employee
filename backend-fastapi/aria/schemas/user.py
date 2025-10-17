"""
User-related Pydantic schemas for request/response validation.

This module defines schemas for user management, authentication,
and authorization operations.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import EmailStr, Field, validator

from aria.schemas.base import BaseSchema, IDMixin, PaginatedResponse, TimestampMixin


class RoleBase(BaseSchema):
    """Base role schema."""
    
    name: str = Field(..., min_length=1, max_length=50, description="Role name")
    description: Optional[str] = Field(None, max_length=500, description="Role description")
    is_active: bool = Field(True, description="Whether role is active")


class RoleCreate(RoleBase):
    """Schema for creating a new role."""
    
    permissions: Optional[List[str]] = Field(default_factory=list, description="Role permissions")


class RoleUpdate(BaseSchema):
    """Schema for updating a role."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=50, description="Role name")
    description: Optional[str] = Field(None, max_length=500, description="Role description")
    permissions: Optional[List[str]] = Field(None, description="Role permissions")
    is_active: Optional[bool] = Field(None, description="Whether role is active")


class RoleResponse(RoleBase, IDMixin, TimestampMixin):
    """Schema for role responses."""
    
    permissions: List[str] = Field(default_factory=list, description="Role permissions")


class UserBase(BaseSchema):
    """Base user schema with common fields."""
    
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    email: EmailStr = Field(..., description="Email address")
    full_name: Optional[str] = Field(None, max_length=255, description="Full name")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    department: Optional[str] = Field(None, max_length=100, description="Department")
    position: Optional[str] = Field(None, max_length=100, description="Position")
    is_active: bool = Field(True, description="Whether user is active")
    
    @validator("username")
    def validate_username(cls, v):
        """Validate username format."""
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, hyphens, and underscores")
        return v.lower()


class UserCreate(UserBase):
    """Schema for creating a new user."""
    
    password: str = Field(..., min_length=8, max_length=128, description="Password")
    role_ids: Optional[List[UUID]] = Field(default_factory=list, description="Role IDs to assign")
    
    @validator("password")
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserUpdate(BaseSchema):
    """Schema for updating a user."""
    
    username: Optional[str] = Field(None, min_length=3, max_length=50, description="Username")
    email: Optional[EmailStr] = Field(None, description="Email address")
    full_name: Optional[str] = Field(None, max_length=255, description="Full name")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    department: Optional[str] = Field(None, max_length=100, description="Department")
    position: Optional[str] = Field(None, max_length=100, description="Position")
    avatar_url: Optional[str] = Field(None, max_length=500, description="Avatar URL")
    language: Optional[str] = Field(None, max_length=10, description="Preferred language")
    timezone: Optional[str] = Field(None, max_length=50, description="Timezone")
    theme: Optional[str] = Field(None, max_length=20, description="UI theme preference")
    is_active: Optional[bool] = Field(None, description="Whether user is active")
    role_ids: Optional[List[UUID]] = Field(None, description="Role IDs to assign")


class UserResponse(UserBase, IDMixin, TimestampMixin):
    """Schema for user responses."""
    
    avatar_url: Optional[str] = Field(None, description="Avatar URL")
    language: str = Field("en", description="Preferred language")
    timezone: str = Field("UTC", description="Timezone")
    theme: str = Field("light", description="UI theme preference")
    is_verified: bool = Field(False, description="Whether user is verified")
    is_superuser: bool = Field(False, description="Whether user is superuser")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    roles: List[RoleResponse] = Field(default_factory=list, description="User roles")


class UserListResponse(PaginatedResponse[UserResponse]):
    """Paginated response for user lists."""
    pass


class LoginRequest(BaseSchema):
    """Schema for login requests."""
    
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="Password")
    remember_me: bool = Field(False, description="Remember login")


class TokenResponse(BaseSchema):
    """Schema for token responses."""
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")


class LoginResponse(BaseSchema):
    """Schema for login responses."""
    
    user: UserResponse = Field(..., description="User information")
    tokens: TokenResponse = Field(..., description="Authentication tokens")


class RefreshTokenRequest(BaseSchema):
    """Schema for refresh token requests."""
    
    refresh_token: str = Field(..., description="Refresh token")


class ChangePasswordRequest(BaseSchema):
    """Schema for password change requests."""
    
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")
    
    @validator("new_password")
    def validate_new_password(cls, v):
        """Validate new password strength."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class ResetPasswordRequest(BaseSchema):
    """Schema for password reset requests."""
    
    email: EmailStr = Field(..., description="Email address")


class ResetPasswordConfirm(BaseSchema):
    """Schema for password reset confirmation."""
    
    token: str = Field(..., description="Reset token")
    new_password: str = Field(..., min_length=8, description="New password")
    
    @validator("new_password")
    def validate_new_password(cls, v):
        """Validate new password strength."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserProfileUpdate(BaseSchema):
    """Schema for user profile updates."""
    
    full_name: Optional[str] = Field(None, max_length=255, description="Full name")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    avatar_url: Optional[str] = Field(None, max_length=500, description="Avatar URL")
    language: Optional[str] = Field(None, max_length=10, description="Preferred language")
    timezone: Optional[str] = Field(None, max_length=50, description="Timezone")
    theme: Optional[str] = Field(None, max_length=20, description="UI theme preference")


class UserStatsResponse(BaseSchema):
    """Schema for user statistics."""
    
    total_users: int = Field(..., ge=0, description="Total number of users")
    active_users: int = Field(..., ge=0, description="Number of active users")
    verified_users: int = Field(..., ge=0, description="Number of verified users")
    users_by_role: dict = Field(default_factory=dict, description="Users grouped by role")
    recent_logins: int = Field(..., ge=0, description="Recent logins (last 24h)")
    new_users_this_month: int = Field(..., ge=0, description="New users this month")