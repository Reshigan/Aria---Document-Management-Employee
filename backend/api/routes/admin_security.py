"""
Backup and Security Admin Routes
API endpoints for backup management and security operations
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from backend.database.multi_tenant import get_current_tenant_db
from backend.auth.jwt_auth import get_current_user, require_role
from backend.services.backup_service import BackupService, BackupScheduler
from backend.services.encryption_service import EncryptionService, TwoFactorAuthService
from backend.services.security_service import SecurityService
from backend.models.security_models import TwoFactorAuth
import logging
import os

logger = logging.getLogger(__name__)

# Routers
backup_router = APIRouter(prefix="/admin/backups", tags=["Admin - Backup Management"])
security_router = APIRouter(prefix="/admin/security", tags=["Admin - Security"])
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])


# ==================== Backup Management Endpoints ====================

class BackupCreateRequest(BaseModel):
    backup_type: str = Field(default="full", description="Type of backup: full, schema_only, data_only")
    compress: bool = Field(default=True, description="Whether to compress the backup")
    upload_to_s3: bool = Field(default=True, description="Whether to upload to S3")
    retention_days: int = Field(default=30, description="Number of days to retain backup")


class BackupRestoreRequest(BaseModel):
    backup_id: Optional[str] = None
    backup_file: Optional[str] = None
    from_s3: bool = False


@backup_router.post("/create")
async def create_backup(
    request: BackupCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Create a database backup (Admin only)
    
    Creates a backup of the database with specified options.
    """
    try:
        # Initialize backup service
        backup_service = BackupService(
            backup_dir=os.getenv("BACKUP_DIR", "/var/backups/aria"),
            db_host=os.getenv("DB_HOST", "localhost"),
            db_port=int(os.getenv("DB_PORT", 5432)),
            db_name=os.getenv("DB_NAME", "aria_db"),
            db_user=os.getenv("DB_USER", "postgres"),
            db_password=os.getenv("DB_PASSWORD", ""),
            s3_bucket=os.getenv("BACKUP_S3_BUCKET"),
            s3_region=os.getenv("AWS_REGION", "us-east-1")
        )
        
        # Create backup in background
        backup_info = backup_service.create_backup(
            backup_type=request.backup_type,
            compress=request.compress,
            upload_to_s3=request.upload_to_s3,
            retention_days=request.retention_days
        )
        
        return {
            "message": "Backup created successfully",
            "backup_info": backup_info
        }
    except Exception as e:
        logger.error(f"Error creating backup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backup creation failed: {str(e)}"
        )


@backup_router.post("/restore")
async def restore_backup(
    request: BackupRestoreRequest,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Restore database from backup (Admin only)
    
    WARNING: This will overwrite the current database!
    """
    try:
        backup_service = BackupService(
            backup_dir=os.getenv("BACKUP_DIR", "/var/backups/aria"),
            db_host=os.getenv("DB_HOST", "localhost"),
            db_port=int(os.getenv("DB_PORT", 5432)),
            db_name=os.getenv("DB_NAME", "aria_db"),
            db_user=os.getenv("DB_USER", "postgres"),
            db_password=os.getenv("DB_PASSWORD", ""),
            s3_bucket=os.getenv("BACKUP_S3_BUCKET")
        )
        
        restore_info = backup_service.restore_backup(
            backup_id=request.backup_id,
            backup_file=request.backup_file,
            from_s3=request.from_s3
        )
        
        return {
            "message": "Database restored successfully",
            "restore_info": restore_info
        }
    except Exception as e:
        logger.error(f"Error restoring backup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Restore failed: {str(e)}"
        )


@backup_router.get("/list")
async def list_backups(
    backup_type: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    List all available backups (Admin only)
    """
    try:
        backup_service = BackupService(
            backup_dir=os.getenv("BACKUP_DIR", "/var/backups/aria")
        )
        
        backups = backup_service.list_backups(backup_type=backup_type, limit=limit)
        
        return {
            "backups": backups,
            "total": len(backups)
        }
    except Exception as e:
        logger.error(f"Error listing backups: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@backup_router.delete("/{backup_id}")
async def delete_backup(
    backup_id: str,
    delete_from_s3: bool = True,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Delete a backup (Admin only)
    """
    try:
        backup_service = BackupService(
            backup_dir=os.getenv("BACKUP_DIR", "/var/backups/aria"),
            s3_bucket=os.getenv("BACKUP_S3_BUCKET")
        )
        
        backup_service.delete_backup(backup_id, delete_from_s3)
        
        return {
            "message": "Backup deleted successfully",
            "backup_id": backup_id
        }
    except Exception as e:
        logger.error(f"Error deleting backup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@backup_router.post("/cleanup")
async def cleanup_expired_backups(
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Clean up expired backups (Admin only)
    """
    try:
        backup_service = BackupService(
            backup_dir=os.getenv("BACKUP_DIR", "/var/backups/aria"),
            s3_bucket=os.getenv("BACKUP_S3_BUCKET")
        )
        
        result = backup_service.cleanup_expired_backups()
        
        return {
            "message": "Cleanup completed",
            "result": result
        }
    except Exception as e:
        logger.error(f"Error cleaning up backups: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@backup_router.get("/status")
async def get_backup_status(
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Get backup system status (Admin only)
    """
    try:
        backup_service = BackupService(
            backup_dir=os.getenv("BACKUP_DIR", "/var/backups/aria"),
            s3_bucket=os.getenv("BACKUP_S3_BUCKET")
        )
        
        status_info = backup_service.get_backup_status()
        
        return status_info
    except Exception as e:
        logger.error(f"Error getting backup status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==================== Two-Factor Authentication Endpoints ====================

class Enable2FARequest(BaseModel):
    password: str = Field(..., description="User's current password for verification")


class Verify2FARequest(BaseModel):
    token: str = Field(..., min_length=6, max_length=6, description="6-digit TOTP token")


class Verify2FASetupRequest(BaseModel):
    token: str = Field(..., min_length=6, max_length=6)
    secret: str = Field(..., description="TOTP secret provided during setup")


@auth_router.post("/2fa/enable")
async def enable_2fa(
    request: Enable2FARequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Enable two-factor authentication for user
    
    Returns QR code for scanning with authenticator app.
    """
    try:
        # Verify password
        security_service = SecurityService(db)
        from backend.models.user import User
        user = db.query(User).filter(User.id == current_user["id"]).first()
        
        if not security_service.verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password"
            )
        
        # Generate 2FA secret
        twofa_service = TwoFactorAuthService()
        secret = twofa_service.generate_secret()
        
        # Generate backup codes
        backup_codes = twofa_service.generate_backup_codes()
        hashed_backup_codes = [twofa_service.hash_backup_code(code) for code in backup_codes]
        
        # Generate QR code
        qr_code = twofa_service.generate_qr_code(user.email, secret)
        
        # Save 2FA configuration (not enabled yet until verified)
        twofa_auth = db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == user.id).first()
        if not twofa_auth:
            twofa_auth = TwoFactorAuth(
                user_id=user.id,
                secret_key=secret,
                backup_codes=hashed_backup_codes,
                is_enabled=False
            )
            db.add(twofa_auth)
        else:
            twofa_auth.secret_key = secret
            twofa_auth.backup_codes = hashed_backup_codes
            twofa_auth.is_enabled = False
        
        db.commit()
        
        return {
            "message": "2FA setup initiated. Scan QR code and verify with a token.",
            "secret": secret,  # Include for manual entry
            "qr_code": qr_code,
            "backup_codes": backup_codes  # Show these only once!
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enabling 2FA: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@auth_router.post("/2fa/verify-setup")
async def verify_2fa_setup(
    request: Verify2FASetupRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Verify 2FA setup with token from authenticator app
    
    This completes the 2FA setup process.
    """
    try:
        twofa_service = TwoFactorAuthService()
        
        # Get 2FA configuration
        twofa_auth = db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == current_user["id"]).first()
        if not twofa_auth:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="2FA setup not initiated"
            )
        
        # Verify token
        if not twofa_service.verify_totp(twofa_auth.secret_key, request.token):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token"
            )
        
        # Enable 2FA
        twofa_auth.is_enabled = True
        twofa_auth.enabled_at = datetime.utcnow()
        db.commit()
        
        return {
            "message": "2FA enabled successfully",
            "enabled_at": twofa_auth.enabled_at
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying 2FA setup: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@auth_router.post("/2fa/verify")
async def verify_2fa(
    request: Verify2FARequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Verify 2FA token during login
    """
    try:
        twofa_service = TwoFactorAuthService()
        
        # Get 2FA configuration
        twofa_auth = db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == current_user["id"]).first()
        if not twofa_auth or not twofa_auth.is_enabled:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="2FA not enabled"
            )
        
        # Verify token
        if not twofa_service.verify_totp(twofa_auth.secret_key, request.token):
            # Check if it's a backup code
            valid_backup = False
            for i, hashed_code in enumerate(twofa_auth.backup_codes or []):
                if twofa_service.verify_backup_code(request.token, hashed_code):
                    # Remove used backup code
                    twofa_auth.backup_codes.pop(i)
                    valid_backup = True
                    break
            
            if not valid_backup:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid 2FA token"
                )
        
        # Update last used
        twofa_auth.last_used = datetime.utcnow()
        db.commit()
        
        return {
            "message": "2FA verification successful",
            "verified": True
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying 2FA: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@auth_router.post("/2fa/disable")
async def disable_2fa(
    password: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Disable two-factor authentication
    """
    try:
        # Verify password
        security_service = SecurityService(db)
        from backend.models.user import User
        user = db.query(User).filter(User.id == current_user["id"]).first()
        
        if not security_service.verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password"
            )
        
        # Disable 2FA
        twofa_auth = db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == user.id).first()
        if twofa_auth:
            twofa_auth.is_enabled = False
            db.commit()
        
        return {
            "message": "2FA disabled successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disabling 2FA: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@auth_router.get("/2fa/status")
async def get_2fa_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Get 2FA status for current user
    """
    try:
        twofa_auth = db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == current_user["id"]).first()
        
        if not twofa_auth:
            return {
                "enabled": False,
                "backup_codes_count": 0
            }
        
        return {
            "enabled": twofa_auth.is_enabled,
            "enabled_at": twofa_auth.enabled_at,
            "last_used": twofa_auth.last_used,
            "backup_codes_count": len(twofa_auth.backup_codes or [])
        }
    except Exception as e:
        logger.error(f"Error getting 2FA status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==================== Security Audit Endpoints ====================

@security_router.get("/audit-logs")
async def get_audit_logs(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Get audit logs (Admin only)
    
    View immutable audit trail of system activities.
    """
    try:
        from backend.models.security_models import AuditLog
        
        query = db.query(AuditLog)
        
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action == action)
        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)
        
        total = query.count()
        logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
        
        return {
            "audit_logs": [
                {
                    "id": log.id,
                    "user_id": log.user_id,
                    "action": log.action.value if log.action else None,
                    "resource_type": log.resource_type,
                    "resource_id": log.resource_id,
                    "description": log.description,
                    "ip_address": log.ip_address,
                    "created_at": log.created_at,
                    "success": log.success
                }
                for log in logs
            ],
            "total": total
        }
    except Exception as e:
        logger.error(f"Error getting audit logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@security_router.get("/security-events")
async def get_security_events(
    user_id: Optional[int] = None,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    limit: int = 100,
    current_user: dict = Depends(require_role("admin")),
    db: Session = Depends(get_current_tenant_db)
):
    """
    Get security events (Admin only)
    
    View security-related events like failed logins, suspicious activities, etc.
    """
    try:
        from backend.models.security_models import SecurityEvent
        
        query = db.query(SecurityEvent)
        
        if user_id:
            query = query.filter(SecurityEvent.user_id == user_id)
        if event_type:
            query = query.filter(SecurityEvent.event_type == event_type)
        if severity:
            query = query.filter(SecurityEvent.severity == severity)
        if resolved is not None:
            query = query.filter(SecurityEvent.resolved == resolved)
        
        total = query.count()
        events = query.order_by(SecurityEvent.created_at.desc()).limit(limit).all()
        
        return {
            "security_events": [
                {
                    "id": event.id,
                    "user_id": event.user_id,
                    "event_type": event.event_type.value if event.event_type else None,
                    "severity": event.severity,
                    "description": event.description,
                    "ip_address": event.ip_address,
                    "resolved": event.resolved,
                    "created_at": event.created_at
                }
                for event in events
            ],
            "total": total
        }
    except Exception as e:
        logger.error(f"Error getting security events: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Export routers
__all__ = ['backup_router', 'security_router', 'auth_router']
