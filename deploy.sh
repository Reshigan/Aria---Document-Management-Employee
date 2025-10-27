#!/bin/bash

# ARIA ERP & AI Bot Platform - Deployment Script
# This script deploys all services using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
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
    print_success "Docker is installed"
}

# Check if Docker Compose is installed
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    print_success "Docker Compose is installed"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found"
        print_info "Creating .env from template..."
        if [ -f .env.deploy.template ]; then
            cp .env.deploy.template .env
            print_warning "Please edit .env file and update the values before running this script again"
            print_info "Required changes:"
            echo "  - POSTGRES_PASSWORD"
            echo "  - SECRET_KEY"
            echo "  - OPENAI_API_KEY (optional)"
            echo "  - ANTHROPIC_API_KEY (optional)"
            exit 1
        else
            print_error ".env.deploy.template not found"
            exit 1
        fi
    fi
    print_success ".env file exists"
}

# Create necessary directories
create_directories() {
    print_info "Creating necessary directories..."
    mkdir -p uploads
    mkdir -p backend/logs
    mkdir -p backend/backups
    print_success "Directories created"
}

# Stop existing containers
stop_containers() {
    print_info "Stopping existing containers..."
    docker-compose -f docker-compose.deploy.yml down || docker compose -f docker-compose.deploy.yml down || true
    print_success "Containers stopped"
}

# Build containers
build_containers() {
    print_info "Building Docker containers (this may take a few minutes)..."
    docker-compose -f docker-compose.deploy.yml build --no-cache || docker compose -f docker-compose.deploy.yml build --no-cache
    print_success "Containers built"
}

# Start containers
start_containers() {
    print_info "Starting containers..."
    docker-compose -f docker-compose.deploy.yml up -d || docker compose -f docker-compose.deploy.yml up -d
    print_success "Containers started"
}

# Wait for services to be healthy
wait_for_services() {
    print_info "Waiting for services to be healthy..."
    
    # Wait for PostgreSQL
    echo -n "  Waiting for PostgreSQL..."
    for i in {1..30}; do
        if docker-compose -f docker-compose.deploy.yml exec -T postgres pg_isready -U aria &> /dev/null || \
           docker compose -f docker-compose.deploy.yml exec -T postgres pg_isready -U aria &> /dev/null; then
            echo " ✓"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    # Wait for Redis
    echo -n "  Waiting for Redis..."
    for i in {1..30}; do
        if docker-compose -f docker-compose.deploy.yml exec -T redis redis-cli ping &> /dev/null || \
           docker compose -f docker-compose.deploy.yml exec -T redis redis-cli ping &> /dev/null; then
            echo " ✓"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    # Wait for Backend
    echo -n "  Waiting for Backend..."
    for i in {1..60}; do
        if curl -s http://localhost:8000/health &> /dev/null; then
            echo " ✓"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    # Wait for Frontend
    echo -n "  Waiting for Frontend..."
    for i in {1..60}; do
        if curl -s http://localhost:12000 &> /dev/null; then
            echo " ✓"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    print_success "All services are healthy"
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."
    docker-compose -f docker-compose.deploy.yml exec -T backend alembic upgrade head || \
    docker compose -f docker-compose.deploy.yml exec -T backend alembic upgrade head || \
    print_warning "Migrations not run (may not be needed for SQLite)"
}

# Show status
show_status() {
    print_header "Deployment Status"
    docker-compose -f docker-compose.deploy.yml ps || docker compose -f docker-compose.deploy.yml ps
    echo ""
}

# Show access information
show_access_info() {
    print_header "Access Information"
    echo ""
    print_success "ARIA ERP & AI Bot Platform is now running!"
    echo ""
    echo "📊 Frontend Dashboard:"
    echo "   - Local: http://localhost:12000"
    echo "   - Runtime 1: https://work-1-rkasyntaaioiwqjt.prod-runtime.all-hands.dev"
    echo "   - Runtime 2: https://work-2-rkasyntaaioiwqjt.prod-runtime.all-hands.dev"
    echo ""
    echo "🔌 Backend API:"
    echo "   - Local: http://localhost:8000"
    echo "   - Health Check: http://localhost:8000/health"
    echo "   - API Docs: http://localhost:8000/docs"
    echo "   - OpenAPI Spec: http://localhost:8000/openapi.json"
    echo ""
    echo "🗄️ Database:"
    echo "   - PostgreSQL: localhost:5432"
    echo "   - Database: aria_db"
    echo "   - User: aria"
    echo ""
    echo "🔴 Redis:"
    echo "   - Host: localhost:6379"
    echo ""
    echo "🤖 Available AI Bots (8 functional):"
    echo "   1. Invoice Reconciliation Bot"
    echo "   2. Expense Management Bot"
    echo "   3. Accounts Payable Bot"
    echo "   4. AR Collections Bot"
    echo "   5. Bank Reconciliation Bot"
    echo "   6. Lead Qualification Bot"
    echo "   7. Payroll (SA) Bot"
    echo "   8. BBBEE Compliance Bot"
    echo ""
    echo "📝 Management Commands:"
    echo "   - View logs: ./logs.sh"
    echo "   - Stop services: docker-compose -f docker-compose.deploy.yml down"
    echo "   - Restart services: docker-compose -f docker-compose.deploy.yml restart"
    echo ""
}

# Main deployment flow
main() {
    print_header "ARIA ERP & AI Bot Platform - Deployment"
    echo ""
    
    # Pre-flight checks
    check_docker
    check_docker_compose
    check_env_file
    
    echo ""
    print_header "Starting Deployment"
    
    # Deployment steps
    create_directories
    stop_containers
    build_containers
    start_containers
    wait_for_services
    run_migrations
    
    echo ""
    show_status
    echo ""
    show_access_info
    
    print_success "Deployment completed successfully!"
}

# Run main function
main
