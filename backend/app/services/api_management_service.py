import hashlib
import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
from app.models.api_management import (
    APIKey, APIUsageLog, RateLimitEntry, APIEndpoint, 
    EndpointUsageStats, APIQuota, APIAlert
)
from app.schemas.api_management import (
    APIKeyCreate, APIKeyUpdate, APIUsageLogCreate, 
    RateLimitEntryCreate, APIEndpointCreate, APIEndpointUpdate,
    EndpointUsageStatsCreate, APIQuotaCreate, APIQuotaUpdate,
    APIAlertCreate, APIAlertUpdate, APIUsageAnalytics,
    RateLimitStatus, APIHealthStatus
)

class APIManagementService:
    def __init__(self, db: Session):
        self.db = db

    # API Key Management
    def generate_api_key(self) -> Tuple[str, str, str]:
        """Generate a new API key with prefix and hash"""
        # Generate random key
        alphabet = string.ascii_letters + string.digits
        key = ''.join(secrets.choice(alphabet) for _ in range(32))
        
        # Create prefix for identification
        prefix = f"aria_{key[:8]}"
        full_key = f"{prefix}_{key}"
        
        # Hash the key for storage
        key_hash = hashlib.sha256(full_key.encode()).hexdigest()
        
        return full_key, prefix, key_hash

    def create_api_key(self, api_key_data: APIKeyCreate) -> Tuple[APIKey, str]:
        """Create a new API key"""
        full_key, prefix, key_hash = self.generate_api_key()
        
        db_api_key = APIKey(
            name=api_key_data.name,
            key_hash=key_hash,
            key_prefix=prefix,
            description=api_key_data.description,
            user_id=api_key_data.user_id,
            scopes=api_key_data.scopes,
            rate_limit_requests=api_key_data.rate_limit_requests,
            rate_limit_window=api_key_data.rate_limit_window,
            expires_at=api_key_data.expires_at,
            created_by=api_key_data.user_id
        )
        
        self.db.add(db_api_key)
        self.db.commit()
        self.db.refresh(db_api_key)
        
        return db_api_key, full_key

    def get_api_key(self, api_key_id: int) -> Optional[APIKey]:
        """Get API key by ID"""
        return self.db.query(APIKey).filter(APIKey.id == api_key_id).first()

    def get_api_key_by_hash(self, key_hash: str) -> Optional[APIKey]:
        """Get API key by hash"""
        return self.db.query(APIKey).filter(APIKey.key_hash == key_hash).first()

    def get_api_keys(self, user_id: Optional[int] = None, is_active: Optional[bool] = None,
                     skip: int = 0, limit: int = 100) -> Tuple[List[APIKey], int]:
        """Get API keys with filtering"""
        query = self.db.query(APIKey)
        
        if user_id is not None:
            query = query.filter(APIKey.user_id == user_id)
        if is_active is not None:
            query = query.filter(APIKey.is_active == is_active)
        
        total = query.count()
        api_keys = query.offset(skip).limit(limit).all()
        
        return api_keys, total

    def update_api_key(self, api_key_id: int, api_key_data: APIKeyUpdate) -> Optional[APIKey]:
        """Update API key"""
        db_api_key = self.get_api_key(api_key_id)
        if not db_api_key:
            return None
        
        update_data = api_key_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_api_key, field, value)
        
        self.db.commit()
        self.db.refresh(db_api_key)
        return db_api_key

    def delete_api_key(self, api_key_id: int) -> bool:
        """Delete API key"""
        db_api_key = self.get_api_key(api_key_id)
        if not db_api_key:
            return False
        
        self.db.delete(db_api_key)
        self.db.commit()
        return True

    def update_api_key_last_used(self, api_key_id: int) -> None:
        """Update last used timestamp for API key"""
        self.db.query(APIKey).filter(APIKey.id == api_key_id).update({
            APIKey.last_used_at: datetime.utcnow()
        })
        self.db.commit()

    # Usage Logging
    def log_api_usage(self, usage_data: APIUsageLogCreate) -> APIUsageLog:
        """Log API usage"""
        db_usage_log = APIUsageLog(**usage_data.dict())
        self.db.add(db_usage_log)
        self.db.commit()
        self.db.refresh(db_usage_log)
        return db_usage_log

    def get_usage_logs(self, api_key_id: Optional[int] = None, 
                      endpoint: Optional[str] = None,
                      start_date: Optional[datetime] = None,
                      end_date: Optional[datetime] = None,
                      skip: int = 0, limit: int = 100) -> Tuple[List[APIUsageLog], int]:
        """Get usage logs with filtering"""
        query = self.db.query(APIUsageLog)
        
        if api_key_id is not None:
            query = query.filter(APIUsageLog.api_key_id == api_key_id)
        if endpoint is not None:
            query = query.filter(APIUsageLog.endpoint.like(f"%{endpoint}%"))
        if start_date is not None:
            query = query.filter(APIUsageLog.timestamp >= start_date)
        if end_date is not None:
            query = query.filter(APIUsageLog.timestamp <= end_date)
        
        query = query.order_by(desc(APIUsageLog.timestamp))
        total = query.count()
        logs = query.offset(skip).limit(limit).all()
        
        return logs, total

    # Rate Limiting
    def check_rate_limit(self, api_key_id: int) -> RateLimitStatus:
        """Check rate limit status for API key"""
        api_key = self.get_api_key(api_key_id)
        if not api_key:
            raise ValueError("API key not found")
        
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=api_key.rate_limit_window)
        
        # Get current window entry
        rate_limit_entry = self.db.query(RateLimitEntry).filter(
            and_(
                RateLimitEntry.api_key_id == api_key_id,
                RateLimitEntry.window_start <= now,
                RateLimitEntry.window_end > now
            )
        ).first()
        
        if not rate_limit_entry:
            # Create new window
            window_end = now + timedelta(seconds=api_key.rate_limit_window)
            rate_limit_entry = RateLimitEntry(
                api_key_id=api_key_id,
                window_start=now,
                window_end=window_end,
                request_count=0
            )
            self.db.add(rate_limit_entry)
            self.db.commit()
            self.db.refresh(rate_limit_entry)
        
        remaining = max(0, api_key.rate_limit_requests - rate_limit_entry.request_count)
        is_exceeded = rate_limit_entry.request_count >= api_key.rate_limit_requests
        
        return RateLimitStatus(
            api_key_id=api_key_id,
            current_window_start=rate_limit_entry.window_start,
            current_window_end=rate_limit_entry.window_end,
            requests_in_window=rate_limit_entry.request_count,
            limit=api_key.rate_limit_requests,
            remaining=remaining,
            reset_time=rate_limit_entry.window_end,
            is_exceeded=is_exceeded
        )

    def increment_rate_limit(self, api_key_id: int) -> RateLimitStatus:
        """Increment rate limit counter"""
        status = self.check_rate_limit(api_key_id)
        
        # Update the counter
        self.db.query(RateLimitEntry).filter(
            and_(
                RateLimitEntry.api_key_id == api_key_id,
                RateLimitEntry.window_start <= datetime.utcnow(),
                RateLimitEntry.window_end > datetime.utcnow()
            )
        ).update({
            RateLimitEntry.request_count: RateLimitEntry.request_count + 1
        })
        
        if status.is_exceeded:
            # Also increment exceeded counter
            self.db.query(RateLimitEntry).filter(
                and_(
                    RateLimitEntry.api_key_id == api_key_id,
                    RateLimitEntry.window_start <= datetime.utcnow(),
                    RateLimitEntry.window_end > datetime.utcnow()
                )
            ).update({
                RateLimitEntry.limit_exceeded_count: RateLimitEntry.limit_exceeded_count + 1
            })
        
        self.db.commit()
        return self.check_rate_limit(api_key_id)

    # API Endpoint Management
    def create_api_endpoint(self, endpoint_data: APIEndpointCreate) -> APIEndpoint:
        """Create API endpoint"""
        db_endpoint = APIEndpoint(**endpoint_data.dict())
        self.db.add(db_endpoint)
        self.db.commit()
        self.db.refresh(db_endpoint)
        return db_endpoint

    def get_api_endpoint(self, endpoint_id: int) -> Optional[APIEndpoint]:
        """Get API endpoint by ID"""
        return self.db.query(APIEndpoint).filter(APIEndpoint.id == endpoint_id).first()

    def get_api_endpoint_by_path(self, path: str, method: str) -> Optional[APIEndpoint]:
        """Get API endpoint by path and method"""
        return self.db.query(APIEndpoint).filter(
            and_(APIEndpoint.path == path, APIEndpoint.method == method)
        ).first()

    def get_api_endpoints(self, is_active: Optional[bool] = None,
                         skip: int = 0, limit: int = 100) -> Tuple[List[APIEndpoint], int]:
        """Get API endpoints with filtering"""
        query = self.db.query(APIEndpoint)
        
        if is_active is not None:
            query = query.filter(APIEndpoint.is_active == is_active)
        
        total = query.count()
        endpoints = query.offset(skip).limit(limit).all()
        
        return endpoints, total

    def update_api_endpoint(self, endpoint_id: int, endpoint_data: APIEndpointUpdate) -> Optional[APIEndpoint]:
        """Update API endpoint"""
        db_endpoint = self.get_api_endpoint(endpoint_id)
        if not db_endpoint:
            return None
        
        update_data = endpoint_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_endpoint, field, value)
        
        self.db.commit()
        self.db.refresh(db_endpoint)
        return db_endpoint

    def delete_api_endpoint(self, endpoint_id: int) -> bool:
        """Delete API endpoint"""
        db_endpoint = self.get_api_endpoint(endpoint_id)
        if not db_endpoint:
            return False
        
        self.db.delete(db_endpoint)
        self.db.commit()
        return True

    # Analytics
    def get_api_usage_analytics(self, start_date: Optional[datetime] = None,
                              end_date: Optional[datetime] = None) -> APIUsageAnalytics:
        """Get comprehensive API usage analytics"""
        query = self.db.query(APIUsageLog)
        
        if start_date:
            query = query.filter(APIUsageLog.timestamp >= start_date)
        if end_date:
            query = query.filter(APIUsageLog.timestamp <= end_date)
        
        # Basic metrics
        total_requests = query.count()
        successful_requests = query.filter(
            and_(APIUsageLog.status_code >= 200, APIUsageLog.status_code < 300)
        ).count()
        failed_requests = query.filter(
            and_(APIUsageLog.status_code >= 400, APIUsageLog.status_code < 500)
        ).count()
        
        error_rate = (total_requests - successful_requests) / total_requests if total_requests > 0 else 0
        
        # Performance metrics
        avg_response_time = query.with_entities(func.avg(APIUsageLog.response_time_ms)).scalar() or 0
        p95_response_time = self._calculate_percentile(query, APIUsageLog.response_time_ms, 0.95)
        
        # Data transfer
        total_data_transfer = query.with_entities(
            func.sum(APIUsageLog.request_size + APIUsageLog.response_size)
        ).scalar() or 0
        
        # Unique API keys
        unique_api_keys = query.with_entities(APIUsageLog.api_key_id).distinct().count()
        
        # Top endpoints
        top_endpoints = self._get_top_endpoints(query)
        
        # Usage patterns
        hourly_usage = self._get_hourly_usage(query)
        daily_usage = self._get_daily_usage(query)
        
        return APIUsageAnalytics(
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            error_rate=error_rate,
            avg_response_time=avg_response_time,
            p95_response_time=p95_response_time,
            total_data_transfer=total_data_transfer,
            unique_api_keys=unique_api_keys,
            top_endpoints=top_endpoints,
            hourly_usage=hourly_usage,
            daily_usage=daily_usage
        )

    def get_api_health_status(self) -> APIHealthStatus:
        """Get overall API health status"""
        # Endpoint metrics
        total_endpoints = self.db.query(APIEndpoint).count()
        active_endpoints = self.db.query(APIEndpoint).filter(APIEndpoint.is_active == True).count()
        monitored_endpoints = self.db.query(APIEndpoint).filter(APIEndpoint.is_monitored == True).count()
        
        # Error metrics (last 24 hours)
        yesterday = datetime.utcnow() - timedelta(days=1)
        recent_logs = self.db.query(APIUsageLog).filter(APIUsageLog.timestamp >= yesterday)
        
        total_recent_requests = recent_logs.count()
        error_requests = recent_logs.filter(APIUsageLog.status_code >= 400).count()
        error_rate = error_requests / total_recent_requests if total_recent_requests > 0 else 0
        
        avg_response_time = recent_logs.with_entities(func.avg(APIUsageLog.response_time_ms)).scalar() or 0
        
        # API key metrics
        total_api_keys = self.db.query(APIKey).count()
        active_api_keys = self.db.query(APIKey).filter(APIKey.is_active == True).count()
        
        # Rate limited keys (last hour)
        last_hour = datetime.utcnow() - timedelta(hours=1)
        rate_limited_keys = self.db.query(RateLimitEntry).filter(
            and_(
                RateLimitEntry.window_end >= last_hour,
                RateLimitEntry.limit_exceeded_count > 0
            )
        ).count()
        
        endpoints_with_errors = self.db.query(APIUsageLog.endpoint).filter(
            and_(
                APIUsageLog.timestamp >= yesterday,
                APIUsageLog.status_code >= 400
            )
        ).distinct().count()
        
        return APIHealthStatus(
            total_endpoints=total_endpoints,
            active_endpoints=active_endpoints,
            monitored_endpoints=monitored_endpoints,
            endpoints_with_errors=endpoints_with_errors,
            avg_response_time=avg_response_time,
            error_rate=error_rate,
            total_api_keys=total_api_keys,
            active_api_keys=active_api_keys,
            rate_limited_keys=rate_limited_keys
        )

    # Helper methods
    def _calculate_percentile(self, query, column, percentile: float) -> float:
        """Calculate percentile for a column"""
        values = [row[0] for row in query.with_entities(column).all()]
        if not values:
            return 0.0
        
        values.sort()
        index = int(len(values) * percentile)
        return values[min(index, len(values) - 1)]

    def _get_top_endpoints(self, query, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top endpoints by request count"""
        results = query.with_entities(
            APIUsageLog.endpoint,
            func.count(APIUsageLog.id).label('request_count'),
            func.avg(APIUsageLog.response_time_ms).label('avg_response_time')
        ).group_by(APIUsageLog.endpoint).order_by(
            desc('request_count')
        ).limit(limit).all()
        
        return [
            {
                'endpoint': result.endpoint,
                'request_count': result.request_count,
                'avg_response_time': float(result.avg_response_time or 0)
            }
            for result in results
        ]

    def _get_hourly_usage(self, query) -> List[Dict[str, Any]]:
        """Get hourly usage patterns"""
        results = query.with_entities(
            func.extract('hour', APIUsageLog.timestamp).label('hour'),
            func.count(APIUsageLog.id).label('request_count')
        ).group_by('hour').order_by('hour').all()
        
        return [
            {
                'hour': int(result.hour),
                'request_count': result.request_count
            }
            for result in results
        ]

    def _get_daily_usage(self, query) -> List[Dict[str, Any]]:
        """Get daily usage patterns"""
        results = query.with_entities(
            func.date(APIUsageLog.timestamp).label('date'),
            func.count(APIUsageLog.id).label('request_count')
        ).group_by('date').order_by('date').all()
        
        return [
            {
                'date': result.date.isoformat(),
                'request_count': result.request_count
            }
            for result in results
        ]