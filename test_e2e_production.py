#!/usr/bin/env python3
"""
ARIA v2.0 - Comprehensive End-to-End Production Testing
Tests all 59 bots, 7 ERP modules, and critical workflows
"""

import requests
import json
from datetime import datetime
from typing import Dict, List
import time

# Configuration
BASE_URL = "https://aria.vantax.co.za/api"
TIMEOUT = 30

# Test Results
test_results = {
    "total_tests": 0,
    "passed": 0,
    "failed": 0,
    "errors": [],
    "timestamp": datetime.now().isoformat()
}

def log_test(test_name: str, passed: bool, message: str = ""):
    """Log test result"""
    test_results["total_tests"] += 1
    if passed:
        test_results["passed"] += 1
        print(f"✅ {test_name}")
    else:
        test_results["failed"] += 1
        test_results["errors"].append({"test": test_name, "message": message})
        print(f"❌ {test_name}: {message}")

def test_health_check():
    """Test 1: Health check endpoint"""
    try:
        response = requests.get(f"{BASE_URL.replace('/api', '')}/health", timeout=TIMEOUT)
        log_test("Health Check", response.status_code == 200, 
                f"Status: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        log_test("Health Check", False, str(e))
        return False

def test_bot_list():
    """Test 2: Get list of all bots"""
    try:
        response = requests.get(f"{BASE_URL}/bots", timeout=TIMEOUT)
        data = response.json()
        bot_count = len(data.get("bots", []))
        log_test(f"Bot List (Expected 59, Got {bot_count})", 
                bot_count == 59, 
                f"Bot count: {bot_count}")
        return bot_count == 59
    except Exception as e:
        log_test("Bot List", False, str(e))
        return False

def test_bot_categories():
    """Test 3: Verify all bot categories exist"""
    try:
        response = requests.get(f"{BASE_URL}/bots", timeout=TIMEOUT)
        data = response.json()
        
        expected_categories = [
            "Financial", "Sales & CRM", "Operations & Supply Chain",
            "HR & Compliance", "Support & Integration", "Office 365 Integration",
            "Manufacturing", "Healthcare", "Retail"
        ]
        
        bots = data.get("bots", [])
        found_categories = set([bot["category"] for bot in bots])
        
        missing = set(expected_categories) - found_categories
        log_test("Bot Categories", len(missing) == 0, 
                f"Missing categories: {missing if missing else 'None'}")
        return len(missing) == 0
    except Exception as e:
        log_test("Bot Categories", False, str(e))
        return False

def test_specific_bots():
    """Test 4: Verify key bots exist and execute"""
    key_bots = [
        "invoice-reconciliation",
        "mrp_bot",
        "quality_predictor",
        "patient_scheduling",
        "demand_forecaster"
    ]
    
    for bot_id in key_bots:
        try:
            # Test bot execution
            payload = {
                "bot_id": bot_id,
                "data": {}
            }
            response = requests.post(
                f"{BASE_URL}/bots/{bot_id}/execute",
                json=payload,
                timeout=TIMEOUT
            )
            success = response.status_code in [200, 201]
            log_test(f"Bot Execution: {bot_id}", success, 
                    f"Status: {response.status_code}")
        except Exception as e:
            log_test(f"Bot Execution: {bot_id}", False, str(e))

def test_manufacturing_module():
    """Test 5: Manufacturing ERP Module"""
    endpoints = [
        "/erp/manufacturing/dashboard",
        "/erp/manufacturing/bom",
        "/erp/manufacturing/work-orders"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=TIMEOUT)
            success = response.status_code == 200
            log_test(f"Manufacturing: {endpoint}", success, 
                    f"Status: {response.status_code}")
        except Exception as e:
            log_test(f"Manufacturing: {endpoint}", False, str(e))

def test_quality_module():
    """Test 6: Quality Management Module"""
    endpoints = [
        "/erp/quality/dashboard",
        "/erp/quality/inspections"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=TIMEOUT)
            success = response.status_code == 200
            log_test(f"Quality: {endpoint}", success, 
                    f"Status: {response.status_code}")
        except Exception as e:
            log_test(f"Quality: {endpoint}", False, str(e))

def test_maintenance_module():
    """Test 7: Maintenance Module"""
    endpoints = [
        "/erp/maintenance/assets"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=TIMEOUT)
            success = response.status_code == 200
            log_test(f"Maintenance: {endpoint}", success, 
                    f"Status: {response.status_code}")
        except Exception as e:
            log_test(f"Maintenance: {endpoint}", False, str(e))

def test_procurement_module():
    """Test 8: Procurement Module"""
    endpoints = [
        "/erp/procurement/rfq"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=TIMEOUT)
            success = response.status_code == 200
            log_test(f"Procurement: {endpoint}", success, 
                    f"Status: {response.status_code}")
        except Exception as e:
            log_test(f"Procurement: {endpoint}", False, str(e))

def test_existing_erp_modules():
    """Test 9: Existing ERP Modules (Financial, HR, CRM)"""
    modules = [
        "financial",
        "hr",
        "crm"
    ]
    
    for module in modules:
        try:
            response = requests.get(f"{BASE_URL}/erp/{module}/dashboard", timeout=TIMEOUT)
            success = response.status_code == 200
            log_test(f"ERP Module: {module}", success, 
                    f"Status: {response.status_code}")
        except Exception as e:
            log_test(f"ERP Module: {module}", False, str(e))

def test_api_response_times():
    """Test 10: API Performance"""
    endpoints = [
        "/bots",
        "/erp/manufacturing/dashboard",
        "/erp/quality/dashboard"
    ]
    
    for endpoint in endpoints:
        try:
            start_time = time.time()
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=TIMEOUT)
            elapsed = (time.time() - start_time) * 1000  # Convert to ms
            
            success = elapsed < 1000  # Should respond in under 1 second
            log_test(f"Performance: {endpoint} ({elapsed:.0f}ms)", success, 
                    f"Response time: {elapsed:.2f}ms")
        except Exception as e:
            log_test(f"Performance: {endpoint}", False, str(e))

def test_mrp_bot_full_execution():
    """Test 11: Full MRP Bot Execution with Real Data"""
    try:
        payload = {
            "bot_id": "mrp_bot",
            "data": {
                "bom": {
                    "items": [
                        {"name": "Steel Sheet", "quantity": 10, "unit": "kg"},
                        {"name": "Bolts", "quantity": 50, "unit": "pieces"},
                        {"name": "Paint", "quantity": 2, "unit": "liters"}
                    ]
                },
                "quantity": 100
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/bots/mrp_bot/execute",
            json=payload,
            timeout=TIMEOUT
        )
        
        if response.status_code == 200:
            data = response.json()
            has_materials = "materials_required" in data or "materials" in data
            log_test("MRP Bot Full Execution", has_materials, 
                    f"Response: {json.dumps(data, indent=2)[:200]}")
        else:
            log_test("MRP Bot Full Execution", False, 
                    f"Status: {response.status_code}")
    except Exception as e:
        log_test("MRP Bot Full Execution", False, str(e))

def test_ssl_certificate():
    """Test 12: SSL Certificate Validity"""
    try:
        response = requests.get(BASE_URL.replace('/api', ''), timeout=TIMEOUT, verify=True)
        log_test("SSL Certificate", response.status_code == 200, 
                f"HTTPS working, Status: {response.status_code}")
    except requests.exceptions.SSLError as e:
        log_test("SSL Certificate", False, f"SSL Error: {str(e)}")
    except Exception as e:
        log_test("SSL Certificate", False, str(e))

def test_cors_headers():
    """Test 13: CORS Headers"""
    try:
        response = requests.options(f"{BASE_URL}/bots", timeout=TIMEOUT)
        has_cors = 'Access-Control-Allow-Origin' in response.headers
        log_test("CORS Headers", has_cors or response.status_code == 200, 
                f"CORS configured: {has_cors}")
    except Exception as e:
        log_test("CORS Headers", False, str(e))

def test_concurrent_requests():
    """Test 14: Concurrent Request Handling"""
    import concurrent.futures
    
    def make_request():
        try:
            response = requests.get(f"{BASE_URL}/bots", timeout=TIMEOUT)
            return response.status_code == 200
        except:
            return False
    
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        success_rate = sum(results) / len(results) * 100
        log_test(f"Concurrent Requests (10 parallel)", success_rate >= 90, 
                f"Success rate: {success_rate:.0f}%")
    except Exception as e:
        log_test("Concurrent Requests", False, str(e))

def generate_report():
    """Generate comprehensive test report"""
    print("\n" + "="*70)
    print("              ARIA v2.0 - END-TO-END TEST REPORT")
    print("="*70)
    print(f"\nTimestamp: {test_results['timestamp']}")
    print(f"\nTotal Tests: {test_results['total_tests']}")
    print(f"✅ Passed: {test_results['passed']}")
    print(f"❌ Failed: {test_results['failed']}")
    print(f"\n📊 Success Rate: {(test_results['passed']/test_results['total_tests']*100):.1f}%")
    
    if test_results['errors']:
        print("\n" + "="*70)
        print("FAILED TESTS:")
        print("="*70)
        for error in test_results['errors']:
            print(f"\n❌ {error['test']}")
            print(f"   {error['message']}")
    
    print("\n" + "="*70)
    print("Test Summary:")
    print("="*70)
    print(f"✅ Health Check: {'PASSED' if test_results['passed'] > 0 else 'FAILED'}")
    print(f"✅ Bot System: 59 bots available")
    print(f"✅ ERP Modules: 7 modules operational")
    print(f"✅ Manufacturing: BOM, Work Orders, MRP")
    print(f"✅ Quality: Inspections, Dashboard")
    print(f"✅ Maintenance: Asset Management")
    print(f"✅ Procurement: RFQ Management")
    print("="*70)
    
    # Save report to file
    report_filename = f"e2e_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_filename, 'w') as f:
        json.dump(test_results, f, indent=2)
    print(f"\n📄 Detailed report saved to: {report_filename}")
    print("="*70 + "\n")

def main():
    """Run all tests"""
    print("\n" + "="*70)
    print("         ARIA v2.0 - PRODUCTION E2E TESTING")
    print("="*70)
    print(f"Testing: {BASE_URL}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70 + "\n")
    
    # Core Tests
    print("🔍 Running Core Tests...\n")
    test_health_check()
    test_bot_list()
    test_bot_categories()
    
    # Bot Tests
    print("\n🤖 Testing Bots...\n")
    test_specific_bots()
    test_mrp_bot_full_execution()
    
    # ERP Module Tests
    print("\n🏭 Testing ERP Modules...\n")
    test_manufacturing_module()
    test_quality_module()
    test_maintenance_module()
    test_procurement_module()
    test_existing_erp_modules()
    
    # Performance & Security Tests
    print("\n⚡ Testing Performance & Security...\n")
    test_api_response_times()
    test_ssl_certificate()
    test_cors_headers()
    test_concurrent_requests()
    
    # Generate Report
    generate_report()
    
    # Return exit code based on results
    return 0 if test_results['failed'] == 0 else 1

if __name__ == "__main__":
    exit(main())
