# 🔧 Aria Document Management System - Administrator Guide

## System Administration & Configuration 🛠️

This comprehensive administrator guide provides detailed instructions for managing, configuring, and maintaining the Aria Document Management System. This guide is intended for system administrators, IT professionals, and technical staff responsible for the operation of Aria.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Installation & Setup](#installation--setup)
3. [User Management](#user-management)
4. [Security Configuration](#security-configuration)
5. [System Monitoring](#system-monitoring)
6. [Backup & Recovery](#backup--recovery)
7. [Performance Optimization](#performance-optimization)
8. [Troubleshooting](#troubleshooting)
9. [API Management](#api-management)
10. [Maintenance Procedures](#maintenance-procedures)

---

## 🏗️ System Overview

### Architecture

Aria is built on a modern, scalable architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React/Vite)  │◄──►│   (FastAPI)     │◄──►│   (SQLite)      │
│   Port: 12001   │    │   Port: 8000    │    │   File-based    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Nginx         │
                    │   (Reverse      │
                    │   Proxy/SSL)    │
                    │   Port: 80/443  │
                    └─────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation

**Backend:**
- FastAPI (Python 3.11)
- SQLAlchemy ORM
- Pydantic for data validation
- JWT for authentication

**Infrastructure:**
- Nginx reverse proxy
- PM2 process manager
- Redis for caching
- SSL/TLS encryption

**Monitoring:**
- Structured JSON logging
- Health check endpoints
- Performance metrics
- Security event logging

### System Requirements

**Production Server:**
- **OS:** Ubuntu 20.04 LTS or newer
- **CPU:** 4+ cores (8+ recommended)
- **RAM:** 8GB minimum (16GB+ recommended)
- **Storage:** 100GB+ SSD
- **Network:** 1Gbps connection

**Development Environment:**
- **OS:** Windows 10+, macOS 10.15+, or Linux
- **Node.js:** 18.0+
- **Python:** 3.11+
- **Git:** Latest version

---

## 🚀 Installation & Setup

### Production Deployment

#### Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3.11 python3.11-venv python3-pip nodejs npm nginx redis-server

# Install PM2 globally
sudo npm install -g pm2
```

#### Application Setup
```bash
# Clone repository
git clone https://github.com/Reshigan/Aria---Document-Management-Employee.git
cd Aria---Document-Management-Employee

# Backend setup
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install aiosqlite

# Frontend setup
cd ../frontend-vite
npm install
npm run build

# Return to root
cd ..
```

#### Database Initialization
```bash
cd backend
python -c "
from models import Base
from sqlalchemy import create_engine
engine = create_engine('sqlite:///./aria.db')
Base.metadata.create_all(bind=engine)
print('Database initialized successfully')
"
```

#### Process Management
```bash
# Start backend with PM2
pm2 start ecosystem.config.js --only aria-backend

# Start frontend with PM2
pm2 start ecosystem.config.js --only aria-frontend-vite

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/aria-production
server {
    listen 80;
    server_name aria.vantax.co.za;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name aria.vantax.co.za;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/aria.vantax.co.za/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aria.vantax.co.za/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend
    location / {
        proxy_pass http://localhost:12001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health checks
    location /health {
        proxy_pass http://localhost:8000/health;
        access_log off;
    }
}
```

#### SSL Certificate Setup
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d aria.vantax.co.za

# Test auto-renewal
sudo certbot renew --dry-run
```

### Development Setup

#### Local Development
```bash
# Backend development server
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Frontend development server
cd frontend-vite
npm run dev
```

#### Environment Variables
Create `.env` files for configuration:

**Backend (.env):**
```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///./aria.db
ENVIRONMENT=development
LOG_LEVEL=DEBUG
REDIS_URL=redis://localhost:6379
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:8000
VITE_ENVIRONMENT=development
```

---

## 👥 User Management

### Default Users

The system comes with pre-configured users:

| Username | Email | Password | Role | Purpose |
|----------|-------|----------|------|---------|
| admin | admin@aria.vantax.co.za | admin123 | Administrator | Full system access |
| demo | demo@aria.vantax.co.za | demo123 | User | Demonstration account |

### Creating Users

#### Via API
```bash
curl -X POST "https://aria.vantax.co.za/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "user@company.com",
    "password": "SecurePassword123!",
    "full_name": "New User"
  }'
```

#### Via Database
```python
from models import User
from sqlalchemy.orm import Session
from core.database import get_db
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_user(username, email, password, full_name, is_superuser=False):
    db = next(get_db())
    hashed_password = pwd_context.hash(password)
    
    user = User(
        username=username,
        email=email,
        password_hash=hashed_password,
        full_name=full_name,
        is_superuser=is_superuser,
        is_active=True
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

### User Roles and Permissions

#### Role Hierarchy
1. **Super Administrator**
   - Complete system control
   - User management
   - System configuration
   - Security settings

2. **Administrator**
   - User management (non-admin)
   - Document management
   - Reporting access
   - Limited system settings

3. **Manager**
   - Team document access
   - User supervision
   - Department reporting
   - Workflow management

4. **User**
   - Personal documents
   - Assigned documents
   - Basic features
   - Profile management

5. **Guest**
   - Read-only access
   - Limited document access
   - No upload permissions
   - Temporary access

#### Permission Matrix

| Feature | Super Admin | Admin | Manager | User | Guest |
|---------|-------------|-------|---------|------|-------|
| User Management | ✅ | ✅* | ✅** | ❌ | ❌ |
| System Config | ✅ | ❌ | ❌ | ❌ | ❌ |
| All Documents | ✅ | ✅ | ✅*** | ❌ | ❌ |
| Upload Documents | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete Documents | ✅ | ✅ | ✅*** | ✅**** | ❌ |
| View Reports | ✅ | ✅ | ✅*** | ✅**** | ❌ |
| API Access | ✅ | ✅ | ✅ | ✅ | ❌ |

*Non-admin users only  
**Team members only  
***Department only  
****Own documents only

---

## 🔒 Security Configuration

### Authentication Settings

#### JWT Configuration
```python
# backend/core/auth.py
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
```

#### Password Policy
```python
# Password requirements
MIN_PASSWORD_LENGTH = 8
REQUIRE_UPPERCASE = True
REQUIRE_LOWERCASE = True
REQUIRE_NUMBERS = True
REQUIRE_SYMBOLS = True
PASSWORD_HISTORY_COUNT = 5
PASSWORD_EXPIRY_DAYS = 90
```

#### Multi-Factor Authentication
```python
# Enable MFA for admin users
MFA_REQUIRED_FOR_ADMIN = True
MFA_METHODS = ["totp", "sms", "email"]
MFA_BACKUP_CODES_COUNT = 10
```

### Access Control

#### IP Whitelisting
```nginx
# Nginx configuration for IP restrictions
location /api/admin/ {
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    deny all;
    
    proxy_pass http://localhost:8000/api/admin/;
}
```

#### Rate Limiting
```python
# FastAPI rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, ...):
    # Login logic
```

### Security Monitoring

#### Failed Login Tracking
```python
# Track failed login attempts
FAILED_LOGIN_THRESHOLD = 5
LOCKOUT_DURATION_MINUTES = 15
LOCKOUT_ESCALATION = True  # Increase duration with repeated failures
```

#### Security Events
Monitor these security events:
- Failed login attempts
- Privilege escalation attempts
- Unusual access patterns
- File access violations
- Configuration changes
- API abuse

#### Audit Logging
```python
# Security audit log format
{
    "timestamp": "2025-10-18T10:30:00Z",
    "event_type": "login_failure",
    "user_id": "user123",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "details": {
        "username": "attempted_user",
        "failure_reason": "invalid_password",
        "attempt_count": 3
    }
}
```

### Data Protection

#### Encryption at Rest
```python
# Database encryption
DATABASE_ENCRYPTION_KEY = os.getenv("DB_ENCRYPTION_KEY")
ENCRYPT_SENSITIVE_FIELDS = True
ENCRYPTION_ALGORITHM = "AES-256-GCM"
```

#### Encryption in Transit
- TLS 1.3 for all HTTPS connections
- Certificate pinning for API clients
- HSTS headers for browser security
- Secure cookie settings

#### Data Anonymization
```python
# Personal data anonymization
def anonymize_user_data(user_id):
    """Anonymize user data for GDPR compliance"""
    user = db.query(User).filter(User.id == user_id).first()
    user.email = f"anonymized_{user.id}@deleted.local"
    user.full_name = "Deleted User"
    user.is_active = False
    db.commit()
```

---

## 📊 System Monitoring

### Health Checks

#### Endpoint Monitoring
```bash
# Basic health check
curl https://aria.vantax.co.za/health

# Detailed health check
curl https://aria.vantax.co.za/api/health/detailed

# Kubernetes probes
curl https://aria.vantax.co.za/api/health/ready
curl https://aria.vantax.co.za/api/health/live
```

#### Automated Monitoring Script
```bash
#!/bin/bash
# /opt/aria/scripts/health-monitor.sh

HEALTH_URL="https://aria.vantax.co.za/api/health/detailed"
LOG_FILE="/var/log/aria/health-monitor.log"
ALERT_EMAIL="admin@vantax.co.za"

check_health() {
    response=$(curl -s -w "%{http_code}" "$HEALTH_URL")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        status=$(echo "$body" | jq -r '.status')
        if [ "$status" = "healthy" ]; then
            echo "$(date): System healthy" >> "$LOG_FILE"
            return 0
        else
            echo "$(date): System degraded - $body" >> "$LOG_FILE"
            return 1
        fi
    else
        echo "$(date): Health check failed - HTTP $http_code" >> "$LOG_FILE"
        return 2
    fi
}

# Run health check
if ! check_health; then
    echo "Health check failed - sending alert" | mail -s "Aria Health Alert" "$ALERT_EMAIL"
fi
```

### Performance Metrics

#### Key Performance Indicators
- **Response Time:** API endpoint response times
- **Throughput:** Requests per second
- **Error Rate:** Percentage of failed requests
- **Uptime:** System availability percentage
- **Resource Usage:** CPU, memory, disk utilization

#### Metrics Collection
```python
# Performance metrics endpoint
@app.get("/api/metrics")
async def get_metrics():
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "system": {
            "cpu_usage": psutil.cpu_percent(),
            "memory_usage": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent
        },
        "application": {
            "active_users": get_active_user_count(),
            "total_documents": get_document_count(),
            "requests_per_minute": get_request_rate(),
            "average_response_time": get_avg_response_time()
        }
    }
```

### Log Management

#### Log Locations
```
/var/log/aria/
├── application.log      # General application logs
├── errors.log          # Error logs only
├── access.log          # HTTP access logs
├── security.log        # Security events
├── performance.log     # Performance metrics
└── health-monitor.log  # Health check results
```

#### Log Rotation
```bash
# /etc/logrotate.d/aria
/var/log/aria/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
        pm2 reload all
    endscript
}
```

#### Log Analysis
```bash
# Common log analysis commands

# Check error frequency
grep "ERROR" /var/log/aria/application.log | wc -l

# Find failed login attempts
grep "login_failure" /var/log/aria/security.log

# Monitor response times
grep "response_time" /var/log/aria/performance.log | tail -100

# Check system health
tail -f /var/log/aria/health-monitor.log
```

---

## 💾 Backup & Recovery

### Automated Backup System

#### Database Backup
```bash
#!/bin/bash
# /opt/aria/scripts/backup-database.sh

BACKUP_DIR="/var/backups/aria"
DB_FILE="/path/to/aria.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/aria_db_$TIMESTAMP.db"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create database backup
cp "$DB_FILE" "$BACKUP_FILE"
gzip "$BACKUP_FILE"

# Remove backups older than 7 days
find "$BACKUP_DIR" -name "aria_db_*.db.gz" -mtime +7 -delete

echo "Database backup completed: $BACKUP_FILE.gz"
```

#### Full System Backup
```bash
#!/bin/bash
# /opt/aria/scripts/backup-system.sh

BACKUP_DIR="/var/backups/aria"
APP_DIR="/path/to/Aria---Document-Management-Employee"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create full system backup
tar -czf "$BACKUP_DIR/aria_full_$TIMESTAMP.tar.gz" \
    --exclude="node_modules" \
    --exclude="__pycache__" \
    --exclude="*.log" \
    "$APP_DIR"

# Upload to cloud storage (optional)
# aws s3 cp "$BACKUP_DIR/aria_full_$TIMESTAMP.tar.gz" s3://aria-backups/

echo "Full system backup completed: aria_full_$TIMESTAMP.tar.gz"
```

#### Backup Schedule
```bash
# Crontab entries
# Database backup every 6 hours
0 */6 * * * /opt/aria/scripts/backup-database.sh

# Full system backup daily at 2 AM
0 2 * * * /opt/aria/scripts/backup-system.sh

# Log cleanup weekly
0 3 * * 0 /opt/aria/scripts/cleanup-logs.sh
```

### Recovery Procedures

#### Database Recovery
```bash
# Stop application
pm2 stop all

# Restore database from backup
gunzip -c /var/backups/aria/aria_db_20251018_020000.db.gz > /path/to/aria.db

# Restart application
pm2 start all

# Verify system health
curl https://aria.vantax.co.za/api/health/detailed
```

#### Full System Recovery
```bash
# Extract system backup
tar -xzf /var/backups/aria/aria_full_20251018_020000.tar.gz -C /tmp/

# Stop services
pm2 stop all
sudo systemctl stop nginx

# Replace application files
sudo cp -r /tmp/Aria---Document-Management-Employee/* /path/to/current/

# Restore permissions
sudo chown -R www-data:www-data /path/to/current/
sudo chmod +x /path/to/current/scripts/*.sh

# Restart services
sudo systemctl start nginx
pm2 start all
```

#### Disaster Recovery Plan

1. **Assessment Phase**
   - Identify scope of failure
   - Determine recovery point objective (RPO)
   - Determine recovery time objective (RTO)

2. **Recovery Phase**
   - Restore from most recent backup
   - Verify data integrity
   - Test system functionality
   - Validate user access

3. **Verification Phase**
   - Run health checks
   - Test critical workflows
   - Verify security settings
   - Monitor system performance

4. **Communication Phase**
   - Notify stakeholders
   - Document incident
   - Update recovery procedures
   - Conduct post-mortem review

---

## ⚡ Performance Optimization

### Database Optimization

#### Index Management
```sql
-- Create performance indexes
CREATE INDEX idx_users_email_active ON users(email, is_active);
CREATE INDEX idx_users_username_active ON users(username, is_active);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_type_status ON documents(document_type, status);
CREATE INDEX idx_documents_user_id ON documents(user_id);
```

#### Database Maintenance
```bash
#!/bin/bash
# Database optimization script

sqlite3 /path/to/aria.db << EOF
-- Analyze database statistics
ANALYZE;

-- Vacuum database to reclaim space
VACUUM;

-- Update table statistics
UPDATE sqlite_stat1 SET stat = NULL;
ANALYZE;
EOF

echo "Database optimization completed"
```

### Application Performance

#### Caching Strategy
```python
# Redis caching configuration
import redis
from functools import wraps

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def cache_result(expiration=300):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached_result = redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            redis_client.setex(cache_key, expiration, json.dumps(result))
            return result
        return wrapper
    return decorator
```

#### Connection Pooling
```python
# Database connection pooling
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

### Infrastructure Optimization

#### Nginx Optimization
```nginx
# Performance optimizations
worker_processes auto;
worker_connections 1024;

# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/json
    application/javascript
    application/xml+rss
    application/atom+xml
    image/svg+xml;

# Enable caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Enable HTTP/2
listen 443 ssl http2;
```

#### PM2 Optimization
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'aria-backend',
    script: 'uvicorn',
    args: 'main:app --host 0.0.0.0 --port 8000 --workers 4',
    cwd: './backend',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PYTHONPATH: '.'
    }
  }, {
    name: 'aria-frontend-vite',
    script: 'npm',
    args: 'run preview -- --host 0.0.0.0 --port 12001',
    cwd: './frontend-vite',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '512M'
  }]
};
```

---

## 🔧 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs aria-backend
pm2 logs aria-frontend-vite

# Restart services
pm2 restart all

# Check system resources
htop
df -h
```

#### Database Connection Issues
```bash
# Check database file permissions
ls -la /path/to/aria.db

# Test database connectivity
sqlite3 /path/to/aria.db "SELECT COUNT(*) FROM users;"

# Check for database locks
lsof /path/to/aria.db
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/aria.vantax.co.za/fullchain.pem -text -noout

# Test SSL configuration
openssl s_client -connect aria.vantax.co.za:443

# Renew certificate
sudo certbot renew --force-renewal
```

#### Performance Issues
```bash
# Check system resources
top
iostat -x 1
free -h

# Check network connectivity
ping aria.vantax.co.za
traceroute aria.vantax.co.za

# Analyze slow queries
grep "slow" /var/log/aria/performance.log
```

### Diagnostic Commands

#### System Health Check
```bash
#!/bin/bash
# System diagnostic script

echo "=== System Information ==="
uname -a
uptime
df -h
free -h

echo "=== Service Status ==="
pm2 status
sudo systemctl status nginx
sudo systemctl status redis-server

echo "=== Network Connectivity ==="
curl -I https://aria.vantax.co.za/health

echo "=== Log Analysis ==="
tail -20 /var/log/aria/application.log
tail -20 /var/log/aria/errors.log

echo "=== Database Status ==="
sqlite3 /path/to/aria.db "SELECT COUNT(*) as user_count FROM users;"
sqlite3 /path/to/aria.db "SELECT COUNT(*) as document_count FROM documents;"
```

#### Performance Analysis
```bash
# Analyze API response times
grep "response_time" /var/log/aria/performance.log | \
  awk '{print $NF}' | \
  sort -n | \
  awk '{
    count++; 
    sum+=$1; 
    if(count==1) min=$1; 
    max=$1
  } 
  END {
    print "Count:", count
    print "Average:", sum/count "ms"
    print "Min:", min "ms"
    print "Max:", max "ms"
  }'
```

---

## 🔌 API Management

### API Documentation

#### OpenAPI/Swagger
Access interactive API documentation:
- **Swagger UI:** https://aria.vantax.co.za/api/docs
- **ReDoc:** https://aria.vantax.co.za/api/redoc

#### Authentication
```bash
# Get access token
curl -X POST "https://aria.vantax.co.za/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Use token in requests
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://aria.vantax.co.za/api/users/me"
```

### API Rate Limiting

#### Configuration
```python
# Rate limiting settings
RATE_LIMIT_REQUESTS_PER_MINUTE = 60
RATE_LIMIT_BURST = 10
RATE_LIMIT_STORAGE = "redis://localhost:6379"

# Apply rate limiting
@limiter.limit("60/minute")
@app.get("/api/documents")
async def get_documents(request: Request):
    # API logic
```

#### Monitoring
```bash
# Check rate limit violations
grep "rate_limit_exceeded" /var/log/aria/access.log

# Monitor API usage by endpoint
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -nr
```

### API Security

#### Input Validation
```python
# Pydantic models for validation
class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    category: str = Field(..., regex="^[a-zA-Z0-9_-]+$")
    
    @validator('title')
    def validate_title(cls, v):
        if not v.strip():
            raise ValueError('Title cannot be empty')
        return v.strip()
```

#### API Key Management
```python
# API key authentication
class APIKeyAuth:
    def __init__(self, api_key: str):
        self.api_key = api_key
    
    async def __call__(self, request: Request):
        api_key = request.headers.get("X-API-Key")
        if not api_key or api_key != self.api_key:
            raise HTTPException(status_code=401, detail="Invalid API key")
        return api_key
```

---

## 🛠️ Maintenance Procedures

### Regular Maintenance Tasks

#### Daily Tasks
- [ ] Check system health status
- [ ] Review error logs
- [ ] Monitor disk space usage
- [ ] Verify backup completion
- [ ] Check security alerts

#### Weekly Tasks
- [ ] Analyze performance metrics
- [ ] Review user activity logs
- [ ] Update system packages
- [ ] Clean up temporary files
- [ ] Test backup restoration

#### Monthly Tasks
- [ ] Security audit review
- [ ] Performance optimization
- [ ] Database maintenance
- [ ] SSL certificate check
- [ ] Disaster recovery test

### Update Procedures

#### Application Updates
```bash
#!/bin/bash
# Application update script

# Backup current version
cp -r /path/to/current /path/to/backup-$(date +%Y%m%d)

# Stop services
pm2 stop all

# Pull latest changes
cd /path/to/current
git pull origin main

# Update dependencies
cd backend
pip install -r requirements.txt

cd ../frontend-vite
npm install
npm run build

# Run database migrations (if any)
cd ../backend
python migrate.py

# Restart services
pm2 start all

# Verify deployment
curl https://aria.vantax.co.za/api/health/detailed
```

#### System Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js (if needed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Update Python packages
pip install --upgrade pip
pip install --upgrade -r requirements.txt

# Restart services
sudo systemctl restart nginx
pm2 restart all
```

### Security Maintenance

#### Certificate Renewal
```bash
# Check certificate expiration
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Test renewal process
sudo certbot renew --dry-run
```

#### Security Updates
```bash
# Update security packages
sudo apt update
sudo apt list --upgradable | grep -i security
sudo apt upgrade

# Check for vulnerabilities
npm audit
pip-audit

# Update firewall rules (if needed)
sudo ufw status
sudo ufw reload
```

---

## 📞 Support and Escalation

### Support Levels

#### Level 1 - Basic Support
- User account issues
- Password resets
- Basic functionality questions
- Documentation requests

#### Level 2 - Technical Support
- System configuration issues
- Performance problems
- Integration difficulties
- Advanced feature support

#### Level 3 - Expert Support
- System architecture issues
- Security incidents
- Data recovery
- Custom development

### Escalation Procedures

#### Severity Levels

**Critical (P1)**
- System completely down
- Security breach
- Data loss
- Response time: 1 hour

**High (P2)**
- Major functionality impaired
- Performance severely degraded
- Multiple users affected
- Response time: 4 hours

**Medium (P3)**
- Minor functionality issues
- Single user affected
- Workaround available
- Response time: 24 hours

**Low (P4)**
- Enhancement requests
- Documentation updates
- Training requests
- Response time: 72 hours

### Contact Information

**Primary Support:**
- Email: support@aria.vantax.co.za
- Phone: +27 (0)11 123-4567
- Hours: Monday-Friday, 8 AM - 6 PM SAST

**Emergency Support:**
- Email: emergency@aria.vantax.co.za
- Phone: +27 (0)82 123-4567
- Hours: 24/7 for P1 issues

**Development Team:**
- Email: dev@aria.vantax.co.za
- Slack: #aria-support
- GitHub: Issues and pull requests

---

## 📋 Appendices

### Appendix A: Configuration Files

#### Environment Variables
```bash
# Production environment variables
export SECRET_KEY="your-production-secret-key"
export DATABASE_URL="sqlite:///./aria.db"
export REDIS_URL="redis://localhost:6379"
export ENVIRONMENT="production"
export LOG_LEVEL="INFO"
export BACKUP_RETENTION_DAYS="30"
export MAX_UPLOAD_SIZE="104857600"  # 100MB
export ALLOWED_FILE_TYPES="pdf,doc,docx,xls,xlsx,ppt,pptx,txt,jpg,png"
```

#### Nginx Configuration Template
```nginx
# Complete Nginx configuration
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name aria.vantax.co.za;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/aria.vantax.co.za/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aria.vantax.co.za/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Logging
    access_log /var/log/nginx/aria_access.log;
    error_log /var/log/nginx/aria_error.log;
    
    # Frontend
    location / {
        proxy_pass http://localhost:12001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        
        # Rate limiting
        limit_req zone=api burst=10 nodelay;
    }
    
    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
    }
    
    # Health checks
    location /health {
        proxy_pass http://localhost:8000/health;
        access_log off;
    }
}

# Rate limiting
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

### Appendix B: Database Schema

#### Core Tables
```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100),
    document_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Audit log table
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

### Appendix C: Monitoring Queries

#### System Health Queries
```sql
-- Active users count
SELECT COUNT(*) as active_users 
FROM users 
WHERE is_active = 1 AND last_login > datetime('now', '-30 days');

-- Document statistics
SELECT 
    document_type,
    COUNT(*) as count,
    SUM(file_size) as total_size
FROM documents 
WHERE status = 'active'
GROUP BY document_type;

-- Recent activity
SELECT 
    u.username,
    a.action,
    a.resource_type,
    a.created_at
FROM audit_log a
JOIN users u ON a.user_id = u.id
WHERE a.created_at > datetime('now', '-24 hours')
ORDER BY a.created_at DESC
LIMIT 100;
```

---

**Document Version:** 2.0.0  
**Last Updated:** October 18, 2025  
**Next Review:** January 18, 2026  

*© 2025 Vantax Solutions - All Rights Reserved*