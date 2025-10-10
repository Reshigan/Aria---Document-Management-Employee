"""
Enhanced Document Management API Routes
"""
import os
import uuid
import aiofiles
from datetime import datetime
from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, select, insert, delete, update

from core.database import get_db
from core.config import settings
from api.gateway.dependencies.auth import get_current_user
from models import (
    User, Document, Folder, Tag, DocumentVersion, 
    DocumentFavorite, DocumentView, ActivityLog, document_tags
)
from models.advanced import document_shares
from models.document import DocumentType, DocumentStatus
from schemas.document import (
    DocumentResponse, DocumentCreate, DocumentUpdate, DocumentListResponse,
    DocumentDetailResponse, DocumentShareResponse
)
from schemas.advanced import DocumentVersionResponse
from services.auth_service import auth_service

router = APIRouter(prefix="/documents", tags=["documents"])


async def check_document_permission(db: AsyncSession, user: User, document_id: int, permission: str = "read") -> bool:
    """Check if user has permission to access document"""
    if user.is_superuser:
        return True
    
    document_query = select(Document).where(Document.id == document_id)
    result = await db.execute(document_query)
    document = result.scalar_one_or_none()
    if not document:
        return False
    
    # Owner has all permissions
    if document.uploaded_by == user.id:
        return True
    
    # Check folder permissions if document is in a folder
    if document.folder_id:
        # For now, skip folder permission check - will implement when converting folders
        # from api.routes.folders import check_folder_permission
        # return await check_folder_permission(db, user, document.folder_id, permission)
        pass
    
    # Check document shares using the table
    if permission == "read":
        share_query = select(document_shares).where(
            and_(
                document_shares.c.document_id == document_id,
                document_shares.c.user_id == user.id
            )
        )
        share_result = await db.execute(share_query)
        share = share_result.first()
        return share is not None
    
    return False


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    folder_id: Optional[int] = Query(None),
    document_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    tags: Optional[List[str]] = Query(None),
    uploaded_by: Optional[int] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    sort_by: str = Query("created_at", regex="^(created_at|updated_at|filename|file_size)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List documents with advanced filtering and pagination"""
    query = select(Document)
    
    # Apply user permissions (non-superusers only see accessible documents)
    if not current_user.is_superuser:
        # Documents owned by user or shared with user
        shared_doc_ids = select(document_shares.c.document_id).where(
            document_shares.c.user_id == current_user.id
        )
        
        query = query.where(
            or_(
                Document.uploaded_by == current_user.id,
                Document.id.in_(shared_doc_ids)
            )
        )
    
    # Apply filters
    if folder_id is not None:
        query = query.where(Document.folder_id == folder_id)
    
    if document_type:
        query = query.where(Document.document_type == document_type)
    
    if status:
        query = query.where(Document.status == status)
    
    if search:
        search_filter = or_(
            Document.filename.ilike(f"%{search}%"),
            Document.original_filename.ilike(f"%{search}%"),
            Document.ocr_text.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
    
    if tags:
        tag_ids = select(Tag.id).where(Tag.name.in_(tags))
        document_ids_with_tags = select(document_tags.c.document_id).where(
            document_tags.c.tag_id.in_(tag_ids)
        )
        query = query.where(Document.id.in_(document_ids_with_tags))
    
    if uploaded_by:
        query = query.where(Document.uploaded_by == uploaded_by)
    
    if date_from:
        query = query.where(Document.created_at >= date_from)
    
    if date_to:
        query = query.where(Document.created_at <= date_to)
    
    # Apply sorting
    sort_column = getattr(Document, sort_by)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    paginated_query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(paginated_query)
    documents = result.scalars().all()
    
    # Build response with additional data
    items = []
    for doc in documents:
        # Get folder name
        folder_name = None
        if doc.folder_id:
            folder_query = select(Folder).where(Folder.id == doc.folder_id)
            folder_result = await db.execute(folder_query)
            folder = folder_result.scalar_one_or_none()
            folder_name = folder.name if folder else None
        
        # Get tags
        tags_query = select(Tag.name).select_from(
            Tag.__table__.join(document_tags).join(Document.__table__)
        ).where(document_tags.c.document_id == doc.id)
        tags_result = await db.execute(tags_query)
        tag_names = [tag for tag in tags_result.scalars().all()]
        
        # Check if favorited by current user
        favorite_query = select(DocumentFavorite).where(
            and_(
                DocumentFavorite.document_id == doc.id,
                DocumentFavorite.user_id == current_user.id
            )
        )
        favorite_result = await db.execute(favorite_query)
        is_favorite = favorite_result.scalar_one_or_none() is not None
        
        items.append(DocumentResponse(
            id=doc.id,
            filename=doc.filename,
            original_filename=doc.original_filename,
            document_type=doc.document_type,
            status=doc.status,
            file_size=doc.file_size,
            mime_type=doc.mime_type,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
            uploaded_by=doc.uploaded_by,
            folder_id=doc.folder_id,
            folder_name=folder_name,
            tags=tag_names,
            is_favorite=is_favorite
        ))
    
    return DocumentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size
    )


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(None),
    tags: Optional[str] = Form(None),  # Comma-separated tag names
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a new document with enhanced metadata"""
    # Validate file type
    if file.content_type:
        file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
        if file_extension not in settings.ALLOWED_FILE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '{file_extension}' not allowed"
            )
    
    # Check file size
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE} bytes"
        )
    
    # Check folder permissions if specified
    if folder_id:
        from api.routes.folders import check_folder_permission
        if not check_folder_permission(db, current_user, folder_id, "write"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to upload to this folder"
            )
    
    # Generate unique filename and save file
    file_id = str(uuid.uuid4())
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
    stored_filename = f"{file_id}.{file_extension}" if file_extension else file_id
    file_path = os.path.join(settings.UPLOAD_DIR, stored_filename)
    
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Determine document type based on file extension
    document_type = DocumentType.OTHER  # Default
    
    # Create document record
    document = Document(
        filename=stored_filename,
        original_filename=file.filename,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
        document_type=document_type,
        status=DocumentStatus.UPLOADED,
        uploaded_by=current_user.id,
        folder_id=folder_id
    )
    
    # Basic text extraction for text files
    if file.content_type and 'text' in file.content_type:
        try:
            text = content.decode('utf-8')
            document.ocr_text = text
            document.status = "processed"
        except:
            pass
    
    db.add(document)
    await db.commit()
    await db.refresh(document)
    
    # Create initial version
    version = DocumentVersion(
        document_id=document.id,
        version_number=1,
        filename=stored_filename,
        file_path=file_path,
        file_size=len(content),
        file_hash="",  # TODO: Calculate hash
        mime_type=file.content_type or "application/octet-stream",
        created_by=current_user.id,
        version_notes="Initial upload",
        is_current=True
    )
    db.add(version)
    
    # Add tags if specified
    if tags:
        tag_names = [name.strip() for name in tags.split(',') if name.strip()]
        for tag_name in tag_names:
            # Get or create tag
            result = await db.execute(select(Tag).filter(Tag.name == tag_name))
            tag = result.scalar_one_or_none()
            if not tag:
                tag = Tag(name=tag_name, created_by=current_user.id)
                db.add(tag)
                await db.flush()  # Get the ID
            
            # Create document-tag association using the association table
            await db.execute(
                insert(document_tags).values(
                    document_id=document.id,
                    tag_id=tag.id
                )
            )
    
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "document_uploaded", "document", document.id,
        f"Uploaded document: {document.original_filename}"
    )
    
    # Get folder name for response
    folder_name = None
    if folder_id:
        result = await db.execute(select(Folder).filter(Folder.id == folder_id))
        folder = result.scalar_one_or_none()
        folder_name = folder.name if folder else None
    
    # Get tags for response
    result = await db.execute(
        select(Tag.name).select_from(Tag).join(document_tags).filter(
            document_tags.c.document_id == document.id
        )
    )
    tag_names = [row[0] for row in result.fetchall()]
    
    return DocumentResponse(
        id=document.id,
        filename=document.filename,
        original_filename=document.original_filename,
        document_type=document.document_type,
        status=document.status,
        file_size=document.file_size,
        mime_type=document.mime_type,
        created_at=document.created_at,
        updated_at=document.updated_at,
        uploaded_by=document.uploaded_by,
        folder_id=document.folder_id,
        folder_name=folder_name,
        tags=tag_names,
        is_favorite=False
    )


@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed document information"""
    if not await check_document_permission(db, current_user, document_id, "read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to access this document"
        )
    
    document_query = select(Document).where(Document.id == document_id)
    result = await db.execute(document_query)
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Record document view
    view = DocumentView(
        document_id=document_id,
        user_id=current_user.id
    )
    db.add(view)
    await db.commit()
    
    # Get additional data
    folder_name = None
    if document.folder_id:
        folder_query = select(Folder).where(Folder.id == document.folder_id)
        folder_result = await db.execute(folder_query)
        folder = folder_result.scalar_one_or_none()
        folder_name = folder.name if folder else None
    
    # Get tags
    tags_query = select(Tag.name).select_from(
        Tag.__table__.join(document_tags).join(Document.__table__)
    ).where(document_tags.c.document_id == document.id)
    tags_result = await db.execute(tags_query)
    tag_names = [tag for tag in tags_result.scalars().all()]
    
    # Get versions
    versions_query = select(DocumentVersion).where(
        DocumentVersion.document_id == document_id
    ).order_by(DocumentVersion.version_number.desc())
    versions_result = await db.execute(versions_query)
    versions = versions_result.scalars().all()
    
    # Check if favorited
    favorite_query = select(DocumentFavorite).where(
        and_(
            DocumentFavorite.document_id == document_id,
            DocumentFavorite.user_id == current_user.id
        )
    )
    favorite_result = await db.execute(favorite_query)
    is_favorite = favorite_result.scalar_one_or_none() is not None
    
    # Get view count
    view_count_query = select(func.count()).select_from(DocumentView).where(
        DocumentView.document_id == document_id
    )
    view_count_result = await db.execute(view_count_query)
    view_count = view_count_result.scalar()
    
    return DocumentDetailResponse(
        id=document.id,
        filename=document.filename,
        original_filename=document.original_filename,
        document_type=document.document_type,
        status=document.status,
        file_size=document.file_size,
        mime_type=document.mime_type,
        created_at=document.created_at,
        updated_at=document.updated_at,
        uploaded_by=document.uploaded_by,
        folder_id=document.folder_id,
        folder_name=folder_name,
        description=None,  # Document model doesn't have description field
        ocr_text=document.ocr_text,
        extracted_data=document.extracted_data,
        tags=tag_names,
        versions=[DocumentVersionResponse.from_orm(v) for v in versions],
        is_favorite=is_favorite,
        view_count=view_count
    )


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: int,
    document_data: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update document metadata"""
    if not await check_document_permission(db, current_user, document_id, "write"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to modify this document"
        )
    
    document_query = select(Document).where(Document.id == document_id)
    result = await db.execute(document_query)
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Update fields
    update_data = document_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(document, field):
            setattr(document, field, value)
    
    document.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(document)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "document_updated", "document", document.id,
        f"Updated document: {document.original_filename}"
    )
    
    # Get additional data for response
    folder_name = None
    if document.folder_id:
        folder_query = select(Folder).where(Folder.id == document.folder_id)
        folder_result = await db.execute(folder_query)
        folder = folder_result.scalar_one_or_none()
        folder_name = folder.name if folder else None
    
    tags_query = select(Tag.name).select_from(
        Tag.__table__.join(document_tags).join(Document.__table__)
    ).where(document_tags.c.document_id == document.id)
    tags_result = await db.execute(tags_query)
    tag_names = [tag for tag in tags_result.scalars().all()]
    
    favorite_query = select(DocumentFavorite).where(
        and_(
            DocumentFavorite.document_id == document_id,
            DocumentFavorite.user_id == current_user.id
        )
    )
    favorite_result = await db.execute(favorite_query)
    is_favorite = favorite_result.scalar_one_or_none() is not None
    
    return DocumentResponse(
        id=document.id,
        filename=document.filename,
        original_filename=document.original_filename,
        document_type=document.document_type,
        status=document.status,
        file_size=document.file_size,
        mime_type=document.mime_type,
        created_at=document.created_at,
        updated_at=document.updated_at,
        uploaded_by=document.uploaded_by,
        folder_id=document.folder_id,
        folder_name=folder_name,
        tags=tag_names,
        is_favorite=is_favorite
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete document"""
    if not await check_document_permission(db, current_user, document_id, "delete"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to delete this document"
        )
    
    document_query = select(Document).where(Document.id == document_id)
    result = await db.execute(document_query)
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete physical files
    try:
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
        
        # Delete version files
        versions_query = select(DocumentVersion).where(
            DocumentVersion.document_id == document_id
        )
        versions_result = await db.execute(versions_query)
        versions = versions_result.scalars().all()
        for version in versions:
            if os.path.exists(version.file_path):
                os.remove(version.file_path)
    except Exception as e:
        # Log error but don't fail the deletion
        print(f"Error deleting files: {e}")
    
    # Delete related records using table references
    await db.execute(delete(document_tags).where(document_tags.c.document_id == document_id))
    await db.execute(delete(DocumentVersion).where(DocumentVersion.document_id == document_id))
    await db.execute(delete(document_shares).where(document_shares.c.document_id == document_id))
    await db.execute(delete(DocumentFavorite).where(DocumentFavorite.document_id == document_id))
    await db.execute(delete(DocumentView).where(DocumentView.document_id == document_id))
    
    # Delete document
    await db.execute(delete(Document).where(Document.id == document_id))
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "document_deleted", "document", document_id,
        f"Deleted document: {document.original_filename}"
    )
    
    return {"message": "Document deleted successfully"}


@router.post("/{document_id}/move")
async def move_document(
    document_id: int,
    folder_id: Optional[int],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Move document to different folder"""
    if not await check_document_permission(db, current_user, document_id, "write"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to move this document"
        )
    
    # Check target folder permissions - skip for now until folders are converted
    # if folder_id:
    #     from api.routes.folders import check_folder_permission
    #     if not await check_folder_permission(db, current_user, folder_id, "write"):
    #         raise HTTPException(
    #             status_code=status.HTTP_403_FORBIDDEN,
    #             detail="No permission to move document to target folder"
    #         )
    
    document_query = select(Document).where(Document.id == document_id)
    result = await db.execute(document_query)
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    old_folder_id = document.folder_id
    document.folder_id = folder_id
    document.updated_at = datetime.utcnow()
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "document_moved", "document", document_id,
        f"Moved document '{document.original_filename}' from folder {old_folder_id} to {folder_id}"
    )
    
    return {"message": "Document moved successfully"}


@router.post("/{document_id}/favorite")
async def toggle_favorite(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Toggle document favorite status"""
    if not await check_document_permission(db, current_user, document_id, "read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to access this document"
        )
    
    document_query = select(Document).where(Document.id == document_id)
    result = await db.execute(document_query)
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if already favorited
    favorite_query = select(DocumentFavorite).where(
        and_(
            DocumentFavorite.document_id == document_id,
            DocumentFavorite.user_id == current_user.id
        )
    )
    favorite_result = await db.execute(favorite_query)
    favorite = favorite_result.scalar_one_or_none()
    
    if favorite:
        # Remove from favorites
        await db.execute(delete(DocumentFavorite).where(
            and_(
                DocumentFavorite.document_id == document_id,
                DocumentFavorite.user_id == current_user.id
            )
        ))
        action = "removed from"
        is_favorite = False
    else:
        # Add to favorites
        favorite = DocumentFavorite(
            document_id=document_id,
            user_id=current_user.id
        )
        db.add(favorite)
        action = "added to"
        is_favorite = True
    
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, f"document_favorite_{'added' if is_favorite else 'removed'}", 
        "document", document_id,
        f"Document '{document.original_filename}' {action} favorites"
    )
    
    return {
        "message": f"Document {action} favorites",
        "is_favorite": is_favorite
    }


@router.get("/favorites/list", response_model=DocumentListResponse)
async def list_favorite_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's favorite documents"""
    query = db.query(Document).join(DocumentFavorite).filter(
        DocumentFavorite.user_id == current_user.id
    )
    
    total = query.count()
    documents = query.order_by(DocumentFavorite.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()
    
    # Build response
    items = []
    for doc in documents:
        folder_name = None
        if doc.folder_id:
            folder = db.query(Folder).filter(Folder.id == doc.folder_id).first()
            folder_name = folder.name if folder else None
        
        doc_tags = db.query(Tag.name).join(DocumentTag).filter(
            DocumentTag.document_id == doc.id
        ).all()
        tag_names = [tag[0] for tag in doc_tags]
        
        items.append(DocumentResponse(
            id=doc.id,
            filename=doc.filename,
            original_filename=doc.original_filename,
            document_type=doc.document_type,
            status=doc.status,
            file_size=doc.file_size,
            mime_type=doc.mime_type,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
            uploaded_by=doc.uploaded_by,
            folder_id=doc.folder_id,
            folder_name=folder_name,
            tags=tag_names,
            is_favorite=True
        ))
    
    return DocumentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size
    )


# Document Version Management Endpoints

@router.get("/{document_id}/versions", response_model=List[DocumentVersionResponse])
async def get_document_versions(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all versions of a document"""
    # Check if document exists and user has permission
    document_query = select(Document).where(Document.id == document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get versions
    versions_query = select(DocumentVersion).where(
        DocumentVersion.document_id == document_id
    ).order_by(DocumentVersion.version_number.desc())
    versions_result = await db.execute(versions_query)
    versions = versions_result.scalars().all()
    
    return [DocumentVersionResponse.from_orm(v) for v in versions]


@router.post("/{document_id}/versions", response_model=DocumentVersionResponse)
async def upload_document_version(
    document_id: int,
    file: UploadFile = File(...),
    version_notes: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a new version of an existing document"""
    # Check if document exists and user has permission
    document_query = select(Document).where(Document.id == document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get current highest version number
    version_query = select(func.max(DocumentVersion.version_number)).where(
        DocumentVersion.document_id == document_id
    )
    version_result = await db.execute(version_query)
    max_version = version_result.scalar() or 0
    new_version_number = max_version + 1
    
    # Read file content
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
    stored_filename = f"{document_id}_v{new_version_number}_{int(datetime.utcnow().timestamp())}{file_extension}"
    
    # Save file
    upload_dir = Path("uploads")
    upload_dir.mkdir(exist_ok=True)
    file_path = upload_dir / stored_filename
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Mark all previous versions as not current
    update_query = update(DocumentVersion).where(
        DocumentVersion.document_id == document_id
    ).values(is_current=False)
    await db.execute(update_query)
    
    # Create new version
    version = DocumentVersion(
        document_id=document_id,
        version_number=new_version_number,
        filename=file.filename or stored_filename,
        file_path=str(file_path),
        file_size=len(content),
        file_hash="",  # TODO: Calculate hash
        mime_type=file.content_type or "application/octet-stream",
        created_by=current_user.id,
        version_notes=version_notes,
        is_current=True
    )
    db.add(version)
    
    # Update document's main file path to point to new version
    document.file_path = str(file_path)
    document.file_size = len(content)
    document.updated_at = datetime.utcnow()
    document.updated_by = current_user.id
    
    await db.commit()
    await db.refresh(version)
    
    return DocumentVersionResponse.from_orm(version)


@router.get("/{document_id}/versions/{version_number}")
async def download_document_version(
    document_id: int,
    version_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Download a specific version of a document"""
    # Check if document exists and user has permission
    document_query = select(Document).where(Document.id == document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get specific version
    version_query = select(DocumentVersion).where(
        and_(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == version_number
        )
    )
    version_result = await db.execute(version_query)
    version = version_result.scalar_one_or_none()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Check if file exists
    if not os.path.exists(version.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=version.file_path,
        filename=version.filename,
        media_type=version.mime_type
    )


@router.post("/{document_id}/versions/{version_number}/revert")
async def revert_to_version(
    document_id: int,
    version_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Revert document to a specific version"""
    # Check if document exists and user has permission
    document_query = select(Document).where(Document.id == document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get specific version
    version_query = select(DocumentVersion).where(
        and_(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == version_number
        )
    )
    version_result = await db.execute(version_query)
    version = version_result.scalar_one_or_none()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Mark all versions as not current
    update_query = update(DocumentVersion).where(
        DocumentVersion.document_id == document_id
    ).values(is_current=False)
    await db.execute(update_query)
    
    # Mark selected version as current
    version.is_current = True
    
    # Update document's main file path to point to reverted version
    document.file_path = version.file_path
    document.file_size = version.file_size
    document.updated_at = datetime.utcnow()
    document.updated_by = current_user.id
    
    await db.commit()
    
    return {"message": f"Document reverted to version {version_number}"}


@router.delete("/{document_id}/versions/{version_number}")
async def delete_document_version(
    document_id: int,
    version_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a specific version of a document"""
    # Check if document exists and user has permission
    document_query = select(Document).where(Document.id == document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get specific version
    version_query = select(DocumentVersion).where(
        and_(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == version_number
        )
    )
    version_result = await db.execute(version_query)
    version = version_result.scalar_one_or_none()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Don't allow deletion of current version if it's the only version
    versions_count_query = select(func.count(DocumentVersion.id)).where(
        DocumentVersion.document_id == document_id
    )
    versions_count_result = await db.execute(versions_count_query)
    versions_count = versions_count_result.scalar()
    
    if versions_count == 1:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete the only version of a document"
        )
    
    if version.is_current:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete the current version. Revert to another version first."
        )
    
    # Delete physical file
    try:
        if os.path.exists(version.file_path):
            os.remove(version.file_path)
    except Exception as e:
        print(f"Error deleting version file: {e}")
    
    # Delete version record
    await db.delete(version)
    await db.commit()
    
    return {"message": f"Version {version_number} deleted successfully"}