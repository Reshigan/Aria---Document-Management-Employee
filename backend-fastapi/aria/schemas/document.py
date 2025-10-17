"""
Document-related Pydantic schemas for request/response validation.

This module defines schemas for document management operations,
including upload, processing, and metadata handling.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import Field, validator

from aria.models.document import DocumentStatus, DocumentType
from aria.schemas.base import BaseSchema, IDMixin, PaginatedResponse, TimestampMixin


class DocumentTagBase(BaseSchema):
    """Base document tag schema."""
    
    name: str = Field(..., min_length=1, max_length=50, description="Tag name")
    description: Optional[str] = Field(None, max_length=500, description="Tag description")
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$", description="Hex color code")
    is_active: bool = Field(True, description="Whether tag is active")


class DocumentTagCreate(DocumentTagBase):
    """Schema for creating a document tag."""
    pass


class DocumentTagUpdate(BaseSchema):
    """Schema for updating a document tag."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=50, description="Tag name")
    description: Optional[str] = Field(None, max_length=500, description="Tag description")
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$", description="Hex color code")
    is_active: Optional[bool] = Field(None, description="Whether tag is active")


class DocumentTagResponse(DocumentTagBase, IDMixin, TimestampMixin):
    """Schema for document tag responses."""
    pass


class DocumentBase(BaseSchema):
    """Base document schema with common fields."""
    
    title: Optional[str] = Field(None, max_length=255, description="Document title")
    description: Optional[str] = Field(None, max_length=1000, description="Document description")
    document_type: DocumentType = Field(DocumentType.OTHER, description="Document type")
    is_confidential: bool = Field(False, description="Whether document is confidential")
    access_level: str = Field("public", description="Access level")


class DocumentCreate(DocumentBase):
    """Schema for creating a document (metadata only)."""
    
    tag_ids: Optional[List[UUID]] = Field(default_factory=list, description="Tag IDs to assign")


class DocumentUpdate(BaseSchema):
    """Schema for updating a document."""
    
    title: Optional[str] = Field(None, max_length=255, description="Document title")
    description: Optional[str] = Field(None, max_length=1000, description="Document description")
    document_type: Optional[DocumentType] = Field(None, description="Document type")
    is_confidential: Optional[bool] = Field(None, description="Whether document is confidential")
    access_level: Optional[str] = Field(None, description="Access level")
    tag_ids: Optional[List[UUID]] = Field(None, description="Tag IDs to assign")
    
    # Business data fields
    invoice_number: Optional[str] = Field(None, max_length=100, description="Invoice number")
    invoice_date: Optional[datetime] = Field(None, description="Invoice date")
    due_date: Optional[datetime] = Field(None, description="Due date")
    vendor_name: Optional[str] = Field(None, max_length=255, description="Vendor name")
    vendor_address: Optional[str] = Field(None, max_length=1000, description="Vendor address")
    customer_name: Optional[str] = Field(None, max_length=255, description="Customer name")
    total_amount: Optional[float] = Field(None, ge=0, description="Total amount")
    currency: Optional[str] = Field(None, min_length=3, max_length=3, description="Currency code")
    tax_amount: Optional[float] = Field(None, ge=0, description="Tax amount")


class DocumentResponse(DocumentBase, IDMixin, TimestampMixin):
    """Schema for document responses."""
    
    filename: str = Field(..., description="Document filename")
    original_filename: str = Field(..., description="Original filename")
    file_size: int = Field(..., ge=0, description="File size in bytes")
    mime_type: str = Field(..., description="MIME type")
    status: DocumentStatus = Field(..., description="Processing status")
    
    # Processing information
    processing_started_at: Optional[datetime] = Field(None, description="Processing start time")
    processing_completed_at: Optional[datetime] = Field(None, description="Processing completion time")
    processing_error: Optional[str] = Field(None, description="Processing error message")
    
    # Extracted content
    extracted_text: Optional[str] = Field(None, description="Extracted text content")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Document metadata")
    
    # Business data
    invoice_number: Optional[str] = Field(None, description="Invoice number")
    invoice_date: Optional[datetime] = Field(None, description="Invoice date")
    due_date: Optional[datetime] = Field(None, description="Due date")
    vendor_name: Optional[str] = Field(None, description="Vendor name")
    vendor_address: Optional[str] = Field(None, description="Vendor address")
    customer_name: Optional[str] = Field(None, description="Customer name")
    total_amount: Optional[float] = Field(None, description="Total amount")
    currency: Optional[str] = Field(None, description="Currency code")
    tax_amount: Optional[float] = Field(None, description="Tax amount")
    
    # SAP integration
    sap_document_number: Optional[str] = Field(None, description="SAP document number")
    sap_posting_date: Optional[datetime] = Field(None, description="SAP posting date")
    sap_status: Optional[str] = Field(None, description="SAP status")
    sap_error_message: Optional[str] = Field(None, description="SAP error message")
    
    # User and versioning
    uploaded_by: UUID = Field(..., description="User who uploaded the document")
    version: int = Field(..., description="Document version")
    parent_document_id: Optional[UUID] = Field(None, description="Parent document ID")
    
    # Archive information
    is_archived: bool = Field(False, description="Whether document is archived")
    archived_at: Optional[datetime] = Field(None, description="Archive timestamp")
    archived_by: Optional[UUID] = Field(None, description="User who archived the document")
    
    # Relationships
    tags: List[DocumentTagResponse] = Field(default_factory=list, description="Document tags")
    
    # Computed properties
    file_extension: Optional[str] = Field(None, description="File extension")
    is_image: Optional[bool] = Field(None, description="Whether document is an image")
    is_pdf: Optional[bool] = Field(None, description="Whether document is a PDF")
    processing_duration: Optional[float] = Field(None, description="Processing duration in seconds")


class DocumentListResponse(PaginatedResponse[DocumentResponse]):
    """Paginated response for document lists."""
    pass


class DocumentUpload(BaseSchema):
    """Schema for document upload requests."""
    
    title: Optional[str] = Field(None, max_length=255, description="Document title")
    description: Optional[str] = Field(None, max_length=1000, description="Document description")
    document_type: DocumentType = Field(DocumentType.OTHER, description="Document type")
    is_confidential: bool = Field(False, description="Whether document is confidential")
    tag_ids: Optional[List[UUID]] = Field(default_factory=list, description="Tag IDs to assign")
    auto_process: bool = Field(True, description="Whether to auto-process the document")


class DocumentSearch(BaseSchema):
    """Schema for document search requests."""
    
    query: Optional[str] = Field(None, description="Search query")
    document_type: Optional[DocumentType] = Field(None, description="Filter by document type")
    status: Optional[DocumentStatus] = Field(None, description="Filter by status")
    uploaded_by: Optional[UUID] = Field(None, description="Filter by uploader")
    tag_ids: Optional[List[UUID]] = Field(None, description="Filter by tag IDs")
    date_from: Optional[datetime] = Field(None, description="Filter by date from")
    date_to: Optional[datetime] = Field(None, description="Filter by date to")
    is_confidential: Optional[bool] = Field(None, description="Filter by confidentiality")
    is_archived: Optional[bool] = Field(None, description="Filter by archive status")
    
    # Business data filters
    vendor_name: Optional[str] = Field(None, description="Filter by vendor name")
    customer_name: Optional[str] = Field(None, description="Filter by customer name")
    invoice_number: Optional[str] = Field(None, description="Filter by invoice number")
    amount_min: Optional[float] = Field(None, ge=0, description="Minimum amount filter")
    amount_max: Optional[float] = Field(None, ge=0, description="Maximum amount filter")
    currency: Optional[str] = Field(None, description="Filter by currency")


class DocumentStats(BaseSchema):
    """Schema for document statistics."""
    
    total_documents: int = Field(..., ge=0, description="Total number of documents")
    documents_by_type: Dict[str, int] = Field(default_factory=dict, description="Documents by type")
    documents_by_status: Dict[str, int] = Field(default_factory=dict, description="Documents by status")
    total_file_size: int = Field(..., ge=0, description="Total file size in bytes")
    average_processing_time: Optional[float] = Field(None, description="Average processing time")
    documents_today: int = Field(..., ge=0, description="Documents uploaded today")
    documents_this_week: int = Field(..., ge=0, description="Documents uploaded this week")
    documents_this_month: int = Field(..., ge=0, description="Documents uploaded this month")
    processing_success_rate: float = Field(..., ge=0, le=100, description="Processing success rate")


class DocumentProcessingRequest(BaseSchema):
    """Schema for document processing requests."""
    
    document_id: UUID = Field(..., description="Document ID to process")
    force_reprocess: bool = Field(False, description="Force reprocessing even if already processed")
    extract_text: bool = Field(True, description="Extract text content")
    extract_metadata: bool = Field(True, description="Extract metadata")
    extract_business_data: bool = Field(True, description="Extract business data")


class DocumentProcessingResponse(BaseSchema):
    """Schema for document processing responses."""
    
    document_id: UUID = Field(..., description="Document ID")
    status: DocumentStatus = Field(..., description="Processing status")
    started_at: datetime = Field(..., description="Processing start time")
    message: str = Field(..., description="Processing status message")
    task_id: Optional[str] = Field(None, description="Background task ID")


class DocumentBulkOperation(BaseSchema):
    """Schema for bulk document operations."""
    
    document_ids: List[UUID] = Field(..., min_items=1, description="Document IDs")
    operation: str = Field(..., description="Operation to perform")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Operation parameters")


class DocumentVersionResponse(BaseSchema):
    """Schema for document version information."""
    
    document_id: UUID = Field(..., description="Document ID")
    version: int = Field(..., description="Version number")
    parent_document_id: Optional[UUID] = Field(None, description="Parent document ID")
    child_documents: List[UUID] = Field(default_factory=list, description="Child document IDs")
    version_history: List[Dict[str, Any]] = Field(default_factory=list, description="Version history")