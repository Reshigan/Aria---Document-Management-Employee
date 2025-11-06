"""
ARIA Chat Module with LLM Integration and File Upload Support
Provides natural language chat interface with document context
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
import os
import tempfile
import PyPDF2
from PIL import Image
import pytesseract

from services.ai.llm_service import llm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["ARIA Chat"])


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[Dict[str, str]]] = None


class ChatResponse(BaseModel):
    response: str
    model: Optional[str] = None
    timestamp: str = datetime.now().isoformat()


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with ARIA using Ollama LLM
    
    Supports natural language queries about:
    - Business operations
    - ERP workflows
    - Document processing
    - General assistance
    """
    try:
        messages = []
        
        messages.append({
            'role': 'system',
            'content': """You are ARIA (AI-Powered Responsive Intelligent Assistant), an expert business assistant specializing in ERP systems, document processing, and business automation.

You help users with:
- Creating sales orders, invoices, quotes, and deliveries
- Managing customers, suppliers, and products
- Processing documents and extracting data
- Running financial reports and analytics
- Automating workflows with 67 specialized bots
- Answering questions about business data

Be helpful, professional, and concise. Provide actionable guidance."""
        })
        
        if request.conversation_history:
            for msg in request.conversation_history[-10:]:  # Last 10 messages for context
                messages.append({
                    'role': msg.get('role', 'user'),
                    'content': msg.get('content', '')
                })
        
        messages.append({
            'role': 'user',
            'content': request.message
        })
        
        result = await llm_service.chat(messages)
        
        if result['success']:
            return ChatResponse(
                response=result['message'],
                model=result.get('model', 'llama3.2:latest')
            )
        else:
            return ChatResponse(
                response=f"I understand you want to {request.message.lower()}. Let me help you with that.\n\nI'm processing your request using natural language understanding. What specific action would you like me to take?",
                model="fallback"
            )
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return ChatResponse(
            response="I'm here to help! I can assist you with creating sales orders, processing documents, managing customers, running reports, and more. What would you like to do?",
            model="fallback"
        )


@router.post("/upload", response_model=ChatResponse)
async def chat_with_file(
    file: UploadFile = File(...),
    message: Optional[str] = Form(None)
):
    """
    Chat with ARIA and upload a file for context
    
    Supports:
    - PDF documents
    - Images (JPG, PNG) with OCR
    - Text files
    
    ARIA will analyze the file and respond to your query
    """
    try:
        file_content = await file.read()
        
        extracted_text = ""
        
        if file.filename.lower().endswith('.pdf'):
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                tmp_file.write(file_content)
                tmp_file.flush()
                
                try:
                    with open(tmp_file.name, 'rb') as pdf_file:
                        pdf_reader = PyPDF2.PdfReader(pdf_file)
                        for page in pdf_reader.pages:
                            extracted_text += page.extract_text() + "\n"
                finally:
                    os.unlink(tmp_file.name)
        
        elif file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff')):
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
                tmp_file.write(file_content)
                tmp_file.flush()
                
                try:
                    image = Image.open(tmp_file.name)
                    extracted_text = pytesseract.image_to_string(image)
                finally:
                    os.unlink(tmp_file.name)
        
        elif file.filename.lower().endswith('.txt'):
            extracted_text = file_content.decode('utf-8')
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Please upload PDF, image, or text file.")
        
        user_message = message or "Please analyze this document and tell me what it contains."
        
        messages = [
            {
                'role': 'system',
                'content': """You are ARIA, an expert document analysis assistant. Analyze the provided document and answer the user's question accurately and concisely."""
            },
            {
                'role': 'user',
                'content': f"""Document content:
{extracted_text[:4000]}  

User question: {user_message}

Please provide a clear and helpful response."""
            }
        ]
        
        result = await llm_service.chat(messages)
        
        if result['success']:
            return ChatResponse(
                response=result['message'],
                model=result.get('model', 'llama3.2:latest')
            )
        else:
            return ChatResponse(
                response=f"I've analyzed your document ({file.filename}). It contains {len(extracted_text)} characters of text. How can I help you with this document?",
                model="fallback"
            )
    
    except Exception as e:
        logger.error(f"Error in chat with file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


@router.get("/health")
async def health_check():
    """Check ARIA chat service health"""
    try:
        test_result = await llm_service.chat([
            {"role": "user", "content": "Hello"}
        ])
        
        llm_status = "online" if test_result.get('success') else "offline"
        
        return {
            "status": "healthy",
            "module": "aria_chat",
            "llm_backend": "Ollama",
            "llm_status": llm_status,
            "model": llm_service.model,
            "features": [
                "natural_language_chat",
                "file_upload_analysis",
                "document_ocr",
                "conversation_history"
            ]
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "degraded",
            "module": "aria_chat",
            "error": str(e)
        }
