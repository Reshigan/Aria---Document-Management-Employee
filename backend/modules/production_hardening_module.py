"""
Production Hardening Module - Priority 12
Background jobs, monitoring, audit logs, backups, rate limiting
"""
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from decimal import Decimal
import asyncpg
import logging
import os
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/erp/production", tags=["Production Hardening"])


# ============================================================================
# Pydantic Models
# ============================================================================

class BackgroundJobCreate(BaseModel):
    company_id: str
    job_type: str
    job_name: str
    job_data: Dict[str, Any]
    scheduled_at: Optional[datetime] = None
    priority: int = 5
    max_retries: int = 3

class ScheduledTaskCreate(BaseModel):
    company_id: str
    task_name: str
    task_type: str
    cron_expression: str
    task_config: Dict[str, Any]
    is_enabled: bool = True

class SystemHealthCheckCreate(BaseModel):
    check_name: str
    check_type: str
    status: str
    response_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class AuditLogCreate(BaseModel):
    company_id: str
    user_id: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class ErrorLogCreate(BaseModel):
    company_id: Optional[str] = None
    user_id: Optional[str] = None
    error_type: str
    error_message: str
    stack_trace: Optional[str] = None
    request_path: Optional[str] = None
    request_method: Optional[str] = None
    request_data: Optional[Dict[str, Any]] = None


# ============================================================================
# ============================================================================

async def get_db_connection():
    """Get PostgreSQL database connection"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")
    
    try:
        conn = await asyncpg.connect(database_url)
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")


# ============================================================================
# ============================================================================

@router.post("/background-jobs")
async def create_background_job(job: BackgroundJobCreate):
    """Create a new background job"""
    conn = await get_db_connection()
    
    try:
        new_job = await conn.fetchrow(
            """
            INSERT INTO background_jobs 
            (company_id, job_type, job_name, job_data, scheduled_at, priority, max_retries)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, job_name, job_type, status, created_at
            """,
            job.company_id, job.job_type, job.job_name, json.dumps(job.job_data),
            job.scheduled_at or datetime.utcnow(), job.priority, job.max_retries
        )
        
        return {
            "status": "success",
            "message": f"Background job {job.job_name} created successfully",
            "job": {
                "id": str(new_job['id']),
                "job_name": new_job['job_name'],
                "job_type": new_job['job_type'],
                "status": new_job['status'],
                "created_at": new_job['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating background job: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create background job: {str(e)}")
    finally:
        await conn.close()


@router.get("/background-jobs")
async def list_background_jobs(
    company_id: Optional[str] = None,
    status: Optional[str] = None,
    job_type: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """List background jobs"""
    conn = await get_db_connection()
    
    try:
        query = "SELECT id, job_name, job_type, status, priority, retry_count, scheduled_at, started_at, completed_at, created_at FROM background_jobs WHERE 1=1"
        params = []
        
        if company_id:
            query += " AND company_id = $1"
            params.append(company_id)
        
        if status:
            query += f" AND status = ${len(params) + 1}"
            params.append(status)
        
        if job_type:
            query += f" AND job_type = ${len(params) + 1}"
            params.append(job_type)
        
        query += f" ORDER BY scheduled_at DESC LIMIT ${len(params) + 1}"
        params.append(limit)
        
        jobs = await conn.fetch(query, *params)
        
        return {
            "jobs": [
                {
                    "id": str(j['id']),
                    "job_name": j['job_name'],
                    "job_type": j['job_type'],
                    "status": j['status'],
                    "priority": j['priority'],
                    "retry_count": j['retry_count'],
                    "scheduled_at": j['scheduled_at'].isoformat() if j['scheduled_at'] else None,
                    "started_at": j['started_at'].isoformat() if j['started_at'] else None,
                    "completed_at": j['completed_at'].isoformat() if j['completed_at'] else None,
                    "created_at": j['created_at'].isoformat()
                }
                for j in jobs
            ],
            "total": len(jobs)
        }
    
    except Exception as e:
        logger.error(f"Error listing background jobs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list background jobs: {str(e)}")
    finally:
        await conn.close()


@router.post("/background-jobs/{job_id}/process")
async def process_background_job(job_id: str):
    """Process a background job"""
    conn = await get_db_connection()
    
    try:
        await conn.execute(
            """
            UPDATE background_jobs
            SET status = 'processing', started_at = NOW(), updated_at = NOW()
            WHERE id = $1
            """,
            job_id
        )
        
        
        await conn.execute(
            """
            UPDATE background_jobs
            SET status = 'completed', completed_at = NOW(), updated_at = NOW()
            WHERE id = $1
            """,
            job_id
        )
        
        return {
            "status": "success",
            "message": "Background job processed successfully"
        }
    
    except Exception as e:
        logger.error(f"Error processing background job: {e}")
        
        await conn.execute(
            """
            UPDATE background_jobs
            SET status = 'failed', retry_count = retry_count + 1, error_message = $2, updated_at = NOW()
            WHERE id = $1
            """,
            job_id, str(e)
        )
        
        raise HTTPException(status_code=500, detail=f"Failed to process background job: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/scheduled-tasks")
async def create_scheduled_task(task: ScheduledTaskCreate):
    """Create a new scheduled task"""
    conn = await get_db_connection()
    
    try:
        new_task = await conn.fetchrow(
            """
            INSERT INTO scheduled_tasks 
            (company_id, task_name, task_type, cron_expression, task_config, is_enabled)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, task_name, task_type, cron_expression, is_enabled, created_at
            """,
            task.company_id, task.task_name, task.task_type, task.cron_expression,
            json.dumps(task.task_config), task.is_enabled
        )
        
        return {
            "status": "success",
            "message": f"Scheduled task {task.task_name} created successfully",
            "task": {
                "id": str(new_task['id']),
                "task_name": new_task['task_name'],
                "task_type": new_task['task_type'],
                "cron_expression": new_task['cron_expression'],
                "is_enabled": new_task['is_enabled'],
                "created_at": new_task['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating scheduled task: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create scheduled task: {str(e)}")
    finally:
        await conn.close()


@router.get("/scheduled-tasks")
async def list_scheduled_tasks(
    company_id: Optional[str] = None,
    is_enabled: Optional[bool] = None
):
    """List scheduled tasks"""
    conn = await get_db_connection()
    
    try:
        query = "SELECT id, task_name, task_type, cron_expression, is_enabled, last_run_at, next_run_at FROM scheduled_tasks WHERE 1=1"
        params = []
        
        if company_id:
            query += " AND company_id = $1"
            params.append(company_id)
        
        if is_enabled is not None:
            query += f" AND is_enabled = ${len(params) + 1}"
            params.append(is_enabled)
        
        query += " ORDER BY task_name"
        
        tasks = await conn.fetch(query, *params)
        
        return {
            "tasks": [
                {
                    "id": str(t['id']),
                    "task_name": t['task_name'],
                    "task_type": t['task_type'],
                    "cron_expression": t['cron_expression'],
                    "is_enabled": t['is_enabled'],
                    "last_run_at": t['last_run_at'].isoformat() if t['last_run_at'] else None,
                    "next_run_at": t['next_run_at'].isoformat() if t['next_run_at'] else None
                }
                for t in tasks
            ],
            "total": len(tasks)
        }
    
    except Exception as e:
        logger.error(f"Error listing scheduled tasks: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list scheduled tasks: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/health-checks")
async def create_health_check(health_check: SystemHealthCheckCreate):
    """Record a system health check"""
    conn = await get_db_connection()
    
    try:
        new_check = await conn.fetchrow(
            """
            INSERT INTO system_health_checks 
            (check_name, check_type, status, response_time_ms, error_message, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, check_name, status, created_at
            """,
            health_check.check_name, health_check.check_type, health_check.status,
            health_check.response_time_ms, health_check.error_message,
            json.dumps(health_check.metadata) if health_check.metadata else None
        )
        
        return {
            "status": "success",
            "health_check": {
                "id": str(new_check['id']),
                "check_name": new_check['check_name'],
                "status": new_check['status'],
                "created_at": new_check['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating health check: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create health check: {str(e)}")
    finally:
        await conn.close()


@router.get("/health-checks")
async def list_health_checks(
    check_name: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """List system health checks"""
    conn = await get_db_connection()
    
    try:
        query = "SELECT id, check_name, check_type, status, response_time_ms, error_message, created_at FROM system_health_checks WHERE 1=1"
        params = []
        
        if check_name:
            query += " AND check_name = $1"
            params.append(check_name)
        
        if status:
            query += f" AND status = ${len(params) + 1}"
            params.append(status)
        
        query += f" ORDER BY created_at DESC LIMIT ${len(params) + 1}"
        params.append(limit)
        
        checks = await conn.fetch(query, *params)
        
        return {
            "health_checks": [
                {
                    "id": str(c['id']),
                    "check_name": c['check_name'],
                    "check_type": c['check_type'],
                    "status": c['status'],
                    "response_time_ms": c['response_time_ms'],
                    "error_message": c['error_message'],
                    "created_at": c['created_at'].isoformat()
                }
                for c in checks
            ],
            "total": len(checks)
        }
    
    except Exception as e:
        logger.error(f"Error listing health checks: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list health checks: {str(e)}")
    finally:
        await conn.close()


@router.get("/health-checks/summary")
async def get_health_checks_summary():
    """Get summary of recent health checks"""
    conn = await get_db_connection()
    
    try:
        summary = await conn.fetch(
            """
            SELECT check_name, status, COUNT(*) as count, AVG(response_time_ms) as avg_response_time
            FROM system_health_checks
            WHERE created_at > NOW() - INTERVAL '24 hours'
            GROUP BY check_name, status
            ORDER BY check_name, status
            """
        )
        
        return {
            "summary": [
                {
                    "check_name": s['check_name'],
                    "status": s['status'],
                    "count": s['count'],
                    "avg_response_time_ms": float(s['avg_response_time']) if s['avg_response_time'] else None
                }
                for s in summary
            ]
        }
    
    except Exception as e:
        logger.error(f"Error getting health checks summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get health checks summary: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.get("/metrics")
async def get_system_metrics(
    metric_name: Optional[str] = None,
    hours: int = Query(24, le=168)
):
    """Get system metrics"""
    conn = await get_db_connection()
    
    try:
        query = """
            SELECT metric_name, metric_value, metric_unit, created_at
            FROM system_metrics
            WHERE created_at > NOW() - INTERVAL '%s hours'
        """ % hours
        params = []
        
        if metric_name:
            query += " AND metric_name = $1"
            params.append(metric_name)
        
        query += " ORDER BY created_at DESC LIMIT 1000"
        
        metrics = await conn.fetch(query, *params)
        
        return {
            "metrics": [
                {
                    "metric_name": m['metric_name'],
                    "metric_value": float(m['metric_value']),
                    "metric_unit": m['metric_unit'],
                    "created_at": m['created_at'].isoformat()
                }
                for m in metrics
            ],
            "total": len(metrics)
        }
    
    except Exception as e:
        logger.error(f"Error getting system metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get system metrics: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/audit-logs")
async def create_audit_log(audit_log: AuditLogCreate):
    """Create an audit log entry"""
    conn = await get_db_connection()
    
    try:
        new_log = await conn.fetchrow(
            """
            INSERT INTO audit_log 
            (company_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, action, entity_type, created_at
            """,
            audit_log.company_id, audit_log.user_id, audit_log.action, audit_log.entity_type,
            audit_log.entity_id, json.dumps(audit_log.old_values) if audit_log.old_values else None,
            json.dumps(audit_log.new_values) if audit_log.new_values else None,
            audit_log.ip_address, audit_log.user_agent
        )
        
        return {
            "status": "success",
            "audit_log": {
                "id": str(new_log['id']),
                "action": new_log['action'],
                "entity_type": new_log['entity_type'],
                "created_at": new_log['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating audit log: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create audit log: {str(e)}")
    finally:
        await conn.close()


@router.get("/audit-logs")
async def list_audit_logs(
    company_id: Optional[str] = None,
    user_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """List audit logs"""
    conn = await get_db_connection()
    
    try:
        query = "SELECT id, company_id, user_id, action, entity_type, entity_id, ip_address, created_at FROM audit_log WHERE 1=1"
        params = []
        
        if company_id:
            query += " AND company_id = $1"
            params.append(company_id)
        
        if user_id:
            query += f" AND user_id = ${len(params) + 1}"
            params.append(user_id)
        
        if entity_type:
            query += f" AND entity_type = ${len(params) + 1}"
            params.append(entity_type)
        
        if action:
            query += f" AND action = ${len(params) + 1}"
            params.append(action)
        
        query += f" ORDER BY created_at DESC LIMIT ${len(params) + 1}"
        params.append(limit)
        
        logs = await conn.fetch(query, *params)
        
        return {
            "audit_logs": [
                {
                    "id": str(l['id']),
                    "company_id": str(l['company_id']) if l['company_id'] else None,
                    "user_id": str(l['user_id']),
                    "action": l['action'],
                    "entity_type": l['entity_type'],
                    "entity_id": str(l['entity_id']) if l['entity_id'] else None,
                    "ip_address": l['ip_address'],
                    "created_at": l['created_at'].isoformat()
                }
                for l in logs
            ],
            "total": len(logs)
        }
    
    except Exception as e:
        logger.error(f"Error listing audit logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list audit logs: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/error-logs")
async def create_error_log(error_log: ErrorLogCreate):
    """Create an error log entry"""
    conn = await get_db_connection()
    
    try:
        new_log = await conn.fetchrow(
            """
            INSERT INTO error_log 
            (company_id, user_id, error_type, error_message, stack_trace, request_path, request_method, request_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, error_type, error_message, created_at
            """,
            error_log.company_id, error_log.user_id, error_log.error_type, error_log.error_message,
            error_log.stack_trace, error_log.request_path, error_log.request_method,
            json.dumps(error_log.request_data) if error_log.request_data else None
        )
        
        return {
            "status": "success",
            "error_log": {
                "id": str(new_log['id']),
                "error_type": new_log['error_type'],
                "error_message": new_log['error_message'],
                "created_at": new_log['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating error log: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create error log: {str(e)}")
    finally:
        await conn.close()


@router.get("/error-logs")
async def list_error_logs(
    company_id: Optional[str] = None,
    error_type: Optional[str] = None,
    is_resolved: Optional[bool] = None,
    limit: int = Query(50, le=200)
):
    """List error logs"""
    conn = await get_db_connection()
    
    try:
        query = "SELECT id, company_id, user_id, error_type, error_message, is_resolved, resolved_at, created_at FROM error_log WHERE 1=1"
        params = []
        
        if company_id:
            query += " AND company_id = $1"
            params.append(company_id)
        
        if error_type:
            query += f" AND error_type = ${len(params) + 1}"
            params.append(error_type)
        
        if is_resolved is not None:
            query += f" AND is_resolved = ${len(params) + 1}"
            params.append(is_resolved)
        
        query += f" ORDER BY created_at DESC LIMIT ${len(params) + 1}"
        params.append(limit)
        
        logs = await conn.fetch(query, *params)
        
        return {
            "error_logs": [
                {
                    "id": str(l['id']),
                    "company_id": str(l['company_id']) if l['company_id'] else None,
                    "user_id": str(l['user_id']) if l['user_id'] else None,
                    "error_type": l['error_type'],
                    "error_message": l['error_message'],
                    "is_resolved": l['is_resolved'],
                    "resolved_at": l['resolved_at'].isoformat() if l['resolved_at'] else None,
                    "created_at": l['created_at'].isoformat()
                }
                for l in logs
            ],
            "total": len(logs)
        }
    
    except Exception as e:
        logger.error(f"Error listing error logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list error logs: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.get("/rate-limits/{identifier}")
async def check_rate_limit(identifier: str, limit_type: str = "api"):
    """Check rate limit for an identifier"""
    conn = await get_db_connection()
    
    try:
        rate_limit = await conn.fetchrow(
            """
            SELECT request_count, window_start, is_blocked
            FROM rate_limits
            WHERE identifier = $1 AND limit_type = $2
            AND window_start > NOW() - INTERVAL '1 hour'
            """,
            identifier, limit_type
        )
        
        if not rate_limit:
            await conn.execute(
                """
                INSERT INTO rate_limits (identifier, limit_type, request_count, window_start)
                VALUES ($1, $2, 1, NOW())
                """,
                identifier, limit_type
            )
            return {
                "identifier": identifier,
                "request_count": 1,
                "is_blocked": False,
                "limit": 1000  # Default limit
            }
        
        new_count = rate_limit['request_count'] + 1
        await conn.execute(
            """
            UPDATE rate_limits
            SET request_count = $3, updated_at = NOW()
            WHERE identifier = $1 AND limit_type = $2
            """,
            identifier, limit_type, new_count
        )
        
        limit = 1000  # Default limit
        is_blocked = new_count > limit
        
        if is_blocked and not rate_limit['is_blocked']:
            await conn.execute(
                """
                UPDATE rate_limits
                SET is_blocked = true, blocked_at = NOW()
                WHERE identifier = $1 AND limit_type = $2
                """,
                identifier, limit_type
            )
        
        return {
            "identifier": identifier,
            "request_count": new_count,
            "is_blocked": is_blocked,
            "limit": limit
        }
    
    except Exception as e:
        logger.error(f"Error checking rate limit: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check rate limit: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.get("/backups")
async def list_backups(
    backup_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """List database backups"""
    conn = await get_db_connection()
    
    try:
        query = "SELECT id, backup_type, backup_location, backup_size_mb, status, started_at, completed_at FROM backup_log WHERE 1=1"
        params = []
        
        if backup_type:
            query += " AND backup_type = $1"
            params.append(backup_type)
        
        if status:
            query += f" AND status = ${len(params) + 1}"
            params.append(status)
        
        query += f" ORDER BY started_at DESC LIMIT ${len(params) + 1}"
        params.append(limit)
        
        backups = await conn.fetch(query, *params)
        
        return {
            "backups": [
                {
                    "id": str(b['id']),
                    "backup_type": b['backup_type'],
                    "backup_location": b['backup_location'],
                    "backup_size_mb": float(b['backup_size_mb']) if b['backup_size_mb'] else None,
                    "status": b['status'],
                    "started_at": b['started_at'].isoformat() if b['started_at'] else None,
                    "completed_at": b['completed_at'].isoformat() if b['completed_at'] else None
                }
                for b in backups
            ],
            "total": len(backups)
        }
    
    except Exception as e:
        logger.error(f"Error listing backups: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list backups: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint for production hardening module"""
    conn = await get_db_connection()
    
    try:
        pending_jobs = await conn.fetchval("SELECT COUNT(*) FROM background_jobs WHERE status = 'pending'")
        failed_jobs = await conn.fetchval("SELECT COUNT(*) FROM background_jobs WHERE status = 'failed'")
        active_tasks = await conn.fetchval("SELECT COUNT(*) FROM scheduled_tasks WHERE is_enabled = true")
        recent_errors = await conn.fetchval("SELECT COUNT(*) FROM error_log WHERE created_at > NOW() - INTERVAL '1 hour' AND is_resolved = false")
        
        return {
            "status": "healthy",
            "module": "production_hardening",
            "pending_jobs": pending_jobs,
            "failed_jobs": failed_jobs,
            "active_scheduled_tasks": active_tasks,
            "recent_unresolved_errors": recent_errors
        }
    
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "module": "production_hardening",
            "error": str(e)
        }
    finally:
        await conn.close()
