"""
Email Polling Service
Background service that polls Office365 mailbox and processes emails through Aria Controller
"""
import asyncio
import logging
from datetime import datetime
from typing import Optional

from services.office365_email_service import get_office365_service, EmailMessage
from modules.aria_email_integration import process_email_with_aria, EmailMessage as AriaEmailMessage

logger = logging.getLogger(__name__)


class EmailPollingService:
    """
    Background service that polls Office365 mailbox for new emails
    and processes them through Aria Controller
    """
    
    def __init__(self, poll_interval: int = 300):
        """
        Initialize email polling service
        
        Args:
            poll_interval: Polling interval in seconds (default: 300 = 5 minutes)
        """
        self.poll_interval = poll_interval
        self.is_running = False
        self.office365_service = get_office365_service()
    
    async def start(self):
        """Start the email polling service"""
        self.is_running = True
        logger.info(f"🚀 Starting email polling service (interval: {self.poll_interval}s)")
        
        while self.is_running:
            try:
                await self.poll_and_process()
            except Exception as e:
                logger.error(f"❌ Error in polling loop: {e}")
            
            await asyncio.sleep(self.poll_interval)
    
    async def stop(self):
        """Stop the email polling service"""
        self.is_running = False
        logger.info("🛑 Stopping email polling service")
    
    async def poll_and_process(self):
        """Poll mailbox and process new emails"""
        logger.info("📧 Polling mailbox for new emails...")
        
        try:
            emails = await self.office365_service.fetch_unread_emails(limit=50)
            
            if not emails:
                logger.info("✅ No new emails to process")
                return
            
            logger.info(f"📬 Found {len(emails)} unread emails")
            
            # Process each email
            for email in emails:
                try:
                    await self.process_email(email)
                except Exception as e:
                    logger.error(f"❌ Error processing email {email.message_id}: {e}")
        
        except Exception as e:
            logger.error(f"❌ Error polling mailbox: {e}")
    
    async def process_email(self, email: EmailMessage):
        """
        Process a single email through Aria Controller
        
        Args:
            email: Email message to process
        """
        logger.info(f"📨 Processing email from {email.from_address}: {email.subject}")
        
        try:
            aria_email = AriaEmailMessage(
                message_id=email.message_id,
                thread_id=email.thread_id,
                from_address=email.from_address,
                to_address=email.to_address,
                subject=email.subject,
                body=email.body,
                attachments=email.attachments,
                received_at=email.received_at
            )
            
            result = await process_email_with_aria(aria_email)
            
            if result['status'] in ['needs_more_info', 'success', 'error']:
                reply_sent = await self.office365_service.send_email(
                    to=result['reply_to'],
                    subject=result['subject'],
                    body=result['body'],
                    reply_to_message_id=email.message_id
                )
                
                if reply_sent:
                    logger.info(f"✅ Reply sent to {result['reply_to']}")
                else:
                    logger.error(f"❌ Failed to send reply to {result['reply_to']}")
            
            await self.office365_service.mark_as_read(email.message_id)
            
            logger.info(f"✅ Email processed successfully: {result['status']}")
        
        except Exception as e:
            logger.error(f"❌ Error processing email: {e}")
            raise


_polling_service: Optional[EmailPollingService] = None


def get_polling_service(poll_interval: int = 300) -> EmailPollingService:
    """Get or create email polling service instance"""
    global _polling_service
    
    if _polling_service is None:
        _polling_service = EmailPollingService(poll_interval=poll_interval)
    
    return _polling_service


async def start_email_polling(poll_interval: int = 300):
    """Start email polling service"""
    service = get_polling_service(poll_interval)
    await service.start()


async def stop_email_polling():
    """Stop email polling service"""
    service = get_polling_service()
    await service.stop()
