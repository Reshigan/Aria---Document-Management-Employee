"""
Authentication utilities for testing
"""
from typing import Optional, Dict
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.client import APIClient
from config import ADMIN_EMAIL, ADMIN_PASSWORD, TEST_USER_EMAIL, TEST_USER_PASSWORD


def login(client: APIClient, email: str, password: str) -> Optional[str]:
    """
    Login and return access token
    
    Args:
        client: API client
        email: User email
        password: User password
    
    Returns:
        Access token or None if login failed
    """
    try:
        response = client.post(
            '/api/auth/login',
            data={'username': email, 'password': password},
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get('access_token')
        
        response = client.post(
            '/api/auth/login',
            json={'email': email, 'password': password}
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get('access_token') or data.get('token')
        
        return None
    except Exception as e:
        print(f"Login failed: {e}")
        return None


def register_test_user(client: APIClient, email: str, password: str, 
                       first_name: str = "Test", last_name: str = "User") -> bool:
    """
    Register a test user
    
    Args:
        client: API client
        email: User email
        password: User password
        first_name: First name
        last_name: Last name
    
    Returns:
        True if registration successful
    """
    try:
        response = client.post(
            '/api/auth/register',
            json={
                'email': email,
                'password': password,
                'first_name': first_name,
                'last_name': last_name
            }
        )
        return response.status_code in [200, 201]
    except Exception as e:
        print(f"Registration failed: {e}")
        return False


def get_or_create_admin_token(client: APIClient) -> Optional[str]:
    """
    Get admin token, creating admin user if needed
    
    Args:
        client: API client
    
    Returns:
        Admin access token or None
    """
    token = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    if token:
        return token
    
    if register_test_user(client, ADMIN_EMAIL, ADMIN_PASSWORD, "Admin", "User"):
        token = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
        if token:
            return token
    
    return None


def get_or_create_user_token(client: APIClient) -> Optional[str]:
    """
    Get user token, creating user if needed
    
    Args:
        client: API client
    
    Returns:
        User access token or None
    """
    token = login(client, TEST_USER_EMAIL, TEST_USER_PASSWORD)
    if token:
        return token
    
    if register_test_user(client, TEST_USER_EMAIL, TEST_USER_PASSWORD, "Test", "User"):
        token = login(client, TEST_USER_EMAIL, TEST_USER_PASSWORD)
        if token:
            return token
    
    return None
