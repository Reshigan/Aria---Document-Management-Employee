"""
Security middleware for Aria Document Management System
Implements comprehensive security headers and protections
"""

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import time
import logging
from collections import defaultdict
from datetime import datetime, timedelta
import ipaddress

logger = logging.getLogger(__name__)

class SecurityMiddleware(BaseHTTPMiddleware):
    """Comprehensive security middleware"""
    
    def __init__(self, app: FastAPI):
        super().__init__(app)
        self.rate_limits = defaultdict(list)
        self.blocked_ips = set()
        self.suspicious_patterns = [
            'union', 'select', 'drop', 'delete', 'insert', 'update',
            '<script', 'javascript:', 'onload=', 'onerror=',
            '../', '..\\', '/etc/passwd', '/etc/shadow'
        ]
    
    async def dispatch(self, request: Request, call_next):
        """Process request with security checks"""
        start_time = time.time()
        
        # Get client IP
        client_ip = self.get_client_ip(request)
        
        # Check if IP is blocked
        if client_ip in self.blocked_ips:
            return JSONResponse(
                status_code=429,
                content={"error": "Too many requests"}
            )
        
        # Rate limiting
        if not self.check_rate_limit(request, client_ip):
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded"}
            )
        
        # Security checks
        if not self.security_checks(request):
            logger.warning(f"Security violation from {client_ip}: {request.url}")
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid request"}
            )
        
        # Process request
        response = await call_next(request)
        
        # Add security headers
        self.add_security_headers(response)
        
        # Log request
        process_time = time.time() - start_time
        logger.info(f"{client_ip} - {request.method} {request.url} - {response.status_code} - {process_time:.3f}s")
        
        return response
    
    def get_client_ip(self, request: Request) -> str:
        """Get real client IP address"""
        # Check for forwarded headers
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def check_rate_limit(self, request: Request, client_ip: str) -> bool:
        """Check rate limiting"""
        now = datetime.now()
        path = str(request.url.path)
        
        # Define rate limits
        limits = {
            "/api/auth/login": (5, 300),  # 5 requests per 5 minutes
            "/api/documents/upload": (10, 300),  # 10 uploads per 5 minutes
            "default": (100, 300)  # 100 requests per 5 minutes
        }
        
        # Get appropriate limit
        limit_key = path if path in limits else "default"
        max_requests, window_seconds = limits[limit_key]
        
        # Clean old requests
        cutoff_time = now - timedelta(seconds=window_seconds)
        key = f"{client_ip}:{limit_key}"
        self.rate_limits[key] = [
            req_time for req_time in self.rate_limits[key]
            if req_time > cutoff_time
        ]
        
        # Check limit
        if len(self.rate_limits[key]) >= max_requests:
            # Block IP temporarily for repeated violations
            if len(self.rate_limits[key]) > max_requests * 2:
                self.blocked_ips.add(client_ip)
                logger.warning(f"IP {client_ip} temporarily blocked for rate limit violations")
            return False
        
        # Add current request
        self.rate_limits[key].append(now)
        return True
    
    def security_checks(self, request: Request) -> bool:
        """Perform security checks on request"""
        # Check for suspicious patterns in URL and parameters
        url_str = str(request.url).lower()
        
        for pattern in self.suspicious_patterns:
            if pattern in url_str:
                return False
        
        # Check request headers for suspicious content
        user_agent = request.headers.get("User-Agent", "").lower()
        if any(bot in user_agent for bot in ['sqlmap', 'nikto', 'nmap', 'masscan']):
            return False
        
        return True
    
    def add_security_headers(self, response: Response):
        """Add comprehensive security headers"""
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "SAMEORIGIN",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
        
        for header, value in security_headers.items():
            response.headers[header] = value


def setup_security_middleware(app: FastAPI):
    """Setup security middleware for FastAPI app"""
    app.add_middleware(SecurityMiddleware)
    return app
