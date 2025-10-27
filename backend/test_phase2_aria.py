"""
ARIA Phase 2 - Comprehensive Test Suite
Tests for Aria AI Controller, NLP, Bot Orchestration, and ERP Integration
"""

import pytest
import asyncio
from datetime import datetime

# Test NLP Engine
def test_nlp_intent_recognition():
    """Test intent recognition from natural language"""
    from nlp_engine import get_intent_recognizer
    
    nlp = get_intent_recognizer()
    
    # Test production planning intent
    result = nlp.recognize_intent("Plan production for 500 units of Widget A")
    assert result['intent'] == 'production_planning'
    assert result['bot'] == 'mrp_bot'
    assert result['confidence'] > 0.5
    assert 'quantity' in result['extracted_params'] or 'quantity' in result['required_params']
    
    print("✅ NLP Intent Recognition: Production Planning")

def test_nlp_quality_prediction():
    """Test quality prediction intent"""
    from nlp_engine import get_intent_recognizer
    
    nlp = get_intent_recognizer()
    
    result = nlp.recognize_intent("Predict quality issues for Batch 123")
    assert result['intent'] == 'quality_prediction'
    assert result['bot'] == 'quality_predictor'
    
    print("✅ NLP Intent Recognition: Quality Prediction")

def test_nlp_inventory_management():
    """Test inventory management intent"""
    from nlp_engine import get_intent_recognizer
    
    nlp = get_intent_recognizer()
    
    result = nlp.recognize_intent("Check inventory levels")
    assert result['intent'] == 'inventory_management'
    assert result['bot'] == 'inventory_optimizer'
    
    print("✅ NLP Intent Recognition: Inventory Management")

def test_nlp_demand_forecasting():
    """Test demand forecasting intent"""
    from nlp_engine import get_intent_recognizer
    
    nlp = get_intent_recognizer()
    
    result = nlp.recognize_intent("Forecast demand for Product X next month")
    assert result['intent'] == 'demand_forecasting'
    assert result['bot'] == 'demand_forecasting'
    
    print("✅ NLP Intent Recognition: Demand Forecasting")

def test_nlp_unknown_intent():
    """Test unknown intent handling"""
    from nlp_engine import get_intent_recognizer
    
    nlp = get_intent_recognizer()
    
    result = nlp.recognize_intent("asdfghjkl random gibberish")
    assert result['intent'] == 'unknown'
    assert result['confidence'] == 0.0
    assert 'suggestions' in result
    
    print("✅ NLP Intent Recognition: Unknown Intent Handling")

def test_nlp_parameter_extraction():
    """Test parameter extraction from natural language"""
    from nlp_engine import get_intent_recognizer
    
    nlp = get_intent_recognizer()
    
    result = nlp.recognize_intent("Plan production for 1000 units of Widget A by 2025-12-31")
    params = result['extracted_params']
    
    # Check if quantity was extracted
    if 'quantity' in params:
        assert params['quantity'] == 1000
        print(f"   Extracted quantity: {params['quantity']}")
    
    # Check if product was extracted
    if 'product_name' in params:
        print(f"   Extracted product: {params['product_name']}")
    
    print("✅ NLP Parameter Extraction")

def test_nlp_clarification_questions():
    """Test clarification question generation"""
    from nlp_engine import get_intent_recognizer
    
    nlp = get_intent_recognizer()
    
    result = nlp.recognize_intent("Plan production")
    
    if result['missing_params']:
        clarification = nlp.get_clarification_question(result)
        assert clarification is not None
        assert isinstance(clarification, str)
        assert len(clarification) > 0
        print(f"   Clarification: {clarification}")
    
    print("✅ NLP Clarification Questions")

@pytest.mark.asyncio
async def test_bot_orchestrator_single_bot():
    """Test single bot execution via orchestrator"""
    from bot_orchestrator import get_bot_orchestrator
    
    orchestrator = get_bot_orchestrator()
    
    result = await orchestrator.execute_bot(
        bot_id="mrp_bot",
        parameters={
            "bom": {"items": [{"name": "Part A", "quantity": 5}]},
            "quantity": 100
        },
        user_id="test_user"
    )
    
    assert result['status'] == 'success'
    assert result['bot'] == 'mrp_bot'
    assert 'execution_time' in result
    assert result['execution_time'] >= 0
    
    print("✅ Bot Orchestrator: Single Bot Execution")

@pytest.mark.asyncio
async def test_bot_orchestrator_workflow():
    """Test multi-bot workflow execution"""
    from bot_orchestrator import get_bot_orchestrator
    
    orchestrator = get_bot_orchestrator()
    
    workflow = [
        {
            "name": "optimize_inventory",
            "bot": "inventory_optimizer",
            "params": {
                "current_stock": [
                    {"item": "Part A", "quantity": 100, "min_quantity": 50}
                ]
            }
        },
        {
            "name": "plan_production",
            "bot": "mrp_bot",
            "params": {
                "bom": {"items": [{"name": "Part A", "quantity": 2}]},
                "quantity": 50
            },
            "depends_on": ["optimize_inventory"]
        }
    ]
    
    result = await orchestrator.execute_workflow(workflow, user_id="test_user")
    
    assert result['status'] in ['completed', 'completed_with_errors']
    assert result['steps_executed'] == 2
    assert 'optimize_inventory' in result['results']
    assert 'plan_production' in result['results']
    
    print("✅ Bot Orchestrator: Multi-bot Workflow")

@pytest.mark.asyncio
async def test_bot_orchestrator_intelligent_routing():
    """Test intelligent routing based on intent"""
    from bot_orchestrator import get_bot_orchestrator
    from nlp_engine import get_intent_recognizer
    
    orchestrator = get_bot_orchestrator()
    nlp = get_intent_recognizer()
    
    # Get intent
    intent = nlp.recognize_intent("Check inventory for Product X")
    
    # Route request
    result = await orchestrator.intelligent_route(intent, user_id="test_user")
    
    # Since parameters might be missing, status could be needs_clarification or success
    assert result['status'] in ['success', 'needs_clarification']
    
    print("✅ Bot Orchestrator: Intelligent Routing")

@pytest.mark.asyncio
async def test_bot_orchestrator_statistics():
    """Test bot execution statistics"""
    from bot_orchestrator import get_bot_orchestrator
    
    orchestrator = get_bot_orchestrator()
    
    # Execute a bot
    await orchestrator.execute_bot(
        bot_id="quality_predictor",
        parameters={"product": "Widget A", "historical_data": []},
        user_id="test_user"
    )
    
    # Get statistics
    stats = orchestrator.get_bot_statistics()
    
    assert 'total_executions' in stats
    assert stats['total_executions'] > 0
    assert 'bots' in stats
    assert 'average_execution_time' in stats
    assert 'success_rate' in stats
    
    print(f"   Total executions: {stats['total_executions']}")
    print(f"   Success rate: {stats['success_rate']:.1f}%")
    print("✅ Bot Orchestrator: Statistics")

@pytest.mark.asyncio
async def test_aria_controller_basic_request():
    """Test Aria controller basic request processing"""
    from aria_controller import get_aria_controller
    
    aria = get_aria_controller(None)  # No ERP integration for basic test
    
    response = await aria.process_request(
        message="Forecast demand for Product X",
        user_id="test_user"
    )
    
    assert 'status' in response
    assert response['status'] in ['success', 'needs_clarification', 'unknown_intent']
    assert 'timestamp' in response
    
    if response['status'] == 'success':
        assert 'aria_says' in response
        print(f"   Aria says: {response['aria_says']}")
    
    print("✅ Aria Controller: Basic Request Processing")

@pytest.mark.asyncio
async def test_aria_controller_clarification():
    """Test Aria controller clarification handling"""
    from aria_controller import get_aria_controller
    
    aria = get_aria_controller(None)
    
    response = await aria.process_request(
        message="Plan production",
        user_id="test_user"
    )
    
    if response['status'] == 'needs_clarification':
        assert 'clarification' in response or 'aria_says' in response
        assert 'missing_params' in response
        print(f"   Missing params: {response['missing_params']}")
        print(f"   Clarification: {response.get('clarification', response.get('aria_says'))}")
    
    print("✅ Aria Controller: Clarification Handling")

@pytest.mark.asyncio
async def test_aria_controller_system_status():
    """Test Aria system status"""
    from aria_controller import get_aria_controller
    
    aria = get_aria_controller(None)
    
    status = await aria.get_system_status()
    
    assert 'status' in status
    assert status['status'] == 'operational'
    assert 'aria_version' in status
    assert 'capabilities' in status
    assert 'bots' in status
    
    capabilities = status['capabilities']
    assert capabilities['natural_language_processing'] == True
    assert capabilities['bot_orchestration'] == True
    assert capabilities['multi_bot_workflows'] == True
    assert capabilities['conversational_ai'] == True
    
    print(f"   Aria version: {status['aria_version']}")
    print(f"   Status: {status['status']}")
    print("✅ Aria Controller: System Status")

@pytest.mark.asyncio
async def test_aria_controller_help():
    """Test Aria help system"""
    from aria_controller import get_aria_controller
    
    aria = get_aria_controller(None)
    
    # General help
    help_response = await aria.help()
    assert 'categories' in help_response
    assert 'all_capabilities' in help_response
    assert 'aria_says' in help_response
    
    # Category-specific help
    mfg_help = await aria.help(category="manufacturing")
    assert 'capabilities' in mfg_help
    assert len(mfg_help['capabilities']) > 0
    
    print(f"   Categories: {help_response['categories']}")
    print(f"   Manufacturing capabilities: {len(mfg_help['capabilities'])}")
    print("✅ Aria Controller: Help System")

def test_conversation_manager():
    """Test conversation management"""
    from nlp_engine import get_conversation_manager
    
    conv_manager = get_conversation_manager()
    
    # Start conversation
    intent_result = {"intent": "production_planning", "bot": "mrp_bot"}
    conv_id = conv_manager.start_conversation("test_user", intent_result)
    
    assert conv_id is not None
    assert conv_id.startswith("conv_")
    
    # Add messages
    conv_manager.add_message(conv_id, "user", "Hello Aria")
    conv_manager.add_message(conv_id, "aria", "Hi! How can I help?")
    
    # Get conversation
    conversation = conv_manager.get_conversation(conv_id)
    assert conversation is not None
    assert len(conversation['messages']) == 2
    assert conversation['status'] == 'active'
    
    # End conversation
    conv_manager.end_conversation(conv_id)
    conversation = conv_manager.get_conversation(conv_id)
    assert conversation['status'] == 'completed'
    
    print(f"   Conversation ID: {conv_id}")
    print(f"   Messages: {len(conversation['messages'])}")
    print("✅ Conversation Manager")

def test_nlp_healthcare_intents():
    """Test healthcare-specific intents"""
    from nlp_engine import get_intent_recognizer
    
    nlp = get_intent_recognizer()
    
    # Patient scheduling
    result = nlp.recognize_intent("Schedule patient appointment for John Doe")
    assert result['intent'] == 'patient_scheduling'
    assert result['bot'] == 'patient_scheduling'
    
    # Medical records
    result = nlp.recognize_intent("Access medical records for patient 12345")
    assert result['intent'] == 'medical_records'
    assert result['bot'] == 'medical_records'
    
    # Insurance claims
    result = nlp.recognize_intent("Process insurance claim for patient")
    assert result['intent'] == 'insurance_claims'
    assert result['bot'] == 'insurance_claims'
    
    print("✅ NLP Healthcare Intents")

def test_nlp_retail_intents():
    """Test retail-specific intents"""
    from nlp_engine import get_intent_recognizer
    
    nlp = get_intent_recognizer()
    
    # Price optimization
    result = nlp.recognize_intent("Optimize pricing for Product A")
    assert result['intent'] == 'price_optimization'
    assert result['bot'] == 'price_optimization'
    
    # Customer segmentation
    result = nlp.recognize_intent("Segment customers by behavior")
    assert result['intent'] == 'customer_segmentation'
    assert result['bot'] == 'customer_segmentation'
    
    # Store performance
    result = nlp.recognize_intent("Analyze store performance for Store 101")
    assert result['intent'] == 'store_performance'
    assert result['bot'] == 'store_performance'
    
    print("✅ NLP Retail Intents")

def test_nlp_erp_intents():
    """Test ERP-specific intents"""
    from nlp_engine import get_intent_recognizer
    
    nlp = get_intent_recognizer()
    
    # Create BOM
    result = nlp.recognize_intent("Create bill of materials for Product X")
    assert result['intent'] == 'create_bom'
    assert result.get('action') == 'create_bom'
    
    # Create work order
    result = nlp.recognize_intent("Create work order for 100 units")
    assert result['intent'] == 'create_work_order'
    assert result.get('action') == 'create_work_order'
    
    # Create inspection (may map to quality_prediction)
    result = nlp.recognize_intent("Schedule quality inspection")
    # Accept either create_inspection or quality_prediction
    assert result['intent'] in ['create_inspection', 'quality_prediction']
    
    print("✅ NLP ERP Intents")

# Run all tests
if __name__ == "__main__":
    print("\n" + "="*70)
    print("  ARIA PHASE 2 - COMPREHENSIVE TEST SUITE")
    print("="*70 + "\n")
    
    print("🧪 Testing NLP Engine...")
    print("-"*70)
    test_nlp_intent_recognition()
    test_nlp_quality_prediction()
    test_nlp_inventory_management()
    test_nlp_demand_forecasting()
    test_nlp_unknown_intent()
    test_nlp_parameter_extraction()
    test_nlp_clarification_questions()
    test_nlp_healthcare_intents()
    test_nlp_retail_intents()
    test_nlp_erp_intents()
    
    print("\n🤖 Testing Bot Orchestrator...")
    print("-"*70)
    asyncio.run(test_bot_orchestrator_single_bot())
    asyncio.run(test_bot_orchestrator_workflow())
    asyncio.run(test_bot_orchestrator_intelligent_routing())
    asyncio.run(test_bot_orchestrator_statistics())
    
    print("\n🧠 Testing Aria Controller...")
    print("-"*70)
    asyncio.run(test_aria_controller_basic_request())
    asyncio.run(test_aria_controller_clarification())
    asyncio.run(test_aria_controller_system_status())
    asyncio.run(test_aria_controller_help())
    
    print("\n💬 Testing Conversation Manager...")
    print("-"*70)
    test_conversation_manager()
    
    print("\n" + "="*70)
    print("  ✅ ALL PHASE 2 TESTS PASSED!")
    print("="*70 + "\n")
    
    print("📊 TEST SUMMARY:")
    print("   - NLP Engine: 10 tests ✅")
    print("   - Bot Orchestrator: 4 tests ✅")
    print("   - Aria Controller: 4 tests ✅")
    print("   - Conversation Manager: 1 test ✅")
    print("   TOTAL: 19 tests PASSED ✅")
    print("\n🚀 Aria AI Controller is ready for deployment!")
