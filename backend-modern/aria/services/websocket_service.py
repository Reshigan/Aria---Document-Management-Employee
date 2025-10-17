"""
WebSocket service for real-time notifications and communication.
"""
import asyncio
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class NotificationMessage(BaseModel):
    """Notification message model."""
    type: str
    data: Dict[str, Any]
    timestamp: datetime
    user_id: Optional[str] = None
    session_id: Optional[str] = None


class ConnectionManager:
    """Manages WebSocket connections and broadcasting."""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, List[str]] = {}  # user_id -> [connection_ids]
        self.session_connections: Dict[str, List[str]] = {}  # session_id -> [connection_ids]
    
    async def connect(self, websocket: WebSocket, connection_id: str, user_id: Optional[str] = None):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(connection_id)
        
        logger.info(f"WebSocket connection established: {connection_id} for user: {user_id}")
    
    def disconnect(self, connection_id: str, user_id: Optional[str] = None):
        """Remove a WebSocket connection."""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        if user_id and user_id in self.user_connections:
            if connection_id in self.user_connections[user_id]:
                self.user_connections[user_id].remove(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        # Remove from session connections
        for session_id, connections in self.session_connections.items():
            if connection_id in connections:
                connections.remove(connection_id)
        
        logger.info(f"WebSocket connection closed: {connection_id}")
    
    def join_session(self, connection_id: str, session_id: str):
        """Add connection to a chat session."""
        if session_id not in self.session_connections:
            self.session_connections[session_id] = []
        
        if connection_id not in self.session_connections[session_id]:
            self.session_connections[session_id].append(connection_id)
    
    def leave_session(self, connection_id: str, session_id: str):
        """Remove connection from a chat session."""
        if session_id in self.session_connections:
            if connection_id in self.session_connections[session_id]:
                self.session_connections[session_id].remove(connection_id)
            if not self.session_connections[session_id]:
                del self.session_connections[session_id]
    
    async def send_personal_message(self, message: str, connection_id: str):
        """Send a message to a specific connection."""
        if connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                self.disconnect(connection_id)
    
    async def send_to_user(self, message: str, user_id: str):
        """Send a message to all connections of a specific user."""
        if user_id in self.user_connections:
            disconnected_connections = []
            for connection_id in self.user_connections[user_id]:
                try:
                    await self.active_connections[connection_id].send_text(message)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}, connection {connection_id}: {e}")
                    disconnected_connections.append(connection_id)
            
            # Clean up disconnected connections
            for connection_id in disconnected_connections:
                self.disconnect(connection_id, user_id)
    
    async def send_to_session(self, message: str, session_id: str):
        """Send a message to all connections in a chat session."""
        if session_id in self.session_connections:
            disconnected_connections = []
            for connection_id in self.session_connections[session_id]:
                try:
                    await self.active_connections[connection_id].send_text(message)
                except Exception as e:
                    logger.error(f"Error sending message to session {session_id}, connection {connection_id}: {e}")
                    disconnected_connections.append(connection_id)
            
            # Clean up disconnected connections
            for connection_id in disconnected_connections:
                self.disconnect(connection_id)
    
    async def broadcast(self, message: str):
        """Broadcast a message to all active connections."""
        disconnected_connections = []
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to {connection_id}: {e}")
                disconnected_connections.append(connection_id)
        
        # Clean up disconnected connections
        for connection_id in disconnected_connections:
            self.disconnect(connection_id)


class WebSocketService:
    """Service for handling WebSocket operations and notifications."""
    
    def __init__(self):
        self.manager = ConnectionManager()
    
    async def handle_connection(self, websocket: WebSocket, connection_id: str, user_id: Optional[str] = None):
        """Handle a new WebSocket connection."""
        await self.manager.connect(websocket, connection_id, user_id)
        
        try:
            while True:
                data = await websocket.receive_text()
                await self.handle_message(data, connection_id, user_id)
        except WebSocketDisconnect:
            self.manager.disconnect(connection_id, user_id)
        except Exception as e:
            logger.error(f"WebSocket error for {connection_id}: {e}")
            self.manager.disconnect(connection_id, user_id)
    
    async def handle_message(self, data: str, connection_id: str, user_id: Optional[str] = None):
        """Handle incoming WebSocket message."""
        try:
            message = json.loads(data)
            message_type = message.get("type")
            
            if message_type == "join_session":
                session_id = message.get("session_id")
                if session_id:
                    self.manager.join_session(connection_id, session_id)
                    await self.send_notification(
                        "session_joined",
                        {"session_id": session_id},
                        connection_id=connection_id
                    )
            
            elif message_type == "leave_session":
                session_id = message.get("session_id")
                if session_id:
                    self.manager.leave_session(connection_id, session_id)
                    await self.send_notification(
                        "session_left",
                        {"session_id": session_id},
                        connection_id=connection_id
                    )
            
            elif message_type == "ping":
                await self.send_notification(
                    "pong",
                    {"timestamp": datetime.utcnow().isoformat()},
                    connection_id=connection_id
                )
            
            else:
                logger.warning(f"Unknown message type: {message_type}")
        
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON received from {connection_id}: {data}")
        except Exception as e:
            logger.error(f"Error handling message from {connection_id}: {e}")
    
    async def send_notification(
        self,
        notification_type: str,
        data: Dict[str, Any],
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        connection_id: Optional[str] = None
    ):
        """Send a notification to specified targets."""
        notification = NotificationMessage(
            type=notification_type,
            data=data,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            session_id=session_id
        )
        
        message = notification.model_dump_json()
        
        if connection_id:
            await self.manager.send_personal_message(message, connection_id)
        elif user_id:
            await self.manager.send_to_user(message, user_id)
        elif session_id:
            await self.manager.send_to_session(message, session_id)
        else:
            await self.manager.broadcast(message)
    
    async def notify_chat_message(self, session_id: str, message_data: Dict[str, Any]):
        """Notify about a new chat message."""
        await self.send_notification(
            "chat_message",
            message_data,
            session_id=session_id
        )
    
    async def notify_document_processing(self, user_id: str, document_data: Dict[str, Any]):
        """Notify about document processing status."""
        await self.send_notification(
            "document_processing",
            document_data,
            user_id=user_id
        )
    
    async def notify_system_status(self, status_data: Dict[str, Any]):
        """Broadcast system status updates."""
        await self.send_notification(
            "system_status",
            status_data
        )
    
    async def notify_user_activity(self, session_id: str, activity_data: Dict[str, Any]):
        """Notify about user activity in a session."""
        await self.send_notification(
            "user_activity",
            activity_data,
            session_id=session_id
        )


# Global WebSocket service instance
websocket_service = WebSocketService()