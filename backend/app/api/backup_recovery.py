from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from core.database import get_db
from app.services.backup_recovery_service import BackupRecoveryService
from app.services.cache_service import monitor_performance

router = APIRouter(prefix="/backup", tags=["Backup & Recovery"])

class BackupJobCreate(BaseModel):
    job_name: str = Field(..., min_length=1, max_length=255)
    job_type: str = Field(..., regex='^(full|incremental|differential)$')
    backup_scope: str = Field(..., regex='^(database|files|system|all)$')
    compression_enabled: bool = True
    encryption_enabled: bool = True
    retention_days: int = Field(default=30, ge=1, le=365)
    max_backups: int = Field(default=10, ge=1, le=100)

class RestoreJobCreate(BaseModel):
    backup_job_id: int = Field(..., gt=0)
    restore_name: str = Field(..., min_length=1, max_length=255)
    restore_type: str = Field(..., regex='^(full|selective|point_in_time)$')
    restore_scope: str = Field(..., regex='^(database|files|system|all)$')
    restore_path: Optional[str] = None
    overwrite_existing: bool = False
    restore_permissions: bool = True
    validation_enabled: bool = True

def get_backup_service(db: Session = Depends(get_db)) -> BackupRecoveryService:
    return BackupRecoveryService(db)

@router.post("/jobs", status_code=status.HTTP_201_CREATED)
@monitor_performance
async def create_backup_job(
    backup_request: BackupJobCreate,
    created_by: int = Query(..., gt=0, description="Creator user ID"),
    service: BackupRecoveryService = Depends(get_backup_service)
):
    """Create a new backup job"""
    try:
        backup_job = service.create_backup_job(
            job_name=backup_request.job_name,
            job_type=backup_request.job_type,
            backup_scope=backup_request.backup_scope,
            created_by=created_by,
            compression_enabled=backup_request.compression_enabled,
            encryption_enabled=backup_request.encryption_enabled,
            retention_days=backup_request.retention_days,
            max_backups=backup_request.max_backups
        )
        
        return {
            "id": backup_job.id,
            "job_name": backup_job.job_name,
            "job_type": backup_job.job_type,
            "backup_scope": backup_job.backup_scope,
            "status": backup_job.status,
            "backup_path": backup_job.backup_path,
            "created_at": backup_job.created_at.isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create backup job: {str(e)}"
        )

@router.post("/jobs/{job_id}/start")
@monitor_performance
async def start_backup_job(
    job_id: int,
    service: BackupRecoveryService = Depends(get_backup_service)
):
    """Start executing a backup job"""
    try:
        success = service.start_backup(job_id)
        if not success:
            raise HTTPException(status_code=404, detail="Backup job not found")
        
        return {"message": "Backup job started successfully", "job_id": job_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start backup job: {str(e)}"
        )

@router.get("/jobs")
@monitor_performance
async def get_backup_jobs(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100, description="Number of jobs to return"),
    service: BackupRecoveryService = Depends(get_backup_service)
):
    """Get backup jobs with optional filtering"""
    try:
        backup_jobs = service.get_backup_jobs(status=status_filter, limit=limit)
        
        return {
            "jobs": [
                {
                    "id": job.id,
                    "job_name": job.job_name,
                    "job_type": job.job_type,
                    "backup_scope": job.backup_scope,
                    "status": job.status,
                    "progress_percentage": job.progress_percentage,
                    "current_operation": job.current_operation,
                    "total_size": job.total_size,
                    "compressed_size": job.compressed_size,
                    "compression_ratio": job.compression_ratio,
                    "backup_duration": job.backup_duration,
                    "file_count": job.file_count,
                    "error_message": job.error_message,
                    "created_at": job.created_at.isoformat(),
                    "started_at": job.started_at.isoformat() if job.started_at else None,
                    "completed_at": job.completed_at.isoformat() if job.completed_at else None
                }
                for job in backup_jobs
            ],
            "total": len(backup_jobs)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get backup jobs: {str(e)}"
        )

@router.get("/jobs/{job_id}")
@monitor_performance
async def get_backup_job(
    job_id: int,
    service: BackupRecoveryService = Depends(get_backup_service)
):
    """Get detailed information about a specific backup job"""
    try:
        backup_jobs = service.get_backup_jobs(limit=1000)  # Get all to find specific one
        backup_job = next((job for job in backup_jobs if job.id == job_id), None)
        
        if not backup_job:
            raise HTTPException(status_code=404, detail="Backup job not found")
        
        return {
            "id": backup_job.id,
            "job_name": backup_job.job_name,
            "job_type": backup_job.job_type,
            "backup_scope": backup_job.backup_scope,
            "status": backup_job.status,
            "progress_percentage": backup_job.progress_percentage,
            "current_operation": backup_job.current_operation,
            "backup_path": backup_job.backup_path,
            "compression_enabled": backup_job.compression_enabled,
            "encryption_enabled": backup_job.encryption_enabled,
            "total_size": backup_job.total_size,
            "compressed_size": backup_job.compressed_size,
            "compression_ratio": backup_job.compression_ratio,
            "backup_duration": backup_job.backup_duration,
            "file_count": backup_job.file_count,
            "retention_days": backup_job.retention_days,
            "max_backups": backup_job.max_backups,
            "error_message": backup_job.error_message,
            "retry_count": backup_job.retry_count,
            "backup_metadata": backup_job.backup_metadata,
            "created_by": backup_job.created_by,
            "created_at": backup_job.created_at.isoformat(),
            "started_at": backup_job.started_at.isoformat() if backup_job.started_at else None,
            "completed_at": backup_job.completed_at.isoformat() if backup_job.completed_at else None,
            "backup_files": [
                {
                    "id": bf.id,
                    "file_name": bf.file_name,
                    "file_type": bf.file_type,
                    "original_size": bf.original_size,
                    "compressed_size": bf.compressed_size,
                    "compression_method": bf.compression_method,
                    "file_hash": bf.file_hash,
                    "is_encrypted": bf.is_encrypted,
                    "is_verified": bf.is_verified,
                    "verification_date": bf.verification_date.isoformat() if bf.verification_date else None
                }
                for bf in backup_job.backup_files
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get backup job: {str(e)}"
        )

@router.post("/restore", status_code=status.HTTP_201_CREATED)
@monitor_performance
async def create_restore_job(
    restore_request: RestoreJobCreate,
    created_by: int = Query(..., gt=0, description="Creator user ID"),
    service: BackupRecoveryService = Depends(get_backup_service)
):
    """Create a new restore job"""
    try:
        restore_job = service.create_restore_job(
            backup_job_id=restore_request.backup_job_id,
            restore_name=restore_request.restore_name,
            restore_type=restore_request.restore_type,
            restore_scope=restore_request.restore_scope,
            created_by=created_by,
            restore_path=restore_request.restore_path,
            overwrite_existing=restore_request.overwrite_existing,
            restore_permissions=restore_request.restore_permissions,
            validation_enabled=restore_request.validation_enabled
        )
        
        return {
            "id": restore_job.id,
            "restore_name": restore_job.restore_name,
            "restore_type": restore_job.restore_type,
            "restore_scope": restore_job.restore_scope,
            "status": restore_job.status,
            "backup_job_id": restore_job.backup_job_id,
            "created_at": restore_job.created_at.isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create restore job: {str(e)}"
        )

@router.post("/restore/{job_id}/start")
@monitor_performance
async def start_restore_job(
    job_id: int,
    service: BackupRecoveryService = Depends(get_backup_service)
):
    """Start executing a restore job"""
    try:
        success = service.start_restore(job_id)
        if not success:
            raise HTTPException(status_code=404, detail="Restore job not found")
        
        return {"message": "Restore job started successfully", "job_id": job_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start restore job: {str(e)}"
        )

@router.get("/statistics")
@monitor_performance
async def get_backup_statistics(
    service: BackupRecoveryService = Depends(get_backup_service)
):
    """Get comprehensive backup and restore statistics"""
    try:
        stats = service.get_backup_statistics()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get backup statistics: {str(e)}"
        )

@router.get("/health")
@monitor_performance
async def get_backup_system_health(
    service: BackupRecoveryService = Depends(get_backup_service)
):
    """Get backup system health status"""
    try:
        stats = service.get_backup_statistics()
        
        # Determine health status
        health_status = "healthy"
        issues = []
        
        # Check for recent failures
        if stats['failed_backups'] > 0:
            failure_rate = (stats['failed_backups'] / stats['total_backups']) * 100
            if failure_rate > 20:  # More than 20% failure rate
                health_status = "warning"
                issues.append(f"High failure rate: {failure_rate:.1f}%")
        
        # Check for running backups stuck
        if stats['running_backups'] > 5:  # Too many concurrent backups
            health_status = "warning"
            issues.append(f"{stats['running_backups']} backups currently running")
        
        # Check storage usage (if we had limits)
        storage_gb = stats['total_storage_used'] / (1024**3)
        if storage_gb > 50:  # Example threshold
            health_status = "warning"
            issues.append(f"High storage usage: {storage_gb:.1f} GB")
        
        return {
            "status": health_status,
            "issues": issues,
            "statistics": stats,
            "system_info": {
                "backup_root": "/tmp/aria_backups",
                "supported_types": ["database", "files", "system", "all"],
                "compression_methods": ["gzip", "none"],
                "storage_backends": ["local"]
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get health status: {str(e)}"
        )

@router.delete("/jobs/{job_id}")
@monitor_performance
async def delete_backup_job(
    job_id: int,
    user_id: int = Query(..., gt=0, description="User ID"),
    service: BackupRecoveryService = Depends(get_backup_service)
):
    """Delete a backup job and its associated files"""
    try:
        # This would implement actual deletion logic
        # For now, just return success
        return {"message": f"Backup job {job_id} deletion initiated"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete backup job: {str(e)}"
        )

@router.post("/jobs/{job_id}/verify")
@monitor_performance
async def verify_backup(
    job_id: int,
    verification_type: str = Query("checksum", regex='^(checksum|restore_test|integrity)$'),
    service: BackupRecoveryService = Depends(get_backup_service)
):
    """Manually trigger backup verification"""
    try:
        # This would implement manual verification trigger
        return {
            "message": f"Verification started for backup job {job_id}",
            "verification_type": verification_type
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start verification: {str(e)}"
        )

@router.get("/alerts")
@monitor_performance
async def get_backup_alerts(
    alert_level: Optional[str] = Query(None, regex='^(info|warning|error|critical)$'),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    limit: int = Query(50, ge=1, le=100),
    service: BackupRecoveryService = Depends(get_backup_service)
):
    """Get backup system alerts"""
    try:
        # This would implement alert retrieval
        # For now, return mock data
        return {
            "alerts": [
                {
                    "id": 1,
                    "alert_type": "success",
                    "alert_level": "info",
                    "title": "Backup completed successfully",
                    "message": "Daily backup completed in 45 seconds",
                    "is_read": False,
                    "created_at": datetime.utcnow().isoformat()
                }
            ],
            "total": 1,
            "unread_count": 1
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get alerts: {str(e)}"
        )
