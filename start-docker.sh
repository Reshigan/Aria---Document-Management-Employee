#!/bin/bash
# ARIA ERP - Quick Start Script for Docker Compose

echo "🚀 ARIA ERP - Starting Docker Compose Setup"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Stop any existing containers
echo "🧹 Cleaning up any existing containers..."
docker-compose down -v 2>/dev/null || true

echo ""
echo "🏗️  Building and starting services..."
echo "   This may take 5-10 minutes on first run..."
echo ""

# Build and start services
docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ ARIA ERP is ready!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "🌐 Access your application:"
echo "   Frontend:     http://localhost:12001"
echo "   Backend API:  http://localhost:8000"
echo "   API Docs:     http://localhost:8000/docs"
echo ""
echo "🔐 Login Credentials:"
echo "   Email:    admin@aria.local"
echo "   Password: admin123"
echo ""
echo "📝 Useful Commands:"
echo "   View logs:        docker-compose logs -f"
echo "   View backend logs:  docker-compose logs -f backend"
echo "   View frontend logs: docker-compose logs -f frontend"
echo "   Stop services:      docker-compose down"
echo "   Restart services:   docker-compose restart"
echo ""
echo "═══════════════════════════════════════════════════"
