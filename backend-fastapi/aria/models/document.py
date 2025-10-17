"""
Document-related database models.

This module defines document, document type, and related models for the Aria system.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import uuid4

from sqlalchemy import (
    Boolean, Column, DateTime, Enum as SQLEnum, ForeignKey, 
    Integer, String, Table, Text, Float, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from aria.core.database import Base


class DocumentStatus(str, Enum):
    """Document processing status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"
    ARCHIVED = "archived"


class DocumentType(str, Enum):
    """Document type enumeration."""
    INVOICE = "invoice"
    RECEIPT = "receipt"
    CONTRACT = "contract"
    REPORT = "report"
    FORM = "form"
    IMAGE = "image"
    OTHER = "other"


# Association table for many-to-many relationship between documents and tags - commented out for now
# document_tags = Table(
#     "document_tags_association",
#     Base.metadata,
#     Column("document_id", String(36), ForeignKey("documents.id"), primary_key=True),
#     Column("tag_id", String(36), ForeignKey("document_tags.id"), primary_key=True),
# )


class DocumentTag(Base):
    """
    Document tag model for categorization and organization.
    
    Tags can be used to categorize documents for better organization
    and searchability.
    """
    
    __tablename__ = "document_tags"
    
    # Primary key
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)  # Hex color code
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Relationships - simplified for now
    # documents: Mapped[List["Document"]] = relationship(
    #     "Document", 
    #     secondary=document_tags, 
    #     back_populates="tags"
    # )
    
    def __repr__(self) -> str:
        return f"<DocumentTag(name={self.name})>"


class Document(Base):
    """
    Document model for storing document information and metadata.
    
    This is the main model for documents in the system, storing both
    file information and extracted metadata.
    """
    
    __tablename__ = "documents"
    
    # Primary key
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Basic Information
    filename: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Document Classification
    document_type: Mapped[DocumentType] = mapped_column(
        SQLEnum(DocumentType), 
        default=DocumentType.OTHER, 
        nullable=False,
        index=True
    )
    status: Mapped[DocumentStatus] = mapped_column(
        SQLEnum(DocumentStatus), 
        default=DocumentStatus.PENDING, 
        nullable=False,
        index=True
    )
    
    # Content and Metadata
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_metadata: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
    
    # Processing Information
    processing_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Business Data (extracted from documents)
    invoice_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    invoice_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    vendor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    vendor_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    total_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(3), nullable=True)  # ISO currency code
    tax_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # SAP Integration
    sap_document_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    sap_posting_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sap_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sap_error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # User Information
    uploaded_by: Mapped[str] = mapped_column(
        UUID(as_uuid=True) if "postgresql" in str(Column) else String(36),
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )
    
    # Security and Access
    is_confidential: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    access_level: Mapped[str] = mapped_column(String(20), default="public", nullable=False)
    
    # Versioning
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    parent_document_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=True) if "postgresql" in str(Column) else String(36),
        ForeignKey("documents.id"),
        nullable=True
    )
    
    # Archive Information
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_by: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=True) if "postgresql" in str(Column) else String(36),
        ForeignKey("users.id"),
        nullable=True
    )
    
    # Relationships
    uploaded_by_user: Mapped["User"] = relationship(
        "User", 
        back_populates="documents",
        foreign_keys=[uploaded_by]
    )
    
    archived_by_user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[archived_by]
    )
    
    # tags: Mapped[List[DocumentTag]] = relationship(
    #     "DocumentTag", 
    #     secondary=document_tags, 
    #     back_populates="documents"
    # )
    
    # Self-referential relationship for document versions
    parent_document: Mapped[Optional["Document"]] = relationship(
        "Document",
        remote_side="Document.id",
        back_populates="child_documents"
    )
    
    child_documents: Mapped[List["Document"]] = relationship(
        "Document",
        back_populates="parent_document"
    )
    
    def __repr__(self) -> str:
        return f"<Document(filename={self.filename}, type={self.document_type})>"
    
    @property
    def file_extension(self) -> str:
        """Get file extension from filename."""
        return self.filename.split('.')[-1].lower() if '.' in self.filename else ''
    
    @property
    def is_image(self) -> bool:
        """Check if document is an image."""
        image_extensions = {'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'}
        return self.file_extension in image_extensions
    
    @property
    def is_pdf(self) -> bool:
        """Check if document is a PDF."""
        return self.file_extension == 'pdf'
    
    @property
    def processing_duration(self) -> Optional[float]:
        """Get processing duration in seconds."""
        if self.processing_started_at and self.processing_completed_at:
            delta = self.processing_completed_at - self.processing_started_at
            return delta.total_seconds()
        return None