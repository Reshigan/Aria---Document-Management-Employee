from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import BaseModel
import enum
from datetime import datetime, timedelta
import secrets
import hashlib

class UserRole(enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    VIEWER = "viewer"

class PermissionType(enum.Enum):
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"
    EXECUTE = "execute"

class SessionStatus(enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"

class AuditAction(enum.Enum):
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

class SecurityEventType(enum.Enum):
    FAILED_LOGIN = "failed_login"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    PASSWORD_CHANGE = "password_change"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    TWO_FACTOR_ENABLED = "two_factor_enabled"
    TWO_FACTOR_DISABLED = "two_factor_disabled"

class Permission(BaseModel):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text)
    resource_type = Column(String(50), nullable=False)  # document, folder, workflow, etc.
    permission_type = Column(Enum(PermissionType), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission")

class Role(BaseModel):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text)
    is_system_role = Column(Boolean, default=False)  # Cannot be deleted
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user_roles = relationship("UserRole", back_populates="role")
    role_permissions = relationship("RolePermission", back_populates="role")

class RolePermission(BaseModel):
    __tablename__ = "role_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=False)
    granted_by = Column(Integer, ForeignKey("users.id"))
    granted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")

class UserRole(BaseModel):
    __tablename__ = "user_roles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"))
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))  # Optional expiration
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="user_roles")
    role = relationship("Role", back_populates="user_roles")
    assigned_by_user = relationship("User", foreign_keys=[assigned_by])

class UserSession(BaseModel):
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    refresh_token = Column(String(255), unique=True, nullable=False, index=True)
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)
    device_info = Column(JSON)
    location = Column(JSON)  # Country, city, etc.
    status = Column(Enum(SessionStatus), default=SessionStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True))
    revoked_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="sessions")
    revoked_by_user = relationship("User", foreign_keys=[revoked_by])
    
    def is_valid(self):
        return (
            self.status == SessionStatus.ACTIVE and
            self.expires_at > datetime.utcnow()
        )
    
    def generate_tokens(self):
        self.session_token = secrets.token_urlsafe(32)
        self.refresh_token = secrets.token_urlsafe(32)
        self.expires_at = datetime.utcnow() + timedelta(hours=24)

class PasswordHistory(BaseModel):
    __tablename__ = "password_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="password_history")

class TwoFactorAuth(BaseModel):
    __tablename__ = "two_factor_auth"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    secret_key = Column(String(255), nullable=False)
    backup_codes = Column(JSON)  # List of backup codes
    is_enabled = Column(Boolean, default=False)
    enabled_at = Column(DateTime(timezone=True))
    last_used = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="two_factor_auth")

class SecurityEvent(BaseModel):
    __tablename__ = "security_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    event_type = Column(Enum(SecurityEventType), nullable=False)
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    description = Column(Text, nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    additional_data = Column(JSON)
    resolved = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey("users.id"))
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    resolved_by_user = relationship("User", foreign_keys=[resolved_by])

class AuditLog(BaseModel):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(Integer, ForeignKey("user_sessions.id"))
    action = Column(Enum(AuditAction), nullable=False)
    resource_type = Column(String(50))  # document, folder, user, etc.
    resource_id = Column(Integer)
    resource_name = Column(String(255))
    description = Column(Text)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    request_data = Column(JSON)
    response_data = Column(JSON)
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    execution_time_ms = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    session = relationship("UserSession", foreign_keys=[session_id])

class APIKey(BaseModel):
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    key_hash = Column(String(255), unique=True, nullable=False, index=True)
    key_prefix = Column(String(10), nullable=False)  # First few chars for identification
    permissions = Column(JSON)  # List of allowed permissions
    rate_limit = Column(Integer, default=1000)  # Requests per hour
    is_active = Column(Boolean, default=True)
    last_used = Column(DateTime(timezone=True))
    usage_count = Column(Integer, default=0)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="api_keys")
    
    def generate_key(self):
        key = f"aria_{secrets.token_urlsafe(32)}"
        self.key_prefix = key[:10]
        self.key_hash = hashlib.sha256(key.encode()).hexdigest()
        return key

class LoginAttempt(BaseModel):
    __tablename__ = "login_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    ip_address = Column(String(45), nullable=False, index=True)
    user_agent = Column(Text)
    success = Column(Boolean, nullable=False)
    failure_reason = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AccountLockout(BaseModel):
    __tablename__ = "account_lockouts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(String(100), nullable=False)
    locked_by = Column(Integer, ForeignKey("users.id"))
    locked_at = Column(DateTime(timezone=True), server_default=func.now())
    unlock_at = Column(DateTime(timezone=True))
    unlocked_by = Column(Integer, ForeignKey("users.id"))
    unlocked_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    locked_by_user = relationship("User", foreign_keys=[locked_by])
    unlocked_by_user = relationship("User", foreign_keys=[unlocked_by])

class SecurityPolicy(BaseModel):
    __tablename__ = "security_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    policy_type = Column(String(50), nullable=False)  # password, session, api, etc.
    settings = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    created_by_user = relationship("User", foreign_keys=[created_by])

# Update User model to include security relationships
from models.user import User

# Add relationships to User model
User.user_roles = relationship("UserRole", foreign_keys="UserRole.user_id", back_populates="user")
User.sessions = relationship("UserSession", foreign_keys="UserSession.user_id", back_populates="user")
User.password_history = relationship("PasswordHistory", back_populates="user")
User.two_factor_auth = relationship("TwoFactorAuth", back_populates="user", uselist=False)
User.api_keys = relationship("APIKey", back_populates="user")