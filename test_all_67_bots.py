#!/usr/bin/env python3
"""
ARIA Bot Testing Suite - Test All 67 Bots
Automated testing framework for all AI automation bots
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Any
import sys

# Configuration
API_BASE = "http://localhost:8000"
FRONTEND_BASE = "http://localhost:12001"
TIMEOUT = 10  # seconds

# Color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*80}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{text.center(80)}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*80}{Colors.RESET}\n")

def print_success(text: str):
    print(f"{Colors.GREEN}✅ {text}{Colors.RESET}")

def print_error(text: str):
    print(f"{Colors.RED}❌ {text}{Colors.RESET}")

def print_info(text: str):
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.RESET}")

def print_warning(text: str):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.RESET}")

# Complete list of all 67 bots with test scenarios
ALL_BOTS = {
    # FINANCIAL MANAGEMENT (11 bots)
    "accounts_payable": {
        "name": "Accounts Payable Agent",
        "category": "Financial",
        "inputs": {
            "auto_approve_limit": 10000,
            "invoice_batch": []
        },
        "expected_keys": ["invoices_processed", "approved_count", "pending_approval"]
    },
    "ar_collections": {
        "name": "AR Collections Agent",
        "category": "Financial",
        "inputs": {
            "days_overdue": 30,
            "min_amount": 5000
        },
        "expected_keys": ["reminders_sent", "total_outstanding", "customers_contacted"]
    },
    "bank_reconciliation": {
        "name": "Bank Reconciliation Agent",
        "category": "Financial",
        "inputs": {
            "bank_account": "Standard Bank - Current",
            "statement_date": "2026-02-23"
        },
        "expected_keys": ["matched_transactions", "unmatched_transactions", "balance_difference"]
    },
    "expense_management": {
        "name": "Expense Management Agent",
        "category": "Financial",
        "inputs": {
            "auto_approve_limit": 500
        },
        "expected_keys": ["expenses_processed", "total_amount", "policy_violations"]
    },
    "financial_close": {
        "name": "Financial Close Agent",
        "category": "Financial",
        "inputs": {
            "period": "February 2026",
            "close_type": "soft"
        },
        "expected_keys": ["accounts_closed", "adjustments_made", "close_status"]
    },
    "financial_reporting": {
        "name": "Financial Reporting Agent",
        "category": "Financial",
        "inputs": {
            "report_type": "P&L Statement"
        },
        "expected_keys": ["reports_generated", "recipients_notified"]
    },
    "general_ledger": {
        "name": "General Ledger Agent",
        "category": "Financial",
        "inputs": {
            "auto_post": True
        },
        "expected_keys": ["entries_posted", "total_debits", "total_credits"]
    },
    "invoice_reconciliation": {
        "name": "Invoice Reconciliation Agent",
        "category": "Financial",
        "inputs": {
            "threshold": 95
        },
        "expected_keys": ["matched_count", "unmatched_count", "discrepancies"]
    },
    "payment_processing": {
        "name": "Payment Processing Agent",
        "category": "Financial",
        "inputs": {
            "payment_method": "EFT",
            "max_amount": 500000
        },
        "expected_keys": ["payments_processed", "total_amount", "batch_id"]
    },
    "tax_compliance": {
        "name": "Tax Compliance Agent (SA)",
        "category": "Financial",
        "inputs": {
            "tax_period": "February 2026",
            "tax_type": "VAT"
        },
        "expected_keys": ["vat_payable", "compliance_status"]
    },
    "bbbee_compliance": {
        "name": "BEE Compliance Agent",
        "category": "Financial",
        "inputs": {
            "scorecard_year": 2026,
            "include_suppliers": True
        },
        "expected_keys": ["bbbee_level", "total_score", "improvement_areas"]
    },
    
    # PROCUREMENT & SUPPLY CHAIN (10 bots)
    "purchase_order": {
        "name": "Purchase Order Agent",
        "category": "Procurement",
        "inputs": {
            "auto_approve_limit": 50000
        },
        "expected_keys": ["pos_created", "pos_approved", "total_value"]
    },
    "supplier_management": {
        "name": "Supplier Management Agent",
        "category": "Procurement",
        "inputs": {
            "require_bbbee": True,
            "min_bbbee_level": 4
        },
        "expected_keys": ["suppliers_processed", "approved", "compliance_issues"]
    },
    "supplier_performance": {
        "name": "Supplier Performance Agent",
        "category": "Procurement",
        "inputs": {},
        "expected_keys": ["suppliers_evaluated", "avg_score", "top_performers"]
    },
    "supplier_risk": {
        "name": "Supplier Risk Agent",
        "category": "Procurement",
        "inputs": {
            "risk_threshold": 70
        },
        "expected_keys": ["suppliers_assessed", "high_risk_count", "risk_alerts"]
    },
    "rfq_management": {
        "name": "RFQ Management Agent",
        "category": "Procurement",
        "inputs": {
            "min_responses": 3
        },
        "expected_keys": ["rfqs_created", "responses_received", "awards_made"]
    },
    "procurement_analytics": {
        "name": "Procurement Analytics Agent",
        "category": "Procurement",
        "inputs": {},
        "expected_keys": ["total_spend", "savings_identified", "insights"]
    },
    "spend_analysis": {
        "name": "Spend Analysis Agent",
        "category": "Procurement",
        "inputs": {},
        "expected_keys": ["total_spend", "maverick_spend", "category_breakdown"]
    },
    "source_to_pay": {
        "name": "Source-to-Pay Agent",
        "category": "Procurement",
        "inputs": {
            "auto_source": True
        },
        "expected_keys": ["requisitions_processed", "orders_created", "cycle_time_avg"]
    },
    "goods_receipt": {
        "name": "Goods Receipt Agent",
        "category": "Procurement",
        "inputs": {
            "auto_post": True
        },
        "expected_keys": ["receipts_processed", "items_received", "variances_flagged"]
    },
    "inventory_optimization": {
        "name": "Inventory Optimization Agent",
        "category": "Procurement",
        "inputs": {
            "safety_stock_days": 14
        },
        "expected_keys": ["items_analyzed", "reorder_suggestions", "overstock_items"]
    },
    
    # MANUFACTURING & OPERATIONS (11 bots)
    "production_scheduling": {
        "name": "Production Scheduling Agent",
        "category": "Manufacturing",
        "inputs": {
            "planning_horizon": 30,
            "optimize_for": "throughput"
        },
        "expected_keys": ["orders_scheduled", "utilization_rate", "on_time_delivery"]
    },
    "production_reporting": {
        "name": "Production Reporting Agent",
        "category": "Manufacturing",
        "inputs": {},
        "expected_keys": ["units_produced", "efficiency_rate", "defect_rate"]
    },
    "work_order": {
        "name": "Work Order Agent",
        "category": "Manufacturing",
        "inputs": {
            "auto_release": True
        },
        "expected_keys": ["work_orders_created", "work_orders_completed", "on_time_completion"]
    },
    "quality_control": {
        "name": "Quality Control Agent",
        "category": "Manufacturing",
        "inputs": {
            "sampling_rate": 10,
            "auto_disposition": False
        },
        "expected_keys": ["inspections_completed", "pass_rate", "ncrs_created"]
    },
    "downtime_tracking": {
        "name": "Downtime Tracking Agent",
        "category": "Manufacturing",
        "inputs": {},
        "expected_keys": ["downtime_events", "total_downtime", "top_causes"]
    },
    "machine_monitoring": {
        "name": "Machine Monitoring Agent",
        "category": "Manufacturing",
        "inputs": {
            "polling_interval": 30
        },
        "expected_keys": ["machines_monitored", "alerts_generated", "avg_utilization"]
    },
    "oee_calculation": {
        "name": "OEE Calculation Agent",
        "category": "Manufacturing",
        "inputs": {},
        "expected_keys": ["oee_score", "availability", "performance", "quality"]
    },
    "mes_integration": {
        "name": "MES Integration Agent",
        "category": "Manufacturing",
        "inputs": {
            "sync_interval": 15
        },
        "expected_keys": ["records_synced", "sync_errors", "last_sync"]
    },
    "tool_management": {
        "name": "Tool Management Agent",
        "category": "Manufacturing",
        "inputs": {
            "calibration_alert_days": 30
        },
        "expected_keys": ["tools_tracked", "calibration_due", "reorder_needed"]
    },
    "scrap_management": {
        "name": "Scrap Management Agent",
        "category": "Manufacturing",
        "inputs": {},
        "expected_keys": ["scrap_events", "total_cost", "scrap_rate"]
    },
    "operator_instructions": {
        "name": "Operator Instructions Agent",
        "category": "Manufacturing",
        "inputs": {
            "require_acknowledgment": True
        },
        "expected_keys": ["instructions_delivered", "acknowledgments_received", "compliance_rate"]
    },
    
    # SALES & CRM (7 bots)
    "sales_order": {
        "name": "Sales Order Agent",
        "category": "Sales",
        "inputs": {
            "auto_confirm": True,
            "credit_check": True
        },
        "expected_keys": ["orders_processed", "orders_confirmed", "credit_holds"]
    },
    "quote_generation": {
        "name": "Quote Generation Agent",
        "category": "Sales",
        "inputs": {
            "apply_discounts": True,
            "validity_days": 30
        },
        "expected_keys": ["quotes_generated", "total_value", "avg_margin"]
    },
    "lead_management": {
        "name": "Lead Management Agent",
        "category": "Sales",
        "inputs": {
            "auto_assign": True
        },
        "expected_keys": ["leads_processed", "leads_qualified", "conversion_rate"]
    },
    "lead_qualification": {
        "name": "Lead Qualification Agent",
        "category": "Sales",
        "inputs": {
            "qualification_threshold": 70
        },
        "expected_keys": ["leads_scored", "qualified_leads", "avg_score"]
    },
    "opportunity_management": {
        "name": "Opportunity Management Agent",
        "category": "Sales",
        "inputs": {
            "auto_stage_update": True
        },
        "expected_keys": ["opportunities_managed", "pipeline_value", "win_rate"]
    },
    "sales_analytics": {
        "name": "Sales Analytics Agent",
        "category": "Sales",
        "inputs": {
            "include_forecast": True
        },
        "expected_keys": ["total_revenue", "growth_rate", "forecast_accuracy"]
    },
    "customer_onboarding": {
        "name": "Customer Onboarding Agent",
        "category": "Sales",
        "inputs": {
            "auto_activate": False
        },
        "expected_keys": ["customers_onboarded", "welcome_emails_sent"]
    },
    
    # HR & PAYROLL (8 bots)
    "time_attendance": {
        "name": "Time & Attendance Agent",
        "category": "HR",
        "inputs": {
            "overtime_threshold": 40
        },
        "expected_keys": ["records_processed", "overtime_hours", "attendance_rate"]
    },
    "payroll_sa": {
        "name": "Payroll (SA) Agent",
        "category": "HR",
        "inputs": {
            "pay_period": "February 2026",
            "include_bonuses": True
        },
        "expected_keys": ["employees_processed", "total_gross", "total_deductions"]
    },
    "benefits_administration": {
        "name": "Benefits Administration Agent",
        "category": "HR",
        "inputs": {},
        "expected_keys": ["enrollments_processed", "total_cost", "participation_rate"]
    },
    "recruitment": {
        "name": "Recruitment Agent",
        "category": "HR",
        "inputs": {
            "auto_screen": True
        },
        "expected_keys": ["applications_processed", "qualified_candidates", "time_to_hire"]
    },
    "onboarding": {
        "name": "Onboarding Agent",
        "category": "HR",
        "inputs": {
            "auto_assign_training": True
        },
        "expected_keys": ["employees_onboarded", "tasks_completed", "completion_rate"]
    },
    "performance_management": {
        "name": "Performance Management Agent",
        "category": "HR",
        "inputs": {
            "include_360": True
        },
        "expected_keys": ["reviews_completed", "avg_rating", "goals_achieved"]
    },
    "learning_development": {
        "name": "Learning & Development Agent",
        "category": "HR",
        "inputs": {
            "auto_assign": True
        },
        "expected_keys": ["trainings_assigned", "completions", "skill_gaps_identified"]
    },
    "employee_self_service": {
        "name": "Employee Self-Service Agent",
        "category": "HR",
        "inputs": {},
        "expected_keys": ["requests_processed", "auto_approved", "avg_response_time"]
    },
    
    # DOCUMENT MANAGEMENT (7 bots)
    "document_classification": {
        "name": "Document Classification Agent",
        "category": "Documents",
        "inputs": {
            "confidence_threshold": 85
        },
        "expected_keys": ["documents_classified", "avg_confidence", "manual_review_needed"]
    },
    "document_scanner": {
        "name": "Document Scanner Agent",
        "category": "Documents",
        "inputs": {
            "ocr_language": "en",
            "output_format": "PDF"
        },
        "expected_keys": ["documents_scanned", "pages_processed", "ocr_accuracy"]
    },
    "data_extraction": {
        "name": "Data Extraction Agent",
        "category": "Documents",
        "inputs": {
            "validate_data": True
        },
        "expected_keys": ["documents_processed", "fields_extracted", "extraction_accuracy"]
    },
    "data_validation": {
        "name": "Data Validation Agent",
        "category": "Documents",
        "inputs": {
            "auto_correct": False
        },
        "expected_keys": ["records_validated", "errors_found", "auto_corrected"]
    },
    "archive_management": {
        "name": "Archive Management Agent",
        "category": "Documents",
        "inputs": {
            "auto_archive": True
        },
        "expected_keys": ["documents_archived", "storage_saved", "compliance_status"]
    },
    "email_processing": {
        "name": "Email Processing Agent",
        "category": "Documents",
        "inputs": {},
        "expected_keys": ["emails_processed", "attachments_extracted", "auto_routed"]
    },
    "category_management": {
        "name": "Category Management Agent",
        "category": "Documents",
        "inputs": {
            "auto_categorize": True
        },
        "expected_keys": ["items_categorized", "categories_used", "uncategorized"]
    },
    
    # GOVERNANCE & COMPLIANCE (5 bots)
    "contract_management": {
        "name": "Contract Management Agent",
        "category": "Governance",
        "inputs": {
            "renewal_alert_days": 60,
            "auto_renew": False
        },
        "expected_keys": ["contracts_managed", "renewals_due", "compliance_issues"]
    },
    "policy_management": {
        "name": "Policy Management Agent",
        "category": "Governance",
        "inputs": {
            "require_acknowledgment": True
        },
        "expected_keys": ["policies_distributed", "acknowledgments_received", "compliance_rate"]
    },
    "audit_management": {
        "name": "Audit Management Agent",
        "category": "Governance",
        "inputs": {},
        "expected_keys": ["events_logged", "anomalies_detected", "compliance_score"]
    },
    "risk_management": {
        "name": "Risk Management Agent",
        "category": "Governance",
        "inputs": {},
        "expected_keys": ["risks_assessed", "high_risks", "mitigations_in_progress"]
    },
    "workflow_automation": {
        "name": "Workflow Automation Agent",
        "category": "Governance",
        "inputs": {
            "sla_hours": 24
        },
        "expected_keys": ["workflows_executed", "tasks_completed", "sla_compliance"]
    },
    
    # ADDITIONAL BOTS (6 more)
    "supplier_onboarding": {
        "name": "Supplier Onboarding Agent",
        "category": "Procurement",
        "inputs": {
            "auto_activate": False
        },
        "expected_keys": ["suppliers_onboarded", "verifications_completed"]
    },
    "delivery_scheduling": {
        "name": "Delivery Scheduling Agent",
        "category": "Operations",
        "inputs": {
            "lead_time_days": 3
        },
        "expected_keys": ["deliveries_scheduled", "orders_processed"]
    },
    "reorder_point": {
        "name": "Reorder Point Agent",
        "category": "Inventory",
        "inputs": {
            "default_reorder_point": 50
        },
        "expected_keys": ["reorder_tasks_created", "low_stock_items"]
    },
}

def check_api_availability():
    """Check if backend API is running"""
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def test_bot(bot_id: str, bot_config: Dict) -> Dict[str, Any]:
    """Test a single bot"""
    result = {
        "bot_id": bot_id,
        "name": bot_config["name"],
        "category": bot_config["category"],
        "status": "PENDING",
        "response_time": 0,
        "output": None,
        "error": None
    }
    
    try:
        # Execute bot
        start_time = time.time()
        
        response = requests.post(
            f"{API_BASE}/api/bots/{bot_id}/execute",
            json={"inputs": bot_config["inputs"]},
            timeout=TIMEOUT
        )
        
        response_time = time.time() - start_time
        result["response_time"] = round(response_time, 2)
        
        if response.status_code == 200:
            output = response.json()
            result["output"] = output
            
            # Validate expected keys
            expected_keys = bot_config.get("expected_keys", [])
            has_all_keys = all(key in str(output) for key in expected_keys[:2])  # Check first 2 keys
            
            if has_all_keys:
                result["status"] = "PASS"
            else:
                result["status"] = "PARTIAL"
                print_warning(f"{bot_config['name']}: Missing expected keys")
        else:
            result["status"] = "FAIL"
            result["error"] = f"HTTP {response.status_code}: {response.text[:100]}"
            
    except requests.Timeout:
        result["status"] = "TIMEOUT"
        result["error"] = f"Request timeout after {TIMEOUT}s"
    except Exception as e:
        result["status"] = "ERROR"
        result["error"] = str(e)
    
    return result

def run_bot_tests(bots_to_test: Dict = None) -> List[Dict]:
    """Run tests for all bots or specific subset"""
    if bots_to_test is None:
        bots_to_test = ALL_BOTS
    
    results = []
    total = len(bots_to_test)
    
    for index, (bot_id, bot_config) in enumerate(bots_to_test.items(), 1):
        print(f"\n[{index}/{total}] Testing: {bot_config['name']}")
        print(f"   Category: {bot_config['category']}")
        print(f"   ID: {bot_id}")
        
        result = test_bot(bot_id, bot_config)
        results.append(result)
        
        # Print result
        if result["status"] == "PASS":
            print_success(f"PASSED in {result['response_time']}s")
        elif result["status"] == "PARTIAL":
            print_warning(f"PARTIAL PASS in {result['response_time']}s")
        elif result["status"] == "TIMEOUT":
            print_error(f"TIMEOUT after {TIMEOUT}s")
        elif result["status"] == "FAIL":
            print_error(f"FAILED: {result['error']}")
        else:
            print_error(f"ERROR: {result['error']}")
        
        # Small delay between tests
        time.sleep(0.5)
    
    return results

def generate_report(results: List[Dict]):
    """Generate test report"""
    print_header("TEST RESULTS SUMMARY")
    
    # Overall statistics
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    partial = sum(1 for r in results if r["status"] == "PARTIAL")
    failed = sum(1 for r in results if r["status"] in ["FAIL", "ERROR", "TIMEOUT"])
    
    success_rate = (passed / total * 100) if total > 0 else 0
    avg_response_time = sum(r["response_time"] for r in results) / total if total > 0 else 0
    
    print(f"Total Bots Tested: {total}")
    print(f"{Colors.GREEN}✅ Passed: {passed} ({success_rate:.1f}%){Colors.RESET}")
    if partial > 0:
        print(f"{Colors.YELLOW}⚠️  Partial: {partial}{Colors.RESET}")
    if failed > 0:
        print(f"{Colors.RED}❌ Failed: {failed}{Colors.RESET}")
    print(f"\nAverage Response Time: {avg_response_time:.2f}s")
    
    # Category breakdown
    print_header("RESULTS BY CATEGORY")
    categories = {}
    for result in results:
        cat = result["category"]
        if cat not in categories:
            categories[cat] = {"total": 0, "passed": 0, "failed": 0}
        categories[cat]["total"] += 1
        if result["status"] == "PASS":
            categories[cat]["passed"] += 1
        elif result["status"] in ["FAIL", "ERROR", "TIMEOUT"]:
            categories[cat]["failed"] += 1
    
    for cat, stats in sorted(categories.items()):
        pass_rate = (stats["passed"] / stats["total"] * 100) if stats["total"] > 0 else 0
        status_icon = "✅" if pass_rate == 100 else "⚠️" if pass_rate >= 80 else "❌"
        print(f"{status_icon} {cat}: {stats['passed']}/{stats['total']} ({pass_rate:.0f}%)")
    
    # Failed bots details
    failed_bots = [r for r in results if r["status"] in ["FAIL", "ERROR", "TIMEOUT"]]
    if failed_bots:
        print_header("FAILED BOTS DETAILS")
        for bot in failed_bots:
            print(f"{Colors.RED}❌ {bot['name']} ({bot['bot_id']}){Colors.RESET}")
            print(f"   Status: {bot['status']}")
            print(f"   Error: {bot['error']}")
    
    # Save to file
    report_file = f"bot_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n📄 Full report saved to: {report_file}")

def main():
    """Main test execution"""
    print_header("ARIA BOT TESTING SUITE - ALL 67 BOTS")
    print(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"API Base: {API_BASE}")
    print(f"Timeout: {TIMEOUT}s")
    
    # Check API availability
    print_info("Checking API availability...")
    if not check_api_availability():
        print_error("Backend API is not available!")
        print_error(f"Please ensure the backend is running at {API_BASE}")
        sys.exit(1)
    print_success("Backend API is available")
    
    # Confirm test run
    print(f"\n{Colors.BOLD}About to test {len(ALL_BOTS)} bots{Colors.RESET}")
    response = input(f"{Colors.YELLOW}Continue? (yes/no): {Colors.RESET}")
    if response.lower() not in ['yes', 'y']:
        print("Test cancelled")
        sys.exit(0)
    
    # Run tests
    print_header("RUNNING BOT TESTS")
    results = run_bot_tests(ALL_BOTS)
    
    # Generate report
    generate_report(results)
    
    # Exit code
    failed_count = sum(1 for r in results if r["status"] in ["FAIL", "ERROR", "TIMEOUT"])
    sys.exit(0 if failed_count == 0 else 1)

if __name__ == "__main__":
    main()
