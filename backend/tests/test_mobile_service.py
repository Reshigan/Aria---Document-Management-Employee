import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.user import User
from app.models.mobile import (
    MobileDevice, SyncSession, SyncItem, SyncConflict,
    OfflineDocument, MobileSettings, PushNotification,
    OfflineAction, MobileAnalytics, SyncPolicy,
    MobileSecurityLog, MobileAppVersion
)
from app.services.mobile_service import MobileService

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_mobile_service.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    yield session
    session.close()

@pytest.fixture
def mobile_service():
    return MobileService()

@pytest.fixture
def test_user(db_session):
    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password="hashed_password",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    yield user
    db_session.delete(user)
    db_session.commit()

@pytest.fixture
def test_device(db_session, test_user):
    device = MobileDevice(
        user_id=test_user.id,
        device_id="test_device_123",
        device_name="Test iPhone",
        device_type="ios",
        platform_version="iOS 16.5",
        app_version="1.0.0",
        is_active=True,
        sync_enabled=True,
        offline_storage_limit=2147483648,
        last_seen=datetime.utcnow()
    )
    db_session.add(device)
    db_session.commit()
    db_session.refresh(device)
    yield device
    db_session.delete(device)
    db_session.commit()

class TestMobileDeviceService:
    
    def test_register_device(self, mobile_service, db_session, test_user, setup_database):
        device_data = {
            "device_id": "new_device_456",
            "device_name": "Test Android",
            "device_type": "android",
            "platform_version": "Android 13",
            "app_version": "1.0.0",
            "push_token": "push_token_123",
            "device_info": {"model": "Pixel 7", "manufacturer": "Google"},
            "sync_enabled": True,
            "offline_storage_limit": 1073741824
        }
        
        device = mobile_service.register_device(db_session, test_user.id, device_data)
        
        assert device is not None
        assert device.device_name == "Test Android"
        assert device.device_type == "android"
        assert device.user_id == test_user.id
        assert device.is_active is True
    
    def test_get_user_devices(self, mobile_service, db_session, test_user, test_device, setup_database):
        devices = mobile_service.get_user_devices(db_session, test_user.id)
        
        assert len(devices) >= 1
        assert devices[0].device_name == "Test iPhone"
        assert devices[0].user_id == test_user.id
    
    def test_update_device(self, mobile_service, db_session, test_device, setup_database):
        updates = {
            "device_name": "Updated iPhone",
            "sync_enabled": False,
            "offline_storage_limit": 1073741824
        }
        
        updated_device = mobile_service.update_device(db_session, test_device.id, updates)
        
        assert updated_device.device_name == "Updated iPhone"
        assert updated_device.sync_enabled is False
        assert updated_device.offline_storage_limit == 1073741824
    
    def test_deactivate_device(self, mobile_service, db_session, test_device, setup_database):
        result = mobile_service.deactivate_device(db_session, test_device.id)
        
        assert result is True
        db_session.refresh(test_device)
        assert test_device.is_active is False
    
    def test_update_device_last_seen(self, mobile_service, db_session, test_device, setup_database):
        old_last_seen = test_device.last_seen
        mobile_service.update_device_last_seen(db_session, test_device.id)
        
        db_session.refresh(test_device)
        assert test_device.last_seen > old_last_seen

class TestSyncService:
    
    def test_create_sync_session(self, mobile_service, db_session, test_device, setup_database):
        session = mobile_service.create_sync_session(
            db_session, test_device.id, "incremental"
        )
        
        assert session is not None
        assert session.device_id == test_device.id
        assert session.sync_type == "incremental"
        assert session.status == "in_progress"
    
    def test_get_sync_sessions(self, mobile_service, db_session, test_device, setup_database):
        # Create a sync session first
        mobile_service.create_sync_session(db_session, test_device.id, "full")
        
        sessions = mobile_service.get_sync_sessions(db_session, test_device.id)
        
        assert len(sessions) >= 1
        assert sessions[0].device_id == test_device.id
    
    def test_add_sync_items(self, mobile_service, db_session, test_device, setup_database):
        # Create sync session first
        session = mobile_service.create_sync_session(db_session, test_device.id, "incremental")
        
        items_data = [
            {
                "item_type": "document",
                "item_id": "doc_123",
                "action": "upload",
                "priority": 1,
                "size_bytes": 1024
            },
            {
                "item_type": "document",
                "item_id": "doc_456",
                "action": "download",
                "priority": 2,
                "size_bytes": 2048
            }
        ]
        
        items_added = mobile_service.add_sync_items(db_session, session.id, items_data)
        
        assert items_added == 2
        
        # Verify items were added
        items = mobile_service.get_sync_items(db_session, session.id)
        assert len(items) == 2
    
    def test_update_sync_item_status(self, mobile_service, db_session, test_device, setup_database):
        # Create session and item
        session = mobile_service.create_sync_session(db_session, test_device.id, "incremental")
        items_data = [{"item_type": "document", "item_id": "doc_789", "action": "upload", "priority": 1}]
        mobile_service.add_sync_items(db_session, session.id, items_data)
        
        items = mobile_service.get_sync_items(db_session, session.id)
        item_id = items[0].id
        
        result = mobile_service.update_sync_item_status(
            db_session, item_id, "completed", None
        )
        
        assert result is True
        
        # Verify status was updated
        updated_items = mobile_service.get_sync_items(db_session, session.id)
        assert updated_items[0].status == "completed"
    
    def test_complete_sync_session(self, mobile_service, db_session, test_device, setup_database):
        # Create session
        session = mobile_service.create_sync_session(db_session, test_device.id, "incremental")
        
        result = mobile_service.complete_sync_session(db_session, session.id, "completed")
        
        assert result is True
        db_session.refresh(session)
        assert session.status == "completed"
        assert session.completed_at is not None

class TestOfflineDocumentService:
    
    def test_queue_document_for_offline(self, mobile_service, db_session, test_device, setup_database):
        offline_doc = mobile_service.queue_document_for_offline(
            db_session, test_device.id, 123, 2
        )
        
        assert offline_doc is not None
        assert offline_doc.device_id == test_device.id
        assert offline_doc.document_id == 123
        assert offline_doc.download_priority == 2
        assert offline_doc.download_status == "pending"
    
    def test_get_offline_documents(self, mobile_service, db_session, test_device, setup_database):
        # Queue a document first
        mobile_service.queue_document_for_offline(db_session, test_device.id, 456, 1)
        
        documents = mobile_service.get_offline_documents(db_session, test_device.id)
        
        assert len(documents) >= 1
        assert documents[0].device_id == test_device.id
        assert documents[0].document_id == 456
    
    def test_update_offline_document_status(self, mobile_service, db_session, test_device, setup_database):
        # Queue a document first
        offline_doc = mobile_service.queue_document_for_offline(db_session, test_device.id, 789, 1)
        
        result = mobile_service.update_offline_document_status(
            db_session, offline_doc.id, "downloading", 512, "/storage/doc_789.pdf"
        )
        
        assert result is True
        db_session.refresh(offline_doc)
        assert offline_doc.download_status == "downloading"
        assert offline_doc.downloaded_size == 512
        assert offline_doc.local_path == "/storage/doc_789.pdf"

class TestMobileSettingsService:
    
    def test_get_mobile_settings(self, mobile_service, db_session, test_user, test_device, setup_database):
        # Create a setting first
        mobile_service.update_mobile_setting(
            db_session, test_user.id, "auto_sync", True, test_device.id
        )
        
        settings = mobile_service.get_mobile_settings(db_session, test_user.id, test_device.id)
        
        assert "auto_sync" in settings
        assert settings["auto_sync"] is True
    
    def test_update_mobile_setting(self, mobile_service, db_session, test_user, test_device, setup_database):
        result = mobile_service.update_mobile_setting(
            db_session, test_user.id, "sync_frequency", "hourly", test_device.id
        )
        
        assert result is True
        
        # Verify setting was updated
        settings = mobile_service.get_mobile_settings(db_session, test_user.id, test_device.id)
        assert settings["sync_frequency"] == "hourly"

class TestPushNotificationService:
    
    def test_create_push_notification(self, mobile_service, db_session, test_device, setup_database):
        notification_data = {
            "notification_type": "sync_complete",
            "title": "Sync Complete",
            "message": "Your documents have been synchronized",
            "payload": {"sync_id": 123},
            "scheduled_at": None
        }
        
        notification = mobile_service.create_push_notification(
            db_session, test_device.id, notification_data
        )
        
        assert notification is not None
        assert notification.device_id == test_device.id
        assert notification.title == "Sync Complete"
        assert notification.status == "pending"
    
    def test_get_pending_notifications(self, mobile_service, db_session, test_device, setup_database):
        # Create a notification first
        notification_data = {
            "notification_type": "document_ready",
            "title": "Document Ready",
            "message": "Your document is ready for download"
        }
        mobile_service.create_push_notification(db_session, test_device.id, notification_data)
        
        notifications = mobile_service.get_pending_notifications(db_session, test_device.id)
        
        assert len(notifications) >= 1
        assert notifications[0].device_id == test_device.id
        assert notifications[0].status == "pending"

class TestMobileAnalyticsService:
    
    def test_log_mobile_event(self, mobile_service, db_session, test_device, setup_database):
        event_data = {
            "event_type": "app_launch",
            "event_data": {"version": "1.0.0", "platform": "ios"},
            "session_id": "session_123",
            "timestamp": datetime.utcnow()
        }
        
        event = mobile_service.log_mobile_event(db_session, test_device.id, event_data)
        
        assert event is not None
        assert event.device_id == test_device.id
        assert event.event_type == "app_launch"
        assert event.session_id == "session_123"
    
    def test_get_mobile_analytics(self, mobile_service, db_session, test_device, setup_database):
        # Log an event first
        event_data = {
            "event_type": "document_view",
            "event_data": {"document_id": 123}
        }
        mobile_service.log_mobile_event(db_session, test_device.id, event_data)
        
        events = mobile_service.get_mobile_analytics(
            db_session, test_device.id, "document_view", 7
        )
        
        assert len(events) >= 1
        assert events[0].device_id == test_device.id
        assert events[0].event_type == "document_view"

class TestConflictResolutionService:
    
    def test_create_sync_conflict(self, mobile_service, db_session, test_device, setup_database):
        conflict_data = {
            "item_type": "document",
            "item_id": "doc_conflict_123",
            "conflict_type": "version_mismatch",
            "server_version": {"version": 2, "content": "server content"},
            "client_version": {"version": 1, "content": "client content"},
            "resolution_strategy": "manual"
        }
        
        conflict = mobile_service.create_sync_conflict(db_session, test_device.id, conflict_data)
        
        assert conflict is not None
        assert conflict.device_id == test_device.id
        assert conflict.item_type == "document"
        assert conflict.conflict_type == "version_mismatch"
    
    def test_get_unresolved_conflicts(self, mobile_service, db_session, test_device, setup_database):
        # Create a conflict first
        conflict_data = {
            "item_type": "document",
            "item_id": "doc_conflict_456",
            "conflict_type": "concurrent_edit",
            "server_version": {"version": 3},
            "client_version": {"version": 2},
            "resolution_strategy": "manual"
        }
        mobile_service.create_sync_conflict(db_session, test_device.id, conflict_data)
        
        conflicts = mobile_service.get_unresolved_conflicts(db_session, test_device.id)
        
        assert len(conflicts) >= 1
        assert conflicts[0].device_id == test_device.id
        assert conflicts[0].resolved_at is None
    
    def test_resolve_conflict(self, mobile_service, db_session, test_device, setup_database):
        # Create a conflict first
        conflict_data = {
            "item_type": "document",
            "item_id": "doc_conflict_789",
            "conflict_type": "version_mismatch",
            "server_version": {"version": 2},
            "client_version": {"version": 1},
            "resolution_strategy": "manual"
        }
        conflict = mobile_service.create_sync_conflict(db_session, test_device.id, conflict_data)
        
        resolution_data = {
            "resolution_strategy": "server_wins",
            "resolved_version": {"version": 2}
        }
        
        result = mobile_service.resolve_conflict(db_session, conflict.id, resolution_data)
        
        assert result is True
        db_session.refresh(conflict)
        assert conflict.resolution_strategy == "server_wins"
        assert conflict.resolved_at is not None

class TestDeviceStatisticsService:
    
    def test_get_device_storage_usage(self, mobile_service, db_session, test_device, setup_database):
        # Queue some documents to create storage usage
        mobile_service.queue_document_for_offline(db_session, test_device.id, 123, 1)
        mobile_service.queue_document_for_offline(db_session, test_device.id, 456, 2)
        
        storage_usage = mobile_service.get_device_storage_usage(db_session, test_device.id)
        
        assert storage_usage is not None
        assert "total_size" in storage_usage
        assert "document_count" in storage_usage
        assert "storage_limit" in storage_usage
        assert "usage_percentage" in storage_usage
        assert storage_usage["document_count"] >= 2
    
    def test_get_sync_statistics(self, mobile_service, db_session, test_device, setup_database):
        # Create some sync sessions
        session1 = mobile_service.create_sync_session(db_session, test_device.id, "incremental")
        mobile_service.complete_sync_session(db_session, session1.id, "completed")
        
        session2 = mobile_service.create_sync_session(db_session, test_device.id, "full")
        mobile_service.complete_sync_session(db_session, session2.id, "failed")
        
        stats = mobile_service.get_sync_statistics(db_session, test_device.id, 30)
        
        assert stats is not None
        assert "total_sessions" in stats
        assert "successful_sessions" in stats
        assert "failed_sessions" in stats
        assert "success_rate" in stats
        assert stats["total_sessions"] >= 2
        assert stats["successful_sessions"] >= 1
        assert stats["failed_sessions"] >= 1

class TestAppVersionService:
    
    def test_check_app_update(self, mobile_service, db_session, setup_database):
        # Create app version record
        app_version = MobileAppVersion(
            version_number="1.1.0",
            platform="ios",
            build_number="110",
            release_date=datetime.utcnow(),
            is_required_update=False,
            download_url="https://example.com/app-1.1.0.ipa",
            release_notes="Bug fixes and improvements",
            file_size=50000000
        )
        db_session.add(app_version)
        db_session.commit()
        
        update_info = mobile_service.check_app_update(db_session, "ios", "1.0.0")
        
        assert update_info is not None
        assert "update_available" in update_info
        assert "latest_version" in update_info
        assert update_info["update_available"] is True
        assert update_info["latest_version"] == "1.1.0"
    
    def test_get_latest_app_version(self, mobile_service, db_session, setup_database):
        # Create app version record
        app_version = MobileAppVersion(
            version_number="1.2.0",
            platform="android",
            build_number="120",
            release_date=datetime.utcnow(),
            is_required_update=True,
            download_url="https://example.com/app-1.2.0.apk",
            release_notes="Major update with new features"
        )
        db_session.add(app_version)
        db_session.commit()
        
        latest_version = mobile_service.get_latest_app_version(db_session, "android")
        
        assert latest_version is not None
        assert latest_version.version_number == "1.2.0"
        assert latest_version.platform == "android"
        assert latest_version.is_required_update is True

class TestMobileServiceIntegration:
    
    def test_complete_mobile_workflow(self, mobile_service, db_session, test_user, setup_database):
        """Test a complete mobile workflow using the service layer"""
        
        # 1. Register device
        device_data = {
            "device_id": "integration_test_device",
            "device_name": "Integration Test Device",
            "device_type": "ios",
            "platform_version": "iOS 16.5",
            "app_version": "1.0.0"
        }
        device = mobile_service.register_device(db_session, test_user.id, device_data)
        assert device is not None
        
        # 2. Create sync session
        session = mobile_service.create_sync_session(db_session, device.id, "incremental")
        assert session is not None
        
        # 3. Add sync items
        items_data = [
            {"item_type": "document", "item_id": "doc_1", "action": "upload", "priority": 1},
            {"item_type": "document", "item_id": "doc_2", "action": "download", "priority": 2}
        ]
        items_added = mobile_service.add_sync_items(db_session, session.id, items_data)
        assert items_added == 2
        
        # 4. Queue document for offline
        offline_doc = mobile_service.queue_document_for_offline(db_session, device.id, 123, 1)
        assert offline_doc is not None
        
        # 5. Log analytics event
        event_data = {
            "event_type": "sync_started",
            "event_data": {"session_id": session.session_id}
        }
        event = mobile_service.log_mobile_event(db_session, device.id, event_data)
        assert event is not None
        
        # 6. Create push notification
        notification_data = {
            "notification_type": "sync_complete",
            "title": "Sync Complete",
            "message": "Your documents have been synchronized"
        }
        notification = mobile_service.create_push_notification(db_session, device.id, notification_data)
        assert notification is not None
        
        # 7. Complete sync session
        result = mobile_service.complete_sync_session(db_session, session.id, "completed")
        assert result is True
        
        # 8. Verify final state
        devices = mobile_service.get_user_devices(db_session, test_user.id)
        assert len(devices) >= 1
        assert any(d.device_name == "Integration Test Device" for d in devices)
        
        sessions = mobile_service.get_sync_sessions(db_session, device.id)
        assert len(sessions) >= 1
        assert sessions[0].status == "completed"
        
        offline_docs = mobile_service.get_offline_documents(db_session, device.id)
        assert len(offline_docs) >= 1
        
        events = mobile_service.get_mobile_analytics(db_session, device.id, days=1)
        assert len(events) >= 1
        
        notifications = mobile_service.get_pending_notifications(db_session, device.id)
        assert len(notifications) >= 1

if __name__ == "__main__":
    pytest.main([__file__])