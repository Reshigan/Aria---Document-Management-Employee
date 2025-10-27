"""
JWT Authentication for Aria

Handles token generation, validation, and user authentication.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
JWT_SECRET_KEY = "your-secret-key-change-in-production"  # TODO: Move to env
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30 days

# HTTP Bearer security
security = HTTPBearer()


class PasswordManager:
    """Manage password hashing and verification."""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against hash."""
        return pwd_context.verify(plain_password, hashed_password)


class JWTManager:
    """Manage JWT token creation and validation."""
    
    @staticmethod
    def create_access_token(
        user_id: str,
        tenant_id: str,
        email: str,
        role: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create JWT access token.
        
        Args:
            user_id: User identifier
            tenant_id: Tenant identifier
            email: User email
            role: User role
            expires_delta: Token expiration time
            
        Returns:
            JWT token string
        """
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        payload = {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "email": email,
            "role": role,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        }
        
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return token
    
    @staticmethod
    def create_refresh_token(
        user_id: str,
        tenant_id: str
    ) -> str:
        """
        Create JWT refresh token.
        
        Args:
            user_id: User identifier
            tenant_id: Tenant identifier
            
        Returns:
            JWT refresh token string
        """
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        payload = {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        }
        
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return token
    
    @staticmethod
    def decode_token(token: str) -> Dict[str, Any]:
        """
        Decode and validate JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            Token payload
            
        Raises:
            HTTPException: If token is invalid or expired
        """
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
        
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    @staticmethod
    def verify_access_token(token: str) -> Dict[str, Any]:
        """
        Verify access token.
        
        Args:
            token: JWT token string
            
        Returns:
            Token payload
        """
        payload = JWTManager.decode_token(token)
        
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        return payload
    
    @staticmethod
    def verify_refresh_token(token: str) -> Dict[str, Any]:
        """
        Verify refresh token.
        
        Args:
            token: JWT refresh token string
            
        Returns:
            Token payload
        """
        payload = JWTManager.decode_token(token)
        
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> Dict[str, Any]:
    """
    FastAPI dependency to get current authenticated user.
    
    Usage:
        @app.get("/me")
        async def get_me(current_user: dict = Depends(get_current_user)):
            return current_user
    
    Args:
        credentials: HTTP Authorization header
        
    Returns:
        User payload from token
    """
    token = credentials.credentials
    payload = JWTManager.verify_access_token(token)
    
    return {
        "user_id": payload["user_id"],
        "tenant_id": payload["tenant_id"],
        "email": payload["email"],
        "role": payload["role"]
    }


async def get_current_tenant_id(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> str:
    """
    FastAPI dependency to get current tenant ID.
    
    Usage:
        @app.get("/documents")
        async def get_documents(tenant_id: str = Depends(get_current_tenant_id)):
            # Use tenant_id to query tenant-specific data
    
    Args:
        current_user: Current user from JWT
        
    Returns:
        Tenant ID
    """
    return current_user["tenant_id"]


def require_role(required_role: str):
    """
    Decorator to require specific role.
    
    Usage:
        @app.get("/admin")
        @require_role("admin")
        async def admin_only(current_user: dict = Depends(get_current_user)):
            return {"message": "Admin access granted"}
    
    Args:
        required_role: Required role name
    """
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)):
        user_role = current_user.get("role")
        
        if user_role != required_role and user_role != "admin":
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required role: {required_role}"
            )
        
        return current_user
    
    return role_checker


class AuthService:
    """Authentication service for login/register."""
    
    @staticmethod
    def authenticate_user(
        email: str,
        password: str,
        db
    ) -> Optional[Dict[str, Any]]:
        """
        Authenticate user with email and password.
        
        Args:
            email: User email
            password: Plain text password
            db: Database session
            
        Returns:
            User dict if authenticated, None otherwise
        """
        from backend.models.user import User
        
        # Query user from database
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            return None
        
        # Verify password
        if not PasswordManager.verify_password(password, user.password_hash):
            return None
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(status_code=403, detail="User account is inactive")
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        user.login_count += 1
        db.commit()
        
        return {
            "user_id": user.user_id,
            "tenant_id": user.tenant_id,
            "email": user.email,
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name
        }
    
    @staticmethod
    def login(
        email: str,
        password: str,
        db
    ) -> Dict[str, str]:
        """
        Login user and return tokens.
        
        Args:
            email: User email
            password: Password
            db: Database session
            
        Returns:
            Dict with access_token and refresh_token
        """
        user = AuthService.authenticate_user(email, password, db)
        
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password"
            )
        
        # Create tokens
        access_token = JWTManager.create_access_token(
            user_id=user["user_id"],
            tenant_id=user["tenant_id"],
            email=user["email"],
            role=user["role"]
        )
        
        refresh_token = JWTManager.create_refresh_token(
            user_id=user["user_id"],
            tenant_id=user["tenant_id"]
        )
        
        logger.info(f"User logged in: {user['email']} (tenant: {user['tenant_id']})")
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user
        }
    
    @staticmethod
    def refresh_token(refresh_token: str, db) -> Dict[str, str]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: JWT refresh token
            db: Database session
            
        Returns:
            New access token
        """
        from backend.models.user import User
        
        # Verify refresh token
        payload = JWTManager.verify_refresh_token(refresh_token)
        
        # Get user from database
        user = db.query(User).filter(
            User.user_id == payload["user_id"]
        ).first()
        
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        
        # Create new access token
        access_token = JWTManager.create_access_token(
            user_id=user.user_id,
            tenant_id=user.tenant_id,
            email=user.email,
            role=user.role
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
