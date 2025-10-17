"""
Pydantic schemas for request/response validation.

This module exports all Pydantic schemas for API request and response validation.
"""

from aria.schemas.base import BaseSchema, PaginatedResponse
from aria.schemas.user import (
    UserCreate, UserUpdate, UserResponse, UserListResponse,
    LoginRequest, LoginResponse, TokenResponse, RefreshTokenRequest
)
from aria.schemas.document import (
    DocumentCreate, DocumentUpdate, DocumentResponse, DocumentListResponse,
    DocumentUpload, DocumentSearch, DocumentStats
)
from aria.schemas.settings import (
    SystemSettingsResponse, SystemSettingsUpdate,
    SAPConfigurationResponse, SAPConfigurationCreate, SAPConfigurationUpdate,
    DocumentMappingResponse, DocumentMappingCreate, DocumentMappingUpdate,
    ThresholdResponse, ThresholdCreate, ThresholdUpdate
)

__all__ = [
    # Base
    "BaseSchema",
    "PaginatedResponse",
    
    # User
    "UserCreate",
    "UserUpdate", 
    "UserResponse",
    "UserListResponse",
    "LoginRequest",
    "LoginResponse",
    "TokenResponse",
    "RefreshTokenRequest",
    
    # Document
    "DocumentCreate",
    "DocumentUpdate",
    "DocumentResponse",
    "DocumentListResponse",
    "DocumentUpload",
    "DocumentSearch",
    "DocumentStats",
    
    # Settings
    "SystemSettingsResponse",
    "SystemSettingsUpdate",
    "SAPConfigurationResponse",
    "SAPConfigurationCreate",
    "SAPConfigurationUpdate",
    "DocumentMappingResponse",
    "DocumentMappingCreate",
    "DocumentMappingUpdate",
    "ThresholdResponse",
    "ThresholdCreate",
    "ThresholdUpdate",
]