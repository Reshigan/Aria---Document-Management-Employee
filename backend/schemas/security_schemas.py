from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class UserRoleEnum(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    VIEWER = "viewer"

class PermissionTypeEnum(str, Enum):
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"
    EXECUTE = "execute"

class SessionStatusEnum(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"

class SecurityEventTypeEnum(str, Enum):
    FAILED_LOGIN = "failed_login"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    PASSWORD_CHANGE = "password_change"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    TWO_FACTOR_ENABLED = "two_factor_enabled"
    TWO_FACTOR_DISABLED = "two_factor_disabled"

class AuditActionEnum(str, Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    UPLOAD = "upload"
    DOWNLOAD = "download"
    SHARE = "share"
    PERMISSION_CHANGE = "permission_change"
    ROLE_CHANGE = "role_change"
    SECURITY_EVENT = "security_event"

# Authentication Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False
    two_factor_code: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]
    requires_2fa: bool = False

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v):
            raise ValueError('Password must contain at least one special character')
        return v

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# Permission Schemas
class PermissionBase(BaseModel):
    name: str
    description: Optional[str] = None
    resource_type: str
    permission_type: PermissionTypeEnum

class PermissionCreate(PermissionBase):
    pass

class PermissionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    resource_type: Optional[str] = None
    permission_type: Optional[PermissionTypeEnum] = None

class Permission(PermissionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Role Schemas
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class RoleCreate(RoleBase):
    permission_ids: List[int] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    permission_ids: Optional[List[int]] = None

class Role(RoleBase):
    id: int
    is_system_role: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    permissions: List[Permission] = []
    
    class Config:
        from_attributes = True

# User Role Schemas
class UserRoleAssignment(BaseModel):
    user_id: int
    role_id: int
    expires_at: Optional[datetime] = None

class UserRoleResponse(BaseModel):
    id: int
    user_id: int
    role_id: int
    role_name: str
    assigned_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool
    
    class Config:
        from_attributes = True

# Session Schemas
class SessionInfo(BaseModel):
    id: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = None
    location: Optional[Dict[str, Any]] = None
    status: SessionStatusEnum
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    
    class Config:
        from_attributes = True

class SessionList(BaseModel):
    sessions: List[SessionInfo]
    current_session_id: int

# Two-Factor Authentication Schemas
class TwoFactorSetupRequest(BaseModel):
    password: str

class TwoFactorSetupResponse(BaseModel):
    secret_key: str
    qr_code_url: str
    backup_codes: List[str]

class TwoFactorVerifyRequest(BaseModel):
    code: str

class TwoFactorDisableRequest(BaseModel):
    password: str
    code: str

class TwoFactorStatus(BaseModel):
    is_enabled: bool
    enabled_at: Optional[datetime] = None
    last_used: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# API Key Schemas
class APIKeyCreate(BaseModel):
    name: str
    permissions: List[str] = []
    rate_limit: int = 1000
    expires_at: Optional[datetime] = None

class APIKeyResponse(BaseModel):
    id: int
    name: str
    key_prefix: str
    permissions: List[str]
    rate_limit: int
    is_active: bool
    last_used: Optional[datetime] = None
    usage_count: int
    expires_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class APIKeyWithSecret(APIKeyResponse):
    api_key: str  # Only returned on creation

# Security Event Schemas
class SecurityEventCreate(BaseModel):
    event_type: SecurityEventTypeEnum
    severity: str = "medium"
    description: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    additional_data: Optional[Dict[str, Any]] = None

class SecurityEvent(BaseModel):
    id: int
    user_id: Optional[int] = None
    event_type: SecurityEventTypeEnum
    severity: str
    description: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    additional_data: Optional[Dict[str, Any]] = None
    resolved: bool
    resolved_by: Optional[int] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Audit Log Schemas
class AuditLogCreate(BaseModel):
    action: AuditActionEnum
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    resource_name: Optional[str] = None
    description: Optional[str] = None
    request_data: Optional[Dict[str, Any]] = None
    response_data: Optional[Dict[str, Any]] = None
    success: bool = True
    error_message: Optional[str] = None
    execution_time_ms: Optional[int] = None

class AuditLog(BaseModel):
    id: int
    user_id: Optional[int] = None
    session_id: Optional[int] = None
    action: AuditActionEnum
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    resource_name: Optional[str] = None
    description: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_data: Optional[Dict[str, Any]] = None
    response_data: Optional[Dict[str, Any]] = None
    success: bool
    error_message: Optional[str] = None
    execution_time_ms: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Security Policy Schemas
class SecurityPolicyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    policy_type: str
    settings: Dict[str, Any]

class SecurityPolicyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class SecurityPolicy(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    policy_type: str
    settings: Dict[str, Any]
    is_active: bool
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Security Dashboard Schemas
class SecurityDashboard(BaseModel):
    active_sessions: int
    failed_logins_24h: int
    security_events_24h: int
    locked_accounts: int
    api_key_usage: int
    two_factor_enabled_users: int
    recent_security_events: List[SecurityEvent]
    login_attempts_chart: List[Dict[str, Any]]
    security_events_by_type: Dict[str, int]

# Account Lockout Schemas
class AccountLockoutCreate(BaseModel):
    user_id: int
    reason: str
    unlock_at: Optional[datetime] = None

class AccountLockout(BaseModel):
    id: int
    user_id: int
    reason: str
    locked_by: Optional[int] = None
    locked_at: datetime
    unlock_at: Optional[datetime] = None
    unlocked_by: Optional[int] = None
    unlocked_at: Optional[datetime] = None
    is_active: bool
    
    class Config:
        from_attributes = True

# Password Policy Schemas
class PasswordPolicy(BaseModel):
    min_length: int = 8
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_numbers: bool = True
    require_special_chars: bool = True
    max_age_days: int = 90
    history_count: int = 5
    lockout_attempts: int = 5
    lockout_duration_minutes: int = 30

# User Security Profile
class UserSecurityProfile(BaseModel):
    user_id: int
    roles: List[Role]
    permissions: List[str]
    two_factor_enabled: bool
    active_sessions: int
    last_login: Optional[datetime] = None
    password_last_changed: Optional[datetime] = None
    account_locked: bool
    failed_login_attempts: int
    api_keys_count: int
    
    class Config:
        from_attributes = True