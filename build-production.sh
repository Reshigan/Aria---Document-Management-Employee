#!/bin/bash
# ARIA ERP - Production Build Script

echo "🏗️  ARIA ERP - Production Build"
echo "================================"

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}📦 Building Frontend...${NC}"
cd frontend
npm run build
echo -e "${GREEN}✅ Frontend build complete${NC}"

echo ""
echo -e "${YELLOW}📦 Building Backend...${NC}"
cd ../backend
# Create requirements if not exists
if [ ! -f "requirements.txt" ]; then
    echo "Creating requirements.txt..."
    pip freeze > requirements.txt
fi
echo -e "${GREEN}✅ Backend dependencies ready${NC}"

echo ""
echo -e "${YELLOW}🐳 Building Docker Images...${NC}"
cd ..
docker-compose build --no-cache
echo -e "${GREEN}✅ Docker images built${NC}"

echo ""
echo -e "${GREEN}🎉 Production build complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo "  1. docker-compose up -d          # Start services"
echo "  2. docker-compose logs -f        # View logs"
echo "  3. http://localhost:5173         # Access application"
echo ""
echo "🚀 Deploy to production:"
echo "  sudo bash deploy/deploy.sh"
echo ""
