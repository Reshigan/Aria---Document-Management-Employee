"""
Enhanced Document Processing API Routes
Handles document upload, OCR, and AI analysis
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import logging
import os
import uuid
import shutil
from datetime import datetime
import asyncio
import json

# OCR and AI processing imports
try:
    import pytesseract
    from PIL import Image
    import pdf2image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logging.warning("Tesseract OCR not available. Install pytesseract and tesseract-ocr for full functionality.")

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Document Processing"])

# Document storage configuration
UPLOAD_DIR = "/opt/aria/uploads"
PROCESSED_DIR = "/opt/aria/processed"

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

class DocumentUploadResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    content_type: str
    upload_time: str
    status: str

class OCRRequest(BaseModel):
    document_id: str
    language: Optional[str] = "eng"
    enhance_image: Optional[bool] = True

class OCRResponse(BaseModel):
    document_id: str
    text: str
    confidence: float
    processing_time: float
    extracted_data: Dict[str, Any]
    status: str

class DocumentAnalysisResponse(BaseModel):
    document_id: str
    document_type: str
    key_fields: Dict[str, Any]
    entities: List[Dict[str, Any]]
    confidence_score: float
    analysis_time: float

# Supported file types
SUPPORTED_TYPES = {
    "application/pdf": [".pdf"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/tiff": [".tiff", ".tif"],
    "image/bmp": [".bmp"]
}

def get_file_extension(content_type: str) -> str:
    """Get appropriate file extension for content type"""
    extensions = SUPPORTED_TYPES.get(content_type, [".bin"])
    return extensions[0]

def is_supported_file(content_type: str) -> bool:
    """Check if file type is supported"""
    return content_type in SUPPORTED_TYPES

async def perform_ocr(file_path: str, language: str = "eng", enhance: bool = True) -> Dict[str, Any]:
    """
    Perform OCR on document using Tesseract
    """
    if not TESSERACT_AVAILABLE:
        return {
            "text": "OCR not available - Tesseract not installed",
            "confidence": 0.0,
            "processing_time": 0.0,
            "error": "Tesseract OCR not available"
        }
    
    start_time = datetime.now()
    
    try:
        # Handle PDF files
        if file_path.lower().endswith('.pdf'):
            # Convert PDF to images
            images = pdf2image.convert_from_path(file_path)
            all_text = []
            total_confidence = 0.0
            
            for i, image in enumerate(images):
                # Enhance image if requested
                if enhance:
                    # Basic image enhancement
                    image = image.convert('L')  # Convert to grayscale
                    # You can add more enhancement here
                
                # Perform OCR with detailed data
                ocr_data = pytesseract.image_to_data(image, lang=language, output_type=pytesseract.Output.DICT)
                page_text = pytesseract.image_to_string(image, lang=language)
                
                all_text.append(page_text)
                
                # Calculate confidence
                confidences = [int(conf) for conf in ocr_data['conf'] if int(conf) > 0]
                if confidences:
                    total_confidence += sum(confidences) / len(confidences)
            
            text = '\n\n--- PAGE BREAK ---\n\n'.join(all_text)
            avg_confidence = total_confidence / len(images) if images else 0.0
            
        else:
            # Handle image files
            image = Image.open(file_path)
            
            # Enhance image if requested
            if enhance:
                image = image.convert('L')  # Convert to grayscale
                # Add more enhancement techniques here
            
            # Perform OCR with detailed data
            ocr_data = pytesseract.image_to_data(image, lang=language, output_type=pytesseract.Output.DICT)
            text = pytesseract.image_to_string(image, lang=language)
            
            # Calculate confidence
            confidences = [int(conf) for conf in ocr_data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return {
            "text": text.strip(),
            "confidence": round(avg_confidence, 2),
            "processing_time": round(processing_time, 2),
            "word_count": len(text.split()),
            "character_count": len(text)
        }
        
    except Exception as e:
        logger.error(f"OCR processing failed: {str(e)}")
        return {
            "text": "",
            "confidence": 0.0,
            "processing_time": 0.0,
            "error": str(e)
        }

async def analyze_document_content(text: str, filename: str) -> Dict[str, Any]:
    """
    Analyze document content to extract key information
    This would use AI/ML models in production
    """
    analysis = {
        "document_type": "unknown",
        "key_fields": {},
        "entities": [],
        "confidence_score": 0.0
    }
    
    text_lower = text.lower()
    
    # Simple document type detection
    if any(word in text_lower for word in ['invoice', 'bill', 'payment', 'amount due']):
        analysis["document_type"] = "invoice"
        analysis["confidence_score"] = 0.8
        
        # Extract invoice-specific fields
        import re
        
        # Extract amounts
        amount_patterns = [
            r'total[:\s]*[\$\s]*([0-9,]+\.?[0-9]*)',
            r'amount[:\s]*[\$\s]*([0-9,]+\.?[0-9]*)',
            r'due[:\s]*[\$\s]*([0-9,]+\.?[0-9]*)'
        ]
        
        for pattern in amount_patterns:
            matches = re.findall(pattern, text_lower)
            if matches:
                try:
                    amount = float(matches[0].replace(',', ''))
                    analysis["key_fields"]["total_amount"] = amount
                    break
                except ValueError:
                    pass
        
        # Extract dates
        date_patterns = [
            r'date[:\s]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})',
            r'([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})'
        ]
        
        for pattern in date_patterns:
            matches = re.findall(pattern, text)
            if matches:
                analysis["key_fields"]["date"] = matches[0]
                break
        
        # Extract invoice number
        invoice_patterns = [
            r'invoice[:\s#]*([A-Z0-9-]+)',
            r'inv[:\s#]*([A-Z0-9-]+)',
            r'#([A-Z0-9-]+)'
        ]
        
        for pattern in invoice_patterns:
            matches = re.findall(pattern, text_lower)
            if matches:
                analysis["key_fields"]["invoice_number"] = matches[0].upper()
                break
    
    elif any(word in text_lower for word in ['receipt', 'purchase', 'transaction']):
        analysis["document_type"] = "receipt"
        analysis["confidence_score"] = 0.7
    
    elif any(word in text_lower for word in ['contract', 'agreement', 'terms']):
        analysis["document_type"] = "contract"
        analysis["confidence_score"] = 0.6
    
    # Extract entities (simplified)
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if line:
            # Look for email addresses
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            emails = re.findall(email_pattern, line)
            for email in emails:
                analysis["entities"].append({
                    "type": "email",
                    "value": email,
                    "confidence": 0.9
                })
            
            # Look for phone numbers
            phone_pattern = r'[\+]?[1-9]?[0-9]{7,15}'
            phones = re.findall(phone_pattern, line)
            for phone in phones:
                if len(phone) >= 10:  # Valid phone number length
                    analysis["entities"].append({
                        "type": "phone",
                        "value": phone,
                        "confidence": 0.7
                    })
    
    return analysis

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a document for processing
    """
    try:
        # Validate file type
        if not is_supported_file(file.content_type):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}. Supported types: {list(SUPPORTED_TYPES.keys())}"
            )
        
        # Generate unique document ID
        document_id = str(uuid.uuid4())
        
        # Get file extension
        file_extension = get_file_extension(file.content_type)
        
        # Create file path
        filename = f"{document_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        logger.info(f"Document uploaded: {document_id} ({file.filename})")
        
        return DocumentUploadResponse(
            id=document_id,
            filename=file.filename,
            file_size=file_size,
            content_type=file.content_type,
            upload_time=datetime.now().isoformat(),
            status="uploaded"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document upload failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )

@router.post("/ocr", response_model=OCRResponse)
async def process_document_ocr(request: OCRRequest):
    """
    Perform OCR processing on uploaded document
    """
    try:
        # Find uploaded file
        file_extension = None
        file_path = None
        
        for ext in ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp']:
            potential_path = os.path.join(UPLOAD_DIR, f"{request.document_id}{ext}")
            if os.path.exists(potential_path):
                file_path = potential_path
                file_extension = ext
                break
        
        if not file_path:
            raise HTTPException(
                status_code=404,
                detail=f"Document not found: {request.document_id}"
            )
        
        logger.info(f"Processing OCR for document: {request.document_id}")
        
        # Perform OCR
        ocr_result = await perform_ocr(
            file_path, 
            language=request.language,
            enhance=request.enhance_image
        )
        
        if "error" in ocr_result:
            raise HTTPException(
                status_code=500,
                detail=f"OCR processing failed: {ocr_result['error']}"
            )
        
        # Analyze document content
        filename = os.path.basename(file_path)
        analysis = await analyze_document_content(ocr_result["text"], filename)
        
        # Combine OCR and analysis results
        extracted_data = {
            "ocr_confidence": ocr_result["confidence"],
            "word_count": ocr_result.get("word_count", 0),
            "character_count": ocr_result.get("character_count", 0),
            "document_analysis": analysis
        }
        
        # Save processed results
        processed_file = os.path.join(PROCESSED_DIR, f"{request.document_id}.json")
        with open(processed_file, 'w') as f:
            json.dump({
                "document_id": request.document_id,
                "text": ocr_result["text"],
                "extracted_data": extracted_data,
                "processing_time": ocr_result["processing_time"],
                "processed_at": datetime.now().isoformat()
            }, f, indent=2)
        
        logger.info(f"OCR processing completed for document: {request.document_id}")
        
        return OCRResponse(
            document_id=request.document_id,
            text=ocr_result["text"],
            confidence=ocr_result["confidence"],
            processing_time=ocr_result["processing_time"],
            extracted_data=extracted_data,
            status="processed"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR processing failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {str(e)}"
        )

@router.get("/processed/{document_id}")
async def get_processed_document(document_id: str):
    """
    Get processed document results
    """
    try:
        processed_file = os.path.join(PROCESSED_DIR, f"{document_id}.json")
        
        if not os.path.exists(processed_file):
            raise HTTPException(
                status_code=404,
                detail=f"Processed document not found: {document_id}"
            )
        
        with open(processed_file, 'r') as f:
            data = json.load(f)
        
        return data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve processed document: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve document: {str(e)}"
        )

@router.get("/list")
async def list_documents():
    """
    List all uploaded and processed documents
    """
    try:
        documents = []
        
        # List uploaded files
        if os.path.exists(UPLOAD_DIR):
            for filename in os.listdir(UPLOAD_DIR):
                file_path = os.path.join(UPLOAD_DIR, filename)
                if os.path.isfile(file_path):
                    document_id = os.path.splitext(filename)[0]
                    stat = os.stat(file_path)
                    
                    # Check if processed
                    processed_file = os.path.join(PROCESSED_DIR, f"{document_id}.json")
                    is_processed = os.path.exists(processed_file)
                    
                    documents.append({
                        "id": document_id,
                        "filename": filename,
                        "file_size": stat.st_size,
                        "upload_time": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "is_processed": is_processed,
                        "status": "processed" if is_processed else "uploaded"
                    })
        
        return {"documents": documents}
        
    except Exception as e:
        logger.error(f"Failed to list documents: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list documents: {str(e)}"
        )

@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """
    Delete a document and its processed data
    """
    try:
        deleted_files = []
        
        # Delete uploaded file
        for ext in ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp']:
            file_path = os.path.join(UPLOAD_DIR, f"{document_id}{ext}")
            if os.path.exists(file_path):
                os.remove(file_path)
                deleted_files.append(file_path)
        
        # Delete processed file
        processed_file = os.path.join(PROCESSED_DIR, f"{document_id}.json")
        if os.path.exists(processed_file):
            os.remove(processed_file)
            deleted_files.append(processed_file)
        
        if not deleted_files:
            raise HTTPException(
                status_code=404,
                detail=f"Document not found: {document_id}"
            )
        
        logger.info(f"Document deleted: {document_id}")
        
        return {
            "message": f"Document {document_id} deleted successfully",
            "deleted_files": deleted_files
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete document: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete document: {str(e)}"
        )