from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import io
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from core.document_attachments import DocumentAttachmentService
from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

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
        company_id = current_user.get("company_id", "default")
        attachments = DocumentAttachmentService.get_attachments(
            db=db,
            document_type=document_type,
            document_id=document_id,
            company_id=company_id
        )
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
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        attachment = DocumentAttachmentService.upload_attachment(
            db=db,
            file=file,
            document_type=document_type,
            document_id=document_id,
            company_id=company_id,
            user_email=user_email
        )
        
        return {
            "id": str(attachment["id"]),
            "file_name": attachment["file_name"],
            "file_size": attachment["file_size"],
            "classification": attachment["classification"],
            "has_ocr": attachment.get("has_ocr", False)
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
        company_id = current_user.get("company_id", "default")
        
        from sqlalchemy import text
        query = text("""
            SELECT file_path, file_name, mime_type
            FROM document_attachments
            WHERE id = :attachment_id AND company_id = :company_id
        """)
        
        result = db.execute(query, {
            "attachment_id": attachment_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Attachment not found")
        
        file_path, file_name, mime_type = result
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on disk")
        
        with open(file_path, "rb") as f:
            file_content = f.read()
        
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=mime_type or "application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{file_name}"'
            }
        )
    except HTTPException:
        raise
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
        company_id = current_user.get("company_id", "default")
        result = DocumentAttachmentService.delete_attachment(
            db=db,
            attachment_id=attachment_id,
            company_id=company_id
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
