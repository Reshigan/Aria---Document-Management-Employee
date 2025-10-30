#!/bin/bash
# ARIA ERP - Comprehensive System Test

echo "🧪 ARIA ERP - System Test Suite"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" $url 2>/dev/null)
    
    if [ "$response" == "$expected" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL (got HTTP $response, expected $expected)${NC}"
        ((FAILED++))
        return 1
    fi
}

echo -e "${BLUE}📡 Backend API Tests${NC}"
echo "-------------------"
test_endpoint "API Root" "http://localhost:12000/" "200"
test_endpoint "Health Check" "http://localhost:12000/health" "200"
test_endpoint "API Docs" "http://localhost:12000/docs" "200"
test_endpoint "OpenAPI JSON" "http://localhost:12000/openapi.json" "200"

echo ""
echo -e "${BLUE}🔐 Authentication Tests${NC}"
echo "-------------------"
test_endpoint "Login Endpoint" "http://localhost:12000/api/v1/auth/login" "422"  # No body = validation error
test_endpoint "Register Endpoint" "http://localhost:12000/api/v1/auth/register" "422"  # No body = validation error

echo ""
echo -e "${BLUE}🎨 Frontend Tests${NC}"
echo "-----------------"
test_endpoint "Frontend Root" "http://localhost:12001/" "200"
test_endpoint "Frontend Assets" "http://localhost:12001/@vite/client" "200"

echo ""
echo -e "${BLUE}🤖 AI Bots Tests${NC}"
echo "----------------"
bot_count=$(ls -1 /workspace/project/aria-erp/backend/app/bots/*.py 2>/dev/null | grep -v "__pycache__" | wc -l)
echo -n "Checking bot files... "
if [ "$bot_count" -ge "60" ]; then
    echo -e "${GREEN}✅ PASS ($bot_count bots found)${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL (only $bot_count bots found, expected 60+)${NC}"
    ((FAILED++))
fi

echo ""
echo -e "${BLUE}📁 File Structure Tests${NC}"
echo "----------------------"

files_to_check=(
    "/workspace/project/aria-erp/backend/app/main.py"
    "/workspace/project/aria-erp/backend/requirements.txt"
    "/workspace/project/aria-erp/backend/Dockerfile"
    "/workspace/project/aria-erp/frontend/package.json"
    "/workspace/project/aria-erp/frontend/Dockerfile"
    "/workspace/project/aria-erp/docker-compose.yml"
    "/workspace/project/aria-erp/nginx/nginx.conf"
    "/workspace/project/aria-erp/deploy/deploy.sh"
    "/workspace/project/aria-erp/README.md"
    "/workspace/project/aria-erp/DEPLOYMENT.md"
    "/workspace/project/aria-erp/PRODUCTION_READY.md"
    "/workspace/project/aria-erp/QUICK_START.md"
)

for file in "${files_to_check[@]}"; do
    filename=$(basename "$file")
    echo -n "Checking $filename... "
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ EXISTS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ MISSING${NC}"
        ((FAILED++))
    fi
done

echo ""
echo -e "${BLUE}📦 Dependencies Tests${NC}"
echo "--------------------"

# Check Python
echo -n "Python installed... "
if command -v python &> /dev/null || command -v python3 &> /dev/null; then
    echo -e "${GREEN}✅ YES${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ NO${NC}"
    ((FAILED++))
fi

# Check Node.js
echo -n "Node.js installed... "
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ YES${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ NO${NC}"
    ((FAILED++))
fi

# Check npm
echo -n "npm installed... "
if command -v npm &> /dev/null; then
    echo -e "${GREEN}✅ YES${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ NO${NC}"
    ((FAILED++))
fi

# Check Docker
echo -n "Docker installed... "
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ YES${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  OPTIONAL${NC}"
fi

echo ""
echo "================================"
echo -e "${BLUE}📊 Test Summary${NC}"
echo "================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! System is ready!${NC}"
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Login: http://localhost:12001"
    echo "   2. Explore: Navigate to AI Bots page"
    echo "   3. Deploy: sudo bash deploy/deploy.sh"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please check the output above.${NC}"
    echo ""
    echo "🔧 Common fixes:"
    echo "   - Start backend: cd backend && uvicorn app.main:app --reload --port 12000"
    echo "   - Start frontend: cd frontend && npm run dev"
    echo "   - Check status: bash check-system.sh"
    exit 1
fi
