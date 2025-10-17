"""ARIA - AI-Powered Document Management System - Main Application."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app
# import sentry_sdk
# from sentry_sdk.integrations.fastapi import FastApiIntegration
# from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from aria.api.v1.router import api_router
from aria.core.config import settings
from aria.core.database import close_db, init_db


# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer() if settings.log_format == "json" else structlog.dev.ConsoleRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


# Initialize Sentry for error tracking (disabled for development)
# if settings.sentry_dsn:
#     sentry_sdk.init(
#         dsn=settings.sentry_dsn,
#         integrations=[
#             FastApiIntegration(auto_enabling_integrations=False),
#             SqlalchemyIntegration(),
#         ],
#         traces_sample_rate=0.1,
#         environment=settings.environment,
#     )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    logger.info("Starting ARIA application", version=settings.app_version)
    
    # Initialize database
    await init_db()
    logger.info("Database initialized")
    
    yield
    
    # Cleanup
    await close_db()
    logger.info("ARIA application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="ARIA - AI Document Management",
    description="World-class AI-powered document management system with advanced bot capabilities",
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware for security
if settings.environment == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"]  # Configure with actual allowed hosts in production
    )


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "environment": settings.environment,
        "timestamp": "2024-01-01T00:00:00Z"  # Will be replaced with actual timestamp
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to ARIA - AI-Powered Document Management System",
        "version": settings.app_version,
        "docs": "/docs" if settings.debug else "Documentation not available in production",
        "health": "/health"
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(
        "Unhandled exception",
        exc_info=exc,
        path=request.url.path,
        method=request.method,
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "request_id": getattr(request.state, "request_id", None),
        }
    )


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests."""
    import time
    import uuid
    
    # Generate request ID
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    start_time = time.time()
    
    logger.info(
        "Request started",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        query_params=str(request.query_params),
    )
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    
    logger.info(
        "Request completed",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        process_time=process_time,
    )
    
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(process_time)
    
    return response


# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Include WebSocket routes
from aria.api.websocket import router as websocket_router
app.include_router(websocket_router)

# Add Prometheus metrics endpoint if enabled
if settings.prometheus_enabled:
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "aria.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload and settings.debug,
        log_level=settings.log_level.lower(),
        access_log=True,
    )