from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import io

from backend.core.document_attachments import AttachmentService
from backend.app.database import get_db
from backend.app.auth import get_current_user

router = APIRouter()


@router.get("/{document_type}/{document_id}")
async def list_attachments(
    document_type: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all attachments for a document"""
    try:
        service = AttachmentService(db)
        attachments = service.list_attachments(document_type, document_id)
        return {"attachments": attachments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    document_id: str = Form(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file attachment for a document"""
    try:
        service = AttachmentService(db)
        
        file_content = await file.read()
        
        attachment = service.upload_attachment(
            document_type=document_type,
            document_id=document_id,
            file_name=file.filename or "unnamed",
            file_content=file_content,
            uploaded_by=current_user.get("email", "unknown")
        )
        
        return {
            "id": str(attachment["id"]),
            "file_name": attachment["file_name"],
            "file_size": attachment["file_size"],
            "classification": attachment["classification"],
            "uploaded_at": attachment["uploaded_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{attachment_id}/download")
async def download_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Download an attachment file"""
    try:
        service = AttachmentService(db)
        file_data = service.download_attachment(attachment_id)
        
        return StreamingResponse(
            io.BytesIO(file_data["file_content"]),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{file_data["file_name"]}"'
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{attachment_id}")
async def delete_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete an attachment"""
    try:
        service = AttachmentService(db)
        service.delete_attachment(attachment_id)
        return {"message": "Attachment deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
