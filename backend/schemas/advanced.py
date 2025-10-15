"""
Advanced Pydantic schemas for API requests and responses
"""
from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


# Enums for API schemas
class ShareLinkTypeSchema(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    PASSWORD_PROTECTED = "password_protected"


class NotificationTypeSchema(str, Enum):
    DOCUMENT_UPLOADED = "document_uploaded"
    DOCUMENT_PROCESSED = "document_processed"
    DOCUMENT_APPROVED = "document_approved"
    DOCUMENT_REJECTED = "document_rejected"
    DOCUMENT_SHARED = "document_shared"
    COMMENT_ADDED = "comment_added"
    WORKFLOW_ASSIGNED = "workflow_assigned"
    WORKFLOW_COMPLETED = "workflow_completed"
    SYSTEM_ALERT = "system_alert"


class WorkflowStatusSchema(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class WorkflowStepTypeSchema(str, Enum):
    APPROVAL = "approval"
    REVIEW = "review"
    NOTIFICATION = "notification"
    AUTOMATION = "automation"
    CONDITION = "condition"


class WorkflowStepStatusSchema(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    REJECTED = "rejected"


# Base schemas
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# Folder schemas
class FolderBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')


class FolderCreate(FolderBase):
    is_public: bool = False


class FolderUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')


class FolderResponse(FolderBase):
    id: int
    path: str
    is_system: bool
    created_at: datetime
    updated_at: datetime
    created_by: int
    children_count: Optional[int] = 0
    documents_count: Optional[int] = 0


class FolderTree(FolderResponse):
    children: List['FolderTree'] = []


class FolderListResponse(BaseSchema):
    folders: List[FolderResponse]
    total: int
    page: int
    per_page: int


class FolderTreeResponse(BaseSchema):
    tree: List[FolderTree]


class FolderPermissionResponse(BaseSchema):
    id: int
    folder_id: int
    user_id: int
    permission_type: str
    granted_by: int
    granted_at: datetime


# Tag schemas
class TagBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')


class TagCreate(TagBase):
    pass


class TagUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')


class TagResponse(TagBase):
    id: int
    is_system: bool
    usage_count: int
    created_at: datetime
    created_by: Optional[int] = None


class TagListResponse(BaseSchema):
    tags: List[TagResponse]
    total: int
    page: int
    per_page: int


class TagWithCountResponse(TagResponse):
    document_count: int


class DocumentTagResponse(BaseSchema):
    document_id: int
    tag_id: int
    tagged_at: datetime
    tagged_by: int


# Document Version Simple schemas
class DocumentVersionSimpleBase(BaseSchema):
    version_notes: Optional[str] = None


class DocumentVersionSimpleCreate(DocumentVersionSimpleBase):
    pass


class DocumentVersionSimpleResponse(DocumentVersionSimpleBase):
    id: int
    document_id: int
    version_number: int
    filename: str
    file_size: int
    file_hash: str
    mime_type: str
    is_current: bool
    created_at: datetime
    created_by: int


# Share Link schemas
class ShareLinkBase(BaseSchema):
    link_type: ShareLinkTypeSchema = ShareLinkTypeSchema.PRIVATE
    expires_at: Optional[datetime] = None
    max_downloads: Optional[int] = None
    can_download: bool = True
    can_view: bool = True
    can_comment: bool = False


class ShareLinkCreate(ShareLinkBase):
    document_id: int
    password: Optional[str] = None


class ShareLinkCreateRequest(ShareLinkBase):
    """Schema for creating share links via API (document_id comes from path)"""
    password: Optional[str] = None


class ShareLinkUpdate(BaseSchema):
    expires_at: Optional[datetime] = None
    max_downloads: Optional[int] = None
    is_active: Optional[bool] = None
    can_download: Optional[bool] = None
    can_view: Optional[bool] = None
    can_comment: Optional[bool] = None


class ShareLinkResponse(ShareLinkBase):
    id: int
    document_id: int
    token: str
    download_count: int
    is_active: bool
    created_at: datetime
    created_by: int


# Document Share schemas
class DocumentShareBase(BaseSchema):
    permission: str = Field(..., pattern=r'^(read|write|admin)$')


class DocumentShareCreate(DocumentShareBase):
    document_id: int
    user_id: int


class DocumentShareResponse(DocumentShareBase):
    id: int
    document_id: int
    user_id: int
    shared_at: datetime
    shared_by: int


# Comment schemas
class CommentBase(BaseSchema):
    content: str = Field(..., min_length=1)
    page_number: Optional[int] = None
    x_position: Optional[int] = None
    y_position: Optional[int] = None


class CommentCreate(CommentBase):
    document_id: int
    parent_id: Optional[int] = None


class CommentUpdate(BaseSchema):
    content: Optional[str] = Field(None, min_length=1)
    is_resolved: Optional[bool] = None


class CommentResponse(CommentBase):
    id: int
    document_id: int
    parent_id: Optional[int] = None
    is_resolved: bool
    created_at: datetime
    updated_at: datetime
    author: int
    author_name: Optional[str] = None
    replies: List['CommentResponse'] = []


# Notification schemas
class NotificationBase(BaseSchema):
    type: NotificationTypeSchema
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)


class NotificationCreate(NotificationBase):
    user_id: int
    document_id: Optional[int] = None
    comment_id: Optional[int] = None
    workflow_id: Optional[int] = None


class NotificationUpdate(BaseSchema):
    is_read: Optional[bool] = None


class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    document_id: Optional[int] = None
    comment_id: Optional[int] = None
    workflow_id: Optional[int] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class NotificationListResponse(BaseSchema):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int
    page: int
    per_page: int


class NotificationPreferencesResponse(BaseSchema):
    user_id: int
    email_notifications: bool
    push_notifications: bool
    document_updates: bool
    workflow_updates: bool
    comment_notifications: bool
    system_notifications: bool


class NotificationPreferencesUpdate(BaseSchema):
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    document_updates: Optional[bool] = None
    workflow_updates: Optional[bool] = None
    comment_notifications: Optional[bool] = None
    system_notifications: Optional[bool] = None


# Workflow schemas
class WorkflowStepTemplateBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    step_type: WorkflowStepTypeSchema
    order: int = Field(..., ge=1)
    default_assigned_role: Optional[str] = None
    is_required: bool = True
    auto_complete: bool = False
    timeout_hours: Optional[int] = Field(None, gt=0)
    conditions: Optional[Dict[str, Any]] = None


class WorkflowStepTemplateCreate(WorkflowStepTemplateBase):
    pass


class WorkflowStepTemplateResponse(WorkflowStepTemplateBase):
    id: int
    template_id: int


class WorkflowTemplateBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    is_active: bool = True
    is_default: bool = False
    auto_trigger_conditions: Optional[Dict[str, Any]] = None


class WorkflowTemplateCreate(WorkflowTemplateBase):
    step_templates: List[WorkflowStepTemplateCreate] = []


class WorkflowTemplateUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    auto_trigger_conditions: Optional[Dict[str, Any]] = None


class WorkflowTemplateResponse(WorkflowTemplateBase):
    id: int
    created_at: datetime
    created_by: int
    step_templates: List[WorkflowStepTemplateResponse] = []


class WorkflowStepBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    step_type: WorkflowStepTypeSchema
    order: int = Field(..., ge=1)
    assigned_to: Optional[int] = None
    assigned_role: Optional[str] = None
    due_date: Optional[datetime] = None
    is_required: bool = True
    auto_complete: bool = False
    timeout_hours: Optional[int] = Field(None, gt=0)


class WorkflowStepCreate(WorkflowStepBase):
    pass


class WorkflowStepUpdate(BaseSchema):
    assigned_to: Optional[int] = None
    assigned_role: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[WorkflowStepStatusSchema] = None
    comments: Optional[str] = None
    result_data: Optional[Dict[str, Any]] = None


class WorkflowStepResponse(WorkflowStepBase):
    id: int
    workflow_id: int
    template_step_id: Optional[int] = None
    status: WorkflowStepStatusSchema
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result_data: Optional[Dict[str, Any]] = None
    comments: Optional[str] = None
    assignee_name: Optional[str] = None


class WorkflowBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    auto_start: bool = False
    parallel_execution: bool = False


class WorkflowCreate(WorkflowBase):
    document_id: int
    template_id: Optional[int] = None
    steps: List[WorkflowStepCreate] = []


class WorkflowUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[WorkflowStatusSchema] = None
    due_date: Optional[datetime] = None


class WorkflowResponse(WorkflowBase):
    id: int
    document_id: int
    template_id: Optional[int] = None
    status: WorkflowStatusSchema
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    created_by: int
    steps: List[WorkflowStepResponse] = []


# Activity Log schemas
class ActivityLogResponse(BaseSchema):
    id: int
    user_id: Optional[int] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    user_name: Optional[str] = None


# User Session schemas
class UserSessionResponse(BaseSchema):
    id: int
    user_id: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = None
    is_active: bool
    expires_at: datetime
    last_activity: datetime
    created_at: datetime


# API Key schemas
class APIKeyBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    permissions: Optional[List[str]] = None
    rate_limit: int = Field(1000, gt=0)
    expires_at: Optional[datetime] = None


class APIKeyCreate(APIKeyBase):
    pass


class APIKeyUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    permissions: Optional[List[str]] = None
    rate_limit: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None


class APIKeyResponse(APIKeyBase):
    id: int
    user_id: int
    key_prefix: str
    is_active: bool
    last_used: Optional[datetime] = None
    usage_count: int
    created_at: datetime


class APIKeyCreateResponse(APIKeyResponse):
    api_key: str  # Only returned on creation


# Search schemas
class SearchRequest(BaseSchema):
    query: str = Field(..., min_length=1)
    document_type: Optional[str] = None
    folder_id: Optional[int] = None
    tags: Optional[List[str]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    file_size_min: Optional[int] = None
    file_size_max: Optional[int] = None
    uploaded_by: Optional[int] = None
    status: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    sort_by: Optional[str] = "relevance"
    sort_order: Optional[str] = "desc"


class SearchResult(BaseSchema):
    document_id: int
    title: str
    filename: str
    document_type: str
    status: str
    created_at: datetime
    file_size: int
    relevance_score: float
    highlights: List[str] = []
    folder_path: Optional[str] = None
    tags: List[str] = []


class SearchResponse(BaseSchema):
    results: List[SearchResult]
    total: int
    page: int
    page_size: int
    pages: int
    query: str
    execution_time: float
    facets: Optional[Dict[str, Any]] = None


# Bulk Operations schemas
class BulkOperationRequest(BaseSchema):
    document_ids: List[int] = Field(..., min_items=1)
    operation: str = Field(..., pattern=r'^(delete|move|tag|untag|approve|reject)$')
    parameters: Optional[Dict[str, Any]] = None


class BulkOperationResponse(BaseSchema):
    operation: str
    total_documents: int
    successful: int
    failed: int
    errors: List[Dict[str, Any]] = []
    results: List[Dict[str, Any]] = []


# Analytics schemas
class DocumentAnalytics(BaseSchema):
    total_documents: int
    documents_by_type: Dict[str, int]
    documents_by_status: Dict[str, int]
    documents_by_month: Dict[str, int]
    processing_times: Dict[str, float]
    top_uploaders: List[Dict[str, Union[str, int]]]
    storage_usage: Dict[str, Union[int, float]]


class UserAnalytics(BaseSchema):
    total_users: int
    active_users: int
    users_by_role: Dict[str, int]
    login_activity: Dict[str, int]
    top_active_users: List[Dict[str, Union[str, int]]]


class SystemAnalytics(BaseSchema):
    uptime: float
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    api_requests: Dict[str, int]
    error_rates: Dict[str, float]
    response_times: Dict[str, float]


class AnalyticsResponse(BaseSchema):
    documents: DocumentAnalytics
    users: UserAnalytics
    system: SystemAnalytics
    generated_at: datetime


# Enhanced Document schemas
class DocumentCreateAdvanced(BaseSchema):
    folder_id: Optional[int] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None
    priority: Optional[str] = Field("normal", pattern=r'^(low|normal|high|urgent)$')


class DocumentUpdateAdvanced(BaseSchema):
    folder_id: Optional[int] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None
    priority: Optional[str] = Field(None, pattern=r'^(low|normal|high|urgent)$')
    notes: Optional[str] = None


class DocumentResponseAdvanced(BaseSchema):
    id: int
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    document_type: str
    status: str
    folder_id: Optional[int] = None
    folder_path: Optional[str] = None
    tags: List[TagResponse] = []
    description: Optional[str] = None
    priority: str
    notes: Optional[str] = None
    confidence_score: Optional[float] = None
    processing_duration: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    uploaded_by: int
    uploaded_by_name: Optional[str] = None
    version_count: int = 0
    comment_count: int = 0
    is_favorite: bool = False
    last_viewed: Optional[datetime] = None


# Update forward references
# FolderTree# # .model_rebuild()
CommentResponse# # .model_rebuild()