"""Documents API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from aria.core.database import get_db
from aria.core.security import security, security_manager

router = APIRouter()


@router.get("/")
async def get_documents(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Get user documents."""
    user_id = security_manager.get_current_user_id(credentials)
    
    return {
        "message": "Documents endpoint - Coming soon!",
        "user_id": user_id,
        "documents": []
    }


@router.post("/upload")
async def upload_document(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Upload a new document."""
    user_id = security_manager.get_current_user_id(credentials)
    
    return {
        "message": "Document upload endpoint - Coming soon!",
        "user_id": user_id
    }


@router.get("/{document_id}")
async def get_document(
    document_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Get specific document."""
    user_id = security_manager.get_current_user_id(credentials)
    
    return {
        "message": f"Document {document_id} endpoint - Coming soon!",
        "user_id": user_id,
        "document_id": document_id
    }