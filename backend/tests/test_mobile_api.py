import pytest
import json
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db, Base
from app.models.user import User
from app.models.mobile import (
    MobileDevice, SyncSession, SyncItem, SyncConflict,
    OfflineDocument, MobileSettings, PushNotification,
    OfflineAction, MobileAnalytics, SyncPolicy,
    MobileSecurityLog, MobileAppVersion
)
from app.auth import create_access_token

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_mobile.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def test_user():
    db = TestingSessionLocal()
    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password="hashed_password",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    yield user
    db.delete(user)
    db.commit()
    db.close()

@pytest.fixture
def auth_headers(test_user):
    token = create_access_token(data={"sub": test_user.username})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_device(test_user):
    db = TestingSessionLocal()
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
    db.add(device)
    db.commit()
    db.refresh(device)
    yield device
    db.delete(device)
    db.commit()
    db.close()

class TestMobileDeviceAPI:
    
    def test_register_device(self, client, auth_headers, setup_database):
        device_data = {
            "device_id": "new_device_456",
            "device_name": "Test Android",
            "device_type": "android",
            "platform_version": "Android 13",
            "app_version": "1.0.0",
            "sync_enabled": True,
            "offline_storage_limit": 1073741824
        }
        
        response = client.post(
            "/api/mobile/devices/register",
            json=device_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["device"]["device_name"] == "Test Android"
        assert data["device"]["device_type"] == "android"
    
    def test_get_user_devices(self, client, auth_headers, test_device, setup_database):
        response = client.get("/api/mobile/devices", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["devices"]) >= 1
        assert data["devices"][0]["device_name"] == "Test iPhone"
    
    def test_update_device(self, client, auth_headers, test_device, setup_database):
        update_data = {
            "device_name": "Updated iPhone",
            "sync_enabled": False
        }
        
        response = client.put(
            f"/api/mobile/devices/{test_device.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["device"]["device_name"] == "Updated iPhone"
        assert data["device"]["sync_enabled"] is False
    
    def test_deactivate_device(self, client, auth_headers, test_device, setup_database):
        response = client.delete(
            f"/api/mobile/devices/{test_device.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

class TestSyncAPI:
    
    def test_start_sync_session(self, client, auth_headers, test_device, setup_database):
        sync_data = {
            "device_id": test_device.id,
            "sync_type": "incremental"
        }
        
        response = client.post(
            "/api/mobile/sync/start",
            json=sync_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["session"]["sync_type"] == "incremental"
        assert data["session"]["status"] == "in_progress"
    
    def test_get_sync_sessions(self, client, auth_headers, test_device, setup_database):
        # First create a sync session
        sync_data = {"device_id": test_device.id, "sync_type": "full"}
        client.post("/api/mobile/sync/start", json=sync_data, headers=auth_headers)
        
        response = client.get(
            f"/api/mobile/sync/sessions?device_id={test_device.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["sessions"]) >= 1
    
    def test_add_sync_items(self, client, auth_headers, test_device, setup_database):
        # Create sync session first
        sync_data = {"device_id": test_device.id, "sync_type": "incremental"}
        session_response = client.post("/api/mobile/sync/start", json=sync_data, headers=auth_headers)
        session_id = session_response.json()["session"]["id"]
        
        items_data = [
            {
                "item_type": "document",
                "item_id": "doc_123",
                "action": "upload",
                "priority": 1
            },
            {
                "item_type": "document",
                "item_id": "doc_456",
                "action": "download",
                "priority": 2
            }
        ]
        
        response = client.post(
            f"/api/mobile/sync/{session_id}/items",
            json=items_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["items_added"] == 2
    
    def test_complete_sync_session(self, client, auth_headers, test_device, setup_database):
        # Create and start sync session
        sync_data = {"device_id": test_device.id, "sync_type": "incremental"}
        session_response = client.post("/api/mobile/sync/start", json=sync_data, headers=auth_headers)
        session_id = session_response.json()["session"]["id"]
        
        complete_data = {"status": "completed"}
        response = client.post(
            f"/api/mobile/sync/{session_id}/complete",
            json=complete_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

class TestOfflineDocumentAPI:
    
    def test_queue_document_for_offline(self, client, auth_headers, test_device, setup_database):
        queue_data = {
            "device_id": test_device.id,
            "document_id": 123,
            "priority": 2
        }
        
        response = client.post(
            "/api/mobile/offline/documents",
            json=queue_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["offline_document"]["document_id"] == 123
        assert data["offline_document"]["download_priority"] == 2
    
    def test_get_offline_documents(self, client, auth_headers, test_device, setup_database):
        # Queue a document first
        queue_data = {"device_id": test_device.id, "document_id": 456, "priority": 1}
        client.post("/api/mobile/offline/documents", json=queue_data, headers=auth_headers)
        
        response = client.get(
            f"/api/mobile/offline/documents?device_id={test_device.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["documents"]) >= 1
    
    def test_update_offline_document_status(self, client, auth_headers, test_device, setup_database):
        # Queue a document first
        queue_data = {"device_id": test_device.id, "document_id": 789, "priority": 1}
        queue_response = client.post("/api/mobile/offline/documents", json=queue_data, headers=auth_headers)
        offline_doc_id = queue_response.json()["offline_document"]["id"]
        
        update_data = {
            "status": "downloading",
            "downloaded_size": 1024,
            "local_path": "/storage/doc_789.pdf"
        }
        
        response = client.put(
            f"/api/mobile/offline/documents/{offline_doc_id}/status",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

class TestMobileSettingsAPI:
    
    def test_get_mobile_settings(self, client, auth_headers, test_device, setup_database):
        response = client.get(
            f"/api/mobile/settings?device_id={test_device.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "settings" in data
    
    def test_update_mobile_setting(self, client, auth_headers, test_device, setup_database):
        setting_data = {
            "setting_key": "auto_sync",
            "setting_value": True,
            "device_id": test_device.id
        }
        
        response = client.put(
            "/api/mobile/settings",
            json=setting_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

class TestPushNotificationAPI:
    
    def test_create_push_notification(self, client, auth_headers, test_device, setup_database):
        notification_data = {
            "device_id": test_device.id,
            "notification_type": "sync_complete",
            "title": "Sync Complete",
            "message": "Your documents have been synchronized",
            "payload": {"sync_id": 123}
        }
        
        response = client.post(
            "/api/mobile/notifications",
            json=notification_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["notification"]["title"] == "Sync Complete"
    
    def test_get_pending_notifications(self, client, auth_headers, test_device, setup_database):
        # Create a notification first
        notification_data = {
            "device_id": test_device.id,
            "notification_type": "document_ready",
            "title": "Document Ready",
            "message": "Your document is ready for download"
        }
        client.post("/api/mobile/notifications", json=notification_data, headers=auth_headers)
        
        response = client.get(
            f"/api/mobile/notifications?device_id={test_device.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["notifications"]) >= 1

class TestMobileAnalyticsAPI:
    
    def test_log_mobile_event(self, client, auth_headers, test_device, setup_database):
        event_data = {
            "device_id": test_device.id,
            "event_type": "app_launch",
            "event_data": {"version": "1.0.0", "platform": "ios"},
            "session_id": "session_123"
        }
        
        response = client.post(
            "/api/mobile/analytics/events",
            json=event_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "event_id" in data
    
    def test_get_mobile_analytics(self, client, auth_headers, test_device, setup_database):
        # Log an event first
        event_data = {
            "device_id": test_device.id,
            "event_type": "document_view",
            "event_data": {"document_id": 123}
        }
        client.post("/api/mobile/analytics/events", json=event_data, headers=auth_headers)
        
        response = client.get(
            f"/api/mobile/analytics?device_id={test_device.id}&days=7",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["events"]) >= 1

class TestAppVersionAPI:
    
    def test_check_app_update(self, client, setup_database):
        response = client.get(
            "/api/mobile/app-version/check?platform=ios&current_version=1.0.0"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "update_required" in data
        assert "update_available" in data
    
    def test_get_latest_app_version(self, client, setup_database):
        response = client.get("/api/mobile/app-version/latest?platform=ios")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

class TestDeviceStatisticsAPI:
    
    def test_get_device_storage_usage(self, client, auth_headers, test_device, setup_database):
        response = client.get(
            f"/api/mobile/devices/{test_device.id}/storage",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "storage_usage" in data
        assert "total_size" in data["storage_usage"]
        assert "document_count" in data["storage_usage"]
    
    def test_get_sync_statistics(self, client, auth_headers, test_device, setup_database):
        response = client.get(
            f"/api/mobile/devices/{test_device.id}/sync-stats?days=30",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "sync_statistics" in data
        assert "total_sessions" in data["sync_statistics"]
        assert "success_rate" in data["sync_statistics"]

class TestConflictResolutionAPI:
    
    def test_get_unresolved_conflicts(self, client, auth_headers, test_device, setup_database):
        response = client.get(
            f"/api/mobile/sync/conflicts?device_id={test_device.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "conflicts" in data
    
    def test_resolve_conflict(self, client, auth_headers, test_device, setup_database):
        # Create a conflict first (in real scenario, this would be created during sync)
        db = TestingSessionLocal()
        conflict = SyncConflict(
            device_id=test_device.id,
            item_type="document",
            item_id="doc_conflict_123",
            conflict_type="version_mismatch",
            server_version={"version": 2, "content": "server content"},
            client_version={"version": 1, "content": "client content"},
            resolution_strategy="manual"
        )
        db.add(conflict)
        db.commit()
        db.refresh(conflict)
        
        resolution_data = {
            "resolution_strategy": "server_wins",
            "resolved_version": {"version": 2, "content": "server content"}
        }
        
        response = client.post(
            f"/api/mobile/sync/conflicts/{conflict.id}/resolve",
            json=resolution_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        db.delete(conflict)
        db.commit()
        db.close()

# Integration tests
class TestMobileIntegration:
    
    def test_complete_mobile_workflow(self, client, auth_headers, setup_database):
        """Test a complete mobile workflow from device registration to sync completion"""
        
        # 1. Register device
        device_data = {
            "device_id": "integration_test_device",
            "device_name": "Integration Test Device",
            "device_type": "ios",
            "platform_version": "iOS 16.5",
            "app_version": "1.0.0"
        }
        
        device_response = client.post(
            "/api/mobile/devices/register",
            json=device_data,
            headers=auth_headers
        )
        assert device_response.status_code == 200
        device_id = device_response.json()["device"]["id"]
        
        # 2. Start sync session
        sync_data = {"device_id": device_id, "sync_type": "incremental"}
        sync_response = client.post(
            "/api/mobile/sync/start",
            json=sync_data,
            headers=auth_headers
        )
        assert sync_response.status_code == 200
        session_id = sync_response.json()["session"]["id"]
        
        # 3. Add sync items
        items_data = [
            {"item_type": "document", "item_id": "doc_1", "action": "upload", "priority": 1},
            {"item_type": "document", "item_id": "doc_2", "action": "download", "priority": 2}
        ]
        items_response = client.post(
            f"/api/mobile/sync/{session_id}/items",
            json=items_data,
            headers=auth_headers
        )
        assert items_response.status_code == 200
        
        # 4. Queue document for offline
        queue_data = {"device_id": device_id, "document_id": 123, "priority": 1}
        queue_response = client.post(
            "/api/mobile/offline/documents",
            json=queue_data,
            headers=auth_headers
        )
        assert queue_response.status_code == 200
        
        # 5. Log analytics event
        event_data = {
            "device_id": device_id,
            "event_type": "sync_started",
            "event_data": {"session_id": session_id}
        }
        analytics_response = client.post(
            "/api/mobile/analytics/events",
            json=event_data,
            headers=auth_headers
        )
        assert analytics_response.status_code == 200
        
        # 6. Complete sync session
        complete_data = {"status": "completed"}
        complete_response = client.post(
            f"/api/mobile/sync/{session_id}/complete",
            json=complete_data,
            headers=auth_headers
        )
        assert complete_response.status_code == 200
        
        # 7. Verify final state
        devices_response = client.get("/api/mobile/devices", headers=auth_headers)
        assert devices_response.status_code == 200
        devices = devices_response.json()["devices"]
        assert any(d["device_name"] == "Integration Test Device" for d in devices)

if __name__ == "__main__":
    pytest.main([__file__])