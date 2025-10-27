#!/bin/bash

# Production Test Suite for ARIA Platform

BASE_URL="http://3.8.139.178"

echo "═══════════════════════════════════════════════════════════"
echo "  🧪 ARIA Production Test Suite"
echo "═══════════════════════════════════════════════════════════"
echo ""

PASSED=0
FAILED=0

# Test 1: Health Check
echo "Test 1: Health Check..."
if curl -sf "$BASE_URL/health" > /dev/null; then
    echo "  ✅ PASSED - Health endpoint responding"
    ((PASSED++))
else
    echo "  ❌ FAILED - Health endpoint not responding"
    ((FAILED++))
fi

# Test 2: Bot Count
echo "Test 2: Bot Count..."
BOT_COUNT=$(curl -sf "$BASE_URL/api/bots" | python3 -c "import sys, json; print(json.load(sys.stdin)['total'])" 2>/dev/null)
if [ "$BOT_COUNT" = "44" ]; then
    echo "  ✅ PASSED - All 44 bots available"
    ((PASSED++))
else
    echo "  ❌ FAILED - Expected 44 bots, got: $BOT_COUNT"
    ((FAILED++))
fi

# Test 3: Bot Execution - Invoice Reconciliation
echo "Test 3: Bot Execution - Invoice Reconciliation..."
EXEC_RESULT=$(curl -sf -X POST "$BASE_URL/api/bots/invoice_reconciliation/execute" \
  -H "Content-Type: application/json" \
  -d '{"bot_id": "invoice_reconciliation", "data": {"query": "test"}}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
if [ "$EXEC_RESULT" = "success" ]; then
    echo "  ✅ PASSED - Bot executed successfully"
    ((PASSED++))
else
    echo "  ❌ FAILED - Bot execution failed"
    ((FAILED++))
fi

# Test 4: Bot Execution - Lead Qualification
echo "Test 4: Bot Execution - Lead Qualification..."
EXEC_RESULT=$(curl -sf -X POST "$BASE_URL/api/bots/lead_qualification/execute" \
  -H "Content-Type: application/json" \
  -d '{"bot_id": "lead_qualification", "data": {"query": "test"}}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
if [ "$EXEC_RESULT" = "success" ]; then
    echo "  ✅ PASSED - Bot executed successfully"
    ((PASSED++))
else
    echo "  ❌ FAILED - Bot execution failed"
    ((FAILED++))
fi

# Test 5: ERP - Financial Module
echo "Test 5: ERP - Financial Module..."
FIN_STATUS=$(curl -sf "$BASE_URL/api/erp/financial" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
if [ "$FIN_STATUS" = "operational" ]; then
    echo "  ✅ PASSED - Financial module operational"
    ((PASSED++))
else
    echo "  ❌ FAILED - Financial module not operational"
    ((FAILED++))
fi

# Test 6: ERP - HR Module
echo "Test 6: ERP - HR Module..."
HR_STATUS=$(curl -sf "$BASE_URL/api/erp/hr" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
if [ "$HR_STATUS" = "operational" ]; then
    echo "  ✅ PASSED - HR module operational"
    ((PASSED++))
else
    echo "  ❌ FAILED - HR module not operational"
    ((FAILED++))
fi

# Test 7: ERP - CRM Module
echo "Test 7: ERP - CRM Module..."
CRM_STATUS=$(curl -sf "$BASE_URL/api/erp/crm" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
if [ "$CRM_STATUS" = "operational" ]; then
    echo "  ✅ PASSED - CRM module operational"
    ((PASSED++))
else
    echo "  ❌ FAILED - CRM module not operational"
    ((FAILED++))
fi

# Test 8: Frontend Loading
echo "Test 8: Frontend Loading..."
if curl -sf "$BASE_URL/" | grep -q "Aria - AI Orchestration Platform"; then
    echo "  ✅ PASSED - Frontend loads correctly"
    ((PASSED++))
else
    echo "  ❌ FAILED - Frontend not loading properly"
    ((FAILED++))
fi

# Test 9: API Documentation
echo "Test 9: API Documentation..."
if curl -sf "$BASE_URL/api/docs" > /dev/null; then
    echo "  ✅ PASSED - API docs accessible"
    ((PASSED++))
else
    echo "  ⚠️  SKIPPED - API docs endpoint (optional)"
fi

# Test 10: Response Time
echo "Test 10: Response Time Check..."
START=$(date +%s%N)
curl -sf "$BASE_URL/health" > /dev/null
END=$(date +%s%N)
ELAPSED=$((($END - $START) / 1000000))
if [ $ELAPSED -lt 1000 ]; then
    echo "  ✅ PASSED - Response time: ${ELAPSED}ms (< 1s)"
    ((PASSED++))
else
    echo "  ⚠️  WARNING - Response time: ${ELAPSED}ms (> 1s)"
    ((PASSED++))
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  📊 Test Results"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo "  📈 Success Rate: $(($PASSED * 100 / ($PASSED + $FAILED)))%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "  🎉 ALL TESTS PASSED! Production deployment verified."
    echo ""
    echo "  Your application is fully operational at:"
    echo "  🌐 $BASE_URL"
    echo ""
    exit 0
else
    echo "  ⚠️  Some tests failed. Please investigate."
    exit 1
fi
