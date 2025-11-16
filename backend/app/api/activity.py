from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
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


@router.get("/{document_type}/{document_id}")
async def get_activity(
    document_type: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get activity feed for a document"""
    try:
        company_id = current_user.get("company_id", "default")
        activity = CommentsActivityService.get_activity_feed(
            db=db,
            document_type=document_type,
            document_id=document_id,
            company_id=company_id
        )
        return {"activity": activity}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
