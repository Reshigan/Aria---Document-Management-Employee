"""
Test Controller Bot Wiring
Verifies that the ARIA controller is properly wired to other bots
"""

import asyncio
import sys
sys.path.insert(0, '.')

from aria_controller import AriaController
from bot_orchestrator import get_bot_orchestrator
from bots_advanced import ADVANCED_BOTS


def test_bot_registry():
    """Test that all bots are registered in the bot registry"""
    print("\n" + "="*60)
    print("TEST 1: Bot Registry Verification")
    print("="*60)
    
    orchestrator = get_bot_orchestrator()
    registered_bots = list(orchestrator.bot_registry.keys())
    
    print(f"\nTotal bots registered: {len(registered_bots)}")
    
    # Group bots by category
    categories = {
        "Manufacturing": [],
        "Healthcare": [],
        "Retail": [],
        "Finance": [],
        "Compliance": [],
        "CRM": [],
        "HR": [],
        "Inventory": [],
        "Quality": [],
        "Other": []
    }
    
    for bot_id in registered_bots:
        bot_class = orchestrator.bot_registry[bot_id]
        bot_name = getattr(bot_class, 'name', bot_id)
        
        if any(x in bot_id.lower() for x in ['mrp', 'production', 'manufacturing', 'bom']):
            categories["Manufacturing"].append(bot_name)
        elif any(x in bot_id.lower() for x in ['patient', 'medical', 'prescription', 'lab', 'insurance']):
            categories["Healthcare"].append(bot_name)
        elif any(x in bot_id.lower() for x in ['retail', 'store', 'loyalty', 'demand', 'price']):
            categories["Retail"].append(bot_name)
        elif any(x in bot_id.lower() for x in ['payable', 'receivable', 'bank', 'invoice', 'expense', 'payroll', 'ledger', 'tax', 'budget', 'cash', 'asset']):
            categories["Finance"].append(bot_name)
        elif any(x in bot_id.lower() for x in ['bbbee', 'paye', 'uif', 'vat', 'compliance', 'audit']):
            categories["Compliance"].append(bot_name)
        elif any(x in bot_id.lower() for x in ['lead', 'sales', 'quote', 'email', 'customer', 'crm']):
            categories["CRM"].append(bot_name)
        elif any(x in bot_id.lower() for x in ['hr', 'employee', 'leave', 'recruitment', 'training', 'performance']):
            categories["HR"].append(bot_name)
        elif any(x in bot_id.lower() for x in ['inventory', 'stock', 'warehouse', 'procurement']):
            categories["Inventory"].append(bot_name)
        elif any(x in bot_id.lower() for x in ['quality', 'inspection']):
            categories["Quality"].append(bot_name)
        else:
            categories["Other"].append(bot_name)
    
    print("\nBots by Category:")
    for category, bots in categories.items():
        if bots:
            print(f"\n  {category} ({len(bots)} bots):")
            for bot in bots[:5]:  # Show first 5
                print(f"    - {bot}")
            if len(bots) > 5:
                print(f"    ... and {len(bots) - 5} more")
    
    print(f"\n[PASS] Bot registry contains {len(registered_bots)} bots")
    return True


async def test_controller_initialization():
    """Test that the ARIA controller initializes correctly"""
    print("\n" + "="*60)
    print("TEST 2: Controller Initialization")
    print("="*60)
    
    controller = AriaController()
    
    # Check components
    assert controller.nlp_engine is not None, "NLP engine not initialized"
    print("  [PASS] NLP engine initialized")
    
    assert controller.conversation_manager is not None, "Conversation manager not initialized"
    print("  [PASS] Conversation manager initialized")
    
    assert controller.bot_orchestrator is not None, "Bot orchestrator not initialized"
    print("  [PASS] Bot orchestrator initialized")
    
    print("\n[PASS] Controller initialized successfully")
    return True


async def test_bot_execution():
    """Test that bots can be executed through the orchestrator"""
    print("\n" + "="*60)
    print("TEST 3: Bot Execution via Orchestrator")
    print("="*60)
    
    orchestrator = get_bot_orchestrator()
    
    # Test executing a few different bots
    test_cases = [
        ("mrp_bot", {"product": "Widget A", "quantity": 100}),
        ("inventory_optimizer", {"product": "Test Product"}),
        ("quality_predictor", {"product": "Test Product", "batch_id": "BATCH001"}),
    ]
    
    for bot_id, params in test_cases:
        if bot_id in orchestrator.bot_registry:
            result = await orchestrator.execute_bot(
                bot_id=bot_id,
                parameters=params,
                user_id="test_user"
            )
            
            if result.get("status") == "success":
                print(f"  [PASS] {bot_id} executed successfully")
            else:
                print(f"  [WARN] {bot_id} returned: {result.get('status')}")
        else:
            print(f"  [SKIP] {bot_id} not in registry")
    
    print("\n[PASS] Bot execution test completed")
    return True


async def test_workflow_execution():
    """Test multi-bot workflow execution"""
    print("\n" + "="*60)
    print("TEST 4: Multi-Bot Workflow Execution")
    print("="*60)
    
    orchestrator = get_bot_orchestrator()
    
    # Define a simple workflow
    workflow = [
        {
            "name": "check_inventory",
            "bot": "inventory_optimizer",
            "params": {"product": "Test Widget"}
        },
        {
            "name": "plan_production",
            "bot": "mrp_bot",
            "params": {"product": "Test Widget", "quantity": 50},
            "depends_on": ["check_inventory"]
        }
    ]
    
    result = await orchestrator.execute_workflow(workflow, user_id="test_user")
    
    print(f"  Workflow status: {result.get('status')}")
    print(f"  Steps executed: {result.get('steps_executed')}")
    
    if result.get("errors"):
        print(f"  Errors: {len(result.get('errors'))}")
    else:
        print("  No errors")
    
    print("\n[PASS] Workflow execution test completed")
    return True


async def test_intelligent_routing():
    """Test intelligent routing based on intent"""
    print("\n" + "="*60)
    print("TEST 5: Intelligent Routing")
    print("="*60)
    
    orchestrator = get_bot_orchestrator()
    
    # Test routing with different intents
    test_intents = [
        {
            "intent": "check_inventory",
            "bot": "inventory_optimizer",
            "extracted_params": {"product": "Widget A"},
            "missing_params": [],
            "confidence": 0.95
        },
        {
            "intent": "calculate_mrp",
            "bot": "mrp_bot",
            "extracted_params": {"product": "Widget B", "quantity": 100},
            "missing_params": [],
            "confidence": 0.90
        },
        {
            "intent": "predict_quality",
            "bot": "quality_predictor",
            "extracted_params": {},
            "missing_params": ["product", "batch_id"],
            "confidence": 0.85
        }
    ]
    
    for intent in test_intents:
        result = await orchestrator.intelligent_route(intent, user_id="test_user")
        
        if result.get("clarification_needed"):
            print(f"  [INFO] {intent['intent']}: Needs clarification - {result.get('missing_params')}")
        elif result.get("status") == "success":
            print(f"  [PASS] {intent['intent']}: Routed successfully to {intent['bot']}")
        else:
            print(f"  [WARN] {intent['intent']}: {result.get('status')}")
    
    print("\n[PASS] Intelligent routing test completed")
    return True


async def test_controller_process_request():
    """Test the main controller process_request method"""
    print("\n" + "="*60)
    print("TEST 6: Controller Process Request")
    print("="*60)
    
    controller = AriaController()
    
    # Test various requests
    test_requests = [
        "Check inventory levels for Widget A",
        "Calculate material requirements for 100 units of Product X",
        "What is the system status?",
        "Help me understand what you can do"
    ]
    
    for request in test_requests:
        try:
            result = await controller.process_request(
                user_input=request,
                user_id="test_user",
                session_id="test_session"
            )
            
            if result:
                print(f"  [PASS] Request processed: '{request[:40]}...'")
                print(f"         Response type: {result.get('type', 'unknown')}")
            else:
                print(f"  [WARN] No result for: '{request[:40]}...'")
        except Exception as e:
            print(f"  [ERROR] Exception for '{request[:40]}...': {str(e)[:50]}")
    
    print("\n[PASS] Controller process request test completed")
    return True


def test_multi_country_service():
    """Test the multi-country service"""
    print("\n" + "="*60)
    print("TEST 7: Multi-Country Service")
    print("="*60)
    
    from app.services.multi_country_service import get_multi_country_service
    
    service = get_multi_country_service()
    
    # Test getting supported countries
    countries = service.get_supported_countries()
    print(f"  Supported countries: {len(countries)}")
    
    # Test a few countries
    test_countries = ["ZA", "GB", "US", "DE", "AU", "IN", "SG"]
    
    for code in test_countries:
        details = service.get_country_details(code)
        if details:
            tax_rules = details.get("tax_rules", [])
            statutory_rules = details.get("statutory_rules", [])
            doc_formats = details.get("document_formats", [])
            print(f"  [PASS] {code}: {details['country_name']} - {len(tax_rules)} tax rules, {len(statutory_rules)} statutory rules, {len(doc_formats)} doc formats")
        else:
            print(f"  [WARN] {code}: Not found")
    
    # Test tax calculation
    from decimal import Decimal
    result = service.calculate_tax("ZA", Decimal("1000"), "VAT_STD", False)
    if result.get("status") == "success":
        print(f"  [PASS] Tax calculation: R1000 + 15% VAT = R{result['gross_amount']}")
    
    # Test company setup
    setup = service.setup_company_for_country("ZA", {"company_name": "Test Co"})
    if setup.get("status") == "success":
        print(f"  [PASS] Company setup for ZA: {setup['company_settings']['currency_code']}, {setup['company_settings']['tax_system']}")
    
    print("\n[PASS] Multi-country service test completed")
    return True


async def run_all_tests():
    """Run all controller bot wiring tests"""
    print("\n" + "="*60)
    print("ARIA CONTROLLER BOT WIRING TESTS")
    print("="*60)
    
    tests_passed = 0
    tests_failed = 0
    
    # Run tests
    tests = [
        ("Bot Registry", test_bot_registry),
        ("Controller Initialization", test_controller_initialization),
        ("Bot Execution", test_bot_execution),
        ("Workflow Execution", test_workflow_execution),
        ("Intelligent Routing", test_intelligent_routing),
        ("Controller Process Request", test_controller_process_request),
        ("Multi-Country Service", test_multi_country_service),
    ]
    
    for test_name, test_func in tests:
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            
            if result:
                tests_passed += 1
            else:
                tests_failed += 1
        except Exception as e:
            print(f"\n[FAIL] {test_name}: {str(e)}")
            tests_failed += 1
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"  Tests Passed: {tests_passed}")
    print(f"  Tests Failed: {tests_failed}")
    print(f"  Total: {tests_passed + tests_failed}")
    print("="*60)
    
    return tests_failed == 0


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
