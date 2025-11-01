#!/bin/bash

###############################################################################
# ARIA ERP - Quick Start Script
# Starts FastAPI backend (port 8000) and React frontend (port 12001)
###############################################################################

echo "🚀 Starting ARIA ERP..."
echo ""

# Start Backend API
echo "📦 Starting Backend API (port 8000)..."
cd backend
nohup python3 erp_api.py > api.log 2>&1 &
API_PID=$!
echo "✓ Backend started (PID: $API_PID)"
echo ""

# Start Frontend
echo "🎨 Starting Frontend (port 12001)..."
cd ../frontend
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✓ Frontend started (PID: $FRONTEND_PID)"
echo ""

sleep 3

echo "=========================================================================="
echo "✨ ARIA ERP is running!"
echo "=========================================================================="
echo ""
echo "🌐 Access URLs:"
echo "  • Frontend:      http://localhost:12001"
echo "  • ERP Dashboard: http://localhost:12001/erp"
echo "  • Backend API:   http://localhost:8000"
echo "  • API Docs:      http://localhost:8000/api/docs"
echo ""
echo "📊 Components:"
echo "  • 7 ERP Modules (GL, AP, AR, Banking, Payroll, CRM, Inventory)"
echo "  • 15 Automation Bots"
echo "  • REST API with OpenAPI"
echo "  • React Dashboard"
echo ""
echo "🔧 Logs:"
echo "  • Backend:  backend/api.log"
echo "  • Frontend: frontend/frontend.log"
echo ""
echo "🛑 To stop: pkill -f 'erp_api.py' && pkill -f 'vite'"
echo "=========================================================================="
