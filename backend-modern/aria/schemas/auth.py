"""Authentication schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, validator


class RegisterRequest(BaseModel):
    """User registration request."""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)
    
    @validator("username")
    def validate_username(cls, v):
        """Validate username format."""
        if not v.isalnum() and "_" not in v and "-" not in v:
            raise ValueError("Username can only contain letters, numbers, underscores, and hyphens")
        return v.lower()
    
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


class LoginRequest(BaseModel):
    """User login request."""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=1, max_length=100)


class RefreshRequest(BaseModel):
    """Token refresh request."""
    refresh_token: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    """User response model."""
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    theme: str
    language: str
    timezone: str
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    bio: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    
    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    """Login response model."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserUpdateRequest(BaseModel):
    """User update request."""
    full_name: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = Field(None, max_length=1000)
    company: Optional[str] = Field(None, max_length=255)
    position: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    theme: Optional[str] = Field(None, pattern="^(light|dark)$")
    language: Optional[str] = Field(None, max_length=10)
    timezone: Optional[str] = Field(None, max_length=50)


class PasswordChangeRequest(BaseModel):
    """Password change request."""
    current_password: str = Field(..., min_length=1, max_length=100)
    new_password: str = Field(..., min_length=8, max_length=100)
    
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