"""
Document Attachment System with OCR Classification
Provides file upload, storage, OCR processing, and classification
"""
from typing import Dict, Any, Optional, List
import uuid
import os
from datetime import datetime
from fastapi import UploadFile, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
import pytesseract
from PIL import Image
import io

class DocumentAttachmentService:
    """Service for managing document attachments with OCR"""
    
    UPLOAD_DIR = "/var/www/aria/uploads"
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    ALLOWED_MIME_TYPES = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/tiff",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
    
    CLASSIFICATIONS = {
        "invoice": ["invoice", "bill", "payment", "amount due", "total"],
        "receipt": ["receipt", "paid", "transaction", "payment received"],
        "contract": ["agreement", "contract", "terms", "party", "whereas"],
        "purchase_order": ["purchase order", "po number", "vendor", "ship to"],
        "delivery_note": ["delivery", "shipped", "tracking", "consignment"],
        "bank_statement": ["statement", "balance", "transaction", "bank"],
        "tax_document": ["tax", "vat", "gst", "tax invoice"],
        "other": []
    }
    
    @classmethod
    def upload_attachment(
        cls,
        db: Session,
        file: UploadFile,
        document_type: str,
        document_id: str,
        company_id: str,
        user_email: str
    ) -> Dict[str, Any]:
        """
        Upload and process a document attachment
        
        Args:
            db: Database session
            file: Uploaded file
            document_type: Type of parent document (sales_order, invoice, etc.)
            document_id: ID of parent document
            company_id: Company context
            user_email: Email of uploader
            
        Returns:
            Dict with attachment details
        """
        try:
            file.file.seek(0, 2)  # Seek to end
            file_size = file.file.tell()
            file.file.seek(0)  # Reset to beginning
            
            if file_size > cls.MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"File size exceeds maximum allowed size of {cls.MAX_FILE_SIZE / 1024 / 1024}MB"
                )
            
            if file.content_type not in cls.ALLOWED_MIME_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"File type {file.content_type} not allowed"
                )
            
            attachment_id = str(uuid.uuid4())
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{attachment_id}{file_extension}"
            
            company_dir = os.path.join(cls.UPLOAD_DIR, str(company_id))
            os.makedirs(company_dir, exist_ok=True)
            
            file_path = os.path.join(company_dir, unique_filename)
            
            with open(file_path, "wb") as f:
                f.write(file.file.read())
            
            ocr_text = None
            classification = "other"
            
            if file.content_type.startswith("image/"):
                ocr_text = cls._perform_ocr(file_path)
                classification = cls._classify_document(ocr_text)
            
            query = text("""
                INSERT INTO document_attachments (
                    id, company_id, document_type, document_id,
                    file_name, file_path, file_size, mime_type,
                    ocr_text, classification, uploaded_by, uploaded_at, created_at
                )
                VALUES (
                    :id, :company_id, :document_type, :document_id,
                    :file_name, :file_path, :file_size, :mime_type,
                    :ocr_text, :classification, :uploaded_by, NOW(), NOW()
                )
                RETURNING id, file_name, classification
            """)
            
            result = db.execute(query, {
                "id": attachment_id,
                "company_id": company_id,
                "document_type": document_type,
                "document_id": document_id,
                "file_name": file.filename,
                "file_path": file_path,
                "file_size": file_size,
                "mime_type": file.content_type,
                "ocr_text": ocr_text,
                "classification": classification,
                "uploaded_by": user_email
            }).fetchone()
            
            db.commit()
            
            return {
                "id": str(result[0]),
                "file_name": result[1],
                "classification": result[2],
                "file_size": file_size,
                "mime_type": file.content_type,
                "has_ocr": ocr_text is not None
            }
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to upload attachment: {str(e)}")
    
    @classmethod
    def _perform_ocr(cls, file_path: str) -> Optional[str]:
        """
        Perform OCR on an image file
        
        Args:
            file_path: Path to image file
            
        Returns:
            Extracted text or None if OCR fails
        """
        try:
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image)
            return text.strip() if text else None
        except Exception as e:
            print(f"OCR failed: {str(e)}")
            return None
    
    @classmethod
    def _classify_document(cls, ocr_text: Optional[str]) -> str:
        """
        Classify document based on OCR text
        
        Args:
            ocr_text: Extracted text from document
            
        Returns:
            Classification category
        """
        if not ocr_text:
            return "other"
        
        ocr_text_lower = ocr_text.lower()
        
        scores = {}
        for classification, keywords in cls.CLASSIFICATIONS.items():
            score = sum(1 for keyword in keywords if keyword in ocr_text_lower)
            scores[classification] = score
        
        best_classification = max(scores.items(), key=lambda x: x[1])
        
        return best_classification[0] if best_classification[1] > 0 else "other"
    
    @classmethod
    def get_attachments(
        cls,
        db: Session,
        document_type: str,
        document_id: str,
        company_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get all attachments for a document
        
        Args:
            db: Database session
            document_type: Type of parent document
            document_id: ID of parent document
            company_id: Company context
            
        Returns:
            List of attachments
        """
        try:
            query = text("""
                SELECT id, file_name, file_size, mime_type, classification,
                       uploaded_by, uploaded_at
                FROM document_attachments
                WHERE document_type = :document_type
                AND document_id = :document_id
                AND company_id = :company_id
                ORDER BY uploaded_at DESC
            """)
            
            result = db.execute(query, {
                "document_type": document_type,
                "document_id": document_id,
                "company_id": company_id
            })
            
            attachments = []
            for row in result:
                attachments.append({
                    "id": str(row[0]),
                    "file_name": row[1],
                    "file_size": row[2],
                    "mime_type": row[3],
                    "classification": row[4],
                    "uploaded_by": row[5],
                    "uploaded_at": row[6].isoformat() if row[6] else None
                })
            
            return attachments
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get attachments: {str(e)}")
    
    @classmethod
    def delete_attachment(
        cls,
        db: Session,
        attachment_id: str,
        company_id: str
    ) -> Dict[str, Any]:
        """
        Delete an attachment
        
        Args:
            db: Database session
            attachment_id: ID of attachment to delete
            company_id: Company context
            
        Returns:
            Success message
        """
        try:
            query = text("""
                SELECT file_path
                FROM document_attachments
                WHERE id = :attachment_id AND company_id = :company_id
            """)
            
            result = db.execute(query, {
                "attachment_id": attachment_id,
                "company_id": company_id
            }).fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail="Attachment not found")
            
            file_path = result[0]
            
            delete_query = text("""
                DELETE FROM document_attachments
                WHERE id = :attachment_id AND company_id = :company_id
            """)
            
            db.execute(delete_query, {
                "attachment_id": attachment_id,
                "company_id": company_id
            })
            
            db.commit()
            
            if os.path.exists(file_path):
                os.remove(file_path)
            
            return {"message": "Attachment deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to delete attachment: {str(e)}")
