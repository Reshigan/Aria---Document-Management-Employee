"""
Production-ready Bot API endpoints
Handles chat, conversations, templates, and bot management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import logging
import json

from core.database import get_db
from core.security import get_current_user
from models.user import User
from services.ai.llm_provider import LLMProviderFactory
from services.ai.conversation_engine import ConversationEngine, ConversationState
import redis.asyncio as redis

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/bot", tags=["Bot"])

# Initialize services (in production, use dependency injection)
# This is a placeholder - actual initialization should be in main.py
llm_factory = None
conversation_engine = None


def get_llm_factory():
    """Get LLM factory instance"""
    global llm_factory
    if llm_factory is None:
        # TODO: Load from config
        config = {
            "primary_provider": "openai",
            "fallback_providers": ["ollama"],
            "openai": {
                "api_key": "sk-...",  # Load from environment
                "model": "gpt-4-turbo-preview"
            },
            "ollama": {
                "model": "llama3",
                "api_url": "http://localhost:11434/api/chat"
            }
        }
        llm_factory = LLMProviderFactory(config)
    return llm_factory


def get_conversation_engine():
    """Get conversation engine instance"""
    global conversation_engine
    if conversation_engine is None:
        # TODO: Initialize Redis from config
        conversation_engine = ConversationEngine()
    return conversation_engine


# Pydantic models
class ChatMessageRequest(BaseModel):
    message: str = Field(..., description="User message")
    conversation_id: Optional[str] = Field(None, description="Conversation ID (optional for new conversation)")
    document_id: Optional[str] = Field(None, description="Document ID for context")
    stream: bool = Field(False, description="Enable streaming response")
    temperature: float = Field(0.7, ge=0.0, le=2.0, description="LLM temperature")
    max_tokens: int = Field(2000, ge=1, le=4000, description="Max response tokens")


class ChatMessageResponse(BaseModel):
    conversation_id: str
    message: str
    role: str = "assistant"
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None


class ConversationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message_count: int
    state: str
    created_at: str
    updated_at: str
    preview: Optional[str] = None


class ConversationDetailResponse(BaseModel):
    id: str
    user_id: str
    title: str
    messages: List[Dict[str, Any]]
    state: str
    context: Dict[str, Any]
    created_at: str
    updated_at: str


class BotTemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    prompt: str
    parameters: Dict[str, Any]
    icon: Optional[str] = None


# Endpoints
@router.post("/chat", response_model=ChatMessageResponse)
async def chat_with_bot(
    request: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Chat with the AI bot
    
    - **message**: User's message
    - **conversation_id**: Optional conversation ID (creates new if not provided)
    - **document_id**: Optional document ID for context
    - **stream**: Enable streaming (use /chat/stream endpoint instead)
    - **temperature**: LLM temperature (0-2)
    - **max_tokens**: Maximum response tokens
    """
    try:
        engine = get_conversation_engine()
        factory = get_llm_factory()
        
        # Get or create conversation
        if request.conversation_id:
            conversation = await engine.get_conversation(request.conversation_id)
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")
            if conversation.user_id != str(current_user.id):
                raise HTTPException(status_code=403, detail="Not authorized")
        else:
            # Create new conversation
            conversation = await engine.create_conversation(
                user_id=str(current_user.id),
                initial_message=request.message,
                context={
                    "document_id": request.document_id,
                    "temperature": request.temperature
                }
            )
        
        # Add user message if conversation already existed
        if request.conversation_id:
            await engine.add_message(
                conversation.id,
                "user",
                request.message
            )
        
        # Get messages for LLM
        messages = engine.get_messages_for_llm(conversation)
        
        # Add document context if provided
        if request.document_id:
            # TODO: Fetch document content from database
            # For now, placeholder
            document_content = "Document context would be here"
            messages = engine.inject_document_context(
                messages,
                document_content,
                {"document_id": request.document_id}
            )
        
        # Get LLM response
        response = await factory.chat_completion_with_fallback(
            messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        # Add assistant response to conversation
        conversation = await engine.add_message(
            conversation.id,
            "assistant",
            response.content,
            metadata=response.to_dict()
        )
        
        return ChatMessageResponse(
            conversation_id=conversation.id,
            message=response.content,
            role="assistant",
            timestamp=datetime.now().isoformat(),
            metadata={
                "model": response.model,
                "provider": response.provider,
                "usage": response.usage
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@router.post("/chat/stream")
async def chat_with_bot_stream(
    request: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Chat with the AI bot (streaming response)
    
    Returns Server-Sent Events (SSE) stream
    """
    try:
        engine = get_conversation_engine()
        factory = get_llm_factory()
        
        # Get or create conversation
        if request.conversation_id:
            conversation = await engine.get_conversation(request.conversation_id)
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")
            if conversation.user_id != str(current_user.id):
                raise HTTPException(status_code=403, detail="Not authorized")
        else:
            conversation = await engine.create_conversation(
                user_id=str(current_user.id),
                initial_message=request.message
            )
        
        # Add user message if conversation already existed
        if request.conversation_id:
            await engine.add_message(conversation.id, "user", request.message)
        
        # Get messages for LLM
        messages = engine.get_messages_for_llm(conversation)
        
        async def generate():
            """Generator for streaming response"""
            try:
                full_response = ""
                async for chunk in factory.stream_completion_with_fallback(
                    messages,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens
                ):
                    full_response += chunk
                    # Send SSE format
                    yield f"data: {json.dumps({'chunk': chunk, 'done': False})}\n\n"
                
                # Save complete response to conversation
                await engine.add_message(
                    conversation.id,
                    "assistant",
                    full_response
                )
                
                # Send completion event
                yield f"data: {json.dumps({'chunk': '', 'done': True, 'conversation_id': conversation.id})}\n\n"
            
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat streaming error: {e}")
        raise HTTPException(status_code=500, detail=f"Streaming failed: {str(e)}")


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """
    List user's conversations
    
    - **limit**: Maximum number of conversations to return
    - **offset**: Number of conversations to skip
    """
    try:
        engine = get_conversation_engine()
        conversations = await engine.list_conversations(
            str(current_user.id),
            limit=limit,
            offset=offset
        )
        
        return [
            ConversationResponse(
                id=conv.id,
                user_id=conv.user_id,
                title=conv.title,
                message_count=len(conv.messages),
                state=conv.state.value,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                preview=conv.messages[-1].content[:100] if conv.messages else None
            )
            for conv in conversations
        ]
    
    except Exception as e:
        logger.error(f"Error listing conversations: {e}")
        raise HTTPException(status_code=500, detail="Failed to list conversations")


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get conversation details with full message history"""
    try:
        engine = get_conversation_engine()
        conversation = await engine.get_conversation(conversation_id)
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        return ConversationDetailResponse(
            id=conversation.id,
            user_id=conversation.user_id,
            title=conversation.title,
            messages=[msg.to_dict() for msg in conversation.messages],
            state=conversation.state.value,
            context=conversation.context,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation: {e}")
        raise HTTPException(status_code=500, detail="Failed to get conversation")


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a conversation"""
    try:
        engine = get_conversation_engine()
        conversation = await engine.get_conversation(conversation_id)
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        success = await engine.delete_conversation(conversation_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete conversation")
        
        return {"message": "Conversation deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete conversation")


@router.post("/conversations/{conversation_id}/end")
async def end_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """End a conversation (mark as completed)"""
    try:
        engine = get_conversation_engine()
        conversation = await engine.get_conversation(conversation_id)
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        success = await engine.end_conversation(conversation_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to end conversation")
        
        return {"message": "Conversation ended successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending conversation: {e}")
        raise HTTPException(status_code=500, detail="Failed to end conversation")


@router.get("/templates", response_model=List[BotTemplateResponse])
async def list_bot_templates(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    List available bot templates
    
    - **category**: Filter by category (optional)
    """
    # TODO: Load from database
    # For now, return hardcoded templates
    templates = [
        {
            "id": "doc-qa",
            "name": "Document Q&A",
            "description": "Ask questions about your documents",
            "category": "document",
            "prompt": "You are a helpful assistant that answers questions about documents.",
            "parameters": {},
            "icon": "📄"
        },
        {
            "id": "invoice-extraction",
            "name": "Invoice Data Extraction",
            "description": "Automatically extract data from invoices",
            "category": "extraction",
            "prompt": "You are an expert at extracting structured data from invoices.",
            "parameters": {},
            "icon": "🧾"
        },
        {
            "id": "contract-analysis",
            "name": "Contract Analysis",
            "description": "Analyze contracts and identify key clauses",
            "category": "legal",
            "prompt": "You are a legal assistant specializing in contract analysis.",
            "parameters": {},
            "icon": "📜"
        },
        {
            "id": "document-summary",
            "name": "Document Summarization",
            "description": "Generate concise summaries of long documents",
            "category": "document",
            "prompt": "You are skilled at creating clear, concise summaries.",
            "parameters": {},
            "icon": "📝"
        },
        {
            "id": "compliance-check",
            "name": "Compliance Checker",
            "description": "Check documents for compliance issues",
            "category": "compliance",
            "prompt": "You are a compliance officer checking documents for regulatory compliance.",
            "parameters": {},
            "icon": "✅"
        }
    ]
    
    if category:
        templates = [t for t in templates if t["category"] == category]
    
    return templates


@router.get("/health")
async def bot_health_check():
    """Check bot service health"""
    try:
        factory = get_llm_factory()
        return {
            "status": "healthy",
            "providers": {
                "primary": factory.primary_provider,
                "fallbacks": factory.fallback_providers
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
