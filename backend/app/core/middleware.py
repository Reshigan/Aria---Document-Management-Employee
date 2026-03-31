"""
Middleware for ARIA ERP
Provides request-level database sessions and context for audit logging
"""
from fastapi import Request, Response
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware
import uuid
from typing import Callable

from core.database import SessionLocal

class DatabaseSessionMiddleware(BaseHTTPMiddleware):
    """Middleware to provide database sessions for each request"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Create database session for this request
        db = SessionLocal()
        try:
            # Attach session to request state for exception handlers
            request.state.db = db
            
            # Process request
            response = await call_next(request)
            
            # Commit any pending transactions
            db.commit()
            return response
        except Exception as e:
            # Rollback on error
            db.rollback()
            raise e
        finally:
            # Always close the session
            db.close()

class RequestContextMiddleware(BaseHTTPMiddleware):
    """Middleware to enrich request context for audit logging"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Add request ID for tracing
        request.state.request_id = str(uuid.uuid4())
        
        # Extract user information if available (will be populated by auth middleware)
        request.state.user_id = None
        request.state.user_email = None
        
        # Process request
        response = await call_next(request)
        return response