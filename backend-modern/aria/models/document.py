"""Document models."""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, 
    JSON, String, Text
)
from sqlalchemy.orm import relationship

from aria.core.database import Base


class DocumentType(enum.Enum):
    """Document type enumeration."""
    PDF = "pdf"
    IMAGE = "image"
    WORD = "word"
    EXCEL = "excel"
    TEXT = "text"
    OTHER = "other"


class DocumentStatus(enum.Enum):
    """Document processing status enumeration."""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    ARCHIVED = "archived"


class Document(Base):
    """Document model."""
    
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    
    # Document classification
    document_type = Column(Enum(DocumentType), nullable=False)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.UPLOADED, nullable=False)
    
    # Content and metadata
    title = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    extracted_text = Column(Text, nullable=True)
    doc_metadata = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True)  # List of tags
    
    # Processing information
    processing_started_at = Column(DateTime, nullable=True)
    processing_completed_at = Column(DateTime, nullable=True)
    processing_error = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)
    
    # AI Analysis
    ai_summary = Column(Text, nullable=True)
    ai_keywords = Column(JSON, nullable=True)  # List of keywords
    ai_entities = Column(JSON, nullable=True)  # Named entities
    ai_sentiment = Column(String(20), nullable=True)  # positive, negative, neutral
    
    # Security and access
    is_public = Column(Boolean, default=False, nullable=False)
    is_sensitive = Column(Boolean, default=False, nullable=False)
    access_level = Column(String(20), default="private", nullable=False)  # private, team, public
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Foreign keys
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="documents")
    analytics = relationship("DocumentAnalytics", back_populates="document", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Document(id={self.id}, filename='{self.filename}', status='{self.status.value}')>"
    
    @property
    def file_extension(self) -> str:
        """Get file extension."""
        return self.filename.split('.')[-1].lower() if '.' in self.filename else ''
    
    @property
    def is_processed(self) -> bool:
        """Check if document is processed."""
        return self.status == DocumentStatus.COMPLETED
    
    @property
    def is_processing(self) -> bool:
        """Check if document is currently being processed."""
        return self.status == DocumentStatus.PROCESSING
    
    @property
    def has_error(self) -> bool:
        """Check if document processing failed."""
        return self.status == DocumentStatus.FAILED
    
    def to_dict(self) -> dict:
        """Convert document to dictionary."""
        return {
            "id": self.id,
            "filename": self.filename,
            "original_filename": self.original_filename,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "document_type": self.document_type.value,
            "status": self.status.value,
            "title": self.title,
            "description": self.description,
            "extracted_text": self.extracted_text,
            "metadata": self.doc_metadata,
            "tags": self.tags,
            "processing_started_at": self.processing_started_at.isoformat() if self.processing_started_at else None,
            "processing_completed_at": self.processing_completed_at.isoformat() if self.processing_completed_at else None,
            "processing_error": self.processing_error,
            "confidence_score": self.confidence_score,
            "ai_summary": self.ai_summary,
            "ai_keywords": self.ai_keywords,
            "ai_entities": self.ai_entities,
            "ai_sentiment": self.ai_sentiment,
            "is_public": self.is_public,
            "is_sensitive": self.is_sensitive,
            "access_level": self.access_level,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "owner_id": self.owner_id,
        }