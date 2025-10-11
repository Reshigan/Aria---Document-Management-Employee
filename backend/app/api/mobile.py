from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json

from ..database import get_db
from ..services.mobile_service import MobileService
from ..models.mobile import (
    MobileDevice, SyncSession, SyncItem, SyncConflict, OfflineDocument,
    MobileSettings, PushNotification, OfflineAction, MobileAnalytics,
    SyncPolicy, MobileSecurityLog, MobileAppVersion
)
from ..auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/mobile", tags=["mobile"])

# Device Management Endpoints
@router.post("/devices/register")
async def register_device(
    device_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register a new mobile device"""
    mobile_service = MobileService(db)
    
    try:
        device = mobile_service.register_device(current_user.id, device_data)
        return {
            "success": True,
            "device": {
                "id": device.id,
                "device_id": device.device_id,
                "device_name": device.device_name,
                "device_type": device.device_type,
                "sync_enabled": device.sync_enabled,
                "registration_date": device.registration_date.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to register device: {str(e)}"
        )

@router.get("/devices")
async def get_user_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all devices for the current user"""
    mobile_service = MobileService(db)
    devices = mobile_service.get_user_devices(current_user.id)
    
    return {
        "success": True,
        "devices": [
            {
                "id": device.id,
                "device_id": device.device_id,
                "device_name": device.device_name,
                "device_type": device.device_type,
                "platform_version": device.platform_version,
                "app_version": device.app_version,
                "is_active": device.is_active,
                "last_seen": device.last_seen.isoformat() if device.last_seen else None,
                "sync_enabled": device.sync_enabled,
                "offline_storage_limit": device.offline_storage_limit
            }
            for device in devices
        ]
    }

@router.put("/devices/{device_id}")
async def update_device(
    device_id: int,
    device_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update device information"""
    mobile_service = MobileService(db)
    
    # Verify device belongs to user
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device not found or access denied"
        )
    
    device = mobile_service.update_device(device_id, device_data)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    return {
        "success": True,
        "device": {
            "id": device.id,
            "device_name": device.device_name,
            "sync_enabled": device.sync_enabled,
            "last_seen": device.last_seen.isoformat(),
            "updated_at": device.updated_at.isoformat()
        }
    }

@router.delete("/devices/{device_id}")
async def deactivate_device(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deactivate a device"""
    mobile_service = MobileService(db)
    
    # Verify device belongs to user
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device not found or access denied"
        )
    
    success = mobile_service.deactivate_device(device_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    return {"success": True, "message": "Device deactivated successfully"}

# Sync Management Endpoints
@router.post("/sync/start")
async def start_sync_session(
    device_id: int,
    sync_type: str = "incremental",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new sync session"""
    mobile_service = MobileService(db)
    
    # Verify device belongs to user
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device not found or access denied"
        )
    
    session = mobile_service.start_sync_session(device_id, sync_type)
    
    return {
        "success": True,
        "session": {
            "id": session.id,
            "session_id": session.session_id,
            "sync_type": session.sync_type,
            "status": session.status,
            "started_at": session.started_at.isoformat()
        }
    }

@router.post("/sync/{session_id}/items")
async def add_sync_items(
    session_id: int,
    items: List[Dict[str, Any]],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add items to sync session"""
    mobile_service = MobileService(db)
    
    # Verify session belongs to user's device
    session = db.query(SyncSession).filter(SyncSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sync session not found"
        )
    
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == session.device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    sync_items = mobile_service.add_sync_items(session_id, items)
    
    return {
        "success": True,
        "items_added": len(sync_items),
        "session_id": session_id
    }

@router.get("/sync/{session_id}/items")
async def get_sync_items(
    session_id: int,
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get sync items for a session"""
    mobile_service = MobileService(db)
    
    # Verify session belongs to user's device
    session = db.query(SyncSession).filter(SyncSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sync session not found"
        )
    
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == session.device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if status == "pending":
        items = mobile_service.get_pending_sync_items(session_id)
    else:
        query = db.query(SyncItem).filter(SyncItem.session_id == session_id)
        if status:
            query = query.filter(SyncItem.status == status)
        items = query.all()
    
    return {
        "success": True,
        "items": [
            {
                "id": item.id,
                "item_type": item.item_type,
                "item_id": item.item_id,
                "action": item.action,
                "status": item.status,
                "priority": item.priority,
                "retry_count": item.retry_count,
                "error_message": item.error_message,
                "size_bytes": item.size_bytes,
                "created_at": item.created_at.isoformat()
            }
            for item in items
        ]
    }

@router.put("/sync/items/{item_id}/status")
async def update_sync_item_status(
    item_id: int,
    status_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update sync item status"""
    mobile_service = MobileService(db)
    
    # Verify item belongs to user's device
    item = db.query(SyncItem).filter(SyncItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sync item not found"
        )
    
    session = db.query(SyncSession).filter(SyncSession.id == item.session_id).first()
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == session.device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    success = mobile_service.update_sync_item_status(
        item_id,
        status_data.get('status'),
        status_data.get('error_message')
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update sync item status"
        )
    
    return {"success": True, "message": "Sync item status updated"}

@router.post("/sync/{session_id}/complete")
async def complete_sync_session(
    session_id: int,
    completion_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete a sync session"""
    mobile_service = MobileService(db)
    
    # Verify session belongs to user's device
    session = db.query(SyncSession).filter(SyncSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sync session not found"
        )
    
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == session.device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    success = mobile_service.complete_sync_session(
        session_id,
        completion_data.get('status', 'completed')
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to complete sync session"
        )
    
    return {"success": True, "message": "Sync session completed"}

@router.get("/sync/sessions")
async def get_sync_sessions(
    device_id: int,
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get sync sessions for a device"""
    mobile_service = MobileService(db)
    
    # Verify device belongs to user
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device not found or access denied"
        )
    
    sessions = mobile_service.get_sync_sessions(device_id, limit)
    
    return {
        "success": True,
        "sessions": [
            {
                "id": session.id,
                "session_id": session.session_id,
                "sync_type": session.sync_type,
                "status": session.status,
                "started_at": session.started_at.isoformat(),
                "completed_at": session.completed_at.isoformat() if session.completed_at else None,
                "total_items": session.total_items,
                "synced_items": session.synced_items,
                "failed_items": session.failed_items,
                "data_transferred": session.data_transferred
            }
            for session in sessions
        ]
    }

# Offline Document Management
@router.post("/offline/documents")
async def queue_document_for_offline(
    document_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Queue a document for offline download"""
    mobile_service = MobileService(db)
    
    device_id = document_data.get('device_id')
    document_id = document_data.get('document_id')
    priority = document_data.get('priority', 0)
    
    # Verify device belongs to user
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device not found or access denied"
        )
    
    offline_doc = mobile_service.queue_document_for_offline(device_id, document_id, priority)
    
    return {
        "success": True,
        "offline_document": {
            "id": offline_doc.id,
            "document_id": offline_doc.document_id,
            "download_status": offline_doc.download_status,
            "download_priority": offline_doc.download_priority,
            "created_at": offline_doc.created_at.isoformat()
        }
    }

@router.get("/offline/documents")
async def get_offline_documents(
    device_id: int,
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get offline documents for a device"""
    mobile_service = MobileService(db)
    
    # Verify device belongs to user
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device not found or access denied"
        )
    
    offline_docs = mobile_service.get_offline_documents(device_id, status)
    
    return {
        "success": True,
        "documents": [
            {
                "id": doc.id,
                "document_id": doc.document_id,
                "download_status": doc.download_status,
                "download_priority": doc.download_priority,
                "file_size": doc.file_size,
                "downloaded_size": doc.downloaded_size,
                "local_path": doc.local_path,
                "expires_at": doc.expires_at.isoformat() if doc.expires_at else None,
                "created_at": doc.created_at.isoformat()
            }
            for doc in offline_docs
        ]
    }

@router.put("/offline/documents/{offline_doc_id}/status")
async def update_offline_document_status(
    offline_doc_id: int,
    status_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update offline document download status"""
    mobile_service = MobileService(db)
    
    # Verify offline document belongs to user's device
    offline_doc = db.query(OfflineDocument).filter(OfflineDocument.id == offline_doc_id).first()
    if not offline_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offline document not found"
        )
    
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == offline_doc.device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    success = mobile_service.update_offline_document_status(
        offline_doc_id,
        status_data.get('status'),
        status_data.get('downloaded_size'),
        status_data.get('local_path')
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update offline document status"
        )
    
    return {"success": True, "message": "Offline document status updated"}

# Settings Management
@router.get("/settings")
async def get_mobile_settings(
    device_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get mobile settings for user/device"""
    mobile_service = MobileService(db)
    
    if device_id:
        # Verify device belongs to user
        devices = mobile_service.get_user_devices(current_user.id)
        if not any(d.id == device_id for d in devices):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Device not found or access denied"
            )
    
    settings = mobile_service.get_mobile_settings(current_user.id, device_id)
    
    return {
        "success": True,
        "settings": settings
    }

@router.put("/settings")
async def update_mobile_setting(
    setting_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a mobile setting"""
    mobile_service = MobileService(db)
    
    setting_key = setting_data.get('setting_key')
    setting_value = setting_data.get('setting_value')
    device_id = setting_data.get('device_id')
    
    if device_id:
        # Verify device belongs to user
        devices = mobile_service.get_user_devices(current_user.id)
        if not any(d.id == device_id for d in devices):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Device not found or access denied"
            )
    
    success = mobile_service.update_mobile_setting(
        current_user.id,
        setting_key,
        setting_value,
        device_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update setting"
        )
    
    return {"success": True, "message": "Setting updated successfully"}

# Push Notifications
@router.post("/notifications")
async def create_push_notification(
    notification_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a push notification"""
    mobile_service = MobileService(db)
    
    device_id = notification_data.get('device_id')
    
    # Verify device belongs to user
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device not found or access denied"
        )
    
    notification = mobile_service.create_push_notification(device_id, notification_data)
    
    return {
        "success": True,
        "notification": {
            "id": notification.id,
            "notification_type": notification.notification_type,
            "title": notification.title,
            "message": notification.message,
            "status": notification.status,
            "created_at": notification.created_at.isoformat()
        }
    }

@router.get("/notifications")
async def get_pending_notifications(
    device_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pending push notifications"""
    mobile_service = MobileService(db)
    
    if device_id:
        # Verify device belongs to user
        devices = mobile_service.get_user_devices(current_user.id)
        if not any(d.id == device_id for d in devices):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Device not found or access denied"
            )
    
    notifications = mobile_service.get_pending_notifications(device_id)
    
    return {
        "success": True,
        "notifications": [
            {
                "id": notification.id,
                "notification_type": notification.notification_type,
                "title": notification.title,
                "message": notification.message,
                "payload": notification.payload,
                "status": notification.status,
                "scheduled_at": notification.scheduled_at.isoformat() if notification.scheduled_at else None,
                "created_at": notification.created_at.isoformat()
            }
            for notification in notifications
        ]
    }

# Analytics
@router.post("/analytics/events")
async def log_mobile_event(
    event_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log a mobile analytics event"""
    mobile_service = MobileService(db)
    
    device_id = event_data.get('device_id')
    
    # Verify device belongs to user
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device not found or access denied"
        )
    
    event_data['user_id'] = current_user.id
    analytics = mobile_service.log_mobile_event(device_id, event_data)
    
    return {
        "success": True,
        "event_id": analytics.id
    }

@router.get("/analytics")
async def get_mobile_analytics(
    device_id: Optional[int] = Query(None),
    event_type: Optional[str] = Query(None),
    days: int = Query(30, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get mobile analytics data"""
    mobile_service = MobileService(db)
    
    if device_id:
        # Verify device belongs to user
        devices = mobile_service.get_user_devices(current_user.id)
        if not any(d.id == device_id for d in devices):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Device not found or access denied"
            )
    
    start_date = datetime.utcnow() - timedelta(days=days)
    analytics = mobile_service.get_mobile_analytics(device_id, event_type, start_date)
    
    return {
        "success": True,
        "events": [
            {
                "id": event.id,
                "event_type": event.event_type,
                "event_data": event.event_data,
                "session_id": event.session_id,
                "timestamp": event.timestamp.isoformat()
            }
            for event in analytics
        ]
    }

# App Version Management
@router.get("/app-version/check")
async def check_app_update(
    platform: str,
    current_version: str,
    db: Session = Depends(get_db)
):
    """Check if app update is available or required"""
    mobile_service = MobileService(db)
    
    update_info = mobile_service.check_app_update_required(platform, current_version)
    
    return {
        "success": True,
        **update_info
    }

@router.get("/app-version/latest")
async def get_latest_app_version(
    platform: str,
    db: Session = Depends(get_db)
):
    """Get the latest app version for a platform"""
    mobile_service = MobileService(db)
    
    latest_version = mobile_service.get_latest_app_version(platform)
    
    if not latest_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No app version found for platform"
        )
    
    return {
        "success": True,
        "version": {
            "version_number": latest_version.version_number,
            "platform": latest_version.platform,
            "build_number": latest_version.build_number,
            "release_date": latest_version.release_date.isoformat(),
            "is_required_update": latest_version.is_required_update,
            "download_url": latest_version.download_url,
            "release_notes": latest_version.release_notes,
            "file_size": latest_version.file_size
        }
    }

# Device Statistics
@router.get("/devices/{device_id}/storage")
async def get_device_storage_usage(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get storage usage statistics for a device"""
    mobile_service = MobileService(db)
    
    # Verify device belongs to user
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device not found or access denied"
        )
    
    storage_usage = mobile_service.get_device_storage_usage(device_id)
    
    return {
        "success": True,
        "storage_usage": storage_usage
    }

@router.get("/devices/{device_id}/sync-stats")
async def get_sync_statistics(
    device_id: int,
    days: int = Query(30, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get sync statistics for a device"""
    mobile_service = MobileService(db)
    
    # Verify device belongs to user
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device not found or access denied"
        )
    
    sync_stats = mobile_service.get_sync_statistics(device_id, days)
    
    return {
        "success": True,
        "sync_statistics": sync_stats
    }

# Conflict Resolution
@router.get("/sync/conflicts")
async def get_unresolved_conflicts(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get unresolved sync conflicts for a device"""
    mobile_service = MobileService(db)
    
    # Verify device belongs to user
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device not found or access denied"
        )
    
    conflicts = mobile_service.get_unresolved_conflicts(device_id)
    
    return {
        "success": True,
        "conflicts": [
            {
                "id": conflict.id,
                "item_type": conflict.item_type,
                "item_id": conflict.item_id,
                "conflict_type": conflict.conflict_type,
                "server_version": conflict.server_version,
                "client_version": conflict.client_version,
                "resolution_strategy": conflict.resolution_strategy,
                "created_at": conflict.created_at.isoformat()
            }
            for conflict in conflicts
        ]
    }

@router.post("/sync/conflicts/{conflict_id}/resolve")
async def resolve_conflict(
    conflict_id: int,
    resolution_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve a sync conflict"""
    mobile_service = MobileService(db)
    
    # Verify conflict belongs to user's device
    conflict = db.query(SyncConflict).filter(SyncConflict.id == conflict_id).first()
    if not conflict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conflict not found"
        )
    
    session = db.query(SyncSession).filter(SyncSession.id == conflict.session_id).first()
    devices = mobile_service.get_user_devices(current_user.id)
    if not any(d.id == session.device_id for d in devices):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    success = mobile_service.resolve_conflict(conflict_id, resolution_data, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to resolve conflict"
        )
    
    return {"success": True, "message": "Conflict resolved successfully"}