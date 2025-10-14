#!/bin/bash

# Production Fix Script for Aria Document Management System
# This script fixes the frontend deployment issues

set -e

echo "🔧 Starting production fixes..."

# Stop all PM2 processes
echo "⏹️  Stopping all PM2 processes..."
pm2 stop all || true
pm2 delete all || true

# Navigate to project directory
cd /home/ubuntu/Aria---Document-Management-Employee

# Pull latest changes from main branch
echo "📥 Pulling latest changes from main branch..."
git stash || true
git checkout main
git pull origin main

# Update frontend configuration
echo "🔧 Updating frontend configuration..."
cd frontend

# Build the frontend for production
echo "🏗️  Building frontend for production..."
npm install
npm run build

# Go back to project root
cd ..

# Copy the corrected ecosystem configuration
echo "📋 Setting up PM2 ecosystem configuration..."
cp ecosystem.config.js /home/ubuntu/ecosystem.config.js

# Start services with corrected configuration
echo "🚀 Starting services..."
pm2 start /home/ubuntu/ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup

echo "✅ Production fixes completed!"
echo "🌐 Frontend should now be accessible on port 12001"
echo "🔗 Backend running on port 8000"

# Show status
pm2 status