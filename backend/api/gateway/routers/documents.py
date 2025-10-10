"""
Document processing endpoints
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks, status, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from api.gateway.dependencies.auth import get_current_user
from models.user import User
from models.document import Document, DocumentStatus as DBDocumentStatus, DocumentType as DBDocumentType
from core.database import get_db
from core.storage import storage_service

router = APIRouter()


class DocumentType(str, Enum):
    INVOICE = "invoice"
    PURCHASE_ORDER = "purchase_order"
    REMITTANCE = "remittance"
    PROOF_OF_DELIVERY = "proof_of_delivery"


class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PENDING_REVIEW = "pending_review"


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    status: DocumentStatus
    message: str
    uploaded_at: datetime


class DocumentResponse(BaseModel):
    id: str
    filename: str
    document_type: Optional[DocumentType]
    status: DocumentStatus
    confidence_score: Optional[float]
    extracted_data: Optional[dict]
    sap_document_id: Optional[str]
    error_message: Optional[str]
    uploaded_at: datetime
    processed_at: Optional[datetime]


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
    page: int
    page_size: int
    pages: int


async def process_document_task(db: AsyncSession, document_id: int):
    """
    Background task for document processing
    """
    # TODO: Implement actual document processing
    # 1. Load document from storage
    # 2. Detect document type
    # 3. Extract data using ML models
    # 4. Validate extracted data
    # 5. Post to SAP (if auto-post enabled)
    # 6. Update document status
    # 7. Send notifications
    
    # For now, just mark as completed
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if doc:
        doc.status = DBDocumentStatus.COMPLETED
        doc.processed_at = datetime.utcnow()
        await db.commit()


@router.post("/documents/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    document_type: Optional[DocumentType] = None,
    auto_post: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a document for processing
    
    - **file**: Document file (PDF, Image, Excel)
    - **document_type**: Optional document type hint
    - **auto_post**: Automatically post to SAP if True
    """
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Read file content
    file_content = await file.read()
    file_size = len(file_content)
    
    # Check file size (50MB limit)
    MAX_SIZE = 50 * 1024 * 1024
    if file_size > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")
    
    # Validate file type
    allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg', '.xlsx', '.xls', '.docx', '.tiff', '.tif']
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(status_code=400, detail="File type not supported")
    
    # Save file to storage
    file_info = await storage_service.save_upload(file_content, file.filename)
    
    # Map document type
    db_doc_type = None
    if document_type:
        type_map = {
            'invoice': DBDocumentType.INVOICE,
            'purchase_order': DBDocumentType.PURCHASE_ORDER,
            'remittance': DBDocumentType.REMITTANCE_ADVICE,
            'proof_of_delivery': DBDocumentType.DELIVERY_NOTE
        }
        db_doc_type = type_map.get(document_type.value)
    
    # Create database record
    new_doc = Document(
        filename=file_info['unique_name'],
        original_filename=file_info['original_name'],
        file_path=file_info['file_path'],
        file_size=file_info['file_size'],
        mime_type=file_info['mime_type'],
        document_type=db_doc_type or DBDocumentType.OTHER,
        status=DBDocumentStatus.UPLOADED,
        uploaded_by=current_user.id,
        confidence_score=0.0
    )
    
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)
    
    # Add background task for processing
    # background_tasks.add_task(process_document_task, db, new_doc.id)
    
    return {
        "document_id": str(new_doc.id),
        "filename": file.filename,
        "status": DocumentStatus.UPLOADED,
        "message": f"Document {file.filename} uploaded successfully.",
        "uploaded_at": new_doc.created_at
    }


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    status: Optional[DocumentStatus] = None,
    document_type: Optional[DocumentType] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all documents with pagination and filtering
    """
    # Build query
    query = select(Document).where(Document.uploaded_by == current_user.id)
    
    # Apply filters
    if status:
        status_map = {
            'uploaded': DBDocumentStatus.UPLOADED,
            'processing': DBDocumentStatus.PROCESSING,
            'completed': DBDocumentStatus.COMPLETED,
            'failed': DBDocumentStatus.FAILED,
            'pending_review': DBDocumentStatus.PENDING_VALIDATION
        }
        if status.value in status_map:
            query = query.where(Document.status == status_map[status.value])
    
    if document_type:
        type_map = {
            'invoice': DBDocumentType.INVOICE,
            'purchase_order': DBDocumentType.PURCHASE_ORDER,
            'remittance': DBDocumentType.REMITTANCE_ADVICE,
            'proof_of_delivery': DBDocumentType.DELIVERY_NOTE
        }
        if document_type.value in type_map:
            query = query.where(Document.document_type == type_map[document_type.value])
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination and sorting
    query = query.order_by(desc(Document.created_at)).offset((page - 1) * page_size).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    documents = result.scalars().all()
    
    # Map to response model
    doc_responses = []
    for doc in documents:
        doc_responses.append(DocumentResponse(
            id=str(doc.id),
            filename=doc.filename,
            document_type=None,  # Map back if needed
            status=DocumentStatus.UPLOADED if doc.status == DBDocumentStatus.UPLOADED else DocumentStatus.COMPLETED,
            confidence_score=doc.confidence_score,
            extracted_data=doc.extracted_data,
            sap_document_id=doc.sap_document_number,
            error_message=doc.error_message,
            uploaded_at=doc.created_at,
            processed_at=doc.processing_completed_at
        ))
    
    return {
        "items": doc_responses,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size  # Calculate total pages
    }


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get document details by ID
    """
    # TODO: Fetch from database
    # Mock response
    return {
        "id": document_id,
        "filename": "invoice_123.pdf",
        "document_type": DocumentType.INVOICE,
        "status": DocumentStatus.COMPLETED,
        "confidence_score": 0.95,
        "extracted_data": {
            "invoice_number": "INV-2024-001",
            "invoice_date": "2024-01-01",
            "total_amount": 1500.00,
            "vendor_name": "Acme Corp"
        },
        "sap_document_id": "5000123456",
        "error_message": None,
        "uploaded_at": datetime.utcnow(),
        "processed_at": datetime.utcnow()
    }


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a document
    """
    # TODO: Delete from database and storage
    return None


@router.post("/documents/{document_id}/reprocess")
async def reprocess_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Reprocess a document
    """
    # TODO: Add to reprocessing queue
    background_tasks.add_task(process_document_task, document_id, "reprocess")
    
    return {
        "message": "Document queued for reprocessing",
        "document_id": document_id
    }


@router.post("/documents/{document_id}/validate")
async def validate_document(
    document_id: str,
    corrections: dict,
    current_user: User = Depends(get_current_user)
):
    """
    Validate and correct extracted data
    """
    # TODO: Update document with corrections
    # TODO: Use corrections for model improvement
    
    return {
        "message": "Document validated and updated",
        "document_id": document_id,
        "corrections_applied": len(corrections)
    }


@router.post("/documents/{document_id}/post-to-sap")
async def post_to_sap(
    document_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Post document to SAP
    """
    # TODO: Post to SAP via connector
    
    return {
        "message": "Document posted to SAP successfully",
        "document_id": document_id,
        "sap_document_id": "5000123456"
    }


@router.get("/documents/stats/summary")
async def get_document_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get document processing statistics
    """
    # Get total documents count
    total_query = select(func.count()).select_from(Document).where(Document.uploaded_by == current_user.id)
    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0
    
    # Get counts by status
    status_counts = {}
    for db_status in [DBDocumentStatus.UPLOADED, DBDocumentStatus.PROCESSING, DBDocumentStatus.COMPLETED, DBDocumentStatus.FAILED]:
        status_query = select(func.count()).select_from(Document).where(
            Document.uploaded_by == current_user.id,
            Document.status == db_status
        )
        result = await db.execute(status_query)
        status_counts[db_status.value] = result.scalar() or 0
    
    return {
        "total_documents": total,
        "processed_today": 0,
        "success_rate": 0.0 if total == 0 else (status_counts.get('completed', 0) / total * 100),
        "average_processing_time": 0.0,
        "by_status": {
            "uploaded": status_counts.get('uploaded', 0),
            "processing": status_counts.get('processing', 0),
            "completed": status_counts.get('completed', 0),
            "failed": status_counts.get('failed', 0),
            "pending_review": status_counts.get('pending_validation', 0)
        },
        "by_type": {
            "invoice": 0,
            "purchase_order": 0,
            "remittance": 0,
            "proof_of_delivery": 0
        }
    }
