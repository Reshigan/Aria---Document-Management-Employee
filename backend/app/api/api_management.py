from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from core.database import get_db
from app.services.api_management_service import APIManagementService
from app.schemas.api_management import (
    APIKeyCreate, APIKeyUpdate, APIKeyResponse, APIKeyWithSecret, APIKeyListResponse,
    APIUsageLogCreate, APIUsageLogResponse, APIUsageLogListResponse,
    APIEndpointCreate, APIEndpointUpdate, APIEndpointResponse, APIEndpointListResponse,
    APIQuotaCreate, APIQuotaUpdate, APIQuotaResponse,
    APIAlertCreate, APIAlertUpdate, APIAlertResponse, APIAlertListResponse,
    APIUsageAnalytics, RateLimitStatus, APIHealthStatus
)

router = APIRouter(prefix="/api-management", tags=["API Management"])

def get_api_management_service(db: Session = Depends(get_db)) -> APIManagementService:
    return APIManagementService(db)

# API Key Management
@router.post("/api-keys", response_model=APIKeyWithSecret, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    api_key_data: APIKeyCreate,
    service: APIManagementService = Depends(get_api_management_service)
):
    """Create a new API key"""
    try:
        db_api_key, full_key = service.create_api_key(api_key_data)
        
        # Return the API key with the secret (only time it's shown)
        response_data = APIKeyResponse.from_orm(db_api_key).dict()
        response_data['api_key'] = full_key
        
        return APIKeyWithSecret(**response_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create API key: {str(e)}"
        )

@router.get("/api-keys", response_model=APIKeyListResponse)
async def get_api_keys(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    service: APIManagementService = Depends(get_api_management_service)
):
    """Get API keys with filtering and pagination"""
    skip = (page - 1) * size
    api_keys, total = service.get_api_keys(
        user_id=user_id,
        is_active=is_active,
        skip=skip,
        limit=size
    )
    
    pages = (total + size - 1) // size
    
    return APIKeyListResponse(
        items=[APIKeyResponse.from_orm(key) for key in api_keys],
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/api-keys/{api_key_id}", response_model=APIKeyResponse)
async def get_api_key(
    api_key_id: int,
    service: APIManagementService = Depends(get_api_management_service)
):
    """Get API key by ID"""
    api_key = service.get_api_key(api_key_id)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    return APIKeyResponse.from_orm(api_key)

@router.put("/api-keys/{api_key_id}", response_model=APIKeyResponse)
async def update_api_key(
    api_key_id: int,
    api_key_data: APIKeyUpdate,
    service: APIManagementService = Depends(get_api_management_service)
):
    """Update API key"""
    api_key = service.update_api_key(api_key_id, api_key_data)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    return APIKeyResponse.from_orm(api_key)

@router.delete("/api-keys/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    api_key_id: int,
    service: APIManagementService = Depends(get_api_management_service)
):
    """Delete API key"""
    success = service.delete_api_key(api_key_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

@router.get("/api-keys/{api_key_id}/rate-limit", response_model=RateLimitStatus)
async def get_rate_limit_status(
    api_key_id: int,
    service: APIManagementService = Depends(get_api_management_service)
):
    """Get rate limit status for API key"""
    try:
        return service.check_rate_limit(api_key_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

# Usage Logging
@router.post("/usage-logs", response_model=APIUsageLogResponse, status_code=status.HTTP_201_CREATED)
async def create_usage_log(
    usage_data: APIUsageLogCreate,
    service: APIManagementService = Depends(get_api_management_service)
):
    """Log API usage"""
    try:
        usage_log = service.log_api_usage(usage_data)
        return APIUsageLogResponse.from_orm(usage_log)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to log usage: {str(e)}"
        )

@router.get("/usage-logs", response_model=APIUsageLogListResponse)
async def get_usage_logs(
    api_key_id: Optional[int] = Query(None, description="Filter by API key ID"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    service: APIManagementService = Depends(get_api_management_service)
):
    """Get usage logs with filtering and pagination"""
    skip = (page - 1) * size
    logs, total = service.get_usage_logs(
        api_key_id=api_key_id,
        endpoint=endpoint,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=size
    )
    
    pages = (total + size - 1) // size
    
    return APIUsageLogListResponse(
        items=[APIUsageLogResponse.from_orm(log) for log in logs],
        total=total,
        page=page,
        size=size,
        pages=pages
    )

# API Endpoint Management
@router.post("/endpoints", response_model=APIEndpointResponse, status_code=status.HTTP_201_CREATED)
async def create_api_endpoint(
    endpoint_data: APIEndpointCreate,
    service: APIManagementService = Depends(get_api_management_service)
):
    """Create API endpoint"""
    try:
        endpoint = service.create_api_endpoint(endpoint_data)
        return APIEndpointResponse.from_orm(endpoint)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create endpoint: {str(e)}"
        )

@router.get("/endpoints", response_model=APIEndpointListResponse)
async def get_api_endpoints(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    service: APIManagementService = Depends(get_api_management_service)
):
    """Get API endpoints with filtering and pagination"""
    skip = (page - 1) * size
    endpoints, total = service.get_api_endpoints(
        is_active=is_active,
        skip=skip,
        limit=size
    )
    
    pages = (total + size - 1) // size
    
    return APIEndpointListResponse(
        items=[APIEndpointResponse.from_orm(endpoint) for endpoint in endpoints],
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/endpoints/{endpoint_id}", response_model=APIEndpointResponse)
async def get_api_endpoint(
    endpoint_id: int,
    service: APIManagementService = Depends(get_api_management_service)
):
    """Get API endpoint by ID"""
    endpoint = service.get_api_endpoint(endpoint_id)
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API endpoint not found"
        )
    return APIEndpointResponse.from_orm(endpoint)

@router.put("/endpoints/{endpoint_id}", response_model=APIEndpointResponse)
async def update_api_endpoint(
    endpoint_id: int,
    endpoint_data: APIEndpointUpdate,
    service: APIManagementService = Depends(get_api_management_service)
):
    """Update API endpoint"""
    endpoint = service.update_api_endpoint(endpoint_id, endpoint_data)
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API endpoint not found"
        )
    return APIEndpointResponse.from_orm(endpoint)

@router.delete("/endpoints/{endpoint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_endpoint(
    endpoint_id: int,
    service: APIManagementService = Depends(get_api_management_service)
):
    """Delete API endpoint"""
    success = service.delete_api_endpoint(endpoint_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API endpoint not found"
        )

# Analytics and Monitoring
@router.get("/analytics", response_model=APIUsageAnalytics)
async def get_api_analytics(
    start_date: Optional[datetime] = Query(None, description="Start date for analytics"),
    end_date: Optional[datetime] = Query(None, description="End date for analytics"),
    service: APIManagementService = Depends(get_api_management_service)
):
    """Get comprehensive API usage analytics"""
    return service.get_api_usage_analytics(start_date=start_date, end_date=end_date)

@router.get("/health", response_model=APIHealthStatus)
async def get_api_health(
    service: APIManagementService = Depends(get_api_management_service)
):
    """Get overall API health status"""
    return service.get_api_health_status()

# Statistics and Reports
@router.get("/statistics/summary")
async def get_api_statistics_summary(
    service: APIManagementService = Depends(get_api_management_service)
):
    """Get API statistics summary"""
    health = service.get_api_health_status()
    
    # Get recent analytics (last 7 days)
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    analytics = service.get_api_usage_analytics(start_date=start_date, end_date=end_date)
    
    return {
        "health": health,
        "recent_analytics": analytics,
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": 7
        }
    }
