"""
Unified Notification Service for Email, Slack, and Microsoft Teams.
"""
import logging
from typing import Optional, Dict
from datetime import datetime
import aiohttp
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.config import settings

logger = logging.getLogger(__name__)


class NotificationService:
    """Unified service for sending notifications across multiple channels."""
    
    async def notify_document_processed(
        self,
        document_id: int,
        filename: str,
        status: str,
        confidence: float,
        email_to: Optional[str] = None
    ):
        """
        Send notification when a document is processed.
        
        Args:
            document_id: Document ID
            filename: Document filename
            status: Processing status
            confidence: Confidence score
            email_to: Optional email recipient
        """
        message = f"Document '{filename}' (ID: {document_id}) processed with status: {status}"
        details = f"Confidence Score: {confidence:.2f}%"
        
        # Send to all configured channels
        await self._send_to_all_channels(
            title="Document Processed",
            message=message,
            details=details,
            email_to=email_to
        )
    
    async def notify_sap_posting(
        self,
        document_id: int,
        filename: str,
        sap_document_number: str,
        success: bool,
        error: Optional[str] = None,
        email_to: Optional[str] = None
    ):
        """Notify when document is posted to SAP."""
        if success:
            message = f"Document '{filename}' posted to SAP successfully"
            details = f"SAP Document Number: {sap_document_number}"
        else:
            message = f"Failed to post document '{filename}' to SAP"
            details = f"Error: {error}"
        
        await self._send_to_all_channels(
            title="SAP Posting Status",
            message=message,
            details=details,
            email_to=email_to
        )
    
    async def notify_error(
        self,
        title: str,
        error_message: str,
        document_id: Optional[int] = None,
        email_to: Optional[str] = None
    ):
        """Send error notification."""
        message = f"Error: {title}"
        details = error_message
        if document_id:
            details += f"\nDocument ID: {document_id}"
        
        await self._send_to_all_channels(
            title=f"⚠️ {title}",
            message=message,
            details=details,
            email_to=email_to
        )
    
    async def _send_to_all_channels(
        self,
        title: str,
        message: str,
        details: str,
        email_to: Optional[str] = None
    ):
        """Send notification to all configured channels."""
        # Send email
        if email_to and settings.SMTP_HOST:
            try:
                await self.send_email(email_to, title, f"{message}\n\n{details}")
            except Exception as e:
                logger.error(f"Failed to send email: {e}")
        
        # Send to Slack
        if settings.SLACK_ENABLED and settings.SLACK_BOT_TOKEN:
            try:
                await self.send_slack_message(title, message, details)
            except Exception as e:
                logger.error(f"Failed to send Slack message: {e}")
        
        # Send to Teams
        if settings.TEAMS_ENABLED and settings.TEAMS_WEBHOOK_URL:
            try:
                await self.send_teams_message(title, message, details)
            except Exception as e:
                logger.error(f"Failed to send Teams message: {e}")
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None
    ):
        """
        Send email notification.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Plain text body
            html_body: Optional HTML body
        """
        if not settings.SMTP_HOST:
            logger.warning("SMTP not configured, skipping email")
            return
        
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            msg['Date'] = datetime.utcnow().strftime('%a, %d %b %Y %H:%M:%S +0000')
            
            # Add plain text
            msg.attach(MIMEText(body, 'plain'))
            
            # Add HTML if provided
            if html_body:
                msg.attach(MIMEText(html_body, 'html'))
            
            # Send email
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Email sent to {to_email}")
            
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            raise
    
    async def send_slack_message(
        self,
        title: str,
        message: str,
        details: str
    ):
        """
        Send message to Slack channel.
        
        Args:
            title: Message title
            message: Main message
            details: Additional details
        """
        if not settings.SLACK_BOT_TOKEN:
            logger.warning("Slack not configured")
            return
        
        # Prepare Slack message with blocks
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": title
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{message}*\n\n{details}"
                }
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"ARIA | {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}"
                    }
                ]
            }
        ]
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bearer {settings.SLACK_BOT_TOKEN}',
                    'Content-Type': 'application/json'
                }
                
                payload = {
                    'channel': settings.SLACK_CHANNEL,
                    'blocks': blocks
                }
                
                async with session.post(
                    'https://slack.com/api/chat.postMessage',
                    headers=headers,
                    json=payload
                ) as response:
                    result = await response.json()
                    
                    if result.get('ok'):
                        logger.info(f"Slack message sent to {settings.SLACK_CHANNEL}")
                    else:
                        logger.error(f"Slack API error: {result.get('error')}")
        
        except Exception as e:
            logger.error(f"Error sending Slack message: {e}")
            raise
    
    async def send_teams_message(
        self,
        title: str,
        message: str,
        details: str
    ):
        """
        Send message to Microsoft Teams channel.
        
        Args:
            title: Message title
            message: Main message
            details: Additional details
        """
        if not settings.TEAMS_WEBHOOK_URL:
            logger.warning("Teams webhook not configured")
            return
        
        # Prepare Teams message card
        card = {
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "summary": title,
            "themeColor": "0078D4",
            "title": title,
            "sections": [
                {
                    "activityTitle": message,
                    "activitySubtitle": datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'),
                    "facts": [
                        {
                            "name": "Details",
                            "value": details
                        }
                    ],
                    "markdown": True
                }
            ]
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    settings.TEAMS_WEBHOOK_URL,
                    json=card
                ) as response:
                    if response.status == 200:
                        logger.info("Teams message sent successfully")
                    else:
                        logger.error(f"Teams webhook error: {response.status}")
        
        except Exception as e:
            logger.error(f"Error sending Teams message: {e}")
            raise


# Singleton instance
notification_service = NotificationService()
