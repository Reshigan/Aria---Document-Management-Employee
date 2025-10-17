"""
Main FastAPI application for Aria Document Management System.

This is the entry point for the world-class FastAPI backend with modern
architecture, async operations, and comprehensive features.
"""

import asyncio
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from aria.api.v1.router import api_router
from aria.core.config import settings
from aria.core.database import close_db, init_db
from aria.core.logging import LoggingMiddleware, configure_logging, get_logger
from aria.middleware.rate_limit import RateLimitMiddleware
from aria.middleware.security import SecurityHeadersMiddleware
from aria.schemas.base import ErrorResponse

# Configure logging
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Handles startup and shutdown events for the FastAPI application.
    """
    # Startup
    logger.info("Starting Aria Document Management System", version=settings.VERSION)
    
    try:
        # Initialize database
        await init_db()
        logger.info("Database initialized successfully")
        
        # Initialize other services here (Redis, Celery, etc.)
        # await init_redis()
        # await init_celery()
        
        logger.info("Application startup completed")
        
    except Exception as e:
        logger.error("Failed to start application", error=str(e), exc_info=True)
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Aria Document Management System")
    
    try:
        # Close database connections
        await close_db()
        logger.info("Database connections closed")
        
        # Close other services
        # await close_redis()
        # await close_celery()
        
        logger.info("Application shutdown completed")
        
    except Exception as e:
        logger.error("Error during shutdown", error=str(e), exc_info=True)


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    # Custom OpenAPI configuration
    openapi_tags=[
        {
            "name": "authentication",
            "description": "Authentication and authorization operations",
        },
        {
            "name": "users",
            "description": "User management operations",
        },
        {
            "name": "documents",
            "description": "Document management operations",
        },
        {
            "name": "settings",
            "description": "System configuration and settings",
        },
        {
            "name": "health",
            "description": "Health check and monitoring endpoints",
        },
    ],
)

# Add middleware (order matters!)

# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Trusted host middleware
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"]  # Configure with actual allowed hosts in production
    )

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# GZip compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Rate limiting middleware
app.add_middleware(
    RateLimitMiddleware,
    calls=settings.RATE_LIMIT_PER_MINUTE,
    period=60,
    burst=settings.RATE_LIMIT_BURST,
)

# Logging middleware (should be last)
app.add_middleware(LoggingMiddleware)


# Exception handlers

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTP exceptions."""
    logger.warning(
        "HTTP exception occurred",
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error="HTTP_ERROR",
            message=exc.detail,
            details={"status_code": exc.status_code}
        ).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation errors."""
    logger.warning(
        "Validation error occurred",
        errors=exc.errors(),
        path=request.url.path,
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            error="VALIDATION_ERROR",
            message="Request validation failed",
            details={"errors": exc.errors()}
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle general exceptions."""
    logger.error(
        "Unhandled exception occurred",
        error=str(exc),
        path=request.url.path,
        exc_info=True,
    )
    
    # Don't expose internal errors in production
    if settings.ENVIRONMENT == "production":
        message = "An internal error occurred"
        details = None
    else:
        message = str(exc)
        details = {"type": type(exc).__name__}
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="INTERNAL_ERROR",
            message=message,
            details=details
        ).model_dump(),
    )


# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


# Root endpoint
@app.get("/", tags=["health"])
async def root() -> Dict[str, Any]:
    """
    Root endpoint with basic application information.
    
    Returns:
        Dict containing application information
    """
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "description": settings.DESCRIPTION,
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "api_url": settings.API_V1_STR,
        "status": "healthy",
    }


# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns:
        Dict containing health status and system information
    """
    try:
        # Check database connectivity
        from aria.core.database import engine
        from sqlalchemy import text
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        db_status = "unhealthy"
    
    # Check other services
    checks = {
        "database": db_status,
        # Add other service checks here
        # "redis": await check_redis(),
        # "celery": await check_celery(),
    }
    
    # Overall status
    overall_status = "healthy" if all(status == "healthy" for status in checks.values()) else "unhealthy"
    
    from datetime import datetime
    
    return {
        "status": overall_status,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat(),
    }


# Metrics endpoint (for Prometheus)
@app.get("/metrics", tags=["health"])
async def metrics() -> Dict[str, Any]:
    """
    Metrics endpoint for monitoring systems.
    
    Returns:
        Dict containing application metrics
    """
    # This would typically return Prometheus-formatted metrics
    # For now, return basic metrics in JSON format
    return {
        "http_requests_total": 0,  # Would be tracked by middleware
        "http_request_duration_seconds": 0.0,
        "database_connections_active": 0,
        "documents_processed_total": 0,
        "errors_total": 0,
        "timestamp": asyncio.get_event_loop().time(),
    }


if __name__ == "__main__":
    import uvicorn
    
    # Run the application
    uvicorn.run(
        "aria.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True,
    )