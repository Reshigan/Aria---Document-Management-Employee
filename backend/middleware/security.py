"""
ARIA Security Middleware
Implements security headers and rate limiting for production deployment.
"""

import time
import os
from collections import defaultdict
from typing import Callable, Dict, Tuple
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds security headers to all responses.
    These headers help protect against common web vulnerabilities.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Prevent clickjacking - allow framing only from same origin
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        
        # Enable XSS filter in browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions policy - restrict browser features
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
            "magnetometer=(), microphone=(), payment=(), usb=()"
        )
        
        # Content Security Policy - basic policy, customize as needed
        # Note: This is a permissive policy for API; frontend should have stricter CSP
        if not request.url.path.startswith("/docs") and not request.url.path.startswith("/openapi"):
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'self'"
            )
        
        # Strict Transport Security - enforce HTTPS (only in production)
        if os.getenv("ENVIRONMENT", "development") == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        # Cache control for API responses
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiting middleware.
    For production with multiple instances, use Redis-based rate limiting.
    
    Rate limits:
    - Auth endpoints (login, register): 5 requests per minute per IP
    - General API: 100 requests per minute per IP
    - Health check: No limit
    """
    
    # Rate limit configurations: (max_requests, window_seconds)
    RATE_LIMITS: Dict[str, Tuple[int, int]] = {
        "auth": (5, 60),      # 5 requests per minute for auth
        "api": (100, 60),     # 100 requests per minute for general API
        "bot": (20, 60),      # 20 bot executions per minute
    }
    
    # Paths that are exempt from rate limiting
    EXEMPT_PATHS = {"/health", "/", "/docs", "/openapi.json", "/redoc"}
    
    def __init__(self, app, use_redis: bool = False):
        super().__init__(app)
        self.use_redis = use_redis
        # In-memory storage: {ip: {endpoint_type: [(timestamp, count)]}}
        self.request_counts: Dict[str, Dict[str, list]] = defaultdict(lambda: defaultdict(list))
        
        # Try to use Redis if available and configured
        self.redis_client = None
        if use_redis:
            try:
                import redis
                redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
                self.redis_client = redis.from_url(redis_url)
                self.redis_client.ping()
                logger.info("Rate limiting using Redis")
            except Exception as e:
                logger.warning(f"Redis not available for rate limiting, using in-memory: {e}")
                self.redis_client = None
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, considering proxies."""
        # Check for forwarded headers (when behind proxy/load balancer)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Take the first IP in the chain (original client)
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fall back to direct client IP
        return request.client.host if request.client else "unknown"
    
    def _get_endpoint_type(self, path: str) -> str:
        """Categorize endpoint for rate limiting."""
        if path.startswith("/api/auth") or path.startswith("/auth"):
            return "auth"
        if path.startswith("/api/bots") or "/execute" in path:
            return "bot"
        return "api"
    
    def _check_rate_limit_memory(self, client_ip: str, endpoint_type: str) -> Tuple[bool, int]:
        """Check rate limit using in-memory storage. Returns (allowed, retry_after)."""
        max_requests, window_seconds = self.RATE_LIMITS.get(endpoint_type, (100, 60))
        current_time = time.time()
        window_start = current_time - window_seconds
        
        # Clean old entries and count recent requests
        requests = self.request_counts[client_ip][endpoint_type]
        requests[:] = [ts for ts in requests if ts > window_start]
        
        if len(requests) >= max_requests:
            # Calculate retry-after
            oldest_in_window = min(requests) if requests else current_time
            retry_after = int(oldest_in_window + window_seconds - current_time) + 1
            return False, retry_after
        
        # Record this request
        requests.append(current_time)
        return True, 0
    
    def _check_rate_limit_redis(self, client_ip: str, endpoint_type: str) -> Tuple[bool, int]:
        """Check rate limit using Redis. Returns (allowed, retry_after)."""
        if not self.redis_client:
            return self._check_rate_limit_memory(client_ip, endpoint_type)
        
        max_requests, window_seconds = self.RATE_LIMITS.get(endpoint_type, (100, 60))
        key = f"ratelimit:{client_ip}:{endpoint_type}"
        
        try:
            current_count = self.redis_client.get(key)
            if current_count is None:
                # First request in window
                self.redis_client.setex(key, window_seconds, 1)
                return True, 0
            
            current_count = int(current_count)
            if current_count >= max_requests:
                ttl = self.redis_client.ttl(key)
                return False, max(ttl, 1)
            
            self.redis_client.incr(key)
            return True, 0
        except Exception as e:
            logger.warning(f"Redis rate limit check failed, allowing request: {e}")
            return True, 0
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for exempt paths
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)
        
        client_ip = self._get_client_ip(request)
        endpoint_type = self._get_endpoint_type(request.url.path)
        
        # Check rate limit
        if self.redis_client:
            allowed, retry_after = self._check_rate_limit_redis(client_ip, endpoint_type)
        else:
            allowed, retry_after = self._check_rate_limit_memory(client_ip, endpoint_type)
        
        if not allowed:
            logger.warning(f"Rate limit exceeded for {client_ip} on {endpoint_type} endpoints")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Please try again later.",
                    "retry_after": retry_after
                },
                headers={"Retry-After": str(retry_after)}
            )
        
        # Add rate limit headers to response
        response = await call_next(request)
        max_requests, window_seconds = self.RATE_LIMITS.get(endpoint_type, (100, 60))
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Window"] = f"{window_seconds}s"
        
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs all requests for audit trail and debugging.
    Sensitive data is redacted from logs.
    """
    
    SENSITIVE_PATHS = {"/api/auth/login", "/api/auth/register", "/auth/login", "/auth/register"}
    SENSITIVE_HEADERS = {"authorization", "cookie", "x-api-key"}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Generate request ID for tracing
        request_id = request.headers.get("X-Request-ID", f"req_{int(start_time * 1000)}")
        
        # Log request (redact sensitive info)
        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
        log_path = request.url.path
        
        # Don't log body for sensitive endpoints
        if log_path not in self.SENSITIVE_PATHS:
            logger.info(f"[{request_id}] {request.method} {log_path} from {client_ip}")
        else:
            logger.info(f"[{request_id}] {request.method} {log_path} from {client_ip} [SENSITIVE]")
        
        # Process request
        try:
            response = await call_next(request)
        except Exception as e:
            logger.error(f"[{request_id}] Request failed: {str(e)}")
            raise
        
        # Log response
        duration_ms = (time.time() - start_time) * 1000
        logger.info(f"[{request_id}] Response {response.status_code} in {duration_ms:.2f}ms")
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response
