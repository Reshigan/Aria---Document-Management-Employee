#!/usr/bin/env python3
"""
ARIA 48-Bot Production Testing Suite
Tests all 48 production-ready bots systematically
"""

import requests
import json
from datetime import datetime
from typing import Dict, List
import time

# Production environment
BASE_URL = "https://aria.vantax.co.za/api"
TEST_USER = "demo@vantax.co.za"
TEST_PASSWORD = "Demo@2025"

# Test results storage
test_results = {
    "timestamp": datetime.now().isoformat(),
    "total_bots": 48,
    "tested": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "results": []
}

def authenticate() -> str:
    """Authenticate and get JWT token"""
    print("🔐 Authenticating...")
    try:
        # Use JSON format for UserLogin model
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"username": TEST_USER, "password": TEST_PASSWORD},
            timeout=10
        )
        if response.status_code == 200:
            token = response.json().get("access_token")
            print("✅ Authentication successful")
            return token
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return None
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return None

def test_bot(bot_name: str, category: str, endpoint: str, test_data: dict, token: str) -> dict:
    """Test a single bot"""
    result = {
        "bot_name": bot_name,
        "category": category,
        "endpoint": endpoint,
        "status": "PENDING",
        "response_time": 0,
        "error": None,
        "timestamp": datetime.now().isoformat()
    }
    
    print(f"\n🤖 Testing: {bot_name}")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        start_time = time.time()
        
        response = requests.post(
            f"{BASE_URL}{endpoint}",
            json=test_data,
            headers=headers,
            timeout=30
        )
        
        response_time = time.time() - start_time
        result["response_time"] = round(response_time, 2)
        
        if response.status_code in [200, 201]:
            result["status"] = "PASS"
            print(f"   ✅ PASS ({response_time:.2f}s)")
            test_results["passed"] += 1
        else:
            result["status"] = "FAIL"
            result["error"] = f"HTTP {response.status_code}: {response.text[:100]}"
            print(f"   ❌ FAIL: HTTP {response.status_code}")
            test_results["failed"] += 1
            
    except requests.exceptions.Timeout:
        result["status"] = "FAIL"
        result["error"] = "Request timeout (>30s)"
        print(f"   ❌ FAIL: Timeout")
        test_results["failed"] += 1
    except requests.exceptions.ConnectionError:
        result["status"] = "FAIL"
        result["error"] = "Connection error"
        print(f"   ❌ FAIL: Connection error")
        test_results["failed"] += 1
    except Exception as e:
        result["status"] = "FAIL"
        result["error"] = str(e)
        print(f"   ❌ FAIL: {e}")
        test_results["failed"] += 1
    
    test_results["tested"] += 1
    test_results["results"].append(result)
    return result

def main():
    """Run comprehensive bot testing"""
    print("=" * 80)
    print("🚀 ARIA 48-BOT PRODUCTION TESTING SUITE")
    print("=" * 80)
    print(f"Environment: {BASE_URL}")
    print(f"Test User: {TEST_USER}")
    print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    # Authenticate
    token = authenticate()
    if not token:
        print("\n❌ Cannot proceed without authentication")
        return
    
    # Define all 48 bots with their test endpoints
    bots_to_test = [
        # Financial Automation (13 bots)
        {
            "name": "Invoice Reconciliation Bot",
            "category": "Financial",
            "endpoint": "/bots/invoice-reconciliation",
            "test_data": {"invoice_id": "TEST001", "amount": 1000.00}
        },
        {
            "name": "Accounts Payable Bot",
            "category": "Financial",
            "endpoint": "/bots/accounts-payable",
            "test_data": {"vendor": "Test Vendor", "amount": 500.00}
        },
        {
            "name": "AR Collections Bot",
            "category": "Financial",
            "endpoint": "/bots/ar-collections",
            "test_data": {"customer_id": "CUST001", "overdue_amount": 2500.00}
        },
        {
            "name": "Bank Reconciliation Bot",
            "category": "Financial",
            "endpoint": "/bots/bank-reconciliation",
            "test_data": {"account": "CHQ001", "statement_date": "2025-10-25"}
        },
        {
            "name": "General Ledger Bot",
            "category": "Financial",
            "endpoint": "/bots/general-ledger",
            "test_data": {"account_code": "1001", "transaction_type": "debit"}
        },
        {
            "name": "Financial Close Bot",
            "category": "Financial",
            "endpoint": "/bots/financial-close",
            "test_data": {"period": "2025-10", "close_type": "month"}
        },
        {
            "name": "Expense Approval Bot",
            "category": "Financial",
            "endpoint": "/bots/expense-approval",
            "test_data": {"expense_id": "EXP001", "amount": 350.00}
        },
        {
            "name": "Analytics Bot",
            "category": "Financial",
            "endpoint": "/bots/analytics",
            "test_data": {"report_type": "revenue", "period": "monthly"}
        },
        {
            "name": "SAP Document Bot",
            "category": "Financial",
            "endpoint": "/bots/sap-document",
            "test_data": {"document_type": "invoice", "sap_id": "SAP001"}
        },
        {
            "name": "Budget Management Bot",
            "category": "Financial",
            "endpoint": "/bots/budget-management",
            "test_data": {"department": "Sales", "budget_year": 2025}
        },
        {
            "name": "Cash Management Bot",
            "category": "Financial",
            "endpoint": "/bots/cash-management",
            "test_data": {"forecast_period": "30days"}
        },
        {
            "name": "Fixed Asset Management Bot",
            "category": "Financial",
            "endpoint": "/bots/fixed-asset",
            "test_data": {"asset_id": "AST001", "action": "depreciation"}
        },
        {
            "name": "Multi-Currency Bot",
            "category": "Financial",
            "endpoint": "/bots/multi-currency",
            "test_data": {"from_currency": "USD", "to_currency": "ZAR", "amount": 1000}
        },
        
        # Compliance & Tax (3 bots)
        {
            "name": "BBBEE Compliance Bot",
            "category": "Compliance",
            "endpoint": "/bots/bbbee-compliance",
            "test_data": {"supplier_id": "SUP001", "check_certificate": True}
        },
        {
            "name": "Compliance Audit Bot",
            "category": "Compliance",
            "endpoint": "/bots/compliance-audit",
            "test_data": {"audit_type": "financial", "period": "2025-Q3"}
        },
        {
            "name": "Tax Compliance Bot",
            "category": "Compliance",
            "endpoint": "/bots/tax-compliance",
            "test_data": {"tax_type": "VAT", "period": "2025-10"}
        },
        
        # Sales & CRM (7 bots)
        {
            "name": "Lead Qualification Bot",
            "category": "Sales",
            "endpoint": "/bots/lead-qualification",
            "test_data": {"lead_id": "LEAD001", "source": "website"}
        },
        {
            "name": "Quote Generation Bot",
            "category": "Sales",
            "endpoint": "/bots/quote-generation",
            "test_data": {"customer_id": "CUST001", "products": ["PROD001"]}
        },
        {
            "name": "Sales Order Bot",
            "category": "Sales",
            "endpoint": "/bots/sales-order",
            "test_data": {"order_id": "ORD001", "customer": "Test Customer"}
        },
        {
            "name": "Credit Control Bot",
            "category": "Sales",
            "endpoint": "/bots/credit-control",
            "test_data": {"customer_id": "CUST001", "credit_limit": 50000}
        },
        {
            "name": "Customer Onboarding Bot",
            "category": "Sales",
            "endpoint": "/bots/customer-onboarding",
            "test_data": {"company_name": "Test Company Ltd", "industry": "Retail"}
        },
        {
            "name": "Customer Retention Bot",
            "category": "Sales",
            "endpoint": "/bots/customer-retention",
            "test_data": {"customer_id": "CUST001", "risk_score": 0.7}
        },
        {
            "name": "Sales Commission Bot",
            "category": "Sales",
            "endpoint": "/bots/sales-commission",
            "test_data": {"sales_person": "SP001", "period": "2025-10"}
        },
        
        # Operations & Inventory (9 bots)
        {
            "name": "Inventory Reorder Bot",
            "category": "Operations",
            "endpoint": "/bots/inventory-reorder",
            "test_data": {"product_id": "PROD001", "current_stock": 50}
        },
        {
            "name": "Purchasing Bot",
            "category": "Operations",
            "endpoint": "/bots/purchasing",
            "test_data": {"supplier_id": "SUP001", "items": ["ITEM001"]}
        },
        {
            "name": "Warehouse Management Bot",
            "category": "Operations",
            "endpoint": "/bots/warehouse",
            "test_data": {"warehouse_id": "WH001", "action": "pick"}
        },
        {
            "name": "Manufacturing Bot",
            "category": "Operations",
            "endpoint": "/bots/manufacturing",
            "test_data": {"product_id": "PROD001", "quantity": 100}
        },
        {
            "name": "Project Management Bot",
            "category": "Operations",
            "endpoint": "/bots/project-management",
            "test_data": {"project_id": "PRJ001", "task": "schedule"}
        },
        {
            "name": "Shipping Logistics Bot",
            "category": "Operations",
            "endpoint": "/bots/shipping",
            "test_data": {"order_id": "ORD001", "destination": "Johannesburg"}
        },
        {
            "name": "Returns Management Bot",
            "category": "Operations",
            "endpoint": "/bots/returns",
            "test_data": {"order_id": "ORD001", "reason": "damaged"}
        },
        {
            "name": "Quality Control Bot",
            "category": "Operations",
            "endpoint": "/bots/quality-control",
            "test_data": {"batch_id": "BATCH001", "inspection_type": "final"}
        },
        {
            "name": "RFQ Response Bot",
            "category": "Operations",
            "endpoint": "/bots/rfq-response",
            "test_data": {"rfq_id": "RFQ001", "items": ["ITEM001"]}
        },
        
        # HR & Payroll (5 bots)
        {
            "name": "Payroll Bot (SARS)",
            "category": "HR",
            "endpoint": "/bots/payroll",
            "test_data": {"employee_id": "EMP001", "period": "2025-10"}
        },
        {
            "name": "Employee Onboarding Bot",
            "category": "HR",
            "endpoint": "/bots/employee-onboarding",
            "test_data": {"employee_name": "John Doe", "position": "Accountant"}
        },
        {
            "name": "Leave Management Bot",
            "category": "HR",
            "endpoint": "/bots/leave-management",
            "test_data": {"employee_id": "EMP001", "leave_type": "annual"}
        },
        {
            "name": "Pricing Bot",
            "category": "HR",
            "endpoint": "/bots/pricing",
            "test_data": {"product_id": "PROD001", "market": "retail"}
        },
        {
            "name": "Supplier Onboarding Bot",
            "category": "HR",
            "endpoint": "/bots/supplier-onboarding",
            "test_data": {"company_name": "New Supplier Ltd", "category": "Office"}
        },
        
        # Support & Services (4 bots)
        {
            "name": "IT Helpdesk Bot",
            "category": "Support",
            "endpoint": "/bots/it-helpdesk",
            "test_data": {"issue": "Password reset", "priority": "medium"}
        },
        {
            "name": "WhatsApp Helpdesk Bot",
            "category": "Support",
            "endpoint": "/bots/whatsapp-helpdesk",
            "test_data": {"message": "Help with invoice", "phone": "+27821234567"}
        },
        {
            "name": "Contract Renewal Bot",
            "category": "Support",
            "endpoint": "/bots/contract-renewal",
            "test_data": {"contract_id": "CNT001", "expiry_date": "2025-12-31"}
        },
        {
            "name": "Tender Management Bot",
            "category": "Support",
            "endpoint": "/bots/tender-management",
            "test_data": {"tender_id": "TND001", "deadline": "2025-11-30"}
        },
        
        # Document Intelligence (4 bots)
        {
            "name": "OCR Document Capture Bot",
            "category": "Document",
            "endpoint": "/bots/ocr-capture",
            "test_data": {"document_type": "invoice", "file_path": "test.pdf"}
        },
        {
            "name": "E-Signature Bot",
            "category": "Document",
            "endpoint": "/bots/esignature",
            "test_data": {"document_id": "DOC001", "signer": "john@test.com"}
        },
        {
            "name": "Calendar Office365 Bot",
            "category": "Document",
            "endpoint": "/bots/calendar",
            "test_data": {"meeting_title": "Team Meeting", "duration": 60}
        },
        {
            "name": "Email Office365 Bot",
            "category": "Document",
            "endpoint": "/bots/email",
            "test_data": {"to": "test@test.com", "subject": "Test Email"}
        },
        
        # Meta-Intelligence (3 bots)
        {
            "name": "Meta Bot Orchestrator",
            "category": "Meta",
            "endpoint": "/bots/meta-orchestrator",
            "test_data": {"workflow": "invoice_to_payment", "trigger": "manual"}
        },
        {
            "name": "Sales Forecasting Bot",
            "category": "Meta",
            "endpoint": "/bots/sales-forecasting",
            "test_data": {"period": "Q4-2025", "products": ["PROD001"]}
        },
        {
            "name": "Base Bot Framework",
            "category": "Meta",
            "endpoint": "/bots/base",
            "test_data": {"action": "health_check"}
        }
    ]
    
    print(f"\n📊 Total Bots to Test: {len(bots_to_test)}")
    print("=" * 80)
    
    # Test each bot
    for bot in bots_to_test:
        test_bot(
            bot["name"],
            bot["category"],
            bot["endpoint"],
            bot["test_data"],
            token
        )
        time.sleep(0.5)  # Small delay between tests
    
    # Print summary
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    print(f"Total Bots: {test_results['total_bots']}")
    print(f"Tested: {test_results['tested']}")
    print(f"✅ Passed: {test_results['passed']} ({test_results['passed']/test_results['tested']*100:.1f}%)")
    print(f"❌ Failed: {test_results['failed']} ({test_results['failed']/test_results['tested']*100:.1f}%)")
    print(f"⏭️  Skipped: {test_results['skipped']}")
    print("=" * 80)
    
    # Save detailed results
    output_file = f"bot_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(test_results, f, indent=2)
    print(f"\n💾 Detailed results saved to: {output_file}")
    
    # Print failed bots
    if test_results['failed'] > 0:
        print("\n❌ FAILED BOTS:")
        for result in test_results['results']:
            if result['status'] == 'FAIL':
                print(f"   • {result['bot_name']} ({result['category']})")
                print(f"     Error: {result['error']}")
    
    # Calculate pass rate
    pass_rate = (test_results['passed'] / test_results['tested']) * 100
    
    print("\n" + "=" * 80)
    if pass_rate >= 90:
        print("🎉 EXCELLENT! Pass rate >= 90% - READY FOR SOFT LAUNCH")
    elif pass_rate >= 80:
        print("✅ GOOD! Pass rate >= 80% - Can proceed with pilot testing")
    elif pass_rate >= 70:
        print("⚠️  ACCEPTABLE! Pass rate >= 70% - Fix critical issues first")
    else:
        print("🔴 CRITICAL! Pass rate < 70% - Major fixes needed before launch")
    print("=" * 80)
    
    print(f"\nTest completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()
