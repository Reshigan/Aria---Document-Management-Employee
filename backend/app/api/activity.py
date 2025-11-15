from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.comments_activity import CommentsActivityService
from backend.app.database import get_db
from backend.app.auth import get_current_user

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
        service = CommentsActivityService(db)
        activity = service.get_activity_feed(document_type, document_id)
        return {"activity": activity}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
