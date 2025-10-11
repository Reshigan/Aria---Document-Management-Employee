import pytest
import json
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db, Base
from app.models.user import User
from app.models.document import Document
from app.models.mobile import MobileDevice, SyncSession
from app.auth import create_access_token, get_password_hash

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_integration.db"
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
        username="integrationuser",
        email="integration@example.com",
        hashed_password=get_password_hash("integrationpassword"),
        is_active=True,
        is_verified=True
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

class TestIntegrationAPI:
    
    def test_get_integrations(self, client, auth_headers, setup_database):
        response = client.get("/api/integrations", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "integrations" in data
    
    def test_create_integration(self, client, auth_headers, setup_database):
        integration_data = {
            "name": "Test Integration",
            "type": "webhook",
            "config": {
                "url": "https://example.com/webhook",
                "method": "POST",
                "headers": {"Content-Type": "application/json"}
            },
            "is_active": True
        }
        
        response = client.post(
            "/api/integrations",
            json=integration_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["integration"]["name"] == "Test Integration"
        assert data["integration"]["type"] == "webhook"
    
    def test_update_integration(self, client, auth_headers, setup_database):
        # First create an integration
        integration_data = {
            "name": "Update Test Integration",
            "type": "api",
            "config": {"api_key": "test_key"},
            "is_active": True
        }
        
        create_response = client.post(
            "/api/integrations",
            json=integration_data,
            headers=auth_headers
        )
        integration_id = create_response.json()["integration"]["id"]
        
        # Then update it
        update_data = {
            "name": "Updated Integration Name",
            "is_active": False
        }
        
        response = client.put(
            f"/api/integrations/{integration_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["integration"]["name"] == "Updated Integration Name"
        assert data["integration"]["is_active"] is False
    
    def test_delete_integration(self, client, auth_headers, setup_database):
        # First create an integration
        integration_data = {
            "name": "Delete Test Integration",
            "type": "email",
            "config": {"smtp_server": "smtp.example.com"},
            "is_active": True
        }
        
        create_response = client.post(
            "/api/integrations",
            json=integration_data,
            headers=auth_headers
        )
        integration_id = create_response.json()["integration"]["id"]
        
        # Then delete it
        response = client.delete(
            f"/api/integrations/{integration_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_test_integration(self, client, auth_headers, setup_database):
        # Create an integration first
        integration_data = {
            "name": "Test Connection Integration",
            "type": "webhook",
            "config": {
                "url": "https://httpbin.org/post",
                "method": "POST"
            },
            "is_active": True
        }
        
        create_response = client.post(
            "/api/integrations",
            json=integration_data,
            headers=auth_headers
        )
        integration_id = create_response.json()["integration"]["id"]
        
        # Test the integration
        response = client.post(
            f"/api/integrations/{integration_id}/test",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "test_result" in data

class TestDocumentProcessingAPI:
    
    def test_get_processing_jobs(self, client, auth_headers, setup_database):
        response = client.get("/api/document-processing/jobs", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "jobs" in data
    
    def test_create_processing_job(self, client, auth_headers, setup_database):
        job_data = {
            "document_id": 123,
            "processing_type": "ocr",
            "config": {
                "language": "en",
                "output_format": "text"
            },
            "priority": 1
        }
        
        response = client.post(
            "/api/document-processing/jobs",
            json=job_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["job"]["processing_type"] == "ocr"
        assert data["job"]["priority"] == 1
    
    def test_get_processing_job_status(self, client, auth_headers, setup_database):
        # Create a job first
        job_data = {
            "document_id": 456,
            "processing_type": "text_extraction",
            "config": {"extract_metadata": True},
            "priority": 2
        }
        
        create_response = client.post(
            "/api/document-processing/jobs",
            json=job_data,
            headers=auth_headers
        )
        job_id = create_response.json()["job"]["id"]
        
        # Get job status
        response = client.get(
            f"/api/document-processing/jobs/{job_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["job"]["id"] == job_id
    
    def test_cancel_processing_job(self, client, auth_headers, setup_database):
        # Create a job first
        job_data = {
            "document_id": 789,
            "processing_type": "thumbnail_generation",
            "config": {"size": "medium"},
            "priority": 0
        }
        
        create_response = client.post(
            "/api/document-processing/jobs",
            json=job_data,
            headers=auth_headers
        )
        job_id = create_response.json()["job"]["id"]
        
        # Cancel the job
        response = client.post(
            f"/api/document-processing/jobs/{job_id}/cancel",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

class TestVersionControlAPI:
    
    def test_get_document_versions(self, client, auth_headers, setup_database):
        response = client.get("/api/version-control/documents/123/versions", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "versions" in data
    
    def test_create_document_version(self, client, auth_headers, setup_database):
        version_data = {
            "document_id": 123,
            "version_number": "1.1",
            "changes": "Updated content and formatting",
            "file_path": "/documents/doc_123_v1.1.pdf",
            "file_size": 2048,
            "created_by": "user123"
        }
        
        response = client.post(
            "/api/version-control/versions",
            json=version_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["version"]["version_number"] == "1.1"
    
    def test_compare_versions(self, client, auth_headers, setup_database):
        compare_data = {
            "version1_id": 1,
            "version2_id": 2
        }
        
        response = client.post(
            "/api/version-control/compare",
            json=compare_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "comparison" in data
    
    def test_restore_version(self, client, auth_headers, setup_database):
        restore_data = {
            "version_id": 1,
            "document_id": 123
        }
        
        response = client.post(
            "/api/version-control/restore",
            json=restore_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

class TestAPIManagementAPI:
    
    def test_get_api_keys(self, client, auth_headers, setup_database):
        response = client.get("/api/api-management/keys", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "api_keys" in data
    
    def test_create_api_key(self, client, auth_headers, setup_database):
        key_data = {
            "name": "Test API Key",
            "description": "API key for testing purposes",
            "permissions": ["read", "write"],
            "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat()
        }
        
        response = client.post(
            "/api/api-management/keys",
            json=key_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["api_key"]["name"] == "Test API Key"
        assert "key_value" in data["api_key"]
    
    def test_revoke_api_key(self, client, auth_headers, setup_database):
        # Create an API key first
        key_data = {
            "name": "Revoke Test Key",
            "description": "Key to be revoked",
            "permissions": ["read"]
        }
        
        create_response = client.post(
            "/api/api-management/keys",
            json=key_data,
            headers=auth_headers
        )
        key_id = create_response.json()["api_key"]["id"]
        
        # Revoke the key
        response = client.delete(
            f"/api/api-management/keys/{key_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_get_api_usage_stats(self, client, auth_headers, setup_database):
        response = client.get("/api/api-management/usage", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "usage_stats" in data

class TestPerformanceAPI:
    
    def test_get_performance_metrics(self, client, auth_headers, setup_database):
        response = client.get("/api/performance/metrics", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "metrics" in data
    
    def test_get_cache_status(self, client, auth_headers, setup_database):
        response = client.get("/api/performance/cache", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "cache_status" in data
    
    def test_clear_cache(self, client, auth_headers, setup_database):
        cache_data = {
            "cache_type": "document_thumbnails",
            "force": True
        }
        
        response = client.post(
            "/api/performance/cache/clear",
            json=cache_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_optimize_database(self, client, auth_headers, setup_database):
        response = client.post("/api/performance/optimize", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "optimization_result" in data

class TestAdvancedSearchAPI:
    
    def test_advanced_search(self, client, auth_headers, setup_database):
        search_data = {
            "query": "test document",
            "filters": {
                "file_type": ["pdf", "docx"],
                "date_range": {
                    "start": "2023-01-01",
                    "end": "2023-12-31"
                },
                "tags": ["important", "draft"]
            },
            "sort_by": "relevance",
            "limit": 20,
            "offset": 0
        }
        
        response = client.post(
            "/api/search/advanced",
            json=search_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "results" in data
        assert "total_count" in data
    
    def test_search_suggestions(self, client, auth_headers, setup_database):
        response = client.get(
            "/api/search/suggestions?query=test&limit=5",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "suggestions" in data
    
    def test_save_search(self, client, auth_headers, setup_database):
        search_data = {
            "name": "My Saved Search",
            "query": "important documents",
            "filters": {
                "file_type": ["pdf"],
                "tags": ["important"]
            },
            "is_public": False
        }
        
        response = client.post(
            "/api/search/saved",
            json=search_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["saved_search"]["name"] == "My Saved Search"
    
    def test_get_saved_searches(self, client, auth_headers, setup_database):
        response = client.get("/api/search/saved", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "saved_searches" in data

class TestFileManagementAPI:
    
    def test_get_file_info(self, client, auth_headers, setup_database):
        response = client.get("/api/files/123/info", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "file_info" in data
    
    def test_move_file(self, client, auth_headers, setup_database):
        move_data = {
            "file_id": 123,
            "destination_folder": "/documents/archived/",
            "new_name": "archived_document.pdf"
        }
        
        response = client.post(
            "/api/files/move",
            json=move_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_copy_file(self, client, auth_headers, setup_database):
        copy_data = {
            "file_id": 123,
            "destination_folder": "/documents/copies/",
            "new_name": "copy_of_document.pdf"
        }
        
        response = client.post(
            "/api/files/copy",
            json=copy_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_get_storage_usage(self, client, auth_headers, setup_database):
        response = client.get("/api/files/storage", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "storage_usage" in data

class TestBackupRecoveryAPI:
    
    def test_create_backup(self, client, auth_headers, setup_database):
        backup_data = {
            "backup_type": "incremental",
            "include_files": True,
            "include_database": True,
            "description": "Test backup"
        }
        
        response = client.post(
            "/api/backup/create",
            json=backup_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "backup_id" in data
    
    def test_get_backups(self, client, auth_headers, setup_database):
        response = client.get("/api/backup/list", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "backups" in data
    
    def test_restore_backup(self, client, auth_headers, setup_database):
        restore_data = {
            "backup_id": "backup_123",
            "restore_type": "selective",
            "items_to_restore": ["documents", "user_data"]
        }
        
        response = client.post(
            "/api/backup/restore",
            json=restore_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_delete_backup(self, client, auth_headers, setup_database):
        response = client.delete("/api/backup/backup_123", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

class TestComplianceAPI:
    
    def test_get_audit_logs(self, client, auth_headers, setup_database):
        response = client.get(
            "/api/compliance/audit-logs?start_date=2023-01-01&end_date=2023-12-31",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "audit_logs" in data
    
    def test_generate_compliance_report(self, client, auth_headers, setup_database):
        report_data = {
            "report_type": "gdpr_compliance",
            "date_range": {
                "start": "2023-01-01",
                "end": "2023-12-31"
            },
            "include_user_data": True,
            "include_document_access": True
        }
        
        response = client.post(
            "/api/compliance/reports",
            json=report_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "report_id" in data
    
    def test_data_retention_policy(self, client, auth_headers, setup_database):
        policy_data = {
            "policy_name": "Document Retention Policy",
            "retention_period_days": 2555,  # 7 years
            "applies_to": ["documents", "audit_logs"],
            "auto_delete": True
        }
        
        response = client.post(
            "/api/compliance/retention-policies",
            json=policy_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_privacy_settings(self, client, auth_headers, setup_database):
        privacy_data = {
            "data_anonymization": True,
            "consent_tracking": True,
            "right_to_be_forgotten": True,
            "data_portability": True
        }
        
        response = client.put(
            "/api/compliance/privacy-settings",
            json=privacy_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

class TestSystemIntegration:
    
    def test_complete_system_workflow(self, client, auth_headers, setup_database):
        """Test a complete system workflow involving multiple components"""
        
        # 1. Create an integration
        integration_data = {
            "name": "Workflow Integration",
            "type": "webhook",
            "config": {"url": "https://example.com/webhook"},
            "is_active": True
        }
        
        integration_response = client.post(
            "/api/integrations",
            json=integration_data,
            headers=auth_headers
        )
        assert integration_response.status_code == 200
        integration_id = integration_response.json()["integration"]["id"]
        
        # 2. Create a processing job
        job_data = {
            "document_id": 123,
            "processing_type": "ocr",
            "config": {"language": "en"},
            "priority": 1
        }
        
        job_response = client.post(
            "/api/document-processing/jobs",
            json=job_data,
            headers=auth_headers
        )
        assert job_response.status_code == 200
        job_id = job_response.json()["job"]["id"]
        
        # 3. Create an API key
        key_data = {
            "name": "Workflow API Key",
            "permissions": ["read", "write"]
        }
        
        key_response = client.post(
            "/api/api-management/keys",
            json=key_data,
            headers=auth_headers
        )
        assert key_response.status_code == 200
        
        # 4. Perform advanced search
        search_data = {
            "query": "workflow test",
            "filters": {"file_type": ["pdf"]},
            "limit": 10
        }
        
        search_response = client.post(
            "/api/search/advanced",
            json=search_data,
            headers=auth_headers
        )
        assert search_response.status_code == 200
        
        # 5. Create a backup
        backup_data = {
            "backup_type": "incremental",
            "include_files": True,
            "description": "Workflow test backup"
        }
        
        backup_response = client.post(
            "/api/backup/create",
            json=backup_data,
            headers=auth_headers
        )
        assert backup_response.status_code == 200
        
        # 6. Check performance metrics
        metrics_response = client.get("/api/performance/metrics", headers=auth_headers)
        assert metrics_response.status_code == 200
        
        # 7. Generate compliance report
        report_data = {
            "report_type": "activity_summary",
            "date_range": {
                "start": "2023-01-01",
                "end": "2023-12-31"
            }
        }
        
        report_response = client.post(
            "/api/compliance/reports",
            json=report_data,
            headers=auth_headers
        )
        assert report_response.status_code == 200
        
        # Verify all components worked together
        assert integration_id is not None
        assert job_id is not None
        assert all(resp.status_code == 200 for resp in [
            integration_response, job_response, key_response,
            search_response, backup_response, metrics_response, report_response
        ])

if __name__ == "__main__":
    pytest.main([__file__])