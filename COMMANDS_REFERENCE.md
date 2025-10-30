# 🎯 ARIA System - Commands Reference

**Quick reference for all deployment and management commands**

---

## 🚀 Deployment Commands

### One-Command Deployment (Recommended)
```bash
# Setup and deploy everything
./deploy_complete.sh
```

### Environment Setup
```bash
# Interactive environment configuration
./setup_production_env.sh
```

### Docker Deployment
```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Stop all services
docker-compose -f docker-compose.production.yml down

# Rebuild containers
docker-compose -f docker-compose.production.yml build --no-cache
```

### Manual Backend Deployment
```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Start backend
uvicorn main:app --host 0.0.0.0 --port 8000
# or
python api.py
```

### Manual Frontend Deployment
```bash
cd frontend

# Install dependencies
npm install

# Development mode
npm run dev

# Production build
npm run build
npm start
```

---

## 🧪 Testing Commands

### Run All Bot Tests
```bash
cd backend
python tests/simple_e2e_test.py
```

### Test Specific Bot
```bash
cd backend
python -c "from bots.invoice_processing_bot import InvoiceProcessingBot; bot = InvoiceProcessingBot(); print(bot.get_capabilities())"
```

### Run with Verbose Output
```bash
cd backend
python tests/simple_e2e_test.py --verbose
```

---

## 🔍 Health Check Commands

### Backend Health
```bash
# Using curl
curl http://localhost:8000/health

# Using wget
wget -qO- http://localhost:8000/health

# Using httpie
http localhost:8000/health
```

### Frontend Health
```bash
curl http://localhost:3000

# Docker
docker exec aria-frontend-prod curl -f http://localhost:3000
```

### Database Health
```bash
# PostgreSQL
psql -U aria_user -d aria_production -c "SELECT 1;"

# Check if PostgreSQL is running
sudo systemctl status postgresql

# SQLite
sqlite3 aria_production.db "SELECT 1;"
```

### Redis Health
```bash
# Ping Redis
redis-cli ping

# Check if Redis is running
sudo systemctl status redis

# With password
redis-cli -a your_password ping
```

---

## 📊 Monitoring Commands

### View Logs
```bash
# Backend logs
tail -f logs/backend.log

# Frontend logs
tail -f logs/frontend.log

# Follow all logs
tail -f logs/*.log

# Docker logs
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend
```

### Check Running Processes
```bash
# All ARIA processes
ps aux | grep -E 'aria|uvicorn|python.*api.py|npm.*dev|next'

# Backend processes
ps aux | grep -E 'uvicorn|python.*api.py'

# Frontend processes
ps aux | grep -E 'npm.*dev|next'

# Docker containers
docker ps | grep aria
```

### Check Port Usage
```bash
# Check if port 8000 is in use
lsof -i :8000

# Check if port 3000 is in use
lsof -i :3000

# Check all ARIA ports
lsof -i :8000 && lsof -i :3000
```

### System Resources
```bash
# CPU and memory usage
htop

# Or using top
top

# Docker resources
docker stats

# Disk usage
df -h
```

---

## 🛑 Stop/Kill Commands

### Stop Backend
```bash
# Find process ID
lsof -i :8000 | grep LISTEN | awk '{print $2}'

# Kill by PID
kill -9 <PID>

# Or kill all uvicorn processes
pkill -f uvicorn

# Docker
docker stop aria-backend-prod
```

### Stop Frontend
```bash
# Find process ID
lsof -i :3000 | grep LISTEN | awk '{print $2}'

# Kill by PID
kill -9 <PID>

# Or kill npm/next processes
pkill -f "npm.*dev"
pkill -f next

# Docker
docker stop aria-frontend-prod
```

### Stop All Services
```bash
# Docker Compose
docker-compose -f docker-compose.production.yml down

# Kill all ARIA processes
pkill -f 'aria|uvicorn|python.*api.py'
```

---

## 🔧 Management Commands

### Database Operations

#### PostgreSQL
```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE aria_production;"

# Create user
sudo -u postgres psql -c "CREATE USER aria_user WITH PASSWORD 'password';"

# Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE aria_production TO aria_user;"

# Backup database
pg_dump -U aria_user aria_production > backup_$(date +%Y%m%d).sql

# Restore database
psql -U aria_user aria_production < backup.sql

# Connect to database
psql -U aria_user -d aria_production
```

#### SQLite
```bash
# Open database
sqlite3 aria_production.db

# Backup database
cp aria_production.db backup_$(date +%Y%m%d).db

# View tables
sqlite3 aria_production.db ".tables"

# Export to SQL
sqlite3 aria_production.db ".dump" > backup.sql
```

### Git Operations
```bash
# Check status
git status

# View recent commits
git log --oneline -10

# Pull latest changes
git pull origin main

# Push changes
git add .
git commit -m "Your message"
git push origin main

# View remote URL
git remote -v
```

### Environment Management
```bash
# View environment file
cat .env.production

# Edit environment file
nano .env.production
# or
vim .env.production

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# View specific variable
echo $DATABASE_URL
```

---

## 🔐 Security Commands

### Generate Secret Key
```bash
# Using openssl
openssl rand -hex 32

# Using Python
python -c "import secrets; print(secrets.token_hex(32))"

# Using /dev/urandom
head -c 32 /dev/urandom | base64
```

### SSL/TLS Setup
```bash
# Generate self-signed certificate (development only)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Check certificate
openssl x509 -in cert.pem -text -noout

# Verify certificate chain
openssl verify -CAfile ca-bundle.crt cert.pem
```

### Permissions
```bash
# Make scripts executable
chmod +x deploy_complete.sh
chmod +x setup_production_env.sh

# Set proper ownership
chown -R www-data:www-data /opt/aria

# Secure environment file
chmod 600 .env.production
```

---

## 📦 Package Management

### Python Dependencies
```bash
cd backend

# Install all dependencies
pip install -r requirements.txt

# Install specific package
pip install package-name

# Update all packages
pip list --outdated | cut -d ' ' -f1 | xargs -n1 pip install -U

# Freeze dependencies
pip freeze > requirements.txt
```

### Node.js Dependencies
```bash
cd frontend

# Install all dependencies
npm install

# Install specific package
npm install package-name

# Update all packages
npm update

# Check for outdated packages
npm outdated

# Audit for vulnerabilities
npm audit
npm audit fix
```

---

## 🔍 Debugging Commands

### Check Bot Status
```bash
# List all bots via API
curl http://localhost:8000/api/bots

# Get bot details
curl http://localhost:8000/api/bots/invoice_processing

# Execute bot
curl -X POST http://localhost:8000/api/bots/invoice_processing/execute \
  -H "Content-Type: application/json" \
  -d '{"data": {"test": true}}'
```

### Python Debug
```bash
cd backend

# Interactive Python shell
python

# Import and test bot
from bots.invoice_processing_bot import InvoiceProcessingBot
bot = InvoiceProcessingBot()
print(bot.get_capabilities())
```

### Network Debugging
```bash
# Test connectivity
ping localhost
ping google.com

# Check DNS
nslookup example.com

# Check open ports
netstat -tuln | grep -E '8000|3000'

# Test HTTP endpoint
curl -v http://localhost:8000/health

# Check firewall
sudo ufw status
```

---

## 📊 API Testing

### Using cURL
```bash
# GET request
curl http://localhost:8000/api/bots

# POST request
curl -X POST http://localhost:8000/api/bots/execute \
  -H "Content-Type: application/json" \
  -d '{"bot_id": "invoice_processing", "data": {}}'

# With authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/protected
```

### Using HTTPie
```bash
# Install httpie
pip install httpie

# GET request
http localhost:8000/api/bots

# POST request
http POST localhost:8000/api/bots/execute \
  bot_id=invoice_processing data:='{"test": true}'
```

### Access Swagger UI
```bash
# Open in browser
open http://localhost:8000/docs

# Or using curl to get OpenAPI spec
curl http://localhost:8000/openapi.json
```

---

## 🔄 Restart Commands

### Systemd Service (if configured)
```bash
# Start service
sudo systemctl start aria

# Stop service
sudo systemctl stop aria

# Restart service
sudo systemctl restart aria

# Check status
sudo systemctl status aria

# Enable auto-start
sudo systemctl enable aria

# Disable auto-start
sudo systemctl disable aria

# View logs
sudo journalctl -u aria -f
```

### PM2 Process Manager (if used)
```bash
# Install PM2
npm install -g pm2

# Start backend
pm2 start backend/api.py --name aria-backend

# Start frontend
pm2 start frontend/package.json --name aria-frontend

# List processes
pm2 list

# Restart
pm2 restart aria-backend

# Stop
pm2 stop aria-backend

# Delete
pm2 delete aria-backend

# View logs
pm2 logs aria-backend

# Save configuration
pm2 save

# Auto-start on boot
pm2 startup
```

---

## 📚 Documentation

### View Documentation
```bash
# API Documentation
open http://localhost:8000/docs

# ReDoc
open http://localhost:8000/redoc

# View markdown files
cat DEPLOYMENT_GUIDE.md
cat PRODUCTION_SUMMARY.md
cat README.md
```

### Generate Documentation
```bash
# Python docstrings to HTML
pdoc --html backend/bots --output-dir docs

# Create requirements graph
pipdeptree --graph-output png > requirements-graph.png
```

---

## 🎯 Quick Actions

### Full Restart
```bash
# Stop everything
docker-compose -f docker-compose.production.yml down
pkill -f 'uvicorn|npm.*dev'

# Start everything
./deploy_complete.sh
```

### Quick Test
```bash
# Test all bots
cd backend && python tests/simple_e2e_test.py

# Test API
curl http://localhost:8000/health
```

### Quick Status Check
```bash
# Check all services
curl http://localhost:8000/health && \
curl http://localhost:3000 && \
psql -U aria_user -d aria_production -c "SELECT 1;" && \
redis-cli ping
```

---

## 📞 Help & Support

### Get Help
```bash
# Script help
./deploy_complete.sh --help
./setup_production_env.sh --help

# Python help
python --help
pip --help

# Docker help
docker --help
docker-compose --help

# Git help
git --help
git <command> --help
```

### View Versions
```bash
# Python version
python3 --version

# Node version
node --version
npm --version

# Docker version
docker --version
docker-compose --version

# Database versions
psql --version
redis-cli --version
```

---

## 🎊 Useful Aliases (Optional)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# ARIA aliases
alias aria-deploy='cd /path/to/aria && ./deploy_complete.sh'
alias aria-test='cd /path/to/aria/backend && python tests/simple_e2e_test.py'
alias aria-logs='tail -f /path/to/aria/logs/*.log'
alias aria-health='curl http://localhost:8000/health'
alias aria-api='open http://localhost:8000/docs'
alias aria-stop='docker-compose -f /path/to/aria/docker-compose.production.yml down'
alias aria-start='docker-compose -f /path/to/aria/docker-compose.production.yml up -d'
```

---

**Project:** ARIA - Document Management & ERP System  
**Version:** 1.0.0  
**Last Updated:** October 30, 2025

**For detailed deployment instructions, see:** `DEPLOYMENT_GUIDE.md`
