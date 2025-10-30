#!/usr/bin/env python3
"""Test ARIA ERP System"""
import requests
import json

import os
BASE_URL = os.getenv("API_URL", "http://localhost:8000")

def test_auth():
    """Test authentication"""
    print("=" * 50)
    print("Testing Authentication...")
    print("=" * 50)
    
    response = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        data={
            "username": "admin@aria-erp.com",
            "password": "AdminPass123!"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Login successful!")
        print(f"   User: {data['user']['email']} ({data['user']['role']})")
        print(f"   Company ID: {data['user']['company_id']}")
        return data['access_token']
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(f"   {response.text}")
        return None

def test_bots(token):
    """Test bot system"""
    print("\n" + "=" * 50)
    print("Testing Bot System...")
    print("=" * 50)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # List all bots
    response = requests.get(f"{BASE_URL}/api/v1/bots/", headers=headers)
    if response.status_code == 200:
        bots = response.json()
        print(f"✅ Bot System: {len(bots)} bots available")
        
        # Show first 5 bots
        print("\n   Sample bots:")
        for i, bot in enumerate(bots[:5], 1):
            print(f"   {i}. {bot['name']} ({bot['category']})")
        
        return True
    else:
        print(f"❌ Failed to list bots: {response.status_code}")
        return False

def test_bot_categories(token):
    """Test bot categories"""
    print("\n" + "=" * 50)
    print("Testing Bot Categories...")
    print("=" * 50)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{BASE_URL}/api/v1/bots/categories", headers=headers)
    if response.status_code == 200:
        categories = response.json()
        print(f"✅ Found {len(categories)} categories")
        for cat, count in categories.items():
            print(f"   - {cat}: {count} bots")
        return True
    else:
        print(f"❌ Failed to get categories: {response.status_code}")
        return False

def test_bot_execution(token):
    """Test bot execution"""
    print("\n" + "=" * 50)
    print("Testing Bot Execution...")
    print("=" * 50)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test a simple bot
    response = requests.post(
        f"{BASE_URL}/api/v1/bots/financial_close_bot/execute",
        headers=headers,
        json={"action": "test"}
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Bot execution successful")
        print(f"   Status: {result.get('status', 'N/A')}")
        print(f"   Message: {result.get('message', 'N/A')}")
        return True
    else:
        print(f"❌ Bot execution failed: {response.status_code}")
        print(f"   {response.text}")
        return False

def main():
    print("\n")
    print("╔══════════════════════════════════════════════════╗")
    print("║        ARIA ERP SYSTEM - TEST SUITE            ║")
    print("╚══════════════════════════════════════════════════╝")
    
    # Test authentication
    token = test_auth()
    if not token:
        print("\n❌ Authentication failed. Cannot continue tests.")
        return False
    
    # Test bot system
    success = True
    success &= test_bots(token)
    success &= test_bot_categories(token)
    success &= test_bot_execution(token)
    
    # Summary
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    if success:
        print("✅ All tests passed!")
        print("\nThe ERP system is ready for deployment!")
    else:
        print("⚠️  Some tests failed")
    
    return success

if __name__ == "__main__":
    main()
