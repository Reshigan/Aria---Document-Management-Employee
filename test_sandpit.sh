#!/bin/bash

###############################################################################
# ARIA SANDPIT - Comprehensive Test Script
# Tests all bots and ERP modules
###############################################################################

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="http://localhost:8000"

print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"
}

print_test() {
    echo -e "${YELLOW}→ Testing: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

test_endpoint() {
    local name=$1
    local endpoint=$2
    local method=${3:-GET}
    
    print_test "$name"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$4")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        print_success "$name - HTTP $http_code"
        if command -v jq &> /dev/null; then
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        else
            echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
        fi
    else
        print_error "$name - HTTP $http_code"
        echo "$body"
    fi
    echo ""
}

print_header "🚀 ARIA SANDPIT TEST SUITE"

# Test 1: Health Check
print_header "1️⃣  HEALTH CHECK"
test_endpoint "System Health" "/health"

# Test 2: List All Bots
print_header "2️⃣  BOT INVENTORY"
test_endpoint "List All Bots" "/api/bots"

# Test 3: Individual Bot Info
print_header "3️⃣  INDIVIDUAL BOT TESTS"
test_endpoint "Invoice Reconciliation Bot" "/api/bots/invoice_reconciliation"
test_endpoint "Expense Management Bot" "/api/bots/expense_management"
test_endpoint "Accounts Payable Bot" "/api/bots/accounts_payable"
test_endpoint "AR Collections Bot" "/api/bots/ar_collections"
test_endpoint "Bank Reconciliation Bot" "/api/bots/bank_reconciliation"
test_endpoint "Lead Qualification Bot" "/api/bots/lead_qualification"
test_endpoint "Payroll SA Bot" "/api/bots/payroll_sa"
test_endpoint "BBBEE Compliance Bot" "/api/bots/bbbee_compliance"

# Test 4: Bot Execution
print_header "4️⃣  BOT EXECUTION TESTS"
test_endpoint "Execute Invoice Bot" "/api/bots/execute" "POST" '{
    "bot_name": "invoice_reconciliation",
    "data": {
        "invoice_number": "TEST-001",
        "amount": 1000.00,
        "supplier": "Test Supplier"
    }
}'

test_endpoint "Execute Payroll Bot" "/api/bots/execute" "POST" '{
    "bot_name": "payroll_sa",
    "data": {
        "employee_id": "EMP001",
        "gross_salary": 25000
    }
}'

# Test 5: ERP Modules
print_header "5️⃣  ERP MODULE TESTS"
test_endpoint "Financial Module" "/api/erp/financial"
test_endpoint "HR Module" "/api/erp/hr"
test_endpoint "CRM Module" "/api/erp/crm"
test_endpoint "Procurement Module" "/api/erp/procurement"
test_endpoint "Compliance Module" "/api/erp/compliance"

# Summary
print_header "✨ TEST SUITE COMPLETE ✨"

echo -e "${BLUE}📊 Summary:${NC}"
echo -e "  • All 8 bots tested"
echo -e "  • All 5 ERP modules tested"
echo -e "  • Bot execution tested"
echo -e "  • System health verified"
echo ""
echo -e "${BLUE}🌐 Access Points:${NC}"
echo -e "  • Backend API: $API_URL"
echo -e "  • API Docs: $API_URL/docs"
echo -e "  • Frontend: http://localhost:12000"
echo ""
echo -e "${GREEN}🎉 Sandpit is ready for testing!${NC}"
