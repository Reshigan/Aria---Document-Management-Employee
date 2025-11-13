"""
Email Service for ARIA ERP
Sends emails with PDF attachments using Office365/Microsoft Graph API
"""
import os
import logging
import httpx
import base64
from typing import List, Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class EmailAttachment:
    """Email attachment"""
    def __init__(self, filename: str, content: bytes, content_type: str = "application/pdf"):
        self.filename = filename
        self.content = content
        self.content_type = content_type


class EmailService:
    """
    Email service using Microsoft Graph API
    
    Credentials are loaded from environment variables:
    - OFFICE365_TENANT_ID
    - OFFICE365_CLIENT_ID
    - OFFICE365_CLIENT_SECRET
    - OFFICE365_FROM_EMAIL
    
    Configure these via Admin Settings in the ARIA ERP interface.
    """
    
    def __init__(self):
        self.tenant_id = os.getenv("OFFICE365_TENANT_ID")
        self.client_id = os.getenv("OFFICE365_CLIENT_ID")
        self.client_secret = os.getenv("OFFICE365_CLIENT_SECRET")
        self.from_email = os.getenv("OFFICE365_FROM_EMAIL", "aria@vantax.co.za")
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        
        if not all([self.tenant_id, self.client_id, self.client_secret]):
            logger.warning("Office365 credentials not configured. Email sending will fail. Configure via Admin Settings.")
    
    async def authenticate(self) -> str:
        """
        Authenticate with Microsoft Graph API using OAuth 2.0 client credentials flow
        
        Returns:
            Access token
        """
        if self.access_token and self.token_expires_at and datetime.now() < self.token_expires_at:
            return self.access_token
        
        auth_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(auth_url, data=data, timeout=30.0)
                
                if response.status_code != 200:
                    logger.error(f"Failed to authenticate with Office365: {response.text}")
                    raise Exception(f"Authentication failed: {response.text}")
                
                token_data = response.json()
                self.access_token = token_data["access_token"]
                expires_in = token_data.get("expires_in", 3600)
                
                from datetime import timedelta
                self.token_expires_at = datetime.now() + timedelta(seconds=expires_in - 300)
                
                logger.info("Successfully authenticated with Office365")
                return self.access_token
        
        except Exception as e:
            logger.error(f"Error authenticating with Office365: {e}")
            raise
    
    async def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[EmailAttachment]] = None,
        is_html: bool = True
    ) -> Dict[str, Any]:
        """
        Send email via Microsoft Graph API
        
        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body (HTML or plain text)
            cc: CC recipients (optional)
            bcc: BCC recipients (optional)
            attachments: List of EmailAttachment objects (optional)
            is_html: Whether body is HTML (default: True)
        
        Returns:
            dict with status and message_id
        """
        try:
            # Authenticate
            token = await self.authenticate()
            
            message = {
                "message": {
                    "subject": subject,
                    "body": {
                        "contentType": "HTML" if is_html else "Text",
                        "content": body
                    },
                    "toRecipients": [
                        {"emailAddress": {"address": to}}
                    ]
                },
                "saveToSentItems": "true"
            }
            
            if cc:
                message["message"]["ccRecipients"] = [
                    {"emailAddress": {"address": email}} for email in cc
                ]
            
            if bcc:
                message["message"]["bccRecipients"] = [
                    {"emailAddress": {"address": email}} for email in bcc
                ]
            
            if attachments:
                message["message"]["attachments"] = []
                for attachment in attachments:
                    content_base64 = base64.b64encode(attachment.content).decode('utf-8')
                    
                    message["message"]["attachments"].append({
                        "@odata.type": "#microsoft.graph.fileAttachment",
                        "name": attachment.filename,
                        "contentType": attachment.content_type,
                        "contentBytes": content_base64
                    })
            
            graph_url = f"https://graph.microsoft.com/v1.0/users/{self.from_email}/sendMail"
            
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    graph_url,
                    json=message,
                    headers=headers,
                    timeout=60.0
                )
                
                if response.status_code == 202:
                    logger.info(f"Email sent successfully to {to}: {subject}")
                    return {
                        "status": "sent",
                        "to": to,
                        "subject": subject,
                        "timestamp": datetime.now().isoformat()
                    }
                else:
                    logger.error(f"Failed to send email: {response.status_code} - {response.text}")
                    return {
                        "status": "failed",
                        "error": response.text,
                        "status_code": response.status_code
                    }
        
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def send_document_email(
        self,
        to: str,
        subject: str,
        body: str,
        document_name: str,
        document_pdf: bytes
    ) -> Dict[str, Any]:
        """
        Send email with PDF document attachment
        
        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body (HTML)
            document_name: Name of the PDF file (e.g., "Quote-QT001.pdf")
            document_pdf: PDF content as bytes
        
        Returns:
            dict with status
        """
        attachment = EmailAttachment(
            filename=document_name,
            content=document_pdf,
            content_type="application/pdf"
        )
        
        return await self.send_email(
            to=to,
            subject=subject,
            body=body,
            attachments=[attachment],
            is_html=True
        )


_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get or create global email service instance"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service


# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def test():
        service = EmailService()
        
        result = await service.send_email(
            to="test@example.com",
            subject="Test Email from ARIA",
            body="<h1>Hello!</h1><p>This is a test email from ARIA ERP.</p>"
        )
        print(f"Send result: {result}")
        
        pdf_content = b"%PDF-1.4\n%Test PDF content"
        result = await service.send_document_email(
            to="test@example.com",
            subject="Quote QT-001",
            body="<p>Please find attached your quote.</p>",
            document_name="Quote-QT001.pdf",
            document_pdf=pdf_content
        )
        print(f"Send with attachment result: {result}")
    
    asyncio.run(test())
