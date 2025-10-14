"""
Document related database models
"""
import enum
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum, Numeric, JSON
from sqlalchemy.orm import relationship
from .base import BaseModel


class DocumentType(str, enum.Enum):
    """Document type enumeration"""
    INVOICE = "invoice"
    RECEIPT = "receipt"
    CONTRACT = "contract"
    PURCHASE_ORDER = "purchase_order"
    DELIVERY_NOTE = "delivery_note"
    CREDIT_NOTE = "credit_note"
    STATEMENT = "statement"
    OTHER = "other"


class DocumentStatus(str, enum.Enum):
    """Document processing status"""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    VALIDATED = "validated"
    APPROVED = "approved"
    REJECTED = "rejected"
    POSTED_TO_SAP = "posted_to_sap"
    ERROR = "error"


class Document(BaseModel):
    """Document model"""
    __tablename__ = "documents"
    
    # File information
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_hash = Column(String(64), index=True)  # SHA-256 hash for deduplication
    
    # Document classification
    document_type = Column(Enum(DocumentType), default=DocumentType.OTHER, nullable=False)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.UPLOADED, nullable=False)
    
    # Extracted data (from OCR and AI processing)
    ocr_text = Column(Text)
    extracted_data = Column(JSON)  # Store extracted fields as JSON
    
    # Invoice-specific fields (most common document type)
    invoice_number = Column(String(100), index=True)
    invoice_date = Column(DateTime)
    due_date = Column(DateTime)
    vendor_name = Column(String(255), index=True)
    vendor_code = Column(String(50), index=True)
    vendor_address = Column(Text)
    vendor_tax_id = Column(String(50))
    
    # Financial information
    subtotal_amount = Column(Numeric(15, 2))
    tax_amount = Column(Numeric(15, 2))
    total_amount = Column(Numeric(15, 2), index=True)
    currency = Column(String(3), default='USD')  # ISO currency code
    
    # Purchase order information
    po_number = Column(String(100), index=True)
    po_line_items = Column(JSON)  # Store line items as JSON
    
    # Processing information
    confidence_score = Column(Numeric(5, 4))  # 0.0000 to 1.0000
    processing_started_at = Column(DateTime)
    processing_completed_at = Column(DateTime)
    processing_duration = Column(Integer)  # Duration in seconds
    processing_errors = Column(JSON)  # Store any processing errors
    
    # Validation and approval
    validation_status = Column(String(50))
    validation_errors = Column(JSON)
    validated_by = Column(Integer, ForeignKey('users.id'))
    validated_at = Column(DateTime)
    
    approved_by = Column(Integer, ForeignKey('users.id'))
    approved_at = Column(DateTime)
    approval_comments = Column(Text)
    
    # SAP integration
    sap_document_number = Column(String(100), index=True)
    sap_fiscal_year = Column(String(4))
    sap_company_code = Column(String(4))
    posted_to_sap = Column(Boolean, default=False, nullable=False)
    posted_to_sap_at = Column(DateTime)
    posted_to_sap_by = Column(Integer, ForeignKey('users.id'))
    sap_posting_errors = Column(JSON)
    
    # Metadata
    tags = Column(JSON)  # Custom tags as JSON array
    notes = Column(Text)
    priority = Column(String(20), default='normal')  # low, normal, high, urgent
    
    # Organization
    folder_id = Column(Integer, ForeignKey('folders.id'))
    
    # Relationships
    uploaded_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    uploaded_by_user = relationship("User", foreign_keys=[uploaded_by], back_populates="documents")
    validated_by_user = relationship("User", foreign_keys=[validated_by])
    approved_by_user = relationship("User", foreign_keys=[approved_by])
    posted_by_user = relationship("User", foreign_keys=[posted_to_sap_by])
    
    # Advanced relationships (will be imported from advanced.py)
    folder = relationship("Folder", back_populates="documents")
    versions = relationship("DocumentVersion", back_populates="document", order_by="DocumentVersion.version_number")
    tags = relationship("Tag", secondary="document_tags", back_populates="documents")
    enhanced_tags = relationship("EnhancedTag", secondary="document_enhanced_tags", back_populates="documents")
    share_links = relationship("ShareLink", back_populates="document")
    comments = relationship("Comment", back_populates="document")
    workflows = relationship("Workflow", back_populates="document")
    shared_with = relationship("User", secondary="document_shares")
    
    # Notification relationships
    notifications = relationship("Notification", back_populates="document")
    notification_subscriptions = relationship("NotificationSubscription", back_populates="document")
    
    # Document processing relationships
    processing_jobs = relationship("DocumentProcessingJob", back_populates="document")
    ocr_results = relationship("OCRResult", back_populates="document")
    classification_results = relationship("DocumentClassificationResult", back_populates="document")
    extraction_results = relationship("ContentExtractionResult", back_populates="document")
    conversion_results = relationship("DocumentConversionResult", back_populates="document")
    ai_analysis_results = relationship("AIAnalysisResult", back_populates="document")
    
    # Analytics relationships
    analytics = relationship("DocumentAnalytics", back_populates="document")
    
    def __repr__(self):
        return f"<Document(id={self.id}, filename='{self.filename}', status='{self.status}')>"
    
    @property
    def is_processed(self) -> bool:
        """Check if document has been processed"""
        return self.status in [
            DocumentStatus.PROCESSED,
            DocumentStatus.VALIDATED,
            DocumentStatus.APPROVED,
            DocumentStatus.POSTED_TO_SAP
        ]
    
    @property
    def is_ready_for_sap(self) -> bool:
        """Check if document is ready to be posted to SAP"""
        return (
            self.status == DocumentStatus.APPROVED and
            not self.posted_to_sap and
            self.total_amount is not None and
            self.vendor_code is not None
        )
    
    @property
    def processing_time(self) -> Optional[int]:
        """Get processing time in seconds"""
        if self.processing_started_at and self.processing_completed_at:
            delta = self.processing_completed_at - self.processing_started_at
            return int(delta.total_seconds())
        return None
    
    def get_extracted_field(self, field_name: str, default=None):
        """Get a specific field from extracted data"""
        if self.extracted_data and isinstance(self.extracted_data, dict):
            return self.extracted_data.get(field_name, default)
        return default
    
    def set_extracted_field(self, field_name: str, value):
        """Set a specific field in extracted data"""
        if not self.extracted_data:
            self.extracted_data = {}
        self.extracted_data[field_name] = value
    
    def add_processing_error(self, error_message: str, error_type: str = "general"):
        """Add a processing error"""
        if not self.processing_errors:
            self.processing_errors = []
        
        error_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "type": error_type,
            "message": error_message
        }
        self.processing_errors.append(error_entry)
    
    def add_tag(self, tag: str):
        """Add a tag to the document"""
        if not self.tags:
            self.tags = []
        if tag not in self.tags:
            self.tags.append(tag)
    
    def remove_tag(self, tag: str):
        """Remove a tag from the document"""
        if self.tags and tag in self.tags:
            self.tags.remove(tag)