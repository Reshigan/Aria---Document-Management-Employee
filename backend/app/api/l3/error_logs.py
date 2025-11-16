from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

try:
    from app.auth import get_db, get_current_user
except ImportError:
    try:
        from auth_integrated import get_db, get_current_user
    except ImportError:
        from core.database_pg import SessionLocal
        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        from auth_integrated import get_current_user

router = APIRouter()


@router.get("/error-logs")
async def get_error_logs(
    severity: Optional[str] = None,
    module: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get error logs with filtering"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["el.company_id = :company_id"]
        params = {"company_id": company_id, "limit": limit}
        
        if severity:
            where_clauses.append("el.severity = :severity")
            params["severity"] = severity
        
        if module:
            where_clauses.append("el.module = :module")
            params["module"] = module
        
        if status:
            where_clauses.append("el.status = :status")
            params["status"] = status
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                el.id,
                el.error_code,
                el.severity,
                el.module,
                el.error_message,
                el.stack_trace,
                el.user_email,
                el.request_url,
                el.request_method,
                el.status,
                el.resolved_by,
                el.resolved_at,
                el.resolution_notes,
                el.occurred_at
            FROM error_logs el
            WHERE {where_clause}
            ORDER BY 
                CASE el.severity
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'ERROR' THEN 2
                    WHEN 'WARNING' THEN 3
                    WHEN 'INFO' THEN 4
                END,
                el.occurred_at DESC
            LIMIT :limit
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        logs = []
        unresolved_count = 0
        
        for row in rows:
            if row[9] == "UNRESOLVED":
                unresolved_count += 1
            
            logs.append({
                "id": row[0],
                "error_code": row[1],
                "severity": row[2],
                "module": row[3],
                "error_message": row[4],
                "stack_trace": row[5],
                "user_email": row[6],
                "request_url": row[7],
                "request_method": row[8],
                "status": row[9],
                "resolved_by": row[10],
                "resolved_at": str(row[11]) if row[11] else None,
                "resolution_notes": row[12],
                "occurred_at": str(row[13]) if row[13] else None
            })
        
        return {
            "error_logs": logs,
            "total_count": len(logs),
            "unresolved_count": unresolved_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/error-log/{log_id}")
async def get_error_log_details(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for an error log"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                el.id,
                el.error_code,
                el.severity,
                el.module,
                el.error_message,
                el.stack_trace,
                el.user_email,
                el.request_url,
                el.request_method,
                el.request_body,
                el.request_headers,
                el.response_status,
                el.status,
                el.resolved_by,
                el.resolved_at,
                el.resolution_notes,
                el.occurred_at,
                el.environment,
                el.server_name,
                el.client_ip
            FROM error_logs el
            WHERE el.id = :log_id AND el.company_id = :company_id
        """)
        
        result = db.execute(query, {"log_id": log_id, "company_id": company_id})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Error log not found")
        
        return {
            "id": row[0],
            "error_code": row[1],
            "severity": row[2],
            "module": row[3],
            "error_message": row[4],
            "stack_trace": row[5],
            "user_email": row[6],
            "request_url": row[7],
            "request_method": row[8],
            "request_body": row[9],
            "request_headers": row[10],
            "response_status": row[11],
            "status": row[12],
            "resolved_by": row[13],
            "resolved_at": str(row[14]) if row[14] else None,
            "resolution_notes": row[15],
            "occurred_at": str(row[16]) if row[16] else None,
            "environment": row[17],
            "server_name": row[18],
            "client_ip": row[19]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/error-log")
async def create_error_log(
    error_code: str,
    severity: str,
    module: str,
    error_message: str,
    stack_trace: Optional[str] = None,
    request_url: Optional[str] = None,
    request_method: Optional[str] = None,
    request_body: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new error log entry"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO error_logs (
                error_code, severity, module, error_message,
                stack_trace, user_email, request_url, request_method,
                request_body, company_id, occurred_at
            ) VALUES (
                :error_code, :severity, :module, :error_message,
                :stack_trace, :user_email, :request_url, :request_method,
                :request_body, :company_id, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "error_code": error_code,
            "severity": severity,
            "module": module,
            "error_message": error_message,
            "stack_trace": stack_trace,
            "user_email": user_email,
            "request_url": request_url,
            "request_method": request_method,
            "request_body": request_body,
            "company_id": company_id
        })
        
        db.commit()
        log_id = result.fetchone()[0]
        
        return {"id": log_id, "message": "Error log created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/error-log/{log_id}/resolve")
async def resolve_error_log(
    log_id: int,
    resolution_notes: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark an error log as resolved"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE error_logs
            SET 
                status = 'RESOLVED',
                resolved_by = :resolved_by,
                resolved_at = NOW(),
                resolution_notes = :resolution_notes
            WHERE id = :log_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "resolved_by": user_email,
            "resolution_notes": resolution_notes,
            "log_id": log_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Error log resolved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/error-logs/statistics")
async def get_error_statistics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get error statistics"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["el.company_id = :company_id"]
        params = {"company_id": company_id}
        
        if start_date:
            where_clauses.append("el.occurred_at >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("el.occurred_at <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        severity_query = text(f"""
            SELECT 
                el.severity,
                COUNT(*) as error_count,
                SUM(CASE WHEN el.status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved_count
            FROM error_logs el
            WHERE {where_clause}
            GROUP BY el.severity
            ORDER BY 
                CASE el.severity
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'ERROR' THEN 2
                    WHEN 'WARNING' THEN 3
                    WHEN 'INFO' THEN 4
                END
        """)
        
        severity_result = db.execute(severity_query, params)
        
        by_severity = []
        for row in severity_result.fetchall():
            by_severity.append({
                "severity": row[0],
                "error_count": row[1],
                "resolved_count": row[2],
                "unresolved_count": row[1] - row[2]
            })
        
        module_query = text(f"""
            SELECT 
                el.module,
                COUNT(*) as error_count,
                SUM(CASE WHEN el.status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved_count
            FROM error_logs el
            WHERE {where_clause}
            GROUP BY el.module
            ORDER BY error_count DESC
            LIMIT 10
        """)
        
        module_result = db.execute(module_query, params)
        
        by_module = []
        for row in module_result.fetchall():
            by_module.append({
                "module": row[0],
                "error_count": row[1],
                "resolved_count": row[2],
                "unresolved_count": row[1] - row[2]
            })
        
        total_query = text(f"""
            SELECT 
                COUNT(*) as total_errors,
                SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as total_resolved,
                AVG(EXTRACT(EPOCH FROM (resolved_at - occurred_at))/3600) as avg_resolution_hours
            FROM error_logs el
            WHERE {where_clause}
        """)
        
        total_result = db.execute(total_query, params)
        total_row = total_result.fetchone()
        
        return {
            "by_severity": by_severity,
            "by_module": by_module,
            "totals": {
                "total_errors": total_row[0] if total_row else 0,
                "total_resolved": total_row[1] if total_row else 0,
                "total_unresolved": (total_row[0] - total_row[1]) if total_row else 0,
                "avg_resolution_hours": float(total_row[2]) if total_row and total_row[2] else 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/error-logs/by-user")
async def get_errors_by_user(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get error counts grouped by user"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                el.user_email,
                COUNT(*) as error_count,
                MAX(el.occurred_at) as last_error_date
            FROM error_logs el
            WHERE el.company_id = :company_id
            GROUP BY el.user_email
            ORDER BY error_count DESC
            LIMIT 20
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        by_user = []
        for row in rows:
            by_user.append({
                "user_email": row[0],
                "error_count": row[1],
                "last_error_date": str(row[2]) if row[2] else None
            })
        
        return {"errors_by_user": by_user}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/error-logs/frequent-errors")
async def get_frequent_errors(
    days: int = 7,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get most frequent errors in the last N days"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                el.error_code,
                el.error_message,
                el.module,
                COUNT(*) as occurrence_count,
                MAX(el.occurred_at) as last_occurred
            FROM error_logs el
            WHERE el.company_id = :company_id
                AND el.occurred_at >= NOW() - INTERVAL ':days days'
            GROUP BY el.error_code, el.error_message, el.module
            ORDER BY occurrence_count DESC
            LIMIT :limit
        """)
        
        result = db.execute(query, {
            "company_id": company_id,
            "days": days,
            "limit": limit
        })
        rows = result.fetchall()
        
        frequent_errors = []
        for row in rows:
            frequent_errors.append({
                "error_code": row[0],
                "error_message": row[1],
                "module": row[2],
                "occurrence_count": row[3],
                "last_occurred": str(row[4]) if row[4] else None
            })
        
        return {"frequent_errors": frequent_errors}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/error-logs/clear-old")
async def clear_old_error_logs(
    days: int = 90,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Clear old resolved error logs"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM error_logs
            WHERE company_id = :company_id
                AND status = 'RESOLVED'
                AND resolved_at < NOW() - INTERVAL ':days days'
        """)
        
        result = db.execute(delete_query, {
            "company_id": company_id,
            "days": days
        })
        
        db.commit()
        
        return {"message": f"Cleared old error logs", "count": result.rowcount}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
