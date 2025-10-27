"""
Rate Limiting Middleware
Prevents brute force attacks and API abuse
"""

from typing import Dict
from datetime import datetime, timedelta
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiting middleware"""
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, list] = {}
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0]
        return request.client.host if request.client else "unknown"
    
    def _clean_old_requests(self, client_ip: str):
        """Remove requests older than 1 minute"""
        if client_ip in self.requests:
            cutoff = datetime.now() - timedelta(minutes=1)
            self.requests[client_ip] = [
                req_time for req_time in self.requests[client_ip]
                if req_time > cutoff
            ]
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/api/health"]:
            return await call_next(request)
        
        client_ip = self._get_client_ip(request)
        
        # Clean old requests
        self._clean_old_requests(client_ip)
        
        # Check rate limit
        if client_ip in self.requests:
            if len(self.requests[client_ip]) >= self.requests_per_minute:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many requests. Please try again later.",
                        "retry_after": 60
                    },
                    headers={"Retry-After": "60"}
                )
        
        # Record this request
        if client_ip not in self.requests:
            self.requests[client_ip] = []
        self.requests[client_ip].append(datetime.now())
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(
            max(0, self.requests_per_minute - len(self.requests.get(client_ip, [])))
        )
        
        return response
