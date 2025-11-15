from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.core.approval_workflow import ApprovalWorkflowService
from backend.app.database import get_db
from backend.app.auth import get_current_user

router = APIRouter()


class ApprovalSubmit(BaseModel):
    document_type: str
    document_id: str


class ApprovalApprove(BaseModel):
    document_type: str
    document_id: str
    comments: str


class ApprovalReject(BaseModel):
    document_type: str
    document_id: str
    reason: str


@router.post("/submit")
async def submit_for_approval(
    request: ApprovalSubmit,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Submit a document for approval"""
    try:
        service = ApprovalWorkflowService(db)
        result = service.submit_for_approval(
            document_type=request.document_type,
            document_id=request.document_id,
            submitted_by=current_user.get("email", "unknown")
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approve")
async def approve_document(
    request: ApprovalApprove,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Approve a document"""
    try:
        service = ApprovalWorkflowService(db)
        result = service.approve(
            document_type=request.document_type,
            document_id=request.document_id,
            approved_by=current_user.get("email", "unknown"),
            comments=request.comments
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reject")
async def reject_document(
    request: ApprovalReject,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Reject a document"""
    try:
        service = ApprovalWorkflowService(db)
        result = service.reject(
            document_type=request.document_type,
            document_id=request.document_id,
            rejected_by=current_user.get("email", "unknown"),
            reason=request.reason
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
