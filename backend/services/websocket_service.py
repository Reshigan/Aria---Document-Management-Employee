"""
WebSocket service for real-time communication
"""
import json
import asyncio
from typing import Dict, List, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        # Store active connections by user ID
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Store connection metadata
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        
    async def connect(self, websocket: WebSocket, user_id: int, metadata: Optional[Dict[str, Any]] = None):
        """Accept a WebSocket connection and register it"""
        await websocket.accept()
        
        # Initialize user connections if not exists
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
            
        # Add connection
        self.active_connections[user_id].add(websocket)
        
        # Store metadata
        self.connection_metadata[websocket] = {
            'user_id': user_id,
            'connected_at': datetime.utcnow(),
            'metadata': metadata or {}
        }
        
        logger.info(f"WebSocket connected for user {user_id}")
        
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket in self.connection_metadata:
            user_id = self.connection_metadata[websocket]['user_id']
            
            # Remove from active connections
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                
                # Clean up empty user entries
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            # Remove metadata
            del self.connection_metadata[websocket]
            
            logger.info(f"WebSocket disconnected for user {user_id}")
    
    async def send_personal_message(self, message: str, user_id: int):
        """Send a message to all connections of a specific user"""
        if user_id in self.active_connections:
            disconnected = set()
            
            for websocket in self.active_connections[user_id].copy():
                try:
                    await websocket.send_text(message)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    disconnected.add(websocket)
            
            # Clean up disconnected websockets
            for websocket in disconnected:
                self.disconnect(websocket)
    
    async def send_json_to_user(self, data: Dict[str, Any], user_id: int):
        """Send JSON data to all connections of a specific user"""
        message = json.dumps(data, default=str)
        await self.send_personal_message(message, user_id)
    
    async def broadcast(self, message: str):
        """Broadcast a message to all connected users"""
        disconnected = set()
        
        for user_connections in self.active_connections.values():
            for websocket in user_connections.copy():
                try:
                    await websocket.send_text(message)
                except Exception as e:
                    logger.error(f"Error broadcasting message: {e}")
                    disconnected.add(websocket)
        
        # Clean up disconnected websockets
        for websocket in disconnected:
            self.disconnect(websocket)
    
    async def broadcast_json(self, data: Dict[str, Any]):
        """Broadcast JSON data to all connected users"""
        message = json.dumps(data, default=str)
        await self.broadcast(message)
    
    def get_user_connections(self, user_id: int) -> Set[WebSocket]:
        """Get all connections for a user"""
        return self.active_connections.get(user_id, set())
    
    def get_connected_users(self) -> List[int]:
        """Get list of all connected user IDs"""
        return list(self.active_connections.keys())
    
    def get_connection_count(self) -> int:
        """Get total number of active connections"""
        return sum(len(connections) for connections in self.active_connections.values())
    
    def get_user_connection_count(self, user_id: int) -> int:
        """Get number of connections for a specific user"""
        return len(self.active_connections.get(user_id, set()))


class WebSocketService:
    """Service for managing WebSocket communications"""
    
    def __init__(self):
        self.manager = ConnectionManager()
    
    async def connect_user(self, websocket: WebSocket, user_id: int, metadata: Optional[Dict[str, Any]] = None):
        """Connect a user's WebSocket"""
        await self.manager.connect(websocket, user_id, metadata)
    
    def disconnect_user(self, websocket: WebSocket):
        """Disconnect a user's WebSocket"""
        self.manager.disconnect(websocket)
    
    async def notify_user(self, user_id: int, notification_type: str, data: Dict[str, Any]):
        """Send a notification to a specific user"""
        message = {
            'type': notification_type,
            'timestamp': datetime.utcnow().isoformat(),
            'data': data
        }
        await self.manager.send_json_to_user(message, user_id)
    
    async def notify_document_processing(self, user_id: int, job_id: int, status: str, 
                                       progress: Optional[float] = None, 
                                       results: Optional[Dict[str, Any]] = None,
                                       error_message: Optional[str] = None):
        """Send document processing notification"""
        data = {
            'job_id': job_id,
            'status': status,
            'progress': progress,
            'results': results,
            'error_message': error_message
        }
        await self.notify_user(user_id, 'document_processing', data)
    
    async def notify_chat_message(self, user_id: int, session_id: str, message: Dict[str, Any]):
        """Send chat message notification"""
        data = {
            'session_id': session_id,
            'message': message
        }
        await self.notify_user(user_id, 'chat_message', data)
    
    async def notify_system_alert(self, user_id: int, alert_type: str, message: str, 
                                 severity: str = 'info'):
        """Send system alert notification"""
        data = {
            'alert_type': alert_type,
            'message': message,
            'severity': severity
        }
        await self.notify_user(user_id, 'system_alert', data)
    
    async def broadcast_system_maintenance(self, message: str, scheduled_time: Optional[datetime] = None):
        """Broadcast system maintenance notification to all users"""
        data = {
            'type': 'system_maintenance',
            'message': message,
            'scheduled_time': scheduled_time.isoformat() if scheduled_time else None,
            'timestamp': datetime.utcnow().isoformat()
        }
        await self.manager.broadcast_json(data)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get WebSocket connection statistics"""
        return {
            'total_connections': self.manager.get_connection_count(),
            'connected_users': len(self.manager.get_connected_users()),
            'users': self.manager.get_connected_users()
        }
    
    async def handle_websocket_connection(self, websocket: WebSocket, user_id: int):
        """Handle a WebSocket connection lifecycle"""
        try:
            await self.connect_user(websocket, user_id)
            
            # Send connection confirmation
            await self.notify_user(user_id, 'connection_established', {
                'message': 'WebSocket connection established',
                'user_id': user_id
            })
            
            # Keep connection alive and handle incoming messages
            while True:
                try:
                    # Wait for messages from client
                    data = await websocket.receive_text()
                    
                    # Parse and handle client messages
                    try:
                        message = json.loads(data)
                        await self._handle_client_message(websocket, user_id, message)
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON received from user {user_id}: {data}")
                        
                except WebSocketDisconnect:
                    logger.info(f"WebSocket disconnected for user {user_id}")
                    break
                except Exception as e:
                    logger.error(f"Error in WebSocket connection for user {user_id}: {e}")
                    break
                    
        except Exception as e:
            logger.error(f"Error handling WebSocket connection for user {user_id}: {e}")
        finally:
            self.disconnect_user(websocket)
    
    async def _handle_client_message(self, websocket: WebSocket, user_id: int, message: Dict[str, Any]):
        """Handle messages received from client"""
        message_type = message.get('type')
        
        if message_type == 'ping':
            # Respond to ping with pong
            await self.notify_user(user_id, 'pong', {'timestamp': datetime.utcnow().isoformat()})
            
        elif message_type == 'subscribe':
            # Handle subscription to specific events
            channels = message.get('channels', [])
            logger.info(f"User {user_id} subscribed to channels: {channels}")
            
        elif message_type == 'unsubscribe':
            # Handle unsubscription from specific events
            channels = message.get('channels', [])
            logger.info(f"User {user_id} unsubscribed from channels: {channels}")
            
        else:
            logger.warning(f"Unknown message type from user {user_id}: {message_type}")


# Global WebSocket service instance
websocket_service = WebSocketService()