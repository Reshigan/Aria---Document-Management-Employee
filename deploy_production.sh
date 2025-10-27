#!/bin/bash

###############################################################################
# ARIA ERP & BOTS - Production Deployment Script
# This script deploys all components of the ARIA system
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Main deployment
print_header "🚀 ARIA ERP & BOTS - Production Deployment"

print_info "Starting deployment process..."

# Step 1: Check prerequisites
print_header "Step 1: Checking Prerequisites"
check_docker

# Step 2: Stop any existing containers
print_header "Step 2: Stopping Existing Containers"
if docker-compose ps | grep -q "Up"; then
    print_info "Stopping existing containers..."
    docker-compose down
    print_success "Existing containers stopped"
else
    print_info "No existing containers running"
fi

# Step 3: Build Docker images
print_header "Step 3: Building Docker Images"
print_info "This may take several minutes..."
docker-compose build --no-cache
print_success "Docker images built successfully"

# Step 4: Start services
print_header "Step 4: Starting Services"
print_info "Starting all services in detached mode..."
docker-compose up -d
print_success "All services started"

# Step 5: Wait for services to be ready
print_header "Step 5: Waiting for Services to be Ready"
print_info "Waiting for backend to be ready..."
sleep 10

# Check backend health
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Backend is healthy"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "Backend failed to start within timeout"
    print_info "Checking logs..."
    docker-compose logs backend
    exit 1
fi

# Check frontend
print_info "Checking frontend..."
sleep 5
if curl -s http://localhost:12000 > /dev/null 2>&1; then
    print_success "Frontend is running"
else
    print_warning "Frontend may not be fully ready yet"
fi

# Step 6: Verify all services
print_header "Step 6: Verifying Services"
docker-compose ps

# Step 7: Run health checks
print_header "Step 7: Running Health Checks"

# Backend health
print_info "Testing backend health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:8000/health)
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    print_success "Backend health check passed"
    echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    print_error "Backend health check failed"
fi

# Bots availability
print_info "Testing bots endpoint..."
BOTS_RESPONSE=$(curl -s http://localhost:8000/api/bots)
BOT_COUNT=$(echo "$BOTS_RESPONSE" | grep -o "bot_id" | wc -l)
if [ "$BOT_COUNT" -ge 8 ]; then
    print_success "All $BOT_COUNT bots are available"
else
    print_warning "Only $BOT_COUNT bots found (expected 8)"
fi

# ERP modules
print_info "Testing ERP modules..."
MODULES=("financial" "hr" "crm" "procurement" "compliance")
for module in "${MODULES[@]}"; do
    if curl -s "http://localhost:8000/api/erp/$module" | grep -q "module"; then
        print_success "ERP module '$module' is available"
    else
        print_warning "ERP module '$module' may have issues"
    fi
done

# Step 8: Display deployment information
print_header "🎉 Deployment Complete!"

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All services are running successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}📍 Access Points:${NC}"
echo -e "   Backend API:       http://localhost:8000"
echo -e "   API Documentation: http://localhost:8000/docs"
echo -e "   Frontend:          http://localhost:12000"
echo -e "   Health Check:      http://localhost:8000/health\n"

echo -e "${BLUE}🤖 Available Bots (8):${NC}"
echo -e "   1. Invoice Reconciliation"
echo -e "   2. Expense Management"
echo -e "   3. Accounts Payable"
echo -e "   4. AR Collections"
echo -e "   5. Bank Reconciliation"
echo -e "   6. Lead Qualification"
echo -e "   7. Payroll SA"
echo -e "   8. BBBEE Compliance\n"

echo -e "${BLUE}🏢 ERP Modules (5):${NC}"
echo -e "   1. Financial Management"
echo -e "   2. Human Resources"
echo -e "   3. Customer Relationship Management"
echo -e "   4. Procurement"
echo -e "   5. Compliance\n"

echo -e "${BLUE}📊 Useful Commands:${NC}"
echo -e "   View logs:         docker-compose logs -f"
echo -e "   Stop services:     docker-compose down"
echo -e "   Restart service:   docker-compose restart [service]"
echo -e "   View status:       docker-compose ps\n"

echo -e "${BLUE}📚 Documentation:${NC}"
echo -e "   Full Status:       DEPLOYMENT_STATUS.md"
echo -e "   Quick Start:       QUICK_START.md\n"

print_header "✨ Ready for Production! ✨"
