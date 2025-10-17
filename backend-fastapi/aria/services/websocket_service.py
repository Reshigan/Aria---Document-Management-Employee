"""
WebSocket service for real-time communication and updates.

This service provides real-time features including:
- Live document processing updates
- Real-time chat with AI
- System notifications
- Collaborative features
- Live analytics updates
"""

import asyncio
import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Set
from uuid import UUID, uuid4

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from aria.core.logging import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections and message broadcasting.
    
    Handles connection lifecycle, user sessions, and message routing
    for real-time features.
    """

    def __init__(self):
        """Initialize the connection manager."""
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, Set[str]] = {}  # user_id -> connection_ids
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, connection_type: str = "general") -> str:
        """
        Accept a new WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            user_id: User ID for the connection
            connection_type: Type of connection (general, chat, notifications, etc.)
            
        Returns:
            Connection ID
        """
        await websocket.accept()
        
        connection_id = str(uuid4())
        self.active_connections[connection_id] = websocket
        
        # Track user connections
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(connection_id)
        
        # Store connection metadata
        self.connection_metadata[connection_id] = {
            "user_id": user_id,
            "connection_type": connection_type,
            "connected_at": datetime.utcnow(),
            "last_activity": datetime.utcnow()
        }
        
        logger.info(
            "WebSocket connection established",
            connection_id=connection_id,
            user_id=user_id,
            connection_type=connection_type
        )
        
        # Send welcome message
        await self.send_personal_message({
            "type": "connection_established",
            "connection_id": connection_id,
            "message": "Connected to Aria real-time services",
            "timestamp": datetime.utcnow().isoformat()
        }, connection_id)
        
        return connection_id

    async def disconnect(self, connection_id: str):
        """
        Remove a WebSocket connection.
        
        Args:
            connection_id: Connection ID to remove
        """
        if connection_id in self.active_connections:
            metadata = self.connection_metadata.get(connection_id, {})
            user_id = metadata.get("user_id")
            
            # Remove from active connections
            del self.active_connections[connection_id]
            
            # Remove from user connections
            if user_id and user_id in self.user_connections:
                self.user_connections[user_id].discard(connection_id)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]
            
            # Remove metadata
            if connection_id in self.connection_metadata:
                del self.connection_metadata[connection_id]
            
            logger.info(
                "WebSocket connection closed",
                connection_id=connection_id,
                user_id=user_id
            )

    async def send_personal_message(self, message: Dict[str, Any], connection_id: str):
        """
        Send message to a specific connection.
        
        Args:
            message: Message to send
            connection_id: Target connection ID
        """
        if connection_id in self.active_connections:
            try:
                websocket = self.active_connections[connection_id]
                await websocket.send_text(json.dumps(message))
                
                # Update last activity
                if connection_id in self.connection_metadata:
                    self.connection_metadata[connection_id]["last_activity"] = datetime.utcnow()
                    
            except Exception as e:
                logger.error(
                    "Failed to send personal message",
                    connection_id=connection_id,
                    error=str(e)
                )
                await self.disconnect(connection_id)

    async def send_user_message(self, message: Dict[str, Any], user_id: str):
        """
        Send message to all connections for a specific user.
        
        Args:
            message: Message to send
            user_id: Target user ID
        """
        if user_id in self.user_connections:
            connection_ids = list(self.user_connections[user_id])
            for connection_id in connection_ids:
                await self.send_personal_message(message, connection_id)

    async def broadcast_message(self, message: Dict[str, Any], connection_type: Optional[str] = None):
        """
        Broadcast message to all connections or specific connection type.
        
        Args:
            message: Message to broadcast
            connection_type: Optional connection type filter
        """
        target_connections = []
        
        if connection_type:
            # Filter by connection type
            for conn_id, metadata in self.connection_metadata.items():
                if metadata.get("connection_type") == connection_type:
                    target_connections.append(conn_id)
        else:
            # All connections
            target_connections = list(self.active_connections.keys())
        
        for connection_id in target_connections:
            await self.send_personal_message(message, connection_id)

    def get_active_users(self) -> List[str]:
        """
        Get list of active user IDs.
        
        Returns:
            List of active user IDs
        """
        return list(self.user_connections.keys())

    def get_connection_count(self) -> int:
        """
        Get total number of active connections.
        
        Returns:
            Number of active connections
        """
        return len(self.active_connections)


class WebSocketService:
    """
    Service for handling WebSocket operations and real-time features.
    
    Provides methods for document processing updates, chat, notifications,
    and other real-time functionality.
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize the WebSocket service.
        
        Args:
            db: Database session
        """
        self.db = db
        self.connection_manager = ConnectionManager()

    # Document Processing Updates

    async def send_document_processing_update(
        self, 
        user_id: str, 
        document_id: UUID, 
        status: str, 
        progress: float = 0.0,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Send document processing update to user.
        
        Args:
            user_id: User ID to notify
            document_id: Document being processed
            status: Processing status
            progress: Processing progress (0.0 to 1.0)
            details: Additional processing details
        """
        message = {
            "type": "document_processing_update",
            "document_id": str(document_id),
            "status": status,
            "progress": progress,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.connection_manager.send_user_message(message, user_id)
        
        logger.info(
            "Document processing update sent",
            user_id=user_id,
            document_id=str(document_id),
            status=status,
            progress=progress
        )

    async def send_document_analysis_complete(
        self, 
        user_id: str, 
        document_id: UUID, 
        analysis_results: Dict[str, Any]
    ):
        """
        Send document analysis completion notification.
        
        Args:
            user_id: User ID to notify
            document_id: Analyzed document ID
            analysis_results: Analysis results summary
        """
        message = {
            "type": "document_analysis_complete",
            "document_id": str(document_id),
            "results": analysis_results,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.connection_manager.send_user_message(message, user_id)

    # Real-time Chat

    async def send_chat_message(
        self, 
        user_id: str, 
        message: str, 
        sender: str = "ai",
        conversation_id: Optional[str] = None
    ):
        """
        Send real-time chat message.
        
        Args:
            user_id: User ID to send message to
            message: Chat message content
            sender: Message sender (ai, user, system)
            conversation_id: Optional conversation ID
        """
        chat_message = {
            "type": "chat_message",
            "sender": sender,
            "message": message,
            "conversation_id": conversation_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.connection_manager.send_user_message(chat_message, user_id)

    async def send_typing_indicator(self, user_id: str, is_typing: bool = True):
        """
        Send typing indicator for AI responses.
        
        Args:
            user_id: User ID to send indicator to
            is_typing: Whether AI is typing
        """
        message = {
            "type": "typing_indicator",
            "sender": "ai",
            "is_typing": is_typing,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.connection_manager.send_user_message(message, user_id)

    # System Notifications

    async def send_system_notification(
        self, 
        user_id: str, 
        title: str, 
        message: str, 
        severity: str = "info",
        action_url: Optional[str] = None
    ):
        """
        Send system notification to user.
        
        Args:
            user_id: User ID to notify
            title: Notification title
            message: Notification message
            severity: Notification severity (info, warning, error, success)
            action_url: Optional URL for notification action
        """
        notification = {
            "type": "system_notification",
            "title": title,
            "message": message,
            "severity": severity,
            "action_url": action_url,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.connection_manager.send_user_message(notification, user_id)

    async def broadcast_system_announcement(
        self, 
        title: str, 
        message: str, 
        severity: str = "info"
    ):
        """
        Broadcast system announcement to all users.
        
        Args:
            title: Announcement title
            message: Announcement message
            severity: Announcement severity
        """
        announcement = {
            "type": "system_announcement",
            "title": title,
            "message": message,
            "severity": severity,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.connection_manager.broadcast_message(announcement)

    # Live Analytics

    async def send_analytics_update(
        self, 
        user_id: str, 
        analytics_data: Dict[str, Any]
    ):
        """
        Send live analytics update.
        
        Args:
            user_id: User ID to send update to
            analytics_data: Analytics data
        """
        message = {
            "type": "analytics_update",
            "data": analytics_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.connection_manager.send_user_message(message, user_id)

    # Workflow Updates

    async def send_workflow_suggestion(
        self, 
        user_id: str, 
        suggestion: Dict[str, Any]
    ):
        """
        Send workflow automation suggestion.
        
        Args:
            user_id: User ID to send suggestion to
            suggestion: Workflow suggestion data
        """
        message = {
            "type": "workflow_suggestion",
            "suggestion": suggestion,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.connection_manager.send_user_message(message, user_id)

    # Connection Management

    async def handle_connection(
        self, 
        websocket: WebSocket, 
        user_id: str, 
        connection_type: str = "general"
    ) -> str:
        """
        Handle new WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            user_id: User ID
            connection_type: Connection type
            
        Returns:
            Connection ID
        """
        return await self.connection_manager.connect(websocket, user_id, connection_type)

    async def handle_disconnect(self, connection_id: str):
        """
        Handle WebSocket disconnection.
        
        Args:
            connection_id: Connection ID to disconnect
        """
        await self.connection_manager.disconnect(connection_id)

    async def handle_message(
        self, 
        connection_id: str, 
        message: Dict[str, Any]
    ):
        """
        Handle incoming WebSocket message.
        
        Args:
            connection_id: Source connection ID
            message: Received message
        """
        message_type = message.get("type")
        
        if message_type == "ping":
            # Handle ping/pong for connection health
            await self.connection_manager.send_personal_message({
                "type": "pong",
                "timestamp": datetime.utcnow().isoformat()
            }, connection_id)
            
        elif message_type == "chat_message":
            # Handle chat message (would integrate with AI service)
            user_message = message.get("message", "")
            # TODO: Process with AI service and send response
            
        elif message_type == "subscribe":
            # Handle subscription to specific updates
            subscription_type = message.get("subscription_type")
            # TODO: Handle subscription logic
            
        else:
            logger.warning(
                "Unknown WebSocket message type",
                connection_id=connection_id,
                message_type=message_type
            )

    def get_stats(self) -> Dict[str, Any]:
        """
        Get WebSocket service statistics.
        
        Returns:
            Service statistics
        """
        return {
            "active_connections": self.connection_manager.get_connection_count(),
            "active_users": len(self.connection_manager.get_active_users()),
            "connection_types": {},  # TODO: Count by type
            "uptime": "N/A",  # TODO: Track service uptime
            "messages_sent": 0,  # TODO: Track message counts
            "last_updated": datetime.utcnow().isoformat()
        }


# Global connection manager instance
connection_manager = ConnectionManager()


async def get_websocket_service(db: AsyncSession) -> WebSocketService:
    """
    Get WebSocket service instance.
    
    Args:
        db: Database session
        
    Returns:
        WebSocket service instance
    """
    return WebSocketService(db)