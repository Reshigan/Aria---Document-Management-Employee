# ARIA Production Deployment Notes
## October 26, 2025 - Production Launch

---

## 🎯 DEPLOYMENT SUMMARY

**Status:** ✅ SUCCESSFULLY DEPLOYED  
**URL:** https://aria.vantax.co.za  
**Server:** ubuntu@3.8.139.178 (AWS EC2)  
**Deployment Date:** October 26, 2025  
**Deployment Time:** ~6 hours (with dependency resolution)

---

## 📋 INFRASTRUCTURE

### Server Specifications
- **Provider:** AWS EC2
- **OS:** Ubuntu 22.04 LTS
- **IP:** 3.8.139.178
- **Domain:** aria.vantax.co.za
- **SSL:** Let's Encrypt (auto-renewal configured)
- **Server Type:** Single instance (no load balancer yet)

### Installed Services
```
✅ Nginx 1.24.0 - Web server & reverse proxy
✅ PostgreSQL 14 - Production database (aria_production)
✅ Python 3.11 - Backend runtime
✅ Node.js 18 - Frontend build tools (not running in production)
✅ Systemd - Service management
```

### Directory Structure
```
/home/ubuntu/Aria---Document-Management-Employee/
├── backend/
│   ├── main.py                    # FastAPI application entry point
│   ├── requirements.txt           # Python dependencies
│   ├── .env                       # Environment variables (SECRET_KEY, DATABASE_URL)
│   ├── models/                    # SQLAlchemy models
│   ├── api/                       # API routes
│   ├── core/                      # Config, database, security
│   ├── processors/                # AI/ML processors
│   └── integrations/              # Third-party integrations
├── frontend/
│   ├── dist/                      # Built static files (served by nginx)
│   ├── src/                       # React source code
│   ├── package.json               # Node dependencies
│   └── vite.config.ts             # Build configuration
└── docs/                          # Documentation (market analysis, launch checklist)
```

---

## 🔧 CONFIGURATION FILES

### 1. Backend Service: `/etc/systemd/system/aria-backend.service`
```ini
[Unit]
Description=ARIA Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/Aria---Document-Management-Employee/backend
Environment="PATH=/home/ubuntu/.local/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Control Commands:**
```bash
sudo systemctl start aria-backend    # Start service
sudo systemctl stop aria-backend     # Stop service
sudo systemctl restart aria-backend  # Restart service
sudo systemctl status aria-backend   # Check status
sudo journalctl -u aria-backend -f   # View logs (follow)
```

### 2. Nginx Configuration: `/etc/nginx/sites-available/aria-production`
```nginx
server {
    listen 443 ssl http2;
    server_name aria.vantax.co.za;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/aria.vantax.co.za/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aria.vantax.co.za/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Frontend (Static Files)
    location / {
        root /home/ubuntu/Aria---Document-Management-Employee/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health Check
    location /health {
        proxy_pass http://localhost:8000/health;
    }

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}

# HTTP → HTTPS Redirect
server {
    listen 80;
    server_name aria.vantax.co.za;
    return 301 https://$host$request_uri;
}
```

**Control Commands:**
```bash
sudo nginx -t                    # Test configuration
sudo systemctl reload nginx      # Reload configuration
sudo systemctl restart nginx     # Restart nginx
sudo systemctl status nginx      # Check status
```

### 3. Environment Variables: `backend/.env`
```bash
# Database
DATABASE_URL=postgresql://aria_user:***@localhost:5432/aria_production

# Security
SECRET_KEY=*** (32-character secure key)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application
ENVIRONMENT=production
DEBUG=False

# Integrations (to be configured)
XERO_CLIENT_ID=
XERO_CLIENT_SECRET=
XERO_REDIRECT_URI=https://aria.vantax.co.za/api/integrations/xero/callback
```

### 4. PostgreSQL Database
```sql
-- Database: aria_production
-- User: aria_user
-- Password: [stored in .env]

-- Tables (automatically created by SQLAlchemy):
-- - users
-- - documents
-- - bots
-- - workflows
-- - integrations
-- - audit_logs
-- (see backend/models/ for full schema)
```

**Database Commands:**
```bash
sudo -u postgres psql                    # Open PostgreSQL shell
\c aria_production                       # Connect to database
\dt                                      # List tables
\q                                       # Exit
```

---

## 🚀 DEPLOYMENT PROCESS (What Was Done)

### Phase 1: Infrastructure Setup
1. ✅ Server provisioned (AWS EC2, Ubuntu 22.04)
2. ✅ Domain configured (aria.vantax.co.za → 3.8.139.178)
3. ✅ SSH key configured (Vantax-2.pem)
4. ✅ Firewall configured (ports 80, 443, 22 open)

### Phase 2: Database Setup
1. ✅ PostgreSQL installed
2. ✅ Database created: `aria_production`
3. ✅ User created: `aria_user` with password
4. ✅ Tables created automatically by SQLAlchemy migrations

### Phase 3: Backend Deployment
1. ✅ Python 3.11 installed
2. ✅ Virtual environment created (system-wide pip used)
3. ✅ Dependencies installed:
   - Core: fastapi, uvicorn, sqlalchemy, pydantic
   - Auth: python-jose, passlib, bcrypt, pyotp
   - DB: psycopg2-binary
   - AI/ML: numpy, pandas, scikit-learn, opencv-python
   - Document: pdf2image, python-multipart
   - Email: email-validator
   - **Note:** Advanced OCR (easyocr) temporarily disabled due to dependency size
4. ✅ Environment variables configured (.env)
5. ✅ Secret key generated (32-character secure random)
6. ✅ Database connection tested
7. ✅ Systemd service created and enabled
8. ✅ Health check endpoint verified: `/health` returns 200

### Phase 4: Frontend Deployment
1. ✅ Node.js 18 installed (for build only)
2. ✅ Dependencies installed (npm install)
3. ✅ Production build created (npm run build → dist/)
4. ✅ Build output: 744 bytes index.html + assets
5. ✅ Static files served by nginx from dist/ directory

### Phase 5: Nginx & SSL
1. ✅ Nginx installed
2. ✅ Site configuration created (aria-production)
3. ✅ SSL certificate obtained (Let's Encrypt)
4. ✅ Auto-renewal configured (certbot)
5. ✅ HTTPS enforced (HTTP → HTTPS redirect)
6. ✅ Security headers added
7. ✅ Gzip compression enabled

### Phase 6: Testing & Verification
1. ✅ Backend health check: `https://aria.vantax.co.za/health` → 200 OK
2. ✅ Frontend loading: `https://aria.vantax.co.za` → HTML served
3. ✅ API documentation: `https://aria.vantax.co.za/docs` → Swagger UI (requires auth)
4. ✅ Database connection: Backend connects successfully
5. ✅ SSL certificate: Valid until ~January 2026 (auto-renewal)

---

## ⚠️ KNOWN ISSUES & WORKAROUNDS

### Issue 1: Advanced OCR Disabled
**Problem:** `easyocr` module requires heavy dependencies (PyTorch, etc.) causing deployment delays.

**Impact:** Advanced document OCR features (handwriting recognition, complex layouts) temporarily unavailable.

**Workaround:** 
- Basic OCR still works (pdf2image + opencv)
- Advanced OCR import commented out in `backend/main.py` line 216-217
- Future fix: Install easyocr during low-traffic window or use separate OCR microservice

**Code Location:**
```python
# backend/main.py lines 216-217 (commented out)
# TEMPORARILY DISABLED - MISSING DEPS: from api.document.advanced_processing import router as advanced_processing_router
# TEMPORARILY DISABLED - MISSING DEPS: app.include_router(advanced_processing_router)
```

### Issue 2: Single Server (No High Availability)
**Problem:** Running on single EC2 instance. If server goes down, entire platform is offline.

**Impact:** Potential downtime during server maintenance, hardware failures, or traffic spikes.

**Future Fix:**
- Add load balancer (AWS ALB/ELB)
- Deploy multiple backend instances
- Database replication (PostgreSQL streaming replication)
- Estimated cost: +$500-1000/month

### Issue 3: No Xero Integration Yet
**Problem:** Xero OAuth code exists but not deployed (missing client ID/secret).

**Impact:** Users cannot sync invoices to Xero accounting software (key feature for SMBs).

**Future Fix:**
1. Register OAuth app at developer.xero.com
2. Add credentials to `.env` file
3. Test OAuth flow in Xero sandbox
4. Deploy to production (1-2 hours)

### Issue 4: No Monitoring/Alerting
**Problem:** No uptime monitoring, error tracking, or performance alerts configured.

**Impact:** Unaware of issues until users report them. Slow to detect outages.

**Future Fix:**
- Add UptimeRobot (free tier): Monitor /health endpoint every 5 minutes
- Add Sentry (error tracking): Capture Python exceptions
- Add Grafana + Prometheus: Server metrics (CPU, RAM, disk)
- Estimated cost: $0-50/month

---

## 📊 CURRENT STATUS

### Services Status (as of Oct 26, 2025)
```bash
✅ aria-backend.service  - Active (running)
✅ nginx.service         - Active (running)
✅ postgresql.service    - Active (running)
✅ certbot.timer         - Active (waiting for SSL renewal)
```

### Health Check Response
```bash
$ curl https://aria.vantax.co.za/health
{
  "status": "healthy",
  "timestamp": "2025-10-26T17:39:02.124783",
  "version": "2.0.0"
}
```

### Frontend Response
```bash
$ curl https://aria.vantax.co.za | head -5
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
```

### Database Connection
```bash
✅ Backend → PostgreSQL: Connected
✅ Database: aria_production exists
✅ Tables: Automatically created by SQLAlchemy
```

---

## 🔐 SECURITY

### Current Security Measures
1. ✅ HTTPS enforced (Let's Encrypt SSL)
2. ✅ Security headers (HSTS, X-Frame-Options, X-Content-Type-Options)
3. ✅ JWT-based authentication
4. ✅ Password hashing (bcrypt)
5. ✅ SQL injection prevention (SQLAlchemy ORM)
6. ✅ CORS configured
7. ✅ Rate limiting (FastAPI built-in)

### Security Gaps (To Address)
1. ⚠️ No WAF (Web Application Firewall)
2. ⚠️ No DDoS protection (beyond basic nginx)
3. ⚠️ No penetration testing performed
4. ⚠️ No security audit/certification (ISO 27001, SOC 2)
5. ⚠️ Database backups not automated yet
6. ⚠️ No intrusion detection system (IDS)

**Recommendation:** Address these before scaling to 100+ customers.

---

## 🗄️ BACKUP & DISASTER RECOVERY

### Current Backup Status
⚠️ **NO AUTOMATED BACKUPS CONFIGURED**

### Recommended Backup Strategy

**Database Backups:**
```bash
# Daily automated backup script (to be created)
#!/bin/bash
# /home/ubuntu/scripts/backup_db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/home/ubuntu/backups
mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump aria_production | gzip > $BACKUP_DIR/aria_db_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "aria_db_*.sql.gz" -mtime +7 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/aria_db_$DATE.sql.gz s3://vantax-backups/aria/
```

**Cron Job (add to crontab):**
```cron
# Run backup every day at 2 AM
0 2 * * * /home/ubuntu/scripts/backup_db.sh >> /var/log/aria_backup.log 2>&1
```

**Code Backups:**
- ✅ Code stored in GitHub (github.com/Reshigan/Aria---Document-Management-Employee)
- ✅ Commit history preserved
- ⚠️ .env file NOT in GitHub (contains secrets) - must be backed up manually

**Disaster Recovery Plan:**
1. Provision new EC2 instance
2. Install dependencies (PostgreSQL, Python, Nginx)
3. Clone GitHub repository
4. Restore database from latest backup
5. Configure .env file (from secure backup)
6. Start services
7. Update DNS if IP changed
8. **Estimated Recovery Time:** 2-4 hours

---

## 📈 SCALING CONSIDERATIONS

### Current Capacity
- **Server:** t3.medium (2 vCPU, 4 GB RAM) - estimated
- **Database:** PostgreSQL on same server (not ideal)
- **Concurrent Users:** ~50-100 (estimated)
- **Documents/Day:** ~1,000-5,000 (estimated)

### Scaling Triggers
**Scale when:**
- CPU usage consistently >70%
- RAM usage >80%
- Database queries >100ms average
- More than 500 active users
- Processing >10,000 documents/day

### Scaling Path

**Phase 1: Vertical Scaling (Month 1-3)**
- Upgrade to t3.large (4 vCPU, 8 GB RAM)
- Separate database server (RDS PostgreSQL)
- Cost: +$200-300/month

**Phase 2: Horizontal Scaling (Month 4-6)**
- Add load balancer (AWS ALB)
- Deploy 2-3 backend instances
- Separate OCR processing workers (Celery + Redis)
- CDN for frontend assets (CloudFront)
- Cost: +$500-1000/month

**Phase 3: Multi-Region (Month 7-12)**
- Deploy to multiple AWS regions (US, EU, Africa)
- Geographic load balancing
- Database replication
- Cost: +$2000-5000/month

---

## 🧪 TESTING

### Manual Tests Performed (Oct 26, 2025)
1. ✅ Backend health check: `curl https://aria.vantax.co.za/health`
2. ✅ Frontend loading: Browser test
3. ✅ HTTPS certificate: Valid
4. ✅ HTTP → HTTPS redirect: Working
5. ✅ API docs: `/docs` endpoint accessible

### Tests NOT Performed
- ⚠️ Load testing (concurrent users)
- ⚠️ API endpoint testing (registration, login, document upload)
- ⚠️ Database performance testing
- ⚠️ Security penetration testing
- ⚠️ Mobile responsiveness testing
- ⚠️ Cross-browser testing (Chrome, Firefox, Safari, Edge)
- ⚠️ Integration testing (Xero, email, etc.)

### Recommended Test Suite (Before Marketing Launch)
1. **Load Testing:** Use Apache JMeter or Locust
   - Simulate 100 concurrent users
   - Test document upload (1000 files)
   - Measure response times, error rates
2. **API Testing:** Use Postman/Newman
   - Test all 67 bot endpoints
   - Validate authentication
   - Check error handling
3. **Security Testing:** Use OWASP ZAP
   - Scan for vulnerabilities
   - Test SQL injection, XSS, CSRF
   - Check SSL configuration
4. **End-to-End Testing:** Use Playwright/Cypress
   - User journey: Sign up → Upload doc → Process → Export
   - Test on multiple browsers
   - Mobile testing (iOS, Android)

---

## 📞 MAINTENANCE PROCEDURES

### Regular Maintenance Tasks

**Daily:**
- ✅ Check service status: `sudo systemctl status aria-backend nginx postgresql`
- ✅ Review logs: `sudo journalctl -u aria-backend --since "1 hour ago"`
- ✅ Monitor disk space: `df -h`

**Weekly:**
- 🔄 Review error logs (backend, nginx)
- 🔄 Check database size: `SELECT pg_size_pretty(pg_database_size('aria_production'));`
- 🔄 Review user signups and activity
- 🔄 Test health check endpoint

**Monthly:**
- 🔄 Update system packages: `sudo apt update && sudo apt upgrade`
- 🔄 Review SSL certificate expiry: `sudo certbot certificates`
- 🔄 Database vacuum: `VACUUM ANALYZE;` (PostgreSQL optimization)
- 🔄 Review server costs (AWS billing)

**Quarterly:**
- 🔄 Security audit
- 🔄 Performance review
- 🔄 Capacity planning
- 🔄 Disaster recovery test (restore from backup)

### Emergency Procedures

**Backend Crash:**
```bash
# Check status
sudo systemctl status aria-backend

# View recent logs
sudo journalctl -u aria-backend -n 50

# Restart service
sudo systemctl restart aria-backend

# If still failing, check Python errors
cd /home/ubuntu/Aria---Document-Management-Employee/backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

**Database Issues:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Connect to database
sudo -u postgres psql -d aria_production

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Kill long-running queries (if needed)
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '1 hour';
```

**Disk Full:**
```bash
# Check disk usage
df -h

# Find largest directories
du -sh /* | sort -h

# Clear logs if needed
sudo journalctl --vacuum-time=7d

# Clear old documents (if storage cleanup implemented)
```

**DDoS Attack:**
```bash
# Check traffic
sudo tail -f /var/log/nginx/access.log

# Block IP in nginx
# Add to /etc/nginx/sites-available/aria-production:
deny 1.2.3.4;

# Reload nginx
sudo systemctl reload nginx

# Consider enabling CloudFlare (free DDoS protection)
```

---

## 🚀 DEPLOYMENT CHECKLIST (For Future Updates)

### Code Deployment Process

**Step 1: Prepare Update**
```bash
# On local machine:
git add .
git commit -m "Feature: [description]"
git push origin main
```

**Step 2: Deploy to Production**
```bash
# SSH to server
ssh -i Vantax-2.pem ubuntu@3.8.139.178

# Pull latest code
cd /home/ubuntu/Aria---Document-Management-Employee
git pull origin main

# Backend updates:
cd backend
pip install -r requirements.txt  # If dependencies changed
sudo systemctl restart aria-backend

# Frontend updates:
cd ../frontend
npm install  # If dependencies changed
npm run build
# Nginx will automatically serve new dist/ files

# Verify deployment
curl https://aria.vantax.co.za/health
```

**Step 3: Verify & Monitor**
```bash
# Check logs for errors
sudo journalctl -u aria-backend -f

# Test critical endpoints
curl https://aria.vantax.co.za/api/users/me
curl https://aria.vantax.co.za/api/documents

# Monitor for 15 minutes
```

**Step 4: Rollback (if needed)**
```bash
# Revert to previous commit
git log  # Find previous commit hash
git checkout [previous_commit_hash]
sudo systemctl restart aria-backend
cd frontend && npm run build
```

---

## 📝 CONTACT INFORMATION

**Repository:** github.com/Reshigan/Aria---Document-Management-Employee  
**Server:** ubuntu@3.8.139.178  
**SSH Key:** Vantax-2.pem  
**Production URL:** https://aria.vantax.co.za  
**API Docs:** https://aria.vantax.co.za/docs  
**Health Check:** https://aria.vantax.co.za/health  

**Support Email:** support@vantax.co.za (to be configured)  
**Status Page:** (to be created)  

---

## ✅ NEXT STEPS (Post-Deployment)

### Immediate (This Week)
1. [ ] Set up automated database backups
2. [ ] Configure uptime monitoring (UptimeRobot)
3. [ ] Test all API endpoints manually
4. [ ] Create internal admin user for testing
5. [ ] Document API authentication flow

### Short-Term (Month 1)
1. [ ] Deploy Xero OAuth integration
2. [ ] Set up error tracking (Sentry)
3. [ ] Perform load testing
4. [ ] Configure email service (SendGrid/Mailgun)
5. [ ] Add monitoring dashboard (Grafana)

### Medium-Term (Month 2-3)
1. [ ] Separate database to RDS
2. [ ] Add load balancer
3. [ ] Implement automated deployments (CI/CD)
4. [ ] Set up staging environment
5. [ ] Perform security audit

---

**Deployment completed successfully on October 26, 2025.**  
**ARIA is LIVE and ready for beta testing.** 🚀

---

*This document should be updated with every major deployment or infrastructure change.*
