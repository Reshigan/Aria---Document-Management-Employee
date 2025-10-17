"""
Base Pydantic schemas and common response models.

This module provides base schemas and common response patterns
used throughout the API.
"""

from datetime import datetime
from typing import Any, Dict, Generic, List, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer

# Type variable for generic responses
T = TypeVar("T")


class BaseSchema(BaseModel):
    """
    Base Pydantic schema with common configuration.
    
    All schemas inherit from this to get consistent configuration
    and common functionality.
    """
    
    model_config = ConfigDict(
        # Allow population by field name or alias
        populate_by_name=True,
        # Validate assignment to fields
        validate_assignment=True,
        # Use enum values instead of names
        use_enum_values=True,
        # Allow extra fields to be ignored
        extra="ignore",
        # Enable ORM mode for SQLAlchemy models
        from_attributes=True,
    )


class TimestampMixin(BaseSchema):
    """Mixin for models with timestamp fields."""
    
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, value: datetime) -> str:
        """Serialize datetime to ISO format."""
        return value.isoformat() if value else None


class IDMixin(BaseSchema):
    """Mixin for models with ID field."""
    
    id: UUID = Field(..., description="Unique identifier")


class PaginationParams(BaseSchema):
    """Pagination parameters for list endpoints."""
    
    page: int = Field(1, ge=1, description="Page number (1-based)")
    size: int = Field(20, ge=1, le=100, description="Items per page")
    
    @property
    def offset(self) -> int:
        """Calculate offset for database queries."""
        return (self.page - 1) * self.size


class SortParams(BaseSchema):
    """Sorting parameters for list endpoints."""
    
    sort_by: Optional[str] = Field(None, description="Field to sort by")
    sort_order: str = Field("asc", pattern="^(asc|desc)$", description="Sort order")


class PaginatedResponse(BaseSchema, Generic[T]):
    """
    Generic paginated response model.
    
    Used for all list endpoints that support pagination.
    """
    
    items: List[T] = Field(..., description="List of items")
    total: int = Field(..., ge=0, description="Total number of items")
    page: int = Field(..., ge=1, description="Current page number")
    size: int = Field(..., ge=1, description="Items per page")
    pages: int = Field(..., ge=0, description="Total number of pages")
    
    @classmethod
    def create(
        cls,
        items: List[T],
        total: int,
        page: int,
        size: int,
    ) -> "PaginatedResponse[T]":
        """
        Create a paginated response.
        
        Args:
            items: List of items for current page
            total: Total number of items
            page: Current page number
            size: Items per page
            
        Returns:
            PaginatedResponse instance
        """
        pages = (total + size - 1) // size if total > 0 else 0
        
        return cls(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages,
        )


class ErrorResponse(BaseSchema):
    """Standard error response model."""
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")
    
    @field_serializer('timestamp')
    def serialize_timestamp(self, value: datetime) -> str:
        """Serialize timestamp to ISO format."""
        return value.isoformat() if value else None


class SuccessResponse(BaseSchema):
    """Standard success response model."""
    
    success: bool = Field(True, description="Success indicator")
    message: str = Field(..., description="Success message")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional data")


class HealthResponse(BaseSchema):
    """Health check response model."""
    
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="Application version")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Check timestamp")
    checks: Dict[str, str] = Field(default_factory=dict, description="Individual health checks")
    
    @field_serializer('timestamp')
    def serialize_timestamp(self, value: datetime) -> str:
        """Serialize timestamp to ISO format."""
        return value.isoformat() if value else None


class MetricsResponse(BaseSchema):
    """Metrics response model."""
    
    metrics: Dict[str, Any] = Field(..., description="System metrics")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Metrics timestamp")
    
    @field_serializer('timestamp')
    def serialize_timestamp(self, value: datetime) -> str:
        """Serialize timestamp to ISO format."""
        return value.isoformat() if value else None


class BulkOperationResponse(BaseSchema):
    """Response for bulk operations."""
    
    total: int = Field(..., ge=0, description="Total items processed")
    successful: int = Field(..., ge=0, description="Successfully processed items")
    failed: int = Field(..., ge=0, description="Failed items")
    errors: List[str] = Field(default_factory=list, description="Error messages")


class FileUploadResponse(BaseSchema):
    """Response for file upload operations."""
    
    filename: str = Field(..., description="Uploaded filename")
    file_size: int = Field(..., ge=0, description="File size in bytes")
    mime_type: str = Field(..., description="File MIME type")
    file_path: str = Field(..., description="File storage path")
    upload_id: UUID = Field(..., description="Upload identifier")