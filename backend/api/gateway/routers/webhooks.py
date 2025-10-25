"""
Webhook Management API
Create and manage webhooks for integrations
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, HttpUrl
import hmac
import hashlib

from core.database import get_db
from core.security import get_current_user
from models.user import User

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])


class WebhookCreate(BaseModel):
    name: str
    url: HttpUrl
    events: List[str]
    secret: Optional[str] = None


class WebhookResponse(BaseModel):
    id: str
    name: str
    url: str
    events: List[str]
    enabled: bool
    created_at: str


@router.post("/", response_model=WebhookResponse)
async def create_webhook(
    webhook: WebhookCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new webhook"""
    # TODO: Save to database
    from datetime import datetime
    return WebhookResponse(
        id=f"wh_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        name=webhook.name,
        url=str(webhook.url),
        events=webhook.events,
        enabled=True,
        created_at=datetime.now().isoformat()
    )


@router.get("/", response_model=List[WebhookResponse])
async def list_webhooks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all webhooks"""
    from datetime import datetime
    return [
        WebhookResponse(
            id="wh_001",
            name="Slack Notifications",
            url="https://hooks.slack.com/services/xxx",
            events=["document.uploaded", "bot.response"],
            enabled=True,
            created_at=datetime.now().isoformat()
        )
    ]


@router.post("/receive/{webhook_id}")
async def receive_webhook(
    webhook_id: str,
    request: Request
):
    """Receive incoming webhook"""
    body = await request.body()
    
    # Verify signature
    signature = request.headers.get("X-Webhook-Signature")
    # TODO: Verify signature with stored secret
    
    # Process webhook
    return {"success": True, "webhook_id": webhook_id}


@router.delete("/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete webhook"""
    return {"success": True, "deleted": webhook_id}


def sign_webhook_payload(payload: str, secret: str) -> str:
    """Sign webhook payload with HMAC"""
    return hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
