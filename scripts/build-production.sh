#!/bin/bash

# ARIA Production Build Script
# Builds optimized production version of the entire system

set -e

echo "🚀 ARIA Production Build Script"
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}Project Root: $PROJECT_ROOT${NC}"
echo -e "${BLUE}Build Directory: $BUILD_DIR${NC}"
echo -e "${BLUE}Build Timestamp: $TIMESTAMP${NC}"

# Create build directory
echo -e "\n${YELLOW}📁 Creating build directory...${NC}"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Build Frontend
echo -e "\n${YELLOW}🎨 Building Frontend (Next.js)...${NC}"
cd "$PROJECT_ROOT/frontend"

# Install dependencies
echo "Installing frontend dependencies..."
npm ci --only=production

# Build for production
echo "Building Next.js application..."
NODE_ENV=production npm run build

# Copy build artifacts
echo "Copying frontend build artifacts..."
mkdir -p "$BUILD_DIR/frontend"
cp -r .next "$BUILD_DIR/frontend/"
cp -r public "$BUILD_DIR/frontend/"
cp package*.json "$BUILD_DIR/frontend/"
cp next.config.js "$BUILD_DIR/frontend/" 2>/dev/null || true

echo -e "${GREEN}✅ Frontend build completed${NC}"

# Build Backend
echo -e "\n${YELLOW}🔧 Building Backend (FastAPI)...${NC}"
cd "$PROJECT_ROOT/backend"

# Create virtual environment for production
echo "Creating production virtual environment..."
python3 -m venv "$BUILD_DIR/backend/venv"
source "$BUILD_DIR/backend/venv/bin/activate"

# Install dependencies
echo "Installing backend dependencies..."
pip install --no-cache-dir -r requirements.txt
pip install --no-cache-dir gunicorn uvicorn[standard]

# Copy backend files
echo "Copying backend files..."
cp -r . "$BUILD_DIR/backend/"
rm -rf "$BUILD_DIR/backend/venv"  # Remove the venv we just created
cp -r venv "$BUILD_DIR/backend/"  # Copy the one with dependencies

echo -e "${GREEN}✅ Backend build completed${NC}"

# Build Docker Images
echo -e "\n${YELLOW}🐳 Building Docker Images...${NC}"
cd "$PROJECT_ROOT"

# Build frontend Docker image
echo "Building frontend Docker image..."
docker build -f Dockerfile.frontend -t aria-frontend:$TIMESTAMP -t aria-frontend:latest .

# Build backend Docker image
echo "Building backend Docker image..."
docker build -f Dockerfile.backend -t aria-backend:$TIMESTAMP -t aria-backend:latest .

echo -e "${GREEN}✅ Docker images built successfully${NC}"

# Create deployment package
echo -e "\n${YELLOW}📦 Creating deployment package...${NC}"

# Copy configuration files
cp docker-compose.production.yml "$BUILD_DIR/"
cp -r nginx "$BUILD_DIR/"
cp .env.production "$BUILD_DIR/"

# Create deployment scripts
mkdir -p "$BUILD_DIR/scripts"

# Create start script
cat > "$BUILD_DIR/scripts/start.sh" << 'EOF'
#!/bin/bash
echo "🚀 Starting ARIA Production System..."
docker-compose -f docker-compose.production.yml up -d
echo "✅ ARIA system started successfully!"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000"
echo "Nginx Proxy: http://localhost:80"
EOF

# Create stop script
cat > "$BUILD_DIR/scripts/stop.sh" << 'EOF'
#!/bin/bash
echo "🛑 Stopping ARIA Production System..."
docker-compose -f docker-compose.production.yml down
echo "✅ ARIA system stopped successfully!"
EOF

# Create update script
cat > "$BUILD_DIR/scripts/update.sh" << 'EOF'
#!/bin/bash
echo "🔄 Updating ARIA Production System..."
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
echo "✅ ARIA system updated successfully!"
EOF

# Make scripts executable
chmod +x "$BUILD_DIR/scripts/"*.sh

# Create README for deployment
cat > "$BUILD_DIR/README.md" << EOF
# ARIA Production Deployment

## Quick Start

1. **Start the system:**
   \`\`\`bash
   ./scripts/start.sh
   \`\`\`

2. **Stop the system:**
   \`\`\`bash
   ./scripts/stop.sh
   \`\`\`

3. **Update the system:**
   \`\`\`bash
   ./scripts/update.sh
   \`\`\`

## Access Points

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Nginx Proxy:** http://localhost:80
- **API Documentation:** http://localhost:8000/docs

## System Requirements

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB disk space

## Configuration

Edit \`.env.production\` to customize settings:
- API URLs
- File upload limits
- Security settings
- Feature flags

## Monitoring

- Health checks: http://localhost/health
- Prometheus metrics: http://localhost:9090
- System logs: \`docker-compose logs -f\`

## SSL Setup

1. Obtain SSL certificates
2. Place them in \`nginx/ssl/\`
3. Uncomment HTTPS server block in \`nginx/nginx.prod.conf\`
4. Restart nginx: \`docker-compose restart nginx\`

Built on: $(date)
Version: $TIMESTAMP
EOF

# Create build info
cat > "$BUILD_DIR/build-info.json" << EOF
{
  "build_timestamp": "$TIMESTAMP",
  "build_date": "$(date -Iseconds)",
  "version": "1.0.0",
  "environment": "production",
  "components": {
    "frontend": {
      "framework": "Next.js 14",
      "build_tool": "npm",
      "optimizations": ["minification", "compression", "code_splitting"]
    },
    "backend": {
      "framework": "FastAPI",
      "server": "Gunicorn + Uvicorn",
      "optimizations": ["async", "connection_pooling", "caching"]
    },
    "infrastructure": {
      "reverse_proxy": "Nginx",
      "containerization": "Docker",
      "orchestration": "Docker Compose"
    }
  },
  "features": {
    "excel_support": true,
    "ai_chat": true,
    "file_upload": true,
    "dashboard_analytics": true,
    "user_authentication": true
  }
}
EOF

# Create archive
echo -e "\n${YELLOW}📦 Creating deployment archive...${NC}"
cd "$BUILD_DIR/.."
tar -czf "aria-production-$TIMESTAMP.tar.gz" -C build .

echo -e "\n${GREEN}🎉 Production Build Completed Successfully!${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "${BLUE}Build Directory: $BUILD_DIR${NC}"
echo -e "${BLUE}Archive: aria-production-$TIMESTAMP.tar.gz${NC}"
echo -e "${BLUE}Docker Images:${NC}"
echo -e "  - aria-frontend:$TIMESTAMP"
echo -e "  - aria-backend:$TIMESTAMP"

echo -e "\n${YELLOW}📋 Next Steps:${NC}"
echo "1. Copy the build directory or archive to your production server"
echo "2. Run ./scripts/start.sh to start the system"
echo "3. Configure SSL certificates if needed"
echo "4. Set up monitoring and backups"

echo -e "\n${GREEN}✅ Ready for production deployment!${NC}"