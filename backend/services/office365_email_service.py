"""
Office365 Email Service with Microsoft Graph API Integration
Handles email polling, sending, and integration with Aria Controller
"""
import asyncio
import aiohttp
import logging
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class EmailMessage:
    """Email message data structure"""
    message_id: str
    thread_id: Optional[str]
    from_address: str
    to_address: str
    subject: str
    body: str
    body_html: Optional[str]
    attachments: List[Dict[str, Any]]
    received_at: datetime
    is_read: bool = False


class Office365EmailService:
    """
    Office365 Email Service using Microsoft Graph API
    
    Handles:
    - Authentication with OAuth 2.0
    - Polling mailbox for new emails
    - Sending emails
    - Processing attachments
    """
    
    def __init__(
        self,
        tenant_id: str,
        client_id: str,
        client_secret: str,
        mailbox: str = "aria@vantax.co.za"
    ):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.mailbox = mailbox
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        self.graph_api_base = "https://graph.microsoft.com/v1.0"
    
    async def authenticate(self) -> str:
        """
        Authenticate with Microsoft Graph API using OAuth 2.0 client credentials flow
        
        Returns:
            Access token
        """
        auth_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        
        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'scope': 'https://graph.microsoft.com/.default',
            'grant_type': 'client_credentials'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(auth_url, data=data) as response:
                    if response.status == 200:
                        result = await response.json()
                        self.access_token = result['access_token']
                        expires_in = result.get('expires_in', 3600)
                        self.token_expires_at = datetime.now() + timedelta(seconds=expires_in - 300)
                        logger.info(f"✅ Authenticated with Office365 for mailbox: {self.mailbox}")
                        return self.access_token
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Authentication failed: {response.status} - {error_text}")
                        raise Exception(f"Authentication failed: {response.status}")
        
        except Exception as e:
            logger.error(f"❌ Authentication error: {e}")
            raise
    
    async def ensure_authenticated(self):
        """Ensure we have a valid access token"""
        if not self.access_token or not self.token_expires_at or datetime.now() >= self.token_expires_at:
            await self.authenticate()
    
    async def fetch_unread_emails(self, limit: int = 50) -> List[EmailMessage]:
        """
        Fetch unread emails from mailbox
        
        Args:
            limit: Maximum number of emails to fetch
        
        Returns:
            List of EmailMessage objects
        """
        await self.ensure_authenticated()
        
        url = f"{self.graph_api_base}/users/{self.mailbox}/messages"
        params = {
            '$filter': 'isRead eq false',
            '$orderby': 'receivedDateTime desc',
            '$top': limit,
            '$select': 'id,conversationId,from,toRecipients,subject,bodyPreview,body,receivedDateTime,hasAttachments,isRead'
        }
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        emails = []
                        
                        for msg in result.get('value', []):
                            from_addr = msg.get('from', {}).get('emailAddress', {}).get('address', '')
                            to_addrs = msg.get('toRecipients', [])
                            to_addr = to_addrs[0].get('emailAddress', {}).get('address', '') if to_addrs else self.mailbox
                            
                            body_content = msg.get('body', {})
                            body_text = body_content.get('content', '')
                            body_html = body_text if body_content.get('contentType') == 'html' else None
                            
                            attachments = []
                            if msg.get('hasAttachments'):
                                attachments = await self.fetch_attachments(msg['id'])
                            
                            email = EmailMessage(
                                message_id=msg['id'],
                                thread_id=msg.get('conversationId'),
                                from_address=from_addr,
                                to_address=to_addr,
                                subject=msg.get('subject', ''),
                                body=msg.get('bodyPreview', ''),
                                body_html=body_html,
                                attachments=attachments,
                                received_at=datetime.fromisoformat(msg['receivedDateTime'].replace('Z', '+00:00')),
                                is_read=msg.get('isRead', False)
                            )
                            emails.append(email)
                        
                        logger.info(f"📧 Fetched {len(emails)} unread emails from {self.mailbox}")
                        return emails
                    
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Failed to fetch emails: {response.status} - {error_text}")
                        return []
        
        except Exception as e:
            logger.error(f"❌ Error fetching emails: {e}")
            return []
    
    async def fetch_attachments(self, message_id: str) -> List[Dict[str, Any]]:
        """
        Fetch attachments for a message
        
        Args:
            message_id: Message ID
        
        Returns:
            List of attachment metadata
        """
        await self.ensure_authenticated()
        
        url = f"{self.graph_api_base}/users/{self.mailbox}/messages/{message_id}/attachments"
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        attachments = []
                        
                        for att in result.get('value', []):
                            attachments.append({
                                'id': att.get('id'),
                                'name': att.get('name'),
                                'contentType': att.get('contentType'),
                                'size': att.get('size'),
                                'contentBytes': att.get('contentBytes')  # Base64 encoded
                            })
                        
                        return attachments
                    else:
                        logger.error(f"❌ Failed to fetch attachments: {response.status}")
                        return []
        
        except Exception as e:
            logger.error(f"❌ Error fetching attachments: {e}")
            return []
    
    async def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        cc: Optional[List[str]] = None,
        reply_to_message_id: Optional[str] = None
    ) -> bool:
        """
        Send email via Office365
        
        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body (plain text)
            cc: CC recipients (optional)
            reply_to_message_id: Message ID to reply to (optional)
        
        Returns:
            True if sent successfully, False otherwise
        """
        await self.ensure_authenticated()
        
        url = f"{self.graph_api_base}/users/{self.mailbox}/sendMail"
        
        message = {
            'message': {
                'subject': subject,
                'body': {
                    'contentType': 'Text',
                    'content': body
                },
                'toRecipients': [
                    {'emailAddress': {'address': to}}
                ]
            },
            'saveToSentItems': 'true'
        }
        
        if cc:
            message['message']['ccRecipients'] = [
                {'emailAddress': {'address': addr}} for addr in cc
            ]
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=message, headers=headers) as response:
                    if response.status == 202:
                        logger.info(f"✅ Email sent to {to}: {subject}")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Failed to send email: {response.status} - {error_text}")
                        return False
        
        except Exception as e:
            logger.error(f"❌ Error sending email: {e}")
            return False
    
    async def mark_as_read(self, message_id: str) -> bool:
        """
        Mark email as read
        
        Args:
            message_id: Message ID
        
        Returns:
            True if successful, False otherwise
        """
        await self.ensure_authenticated()
        
        url = f"{self.graph_api_base}/users/{self.mailbox}/messages/{message_id}"
        
        data = {'isRead': True}
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.patch(url, json=data, headers=headers) as response:
                    if response.status == 200:
                        logger.info(f"✅ Marked email {message_id} as read")
                        return True
                    else:
                        logger.error(f"❌ Failed to mark email as read: {response.status}")
                        return False
        
        except Exception as e:
            logger.error(f"❌ Error marking email as read: {e}")
            return False


_office365_service: Optional[Office365EmailService] = None


def get_office365_service() -> Office365EmailService:
    """Get or create Office365 email service instance"""
    global _office365_service
    
    if _office365_service is None:
        tenant_id = os.getenv('OFFICE365_TENANT_ID')
        client_id = os.getenv('OFFICE365_CLIENT_ID')
        client_secret = os.getenv('OFFICE365_CLIENT_SECRET')
        mailbox = os.getenv('OFFICE365_MAILBOX', 'aria@vantax.co.za')
        
        if not tenant_id or not client_id or not client_secret:
            raise ValueError("Office365 credentials not configured. Set OFFICE365_TENANT_ID, OFFICE365_CLIENT_ID, and OFFICE365_CLIENT_SECRET environment variables.")
        
        _office365_service = Office365EmailService(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
            mailbox=mailbox
        )
    
    return _office365_service
