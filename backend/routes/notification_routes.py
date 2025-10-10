"""
Notification API routes for real-time notifications, preferences, and WebSocket connections.
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from core.database import get_db
from core.auth import get_current_user
from models.user import User
from schemas.notification_schemas import (
    NotificationCreate, NotificationUpdate, NotificationResponse, NotificationListResponse,
    NotificationMarkAsReadRequest, NotificationStatsResponse,
    NotificationPreferenceCreate, NotificationPreferenceUpdate, NotificationPreferenceResponse,
    NotificationSubscriptionCreate, NotificationSubscriptionUpdate, NotificationSubscriptionResponse,
    NotificationTemplateCreate, NotificationTemplateUpdate, NotificationTemplateResponse,
    NotificationType, NotificationPriority
)
from services.notifications.enhanced_notification_service import enhanced_notification_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


# WebSocket endpoint for real-time notifications
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    """WebSocket endpoint for real-time notifications."""
    await enhanced_notification_service.connect_websocket(websocket, user_id)
    try:
        while True:
            # Keep connection alive and handle any incoming messages
            data = await websocket.receive_text()
            # Echo back for heartbeat/ping-pong
            await websocket.send_text(f"pong: {data}")
    except WebSocketDisconnect:
        enhanced_notification_service.disconnect_websocket(websocket, user_id)
        logger.info(f"WebSocket disconnected for user {user_id}")


# Notification CRUD endpoints
@router.post("/", response_model=NotificationResponse)
async def create_notification(
    notification: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new notification."""
    try:
        # Set sender as current user if not specified
        if not notification.sender_id:
            notification.sender_id = current_user.id
        
        created_notification = await enhanced_notification_service.create_notification(
            db, notification
        )
        return enhanced_notification_service._notification_to_response(created_notification)
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to create notification")


@router.get("/", response_model=NotificationListResponse)
async def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
    notification_type: Optional[NotificationType] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user notifications with pagination and filtering."""
    return enhanced_notification_service.get_notifications(
        db, current_user.id, skip, limit, unread_only, notification_type
    )


@router.get("/stats", response_model=NotificationStatsResponse)
async def get_notification_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification statistics for the current user."""
    from sqlalchemy import func
    from models.notification_models import Notification
    
    # Get total and unread counts
    total_notifications = db.query(Notification).filter(
        Notification.recipient_id == current_user.id
    ).count()
    
    unread_count = db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    # Get counts by type
    by_type = {}
    type_counts = db.query(
        Notification.type, func.count(Notification.id)
    ).filter(
        Notification.recipient_id == current_user.id
    ).group_by(Notification.type).all()
    
    for notification_type, count in type_counts:
        by_type[notification_type] = count
    
    # Get counts by priority
    by_priority = {}
    priority_counts = db.query(
        Notification.priority, func.count(Notification.id)
    ).filter(
        Notification.recipient_id == current_user.id
    ).group_by(Notification.priority).all()
    
    for priority, count in priority_counts:
        by_priority[priority] = count
    
    # Get recent activity (last 10 notifications)
    recent_notifications = db.query(Notification).filter(
        Notification.recipient_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(10).all()
    
    recent_activity = [
        enhanced_notification_service._notification_to_response(n) 
        for n in recent_notifications
    ]
    
    return NotificationStatsResponse(
        total_notifications=total_notifications,
        unread_count=unread_count,
        by_type=by_type,
        by_priority=by_priority,
        recent_activity=recent_activity
    )


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific notification."""
    from models.notification_models import Notification
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return enhanced_notification_service._notification_to_response(notification)


@router.put("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: int,
    notification_update: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a notification."""
    from models.notification_models import Notification
    from datetime import datetime
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Update fields
    update_data = notification_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(notification, field, value)
    
    notification.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(notification)
    
    return enhanced_notification_service._notification_to_response(notification)


@router.post("/mark-read")
async def mark_notifications_as_read(
    request: NotificationMarkAsReadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark multiple notifications as read."""
    updated_count = enhanced_notification_service.mark_as_read(
        db, request.notification_ids, current_user.id
    )
    return {"message": f"Marked {updated_count} notifications as read"}


@router.post("/mark-archived")
async def mark_notifications_as_archived(
    request: NotificationMarkAsReadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark multiple notifications as archived."""
    updated_count = enhanced_notification_service.mark_as_archived(
        db, request.notification_ids, current_user.id
    )
    return {"message": f"Marked {updated_count} notifications as archived"}


@router.delete("/")
async def delete_notifications(
    request: NotificationMarkAsReadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete multiple notifications."""
    deleted_count = enhanced_notification_service.delete_notifications(
        db, request.notification_ids, current_user.id
    )
    return {"message": f"Deleted {deleted_count} notifications"}


# Notification Preferences endpoints
@router.get("/preferences/", response_model=List[NotificationPreferenceResponse])
async def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user notification preferences."""
    from models.notification_models import NotificationPreference
    
    preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).all()
    
    return [NotificationPreferenceResponse.from_orm(pref) for pref in preferences]


@router.post("/preferences/", response_model=NotificationPreferenceResponse)
async def create_notification_preference(
    preference: NotificationPreferenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a notification preference."""
    from models.notification_models import NotificationPreference
    
    # Set user_id to current user
    preference.user_id = current_user.id
    
    db_preference = NotificationPreference(**preference.dict())
    db.add(db_preference)
    db.commit()
    db.refresh(db_preference)
    
    return NotificationPreferenceResponse.from_orm(db_preference)


@router.put("/preferences/{preference_id}", response_model=NotificationPreferenceResponse)
async def update_notification_preference(
    preference_id: int,
    preference_update: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a notification preference."""
    from models.notification_models import NotificationPreference
    from datetime import datetime
    
    preference = db.query(NotificationPreference).filter(
        NotificationPreference.id == preference_id,
        NotificationPreference.user_id == current_user.id
    ).first()
    
    if not preference:
        raise HTTPException(status_code=404, detail="Preference not found")
    
    # Update fields
    update_data = preference_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(preference, field, value)
    
    preference.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(preference)
    
    return NotificationPreferenceResponse.from_orm(preference)


# Notification Subscriptions endpoints
@router.get("/subscriptions/", response_model=List[NotificationSubscriptionResponse])
async def get_notification_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user notification subscriptions."""
    from models.notification_models import NotificationSubscription
    
    subscriptions = db.query(NotificationSubscription).filter(
        NotificationSubscription.user_id == current_user.id
    ).all()
    
    return [NotificationSubscriptionResponse.from_orm(sub) for sub in subscriptions]


@router.post("/subscriptions/", response_model=NotificationSubscriptionResponse)
async def create_notification_subscription(
    subscription: NotificationSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a notification subscription."""
    from models.notification_models import NotificationSubscription
    import json
    
    # Set user_id to current user
    subscription.user_id = current_user.id
    
    subscription_data = subscription.dict()
    if subscription_data.get('notification_types'):
        subscription_data['notification_types'] = json.dumps(subscription_data['notification_types'])
    
    db_subscription = NotificationSubscription(**subscription_data)
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    
    return NotificationSubscriptionResponse.from_orm(db_subscription)


# Notification Templates endpoints (Admin only)
@router.get("/templates/", response_model=List[NotificationTemplateResponse])
async def get_notification_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification templates (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from models.notification_models import NotificationTemplate
    
    templates = db.query(NotificationTemplate).all()
    return [NotificationTemplateResponse.from_orm(template) for template in templates]


@router.post("/templates/", response_model=NotificationTemplateResponse)
async def create_notification_template(
    template: NotificationTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a notification template (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from models.notification_models import NotificationTemplate
    import json
    
    template_data = template.dict()
    if template_data.get('variables'):
        template_data['variables'] = json.dumps(template_data['variables'])
    
    db_template = NotificationTemplate(**template_data)
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    
    return NotificationTemplateResponse.from_orm(db_template)


# Convenience endpoints for common notification types
@router.post("/document-uploaded")
async def notify_document_uploaded(
    document_id: int,
    recipient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send document uploaded notification."""
    notification = await enhanced_notification_service.notify_document_uploaded(
        db, document_id, recipient_id, current_user.id
    )
    return {"message": "Notification sent", "notification_id": notification.id}


@router.post("/workflow-started")
async def notify_workflow_started(
    workflow_id: int,
    recipient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send workflow started notification."""
    notification = await enhanced_notification_service.notify_workflow_started(
        db, workflow_id, recipient_id, current_user.id
    )
    return {"message": "Notification sent", "notification_id": notification.id}


@router.post("/task-assigned")
async def notify_task_assigned(
    task_id: int,
    recipient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send task assigned notification."""
    notification = await enhanced_notification_service.notify_task_assigned(
        db, task_id, recipient_id, current_user.id
    )
    return {"message": "Notification sent", "notification_id": notification.id}