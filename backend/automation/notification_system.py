"""
Multi-Channel Notification System for Aria
===========================================

Sends notifications via:
1. Email (Office 365)
2. WhatsApp (Business API)
3. SMS (Twilio)
4. Web push notifications
5. In-app notifications

Notification types:
- Bot execution summaries
- Exception alerts
- Approval requests
- Daily summaries
- System alerts

Author: Aria ERP Team
Date: 2025-10-29
"""

from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum
from dataclasses import dataclass
import logging
import asyncio

logger = logging.getLogger(__name__)


class NotificationChannel(str, Enum):
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    SMS = "sms"
    WEB_PUSH = "web_push"
    IN_APP = "in_app"


class NotificationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class NotificationType(str, Enum):
    BOT_SUMMARY = "bot_summary"
    EXCEPTION_ALERT = "exception_alert"
    APPROVAL_REQUEST = "approval_request"
    DAILY_SUMMARY = "daily_summary"
    SYSTEM_ALERT = "system_alert"
    TRANSACTION_COMPLETE = "transaction_complete"


@dataclass
class Notification:
    """Represents a notification to be sent"""
    notification_id: str
    recipient: str  # Email, phone, or user ID
    channel: NotificationChannel
    notification_type: NotificationType
    priority: NotificationPriority
    title: str
    body: str
    data: Dict[str, Any]
    created_at: datetime
    sent_at: Optional[datetime] = None
    delivery_status: str = "pending"
    error_message: Optional[str] = None


class NotificationSystem:
    """
    Centralized notification system that routes notifications
    to appropriate channels.
    """
    
    def __init__(
        self,
        office365_client=None,
        whatsapp_client=None,
        sms_client=None
    ):
        """
        Initialize notification system.
        
        Args:
            office365_client: Office365Client instance
            whatsapp_client: WhatsAppClient instance
            sms_client: SMS client instance (e.g., Twilio)
        """
        self.office365 = office365_client
        self.whatsapp = whatsapp_client
        self.sms = sms_client
        
        self.notification_queue: List[Notification] = []
        self.sent_notifications: List[Notification] = []
    
    async def send_notification(
        self,
        recipient: str,
        channels: List[NotificationChannel],
        notification_type: NotificationType,
        priority: NotificationPriority,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, bool]:
        """
        Send a notification via multiple channels.
        
        Args:
            recipient: Recipient identifier (email, phone, user_id)
            channels: List of channels to use
            notification_type: Type of notification
            priority: Priority level
            title: Notification title
            body: Notification body
            data: Additional data
            
        Returns:
            Dictionary with channel: success status
        """
        import uuid
        
        notification = Notification(
            notification_id=str(uuid.uuid4()),
            recipient=recipient,
            channel=channels[0],  # Primary channel
            notification_type=notification_type,
            priority=priority,
            title=title,
            body=body,
            data=data or {},
            created_at=datetime.now()
        )
        
        results = {}
        
        # Send via each channel
        for channel in channels:
            try:
                if channel == NotificationChannel.EMAIL:
                    success = await self._send_email(notification)
                elif channel == NotificationChannel.WHATSAPP:
                    success = await self._send_whatsapp(notification)
                elif channel == NotificationChannel.SMS:
                    success = await self._send_sms(notification)
                elif channel == NotificationChannel.WEB_PUSH:
                    success = await self._send_web_push(notification)
                elif channel == NotificationChannel.IN_APP:
                    success = await self._send_in_app(notification)
                else:
                    success = False
                
                results[channel.value] = success
                
                if success:
                    logger.info(f"Notification sent via {channel.value} to {recipient}")
                else:
                    logger.warning(f"Failed to send notification via {channel.value} to {recipient}")
                
            except Exception as e:
                logger.error(f"Error sending notification via {channel.value}: {str(e)}")
                results[channel.value] = False
        
        # Store notification
        notification.sent_at = datetime.now()
        notification.delivery_status = "sent" if any(results.values()) else "failed"
        self.sent_notifications.append(notification)
        
        return results
    
    async def _send_email(self, notification: Notification) -> bool:
        """Send email notification"""
        if not self.office365:
            logger.warning("Office365 client not configured")
            return False
        
        # Format email based on notification type
        subject = f"[{notification.priority.value.upper()}] {notification.title}"
        body_html = self._format_email_body(notification)
        
        return await self.office365.send_email(
            to=[notification.recipient],
            subject=subject,
            body=body_html,
            is_html=True
        )
    
    async def _send_whatsapp(self, notification: Notification) -> bool:
        """Send WhatsApp notification"""
        if not self.whatsapp:
            logger.warning("WhatsApp client not configured")
            return False
        
        # Format message
        emoji = self._get_priority_emoji(notification.priority)
        message = f"{emoji} *{notification.title}*\n\n{notification.body}"
        
        # Extract phone number from recipient (assuming format: email or phone)
        phone = self._extract_phone_number(notification.recipient)
        if not phone:
            return False
        
        return await self.whatsapp.send_text_message(
            to=phone,
            message=message
        )
    
    async def _send_sms(self, notification: Notification) -> bool:
        """Send SMS notification"""
        if not self.sms:
            logger.warning("SMS client not configured")
            return False
        
        # Format SMS (keep it short)
        message = f"{notification.title}: {notification.body[:100]}"
        
        phone = self._extract_phone_number(notification.recipient)
        if not phone:
            return False
        
        # Would integrate with Twilio or similar
        # For now, placeholder
        logger.info(f"SMS would be sent to {phone}: {message}")
        return True
    
    async def _send_web_push(self, notification: Notification) -> bool:
        """Send web push notification"""
        # Would integrate with web push service
        logger.info(f"Web push notification: {notification.title}")
        return True
    
    async def _send_in_app(self, notification: Notification) -> bool:
        """Send in-app notification"""
        # Would store in database for web app to retrieve
        logger.info(f"In-app notification stored for {notification.recipient}")
        return True
    
    def _format_email_body(self, notification: Notification) -> str:
        """Format email body with HTML"""
        priority_color = {
            NotificationPriority.LOW: "#6c757d",
            NotificationPriority.MEDIUM: "#0d6efd",
            NotificationPriority.HIGH: "#fd7e14",
            NotificationPriority.URGENT: "#dc3545"
        }
        
        color = priority_color.get(notification.priority, "#0d6efd")
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: {color}; color: white; padding: 15px; border-radius: 5px 5px 0 0;">
                    <h2 style="margin: 0;">{notification.title}</h2>
                    <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">
                        {notification.notification_type.value.replace('_', ' ').title()} - 
                        {notification.created_at.strftime('%Y-%m-%d %H:%M')}
                    </p>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 5px 5px;">
                    <div style="background-color: white; padding: 15px; border-radius: 3px;">
                        {notification.body}
                    </div>
                    
                    {self._format_notification_data(notification.data)}
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background-color: #e9ecef; border-radius: 5px; font-size: 12px; color: #6c757d;">
                    <p style="margin: 0;">This is an automated message from Aria ERP System.</p>
                    <p style="margin: 5px 0 0 0;">For assistance, contact: support@vantax.co.za</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _format_notification_data(self, data: Dict[str, Any]) -> str:
        """Format additional data as HTML"""
        if not data:
            return ""
        
        html = '<div style="margin-top: 15px; padding: 10px; background-color: #e7f3ff; border-left: 3px solid #0d6efd; border-radius: 3px;">'
        html += '<h4 style="margin-top: 0;">Additional Details:</h4>'
        html += '<table style="width: 100%; font-size: 14px;">'
        
        for key, value in data.items():
            formatted_key = key.replace('_', ' ').title()
            html += f'<tr><td style="padding: 3px 10px 3px 0; font-weight: bold;">{formatted_key}:</td><td style="padding: 3px 0;">{value}</td></tr>'
        
        html += '</table>'
        html += '</div>'
        
        return html
    
    def _get_priority_emoji(self, priority: NotificationPriority) -> str:
        """Get emoji for priority level"""
        emojis = {
            NotificationPriority.LOW: "ℹ️",
            NotificationPriority.MEDIUM: "📋",
            NotificationPriority.HIGH: "⚠️",
            NotificationPriority.URGENT: "🚨"
        }
        return emojis.get(priority, "📬")
    
    def _extract_phone_number(self, recipient: str) -> Optional[str]:
        """Extract phone number from recipient string"""
        import re
        
        # If it's already a phone number
        if recipient.startswith('+') or recipient.startswith('27'):
            return recipient
        
        # If it's in parentheses (email with phone)
        match = re.search(r'\(([+\d]+)\)', recipient)
        if match:
            return match.group(1)
        
        # Not a phone number
        return None
    
    async def send_bot_summary(
        self,
        manager_email: str,
        bot_name: str,
        task_id: str,
        result: Dict[str, Any],
        exceptions: List[str]
    ):
        """Send bot execution summary to manager"""
        title = f"Bot Summary: {bot_name}"
        body = f"""
        <p>The {bot_name} has completed task <code>{task_id}</code>.</p>
        
        <h4>Result:</h4>
        <p>{result.get('summary', 'Task completed successfully')}</p>
        
        {f'''
        <h4>Exceptions:</h4>
        <ul>
            {"".join(f"<li>{exc}</li>" for exc in exceptions)}
        </ul>
        ''' if exceptions else ''}
        
        <p><a href="https://aria.vantax.co.za/tasks/{task_id}" style="display: inline-block; padding: 10px 20px; background-color: #0d6efd; color: white; text-decoration: none; border-radius: 3px;">View Details</a></p>
        """
        
        await self.send_notification(
            recipient=manager_email,
            channels=[NotificationChannel.EMAIL],
            notification_type=NotificationType.BOT_SUMMARY,
            priority=NotificationPriority.MEDIUM if not exceptions else NotificationPriority.HIGH,
            title=title,
            body=body,
            data={
                "bot_name": bot_name,
                "task_id": task_id,
                "exception_count": len(exceptions)
            }
        )
    
    async def send_approval_request(
        self,
        manager_email: str,
        manager_phone: Optional[str],
        document_type: str,
        reference: str,
        amount: float,
        reason: str,
        approval_url: str
    ):
        """Send approval request to manager"""
        title = f"Approval Required: {document_type} {reference}"
        body = f"""
        <p>A {document_type} requires your approval.</p>
        
        <table style="width: 100%; margin: 15px 0;">
            <tr><td style="font-weight: bold; padding: 5px 10px 5px 0;">Reference:</td><td style="padding: 5px 0;">{reference}</td></tr>
            <tr><td style="font-weight: bold; padding: 5px 10px 5px 0;">Amount:</td><td style="padding: 5px 0;">R {amount:,.2f}</td></tr>
            <tr><td style="font-weight: bold; padding: 5px 10px 5px 0;">Reason:</td><td style="padding: 5px 0;">{reason}</td></tr>
        </table>
        
        <p style="margin-top: 20px;">
            <a href="{approval_url}?action=approve" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 3px; margin-right: 10px;">✓ Approve</a>
            <a href="{approval_url}?action=reject" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 3px;">✗ Reject</a>
        </p>
        """
        
        channels = [NotificationChannel.EMAIL]
        if manager_phone:
            channels.append(NotificationChannel.WHATSAPP)
        
        await self.send_notification(
            recipient=manager_email,
            channels=channels,
            notification_type=NotificationType.APPROVAL_REQUEST,
            priority=NotificationPriority.HIGH,
            title=title,
            body=body,
            data={
                "document_type": document_type,
                "reference": reference,
                "amount": amount,
                "approval_url": approval_url
            }
        )
    
    async def send_exception_alert(
        self,
        admin_email: str,
        error_type: str,
        error_message: str,
        task_id: str,
        severity: str = "high"
    ):
        """Send exception/error alert to admin"""
        title = f"System Exception: {error_type}"
        body = f"""
        <p style="color: #dc3545; font-weight: bold;">An exception has occurred in the system.</p>
        
        <table style="width: 100%; margin: 15px 0;">
            <tr><td style="font-weight: bold; padding: 5px 10px 5px 0;">Task ID:</td><td style="padding: 5px 0;"><code>{task_id}</code></td></tr>
            <tr><td style="font-weight: bold; padding: 5px 10px 5px 0;">Error Type:</td><td style="padding: 5px 0;">{error_type}</td></tr>
            <tr><td style="font-weight: bold; padding: 5px 10px 5px 0;">Severity:</td><td style="padding: 5px 0;">{severity.upper()}</td></tr>
        </table>
        
        <div style="background-color: #f8d7da; border: 1px solid #f5c2c7; padding: 10px; border-radius: 3px; margin: 15px 0;">
            <code style="color: #842029;">{error_message}</code>
        </div>
        
        <p><a href="https://aria.vantax.co.za/admin/errors/{task_id}" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 3px;">View Error Details</a></p>
        """
        
        await self.send_notification(
            recipient=admin_email,
            channels=[NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
            notification_type=NotificationType.EXCEPTION_ALERT,
            priority=NotificationPriority.URGENT,
            title=title,
            body=body,
            data={
                "task_id": task_id,
                "error_type": error_type,
                "severity": severity
            }
        )
    
    async def send_daily_summary(
        self,
        executive_email: str,
        summary_data: Dict[str, Any]
    ):
        """Send daily summary to executives"""
        overview = summary_data.get("overview", {})
        
        title = f"Daily Summary - {summary_data.get('date')}"
        body = f"""
        <h3>Daily Operations Summary</h3>
        
        <div style="display: flex; gap: 15px; margin: 20px 0;">
            <div style="flex: 1; background-color: #d1ecf1; padding: 15px; border-radius: 5px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #0c5460;">{overview.get('total_transactions', 0)}</div>
                <div style="color: #0c5460;">Total Transactions</div>
            </div>
            <div style="flex: 1; background-color: #d4edda; padding: 15px; border-radius: 5px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #155724;">{overview.get('completed', 0)}</div>
                <div style="color: #155724;">Completed</div>
            </div>
            <div style="flex: 1; background-color: #f8d7da; padding: 15px; border-radius: 5px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #721c24;">{overview.get('failed', 0)}</div>
                <div style="color: #721c24;">Failed</div>
            </div>
            <div style="flex: 1; background-color: #fff3cd; padding: 15px; border-radius: 5px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #856404;">{overview.get('pending_approval', 0)}</div>
                <div style="color: #856404;">Pending Approval</div>
            </div>
        </div>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #e7f3ff; border-left: 4px solid #0d6efd; border-radius: 3px;">
            <div style="font-size: 24px; font-weight: bold; color: #0d6efd;">{overview.get('success_rate', 0)}%</div>
            <div>Success Rate</div>
        </div>
        
        {self._format_insights(summary_data.get('insights', []))}
        
        <p style="margin-top: 20px;">
            <a href="https://aria.vantax.co.za/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #0d6efd; color: white; text-decoration: none; border-radius: 3px;">View Full Dashboard</a>
        </p>
        """
        
        await self.send_notification(
            recipient=executive_email,
            channels=[NotificationChannel.EMAIL],
            notification_type=NotificationType.DAILY_SUMMARY,
            priority=NotificationPriority.MEDIUM,
            title=title,
            body=body,
            data=summary_data
        )
    
    def _format_insights(self, insights: List[str]) -> str:
        """Format insights as HTML"""
        if not insights:
            return ""
        
        html = '<h4>AI Insights:</h4><ul style="line-height: 1.8;">'
        for insight in insights:
            html += f'<li>{insight}</li>'
        html += '</ul>'
        
        return html


# Singleton instance
notification_system = NotificationSystem()
