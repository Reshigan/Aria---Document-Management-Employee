"""
Document Tagging API Routes
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, func, select, update, delete
from sqlalchemy.orm import selectinload

from core.database import get_db
from api.routes.auth_enhanced import get_current_user
from models import User, Tag, Document, document_tags
from schemas.advanced import (
    TagResponse, TagCreate, TagUpdate, TagListResponse,
    TagWithCountResponse, DocumentTagResponse
)
from services.auth_service import auth_service

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("/", response_model=TagListResponse)
async def list_tags(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    include_counts: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List tags with filtering and pagination"""
    if include_counts:
        # Query with document counts
        query = select(
            Tag,
            func.count(document_tags.c.document_id).label('document_count')
        ).outerjoin(document_tags).group_by(Tag.id)
    else:
        query = select(Tag)
    
    # Apply filters
    if search:
        query = query.where(Tag.name.ilike(f"%{search}%"))
    
    if category:
        query = query.where(Tag.category == category)
    
    # Get total count
    if include_counts:
        count_query = select(func.count(Tag.id))
        if search:
            count_query = count_query.where(Tag.name.ilike(f"%{search}%"))
        if category:
            count_query = count_query.where(Tag.category == category)
        
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        paginated_query = query.order_by(Tag.name).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(paginated_query)
        tags_with_counts = result.all()
        
        items = [
            TagWithCountResponse(
                id=tag.id,
                name=tag.name,
                description=tag.description,
                color=tag.color,
                category=tag.category,
                created_by=tag.created_by,
                created_at=tag.created_at,
                document_count=count
            )
            for tag, count in tags_with_counts
        ]
    else:
        count_query = select(func.count(Tag.id))
        if search:
            count_query = count_query.where(Tag.name.ilike(f"%{search}%"))
        if category:
            count_query = count_query.where(Tag.category == category)
        
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        paginated_query = query.order_by(Tag.name).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(paginated_query)
        tags = result.scalars().all()
        items = [TagResponse.from_orm(tag) for tag in tags]
    
    return TagListResponse(
        tags=items,
        total=total,
        page=page,
        per_page=page_size
    )


@router.post("/", response_model=TagResponse)
async def create_tag(
    tag_data: TagCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new tag"""
    # Check if tag name already exists
    query = select(Tag).where(Tag.name == tag_data.name)
    result = await db.execute(query)
    existing_tag = result.scalar_one_or_none()
    if existing_tag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tag with this name already exists"
        )
    
    # Create tag
    new_tag = Tag(
        name=tag_data.name,
        description=tag_data.description,
        color=tag_data.color,
        category=tag_data.category,
        created_by=current_user.id
    )
    
    db.add(new_tag)
    await db.commit()
    await db.refresh(new_tag)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "tag_created", "tag", new_tag.id,
        f"Created tag: {new_tag.name}"
    )
    
    return TagResponse.from_orm(new_tag)


@router.get("/categories")
async def get_tag_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all tag categories"""
    categories = select(Tag.category).where(
        Tag.category.isnot(None)
    ).distinct().all()
    
    return [category[0] for category in categories if category[0]]


@router.get("/popular")
async def get_popular_tags(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get most popular tags by usage count"""
    popular_tags = select(
        Tag,
        func.count(DocumentTag.document_id).label('usage_count')
    ).join(DocumentTag).group_by(Tag.id).order_by(
        func.count(DocumentTag.document_id).desc()
    ).limit(limit).all()
    
    return [
        {
            "id": tag.id,
            "name": tag.name,
            "description": tag.description,
            "color": tag.color,
            "category": tag.category,
            "usage_count": count
        }
        for tag, count in popular_tags
    ]


@router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get tag details"""
    query = select(Tag).where(Tag.id == tag_id)
    result = await db.execute(query)
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )
    
    return TagResponse.from_orm(tag)


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int,
    tag_data: TagUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update tag (Admin or tag creator only)"""
    query = select(Tag).where(Tag.id == tag_id)
    result = await db.execute(query)
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and tag.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this tag"
        )
    
    # Check for name conflicts if name is being changed
    if tag_data.name and tag_data.name != tag.name:
        existing_tag = select(Tag).where(
            and_(Tag.name == tag_data.name, Tag.id != tag_id)
        ).first()
        if existing_tag:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tag with this name already exists"
            )
    
    # Update fields
    update_data = tag_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(tag, field):
            setattr(tag, field, value)
    
    await db.commit()
    await db.refresh(tag)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "tag_updated", "tag", tag.id,
        f"Updated tag: {tag.name}"
    )
    
    return TagResponse.from_orm(tag)


@router.delete("/{tag_id}")
async def delete_tag(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete tag (Admin or tag creator only)"""
    query = select(Tag).where(Tag.id == tag_id)
    result = await db.execute(query)
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and tag.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete this tag"
        )
    
    # Check if tag is in use
    usage_count = select(DocumentTag).where(DocumentTag.tag_id == tag_id).count()
    if usage_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete tag that is used by {usage_count} documents"
        )
    
    # Delete tag
    await db.delete(tag)
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "tag_deleted", "tag", tag_id,
        f"Deleted tag: {tag.name}"
    )
    
    return {"message": "Tag deleted successfully"}


@router.get("/{tag_id}/documents")
async def get_documents_by_tag(
    tag_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get documents that have a specific tag"""
    query = select(Tag).where(Tag.id == tag_id)
    result = await db.execute(query)
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )
    
    # Get documents with this tag
    query = select(Document).join(DocumentTag).where(DocumentTag.tag_id == tag_id)
    
    # Filter by user permissions (non-superusers only see their own documents)
    if not current_user.is_superuser:
        query = query.where(Document.uploaded_by == current_user.id)
    
    # Get total count
    count_result = await db.execute(select(func.count()).select_from(query))
    total = count_result.scalar()
    
    # Apply pagination
    result = await db.execute(query.order_by(Document.created_at.desc()).offset((page - 1) * page_size).limit(page_size))
    documents = result.scalars().all()
    
    return {
        "tag": TagResponse.from_orm(tag),
        "documents": [
            {
                "id": doc.id,
                "filename": doc.filename,
                "original_filename": doc.original_filename,
                "document_type": doc.document_type,
                "status": doc.status,
                "created_at": doc.created_at,
                "file_size": doc.file_size
            }
            for doc in documents
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size
    }


# Document-Tag Association Endpoints
@router.post("/documents/{document_id}/tags/{tag_id}")
async def add_tag_to_document(
    document_id: int,
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add tag to document"""
    # Check if document exists and user has permission
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to tag this document"
        )
    
    # Check if tag exists
    query = select(Tag).where(Tag.id == tag_id)
    result = await db.execute(query)
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )
    
    # Check if association already exists
    existing_association = select(DocumentTag).where(
        and_(DocumentTag.document_id == document_id, DocumentTag.tag_id == tag_id)
    ).first()
    
    if existing_association:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document already has this tag"
        )
    
    # Create association
    document_tag = DocumentTag(
        document_id=document_id,
        tag_id=tag_id,
        created_by=current_user.id
    )
    
    db.add(document_tag)
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "document_tagged", "document", document_id,
        f"Added tag '{tag.name}' to document '{document.filename}'"
    )
    
    return {"message": "Tag added to document successfully"}


@router.delete("/documents/{document_id}/tags/{tag_id}")
async def remove_tag_from_document(
    document_id: int,
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove tag from document"""
    # Check if document exists and user has permission
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to modify tags on this document"
        )
    
    # Find and remove association
    document_tag = select(DocumentTag).where(
        and_(DocumentTag.document_id == document_id, DocumentTag.tag_id == tag_id)
    ).first()
    
    if not document_tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document does not have this tag"
        )
    
    query = select(Tag).where(Tag.id == tag_id)
    result = await db.execute(query)
    tag = result.scalar_one_or_none()
    
    await db.delete(document_tag)
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "document_untagged", "document", document_id,
        f"Removed tag '{tag.name if tag else tag_id}' from document '{document.filename}'"
    )
    
    return {"message": "Tag removed from document successfully"}


@router.get("/documents/{document_id}/tags", response_model=List[TagResponse])
async def get_document_tags(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all tags for a document"""
    # Check if document exists and user has permission
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view tags on this document"
        )
    
    # Get tags
    tags = select(Tag).join(DocumentTag).where(
        DocumentTag.document_id == document_id
    ).order_by(Tag.name).all()
    
    return [TagResponse.from_orm(tag) for tag in tags]


@router.post("/documents/{document_id}/tags/bulk")
async def bulk_add_tags_to_document(
    document_id: int,
    tag_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add multiple tags to document"""
    # Check if document exists and user has permission
    query = select(Document).where(Document.id == document_id)
    result = await db.execute(query)
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to tag this document"
        )
    
    # Verify all tags exist
    result = await db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
    existing_tags = result.scalars().all()
    if len(existing_tags) != len(tag_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more tags not found"
        )
    
    # Get existing associations
    existing_associations = select(DocumentTag.tag_id).where(
        and_(DocumentTag.document_id == document_id, DocumentTag.tag_id.in_(tag_ids))
    ).all()
    existing_tag_ids = {assoc[0] for assoc in existing_associations}
    
    # Create new associations
    new_associations = []
    added_tags = []
    
    for tag_id in tag_ids:
        if tag_id not in existing_tag_ids:
            new_associations.append(DocumentTag(
                document_id=document_id,
                tag_id=tag_id,
                created_by=current_user.id
            ))
            added_tags.append(tag_id)
    
    if new_associations:
        db.add_all(new_associations)
        await db.commit()
        
        # Log activity
        tag_names = [tag.name for tag in existing_tags if tag.id in added_tags]
        await auth_service._log_activity_async(
            db, current_user.id, "document_bulk_tagged", "document", document_id,
            f"Added tags {', '.join(tag_names)} to document '{document.filename}'"
        )
    
    return {
        "message": f"Added {len(new_associations)} new tags to document",
        "added_count": len(new_associations),
        "skipped_count": len(tag_ids) - len(new_associations)
    }