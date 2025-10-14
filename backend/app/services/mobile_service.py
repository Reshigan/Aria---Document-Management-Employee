from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import hashlib
import uuid
import asyncio
from concurrent.futures import ThreadPoolExecutor

from ..models.mobile import (
    MobileDevice, SyncSession, SyncItem, SyncConflict, OfflineDocument,
    MobileSettings, PushNotification, OfflineAction, MobileAnalytics,
    SyncPolicy, MobileSecurityLog, MobileAppVersion,
    DeviceType, SyncStatus, ConflictResolution
)
from models.document import Document
from models.user import User

class MobileService:
    def __init__(self, db: Session):
        self.db = db
        self.executor = ThreadPoolExecutor(max_workers=10)

    # Device Management
    def register_device(self, user_id: int, device_data: Dict[str, Any]) -> MobileDevice:
        """Register a new mobile device"""
        device = MobileDevice(
            user_id=user_id,
            device_id=device_data.get('device_id'),
            device_name=device_data.get('device_name'),
            device_type=device_data.get('device_type'),
            platform_version=device_data.get('platform_version'),
            app_version=device_data.get('app_version'),
            push_token=device_data.get('push_token'),
            device_info=device_data.get('device_info', {}),
            sync_enabled=device_data.get('sync_enabled', True),
            offline_storage_limit=device_data.get('offline_storage_limit', 1073741824)
        )
        
        self.db.add(device)
        self.db.commit()
        self.db.refresh(device)
        
        # Create default sync policy
        self._create_default_sync_policy(device.id)
        
        return device

    def update_device(self, device_id: int, device_data: Dict[str, Any]) -> Optional[MobileDevice]:
        """Update device information"""
        device = self.db.query(MobileDevice).filter(MobileDevice.id == device_id).first()
        if not device:
            return None
            
        for key, value in device_data.items():
            if hasattr(device, key):
                setattr(device, key, value)
        
        device.last_seen = datetime.utcnow()
        device.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(device)
        return device

    def get_user_devices(self, user_id: int) -> List[MobileDevice]:
        """Get all devices for a user"""
        return self.db.query(MobileDevice).filter(
            MobileDevice.user_id == user_id,
            MobileDevice.is_active == True
        ).all()

    def deactivate_device(self, device_id: int) -> bool:
        """Deactivate a device"""
        device = self.db.query(MobileDevice).filter(MobileDevice.id == device_id).first()
        if not device:
            return False
            
        device.is_active = False
        device.updated_at = datetime.utcnow()
        
        self.db.commit()
        return True

    # Sync Management
    def start_sync_session(self, device_id: int, sync_type: str = "incremental") -> SyncSession:
        """Start a new sync session"""
        session_id = str(uuid.uuid4())
        
        session = SyncSession(
            device_id=device_id,
            session_id=session_id,
            sync_type=sync_type,
            status=SyncStatus.IN_PROGRESS.value,
            started_at=datetime.utcnow()
        )
        
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        
        return session

    def add_sync_items(self, session_id: int, items: List[Dict[str, Any]]) -> List[SyncItem]:
        """Add items to sync session"""
        sync_items = []
        
        for item_data in items:
            sync_item = SyncItem(
                session_id=session_id,
                item_type=item_data.get('item_type'),
                item_id=item_data.get('item_id'),
                action=item_data.get('action'),
                status='pending',
                priority=item_data.get('priority', 0),
                item_data=item_data.get('item_data', {}),
                checksum=item_data.get('checksum'),
                size_bytes=item_data.get('size_bytes', 0)
            )
            sync_items.append(sync_item)
        
        self.db.add_all(sync_items)
        self.db.commit()
        
        # Update session totals
        session = self.db.query(SyncSession).filter(SyncSession.id == session_id).first()
        if session:
            session.total_items = len(sync_items)
            self.db.commit()
        
        return sync_items

    def update_sync_item_status(self, item_id: int, status: str, error_message: str = None) -> bool:
        """Update sync item status"""
        sync_item = self.db.query(SyncItem).filter(SyncItem.id == item_id).first()
        if not sync_item:
            return False
            
        sync_item.status = status
        sync_item.updated_at = datetime.utcnow()
        
        if error_message:
            sync_item.error_message = error_message
            sync_item.retry_count += 1
        
        self.db.commit()
        
        # Update session progress
        self._update_session_progress(sync_item.session_id)
        
        return True

    def complete_sync_session(self, session_id: int, status: str = "completed") -> bool:
        """Complete a sync session"""
        session = self.db.query(SyncSession).filter(SyncSession.id == session_id).first()
        if not session:
            return False
            
        session.status = status
        session.completed_at = datetime.utcnow()
        session.updated_at = datetime.utcnow()
        
        # Calculate final statistics
        completed_items = self.db.query(SyncItem).filter(
            SyncItem.session_id == session_id,
            SyncItem.status == 'completed'
        ).count()
        
        failed_items = self.db.query(SyncItem).filter(
            SyncItem.session_id == session_id,
            SyncItem.status == 'failed'
        ).count()
        
        session.synced_items = completed_items
        session.failed_items = failed_items
        
        self.db.commit()
        return True

    def get_sync_sessions(self, device_id: int, limit: int = 50) -> List[SyncSession]:
        """Get sync sessions for a device"""
        return self.db.query(SyncSession).filter(
            SyncSession.device_id == device_id
        ).order_by(desc(SyncSession.started_at)).limit(limit).all()

    def get_pending_sync_items(self, session_id: int) -> List[SyncItem]:
        """Get pending sync items for a session"""
        return self.db.query(SyncItem).filter(
            SyncItem.session_id == session_id,
            SyncItem.status == 'pending'
        ).order_by(desc(SyncItem.priority), SyncItem.created_at).all()

    # Conflict Resolution
    def create_sync_conflict(self, session_id: int, conflict_data: Dict[str, Any]) -> SyncConflict:
        """Create a sync conflict"""
        conflict = SyncConflict(
            session_id=session_id,
            item_type=conflict_data.get('item_type'),
            item_id=conflict_data.get('item_id'),
            conflict_type=conflict_data.get('conflict_type'),
            server_version=conflict_data.get('server_version'),
            client_version=conflict_data.get('client_version'),
            resolution_strategy=conflict_data.get('resolution_strategy', ConflictResolution.MANUAL.value)
        )
        
        self.db.add(conflict)
        self.db.commit()
        self.db.refresh(conflict)
        
        return conflict

    def resolve_conflict(self, conflict_id: int, resolution_data: Dict[str, Any], resolved_by: int) -> bool:
        """Resolve a sync conflict"""
        conflict = self.db.query(SyncConflict).filter(SyncConflict.id == conflict_id).first()
        if not conflict:
            return False
            
        conflict.resolved = True
        conflict.resolved_at = datetime.utcnow()
        conflict.resolved_by = resolved_by
        conflict.resolution_data = resolution_data
        conflict.updated_at = datetime.utcnow()
        
        self.db.commit()
        return True

    def get_unresolved_conflicts(self, device_id: int) -> List[SyncConflict]:
        """Get unresolved conflicts for a device"""
        return self.db.query(SyncConflict).join(SyncSession).filter(
            SyncSession.device_id == device_id,
            SyncConflict.resolved == False
        ).all()

    # Offline Document Management
    def queue_document_for_offline(self, device_id: int, document_id: int, priority: int = 0) -> OfflineDocument:
        """Queue a document for offline download"""
        # Check if already queued
        existing = self.db.query(OfflineDocument).filter(
            OfflineDocument.device_id == device_id,
            OfflineDocument.document_id == document_id
        ).first()
        
        if existing:
            existing.download_priority = priority
            existing.updated_at = datetime.utcnow()
            self.db.commit()
            return existing
        
        offline_doc = OfflineDocument(
            device_id=device_id,
            document_id=document_id,
            download_status='pending',
            download_priority=priority
        )
        
        self.db.add(offline_doc)
        self.db.commit()
        self.db.refresh(offline_doc)
        
        return offline_doc

    def update_offline_document_status(self, offline_doc_id: int, status: str, 
                                     downloaded_size: int = None, local_path: str = None) -> bool:
        """Update offline document download status"""
        offline_doc = self.db.query(OfflineDocument).filter(OfflineDocument.id == offline_doc_id).first()
        if not offline_doc:
            return False
            
        offline_doc.download_status = status
        offline_doc.updated_at = datetime.utcnow()
        
        if downloaded_size is not None:
            offline_doc.downloaded_size = downloaded_size
            
        if local_path:
            offline_doc.local_path = local_path
            
        self.db.commit()
        return True

    def get_offline_documents(self, device_id: int, status: str = None) -> List[OfflineDocument]:
        """Get offline documents for a device"""
        query = self.db.query(OfflineDocument).filter(OfflineDocument.device_id == device_id)
        
        if status:
            query = query.filter(OfflineDocument.download_status == status)
            
        return query.order_by(desc(OfflineDocument.download_priority), OfflineDocument.created_at).all()

    def cleanup_expired_offline_documents(self, device_id: int) -> int:
        """Clean up expired offline documents"""
        expired_docs = self.db.query(OfflineDocument).filter(
            OfflineDocument.device_id == device_id,
            OfflineDocument.expires_at < datetime.utcnow()
        ).all()
        
        count = len(expired_docs)
        
        for doc in expired_docs:
            self.db.delete(doc)
            
        self.db.commit()
        return count

    # Settings Management
    def get_mobile_settings(self, user_id: int, device_id: int = None) -> Dict[str, Any]:
        """Get mobile settings for user/device"""
        query = self.db.query(MobileSettings).filter(MobileSettings.user_id == user_id)
        
        if device_id:
            query = query.filter(
                or_(
                    MobileSettings.device_id == device_id,
                    MobileSettings.is_device_specific == False
                )
            )
        else:
            query = query.filter(MobileSettings.is_device_specific == False)
            
        settings = query.all()
        
        result = {}
        for setting in settings:
            result[setting.setting_key] = setting.setting_value
            
        return result

    def update_mobile_setting(self, user_id: int, setting_key: str, setting_value: Any, 
                            device_id: int = None) -> bool:
        """Update a mobile setting"""
        setting = self.db.query(MobileSettings).filter(
            MobileSettings.user_id == user_id,
            MobileSettings.setting_key == setting_key,
            MobileSettings.device_id == device_id
        ).first()
        
        if setting:
            setting.setting_value = setting_value
            setting.updated_at = datetime.utcnow()
        else:
            setting = MobileSettings(
                user_id=user_id,
                device_id=device_id,
                setting_key=setting_key,
                setting_value=setting_value,
                is_device_specific=device_id is not None
            )
            self.db.add(setting)
            
        self.db.commit()
        return True

    # Push Notifications
    def create_push_notification(self, device_id: int, notification_data: Dict[str, Any]) -> PushNotification:
        """Create a push notification"""
        notification = PushNotification(
            device_id=device_id,
            notification_type=notification_data.get('notification_type'),
            title=notification_data.get('title'),
            message=notification_data.get('message'),
            payload=notification_data.get('payload', {}),
            status='pending',
            scheduled_at=notification_data.get('scheduled_at')
        )
        
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        
        return notification

    def get_pending_notifications(self, device_id: int = None) -> List[PushNotification]:
        """Get pending push notifications"""
        query = self.db.query(PushNotification).filter(
            PushNotification.status == 'pending',
            or_(
                PushNotification.scheduled_at.is_(None),
                PushNotification.scheduled_at <= datetime.utcnow()
            )
        )
        
        if device_id:
            query = query.filter(PushNotification.device_id == device_id)
            
        return query.order_by(PushNotification.created_at).all()

    def update_notification_status(self, notification_id: int, status: str, 
                                 error_message: str = None) -> bool:
        """Update push notification status"""
        notification = self.db.query(PushNotification).filter(
            PushNotification.id == notification_id
        ).first()
        
        if not notification:
            return False
            
        notification.status = status
        notification.updated_at = datetime.utcnow()
        
        if status == 'sent':
            notification.sent_at = datetime.utcnow()
        elif status == 'delivered':
            notification.delivered_at = datetime.utcnow()
        elif status == 'failed':
            notification.error_message = error_message
            notification.retry_count += 1
            
        self.db.commit()
        return True

    # Offline Actions
    def queue_offline_action(self, device_id: int, action_data: Dict[str, Any]) -> OfflineAction:
        """Queue an offline action for processing"""
        action = OfflineAction(
            device_id=device_id,
            action_type=action_data.get('action_type'),
            action_data=action_data.get('action_data'),
            status='pending',
            priority=action_data.get('priority', 0)
        )
        
        self.db.add(action)
        self.db.commit()
        self.db.refresh(action)
        
        return action

    def get_pending_offline_actions(self, device_id: int = None) -> List[OfflineAction]:
        """Get pending offline actions"""
        query = self.db.query(OfflineAction).filter(OfflineAction.status == 'pending')
        
        if device_id:
            query = query.filter(OfflineAction.device_id == device_id)
            
        return query.order_by(desc(OfflineAction.priority), OfflineAction.created_at).all()

    def process_offline_action(self, action_id: int) -> bool:
        """Process an offline action"""
        action = self.db.query(OfflineAction).filter(OfflineAction.id == action_id).first()
        if not action:
            return False
            
        action.status = 'processing'
        self.db.commit()
        
        try:
            # Process the action based on type
            success = self._execute_offline_action(action)
            
            if success:
                action.status = 'completed'
                action.processed_at = datetime.utcnow()
            else:
                action.status = 'failed'
                action.retry_count += 1
                
        except Exception as e:
            action.status = 'failed'
            action.error_message = str(e)
            action.retry_count += 1
            
        self.db.commit()
        return action.status == 'completed'

    # Analytics
    def log_mobile_event(self, device_id: int, event_data: Dict[str, Any]) -> MobileAnalytics:
        """Log a mobile analytics event"""
        analytics = MobileAnalytics(
            device_id=device_id,
            event_type=event_data.get('event_type'),
            event_data=event_data.get('event_data', {}),
            session_id=event_data.get('session_id'),
            user_id=event_data.get('user_id'),
            timestamp=event_data.get('timestamp', datetime.utcnow())
        )
        
        self.db.add(analytics)
        self.db.commit()
        self.db.refresh(analytics)
        
        return analytics

    def get_mobile_analytics(self, device_id: int = None, event_type: str = None, 
                           start_date: datetime = None, end_date: datetime = None) -> List[MobileAnalytics]:
        """Get mobile analytics data"""
        query = self.db.query(MobileAnalytics)
        
        if device_id:
            query = query.filter(MobileAnalytics.device_id == device_id)
            
        if event_type:
            query = query.filter(MobileAnalytics.event_type == event_type)
            
        if start_date:
            query = query.filter(MobileAnalytics.timestamp >= start_date)
            
        if end_date:
            query = query.filter(MobileAnalytics.timestamp <= end_date)
            
        return query.order_by(desc(MobileAnalytics.timestamp)).all()

    # Security
    def log_security_event(self, device_id: int, event_data: Dict[str, Any]) -> MobileSecurityLog:
        """Log a mobile security event"""
        security_log = MobileSecurityLog(
            device_id=device_id,
            event_type=event_data.get('event_type'),
            severity=event_data.get('severity', 'medium'),
            description=event_data.get('description'),
            ip_address=event_data.get('ip_address'),
            user_agent=event_data.get('user_agent'),
            location_data=event_data.get('location_data'),
            threat_indicators=event_data.get('threat_indicators'),
            action_taken=event_data.get('action_taken')
        )
        
        self.db.add(security_log)
        self.db.commit()
        self.db.refresh(security_log)
        
        return security_log

    def get_security_alerts(self, device_id: int = None, severity: str = None) -> List[MobileSecurityLog]:
        """Get mobile security alerts"""
        query = self.db.query(MobileSecurityLog).filter(MobileSecurityLog.resolved == False)
        
        if device_id:
            query = query.filter(MobileSecurityLog.device_id == device_id)
            
        if severity:
            query = query.filter(MobileSecurityLog.severity == severity)
            
        return query.order_by(desc(MobileSecurityLog.created_at)).all()

    # App Version Management
    def get_latest_app_version(self, platform: str) -> Optional[MobileAppVersion]:
        """Get the latest app version for a platform"""
        return self.db.query(MobileAppVersion).filter(
            MobileAppVersion.platform == platform,
            MobileAppVersion.is_active == True
        ).order_by(desc(MobileAppVersion.release_date)).first()

    def check_app_update_required(self, platform: str, current_version: str) -> Dict[str, Any]:
        """Check if app update is required"""
        latest_version = self.get_latest_app_version(platform)
        
        if not latest_version:
            return {"update_required": False}
            
        # Simple version comparison (should be more sophisticated in production)
        update_required = latest_version.is_required_update and current_version != latest_version.version_number
        update_available = current_version != latest_version.version_number
        
        return {
            "update_required": update_required,
            "update_available": update_available,
            "latest_version": latest_version.version_number,
            "download_url": latest_version.download_url,
            "release_notes": latest_version.release_notes
        }

    # Private Helper Methods
    def _create_default_sync_policy(self, device_id: int):
        """Create default sync policy for a device"""
        policy = SyncPolicy(
            name=f"Default Policy - Device {device_id}",
            description="Default sync policy for mobile device",
            policy_type="device",
            target_id=device_id,
            sync_frequency=30,  # 30 minutes
            auto_sync_enabled=True,
            wifi_only=False,
            battery_optimization=True,
            max_file_size=104857600,  # 100MB
            conflict_resolution=ConflictResolution.SERVER_WINS.value,
            retention_days=30
        )
        
        self.db.add(policy)
        self.db.commit()

    def _update_session_progress(self, session_id: int):
        """Update sync session progress"""
        session = self.db.query(SyncSession).filter(SyncSession.id == session_id).first()
        if not session:
            return
            
        completed_count = self.db.query(SyncItem).filter(
            SyncItem.session_id == session_id,
            SyncItem.status == 'completed'
        ).count()
        
        failed_count = self.db.query(SyncItem).filter(
            SyncItem.session_id == session_id,
            SyncItem.status == 'failed'
        ).count()
        
        session.synced_items = completed_count
        session.failed_items = failed_count
        session.updated_at = datetime.utcnow()
        
        self.db.commit()

    def _execute_offline_action(self, action: OfflineAction) -> bool:
        """Execute an offline action"""
        # This would contain the actual business logic for processing different action types
        # For now, we'll just return True as a placeholder
        return True

    # Utility Methods
    def get_device_storage_usage(self, device_id: int) -> Dict[str, Any]:
        """Get storage usage statistics for a device"""
        offline_docs = self.db.query(OfflineDocument).filter(
            OfflineDocument.device_id == device_id,
            OfflineDocument.download_status == 'completed'
        ).all()
        
        total_size = sum(doc.file_size or 0 for doc in offline_docs)
        document_count = len(offline_docs)
        
        device = self.db.query(MobileDevice).filter(MobileDevice.id == device_id).first()
        storage_limit = device.offline_storage_limit if device else 0
        
        return {
            "total_size": total_size,
            "document_count": document_count,
            "storage_limit": storage_limit,
            "usage_percentage": (total_size / storage_limit * 100) if storage_limit > 0 else 0
        }

    def get_sync_statistics(self, device_id: int, days: int = 30) -> Dict[str, Any]:
        """Get sync statistics for a device"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        sessions = self.db.query(SyncSession).filter(
            SyncSession.device_id == device_id,
            SyncSession.started_at >= start_date
        ).all()
        
        total_sessions = len(sessions)
        successful_sessions = len([s for s in sessions if s.status == SyncStatus.COMPLETED.value])
        failed_sessions = len([s for s in sessions if s.status == SyncStatus.FAILED.value])
        
        total_data_transferred = sum(s.data_transferred or 0 for s in sessions)
        
        return {
            "total_sessions": total_sessions,
            "successful_sessions": successful_sessions,
            "failed_sessions": failed_sessions,
            "success_rate": (successful_sessions / total_sessions * 100) if total_sessions > 0 else 0,
            "total_data_transferred": total_data_transferred
        }