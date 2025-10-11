#!/bin/bash

# ARIA Frontend Test Runner
# Comprehensive testing script for the ARIA Document Management System frontend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run tests with error handling
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    print_status "Running $test_name..."
    
    if eval "$test_command"; then
        print_success "$test_name completed successfully"
        return 0
    else
        print_error "$test_name failed"
        return 1
    fi
}

# Parse command line arguments
UNIT_TESTS=false
INTEGRATION_TESTS=false
E2E_TESTS=false
COVERAGE=false
WATCH=false
CI_MODE=false
LINT=false
TYPE_CHECK=false
FORMAT_CHECK=false
ALL_TESTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --unit)
            UNIT_TESTS=true
            shift
            ;;
        --integration)
            INTEGRATION_TESTS=true
            shift
            ;;
        --e2e)
            E2E_TESTS=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        --ci)
            CI_MODE=true
            shift
            ;;
        --lint)
            LINT=true
            shift
            ;;
        --type-check)
            TYPE_CHECK=true
            shift
            ;;
        --format-check)
            FORMAT_CHECK=true
            shift
            ;;
        --all)
            ALL_TESTS=true
            shift
            ;;
        --help)
            echo "ARIA Frontend Test Runner"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --unit           Run unit tests only"
            echo "  --integration    Run integration tests only"
            echo "  --e2e           Run end-to-end tests"
            echo "  --coverage      Generate coverage report"
            echo "  --watch         Run tests in watch mode"
            echo "  --ci            Run in CI mode"
            echo "  --lint          Run linting"
            echo "  --type-check    Run TypeScript type checking"
            echo "  --format-check  Check code formatting"
            echo "  --all           Run all tests and checks"
            echo "  --help          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --unit --coverage    # Run unit tests with coverage"
            echo "  $0 --all               # Run all tests and checks"
            echo "  $0 --e2e --ci          # Run E2E tests in CI mode"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# If no specific tests are selected, run all by default
if [[ "$UNIT_TESTS" == false && "$INTEGRATION_TESTS" == false && "$E2E_TESTS" == false && "$LINT" == false && "$TYPE_CHECK" == false && "$FORMAT_CHECK" == false && "$ALL_TESTS" == false ]]; then
    ALL_TESTS=true
fi

# Set individual flags if --all is specified
if [[ "$ALL_TESTS" == true ]]; then
    UNIT_TESTS=true
    INTEGRATION_TESTS=true
    E2E_TESTS=true
    LINT=true
    TYPE_CHECK=true
    FORMAT_CHECK=true
    COVERAGE=true
fi

print_status "Starting ARIA Frontend Test Suite"
print_status "=================================="

# Check if we're in the correct directory
if [[ ! -f "package.json" ]]; then
    print_error "package.json not found. Please run this script from the frontend directory."
    exit 1
fi

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

# Initialize test results
FAILED_TESTS=()
PASSED_TESTS=()

# Run TypeScript type checking
if [[ "$TYPE_CHECK" == true ]]; then
    if run_test "TypeScript Type Check" "npm run type-check"; then
        PASSED_TESTS+=("TypeScript Type Check")
    else
        FAILED_TESTS+=("TypeScript Type Check")
    fi
fi

# Run linting
if [[ "$LINT" == true ]]; then
    if run_test "ESLint" "npm run lint"; then
        PASSED_TESTS+=("ESLint")
    else
        FAILED_TESTS+=("ESLint")
    fi
fi

# Run format checking
if [[ "$FORMAT_CHECK" == true ]]; then
    if run_test "Format Check" "npm run format:check"; then
        PASSED_TESTS+=("Format Check")
    else
        FAILED_TESTS+=("Format Check")
    fi
fi

# Run unit tests
if [[ "$UNIT_TESTS" == true ]]; then
    TEST_COMMAND="npm run test:unit"
    
    if [[ "$COVERAGE" == true ]]; then
        TEST_COMMAND="$TEST_COMMAND -- --coverage"
    fi
    
    if [[ "$WATCH" == true ]]; then
        TEST_COMMAND="$TEST_COMMAND -- --watch"
    fi
    
    if [[ "$CI_MODE" == true ]]; then
        TEST_COMMAND="npm run test:ci"
    fi
    
    if run_test "Unit Tests" "$TEST_COMMAND"; then
        PASSED_TESTS+=("Unit Tests")
    else
        FAILED_TESTS+=("Unit Tests")
    fi
fi

# Run integration tests
if [[ "$INTEGRATION_TESTS" == true ]]; then
    TEST_COMMAND="npm run test:integration"
    
    if [[ "$COVERAGE" == true ]]; then
        TEST_COMMAND="$TEST_COMMAND -- --coverage"
    fi
    
    if [[ "$CI_MODE" == true ]]; then
        TEST_COMMAND="$TEST_COMMAND -- --ci --watchAll=false"
    fi
    
    if run_test "Integration Tests" "$TEST_COMMAND"; then
        PASSED_TESTS+=("Integration Tests")
    else
        FAILED_TESTS+=("Integration Tests")
    fi
fi

# Run end-to-end tests
if [[ "$E2E_TESTS" == true ]]; then
    # Check if Playwright is installed
    if ! command_exists "npx playwright"; then
        print_warning "Playwright not found. Installing..."
        npx playwright install
    fi
    
    # Start the development server for E2E tests
    if [[ "$CI_MODE" == false ]]; then
        print_status "Starting development server for E2E tests..."
        npm run dev &
        DEV_SERVER_PID=$!
        
        # Wait for server to start
        sleep 10
        
        # Function to cleanup dev server
        cleanup_dev_server() {
            if [[ -n "$DEV_SERVER_PID" ]]; then
                print_status "Stopping development server..."
                kill $DEV_SERVER_PID 2>/dev/null || true
            fi
        }
        
        # Set trap to cleanup on exit
        trap cleanup_dev_server EXIT
    fi
    
    E2E_COMMAND="npm run test:e2e"
    
    if [[ "$CI_MODE" == true ]]; then
        E2E_COMMAND="$E2E_COMMAND -- --reporter=junit"
    fi
    
    if run_test "End-to-End Tests" "$E2E_COMMAND"; then
        PASSED_TESTS+=("End-to-End Tests")
    else
        FAILED_TESTS+=("End-to-End Tests")
    fi
fi

# Generate coverage report if requested
if [[ "$COVERAGE" == true && "$CI_MODE" == false ]]; then
    if [[ -d "coverage" ]]; then
        print_status "Coverage report generated at: $(pwd)/coverage/lcov-report/index.html"
    fi
fi

# Print test results summary
print_status ""
print_status "Test Results Summary"
print_status "==================="

if [[ ${#PASSED_TESTS[@]} -gt 0 ]]; then
    print_success "Passed Tests (${#PASSED_TESTS[@]}):"
    for test in "${PASSED_TESTS[@]}"; do
        echo -e "  ${GREEN}✓${NC} $test"
    done
fi

if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
    print_error "Failed Tests (${#FAILED_TESTS[@]}):"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "  ${RED}✗${NC} $test"
    done
fi

# Print overall result
TOTAL_TESTS=$((${#PASSED_TESTS[@]} + ${#FAILED_TESTS[@]}))
if [[ ${#FAILED_TESTS[@]} -eq 0 ]]; then
    print_success "All tests passed! ($TOTAL_TESTS/$TOTAL_TESTS)"
    exit 0
else
    print_error "Some tests failed! (${#PASSED_TESTS[@]}/$TOTAL_TESTS passed)"
    exit 1
fi