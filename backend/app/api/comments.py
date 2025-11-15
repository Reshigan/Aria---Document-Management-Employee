from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.core.comments_activity import CommentsActivityService
from backend.app.database import get_db
from backend.app.auth import get_current_user

router = APIRouter()


class CommentCreate(BaseModel):
    document_type: str
    document_id: str
    comment_text: str


@router.get("/{document_type}/{document_id}")
async def list_comments(
    document_type: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all comments for a document"""
    try:
        service = CommentsActivityService(db)
        comments = service.get_comments(document_type, document_id)
        return {"comments": comments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def add_comment(
    comment: CommentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a comment to a document"""
    try:
        service = CommentsActivityService(db)
        new_comment = service.add_comment(
            document_type=comment.document_type,
            document_id=comment.document_id,
            user_email=current_user.get("email", "unknown"),
            comment_text=comment.comment_text
        )
        return new_comment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a comment"""
    try:
        service = CommentsActivityService(db)
        service.delete_comment(comment_id)
        return {"message": "Comment deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
