"""
Integration tests for authentication API endpoints
Tests complete auth flow: register, login, password reset, logout
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.user import User, PasswordResetToken


class TestRegistration:
    """Test user registration endpoint"""
    
    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient):
        """Test successful user registration"""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "NewPass123!",
                "full_name": "New User"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "newuser"
        assert data["email"] == "newuser@example.com"
        assert "id" in data
        assert "hashed_password" not in data
    
    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient, test_user: User):
        """Test registration with duplicate email fails"""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "anotheruser",
                "email": "test@example.com",  # Duplicate
                "password": "AnotherPass123!",
                "full_name": "Another User"
            }
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_register_duplicate_username(self, client: AsyncClient, test_user: User):
        """Test registration with duplicate username fails"""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "testuser",  # Duplicate
                "email": "another@example.com",
                "password": "AnotherPass123!",
                "full_name": "Another User"
            }
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_register_weak_password(self, client: AsyncClient):
        """Test registration with weak password fails"""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "weakpassuser",
                "email": "weak@example.com",
                "password": "weak",
                "full_name": "Weak Password User"
            }
        )
        assert response.status_code == 400
        assert "password" in response.json()["detail"].lower()


class TestLogin:
    """Test user login endpoint"""
    
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, test_user: User):
        """Test successful login"""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
    
    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient, test_user: User):
        """Test login with wrong password fails"""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "WrongPassword123!"
            }
        )
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent user fails"""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "nonexistent",
                "password": "SomePassword123!"
            }
        )
        assert response.status_code == 401


class TestPasswordReset:
    """Test password reset flow"""
    
    @pytest.mark.asyncio
    async def test_forgot_password_valid_email(
        self,
        client: AsyncClient,
        test_user: User,
        test_db: AsyncSession
    ):
        """Test forgot password with valid email"""
        response = await client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "test@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "token" in data  # Dev mode returns token
        
        # Verify token was created in database
        result = await test_db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == test_user.id
            )
        )
        token = result.scalar_one_or_none()
        assert token is not None
        assert not token.used
    
    @pytest.mark.asyncio
    async def test_forgot_password_invalid_email(self, client: AsyncClient):
        """Test forgot password with invalid email (no enumeration)"""
        response = await client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "nonexistent@example.com"}
        )
        # Should return success to prevent email enumeration
        assert response.status_code == 200
        assert "message" in response.json()
    
    @pytest.mark.asyncio
    async def test_reset_password_valid_token(
        self,
        client: AsyncClient,
        test_user: User,
        test_db: AsyncSession
    ):
        """Test password reset with valid token"""
        # First, get a reset token
        forgot_response = await client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "test@example.com"}
        )
        token = forgot_response.json()["token"]
        
        # Reset password
        response = await client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": token,
                "new_password": "NewPassword123!"
            }
        )
        assert response.status_code == 200
        assert "success" in response.json()["message"].lower()
        
        # Verify can login with new password
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "NewPassword123!"
            }
        )
        assert login_response.status_code == 200
        
        # Verify old password doesn't work
        old_login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!"
            }
        )
        assert old_login_response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_reset_password_invalid_token(self, client: AsyncClient):
        """Test password reset with invalid token"""
        response = await client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": "invalid_token_12345",
                "new_password": "NewPassword123!"
            }
        )
        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_reset_password_used_token(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test password reset with already-used token"""
        # Get token
        forgot_response = await client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "test@example.com"}
        )
        token = forgot_response.json()["token"]
        
        # Use token once
        await client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": token,
                "new_password": "NewPassword123!"
            }
        )
        
        # Try to use token again
        response = await client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": token,
                "new_password": "AnotherPassword123!"
            }
        )
        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_reset_password_weak_password(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test password reset with weak password"""
        # Get token
        forgot_response = await client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "test@example.com"}
        )
        token = forgot_response.json()["token"]
        
        # Try to reset with weak password
        response = await client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": token,
                "new_password": "weak"
            }
        )
        assert response.status_code == 400
        assert "password" in response.json()["detail"].lower()


class TestTokenRefresh:
    """Test token refresh endpoint"""
    
    @pytest.mark.asyncio
    async def test_refresh_token_success(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test successful token refresh"""
        # Login first
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!"
            }
        )
        refresh_token = login_response.json()["refresh_token"]
        
        # Refresh token
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data


class TestProtectedEndpoints:
    """Test authentication required endpoints"""
    
    @pytest.mark.asyncio
    async def test_access_protected_without_token(self, client: AsyncClient):
        """Test accessing protected endpoint without token fails"""
        response = await client.get("/api/v1/users/me")
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_access_protected_with_token(
        self,
        client: AsyncClient,
        auth_headers: dict
    ):
        """Test accessing protected endpoint with valid token succeeds"""
        response = await client.get(
            "/api/v1/users/me",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"


# Run with: pytest backend/tests/integration/test_auth_api.py -v
