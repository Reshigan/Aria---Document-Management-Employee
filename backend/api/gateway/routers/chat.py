"""
Chat/NLP interaction endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum

from api.gateway.routers.auth import oauth2_scheme

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
    token: str = Depends(oauth2_scheme)
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
    token: str = Depends(oauth2_scheme)
):
    """
    Get conversation history
    """
    # TODO: Fetch from database
    return []


@router.get("/chat/conversations/{conversation_id}", response_model=ConversationHistory)
async def get_conversation(
    conversation_id: str,
    token: str = Depends(oauth2_scheme)
):
    """
    Get a specific conversation
    """
    # TODO: Fetch from database
    raise HTTPException(status_code=404, detail="Conversation not found")


@router.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    token: str = Depends(oauth2_scheme)
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
    token: str = Depends(oauth2_scheme)
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
