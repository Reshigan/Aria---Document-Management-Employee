from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
import io

from backend.core.batch_operations import BatchOperationsService
from backend.app.database import get_db
from backend.app.auth import get_current_user

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
        service = BatchOperationsService(db)
        result = service.bulk_approve(
            document_type=request.document_type,
            document_ids=request.document_ids,
            approved_by=current_user.get("email", "unknown")
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
        service = BatchOperationsService(db)
        result = service.bulk_post(
            document_type=request.document_type,
            document_ids=request.document_ids,
            posted_by=current_user.get("email", "unknown")
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
        service = BatchOperationsService(db)
        result = service.bulk_delete(
            document_type=request.document_type,
            document_ids=request.document_ids
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
        service = BatchOperationsService(db)
        csv_content = service.bulk_export(
            document_type=request.document_type,
            document_ids=request.document_ids,
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
