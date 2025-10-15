"""
Enhanced Tag Management Schemas
Pydantic schemas for tag-related API operations
"""
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum


class TagTypeEnum(str, Enum):
    MANUAL = "manual"
    SYSTEM = "system"
    AUTO = "auto"
    CATEGORY = "category"
    METADATA = "metadata"


class TagCategoryEnum(str, Enum):
    GENERAL = "general"
    DOCUMENT_TYPE = "document_type"
    DEPARTMENT = "department"
    PROJECT = "project"
    STATUS = "status"
    PRIORITY = "priority"
    VENDOR = "vendor"
    FINANCIAL = "financial"
    COMPLIANCE = "compliance"
    CUSTOM = "custom"


class TagBase(BaseModel):
    """Base tag schema"""
    name: str = Field(..., min_length=1, max_length=100)
    display_name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: Optional[str] = Field(None, max_length=50)
    tag_type: TagTypeEnum = TagTypeEnum.MANUAL
    category: TagCategoryEnum = TagCategoryEnum.GENERAL
    parent_id: Optional[int] = None
    is_active: bool = True
    is_public: bool = True
    is_auto_taggable: bool = True
    auto_tag_keywords: Optional[List[str]] = None
    auto_tag_patterns: Optional[List[str]] = None
    confidence_threshold: float = Field(0.8, ge=0.0, le=1.0)
    metadata: Optional[Dict[str, Any]] = None


class TagCreate(TagBase):
    """Schema for creating a new tag"""
    pass


class TagUpdate(BaseModel):
    """Schema for updating a tag"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    display_name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: Optional[str] = Field(None, max_length=50)
    tag_type: Optional[TagTypeEnum] = None
    category: Optional[TagCategoryEnum] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None
    is_auto_taggable: Optional[bool] = None
    auto_tag_keywords: Optional[List[str]] = None
    auto_tag_patterns: Optional[List[str]] = None
    confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    metadata: Optional[Dict[str, Any]] = None


class TagResponse(TagBase):
    """Schema for tag response"""
    id: int
    level: int
    path: Optional[str] = None
    usage_count: int = 0
    document_count: int = 0
    last_used: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    
    # Computed properties
    is_leaf: bool = False
    is_root: bool = False
    full_path: str = ""
    
    class Config:
        from_attributes = True


class TagHierarchyResponse(BaseModel):
    """Schema for tag hierarchy response"""
    id: int
    name: str
    display_name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    level: int
    path: str
    usage_count: int
    children: List['TagHierarchyResponse'] = []
    
    class Config:
        from_attributes = True


class TagAnalyticsResponse(BaseModel):
    """Schema for tag analytics response"""
    tag_id: int
    tag_name: str
    date: datetime
    usage_count: int
    document_count: int
    user_count: int
    search_count: int
    click_through_rate: float
    auto_applied_count: int
    auto_confidence_avg: float
    manual_corrections: int
    
    class Config:
        from_attributes = True


class TagSuggestionResponse(BaseModel):
    """Schema for tag suggestion response"""
    id: int
    document_id: int
    tag_id: int
    tag_name: str
    tag_color: Optional[str] = None
    confidence_score: float
    suggestion_source: str
    reasoning: Optional[str] = None
    is_accepted: Optional[bool] = None
    is_rejected: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True


class AutoTagRuleBase(BaseModel):
    """Base auto-tag rule schema"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: bool = True
    rule_type: str = Field(..., pattern=r'^(content|filename|metadata|ml)$')
    conditions: Dict[str, Any] = Field(..., description="Rule conditions as JSON")
    confidence_threshold: float = Field(0.8, ge=0.0, le=1.0)
    tag_ids: List[int] = Field(..., min_items=1)


class AutoTagRuleCreate(AutoTagRuleBase):
    """Schema for creating an auto-tag rule"""
    pass


class AutoTagRuleUpdate(BaseModel):
    """Schema for updating an auto-tag rule"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    rule_type: Optional[str] = Field(None, pattern=r'^(content|filename|metadata|ml)$')
    conditions: Optional[Dict[str, Any]] = None
    confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    tag_ids: Optional[List[int]] = Field(None, min_items=1)


class AutoTagRuleResponse(AutoTagRuleBase):
    """Schema for auto-tag rule response"""
    id: int
    applications_count: int = 0
    success_rate: float = 0.0
    last_applied: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: int
    
    class Config:
        from_attributes = True


class TagTemplateBase(BaseModel):
    """Base tag template schema"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    tag_ids: List[int] = Field(..., min_items=1)
    is_public: bool = False


class TagTemplateCreate(TagTemplateBase):
    """Schema for creating a tag template"""
    pass


class TagTemplateUpdate(BaseModel):
    """Schema for updating a tag template"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    tag_ids: Optional[List[int]] = Field(None, min_items=1)
    is_public: Optional[bool] = None


class TagTemplateResponse(TagTemplateBase):
    """Schema for tag template response"""
    id: int
    usage_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: int
    tags: List[TagResponse] = []
    
    class Config:
        from_attributes = True


class BulkTagOperation(BaseModel):
    """Schema for bulk tag operations"""
    operation: str = Field(..., pattern=r'^(add|remove|replace)$')
    document_ids: List[int] = Field(..., min_items=1)
    tag_ids: List[int] = Field(..., min_items=1)
    confidence: Optional[float] = Field(1.0, ge=0.0, le=1.0)
    applied_by: str = "manual"


class BulkTagOperationResponse(BaseModel):
    """Schema for bulk tag operation response"""
    operation: str
    processed_documents: int
    successful_operations: int
    failed_operations: int
    errors: List[str] = []
    
    class Config:
        from_attributes = True


class TagSearchRequest(BaseModel):
    """Schema for tag search request"""
    query: Optional[str] = None
    category: Optional[TagCategoryEnum] = None
    tag_type: Optional[TagTypeEnum] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None
    min_usage_count: Optional[int] = None
    limit: int = Field(50, ge=1, le=1000)
    offset: int = Field(0, ge=0)
    sort_by: str = Field("name", pattern=r'^(name|usage_count|created_at|last_used)$')
    sort_order: str = Field("asc", pattern=r'^(asc|desc)$')


class TagSearchResponse(BaseModel):
    """Schema for tag search response"""
    tags: List[TagResponse]
    total: int
    limit: int
    offset: int
    
    class Config:
        from_attributes = True


class TagStatistics(BaseModel):
    """Schema for tag statistics"""
    total_tags: int
    active_tags: int
    system_tags: int
    user_tags: int
    auto_tags: int
    categories: Dict[str, int]
    most_used_tags: List[TagResponse]
    recent_tags: List[TagResponse]
    
    class Config:
        from_attributes = True


class DocumentTagRequest(BaseModel):
    """Schema for document tagging request"""
    tag_ids: List[int] = Field(..., min_items=1)
    confidence: Optional[float] = Field(1.0, ge=0.0, le=1.0)
    applied_by: str = "manual"


class DocumentTagResponse(BaseModel):
    """Schema for document tag response"""
    document_id: int
    tag_id: int
    tag_name: str
    tag_color: Optional[str] = None
    confidence: float
    applied_by: str
    applied_at: datetime
    
    class Config:
        from_attributes = True


# Update forward references
TagHierarchyResponse# .model_rebuild()