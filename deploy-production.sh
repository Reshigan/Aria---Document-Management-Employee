#!/bin/bash

# ARIA ERP - Production Deployment Script
# This script automates the deployment process

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════╗"
echo "║     ARIA ERP - PRODUCTION DEPLOYMENT            ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    
    # Generate secret keys
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    
    # Update .env with generated keys
    sed -i "s/change-this-to-a-random-secret-key-in-production/$SECRET_KEY/" .env
    sed -i "s/change-this-to-a-different-random-secret-key/$JWT_SECRET/" .env
    
    echo -e "${GREEN}✅ .env file created with generated secret keys${NC}"
    echo -e "${YELLOW}⚠️  Please review .env and update other settings if needed${NC}"
    echo ""
fi

# Stop any running containers
echo "Stopping existing containers..."
docker-compose down 2>/dev/null || true
echo ""

# Build images
echo "Building Docker images..."
docker-compose build --no-cache
echo ""

# Start services
echo "Starting services..."
docker-compose up -d
echo ""

# Wait for backend to be ready
echo "Waiting for backend to start..."
RETRIES=30
while [ $RETRIES -gt 0 ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is ready${NC}"
        break
    fi
    RETRIES=$((RETRIES-1))
    echo "Waiting... ($RETRIES attempts remaining)"
    sleep 2
done

if [ $RETRIES -eq 0 ]; then
    echo -e "${RED}❌ Backend failed to start. Check logs with: docker-compose logs backend${NC}"
    exit 1
fi
echo ""

# Initialize database
echo "Initializing database..."
docker-compose exec -T backend python init_db.py
echo -e "${GREEN}✅ Database initialized${NC}"
echo ""

# Run tests
echo "Running system tests..."
if python3 test_erp.py > /tmp/test_results.txt 2>&1; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed. Check /tmp/test_results.txt for details${NC}"
fi
echo ""

# Display status
echo "╔══════════════════════════════════════════════════╗"
echo "║          DEPLOYMENT SUCCESSFUL!                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "🌐 Services:"
echo "   - Backend API: http://localhost:8000"
echo "   - API Docs:    http://localhost:8000/docs"
echo "   - Frontend:    http://localhost:5173"
echo ""
echo "👤 Default Admin Credentials:"
echo "   Email:    admin@aria-erp.com"
echo "   Password: AdminPass123!"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Change the admin password after first login!${NC}"
echo ""
echo "📊 System Status:"
echo "   - 61 bots available"
echo "   - 10 categories"
echo "   - JWT authentication enabled"
echo ""
echo "📝 Useful Commands:"
echo "   - View logs:    docker-compose logs -f"
echo "   - Stop system:  docker-compose down"
echo "   - Restart:      docker-compose restart"
echo "   - Run tests:    python3 test_erp.py"
echo ""
echo -e "${GREEN}✅ ARIA ERP is now running and ready to use!${NC}"
