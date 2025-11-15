"""
Security Hardening System
Provides 2FA, rate limiting, session management, and security headers
"""
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import uuid
import pyotp
import qrcode
import io
import base64
from collections import defaultdict
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException, Request
from fastapi.responses import Response
import hashlib

class TwoFactorAuth:
    """Two-Factor Authentication service"""
    
    @classmethod
    def generate_secret(cls) -> str:
        """Generate a new 2FA secret"""
        return pyotp.random_base32()
    
    @classmethod
    def generate_qr_code(cls, email: str, secret: str, issuer: str = "Aria ERP") -> str:
        """
        Generate QR code for 2FA setup
        
        Args:
            email: User email
            secret: 2FA secret
            issuer: Issuer name
            
        Returns:
            Base64 encoded QR code image
        """
        try:
            totp = pyotp.TOTP(secret)
            provisioning_uri = totp.provisioning_uri(
                name=email,
                issuer_name=issuer
            )
            
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(provisioning_uri)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/png;base64,{img_base64}"
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate QR code: {str(e)}")
    
    @classmethod
    def verify_token(cls, secret: str, token: str) -> bool:
        """
        Verify a 2FA token
        
        Args:
            secret: User's 2FA secret
            token: Token to verify
            
        Returns:
            True if valid
        """
        try:
            totp = pyotp.TOTP(secret)
            return totp.verify(token, valid_window=1)
        except Exception:
            return False
    
    @classmethod
    def enable_2fa(
        cls,
        db: Session,
        user_id: str,
        secret: str
    ) -> Dict[str, Any]:
        """
        Enable 2FA for a user
        
        Args:
            db: Database session
            user_id: User ID
            secret: 2FA secret
            
        Returns:
            Success message
        """
        try:
            query = text("""
                UPDATE users
                SET two_factor_secret = :secret,
                    two_factor_enabled = true,
                    updated_at = NOW()
                WHERE id = :user_id
                RETURNING id
            """)
            
            result = db.execute(query, {
                "secret": secret,
                "user_id": user_id
            })
            
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="User not found")
            
            db.commit()
            
            return {"message": "2FA enabled successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to enable 2FA: {str(e)}")

class RateLimiter:
    """Rate limiting service"""
    
    _requests = defaultdict(list)
    _blocked_ips = {}
    
    @classmethod
    def check_rate_limit(
        cls,
        identifier: str,
        max_requests: int = 100,
        window_seconds: int = 60,
        block_duration_seconds: int = 300
    ) -> bool:
        """
        Check if request should be rate limited
        
        Args:
            identifier: IP address or user ID
            max_requests: Maximum requests allowed
            window_seconds: Time window in seconds
            block_duration_seconds: How long to block after exceeding limit
            
        Returns:
            True if request is allowed, False if rate limited
        """
        now = datetime.utcnow()
        
        if identifier in cls._blocked_ips:
            block_until = cls._blocked_ips[identifier]
            if now < block_until:
                return False
            else:
                del cls._blocked_ips[identifier]
        
        window_start = now - timedelta(seconds=window_seconds)
        cls._requests[identifier] = [
            req_time for req_time in cls._requests[identifier]
            if req_time > window_start
        ]
        
        if len(cls._requests[identifier]) >= max_requests:
            cls._blocked_ips[identifier] = now + timedelta(seconds=block_duration_seconds)
            return False
        
        cls._requests[identifier].append(now)
        return True
    
    @classmethod
    def get_remaining_requests(
        cls,
        identifier: str,
        max_requests: int = 100,
        window_seconds: int = 60
    ) -> int:
        """
        Get remaining requests for identifier
        
        Args:
            identifier: IP address or user ID
            max_requests: Maximum requests allowed
            window_seconds: Time window in seconds
            
        Returns:
            Number of remaining requests
        """
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window_seconds)
        
        cls._requests[identifier] = [
            req_time for req_time in cls._requests[identifier]
            if req_time > window_start
        ]
        
        return max(0, max_requests - len(cls._requests[identifier]))

class SessionManager:
    """Session management service"""
    
    @classmethod
    def create_session(
        cls,
        db: Session,
        user_id: str,
        ip_address: str,
        user_agent: str,
        expires_in_hours: int = 24
    ) -> str:
        """
        Create a new session
        
        Args:
            db: Database session
            user_id: User ID
            ip_address: IP address
            user_agent: User agent string
            expires_in_hours: Session expiration in hours
            
        Returns:
            Session token
        """
        try:
            session_id = str(uuid.uuid4())
            session_token = hashlib.sha256(session_id.encode()).hexdigest()
            expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
            
            query = text("""
                INSERT INTO user_sessions (
                    id, user_id, session_token, ip_address,
                    user_agent, expires_at, created_at
                )
                VALUES (
                    :id, :user_id, :session_token, :ip_address,
                    :user_agent, :expires_at, NOW()
                )
                RETURNING session_token
            """)
            
            result = db.execute(query, {
                "id": session_id,
                "user_id": user_id,
                "session_token": session_token,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "expires_at": expires_at
            }).fetchone()
            
            db.commit()
            
            return str(result[0])
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")
    
    @classmethod
    def invalidate_session(
        cls,
        db: Session,
        session_token: str
    ) -> Dict[str, Any]:
        """
        Invalidate a session
        
        Args:
            db: Database session
            session_token: Session token to invalidate
            
        Returns:
            Success message
        """
        try:
            query = text("""
                DELETE FROM user_sessions
                WHERE session_token = :session_token
                RETURNING id
            """)
            
            result = db.execute(query, {"session_token": session_token})
            
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Session not found")
            
            db.commit()
            
            return {"message": "Session invalidated successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to invalidate session: {str(e)}")
    
    @classmethod
    def cleanup_expired_sessions(cls, db: Session) -> int:
        """
        Clean up expired sessions
        
        Args:
            db: Database session
            
        Returns:
            Number of sessions deleted
        """
        try:
            query = text("""
                DELETE FROM user_sessions
                WHERE expires_at < NOW()
                RETURNING id
            """)
            
            result = db.execute(query)
            count = result.rowcount
            
            db.commit()
            
            return count
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to cleanup sessions: {str(e)}")

class SecurityHeaders:
    """Security headers middleware"""
    
    @staticmethod
    def add_security_headers(response: Response) -> Response:
        """
        Add security headers to response
        
        Args:
            response: FastAPI response
            
        Returns:
            Response with security headers
        """
        response.headers["X-Frame-Options"] = "DENY"
        
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'"
        )
        
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=()"
        )
        
        return response
