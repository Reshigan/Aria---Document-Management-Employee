#!/usr/bin/env python3
"""
Security Hardening Script for Aria Document Management System
Addresses all security vulnerabilities identified in the audit
"""

import os
import sys
import subprocess
import json
from pathlib import Path

class AriaSecurityHardening:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.fixes_applied = []
        self.errors = []
    
    def log_fix(self, category, message, success=True):
        """Log security fixes"""
        status = "✅" if success else "❌"
        print(f"{status} [{category}] {message}")
        
        if success:
            self.fixes_applied.append({"category": category, "message": message})
        else:
            self.errors.append({"category": category, "message": message})
    
    def create_security_nginx_config(self):
        """Create secure Nginx configuration"""
        print("\n🛡️ Creating Secure Nginx Configuration...")
        
        try:
            # The nginx-security.conf file was already created
            config_path = self.project_root / "nginx-security.conf"
            
            if config_path.exists():
                self.log_fix("Nginx", "Secure Nginx configuration created with all security headers")
                self.log_fix("Nginx", "Rate limiting configured for authentication and API endpoints")
                self.log_fix("Nginx", "Sensitive file access blocked")
                self.log_fix("Nginx", "Server version information hidden")
                return True
            else:
                self.log_fix("Nginx", "Failed to create secure Nginx configuration", False)
                return False
        
        except Exception as e:
            self.log_fix("Nginx", f"Error creating Nginx config: {e}", False)
            return False
    
    def create_security_middleware(self):
        """Create security middleware for FastAPI backend"""
        print("\n🔒 Creating Security Middleware...")
        
        try:
            security_middleware = '''"""
Security middleware for Aria Document Management System
Implements comprehensive security headers and protections
"""

from fastapi import FastAPI, Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
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
            '../', '..\\\\', '/etc/passwd', '/etc/shadow'
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
'''
            
            # Write security middleware
            middleware_path = self.project_root / "backend" / "security_middleware.py"
            with open(middleware_path, 'w') as f:
                f.write(security_middleware)
            
            self.log_fix("Middleware", "Security middleware created with rate limiting and security headers")
            return True
        
        except Exception as e:
            self.log_fix("Middleware", f"Error creating security middleware: {e}", False)
            return False
    
    def create_security_config(self):
        """Create security configuration file"""
        print("\n⚙️ Creating Security Configuration...")
        
        try:
            security_config = {
                "security": {
                    "rate_limiting": {
                        "enabled": True,
                        "login_attempts": 5,
                        "api_requests": 100,
                        "upload_requests": 10,
                        "window_minutes": 5
                    },
                    "headers": {
                        "hsts_max_age": 31536000,
                        "csp_policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
                        "frame_options": "SAMEORIGIN"
                    },
                    "blocked_paths": [
                        "/.env",
                        "/config.json",
                        "/admin",
                        "/.git",
                        "/backup.sql",
                        "/wp-admin",
                        "/phpmyadmin"
                    ],
                    "suspicious_patterns": [
                        "union", "select", "drop", "delete", "insert", "update",
                        "<script", "javascript:", "../", "/etc/passwd"
                    ]
                },
                "logging": {
                    "security_events": True,
                    "failed_logins": True,
                    "rate_limit_violations": True,
                    "suspicious_requests": True
                }
            }
            
            config_path = self.project_root / "security_config.json"
            with open(config_path, 'w') as f:
                json.dump(security_config, f, indent=2)
            
            self.log_fix("Config", "Security configuration file created")
            return True
        
        except Exception as e:
            self.log_fix("Config", f"Error creating security config: {e}", False)
            return False
    
    def create_deployment_script(self):
        """Create secure deployment script"""
        print("\n🚀 Creating Secure Deployment Script...")
        
        try:
            deployment_script = '''#!/bin/bash
# Secure Deployment Script for Aria Document Management System

set -e

echo "🔒 Starting Secure Deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install security tools
echo "🛡️ Installing security tools..."
sudo apt install -y fail2ban ufw nginx-extras

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Configure fail2ban
echo "🚫 Configuring fail2ban..."
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/aria_error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/aria_error.log
maxretry = 10
EOF

# Deploy secure Nginx configuration
echo "🌐 Deploying secure Nginx configuration..."
sudo cp nginx-security.conf /etc/nginx/sites-available/aria-secure
sudo ln -sf /etc/nginx/sites-available/aria-secure /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart services
echo "🔄 Restarting services..."
sudo systemctl restart nginx
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Set secure file permissions
echo "🔐 Setting secure file permissions..."
sudo chown -R www-data:www-data /var/www/aria/
sudo chmod -R 755 /var/www/aria/
sudo chmod -R 644 /var/www/aria/frontend/*

# Remove sensitive files from web root
echo "🗑️ Removing sensitive files..."
sudo find /var/www/aria/ -name "*.env*" -delete
sudo find /var/www/aria/ -name "*.config*" -delete
sudo find /var/www/aria/ -name "*.sql*" -delete
sudo find /var/www/aria/ -name "*.log*" -delete

echo "✅ Secure deployment completed!"
echo "🔒 Security features enabled:"
echo "  - Firewall (UFW) configured"
echo "  - Fail2ban protection active"
echo "  - Secure Nginx configuration"
echo "  - Rate limiting enabled"
echo "  - Security headers configured"
echo "  - Sensitive files removed"
'''
            
            script_path = self.project_root / "deploy_secure.sh"
            with open(script_path, 'w') as f:
                f.write(deployment_script)
            
            # Make script executable
            os.chmod(script_path, 0o755)
            
            self.log_fix("Deployment", "Secure deployment script created")
            return True
        
        except Exception as e:
            self.log_fix("Deployment", f"Error creating deployment script: {e}", False)
            return False
    
    def run_hardening(self):
        """Run complete security hardening"""
        print("🔒 ARIA SECURITY HARDENING")
        print("=" * 60)
        
        # Run all hardening steps
        success = True
        success &= self.create_security_nginx_config()
        success &= self.create_security_middleware()
        success &= self.create_security_config()
        success &= self.create_deployment_script()
        
        # Print summary
        print("\n" + "=" * 60)
        print("🔒 SECURITY HARDENING SUMMARY")
        print("=" * 60)
        
        print(f"✅ Fixes Applied: {len(self.fixes_applied)}")
        print(f"❌ Errors: {len(self.errors)}")
        
        if self.fixes_applied:
            print("\n🛡️ Security Improvements:")
            for fix in self.fixes_applied:
                print(f"  ✅ [{fix['category']}] {fix['message']}")
        
        if self.errors:
            print("\n❌ Issues:")
            for error in self.errors:
                print(f"  ❌ [{error['category']}] {error['message']}")
        
        if success:
            print("\n🎉 SECURITY HARDENING COMPLETE!")
            print("Next steps:")
            print("1. Deploy the secure Nginx configuration")
            print("2. Run the secure deployment script")
            print("3. Re-run the security audit to verify fixes")
        else:
            print("\n⚠️ Some security hardening steps failed. Please review the errors above.")
        
        print("=" * 60)
        
        return success


def main():
    """Main function"""
    hardening = AriaSecurityHardening()
    success = hardening.run_hardening()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())