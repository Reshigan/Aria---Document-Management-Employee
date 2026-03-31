"""
Central Exception Handler for ARIA ERP
Implements Zero-Slop error handling principles (Laws 1-8)
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
import traceback
from typing import Optional

from core.audit import log_audit_event, get_client_ip, get_user_agent

logger = logging.getLogger(__name__)

class ZeroSlopExceptionHandler:
    """Central exception handler implementing Zero-Slop principles"""
    
    @staticmethod
    async def handle_http_exception(
        request: Request,
        exc: HTTPException
    ):
        """Handle HTTP exceptions with audit logging"""
        # Get database session from request state if available
        db_session = getattr(request.state, 'db', None)
        
        # Log to audit trail
        if db_session:
            try:
                log_audit_event(
                    db=db_session,
                    user_id=getattr(request.state, 'user_id', None),
                    user_email=getattr(request.state, 'user_email', None),
                    action="http_error",
                    resource=request.url.path,
                    details={
                        "status_code": exc.status_code,
                        "error_detail": str(exc.detail),
                        "method": request.method
                    },
                    ip_address=get_client_ip(request),
                    user_agent=get_user_agent(request),
                    success=False,
                    error_message=str(exc.detail)
                )
            except Exception as audit_error:
                logger.error(f"Failed to log audit event: {audit_error}")
        
        # Return consistent error response
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "type": "http_exception",
                    "message": str(exc.detail),
                    "status_code": exc.status_code
                }
            }
        )
    
    @staticmethod
    async def handle_validation_error(
        request: Request,
        exc: RequestValidationError
    ):
        """Handle request validation errors with detailed feedback"""
        error_details = []
        for error in exc.errors():
            error_details.append({
                "field": ".".join(str(loc) for loc in error['loc']),
                "message": error['msg'],
                "type": error['type']
            })
        
        # Get database session from request state if available
        db_session = getattr(request.state, 'db', None)
        
        # Log validation error
        if db_session:
            try:
                log_audit_event(
                    db=db_session,
                    user_id=getattr(request.state, 'user_id', None),
                    user_email=getattr(request.state, 'user_email', None),
                    action="validation_error",
                    resource=request.url.path,
                    details={
                        "error_count": len(error_details),
                        "errors": error_details,
                        "method": request.method
                    },
                    ip_address=get_client_ip(request),
                    user_agent=get_user_agent(request),
                    success=False,
                    error_message="Request validation failed"
                )
            except Exception as audit_error:
                logger.error(f"Failed to log audit event: {audit_error}")
        
        # Return user-friendly validation error
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "type": "validation_error",
                    "message": "Request validation failed",
                    "details": error_details
                }
            }
        )
    
    @staticmethod
    async def handle_sqlalchemy_error(
        request: Request,
        exc: SQLAlchemyError
    ):
        """Handle database errors gracefully"""
        # Get database session from request state if available
        db_session = getattr(request.state, 'db', None)
        
        # Log database error (don't expose internal details)
        error_msg = "A database error occurred"
        logger.error(f"DB Error: {str(exc)}")
        logger.error(traceback.format_exc())
        
        if db_session:
            try:
                log_audit_event(
                    db=db_session,
                    user_id=getattr(request.state, 'user_id', None),
                    user_email=getattr(request.state, 'user_email', None),
                    action="database_error",
                    resource=request.url.path,
                    details={
                        "error_type": type(exc).__name__,
                        "method": request.method
                    },
                    ip_address=get_client_ip(request),
                    user_agent=get_user_agent(request),
                    success=False,
                    error_message=error_msg
                )
            except Exception as audit_error:
                logger.error(f"Failed to log audit event: {audit_error}")
        
        # Don't expose internal database errors
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "type": "database_error",
                    "message": error_msg
                }
            }
        )
    
    @staticmethod
    async def handle_generic_exception(
        request: Request,
        exc: Exception
    ):
        """Handle all other unhandled exceptions"""
        # Get database session from request state if available
        db_session = getattr(request.state, 'db', None)
        
        logger.error(f"Unhandled exception: {str(exc)}")
        logger.error(traceback.format_exc())
        
        # Log unexpected error
        if db_session:
            try:
                log_audit_event(
                    db=db_session,
                    user_id=getattr(request.state, 'user_id', None),
                    user_email=getattr(request.state, 'user_email', None),
                    action="unexpected_error",
                    resource=request.url.path,
                    details={
                        "error_type": type(exc).__name__,
                        "method": request.method
                    },
                    ip_address=get_client_ip(request),
                    user_agent=get_user_agent(request),
                    success=False,
                    error_message="Unexpected error occurred"
                )
            except Exception as audit_error:
                logger.error(f"Failed to log audit event: {audit_error}")
        
        # Generic error response (don't expose internal details)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "type": "internal_error",
                    "message": "An unexpected error occurred"
                }
            }
        )

def add_exception_handlers(app: FastAPI):
    """Add all exception handlers to the FastAPI app"""
    
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return await ZeroSlopExceptionHandler.handle_http_exception(request, exc)
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return await ZeroSlopExceptionHandler.handle_validation_error(request, exc)
    
    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
        return await ZeroSlopExceptionHandler.handle_sqlalchemy_error(request, exc)
    
    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        return await ZeroSlopExceptionHandler.handle_generic_exception(request, exc)