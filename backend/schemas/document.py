"""
Document related Pydantic schemas
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from backend.models.document import DocumentType, DocumentStatus


class DocumentBase(BaseModel):
    """Base document schema"""
    filename: str
    document_type: DocumentType = DocumentType.OTHER


class DocumentCreate(DocumentBase):
    """Schema for creating a document"""
    pass


class DocumentUpdate(BaseModel):
    """Schema for updating document"""
    document_type: Optional[DocumentType] = None
    status: Optional[DocumentStatus] = None
    notes: Optional[str] = None
    tags: Optional[Dict[str, Any]] = None


class DocumentResponse(BaseModel):
    """Document response schema"""
    id: int
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    document_type: DocumentType
    status: DocumentStatus
    
    # Extracted data
    invoice_number: Optional[str] = None
    invoice_date: Optional[datetime] = None
    vendor_name: Optional[str] = None
    vendor_code: Optional[str] = None
    total_amount: Optional[Decimal] = None
    currency: Optional[str] = None
    
    # Processing info
    confidence_score: Optional[Decimal] = None
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    
    # SAP info
    sap_document_number: Optional[str] = None
    posted_to_sap: bool
    posted_to_sap_at: Optional[datetime] = None
    
    # Metadata
    uploaded_by: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """List of documents with pagination"""
    items: List[DocumentResponse]
    total: int
    page: int
    page_size: int
    pages: int


class DocumentUploadResponse(BaseModel):
    """Response after document upload"""
    id: int
    filename: str
    file_size: int
    status: DocumentStatus
    message: str = "Document uploaded successfully"


class ExtractedDataResponse(BaseModel):
    """Extracted data from document"""
    document_id: int
    extracted_data: Dict[str, Any]
    confidence_score: Optional[Decimal]
    ocr_text: Optional[str]


class DocumentApprovalRequest(BaseModel):
    """Document approval request"""
    approved: bool
    comments: Optional[str] = None


class DocumentSearchRequest(BaseModel):
    """Document search request"""
    query: Optional[str] = None
    document_type: Optional[DocumentType] = None
    status: Optional[DocumentStatus] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    vendor: Optional[str] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
