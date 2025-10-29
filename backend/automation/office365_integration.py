"""
Office 365 Email Integration for Aria
======================================

Integrates with Microsoft Graph API to:
1. Read emails from Aria's mailbox
2. Send emails as Aria
3. Download attachments
4. Mark emails as read/processed
5. Move emails to folders
6. Send calendar invites

Uses Microsoft Graph API with OAuth 2.0 authentication.

Requirements:
- Azure AD App Registration
- Microsoft Graph API permissions:
  * Mail.Read
  * Mail.ReadWrite
  * Mail.Send
  * Calendars.ReadWrite

Author: Aria ERP Team
Date: 2025-10-29
"""

from typing import List, Dict, Optional, Any
from datetime import datetime
import logging
import asyncio
import aiohttp
import base64
import mimetypes

logger = logging.getLogger(__name__)


class Office365Client:
    """
    Microsoft Graph API client for Office 365 email integration.
    
    Aria's mailbox: aria@yourdomain.com
    """
    
    def __init__(
        self,
        tenant_id: str,
        client_id: str,
        client_secret: str,
        mailbox_email: str = "aria@yourdomain.com"
    ):
        """
        Initialize Office 365 client.
        
        Args:
            tenant_id: Azure AD tenant ID
            client_id: App registration client ID
            client_secret: App registration client secret
            mailbox_email: Aria's email address
        """
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.mailbox_email = mailbox_email
        
        self.graph_api_endpoint = "https://graph.microsoft.com/v1.0"
        self.access_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None
    
    async def authenticate(self) -> bool:
        """
        Authenticate with Microsoft Graph API using client credentials flow.
        
        Returns:
            True if authentication successful
        """
        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(token_url, data=data) as response:
                    if response.status == 200:
                        result = await response.json()
                        self.access_token = result["access_token"]
                        expires_in = result.get("expires_in", 3600)
                        
                        from datetime import timedelta
                        self.token_expiry = datetime.now() + timedelta(seconds=expires_in)
                        
                        logger.info(f"O365: Successfully authenticated as {self.mailbox_email}")
                        return True
                    else:
                        logger.error(f"O365: Authentication failed: {response.status}")
                        return False
        except Exception as e:
            logger.error(f"O365: Authentication error: {str(e)}")
            return False
    
    async def _ensure_authenticated(self):
        """Ensure we have a valid access token"""
        if not self.access_token or (self.token_expiry and datetime.now() >= self.token_expiry):
            await self.authenticate()
    
    def _get_headers(self) -> Dict[str, str]:
        """Get HTTP headers with authorization"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    async def read_new_emails(
        self,
        folder: str = "inbox",
        max_emails: int = 10,
        mark_as_read: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Read new (unread) emails from Aria's mailbox.
        
        Args:
            folder: Email folder to read from (inbox, sent, drafts, etc.)
            max_emails: Maximum number of emails to retrieve
            mark_as_read: Whether to mark emails as read after retrieving
            
        Returns:
            List of email dictionaries
        """
        await self._ensure_authenticated()
        
        # Build URL with filters
        url = f"{self.graph_api_endpoint}/users/{self.mailbox_email}/mailFolders/{folder}/messages"
        params = {
            "$filter": "isRead eq false",
            "$top": max_emails,
            "$select": "id,subject,from,toRecipients,receivedDateTime,bodyPreview,body,hasAttachments",
            "$orderby": "receivedDateTime desc"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self._get_headers(), params=params) as response:
                    if response.status == 200:
                        result = await response.json()
                        emails = result.get("value", [])
                        
                        logger.info(f"O365: Retrieved {len(emails)} new emails")
                        
                        # Process each email
                        processed_emails = []
                        for email in emails:
                            processed = await self._process_email(email)
                            processed_emails.append(processed)
                            
                            # Mark as read if requested
                            if mark_as_read:
                                await self.mark_email_as_read(email["id"])
                        
                        return processed_emails
                    else:
                        logger.error(f"O365: Failed to read emails: {response.status}")
                        return []
        except Exception as e:
            logger.error(f"O365: Error reading emails: {str(e)}")
            return []
    
    async def _process_email(self, email: Dict[str, Any]) -> Dict[str, Any]:
        """Process a raw email from Graph API"""
        # Download attachments if any
        attachments = []
        if email.get("hasAttachments"):
            attachments = await self.get_email_attachments(email["id"])
        
        return {
            "id": email["id"],
            "subject": email.get("subject", ""),
            "from": {
                "name": email.get("from", {}).get("emailAddress", {}).get("name", ""),
                "email": email.get("from", {}).get("emailAddress", {}).get("address", "")
            },
            "to": [
                {
                    "name": recipient.get("emailAddress", {}).get("name", ""),
                    "email": recipient.get("emailAddress", {}).get("address", "")
                }
                for recipient in email.get("toRecipients", [])
            ],
            "received_at": email.get("receivedDateTime"),
            "body": email.get("body", {}).get("content", ""),
            "body_preview": email.get("bodyPreview", ""),
            "attachments": attachments
        }
    
    async def get_email_attachments(self, email_id: str) -> List[Dict[str, Any]]:
        """
        Get all attachments for an email.
        
        Args:
            email_id: The email message ID
            
        Returns:
            List of attachment dictionaries
        """
        await self._ensure_authenticated()
        
        url = f"{self.graph_api_endpoint}/users/{self.mailbox_email}/messages/{email_id}/attachments"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self._get_headers()) as response:
                    if response.status == 200:
                        result = await response.json()
                        attachments = result.get("value", [])
                        
                        processed_attachments = []
                        for attachment in attachments:
                            processed_attachments.append({
                                "id": attachment.get("id"),
                                "filename": attachment.get("name"),
                                "content_type": attachment.get("contentType"),
                                "size": attachment.get("size"),
                                "content_bytes": attachment.get("contentBytes"),  # Base64 encoded
                                "is_inline": attachment.get("isInline", False)
                            })
                        
                        logger.info(f"O365: Retrieved {len(processed_attachments)} attachments")
                        return processed_attachments
                    else:
                        logger.error(f"O365: Failed to get attachments: {response.status}")
                        return []
        except Exception as e:
            logger.error(f"O365: Error getting attachments: {str(e)}")
            return []
    
    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        is_html: bool = True
    ) -> bool:
        """
        Send an email as Aria.
        
        Args:
            to: List of recipient email addresses
            subject: Email subject
            body: Email body (HTML or plain text)
            cc: Optional CC recipients
            bcc: Optional BCC recipients
            attachments: Optional attachments
            is_html: Whether body is HTML
            
        Returns:
            True if email sent successfully
        """
        await self._ensure_authenticated()
        
        url = f"{self.graph_api_endpoint}/users/{self.mailbox_email}/sendMail"
        
        # Build email message
        message = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "HTML" if is_html else "Text",
                    "content": body
                },
                "toRecipients": [
                    {"emailAddress": {"address": email}} for email in to
                ]
            },
            "saveToSentItems": True
        }
        
        # Add CC if provided
        if cc:
            message["message"]["ccRecipients"] = [
                {"emailAddress": {"address": email}} for email in cc
            ]
        
        # Add BCC if provided
        if bcc:
            message["message"]["bccRecipients"] = [
                {"emailAddress": {"address": email}} for email in bcc
            ]
        
        # Add attachments if provided
        if attachments:
            message["message"]["attachments"] = []
            for attachment in attachments:
                message["message"]["attachments"].append({
                    "@odata.type": "#microsoft.graph.fileAttachment",
                    "name": attachment["filename"],
                    "contentBytes": attachment["content_bytes"],  # Base64 encoded
                    "contentType": attachment.get("content_type", "application/octet-stream")
                })
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=self._get_headers(), json=message) as response:
                    if response.status == 202:  # Accepted
                        logger.info(f"O365: Email sent successfully to {to}")
                        return True
                    else:
                        logger.error(f"O365: Failed to send email: {response.status}")
                        return False
        except Exception as e:
            logger.error(f"O365: Error sending email: {str(e)}")
            return False
    
    async def mark_email_as_read(self, email_id: str) -> bool:
        """
        Mark an email as read.
        
        Args:
            email_id: The email message ID
            
        Returns:
            True if successful
        """
        await self._ensure_authenticated()
        
        url = f"{self.graph_api_endpoint}/users/{self.mailbox_email}/messages/{email_id}"
        
        data = {"isRead": True}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.patch(url, headers=self._get_headers(), json=data) as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"O365: Error marking email as read: {str(e)}")
            return False
    
    async def move_email_to_folder(self, email_id: str, folder_name: str) -> bool:
        """
        Move an email to a specific folder.
        
        Args:
            email_id: The email message ID
            folder_name: Target folder name (e.g., "Processed", "Archive")
            
        Returns:
            True if successful
        """
        await self._ensure_authenticated()
        
        # First, get the folder ID
        folder_id = await self._get_folder_id(folder_name)
        if not folder_id:
            logger.error(f"O365: Folder '{folder_name}' not found")
            return False
        
        url = f"{self.graph_api_endpoint}/users/{self.mailbox_email}/messages/{email_id}/move"
        
        data = {"destinationId": folder_id}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=self._get_headers(), json=data) as response:
                    if response.status == 200:
                        logger.info(f"O365: Email moved to '{folder_name}'")
                        return True
                    return False
        except Exception as e:
            logger.error(f"O365: Error moving email: {str(e)}")
            return False
    
    async def _get_folder_id(self, folder_name: str) -> Optional[str]:
        """Get folder ID by name"""
        await self._ensure_authenticated()
        
        url = f"{self.graph_api_endpoint}/users/{self.mailbox_email}/mailFolders"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self._get_headers()) as response:
                    if response.status == 200:
                        result = await response.json()
                        folders = result.get("value", [])
                        
                        for folder in folders:
                            if folder.get("displayName", "").lower() == folder_name.lower():
                                return folder["id"]
                        
                        # If not found, create it
                        return await self._create_folder(folder_name)
        except Exception as e:
            logger.error(f"O365: Error getting folder ID: {str(e)}")
        
        return None
    
    async def _create_folder(self, folder_name: str) -> Optional[str]:
        """Create a new mail folder"""
        await self._ensure_authenticated()
        
        url = f"{self.graph_api_endpoint}/users/{self.mailbox_email}/mailFolders"
        
        data = {"displayName": folder_name}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=self._get_headers(), json=data) as response:
                    if response.status == 201:
                        result = await response.json()
                        logger.info(f"O365: Created folder '{folder_name}'")
                        return result["id"]
        except Exception as e:
            logger.error(f"O365: Error creating folder: {str(e)}")
        
        return None
    
    async def create_calendar_event(
        self,
        subject: str,
        start_time: datetime,
        end_time: datetime,
        attendees: List[str],
        body: Optional[str] = None,
        location: Optional[str] = None
    ) -> bool:
        """
        Create a calendar event in Aria's calendar.
        
        Useful for:
        - Meeting reminders
        - Deadline alerts
        - Approval timeouts
        
        Args:
            subject: Event subject
            start_time: Start datetime
            end_time: End datetime
            attendees: List of attendee email addresses
            body: Optional event description
            location: Optional location
            
        Returns:
            True if event created successfully
        """
        await self._ensure_authenticated()
        
        url = f"{self.graph_api_endpoint}/users/{self.mailbox_email}/calendar/events"
        
        event = {
            "subject": subject,
            "start": {
                "dateTime": start_time.isoformat(),
                "timeZone": "UTC"
            },
            "end": {
                "dateTime": end_time.isoformat(),
                "timeZone": "UTC"
            },
            "attendees": [
                {
                    "emailAddress": {"address": email},
                    "type": "required"
                }
                for email in attendees
            ]
        }
        
        if body:
            event["body"] = {"contentType": "HTML", "content": body}
        
        if location:
            event["location"] = {"displayName": location}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=self._get_headers(), json=event) as response:
                    if response.status == 201:
                        logger.info(f"O365: Calendar event created: {subject}")
                        return True
                    return False
        except Exception as e:
            logger.error(f"O365: Error creating calendar event: {str(e)}")
            return False


class EmailPoller:
    """
    Background service that polls Aria's mailbox for new emails
    and routes them to the controller bot.
    """
    
    def __init__(
        self,
        office365_client: Office365Client,
        poll_interval: int = 30,  # seconds
        process_callback = None
    ):
        """
        Initialize email poller.
        
        Args:
            office365_client: Configured Office365Client instance
            poll_interval: How often to check for new emails (seconds)
            process_callback: Async callback function to process emails
        """
        self.client = office365_client
        self.poll_interval = poll_interval
        self.process_callback = process_callback
        self.is_running = False
    
    async def start(self):
        """Start polling for emails"""
        self.is_running = True
        logger.info(f"Email Poller: Starting (interval: {self.poll_interval}s)")
        
        while self.is_running:
            try:
                # Read new emails
                emails = await self.client.read_new_emails(mark_as_read=True)
                
                if emails:
                    logger.info(f"Email Poller: Processing {len(emails)} new emails")
                    
                    # Process each email
                    for email in emails:
                        if self.process_callback:
                            try:
                                await self.process_callback(email)
                                
                                # Move to "Processed" folder
                                await self.client.move_email_to_folder(email["id"], "Processed")
                                
                            except Exception as e:
                                logger.error(f"Email Poller: Error processing email {email['id']}: {str(e)}")
                                # Move to "Errors" folder
                                await self.client.move_email_to_folder(email["id"], "Errors")
                
                # Wait before next poll
                await asyncio.sleep(self.poll_interval)
                
            except Exception as e:
                logger.error(f"Email Poller: Error in polling loop: {str(e)}")
                await asyncio.sleep(self.poll_interval)
    
    def stop(self):
        """Stop polling"""
        self.is_running = False
        logger.info("Email Poller: Stopped")


# Example usage and integration with Aria Controller
async def example_usage():
    """Example of how to use the Office 365 integration"""
    from automation.aria_controller import process_email
    
    # Initialize O365 client
    client = Office365Client(
        tenant_id="your-tenant-id",
        client_id="your-client-id",
        client_secret="your-client-secret",
        mailbox_email="aria@yourdomain.com"
    )
    
    # Authenticate
    await client.authenticate()
    
    # Option 1: Manual email check
    emails = await client.read_new_emails()
    for email in emails:
        await process_email(email)
    
    # Option 2: Start background poller
    poller = EmailPoller(client, poll_interval=30, process_callback=process_email)
    await poller.start()
