"""
Rate limiting middleware for the Aria application.

This module provides rate limiting functionality to prevent abuse
and ensure fair usage of the API.
"""

import time
from typing import Callable, Dict, Optional

from fastapi import HTTPException, Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware

from aria.core.logging import get_logger

logger = get_logger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using in-memory storage.
    
    For production use, consider using Redis or another distributed cache
    for rate limiting across multiple instances.
    """
    
    def __init__(
        self,
        app,
        calls: int = 60,
        period: int = 60,
        burst: int = 100,
        exempt_paths: Optional[list] = None,
    ):
        """
        Initialize rate limiting middleware.
        
        Args:
            app: FastAPI application instance
            calls: Number of calls allowed per period
            period: Time period in seconds
            burst: Maximum burst calls allowed
            exempt_paths: List of paths to exempt from rate limiting
        """
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.burst = burst
        self.exempt_paths = exempt_paths or ["/health", "/metrics", "/docs", "/redoc", "/openapi.json"]
        
        # In-memory storage for rate limiting
        # In production, use Redis or similar distributed cache
        self.clients: Dict[str, Dict[str, float]] = {}
    
    def get_client_id(self, request: Request) -> str:
        """
        Get client identifier for rate limiting.
        
        Args:
            request: The incoming request
            
        Returns:
            Client identifier string
        """
        # Try to get real IP from headers (for reverse proxy setups)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to client IP from connection
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def is_exempt(self, path: str) -> bool:
        """
        Check if path is exempt from rate limiting.
        
        Args:
            path: Request path
            
        Returns:
            True if path is exempt
        """
        return any(path.startswith(exempt_path) for exempt_path in self.exempt_paths)
    
    def is_rate_limited(self, client_id: str) -> tuple[bool, Dict[str, str]]:
        """
        Check if client is rate limited.
        
        Args:
            client_id: Client identifier
            
        Returns:
            Tuple of (is_limited, headers)
        """
        now = time.time()
        
        # Initialize client data if not exists
        if client_id not in self.clients:
            self.clients[client_id] = {
                "calls": 0,
                "reset_time": now + self.period,
                "burst_calls": 0,
                "burst_reset": now + 1,  # Burst resets every second
            }
        
        client_data = self.clients[client_id]
        
        # Reset counters if period has passed
        if now >= client_data["reset_time"]:
            client_data["calls"] = 0
            client_data["reset_time"] = now + self.period
        
        # Reset burst counter if burst period has passed
        if now >= client_data["burst_reset"]:
            client_data["burst_calls"] = 0
            client_data["burst_reset"] = now + 1
        
        # Check burst limit
        if client_data["burst_calls"] >= self.burst:
            headers = {
                "X-RateLimit-Limit": str(self.calls),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(client_data["reset_time"])),
                "X-RateLimit-Burst-Limit": str(self.burst),
                "X-RateLimit-Burst-Remaining": "0",
                "Retry-After": str(int(client_data["burst_reset"] - now)),
            }
            return True, headers
        
        # Check regular limit
        if client_data["calls"] >= self.calls:
            headers = {
                "X-RateLimit-Limit": str(self.calls),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(client_data["reset_time"])),
                "X-RateLimit-Burst-Limit": str(self.burst),
                "X-RateLimit-Burst-Remaining": str(self.burst - client_data["burst_calls"]),
                "Retry-After": str(int(client_data["reset_time"] - now)),
            }
            return True, headers
        
        # Increment counters
        client_data["calls"] += 1
        client_data["burst_calls"] += 1
        
        # Return headers with current limits
        headers = {
            "X-RateLimit-Limit": str(self.calls),
            "X-RateLimit-Remaining": str(self.calls - client_data["calls"]),
            "X-RateLimit-Reset": str(int(client_data["reset_time"])),
            "X-RateLimit-Burst-Limit": str(self.burst),
            "X-RateLimit-Burst-Remaining": str(self.burst - client_data["burst_calls"]),
        }
        
        return False, headers
    
    def cleanup_old_clients(self) -> None:
        """Clean up old client data to prevent memory leaks."""
        now = time.time()
        expired_clients = [
            client_id for client_id, data in self.clients.items()
            if now > data["reset_time"] + self.period
        ]
        
        for client_id in expired_clients:
            del self.clients[client_id]
        
        if expired_clients:
            logger.debug(f"Cleaned up {len(expired_clients)} expired rate limit entries")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and apply rate limiting.
        
        Args:
            request: The incoming request
            call_next: The next middleware or route handler
            
        Returns:
            Response or rate limit error
        """
        # Skip rate limiting for exempt paths
        if self.is_exempt(request.url.path):
            return await call_next(request)
        
        # Get client identifier
        client_id = self.get_client_id(request)
        
        # Check rate limit
        is_limited, headers = self.is_rate_limited(client_id)
        
        if is_limited:
            logger.warning(
                "Rate limit exceeded",
                client_id=client_id,
                path=request.url.path,
                method=request.method,
            )
            
            # Return rate limit error
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
                headers=headers,
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers to response
        for header, value in headers.items():
            response.headers[header] = value
        
        # Periodic cleanup (every 100 requests)
        if len(self.clients) % 100 == 0:
            self.cleanup_old_clients()
        
        return response