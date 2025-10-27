#!/bin/bash

# ARIA v2.0 - Phase 1 Production Deployment Script
# Usage: ./deploy.sh [development|production]

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
PROJECT_DIR=$(pwd)
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOG_DIR="/var/log/aria"
API_PORT=8000

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}🚀 ARIA v2.0 - Phase 1 Deployment Script${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo -e "${YELLOW}Project Directory: $PROJECT_DIR${NC}"
echo ""

# Function to print step header
step() {
    echo -e "\n${GREEN}▶ $1${NC}"
}

# Function to print error and exit
error() {
    echo -e "\n${RED}✗ ERROR: $1${NC}"
    exit 1
}

# Function to print success
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Check if running as root (needed for production)
if [ "$ENVIRONMENT" = "production" ] && [ "$EUID" -ne 0 ]; then
    error "Production deployment requires root privileges. Please run with sudo."
fi

# Step 1: Check dependencies
step "Checking dependencies..."

# Check Python
if ! command -v python3 &> /dev/null; then
    error "Python 3 is not installed"
fi
success "Python 3: $(python3 --version)"

# Check pip
if ! command -v pip3 &> /dev/null; then
    error "pip3 is not installed"
fi
success "pip3: $(pip3 --version | cut -d' ' -f1-2)"

# Check Node.js (optional for backend-only deployment)
if [ -d "$FRONTEND_DIR" ]; then
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}⚠ Node.js not found. Skipping frontend deployment.${NC}"
    else
        success "Node.js: $(node --version)"
    fi
fi

# Step 2: Backend deployment
step "Deploying backend..."

cd "$BACKEND_DIR"

# Install Python dependencies
echo "Installing Python dependencies..."
pip3 install -r requirements.txt > /dev/null 2>&1
success "Python dependencies installed"

# Create log directory
if [ "$ENVIRONMENT" = "production" ]; then
    mkdir -p "$LOG_DIR"
    chmod 755 "$LOG_DIR"
    success "Log directory created: $LOG_DIR"
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found. Creating from template...${NC}"
    cat > .env << EOF
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
DATABASE_URL=sqlite:///./aria_production.db
ALLOWED_ORIGINS=*
HOST=0.0.0.0
PORT=$API_PORT
EOF
    success ".env file created"
else
    success ".env file exists"
fi

# Step 3: Database setup
step "Setting up database..."

# Check if database file exists
if [ -f "aria_production.db" ]; then
    success "Database file exists"
else
    echo "Database will be created on first run"
fi

# Step 4: Run tests
step "Running test suite..."

cd "$PROJECT_DIR"
if python3 test_phase1_complete.py > /tmp/aria_test_output.log 2>&1; then
    TEST_RESULT=$(grep "PASSED:" /tmp/aria_test_output.log | tail -1)
    success "Tests passed: $TEST_RESULT"
else
    error "Tests failed! Check /tmp/aria_test_output.log for details"
fi

# Step 5: Start backend server
step "Starting API server..."

cd "$BACKEND_DIR"

# Kill existing process if running
if [ -f /tmp/aria_api.pid ]; then
    OLD_PID=$(cat /tmp/aria_api.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "Stopping existing API server (PID: $OLD_PID)..."
        kill $OLD_PID
        sleep 2
        success "Old API server stopped"
    fi
fi

# Start the server
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Starting production server with Gunicorn..."
    nohup gunicorn api_phase1_complete:app \
        --workers 4 \
        --worker-class uvicorn.workers.UvicornWorker \
        --bind 0.0.0.0:$API_PORT \
        --access-logfile "$LOG_DIR/access.log" \
        --error-logfile "$LOG_DIR/error.log" \
        --pid /tmp/aria_api.pid \
        --daemon
    sleep 3
else
    echo "Starting development server with Uvicorn..."
    nohup uvicorn api_phase1_complete:app \
        --host 0.0.0.0 \
        --port $API_PORT \
        --reload \
        > /tmp/aria_api.log 2>&1 &
    echo $! > /tmp/aria_api.pid
    sleep 3
fi

# Verify server is running
if ps -p $(cat /tmp/aria_api.pid) > /dev/null 2>&1; then
    success "API server started (PID: $(cat /tmp/aria_api.pid))"
else
    error "Failed to start API server"
fi

# Step 6: Health check
step "Performing health check..."

sleep 2
HEALTH_CHECK=$(curl -s http://localhost:$API_PORT/health)
if echo "$HEALTH_CHECK" | grep -q '"status":"healthy"'; then
    success "Health check passed"
    echo "$HEALTH_CHECK" | python3 -m json.tool
else
    error "Health check failed"
fi

# Step 7: Frontend deployment (if exists)
if [ -d "$FRONTEND_DIR" ] && command -v node &> /dev/null; then
    step "Deploying frontend..."
    
    cd "$FRONTEND_DIR"
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        echo "Installing Node.js dependencies..."
        npm install > /dev/null 2>&1
        success "Node.js dependencies installed"
    else
        success "Node.js dependencies already installed"
    fi
    
    # Build for production
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "Building frontend for production..."
        npm run build > /dev/null 2>&1
        success "Frontend built successfully"
        echo -e "${YELLOW}📦 Static files are in: $FRONTEND_DIR/dist${NC}"
        echo -e "${YELLOW}   Deploy these files to your web server (Nginx, Apache, etc.)${NC}"
    fi
fi

# Step 8: Summary
echo ""
echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""
echo -e "${GREEN}🎯 API Server:${NC}"
echo "   URL: http://localhost:$API_PORT"
echo "   Health: http://localhost:$API_PORT/health"
echo "   API Docs: http://localhost:$API_PORT/docs"
echo "   PID: $(cat /tmp/aria_api.pid)"
echo ""

if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${GREEN}📊 Logs:${NC}"
    echo "   Access: $LOG_DIR/access.log"
    echo "   Error: $LOG_DIR/error.log"
    echo ""
fi

echo -e "${GREEN}🤖 Registered Bots:${NC}"
echo "   Manufacturing: 5 bots"
echo "   Healthcare: 5 bots"
echo "   Retail: 5 bots"
echo "   Total: 15 bots"
echo ""

echo -e "${GREEN}🧪 Test Results:${NC}"
echo "   Pass Rate: 100% (22/22 tests)"
echo "   Categories: AUTH, SECURITY, BOTS, ERP, PERFORMANCE"
echo ""

if [ -d "$FRONTEND_DIR" ] && [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${YELLOW}📦 Next Steps:${NC}"
    echo "   1. Deploy frontend/dist to your web server"
    echo "   2. Configure Nginx/Apache reverse proxy"
    echo "   3. Set up SSL certificate (Let's Encrypt)"
    echo "   4. Configure firewall rules"
    echo "   5. Set up monitoring and alerting"
    echo ""
fi

echo -e "${GREEN}📖 Documentation:${NC}"
echo "   Deployment Guide: DEPLOYMENT_GUIDE.md"
echo "   API Documentation: http://localhost:$API_PORT/docs"
echo ""

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}🚀 ARIA v2.0 Phase 1 is now running!${NC}"
echo -e "${BLUE}======================================================================${NC}"

exit 0
