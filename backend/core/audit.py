"""
Audit Trail System
Logs all API calls and database changes for compliance and security
"""
from datetime import datetime
from typing import Optional
from fastapi import Request
from sqlalchemy.orm import Session
from sqlalchemy import text
import json

def log_audit_event(
    db: Session,
    user_id: Optional[int],
    user_email: Optional[str],
    action: str,
    resource: str,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    success: bool = True,
    error_message: Optional[str] = None
):
    """Log an audit event to the database"""
    try:
        query = text("""
            INSERT INTO audit_logs (
                user_id, user_email, action, resource, details,
                ip_address, user_agent, success, error_message, timestamp
            ) VALUES (
                :user_id, :user_email, :action, :resource, :details,
                :ip_address, :user_agent, :success, :error_message, :timestamp
            )
        """)
        
        db.execute(query, {
            "user_id": user_id,
            "user_email": user_email,
            "action": action,
            "resource": resource,
            "details": json.dumps(details) if details else None,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "success": success,
            "error_message": error_message,
            "timestamp": datetime.utcnow()
        })
        
        db.commit()
    except Exception as e:
        print(f"Failed to log audit event: {e}")
        db.rollback()

def get_client_ip(request: Request) -> str:
    """Extract client IP from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def get_user_agent(request: Request) -> str:
    """Extract user agent from request"""
    return request.headers.get("User-Agent", "unknown")

class AuditLogger:
    """Audit logger for tracking API calls"""
    
    @staticmethod
    def log_create(db: Session, user, resource: str, resource_id: str, data: dict, request: Request):
        """Log resource creation"""
        log_audit_event(
            db=db,
            user_id=getattr(user, 'id', None),
            user_email=getattr(user, 'email', None),
            action="CREATE",
            resource=f"{resource}:{resource_id}",
            details={"data": data},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=True
        )
    
    @staticmethod
    def log_update(db: Session, user, resource: str, resource_id: str, changes: dict, request: Request):
        """Log resource update"""
        log_audit_event(
            db=db,
            user_id=getattr(user, 'id', None),
            user_email=getattr(user, 'email', None),
            action="UPDATE",
            resource=f"{resource}:{resource_id}",
            details={"changes": changes},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=True
        )
    
    @staticmethod
    def log_delete(db: Session, user, resource: str, resource_id: str, request: Request):
        """Log resource deletion"""
        log_audit_event(
            db=db,
            user_id=getattr(user, 'id', None),
            user_email=getattr(user, 'email', None),
            action="DELETE",
            resource=f"{resource}:{resource_id}",
            details={},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=True
        )
    
    @staticmethod
    def log_view(db: Session, user, resource: str, resource_id: Optional[str] = None, request: Request = None):
        """Log resource view"""
        log_audit_event(
            db=db,
            user_id=getattr(user, 'id', None),
            user_email=getattr(user, 'email', None),
            action="VIEW",
            resource=f"{resource}:{resource_id}" if resource_id else resource,
            details={},
            ip_address=get_client_ip(request) if request else None,
            user_agent=get_user_agent(request) if request else None,
            success=True
        )
    
    @staticmethod
    def log_post(db: Session, user, resource: str, resource_id: str, request: Request):
        """Log posting transaction"""
        log_audit_event(
            db=db,
            user_id=getattr(user, 'id', None),
            user_email=getattr(user, 'email', None),
            action="POST",
            resource=f"{resource}:{resource_id}",
            details={},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=True
        )
    
    @staticmethod
    def log_cancel(db: Session, user, resource: str, resource_id: str, reason: str, request: Request):
        """Log cancellation"""
        log_audit_event(
            db=db,
            user_id=getattr(user, 'id', None),
            user_email=getattr(user, 'email', None),
            action="CANCEL",
            resource=f"{resource}:{resource_id}",
            details={"reason": reason},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=True
        )
    
    @staticmethod
    def log_error(db: Session, user, action: str, resource: str, error: str, request: Request):
        """Log error"""
        log_audit_event(
            db=db,
            user_id=getattr(user, 'id', None) if user else None,
            user_email=getattr(user, 'email', None) if user else None,
            action=action,
            resource=resource,
            details={},
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=False,
            error_message=error
        )
