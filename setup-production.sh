#!/bin/bash
# ========================================
# ARIA Production Setup Script
# ========================================
# This script sets up all production services

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
    ___    ____  ______ 
   /   |  / __ \/  _/ / 
  / /| | / /_/ // // /  
 / ___ |/ _, _// // /   
/_/  |_/_/ |_/___/_/    

Production Setup Script
EOF
echo -e "${NC}"

# Function to print section header
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ========================================
# STEP 1: Check Prerequisites
# ========================================
print_header "STEP 1: Checking Prerequisites"

echo "Checking required tools..."

if ! command_exists docker; then
    echo -e "${RED}✗ Docker not found${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed${NC}"

if ! command_exists docker-compose; then
    echo -e "${RED}✗ docker-compose not found${NC}"
    echo "Please install docker-compose: https://docs.docker.com/compose/install/"
    exit 1
fi
echo -e "${GREEN}✓ docker-compose installed${NC}"

if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker daemon not running${NC}"
    echo "Please start Docker service"
    exit 1
fi
echo -e "${GREEN}✓ Docker daemon running${NC}"

# ========================================
# STEP 2: Environment Configuration
# ========================================
print_header "STEP 2: Environment Configuration"

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "Creating .env from template..."
    cp .env.production .env
    
    # Generate secret key
    SECRET_KEY=$(openssl rand -hex 32)
    sed -i "s/your-super-secret-key-change-this-in-production-minimum-64-characters/$SECRET_KEY/" .env
    
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}⚠ Please edit .env file and configure your settings${NC}"
    
    read -p "Do you want to edit .env now? (y/n): " edit_env
    if [ "$edit_env" = "y" ]; then
        ${EDITOR:-nano} .env
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Load environment
source .env

# ========================================
# STEP 3: Configure Core Services
# ========================================
print_header "STEP 3: Configuring Core Services"

echo "1. PostgreSQL Configuration"
echo "   - Host: ${POSTGRES_SERVER:-localhost}"
echo "   - Port: ${POSTGRES_PORT:-5432}"
echo "   - Database: ${POSTGRES_DB:-aria}"
echo "   - User: ${POSTGRES_USER:-aria_user}"
echo -e "${GREEN}✓ PostgreSQL configured${NC}"

echo ""
echo "2. Redis Configuration"
echo "   - Host: ${REDIS_HOST:-localhost}"
echo "   - Port: ${REDIS_PORT:-6379}"
echo -e "${GREEN}✓ Redis configured${NC}"

echo ""
echo "3. Storage Configuration"
echo "   - Type: ${STORAGE_TYPE:-local}"
if [ "$STORAGE_TYPE" = "minio" ] || [ "$STORAGE_TYPE" = "s3" ]; then
    echo "   - Endpoint: ${S3_ENDPOINT_URL:-http://localhost:9000}"
    echo "   - Bucket: ${S3_BUCKET_NAME:-aria-documents}"
fi
echo -e "${GREEN}✓ Storage configured${NC}"

# ========================================
# STEP 4: Optional Services Setup
# ========================================
print_header "STEP 4: Optional Services Setup"

echo "Would you like to set up optional services?"
echo ""

# LLM Setup
echo "1. LLM Service (AI Chat)"
read -p "   Setup LLM service? (y/n): " setup_llm

if [ "$setup_llm" = "y" ]; then
    echo "   Choose LLM provider:"
    echo "   a) Ollama (recommended for local deployment)"
    echo "   b) OpenAI (requires API key)"
    echo "   c) vLLM (self-hosted)"
    read -p "   Choice (a/b/c): " llm_choice
    
    case $llm_choice in
        a)
            echo "   Setting up Ollama..."
            if ! command_exists ollama; then
                echo "   Installing Ollama..."
                curl https://ollama.ai/install.sh | sh
            fi
            echo "   Starting Ollama service..."
            ollama serve > /dev/null 2>&1 &
            sleep 5
            echo "   Pulling llama3 model..."
            ollama pull llama3
            sed -i 's/LLM_PROVIDER=.*/LLM_PROVIDER=ollama/' .env
            sed -i 's|LLM_API_URL=.*|LLM_API_URL=http://localhost:11434|' .env
            sed -i 's/LLM_MODEL=.*/LLM_MODEL=llama3/' .env
            echo -e "${GREEN}✓ Ollama configured${NC}"
            ;;
        b)
            read -p "   Enter OpenAI API key: " openai_key
            sed -i 's/LLM_PROVIDER=.*/LLM_PROVIDER=openai/' .env
            sed -i 's|LLM_API_URL=.*|LLM_API_URL=https://api.openai.com/v1|' .env
            sed -i "s/LLM_API_KEY=.*/LLM_API_KEY=$openai_key/" .env
            sed -i 's/LLM_MODEL=.*/LLM_MODEL=gpt-4/' .env
            echo -e "${GREEN}✓ OpenAI configured${NC}"
            ;;
        c)
            read -p "   Enter vLLM server URL: " vllm_url
            read -p "   Enter model name: " vllm_model
            sed -i 's/LLM_PROVIDER=.*/LLM_PROVIDER=vllm/' .env
            sed -i "s|LLM_API_URL=.*|LLM_API_URL=$vllm_url|" .env
            sed -i "s/LLM_MODEL=.*/LLM_MODEL=$vllm_model/" .env
            echo -e "${GREEN}✓ vLLM configured${NC}"
            ;;
    esac
fi

echo ""

# Email Setup
echo "2. Email Notifications"
read -p "   Setup email notifications? (y/n): " setup_email

if [ "$setup_email" = "y" ]; then
    read -p "   SMTP Host: " smtp_host
    read -p "   SMTP Port: " smtp_port
    read -p "   SMTP User: " smtp_user
    read -sp "   SMTP Password: " smtp_pass
    echo ""
    read -p "   From Email: " smtp_from
    
    sed -i 's/SMTP_ENABLED=.*/SMTP_ENABLED=true/' .env
    sed -i "s/SMTP_HOST=.*/SMTP_HOST=$smtp_host/" .env
    sed -i "s/SMTP_PORT=.*/SMTP_PORT=$smtp_port/" .env
    sed -i "s/SMTP_USER=.*/SMTP_USER=$smtp_user/" .env
    sed -i "s/SMTP_PASSWORD=.*/SMTP_PASSWORD=$smtp_pass/" .env
    sed -i "s/SMTP_FROM_EMAIL=.*/SMTP_FROM_EMAIL=$smtp_from/" .env
    echo -e "${GREEN}✓ Email configured${NC}"
fi

echo ""

# Slack Setup
echo "3. Slack Integration"
read -p "   Setup Slack integration? (y/n): " setup_slack

if [ "$setup_slack" = "y" ]; then
    read -p "   Slack Bot Token: " slack_token
    read -p "   Default Channel: " slack_channel
    
    sed -i 's/SLACK_ENABLED=.*/SLACK_ENABLED=true/' .env
    sed -i "s/SLACK_BOT_TOKEN=.*/SLACK_BOT_TOKEN=$slack_token/" .env
    sed -i "s/SLACK_DEFAULT_CHANNEL=.*/SLACK_DEFAULT_CHANNEL=$slack_channel/" .env
    echo -e "${GREEN}✓ Slack configured${NC}"
fi

echo ""

# Teams Setup
echo "4. Microsoft Teams Integration"
read -p "   Setup Teams integration? (y/n): " setup_teams

if [ "$setup_teams" = "y" ]; then
    read -p "   Teams Webhook URL: " teams_webhook
    
    sed -i 's/TEAMS_ENABLED=.*/TEAMS_ENABLED=true/' .env
    sed -i "s|TEAMS_WEBHOOK_URL=.*|TEAMS_WEBHOOK_URL=$teams_webhook|" .env
    echo -e "${GREEN}✓ Teams configured${NC}"
fi

echo ""

# SAP Setup
echo "5. SAP Integration"
read -p "   Setup SAP integration? (y/n): " setup_sap

if [ "$setup_sap" = "y" ]; then
    read -p "   SAP Host: " sap_host
    read -p "   SAP System Number: " sap_sysnr
    read -p "   SAP Client: " sap_client
    read -p "   SAP User: " sap_user
    read -sp "   SAP Password: " sap_pass
    echo ""
    
    sed -i 's/SAP_ENABLED=.*/SAP_ENABLED=true/' .env
    sed -i "s/SAP_ASHOST=.*/SAP_ASHOST=$sap_host/" .env
    sed -i "s/SAP_SYSNR=.*/SAP_SYSNR=$sap_sysnr/" .env
    sed -i "s/SAP_CLIENT=.*/SAP_CLIENT=$sap_client/" .env
    sed -i "s/SAP_USER=.*/SAP_USER=$sap_user/" .env
    sed -i "s/SAP_PASSWORD=.*/SAP_PASSWORD=$sap_pass/" .env
    echo -e "${GREEN}✓ SAP configured${NC}"
fi

# ========================================
# STEP 5: Install System Dependencies
# ========================================
print_header "STEP 5: Installing System Dependencies"

if command_exists apt-get; then
    echo "Installing Tesseract OCR..."
    sudo apt-get update > /dev/null 2>&1
    sudo apt-get install -y tesseract-ocr tesseract-ocr-eng poppler-utils > /dev/null 2>&1
    echo -e "${GREEN}✓ Tesseract installed${NC}"
elif command_exists yum; then
    echo "Installing Tesseract OCR..."
    sudo yum install -y tesseract poppler-utils > /dev/null 2>&1
    echo -e "${GREEN}✓ Tesseract installed${NC}"
elif command_exists brew; then
    echo "Installing Tesseract OCR..."
    brew install tesseract poppler > /dev/null 2>&1
    echo -e "${GREEN}✓ Tesseract installed${NC}"
else
    echo -e "${YELLOW}⚠ Could not detect package manager${NC}"
    echo "Please install Tesseract OCR manually"
fi

# ========================================
# STEP 6: Pull Docker Images
# ========================================
print_header "STEP 6: Pulling Docker Images"

echo "Pulling Docker images (this may take a while)..."
docker-compose pull

echo -e "${GREEN}✓ Docker images pulled${NC}"

# ========================================
# STEP 7: Build Services
# ========================================
print_header "STEP 7: Building Services"

echo "Building application services..."
docker-compose build

echo -e "${GREEN}✓ Services built${NC}"

# ========================================
# STEP 8: Initialize Database
# ========================================
print_header "STEP 8: Initializing Database"

echo "Starting database service..."
docker-compose up -d postgres

echo "Waiting for PostgreSQL to be ready..."
sleep 10

echo "Running database migrations..."
docker-compose run --rm backend alembic upgrade head

echo -e "${GREEN}✓ Database initialized${NC}"

# ========================================
# STEP 9: Create Admin User
# ========================================
print_header "STEP 9: Creating Admin User"

read -p "Create admin user? (y/n): " create_admin

if [ "$create_admin" = "y" ]; then
    read -p "Admin username: " admin_user
    read -p "Admin email: " admin_email
    read -sp "Admin password: " admin_pass
    echo ""
    
    docker-compose run --rm backend python -c "
from backend.core.database import SessionLocal
from backend.models.user import User
from backend.core.security import get_password_hash

db = SessionLocal()
try:
    user = User(
        username='$admin_user',
        email='$admin_email',
        hashed_password=get_password_hash('$admin_pass'),
        is_active=True,
        is_superuser=True
    )
    db.add(user)
    db.commit()
    print('Admin user created successfully!')
except Exception as e:
    print(f'Error: {e}')
finally:
    db.close()
"
    echo -e "${GREEN}✓ Admin user created${NC}"
fi

# ========================================
# STEP 10: Start All Services
# ========================================
print_header "STEP 10: Starting All Services"

echo "Starting all services..."
docker-compose up -d

echo "Waiting for services to be healthy..."
sleep 15

# Check service health
services=("postgres" "redis" "backend" "frontend")
all_healthy=true

for service in "${services[@]}"; do
    if docker-compose ps $service 2>/dev/null | grep -q "Up"; then
        echo -e "${GREEN}✓${NC} $service is running"
    else
        echo -e "${RED}✗${NC} $service is not running"
        all_healthy=false
    fi
done

# ========================================
# COMPLETION
# ========================================
print_header "✅ Setup Complete!"

echo ""
echo -e "${GREEN}ARIA is now running!${NC}"
echo ""
echo "Service URLs:"
echo "============================================"
echo -e "Frontend:          ${BLUE}http://localhost:3000${NC}"
echo -e "Backend API:       ${BLUE}http://localhost:8000${NC}"
echo -e "API Documentation: ${BLUE}http://localhost:8000/docs${NC}"
echo -e "Flower (Celery):   ${BLUE}http://localhost:5555${NC}"
echo -e "MinIO Console:     ${BLUE}http://localhost:9001${NC}"
echo ""
echo "Useful Commands:"
echo "============================================"
echo "View logs:         docker-compose logs -f [service]"
echo "Stop services:     docker-compose down"
echo "Restart service:   docker-compose restart [service]"
echo "Run tests:         pytest backend/tests/ -v"
echo ""

if [ "$all_healthy" = false ]; then
    echo -e "${YELLOW}⚠ Some services failed to start${NC}"
    echo "Check logs with: docker-compose logs"
    echo ""
fi

echo "Next Steps:"
echo "1. Access frontend at http://localhost:3000"
echo "2. Login with admin credentials"
echo "3. Upload a test document"
echo "4. Check the documentation in README_COMPLETE.md"
echo ""
echo -e "${GREEN}🎉 Enjoy using ARIA!${NC}"
