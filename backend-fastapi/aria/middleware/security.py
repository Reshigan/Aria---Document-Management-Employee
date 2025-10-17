"""
Security middleware for the Aria application.

This module provides security headers and other security-related middleware.
"""

from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from aria.core.logging import get_logger

logger = get_logger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.
    
    Adds various security headers to protect against common attacks
    and improve the security posture of the application.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and add security headers to response.
        
        Args:
            request: The incoming request
            call_next: The next middleware or route handler
            
        Returns:
            Response with security headers added
        """
        response = await call_next(request)
        
        # Security headers
        security_headers = {
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            
            # Enable XSS protection
            "X-XSS-Protection": "1; mode=block",
            
            # Referrer policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Content Security Policy (adjust as needed)
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self' ws: wss:; "
                "frame-ancestors 'none';"
            ),
            
            # Strict Transport Security (HTTPS only)
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            
            # Permissions Policy (formerly Feature Policy)
            "Permissions-Policy": (
                "camera=(), "
                "microphone=(), "
                "geolocation=(), "
                "payment=(), "
                "usb=(), "
                "magnetometer=(), "
                "gyroscope=(), "
                "accelerometer=()"
            ),
        }
        
        # Add headers to response
        for header, value in security_headers.items():
            response.headers[header] = value
        
        # Add custom server header
        response.headers["Server"] = "Aria/2.0"
        
        return response