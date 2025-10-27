"""
ARIA v2.0 - Production Authentication System
JWT-based authentication with security best practices
"""

from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
import secrets

# Security Configuration
SECRET_KEY = secrets.token_urlsafe(32)  # Generate secure key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Models
class User(BaseModel):
    user_id: str
    email: EmailStr
    full_name: str
    organization_id: str
    role: str = "user"
    is_active: bool = True
    created_at: datetime = None

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None

# Password utilities
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password for secure storage"""
    return pwd_context.hash(password)

# JWT Token utilities
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.JWTError:
        return None

# Authentication Functions
def authenticate_user(email: str, password: str, user_db: dict) -> Optional[UserInDB]:
    """Authenticate a user with email and password"""
    user = user_db.get(email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_tokens(user: User) -> Token:
    """Create access and refresh tokens for a user"""
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.user_id, "role": user.role}
    )
    refresh_token = create_refresh_token(
        data={"sub": user.email, "user_id": user.user_id}
    )
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )

# FastAPI integration
async def get_current_user(token: str, user_db: dict) -> Optional[User]:
    """Get current user from JWT token"""
    payload = decode_token(token)
    if payload is None:
        return None
    
    email: str = payload.get("sub")
    if email is None:
        return None
    
    user = user_db.get(email)
    if user is None:
        return None
    
    return user

# Security headers middleware
def get_security_headers():
    """Get security headers for HTTP responses"""
    return {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'",
    }

# Rate limiting (simple implementation)
class RateLimiter:
    def __init__(self):
        self.requests = {}
    
    def check_rate_limit(self, identifier: str, max_requests: int = 5, window_seconds: int = 60) -> bool:
        """Check if rate limit is exceeded"""
        now = datetime.utcnow()
        
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Remove old requests outside the window
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if (now - req_time).total_seconds() < window_seconds
        ]
        
        # Check if limit exceeded
        if len(self.requests[identifier]) >= max_requests:
            return False
        
        # Add current request
        self.requests[identifier].append(now)
        return True

# Example usage in FastAPI endpoints
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

@app.post("/auth/login")
async def login(email: EmailStr, password: str):
    user = authenticate_user(email, password, user_database)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    tokens = create_tokens(user)
    return tokens

@app.post("/auth/refresh")
async def refresh_token(refresh_token: str):
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user = user_database.get(payload.get("sub"))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    tokens = create_tokens(user)
    return tokens

@app.get("/protected-endpoint")
async def protected_endpoint(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user = await get_current_user(token, user_database)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return {"user": user.email, "message": "Access granted"}
"""
