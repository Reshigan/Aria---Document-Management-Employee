"""
Pydantic schemas package
"""
from .user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserInDB,
    LoginRequest,
    TokenResponse,
    TokenRefreshRequest,
    PasswordChangeRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    RoleResponse,
    PermissionResponse
)
from .document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentListResponse,
    DocumentDetailResponse,
    DocumentShareResponse,
    DocumentShareCreate
)
from .advanced import (
    # Folder schemas
    FolderCreate, FolderUpdate, FolderResponse, FolderTree,
    # Tag schemas
    TagCreate, TagUpdate, TagResponse,
    # Document Version schemas
    DocumentVersionSimpleCreate, DocumentVersionSimpleResponse,
    # Share Link schemas
    ShareLinkCreate, ShareLinkUpdate, ShareLinkResponse,
    # Comment schemas
    CommentCreate, CommentUpdate, CommentResponse,
    # Notification schemas
    NotificationCreate, NotificationUpdate, NotificationResponse,
    # Workflow schemas
    WorkflowCreate, WorkflowUpdate, WorkflowResponse,
    WorkflowTemplateCreate, WorkflowTemplateUpdate, WorkflowTemplateResponse,
    WorkflowStepCreate, WorkflowStepUpdate, WorkflowStepResponse,
    WorkflowStepTemplateCreate, WorkflowStepTemplateResponse,
    # Activity Log schemas
    ActivityLogResponse,
    # User Session schemas
    UserSessionResponse,
    # API Key schemas
    APIKeyCreate, APIKeyUpdate, APIKeyResponse, APIKeyCreateResponse,
    # Search schemas
    SearchRequest, SearchResponse, SearchResult,
    # Bulk Operations schemas
    BulkOperationRequest, BulkOperationResponse,
    # Analytics schemas
    DocumentAnalytics, UserAnalytics, SystemAnalytics, AnalyticsResponse,
    # Enhanced Document schemas
    DocumentCreateAdvanced, DocumentUpdateAdvanced, DocumentResponseAdvanced,
    # Enums
    ShareLinkTypeSchema, NotificationTypeSchema, WorkflowStatusSchema,
    WorkflowStepTypeSchema, WorkflowStepStatusSchema
)
from .version_control import (
    DocumentVersionCreate, DocumentVersionUpdate, DocumentVersionResponse, DocumentVersionListResponse,
    DocumentBranchCreate, DocumentBranchUpdate, DocumentBranchResponse,
    MergeRequestCreate, MergeRequestUpdate, MergeRequestResponse,
    VersionComparisonCreate, VersionComparisonResponse
)

__all__ = [
    # User schemas
    "UserCreate", "UserUpdate", "UserResponse", "UserInDB",
    "LoginRequest", "TokenResponse", "TokenRefreshRequest",
    "PasswordChangeRequest", "PasswordResetRequest", "PasswordResetConfirm",
    "RoleResponse", "PermissionResponse",
    # Document schemas
    "DocumentCreate", "DocumentUpdate", "DocumentResponse",
    "DocumentListResponse", "DocumentDetailResponse",
    "DocumentShareResponse", "DocumentShareCreate",
    # Advanced schemas
    "FolderCreate", "FolderUpdate", "FolderResponse", "FolderTree",
    "FolderListResponse", "FolderTreeResponse", "FolderPermissionResponse",
    "TagCreate", "TagUpdate", "TagResponse",
    "TagListResponse", "TagWithCountResponse", "DocumentTagResponse",
    "DocumentVersionSimpleCreate", "DocumentVersionSimpleResponse",
    "ShareLinkCreate", "ShareLinkUpdate", "ShareLinkResponse",
    "DocumentShareCreate", "DocumentShareResponse",
    "CommentCreate", "CommentUpdate", "CommentResponse",
    "NotificationCreate", "NotificationUpdate", "NotificationResponse",
    "NotificationListResponse", "NotificationPreferencesResponse", "NotificationPreferencesUpdate",
    "WorkflowCreate", "WorkflowUpdate", "WorkflowResponse",
    "WorkflowTemplateCreate", "WorkflowTemplateUpdate", "WorkflowTemplateResponse",
    "WorkflowStepCreate", "WorkflowStepUpdate", "WorkflowStepResponse",
    "WorkflowStepTemplateCreate", "WorkflowStepTemplateResponse",
    "ActivityLogResponse", "UserSessionResponse",
    "APIKeyCreate", "APIKeyUpdate", "APIKeyResponse", "APIKeyCreateResponse",
    "SearchRequest", "SearchResponse", "SearchResult",
    "BulkOperationRequest", "BulkOperationResponse",
    "DocumentAnalytics", "UserAnalytics", "SystemAnalytics", "AnalyticsResponse",
    "DocumentCreateAdvanced", "DocumentUpdateAdvanced", "DocumentResponseAdvanced",
    # Version control schemas
    "DocumentVersionCreate", "DocumentVersionUpdate", "DocumentVersionResponse", "DocumentVersionListResponse",
    "DocumentBranchCreate", "DocumentBranchUpdate", "DocumentBranchResponse",
    "MergeRequestCreate", "MergeRequestUpdate", "MergeRequestResponse",
    "VersionComparisonCreate", "VersionComparisonResponse",
    # Enums
    "ShareLinkTypeSchema", "NotificationTypeSchema", "WorkflowStatusSchema",
    "WorkflowStepTypeSchema", "WorkflowStepStatusSchema"
]
