"""
Enhanced ARIA Backend API with Document Upload and SAP Integration
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import os
import logging
import json
import uuid
import shutil
from datetime import datetime
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title='ARIA - AI-Powered Document Intelligence Assistant',
    description='ARIA with integrated personality, document processing, and SAP integration',
    version='3.0.0'
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'https://aria.vantax.co.za'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Document storage configuration
UPLOAD_DIR = "/opt/aria/uploads"
PROCESSED_DIR = "/opt/aria/processed"

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# Pydantic models
class ChatMessage(BaseModel):
    message: str

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

class SAPDocumentRequest(BaseModel):
    document_id: str
    filename: str
    extracted_data: Dict[str, Any]
    text_content: str

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

async def simulate_ocr_processing(file_path: str) -> Dict[str, Any]:
    """
    Simulate OCR processing (placeholder for actual OCR)
    In production, this would use Tesseract or cloud OCR services
    """
    await asyncio.sleep(2)  # Simulate processing time
    
    # Mock OCR results based on file type
    filename = os.path.basename(file_path)
    
    if filename.lower().endswith('.pdf'):
        mock_text = f"""INVOICE
Invoice Number: INV-2024-001
Date: {datetime.now().strftime('%Y-%m-%d')}
Vendor: ABC Suppliers Ltd
Amount: R 1,250.00
VAT: R 187.50
Total: R 1,437.50
Payment Terms: 30 days
Due Date: {datetime.now().strftime('%Y-%m-%d')}

Description:
Office supplies and equipment
Delivery charges included
"""
    else:
        mock_text = f"""Document processed from {filename}
Date: {datetime.now().strftime('%Y-%m-%d')}
Content extracted successfully
Ready for SAP integration
"""
    
    return {
        "text": mock_text,
        "confidence": 95.5,
        "processing_time": 2.1,
        "extracted_data": {
            "document_type": "invoice",
            "vendor_name": "ABC Suppliers Ltd",
            "invoice_number": "INV-2024-001",
            "total_amount": 1437.50,
            "currency": "ZAR",
            "invoice_date": datetime.now().strftime('%Y-%m-%d')
        }
    }

async def simulate_sap_posting(invoice_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulate SAP posting (placeholder for actual SAP integration)
    """
    await asyncio.sleep(1.5)  # Simulate SAP processing time
    
    return {
        "success": True,
        "document_number": f"5100000{datetime.now().strftime('%H%M%S')}",
        "fiscal_year": datetime.now().year,
        "company_code": "1000",
        "posting_date": datetime.now().strftime('%Y-%m-%d'),
        "message": "Document posted successfully to SAP"
    }

# Health and status endpoints
@app.get('/')
async def root():
    return {
        'message': 'ARIA Enhanced Backend API is running',
        'version': '3.0.0',
        'features': ['Chat', 'Document Upload', 'OCR Processing', 'SAP Integration']
    }

@app.get('/api/v1/health')
async def health_check():
    return {'status': 'healthy', 'service': 'ARIA Enhanced Backend'}

@app.get('/api/v1/aria/status')
async def aria_status():
    return {
        'status': 'online',
        'personality': 'active',
        'llm_model': 'phi3:mini',
        'features': {
            'document_upload': True,
            'ocr_processing': True,
            'sap_integration': True,
            'ai_chat': True
        },
        'message': 'Hello! I am ARIA, your AI-Powered Document Intelligence Assistant. I can process documents, extract data, and integrate with SAP systems.'
    }

# Chat endpoints
@app.post('/api/v1/aria/chat')
async def aria_chat(message: ChatMessage):
    """Enhanced chat with document processing context"""
    user_message = message.message
    
    # Enhanced responses based on context
    if any(word in user_message.lower() for word in ['upload', 'document', 'file']):
        response = f'I can help you with document processing! You can upload PDF, JPG, PNG, TIFF, or BMP files. I will scan them using OCR technology and can automatically post the extracted data to your SAP system. Would you like to upload a document?'
    elif any(word in user_message.lower() for word in ['sap', 'integration', 'post']):
        response = f'I have full SAP integration capabilities! I can extract invoice data, vendor information, amounts, and dates from your documents, then automatically create accounting entries in SAP. This includes handling accounts payable, expense accounts, and VAT calculations.'
    elif any(word in user_message.lower() for word in ['scan', 'ocr', 'extract']):
        response = f'My OCR scanning capabilities are quite advanced! I can extract text from PDFs and images with high accuracy, identify document types (invoices, receipts, contracts), and extract key fields like amounts, dates, vendor information, and invoice numbers.'
    else:
        response = f'Hello! I am ARIA, your AI-Powered Document Intelligence Assistant. You said: "{user_message}". I can help you with document processing, OCR scanning, data extraction, and SAP integration. What would you like to do today?'
    
    return {
        'response': response,
        'personality_active': True,
        'model': 'phi3:mini',
        'capabilities': ['document_processing', 'ocr_scanning', 'sap_integration']
    }

# Document upload endpoints
@app.post('/api/v1/documents/upload', response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload a document for processing"""
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

@app.post('/api/v1/documents/ocr')
async def process_document_ocr(request: OCRRequest):
    """Perform OCR processing on uploaded document"""
    try:
        # Find uploaded file
        file_path = None
        for ext in ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp']:
            potential_path = os.path.join(UPLOAD_DIR, f"{request.document_id}{ext}")
            if os.path.exists(potential_path):
                file_path = potential_path
                break
        
        if not file_path:
            raise HTTPException(
                status_code=404,
                detail=f"Document not found: {request.document_id}"
            )
        
        logger.info(f"Processing OCR for document: {request.document_id}")
        
        # Perform OCR (simulated)
        ocr_result = await simulate_ocr_processing(file_path)
        
        # Save processed results
        processed_file = os.path.join(PROCESSED_DIR, f"{request.document_id}.json")
        with open(processed_file, 'w') as f:
            json.dump({
                "document_id": request.document_id,
                "text": ocr_result["text"],
                "extracted_data": ocr_result["extracted_data"],
                "confidence": ocr_result["confidence"],
                "processing_time": ocr_result["processing_time"],
                "processed_at": datetime.now().isoformat()
            }, f, indent=2)
        
        logger.info(f"OCR processing completed for document: {request.document_id}")
        
        return {
            "document_id": request.document_id,
            "text": ocr_result["text"],
            "confidence": ocr_result["confidence"],
            "processing_time": ocr_result["processing_time"],
            "extracted_data": ocr_result["extracted_data"],
            "status": "processed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR processing failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {str(e)}"
        )

# SAP Integration endpoints
@app.post('/api/v1/sap/post-document')
async def post_document_to_sap(request: SAPDocumentRequest):
    """Post a processed document to SAP system"""
    try:
        logger.info(f"Processing SAP posting for document: {request.filename}")
        
        # Simulate SAP posting
        sap_result = await simulate_sap_posting(request.extracted_data)
        
        logger.info(f"SAP document posted: {sap_result['document_number']}")
        
        return {
            "success": True,
            "sap_document_id": sap_result["document_number"],
            "posting_date": sap_result["posting_date"],
            "message": "Document successfully posted to SAP",
            "details": {
                "invoice_data": request.extracted_data,
                "sap_response": sap_result
            }
        }
        
    except Exception as e:
        logger.error(f"SAP integration error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"SAP integration failed: {str(e)}"
        )

@app.get('/api/v1/sap/vendors')
async def get_sap_vendors():
    """Get list of vendors from SAP system"""
    return {
        "vendors": [
            {"code": "VENDOR001", "name": "ABC Suppliers Ltd", "payment_terms": "Z030"},
            {"code": "VENDOR002", "name": "XYZ Services", "payment_terms": "Z014"},
            {"code": "VENDOR003", "name": "Tech Solutions Inc", "payment_terms": "Z030"},
        ]
    }

@app.get('/api/v1/documents/list')
async def list_documents():
    """List all uploaded and processed documents"""
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)