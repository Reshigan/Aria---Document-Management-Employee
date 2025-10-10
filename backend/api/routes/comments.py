"""
Document Comments & Collaboration API Routes
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, select, delete, func

from core.database import get_db
from api.routes.auth_enhanced import get_current_user
from models import User, Document, Comment
from schemas.advanced import CommentResponse, CommentCreate, CommentUpdate
from services.auth_service import auth_service

router = APIRouter(prefix="/comments", tags=["comments"])


@router.post("/documents/{document_id}/comments", response_model=CommentResponse)
async def create_comment(
    document_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new comment on a document"""
    # Check if document exists and user has access
    document_query = select(Document).where(Document.id == document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if user has permission to comment (document owner, shared with user, or admin)
    if not current_user.is_superuser and document.uploaded_by != current_user.id:
        # Check if document is shared with user with comment permission
        from models.advanced import DocumentShare
        share_query = select(DocumentShare).where(
            and_(
                DocumentShare.document_id == document_id,
                DocumentShare.shared_with_user_id == current_user.id,
                DocumentShare.can_view == True,
                or_(
                    DocumentShare.expires_at.is_(None),
                    DocumentShare.expires_at > datetime.utcnow()
                )
            )
        )
        share_result = await db.execute(share_query)
        share = share_result.scalar_one_or_none()
        
        if not share:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to comment on this document"
            )
    
    # If replying to a comment, check if parent exists
    if comment_data.parent_id:
        parent_query = select(Comment).where(
            and_(
                Comment.id == comment_data.parent_id,
                Comment.document_id == document_id
            )
        )
        parent_result = await db.execute(parent_query)
        parent = parent_result.scalar_one_or_none()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent comment not found"
            )
    
    # Create comment
    comment = Comment(
        document_id=document_id,
        parent_id=comment_data.parent_id,
        content=comment_data.content,
        page_number=comment_data.page_number,
        x_position=comment_data.x_position,
        y_position=comment_data.y_position,
        author=current_user.id
    )
    
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "comment_added", "document", document_id,
        f"Added comment to document '{document.original_filename}'"
    )
    
    # Create notification for document owner (if not the commenter)
    if document.uploaded_by != current_user.id:
        from models.advanced import Notification, NotificationType
        notification = Notification(
            user_id=document.uploaded_by,
            type=NotificationType.COMMENT_ADDED,
            title="New Comment Added",
            message=f"{current_user.username} commented on '{document.original_filename}'",
            document_id=document_id,
            comment_id=comment.id
        )
        db.add(notification)
        await db.commit()
    
    # Get comment with author info for response
    comment_with_author = await get_comment_with_author(db, comment.id)
    return comment_with_author


@router.get("/documents/{document_id}/comments", response_model=List[CommentResponse])
async def list_document_comments(
    document_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    include_resolved: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List comments for a document"""
    # Check if document exists and user has access
    document_query = select(Document).where(Document.id == document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if user has permission to view comments
    if not current_user.is_superuser and document.uploaded_by != current_user.id:
        # Check if document is shared with user
        from models.advanced import DocumentShare
        share_query = select(DocumentShare).where(
            and_(
                DocumentShare.document_id == document_id,
                DocumentShare.shared_with_user_id == current_user.id,
                DocumentShare.can_view == True,
                or_(
                    DocumentShare.expires_at.is_(None),
                    DocumentShare.expires_at > datetime.utcnow()
                )
            )
        )
        share_result = await db.execute(share_query)
        share = share_result.scalar_one_or_none()
        
        if not share:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to view comments on this document"
            )
    
    # Build query
    query = select(Comment).where(Comment.document_id == document_id)
    
    if not include_resolved:
        query = query.where(Comment.is_resolved == False)
    
    # Only get top-level comments (replies will be nested)
    query = query.where(Comment.parent_id.is_(None))
    query = query.order_by(Comment.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    comments = result.scalars().all()
    
    # Get comments with author info and replies
    comment_responses = []
    for comment in comments:
        comment_with_replies = await get_comment_with_replies(db, comment.id)
        comment_responses.append(comment_with_replies)
    
    return comment_responses


@router.put("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a comment"""
    # Find comment
    comment_query = select(Comment).where(Comment.id == comment_id)
    comment_result = await db.execute(comment_query)
    comment = comment_result.scalar_one_or_none()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check permissions (author or admin)
    if not current_user.is_superuser and comment.author != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to update this comment"
        )
    
    # Update fields
    update_data = comment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(comment, field):
            setattr(comment, field, value)
    
    comment.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(comment)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "comment_updated", "comment", comment_id,
        f"Updated comment on document ID {comment.document_id}"
    )
    
    # Get comment with author info for response
    comment_with_author = await get_comment_with_author(db, comment.id)
    return comment_with_author


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a comment"""
    # Find comment
    comment_query = select(Comment).where(Comment.id == comment_id)
    comment_result = await db.execute(comment_query)
    comment = comment_result.scalar_one_or_none()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check permissions (author or admin)
    if not current_user.is_superuser and comment.author != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to delete this comment"
        )
    
    document_id = comment.document_id
    
    # Delete comment and its replies
    await delete_comment_and_replies(db, comment_id)
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "comment_deleted", "comment", comment_id,
        f"Deleted comment from document ID {document_id}"
    )
    
    return {"message": "Comment deleted successfully"}


@router.post("/comments/{comment_id}/resolve")
async def resolve_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a comment as resolved"""
    # Find comment
    comment_query = select(Comment).where(Comment.id == comment_id)
    comment_result = await db.execute(comment_query)
    comment = comment_result.scalar_one_or_none()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check if user has permission (document owner, comment author, or admin)
    document_query = select(Document).where(Document.id == comment.document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    
    if not current_user.is_superuser and document.uploaded_by != current_user.id and comment.author != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to resolve this comment"
        )
    
    comment.is_resolved = True
    comment.updated_at = datetime.utcnow()
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "comment_resolved", "comment", comment_id,
        f"Resolved comment on document '{document.original_filename}'"
    )
    
    return {"message": "Comment resolved successfully"}


@router.post("/comments/{comment_id}/unresolve")
async def unresolve_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a comment as unresolved"""
    # Find comment
    comment_query = select(Comment).where(Comment.id == comment_id)
    comment_result = await db.execute(comment_query)
    comment = comment_result.scalar_one_or_none()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check if user has permission (document owner, comment author, or admin)
    document_query = select(Document).where(Document.id == comment.document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    
    if not current_user.is_superuser and document.uploaded_by != current_user.id and comment.author != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to unresolve this comment"
        )
    
    comment.is_resolved = False
    comment.updated_at = datetime.utcnow()
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "comment_unresolved", "comment", comment_id,
        f"Unresolved comment on document '{document.original_filename}'"
    )
    
    return {"message": "Comment unresolved successfully"}


# Helper functions
async def get_comment_with_author(db: AsyncSession, comment_id: int) -> CommentResponse:
    """Get comment with author information"""
    comment_query = select(Comment).where(Comment.id == comment_id)
    comment_result = await db.execute(comment_query)
    comment = comment_result.scalar_one_or_none()
    
    if not comment:
        return None
    
    # Get author info
    author_query = select(User).where(User.id == comment.author)
    author_result = await db.execute(author_query)
    author = author_result.scalar_one_or_none()
    
    comment_dict = {
        "id": comment.id,
        "document_id": comment.document_id,
        "parent_id": comment.parent_id,
        "content": comment.content,
        "is_resolved": comment.is_resolved,
        "page_number": comment.page_number,
        "x_position": comment.x_position,
        "y_position": comment.y_position,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
        "author": comment.author,
        "author_name": author.username if author else None,
        "replies": []
    }
    
    return CommentResponse(**comment_dict)


async def get_comment_with_replies(db: AsyncSession, comment_id: int) -> CommentResponse:
    """Get comment with nested replies"""
    comment_response = await get_comment_with_author(db, comment_id)
    if not comment_response:
        return None
    
    # Get replies
    replies_query = select(Comment).where(Comment.parent_id == comment_id).order_by(Comment.created_at.asc())
    replies_result = await db.execute(replies_query)
    replies = replies_result.scalars().all()
    
    reply_responses = []
    for reply in replies:
        reply_response = await get_comment_with_author(db, reply.id)
        if reply_response:
            reply_responses.append(reply_response)
    
    comment_response.replies = reply_responses
    return comment_response


async def delete_comment_and_replies(db: AsyncSession, comment_id: int):
    """Recursively delete comment and all its replies"""
    # Get all replies
    replies_query = select(Comment).where(Comment.parent_id == comment_id)
    replies_result = await db.execute(replies_query)
    replies = replies_result.scalars().all()
    
    # Delete replies recursively
    for reply in replies:
        await delete_comment_and_replies(db, reply.id)
    
    # Delete the comment itself
    comment_query = select(Comment).where(Comment.id == comment_id)
    comment_result = await db.execute(comment_query)
    comment = comment_result.scalar_one_or_none()
    if comment:
        await db.delete(comment)