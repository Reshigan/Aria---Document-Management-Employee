"""
Authentication dependencies for FastAPI endpoints.

This module provides dependencies for user authentication and authorization.
"""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from aria.core.database import get_db
from aria.core.logging import get_logger
from aria.core.security import verify_token
from aria.schemas.user import UserResponse
from aria.services.user_service import UserService

# Security scheme
security = HTTPBearer()

# Logger
logger = get_logger(__name__)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Get current authenticated user from JWT token.
    
    Args:
        credentials: HTTP authorization credentials
        db: Database session
        
    Returns:
        Current user data
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    # Verify token
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get username from token
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user_service = UserService(db)
    user = await user_service.get_user_by_username(username)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return UserResponse.model_validate(user)


async def get_current_active_user(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """
    Get current active user (alias for get_current_user).
    
    Args:
        current_user: Current user from get_current_user
        
    Returns:
        Current active user
    """
    return current_user


async def get_current_superuser(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """
    Get current superuser.
    
    Args:
        current_user: Current user from get_current_user
        
    Returns:
        Current superuser
        
    Raises:
        HTTPException: If user is not a superuser
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Superuser access required.",
        )
    
    return current_user


def require_permissions(*required_permissions: str):
    """
    Create a dependency that requires specific permissions.
    
    Args:
        required_permissions: List of required permissions
        
    Returns:
        FastAPI dependency function
    """
    async def permission_dependency(
        current_user: UserResponse = Depends(get_current_user),
    ) -> UserResponse:
        """
        Check if current user has required permissions.
        
        Args:
            current_user: Current authenticated user
            
        Returns:
            Current user if permissions are satisfied
            
        Raises:
            HTTPException: If user lacks required permissions
        """
        # Get user permissions from roles
        user_permissions = set()
        for role in current_user.roles:
            user_permissions.update(role.permissions)
        
        # Check if user has all required permissions
        missing_permissions = set(required_permissions) - user_permissions
        
        if missing_permissions:
            logger.warning(
                "Permission denied",
                username=current_user.username,
                required_permissions=list(required_permissions),
                missing_permissions=list(missing_permissions),
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permissions: {', '.join(missing_permissions)}",
            )
        
        return current_user
    
    return permission_dependency


def require_roles(*required_roles: str):
    """
    Create a dependency that requires specific roles.
    
    Args:
        required_roles: List of required role names
        
    Returns:
        FastAPI dependency function
    """
    async def role_dependency(
        current_user: UserResponse = Depends(get_current_user),
    ) -> UserResponse:
        """
        Check if current user has required roles.
        
        Args:
            current_user: Current authenticated user
            
        Returns:
            Current user if roles are satisfied
            
        Raises:
            HTTPException: If user lacks required roles
        """
        # Get user role names
        user_roles = {role.name for role in current_user.roles}
        
        # Check if user has any of the required roles
        if not any(role in user_roles for role in required_roles):
            logger.warning(
                "Role access denied",
                username=current_user.username,
                required_roles=list(required_roles),
                user_roles=list(user_roles),
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(required_roles)}",
            )
        
        return current_user
    
    return role_dependency


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db),
) -> Optional[UserResponse]:
    """
    Get current user if authenticated, otherwise return None.
    
    This dependency is useful for endpoints that work for both
    authenticated and anonymous users.
    
    Args:
        credentials: Optional HTTP authorization credentials
        db: Database session
        
    Returns:
        Current user if authenticated, None otherwise
    """
    if not credentials:
        return None
    
    try:
        # Verify token
        payload = verify_token(credentials.credentials)
        if not payload or payload.get("type") != "access":
            return None
        
        # Get username from token
        username = payload.get("sub")
        if not username:
            return None
        
        # Get user from database
        user_service = UserService(db)
        user = await user_service.get_user_by_username(username)
        
        if not user or not user.is_active:
            return None
        
        return UserResponse.model_validate(user)
    
    except Exception as e:
        logger.debug("Optional authentication failed", error=str(e))
        return None