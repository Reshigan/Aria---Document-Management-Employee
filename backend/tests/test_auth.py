"""
Automated tests for authentication system
Tests: Login, Register, JWT tokens, Password hashing, RBAC
"""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from backend.main import app
from backend.auth.jwt_auth import PasswordManager, JWTManager, AuthService
from backend.database.multi_tenant import MultiTenantDatabase
from backend.models.tenant import Tenant
from backend.models.user import User

client = TestClient(app)

# Test fixtures
@pytest.fixture
def test_tenant_data():
    return {
        "company_name": "Test Corp (Pty) Ltd",
        "company_registration": "2024/999999/07",
        "email": f"test{datetime.now().timestamp()}@testcorp.co.za",
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "phone": "+27123456789",
        "province": "Gauteng"
    }

@pytest.fixture
def registered_user(test_tenant_data):
    """Register a test user and return credentials"""
    response = client.post("/api/auth/register", json=test_tenant_data)
    assert response.status_code == 200
    data = response.json()
    return {
        "email": test_tenant_data["email"],
        "password": test_tenant_data["password"],
        "tenant_id": data["tenant_id"],
        "user_id": data["user_id"],
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"]
    }


class TestPasswordManager:
    """Test password hashing and verification"""
    
    def test_hash_password(self):
        """Test password hashing"""
        password = "TestPassword123!"
        hashed = PasswordManager.hash_password(password)
        
        # Should return a bcrypt hash
        assert hashed.startswith("$2b$")
        assert len(hashed) == 60
        
        # Same password should produce different hashes
        hashed2 = PasswordManager.hash_password(password)
        assert hashed != hashed2
    
    def test_verify_password_correct(self):
        """Test password verification with correct password"""
        password = "TestPassword123!"
        hashed = PasswordManager.hash_password(password)
        
        assert PasswordManager.verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password"""
        password = "TestPassword123!"
        hashed = PasswordManager.hash_password(password)
        
        assert PasswordManager.verify_password("WrongPassword", hashed) is False


class TestJWTManager:
    """Test JWT token creation and validation"""
    
    def test_create_access_token(self):
        """Test access token creation"""
        payload = {
            "user_id": "user_123",
            "tenant_id": "tenant_abc",
            "email": "test@example.com",
            "role": "admin"
        }
        
        token = JWTManager.create_access_token(payload)
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_create_refresh_token(self):
        """Test refresh token creation"""
        payload = {
            "user_id": "user_123",
            "tenant_id": "tenant_abc"
        }
        
        token = JWTManager.create_refresh_token(payload)
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_decode_token_valid(self):
        """Test decoding valid token"""
        payload = {
            "user_id": "user_123",
            "tenant_id": "tenant_abc",
            "email": "test@example.com",
            "role": "admin"
        }
        
        token = JWTManager.create_access_token(payload)
        decoded = JWTManager.decode_token(token)
        
        assert decoded["user_id"] == payload["user_id"]
        assert decoded["tenant_id"] == payload["tenant_id"]
        assert decoded["email"] == payload["email"]
        assert decoded["role"] == payload["role"]
    
    def test_decode_token_expired(self):
        """Test decoding expired token"""
        payload = {"user_id": "user_123"}
        
        # Create token that expires immediately
        token = JWTManager.create_access_token(payload, expires_delta=timedelta(seconds=-1))
        
        with pytest.raises(Exception):
            JWTManager.decode_token(token)
    
    def test_decode_token_invalid(self):
        """Test decoding invalid token"""
        with pytest.raises(Exception):
            JWTManager.decode_token("invalid_token_string")


class TestRegisterEndpoint:
    """Test user registration endpoint"""
    
    def test_register_success(self, test_tenant_data):
        """Test successful registration"""
        response = client.post("/api/auth/register", json=test_tenant_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return tenant_id, user_id, and tokens
        assert "tenant_id" in data
        assert "user_id" in data
        assert "access_token" in data
        assert "refresh_token" in data
        
        # Tenant ID should start with "tenant_"
        assert data["tenant_id"].startswith("tenant_")
        
        # User ID should start with "user_"
        assert data["user_id"].startswith("user_")
        
        # Tokens should be non-empty strings
        assert len(data["access_token"]) > 0
        assert len(data["refresh_token"]) > 0
    
    def test_register_duplicate_email(self, registered_user, test_tenant_data):
        """Test registration with duplicate email"""
        # Try to register with same email
        test_tenant_data["email"] = registered_user["email"]
        response = client.post("/api/auth/register", json=test_tenant_data)
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()
    
    def test_register_invalid_email(self, test_tenant_data):
        """Test registration with invalid email"""
        test_tenant_data["email"] = "invalid_email"
        response = client.post("/api/auth/register", json=test_tenant_data)
        
        assert response.status_code == 422  # Validation error
    
    def test_register_weak_password(self, test_tenant_data):
        """Test registration with weak password"""
        test_tenant_data["password"] = "weak"
        response = client.post("/api/auth/register", json=test_tenant_data)
        
        assert response.status_code == 400
        assert "password" in response.json()["detail"].lower()
    
    def test_register_missing_fields(self):
        """Test registration with missing required fields"""
        response = client.post("/api/auth/register", json={
            "email": "test@example.com"
        })
        
        assert response.status_code == 422  # Validation error


class TestLoginEndpoint:
    """Test user login endpoint"""
    
    def test_login_success(self, registered_user):
        """Test successful login"""
        response = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return tokens and user info
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        
        # User info should match
        assert data["user"]["email"] == registered_user["email"]
        assert data["user"]["tenant_id"] == registered_user["tenant_id"]
    
    def test_login_incorrect_password(self, registered_user):
        """Test login with incorrect password"""
        response = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": "WrongPassword123!"
        })
        
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_login_nonexistent_user(self):
        """Test login with nonexistent user"""
        response = client.post("/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "SomePassword123!"
        })
        
        assert response.status_code == 401
        assert "not found" in response.json()["detail"].lower() or "incorrect" in response.json()["detail"].lower()
    
    def test_login_invalid_email_format(self):
        """Test login with invalid email format"""
        response = client.post("/api/auth/login", json={
            "email": "invalid_email",
            "password": "SomePassword123!"
        })
        
        assert response.status_code == 422  # Validation error


class TestProtectedEndpoints:
    """Test protected endpoints requiring authentication"""
    
    def test_get_current_user_authenticated(self, registered_user):
        """Test getting current user with valid token"""
        response = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {registered_user['access_token']}"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == registered_user["user_id"]
        assert data["email"] == registered_user["email"]
        assert data["tenant_id"] == registered_user["tenant_id"]
    
    def test_get_current_user_no_token(self):
        """Test getting current user without token"""
        response = client.get("/api/auth/me")
        
        assert response.status_code == 401
    
    def test_get_current_user_invalid_token(self):
        """Test getting current user with invalid token"""
        response = client.get("/api/auth/me", headers={
            "Authorization": "Bearer invalid_token"
        })
        
        assert response.status_code == 401
    
    def test_get_current_user_expired_token(self):
        """Test getting current user with expired token"""
        # Create token that expires immediately
        payload = {"user_id": "user_123", "tenant_id": "tenant_abc", "email": "test@example.com", "role": "admin"}
        expired_token = JWTManager.create_access_token(payload, expires_delta=timedelta(seconds=-1))
        
        response = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {expired_token}"
        })
        
        assert response.status_code == 401


class TestTokenRefresh:
    """Test token refresh endpoint"""
    
    def test_refresh_token_success(self, registered_user):
        """Test successful token refresh"""
        response = client.post("/api/auth/refresh", json={
            "refresh_token": registered_user["refresh_token"]
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert len(data["access_token"]) > 0
        assert data["access_token"] != registered_user["access_token"]
    
    def test_refresh_token_invalid(self):
        """Test token refresh with invalid refresh token"""
        response = client.post("/api/auth/refresh", json={
            "refresh_token": "invalid_refresh_token"
        })
        
        assert response.status_code == 401


class TestRoleBasedAccessControl:
    """Test RBAC (Role-Based Access Control)"""
    
    def test_admin_access_admin_endpoint(self, registered_user):
        """Test admin accessing admin-only endpoint"""
        # Registered user is admin by default
        response = client.patch("/api/tenants/me", 
            headers={"Authorization": f"Bearer {registered_user['access_token']}"},
            json={"company_name": "Updated Corp"}
        )
        
        # Should succeed (admin can update tenant)
        assert response.status_code in [200, 201]
    
    def test_user_access_admin_endpoint(self):
        """Test regular user accessing admin-only endpoint"""
        # Create a regular user (not admin)
        # This would require creating a user with "user" role instead of "admin"
        # For now, we'll test the concept
        
        # Create user token with "user" role
        payload = {"user_id": "user_123", "tenant_id": "tenant_abc", "email": "user@example.com", "role": "user"}
        user_token = JWTManager.create_access_token(payload)
        
        response = client.patch("/api/tenants/me",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"company_name": "Updated Corp"}
        )
        
        # Should fail (only admins can update tenant)
        assert response.status_code == 403


class TestMultiTenantIsolation:
    """Test multi-tenant data isolation"""
    
    def test_different_tenants_isolated(self, test_tenant_data):
        """Test that different tenants cannot access each other's data"""
        # Register tenant 1
        tenant1_data = test_tenant_data.copy()
        tenant1_data["email"] = f"tenant1_{datetime.now().timestamp()}@example.com"
        response1 = client.post("/api/auth/register", json=tenant1_data)
        assert response1.status_code == 200
        tenant1 = response1.json()
        
        # Register tenant 2
        tenant2_data = test_tenant_data.copy()
        tenant2_data["email"] = f"tenant2_{datetime.now().timestamp()}@example.com"
        tenant2_data["company_name"] = "Another Corp (Pty) Ltd"
        response2 = client.post("/api/auth/register", json=tenant2_data)
        assert response2.status_code == 200
        tenant2 = response2.json()
        
        # Verify tenant IDs are different
        assert tenant1["tenant_id"] != tenant2["tenant_id"]
        
        # Tenant 1 should only see their own data
        response = client.get("/api/tenants/me", headers={
            "Authorization": f"Bearer {tenant1['access_token']}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["tenant_id"] == tenant1["tenant_id"]
        assert data["company_name"] == tenant1_data["company_name"]
        
        # Tenant 2 should only see their own data
        response = client.get("/api/tenants/me", headers={
            "Authorization": f"Bearer {tenant2['access_token']}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["tenant_id"] == tenant2["tenant_id"]
        assert data["company_name"] == tenant2_data["company_name"]


# Performance Tests
class TestAuthPerformance:
    """Test authentication performance"""
    
    def test_login_performance(self, registered_user):
        """Test login response time"""
        import time
        
        start = time.time()
        response = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        duration = time.time() - start
        
        assert response.status_code == 200
        assert duration < 1.0  # Should complete in less than 1 second
    
    def test_token_validation_performance(self, registered_user):
        """Test token validation response time"""
        import time
        
        start = time.time()
        response = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {registered_user['access_token']}"
        })
        duration = time.time() - start
        
        assert response.status_code == 200
        assert duration < 0.2  # Should complete in less than 200ms


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
