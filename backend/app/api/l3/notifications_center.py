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
        from app.database import SessionLocal
        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        from auth_integrated import get_current_user

router = APIRouter()


@router.get("/notifications")
async def get_user_notifications(
    status: Optional[str] = None,
    notification_type: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get notifications for the current user"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        where_clauses = ["n.recipient_email = :user_email", "n.company_id = :company_id"]
        params = {"user_email": user_email, "company_id": company_id, "limit": limit}
        
        if status:
            where_clauses.append("n.status = :status")
            params["status"] = status
        
        if notification_type:
            where_clauses.append("n.notification_type = :notification_type")
            params["notification_type"] = notification_type
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                n.id,
                n.notification_type,
                n.title,
                n.message,
                n.priority,
                n.status,
                n.related_entity_type,
                n.related_entity_id,
                n.action_url,
                n.created_at,
                n.read_at
            FROM notifications n
            WHERE {where_clause}
            ORDER BY 
                CASE n.priority
                    WHEN 'URGENT' THEN 1
                    WHEN 'HIGH' THEN 2
                    WHEN 'NORMAL' THEN 3
                    WHEN 'LOW' THEN 4
                END,
                n.created_at DESC
            LIMIT :limit
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        notifications = []
        unread_count = 0
        
        for row in rows:
            if row[5] == "UNREAD":
                unread_count += 1
            
            notifications.append({
                "id": row[0],
                "notification_type": row[1],
                "title": row[2],
                "message": row[3],
                "priority": row[4],
                "status": row[5],
                "related_entity_type": row[6],
                "related_entity_id": row[7],
                "action_url": row[8],
                "created_at": str(row[9]) if row[9] else None,
                "read_at": str(row[10]) if row[10] else None
            })
        
        return {
            "notifications": notifications,
            "total_count": len(notifications),
            "unread_count": unread_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/notification/{notification_id}/mark-read")
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
            SET status = 'READ', read_at = NOW(), updated_at = NOW()
            WHERE id = :notification_id 
                AND recipient_email = :user_email
                AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "notification_id": notification_id,
            "user_email": user_email,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Notification marked as read"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark all notifications as read for the current user"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE notifications
            SET status = 'READ', read_at = NOW(), updated_at = NOW()
            WHERE recipient_email = :user_email
                AND company_id = :company_id
                AND status = 'UNREAD'
        """)
        
        result = db.execute(update_query, {
            "user_email": user_email,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "All notifications marked as read", "count": result.rowcount}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/notification/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a notification"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        delete_query = text("""
            DELETE FROM notifications
            WHERE id = :notification_id 
                AND recipient_email = :user_email
                AND company_id = :company_id
        """)
        
        db.execute(delete_query, {
            "notification_id": notification_id,
            "user_email": user_email,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Notification deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notification")
async def create_notification(
    recipient_email: str,
    notification_type: str,
    title: str,
    message: str,
    priority: str = "NORMAL",
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[int] = None,
    action_url: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new notification"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO notifications (
                recipient_email, notification_type, title, message,
                priority, related_entity_type, related_entity_id,
                action_url, company_id, created_by, created_at
            ) VALUES (
                :recipient_email, :notification_type, :title, :message,
                :priority, :related_entity_type, :related_entity_id,
                :action_url, :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "recipient_email": recipient_email,
            "notification_type": notification_type,
            "title": title,
            "message": message,
            "priority": priority,
            "related_entity_type": related_entity_type,
            "related_entity_id": related_entity_id,
            "action_url": action_url,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        notification_id = result.fetchone()[0]
        
        return {"id": notification_id, "message": "Notification created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notifications/summary")
async def get_notifications_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get notification summary for the current user"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        query = text("""
            SELECT 
                COUNT(*) as total_count,
                SUM(CASE WHEN status = 'UNREAD' THEN 1 ELSE 0 END) as unread_count,
                SUM(CASE WHEN priority = 'URGENT' AND status = 'UNREAD' THEN 1 ELSE 0 END) as urgent_count,
                MAX(created_at) as last_notification_date
            FROM notifications
            WHERE recipient_email = :user_email AND company_id = :company_id
        """)
        
        result = db.execute(query, {"user_email": user_email, "company_id": company_id})
        row = result.fetchone()
        
        if not row:
            return {
                "total_count": 0,
                "unread_count": 0,
                "urgent_count": 0,
                "last_notification_date": None
            }
        
        return {
            "total_count": row[0] if row[0] else 0,
            "unread_count": row[1] if row[1] else 0,
            "urgent_count": row[2] if row[2] else 0,
            "last_notification_date": str(row[3]) if row[3] else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notifications/by-type")
async def get_notifications_by_type(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get notification counts grouped by type"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        query = text("""
            SELECT 
                notification_type,
                COUNT(*) as total_count,
                SUM(CASE WHEN status = 'UNREAD' THEN 1 ELSE 0 END) as unread_count
            FROM notifications
            WHERE recipient_email = :user_email AND company_id = :company_id
            GROUP BY notification_type
            ORDER BY unread_count DESC, total_count DESC
        """)
        
        result = db.execute(query, {"user_email": user_email, "company_id": company_id})
        rows = result.fetchall()
        
        by_type = []
        for row in rows:
            by_type.append({
                "notification_type": row[0],
                "total_count": row[1],
                "unread_count": row[2]
            })
        
        return {"notifications_by_type": by_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/notifications/clear-old")
async def clear_old_notifications(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Clear old read notifications"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        delete_query = text("""
            DELETE FROM notifications
            WHERE recipient_email = :user_email
                AND company_id = :company_id
                AND status = 'READ'
                AND read_at < NOW() - INTERVAL ':days days'
        """)
        
        result = db.execute(delete_query, {
            "user_email": user_email,
            "company_id": company_id,
            "days": days
        })
        
        db.commit()
        
        return {"message": f"Cleared old notifications", "count": result.rowcount}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
