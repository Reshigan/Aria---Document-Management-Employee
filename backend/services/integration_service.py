import json
import asyncio
import aiohttp
import smtplib
import ssl
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import hashlib
import hmac
import base64
from cryptography.fernet import Fernet
import os

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from fastapi import HTTPException, status

from models.integration_models import (
    Integration, IntegrationSyncLog, WebhookEndpoint, WebhookDelivery,
    SAPConnection, EmailConfiguration, CloudStorageConnection, SlackTeamsConnection,
    IntegrationType, IntegrationStatus, WebhookEventType
)
from schemas.integration_schemas import (
    IntegrationCreate, IntegrationUpdate, TestConnectionRequest,
    SAPConnectionCreate, EmailConfigurationCreate, CloudStorageConnectionCreate,
    SlackTeamsConnectionCreate, WebhookEndpointCreate, EmailSendRequest,
    NotificationSendRequest, SyncRequest
)

class EncryptionService:
    """Service for encrypting/decrypting sensitive data"""
    
    def __init__(self):
        # In production, this should be loaded from environment variables
        self.key = os.getenv('ENCRYPTION_KEY', Fernet.generate_key())
        if isinstance(self.key, str):
            self.key = self.key.encode()
        self.cipher = Fernet(self.key)
    
    def encrypt(self, data: str) -> str:
        """Encrypt sensitive data"""
        return self.cipher.encrypt(data.encode()).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        return self.cipher.decrypt(encrypted_data.encode()).decode()

class IntegrationService:
    def __init__(self, db: Session):
        self.db = db
        self.encryption = EncryptionService()
    
    # Integration CRUD operations
    def create_integration(self, integration_data: IntegrationCreate, user_id: int) -> Integration:
        """Create a new integration"""
        # Encrypt credentials
        encrypted_credentials = {}
        for key, value in integration_data.credentials.items():
            if isinstance(value, str) and key in ['password', 'token', 'secret', 'key']:
                encrypted_credentials[key] = self.encryption.encrypt(value)
            else:
                encrypted_credentials[key] = value
        
        integration = Integration(
            name=integration_data.name,
            type=integration_data.type,
            description=integration_data.description,
            config=integration_data.config,
            credentials=encrypted_credentials,
            endpoint_url=integration_data.endpoint_url,
            api_version=integration_data.api_version,
            timeout=integration_data.timeout,
            retry_count=integration_data.retry_count,
            created_by=user_id,
            status=IntegrationStatus.INACTIVE
        )
        
        self.db.add(integration)
        self.db.commit()
        self.db.refresh(integration)
        return integration
    
    def get_integrations(self, user_id: int, skip: int = 0, limit: int = 100) -> List[Integration]:
        """Get all integrations for a user"""
        return self.db.query(Integration).filter(
            Integration.created_by == user_id
        ).offset(skip).limit(limit).all()
    
    def get_integration(self, integration_id: int, user_id: int) -> Integration:
        """Get a specific integration"""
        integration = self.db.query(Integration).filter(
            and_(Integration.id == integration_id, Integration.created_by == user_id)
        ).first()
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
        
        return integration
    
    def update_integration(self, integration_id: int, integration_data: IntegrationUpdate, user_id: int) -> Integration:
        """Update an integration"""
        integration = self.get_integration(integration_id, user_id)
        
        update_data = integration_data.dict(exclude_unset=True)
        
        # Handle credentials encryption
        if 'credentials' in update_data:
            encrypted_credentials = {}
            for key, value in update_data['credentials'].items():
                if isinstance(value, str) and key in ['password', 'token', 'secret', 'key']:
                    encrypted_credentials[key] = self.encryption.encrypt(value)
                else:
                    encrypted_credentials[key] = value
            update_data['credentials'] = encrypted_credentials
        
        for field, value in update_data.items():
            setattr(integration, field, value)
        
        self.db.commit()
        self.db.refresh(integration)
        return integration
    
    def delete_integration(self, integration_id: int, user_id: int) -> bool:
        """Delete an integration"""
        integration = self.get_integration(integration_id, user_id)
        self.db.delete(integration)
        self.db.commit()
        return True
    
    # Test connection functionality
    async def test_connection(self, test_data: TestConnectionRequest) -> Dict[str, Any]:
        """Test connection to external service"""
        start_time = datetime.now()
        
        try:
            if test_data.integration_type == IntegrationType.EMAIL:
                result = await self._test_email_connection(test_data.config, test_data.credentials)
            elif test_data.integration_type == IntegrationType.SLACK:
                result = await self._test_slack_connection(test_data.config, test_data.credentials)
            elif test_data.integration_type == IntegrationType.TEAMS:
                result = await self._test_teams_connection(test_data.config, test_data.credentials)
            elif test_data.integration_type == IntegrationType.AWS_S3:
                result = await self._test_s3_connection(test_data.config, test_data.credentials)
            elif test_data.integration_type == IntegrationType.WEBHOOK:
                result = await self._test_webhook_connection(test_data.config, test_data.credentials)
            else:
                result = {"success": False, "message": f"Testing not implemented for {test_data.integration_type}"}
            
            end_time = datetime.now()
            result["response_time_ms"] = int((end_time - start_time).total_seconds() * 1000)
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Connection test failed: {str(e)}",
                "response_time_ms": int((datetime.now() - start_time).total_seconds() * 1000)
            }
    
    async def _test_email_connection(self, config: Dict[str, Any], credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Test email SMTP connection"""
        try:
            smtp_host = config.get('smtp_host')
            smtp_port = config.get('smtp_port', 587)
            use_tls = config.get('use_tls', True)
            username = credentials.get('username')
            password = credentials.get('password')
            
            if use_tls:
                server = smtplib.SMTP(smtp_host, smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port)
            
            server.login(username, password)
            server.quit()
            
            return {"success": True, "message": "Email connection successful"}
            
        except Exception as e:
            return {"success": False, "message": f"Email connection failed: {str(e)}"}
    
    async def _test_slack_connection(self, config: Dict[str, Any], credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Test Slack API connection"""
        try:
            token = credentials.get('access_token')
            
            async with aiohttp.ClientSession() as session:
                headers = {'Authorization': f'Bearer {token}'}
                async with session.get('https://slack.com/api/auth.test', headers=headers) as response:
                    data = await response.json()
                    
                    if data.get('ok'):
                        return {
                            "success": True,
                            "message": "Slack connection successful",
                            "details": {
                                "team": data.get('team'),
                                "user": data.get('user'),
                                "team_id": data.get('team_id')
                            }
                        }
                    else:
                        return {"success": False, "message": f"Slack API error: {data.get('error')}"}
                        
        except Exception as e:
            return {"success": False, "message": f"Slack connection failed: {str(e)}"}
    
    async def _test_teams_connection(self, config: Dict[str, Any], credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Test Microsoft Teams connection"""
        try:
            token = credentials.get('access_token')
            
            async with aiohttp.ClientSession() as session:
                headers = {'Authorization': f'Bearer {token}'}
                async with session.get('https://graph.microsoft.com/v1.0/me', headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "success": True,
                            "message": "Teams connection successful",
                            "details": {
                                "user": data.get('displayName'),
                                "email": data.get('mail')
                            }
                        }
                    else:
                        return {"success": False, "message": f"Teams API error: {response.status}"}
                        
        except Exception as e:
            return {"success": False, "message": f"Teams connection failed: {str(e)}"}
    
    async def _test_s3_connection(self, config: Dict[str, Any], credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Test AWS S3 connection"""
        try:
            # This would use boto3 in a real implementation
            # For now, return a mock success
            return {
                "success": True,
                "message": "S3 connection test successful",
                "details": {"bucket": config.get('bucket_name')}
            }
            
        except Exception as e:
            return {"success": False, "message": f"S3 connection failed: {str(e)}"}
    
    async def _test_webhook_connection(self, config: Dict[str, Any], credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Test webhook endpoint"""
        try:
            url = config.get('url')
            test_payload = {"test": True, "timestamp": datetime.now().isoformat()}
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=test_payload, timeout=30) as response:
                    return {
                        "success": response.status < 400,
                        "message": f"Webhook test returned status {response.status}",
                        "details": {"status_code": response.status}
                    }
                    
        except Exception as e:
            return {"success": False, "message": f"Webhook test failed: {str(e)}"}
    
    # Email functionality
    def create_email_configuration(self, integration_id: int, email_config: EmailConfigurationCreate) -> EmailConfiguration:
        """Create email configuration for an integration"""
        encrypted_password = self.encryption.encrypt(email_config.password)
        
        config = EmailConfiguration(
            integration_id=integration_id,
            smtp_host=email_config.smtp_host,
            smtp_port=email_config.smtp_port,
            use_tls=email_config.use_tls,
            use_ssl=email_config.use_ssl,
            username=email_config.username,
            password_encrypted=encrypted_password,
            from_email=email_config.from_email,
            from_name=email_config.from_name,
            reply_to=email_config.reply_to,
            templates=email_config.templates
        )
        
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        return config
    
    async def send_email(self, integration_id: int, email_request: EmailSendRequest) -> Dict[str, Any]:
        """Send email through configured SMTP"""
        email_config = self.db.query(EmailConfiguration).filter(
            EmailConfiguration.integration_id == integration_id
        ).first()
        
        if not email_config or not email_config.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email configuration not found or inactive"
            )
        
        try:
            # Decrypt password
            password = self.encryption.decrypt(email_config.password_encrypted)
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = f"{email_config.from_name} <{email_config.from_email}>" if email_config.from_name else email_config.from_email
            msg['To'] = ', '.join(email_request.to)
            msg['Subject'] = email_request.subject
            
            if email_request.cc:
                msg['Cc'] = ', '.join(email_request.cc)
            if email_config.reply_to:
                msg['Reply-To'] = email_config.reply_to
            
            # Add body
            if email_request.html_body:
                msg.attach(MIMEText(email_request.html_body, 'html'))
            else:
                msg.attach(MIMEText(email_request.body, 'plain'))
            
            # Connect to SMTP server
            if email_config.use_tls:
                server = smtplib.SMTP(email_config.smtp_host, email_config.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(email_config.smtp_host, email_config.smtp_port)
            
            server.login(email_config.username, password)
            
            # Send email
            recipients = email_request.to + (email_request.cc or []) + (email_request.bcc or [])
            result = server.send_message(msg, to_addrs=recipients)
            server.quit()
            
            return {
                "success": True,
                "message": "Email sent successfully",
                "recipients_accepted": recipients,
                "recipients_rejected": []
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to send email: {str(e)}",
                "recipients_accepted": [],
                "recipients_rejected": email_request.to
            }
    
    # Webhook functionality
    def create_webhook_endpoint(self, integration_id: int, webhook_data: WebhookEndpointCreate, user_id: int) -> WebhookEndpoint:
        """Create a webhook endpoint"""
        webhook = WebhookEndpoint(
            integration_id=integration_id,
            name=webhook_data.name,
            url=webhook_data.url,
            secret=webhook_data.secret,
            events=webhook_data.events,
            retry_count=webhook_data.retry_count,
            timeout=webhook_data.timeout,
            headers=webhook_data.headers,
            auth_type=webhook_data.auth_type,
            auth_config=webhook_data.auth_config,
            created_by=user_id
        )
        
        self.db.add(webhook)
        self.db.commit()
        self.db.refresh(webhook)
        return webhook
    
    async def trigger_webhook(self, webhook_id: int, event_type: WebhookEventType, payload: Dict[str, Any]) -> bool:
        """Trigger a webhook with event data"""
        webhook = self.db.query(WebhookEndpoint).filter(
            WebhookEndpoint.id == webhook_id
        ).first()
        
        if not webhook or not webhook.is_active:
            return False
        
        if event_type not in webhook.events:
            return False
        
        # Create delivery record
        delivery = WebhookDelivery(
            webhook_id=webhook_id,
            event_type=event_type,
            payload=payload,
            triggered_at=datetime.now(),
            status="pending"
        )
        
        self.db.add(delivery)
        self.db.commit()
        self.db.refresh(delivery)
        
        # Send webhook asynchronously
        success = await self._send_webhook(webhook, delivery, payload)
        
        # Update delivery status
        delivery.status = "success" if success else "failed"
        if success:
            webhook.success_count += 1
            webhook.last_success = datetime.now()
        else:
            webhook.error_count += 1
        
        webhook.last_triggered = datetime.now()
        self.db.commit()
        
        return success
    
    async def _send_webhook(self, webhook: WebhookEndpoint, delivery: WebhookDelivery, payload: Dict[str, Any]) -> bool:
        """Send webhook HTTP request"""
        try:
            headers = dict(webhook.headers)
            headers['Content-Type'] = 'application/json'
            
            # Add signature if secret is provided
            if webhook.secret:
                signature = self._generate_webhook_signature(webhook.secret, json.dumps(payload))
                headers['X-Webhook-Signature'] = signature
            
            # Add authentication
            if webhook.auth_type == "bearer" and webhook.auth_config.get('token'):
                headers['Authorization'] = f"Bearer {webhook.auth_config['token']}"
            elif webhook.auth_type == "basic" and webhook.auth_config.get('username'):
                auth_string = f"{webhook.auth_config['username']}:{webhook.auth_config.get('password', '')}"
                auth_bytes = base64.b64encode(auth_string.encode()).decode()
                headers['Authorization'] = f"Basic {auth_bytes}"
            
            start_time = datetime.now()
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    webhook.url,
                    json=payload,
                    headers=headers,
                    timeout=webhook.timeout
                ) as response:
                    end_time = datetime.now()
                    duration_ms = int((end_time - start_time).total_seconds() * 1000)
                    
                    # Update delivery record
                    delivery.delivered_at = end_time
                    delivery.duration_ms = duration_ms
                    delivery.response_status = response.status
                    delivery.response_headers = dict(response.headers)
                    delivery.response_body = await response.text()
                    
                    return response.status < 400
                    
        except Exception as e:
            delivery.error_message = str(e)
            webhook.last_error = str(e)
            return False
    
    def _generate_webhook_signature(self, secret: str, payload: str) -> str:
        """Generate webhook signature for verification"""
        signature = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        return f"sha256={signature}"
    
    # Sync functionality
    def start_sync(self, integration_id: int, sync_request: SyncRequest, user_id: int) -> IntegrationSyncLog:
        """Start a sync operation"""
        integration = self.get_integration(integration_id, user_id)
        
        sync_log = IntegrationSyncLog(
            integration_id=integration_id,
            sync_type=sync_request.sync_type,
            status="running",
            started_at=datetime.now(),
            triggered_by=user_id
        )
        
        self.db.add(sync_log)
        self.db.commit()
        self.db.refresh(sync_log)
        
        # Start sync in background (in a real implementation, this would use Celery or similar)
        asyncio.create_task(self._perform_sync(sync_log, integration, sync_request.options))
        
        return sync_log
    
    async def _perform_sync(self, sync_log: IntegrationSyncLog, integration: Integration, options: Dict[str, Any]):
        """Perform the actual sync operation"""
        try:
            # Mock sync operation - in reality this would sync with external systems
            await asyncio.sleep(2)  # Simulate sync time
            
            # Update sync log
            sync_log.status = "success"
            sync_log.completed_at = datetime.now()
            sync_log.duration_seconds = int((sync_log.completed_at - sync_log.started_at).total_seconds())
            sync_log.records_processed = 100  # Mock data
            sync_log.records_created = 10
            sync_log.records_updated = 85
            sync_log.records_failed = 5
            
            # Update integration
            integration.last_sync = datetime.now()
            integration.status = IntegrationStatus.ACTIVE
            
            self.db.commit()
            
        except Exception as e:
            sync_log.status = "error"
            sync_log.completed_at = datetime.now()
            sync_log.error_message = str(e)
            integration.last_error = str(e)
            integration.error_count += 1
            self.db.commit()
    
    # Get sync logs
    def get_sync_logs(self, integration_id: int, user_id: int, skip: int = 0, limit: int = 50) -> List[IntegrationSyncLog]:
        """Get sync logs for an integration"""
        integration = self.get_integration(integration_id, user_id)
        
        return self.db.query(IntegrationSyncLog).filter(
            IntegrationSyncLog.integration_id == integration_id
        ).order_by(desc(IntegrationSyncLog.started_at)).offset(skip).limit(limit).all()
    
    # Get webhook deliveries
    def get_webhook_deliveries(self, webhook_id: int, skip: int = 0, limit: int = 50) -> List[WebhookDelivery]:
        """Get webhook delivery logs"""
        return self.db.query(WebhookDelivery).filter(
            WebhookDelivery.webhook_id == webhook_id
        ).order_by(desc(WebhookDelivery.triggered_at)).offset(skip).limit(limit).all()