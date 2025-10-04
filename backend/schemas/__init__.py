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
    DocumentUploadResponse,
    ExtractedDataResponse,
    DocumentApprovalRequest,
    DocumentSearchRequest
)

__all__ = [
    # User schemas
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserInDB",
    "LoginRequest",
    "TokenResponse",
    "TokenRefreshRequest",
    "PasswordChangeRequest",
    "PasswordResetRequest",
    "PasswordResetConfirm",
    "RoleResponse",
    "PermissionResponse",
    # Document schemas
    "DocumentCreate",
    "DocumentUpdate",
    "DocumentResponse",
    "DocumentListResponse",
    "DocumentUploadResponse",
    "ExtractedDataResponse",
    "DocumentApprovalRequest",
    "DocumentSearchRequest",
]
