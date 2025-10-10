"""
Celery tasks for notifications.
"""
import logging
from typing import Optional
from core.celery_app import celery_app
from services.notifications.notification_service import notification_service

logger = logging.getLogger(__name__)


@celery_app.task(name='send_email_notification')
def send_email_task(to_email: str, subject: str, body: str, html_body: Optional[str] = None):
    """Send email notification as a background task."""
    import asyncio
    asyncio.run(
        notification_service.send_email(to_email, subject, body, html_body)
    )


@celery_app.task(name='send_slack_notification')
def send_slack_task(title: str, message: str, details: str):
    """Send Slack notification as a background task."""
    import asyncio
    asyncio.run(
        notification_service.send_slack_message(title, message, details)
    )


@celery_app.task(name='send_teams_notification')
def send_teams_task(title: str, message: str, details: str):
    """Send Teams notification as a background task."""
    import asyncio
    asyncio.run(
        notification_service.send_teams_message(title, message, details)
    )
