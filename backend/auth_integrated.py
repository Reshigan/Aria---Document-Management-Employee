"""
ARIA v2.0 - Integrated Authentication System
Complete JWT authentication with database integration
"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict
import jwt
import os
from database_auth_pg import (
    create_user, get_user_by_email, get_user_by_id, update_last_login,
    create_session, get_session_by_token, invalidate_session,
    create_organization, log_action
)

# Security configuration - MUST be set via environment variables in production
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "CRITICAL: JWT_SECRET_KEY environment variable must be set. "
        "Generate a secure key with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
    )
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# HTTP Bearer token security
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash using bcrypt directly"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Hash password with bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[Dict]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def authenticate_user(email: str, password: str) -> Optional[Dict]:
    """Authenticate user with email and password"""
    user = get_user_by_email(email)
    
    if not user:
        return None
    
    if not verify_password(password, user['hashed_password']):
        return None
    
    if not user.get('is_active'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    return user

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    request: Request = None
) -> Dict:
    """Get current authenticated user from JWT token"""
    
    token = credentials.credentials
    
    # Verify token
    payload = verify_token(token)
    
    # Check token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    # Get user ID from token
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user_id = user_id_str
    
    # Check if session is still active
    session = get_session_by_token(token)
    if not session or not session.get('is_active'):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been invalidated"
        )
    
    # Get user from database
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.get('is_active'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Remove sensitive data
    user_safe = user.copy()
    if 'hashed_password' in user_safe:
        del user_safe['hashed_password']
    
    return user_safe

async def get_current_active_admin(
    current_user: Dict = Depends(get_current_user)
) -> Dict:
    """Get current user and verify admin role"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

def register_user(email: str, password: str, full_name: str, 
                 organization_name: Optional[str] = None,
                 ip_address: Optional[str] = None) -> Dict:
    """Register a new user"""
    
    # Validate email format
    if not email or "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Validate password strength
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    # Check if user already exists
    existing_user = get_user_by_email(email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create organization if provided
    organization_id = None
    if organization_name:
        org = create_organization(name=organization_name, subscription_tier='free')
        organization_id = org['id']
    
    # Hash password
    hashed_password = get_password_hash(password)
    
    # Create user
    user = create_user(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        organization_id=organization_id
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    
    # Log action
    if organization_id:
        log_action(
            user_id=user['id'],
            organization_id=organization_id,
            action='user_registered',
            entity_type='user',
            entity_id=user['id'],
            ip_address=ip_address
        )
    
    return user

def login_user(email: str, password: str, ip_address: Optional[str] = None,
              user_agent: Optional[str] = None) -> Dict:
    """Login user and create session"""
    
    # Authenticate user
    user = authenticate_user(email, password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create tokens
    access_token = create_access_token(
        data={
            "sub": str(user['id']), 
            "email": user['email'],
            "company_id": str(user['company_id']) if user.get('company_id') else None
        }
    )
    refresh_token = create_refresh_token(
        data={
            "sub": str(user['id']), 
            "email": user['email'],
            "company_id": str(user['company_id']) if user.get('company_id') else None
        }
    )
    
    # Create session in database
    expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    create_session(
        user_id=user['id'],
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    # Update last login
    update_last_login(user['id'])
    
    # Log action
    if user.get('organization_id'):
        log_action(
            user_id=user['id'],
            organization_id=user['organization_id'],
            action='user_login',
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "full_name": user['full_name'],
            "role": user.get('role', 'user'),
            "organization_id": user.get('organization_id')
        }
    }

def logout_user(token: str, user_id: int, organization_id: Optional[int] = None,
               ip_address: Optional[str] = None) -> bool:
    """Logout user and invalidate session"""
    
    # Invalidate session
    invalidate_session(token)
    
    # Log action
    if organization_id:
        log_action(
            user_id=user_id,
            organization_id=organization_id,
            action='user_logout',
            ip_address=ip_address
        )
    
    return True

def refresh_access_token(refresh_token: str) -> Dict:
    """Refresh access token using refresh token"""
    
    # Verify refresh token
    payload = verify_token(refresh_token)
    
    # Check token type
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    # Get user ID
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user_id = user_id_str
    
    # Get user
    user = get_user_by_id(user_id)
    if not user or not user.get('is_active'):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new access token
    new_access_token = create_access_token(
        data={
            "sub": str(user['id']), 
            "email": user['email'],
            "company_id": str(user['company_id']) if user.get('company_id') else None
        }
    )
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

if __name__ == "__main__":
    print("✅ Integrated authentication system loaded")
    print(f"🔐 JWT Algorithm: {ALGORITHM}")
    print(f"⏰ Access Token Expiry: {ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
    print(f"⏰ Refresh Token Expiry: {REFRESH_TOKEN_EXPIRE_DAYS} days")
