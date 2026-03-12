"""
Module Management Schemas
Pydantic schemas for module assignment and management
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ModuleCategoryEnum(str, Enum):
    """Module category enumeration"""
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


class ModuleStatusEnum(str, Enum):
    """Module status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    BETA = "beta"
    DEPRECATED = "deprecated"


class AccessLevelEnum(str, Enum):
    """Module access level enumeration"""
    READ_ONLY = "read_only"
    STANDARD = "standard"
    ADVANCED = "advanced"
    ADMIN = "admin"


# Module Schemas
class ModuleBase(BaseModel):
    """Base module schema"""
    name: str = Field(..., min_length=1, max_length=100)
    display_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    category: ModuleCategoryEnum
    icon: Optional[str] = None
    route_path: Optional[str] = None
    api_endpoint: Optional[str] = None


class ModuleCreate(ModuleBase):
    """Schema for creating a new module"""
    status: Optional[ModuleStatusEnum] = ModuleStatusEnum.ACTIVE
    requires_approval: bool = False
    approval_limit: Optional[int] = None
    permissions: Optional[List[str]] = []
    features: Optional[List[str]] = []
    dependencies: Optional[List[int]] = []
    requires_license: bool = False
    license_level: Optional[str] = None
    max_users: Optional[int] = None
    version: Optional[str] = "1.0.0"


class ModuleUpdate(BaseModel):
    """Schema for updating module information"""
    display_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[ModuleCategoryEnum] = None
    status: Optional[ModuleStatusEnum] = None
    icon: Optional[str] = None
    route_path: Optional[str] = None
    api_endpoint: Optional[str] = None
    requires_approval: Optional[bool] = None
    approval_limit: Optional[int] = None
    permissions: Optional[List[str]] = None
    features: Optional[List[str]] = None
    dependencies: Optional[List[int]] = None


class ModuleResponse(ModuleBase):
    """Module response schema"""
    id: int
    status: ModuleStatusEnum
    requires_approval: bool
    approval_limit: Optional[int]
    permissions: Optional[List[str]]
    features: Optional[List[str]]
    dependencies: Optional[List[int]]
    requires_license: bool
    license_level: Optional[str]
    max_users: Optional[int]
    version: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ModuleListResponse(BaseModel):
    """Response schema for module list"""
    modules: List[ModuleResponse]
    total: int
    page: int = 1
    page_size: int = 50


# User Module Assignment Schemas
class UserModuleAssign(BaseModel):
    """Schema for assigning module to user"""
    user_id: int = Field(..., description="ID of the user to assign module to")
    module_id: int = Field(..., description="ID of the module to assign")
    access_level: AccessLevelEnum = AccessLevelEnum.STANDARD
    custom_permissions: Optional[List[str]] = []
    approval_limit: Optional[int] = Field(None, description="User-specific approval limit")
    expires_at: Optional[datetime] = Field(None, description="Optional expiration date")
    notes: Optional[str] = Field(None, description="Admin notes about assignment")


class UserModuleAssignBulk(BaseModel):
    """Schema for bulk module assignment"""
    user_ids: List[int] = Field(..., description="List of user IDs")
    module_ids: List[int] = Field(..., description="List of module IDs to assign")
    access_level: AccessLevelEnum = AccessLevelEnum.STANDARD
    notes: Optional[str] = None


class UserModuleUpdate(BaseModel):
    """Schema for updating user module assignment"""
    is_active: Optional[bool] = None
    access_level: Optional[AccessLevelEnum] = None
    custom_permissions: Optional[List[str]] = None
    approval_limit: Optional[int] = None
    expires_at: Optional[datetime] = None
    notes: Optional[str] = None


class UserModuleDeactivate(BaseModel):
    """Schema for deactivating user module"""
    reason: str = Field(..., min_length=1, description="Reason for deactivation")


class UserModuleResponse(BaseModel):
    """User module assignment response"""
    id: int
    user_id: int
    module_id: int
    module_name: str
    module_display_name: str
    module_category: str
    is_active: bool
    access_level: str
    custom_permissions: Optional[List[str]]
    approval_limit: Optional[int]
    assigned_by: int
    assigned_at: datetime
    expires_at: Optional[datetime]
    last_accessed: Optional[datetime]
    access_count: int
    notes: Optional[str]
    
    class Config:
        from_attributes = True


class UserModuleListResponse(BaseModel):
    """Response schema for user module list"""
    user_modules: List[UserModuleResponse]
    total: int


class UserModulesInfo(BaseModel):
    """Detailed user modules information"""
    user_id: int
    user_email: str
    user_name: str
    active_modules: List[ModuleResponse]
    inactive_modules: List[ModuleResponse]
    total_modules: int
    active_count: int
    inactive_count: int


# Module Access Logging
class ModuleAccessCreate(BaseModel):
    """Schema for logging module access"""
    module_id: int
    action: str
    feature_name: Optional[str] = None
    request_data: Optional[Dict[str, Any]] = None


class ModuleAccessResponse(BaseModel):
    """Module access log response"""
    id: int
    user_id: int
    module_id: int
    module_name: str
    action: str
    feature_name: Optional[str]
    success: bool
    response_time_ms: Optional[int]
    accessed_at: datetime
    
    class Config:
        from_attributes = True


class ModuleAccessStats(BaseModel):
    """Module access statistics"""
    module_id: int
    module_name: str
    total_accesses: int
    unique_users: int
    average_response_time_ms: float
    success_rate: float
    most_used_features: List[Dict[str, Any]]


class UserModuleAccessHistory(BaseModel):
    """User's module access history"""
    user_id: int
    module_id: int
    module_name: str
    total_accesses: int
    last_accessed: Optional[datetime]
    favorite_features: List[str]
    average_session_duration: Optional[float]


# Module Statistics & Analytics
class ModuleUsageStats(BaseModel):
    """Module usage statistics"""
    module_id: int
    module_name: str
    total_assigned_users: int
    active_users: int
    inactive_users: int
    total_accesses: int
    average_accesses_per_user: float
    most_active_users: List[Dict[str, Any]]


class SystemModuleOverview(BaseModel):
    """System-wide module overview"""
    total_modules: int
    active_modules: int
    inactive_modules: int
    total_assignments: int
    active_assignments: int
    most_popular_modules: List[Dict[str, Any]]
    least_used_modules: List[Dict[str, Any]]
    module_categories_distribution: Dict[str, int]
