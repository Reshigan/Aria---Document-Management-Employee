#!/bin/bash

# ARIA ERP & AI Bot Platform - Log Viewer
# View logs from all services

# Colors
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}ARIA - Service Logs${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Options:"
echo "  1. All services"
echo "  2. Backend only"
echo "  3. Frontend only"
echo "  4. PostgreSQL only"
echo "  5. Redis only"
echo ""
echo -n "Select option (1-5) or press Enter for all: "
read option

case $option in
    2)
        echo "Showing backend logs (Ctrl+C to exit)..."
        docker-compose -f docker-compose.deploy.yml logs -f backend || docker compose -f docker-compose.deploy.yml logs -f backend
        ;;
    3)
        echo "Showing frontend logs (Ctrl+C to exit)..."
        docker-compose -f docker-compose.deploy.yml logs -f frontend || docker compose -f docker-compose.deploy.yml logs -f frontend
        ;;
    4)
        echo "Showing PostgreSQL logs (Ctrl+C to exit)..."
        docker-compose -f docker-compose.deploy.yml logs -f postgres || docker compose -f docker-compose.deploy.yml logs -f postgres
        ;;
    5)
        echo "Showing Redis logs (Ctrl+C to exit)..."
        docker-compose -f docker-compose.deploy.yml logs -f redis || docker compose -f docker-compose.deploy.yml logs -f redis
        ;;
    *)
        echo "Showing all logs (Ctrl+C to exit)..."
        docker-compose -f docker-compose.deploy.yml logs -f || docker compose -f docker-compose.deploy.yml logs -f
        ;;
esac
