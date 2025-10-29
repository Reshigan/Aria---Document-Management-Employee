#!/bin/bash
#
# ARIA Deployment Validation Script
# Runs comprehensive tests on production deployment
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="aria.vantax.co.za"
FAILURES=0

echo -e "${BLUE}🔍 ARIA Deployment Validation${NC}"
echo "=============================="
echo ""

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "401" ]; then
        if [ -n "$expected" ]; then
            result=$(echo "$body" | jq -r "$expected" 2>/dev/null || echo "")
            if [ -n "$result" ]; then
                echo -e "${GREEN}✅ $result${NC}"
            else
                echo -e "${GREEN}✅ (HTTP $http_code)${NC}"
            fi
        else
            echo -e "${GREEN}✅ (HTTP $http_code)${NC}"
        fi
    else
        echo -e "${RED}❌ HTTP $http_code${NC}"
        FAILURES=$((FAILURES + 1))
    fi
}

# Frontend tests
echo -e "${BLUE}Frontend Tests:${NC}"
test_endpoint "Frontend root" "https://$DOMAIN/" ""
test_endpoint "Frontend /login" "https://$DOMAIN/login" ""
test_endpoint "Frontend /dashboard" "https://$DOMAIN/dashboard" ""
echo ""

# Backend API tests
echo -e "${BLUE}Backend API Tests:${NC}"
test_endpoint "Auth login endpoint" "https://$DOMAIN/api/auth/login" ""
test_endpoint "Auth register endpoint" "https://$DOMAIN/api/auth/register" ""
test_endpoint "Bots list" "https://$DOMAIN/api/bots" '.total + " bots"'
test_endpoint "ERP modules" "https://$DOMAIN/api/erp/modules" '.total + " modules"'
echo ""

# SSL/HTTPS tests
echo -e "${BLUE}SSL/HTTPS Tests:${NC}"
echo -n "Testing SSL certificate... "
ssl_result=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | grep "Verify return code")
if [[ $ssl_result == *"0 (ok)"* ]]; then
    echo -e "${GREEN}✅ Valid${NC}"
else
    echo -e "${YELLOW}⚠️  $ssl_result${NC}"
fi

echo -n "Testing HTTPS redirect... "
http_response=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/" 2>/dev/null)
if [ "$http_response" = "301" ] || [ "$http_response" = "302" ]; then
    echo -e "${GREEN}✅ Redirects to HTTPS${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP $http_response${NC}"
fi
echo ""

# Detailed bot test
echo -e "${BLUE}Bot Categories Test:${NC}"
BOTS_RESPONSE=$(curl -s "https://$DOMAIN/api/bots" 2>/dev/null)

# Count bots by category
for category in "communication" "compliance" "crm" "documents" "financial" "healthcare" "hr" "manufacturing" "procurement" "retail"; do
    count=$(echo "$BOTS_RESPONSE" | jq -r "[.bots[] | select(.category == \"$category\")] | length" 2>/dev/null)
    if [ -n "$count" ] && [ "$count" -gt 0 ]; then
        echo -e "  $category: ${GREEN}$count bots${NC}"
    fi
done
echo ""

# ERP modules test
echo -e "${BLUE}ERP Modules Test:${NC}"
ERP_RESPONSE=$(curl -s "https://$DOMAIN/api/erp/modules" 2>/dev/null)
echo "$ERP_RESPONSE" | jq -r '.modules[] | "  " + .icon + " " + .name' 2>/dev/null
echo ""

# Authentication test
echo -e "${BLUE}Authentication Test:${NC}"
echo -n "Testing login with credentials... "
LOGIN_RESPONSE=$(curl -s -X POST "https://$DOMAIN/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@vantax.co.za","password":"admin123"}' 2>/dev/null)

if echo "$LOGIN_RESPONSE" | jq -e '.access_token' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Login successful${NC}"
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
    
    # Test authenticated endpoint
    echo -n "Testing authenticated bot request... "
    AUTH_TEST=$(curl -s -H "Authorization: Bearer $TOKEN" "https://$DOMAIN/api/bots" 2>/dev/null)
    if echo "$AUTH_TEST" | jq -e '.bots' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Authentication working${NC}"
    else
        echo -e "${RED}❌ Authentication failed${NC}"
        FAILURES=$((FAILURES + 1))
    fi
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    FAILURES=$((FAILURES + 1))
fi
echo ""

# Configuration checks
echo -e "${BLUE}Configuration Checks:${NC}"
echo -n "Checking for /api/v1 in frontend... "
if grep -r "api/v1" frontend/src/ --files-with-matches 2>/dev/null | grep -q .; then
    echo -e "${RED}❌ FOUND /api/v1 paths (should be /api)${NC}"
    FAILURES=$((FAILURES + 1))
else
    echo -e "${GREEN}✅ All frontend paths use /api${NC}"
fi

echo -n "Checking backend database path... "
if grep -q "aria_production.db" backend/database.py; then
    echo -e "${GREEN}✅ Using aria_production.db${NC}"
else
    echo -e "${RED}❌ Not using aria_production.db${NC}"
    FAILURES=$((FAILURES + 1))
fi
echo ""

# Summary
echo "=============================="
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    echo "🎉 Deployment is healthy and ready for use"
    echo "🌐 URL: https://$DOMAIN"
    echo "🔐 Admin: admin@vantax.co.za / admin123"
    exit 0
else
    echo -e "${RED}❌ $FAILURES TEST(S) FAILED${NC}"
    echo ""
    echo "Please review the failures above and fix them."
    exit 1
fi
