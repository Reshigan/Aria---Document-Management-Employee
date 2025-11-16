from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/system-event/{event_id}/atomic-detail")
async def get_system_event_atomic_detail(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single system event log entry"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                se.id,
                se.event_type,
                se.severity,
                se.message,
                se.stack_trace,
                se.context_data,
                se.source_module,
                se.source_function,
                se.user_id,
                u.email as user_email,
                se.ip_address,
                se.resolution_status,
                se.resolved_by,
                se.resolved_at,
                se.resolution_notes,
                se.created_at
            FROM system_event_log se
            LEFT JOIN users u ON se.user_id = u.id
            WHERE se.id = :event_id AND se.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "event_id": event_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="System event not found")
        
        similar_query = text("""
            SELECT 
                se.id,
                se.event_type,
                se.severity,
                se.message,
                se.created_at,
                se.resolution_status
            FROM system_event_log se
            WHERE se.event_type = :event_type
                AND se.source_module = :source_module
                AND se.id != :event_id
                AND se.company_id = :company_id
            ORDER BY se.created_at DESC
            LIMIT 10
        """)
        
        similar_result = db.execute(similar_query, {
            "event_type": result[1],
            "source_module": result[6],
            "event_id": event_id,
            "company_id": company_id
        })
        
        similar_events = []
        for row in similar_result.fetchall():
            similar_events.append({
                "id": row[0],
                "event_type": row[1],
                "severity": row[2],
                "message": row[3],
                "created_at": str(row[4]) if row[4] else None,
                "resolution_status": row[5]
            })
        
        stats_query = text("""
            SELECT 
                COUNT(*) as total_events,
                SUM(CASE WHEN severity = 'ERROR' THEN 1 ELSE 0 END) as error_count,
                SUM(CASE WHEN severity = 'WARNING' THEN 1 ELSE 0 END) as warning_count,
                SUM(CASE WHEN resolution_status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved_count
            FROM system_event_log
            WHERE event_type = :event_type
                AND company_id = :company_id
        """)
        
        stats_result = db.execute(stats_query, {
            "event_type": result[1],
            "company_id": company_id
        }).fetchone()
        
        event_type_stats = None
        if stats_result:
            total = stats_result[0] if stats_result[0] else 0
            resolved = stats_result[3] if stats_result[3] else 0
            
            event_type_stats = {
                "total_events": total,
                "error_count": stats_result[1] if stats_result[1] else 0,
                "warning_count": stats_result[2] if stats_result[2] else 0,
                "resolved_count": resolved,
                "resolution_rate": (resolved / total * 100) if total > 0 else 0
            }
        
        related_query = text("""
            SELECT 
                se.id,
                se.event_type,
                se.severity,
                se.message,
                se.created_at
            FROM system_event_log se
            WHERE se.user_id = :user_id
                AND se.created_at BETWEEN :created_at - INTERVAL '5 minutes' AND :created_at + INTERVAL '5 minutes'
                AND se.id != :event_id
                AND se.company_id = :company_id
            ORDER BY se.created_at
        """)
        
        related_result = db.execute(related_query, {
            "user_id": result[8],
            "created_at": result[15],
            "event_id": event_id,
            "company_id": company_id
        })
        
        related_events = []
        for row in related_result.fetchall():
            related_events.append({
                "id": row[0],
                "event_type": row[1],
                "severity": row[2],
                "message": row[3],
                "created_at": str(row[4]) if row[4] else None
            })
        
        return {
            "system_event": {
                "id": result[0],
                "event_type": result[1],
                "severity": result[2],
                "message": result[3],
                "stack_trace": result[4],
                "context_data": result[5],
                "source_module": result[6],
                "source_function": result[7],
                "user_id": result[8],
                "user_email": result[9],
                "ip_address": result[10],
                "resolution_status": result[11],
                "resolved_by": result[12],
                "resolved_at": str(result[13]) if result[13] else None,
                "resolution_notes": result[14],
                "created_at": str(result[15]) if result[15] else None
            },
            "event_type_statistics": event_type_stats,
            "similar_events": similar_events,
            "related_events": related_events,
            "requires_attention": result[2] in ["ERROR", "CRITICAL"] and result[11] != "RESOLVED"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/system-event/{event_id}/resolve")
async def resolve_system_event(
    event_id: int,
    resolution_notes: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark a system event as resolved"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE system_event_log
            SET 
                resolution_status = 'RESOLVED',
                resolved_by = :resolved_by,
                resolved_at = NOW(),
                resolution_notes = :resolution_notes
            WHERE id = :event_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "resolved_by": user_email,
            "resolution_notes": resolution_notes,
            "event_id": event_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "System event marked as resolved"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
