"""
WebSocket endpoints for real-time communication.

This module provides WebSocket endpoints for real-time features including
live updates, chat, notifications, and collaborative features.
"""

import json
from typing import Any, Dict

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from aria.core.database import get_db
from aria.core.logging import get_logger
from aria.services.websocket_service import get_websocket_service

# Create router
router = APIRouter()

# Logger
logger = get_logger(__name__)


@router.websocket("/connect/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    connection_type: str = "general",
    db: AsyncSession = Depends(get_db),
):
    """
    Main WebSocket endpoint for real-time communication.
    
    Args:
        websocket: WebSocket connection
        user_id: User ID for the connection
        connection_type: Type of connection (general, chat, notifications, etc.)
        db: Database session
    """
    websocket_service = await get_websocket_service(db)
    connection_id = None
    
    try:
        # Establish connection
        connection_id = await websocket_service.handle_connection(
            websocket, user_id, connection_type
        )
        
        logger.info(
            "WebSocket connection established",
            connection_id=connection_id,
            user_id=user_id,
            connection_type=connection_type
        )
        
        # Handle messages
        while True:
            try:
                # Receive message
                data = await websocket.receive_text()
                message = json.loads(data)
                
                logger.debug(
                    "WebSocket message received",
                    connection_id=connection_id,
                    message_type=message.get("type")
                )
                
                # Process message
                await websocket_service.handle_message(connection_id, message)
                
            except json.JSONDecodeError:
                logger.warning(
                    "Invalid JSON received",
                    connection_id=connection_id,
                    data=data
                )
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format",
                    "timestamp": "now"
                }))
                
    except WebSocketDisconnect:
        logger.info(
            "WebSocket disconnected",
            connection_id=connection_id,
            user_id=user_id
        )
        
    except Exception as e:
        logger.error(
            "WebSocket error",
            connection_id=connection_id,
            user_id=user_id,
            error=str(e),
            exc_info=True
        )
        
    finally:
        # Clean up connection
        if connection_id:
            await websocket_service.handle_disconnect(connection_id)


@router.websocket("/chat/{user_id}")
async def chat_websocket(
    websocket: WebSocket,
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    WebSocket endpoint specifically for AI chat.
    
    Args:
        websocket: WebSocket connection
        user_id: User ID for the chat session
        db: Database session
    """
    websocket_service = await get_websocket_service(db)
    connection_id = None
    
    try:
        # Establish chat connection
        connection_id = await websocket_service.handle_connection(
            websocket, user_id, "chat"
        )
        
        logger.info(
            "Chat WebSocket connection established",
            connection_id=connection_id,
            user_id=user_id
        )
        
        # Send welcome message
        await websocket_service.send_chat_message(
            user_id=user_id,
            message="Hello! I'm Aria, your intelligent document assistant. How can I help you today?",
            sender="ai"
        )
        
        # Handle chat messages
        while True:
            try:
                # Receive message
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("type") == "chat_message":
                    user_message = message.get("message", "")
                    
                    logger.info(
                        "Chat message received",
                        connection_id=connection_id,
                        user_id=user_id,
                        message_length=len(user_message)
                    )
                    
                    # Show typing indicator
                    await websocket_service.send_typing_indicator(user_id, True)
                    
                    # TODO: Process with AI service
                    # For now, echo with AI prefix
                    import asyncio
                    await asyncio.sleep(1)  # Simulate processing time
                    
                    ai_response = f"I received your message: '{user_message}'. This is a placeholder response. In the full implementation, I would process this with advanced AI capabilities."
                    
                    # Stop typing indicator
                    await websocket_service.send_typing_indicator(user_id, False)
                    
                    # Send AI response
                    await websocket_service.send_chat_message(
                        user_id=user_id,
                        message=ai_response,
                        sender="ai"
                    )
                    
                else:
                    # Handle other message types
                    await websocket_service.handle_message(connection_id, message)
                    
            except json.JSONDecodeError:
                logger.warning(
                    "Invalid JSON in chat",
                    connection_id=connection_id,
                    data=data
                )
                
    except WebSocketDisconnect:
        logger.info(
            "Chat WebSocket disconnected",
            connection_id=connection_id,
            user_id=user_id
        )
        
    except Exception as e:
        logger.error(
            "Chat WebSocket error",
            connection_id=connection_id,
            user_id=user_id,
            error=str(e),
            exc_info=True
        )
        
    finally:
        # Clean up connection
        if connection_id:
            await websocket_service.handle_disconnect(connection_id)


@router.websocket("/notifications/{user_id}")
async def notifications_websocket(
    websocket: WebSocket,
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    WebSocket endpoint for real-time notifications.
    
    Args:
        websocket: WebSocket connection
        user_id: User ID for notifications
        db: Database session
    """
    websocket_service = await get_websocket_service(db)
    connection_id = None
    
    try:
        # Establish notifications connection
        connection_id = await websocket_service.handle_connection(
            websocket, user_id, "notifications"
        )
        
        logger.info(
            "Notifications WebSocket connection established",
            connection_id=connection_id,
            user_id=user_id
        )
        
        # Send initial notification
        await websocket_service.send_system_notification(
            user_id=user_id,
            title="Notifications Connected",
            message="You will now receive real-time notifications",
            severity="success"
        )
        
        # Keep connection alive and handle messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle subscription requests, etc.
                await websocket_service.handle_message(connection_id, message)
                
            except json.JSONDecodeError:
                logger.warning(
                    "Invalid JSON in notifications",
                    connection_id=connection_id,
                    data=data
                )
                
    except WebSocketDisconnect:
        logger.info(
            "Notifications WebSocket disconnected",
            connection_id=connection_id,
            user_id=user_id
        )
        
    except Exception as e:
        logger.error(
            "Notifications WebSocket error",
            connection_id=connection_id,
            user_id=user_id,
            error=str(e),
            exc_info=True
        )
        
    finally:
        # Clean up connection
        if connection_id:
            await websocket_service.handle_disconnect(connection_id)


# REST endpoints for WebSocket management

@router.get("/stats")
async def get_websocket_stats(
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get WebSocket service statistics.
    
    Args:
        db: Database session
        
    Returns:
        WebSocket service statistics
    """
    websocket_service = await get_websocket_service(db)
    return websocket_service.get_stats()


@router.post("/broadcast")
async def broadcast_message(
    message: Dict[str, Any],
    connection_type: str = None,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Broadcast message to WebSocket connections.
    
    Args:
        message: Message to broadcast
        connection_type: Optional connection type filter
        db: Database session
        
    Returns:
        Broadcast result
    """
    websocket_service = await get_websocket_service(db)
    
    try:
        await websocket_service.connection_manager.broadcast_message(
            message, connection_type
        )
        
        return {
            "success": True,
            "message": "Message broadcasted successfully",
            "target_connections": websocket_service.connection_manager.get_connection_count()
        }
        
    except Exception as e:
        logger.error("Broadcast failed", error=str(e), exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/notify/{user_id}")
async def send_notification(
    user_id: str,
    title: str,
    message: str,
    severity: str = "info",
    action_url: str = None,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Send notification to specific user.
    
    Args:
        user_id: Target user ID
        title: Notification title
        message: Notification message
        severity: Notification severity
        action_url: Optional action URL
        db: Database session
        
    Returns:
        Notification result
    """
    websocket_service = await get_websocket_service(db)
    
    try:
        await websocket_service.send_system_notification(
            user_id=user_id,
            title=title,
            message=message,
            severity=severity,
            action_url=action_url
        )
        
        return {
            "success": True,
            "message": "Notification sent successfully"
        }
        
    except Exception as e:
        logger.error("Notification failed", error=str(e), exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }