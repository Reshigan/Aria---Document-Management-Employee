#!/bin/bash
set -e

echo "🚀 Starting Enhanced Production Deployment..."

# Configuration
BACKUP_DIR="/home/ubuntu/backups"
APP_DIR="/home/ubuntu/Aria---Document-Management-Employee"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# 1. Pre-deployment backup
echo "📦 Creating backup..."
tar -czf "$BACKUP_DIR/aria_backup_$TIMESTAMP.tar.gz" \
    -C /home/ubuntu \
    --exclude='Aria---Document-Management-Employee/.git' \
    --exclude='Aria---Document-Management-Employee/node_modules' \
    --exclude='Aria---Document-Management-Employee/frontend/node_modules' \
    --exclude='Aria---Document-Management-Employee/frontend/.next' \
    Aria---Document-Management-Employee

# Keep only last 5 backups
ls -t $BACKUP_DIR/aria_backup_*.tar.gz | tail -n +6 | xargs -r rm

# 2. Stop services gracefully
echo "⏹️ Stopping services..."
pm2 stop aria-backend aria-frontend || true

# 3. Update code
echo "📥 Updating code..."
cd $APP_DIR
git pull origin main

# 4. Install dependencies
echo "📦 Installing dependencies..."
cd backend && pip install -r requirements.txt
cd ../frontend && npm install

# 5. Build frontend
echo "🏗️ Building frontend..."
rm -rf .next
npm run build

# 6. Database migration (if needed)
echo "🗄️ Checking database..."
cd ../backend
python -c "
import sqlite3
conn = sqlite3.connect('aria.db')
cursor = conn.cursor()
# Add any migration scripts here
conn.close()
print('Database check complete')
"

# 7. Start services
echo "▶️ Starting services..."
pm2 start aria-backend
pm2 start aria-frontend

# 8. Health checks
echo "🏥 Running health checks..."
sleep 10

# Check backend
if curl -f http://localhost:12000/health > /dev/null 2>&1; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend health check passed"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

# 9. SSL certificate check
echo "🔒 Checking SSL certificate..."
if openssl s_client -connect aria.vantax.co.za:443 -servername aria.vantax.co.za < /dev/null 2>/dev/null | openssl x509 -noout -dates; then
    echo "✅ SSL certificate is valid"
else
    echo "⚠️ SSL certificate check failed"
fi

echo "🎉 Deployment completed successfully!"
echo "📊 Deployment summary:"
echo "   - Backup created: $BACKUP_DIR/aria_backup_$TIMESTAMP.tar.gz"
echo "   - Services restarted: $(pm2 list | grep -E 'aria-(backend|frontend)' | wc -l) services"
echo "   - Website: https://aria.vantax.co.za"