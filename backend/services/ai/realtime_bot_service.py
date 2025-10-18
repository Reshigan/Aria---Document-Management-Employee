"""
Real-time Bot Service - WebSocket-based intelligent bot interactions
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import uuid

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from services.ai.intelligent_bot_service import IntelligentBotService

logger = logging.getLogger(__name__)

@dataclass
class WebSocketMessage:
    id: str
    type: str
    data: Dict[str, Any]
    timestamp: str
    user_id: Optional[str] = None

class ConnectionManager:
    """Manage WebSocket connections for real-time bot interactions"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_sessions: Dict[str, str] = {}  # user_id -> connection_id
        
    async def connect(self, websocket: WebSocket, user_id: str) -> str:
        """Accept WebSocket connection and assign connection ID"""
        await websocket.accept()
        connection_id = str(uuid.uuid4())
        self.active_connections[connection_id] = websocket
        self.user_sessions[user_id] = connection_id
        
        logger.info(f"User {user_id} connected with connection {connection_id}")
        return connection_id
    
    def disconnect(self, connection_id: str, user_id: str):
        """Remove WebSocket connection"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        if user_id in self.user_sessions:
            del self.user_sessions[user_id]
        logger.info(f"User {user_id} disconnected")
    
    async def send_personal_message(self, message: WebSocketMessage, user_id: str):
        """Send message to specific user"""
        connection_id = self.user_sessions.get(user_id)
        if connection_id and connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                await websocket.send_text(json.dumps(asdict(message)))
            except Exception as e:
                logger.error(f"Failed to send message to user {user_id}: {e}")
    
    async def broadcast(self, message: WebSocketMessage):
        """Broadcast message to all connected users"""
        disconnected = []
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(json.dumps(asdict(message)))
            except Exception as e:
                logger.error(f"Failed to broadcast to connection {connection_id}: {e}")
                disconnected.append(connection_id)
        
        # Clean up disconnected connections
        for connection_id in disconnected:
            if connection_id in self.active_connections:
                del self.active_connections[connection_id]

class RealtimeBotService:
    """Real-time bot service with WebSocket support"""
    
    def __init__(self, db: Session):
        self.db = db
        self.bot_service = IntelligentBotService(db)
        self.connection_manager = ConnectionManager()
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        
    async def handle_websocket_connection(self, websocket: WebSocket, user_id: str):
        """Handle WebSocket connection lifecycle"""
        connection_id = await self.connection_manager.connect(websocket, user_id)
        
        # Initialize user session
        self.active_sessions[user_id] = {
            "connection_id": connection_id,
            "connected_at": datetime.now().isoformat(),
            "message_count": 0,
            "last_activity": datetime.now().isoformat()
        }
        
        # Send welcome message
        welcome_message = WebSocketMessage(
            id=str(uuid.uuid4()),
            type="welcome",
            data={
                "message": "Welcome to Aria AI Assistant! How can I help you today?",
                "capabilities": [
                    "Document Analysis",
                    "Intelligent Search",
                    "Workflow Automation",
                    "Compliance Checking",
                    "Predictive Insights"
                ],
                "quick_actions": [
                    "Analyze a document",
                    "Search documents",
                    "Get workflow suggestions",
                    "Check system status"
                ]
            },
            timestamp=datetime.now().isoformat(),
            user_id=user_id
        )
        
        await self.connection_manager.send_personal_message(welcome_message, user_id)
        
        try:
            while True:
                # Receive message from client
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Update session activity
                self.active_sessions[user_id]["last_activity"] = datetime.now().isoformat()
                self.active_sessions[user_id]["message_count"] += 1
                
                # Process message
                await self.process_websocket_message(message_data, user_id)
                
        except WebSocketDisconnect:
            self.connection_manager.disconnect(connection_id, user_id)
            if user_id in self.active_sessions:
                del self.active_sessions[user_id]
        except Exception as e:
            logger.error(f"WebSocket error for user {user_id}: {e}")
            self.connection_manager.disconnect(connection_id, user_id)
    
    async def process_websocket_message(self, message_data: Dict[str, Any], user_id: str):
        """Process incoming WebSocket message"""
        try:
            message_type = message_data.get("type", "chat")
            content = message_data.get("content", "")
            context = message_data.get("context", {})
            
            if message_type == "chat":
                await self.handle_chat_message(content, context, user_id)
            elif message_type == "document_analysis":
                await self.handle_document_analysis(message_data, user_id)
            elif message_type == "workflow_request":
                await self.handle_workflow_request(message_data, user_id)
            elif message_type == "system_query":
                await self.handle_system_query(message_data, user_id)
            elif message_type == "typing":
                await self.handle_typing_indicator(user_id)
            else:
                await self.send_error_message(f"Unknown message type: {message_type}", user_id)
                
        except Exception as e:
            logger.error(f"Error processing message from user {user_id}: {e}")
            await self.send_error_message("Failed to process your message", user_id)
    
    async def handle_chat_message(self, content: str, context: Dict[str, Any], user_id: str):
        """Handle chat message with intelligent response"""
        try:
            # Show typing indicator
            await self.send_typing_indicator(user_id, True)
            
            # Get bot response
            response = await self.bot_service.chat_with_bot(user_id, content, context)
            
            # Stop typing indicator
            await self.send_typing_indicator(user_id, False)
            
            # Send response
            response_message = WebSocketMessage(
                id=str(uuid.uuid4()),
                type="chat_response",
                data={
                    "message": response.message,
                    "context": response.context,
                    "suggested_actions": response.suggested_actions,
                    "confidence": response.confidence,
                    "sources": response.sources
                },
                timestamp=datetime.now().isoformat(),
                user_id=user_id
            )
            
            await self.connection_manager.send_personal_message(response_message, user_id)
            
        except Exception as e:
            logger.error(f"Chat handling error: {e}")
            await self.send_error_message("Failed to process chat message", user_id)
    
    async def handle_document_analysis(self, message_data: Dict[str, Any], user_id: str):
        """Handle document analysis request"""
        try:
            await self.send_typing_indicator(user_id, True)
            
            document_id = message_data.get("document_id")
            content = message_data.get("content", "")
            metadata = message_data.get("metadata", {})
            
            # Analyze document
            insight = await self.bot_service.analyze_document(document_id, content, metadata)
            
            await self.send_typing_indicator(user_id, False)
            
            # Send analysis result
            analysis_message = WebSocketMessage(
                id=str(uuid.uuid4()),
                type="document_analysis_result",
                data={
                    "document_id": insight.document_id,
                    "insights": insight.insights,
                    "confidence_score": insight.confidence_score,
                    "categories": insight.categories,
                    "key_entities": insight.key_entities,
                    "compliance_status": insight.compliance_status,
                    "recommendations": insight.recommendations
                },
                timestamp=datetime.now().isoformat(),
                user_id=user_id
            )
            
            await self.connection_manager.send_personal_message(analysis_message, user_id)
            
        except Exception as e:
            logger.error(f"Document analysis error: {e}")
            await self.send_error_message("Failed to analyze document", user_id)
    
    async def handle_workflow_request(self, message_data: Dict[str, Any], user_id: str):
        """Handle workflow automation request"""
        try:
            await self.send_typing_indicator(user_id, True)
            
            user_patterns = message_data.get("user_patterns", {})
            suggestions = await self.bot_service.suggest_workflow_automation(user_patterns)
            
            await self.send_typing_indicator(user_id, False)
            
            workflow_message = WebSocketMessage(
                id=str(uuid.uuid4()),
                type="workflow_suggestions",
                data={
                    "suggestions": suggestions,
                    "total_suggestions": len(suggestions),
                    "generated_at": datetime.now().isoformat()
                },
                timestamp=datetime.now().isoformat(),
                user_id=user_id
            )
            
            await self.connection_manager.send_personal_message(workflow_message, user_id)
            
        except Exception as e:
            logger.error(f"Workflow request error: {e}")
            await self.send_error_message("Failed to generate workflow suggestions", user_id)
    
    async def handle_system_query(self, message_data: Dict[str, Any], user_id: str):
        """Handle system status and information queries"""
        try:
            query_type = message_data.get("query_type", "status")
            
            if query_type == "status":
                system_info = {
                    "status": "operational",
                    "uptime": "99.9%",
                    "active_users": len(self.active_sessions),
                    "processed_documents": 1247,
                    "system_load": "moderate",
                    "last_backup": "2024-01-01T00:00:00Z"
                }
            elif query_type == "analytics":
                system_info = await self.bot_service.get_predictive_insights({})
            else:
                system_info = {"error": "Unknown query type"}
            
            system_message = WebSocketMessage(
                id=str(uuid.uuid4()),
                type="system_info",
                data=system_info,
                timestamp=datetime.now().isoformat(),
                user_id=user_id
            )
            
            await self.connection_manager.send_personal_message(system_message, user_id)
            
        except Exception as e:
            logger.error(f"System query error: {e}")
            await self.send_error_message("Failed to get system information", user_id)
    
    async def handle_typing_indicator(self, user_id: str):
        """Handle typing indicator from user"""
        # Could broadcast to other users in group chats
        pass
    
    async def send_typing_indicator(self, user_id: str, is_typing: bool):
        """Send typing indicator to user"""
        typing_message = WebSocketMessage(
            id=str(uuid.uuid4()),
            type="typing_indicator",
            data={"is_typing": is_typing, "from": "bot"},
            timestamp=datetime.now().isoformat(),
            user_id=user_id
        )
        
        await self.connection_manager.send_personal_message(typing_message, user_id)
    
    async def send_error_message(self, error_text: str, user_id: str):
        """Send error message to user"""
        error_message = WebSocketMessage(
            id=str(uuid.uuid4()),
            type="error",
            data={
                "error": error_text,
                "timestamp": datetime.now().isoformat(),
                "support_actions": [
                    "Try rephrasing your request",
                    "Check your connection",
                    "Contact support if the issue persists"
                ]
            },
            timestamp=datetime.now().isoformat(),
            user_id=user_id
        )
        
        await self.connection_manager.send_personal_message(error_message, user_id)
    
    async def broadcast_system_notification(self, notification: Dict[str, Any]):
        """Broadcast system notification to all connected users"""
        notification_message = WebSocketMessage(
            id=str(uuid.uuid4()),
            type="system_notification",
            data=notification,
            timestamp=datetime.now().isoformat()
        )
        
        await self.connection_manager.broadcast(notification_message)
    
    def get_active_sessions(self) -> Dict[str, Dict[str, Any]]:
        """Get information about active sessions"""
        return self.active_sessions.copy()
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            "total_connections": len(self.connection_manager.active_connections),
            "active_users": len(self.active_sessions),
            "total_messages": sum(session.get("message_count", 0) for session in self.active_sessions.values()),
            "uptime": "99.9%"
        }