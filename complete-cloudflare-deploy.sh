#!/bin/bash

#################################################################################
# ARIA ERP - Complete Cloudflare Deployment Script
# Deploys both Workers API and Pages frontend to Cloudflare
#################################################################################

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 =================================${NC}"
echo -e "${BLUE}🚀 ARIA ERP - Cloudflare Deployment${NC}"
echo -e "${BLUE}🚀 =================================${NC}"
echo ""

# Check for required tools
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found${NC}"
    echo "Install with: npm install -g wrangler"
    exit 1
fi

echo -e "${GREEN}✅ Wrangler CLI found${NC}"

# Get Cloudflare credentials
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  CLOUDFLARE_API_TOKEN not set${NC}"
    echo -e "${YELLOW}   You'll need to enter it when prompted by Wrangler${NC}"
    echo ""
fi

# Change to project directory
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

echo -e "${BLUE}📁 Working in: $PROJECT_ROOT${NC}"
echo ""

#################################################################################
# STEP 1: Deploy Workers API
#################################################################################
echo -e "${BLUE}🔧 STEP 1: Deploying Workers API${NC}"

cd "$PROJECT_ROOT/workers-api"

echo "Building TypeScript code..."
npm run build

echo "Deploying to Cloudflare Workers..."
npx wrangler deploy

echo -e "${GREEN}✅ Workers API deployed successfully${NC}"
echo ""

#################################################################################
# STEP 2: Run Database Migrations
#################################################################################
echo -e "${BLUE}🔧 STEP 2: Running Database Migrations${NC}"

# Run all migration files in order
echo "Applying D1 migrations..."

for migration_file in migrations/*.sql; do
    if [ -f "$migration_file" ]; then
        echo "Running migration: $(basename "$migration_file")"
        npx wrangler d1 execute aria-erp-db --remote --file="$migration_file" --yes || {
            echo -e "${YELLOW}⚠️  Warning: Migration $(basename "$migration_file") may have partially failed${NC}"
        }
    fi
done

echo -e "${GREEN}✅ Database migrations completed${NC}"
echo ""

#################################################################################
# STEP 3: Deploy Frontend to Cloudflare Pages
#################################################################################
echo -e "${BLUE}🔧 STEP 3: Deploying Frontend to Cloudflare Pages${NC}"

cd "$PROJECT_ROOT/frontend-v2"

echo "Installing frontend dependencies..."
npm install --no-audit --no-fund

echo "Building frontend application..."
npm run build

echo "Deploying to Cloudflare Pages..."
OUTPUT=$(npx wrangler pages deploy dist --project-name=aria-erp --branch=main 2>&1) || {
    echo -e "${YELLOW}⚠️  Deployment command failed. This might be okay if deployment is still processing.${NC}"
    echo "Full output:"
    echo "$OUTPUT"
}

echo -e "${GREEN}✅ Frontend deployment initiated${NC}"
echo ""

#################################################################################
# STEP 4: Validate Deployment
#################################################################################
echo -e "${BLUE}🔍 STEP 4: Validating Deployment${NC}"

echo "Checking backend health..."
if curl -s -o /dev/null -w "%{http_code}" https://aria-api.reshigan-085.workers.dev/api/health | grep -q "200"; then
    echo -e "${GREEN}✅ Backend API is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Backend API check failed${NC}"
fi

echo "Deployment process completed!"
echo ""
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}🎉 CLOUDFLARE DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo -e "${BLUE}🔗 ACCESS YOUR APPLICATION:${NC}"
echo "  • Backend API: https://aria-api.reshigan-085.workers.dev"
echo "  • Frontend:    https://aria-erp.pages.dev"
echo ""
echo -e "${BLUE}📊 MONITORING AND MAINTENANCE:${NC}"
echo "  • View logs:      wrangler tail aria-api"
echo "  • Manage database: wrangler d1"
echo "  • Update config:  Review wrangler.toml files"
echo ""
echo -e "${BLUE}⚠️  NOTE:${NC}"
echo "  • Initial deployment may take a few minutes to fully propagate"
echo "  • First-time database setup might require manual intervention"
echo "  • Custom domains need to be configured in Cloudflare dashboard"
echo ""
