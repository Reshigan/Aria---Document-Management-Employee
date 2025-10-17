"""
Structured logging configuration for the Aria application.

This module provides centralized logging setup with structured logging
using structlog for better observability and debugging.
"""

import logging
import sys
from typing import Any, Dict

import structlog
from structlog.stdlib import LoggerFactory

from aria.core.config import settings


def configure_logging() -> None:
    """Configure structured logging for the application."""
    
    # Configure structlog
    structlog.configure(
        processors=[
            # Add log level and timestamp
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            # Use JSON formatter for production, console for development
            structlog.processors.JSONRenderer()
            if settings.ENVIRONMENT == "production"
            else structlog.dev.ConsoleRenderer(colors=True),
        ],
        context_class=dict,
        logger_factory=LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.LOG_LEVEL.upper()),
    )
    
    # Set specific logger levels
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.ENVIRONMENT == "development" else logging.WARNING
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """
    Get a structured logger instance.
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        BoundLogger: Configured logger instance
    """
    return structlog.get_logger(name)


class LoggingMiddleware:
    """Middleware to log HTTP requests and responses."""
    
    def __init__(self, app):
        self.app = app
        self.logger = get_logger(__name__)
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Extract request info
        method = scope["method"]
        path = scope["path"]
        query_string = scope.get("query_string", b"").decode()
        client_ip = None
        
        # Get client IP from headers or scope
        for header_name, header_value in scope.get("headers", []):
            if header_name == b"x-forwarded-for":
                client_ip = header_value.decode().split(",")[0].strip()
                break
            elif header_name == b"x-real-ip":
                client_ip = header_value.decode()
                break
        
        if not client_ip:
            client_ip = scope.get("client", ["unknown"])[0]
        
        # Log request
        self.logger.info(
            "HTTP request started",
            method=method,
            path=path,
            query_string=query_string,
            client_ip=client_ip,
        )
        
        # Capture response
        status_code = None
        
        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
            
            # Log successful response
            self.logger.info(
                "HTTP request completed",
                method=method,
                path=path,
                status_code=status_code,
                client_ip=client_ip,
            )
            
        except Exception as exc:
            # Log error
            self.logger.error(
                "HTTP request failed",
                method=method,
                path=path,
                client_ip=client_ip,
                error=str(exc),
                exc_info=True,
            )
            raise


def log_function_call(func_name: str, **kwargs: Any) -> None:
    """
    Log a function call with parameters.
    
    Args:
        func_name: Name of the function being called
        **kwargs: Function parameters to log
    """
    logger = get_logger("function_calls")
    logger.debug(
        "Function called",
        function=func_name,
        parameters=kwargs,
    )


def log_database_operation(operation: str, table: str, **kwargs: Any) -> None:
    """
    Log a database operation.
    
    Args:
        operation: Type of operation (SELECT, INSERT, UPDATE, DELETE)
        table: Table name
        **kwargs: Additional operation details
    """
    logger = get_logger("database")
    logger.debug(
        "Database operation",
        operation=operation,
        table=table,
        **kwargs,
    )