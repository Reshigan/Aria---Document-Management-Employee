from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.core.approval_workflow import ApprovalWorkflow
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
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        result = ApprovalWorkflow.submit_for_approval(
            db=db,
            document_type=request.document_type,
            document_id=request.document_id,
            company_id=company_id,
            user_email=user_email
        )
        return result
    except HTTPException:
        raise
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
        company_id = current_user.get("company_id", "default")
        approver_email = current_user.get("email", "unknown")
        
        result = ApprovalWorkflow.approve_document(
            db=db,
            document_type=request.document_type,
            document_id=request.document_id,
            company_id=company_id,
            approver_email=approver_email,
            comments=request.comments
        )
        return result
    except HTTPException:
        raise
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
        company_id = current_user.get("company_id", "default")
        rejector_email = current_user.get("email", "unknown")
        
        result = ApprovalWorkflow.reject_document(
            db=db,
            document_type=request.document_type,
            document_id=request.document_id,
            company_id=company_id,
            rejector_email=rejector_email,
            reason=request.reason
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
