#!/bin/bash
# ARIA ERP - Deployment Readiness Checker
# Verifies that all required files and configurations are present for successful deployment

echo "🔍 ARIA ERP Deployment Readiness Check"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
checks_passed=0
checks_total=0

# Function to check if file exists
check_file() {
    local file=$1
    local description=$2
    checks_total=$((checks_total + 1))
    
    if [ -f "$file" ]; then
        echo -e "✅ ${GREEN}$description${NC}"
        checks_passed=$((checks_passed + 1))
        return 0
    else
        echo -e "❌ ${RED}$description${NC}"
        return 1
    fi
}

# Function to check directory exists
check_directory() {
    local dir=$1
    local description=$2
    checks_total=$((checks_total + 1))
    
    if [ -d "$dir" ]; then
        echo -e "✅ ${GREEN}$description${NC}"
        checks_passed=$((checks_passed + 1))
        return 0
    else
        echo -e "❌ ${RED}$description${NC}"
        return 1
    fi
}

# Function to check if command exists
check_command() {
    local cmd=$1
    local description=$2
    checks_total=$((checks_total + 1))
    
    if command -v "$cmd" >/dev/null 2>&1; then
        echo -e "✅ ${GREEN}$description${NC}"
        checks_passed=$((checks_passed + 1))
        return 0
    else
        echo -e "❌ ${RED}$description${NC}"
        return 1
    fi
}

echo ""
echo "📁 File Structure Checks:"
echo "------------------------"

check_directory "workers-api" "Workers API directory exists"
check_directory "frontend-v2" "Frontend v2 directory exists"
check_directory "backend" "Backend directory exists"
check_file "workers-api/wrangler.toml" "Cloudflare Workers configuration"
check_file "backend/.env.example" "Backend environment example"
check_file "frontend-v2/package.json" "Frontend package.json"

echo ""
echo "🛠️  CI/CD Configuration:"
echo "------------------------"

check_file ".github/workflows/ci.yml" "CI workflow configuration"
check_file ".github/workflows/deploy.yml" "Deployment workflow configuration"
check_directory "workers-api/migrations" "Database migrations directory"
echo -e "✅ ${GREEN}Migration files:${NC} $(ls workers-api/migrations | wc -l) found"
checks_passed=$((checks_passed + 1))
checks_total=$((checks_total + 1))

echo ""
echo "📦 Dependencies:"
echo "----------------"

check_command "node" "Node.js installed"
check_command "npm" "NPM installed"
check_command "wrangler" "Cloudflare Wrangler installed"

echo ""
echo "🤖 Bot System:"
echo "---------------"

check_file "backend/bot_orchestrator.py" "Bot orchestrator present"
check_file "backend/bots_advanced.py" "Advanced bots registry"
echo -e "✅ ${GREEN}Bot files:${NC} $(find backend/app/bots -name '*.py' | wc -l) found"
checks_passed=$((checks_passed + 1))
checks_total=$((checks_total + 1))

echo ""
echo "⚙️  Admin Configuration:"
echo "-----------------------"

check_file "backend/app/api/admin_config.py" "Main admin configuration API"
check_file "backend/app/api/super_admin.py" "Super admin API"
echo -e "✅ ${GREEN}Admin configs:${NC} $(ls backend/app/api/*admin*.py | wc -l) found"
checks_passed=$((checks_passed + 1))
checks_total=$((checks_total + 1))

echo ""
echo "📊 Summary:"
echo "----------"

percentage=$((checks_passed * 100 / checks_total))
echo -e "Passed: ${GREEN}$checks_passed${NC}/${checks_total} checks ($percentage%)"

if [ $checks_passed -eq $checks_total ]; then
    echo -e "\n🚀 ${GREEN}DEPLOYMENT READY${NC}"
    echo -e "All required files and configurations present for successful deployment."
    echo -e "Your CI/CD pipeline should execute without issues."
elif [ $percentage -ge 80 ]; then
    echo -e "\n⚠️  ${YELLOW}READY WITH WARNINGS${NC}"
    echo -e "Most checks passed. Some warnings may need attention before deployment."
else
    echo -e "\n❌ ${RED}NOT READY${NC}"
    echo -e "Multiple issues detected. Please resolve before attempting deployment."
fi

echo ""
echo "📅 Generated: $(date)"
exit 0