"""Analytics API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from aria.core.database import get_db
from aria.core.security import security, security_manager

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_analytics(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard analytics data."""
    user_id = security_manager.get_current_user_id(credentials)
    
    return {
        "message": "Dashboard analytics - Coming soon!",
        "user_id": user_id,
        "stats": {
            "total_documents": 0,
            "processed_documents": 0,
            "storage_used": 0,
            "ai_interactions": 0
        }
    }


@router.get("/documents")
async def get_document_analytics(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Get document analytics."""
    user_id = security_manager.get_current_user_id(credentials)
    
    return {
        "message": "Document analytics - Coming soon!",
        "user_id": user_id,
        "analytics": []
    }


@router.get("/usage")
async def get_usage_analytics(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Get usage analytics."""
    user_id = security_manager.get_current_user_id(credentials)
    
    return {
        "message": "Usage analytics - Coming soon!",
        "user_id": user_id,
        "usage": {
            "daily_activity": [],
            "feature_usage": {},
            "performance_metrics": {}
        }
    }