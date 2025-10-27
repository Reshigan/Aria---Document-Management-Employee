#!/bin/bash

##############################################################################
# ARIA - STOP ALL SERVICES
##############################################################################

echo "🛑 Stopping all ARIA services..."
echo ""

# Stop original API
if pgrep -f "backend/api.py" > /dev/null 2>&1; then
    echo "Stopping Original API..."
    pkill -f "backend/api.py" || true
    echo "  ✅ Original API stopped"
else
    echo "  ℹ️  Original API not running"
fi

# Stop expanded API
if pgrep -f "backend/api_expanded.py" > /dev/null 2>&1; then
    echo "Stopping Expanded API..."
    pkill -f "backend/api_expanded.py" || true
    echo "  ✅ Expanded API stopped"
else
    echo "  ℹ️  Expanded API not running"
fi

# Stop frontend
if pgrep -f "npm run dev" > /dev/null 2>&1; then
    echo "Stopping Frontend..."
    pkill -f "npm run dev" || true
    echo "  ✅ Frontend stopped"
else
    echo "  ℹ️  Frontend not running"
fi

echo ""
echo "✅ All ARIA services stopped"
echo ""
echo "To restart, run: ./DEPLOY_NOW.sh"
echo ""
