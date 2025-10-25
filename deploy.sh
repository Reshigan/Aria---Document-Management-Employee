#!/bin/bash

echo "🚀 Aria AI Platform - Automated Deployment"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${BLUE}✅ Docker and Docker Compose detected${NC}"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${BLUE}📝 Creating .env file...${NC}"
    cat > .env << ENVEOF
SECRET_KEY=$(openssl rand -hex 32)
DATABASE_URL=postgresql://aria:aria_password@postgres:5432/aria_db
REDIS_URL=redis://redis:6379
OPENAI_API_KEY=${OPENAI_API_KEY:-your-openai-key-here}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-your-anthropic-key-here}
ENVEOF
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${BLUE}ℹ️  Please edit .env and add your API keys${NC}"
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

echo ""
echo -e "${BLUE}🔨 Building Docker images...${NC}"
docker-compose build

echo ""
echo -e "${BLUE}🚀 Starting services...${NC}"
docker-compose up -d

echo ""
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Services are running!${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}🎉 Aria AI Platform is LIVE!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${BLUE}📍 Access Points:${NC}"
    echo ""
    echo "  Frontend:     http://localhost:12000"
    echo "  Backend API:  http://localhost:8000"
    echo "  API Docs:     http://localhost:8000/docs"
    echo "  Health Check: http://localhost:8000/health"
    echo ""
    echo -e "${BLUE}📊 Service Status:${NC}"
    docker-compose ps
    echo ""
    echo -e "${BLUE}📝 View Logs:${NC}"
    echo "  docker-compose logs -f"
    echo ""
    echo -e "${BLUE}🛑 Stop Services:${NC}"
    echo "  docker-compose down"
    echo ""
    echo -e "${GREEN}Ready to transform your business! 🚀${NC}"
else
    echo -e "${RED}❌ Some services failed to start${NC}"
    echo ""
    echo "View logs with: docker-compose logs"
    exit 1
fi
