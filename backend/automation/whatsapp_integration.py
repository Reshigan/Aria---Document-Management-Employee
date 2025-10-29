"""
WhatsApp Business API Integration for Aria
===========================================

Integrates with WhatsApp Business API to:
1. Receive WhatsApp messages
2. Send WhatsApp messages
3. Send WhatsApp notifications
4. Handle media (documents, images)
5. Interactive buttons and lists

Uses WhatsApp Business Cloud API (Meta).

Requirements:
- Meta Business Account
- WhatsApp Business API access
- Phone number verification

Author: Aria ERP Team
Date: 2025-10-29
"""

from typing import List, Dict, Optional, Any
from datetime import datetime
import logging
import aiohttp
import json

logger = logging.getLogger(__name__)


class WhatsAppClient:
    """
    WhatsApp Business API client for Aria.
    
    Aria's WhatsApp: +27 XX XXX XXXX
    """
    
    def __init__(
        self,
        phone_number_id: str,
        access_token: str,
        business_account_id: str,
        webhook_verify_token: str = "aria_webhook_token"
    ):
        """
        Initialize WhatsApp client.
        
        Args:
            phone_number_id: WhatsApp Business phone number ID
            access_token: WhatsApp Business API access token
            business_account_id: Meta Business Account ID
            webhook_verify_token: Token for webhook verification
        """
        self.phone_number_id = phone_number_id
        self.access_token = access_token
        self.business_account_id = business_account_id
        self.webhook_verify_token = webhook_verify_token
        
        self.api_endpoint = f"https://graph.facebook.com/v18.0/{phone_number_id}"
    
    def _get_headers(self) -> Dict[str, str]:
        """Get HTTP headers with authorization"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    async def send_text_message(
        self,
        to: str,
        message: str,
        preview_url: bool = True
    ) -> bool:
        """
        Send a text message.
        
        Args:
            to: Recipient phone number (format: 27821234567)
            message: Message text
            preview_url: Whether to show URL previews
            
        Returns:
            True if sent successfully
        """
        url = f"{self.api_endpoint}/messages"
        
        data = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {
                "preview_url": preview_url,
                "body": message
            }
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=self._get_headers(), json=data) as response:
                    if response.status == 200:
                        logger.info(f"WhatsApp: Message sent to {to}")
                        return True
                    else:
                        logger.error(f"WhatsApp: Failed to send message: {response.status}")
                        return False
        except Exception as e:
            logger.error(f"WhatsApp: Error sending message: {str(e)}")
            return False
    
    async def send_template_message(
        self,
        to: str,
        template_name: str,
        language_code: str = "en",
        parameters: Optional[List[str]] = None
    ) -> bool:
        """
        Send a template message (pre-approved by Meta).
        
        Templates are useful for notifications like:
        - "Your invoice {{1}} for {{2}} has been processed"
        - "Approval required for {{1}}"
        
        Args:
            to: Recipient phone number
            template_name: Template name (must be pre-approved)
            language_code: Language code (en, af, zu, etc.)
            parameters: Template parameter values
            
        Returns:
            True if sent successfully
        """
        url = f"{self.api_endpoint}/messages"
        
        components = []
        if parameters:
            components.append({
                "type": "body",
                "parameters": [
                    {"type": "text", "text": param}
                    for param in parameters
                ]
            })
        
        data = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
                "components": components
            }
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=self._get_headers(), json=data) as response:
                    if response.status == 200:
                        logger.info(f"WhatsApp: Template message sent to {to}")
                        return True
                    else:
                        logger.error(f"WhatsApp: Failed to send template: {response.status}")
                        return False
        except Exception as e:
            logger.error(f"WhatsApp: Error sending template: {str(e)}")
            return False
    
    async def send_document(
        self,
        to: str,
        document_url: str,
        filename: str,
        caption: Optional[str] = None
    ) -> bool:
        """
        Send a document (PDF, Excel, etc.).
        
        Args:
            to: Recipient phone number
            document_url: Public URL of the document
            filename: Document filename
            caption: Optional caption
            
        Returns:
            True if sent successfully
        """
        url = f"{self.api_endpoint}/messages"
        
        data = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "document",
            "document": {
                "link": document_url,
                "filename": filename
            }
        }
        
        if caption:
            data["document"]["caption"] = caption
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=self._get_headers(), json=data) as response:
                    if response.status == 200:
                        logger.info(f"WhatsApp: Document sent to {to}")
                        return True
                    return False
        except Exception as e:
            logger.error(f"WhatsApp: Error sending document: {str(e)}")
            return False
    
    async def send_interactive_buttons(
        self,
        to: str,
        body_text: str,
        buttons: List[Dict[str, str]]
    ) -> bool:
        """
        Send interactive message with buttons.
        
        Example use case:
        - "Invoice #12345 requires approval"
        - Buttons: [Approve] [Reject] [View Details]
        
        Args:
            to: Recipient phone number
            body_text: Message text
            buttons: List of buttons (max 3), each with "id" and "title"
            
        Returns:
            True if sent successfully
        """
        url = f"{self.api_endpoint}/messages"
        
        data = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body_text},
                "action": {
                    "buttons": [
                        {
                            "type": "reply",
                            "reply": {
                                "id": btn["id"],
                                "title": btn["title"]
                            }
                        }
                        for btn in buttons[:3]  # Max 3 buttons
                    ]
                }
            }
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=self._get_headers(), json=data) as response:
                    if response.status == 200:
                        logger.info(f"WhatsApp: Interactive message sent to {to}")
                        return True
                    return False
        except Exception as e:
            logger.error(f"WhatsApp: Error sending interactive message: {str(e)}")
            return False
    
    def process_webhook(self, webhook_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Process incoming webhook from WhatsApp.
        
        Args:
            webhook_data: Webhook payload from WhatsApp
            
        Returns:
            Processed message data or None
        """
        try:
            entry = webhook_data.get("entry", [])[0]
            changes = entry.get("changes", [])[0]
            value = changes.get("value", {})
            
            # Check if this is a message
            messages = value.get("messages", [])
            if not messages:
                return None
            
            message = messages[0]
            
            # Extract message details
            from_number = message.get("from")
            message_type = message.get("type")
            message_id = message.get("id")
            timestamp = message.get("timestamp")
            
            # Extract content based on type
            content = None
            if message_type == "text":
                content = message.get("text", {}).get("body")
            elif message_type == "document":
                content = message.get("document", {})
            elif message_type == "image":
                content = message.get("image", {})
            elif message_type == "button":
                content = message.get("button", {}).get("text")
            
            # Get contact info
            contacts = value.get("contacts", [])
            contact_name = contacts[0].get("profile", {}).get("name") if contacts else "Unknown"
            
            return {
                "id": message_id,
                "from": {
                    "phone": from_number,
                    "name": contact_name
                },
                "type": message_type,
                "text": content if message_type == "text" else None,
                "media": content if message_type in ["document", "image", "video"] else None,
                "timestamp": datetime.fromtimestamp(int(timestamp)),
                "raw": message
            }
            
        except Exception as e:
            logger.error(f"WhatsApp: Error processing webhook: {str(e)}")
            return None
    
    async def mark_message_as_read(self, message_id: str) -> bool:
        """Mark a message as read"""
        url = f"{self.api_endpoint}/messages"
        
        data = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=self._get_headers(), json=data) as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"WhatsApp: Error marking message as read: {str(e)}")
            return False


# Pre-approved message templates for Aria
WHATSAPP_TEMPLATES = {
    "invoice_processed": {
        "name": "invoice_processed",
        "example": "Invoice INV-12345 for R15,000 has been processed successfully.",
        "parameters": ["invoice_number", "amount"]
    },
    "approval_required": {
        "name": "approval_required",
        "example": "Approval required for Invoice INV-12345 (R15,000). Please review.",
        "parameters": ["document_type", "reference", "amount"]
    },
    "exception_alert": {
        "name": "exception_alert",
        "example": "ALERT: Failed to process Invoice INV-12345. Reason: Supplier not found.",
        "parameters": ["document_type", "reference", "reason"]
    },
    "daily_summary": {
        "name": "daily_summary",
        "example": "Daily Summary: 45 transactions processed, 3 exceptions, 2 awaiting approval.",
        "parameters": ["total", "exceptions", "pending"]
    }
}


async def example_usage():
    """Example WhatsApp usage"""
    from automation.aria_controller import process_whatsapp
    
    client = WhatsAppClient(
        phone_number_id="your-phone-number-id",
        access_token="your-access-token",
        business_account_id="your-business-account-id"
    )
    
    # Send notification to manager
    await client.send_text_message(
        to="27821234567",
        message="🤖 Aria: Invoice INV-12345 (R15,000) has been processed. View details: https://aria.vantax.co.za/invoice/12345"
    )
    
    # Send approval request with buttons
    await client.send_interactive_buttons(
        to="27821234567",
        body_text="Invoice INV-12345 for R15,000 requires your approval.",
        buttons=[
            {"id": "approve_12345", "title": "✅ Approve"},
            {"id": "reject_12345", "title": "❌ Reject"},
            {"id": "view_12345", "title": "👁 View"}
        ]
    )
