"""
Advanced Integrations System
Provides webhooks, Slack/Teams notifications, and email/SMS templates
"""
from typing import Dict, Any, List, Optional
import json
import requests
from datetime import datetime
import uuid
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException

class WebhookService:
    """Service for webhook integrations"""
    
    @classmethod
    def register_webhook(
        cls,
        db: Session,
        company_id: str,
        event_type: str,
        url: str,
        secret: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Register a webhook for an event type
        
        Args:
            db: Database session
            company_id: Company context
            event_type: Type of event (document.created, document.posted, etc.)
            url: Webhook URL
            secret: Optional secret for signature verification
            
        Returns:
            Dict with webhook details
        """
        try:
            webhook_id = str(uuid.uuid4())
            
            query = text("""
                INSERT INTO webhooks (
                    id, company_id, event_type, url, secret,
                    is_active, created_at
                )
                VALUES (
                    :id, :company_id, :event_type, :url, :secret,
                    true, NOW()
                )
                RETURNING id
            """)
            
            result = db.execute(query, {
                "id": webhook_id,
                "company_id": company_id,
                "event_type": event_type,
                "url": url,
                "secret": secret
            }).fetchone()
            
            db.commit()
            
            return {
                "id": str(result[0]),
                "event_type": event_type,
                "url": url,
                "is_active": True
            }
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to register webhook: {str(e)}")
    
    @classmethod
    def trigger_webhook(
        cls,
        webhook_url: str,
        event_type: str,
        payload: Dict[str, Any],
        secret: Optional[str] = None
    ) -> bool:
        """
        Trigger a webhook
        
        Args:
            webhook_url: URL to send webhook to
            event_type: Type of event
            payload: Event payload
            secret: Optional secret for signature
            
        Returns:
            True if successful
        """
        try:
            headers = {
                "Content-Type": "application/json",
                "X-Webhook-Event": event_type,
                "X-Webhook-Timestamp": datetime.utcnow().isoformat()
            }
            
            if secret:
                import hmac
                import hashlib
                signature = hmac.new(
                    secret.encode(),
                    json.dumps(payload).encode(),
                    hashlib.sha256
                ).hexdigest()
                headers["X-Webhook-Signature"] = signature
            
            response = requests.post(
                webhook_url,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            return response.status_code == 200
            
        except Exception as e:
            print(f"Webhook trigger failed: {str(e)}")
            return False

class SlackIntegration:
    """Service for Slack integrations"""
    
    @classmethod
    def send_message(
        cls,
        webhook_url: str,
        message: str,
        channel: Optional[str] = None,
        username: str = "Aria ERP",
        icon_emoji: str = ":robot_face:"
    ) -> bool:
        """
        Send a message to Slack
        
        Args:
            webhook_url: Slack webhook URL
            message: Message text
            channel: Optional channel override
            username: Bot username
            icon_emoji: Bot icon emoji
            
        Returns:
            True if successful
        """
        try:
            payload = {
                "text": message,
                "username": username,
                "icon_emoji": icon_emoji
            }
            
            if channel:
                payload["channel"] = channel
            
            response = requests.post(
                webhook_url,
                json=payload,
                timeout=10
            )
            
            return response.status_code == 200
            
        except Exception as e:
            print(f"Slack message failed: {str(e)}")
            return False
    
    @classmethod
    def send_rich_message(
        cls,
        webhook_url: str,
        title: str,
        text: str,
        fields: List[Dict[str, str]],
        color: str = "#2563eb"
    ) -> bool:
        """
        Send a rich formatted message to Slack
        
        Args:
            webhook_url: Slack webhook URL
            title: Message title
            text: Message text
            fields: List of field dicts with title and value
            color: Sidebar color
            
        Returns:
            True if successful
        """
        try:
            payload = {
                "attachments": [
                    {
                        "color": color,
                        "title": title,
                        "text": text,
                        "fields": fields,
                        "footer": "Aria ERP",
                        "ts": int(datetime.utcnow().timestamp())
                    }
                ]
            }
            
            response = requests.post(
                webhook_url,
                json=payload,
                timeout=10
            )
            
            return response.status_code == 200
            
        except Exception as e:
            print(f"Slack rich message failed: {str(e)}")
            return False

class TeamsIntegration:
    """Service for Microsoft Teams integrations"""
    
    @classmethod
    def send_message(
        cls,
        webhook_url: str,
        title: str,
        text: str,
        theme_color: str = "0078D4"
    ) -> bool:
        """
        Send a message to Microsoft Teams
        
        Args:
            webhook_url: Teams webhook URL
            title: Message title
            text: Message text
            theme_color: Theme color (hex without #)
            
        Returns:
            True if successful
        """
        try:
            payload = {
                "@type": "MessageCard",
                "@context": "https://schema.org/extensions",
                "summary": title,
                "themeColor": theme_color,
                "title": title,
                "text": text
            }
            
            response = requests.post(
                webhook_url,
                json=payload,
                timeout=10
            )
            
            return response.status_code == 200
            
        except Exception as e:
            print(f"Teams message failed: {str(e)}")
            return False
    
    @classmethod
    def send_card(
        cls,
        webhook_url: str,
        title: str,
        sections: List[Dict[str, Any]],
        actions: Optional[List[Dict[str, str]]] = None
    ) -> bool:
        """
        Send an adaptive card to Microsoft Teams
        
        Args:
            webhook_url: Teams webhook URL
            title: Card title
            sections: List of card sections
            actions: Optional list of action buttons
            
        Returns:
            True if successful
        """
        try:
            payload = {
                "@type": "MessageCard",
                "@context": "https://schema.org/extensions",
                "summary": title,
                "title": title,
                "sections": sections
            }
            
            if actions:
                payload["potentialAction"] = actions
            
            response = requests.post(
                webhook_url,
                json=payload,
                timeout=10
            )
            
            return response.status_code == 200
            
        except Exception as e:
            print(f"Teams card failed: {str(e)}")
            return False

class NotificationTemplates:
    """Pre-built notification templates"""
    
    @classmethod
    def document_approval_request(
        cls,
        document_type: str,
        document_number: str,
        amount: float,
        requester: str
    ) -> Dict[str, Any]:
        """
        Template for document approval request
        
        Returns:
            Dict with formatted message for different channels
        """
        return {
            "slack": {
                "title": f"Approval Required: {document_type}",
                "text": f"Document {document_number} requires approval",
                "fields": [
                    {"title": "Amount", "value": f"R {amount:,.2f}", "short": True},
                    {"title": "Requested by", "value": requester, "short": True}
                ],
                "color": "#f59e0b"
            },
            "teams": {
                "title": f"Approval Required: {document_type}",
                "text": f"Document {document_number} requires approval\n\n**Amount:** R {amount:,.2f}\n**Requested by:** {requester}",
                "theme_color": "f59e0b"
            },
            "email": {
                "subject": f"Approval Required: {document_type} {document_number}",
                "body": f"A new {document_type} ({document_number}) requires your approval.\n\nAmount: R {amount:,.2f}\nRequested by: {requester}"
            }
        }
    
    @classmethod
    def document_posted(
        cls,
        document_type: str,
        document_number: str,
        posted_by: str
    ) -> Dict[str, Any]:
        """
        Template for document posted notification
        
        Returns:
            Dict with formatted message for different channels
        """
        return {
            "slack": {
                "title": f"Document Posted: {document_type}",
                "text": f"Document {document_number} has been posted",
                "fields": [
                    {"title": "Posted by", "value": posted_by, "short": True}
                ],
                "color": "#10b981"
            },
            "teams": {
                "title": f"Document Posted: {document_type}",
                "text": f"Document {document_number} has been posted\n\n**Posted by:** {posted_by}",
                "theme_color": "10b981"
            },
            "email": {
                "subject": f"Document Posted: {document_type} {document_number}",
                "body": f"Document {document_number} has been posted.\n\nPosted by: {posted_by}"
            }
        }
    
    @classmethod
    def overdue_alert(
        cls,
        document_type: str,
        document_number: str,
        days_overdue: int,
        amount: float
    ) -> Dict[str, Any]:
        """
        Template for overdue alert
        
        Returns:
            Dict with formatted message for different channels
        """
        return {
            "slack": {
                "title": f"Overdue Alert: {document_type}",
                "text": f"Document {document_number} is {days_overdue} days overdue",
                "fields": [
                    {"title": "Amount", "value": f"R {amount:,.2f}", "short": True},
                    {"title": "Days Overdue", "value": str(days_overdue), "short": True}
                ],
                "color": "#dc2626"
            },
            "teams": {
                "title": f"Overdue Alert: {document_type}",
                "text": f"Document {document_number} is {days_overdue} days overdue\n\n**Amount:** R {amount:,.2f}",
                "theme_color": "dc2626"
            },
            "email": {
                "subject": f"Overdue Alert: {document_type} {document_number}",
                "body": f"Document {document_number} is {days_overdue} days overdue.\n\nAmount: R {amount:,.2f}"
            }
        }
