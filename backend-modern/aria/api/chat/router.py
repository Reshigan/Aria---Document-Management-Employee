"""Chat API routes for AI bot interactions."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from aria.core.database import get_db
from aria.core.security import security, security_manager

router = APIRouter()


@router.get("/sessions")
async def get_chat_sessions(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Get user chat sessions."""
    user_id = security_manager.get_current_user_id(credentials)
    
    return {
        "message": "Chat sessions endpoint - Coming soon!",
        "user_id": user_id,
        "sessions": []
    }


@router.post("/sessions")
async def create_chat_session(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Create a new chat session."""
    user_id = security_manager.get_current_user_id(credentials)
    
    return {
        "message": "Create chat session endpoint - Coming soon!",
        "user_id": user_id
    }


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Send a message to AI bot."""
    user_id = security_manager.get_current_user_id(credentials)
    
    return {
        "message": "AI chat endpoint - Coming soon!",
        "user_id": user_id,
        "session_id": session_id,
        "response": "Hello! I'm ARIA, your AI document management assistant. I'm being upgraded to serve you better!"
    }