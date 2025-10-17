"""
Main API router for version 1.

This module combines all API v1 routers into a single router
that can be included in the main FastAPI application.
"""

from fastapi import APIRouter

from aria.api.v1.endpoints import ai, auth, documents, settings, users, websocket

# Create main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["authentication"]
)

api_router.include_router(
    users.router,
    prefix="/users",
    tags=["users"]
)

api_router.include_router(
    documents.router,
    prefix="/documents",
    tags=["documents"]
)

api_router.include_router(
    settings.router,
    prefix="/settings",
    tags=["settings"]
)

api_router.include_router(
    ai.router,
    prefix="/ai",
    tags=["ai"]
)

api_router.include_router(
    websocket.router,
    prefix="/ws",
    tags=["websocket"]
)

# Add combined settings endpoints for the frontend
from typing import Dict, Any
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from aria.core.database import get_db
from aria.services.settings_service import get_settings_service

@api_router.get("/config")
async def get_combined_settings(
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get combined settings for the frontend.
    
    Returns all settings in a format expected by the frontend.
    """
    settings_service = await get_settings_service(db)
    return await settings_service.get_combined_settings()

@api_router.post("/config")
async def update_combined_settings(
    settings_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Update combined settings from the frontend.
    
    Args:
        settings_data: Combined settings data from frontend
        db: Database session
        
    Returns:
        Success response with updated data
    """
    settings_service = await get_settings_service(db)
    return await settings_service.update_combined_settings(settings_data)