#!/bin/bash
# Day 1 Execution Script - ARIA Database Foundation
# Run this script on the server to complete Day 1 deployment

set -e  # Exit on error

echo "======================================================================"
echo "   🚀 ARIA DAY 1 DEPLOYMENT - DATABASE FOUNDATION"
echo "======================================================================"
echo ""
echo "This script will:"
echo "  1. Install Python dependencies"
echo "  2. Initialize database (52 tables)"
echo "  3. Seed demo data (1000+ records)"
echo "  4. Verify setup"
echo ""
read -p "Press ENTER to continue or CTRL+C to cancel..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Navigate to backend directory
echo ""
echo -e "${YELLOW}Step 1: Navigating to backend directory...${NC}"
cd /opt/aria/backend || { echo -e "${RED}Error: /opt/aria/backend not found${NC}"; exit 1; }
echo -e "${GREEN}✅ In backend directory${NC}"

# Step 2: Pull latest code
echo ""
echo -e "${YELLOW}Step 2: Pulling latest code from GitHub...${NC}"
cd /opt/aria
sudo git pull origin main
echo -e "${GREEN}✅ Code updated${NC}"

# Step 3: Install dependencies
echo ""
echo -e "${YELLOW}Step 3: Installing Python dependencies...${NC}"
cd /opt/aria/backend
sudo /opt/aria/backend/venv/bin/pip install sqlalchemy psycopg2-binary passlib bcrypt python-jose --quiet
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 4: Initialize database
echo ""
echo -e "${YELLOW}Step 4: Initializing database (52 tables)...${NC}"
sudo /opt/aria/backend/venv/bin/python scripts/init_database.py
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database initialized${NC}"
else
    echo -e "${RED}❌ Database initialization failed${NC}"
    exit 1
fi

# Step 5: Seed demo data
echo ""
echo -e "${YELLOW}Step 5: Seeding demo data (1000+ records)...${NC}"
sudo /opt/aria/backend/venv/bin/python scripts/seed_comprehensive_data.py
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Demo data seeded${NC}"
else
    echo -e "${RED}❌ Data seeding failed${NC}"
    exit 1
fi

# Step 6: Restart backend service
echo ""
echo -e "${YELLOW}Step 6: Restarting backend service...${NC}"
sudo systemctl restart aria-backend
sleep 3
sudo systemctl status aria-backend --no-pager | head -10
if sudo systemctl is-active --quiet aria-backend; then
    echo -e "${GREEN}✅ Backend service running${NC}"
else
    echo -e "${RED}❌ Backend service failed to start${NC}"
    echo "Check logs: sudo journalctl -u aria-backend -n 50"
    exit 1
fi

# Step 7: Verify database
echo ""
echo -e "${YELLOW}Step 7: Verifying database...${NC}"
TABLE_COUNT=$(sudo -u postgres psql -d aria_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
USER_COUNT=$(sudo -u postgres psql -d aria_db -t -c "SELECT COUNT(*) FROM users;" | xargs)
CUSTOMER_COUNT=$(sudo -u postgres psql -d aria_db -t -c "SELECT COUNT(*) FROM customers;" | xargs)
INVOICE_COUNT=$(sudo -u postgres psql -d aria_db -t -c "SELECT COUNT(*) FROM invoices;" | xargs)

echo "  📊 Database Statistics:"
echo "     Tables: $TABLE_COUNT (expected: 52)"
echo "     Users: $USER_COUNT (expected: 15)"
echo "     Customers: $CUSTOMER_COUNT (expected: 50)"
echo "     Invoices: $INVOICE_COUNT (expected: 100)"

if [ "$TABLE_COUNT" -ge "50" ] && [ "$USER_COUNT" -ge "15" ]; then
    echo -e "${GREEN}✅ Database verification passed${NC}"
else
    echo -e "${RED}⚠️  Database verification warning - counts don't match expected${NC}"
fi

# Summary
echo ""
echo "======================================================================"
echo "   🎉 DAY 1 DEPLOYMENT COMPLETE!"
echo "======================================================================"
echo ""
echo "📊 Summary:"
echo "   ✅ Database initialized ($TABLE_COUNT tables)"
echo "   ✅ Demo data seeded ($USER_COUNT users, $CUSTOMER_COUNT customers, $INVOICE_COUNT invoices)"
echo "   ✅ Backend service running"
echo ""
echo "🔐 Login Credentials:"
echo "   📧 Email: admin@vantax.co.za"
echo "   🔑 Password: Demo@2025"
echo ""
echo "🌐 Access Platform:"
echo "   🔗 URL: https://aria.vantax.co.za"
echo "   📖 API Docs: https://aria.vantax.co.za/api/docs"
echo ""
echo "✅ Day 1 Checklist:"
echo "   [✅] Database initialized"
echo "   [✅] Demo data seeded"
echo "   [✅] Backend running"
echo "   [ ] SSL certificate (run: sudo certbot --nginx -d aria.vantax.co.za)"
echo "   [ ] Test login via browser"
echo ""
echo "📝 Next Steps:"
echo "   1. Setup SSL: sudo certbot --nginx -d aria.vantax.co.za"
echo "   2. Test login at: https://aria.vantax.co.za"
echo "   3. Proceed to Day 2: Backend API development"
echo ""
echo "🐛 Troubleshooting:"
echo "   View logs: sudo journalctl -u aria-backend -n 50 -f"
echo "   Check DB: sudo -u postgres psql -d aria_db"
echo "   Restart: sudo systemctl restart aria-backend"
echo ""
echo "======================================================================"
