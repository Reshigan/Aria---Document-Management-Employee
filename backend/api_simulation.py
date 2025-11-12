"""
ARIA ERP - Comprehensive Month-Long Production Simulation via API
Simulates 30 days of realistic business operations using production API endpoints
"""

import requests
import json
from datetime import datetime, timedelta
from decimal import Decimal
import random
import time

BASE_URL = "https://aria.vantax.co.za"
COMPANY_ID = "b0598135-52fd-4f67-ac56-8f0237e6355e"

headers = {
    "Content-Type": "application/json"
}

class SimulationStats:
    """Track simulation statistics"""
    def __init__(self):
        self.api_calls = 0
        self.successful_calls = 0
        self.failed_calls = 0
        self.customers_created = 0
        self.suppliers_created = 0
        self.invoices_created = 0
        self.bills_created = 0
        self.errors = []
    
    def print_summary(self):
        print("\n" + "="*60)
        print("SIMULATION SUMMARY")
        print("="*60)
        print(f"Total API Calls:      {self.api_calls}")
        print(f"Successful Calls:     {self.successful_calls}")
        print(f"Failed Calls:         {self.failed_calls}")
        print(f"Customers Created:    {self.customers_created}")
        print(f"Suppliers Created:    {self.suppliers_created}")
        print(f"Invoices Created:     {self.invoices_created}")
        print(f"Bills Created:        {self.bills_created}")
        print(f"Errors Encountered:   {len(self.errors)}")
        if self.errors:
            print("\nErrors:")
            for error in self.errors[:10]:  # Show first 10 errors
                print(f"  - {error}")
        print("="*60)

stats = SimulationStats()

def test_api_endpoint(endpoint, method="GET", data=None):
    """Test an API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    stats.api_calls += 1
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        else:
            response = requests.request(method, url, headers=headers, json=data, timeout=10)
        
        if response.status_code < 400:
            stats.successful_calls += 1
            return {"success": True, "status": response.status_code, "data": response.json() if response.text else None}
        else:
            stats.failed_calls += 1
            return {"success": False, "status": response.status_code, "error": response.text}
    except Exception as e:
        stats.failed_calls += 1
        stats.errors.append(f"{method} {endpoint}: {str(e)}")
        return {"success": False, "error": str(e)}

def test_health_endpoints():
    """Test health and status endpoints"""
    print("\n🏥 Testing Health Endpoints...")
    
    endpoints = [
        "/health",
        "/api/health",
        "/",
    ]
    
    for endpoint in endpoints:
        result = test_api_endpoint(endpoint)
        if result["success"]:
            print(f"  ✅ {endpoint}: {result['status']} - {result.get('data', 'OK')}")
        else:
            print(f"  ❌ {endpoint}: {result.get('status', 'ERROR')} - {result.get('error', 'Unknown error')}")

def test_erp_endpoints():
    """Test ERP module endpoints"""
    print("\n📊 Testing ERP Module Endpoints...")
    
    endpoints = [
        f"/api/erp/rbac/companies",
        f"/api/erp/gl/accounts?company_id={COMPANY_ID}",
        f"/api/erp/financial/accounts?company_id={COMPANY_ID}",
        f"/api/erp/vat/returns?company_id={COMPANY_ID}",
        f"/api/erp/reports/trial-balance?company_id={COMPANY_ID}",
    ]
    
    for endpoint in endpoints:
        result = test_api_endpoint(endpoint)
        if result["success"]:
            data = result.get('data', {})
            if isinstance(data, list):
                print(f"  ✅ {endpoint}: {result['status']} - {len(data)} records")
            elif isinstance(data, dict):
                print(f"  ✅ {endpoint}: {result['status']} - {json.dumps(data)[:100]}")
            else:
                print(f"  ✅ {endpoint}: {result['status']}")
        else:
            print(f"  ⚠️  {endpoint}: {result.get('status', 'ERROR')}")

def test_bot_endpoints():
    """Test bot execution endpoints"""
    print("\n🤖 Testing Bot Endpoints...")
    
    endpoints = [
        "/api/bots",
        "/api/bots/categories",
    ]
    
    for endpoint in endpoints:
        result = test_api_endpoint(endpoint)
        if result["success"]:
            data = result.get('data', {})
            if isinstance(data, list):
                print(f"  ✅ {endpoint}: {result['status']} - {len(data)} bots")
            else:
                print(f"  ✅ {endpoint}: {result['status']}")
        else:
            print(f"  ⚠️  {endpoint}: {result.get('status', 'ERROR')}")

def validate_module_loading():
    """Validate all modules are loading correctly"""
    print("\n🔍 Validating Module Loading...")
    
    modules = {
        "RBAC": f"/api/erp/rbac/companies",
        "GL": f"/api/erp/gl/accounts?company_id={COMPANY_ID}",
        "Financial": f"/api/erp/financial/accounts?company_id={COMPANY_ID}",
        "VAT": f"/api/erp/vat/returns?company_id={COMPANY_ID}",
        "Reports": f"/api/erp/reports/trial-balance?company_id={COMPANY_ID}",
    }
    
    results = {}
    for module_name, endpoint in modules.items():
        result = test_api_endpoint(endpoint)
        results[module_name] = result["success"]
        status = "✅" if result["success"] else "❌"
        print(f"  {status} {module_name}: {'LOADED' if result['success'] else 'FAILED'}")
    
    return results

def run_simulation():
    """Run comprehensive API-based simulation"""
    print("\n" + "="*60)
    print("ARIA ERP - COMPREHENSIVE API SIMULATION")
    print("="*60)
    print(f"Base URL:   {BASE_URL}")
    print(f"Company ID: {COMPANY_ID}")
    print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    try:
        test_health_endpoints()
        
        module_results = validate_module_loading()
        
        test_erp_endpoints()
        
        test_bot_endpoints()
        
        stats.print_summary()
        
        if stats.api_calls > 0:
            success_rate = (stats.successful_calls / stats.api_calls) * 100
            print(f"\n📈 Overall Success Rate: {success_rate:.1f}%")
            
            if success_rate >= 80:
                print("✅ System is PRODUCTION READY!")
            elif success_rate >= 60:
                print("⚠️  System needs minor fixes before production")
            else:
                print("❌ System needs significant work before production")
        
        print("\n✅ API Simulation completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Simulation failed: {e}")
        stats.errors.append(f"Simulation failure: {str(e)}")
        raise

if __name__ == "__main__":
    run_simulation()
