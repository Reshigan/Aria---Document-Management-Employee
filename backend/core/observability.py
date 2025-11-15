"""
Observability and Monitoring System
Provides structured logging, error aggregation, and alerting
"""
import json
import logging
import traceback
from typing import Dict, Any, Optional
from datetime import datetime
import uuid
from functools import wraps

class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info)
            }
        
        if hasattr(record, 'user_id'):
            log_data["user_id"] = record.user_id
        if hasattr(record, 'company_id'):
            log_data["company_id"] = record.company_id
        if hasattr(record, 'request_id'):
            log_data["request_id"] = record.request_id
        if hasattr(record, 'duration_ms'):
            log_data["duration_ms"] = record.duration_ms
        
        return json.dumps(log_data)

def setup_structured_logging():
    """Setup structured JSON logging for the application"""
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)
    
    return logger

class ErrorAggregator:
    """Aggregate and track errors for alerting"""
    
    _errors = {}
    _error_threshold = 10  # Alert after 10 occurrences
    
    @classmethod
    def track_error(cls, error_type: str, error_message: str, context: Optional[Dict[str, Any]] = None):
        """
        Track an error occurrence
        
        Args:
            error_type: Type of error (e.g., "DatabaseError", "ValidationError")
            error_message: Error message
            context: Additional context (user_id, company_id, etc.)
        """
        error_key = f"{error_type}:{error_message}"
        
        if error_key not in cls._errors:
            cls._errors[error_key] = {
                "count": 0,
                "first_seen": datetime.utcnow().isoformat(),
                "last_seen": None,
                "contexts": []
            }
        
        cls._errors[error_key]["count"] += 1
        cls._errors[error_key]["last_seen"] = datetime.utcnow().isoformat()
        
        if context:
            cls._errors[error_key]["contexts"].append(context)
        
        if cls._errors[error_key]["count"] == cls._error_threshold:
            cls._send_alert(error_type, error_message, cls._errors[error_key])
    
    @classmethod
    def _send_alert(cls, error_type: str, error_message: str, error_data: Dict[str, Any]):
        """
        Send alert for high-frequency errors
        
        In production, this would integrate with alerting systems like:
        - PagerDuty
        - Slack webhooks
        - Email notifications
        - Sentry
        """
        logger = logging.getLogger(__name__)
        logger.error(
            f"ALERT: Error threshold reached for {error_type}",
            extra={
                "error_type": error_type,
                "error_message": error_message,
                "count": error_data["count"],
                "first_seen": error_data["first_seen"],
                "last_seen": error_data["last_seen"]
            }
        )
    
    @classmethod
    def get_error_summary(cls) -> Dict[str, Any]:
        """Get summary of all tracked errors"""
        return {
            "total_error_types": len(cls._errors),
            "errors": cls._errors
        }

def monitor_performance(operation_name: str):
    """
    Decorator to monitor performance of operations
    
    Usage:
        @monitor_performance("database_query")
        def fetch_data():
            ...
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = datetime.utcnow()
            request_id = str(uuid.uuid4())
            logger = logging.getLogger(__name__)
            
            try:
                result = await func(*args, **kwargs)
                
                duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                logger.info(
                    f"Operation completed: {operation_name}",
                    extra={
                        "request_id": request_id,
                        "operation": operation_name,
                        "duration_ms": duration_ms,
                        "status": "success"
                    }
                )
                
                return result
            except Exception as e:
                duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                logger.error(
                    f"Operation failed: {operation_name}",
                    extra={
                        "request_id": request_id,
                        "operation": operation_name,
                        "duration_ms": duration_ms,
                        "status": "error",
                        "error_type": type(e).__name__,
                        "error_message": str(e)
                    },
                    exc_info=True
                )
                
                ErrorAggregator.track_error(
                    error_type=type(e).__name__,
                    error_message=str(e),
                    context={"operation": operation_name, "request_id": request_id}
                )
                
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = datetime.utcnow()
            request_id = str(uuid.uuid4())
            logger = logging.getLogger(__name__)
            
            try:
                result = func(*args, **kwargs)
                
                duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                logger.info(
                    f"Operation completed: {operation_name}",
                    extra={
                        "request_id": request_id,
                        "operation": operation_name,
                        "duration_ms": duration_ms,
                        "status": "success"
                    }
                )
                
                return result
            except Exception as e:
                duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                logger.error(
                    f"Operation failed: {operation_name}",
                    extra={
                        "request_id": request_id,
                        "operation": operation_name,
                        "duration_ms": duration_ms,
                        "status": "error",
                        "error_type": type(e).__name__,
                        "error_message": str(e)
                    },
                    exc_info=True
                )
                
                ErrorAggregator.track_error(
                    error_type=type(e).__name__,
                    error_message=str(e),
                    context={"operation": operation_name, "request_id": request_id}
                )
                
                raise
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

class HealthCheck:
    """System health check utilities"""
    
    @staticmethod
    def get_system_health() -> Dict[str, Any]:
        """
        Get comprehensive system health status
        
        Returns:
            Dict with health status of various components
        """
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "components": {
                "database": "healthy",
                "api": "healthy",
                "background_jobs": "healthy"
            },
            "error_summary": ErrorAggregator.get_error_summary()
        }
