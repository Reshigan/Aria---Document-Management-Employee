"""
Document Sharing & Collaboration API Routes
"""
import secrets
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, select, delete

from core.database import get_db
from api.routes.auth_enhanced import get_current_user
from models import User, Document, ShareLink, DocumentShare, document_shares
from schemas.document import DocumentShareResponse, DocumentShareCreate
from schemas.advanced import ShareLinkResponse, ShareLinkCreate, ShareLinkCreateRequest, ShareLinkUpdate
from services.auth_service import auth_service
from api.routes.notifications import notify_document_shared

router = APIRouter(prefix="/sharing", tags=["sharing"])


@router.post("/documents/{document_id}/share", response_model=DocumentShareResponse)
async def share_document_with_user(
    document_id: int,
    share_data: DocumentShareCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Share document with specific user"""
    # Check if document exists and user has permission
    document_query = select(Document).where(Document.id == document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check permissions (owner or admin)
    if not current_user.is_superuser and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to share this document"
        )
    
    # Check if target user exists
    target_user_query = select(User).where(User.id == share_data.shared_with_user_id)
    target_user_result = await db.execute(target_user_query)
    target_user = target_user_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )
    
    # Check if already shared
    existing_share_query = select(DocumentShare).where(
        and_(
            DocumentShare.document_id == document_id,
            DocumentShare.shared_with_user_id == share_data.shared_with_user_id
        )
    )
    existing_share_result = await db.execute(existing_share_query)
    existing_share = existing_share_result.scalar_one_or_none()
    
    if existing_share:
        # Update existing share
        existing_share.can_view = share_data.can_view
        existing_share.can_edit = share_data.can_edit
        existing_share.can_download = share_data.can_download
        existing_share.expires_at = share_data.expires_at
        existing_share.message = share_data.message
        await db.commit()
        await db.refresh(existing_share)
        share = existing_share
    else:
        # Create new share
        share = DocumentShare(
            document_id=document_id,
            shared_by_user_id=current_user.id,
            shared_with_user_id=share_data.shared_with_user_id,
            can_view=share_data.can_view,
            can_edit=share_data.can_edit,
            can_download=share_data.can_download,
            expires_at=share_data.expires_at,
            message=share_data.message
        )
        db.add(share)
        await db.commit()
        await db.refresh(share)
    
    # Send notification
    # await notify_document_shared(db, document_id, share_data.shared_with_user_id, current_user.id)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "document_shared", "document", document_id,
        f"Shared document '{document.original_filename}' with {target_user.username}"
    )
    
    return DocumentShareResponse.model_validate(share)


@router.get("/documents/{document_id}/shares", response_model=List[DocumentShareResponse])
async def list_document_shares(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all shares for a document"""
    # Check if document exists and user has permission
    document_query = select(Document).where(Document.id == document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check permissions (owner or admin)
    if not current_user.is_superuser and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view shares for this document"
        )
    
    shares_query = select(DocumentShare).where(DocumentShare.document_id == document_id)
    shares_result = await db.execute(shares_query)
    shares = shares_result.scalars().all()
    
    return [DocumentShareResponse.model_validate(share) for share in shares]


@router.delete("/documents/{document_id}/shares/{share_id}")
async def revoke_document_share(
    document_id: int,
    share_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Revoke document share"""
    # Check if document exists and user has permission
    document_query = select(Document).where(Document.id == document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check permissions (owner or admin)
    if not current_user.is_superuser and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to revoke shares for this document"
        )
    
    # Find and delete share
    share_query = select(DocumentShare).where(
        and_(
            DocumentShare.id == share_id,
            DocumentShare.document_id == document_id
        )
    )
    share_result = await db.execute(share_query)
    share = share_result.scalar_one_or_none()
    
    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )
    
    shared_with_user_query = select(User).where(User.id == share.shared_with_user_id)
    shared_with_user_result = await db.execute(shared_with_user_query)
    shared_with_user = shared_with_user_result.scalar_one_or_none()
    
    await db.delete(share)
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "document_share_revoked", "document", document_id,
        f"Revoked share of '{document.original_filename}' from {shared_with_user.username if shared_with_user else 'unknown user'}"
    )
    
    return {"message": "Document share revoked successfully"}


@router.get("/shared-with-me")
async def list_documents_shared_with_me(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List documents shared with current user"""
    from sqlalchemy import func
    
    # Count total documents shared with user
    count_query = select(func.count(Document.id)).join(DocumentShare).where(
        and_(
            DocumentShare.shared_with_user_id == current_user.id,
            DocumentShare.can_view == True,
            or_(
                DocumentShare.expires_at.is_(None),
                DocumentShare.expires_at > datetime.utcnow()
            )
        )
    )
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    # Get documents with share info
    query = select(Document, DocumentShare).join(DocumentShare).where(
        and_(
            DocumentShare.shared_with_user_id == current_user.id,
            DocumentShare.can_view == True,
            or_(
                DocumentShare.expires_at.is_(None),
                DocumentShare.expires_at > datetime.utcnow()
            )
        )
    ).order_by(DocumentShare.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size)
    
    result = await db.execute(query)
    doc_share_pairs = result.all()
    
    # Build response with share info
    items = []
    for doc, share in doc_share_pairs:
        shared_by_user_query = select(User).where(User.id == share.shared_by_user_id)
        shared_by_user_result = await db.execute(shared_by_user_query)
        shared_by_user = shared_by_user_result.scalar_one_or_none()
        
        items.append({
            "id": doc.id,
            "filename": doc.filename,
            "original_filename": doc.original_filename,
            "document_type": doc.document_type,
            "status": doc.status,
            "file_size": doc.file_size,
            "created_at": doc.created_at,
            "shared_by": shared_by_user.username if shared_by_user else None,
            "shared_at": share.created_at,
            "can_edit": share.can_edit,
            "can_download": share.can_download,
            "expires_at": share.expires_at,
            "message": share.message
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size
    }


@router.post("/documents/{document_id}/share-links", response_model=ShareLinkResponse)
async def create_share_link(
    document_id: int,
    link_data: ShareLinkCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a shareable link for document"""
    # Check if document exists and user has permission
    document_query = select(Document).where(Document.id == document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check permissions (owner or admin)
    if not current_user.is_superuser and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to create share links for this document"
        )
    
    # Generate unique token
    token = secrets.token_urlsafe(32)
    
    # Create share link
    share_link = ShareLink(
        document_id=document_id,
        created_by=current_user.id,
        token=token,
        link_type=link_data.link_type,
        can_view=link_data.can_view,
        can_download=link_data.can_download,
        can_comment=link_data.can_comment,
        password_hash=auth_service.get_password_hash(link_data.password) if link_data.password else None,
        expires_at=link_data.expires_at,
        max_downloads=link_data.max_downloads,
        is_active=True
    )
    
    db.add(share_link)
    await db.commit()
    await db.refresh(share_link)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "share_link_created", "document", document_id,
        f"Created share link for document '{document.original_filename}'"
    )
    
    return ShareLinkResponse.model_validate(share_link)


@router.get("/documents/{document_id}/share-links", response_model=List[ShareLinkResponse])
async def list_share_links(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List share links for document"""
    # Check if document exists and user has permission
    document_query = select(Document).where(Document.id == document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check permissions (owner or admin)
    if not current_user.is_superuser and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view share links for this document"
        )
    
    share_links_query = select(ShareLink).where(
        ShareLink.document_id == document_id
    ).order_by(ShareLink.created_at.desc())
    share_links_result = await db.execute(share_links_query)
    share_links = share_links_result.scalars().all()
    
    return [ShareLinkResponse.model_validate(link) for link in share_links]


@router.put("/share-links/{link_id}", response_model=ShareLinkResponse)
async def update_share_link(
    link_id: int,
    link_data: ShareLinkUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update share link"""
    share_link_query = select(ShareLink).where(ShareLink.id == link_id)
    share_link_result = await db.execute(share_link_query)
    share_link = share_link_result.scalar_one_or_none()
    if not share_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found"
        )
    
    # Check permissions (creator or admin)
    if not current_user.is_superuser and share_link.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to modify this share link"
        )
    
    # Update fields
    update_data = link_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "password" and value:
            share_link.password_hash = auth_service.get_password_hash(value)
            share_link.requires_password = True
        elif hasattr(share_link, field):
            setattr(share_link, field, value)
    
    await db.commit()
    await db.refresh(share_link)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "share_link_updated", "share_link", link_id,
        f"Updated share link: {share_link.name}"
    )
    
    return ShareLinkResponse.model_validate(share_link)


@router.delete("/share-links/{link_id}")
async def delete_share_link(
    link_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete share link"""
    share_link_query = select(ShareLink).where(ShareLink.id == link_id)
    share_link_result = await db.execute(share_link_query)
    share_link = share_link_result.scalar_one_or_none()
    if not share_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found"
        )
    
    # Check permissions (creator or admin)
    if not current_user.is_superuser and share_link.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to delete this share link"
        )
    
    await db.delete(share_link)
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "share_link_deleted", "share_link", link_id,
        f"Deleted share link: {share_link.name}"
    )
    
    return {"message": "Share link deleted successfully"}


@router.get("/links/{token}")
async def access_shared_document(
    token: str,
    password: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Access document via share link"""
    share_link_query = select(ShareLink).where(
        and_(
            ShareLink.token == token,
            ShareLink.is_active == True,
            or_(
                ShareLink.expires_at.is_(None),
                ShareLink.expires_at > datetime.utcnow()
            )
        )
    )
    share_link_result = await db.execute(share_link_query)
    share_link = share_link_result.scalar_one_or_none()
    
    if not share_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found or expired"
        )
    
    # Check password if required
    if share_link.requires_password:
        if not password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Password required"
            )
        
        if not auth_service.verify_password(password, share_link.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password"
            )
    
    # Check download limit
    if share_link.max_downloads and share_link.download_count >= share_link.max_downloads:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Download limit exceeded"
        )
    
    # Get document
    document_query = select(Document).where(Document.id == share_link.document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Update access count
    share_link.access_count += 1
    share_link.last_accessed_at = datetime.utcnow()
    await db.commit()
    
    return {
        "document": {
            "id": document.id,
            "filename": document.filename,
            "original_filename": document.original_filename,
            "document_type": document.document_type,
            "file_size": document.file_size,
            "mime_type": document.mime_type,
            "created_at": document.created_at
        },
        "permissions": {
            "can_view": share_link.can_view,
            "can_download": share_link.can_download
        },
        "share_info": {
            "name": share_link.name,
            "description": share_link.description,
            "expires_at": share_link.expires_at,
            "access_count": share_link.access_count,
            "download_count": share_link.download_count
        }
    }


@router.post("/links/{token}/download")
async def download_via_share_link(
    token: str,
    password: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Download document via share link"""
    share_link_query = select(ShareLink).where(
        and_(
            ShareLink.token == token,
            ShareLink.is_active == True,
            ShareLink.can_download == True,
            or_(
                ShareLink.expires_at.is_(None),
                ShareLink.expires_at > datetime.utcnow()
            )
        )
    )
    share_link_result = await db.execute(share_link_query)
    share_link = share_link_result.scalar_one_or_none()
    
    if not share_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found, expired, or download not allowed"
        )
    
    # Check password if required
    if share_link.requires_password:
        if not password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Password required"
            )
        
        if not auth_service.verify_password(password, share_link.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password"
            )
    
    # Check download limit
    if share_link.max_downloads and share_link.download_count >= share_link.max_downloads:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Download limit exceeded"
        )
    
    # Update download count
    share_link.download_count += 1
    share_link.last_accessed_at = datetime.utcnow()
    await db.commit()
    
    # Get document
    document_query = select(Document).where(Document.id == share_link.document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Return download info (actual file serving would be handled by file server)
    return {
        "message": "Download authorized",
        "document_id": document.id,
        "filename": document.original_filename,
        "file_path": document.file_path,
        "download_count": share_link.download_count
    }


@router.get("/analytics/links")
async def get_share_link_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get share link analytics"""
    from sqlalchemy import func
    since_date = datetime.utcnow() - timedelta(days=days)
    
    # Base filter for user's share links
    if current_user.is_superuser:
        link_filter = True
    else:
        link_filter = ShareLink.created_by == current_user.id
    
    # Total share links
    total_links_query = select(func.count(ShareLink.id)).where(link_filter)
    total_links_result = await db.execute(total_links_query)
    total_links = total_links_result.scalar()
    
    active_links_query = select(func.count(ShareLink.id)).where(
        and_(link_filter, ShareLink.is_active == True)
    )
    active_links_result = await db.execute(active_links_query)
    active_links = active_links_result.scalar()
    
    # Access statistics
    total_accesses_query = select(func.sum(ShareLink.access_count)).where(link_filter)
    total_accesses_result = await db.execute(total_accesses_query)
    total_accesses = total_accesses_result.scalar() or 0
    
    total_downloads_query = select(func.sum(ShareLink.download_count)).where(link_filter)
    total_downloads_result = await db.execute(total_downloads_query)
    total_downloads = total_downloads_result.scalar() or 0
    
    # Recent activity
    recent_accesses_query = select(func.count(ShareLink.id)).where(
        and_(
            link_filter,
            ShareLink.last_accessed_at >= since_date
        )
    )
    recent_accesses_result = await db.execute(recent_accesses_query)
    recent_accesses = recent_accesses_result.scalar()
    
    # Most accessed links
    top_links_query = select(ShareLink).where(link_filter).order_by(
        ShareLink.access_count.desc()
    ).limit(10)
    top_links_result = await db.execute(top_links_query)
    top_links = top_links_result.scalars().all()
    
    return {
        "period_days": days,
        "total_links": total_links,
        "active_links": active_links,
        "total_accesses": total_accesses,
        "total_downloads": total_downloads,
        "recent_accesses": recent_accesses,
        "top_links": [
            {
                "id": link.id,
                "name": link.name,
                "access_count": link.access_count,
                "download_count": link.download_count,
                "created_at": link.created_at,
                "last_accessed_at": link.last_accessed_at
            }
            for link in top_links
        ]
    }