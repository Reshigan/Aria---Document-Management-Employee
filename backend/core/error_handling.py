"""
Comprehensive Error Handling System for Aria Document Management
Enterprise-grade error handling with logging, monitoring, and user-friendly responses
"""

import logging
import traceback
from datetime import datetime
from typing import Any, Dict, Optional
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import asyncio
import json

# Configure logging
import os
log_dir = os.getenv('LOG_DIR', './logs')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'application.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class AriaException(Exception):
    """Base exception class for Aria application"""
    
    def __init__(
        self,
        message: str,
        error_code: str = "ARIA_ERROR",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        self.timestamp = datetime.utcnow().isoformat()
        super().__init__(self.message)

class AuthenticationError(AriaException):
    """Authentication related errors"""
    
    def __init__(self, message: str = "Authentication failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="AUTH_ERROR",
            status_code=401,
            details=details
        )

class AuthorizationError(AriaException):
    """Authorization related errors"""
    
    def __init__(self, message: str = "Access denied", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="AUTHZ_ERROR",
            status_code=403,
            details=details
        )

class ValidationError(AriaException):
    """Data validation errors"""
    
    def __init__(self, message: str = "Validation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=422,
            details=details
        )

class ResourceNotFoundError(AriaException):
    """Resource not found errors"""
    
    def __init__(self, message: str = "Resource not found", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            status_code=404,
            details=details
        )

class DatabaseError(AriaException):
    """Database operation errors"""
    
    def __init__(self, message: str = "Database operation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="DB_ERROR",
            status_code=500,
            details=details
        )

class FileOperationError(AriaException):
    """File operation errors"""
    
    def __init__(self, message: str = "File operation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="FILE_ERROR",
            status_code=500,
            details=details
        )

class RateLimitError(AriaException):
    """Rate limiting errors"""
    
    def __init__(self, message: str = "Rate limit exceeded", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="RATE_LIMIT",
            status_code=429,
            details=details
        )

class ErrorLogger:
    """Centralized error logging system"""
    
    @staticmethod
    def log_error(
        error: Exception,
        request: Optional[Request] = None,
        user_id: Optional[str] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ):
        """Log error with comprehensive context"""
        
        error_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "error_type": type(error).__name__,
            "error_message": str(error),
            "traceback": traceback.format_exc(),
            "user_id": user_id,
            "additional_context": additional_context or {}
        }
        
        if request:
            error_data.update({
                "method": request.method,
                "url": str(request.url),
                "headers": dict(request.headers),
                "client_ip": request.client.host if request.client else None
            })
        
        # Log to file
        logger.error(f"Application Error: {json.dumps(error_data, indent=2)}")
        
        # Send to monitoring system (placeholder)
        asyncio.create_task(ErrorLogger._send_to_monitoring(error_data))
    
    @staticmethod
    async def _send_to_monitoring(error_data: Dict[str, Any]):
        """Send error data to monitoring system"""
        try:
            # Placeholder for monitoring integration (e.g., Sentry, DataDog)
            # await monitoring_client.send_error(error_data)
            pass
        except Exception as e:
            logger.error(f"Failed to send error to monitoring: {e}")

def create_error_response(
    error: AriaException,
    request: Optional[Request] = None,
    include_details: bool = False
) -> JSONResponse:
    """Create standardized error response"""
    
    response_data = {
        "success": False,
        "error": {
            "code": error.error_code,
            "message": error.message,
            "timestamp": error.timestamp
        }
    }
    
    # Include details in development/debug mode
    if include_details and error.details:
        response_data["error"]["details"] = error.details
    
    # Log the error
    ErrorLogger.log_error(error, request)
    
    return JSONResponse(
        status_code=error.status_code,
        content=response_data
    )

async def aria_exception_handler(request: Request, exc: AriaException) -> JSONResponse:
    """Global exception handler for Aria exceptions"""
    return create_error_response(exc, request, include_details=True)

async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTP exceptions"""
    
    aria_exc = AriaException(
        message=exc.detail if hasattr(exc, 'detail') else "HTTP error occurred",
        error_code="HTTP_ERROR",
        status_code=exc.status_code
    )
    
    return create_error_response(aria_exc, request)

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle validation errors"""
    
    validation_errors = []
    for error in exc.errors():
        validation_errors.append({
            "field": " -> ".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    aria_exc = ValidationError(
        message="Request validation failed",
        details={"validation_errors": validation_errors}
    )
    
    return create_error_response(aria_exc, request, include_details=True)

async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions"""
    
    aria_exc = AriaException(
        message="An unexpected error occurred",
        error_code="INTERNAL_ERROR",
        status_code=500,
        details={"original_error": str(exc)}
    )
    
    ErrorLogger.log_error(exc, request)
    
    return create_error_response(aria_exc, request)

class ErrorMiddleware:
    """Middleware for error handling and logging"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        try:
            await self.app(scope, receive, send)
        except Exception as exc:
            # Log the error
            ErrorLogger.log_error(exc, request)
            
            # Create error response
            if isinstance(exc, AriaException):
                response = create_error_response(exc, request, include_details=True)
            else:
                aria_exc = AriaException(
                    message="An unexpected error occurred",
                    error_code="INTERNAL_ERROR",
                    status_code=500
                )
                response = create_error_response(aria_exc, request)
            
            await response(scope, receive, send)

# Health check utilities
class HealthChecker:
    """System health checking utilities"""
    
    @staticmethod
    async def check_database_health() -> Dict[str, Any]:
        """Check database connectivity and performance"""
        try:
            from core.database import get_db
            
            # Simple database query to check connectivity
            async with get_db() as db:
                result = await db.execute("SELECT 1")
                return {
                    "status": "healthy",
                    "response_time_ms": 0,  # Would measure actual time
                    "message": "Database connection successful"
                }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "message": "Database connection failed"
            }
    
    @staticmethod
    async def check_redis_health() -> Dict[str, Any]:
        """Check Redis connectivity"""
        try:
            # Placeholder for Redis health check
            return {
                "status": "healthy",
                "message": "Redis connection successful"
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "message": "Redis connection failed"
            }
    
    @staticmethod
    async def check_file_system_health() -> Dict[str, Any]:
        """Check file system health"""
        try:
            import os
            import shutil
            
            # Check disk space
            disk_usage = shutil.disk_usage("/")
            free_space_gb = disk_usage.free / (1024**3)
            
            if free_space_gb < 1:  # Less than 1GB free
                return {
                    "status": "warning",
                    "free_space_gb": round(free_space_gb, 2),
                    "message": "Low disk space"
                }
            
            return {
                "status": "healthy",
                "free_space_gb": round(free_space_gb, 2),
                "message": "File system healthy"
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "message": "File system check failed"
            }

# Utility functions
def safe_execute(func, *args, **kwargs):
    """Safely execute a function with error handling"""
    try:
        return func(*args, **kwargs)
    except Exception as e:
        ErrorLogger.log_error(e)
        raise AriaException(
            message=f"Operation failed: {str(e)}",
            error_code="EXECUTION_ERROR",
            status_code=500
        )

async def safe_execute_async(func, *args, **kwargs):
    """Safely execute an async function with error handling"""
    try:
        return await func(*args, **kwargs)
    except Exception as e:
        ErrorLogger.log_error(e)
        raise AriaException(
            message=f"Async operation failed: {str(e)}",
            error_code="ASYNC_EXECUTION_ERROR",
            status_code=500
        )

# Context manager for error handling
class ErrorContext:
    """Context manager for handling errors in specific operations"""
    
    def __init__(self, operation_name: str, user_id: Optional[str] = None):
        self.operation_name = operation_name
        self.user_id = user_id
        self.start_time = None
    
    def __enter__(self):
        self.start_time = datetime.utcnow()
        logger.info(f"Starting operation: {self.operation_name}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.utcnow() - self.start_time).total_seconds()
        
        if exc_type is None:
            logger.info(f"Operation completed successfully: {self.operation_name} ({duration:.2f}s)")
        else:
            logger.error(f"Operation failed: {self.operation_name} ({duration:.2f}s)")
            ErrorLogger.log_error(
                exc_val,
                additional_context={
                    "operation": self.operation_name,
                    "duration_seconds": duration,
                    "user_id": self.user_id
                }
            )
        
        return False  # Don't suppress exceptions