"""
Notification System API Routes
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, select

from core.database import get_db
from api.routes.auth_enhanced import get_current_user
from models import User, Notification
from schemas.advanced import (
    NotificationResponse, NotificationCreate, NotificationListResponse,
    NotificationPreferencesResponse, NotificationPreferencesUpdate
)
from services.auth_service import auth_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=NotificationListResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    notification_type: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List user notifications with filtering"""
    query = select(Notification).where(Notification.user_id == current_user.id)
    
    # Apply filters
    if unread_only:
        query = query.where(Notification.read == False)
    
    if notification_type:
        query = query.where(Notification.type == notification_type)
    
    if priority:
        query = query.where(Notification.priority == priority)
    
    # Get total count
    count_result = await db.execute(select(func.count()).select_from(query))
    total = count_result.scalar()
    
    # Apply pagination and ordering
    notifications = query.order_by(
        Notification.created_at.desc()
    ).offset((page - 1) * page_size).limit(page_size).all()
    
    return NotificationListResponse(
        items=[NotificationResponse.from_orm(notification) for notification in notifications],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
        unread_count=select(Notification).where(
            and_(Notification.user_id == current_user.id, Notification.read == False)
        ).count()
    )


@router.post("/", response_model=NotificationResponse)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new notification (Admin only or system)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Verify target user exists
    query = select(User).where(User.id == notification_data.user_id)
    result = await db.execute(query)
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )
    
    # Create notification
    notification = Notification(
        user_id=notification_data.user_id,
        type=notification_data.type,
        title=notification_data.title,
        message=notification_data.message,
        priority=notification_data.priority,
        action_url=notification_data.action_url,
        metadata=notification_data.metadata,
        expires_at=notification_data.expires_at
    )
    
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "notification_created", "notification", notification.id,
        f"Created notification for user {target_user.username}: {notification.title}"
    )
    
    return NotificationResponse.from_orm(notification)


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get count of unread notifications"""
    count_query = select(func.count(Notification.id)).where(
        and_(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
            or_(
                Notification.expires_at.is_(None),
                Notification.expires_at > datetime.utcnow()
            )
        )
    )
    result = await db.execute(count_query)
    count = result.scalar()
    
    return {"unread_count": count}


@router.get("/summary")
async def get_notification_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get notification summary by type and priority"""
    # Count by type
    type_counts = select(
        Notification.type,
        func.count(Notification.id).label('count')
    ).where(
        and_(
            Notification.user_id == current_user.id,
            Notification.read == False,
            or_(
                Notification.expires_at.is_(None),
                Notification.expires_at > datetime.utcnow()
            )
        )
    ).group_by(Notification.type).all()
    
    # Count by priority
    priority_counts = select(
        Notification.priority,
        func.count(Notification.id).label('count')
    ).where(
        and_(
            Notification.user_id == current_user.id,
            Notification.read == False,
            or_(
                Notification.expires_at.is_(None),
                Notification.expires_at > datetime.utcnow()
            )
        )
    ).group_by(Notification.priority).all()
    
    # Recent notifications (last 24 hours)
    recent_count = select(Notification).where(
        and_(
            Notification.user_id == current_user.id,
            Notification.created_at > datetime.utcnow() - timedelta(hours=24)
        )
    ).count()
    
    return {
        "by_type": {type_count[0]: type_count[1] for type_count in type_counts},
        "by_priority": {priority_count[0]: priority_count[1] for priority_count in priority_counts},
        "recent_24h": recent_count
    }


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get specific notification"""
    notification = select(Notification).where(
        and_(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return NotificationResponse.from_orm(notification)


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark notification as read"""
    notification = select(Notification).where(
        and_(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    if not notification.read:
        notification.read = True
        notification.read_at = datetime.utcnow()
        await db.commit()
    
    return {"message": "Notification marked as read"}


@router.put("/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark all notifications as read"""
    updated_count = select(Notification).where(
        and_(
            Notification.user_id == current_user.id,
            Notification.read == False
        )
    ).update({
        "read": True,
        "read_at": datetime.utcnow()
    })
    
    await db.commit()
    
    return {"message": f"Marked {updated_count} notifications as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete notification"""
    notification = select(Notification).where(
        and_(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    await db.delete(notification)
    await db.commit()
    
    return {"message": "Notification deleted successfully"}


@router.delete("/cleanup/expired")
async def cleanup_expired_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Clean up expired notifications"""
    deleted_count = select(Notification).where(
        and_(
            Notification.user_id == current_user.id,
            Notification.expires_at < datetime.utcnow()
        )
    ).delete()
    
    await db.commit()
    
    return {"message": f"Cleaned up {deleted_count} expired notifications"}


@router.delete("/cleanup/read")
async def cleanup_read_notifications(
    older_than_days: int = Query(30, ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Clean up old read notifications"""
    cutoff_date = datetime.utcnow() - timedelta(days=older_than_days)
    
    deleted_count = select(Notification).where(
        and_(
            Notification.user_id == current_user.id,
            Notification.read == True,
            Notification.read_at < cutoff_date
        )
    ).delete()
    
    await db.commit()
    
    return {"message": f"Cleaned up {deleted_count} old read notifications"}


@router.get("/preferences/me", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's notification preferences"""
    preferences = current_user.notification_preferences or {}
    
    # Default preferences if none set
    default_preferences = {
        "email_notifications": True,
        "push_notifications": True,
        "document_upload": True,
        "document_shared": True,
        "workflow_assigned": True,
        "workflow_completed": True,
        "system_maintenance": True,
        "security_alerts": True,
        "digest_frequency": "daily",  # daily, weekly, never
        "quiet_hours_start": "22:00",
        "quiet_hours_end": "08:00",
        "weekend_notifications": False
    }
    
    # Merge with user preferences
    merged_preferences = {**default_preferences, **preferences}
    
    return NotificationPreferencesResponse(**merged_preferences)


@router.put("/preferences/me", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    preferences_data: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user's notification preferences"""
    # Get current preferences
    current_preferences = current_user.notification_preferences or {}
    
    # Update with new preferences
    update_data = preferences_data.dict(exclude_unset=True)
    updated_preferences = {**current_preferences, **update_data}
    
    # Save to user
    current_user.notification_preferences = updated_preferences
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "notification_preferences_updated", "user", current_user.id,
        "Updated notification preferences"
    )
    
    return NotificationPreferencesResponse(**updated_preferences)


# System notification creation helpers (for internal use)
async def create_system_notification(
    db: AsyncSession,
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    priority: str = "medium",
    action_url: Optional[str] = None,
    metadata: Optional[dict] = None,
    expires_at: Optional[datetime] = None
):
    """Create a system notification (internal helper)"""
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        priority=priority,
        action_url=action_url,
        metadata=metadata,
        expires_at=expires_at
    )
    
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    
    return notification


async def notify_document_shared(db: AsyncSession, document_id: int, shared_with_user_id: int, shared_by_user_id: int):
    """Notify user when document is shared with them"""
    from models import Document, User
    
    document_query = select(Document).where(Document.id == document_id)
    document_result = await db.execute(document_query)
    document = document_result.scalar_one_or_none()
    
    shared_by_query = select(User).where(User.id == shared_by_user_id)
    shared_by_result = await db.execute(shared_by_query)
    shared_by = shared_by_result.scalar_one_or_none()
    
    if document and shared_by:
        await create_system_notification(
            db=db,
            user_id=shared_with_user_id,
            notification_type="document_shared",
            title="Document Shared With You",
            message=f"{shared_by.full_name or shared_by.username} shared '{document.original_filename}' with you",
            priority="medium",
            action_url=f"/documents/{document_id}",
            metadata={
                "document_id": document_id,
                "shared_by_user_id": shared_by_user_id,
                "document_name": document.original_filename
            }
        )


async def notify_workflow_assigned(db: Session, workflow_id: int, step_id: int, assigned_user_id: int):
    """Notify user when workflow step is assigned to them"""
    from models import Workflow, WorkflowStep
    
    query = select(Workflow).where(Workflow.id == workflow_id)
    result = await db.execute(query)
    workflow = result.scalar_one_or_none()
    query = select(WorkflowStep).where(WorkflowStep.id == step_id)
    result = await db.execute(query)
    step = result.scalar_one_or_none()
    
    if workflow and step:
        await create_system_notification(
            db=db,
            user_id=assigned_user_id,
            notification_type="workflow_assigned",
            title="Workflow Step Assigned",
            message=f"You have been assigned to step '{step.name}' in workflow '{workflow.title}'",
            priority="high",
            action_url=f"/workflows/{workflow_id}",
            metadata={
                "workflow_id": workflow_id,
                "step_id": step_id,
                "workflow_title": workflow.title,
                "step_name": step.name
            }
        )


async def notify_workflow_completed(db: Session, workflow_id: int, user_id: int):
    """Notify user when workflow is completed"""
    from models import Workflow
    
    query = select(Workflow).where(Workflow.id == workflow_id)
    result = await db.execute(query)
    workflow = result.scalar_one_or_none()
    
    if workflow:
        await create_system_notification(
            db=db,
            user_id=user_id,
            notification_type="workflow_completed",
            title="Workflow Completed",
            message=f"Workflow '{workflow.title}' has been completed",
            priority="medium",
            action_url=f"/workflows/{workflow_id}",
            metadata={
                "workflow_id": workflow_id,
                "workflow_title": workflow.title
            }
        )