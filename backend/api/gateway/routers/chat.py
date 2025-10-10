"""
Chat/NLP interaction endpoints with LLM integration
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum
from sqlalchemy import select

from api.gateway.dependencies.auth import get_current_user
from models.user import User
from models.document import Document
from core.database import get_db
from services.ai.llm_service import llm_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessage(BaseModel):
    role: MessageRole
    content: str
    timestamp: datetime = datetime.utcnow()


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    intent: Optional[str] = None
    entities: Optional[dict] = None
    suggested_actions: Optional[List[str]] = None
    timestamp: datetime = datetime.utcnow()


class ConversationHistory(BaseModel):
    conversation_id: str
    messages: List[ChatMessage]
    started_at: datetime
    updated_at: datetime


@router.post("/chat/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send a message to ARIA and get a response
    
    ARIA can understand natural language queries about:
    - Document status
    - Processing requests
    - SAP integration
    - System help
    """
    # TODO: Implement NLP processing
    # 1. Analyze intent
    # 2. Extract entities
    # 3. Generate appropriate response
    # 4. Suggest actions
    
    # Mock response
    conversation_id = request.conversation_id or f"conv-{datetime.utcnow().timestamp()}"
    
    # Simple intent detection (mock)
    message_lower = request.message.lower()
    
    if "status" in message_lower or "how many" in message_lower:
        response_text = "You have 5 documents currently being processed. 3 are completed and ready for review."
        intent = "status_query"
    elif "upload" in message_lower or "process" in message_lower:
        response_text = "You can upload documents by clicking the 'Upload' button or using the API endpoint /api/v1/documents/upload"
        intent = "help_upload"
    elif "sap" in message_lower:
        response_text = "SAP integration is active. I can automatically post validated documents to your SAP system."
        intent = "sap_info"
    elif "hello" in message_lower or "hi" in message_lower:
        response_text = "Hello! I'm ARIA, your AI document processing assistant. How can I help you today?"
        intent = "greeting"
    else:
        response_text = "I understand you need help. I can assist with document processing, SAP integration, and status queries. What would you like to know?"
        intent = "general"
    
    return {
        "message": response_text,
        "conversation_id": conversation_id,
        "intent": intent,
        "entities": {},
        "suggested_actions": ["Upload Document", "View Documents", "Check Status"],
        "timestamp": datetime.utcnow()
    }


@router.get("/chat/conversations", response_model=List[ConversationHistory])
async def get_conversations(
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """
    Get conversation history
    """
    # TODO: Fetch from database
    return []


@router.get("/chat/conversations/{conversation_id}", response_model=ConversationHistory)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific conversation
    """
    # TODO: Fetch from database
    raise HTTPException(status_code=404, detail="Conversation not found")


@router.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a conversation
    """
    # TODO: Delete from database
    return {"message": "Conversation deleted"}


@router.post("/chat/feedback")
async def provide_feedback(
    conversation_id: str,
    message_index: int,
    rating: int,
    comment: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Provide feedback on ARIA's response
    Used for improving the AI model
    """
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # TODO: Store feedback for model training
    
    return {
        "message": "Thank you for your feedback!",
        "conversation_id": conversation_id
    }


# ============================================================================
# LLM-Powered Endpoints
# ============================================================================

class DocumentQuestionRequest(BaseModel):
    document_id: str = Field(..., description="Document ID to query")
    question: str = Field(..., description="Question about the document")


class ExtractionRequest(BaseModel):
    document_id: str = Field(..., description="Document ID")
    fields: List[str] = Field(..., description="Fields to extract")


class ComparisonRequest(BaseModel):
    document_id_1: str
    document_id_2: str


@router.post("/chat/document/question")
async def ask_document_question(
    request: DocumentQuestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ask a question about a specific document using AI.
    
    Example questions:
    - "What is the total amount on this invoice?"
    - "Who is the vendor?"
    - "When is the payment due?"
    """
    # Get document
    result = await db.execute(
        select(Document).where(Document.id == int(request.document_id))
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check if user has access
    if document.uploaded_by != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Prepare document context
    document_text = ""
    document_metadata = {
        'filename': document.filename,
        'document_type': document.document_type.value if document.document_type else None,
        'invoice_number': document.invoice_number,
        'vendor': document.vendor_name,
        'amount': document.total_amount,
        'currency': document.currency,
        'date': str(document.invoice_date) if document.invoice_date else None,
    }
    
    if document.extracted_data:
        document_text = str(document.extracted_data)
    
    result = await llm_service.query_document(
        document_text=document_text,
        question=request.question,
        document_metadata=document_metadata
    )
    
    if not result['success']:
        raise HTTPException(status_code=500, detail=result.get('error', 'Failed to process question'))
    
    return {
        'question': result['question'],
        'answer': result['answer'],
        'document_id': request.document_id,
        'model': result.get('model')
    }


@router.get("/chat/document/{document_id}/summary")
async def get_document_summary(
    document_id: str,
    max_words: int = 150,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get an AI-generated summary of a document.
    """
    # Get document
    result = await db.execute(
        select(Document).where(Document.id == int(document_id))
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check access
    if document.uploaded_by != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get document text
    document_text = str(document.extracted_data) if document.extracted_data else ""
    
    if not document_text:
        raise HTTPException(status_code=400, detail="Document has not been processed yet")
    
    result = await llm_service.summarize_document(
        document_text=document_text,
        max_words=max_words
    )
    
    if not result['success']:
        raise HTTPException(status_code=500, detail=result.get('error', 'Summarization failed'))
    
    return {
        'document_id': document_id,
        'summary': result['summary'],
        'model': result.get('model')
    }


@router.post("/chat/document/extract")
async def extract_fields_with_ai(
    request: ExtractionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Extract specific fields from a document using AI.
    
    Example fields: ["invoice_number", "vendor_name", "total_amount", "due_date"]
    """
    # Get document
    result = await db.execute(
        select(Document).where(Document.id == int(request.document_id))
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check access
    if document.uploaded_by != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get document text
    document_text = str(document.extracted_data) if document.extracted_data else ""
    
    if not document_text:
        raise HTTPException(status_code=400, detail="Document has not been processed yet")
    
    result = await llm_service.extract_information(
        document_text=document_text,
        fields_to_extract=request.fields
    )
    
    if not result['success']:
        raise HTTPException(status_code=500, detail=result.get('error', 'Extraction failed'))
    
    return {
        'document_id': request.document_id,
        'extracted_data': result['extracted_data']
    }


@router.post("/chat/documents/compare")
async def compare_documents_ai(
    request: ComparisonRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Compare two documents using AI to identify similarities and differences.
    """
    # Get both documents
    result1 = await db.execute(
        select(Document).where(Document.id == int(request.document_id_1))
    )
    doc1 = result1.scalar_one_or_none()
    
    result2 = await db.execute(
        select(Document).where(Document.id == int(request.document_id_2))
    )
    doc2 = result2.scalar_one_or_none()
    
    if not doc1 or not doc2:
        raise HTTPException(status_code=404, detail="One or both documents not found")
    
    # Check access
    if ((doc1.uploaded_by != current_user.id or doc2.uploaded_by != current_user.id) 
        and not current_user.is_superuser):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get document texts
    doc1_text = str(doc1.extracted_data) if doc1.extracted_data else ""
    doc2_text = str(doc2.extracted_data) if doc2.extracted_data else ""
    
    if not doc1_text or not doc2_text:
        raise HTTPException(status_code=400, detail="Both documents must be processed first")
    
    result = await llm_service.compare_documents(
        doc1_text=doc1_text,
        doc2_text=doc2_text,
        doc1_name=doc1.filename,
        doc2_name=doc2.filename
    )
    
    if not result['success']:
        raise HTTPException(status_code=500, detail=result.get('error', 'Comparison failed'))
    
    return {
        'document_1': request.document_id_1,
        'document_2': request.document_id_2,
        'comparison': result['comparison'],
        'model': result.get('model')
    }
