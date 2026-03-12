"""
Module Management Models
Defines system modules and user module assignments
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import BaseModel
from datetime import datetime
import enum


class ModuleCategory(enum.Enum):
    """Module categories"""
    FINANCIAL = "financial"
    HR = "hr"
    OPERATIONS = "operations"
    SALES = "sales"
    PROCUREMENT = "procurement"
    MANUFACTURING = "manufacturing"
    QUALITY = "quality"
    MAINTENANCE = "maintenance"
    WAREHOUSE = "warehouse"
    ANALYTICS = "analytics"
    ADMINISTRATION = "administration"


class ModuleStatus(enum.Enum):
    """Module status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    BETA = "beta"
    DEPRECATED = "deprecated"


class Module(BaseModel):
    """System modules that can be assigned to users"""
    __tablename__ = "modules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    description = Column(Text)
    category = Column(SQLEnum(ModuleCategory), nullable=False)
    status = Column(SQLEnum(ModuleStatus), default=ModuleStatus.ACTIVE)
    icon = Column(String(50))  # Icon identifier
    route_path = Column(String(200))  # Frontend route path
    api_endpoint = Column(String(200))  # Backend API endpoint
    
    # Module configuration
    requires_approval = Column(Boolean, default=False)
    approval_limit = Column(Integer)  # Amount limit for approvals if applicable
    permissions = Column(JSON)  # List of default permissions for this module
    features = Column(JSON)  # List of features in this module
    dependencies = Column(JSON)  # List of module IDs this module depends on
    
    # Licensing
    requires_license = Column(Boolean, default=False)
    license_level = Column(String(50))  # basic, professional, enterprise
    max_users = Column(Integer)  # Maximum users that can have this module
    
    # Metadata
    version = Column(String(20))
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user_modules = relationship("UserModule", back_populates="module")
    created_by_user = relationship("User", foreign_keys=[created_by])


class UserModule(BaseModel):
    """User module assignments - which modules each user has access to"""
    __tablename__ = "user_modules"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False, index=True)
    
    # Assignment details
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))  # Optional expiration
    
    # Status
    is_active = Column(Boolean, default=True)
    activated_at = Column(DateTime(timezone=True))
    deactivated_at = Column(DateTime(timezone=True))
    deactivated_by = Column(Integer, ForeignKey("users.id"))
    deactivation_reason = Column(Text)
    
    # Permissions and limits for this user in this module
    custom_permissions = Column(JSON)  # Override default module permissions
    approval_limit = Column(Integer)  # User-specific approval limit
    access_level = Column(String(50))  # read_only, standard, advanced, admin
    
    # Usage tracking
    last_accessed = Column(DateTime(timezone=True))
    access_count = Column(Integer, default=0)
    
    # Metadata
    notes = Column(Text)  # Admin notes about this assignment
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="user_modules")
    module = relationship("Module", back_populates="user_modules")
    assigned_by_user = relationship("User", foreign_keys=[assigned_by])
    deactivated_by_user = relationship("User", foreign_keys=[deactivated_by])


class ModuleAccessLog(BaseModel):
    """Log of module access by users"""
    __tablename__ = "module_access_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    user_module_id = Column(Integer, ForeignKey("user_modules.id"))
    
    # Access details
    action = Column(String(50))  # accessed, feature_used, etc.
    feature_name = Column(String(100))  # Specific feature accessed
    session_id = Column(Integer, ForeignKey("user_sessions.id"))
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    # Performance
    response_time_ms = Column(Integer)
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    
    # Metadata
    accessed_at = Column(DateTime(timezone=True), server_default=func.now())
    request_data = Column(JSON)
    response_data = Column(JSON)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    module = relationship("Module", foreign_keys=[module_id])
    user_module = relationship("UserModule", foreign_keys=[user_module_id])


class ModuleLicense(BaseModel):
    """Module licensing and usage limits"""
    __tablename__ = "module_licenses"
    
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    
    # License details
    license_key = Column(String(255), unique=True, nullable=False)
    license_type = Column(String(50))  # trial, subscription, perpetual
    max_users = Column(Integer)
    current_users = Column(Integer, default=0)
    
    # Validity
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    
    # Organization
    organization_name = Column(String(200))
    organization_id = Column(String(100))
    
    # Metadata
    metadata = Column(JSON)
    
    # Relationships
    module = relationship("Module", foreign_keys=[module_id])


# Add relationships to User model
from .user import User
User.user_modules = relationship("UserModule", foreign_keys="UserModule.user_id", back_populates="user")
