from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/notification-delivery/{delivery_id}/atomic-detail")
async def get_notification_delivery_atomic_detail(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single notification delivery attempt"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                nda.id,
                nda.notification_id,
                n.title as notification_title,
                n.message as notification_message,
                nda.delivery_method,
                nda.recipient,
                nda.attempt_number,
                nda.status,
                nda.attempted_at,
                nda.delivered_at,
                nda.error_message,
                nda.retry_count,
                nda.next_retry_at,
                nda.response_code,
                nda.response_time_ms
            FROM notification_delivery_attempts nda
            JOIN notifications n ON nda.notification_id = n.id
            WHERE nda.id = :delivery_id AND nda.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "delivery_id": delivery_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Notification delivery attempt not found")
        
        notification_id = result[1]
        
        all_attempts_query = text("""
            SELECT 
                id,
                delivery_method,
                attempt_number,
                status,
                attempted_at,
                delivered_at,
                error_message
            FROM notification_delivery_attempts
            WHERE notification_id = :notification_id
                AND company_id = :company_id
            ORDER BY attempt_number
        """)
        
        all_attempts_result = db.execute(all_attempts_query, {
            "notification_id": notification_id,
            "company_id": company_id
        })
        
        all_attempts = []
        for row in all_attempts_result.fetchall():
            all_attempts.append({
                "id": row[0],
                "delivery_method": row[1],
                "attempt_number": row[2],
                "status": row[3],
                "attempted_at": str(row[4]) if row[4] else None,
                "delivered_at": str(row[5]) if row[5] else None,
                "error_message": row[6]
            })
        
        recipient_stats_query = text("""
            SELECT 
                COUNT(*) as total_deliveries,
                SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as successful_deliveries,
                SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_deliveries,
                AVG(response_time_ms) as avg_response_time
            FROM notification_delivery_attempts
            WHERE recipient = :recipient
                AND company_id = :company_id
        """)
        
        recipient_stats_result = db.execute(recipient_stats_query, {
            "recipient": result[5],
            "company_id": company_id
        }).fetchone()
        
        recipient_stats = None
        if recipient_stats_result:
            total = recipient_stats_result[0] if recipient_stats_result[0] else 0
            successful = recipient_stats_result[1] if recipient_stats_result[1] else 0
            
            recipient_stats = {
                "total_deliveries": total,
                "successful_deliveries": successful,
                "failed_deliveries": recipient_stats_result[2] if recipient_stats_result[2] else 0,
                "success_rate": (successful / total * 100) if total > 0 else 0,
                "avg_response_time_ms": float(recipient_stats_result[3]) if recipient_stats_result[3] else 0
            }
        
        delivery_time_seconds = None
        if result[8] and result[9]:
            time_query = text("""
                SELECT EXTRACT(EPOCH FROM (:delivered_at - :attempted_at))
            """)
            
            time_result = db.execute(time_query, {
                "delivered_at": result[9],
                "attempted_at": result[8]
            }).fetchone()
            
            delivery_time_seconds = float(time_result[0]) if time_result else 0
        
        return {
            "notification_delivery": {
                "id": result[0],
                "notification_id": notification_id,
                "notification_title": result[2],
                "notification_message": result[3],
                "delivery_method": result[4],
                "recipient": result[5],
                "attempt_number": result[6],
                "status": result[7],
                "attempted_at": str(result[8]) if result[8] else None,
                "delivered_at": str(result[9]) if result[9] else None,
                "error_message": result[10],
                "retry_count": result[11],
                "next_retry_at": str(result[12]) if result[12] else None,
                "response_code": result[13],
                "response_time_ms": result[14]
            },
            "delivery_metrics": {
                "delivery_time_seconds": delivery_time_seconds,
                "is_delivered": result[7] == "DELIVERED",
                "requires_retry": result[7] == "FAILED" and result[11] < 3
            },
            "all_attempts": all_attempts,
            "recipient_statistics": recipient_stats
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notification-delivery/{delivery_id}/retry")
async def retry_notification_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retry a failed notification delivery"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delivery_query = text("""
            SELECT notification_id, delivery_method, recipient, retry_count
            FROM notification_delivery_attempts
            WHERE id = :delivery_id AND company_id = :company_id
        """)
        
        delivery_result = db.execute(delivery_query, {
            "delivery_id": delivery_id,
            "company_id": company_id
        }).fetchone()
        
        if not delivery_result:
            raise HTTPException(status_code=404, detail="Notification delivery attempt not found")
        
        retry_query = text("""
            INSERT INTO notification_delivery_attempts (
                notification_id, delivery_method, recipient,
                attempt_number, status, attempted_at,
                retry_count, company_id, created_at
            ) VALUES (
                :notification_id, :delivery_method, :recipient,
                (SELECT COALESCE(MAX(attempt_number), 0) + 1 FROM notification_delivery_attempts WHERE notification_id = :notification_id),
                'PENDING', NOW(),
                :retry_count + 1, :company_id, NOW()
            )
        """)
        
        db.execute(retry_query, {
            "notification_id": delivery_result[0],
            "delivery_method": delivery_result[1],
            "recipient": delivery_result[2],
            "retry_count": delivery_result[3],
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Notification delivery retry scheduled"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
