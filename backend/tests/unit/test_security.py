"""
Unit tests for security module (100% coverage).
"""
import pytest
from datetime import datetime, timedelta
from jose import jwt

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_token,
)
from app.core.config import settings


@pytest.mark.unit
class TestPasswordHashing:
    """Test password hashing functions."""
    
    def test_get_password_hash(self):
        """Test password hashing."""
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert hashed != password
        assert len(hashed) > 0
        assert hashed.startswith("$2b$")
    
    def test_verify_password_success(self):
        """Test password verification with correct password."""
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed) is True
    
    def test_verify_password_failure(self):
        """Test password verification with incorrect password."""
        password = "testpassword123"
        wrong_password = "wrongpassword"
        hashed = get_password_hash(password)
        
        assert verify_password(wrong_password, hashed) is False
    
    def test_different_hashes_for_same_password(self):
        """Test that same password produces different hashes."""
        password = "testpassword123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        assert hash1 != hash2
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)


@pytest.mark.unit
class TestJWTTokens:
    """Test JWT token creation and verification."""
    
    def test_create_access_token(self):
        """Test creating access token."""
        subject = "test@example.com"
        token = create_access_token(subject=subject)
        
        assert token is not None
        assert len(token) > 0
        
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        assert payload["sub"] == subject
        assert "exp" in payload
    
    def test_create_access_token_with_custom_expiry(self):
        """Test creating token with custom expiry."""
        subject = "test@example.com"
        expires_delta = timedelta(minutes=15)
        token = create_access_token(subject=subject, expires_delta=expires_delta)
        
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        exp_timestamp = payload["exp"]
        now = datetime.utcnow()
        exp_time = datetime.fromtimestamp(exp_timestamp)
        
        time_diff = (exp_time - now).total_seconds()
        assert 14 * 60 < time_diff < 16 * 60
    
    def test_decode_token_success(self):
        """Test decoding valid token."""
        subject = "test@example.com"
        token = create_access_token(subject=subject)
        
        decoded_subject = decode_token(token)
        assert decoded_subject == subject
    
    def test_decode_token_invalid(self):
        """Test decoding invalid token."""
        invalid_token = "invalid.token.here"
        
        decoded = decode_token(invalid_token)
        assert decoded is None
    
    def test_decode_token_expired(self):
        """Test decoding expired token."""
        subject = "test@example.com"
        expires_delta = timedelta(seconds=-1)
        token = create_access_token(subject=subject, expires_delta=expires_delta)
        
        decoded = decode_token(token)
        assert decoded is None
    
    def test_decode_token_wrong_key(self):
        """Test decoding token with wrong secret key."""
        subject = "test@example.com"
        token = jwt.encode(
            {"sub": subject},
            "wrong-secret-key",
            algorithm=settings.ALGORITHM
        )
        
        decoded = decode_token(token)
        assert decoded is None
