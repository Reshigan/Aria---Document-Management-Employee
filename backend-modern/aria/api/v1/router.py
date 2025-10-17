"""Main API v1 router."""

from fastapi import APIRouter

from aria.api.auth.router import router as auth_router
from aria.api.documents.router import router as documents_router
from aria.api.v1.chat import router as chat_router
from aria.api.analytics.router import router as analytics_router
from aria.api.config.router import router as config_router

api_router = APIRouter()

# Include all sub-routers
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(documents_router, prefix="/documents", tags=["Documents"])
api_router.include_router(chat_router, prefix="/chat", tags=["AI Chat"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(config_router, tags=["Configuration"])