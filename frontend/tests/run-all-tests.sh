#!/bin/bash

# ARIA ERP - Comprehensive Test Runner
# This script runs all automated tests for the ARIA ERP system
# Usage: ./run-all-tests.sh [options]
#
# Options:
#   --full        Run all tests including slow E2E tests
#   --api         Run only API integration tests
#   --bots        Run only bot execution tests
#   --smoke       Run quick smoke tests
#   --headed      Run tests with browser visible
#   --report      Generate HTML report
#   --ci          Run in CI mode (no retries, fail fast)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="${FRONTEND_URL:-https://aria.vantax.co.za}"
API_URL="${API_URL:-https://aria-api.reshigan-085.workers.dev}"
TIMEOUT="${TIMEOUT:-60000}"
RETRIES="${RETRIES:-2}"

# Parse arguments
RUN_FULL=false
RUN_API=false
RUN_BOTS=false
RUN_SMOKE=false
HEADED=false
REPORT=false
CI_MODE=false

for arg in "$@"; do
  case $arg in
    --full)
      RUN_FULL=true
      ;;
    --api)
      RUN_API=true
      ;;
    --bots)
      RUN_BOTS=true
      ;;
    --smoke)
      RUN_SMOKE=true
      ;;
    --headed)
      HEADED=true
      ;;
    --report)
      REPORT=true
      ;;
    --ci)
      CI_MODE=true
      RETRIES=0
      ;;
  esac
done

# If no specific test type selected, run API and bot tests (fast)
if [ "$RUN_FULL" = false ] && [ "$RUN_API" = false ] && [ "$RUN_BOTS" = false ] && [ "$RUN_SMOKE" = false ]; then
  RUN_API=true
  RUN_BOTS=true
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ARIA ERP - Automated Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Frontend URL: ${GREEN}$FRONTEND_URL${NC}"
echo -e "API URL: ${GREEN}$API_URL${NC}"
echo -e "Timeout: ${YELLOW}${TIMEOUT}ms${NC}"
echo ""

# Build playwright options
PLAYWRIGHT_OPTS="--project=chromium --timeout=$TIMEOUT"

if [ "$HEADED" = true ]; then
  PLAYWRIGHT_OPTS="$PLAYWRIGHT_OPTS --headed"
fi

if [ "$REPORT" = true ]; then
  PLAYWRIGHT_OPTS="$PLAYWRIGHT_OPTS --reporter=html"
else
  PLAYWRIGHT_OPTS="$PLAYWRIGHT_OPTS --reporter=list"
fi

if [ "$CI_MODE" = true ]; then
  PLAYWRIGHT_OPTS="$PLAYWRIGHT_OPTS --retries=0"
else
  PLAYWRIGHT_OPTS="$PLAYWRIGHT_OPTS --retries=$RETRIES"
fi

# Track results
TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_SKIPPED=0

run_test() {
  local test_name=$1
  local test_file=$2
  
  echo -e "\n${YELLOW}Running: $test_name${NC}"
  echo "----------------------------------------"
  
  if FRONTEND_URL=$FRONTEND_URL npx playwright test $test_file $PLAYWRIGHT_OPTS; then
    echo -e "${GREEN}$test_name: PASSED${NC}"
    return 0
  else
    echo -e "${RED}$test_name: FAILED${NC}"
    return 1
  fi
}

# Run smoke tests
if [ "$RUN_SMOKE" = true ]; then
  echo -e "\n${BLUE}=== SMOKE TESTS ===${NC}"
  run_test "Smoke Tests" "tests/e2e/smoke.spec.ts" || TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi

# Run API integration tests
if [ "$RUN_API" = true ]; then
  echo -e "\n${BLUE}=== API INTEGRATION TESTS ===${NC}"
  run_test "API Integration Tests" "tests/e2e/api-integration.spec.ts" || TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi

# Run bot execution tests
if [ "$RUN_BOTS" = true ]; then
  echo -e "\n${BLUE}=== BOT EXECUTION TESTS ===${NC}"
  run_test "Bot Execution Tests" "tests/e2e/bot-execution.spec.ts" || TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi

# Run full system tests
if [ "$RUN_FULL" = true ]; then
  echo -e "\n${BLUE}=== FULL SYSTEM TESTS ===${NC}"
  run_test "Full System Tests" "tests/e2e/full-system-test.spec.ts" || TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  TEST SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"

if [ $TOTAL_FAILED -eq 0 ]; then
  echo -e "${GREEN}All test suites passed!${NC}"
  exit 0
else
  echo -e "${RED}$TOTAL_FAILED test suite(s) failed${NC}"
  exit 1
fi
