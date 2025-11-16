from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

try:
    from app.database import get_db
except ImportError:
    from database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/audit-log-entry/{entry_id}/atomic-detail")
async def get_audit_log_entry_atomic_detail(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single audit log entry"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                at.id,
                at.entity_type,
                at.entity_id,
                at.action,
                at.field_name,
                at.old_value,
                at.new_value,
                at.changed_by,
                at.changed_at,
                at.change_reason,
                at.ip_address,
                at.user_agent,
                at.session_id
            FROM audit_trail at
            WHERE at.id = :entry_id AND at.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "entry_id": entry_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Audit log entry not found")
        
        entity_type = result[1]
        entity_id = result[2]
        
        entity_state = None
        
        if entity_type == "SALES_ORDER":
            entity_query = text("""
                SELECT 
                    order_number,
                    order_date,
                    status,
                    total_amount
                FROM sales_orders
                WHERE id = :entity_id AND company_id = :company_id
            """)
            
            entity_result = db.execute(entity_query, {
                "entity_id": entity_id,
                "company_id": company_id
            }).fetchone()
            
            if entity_result:
                entity_state = {
                    "type": "SALES_ORDER",
                    "order_number": entity_result[0],
                    "order_date": str(entity_result[1]) if entity_result[1] else None,
                    "status": entity_result[2],
                    "total_amount": float(entity_result[3]) if entity_result[3] else 0
                }
        
        entity_history_query = text("""
            SELECT 
                at.id,
                at.action,
                at.field_name,
                at.old_value,
                at.new_value,
                at.changed_by,
                at.changed_at
            FROM audit_trail at
            WHERE at.entity_type = :entity_type
                AND at.entity_id = :entity_id
                AND at.company_id = :company_id
            ORDER BY at.changed_at DESC
            LIMIT 50
        """)
        
        entity_history_result = db.execute(entity_history_query, {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "company_id": company_id
        })
        
        entity_history = []
        for row in entity_history_result.fetchall():
            entity_history.append({
                "id": row[0],
                "action": row[1],
                "field_name": row[2],
                "old_value": row[3],
                "new_value": row[4],
                "changed_by": row[5],
                "changed_at": str(row[6]) if row[6] else None
            })
        
        user_activity_query = text("""
            SELECT 
                COUNT(*) as total_actions,
                COUNT(DISTINCT entity_type) as entity_types_modified,
                MAX(changed_at) as last_action
            FROM audit_trail
            WHERE changed_by = :changed_by
                AND company_id = :company_id
        """)
        
        user_activity_result = db.execute(user_activity_query, {
            "changed_by": result[7],
            "company_id": company_id
        }).fetchone()
        
        user_activity = None
        if user_activity_result:
            user_activity = {
                "total_actions": user_activity_result[0],
                "entity_types_modified": user_activity_result[1],
                "last_action": str(user_activity_result[2]) if user_activity_result[2] else None
            }
        
        session_context = None
        session_id = result[12]
        
        if session_id:
            session_query = text("""
                SELECT 
                    us.login_time,
                    us.ip_address,
                    u.email as user_email
                FROM user_sessions us
                JOIN users u ON us.user_id = u.id
                WHERE us.session_id = :session_id
                    AND us.company_id = :company_id
            """)
            
            session_result = db.execute(session_query, {
                "session_id": session_id,
                "company_id": company_id
            }).fetchone()
            
            if session_result:
                session_context = {
                    "session_id": session_id,
                    "login_time": str(session_result[0]) if session_result[0] else None,
                    "ip_address": session_result[1],
                    "user_email": session_result[2]
                }
        
        return {
            "audit_log_entry": {
                "id": result[0],
                "entity_type": entity_type,
                "entity_id": entity_id,
                "action": result[3],
                "field_name": result[4],
                "old_value": result[5],
                "new_value": result[6],
                "changed_by": result[7],
                "changed_at": str(result[8]) if result[8] else None,
                "change_reason": result[9],
                "ip_address": result[10],
                "user_agent": result[11],
                "session_id": session_id
            },
            "entity_current_state": entity_state,
            "entity_audit_history": entity_history,
            "user_activity_summary": user_activity,
            "session_context": session_context
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
