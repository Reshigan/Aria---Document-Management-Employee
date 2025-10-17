"""
WebSocket API endpoints for real-time communication.
"""
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Optional
import logging

from ..services.websocket_service import websocket_service
from ..core.security import get_current_user_id_dependency

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time communication.
    
    Query parameters:
    - token: Optional JWT token for authentication
    - session_id: Optional chat session ID to join
    """
    connection_id = str(uuid.uuid4())
    user_id = None
    
    # Try to authenticate user if token is provided
    if token:
        try:
            # Note: We'd need to modify get_current_user_optional to work with WebSocket
            # For now, we'll extract user_id from token manually
            import jwt
            from ..core.config import settings
            
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
        except Exception as e:
            logger.warning(f"WebSocket authentication failed: {e}")
    
    try:
        await websocket_service.handle_connection(websocket, connection_id, user_id)
        
        # If session_id is provided, join the session
        if session_id:
            websocket_service.manager.join_session(connection_id, session_id)
            await websocket_service.send_notification(
                "session_joined",
                {"session_id": session_id, "connection_id": connection_id},
                connection_id=connection_id
            )
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        websocket_service.manager.disconnect(connection_id, user_id)


@router.websocket("/ws/{session_id}")
async def websocket_session_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for a specific chat session.
    
    Parameters:
    - session_id: Chat session ID to join
    - token: Optional JWT token for authentication
    """
    connection_id = str(uuid.uuid4())
    user_id = None
    
    # Try to authenticate user if token is provided
    if token:
        try:
            import jwt
            from ..core.config import settings
            
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
        except Exception as e:
            logger.warning(f"WebSocket authentication failed: {e}")
    
    try:
        await websocket_service.handle_connection(websocket, connection_id, user_id)
        
        # Join the specific session
        websocket_service.manager.join_session(connection_id, session_id)
        await websocket_service.send_notification(
            "session_joined",
            {"session_id": session_id, "connection_id": connection_id},
            connection_id=connection_id
        )
        
        # Send session info
        await websocket_service.send_notification(
            "session_info",
            {
                "session_id": session_id,
                "user_id": user_id,
                "connection_id": connection_id,
                "joined_at": websocket_service.manager.active_connections[connection_id]
            },
            connection_id=connection_id
        )
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected from session {session_id}: {connection_id}")
    except Exception as e:
        logger.error(f"WebSocket session error: {e}")
    finally:
        websocket_service.manager.disconnect(connection_id, user_id)
        websocket_service.manager.leave_session(connection_id, session_id)