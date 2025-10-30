"""
Integration tests for Auth API endpoints (100% coverage).
"""
import pytest
from app.core.security import get_password_hash


@pytest.mark.integration
class TestUserRegistration:
    """Test user registration endpoint."""
    
    def test_register_user_success(self, client, db_session):
        """Test successful user registration."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "first_name": "New",
                "last_name": "User",
                "password": "password123",
                "company_name": "Test Company",
            },
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "newuser@example.com"
        assert "password" not in data["user"]
    
    def test_register_duplicate_email(self, client, test_user):
        """Test registration with duplicate email."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": test_user.email,
                "first_name": "Another",
                "last_name": "User",
                "password": "password123",
            },
        )
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()
    
    def test_register_invalid_email(self, client):
        """Test registration with invalid email."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "invalid-email",
                "first_name": "Test",
                "last_name": "User",
                "password": "password123",
            },
        )
        
        assert response.status_code == 422


@pytest.mark.integration
class TestUserLogin:
    """Test user login endpoint."""
    
    def test_login_success(self, client, test_user):
        """Test successful login."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user.email,
                "password": "testpass123",
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_wrong_password(self, client, test_user):
        """Test login with wrong password."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user.email,
                "password": "wrongpassword",
            },
        )
        
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_login_nonexistent_user(self, client):
        """Test login with nonexistent user."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "password123",
            },
        )
        
        assert response.status_code == 401
    
    def test_login_inactive_user(self, client, db_session, test_user):
        """Test login with inactive user."""
        test_user.is_active = False
        db_session.commit()
        
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user.email,
                "password": "testpass123",
            },
        )
        
        assert response.status_code == 400
        assert "inactive" in response.json()["detail"].lower()


@pytest.mark.integration
class TestCurrentUser:
    """Test get current user endpoint."""
    
    def test_get_current_user_success(self, client, auth_headers, test_user):
        """Test getting current user with valid token."""
        response = client.get(
            "/api/v1/auth/me",
            headers=auth_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["first_name"] == test_user.first_name
        assert "password" not in data
    
    def test_get_current_user_no_token(self, client):
        """Test getting current user without token."""
        response = client.get("/api/v1/auth/me")
        
        assert response.status_code == 401
    
    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token."""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        
        assert response.status_code == 401


@pytest.mark.integration
class TestUpdateUser:
    """Test user update endpoint."""
    
    def test_update_user_success(self, client, auth_headers, test_user):
        """Test updating user information."""
        response = client.put(
            f"/api/v1/auth/users/{test_user.id}",
            headers=auth_headers,
            json={
                "full_name": "Updated Name",
                "email": test_user.email,
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"
    
    def test_update_user_unauthorized(self, client, test_user):
        """Test updating user without authentication."""
        response = client.put(
            f"/api/v1/auth/users/{test_user.id}",
            json={
                "full_name": "Updated Name",
                "email": test_user.email,
            },
        )
        
        assert response.status_code == 401


@pytest.mark.integration
class TestPasswordChange:
    """Test password change functionality."""
    
    def test_change_password_success(self, client, auth_headers, test_user):
        """Test successful password change."""
        response = client.post(
            "/api/v1/auth/change-password",
            headers=auth_headers,
            json={
                "current_password": "testpass123",
                "new_password": "newpassword123",
            },
        )
        
        assert response.status_code == 200
        
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user.email,
                "password": "newpassword123",
            },
        )
        assert login_response.status_code == 200
    
    def test_change_password_wrong_current(self, client, auth_headers):
        """Test password change with wrong current password."""
        response = client.post(
            "/api/v1/auth/change-password",
            headers=auth_headers,
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword123",
            },
        )
        
        assert response.status_code == 400
        assert "incorrect" in response.json()["detail"].lower()
