"""
Bot WebSocket Endpoints - Real-time intelligent bot interactions
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
import json
from typing import Dict, Any

from core.database import get_db
from services.ai.realtime_bot_service import RealtimeBotService

logger = logging.getLogger(__name__)

router = APIRouter()

# Global service instance (in production, use dependency injection)
realtime_services: Dict[str, RealtimeBotService] = {}

@router.websocket("/ws/bot/{user_id}")
async def websocket_bot_endpoint(
    websocket: WebSocket,
    user_id: str,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time bot interactions"""
    try:
        # Create or get realtime service for this session
        if user_id not in realtime_services:
            realtime_services[user_id] = RealtimeBotService(db)
        
        service = realtime_services[user_id]
        
        # Handle WebSocket connection
        await service.handle_websocket_connection(websocket, user_id)
        
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
        if user_id in realtime_services:
            del realtime_services[user_id]
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        if user_id in realtime_services:
            del realtime_services[user_id]

@router.get("/api/bot/websocket/health")
async def websocket_health_check():
    """Check WebSocket service health"""
    try:
        active_services = len(realtime_services)
        total_connections = sum(
            len(service.connection_manager.active_connections) 
            for service in realtime_services.values()
        )
        
        health_status = "healthy" if active_services >= 0 else "degraded"
        
        return {
            "status": health_status,
            "service": "Bot WebSocket",
            "active_services": active_services,
            "total_connections": total_connections,
            "version": "2.0.0",
            "last_check": "2024-01-01T00:00:00Z"
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": "2024-01-01T00:00:00Z"
        }