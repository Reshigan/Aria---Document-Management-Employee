from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
import io
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from core.batch_operations import BatchOperations
from core.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class BatchRequest(BaseModel):
    document_type: str
    document_ids: List[str]


class BatchExportRequest(BaseModel):
    document_type: str
    document_ids: List[str]
    export_format: str = "csv"


@router.post("/approve")
async def batch_approve(
    request: BatchRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Bulk approve documents"""
    try:
        company_id = current_user.get("company_id", "default")
        approver_email = current_user.get("email", "unknown")
        
        result = BatchOperations.bulk_approve(
            db=db,
            document_type=request.document_type,
            document_ids=request.document_ids,
            company_id=company_id,
            approver_email=approver_email
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/post")
async def batch_post(
    request: BatchRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Bulk post documents"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        result = BatchOperations.bulk_post(
            db=db,
            document_type=request.document_type,
            document_ids=request.document_ids,
            company_id=company_id,
            user_email=user_email
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete")
async def batch_delete(
    request: BatchRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Bulk delete documents"""
    try:
        company_id = current_user.get("company_id", "default")
        
        result = BatchOperations.bulk_delete(
            db=db,
            document_type=request.document_type,
            document_ids=request.document_ids,
            company_id=company_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export")
async def batch_export(
    request: BatchExportRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Bulk export documents to CSV"""
    try:
        company_id = current_user.get("company_id", "default")
        
        csv_content = BatchOperations.bulk_export(
            db=db,
            document_type=request.document_type,
            document_ids=request.document_ids,
            company_id=company_id,
            export_format=request.export_format
        )
        
        return StreamingResponse(
            io.BytesIO(csv_content.encode('utf-8')),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{request.document_type}_export.csv"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
