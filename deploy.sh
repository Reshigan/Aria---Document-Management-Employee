#!/bin/bash
# ARIA Production Deployment Script

set -e  # Exit on error

echo "🚀 ARIA Deployment Script"
echo "========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create .env file with required configuration"
    exit 1
fi

# Load environment variables
source .env

echo -e "${GREEN}✓${NC} Environment variables loaded"

# Check required environment variables
required_vars=("SECRET_KEY" "POSTGRES_PASSWORD" "DATABASE_URL")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: $var is not set${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓${NC} Required environment variables present"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo ""
echo "Checking dependencies..."

if ! command_exists docker; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker installed"

if ! command_exists docker-compose; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} docker-compose installed"

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker daemon is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker daemon running"

# Deployment type
echo ""
echo "Select deployment type:"
echo "1) Development"
echo "2) Production"
read -p "Enter choice [1-2]: " deploy_choice

case $deploy_choice in
    1)
        COMPOSE_FILE="docker-compose.yml"
        echo "Deploying in DEVELOPMENT mode"
        ;;
    2)
        COMPOSE_FILE="docker-compose.yml"
        echo "Deploying in PRODUCTION mode"
        export ENVIRONMENT=production
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Backup database if production
if [ "$deploy_choice" = "2" ] && [ -d "backup" ]; then
    echo ""
    echo "Creating database backup..."
    timestamp=$(date +%Y%m%d_%H%M%S)
    mkdir -p backups
    docker-compose exec -T postgres pg_dump -U ${POSTGRES_USER:-aria_user} ${POSTGRES_DB:-aria} > "backups/backup_${timestamp}.sql" 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Backup created (if database exists)"
fi

# Pull latest images
echo ""
echo "Pulling Docker images..."
docker-compose -f $COMPOSE_FILE pull

# Build services
echo ""
echo "Building services..."
docker-compose -f $COMPOSE_FILE build

# Stop existing containers
echo ""
echo "Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down

# Start services
echo ""
echo "Starting services..."
docker-compose -f $COMPOSE_FILE up -d

# Wait for services to be healthy
echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check service health
services=("postgres" "redis" "backend")
all_healthy=true

for service in "${services[@]}"; do
    if docker-compose -f $COMPOSE_FILE ps $service | grep -q "Up"; then
        echo -e "${GREEN}✓${NC} $service is running"
    else
        echo -e "${RED}✗${NC} $service is not running"
        all_healthy=false
    fi
done

if [ "$all_healthy" = false ]; then
    echo -e "${RED}Some services failed to start${NC}"
    echo "Check logs with: docker-compose logs"
    exit 1
fi

# Run database migrations
echo ""
echo "Running database migrations..."
docker-compose -f $COMPOSE_FILE exec -T backend alembic upgrade head || {
    echo -e "${YELLOW}Warning: Migration failed or already up to date${NC}"
}

# Create storage directories
echo ""
echo "Creating storage directories..."
docker-compose -f $COMPOSE_FILE exec -T backend mkdir -p /app/storage/uploads /app/storage/processed /app/storage/temp || true

# Test backend API
echo ""
echo "Testing backend API..."
sleep 5
if curl -f http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend API is responding"
else
    echo -e "${YELLOW}Warning: Backend API is not responding yet${NC}"
    echo "This may be normal if the service is still starting up"
fi

# Show service URLs
echo ""
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "Service URLs:"
echo "=============="
echo "• Backend API:     http://localhost:8000"
echo "• API Docs:        http://localhost:8000/docs"
echo "• Frontend:        http://localhost:3000"
echo "• Flower (Celery): http://localhost:5555"
echo "• MinIO Console:   http://localhost:9001"
echo ""

# Show useful commands
echo "Useful commands:"
echo "==============="
echo "• View logs:       docker-compose logs -f [service]"
echo "• Stop services:   docker-compose down"
echo "• Restart service: docker-compose restart [service]"
echo "• Shell access:    docker-compose exec [service] /bin/bash"
echo ""

# Ask if user wants to create superuser
read -p "Do you want to create a superuser? (y/n): " create_superuser

if [ "$create_superuser" = "y" ] || [ "$create_superuser" = "Y" ]; then
    echo ""
    read -p "Enter username: " username
    read -p "Enter email: " email
    read -sp "Enter password: " password
    echo ""
    
    docker-compose -f $COMPOSE_FILE exec -T backend python -c "
from backend.core.database import SessionLocal
from backend.models.user import User
from backend.core.security import get_password_hash

db = SessionLocal()
user = User(
    username='$username',
    email='$email',
    hashed_password=get_password_hash('$password'),
    is_active=True,
    is_superuser=True
)
db.add(user)
db.commit()
print('Superuser created successfully!')
" || echo -e "${YELLOW}Note: User creation failed (may already exist)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 All done! Your ARIA application is running.${NC}"
