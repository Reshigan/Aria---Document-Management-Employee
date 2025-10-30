#!/bin/bash
# ARIA ERP - System Status Check

echo "🔍 ARIA ERP - System Status Check"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_service() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Checking $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" $url 2>/dev/null)
    
    if [ "$response" == "$expected" ] || [ "$response" == "200" ]; then
        echo -e "${GREEN}✅ OK (HTTP $response)${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED (HTTP $response)${NC}"
        return 1
    fi
}

# Backend Checks
echo "📡 Backend Services:"
check_service "API Root" "http://localhost:12000/" "200"
check_service "Health Check" "http://localhost:12000/health" "200"
check_service "API Docs" "http://localhost:12000/docs" "200"

echo ""
echo "🤖 AI Bots:"
bot_count=$(curl -s http://localhost:12000/api/v1/bots/ 2>/dev/null | grep -o '"id"' | wc -l || echo "0")
if [ "$bot_count" -gt "0" ]; then
    echo -e "${GREEN}✅ $bot_count bots discovered${NC}"
else
    echo -e "${YELLOW}⚠️  Bots require authentication${NC}"
fi

echo ""
echo "🎨 Frontend Services:"
check_service "Frontend" "http://localhost:12001/" "200"

echo ""
echo "📊 Database:"
if [ -f "backend/aria_erp.db" ]; then
    db_size=$(du -h backend/aria_erp.db | cut -f1)
    echo -e "${GREEN}✅ SQLite database exists ($db_size)${NC}"
else
    echo -e "${YELLOW}⚠️  Database not initialized${NC}"
fi

echo ""
echo "🐳 Docker Status:"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker installed${NC}"
    if docker ps &> /dev/null; then
        running=$(docker ps --format '{{.Names}}' | wc -l)
        echo -e "${GREEN}✅ Docker running ($running containers)${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker not running${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Docker not installed${NC}"
fi

echo ""
echo "📦 Node.js & NPM:"
if command -v node &> /dev/null; then
    node_version=$(node --version)
    echo -e "${GREEN}✅ Node.js $node_version${NC}"
else
    echo -e "${RED}❌ Node.js not installed${NC}"
fi

if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    echo -e "${GREEN}✅ NPM v$npm_version${NC}"
else
    echo -e "${RED}❌ NPM not installed${NC}"
fi

echo ""
echo "🐍 Python:"
if command -v python &> /dev/null || command -v python3 &> /dev/null; then
    python_version=$(python --version 2>&1 || python3 --version 2>&1)
    echo -e "${GREEN}✅ $python_version${NC}"
else
    echo -e "${RED}❌ Python not installed${NC}"
fi

echo ""
echo "💾 Disk Space:"
df -h . | tail -1 | awk '{print "Available: " $4 " / Used: " $5}'

echo ""
echo "🧠 Memory:"
free -h | grep Mem | awk '{print "Available: " $7 " / Total: " $2}'

echo ""
echo "=================================="
echo "System check complete!"
echo ""

# Summary
backend_ok=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:12000/ 2>/dev/null)
frontend_ok=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:12001/ 2>/dev/null)

if [ "$backend_ok" == "200" ] && [ "$frontend_ok" == "200" ]; then
    echo -e "${GREEN}🎉 All systems operational!${NC}"
    echo ""
    echo "🌐 Access your application:"
    echo "   Frontend: http://localhost:12001"
    echo "   Backend API: http://localhost:12000"
    echo "   API Docs: http://localhost:12000/docs"
else
    echo -e "${YELLOW}⚠️  Some services are not running${NC}"
    echo ""
    echo "To start services:"
    echo "   Backend: cd backend && uvicorn app.main:app --reload --port 12000"
    echo "   Frontend: cd frontend && npm run dev"
fi
