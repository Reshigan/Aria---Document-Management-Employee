"""
Commercial Security Hardening System
Enterprise-grade security features, audit logging, and compliance
"""

import asyncio
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt
import ipaddress
from sqlalchemy.orm import Session
from sqlalchemy import text
import aiofiles
import re

logger = logging.getLogger(__name__)

class SecurityLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class SecurityEvent:
    event_type: str
    level: SecurityLevel
    user_id: Optional[int]
    ip_address: str
    user_agent: str
    timestamp: datetime
    details: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_type": self.event_type,
            "level": self.level.value,
            "user_id": self.user_id,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "timestamp": self.timestamp.isoformat(),
            "details": self.details
        }

class SecurityAuditLogger:
    """Security audit logging system"""
    
    def __init__(self):
        self.audit_log_file = "logs/security_audit.log"
        self.events = []
        self.ensure_log_directory()
    
    def ensure_log_directory(self):
        """Ensure log directory exists"""
        os.makedirs("logs", exist_ok=True)
    
    async def log_security_event(self, event: SecurityEvent):
        """Log security event"""
        self.events.append(event)
        
        # Keep only last 10000 events in memory
        if len(self.events) > 10000:
            self.events = self.events[-10000:]
        
        # Write to file
        try:
            async with aiofiles.open(self.audit_log_file, 'a') as f:
                await f.write(json.dumps(event.to_dict()) + "\n")
        except Exception as e:
            logger.error(f"Failed to write security audit log: {e}")
    
    def get_security_events(self, hours: int = 24, level: Optional[SecurityLevel] = None) -> List[Dict[str, Any]]:
        """Get security events from the specified time period"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        filtered_events = [
            event for event in self.events
            if event.timestamp > cutoff_time
        ]
        
        if level:
            filtered_events = [
                event for event in filtered_events
                if event.level == level
            ]
        
        return [event.to_dict() for event in filtered_events]

class AdvancedPasswordPolicy:
    """Advanced password policy enforcement"""
    
    def __init__(self):
        self.min_length = 12
        self.require_uppercase = True
        self.require_lowercase = True
        self.require_digits = True
        self.require_special = True
        self.max_age_days = 90
        self.history_count = 12
        self.lockout_attempts = 5
        self.lockout_duration_minutes = 30
        
        self.pwd_context = CryptContext(
            schemes=["bcrypt"],
            deprecated="auto",
            bcrypt__rounds=12  # Higher rounds for better security
        )
    
    def validate_password(self, password: str, username: str = None) -> Tuple[bool, List[str]]:
        """Validate password against policy"""
        errors = []
        
        # Length check
        if len(password) < self.min_length:
            errors.append(f"Password must be at least {self.min_length} characters long")
        
        # Character requirements
        if self.require_uppercase and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if self.require_lowercase and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if self.require_digits and not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")
        
        if self.require_special and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")
        
        # Username similarity check
        if username and username.lower() in password.lower():
            errors.append("Password cannot contain username")
        
        # Common password check
        if self._is_common_password(password):
            errors.append("Password is too common, please choose a more unique password")
        
        return len(errors) == 0, errors
    
    def _is_common_password(self, password: str) -> bool:
        """Check if password is in common passwords list"""
        common_passwords = [
            "password", "123456", "password123", "admin", "qwerty",
            "letmein", "welcome", "monkey", "dragon", "master"
        ]
        return password.lower() in common_passwords
    
    def hash_password(self, password: str) -> str:
        """Hash password with salt"""
        return self.pwd_context.hash(password)
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return self.pwd_context.verify(password, hashed)
    
    def generate_secure_password(self, length: int = 16) -> str:
        """Generate a secure random password"""
        import string
        
        # Ensure we have at least one character from each required category
        chars = []
        if self.require_uppercase:
            chars.append(secrets.choice(string.ascii_uppercase))
        if self.require_lowercase:
            chars.append(secrets.choice(string.ascii_lowercase))
        if self.require_digits:
            chars.append(secrets.choice(string.digits))
        if self.require_special:
            chars.append(secrets.choice("!@#$%^&*(),.?\":{}|<>"))
        
        # Fill the rest with random characters
        all_chars = string.ascii_letters + string.digits + "!@#$%^&*(),.?\":{}|<>"
        for _ in range(length - len(chars)):
            chars.append(secrets.choice(all_chars))
        
        # Shuffle the characters
        secrets.SystemRandom().shuffle(chars)
        return ''.join(chars)

class RateLimiter:
    """Advanced rate limiting system"""
    
    def __init__(self):
        self.limits = {}
        self.attempts = {}
        self.blocked_ips = {}
    
    def set_limit(self, endpoint: str, requests_per_minute: int, requests_per_hour: int = None):
        """Set rate limit for an endpoint"""
        self.limits[endpoint] = {
            "per_minute": requests_per_minute,
            "per_hour": requests_per_hour or requests_per_minute * 60
        }
    
    def check_rate_limit(self, ip_address: str, endpoint: str, user_id: Optional[int] = None) -> Tuple[bool, Dict[str, Any]]:
        """Check if request is within rate limits"""
        current_time = time.time()
        
        # Check if IP is blocked
        if ip_address in self.blocked_ips:
            block_info = self.blocked_ips[ip_address]
            if current_time < block_info["until"]:
                return False, {
                    "blocked": True,
                    "reason": "IP temporarily blocked",
                    "blocked_until": block_info["until"]
                }
            else:
                # Unblock IP
                del self.blocked_ips[ip_address]
        
        # Create key for tracking
        key = f"{ip_address}:{endpoint}"
        if user_id:
            key += f":{user_id}"
        
        if key not in self.attempts:
            self.attempts[key] = {"minute": [], "hour": []}
        
        attempts = self.attempts[key]
        
        # Clean old attempts
        attempts["minute"] = [t for t in attempts["minute"] if current_time - t < 60]
        attempts["hour"] = [t for t in attempts["hour"] if current_time - t < 3600]
        
        # Check limits
        if endpoint in self.limits:
            limits = self.limits[endpoint]
            
            if len(attempts["minute"]) >= limits["per_minute"]:
                return False, {
                    "rate_limited": True,
                    "limit_type": "per_minute",
                    "limit": limits["per_minute"],
                    "reset_time": current_time + 60
                }
            
            if len(attempts["hour"]) >= limits["per_hour"]:
                return False, {
                    "rate_limited": True,
                    "limit_type": "per_hour", 
                    "limit": limits["per_hour"],
                    "reset_time": current_time + 3600
                }
        
        # Record attempt
        attempts["minute"].append(current_time)
        attempts["hour"].append(current_time)
        
        return True, {"allowed": True}
    
    def block_ip(self, ip_address: str, duration_minutes: int = 60, reason: str = "Security violation"):
        """Block an IP address"""
        self.blocked_ips[ip_address] = {
            "until": time.time() + (duration_minutes * 60),
            "reason": reason,
            "blocked_at": time.time()
        }
    
    def get_rate_limit_stats(self) -> Dict[str, Any]:
        """Get rate limiting statistics"""
        current_time = time.time()
        
        return {
            "active_limits": len(self.limits),
            "tracked_keys": len(self.attempts),
            "blocked_ips": len(self.blocked_ips),
            "blocked_ip_list": [
                {
                    "ip": ip,
                    "reason": info["reason"],
                    "blocked_at": info["blocked_at"],
                    "blocked_until": info["until"]
                }
                for ip, info in self.blocked_ips.items()
                if current_time < info["until"]
            ]
        }

class IPWhitelist:
    """IP address whitelist/blacklist management"""
    
    def __init__(self):
        self.whitelist = set()
        self.blacklist = set()
        self.whitelist_networks = []
        self.blacklist_networks = []
    
    def add_to_whitelist(self, ip_or_network: str):
        """Add IP or network to whitelist"""
        try:
            network = ipaddress.ip_network(ip_or_network, strict=False)
            if network.num_addresses == 1:
                self.whitelist.add(str(network.network_address))
            else:
                self.whitelist_networks.append(network)
        except ValueError as e:
            logger.error(f"Invalid IP/network for whitelist: {ip_or_network} - {e}")
    
    def add_to_blacklist(self, ip_or_network: str):
        """Add IP or network to blacklist"""
        try:
            network = ipaddress.ip_network(ip_or_network, strict=False)
            if network.num_addresses == 1:
                self.blacklist.add(str(network.network_address))
            else:
                self.blacklist_networks.append(network)
        except ValueError as e:
            logger.error(f"Invalid IP/network for blacklist: {ip_or_network} - {e}")
    
    def is_allowed(self, ip_address: str) -> Tuple[bool, str]:
        """Check if IP address is allowed"""
        try:
            ip = ipaddress.ip_address(ip_address)
            
            # Check blacklist first
            if ip_address in self.blacklist:
                return False, "IP in blacklist"
            
            for network in self.blacklist_networks:
                if ip in network:
                    return False, f"IP in blacklisted network {network}"
            
            # If whitelist is empty, allow all (except blacklisted)
            if not self.whitelist and not self.whitelist_networks:
                return True, "No whitelist configured"
            
            # Check whitelist
            if ip_address in self.whitelist:
                return True, "IP in whitelist"
            
            for network in self.whitelist_networks:
                if ip in network:
                    return True, f"IP in whitelisted network {network}"
            
            return False, "IP not in whitelist"
            
        except ValueError:
            return False, "Invalid IP address"

class SessionManager:
    """Secure session management"""
    
    def __init__(self):
        self.active_sessions = {}
        self.session_timeout_minutes = 30
        self.max_sessions_per_user = 5
        self.secret_key = os.getenv("SESSION_SECRET_KEY", secrets.token_urlsafe(32))
    
    def create_session(self, user_id: int, ip_address: str, user_agent: str) -> str:
        """Create a new session"""
        # Clean expired sessions
        self._clean_expired_sessions()
        
        # Check session limit per user
        user_sessions = [
            session_id for session_id, session in self.active_sessions.items()
            if session["user_id"] == user_id
        ]
        
        if len(user_sessions) >= self.max_sessions_per_user:
            # Remove oldest session
            oldest_session = min(user_sessions, key=lambda s: self.active_sessions[s]["created_at"])
            del self.active_sessions[oldest_session]
        
        # Create new session
        session_id = secrets.token_urlsafe(32)
        session_data = {
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": time.time(),
            "last_activity": time.time(),
            "csrf_token": secrets.token_urlsafe(32)
        }
        
        self.active_sessions[session_id] = session_data
        return session_id
    
    def validate_session(self, session_id: str, ip_address: str, user_agent: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """Validate session"""
        if session_id not in self.active_sessions:
            return False, None
        
        session = self.active_sessions[session_id]
        current_time = time.time()
        
        # Check timeout
        if current_time - session["last_activity"] > (self.session_timeout_minutes * 60):
            del self.active_sessions[session_id]
            return False, None
        
        # Check IP address (optional - can be disabled for mobile users)
        if session["ip_address"] != ip_address:
            logger.warning(f"Session IP mismatch: {session['ip_address']} vs {ip_address}")
            # Could be disabled or made configurable
        
        # Update last activity
        session["last_activity"] = current_time
        
        return True, session
    
    def invalidate_session(self, session_id: str):
        """Invalidate a session"""
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
    
    def invalidate_user_sessions(self, user_id: int):
        """Invalidate all sessions for a user"""
        sessions_to_remove = [
            session_id for session_id, session in self.active_sessions.items()
            if session["user_id"] == user_id
        ]
        
        for session_id in sessions_to_remove:
            del self.active_sessions[session_id]
    
    def _clean_expired_sessions(self):
        """Clean expired sessions"""
        current_time = time.time()
        expired_sessions = [
            session_id for session_id, session in self.active_sessions.items()
            if current_time - session["last_activity"] > (self.session_timeout_minutes * 60)
        ]
        
        for session_id in expired_sessions:
            del self.active_sessions[session_id]
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get session statistics"""
        self._clean_expired_sessions()
        
        user_counts = {}
        for session in self.active_sessions.values():
            user_id = session["user_id"]
            user_counts[user_id] = user_counts.get(user_id, 0) + 1
        
        return {
            "total_active_sessions": len(self.active_sessions),
            "unique_users": len(user_counts),
            "sessions_per_user": user_counts,
            "timeout_minutes": self.session_timeout_minutes
        }

class SecurityScanner:
    """Security vulnerability scanner"""
    
    def __init__(self):
        self.scan_results = []
    
    async def scan_system(self) -> Dict[str, Any]:
        """Perform comprehensive security scan"""
        scan_results = {
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {},
            "overall_score": 0,
            "recommendations": []
        }
        
        # Check password policy
        scan_results["checks"]["password_policy"] = self._check_password_policy()
        
        # Check SSL/TLS configuration
        scan_results["checks"]["ssl_tls"] = self._check_ssl_configuration()
        
        # Check file permissions
        scan_results["checks"]["file_permissions"] = self._check_file_permissions()
        
        # Check environment variables
        scan_results["checks"]["environment"] = self._check_environment_security()
        
        # Check database security
        scan_results["checks"]["database"] = self._check_database_security()
        
        # Calculate overall score
        scores = [check.get("score", 0) for check in scan_results["checks"].values()]
        scan_results["overall_score"] = sum(scores) / len(scores) if scores else 0
        
        # Generate recommendations
        for check_name, check_result in scan_results["checks"].items():
            if check_result.get("recommendations"):
                scan_results["recommendations"].extend(check_result["recommendations"])
        
        self.scan_results.append(scan_results)
        return scan_results
    
    def _check_password_policy(self) -> Dict[str, Any]:
        """Check password policy configuration"""
        policy = AdvancedPasswordPolicy()
        
        score = 0
        recommendations = []
        
        if policy.min_length >= 12:
            score += 20
        else:
            recommendations.append("Increase minimum password length to 12+ characters")
        
        if policy.require_uppercase and policy.require_lowercase:
            score += 20
        else:
            recommendations.append("Require both uppercase and lowercase letters")
        
        if policy.require_digits:
            score += 20
        else:
            recommendations.append("Require digits in passwords")
        
        if policy.require_special:
            score += 20
        else:
            recommendations.append("Require special characters in passwords")
        
        if policy.max_age_days <= 90:
            score += 20
        else:
            recommendations.append("Set password expiration to 90 days or less")
        
        return {
            "score": score,
            "status": "good" if score >= 80 else "needs_improvement",
            "details": {
                "min_length": policy.min_length,
                "complexity_requirements": {
                    "uppercase": policy.require_uppercase,
                    "lowercase": policy.require_lowercase,
                    "digits": policy.require_digits,
                    "special": policy.require_special
                },
                "max_age_days": policy.max_age_days
            },
            "recommendations": recommendations
        }
    
    def _check_ssl_configuration(self) -> Dict[str, Any]:
        """Check SSL/TLS configuration"""
        # This would check SSL certificate, protocols, ciphers, etc.
        # For now, return a basic check
        
        https_enabled = os.getenv("HTTPS_ENABLED", "false").lower() == "true"
        ssl_cert_path = os.getenv("SSL_CERT_PATH")
        ssl_key_path = os.getenv("SSL_KEY_PATH")
        
        score = 0
        recommendations = []
        
        if https_enabled:
            score += 50
        else:
            recommendations.append("Enable HTTPS in production")
        
        if ssl_cert_path and ssl_key_path:
            score += 50
        else:
            recommendations.append("Configure SSL certificate and key paths")
        
        return {
            "score": score,
            "status": "good" if score >= 80 else "needs_improvement",
            "details": {
                "https_enabled": https_enabled,
                "ssl_cert_configured": bool(ssl_cert_path),
                "ssl_key_configured": bool(ssl_key_path)
            },
            "recommendations": recommendations
        }
    
    def _check_file_permissions(self) -> Dict[str, Any]:
        """Check file permissions"""
        score = 100  # Assume good by default
        recommendations = []
        
        # Check critical files
        critical_files = [
            "backend/main_commercial.py",
            "backend/security_commercial.py",
            ".env"
        ]
        
        for file_path in critical_files:
            if os.path.exists(file_path):
                stat_info = os.stat(file_path)
                mode = oct(stat_info.st_mode)[-3:]
                
                # Check if file is world-readable/writable
                if mode.endswith('7') or mode.endswith('6'):
                    score -= 20
                    recommendations.append(f"Restrict permissions on {file_path}")
        
        return {
            "score": max(0, score),
            "status": "good" if score >= 80 else "needs_improvement",
            "details": {"checked_files": critical_files},
            "recommendations": recommendations
        }
    
    def _check_environment_security(self) -> Dict[str, Any]:
        """Check environment variable security"""
        score = 0
        recommendations = []
        
        # Check for secure secret key
        secret_key = os.getenv("SECRET_KEY")
        if secret_key and len(secret_key) >= 32:
            score += 25
        else:
            recommendations.append("Set a strong SECRET_KEY (32+ characters)")
        
        # Check for database password
        db_password = os.getenv("POSTGRES_PASSWORD") or os.getenv("DATABASE_PASSWORD")
        if db_password and len(db_password) >= 12:
            score += 25
        else:
            recommendations.append("Set a strong database password")
        
        # Check for debug mode
        debug_mode = os.getenv("DEBUG", "false").lower()
        if debug_mode == "false":
            score += 25
        else:
            recommendations.append("Disable debug mode in production")
        
        # Check for CORS configuration
        cors_origins = os.getenv("CORS_ORIGINS")
        if cors_origins and cors_origins != "*":
            score += 25
        else:
            recommendations.append("Configure specific CORS origins (avoid wildcard)")
        
        return {
            "score": score,
            "status": "good" if score >= 80 else "needs_improvement",
            "details": {
                "secret_key_set": bool(secret_key),
                "db_password_set": bool(db_password),
                "debug_disabled": debug_mode == "false",
                "cors_configured": bool(cors_origins and cors_origins != "*")
            },
            "recommendations": recommendations
        }
    
    def _check_database_security(self) -> Dict[str, Any]:
        """Check database security configuration"""
        score = 0
        recommendations = []
        
        # Check if using PostgreSQL (more secure than SQLite for production)
        database_url = os.getenv("DATABASE_URL", "")
        if "postgresql" in database_url:
            score += 50
        else:
            recommendations.append("Use PostgreSQL for production instead of SQLite")
        
        # Check for SSL database connection
        if "sslmode" in database_url:
            score += 50
        else:
            recommendations.append("Enable SSL for database connections")
        
        return {
            "score": score,
            "status": "good" if score >= 80 else "needs_improvement",
            "details": {
                "database_type": "postgresql" if "postgresql" in database_url else "sqlite",
                "ssl_enabled": "sslmode" in database_url
            },
            "recommendations": recommendations
        }

# Global instances
security_audit_logger = SecurityAuditLogger()
password_policy = AdvancedPasswordPolicy()
rate_limiter = RateLimiter()
ip_whitelist = IPWhitelist()
session_manager = SessionManager()
security_scanner = SecurityScanner()

# Initialize security system
async def init_security_system():
    """Initialize security system"""
    try:
        # Set up rate limits
        rate_limiter.set_limit("login", 5, 20)  # 5 per minute, 20 per hour
        rate_limiter.set_limit("api", 100, 1000)  # 100 per minute, 1000 per hour
        rate_limiter.set_limit("upload", 10, 50)  # 10 per minute, 50 per hour
        
        # Configure IP whitelist if specified
        whitelist_ips = os.getenv("IP_WHITELIST", "").split(",")
        for ip in whitelist_ips:
            if ip.strip():
                ip_whitelist.add_to_whitelist(ip.strip())
        
        # Configure IP blacklist if specified
        blacklist_ips = os.getenv("IP_BLACKLIST", "").split(",")
        for ip in blacklist_ips:
            if ip.strip():
                ip_whitelist.add_to_blacklist(ip.strip())
        
        logger.info("Security system initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Security system initialization failed: {e}")
        return False

# Security middleware functions
async def security_middleware(request, call_next):
    """Security middleware for FastAPI"""
    start_time = time.time()
    
    # Get client info
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    # Check IP whitelist/blacklist
    allowed, reason = ip_whitelist.is_allowed(client_ip)
    if not allowed:
        await security_audit_logger.log_security_event(
            SecurityEvent(
                event_type="ip_blocked",
                level=SecurityLevel.HIGH,
                user_id=None,
                ip_address=client_ip,
                user_agent=user_agent,
                timestamp=datetime.utcnow(),
                details={"reason": reason}
            )
        )
        return {"error": "Access denied", "reason": reason}
    
    # Check rate limits
    endpoint = request.url.path
    allowed, limit_info = rate_limiter.check_rate_limit(client_ip, endpoint)
    if not allowed:
        await security_audit_logger.log_security_event(
            SecurityEvent(
                event_type="rate_limit_exceeded",
                level=SecurityLevel.MEDIUM,
                user_id=None,
                ip_address=client_ip,
                user_agent=user_agent,
                timestamp=datetime.utcnow(),
                details=limit_info
            )
        )
        return {"error": "Rate limit exceeded", "details": limit_info}
    
    # Process request
    response = await call_next(request)
    
    # Log successful request
    processing_time = time.time() - start_time
    if processing_time > 5:  # Log slow requests
        await security_audit_logger.log_security_event(
            SecurityEvent(
                event_type="slow_request",
                level=SecurityLevel.LOW,
                user_id=None,
                ip_address=client_ip,
                user_agent=user_agent,
                timestamp=datetime.utcnow(),
                details={"processing_time": processing_time, "endpoint": endpoint}
            )
        )
    
    return response

# Security utility functions
def generate_csrf_token() -> str:
    """Generate CSRF token"""
    return secrets.token_urlsafe(32)

def validate_csrf_token(token: str, session_token: str) -> bool:
    """Validate CSRF token"""
    return hmac.compare_digest(token, session_token)

def sanitize_input(input_string: str) -> str:
    """Sanitize user input"""
    # Remove potentially dangerous characters
    sanitized = re.sub(r'[<>"\']', '', input_string)
    return sanitized.strip()

def get_security_headers() -> Dict[str, str]:
    """Get security headers for responses"""
    return {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    }

async def log_security_event(event_type: str, level: SecurityLevel, user_id: Optional[int], 
                           ip_address: str, user_agent: str, details: Dict[str, Any]):
    """Helper function to log security events"""
    event = SecurityEvent(
        event_type=event_type,
        level=level,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        timestamp=datetime.utcnow(),
        details=details
    )
    await security_audit_logger.log_security_event(event)

def get_security_dashboard() -> Dict[str, Any]:
    """Get security dashboard data"""
    return {
        "audit_events": security_audit_logger.get_security_events(hours=24),
        "rate_limit_stats": rate_limiter.get_rate_limit_stats(),
        "session_stats": session_manager.get_session_stats(),
        "recent_scan": security_scanner.scan_results[-1] if security_scanner.scan_results else None,
        "timestamp": datetime.utcnow().isoformat()
    }