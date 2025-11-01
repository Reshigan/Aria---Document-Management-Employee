# 🔒 DNS & SSL Setup Guide for aria.vantax.co.za

## Quick Overview

This guide will help you:
1. Configure DNS to point aria.vantax.co.za to your server
2. Install SSL certificate (HTTPS) using Let's Encrypt
3. Update the application to use HTTPS

---

## Step 1: Configure DNS (Do This First!)

### Option A: If you manage DNS yourself

Add an A record in your DNS provider (e.g., GoDaddy, Cloudflare, Route53):

```
Type:  A
Name:  aria
Value: 3.8.139.178
TTL:   300 (or Auto)
```

Also add www subdomain (optional):
```
Type:  CNAME
Name:  www.aria
Value: aria.vantax.co.za
TTL:   300
```

### Option B: If using Cloudflare

1. Log in to Cloudflare
2. Select your domain: vantax.co.za
3. Go to "DNS" section
4. Click "Add record"
5. Fill in:
   - **Type:** A
   - **Name:** aria
   - **IPv4 address:** 3.8.139.178
   - **Proxy status:** DNS only (grey cloud icon)
   - **TTL:** Auto
6. Click "Save"

### Option C: If using AWS Route53

1. Go to Route53 console
2. Select hosted zone: vantax.co.za
3. Click "Create record"
4. Fill in:
   - **Record name:** aria
   - **Record type:** A
   - **Value:** 3.8.139.178
   - **TTL:** 300
   - **Routing policy:** Simple routing
5. Click "Create records"

### Verify DNS Configuration

Wait 5-10 minutes after configuring DNS, then test:

```bash
# Check if domain resolves to correct IP
nslookup aria.vantax.co.za

# Or use dig
dig +short aria.vantax.co.za

# Expected output: 3.8.139.178
```

---

## Step 2: Run SSL Setup Script (Automated)

Once DNS is configured and verified, run the automated SSL setup:

```bash
cd /workspace/project
./setup_ssl.sh
```

The script will:
1. ✅ Verify DNS configuration
2. ✅ Update Nginx configuration for the domain
3. ✅ Install Certbot (Let's Encrypt client)
4. ✅ Obtain SSL certificate
5. ✅ Configure auto-renewal
6. ✅ Update frontend to use HTTPS
7. ✅ Configure firewall
8. ✅ Verify everything works

---

## Step 3: Manual SSL Setup (Alternative)

If you prefer to set up SSL manually:

### 3.1. SSH into Server
```bash
ssh -i "Vantax-2.pem" ubuntu@3.8.139.178
```

### 3.2. Update Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/aria-erp
```

Replace with:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name aria.vantax.co.za www.aria.vantax.co.za;

    root /home/ubuntu/aria-erp/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /docs {
        proxy_pass http://localhost:8000/docs;
        proxy_set_header Host $host;
    }

    location /bots {
        proxy_pass http://localhost:8000/bots;
        proxy_set_header Host $host;
    }
}
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 3.3. Install Certbot
```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### 3.4. Obtain SSL Certificate
```bash
sudo certbot --nginx \
    -d aria.vantax.co.za \
    -d www.aria.vantax.co.za \
    --email admin@vantax.co.za \
    --agree-tos \
    --redirect
```

### 3.5. Test Auto-Renewal
```bash
sudo certbot renew --dry-run
```

### 3.6. Configure Firewall
```bash
sudo ufw allow 443/tcp
sudo ufw status
```

---

## Step 4: Update Frontend Configuration

### 4.1. Update .env.production
```bash
# On your local machine
cd /workspace/project/Aria---Document-Management-Employee/frontend

cat > .env.production << EOF
VITE_API_URL=https://aria.vantax.co.za
VITE_APP_NAME=Aria ERP
VITE_APP_VERSION=2.0.0
EOF
```

### 4.2. Commit and Push Changes
```bash
cd /workspace/project/Aria---Document-Management-Employee
git add frontend/.env.production
git commit -m "Update frontend to use HTTPS domain"
git push origin main
```

### 4.3. Deploy Updated Frontend
```bash
ssh -i "Vantax-2.pem" ubuntu@3.8.139.178 << 'EOF'
cd /home/ubuntu/aria-erp
git pull origin main
cd frontend
npm run build
sudo systemctl restart nginx
EOF
```

---

## Step 5: Verification

### Test HTTP → HTTPS Redirect
```bash
curl -I http://aria.vantax.co.za
# Should show: HTTP/1.1 301 Moved Permanently
# Location: https://aria.vantax.co.za/
```

### Test HTTPS Endpoint
```bash
curl https://aria.vantax.co.za/api/health
# Should return: {"status":"healthy",...}
```

### Test in Browser
1. Open: https://aria.vantax.co.za
2. Check for 🔒 padlock icon in address bar
3. Click padlock → should show "Connection is secure"

### Check SSL Certificate
```bash
# On server
sudo certbot certificates

# Or use SSL Labs
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=aria.vantax.co.za
```

---

## Troubleshooting

### DNS Not Resolving
**Problem:** `nslookup aria.vantax.co.za` returns no result

**Solution:**
- Wait 5-10 minutes for DNS propagation
- Check DNS record is correct in your DNS provider
- Try flushing your local DNS cache:
  ```bash
  # Linux/Mac
  sudo systemd-resolve --flush-caches
  
  # Mac
  sudo dscacheutil -flushcache
  ```

### Certbot Fails with "DNS not found"
**Problem:** Certbot says it can't find the domain

**Solution:**
- Verify DNS is working: `dig +short aria.vantax.co.za`
- Must return: 3.8.139.178
- Wait for DNS to fully propagate (can take up to 24 hours globally)

### "Port 443 already in use"
**Problem:** Can't start Nginx on port 443

**Solution:**
```bash
# Find what's using port 443
sudo lsof -ti:443

# Kill the process (if safe)
sudo kill -9 $(sudo lsof -ti:443)

# Restart Nginx
sudo systemctl restart nginx
```

### Certificate Not Auto-Renewing
**Problem:** Certificate expires after 90 days

**Solution:**
```bash
# Check certbot timer
sudo systemctl status certbot.timer

# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

### Mixed Content Errors in Browser
**Problem:** Some resources loading over HTTP instead of HTTPS

**Solution:**
- Check browser console for errors
- Ensure .env.production has HTTPS URL
- Rebuild frontend: `npm run build`
- Clear browser cache

---

## SSL Certificate Details

### Provider
- **Issuer:** Let's Encrypt
- **Type:** Domain Validation (DV)
- **Encryption:** TLS 1.2/1.3
- **Key Size:** 2048-bit RSA

### Validity
- **Duration:** 90 days
- **Auto-Renewal:** 30 days before expiry
- **Cost:** Free

### Renewal Process
Certbot automatically renews certificates via systemd timer:
```bash
# Check timer status
sudo systemctl list-timers | grep certbot

# Manual renewal (if needed)
sudo certbot renew

# Force renewal (for testing)
sudo certbot renew --force-renewal
```

---

## Security Best Practices

### 1. Enable HSTS (HTTP Strict Transport Security)
Add to Nginx config:
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 2. Update Security Headers
Already configured in nginx:
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block

### 3. Regular Updates
```bash
# Update server packages monthly
sudo apt update && sudo apt upgrade -y
```

### 4. Monitor Certificate Expiry
```bash
# Check certificate expiry date
echo | openssl s_client -servername aria.vantax.co.za -connect aria.vantax.co.za:443 2>/dev/null | openssl x509 -noout -dates
```

### 5. Backup Certificates
```bash
# Certificates stored in:
sudo ls -la /etc/letsencrypt/live/aria.vantax.co.za/

# Backup entire letsencrypt directory
sudo tar -czf letsencrypt-backup-$(date +%Y%m%d).tar.gz /etc/letsencrypt/
```

---

## Access URLs After SSL Setup

### Production URLs (HTTPS)
- **Main Application:** https://aria.vantax.co.za
- **Backend API:** https://aria.vantax.co.za/api
- **API Documentation:** https://aria.vantax.co.za/docs
- **Health Check:** https://aria.vantax.co.za/api/health
- **Bots Status:** https://aria.vantax.co.za/bots

### Old URLs (HTTP - will redirect to HTTPS)
- http://3.8.139.178 → https://aria.vantax.co.za
- http://aria.vantax.co.za → https://aria.vantax.co.za

---

## Certificate Renewal Checklist

Certbot handles renewal automatically, but if you need to renew manually:

- [ ] Check certificate expiry: `sudo certbot certificates`
- [ ] Test renewal: `sudo certbot renew --dry-run`
- [ ] Run renewal: `sudo certbot renew`
- [ ] Restart Nginx: `sudo systemctl restart nginx`
- [ ] Verify HTTPS: `curl -I https://aria.vantax.co.za`
- [ ] Check SSL grade: https://www.ssllabs.com/ssltest/

---

## Support & Resources

### Let's Encrypt Documentation
- Website: https://letsencrypt.org/
- Certbot Docs: https://certbot.eff.org/

### SSL Testing Tools
- SSL Labs: https://www.ssllabs.com/ssltest/
- Why No Padlock: https://www.whynopadlock.com/
- Security Headers: https://securityheaders.com/

### DNS Propagation Check
- https://www.whatsmydns.net/#A/aria.vantax.co.za
- https://dnschecker.org/

---

## Quick Commands Reference

```bash
# Check DNS
dig +short aria.vantax.co.za

# Check SSL certificate
sudo certbot certificates

# Renew SSL (manual)
sudo certbot renew

# Test auto-renewal
sudo certbot renew --dry-run

# Check Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check firewall
sudo ufw status

# Test HTTPS
curl -I https://aria.vantax.co.za
```

---

**Last Updated:** November 1, 2025  
**Status:** Ready for SSL setup once DNS is configured  
**Server:** 3.8.139.178  
**Domain:** aria.vantax.co.za
