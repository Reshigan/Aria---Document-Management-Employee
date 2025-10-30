#!/usr/bin/env python3
"""
Quick system test script to verify ERP and bots are working.
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:12000"

def test_health():
    """Test health endpoint."""
    response = requests.get(f"{BASE_URL}/health")
    print(f"✓ Health check: {response.json()}")
    return response.status_code == 200

def create_test_user():
    """Create a test user."""
    user_data = {
        "email": "admin@aria-erp.com",
        "password": "AdminPass123!",
        "first_name": "Admin",
        "last_name": "User",
        "role": "admin"
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=user_data)
    if response.status_code in [200, 201]:
        print("✓ Test user created")
        return True
    elif response.status_code == 400 and "already registered" in response.text:
        print("✓ Test user already exists")
        return True
    else:
        print(f"✗ Failed to create user: {response.status_code} - {response.text}")
        return False

def login():
    """Login and get token."""
    login_data = {
        "username": "admin@aria-erp.com",
        "password": "AdminPass123!"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if response.status_code == 200:
        token = response.json().get("access_token")
        print(f"✓ Login successful")
        return token
    else:
        print(f"✗ Login failed: {response.status_code} - {response.text}")
        return None

def test_bots(token):
    """Test bot endpoints."""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get all bots
    response = requests.get(f"{BASE_URL}/api/v1/bots/", headers=headers)
    if response.status_code == 200:
        bots = response.json()
        print(f"✓ Found {len(bots)} bots")
        
        # Test first bot
        if bots:
            bot_id = bots[0]["id"]
            print(f"  Testing bot: {bots[0]['name']}")
            
            # Execute bot
            exec_data = {"query": "Hello, what can you do?"}
            response = requests.post(
                f"{BASE_URL}/api/v1/bots/{bot_id}/execute",
                json=exec_data,
                headers=headers
            )
            if response.status_code == 200:
                print(f"  ✓ Bot executed successfully")
                return True
            else:
                print(f"  ✗ Bot execution failed: {response.status_code}")
                return False
    else:
        print(f"✗ Failed to get bots: {response.status_code} - {response.text}")
        return False

def test_core_features(token):
    """Test core ERP features."""
    headers = {"Authorization": f"Bearer {token}"}
    
    tests = []
    
    # Test customers endpoint
    response = requests.get(f"{BASE_URL}/api/v1/customers/", headers=headers)
    tests.append(("Customers", response.status_code == 200))
    
    # Test suppliers endpoint
    response = requests.get(f"{BASE_URL}/api/v1/suppliers/", headers=headers)
    tests.append(("Suppliers", response.status_code == 200))
    
    # Test invoices endpoint
    response = requests.get(f"{BASE_URL}/api/v1/invoices/", headers=headers)
    tests.append(("Invoices", response.status_code == 200))
    
    # Test accounts endpoint
    response = requests.get(f"{BASE_URL}/api/v1/accounts/", headers=headers)
    tests.append(("Accounts", response.status_code == 200))
    
    # Test dashboard endpoint
    response = requests.get(f"{BASE_URL}/api/v1/dashboard/stats", headers=headers)
    tests.append(("Dashboard", response.status_code == 200))
    
    for feature, passed in tests:
        status = "✓" if passed else "✗"
        print(f"{status} {feature}: {'PASS' if passed else 'FAIL'}")
    
    return all(passed for _, passed in tests)

def main():
    """Run all tests."""
    print("="*60)
    print("ARIA ERP System Test")
    print("="*60)
    print()
    
    print("1. Testing Health...")
    if not test_health():
        print("System not healthy! Exiting.")
        return
    print()
    
    print("2. Creating Test User...")
    if not create_test_user():
        print("Cannot proceed without user. Exiting.")
        return
    print()
    
    print("3. Testing Login...")
    token = login()
    if not token:
        print("Login failed! Exiting.")
        return
    print()
    
    print("4. Testing Bot System...")
    test_bots(token)
    print()
    
    print("5. Testing Core Features...")
    test_core_features(token)
    print()
    
    print("="*60)
    print("✅ SYSTEM TEST COMPLETE")
    print("="*60)

if __name__ == "__main__":
    main()
