"""
Comprehensive Logging Configuration for Aria Document Management
Enterprise-grade logging with structured output, rotation, and monitoring integration
"""

import logging
import logging.handlers
import json
import os
import sys
from datetime import datetime
from typing import Any, Dict, Optional
from pathlib import Path

# Create log directory if it doesn't exist
LOG_DIR = Path(os.getenv("LOG_DIR", "./logs"))
LOG_DIR.mkdir(parents=True, exist_ok=True)

class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        # Create structured log entry
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "process_id": os.getpid(),
            "thread_id": record.thread,
        }
        
        # Add exception information if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info)
            }
        
        # Add extra fields if present
        if hasattr(record, 'extra_fields'):
            log_entry.update(record.extra_fields)
        
        return json.dumps(log_entry, ensure_ascii=False)

class AriaLoggerAdapter(logging.LoggerAdapter):
    """Custom logger adapter for adding context to log messages"""
    
    def __init__(self, logger: logging.Logger, extra: Optional[Dict[str, Any]] = None):
        super().__init__(logger, extra or {})
    
    def process(self, msg: str, kwargs: Dict[str, Any]) -> tuple:
        # Add extra context to log record
        if 'extra' not in kwargs:
            kwargs['extra'] = {}
        
        kwargs['extra']['extra_fields'] = {
            **self.extra,
            **kwargs['extra'].get('extra_fields', {})
        }
        
        return msg, kwargs

def setup_logging(
    log_level: str = "INFO",
    enable_console: bool = True,
    enable_file: bool = True,
    enable_json: bool = True,
    max_file_size: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5
) -> None:
    """Setup comprehensive logging configuration"""
    
    # Convert log level string to logging constant
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Create root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Console handler
    if enable_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(numeric_level)
        
        if enable_json:
            console_handler.setFormatter(StructuredFormatter())
        else:
            console_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            console_handler.setFormatter(console_formatter)
        
        root_logger.addHandler(console_handler)
    
    # File handlers
    if enable_file:
        # Application log file
        app_log_file = LOG_DIR / "application.log"
        app_handler = logging.handlers.RotatingFileHandler(
            app_log_file,
            maxBytes=max_file_size,
            backupCount=backup_count,
            encoding='utf-8'
        )
        app_handler.setLevel(numeric_level)
        
        if enable_json:
            app_handler.setFormatter(StructuredFormatter())
        else:
            app_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            app_handler.setFormatter(app_formatter)
        
        root_logger.addHandler(app_handler)
        
        # Error log file (errors and above only)
        error_log_file = LOG_DIR / "errors.log"
        error_handler = logging.handlers.RotatingFileHandler(
            error_log_file,
            maxBytes=max_file_size,
            backupCount=backup_count,
            encoding='utf-8'
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(StructuredFormatter())
        root_logger.addHandler(error_handler)
        
        # Access log file for HTTP requests
        access_log_file = LOG_DIR / "access.log"
        access_handler = logging.handlers.RotatingFileHandler(
            access_log_file,
            maxBytes=max_file_size,
            backupCount=backup_count,
            encoding='utf-8'
        )
        access_handler.setLevel(logging.INFO)
        access_handler.setFormatter(StructuredFormatter())
        
        # Create access logger
        access_logger = logging.getLogger("aria.access")
        access_logger.addHandler(access_handler)
        access_logger.setLevel(logging.INFO)
        access_logger.propagate = False
        
        # Security log file
        security_log_file = LOG_DIR / "security.log"
        security_handler = logging.handlers.RotatingFileHandler(
            security_log_file,
            maxBytes=max_file_size,
            backupCount=backup_count,
            encoding='utf-8'
        )
        security_handler.setLevel(logging.INFO)
        security_handler.setFormatter(StructuredFormatter())
        
        # Create security logger
        security_logger = logging.getLogger("aria.security")
        security_logger.addHandler(security_handler)
        security_logger.setLevel(logging.INFO)
        security_logger.propagate = False
        
        # Performance log file
        performance_log_file = LOG_DIR / "performance.log"
        performance_handler = logging.handlers.RotatingFileHandler(
            performance_log_file,
            maxBytes=max_file_size,
            backupCount=backup_count,
            encoding='utf-8'
        )
        performance_handler.setLevel(logging.INFO)
        performance_handler.setFormatter(StructuredFormatter())
        
        # Create performance logger
        performance_logger = logging.getLogger("aria.performance")
        performance_logger.addHandler(performance_handler)
        performance_logger.setLevel(logging.INFO)
        performance_logger.propagate = False

def get_logger(name: str, **context) -> AriaLoggerAdapter:
    """Get a logger with optional context"""
    logger = logging.getLogger(name)
    return AriaLoggerAdapter(logger, context)

def get_access_logger() -> AriaLoggerAdapter:
    """Get the access logger for HTTP requests"""
    logger = logging.getLogger("aria.access")
    return AriaLoggerAdapter(logger)

def get_security_logger() -> AriaLoggerAdapter:
    """Get the security logger for security events"""
    logger = logging.getLogger("aria.security")
    return AriaLoggerAdapter(logger)

def get_performance_logger() -> AriaLoggerAdapter:
    """Get the performance logger for performance metrics"""
    logger = logging.getLogger("aria.performance")
    return AriaLoggerAdapter(logger)

class LoggingMiddleware:
    """Middleware for logging HTTP requests and responses"""
    
    def __init__(self, app):
        self.app = app
        self.access_logger = get_access_logger()
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        start_time = datetime.utcnow()
        
        # Extract request information
        request_info = {
            "method": scope["method"],
            "path": scope["path"],
            "query_string": scope["query_string"].decode(),
            "client_ip": scope.get("client", ["unknown", None])[0],
            "user_agent": next(
                (header[1].decode() for header in scope.get("headers", []) 
                 if header[0] == b"user-agent"), 
                "unknown"
            )
        }
        
        # Wrap send to capture response status
        response_status = None
        
        async def send_wrapper(message):
            nonlocal response_status
            if message["type"] == "http.response.start":
                response_status = message["status"]
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            response_status = 500
            raise
        finally:
            # Calculate request duration
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            # Log the request
            self.access_logger.info(
                f"{request_info['method']} {request_info['path']} - {response_status} - {duration:.3f}s",
                extra={
                    "extra_fields": {
                        **request_info,
                        "response_status": response_status,
                        "duration_seconds": duration,
                        "timestamp": start_time.isoformat() + "Z"
                    }
                }
            )

class PerformanceTracker:
    """Utility for tracking performance metrics"""
    
    def __init__(self, operation_name: str, logger: Optional[AriaLoggerAdapter] = None):
        self.operation_name = operation_name
        self.logger = logger or get_performance_logger()
        self.start_time = None
        self.context = {}
    
    def __enter__(self):
        self.start_time = datetime.utcnow()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration = (datetime.utcnow() - self.start_time).total_seconds()
            
            self.logger.info(
                f"Performance: {self.operation_name} completed in {duration:.3f}s",
                extra={
                    "extra_fields": {
                        "operation": self.operation_name,
                        "duration_seconds": duration,
                        "success": exc_type is None,
                        **self.context
                    }
                }
            )
    
    def add_context(self, **kwargs):
        """Add context to the performance log"""
        self.context.update(kwargs)

class SecurityLogger:
    """Utility for logging security events"""
    
    def __init__(self):
        self.logger = get_security_logger()
    
    def log_login_attempt(self, username: str, success: bool, ip_address: str, user_agent: str):
        """Log login attempt"""
        self.logger.info(
            f"Login attempt: {username} - {'SUCCESS' if success else 'FAILED'}",
            extra={
                "extra_fields": {
                    "event_type": "login_attempt",
                    "username": username,
                    "success": success,
                    "ip_address": ip_address,
                    "user_agent": user_agent
                }
            }
        )
    
    def log_permission_denied(self, user_id: str, resource: str, action: str, ip_address: str):
        """Log permission denied event"""
        self.logger.warning(
            f"Permission denied: User {user_id} attempted {action} on {resource}",
            extra={
                "extra_fields": {
                    "event_type": "permission_denied",
                    "user_id": user_id,
                    "resource": resource,
                    "action": action,
                    "ip_address": ip_address
                }
            }
        )
    
    def log_suspicious_activity(self, description: str, user_id: Optional[str] = None, ip_address: Optional[str] = None, **context):
        """Log suspicious activity"""
        self.logger.warning(
            f"Suspicious activity: {description}",
            extra={
                "extra_fields": {
                    "event_type": "suspicious_activity",
                    "description": description,
                    "user_id": user_id,
                    "ip_address": ip_address,
                    **context
                }
            }
        )

# Initialize logging on module import
setup_logging(
    log_level=os.getenv("LOG_LEVEL", "INFO"),
    enable_console=os.getenv("LOG_CONSOLE", "true").lower() == "true",
    enable_file=os.getenv("LOG_FILE", "true").lower() == "true",
    enable_json=os.getenv("LOG_JSON", "true").lower() == "true"
)
