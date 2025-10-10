"""
API Key Management Routes
"""
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import and_, select, update, delete, func

from core.database import get_db
from api.routes.auth_enhanced import get_current_user
from models import User, APIKey
from schemas.advanced import APIKeyResponse, APIKeyCreate, APIKeyUpdate
from services.auth_service import auth_service

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


def generate_api_key() -> tuple[str, str]:
    """Generate API key and its hash"""
    # Generate a secure random key
    key = f"aria_{secrets.token_urlsafe(32)}"
    # Create hash for storage
    key_hash = hashlib.sha256(key.encode()).hexdigest()
    return key, key_hash


@router.get("/", response_model=List[APIKeyResponse])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List user's API keys"""
    if current_user.is_superuser:
        # Admin can see all API keys
        query = select(APIKey)
    else:
        query = select(APIKey).where(APIKey.user_id == current_user.id)
    
    query = query.order_by(APIKey.created_at.desc())
    result = await db.execute(query)
    api_keys = result.scalars().all()
    
    return [APIKeyResponse.from_orm(key) for key in api_keys]


@router.post("/", response_model=dict)
async def create_api_key(
    key_data: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new API key"""
    # Check if user already has maximum number of keys
    existing_keys = select(APIKey).where(
        and_(APIKey.user_id == current_user.id, APIKey.is_active == True)
    ).scalar()
    
    max_keys = 10  # Configurable limit
    if existing_keys >= max_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum number of API keys ({max_keys}) reached"
        )
    
    # Generate API key
    api_key, key_hash = generate_api_key()
    
    # Create API key record
    new_key = APIKey(
        user_id=current_user.id,
        name=key_data.name,
        description=key_data.description,
        key_hash=key_hash,
        permissions=key_data.permissions,
        expires_at=key_data.expires_at,
        rate_limit_per_minute=key_data.rate_limit_per_minute,
        allowed_ips=key_data.allowed_ips,
        is_active=True
    )
    
    db.add(new_key)
    await db.commit()
    await db.refresh(new_key)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "api_key_created", "api_key", new_key.id,
        f"Created API key: {new_key.name}"
    )
    
    # Return the actual key only once (for security)
    return {
        "id": new_key.id,
        "name": new_key.name,
        "api_key": api_key,  # Only returned on creation
        "permissions": new_key.permissions,
        "expires_at": new_key.expires_at,
        "rate_limit_per_minute": new_key.rate_limit_per_minute,
        "created_at": new_key.created_at,
        "message": "Store this API key securely. It will not be shown again."
    }


@router.get("/{key_id}", response_model=APIKeyResponse)
async def get_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get API key details"""
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and api_key.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to access this API key"
        )
    
    return APIKeyResponse.from_orm(api_key)


@router.put("/{key_id}", response_model=APIKeyResponse)
async def update_api_key(
    key_id: int,
    key_data: APIKeyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update API key"""
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and api_key.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to modify this API key"
        )
    
    # Update fields
    update_data = key_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(api_key, field):
            setattr(api_key, field, value)
    
    await db.commit()
    await db.refresh(api_key)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "api_key_updated", "api_key", api_key.id,
        f"Updated API key: {api_key.name}"
    )
    
    return APIKeyResponse.from_orm(api_key)


@router.delete("/{key_id}")
async def delete_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete API key"""
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and api_key.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to delete this API key"
        )
    
    # Soft delete - deactivate instead of hard delete
    api_key.is_active = False
    api_key.deactivated_at = datetime.utcnow()
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "api_key_deleted", "api_key", api_key.id,
        f"Deleted API key: {api_key.name}"
    )
    
    return {"message": "API key deleted successfully"}


@router.post("/{key_id}/regenerate", response_model=dict)
async def regenerate_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Regenerate API key"""
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and api_key.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to regenerate this API key"
        )
    
    # Generate new key
    new_api_key, new_key_hash = generate_api_key()
    
    # Update key hash and reset usage stats
    api_key.key_hash = new_key_hash
    api_key.usage_count = 0
    api_key.last_used_at = None
    
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "api_key_regenerated", "api_key", api_key.id,
        f"Regenerated API key: {api_key.name}"
    )
    
    return {
        "id": api_key.id,
        "name": api_key.name,
        "api_key": new_api_key,  # Only returned on regeneration
        "message": "API key regenerated successfully. Store it securely."
    }


@router.get("/{key_id}/usage")
async def get_api_key_usage(
    key_id: int,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get API key usage statistics"""
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and api_key.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view usage for this API key"
        )
    
    since_date = datetime.utcnow() - timedelta(days=days)
    
    # Get usage from activity logs
    usage_stats = select(
        func.date(ActivityLog.created_at).label('date'),
        func.count(ActivityLog.id).label('requests')
    ).where(
        and_(
            ActivityLog.extra_data.contains(f'"api_key_id": {key_id}'),
            ActivityLog.created_at >= since_date
        )
    ).group_by(func.date(ActivityLog.created_at)).order_by('date').all()
    
    return {
        "api_key_id": key_id,
        "api_key_name": api_key.name,
        "period_days": days,
        "total_usage": api_key.usage_count,
        "last_used_at": api_key.last_used_at,
        "rate_limit_per_minute": api_key.rate_limit_per_minute,
        "daily_usage": [
            {"date": str(stat.date), "requests": stat.requests}
            for stat in usage_stats
        ]
    }


@router.get("/analytics/overview")
async def get_api_keys_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get API keys analytics overview"""
    # Base filter
    if current_user.is_superuser:
        key_filter = True
    else:
        key_filter = APIKey.user_id == current_user.id
    
    # Total keys
    count_result = await db.execute(select(func.count(APIKey.id)).where(key_filter))
    total_keys = count_result.scalar()
    
    active_keys_result = await db.execute(select(func.count(APIKey.id)).where(
        and_(key_filter, APIKey.is_active == True)
    ))
    active_keys = active_keys_result.scalar()
    
    # Usage statistics
    total_usage = select(func.sum(APIKey.usage_count)).where(key_filter).scalar() or 0
    
    # Recently used keys
    recently_used = select(APIKey).where(
        and_(
            key_filter,
            APIKey.last_used_at >= datetime.utcnow() - timedelta(days=7)
        )
    ).scalar()
    
    # Expiring keys (next 30 days)
    expiring_soon = select(APIKey).where(
        and_(
            key_filter,
            APIKey.is_active == True,
            APIKey.expires_at <= datetime.utcnow() + timedelta(days=30),
            APIKey.expires_at > datetime.utcnow()
        )
    ).scalar()
    
    # Most used keys
    most_used = select(APIKey).where(key_filter).order_by(
        APIKey.usage_count.desc()
    ).limit(5).all()
    
    return {
        "total_keys": total_keys,
        "active_keys": active_keys,
        "total_usage": total_usage,
        "recently_used": recently_used,
        "expiring_soon": expiring_soon,
        "most_used_keys": [
            {
                "id": key.id,
                "name": key.name,
                "usage_count": key.usage_count,
                "last_used_at": key.last_used_at,
                "created_at": key.created_at
            }
            for key in most_used
        ]
    }


# API Key Authentication Middleware Helper
async def authenticate_api_key(request: Request, db: Session) -> Optional[User]:
    """Authenticate request using API key"""
    # Get API key from header
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        return None
    
    # Hash the provided key
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    
    # Find API key in database
    db_key = select(APIKey).where(
        and_(
            APIKey.key_hash == key_hash,
            APIKey.is_active == True,
            or_(
                APIKey.expires_at.is_(None),
                APIKey.expires_at > datetime.utcnow()
            )
        )
    ).first()
    
    if not db_key:
        return None
    
    # Check IP restrictions
    if db_key.allowed_ips:
        client_ip = request.client.host
        if client_ip not in db_key.allowed_ips:
            return None
    
    # Check rate limiting (simplified - in production use Redis)
    now = datetime.utcnow()
    minute_ago = now - timedelta(minutes=1)
    
    recent_requests = select(ActivityLog).where(
        and_(
            ActivityLog.extra_data.contains(f'"api_key_id": {db_key.id}'),
            ActivityLog.created_at >= minute_ago
        )
    ).scalar()
    
    if recent_requests >= db_key.rate_limit_per_minute:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    
    # Update usage statistics
    db_key.usage_count += 1
    db_key.last_used_at = now
    await db.commit()
    
    # Get user
    result = await db.execute(select(User).where(User.id == db_key.user_id))
    user = result.scalar_one_or_none()
    
    # Log API usage
    await auth_service._log_activity_async(
        db, user.id if user else None, "api_request", "api_key", db_key.id,
        f"API request using key: {db_key.name}",
        {"api_key_id": db_key.id, "endpoint": str(request.url.path)}
    )
    
    return user