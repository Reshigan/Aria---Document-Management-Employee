"""
Document related Pydantic schemas
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class DocumentBase(BaseModel):
    """Base document schema"""
    filename: str
    document_type: Optional[str] = "document"


class DocumentCreate(DocumentBase):
    """Schema for creating a document"""
    folder_id: Optional[int] = None
    description: Optional[str] = None


class DocumentUpdate(BaseModel):
    """Schema for updating document"""
    filename: Optional[str] = None
    document_type: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    folder_id: Optional[int] = None


class DocumentResponse(BaseModel):
    """Document response schema"""
    id: int
    filename: str
    original_filename: str
    file_size: Optional[int]
    mime_type: Optional[str]
    document_type: Optional[str]
    status: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    uploaded_by: int
    folder_id: Optional[int]
    folder_name: Optional[str] = None
    tags: List[str] = []
    is_favorite: bool = False
    
    class Config:
        from_attributes = True


class DocumentDetailResponse(DocumentResponse):
    """Detailed document response schema"""
    description: Optional[str] = None
    ocr_text: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None
    versions: List[Any] = []
    view_count: int = 0





class DocumentListResponse(BaseModel):
    """Document list response schema"""
    items: List[DocumentResponse]
    total: int
    page: int
    page_size: int
    pages: int


class DocumentShareResponse(BaseModel):
    """Document share response schema"""
    id: int
    document_id: int
    shared_by_user_id: int
    shared_with_user_id: int
    can_view: bool
    can_edit: bool
    can_download: bool
    expires_at: Optional[datetime]
    message: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class DocumentShareCreate(BaseModel):
    """Document share creation schema"""
    shared_with_user_id: int
    can_view: bool = True
    can_edit: bool = False
    can_download: bool = True
    expires_at: Optional[datetime] = None
    message: Optional[str] = None


