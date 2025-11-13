"""
Composite Authentication Module
Supports both service-to-service (X-Service-Key) and user (Bearer token) authentication
"""
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from pydantic import BaseModel
from typing import Optional
import hmac
import os
import logging

logger = logging.getLogger(__name__)

oauth2_scheme = HTTPBearer(auto_error=False)
service_key_header = APIKeyHeader(name="X-Service-Key", auto_error=False)

SERVICE_API_KEY = os.getenv("SERVICE_API_KEY")
if not SERVICE_API_KEY:
    logger.warning("SERVICE_API_KEY not set in environment. Service key authentication will not work.")


class AuthPrincipal(BaseModel):
    """Authentication principal (service or user)"""
    type: str  # "service" or "user"
    sub: str   # service name or user_id
    email: Optional[str] = None
    role: Optional[str] = None
    company_id: Optional[str] = None


async def authorize_gl_request(
    service_key: Optional[str] = Security(service_key_header),
    bearer: Optional[HTTPAuthorizationCredentials] = Security(oauth2_scheme),
) -> AuthPrincipal:
    """
    Composite authentication for GL endpoints.
    
    Accepts either:
    1. X-Service-Key header (for service-to-service calls)
    2. Bearer token (for authenticated user requests)
    
    Precedence: X-Service-Key takes priority if both are present.
    
    Returns:
        AuthPrincipal with type="service" or type="user"
    
    Raises:
        HTTPException 401 if neither auth method is valid
    """
    
    if service_key:
        if SERVICE_API_KEY and hmac.compare_digest(service_key, SERVICE_API_KEY):
            logger.info("GL request authenticated via service key")
            return AuthPrincipal(type="service", sub="gl-service")
        else:
            logger.warning("Invalid service API key provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid service API key"
            )
    
    if bearer:
        try:
            from auth_integrated import verify_token
            from database import get_user_by_id
            
            token = bearer.credentials
            payload = verify_token(token)
            
            # Check token type
            if payload.get("type") != "access":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )
            
            # Get user ID from token
            user_id_str = payload.get("sub")
            if not user_id_str:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: missing user ID"
                )
            
            try:
                user_id = int(user_id_str)
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid user ID in token"
                )
            
            # Get user from database
            user = get_user_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found"
                )
            
            if not user.get('is_active'):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account is disabled"
                )
            
            user_role = user.get('role', 'user')
            if user_role not in ['admin', 'finance']:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions. GL posting requires admin or finance role."
                )
            
            logger.info(f"GL request authenticated via Bearer token for user {user_id} (role: {user_role})")
            
            return AuthPrincipal(
                type="user",
                sub=str(user_id),
                email=user.get('email'),
                role=user_role,
                company_id=str(user.get('organization_id')) if user.get('organization_id') else None
            )
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error validating Bearer token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
    
    logger.warning("GL request with no authentication provided")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Provide either X-Service-Key header or Bearer token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
