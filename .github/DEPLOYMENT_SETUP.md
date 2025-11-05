# 🚀 CI/CD Deployment Setup Guide

This guide explains how to configure GitHub Actions for automated deployments to aria.vantax.co.za.

## Overview

The production CI/CD pipeline (`production-deploy.yml`) automatically:
- ✅ Lints and tests frontend (TypeScript/React)
- ✅ Tests backend (Python/FastAPI)
- ✅ Builds production artifacts
- ✅ Deploys to production server via SSH
- ✅ Restarts services and runs health checks

## Required GitHub Secrets

You must configure the following secrets in your GitHub repository:

### 1. PRODUCTION_SSH_KEY

**Description:** Private SSH key for accessing the production server

**How to set up:**

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `PRODUCTION_SSH_KEY`
5. Value: Copy the entire contents of `Vantax-2.pem` file:

```bash
# The key should look like this:
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(multiple lines)
...
-----END RSA PRIVATE KEY-----
```

**Important:** Include the BEGIN and END lines, and ensure there are no extra spaces or newlines.

## Production Server Details

- **Host:** `3.8.139.178` (aria.vantax.co.za)
- **User:** `ubuntu`
- **Frontend Path:** `/var/www/aria/frontend/`
- **Backend Path:** `/var/www/aria/backend/`
- **Backend Service:** `aria-backend.service` (systemd)
- **Web Server:** nginx

## Deployment Flow

### On Pull Requests
1. Runs frontend build
2. Runs backend tests
3. **Does NOT deploy** (validation only)

### On Push to `main` Branch
1. Runs frontend build
2. Runs backend tests
3. **Deploys to production** if tests pass:
   - Creates backup of current deployment
   - Uploads new frontend build to `/var/www/aria/frontend/`
   - Uploads backend code to `/var/www/aria/backend/`
   - Installs Python dependencies in virtualenv
   - Restarts `aria-backend.service`
   - Reloads nginx
   - Runs health checks

## Manual Deployment

You can trigger a manual deployment using GitHub Actions:

1. Go to **Actions** tab in GitHub
2. Select **🚀 Production CI/CD Pipeline**
3. Click **Run workflow**
4. Select branch: `main`
5. Click **Run workflow**

## Monitoring Deployments

### View Deployment Status
- Go to **Actions** tab in GitHub
- Click on the latest workflow run
- View logs for each step

### Check Production Health
```bash
# Backend health check
curl https://aria.vantax.co.za/api/health

# Frontend check
curl https://aria.vantax.co.za
```

### SSH into Production Server
```bash
ssh -i Vantax-2.pem ubuntu@3.8.139.178

# Check backend service status
sudo systemctl status aria-backend.service

# View backend logs
sudo journalctl -u aria-backend.service -f

# Check nginx status
sudo systemctl status nginx

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Rollback Procedure

If a deployment fails, you can rollback to a previous version:

```bash
# SSH into production server
ssh -i Vantax-2.pem ubuntu@3.8.139.178

# List available backups
ls -lh /home/ubuntu/aria-backups/

# Restore from backup (replace with actual backup directory)
BACKUP_DIR="/home/ubuntu/aria-backups/backup-20250105-123456"
sudo cp -r $BACKUP_DIR/* /var/www/aria/

# Restart services
sudo systemctl restart aria-backend.service
sudo systemctl reload nginx
```

## Troubleshooting

### Deployment Fails at "Setup SSH" Step
- **Cause:** `PRODUCTION_SSH_KEY` secret not configured or invalid
- **Solution:** Verify the secret contains the complete private key with BEGIN/END lines

### Backend Service Won't Start
```bash
# SSH into server
ssh -i Vantax-2.pem ubuntu@3.8.139.178

# Check service status
sudo systemctl status aria-backend.service

# View detailed logs
sudo journalctl -u aria-backend.service -n 100

# Check Python dependencies
cd /var/www/aria/backend
source venv/bin/activate
pip list
```

### Frontend Not Updating
```bash
# SSH into server
ssh -i Vantax-2.pem ubuntu@3.8.139.178

# Check nginx configuration
sudo nginx -t

# Verify frontend files
ls -lh /var/www/aria/frontend/

# Clear browser cache and hard refresh (Ctrl+Shift+R)
```

### Health Checks Failing
```bash
# SSH into server
ssh -i Vantax-2.pem ubuntu@3.8.139.178

# Test backend locally
curl http://localhost:8000/health

# Check if backend is running
ps aux | grep python | grep aria

# Check nginx is serving frontend
curl http://localhost:80
```

## Environment Variables

The backend requires environment variables to be configured on the production server:

```bash
# Location: /var/www/aria/backend/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/aria_production
SECRET_KEY=your-secret-key-here
ENVIRONMENT=production
OFFICE365_CLIENT_ID=your-client-id-here
OFFICE365_CLIENT_SECRET=your-client-secret-here
OFFICE365_TENANT_ID=your-tenant-id-here
ARIA_CONTROLLER_ENABLED=true
```

**Note:** Contact the system administrator for actual Office365 credentials.

## Security Notes

- ✅ SSH key is stored securely in GitHub Secrets (encrypted)
- ✅ Deployment creates automatic backups before updating
- ✅ Health checks verify deployment success
- ✅ Only `main` branch can deploy to production
- ⚠️ Never commit the SSH private key to the repository
- ⚠️ Never commit `.env` files with production credentials

## Support

For deployment issues:
1. Check GitHub Actions logs
2. SSH into production server and check service logs
3. Review this documentation
4. Contact: reshigan@gonxt.tech
