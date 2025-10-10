from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from core.database import get_db
from dependencies import get_current_user
from models.user import User
from services.integration_service import IntegrationService
from schemas.integration_schemas import (
    IntegrationCreate, IntegrationUpdate, IntegrationResponse,
    TestConnectionRequest, TestConnectionResponse,
    SAPConnectionCreate, SAPConnectionUpdate, SAPConnectionResponse,
    EmailConfigurationCreate, EmailConfigurationUpdate, EmailConfigurationResponse,
    CloudStorageConnectionCreate, CloudStorageConnectionUpdate, CloudStorageConnectionResponse,
    SlackTeamsConnectionCreate, SlackTeamsConnectionUpdate, SlackTeamsConnectionResponse,
    WebhookEndpointCreate, WebhookEndpointUpdate, WebhookEndpointResponse,
    IntegrationSyncLogResponse, WebhookDeliveryResponse,
    EmailSendRequest, EmailSendResponse,
    NotificationSendRequest, NotificationSendResponse,
    SyncRequest, SyncResponse
)

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

# Integration CRUD
@router.post("/", response_model=IntegrationResponse)
async def create_integration(
    integration_data: IntegrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new integration"""
    service = IntegrationService(db)
    integration = service.create_integration(integration_data, current_user.id)
    return integration

@router.get("/", response_model=List[IntegrationResponse])
async def get_integrations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all integrations for the current user"""
    service = IntegrationService(db)
    integrations = service.get_integrations(current_user.id, skip, limit)
    return integrations

@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific integration"""
    service = IntegrationService(db)
    integration = service.get_integration(integration_id, current_user.id)
    return integration

@router.put("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: int,
    integration_data: IntegrationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an integration"""
    service = IntegrationService(db)
    integration = service.update_integration(integration_id, integration_data, current_user.id)
    return integration

@router.delete("/{integration_id}")
async def delete_integration(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an integration"""
    service = IntegrationService(db)
    service.delete_integration(integration_id, current_user.id)
    return {"message": "Integration deleted successfully"}

# Test connection
@router.post("/test-connection", response_model=TestConnectionResponse)
async def test_connection(
    test_data: TestConnectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Test connection to external service"""
    service = IntegrationService(db)
    result = await service.test_connection(test_data)
    return result

# SAP Integration
@router.post("/{integration_id}/sap", response_model=SAPConnectionResponse)
async def create_sap_connection(
    integration_id: int,
    sap_config: SAPConnectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create SAP connection configuration"""
    service = IntegrationService(db)
    # Verify integration ownership
    service.get_integration(integration_id, current_user.id)
    
    # Create SAP connection (implementation would go here)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="SAP integration not yet implemented"
    )

# Email Integration
@router.post("/{integration_id}/email", response_model=EmailConfigurationResponse)
async def create_email_configuration(
    integration_id: int,
    email_config: EmailConfigurationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create email configuration"""
    service = IntegrationService(db)
    # Verify integration ownership
    service.get_integration(integration_id, current_user.id)
    
    email_configuration = service.create_email_configuration(integration_id, email_config)
    return email_configuration

@router.post("/{integration_id}/email/send", response_model=EmailSendResponse)
async def send_email(
    integration_id: int,
    email_request: EmailSendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send email through configured SMTP"""
    service = IntegrationService(db)
    # Verify integration ownership
    service.get_integration(integration_id, current_user.id)
    
    result = await service.send_email(integration_id, email_request)
    return result

# Cloud Storage Integration
@router.post("/{integration_id}/cloud-storage", response_model=CloudStorageConnectionResponse)
async def create_cloud_storage_connection(
    integration_id: int,
    storage_config: CloudStorageConnectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create cloud storage connection"""
    service = IntegrationService(db)
    # Verify integration ownership
    service.get_integration(integration_id, current_user.id)
    
    # Create cloud storage connection (implementation would go here)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Cloud storage integration not yet implemented"
    )

# Slack/Teams Integration
@router.post("/{integration_id}/messaging", response_model=SlackTeamsConnectionResponse)
async def create_messaging_connection(
    integration_id: int,
    messaging_config: SlackTeamsConnectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create Slack/Teams connection"""
    service = IntegrationService(db)
    # Verify integration ownership
    service.get_integration(integration_id, current_user.id)
    
    # Create messaging connection (implementation would go here)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Messaging integration not yet implemented"
    )

@router.post("/{integration_id}/messaging/send", response_model=NotificationSendResponse)
async def send_notification(
    integration_id: int,
    notification_request: NotificationSendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send notification through Slack/Teams"""
    service = IntegrationService(db)
    # Verify integration ownership
    service.get_integration(integration_id, current_user.id)
    
    # Send notification (implementation would go here)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Messaging notification not yet implemented"
    )

# Webhook Integration
@router.post("/{integration_id}/webhooks", response_model=WebhookEndpointResponse)
async def create_webhook_endpoint(
    integration_id: int,
    webhook_data: WebhookEndpointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a webhook endpoint"""
    service = IntegrationService(db)
    # Verify integration ownership
    service.get_integration(integration_id, current_user.id)
    
    webhook = service.create_webhook_endpoint(integration_id, webhook_data, current_user.id)
    return webhook

@router.get("/{integration_id}/webhooks", response_model=List[WebhookEndpointResponse])
async def get_webhook_endpoints(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get webhook endpoints for an integration"""
    service = IntegrationService(db)
    # Verify integration ownership
    integration = service.get_integration(integration_id, current_user.id)
    
    return integration.webhooks

@router.get("/webhooks/{webhook_id}/deliveries", response_model=List[WebhookDeliveryResponse])
async def get_webhook_deliveries(
    webhook_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get webhook delivery logs"""
    service = IntegrationService(db)
    deliveries = service.get_webhook_deliveries(webhook_id, skip, limit)
    return deliveries

# Sync Operations
@router.post("/{integration_id}/sync", response_model=SyncResponse)
async def start_sync(
    integration_id: int,
    sync_request: SyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a sync operation"""
    service = IntegrationService(db)
    sync_log = service.start_sync(integration_id, sync_request, current_user.id)
    
    return SyncResponse(
        sync_id=sync_log.id,
        status=sync_log.status,
        message="Sync started successfully",
        started_at=sync_log.started_at
    )

@router.get("/{integration_id}/sync-logs", response_model=List[IntegrationSyncLogResponse])
async def get_sync_logs(
    integration_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get sync logs for an integration"""
    service = IntegrationService(db)
    sync_logs = service.get_sync_logs(integration_id, current_user.id, skip, limit)
    return sync_logs

# Integration Status and Health
@router.get("/{integration_id}/status")
async def get_integration_status(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get integration status and health information"""
    service = IntegrationService(db)
    integration = service.get_integration(integration_id, current_user.id)
    
    # Get recent sync logs
    recent_syncs = service.get_sync_logs(integration_id, current_user.id, 0, 5)
    
    # Calculate health metrics
    total_syncs = len(recent_syncs)
    successful_syncs = len([s for s in recent_syncs if s.status == "success"])
    success_rate = (successful_syncs / total_syncs * 100) if total_syncs > 0 else 0
    
    return {
        "integration_id": integration_id,
        "status": integration.status,
        "last_sync": integration.last_sync,
        "last_error": integration.last_error,
        "error_count": integration.error_count,
        "health_metrics": {
            "success_rate": success_rate,
            "total_syncs": total_syncs,
            "successful_syncs": successful_syncs
        },
        "recent_syncs": recent_syncs
    }

# Integration Statistics
@router.get("/statistics")
async def get_integration_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get integration statistics for the current user"""
    service = IntegrationService(db)
    integrations = service.get_integrations(current_user.id)
    
    # Calculate statistics
    total_integrations = len(integrations)
    active_integrations = len([i for i in integrations if i.status == "active"])
    inactive_integrations = len([i for i in integrations if i.status == "inactive"])
    error_integrations = len([i for i in integrations if i.status == "error"])
    
    # Group by type
    type_counts = {}
    for integration in integrations:
        type_counts[integration.type] = type_counts.get(integration.type, 0) + 1
    
    return {
        "total_integrations": total_integrations,
        "active_integrations": active_integrations,
        "inactive_integrations": inactive_integrations,
        "error_integrations": error_integrations,
        "integration_types": type_counts,
        "health_score": (active_integrations / total_integrations * 100) if total_integrations > 0 else 0
    }