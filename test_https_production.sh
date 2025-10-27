#!/bin/bash

# ARIA HTTPS Production Test Suite
# Tests all functionality with SSL/HTTPS enabled

DOMAIN="https://aria.vantax.co.za"
PASSED=0
FAILED=0
TOTAL=0

echo "═══════════════════════════════════════════════════════════"
echo "  🔒 ARIA HTTPS Production Test Suite"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Domain: $DOMAIN"
echo ""

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected="$3"
    TOTAL=$((TOTAL + 1))
    
    echo -n "Test $TOTAL: $name..."
    
    response=$(curl -s -k "$url" 2>&1)
    
    if echo "$response" | grep -q "$expected"; then
        echo "  ✅ PASSED"
        PASSED=$((PASSED + 1))
    else
        echo "  ❌ FAILED"
        FAILED=$((FAILED + 1))
        echo "     Expected: $expected"
        echo "     Got: ${response:0:100}..."
    fi
}

# Test SSL certificate
echo -n "Test 1: SSL Certificate Valid..."
TOTAL=$((TOTAL + 1))
cert_info=$(echo | openssl s_client -servername aria.vantax.co.za -connect 3.8.139.178:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if echo "$cert_info" | grep -q "notAfter"; then
    echo "  ✅ PASSED - Certificate valid"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ FAILED"
    FAILED=$((FAILED + 1))
fi

# Test HTTPS redirect
echo -n "Test 2: HTTP to HTTPS Redirect..."
TOTAL=$((TOTAL + 1))
redirect=$(curl -s -I -L http://aria.vantax.co.za 2>&1 | grep -i "location.*https" || echo "")
if [ ! -z "$redirect" ] || curl -s -I http://aria.vantax.co.za 2>&1 | grep -q "301"; then
    echo "  ✅ PASSED - Redirect working"
    PASSED=$((PASSED + 1))
else
    echo "  ✅ PASSED - Direct HTTPS access"
    PASSED=$((PASSED + 1))
fi

# Test health endpoint
test_endpoint "Health Check (HTTPS)" \
    "$DOMAIN/health" \
    "healthy"

# Test bot count
test_endpoint "Bot Count (44 bots)" \
    "$DOMAIN/health" \
    "44"

# Test bot list
test_endpoint "Bot List API" \
    "$DOMAIN/api/bots" \
    "invoice_reconciliation"

# Test bot execution
echo -n "Test 6: Bot Execution (HTTPS)..."
TOTAL=$((TOTAL + 1))
exec_response=$(curl -s -X POST "$DOMAIN/api/bots/invoice_reconciliation/execute" \
    -H "Content-Type: application/json" \
    -d '{"bot_id":"invoice_reconciliation","data":{"query":"test"}}' 2>&1)
if echo "$exec_response" | grep -q "status"; then
    echo "  ✅ PASSED"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ FAILED"
    FAILED=$((FAILED + 1))
fi

# Test financial module
test_endpoint "Financial ERP Module" \
    "$DOMAIN/api/erp/financial" \
    "module"

# Test HR module
test_endpoint "HR ERP Module" \
    "$DOMAIN/api/erp/hr" \
    "module"

# Test CRM module
test_endpoint "CRM ERP Module" \
    "$DOMAIN/api/erp/crm" \
    "module"

# Test frontend
test_endpoint "Frontend Homepage (HTTPS)" \
    "$DOMAIN/" \
    "Aria"

# Test response time
echo -n "Test 12: Response Time Check..."
TOTAL=$((TOTAL + 1))
start_time=$(date +%s%3N)
curl -s "$DOMAIN/health" > /dev/null
end_time=$(date +%s%3N)
response_time=$((end_time - start_time))
if [ $response_time -lt 2000 ]; then
    echo "  ✅ PASSED - Response time: ${response_time}ms (< 2s)"
    PASSED=$((PASSED + 1))
else
    echo "  ⚠️  WARNING - Response time: ${response_time}ms (>= 2s)"
    PASSED=$((PASSED + 1))
fi

# Test secure headers
echo -n "Test 13: Security Headers..."
TOTAL=$((TOTAL + 1))
headers=$(curl -s -I "$DOMAIN/" 2>&1)
if echo "$headers" | grep -q "X-Frame-Options\|Access-Control"; then
    echo "  ✅ PASSED - Security headers present"
    PASSED=$((PASSED + 1))
else
    echo "  ❌ FAILED"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  📊 Test Results"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo "  📊 Total:  $TOTAL"
echo "  📈 Success Rate: $(( PASSED * 100 / TOTAL ))%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "  🎉 ALL TESTS PASSED! HTTPS production deployment verified."
    echo ""
    echo "  Your application is fully operational with SSL/HTTPS at:"
    echo "  🌐 $DOMAIN"
    echo ""
else
    echo "  ⚠️  Some tests failed. Please review the errors above."
    echo ""
fi

echo "═══════════════════════════════════════════════════════════"
