# Installation Guide - Security & Compliance Features

## Quick Start

Follow these steps to install and configure the security and compliance features.

---

## 1. Install Dependencies

```bash
# Navigate to project directory
cd /path/to/Aria---Document-Management-Employee

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On Linux/Mac:
source .venv/bin/activate

# Install new dependencies
pip install -r requirements_security.txt

# Or install individually:
pip install cryptography>=41.0.0
pip install pyotp>=2.9.0
pip install qrcode>=7.4.2
pip install Pillow>=10.0.0
pip install boto3>=1.28.0
pip install botocore>=1.31.0
```

---

## 2. Configure Environment Variables

Create or update `.env` file:

```bash
# ==================== Security ====================

# Master encryption key (generate using: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
MASTER_ENCRYPTION_KEY=your-generated-key-here

# Session configuration
SECRET_KEY=your-secret-key-here
SESSION_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Account security
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION_MINUTES=30

# Two-Factor Authentication
ENABLE_2FA=true
2FA_ISSUER_NAME=ARIA Document Management

# ==================== Database ====================

DB_HOST=localhost
DB_PORT=5432
DB_NAME=aria_db
DB_USER=postgres
DB_PASSWORD=your-db-password

# Database SSL (optional but recommended for production)
DB_SSL_MODE=require
DB_SSL_CERT=/path/to/cert.pem

# ==================== Backup ====================

BACKUP_DIR=/var/backups/aria
BACKUP_RETENTION_DAYS=30

# AWS S3 for remote backups (optional)
BACKUP_S3_BUCKET=aria-backups
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1

# ==================== Application ====================

APP_ENV=production  # or development
DEBUG=false
LOG_LEVEL=INFO
```

---

## 3. Generate Encryption Key

```python
# Run this Python script to generate a secure encryption key
from cryptography.fernet import Fernet

# Generate master encryption key
master_key = Fernet.generate_key()
print(f"MASTER_ENCRYPTION_KEY={master_key.decode()}")

# Save this key securely!
# Add it to your .env file
# NEVER commit it to version control
```

Or use the command line:

```bash
python -c "from cryptography.fernet import Fernet; print(f'MASTER_ENCRYPTION_KEY={Fernet.generate_key().decode()}')"
```

---

## 4. Run Database Migration

```bash
# Initialize Alembic (if not already done)
alembic init alembic

# Generate migration from models
alembic revision --autogenerate -m "Add module management and security"

# Or use the provided migration file
# Copy backend/migrations/versions/001_module_management.py to your migrations folder

# Apply migration
alembic upgrade head

# Verify migration
alembic current
```

---

## 5. Create Admin User (if needed)

```python
# Create a script: backend/scripts/create_admin.py

from backend.database.connection import get_db
from backend.models.user import User
from passlib.context import CryptContext
from datetime import datetime
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    db = next(get_db())
    
    admin = User(
        id=uuid.uuid4(),
        email="admin@aria.com",
        password_hash=pwd_context.hash("ChangeMe123!"),
        first_name="Admin",
        last_name="User",
        full_name="Admin User",
        role="admin",
        is_active=True,
        is_superuser=True,
        created_at=datetime.utcnow()
    )
    
    db.add(admin)
    db.commit()
    print(f"Admin user created: {admin.email}")

if __name__ == "__main__":
    create_admin()
```

Run the script:

```bash
python backend/scripts/create_admin.py
```

---

## 6. Register Routes in Main Application

Update `backend/main.py` to include new routes:

```python
from fastapi import FastAPI
from backend.api.routes import admin_modules, admin_security

app = FastAPI(title="ARIA Document Management")

# Register new routes
app.include_router(
    admin_modules.router,
    prefix="/api",
    tags=["Module Management"]
)

app.include_router(
    admin_security.backup_router,
    prefix="/api",
    tags=["Backup Management"]
)

app.include_router(
    admin_security.auth_router,
    prefix="/api",
    tags=["Authentication"]
)

app.include_router(
    admin_security.security_router,
    prefix="/api",
    tags=["Security"]
)

# ... rest of your routes
```

---

## 7. Create Backup Directory

```bash
# Linux/Mac
sudo mkdir -p /var/backups/aria
sudo chown $USER:$USER /var/backups/aria
sudo chmod 700 /var/backups/aria

# Windows (PowerShell)
New-Item -ItemType Directory -Path "C:\Backups\aria" -Force
```

---

## 8. Configure S3 Bucket (Optional)

If using AWS S3 for backups:

```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Create S3 bucket
aws s3 mb s3://aria-backups --region us-east-1

# Set bucket policy for private access
aws s3api put-public-access-block \
    --bucket aria-backups \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket aria-backups \
    --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
    --bucket aria-backups \
    --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

---

## 9. Start the Application

```bash
# Development mode
uvicorn backend.main:app --reload --port 8000

# Production mode with gunicorn
gunicorn backend.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile logs/access.log \
    --error-logfile logs/error.log
```

---

## 10. Verify Installation

### Test Basic Functionality

```bash
# 1. Health check
curl http://localhost:8000/health

# 2. Login as admin
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@aria.com", "password": "ChangeMe123!"}'

# Save the token
export TOKEN="<access_token_from_response>"

# 3. List modules
curl http://localhost:8000/api/admin/modules/ \
  -H "Authorization: Bearer $TOKEN"

# 4. Check backup status
curl http://localhost:8000/api/admin/backups/status \
  -H "Authorization: Bearer $TOKEN"

# 5. Test 2FA status
curl http://localhost:8000/api/auth/2fa/status \
  -H "Authorization: Bearer $TOKEN"
```

---

## 11. Schedule Automated Backups

### Using Cron (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/venv/bin/python /path/to/backup_script.py >> /var/log/aria_backup.log 2>&1

# Add weekly cleanup on Sunday at 3 AM
0 3 * * 0 /path/to/venv/bin/python /path/to/cleanup_script.py >> /var/log/aria_cleanup.log 2>&1
```

Create `backup_script.py`:

```python
import requests
import os

API_URL = "http://localhost:8000/api/admin/backups/create"
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")

response = requests.post(
    API_URL,
    headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
    json={
        "backup_type": "full",
        "compress": True,
        "upload_to_s3": True,
        "retention_days": 30
    }
)

print(response.json())
```

### Using Windows Task Scheduler

```powershell
# Create scheduled task for daily backups
$action = New-ScheduledTaskAction -Execute "python.exe" `
    -Argument "C:\path\to\backup_script.py"

$trigger = New-ScheduledTaskTrigger -Daily -At 2am

Register-ScheduledTask -TaskName "AriaBackup" `
    -Action $action `
    -Trigger $trigger `
    -Description "Daily ARIA database backup"
```

---

## 12. Security Hardening

### SSL/TLS Configuration

```python
# For production, use SSL certificates
# Update main.py or use reverse proxy (nginx/Apache)

import ssl

ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ssl_context.load_cert_chain('/path/to/cert.pem', '/path/to/key.pem')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=443,
        ssl_keyfile="/path/to/key.pem",
        ssl_certfile="/path/to/cert.pem"
    )
```

### Nginx Reverse Proxy (Recommended)

```nginx
server {
    listen 80;
    server_name aria.yourcompany.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name aria.yourcompany.com;

    ssl_certificate /etc/ssl/certs/aria.crt;
    ssl_certificate_key /etc/ssl/private/aria.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 13. Monitoring Setup

### Enable Logging

```python
# Add to main.py
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(
            'logs/aria.log',
            maxBytes=10485760,  # 10MB
            backupCount=10
        ),
        logging.StreamHandler()
    ]
)
```

### Health Check Endpoint

```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }
```

---

## 14. Testing

Run the test suite:

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-cov

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=backend --cov-report=html

# Run specific test modules
pytest tests/test_modules.py
pytest tests/test_security.py
pytest tests/test_backup.py
```

---

## Troubleshooting

### Issue: Import errors

**Solution:** Ensure all dependencies are installed

```bash
pip install -r requirements_security.txt
pip list | grep -E "cryptography|pyotp|boto3"
```

### Issue: Database migration fails

**Solution:** Check database connection and permissions

```bash
# Test database connection
python -c "from backend.database.connection import get_db; next(get_db())"

# Check Alembic configuration
alembic current
alembic history
```

### Issue: Backup creation fails

**Solution:** Check permissions and disk space

```bash
# Check disk space
df -h /var/backups

# Check directory permissions
ls -la /var/backups/aria

# Test database credentials
psql -h localhost -U postgres -d aria_db -c "SELECT version();"
```

### Issue: 2FA QR code not displaying

**Solution:** Ensure Pillow is installed correctly

```bash
pip install --upgrade Pillow qrcode[pil]
```

---

## Production Deployment Checklist

- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] Master encryption key generated and secured
- [ ] SSL/TLS certificates installed
- [ ] Database migration applied
- [ ] Admin user created
- [ ] Backup directory configured
- [ ] S3 bucket configured (if using)
- [ ] Automated backups scheduled
- [ ] Logging configured
- [ ] Monitoring enabled
- [ ] Health checks configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Firewall rules configured
- [ ] Documentation reviewed
- [ ] Team trained on module assignment

---

## Next Steps

1. **Review Documentation:**
   - Read `SECURITY_COMPLIANCE_GUIDE.md`
   - Review `SECURITY_IMPLEMENTATION_SUMMARY.md`
   - Study `ADMIN_MODULE_ASSIGNMENT_GUIDE.md`

2. **Configure Your System:**
   - Assign modules to users
   - Enable 2FA for admin accounts
   - Test backup and restore
   - Review audit logs

3. **Train Your Team:**
   - Admin training on module assignment
   - User training on 2FA setup
   - Security best practices

4. **Monitor and Maintain:**
   - Review audit logs weekly
   - Check backup status daily
   - Update dependencies monthly
   - Security audit quarterly

---

**Installation Support:**
- Email: support@aria-dms.com
- Documentation: https://docs.aria-dms.com

**Version:** 2.0.0
**Last Updated:** March 12, 2026
