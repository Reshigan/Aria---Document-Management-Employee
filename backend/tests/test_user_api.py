import pytest
import json
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db, Base
from app.models.user import User, UserProfile, UserRole, UserSession, UserActivity
from app.auth import create_access_token, verify_password, get_password_hash

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_users.db"
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
        hashed_password=get_password_hash("testpassword"),
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
def admin_user():
    db = TestingSessionLocal()
    admin = User(
        username="admin",
        email="admin@example.com",
        hashed_password=get_password_hash("adminpassword"),
        is_active=True,
        is_verified=True,
        is_superuser=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    yield admin
    db.delete(admin)
    db.commit()
    db.close()

@pytest.fixture
def auth_headers(test_user):
    token = create_access_token(data={"sub": test_user.username})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def admin_headers(admin_user):
    token = create_access_token(data={"sub": admin_user.username})
    return {"Authorization": f"Bearer {token}"}

class TestUserRegistrationAPI:
    
    def test_register_user(self, client, setup_database):
        user_data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "newpassword123",
            "full_name": "New User"
        }
        
        response = client.post("/api/auth/register", json=user_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["user"]["username"] == "newuser"
        assert data["user"]["email"] == "newuser@example.com"
        assert "password" not in data["user"]  # Password should not be returned
    
    def test_register_duplicate_username(self, client, test_user, setup_database):
        user_data = {
            "username": "testuser",  # Same as existing user
            "email": "different@example.com",
            "password": "password123"
        }
        
        response = client.post("/api/auth/register", json=user_data)
        
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "username" in data["message"].lower()
    
    def test_register_duplicate_email(self, client, test_user, setup_database):
        user_data = {
            "username": "differentuser",
            "email": "test@example.com",  # Same as existing user
            "password": "password123"
        }
        
        response = client.post("/api/auth/register", json=user_data)
        
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "email" in data["message"].lower()
    
    def test_register_invalid_email(self, client, setup_database):
        user_data = {
            "username": "invaliduser",
            "email": "invalid-email",
            "password": "password123"
        }
        
        response = client.post("/api/auth/register", json=user_data)
        
        assert response.status_code == 422  # Validation error

class TestUserAuthenticationAPI:
    
    def test_login_success(self, client, test_user, setup_database):
        login_data = {
            "username": "testuser",
            "password": "testpassword"
        }
        
        response = client.post("/api/auth/login", data=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_invalid_username(self, client, setup_database):
        login_data = {
            "username": "nonexistent",
            "password": "password"
        }
        
        response = client.post("/api/auth/login", data=login_data)
        
        assert response.status_code == 401
    
    def test_login_invalid_password(self, client, test_user, setup_database):
        login_data = {
            "username": "testuser",
            "password": "wrongpassword"
        }
        
        response = client.post("/api/auth/login", data=login_data)
        
        assert response.status_code == 401
    
    def test_login_inactive_user(self, client, setup_database):
        # Create inactive user
        db = TestingSessionLocal()
        inactive_user = User(
            username="inactive",
            email="inactive@example.com",
            hashed_password=get_password_hash("password"),
            is_active=False
        )
        db.add(inactive_user)
        db.commit()
        
        login_data = {
            "username": "inactive",
            "password": "password"
        }
        
        response = client.post("/api/auth/login", data=login_data)
        
        assert response.status_code == 401
        
        # Cleanup
        db.delete(inactive_user)
        db.commit()
        db.close()

class TestUserProfileAPI:
    
    def test_get_current_user(self, client, auth_headers, test_user, setup_database):
        response = client.get("/api/users/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == test_user.username
        assert data["email"] == test_user.email
        assert "hashed_password" not in data
    
    def test_update_current_user(self, client, auth_headers, setup_database):
        update_data = {
            "full_name": "Updated Full Name",
            "bio": "Updated bio"
        }
        
        response = client.put("/api/users/me", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["user"]["full_name"] == "Updated Full Name"
    
    def test_change_password(self, client, auth_headers, setup_database):
        password_data = {
            "current_password": "testpassword",
            "new_password": "newtestpassword123"
        }
        
        response = client.post("/api/users/change-password", json=password_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_change_password_wrong_current(self, client, auth_headers, setup_database):
        password_data = {
            "current_password": "wrongpassword",
            "new_password": "newtestpassword123"
        }
        
        response = client.post("/api/users/change-password", json=password_data, headers=auth_headers)
        
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False

class TestUserManagementAPI:
    
    def test_get_users_admin(self, client, admin_headers, setup_database):
        response = client.get("/api/users", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "users" in data
        assert len(data["users"]) >= 1
    
    def test_get_users_non_admin(self, client, auth_headers, setup_database):
        response = client.get("/api/users", headers=auth_headers)
        
        # Should return 403 Forbidden for non-admin users
        assert response.status_code == 403
    
    def test_get_user_by_id_admin(self, client, admin_headers, test_user, setup_database):
        response = client.get(f"/api/users/{test_user.id}", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["user"]["id"] == test_user.id
        assert data["user"]["username"] == test_user.username
    
    def test_update_user_admin(self, client, admin_headers, test_user, setup_database):
        update_data = {
            "is_active": False,
            "full_name": "Admin Updated Name"
        }
        
        response = client.put(f"/api/users/{test_user.id}", json=update_data, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["user"]["is_active"] is False
        assert data["user"]["full_name"] == "Admin Updated Name"
    
    def test_delete_user_admin(self, client, admin_headers, setup_database):
        # Create a user to delete
        db = TestingSessionLocal()
        delete_user = User(
            username="deleteuser",
            email="delete@example.com",
            hashed_password=get_password_hash("password"),
            is_active=True
        )
        db.add(delete_user)
        db.commit()
        db.refresh(delete_user)
        user_id = delete_user.id
        db.close()
        
        response = client.delete(f"/api/users/{user_id}", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

class TestUserRoleAPI:
    
    def test_assign_role(self, client, admin_headers, test_user, setup_database):
        role_data = {
            "role_name": "editor",
            "permissions": ["read", "write", "edit"]
        }
        
        response = client.post(f"/api/users/{test_user.id}/roles", json=role_data, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["role"]["role_name"] == "editor"
    
    def test_get_user_roles(self, client, admin_headers, test_user, setup_database):
        response = client.get(f"/api/users/{test_user.id}/roles", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "roles" in data
    
    def test_remove_role(self, client, admin_headers, test_user, setup_database):
        # First assign a role
        role_data = {"role_name": "temporary", "permissions": ["read"]}
        role_response = client.post(f"/api/users/{test_user.id}/roles", json=role_data, headers=admin_headers)
        role_id = role_response.json()["role"]["id"]
        
        # Then remove it
        response = client.delete(f"/api/users/{test_user.id}/roles/{role_id}", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

class TestUserSessionAPI:
    
    def test_get_user_sessions(self, client, auth_headers, setup_database):
        response = client.get("/api/users/me/sessions", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "sessions" in data
    
    def test_revoke_session(self, client, auth_headers, setup_database):
        # Create a session first
        db = TestingSessionLocal()
        user = db.query(User).filter(User.username == "testuser").first()
        session = UserSession(
            user_id=user.id,
            session_token="test_session_token",
            expires_at=datetime.utcnow() + timedelta(hours=1),
            is_active=True
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = session.id
        db.close()
        
        response = client.delete(f"/api/users/me/sessions/{session_id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

class TestUserActivityAPI:
    
    def test_get_user_activity(self, client, auth_headers, setup_database):
        response = client.get("/api/users/me/activity", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "activities" in data
    
    def test_log_user_activity(self, client, auth_headers, setup_database):
        activity_data = {
            "activity_type": "document_view",
            "description": "Viewed document #123",
            "metadata": {"document_id": 123}
        }
        
        response = client.post("/api/users/me/activity", json=activity_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["activity"]["activity_type"] == "document_view"

class TestUserStatisticsAPI:
    
    def test_get_user_statistics(self, client, auth_headers, setup_database):
        response = client.get("/api/users/me/statistics", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "statistics" in data
        assert "total_documents" in data["statistics"]
        assert "total_storage_used" in data["statistics"]
    
    def test_get_all_users_statistics_admin(self, client, admin_headers, setup_database):
        response = client.get("/api/users/statistics", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "statistics" in data
        assert "total_users" in data["statistics"]
        assert "active_users" in data["statistics"]

class TestUserPreferencesAPI:
    
    def test_get_user_preferences(self, client, auth_headers, setup_database):
        response = client.get("/api/users/me/preferences", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "preferences" in data
    
    def test_update_user_preferences(self, client, auth_headers, setup_database):
        preferences_data = {
            "theme": "dark",
            "language": "en",
            "notifications_enabled": True,
            "email_notifications": False
        }
        
        response = client.put("/api/users/me/preferences", json=preferences_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["preferences"]["theme"] == "dark"
        assert data["preferences"]["language"] == "en"

class TestUserVerificationAPI:
    
    def test_request_email_verification(self, client, setup_database):
        # Create unverified user
        db = TestingSessionLocal()
        unverified_user = User(
            username="unverified",
            email="unverified@example.com",
            hashed_password=get_password_hash("password"),
            is_active=True,
            is_verified=False
        )
        db.add(unverified_user)
        db.commit()
        
        verification_data = {
            "email": "unverified@example.com"
        }
        
        response = client.post("/api/auth/request-verification", json=verification_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Cleanup
        db.delete(unverified_user)
        db.commit()
        db.close()
    
    def test_verify_email(self, client, setup_database):
        # This would typically involve a verification token
        # For testing purposes, we'll simulate the verification process
        verification_data = {
            "token": "mock_verification_token",
            "email": "test@example.com"
        }
        
        response = client.post("/api/auth/verify-email", json=verification_data)
        
        # The actual response depends on implementation
        # This test structure shows how it would be tested
        assert response.status_code in [200, 400, 404]

class TestPasswordResetAPI:
    
    def test_request_password_reset(self, client, test_user, setup_database):
        reset_data = {
            "email": test_user.email
        }
        
        response = client.post("/api/auth/request-password-reset", json=reset_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_reset_password(self, client, setup_database):
        # This would typically involve a reset token
        reset_data = {
            "token": "mock_reset_token",
            "new_password": "newresetpassword123"
        }
        
        response = client.post("/api/auth/reset-password", json=reset_data)
        
        # The actual response depends on implementation
        assert response.status_code in [200, 400, 404]

class TestUserIntegration:
    
    def test_complete_user_workflow(self, client, setup_database):
        """Test a complete user workflow from registration to profile management"""
        
        # 1. Register new user
        user_data = {
            "username": "workflowuser",
            "email": "workflow@example.com",
            "password": "workflowpassword123",
            "full_name": "Workflow User"
        }
        
        register_response = client.post("/api/auth/register", json=user_data)
        assert register_response.status_code == 200
        
        # 2. Login
        login_data = {
            "username": "workflowuser",
            "password": "workflowpassword123"
        }
        
        login_response = client.post("/api/auth/login", data=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Get current user profile
        profile_response = client.get("/api/users/me", headers=headers)
        assert profile_response.status_code == 200
        user_profile = profile_response.json()
        assert user_profile["username"] == "workflowuser"
        
        # 4. Update profile
        update_data = {
            "full_name": "Updated Workflow User",
            "bio": "This is my bio"
        }
        
        update_response = client.put("/api/users/me", json=update_data, headers=headers)
        assert update_response.status_code == 200
        
        # 5. Update preferences
        preferences_data = {
            "theme": "dark",
            "language": "en",
            "notifications_enabled": True
        }
        
        prefs_response = client.put("/api/users/me/preferences", json=preferences_data, headers=headers)
        assert prefs_response.status_code == 200
        
        # 6. Log activity
        activity_data = {
            "activity_type": "profile_update",
            "description": "Updated user profile"
        }
        
        activity_response = client.post("/api/users/me/activity", json=activity_data, headers=headers)
        assert activity_response.status_code == 200
        
        # 7. Change password
        password_data = {
            "current_password": "workflowpassword123",
            "new_password": "newworkflowpassword456"
        }
        
        password_response = client.post("/api/users/change-password", json=password_data, headers=headers)
        assert password_response.status_code == 200
        
        # 8. Verify new password works
        new_login_data = {
            "username": "workflowuser",
            "password": "newworkflowpassword456"
        }
        
        new_login_response = client.post("/api/auth/login", data=new_login_data)
        assert new_login_response.status_code == 200
        
        # 9. Get user statistics
        stats_response = client.get("/api/users/me/statistics", headers=headers)
        assert stats_response.status_code == 200
        
        # 10. Get user activity history
        activity_history_response = client.get("/api/users/me/activity", headers=headers)
        assert activity_history_response.status_code == 200
        activities = activity_history_response.json()["activities"]
        assert len(activities) >= 1

if __name__ == "__main__":
    pytest.main([__file__])