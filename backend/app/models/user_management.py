from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, JSON, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic user information
    username = Column(String(50), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    display_name = Column(String(200))
    
    # Authentication
    password_hash = Column(String(255), nullable=False)
    password_salt = Column(String(255), nullable=False)
    password_reset_token = Column(String(255), nullable=True, index=True)
    password_reset_expires = Column(DateTime)
    
    # Account status
    is_active = Column(Boolean, default=True, index=True)
    is_verified = Column(Boolean, default=False, index=True)
    is_locked = Column(Boolean, default=False, index=True)
    lock_reason = Column(String(255))
    locked_until = Column(DateTime)
    
    # Profile information
    avatar_url = Column(String(500))
    phone_number = Column(String(20))
    job_title = Column(String(100))
    department = Column(String(100), index=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # Preferences
    timezone = Column(String(50), default='UTC')
    language = Column(String(10), default='en')
    theme = Column(String(20), default='light')
    notification_preferences = Column(JSON, default=dict)
    
    # Security settings
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255))
    backup_codes = Column(JSON, default=list)
    security_questions = Column(JSON, default=list)
    
    # Login tracking
    last_login_at = Column(DateTime)
    last_login_ip = Column(String(45))
    login_count = Column(Integer, default=0)
    failed_login_attempts = Column(Integer, default=0)
    last_failed_login = Column(DateTime)
    
    # API access
    api_key_hash = Column(String(255))
    api_key_created_at = Column(DateTime)
    api_rate_limit = Column(Integer, default=1000)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)
    
    # Relationships
    manager = relationship("User", remote_side=[id], back_populates="subordinates")
    subordinates = relationship("User", back_populates="manager")
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("UserAuditLog", back_populates="user", cascade="all, delete-orphan")

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Role information
    name = Column(String(100), nullable=False, unique=True, index=True)
    display_name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Role properties
    is_system_role = Column(Boolean, default=False, index=True)
    is_active = Column(Boolean, default=True, index=True)
    priority = Column(Integer, default=0, index=True)  # Higher priority = more permissions
    
    # Role metadata
    color = Column(String(7), default='#6B7280')  # Hex color for UI
    icon = Column(String(50))
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    users = relationship("UserRole", back_populates="role")
    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Permission information
    name = Column(String(100), nullable=False, unique=True, index=True)
    display_name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Permission categorization
    category = Column(String(50), nullable=False, index=True)  # documents, users, system, etc.
    resource = Column(String(50), nullable=False, index=True)  # specific resource type
    action = Column(String(50), nullable=False, index=True)    # create, read, update, delete, etc.
    
    # Permission properties
    is_system_permission = Column(Boolean, default=False, index=True)
    is_dangerous = Column(Boolean, default=False, index=True)  # Requires extra confirmation
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    roles = relationship("RolePermission", back_populates="permission")

class UserRole(Base):
    __tablename__ = "user_roles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    
    # Assignment details
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigned_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime)  # Optional expiration
    
    # Assignment metadata
    assignment_reason = Column(Text)
    is_temporary = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="roles")
    role = relationship("Role", back_populates="users")
    assigner = relationship("User", foreign_keys=[assigned_by])

class RolePermission(Base):
    __tablename__ = "role_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=False, index=True)
    
    # Permission grant details
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    granted_at = Column(DateTime, default=func.now())
    
    # Relationships
    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="roles")
    granter = relationship("User")

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Session information
    session_token = Column(String(255), nullable=False, unique=True, index=True)
    refresh_token = Column(String(255), nullable=True, unique=True, index=True)
    
    # Session details
    ip_address = Column(String(45), nullable=False, index=True)
    user_agent = Column(Text)
    device_info = Column(JSON, default=dict)
    location_info = Column(JSON, default=dict)
    
    # Session status
    is_active = Column(Boolean, default=True, index=True)
    is_mobile = Column(Boolean, default=False)
    
    # Session lifecycle
    created_at = Column(DateTime, default=func.now())
    last_activity = Column(DateTime, default=func.now())
    expires_at = Column(DateTime, nullable=False, index=True)
    terminated_at = Column(DateTime)
    termination_reason = Column(String(100))
    
    # Relationships
    user = relationship("User", back_populates="sessions")

class UserAuditLog(Base):
    __tablename__ = "user_audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # Audit information
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False, index=True)
    resource_id = Column(String(100), nullable=True, index=True)
    
    # Action details
    description = Column(Text, nullable=False)
    old_values = Column(JSON, default=dict)
    new_values = Column(JSON, default=dict)
    
    # Request context
    ip_address = Column(String(45), nullable=True, index=True)
    user_agent = Column(Text)
    session_id = Column(String(255), nullable=True, index=True)
    
    # Result information
    success = Column(Boolean, nullable=False, index=True)
    error_message = Column(Text)
    
    # Additional metadata
    metadata = Column(JSON, default=dict)
    severity = Column(String(20), default='info', index=True)  # info, warning, error, critical
    
    # Timestamp
    created_at = Column(DateTime, default=func.now(), index=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")

class UserGroup(Base):
    __tablename__ = "user_groups"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Group information
    name = Column(String(100), nullable=False, unique=True, index=True)
    display_name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Group properties
    group_type = Column(String(50), default='custom', index=True)  # department, project, custom
    is_active = Column(Boolean, default=True, index=True)
    
    # Group settings
    auto_join_rules = Column(JSON, default=dict)  # Rules for automatic membership
    max_members = Column(Integer)
    
    # Group metadata
    color = Column(String(7), default='#6B7280')
    icon = Column(String(50))
    
    # Timestamps
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    creator = relationship("User")
    members = relationship("UserGroupMember", back_populates="group", cascade="all, delete-orphan")

class UserGroupMember(Base):
    __tablename__ = "user_group_members"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    group_id = Column(Integer, ForeignKey("user_groups.id"), nullable=False, index=True)
    
    # Membership details
    role_in_group = Column(String(50), default='member', index=True)  # admin, moderator, member
    added_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    added_at = Column(DateTime, default=func.now())
    
    # Membership status
    is_active = Column(Boolean, default=True, index=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    group = relationship("UserGroup", back_populates="members")
    adder = relationship("User", foreign_keys=[added_by])

class UserPreference(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Preference details
    category = Column(String(50), nullable=False, index=True)  # ui, notifications, security, etc.
    key = Column(String(100), nullable=False, index=True)
    value = Column(Text, nullable=False)
    value_type = Column(String(20), default='string')  # string, number, boolean, json
    
    # Preference metadata
    is_system_preference = Column(Boolean, default=False)
    is_encrypted = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User")

class UserNotification(Base):
    __tablename__ = "user_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Notification content
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False, index=True)
    
    # Notification properties
    priority = Column(String(20), default='normal', index=True)  # low, normal, high, urgent
    category = Column(String(50), nullable=False, index=True)
    
    # Notification status
    is_read = Column(Boolean, default=False, index=True)
    is_dismissed = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime)
    
    # Notification data
    data = Column(JSON, default=dict)  # Additional notification data
    action_url = Column(String(500))  # URL for notification action
    
    # Delivery tracking
    delivery_methods = Column(JSON, default=list)  # email, sms, push, in_app
    delivered_at = Column(JSON, default=dict)  # Delivery timestamps per method
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), index=True)
    expires_at = Column(DateTime)
    
    # Relationships
    user = relationship("User")

class UserActivity(Base):
    __tablename__ = "user_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Activity information
    activity_type = Column(String(50), nullable=False, index=True)
    activity_name = Column(String(100), nullable=False)
    description = Column(Text)
    
    # Activity context
    resource_type = Column(String(50), nullable=True, index=True)
    resource_id = Column(String(100), nullable=True, index=True)
    
    # Activity metadata
    metadata = Column(JSON, default=dict)
    duration = Column(Float)  # Activity duration in seconds
    
    # Request context
    ip_address = Column(String(45), nullable=True, index=True)
    user_agent = Column(Text)
    session_id = Column(String(255), nullable=True, index=True)
    
    # Timestamp
    created_at = Column(DateTime, default=func.now(), index=True)
    
    # Relationships
    user = relationship("User")