from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from core.comments_activity import CommentsActivityService
from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

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
        company_id = current_user.get("company_id", "default")
        comments = CommentsActivityService.get_comments(
            db=db,
            document_type=document_type,
            document_id=document_id,
            company_id=company_id
        )
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
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        new_comment = CommentsActivityService.add_comment(
            db=db,
            document_type=comment.document_type,
            document_id=comment.document_id,
            company_id=company_id,
            user_email=user_email,
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
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        result = CommentsActivityService.delete_comment(
            db=db,
            comment_id=comment_id,
            company_id=company_id,
            user_email=user_email
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
