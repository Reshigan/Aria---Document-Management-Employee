from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

try:
    from auth import get_db
except ImportError:
    try:
        from auth_integrated import get_db
    except ImportError:
        import sys
        sys.path.insert(0, '/var/www/aria/backend')
        from auth import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/notification/{notification_id}/action-history")
async def get_notification_action_history(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get action history for a notification"""
    try:
        company_id = current_user.get("company_id", "default")
        
        notification_query = text("""
            SELECT 
                n.id,
                n.notification_type,
                n.title,
                n.message,
                n.recipient_email,
                n.status,
                n.sent_at,
                n.read_at,
                n.entity_type,
                n.entity_id,
                n.priority,
                n.created_at
            FROM notifications n
            WHERE n.id = :notification_id AND n.company_id = :company_id
        """)
        
        notification_result = db.execute(notification_query, {
            "notification_id": notification_id,
            "company_id": company_id
        }).fetchone()
        
        if not notification_result:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        action_query = text("""
            SELECT 
                nah.id,
                nah.action_type,
                nah.action_date,
                nah.action_by,
                nah.action_details,
                nah.ip_address,
                nah.user_agent
            FROM notification_action_history nah
            WHERE nah.notification_id = :notification_id
                AND nah.company_id = :company_id
            ORDER BY nah.action_date DESC
        """)
        
        action_result = db.execute(action_query, {
            "notification_id": notification_id,
            "company_id": company_id
        })
        
        action_history = []
        for row in action_result.fetchall():
            action_history.append({
                "id": row[0],
                "action_type": row[1],
                "action_date": str(row[2]) if row[2] else None,
                "action_by": row[3],
                "action_details": row[4],
                "ip_address": row[5],
                "user_agent": row[6]
            })
        
        entity_details = None
        if notification_result[8] and notification_result[9]:
            entity_type = notification_result[8]
            entity_id = notification_result[9]
            
            if entity_type == "TASK":
                entity_query = text("""
                    SELECT 
                        t.task_number,
                        t.title,
                        t.status
                    FROM tasks t
                    WHERE t.id = :entity_id AND t.company_id = :company_id
                """)
                
                entity_result = db.execute(entity_query, {
                    "entity_id": entity_id,
                    "company_id": company_id
                }).fetchone()
                
                if entity_result:
                    entity_details = {
                        "type": "TASK",
                        "task_number": entity_result[0],
                        "title": entity_result[1],
                        "status": entity_result[2]
                    }
            
            elif entity_type == "APPROVAL":
                entity_query = text("""
                    SELECT 
                        aw.workflow_name,
                        aw.status,
                        aw.current_step,
                        aw.total_steps
                    FROM approval_workflows aw
                    WHERE aw.id = :entity_id AND aw.company_id = :company_id
                """)
                
                entity_result = db.execute(entity_query, {
                    "entity_id": entity_id,
                    "company_id": company_id
                }).fetchone()
                
                if entity_result:
                    entity_details = {
                        "type": "APPROVAL",
                        "workflow_name": entity_result[0],
                        "status": entity_result[1],
                        "current_step": entity_result[2],
                        "total_steps": entity_result[3]
                    }
        
        delivery_query = text("""
            SELECT 
                nda.id,
                nda.attempt_date,
                nda.delivery_method,
                nda.status,
                nda.error_message
            FROM notification_delivery_attempts nda
            WHERE nda.notification_id = :notification_id
                AND nda.company_id = :company_id
            ORDER BY nda.attempt_date DESC
        """)
        
        delivery_result = db.execute(delivery_query, {
            "notification_id": notification_id,
            "company_id": company_id
        })
        
        delivery_attempts = []
        for row in delivery_result.fetchall():
            delivery_attempts.append({
                "id": row[0],
                "attempt_date": str(row[1]) if row[1] else None,
                "delivery_method": row[2],
                "status": row[3],
                "error_message": row[4]
            })
        
        return {
            "notification": {
                "id": notification_result[0],
                "notification_type": notification_result[1],
                "title": notification_result[2],
                "message": notification_result[3],
                "recipient_email": notification_result[4],
                "status": notification_result[5],
                "sent_at": str(notification_result[6]) if notification_result[6] else None,
                "read_at": str(notification_result[7]) if notification_result[7] else None,
                "entity_type": notification_result[8],
                "entity_id": notification_result[9],
                "priority": notification_result[10],
                "created_at": str(notification_result[11]) if notification_result[11] else None
            },
            "action_history": action_history,
            "entity_details": entity_details,
            "delivery_attempts": delivery_attempts,
            "summary": {
                "total_actions": len(action_history),
                "total_delivery_attempts": len(delivery_attempts),
                "is_read": notification_result[7] is not None,
                "is_delivered": notification_result[5] == "DELIVERED"
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notification/{notification_id}/mark-read")
async def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE notifications
            SET 
                status = 'READ',
                read_at = NOW(),
                updated_at = NOW()
            WHERE id = :notification_id
                AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "notification_id": notification_id,
            "company_id": company_id
        })
        
        action_query = text("""
            INSERT INTO notification_action_history (
                notification_id, action_type, action_date,
                action_by, action_details, company_id, created_at
            ) VALUES (
                :notification_id, 'READ', NOW(),
                :action_by, 'Notification marked as read', :company_id, NOW()
            )
        """)
        
        db.execute(action_query, {
            "notification_id": notification_id,
            "action_by": user_email,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Notification marked as read"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
