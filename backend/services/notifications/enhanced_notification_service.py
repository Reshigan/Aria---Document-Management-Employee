"""
Enhanced Notification Service with database integration, WebSocket support, and real-time notifications.
"""
import logging
import json
import asyncio
from typing import Optional, List, Dict, Any, Set
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import WebSocket

from models.notification_models import (
    Notification, NotificationDelivery, NotificationTemplate, 
    NotificationPreference, NotificationSubscription,
    NotificationType, NotificationPriority, NotificationChannel
)
from models.user import User
from schemas.notification_schemas import (
    NotificationCreate, NotificationResponse, NotificationListResponse,
    NotificationDeliveryCreate, EmailNotificationData, PushNotificationData,
    WebSocketNotificationMessage
)
from .notification_service import notification_service as basic_notification_service

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections for real-time notifications."""
    
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        """Connect a user's WebSocket."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"WebSocket connected for user {user_id}")
    
    def disconnect(self, websocket: WebSocket, user_id: int):
        """Disconnect a user's WebSocket."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected for user {user_id}")
    
    async def send_personal_message(self, message: dict, user_id: int):
        """Send message to a specific user's WebSocket connections."""
        if user_id in self.active_connections:
            disconnected = set()
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending WebSocket message to user {user_id}: {e}")
                    disconnected.add(websocket)
            
            # Remove disconnected WebSockets
            for websocket in disconnected:
                self.active_connections[user_id].discard(websocket)
    
    async def broadcast_to_users(self, message: dict, user_ids: List[int]):
        """Broadcast message to multiple users."""
        tasks = []
        for user_id in user_ids:
            tasks.append(self.send_personal_message(message, user_id))
        await asyncio.gather(*tasks, return_exceptions=True)


class EnhancedNotificationService:
    """Enhanced notification service with database integration and real-time features."""
    
    def __init__(self):
        self.websocket_manager = WebSocketManager()
        self.basic_service = basic_notification_service
    
    # WebSocket Management
    async def connect_websocket(self, websocket: WebSocket, user_id: int):
        """Connect user WebSocket for real-time notifications."""
        await self.websocket_manager.connect(websocket, user_id)
    
    def disconnect_websocket(self, websocket: WebSocket, user_id: int):
        """Disconnect user WebSocket."""
        self.websocket_manager.disconnect(websocket, user_id)
    
    # Core Notification Methods
    async def create_notification(
        self, 
        db: Session, 
        notification_data: NotificationCreate,
        send_immediately: bool = True
    ) -> Notification:
        """Create a new notification and optionally send it immediately."""
        
        # Create notification in database
        notification = Notification(
            title=notification_data.title,
            message=notification_data.message,
            type=notification_data.type,
            priority=notification_data.priority,
            recipient_id=notification_data.recipient_id,
            sender_id=notification_data.sender_id,
            document_id=notification_data.document_id,
            workflow_id=notification_data.workflow_id,
            task_id=notification_data.task_id,
            metadata=json.dumps(notification_data.metadata) if notification_data.metadata else None,
            action_url=notification_data.action_url,
            scheduled_at=notification_data.scheduled_at,
            expires_at=notification_data.expires_at
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        logger.info(f"Created notification {notification.id} for user {notification.recipient_id}")
        
        if send_immediately:
            await self._send_notification(db, notification)
        
        return notification
    
    async def _send_notification(self, db: Session, notification: Notification):
        """Send notification through all appropriate channels."""
        
        # Get user preferences
        preferences = self._get_user_preferences(db, notification.recipient_id, notification.type)
        
        # Send through each enabled channel
        for pref in preferences:
            if pref.is_enabled and self._should_send_now(pref, notification):
                await self._send_through_channel(db, notification, pref.channel)
        
        # Always send WebSocket notification for real-time updates
        await self._send_websocket_notification(notification)
    
    def _get_user_preferences(
        self, 
        db: Session, 
        user_id: int, 
        notification_type: NotificationType
    ) -> List[NotificationPreference]:
        """Get user preferences for a specific notification type."""
        
        preferences = db.query(NotificationPreference).filter(
            and_(
                NotificationPreference.user_id == user_id,
                NotificationPreference.notification_type == notification_type,
                NotificationPreference.is_enabled == True
            )
        ).all()
        
        # If no preferences found, create default ones
        if not preferences:
            default_channels = [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
            for channel in default_channels:
                pref = NotificationPreference(
                    user_id=user_id,
                    notification_type=notification_type,
                    channel=channel,
                    is_enabled=True
                )
                db.add(pref)
                preferences.append(pref)
            db.commit()
        
        return preferences
    
    def _should_send_now(self, preference: NotificationPreference, notification: Notification) -> bool:
        """Check if notification should be sent now based on user preferences."""
        
        # Check priority threshold
        priority_levels = {
            NotificationPriority.LOW: 1,
            NotificationPriority.MEDIUM: 2,
            NotificationPriority.HIGH: 3,
            NotificationPriority.URGENT: 4
        }
        
        if priority_levels[notification.priority] < priority_levels[preference.minimum_priority]:
            return False
        
        # Check quiet hours
        if preference.quiet_hours_start and preference.quiet_hours_end:
            now = datetime.now().time()
            start_time = datetime.strptime(preference.quiet_hours_start, "%H:%M").time()
            end_time = datetime.strptime(preference.quiet_hours_end, "%H:%M").time()
            
            if start_time <= now <= end_time:
                # Only send urgent notifications during quiet hours
                return notification.priority == NotificationPriority.URGENT
        
        return True
    
    async def _send_through_channel(
        self, 
        db: Session, 
        notification: Notification, 
        channel: NotificationChannel
    ):
        """Send notification through a specific channel."""
        
        delivery = NotificationDelivery(
            notification_id=notification.id,
            channel=channel,
            status="PENDING"
        )
        
        try:
            if channel == NotificationChannel.EMAIL:
                await self._send_email_notification(db, notification, delivery)
            elif channel == NotificationChannel.SMS:
                await self._send_sms_notification(db, notification, delivery)
            elif channel == NotificationChannel.PUSH:
                await self._send_push_notification(db, notification, delivery)
            elif channel == NotificationChannel.WEBHOOK:
                await self._send_webhook_notification(db, notification, delivery)
            
            delivery.status = "SENT"
            delivery.delivered_at = datetime.utcnow()
            
        except Exception as e:
            delivery.status = "FAILED"
            delivery.failed_at = datetime.utcnow()
            delivery.error_message = str(e)
            delivery.attempt_count += 1
            
            # Schedule retry if under max attempts
            if delivery.attempt_count < delivery.max_attempts:
                delivery.next_attempt_at = datetime.utcnow() + timedelta(minutes=5 * delivery.attempt_count)
            
            logger.error(f"Failed to send notification {notification.id} via {channel}: {e}")
        
        db.add(delivery)
        db.commit()
    
    async def _send_email_notification(
        self, 
        db: Session, 
        notification: Notification, 
        delivery: NotificationDelivery
    ):
        """Send email notification."""
        
        # Get user email
        user = db.query(User).filter(User.id == notification.recipient_id).first()
        if not user or not user.email:
            raise ValueError("User email not found")
        
        delivery.email_address = user.email
        
        # Get or create email template
        template = self._get_email_template(db, notification.type)
        
        if template:
            subject = self._render_template(template.subject_template, notification)
            body = self._render_template(template.body_template, notification)
            html_body = self._render_template(template.html_template, notification) if template.html_template else None
        else:
            subject = notification.title
            body = notification.message
            html_body = None
        
        await self.basic_service.send_email(user.email, subject, body, html_body)
    
    async def _send_sms_notification(
        self, 
        db: Session, 
        notification: Notification, 
        delivery: NotificationDelivery
    ):
        """Send SMS notification (placeholder for SMS service integration)."""
        # TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
        logger.info(f"SMS notification would be sent for notification {notification.id}")
        pass
    
    async def _send_push_notification(
        self, 
        db: Session, 
        notification: Notification, 
        delivery: NotificationDelivery
    ):
        """Send push notification (placeholder for push service integration)."""
        # TODO: Integrate with push notification service (Firebase, etc.)
        logger.info(f"Push notification would be sent for notification {notification.id}")
        pass
    
    async def _send_webhook_notification(
        self, 
        db: Session, 
        notification: Notification, 
        delivery: NotificationDelivery
    ):
        """Send webhook notification."""
        # TODO: Implement webhook delivery
        logger.info(f"Webhook notification would be sent for notification {notification.id}")
        pass
    
    async def _send_websocket_notification(self, notification: Notification):
        """Send real-time WebSocket notification."""
        
        message = WebSocketNotificationMessage(
            action="new",
            notification=NotificationResponse(
                id=notification.id,
                title=notification.title,
                message=notification.message,
                type=notification.type,
                priority=notification.priority,
                recipient_id=notification.recipient_id,
                sender_id=notification.sender_id,
                document_id=notification.document_id,
                workflow_id=notification.workflow_id,
                task_id=notification.task_id,
                metadata=json.loads(notification.metadata) if notification.metadata else None,
                action_url=notification.action_url,
                is_read=notification.is_read,
                is_archived=notification.is_archived,
                read_at=notification.read_at,
                created_at=notification.created_at,
                updated_at=notification.updated_at,
                scheduled_at=notification.scheduled_at,
                expires_at=notification.expires_at
            )
        )
        
        await self.websocket_manager.send_personal_message(
            message.dict(), 
            notification.recipient_id
        )
    
    def _get_email_template(self, db: Session, notification_type: NotificationType) -> Optional[NotificationTemplate]:
        """Get email template for notification type."""
        return db.query(NotificationTemplate).filter(
            and_(
                NotificationTemplate.type == notification_type,
                NotificationTemplate.channel == NotificationChannel.EMAIL,
                NotificationTemplate.is_active == True
            )
        ).first()
    
    def _render_template(self, template: str, notification: Notification) -> str:
        """Render template with notification data."""
        if not template:
            return ""
        
        # Simple template rendering (can be enhanced with Jinja2)
        variables = {
            'title': notification.title,
            'message': notification.message,
            'recipient_id': notification.recipient_id,
            'created_at': notification.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'action_url': notification.action_url or '#'
        }
        
        rendered = template
        for key, value in variables.items():
            rendered = rendered.replace(f'{{{key}}}', str(value))
        
        return rendered
    
    # Notification Management Methods
    def get_notifications(
        self, 
        db: Session, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 50,
        unread_only: bool = False,
        notification_type: Optional[NotificationType] = None
    ) -> NotificationListResponse:
        """Get user notifications with pagination."""
        
        query = db.query(Notification).filter(Notification.recipient_id == user_id)
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        if notification_type:
            query = query.filter(Notification.type == notification_type)
        
        # Filter out expired notifications
        query = query.filter(
            or_(
                Notification.expires_at.is_(None),
                Notification.expires_at > datetime.utcnow()
            )
        )
        
        total = query.count()
        notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
        
        # Get unread count
        unread_count = db.query(Notification).filter(
            and_(
                Notification.recipient_id == user_id,
                Notification.is_read == False,
                or_(
                    Notification.expires_at.is_(None),
                    Notification.expires_at > datetime.utcnow()
                )
            )
        ).count()
        
        return NotificationListResponse(
            notifications=[self._notification_to_response(n) for n in notifications],
            total=total,
            unread_count=unread_count,
            page=(skip // limit) + 1,
            per_page=limit,
            total_pages=(total + limit - 1) // limit
        )
    
    def mark_as_read(self, db: Session, notification_ids: List[int], user_id: int) -> int:
        """Mark notifications as read."""
        
        updated = db.query(Notification).filter(
            and_(
                Notification.id.in_(notification_ids),
                Notification.recipient_id == user_id,
                Notification.is_read == False
            )
        ).update({
            'is_read': True,
            'read_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }, synchronize_session=False)
        
        db.commit()
        return updated
    
    def mark_as_archived(self, db: Session, notification_ids: List[int], user_id: int) -> int:
        """Mark notifications as archived."""
        
        updated = db.query(Notification).filter(
            and_(
                Notification.id.in_(notification_ids),
                Notification.recipient_id == user_id
            )
        ).update({
            'is_archived': True,
            'updated_at': datetime.utcnow()
        }, synchronize_session=False)
        
        db.commit()
        return updated
    
    def delete_notifications(self, db: Session, notification_ids: List[int], user_id: int) -> int:
        """Delete notifications."""
        
        deleted = db.query(Notification).filter(
            and_(
                Notification.id.in_(notification_ids),
                Notification.recipient_id == user_id
            )
        ).delete(synchronize_session=False)
        
        db.commit()
        return deleted
    
    def _notification_to_response(self, notification: Notification) -> NotificationResponse:
        """Convert notification model to response schema."""
        return NotificationResponse(
            id=notification.id,
            title=notification.title,
            message=notification.message,
            type=notification.type,
            priority=notification.priority,
            recipient_id=notification.recipient_id,
            sender_id=notification.sender_id,
            document_id=notification.document_id,
            workflow_id=notification.workflow_id,
            task_id=notification.task_id,
            metadata=json.loads(notification.metadata) if notification.metadata else None,
            action_url=notification.action_url,
            is_read=notification.is_read,
            is_archived=notification.is_archived,
            read_at=notification.read_at,
            created_at=notification.created_at,
            updated_at=notification.updated_at,
            scheduled_at=notification.scheduled_at,
            expires_at=notification.expires_at,
            sender_name=notification.sender.full_name if notification.sender else None,
            document_title=notification.document.title if notification.document else None,
            workflow_name=notification.workflow.name if notification.workflow else None,
            task_name=notification.task.name if notification.task else None
        )
    
    # Convenience methods for common notification types
    async def notify_document_uploaded(
        self, 
        db: Session, 
        document_id: int, 
        recipient_id: int, 
        sender_id: Optional[int] = None
    ):
        """Send document uploaded notification."""
        
        notification_data = NotificationCreate(
            title="Document Uploaded",
            message="A new document has been uploaded",
            type=NotificationType.DOCUMENT_UPLOADED,
            priority=NotificationPriority.MEDIUM,
            recipient_id=recipient_id,
            sender_id=sender_id,
            document_id=document_id,
            action_url=f"/documents/{document_id}"
        )
        
        return await self.create_notification(db, notification_data)
    
    async def notify_workflow_started(
        self, 
        db: Session, 
        workflow_id: int, 
        recipient_id: int, 
        sender_id: Optional[int] = None
    ):
        """Send workflow started notification."""
        
        notification_data = NotificationCreate(
            title="Workflow Started",
            message="A new workflow has been started",
            type=NotificationType.WORKFLOW_STARTED,
            priority=NotificationPriority.MEDIUM,
            recipient_id=recipient_id,
            sender_id=sender_id,
            workflow_id=workflow_id,
            action_url=f"/workflows/{workflow_id}"
        )
        
        return await self.create_notification(db, notification_data)
    
    async def notify_task_assigned(
        self, 
        db: Session, 
        task_id: int, 
        recipient_id: int, 
        sender_id: Optional[int] = None
    ):
        """Send task assigned notification."""
        
        notification_data = NotificationCreate(
            title="Task Assigned",
            message="A new task has been assigned to you",
            type=NotificationType.TASK_ASSIGNED,
            priority=NotificationPriority.HIGH,
            recipient_id=recipient_id,
            sender_id=sender_id,
            task_id=task_id,
            action_url=f"/tasks/{task_id}"
        )
        
        return await self.create_notification(db, notification_data)


# Singleton instance
enhanced_notification_service = EnhancedNotificationService()