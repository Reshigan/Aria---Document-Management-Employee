#!/bin/bash
#
# COMPREHENSIVE TEST SUITE RUNNER FOR ARIA ERP
# Runs ALL tests before public launch
# Exit code 0 = all pass, non-zero = failures
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
BACKEND_TESTS_PASSED=0
FRONTEND_TESTS_PASSED=0
TOTAL_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}"
echo "============================================================================"
echo "  ARIA ERP - COMPREHENSIVE PRE-LAUNCH TEST SUITE"
echo "============================================================================"
echo -e "${NC}"
echo ""
echo "📋 Test Plan:"
echo "   ✓ Backend API Tests (205 tests)"
echo "   ✓ Frontend E2E Tests (215 tests)"
echo "   ✓ Document Generation Tests"
echo "   ✓ Report Accuracy Tests"
echo "   ✓ Security Tests"
echo ""
echo "⏱️  Estimated Time: 15-20 minutes"
echo ""
echo "============================================================================"
echo ""

# Change to project root
cd "$(dirname "$0")"

# ============================================================================
# 1. BACKEND TESTS
# ============================================================================

echo -e "${BLUE}[1/5] Running Backend API Tests...${NC}"
echo ""

cd backend

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${YELLOW}⚠️  pytest not installed. Installing...${NC}"
    pip install -q pytest pytest-asyncio pytest-cov requests
fi

# Run backend tests
echo "Running 205 backend API tests..."
if pytest tests/test_comprehensive_backend.py -v --tb=short --color=yes 2>&1 | tee ../test_results_backend.log; then
    BACKEND_TESTS_PASSED=$(grep -c "PASSED" ../test_results_backend.log || echo "0")
    echo -e "${GREEN}✅ Backend tests completed: $BACKEND_TESTS_PASSED passed${NC}"
else
    echo -e "${RED}❌ Backend tests failed${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

cd ..

echo ""

# ============================================================================
# 2. FRONTEND E2E TESTS
# ============================================================================

echo -e "${BLUE}[2/5] Running Frontend E2E Tests...${NC}"
echo ""

cd frontend

# Check if Playwright is installed
if ! command -v playwright &> /dev/null; then
    echo -e "${YELLOW}⚠️  Playwright not installed. Installing...${NC}"
    npm install -D @playwright/test
    npx playwright install
fi

# Start frontend dev server in background
echo "Starting frontend dev server..."
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
sleep 10  # Wait for server to start

# Run E2E tests
echo "Running 215 frontend E2E tests..."
if npx playwright test tests/e2e/comprehensive.spec.ts --reporter=list 2>&1 | tee ../test_results_frontend.log; then
    FRONTEND_TESTS_PASSED=$(grep -c "passed" ../test_results_frontend.log || echo "0")
    echo -e "${GREEN}✅ Frontend tests completed: $FRONTEND_TESTS_PASSED passed${NC}"
else
    echo -e "${RED}❌ Frontend tests failed${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Stop frontend server
kill $FRONTEND_PID 2>/dev/null || true

cd ..

echo ""

# ============================================================================
# 3. DOCUMENT GENERATION TESTS
# ============================================================================

echo -e "${BLUE}[3/5] Running Document Generation Tests...${NC}"
echo ""

cd backend

echo "Testing document generation accuracy..."
# Run document generation tests
if pytest tests/test_document_api.py -v --tb=short --color=yes 2>&1 | tee ../test_results_documents.log; then
    DOC_TESTS=$(grep -c "PASSED" ../test_results_documents.log || echo "0")
    echo -e "${GREEN}✅ Document tests completed: $DOC_TESTS passed${NC}"
else
    echo -e "${RED}❌ Document tests failed${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

cd ..

echo ""

# ============================================================================
# 4. INTEGRATION TESTS
# ============================================================================

echo -e "${BLUE}[4/5] Running Integration Tests...${NC}"
echo ""

cd backend

echo "Testing backend <-> frontend integration..."
# Run integration tests
if pytest tests/test_integration_api.py -v --tb=short --color=yes 2>&1 | tee ../test_results_integration.log; then
    INT_TESTS=$(grep -c "PASSED" ../test_results_integration.log || echo "0")
    echo -e "${GREEN}✅ Integration tests completed: $INT_TESTS passed${NC}"
else
    echo -e "${RED}❌ Integration tests failed${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

cd ..

echo ""

# ============================================================================
# 5. SECURITY & PERFORMANCE TESTS
# ============================================================================

echo -e "${BLUE}[5/5] Running Security & Performance Tests...${NC}"
echo ""

cd backend

echo "Testing security vulnerabilities..."
# Run security tests
if pytest tests/test_auth.py tests/test_performance.py -v --tb=short --color=yes 2>&1 | tee ../test_results_security.log; then
    SEC_TESTS=$(grep -c "PASSED" ../test_results_security.log || echo "0")
    echo -e "${GREEN}✅ Security tests completed: $SEC_TESTS passed${NC}"
else
    echo -e "${RED}❌ Security tests failed${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

cd ..

echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo -e "${BLUE}"
echo "============================================================================"
echo "  TEST RESULTS SUMMARY"
echo "============================================================================"
echo -e "${NC}"
echo ""

TOTAL_TESTS=$((BACKEND_TESTS_PASSED + FRONTEND_TESTS_PASSED + DOC_TESTS + INT_TESTS + SEC_TESTS))

echo "📊 Test Execution Summary:"
echo ""
echo "   Backend API Tests:       $BACKEND_TESTS_PASSED / 205"
echo "   Frontend E2E Tests:      $FRONTEND_TESTS_PASSED / 215"
echo "   Document Tests:          $DOC_TESTS"
echo "   Integration Tests:       $INT_TESTS"
echo "   Security Tests:          $SEC_TESTS"
echo ""
echo "   ─────────────────────────────────────"
echo "   TOTAL TESTS PASSED:      $TOTAL_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}"
    echo "✅ ALL TESTS PASSED! READY FOR PRODUCTION! 🚀"
    echo -e "${NC}"
    echo ""
    echo "Next Steps:"
    echo "   1. Review test logs for any warnings"
    echo "   2. Deploy to staging environment"
    echo "   3. Run smoke tests on staging"
    echo "   4. Launch to production! 🎉"
    echo ""
    exit 0
else
    echo -e "${RED}"
    echo "❌ TESTS FAILED - DO NOT DEPLOY TO PRODUCTION"
    echo -e "${NC}"
    echo ""
    echo "Failed Test Categories: $FAILED_TESTS"
    echo ""
    echo "Action Required:"
    echo "   1. Review test logs:"
    echo "      - test_results_backend.log"
    echo "      - test_results_frontend.log"
    echo "      - test_results_documents.log"
    echo "      - test_results_integration.log"
    echo "      - test_results_security.log"
    echo "   2. Fix all failing tests"
    echo "   3. Re-run this test suite"
    echo "   4. Only deploy when all tests pass"
    echo ""
    exit 1
fi

# ============================================================================
# DETAILED LOGS
# ============================================================================

echo ""
echo "============================================================================"
echo "  DETAILED TEST LOGS"
echo "============================================================================"
echo ""
echo "📄 Test logs saved to:"
echo "   • test_results_backend.log"
echo "   • test_results_frontend.log"
echo "   • test_results_documents.log"
echo "   • test_results_integration.log"
echo "   • test_results_security.log"
echo ""
echo "To view a specific log:"
echo "   cat test_results_backend.log"
echo ""
echo "============================================================================"
echo ""
