"""
Chat-related Pydantic schemas.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

from aria.models.chat import SessionType, MessageType


class ChatSessionCreate(BaseModel):
    """Schema for creating a chat session."""
    title: str = Field(..., min_length=1, max_length=255)
    session_type: SessionType = Field(default=SessionType.GENERAL)
    context: Optional[Dict[str, Any]] = None


class ChatSessionResponse(BaseModel):
    """Schema for chat session response."""
    id: str
    title: str
    session_type: SessionType
    context: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    user_id: str


class ChatSessionList(BaseModel):
    """Schema for chat session list response."""
    sessions: List[ChatSessionResponse]
    total: int


class ChatMessageCreate(BaseModel):
    """Schema for creating a chat message."""
    content: str = Field(..., min_length=1)
    message_type: MessageType = Field(default=MessageType.USER)
    metadata: Optional[Dict[str, Any]] = None


class ChatMessageResponse(BaseModel):
    """Schema for chat message response."""
    id: str
    session_id: str
    content: str
    message_type: MessageType
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime


class AIMessageRequest(BaseModel):
    """Schema for AI message request."""
    message: str = Field(..., min_length=1)
    document_ids: Optional[List[str]] = None
    context: Optional[Dict[str, Any]] = None


class DocumentAnalysisRequest(BaseModel):
    """Schema for document analysis request."""
    document_id: str
    analysis_type: str = Field(default="comprehensive", pattern="^(comprehensive|summary|keywords|entities)$")


class DocumentAnalysisResponse(BaseModel):
    """Schema for document analysis response."""
    document_id: str
    analysis_type: str
    result: Dict[str, Any]
    tokens_used: int
    model: str
    timestamp: str
    status: str = "success"


class TagSuggestionResponse(BaseModel):
    """Schema for tag suggestion response."""
    document_id: str
    suggested_tags: List[str]
    status: str = "success"


class ChatStreamChunk(BaseModel):
    """Schema for streaming chat response chunks."""
    type: str  # 'chunk', 'complete', 'error'
    content: Optional[str] = None
    message_id: Optional[str] = None
    message: Optional[str] = None  # For error messages