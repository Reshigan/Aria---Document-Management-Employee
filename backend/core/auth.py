"""
Authentication System - JWT, Password Hashing, Token Management
"""
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# JWT Configuration - use same settings as login endpoint
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

_auth_engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
_AuthSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_auth_engine)


class UserContext:
    """Lightweight user context for authentication (no ORM relationships)"""
    def __init__(self, id: int, email: str, full_name: str, is_active: bool, 
                 organization_id: Optional[int] = None, company_id: Optional[str] = None):
        self.id = id
        self.email = email
        self.full_name = full_name
        self.is_active = is_active
        self.organization_id = organization_id
        self.company_id = company_id
        self.tenant_id = organization_id  # Derive tenant_id from organization_id

class AuthService:
    """Authentication service"""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash password"""
        return pwd_context.hash(password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> dict:
        """Decode JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

def get_current_user(token: str = Depends(oauth2_scheme)) -> UserContext:
    """Get current authenticated user using raw SQL (avoids ORM model conflicts)
    
    Compatible with both token formats:
    - Legacy: {"user_id": int}
    - Current: {"sub": str(int), "email": str}
    
    Returns a UserContext object with user attributes (no ORM relationships)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = AuthService.decode_token(token)
        
        user_id = payload.get("user_id")
        if user_id is None:
            sub = payload.get("sub")
            if sub is not None:
                user_id = int(sub)
        
        if user_id is None:
            raise credentials_exception
            
    except (JWTError, ValueError, TypeError):
        raise credentials_exception
    
    db = _AuthSessionLocal()
    try:
        result = db.execute(
            text("SELECT id, email, full_name, is_active, organization_id, company_id FROM users WHERE id = :user_id"),
            {"user_id": user_id}
        )
        row = result.fetchone()
        
        if row is None:
            raise credentials_exception
        
        user = UserContext(
            id=row[0],
            email=row[1],
            full_name=row[2],
            is_active=row[3],
            organization_id=row[4],
            company_id=row[5]
        )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user"
            )
        
        return user
    finally:
        db.close()
