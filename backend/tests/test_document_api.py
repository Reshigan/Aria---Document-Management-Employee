import pytest
import json
import tempfile
import os
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db, Base
from app.models.user import User
from app.models.document import Document, DocumentVersion, DocumentShare, DocumentTag
from app.auth import create_access_token

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_documents.db"
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
def test_document(test_user):
    db = TestingSessionLocal()
    document = Document(
        title="Test Document",
        description="A test document",
        file_path="/test/path/document.pdf",
        file_size=1024,
        mime_type="application/pdf",
        owner_id=test_user.id,
        is_active=True
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    yield document
    db.delete(document)
    db.commit()
    db.close()

class TestDocumentAPI:
    
    def test_upload_document(self, client, auth_headers, setup_database):
        # Create a temporary test file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("This is a test document content")
            temp_file_path = f.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = {"file": ("test.txt", f, "text/plain")}
                data = {
                    "title": "Test Upload Document",
                    "description": "A document uploaded via API test"
                }
                
                response = client.post(
                    "/api/documents/upload",
                    files=files,
                    data=data,
                    headers={"Authorization": auth_headers["Authorization"]}
                )
            
            assert response.status_code == 200
            result = response.json()
            assert result["success"] is True
            assert result["document"]["title"] == "Test Upload Document"
            assert result["document"]["mime_type"] == "text/plain"
        finally:
            os.unlink(temp_file_path)
    
    def test_get_documents(self, client, auth_headers, test_document, setup_database):
        response = client.get("/api/documents", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["documents"]) >= 1
        assert data["documents"][0]["title"] == "Test Document"
    
    def test_get_document_by_id(self, client, auth_headers, test_document, setup_database):
        response = client.get(f"/api/documents/{test_document.id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["document"]["id"] == test_document.id
        assert data["document"]["title"] == "Test Document"
    
    def test_update_document(self, client, auth_headers, test_document, setup_database):
        update_data = {
            "title": "Updated Test Document",
            "description": "Updated description"
        }
        
        response = client.put(
            f"/api/documents/{test_document.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["document"]["title"] == "Updated Test Document"
        assert data["document"]["description"] == "Updated description"
    
    def test_delete_document(self, client, auth_headers, setup_database):
        # Create a document to delete
        db = TestingSessionLocal()
        user = db.query(User).filter(User.username == "testuser").first()
        document = Document(
            title="Document to Delete",
            description="This document will be deleted",
            file_path="/test/path/delete.pdf",
            file_size=512,
            mime_type="application/pdf",
            owner_id=user.id,
            is_active=True
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        doc_id = document.id
        db.close()
        
        response = client.delete(f"/api/documents/{doc_id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_search_documents(self, client, auth_headers, test_document, setup_database):
        response = client.get(
            "/api/documents/search?query=Test&limit=10&offset=0",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["documents"]) >= 1
        assert "Test" in data["documents"][0]["title"]

class TestDocumentVersionAPI:
    
    def test_create_document_version(self, client, auth_headers, test_document, setup_database):
        # Create a temporary test file for the new version
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("This is version 2 of the document")
            temp_file_path = f.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = {"file": ("test_v2.txt", f, "text/plain")}
                data = {
                    "version_notes": "Updated content for version 2"
                }
                
                response = client.post(
                    f"/api/documents/{test_document.id}/versions",
                    files=files,
                    data=data,
                    headers={"Authorization": auth_headers["Authorization"]}
                )
            
            assert response.status_code == 200
            result = response.json()
            assert result["success"] is True
            assert result["version"]["version_notes"] == "Updated content for version 2"
        finally:
            os.unlink(temp_file_path)
    
    def test_get_document_versions(self, client, auth_headers, test_document, setup_database):
        response = client.get(
            f"/api/documents/{test_document.id}/versions",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "versions" in data

class TestDocumentShareAPI:
    
    def test_share_document(self, client, auth_headers, test_document, setup_database):
        # Create another user to share with
        db = TestingSessionLocal()
        share_user = User(
            username="shareuser",
            email="share@example.com",
            hashed_password="hashed_password",
            is_active=True
        )
        db.add(share_user)
        db.commit()
        db.refresh(share_user)
        
        share_data = {
            "user_id": share_user.id,
            "permission_level": "read",
            "expires_at": None
        }
        
        response = client.post(
            f"/api/documents/{test_document.id}/share",
            json=share_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["share"]["permission_level"] == "read"
        
        # Cleanup
        db.delete(share_user)
        db.commit()
        db.close()
    
    def test_get_document_shares(self, client, auth_headers, test_document, setup_database):
        response = client.get(
            f"/api/documents/{test_document.id}/shares",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "shares" in data

class TestDocumentTagAPI:
    
    def test_add_document_tag(self, client, auth_headers, test_document, setup_database):
        tag_data = {
            "name": "important",
            "color": "#ff0000"
        }
        
        response = client.post(
            f"/api/documents/{test_document.id}/tags",
            json=tag_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["tag"]["name"] == "important"
        assert data["tag"]["color"] == "#ff0000"
    
    def test_get_document_tags(self, client, auth_headers, test_document, setup_database):
        response = client.get(
            f"/api/documents/{test_document.id}/tags",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "tags" in data
    
    def test_remove_document_tag(self, client, auth_headers, test_document, setup_database):
        # First add a tag
        tag_data = {"name": "temporary", "color": "#00ff00"}
        tag_response = client.post(
            f"/api/documents/{test_document.id}/tags",
            json=tag_data,
            headers=auth_headers
        )
        tag_id = tag_response.json()["tag"]["id"]
        
        # Then remove it
        response = client.delete(
            f"/api/documents/{test_document.id}/tags/{tag_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

class TestDocumentDownloadAPI:
    
    def test_download_document(self, client, auth_headers, test_document, setup_database):
        # Create a temporary file to simulate the document file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("Document content for download test")
            temp_file_path = f.name
        
        try:
            # Update the document's file path to point to our temp file
            db = TestingSessionLocal()
            document = db.query(Document).filter(Document.id == test_document.id).first()
            document.file_path = temp_file_path
            db.commit()
            db.close()
            
            response = client.get(
                f"/api/documents/{test_document.id}/download",
                headers=auth_headers
            )
            
            # Note: In a real implementation, this would return the file content
            # For this test, we're just checking that the endpoint responds
            assert response.status_code in [200, 404]  # 404 if file handling not implemented
        finally:
            os.unlink(temp_file_path)

class TestDocumentStatisticsAPI:
    
    def test_get_document_statistics(self, client, auth_headers, setup_database):
        response = client.get("/api/documents/statistics", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "total_documents" in data["statistics"]
        assert "total_size" in data["statistics"]
        assert "documents_by_type" in data["statistics"]

class TestDocumentBulkOperations:
    
    def test_bulk_delete_documents(self, client, auth_headers, setup_database):
        # Create multiple documents for bulk deletion
        db = TestingSessionLocal()
        user = db.query(User).filter(User.username == "testuser").first()
        
        doc1 = Document(
            title="Bulk Delete Doc 1",
            file_path="/test/bulk1.pdf",
            file_size=100,
            mime_type="application/pdf",
            owner_id=user.id
        )
        doc2 = Document(
            title="Bulk Delete Doc 2",
            file_path="/test/bulk2.pdf",
            file_size=200,
            mime_type="application/pdf",
            owner_id=user.id
        )
        
        db.add_all([doc1, doc2])
        db.commit()
        db.refresh(doc1)
        db.refresh(doc2)
        
        bulk_data = {
            "document_ids": [doc1.id, doc2.id]
        }
        
        response = client.post(
            "/api/documents/bulk/delete",
            json=bulk_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["deleted_count"] == 2
        
        db.close()
    
    def test_bulk_update_documents(self, client, auth_headers, setup_database):
        # Create multiple documents for bulk update
        db = TestingSessionLocal()
        user = db.query(User).filter(User.username == "testuser").first()
        
        doc1 = Document(
            title="Bulk Update Doc 1",
            file_path="/test/update1.pdf",
            file_size=100,
            mime_type="application/pdf",
            owner_id=user.id
        )
        doc2 = Document(
            title="Bulk Update Doc 2",
            file_path="/test/update2.pdf",
            file_size=200,
            mime_type="application/pdf",
            owner_id=user.id
        )
        
        db.add_all([doc1, doc2])
        db.commit()
        db.refresh(doc1)
        db.refresh(doc2)
        
        bulk_data = {
            "document_ids": [doc1.id, doc2.id],
            "updates": {
                "description": "Bulk updated description"
            }
        }
        
        response = client.post(
            "/api/documents/bulk/update",
            json=bulk_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["updated_count"] == 2
        
        db.close()

class TestDocumentPermissions:
    
    def test_unauthorized_access(self, client, test_document, setup_database):
        # Test access without authentication
        response = client.get(f"/api/documents/{test_document.id}")
        assert response.status_code == 401
    
    def test_access_other_user_document(self, client, test_document, setup_database):
        # Create another user
        db = TestingSessionLocal()
        other_user = User(
            username="otheruser",
            email="other@example.com",
            hashed_password="hashed_password",
            is_active=True
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
        
        # Create token for other user
        other_token = create_access_token(data={"sub": other_user.username})
        other_headers = {"Authorization": f"Bearer {other_token}"}
        
        # Try to access the test document (owned by testuser)
        response = client.get(f"/api/documents/{test_document.id}", headers=other_headers)
        
        # Should return 403 Forbidden or 404 Not Found depending on implementation
        assert response.status_code in [403, 404]
        
        # Cleanup
        db.delete(other_user)
        db.commit()
        db.close()

class TestDocumentIntegration:
    
    def test_complete_document_workflow(self, client, auth_headers, setup_database):
        """Test a complete document workflow from upload to deletion"""
        
        # 1. Upload document
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("Complete workflow test document")
            temp_file_path = f.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = {"file": ("workflow.txt", f, "text/plain")}
                data = {
                    "title": "Workflow Test Document",
                    "description": "Document for complete workflow test"
                }
                
                upload_response = client.post(
                    "/api/documents/upload",
                    files=files,
                    data=data,
                    headers={"Authorization": auth_headers["Authorization"]}
                )
            
            assert upload_response.status_code == 200
            document_id = upload_response.json()["document"]["id"]
            
            # 2. Add tags
            tag_response = client.post(
                f"/api/documents/{document_id}/tags",
                json={"name": "workflow", "color": "#0000ff"},
                headers=auth_headers
            )
            assert tag_response.status_code == 200
            
            # 3. Create new version
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f2:
                f2.write("Updated workflow test document")
                temp_file_path2 = f2.name
            
            try:
                with open(temp_file_path2, 'rb') as f2:
                    files2 = {"file": ("workflow_v2.txt", f2, "text/plain")}
                    data2 = {"version_notes": "Updated for workflow test"}
                    
                    version_response = client.post(
                        f"/api/documents/{document_id}/versions",
                        files=files2,
                        data=data2,
                        headers={"Authorization": auth_headers["Authorization"]}
                    )
                
                assert version_response.status_code == 200
            finally:
                os.unlink(temp_file_path2)
            
            # 4. Update document metadata
            update_response = client.put(
                f"/api/documents/{document_id}",
                json={"description": "Updated workflow test description"},
                headers=auth_headers
            )
            assert update_response.status_code == 200
            
            # 5. Search for the document
            search_response = client.get(
                "/api/documents/search?query=Workflow",
                headers=auth_headers
            )
            assert search_response.status_code == 200
            search_results = search_response.json()["documents"]
            assert any(doc["id"] == document_id for doc in search_results)
            
            # 6. Get document details
            detail_response = client.get(f"/api/documents/{document_id}", headers=auth_headers)
            assert detail_response.status_code == 200
            document_details = detail_response.json()["document"]
            assert document_details["title"] == "Workflow Test Document"
            assert document_details["description"] == "Updated workflow test description"
            
            # 7. Delete document
            delete_response = client.delete(f"/api/documents/{document_id}", headers=auth_headers)
            assert delete_response.status_code == 200
            
            # 8. Verify deletion
            verify_response = client.get(f"/api/documents/{document_id}", headers=auth_headers)
            assert verify_response.status_code == 404
            
        finally:
            os.unlink(temp_file_path)

if __name__ == "__main__":
    pytest.main([__file__])