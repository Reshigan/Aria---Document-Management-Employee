# Aria Fresh Deployment Guide
**Complete Server Setup from Scratch**

Date: October 27, 2025  
Server: ubuntu@3.8.139.178  
Domain: aria.vantax.co.za

---

## 🚀 Quick Start (5 Commands)

If you just want to deploy quickly:

```bash
# 1. Connect to server
ssh ubuntu@3.8.139.178

# 2. Run the automated setup script
curl -fsSL https://raw.githubusercontent.com/Reshigan/Aria---Document-Management-Employee/main/deploy.sh | bash

# 3. Configure environment
nano /var/www/aria/.env  # Add your settings

# 4. Create database
cd /var/www/aria/backend && python create_db.py

# 5. Start Aria
cd /var/www/aria && ./start.sh
```

---

## 📋 Complete Step-by-Step Guide

### Phase 1: Clean Up Existing Installation

```bash
# Connect to server
ssh ubuntu@3.8.139.178

# Stop any running Aria processes
ps aux | grep uvicorn
ps aux | grep aria
# Kill any found processes
sudo kill -9 <PID>

# Remove old installation
sudo rm -rf /var/www/aria
sudo rm -rf /opt/aria

# Remove old database (if exists)
rm -f ~/aria.db
rm -f /var/www/aria.db

# Remove old logs
sudo rm -f /var/log/aria*.log

echo "✅ Old installation removed"
```

---

### Phase 2: Install System Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11+
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install Node.js 18+ (for frontend)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Install Nginx (web server)
sudo apt install -y nginx

# Install PostgreSQL (optional, SQLite works too)
# sudo apt install -y postgresql postgresql-contrib

# Install build tools
sudo apt install -y build-essential libssl-dev libffi-dev python3-dev

echo "✅ System dependencies installed"
```

---

### Phase 3: Install Ollama (AI Engine)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
sudo systemctl start ollama
sudo systemctl enable ollama  # Auto-start on boot

# Verify Ollama is running
sudo systemctl status ollama

# Download AI model (choose one)
# Option 1: Llama 3.2 (Recommended - 8GB RAM)
ollama pull llama3.2

# Option 2: Mistral (Alternative)
# ollama pull mistral

# Option 3: Phi-3 (Lightweight - 4GB RAM)
# ollama pull phi3

# Test Ollama
ollama list

echo "✅ Ollama installed and model downloaded"
```

---

### Phase 4: Clone Aria Repository

```bash
# Create directory
sudo mkdir -p /var/www
cd /var/www

# Clone repository (use HTTPS)
sudo git clone https://github.com/Reshigan/Aria---Document-Management-Employee.git aria

# Set permissions
sudo chown -R ubuntu:ubuntu /var/www/aria

# Enter directory
cd /var/www/aria

# Check current branch
git branch
git status

# If needed, pull latest changes
git pull origin main

echo "✅ Repository cloned"
```

---

### Phase 5: Setup Backend

```bash
cd /var/www/aria/backend

# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# If requirements.txt is missing, install manually
pip install fastapi uvicorn sqlalchemy pydantic python-multipart
pip install python-jose[cryptography] passlib[bcrypt] python-dotenv
pip install httpx  # For Ollama API calls

echo "✅ Backend dependencies installed"
```

---

### Phase 6: Configure Environment

```bash
cd /var/www/aria/backend

# Copy example env file
cp .env.example .env

# Edit environment variables
nano .env
```

**Add these to `.env`:**

```bash
# Security
SECRET_KEY=aria-super-secret-key-change-this-in-production-$(openssl rand -hex 32)

# Database (SQLite for simplicity)
DATABASE_URL=sqlite:////var/www/aria/aria.db

# CORS (allow frontend)
CORS_ORIGINS=https://aria.vantax.co.za,http://localhost:3000

# JWT
JWT_EXPIRATION_MINUTES=1440

# File Upload
UPLOAD_DIR=/var/www/aria/uploads
MAX_UPLOAD_SIZE_MB=50

# AI Configuration (IMPORTANT!)
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Legacy config
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2

# AI Personality
AI_NAME=ARIA
AI_TONE=professional
AI_LANGUAGE=en
```

**Save and exit** (Ctrl+X, Y, Enter)

```bash
echo "✅ Environment configured"
```

---

### Phase 7: Initialize Database

```bash
cd /var/www/aria/backend

# Activate virtual environment (if not already)
source venv/bin/activate

# Create database initialization script
cat > create_db.py << 'EOF'
"""
Initialize Aria Database
"""
from sqlalchemy import create_engine
from models.base import Base
from models import *  # Import all models
import os

# Get database URL from env
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////var/www/aria/aria.db")

print(f"Creating database: {DATABASE_URL}")

# Create engine
engine = create_engine(DATABASE_URL, echo=True)

# Create all tables
Base.metadata.create_all(bind=engine)

print("✅ Database created successfully!")
print(f"✅ Total tables created: {len(Base.metadata.tables)}")
print("\nTables:")
for table_name in sorted(Base.metadata.tables.keys()):
    print(f"  - {table_name}")
EOF

# Run database creation
python create_db.py

# Create uploads directory
mkdir -p /var/www/aria/uploads

# Set permissions
chmod 755 /var/www/aria/uploads

echo "✅ Database initialized"
```

---

### Phase 8: Setup Frontend

```bash
cd /var/www/aria/frontend

# Install dependencies
npm install

# Build production bundle
npm run build

# The build output goes to frontend/dist
ls -la dist/

echo "✅ Frontend built"
```

---

### Phase 9: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/aria
```

**Add this configuration:**

```nginx
# Aria ERP - Production Configuration

upstream aria_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name aria.vantax.co.za;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name aria.vantax.co.za;

    # SSL Configuration (update paths if needed)
    ssl_certificate /etc/letsencrypt/live/aria.vantax.co.za/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aria.vantax.co.za/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Max upload size (for documents)
    client_max_body_size 50M;

    # Frontend (React)
    location / {
        root /var/www/aria/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # Backend API
    location /api/ {
        proxy_pass http://aria_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts (for AI bot processing)
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Static files
    location /static/ {
        alias /var/www/aria/frontend/dist/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Uploads
    location /uploads/ {
        alias /var/www/aria/uploads/;
        expires 1h;
    }

    # Logs
    access_log /var/log/nginx/aria_access.log;
    error_log /var/log/nginx/aria_error.log;
}
```

**Save and exit**

```bash
# Enable site
sudo ln -sf /etc/nginx/sites-available/aria /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

echo "✅ Nginx configured"
```

---

### Phase 10: Create Startup Script

```bash
cd /var/www/aria

# Create startup script
cat > start.sh << 'EOF'
#!/bin/bash
# Aria Startup Script

echo "🚀 Starting Aria ERP..."

# Change to backend directory
cd /var/www/aria/backend

# Activate virtual environment
source venv/bin/activate

# Export environment variables
export PYTHONPATH=/var/www/aria/backend:$PYTHONPATH

# Start Uvicorn
echo "Starting backend on port 8000..."
nohup python -m uvicorn main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --log-level info \
    > /var/log/aria.log 2>&1 &

# Save PID
echo $! > /var/run/aria.pid

echo "✅ Aria started!"
echo "PID: $(cat /var/run/aria.pid)"
echo "Logs: tail -f /var/log/aria.log"
echo "Status: systemctl status aria (if using systemd)"
EOF

# Make executable
chmod +x start.sh

echo "✅ Startup script created"
```

---

### Phase 11: Create Stop Script

```bash
cd /var/www/aria

# Create stop script
cat > stop.sh << 'EOF'
#!/bin/bash
# Aria Stop Script

echo "🛑 Stopping Aria ERP..."

# Check if PID file exists
if [ -f /var/run/aria.pid ]; then
    PID=$(cat /var/run/aria.pid)
    echo "Killing process $PID..."
    kill -9 $PID 2>/dev/null
    rm /var/run/aria.pid
    echo "✅ Aria stopped"
else
    echo "⚠️  No PID file found, searching for processes..."
    pkill -f "uvicorn main:app"
    echo "✅ Killed all uvicorn processes"
fi
EOF

# Make executable
chmod +x stop.sh

echo "✅ Stop script created"
```

---

### Phase 12: Create Systemd Service (Optional but Recommended)

```bash
# Create systemd service file
sudo nano /etc/systemd/system/aria.service
```

**Add this configuration:**

```ini
[Unit]
Description=Aria ERP Backend
After=network.target ollama.service
Requires=ollama.service

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/var/www/aria/backend
Environment="PATH=/var/www/aria/backend/venv/bin"
Environment="PYTHONPATH=/var/www/aria/backend"
ExecStart=/var/www/aria/backend/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10

# Logging
StandardOutput=append:/var/log/aria.log
StandardError=append:/var/log/aria_error.log

[Install]
WantedBy=multi-user.target
```

**Save and exit**

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable aria

# Start service
sudo systemctl start aria

# Check status
sudo systemctl status aria

echo "✅ Systemd service created"
```

---

### Phase 13: Start Aria

```bash
# Option 1: Using startup script
cd /var/www/aria
./start.sh

# Option 2: Using systemd
sudo systemctl start aria

# Check if it's running
ps aux | grep uvicorn

# Check logs
tail -f /var/log/aria.log

# Test backend
curl http://localhost:8000/api/health

echo "✅ Aria is running!"
```

---

### Phase 14: Test Deployment

```bash
# Test Ollama
curl http://localhost:11434/api/tags

# Test Backend
curl http://localhost:8000/api/health

# Test Frontend (from browser)
# Open: https://aria.vantax.co.za

# Test Bot API (after logging in)
curl -X POST https://aria.vantax.co.za/api/bots/invoice_reconciliation/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "Show me overdue invoices"}'

echo "✅ All tests passed!"
```

---

## 🔧 Troubleshooting

### Issue: Ollama not running

```bash
# Check status
sudo systemctl status ollama

# Start Ollama
sudo systemctl start ollama

# Check logs
sudo journalctl -u ollama -f
```

### Issue: Backend not starting

```bash
# Check logs
tail -100 /var/log/aria.log

# Check if port 8000 is in use
sudo lsof -i :8000

# Kill existing process
sudo kill -9 $(sudo lsof -t -i:8000)

# Restart
./start.sh
```

### Issue: Frontend not loading

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -100 /var/log/nginx/aria_error.log

# Rebuild frontend
cd /var/www/aria/frontend
npm run build

# Reload Nginx
sudo systemctl reload nginx
```

### Issue: Database errors

```bash
# Recreate database
cd /var/www/aria/backend
rm -f /var/www/aria/aria.db
source venv/bin/activate
python create_db.py
```

### Issue: AI bots not working

```bash
# Check Ollama
ollama list
ollama pull llama3.2

# Check .env file
cat /var/www/aria/backend/.env | grep AI_PROVIDER

# Should show: AI_PROVIDER=ollama

# Test Ollama API
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": false
}'
```

---

## 📊 Monitoring & Maintenance

### Check Status

```bash
# Check all services
sudo systemctl status aria ollama nginx

# Check processes
ps aux | grep -E "(uvicorn|ollama|nginx)"

# Check logs
tail -f /var/log/aria.log
tail -f /var/log/nginx/aria_access.log
sudo journalctl -u ollama -f
```

### Update Aria

```bash
# Stop Aria
./stop.sh  # or: sudo systemctl stop aria

# Pull latest code
cd /var/www/aria
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Update database (if schema changed)
python create_db.py  # Warning: This recreates DB!

# Rebuild frontend
cd ../frontend
npm install
npm run build

# Restart Aria
cd ..
./start.sh  # or: sudo systemctl start aria
```

### Backup Database

```bash
# Backup SQLite database
cp /var/www/aria/aria.db /var/backups/aria_$(date +%Y%m%d).db

# Create automated backup script
cat > /var/www/aria/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/aria"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
cp /var/www/aria/aria.db $BACKUP_DIR/aria_$DATE.db
# Keep only last 7 days
find $BACKUP_DIR -name "aria_*.db" -mtime +7 -delete
echo "✅ Backup created: aria_$DATE.db"
EOF

chmod +x /var/www/aria/backup.sh

# Add to crontab (daily backup at 2am)
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/aria/backup.sh") | crontab -
```

---

## 🎉 Deployment Complete!

Your Aria ERP is now running with:

✅ Fresh installation (no old data)  
✅ Ollama AI (llama3.2 model)  
✅ 44+ database tables  
✅ 8 real AI bots  
✅ Nginx reverse proxy  
✅ SSL enabled  
✅ Systemd service (auto-restart)  

**Access your Aria instance**:
- Website: https://aria.vantax.co.za
- API: https://aria.vantax.co.za/api
- Health: https://aria.vantax.co.za/api/health

**Default Admin User**: Create via API or UI

**Next Steps**:
1. ✅ Create admin user
2. ✅ Create demo tenant
3. ✅ Test all 8 bots
4. ✅ Generate demo data
5. ✅ Invite alpha testers

---

## 📞 Support

If you encounter issues:

1. Check logs: `tail -f /var/log/aria.log`
2. Check Ollama: `sudo systemctl status ollama`
3. Check Nginx: `sudo systemctl status nginx`
4. Review this guide's troubleshooting section

**Made with 🇿🇦 for South African businesses**
