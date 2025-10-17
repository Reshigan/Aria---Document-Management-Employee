"""
Chat API endpoints for real-time messaging and AI interactions.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import json

from aria.core.database import get_db
from aria.core.security import get_current_user_id_dependency
from aria.models.user import User
from aria.models.chat import ChatSession, ChatMessage, MessageType
from aria.schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageCreate,
    ChatMessageResponse,
    ChatSessionList,
    AIMessageRequest,
    DocumentAnalysisRequest
)
from aria.services.ai_service import get_ai_service
from aria.services.websocket_service import websocket_service

router = APIRouter()


@router.post("/sessions", response_model=ChatSessionResponse)
async def create_chat_session(
    session_data: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id_dependency)
):
    """Create a new chat session."""
    session = ChatSession(
        title=session_data.title,
        user_id=current_user_id,
        session_type=session_data.session_type,
        context=session_data.context
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return ChatSessionResponse.model_validate(session.to_dict())


@router.get("/sessions", response_model=ChatSessionList)
async def get_chat_sessions(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id_dependency)
):
    """Get user's chat sessions."""
    query = select(ChatSession).where(
        ChatSession.user_id == current_user_id
    ).order_by(desc(ChatSession.updated_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    sessions = result.scalars().all()
    
    return ChatSessionList(
        sessions=[ChatSessionResponse.model_validate(s.to_dict()) for s in sessions],
        total=len(sessions)
    )


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id_dependency)
):
    """Get a specific chat session."""
    query = select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user_id
    )
    
    result = await db.execute(query)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    return ChatSessionResponse.model_validate(session.to_dict())


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse)
async def create_message(
    session_id: str,
    message_data: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id_dependency)
):
    """Create a new message in a chat session."""
    # Verify session exists and belongs to user
    session_query = select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user_id
    )
    
    session_result = await db.execute(session_query)
    session = session_result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    message = ChatMessage(
        session_id=session_id,
        content=message_data.content,
        message_type=message_data.message_type,
        msg_metadata=message_data.metadata
    )
    
    db.add(message)
    await db.commit()
    await db.refresh(message)
    
    # Send WebSocket notification for new message
    message_data = message.to_dict()
    await websocket_service.notify_chat_message(session_id, {
        "message": message_data,
        "session_id": session_id,
        "user_id": current_user_id
    })
    
    return ChatMessageResponse.model_validate(message_data)


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_messages(
    session_id: str,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id_dependency)
):
    """Get messages from a chat session."""
    # Verify session exists and belongs to user
    session_query = select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user_id
    )
    
    session_result = await db.execute(session_query)
    session = session_result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    query = select(ChatMessage).where(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at).offset(skip).limit(limit)
    
    result = await db.execute(query)
    messages = result.scalars().all()
    
    return [ChatMessageResponse.model_validate(m.to_dict()) for m in messages]


@router.post("/sessions/{session_id}/ai-message")
async def send_ai_message(
    session_id: str,
    request: AIMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id_dependency),
    ai_service = Depends(get_ai_service)
):
    """Send a message to AI and get streaming response."""
    # Verify session exists and belongs to user
    session_query = select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user_id
    )
    
    session_result = await db.execute(session_query)
    chat_session = session_result.scalar_one_or_none()
    
    if not chat_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    # Save user message
    user_message = ChatMessage(
        session_id=session_id,
        content=request.message,
        message_type=MessageType.USER,
        msg_metadata={"document_ids": request.document_ids} if request.document_ids else None
    )
    
    db.add(user_message)
    await db.commit()
    
    async def generate_response():
        """Generate streaming AI response."""
        try:
            response_content = ""
            
            # Stream AI response
            async for chunk in ai_service.chat_with_documents(
                session=db,
                user=current_user,
                chat_session=chat_session,
                message=request.message,
                document_ids=request.document_ids
            ):
                response_content += chunk
                # Send chunk as Server-Sent Event
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            
            # Save AI response to database
            ai_message = ChatMessage(
                session_id=session_id,
                content=response_content,
                message_type=MessageType.ASSISTANT,
                msg_metadata={"document_ids": request.document_ids} if request.document_ids else None
            )
            
            db.add(ai_message)
            await db.commit()
            
            # Send completion event
            yield f"data: {json.dumps({'type': 'complete', 'message_id': str(ai_message.id)})}\n\n"
            
        except Exception as e:
            # Send error event
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )


@router.post("/analyze-document")
async def analyze_document(
    request: DocumentAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id_dependency),
    ai_service = Depends(get_ai_service)
):
    """Analyze a document using AI."""
    from aria.models.document import Document
    
    # Get the document
    doc_query = select(Document).where(
        Document.id == request.document_id,
        Document.user_id == current_user_id
    )
    
    doc_result = await db.execute(doc_query)
    document = doc_result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    try:
        analysis = await ai_service.analyze_document(
            document=document,
            analysis_type=request.analysis_type
        )
        
        return {
            "document_id": request.document_id,
            "analysis": analysis,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.post("/suggest-tags/{document_id}")
async def suggest_document_tags(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id_dependency),
    ai_service = Depends(get_ai_service)
):
    """Get AI-suggested tags for a document."""
    from aria.models.document import Document
    
    # Get the document
    doc_query = select(Document).where(
        Document.id == document_id,
        Document.user_id == current_user_id
    )
    
    doc_result = await db.execute(doc_query)
    document = doc_result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    try:
        tags = await ai_service.suggest_tags(document)
        
        return {
            "document_id": document_id,
            "suggested_tags": tags,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tag suggestion failed: {str(e)}"
        )