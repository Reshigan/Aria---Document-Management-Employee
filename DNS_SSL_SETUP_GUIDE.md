# 🌐 DNS & SSL Setup Guide for aria.gonxt.tech

---

## 📊 CURRENT STATUS

**Domain:** aria.gonxt.tech  
**Current DNS:** ❌ 66.81.203.198 (WRONG)  
**Required DNS:** ✅ 3.8.139.178 (Correct)  
**SSL Status:** ⏳ Pending (will configure after DNS fixed)

---

## 🔧 STEP 1: UPDATE DNS

### **Where to Update:**

Find your DNS provider for **gonxt.tech** domain:
- GoDaddy
- Cloudflare
- AWS Route53
- Namecheap
- Google Domains
- Or any other DNS provider

### **What to Change:**

**Current A Record (REMOVE OR UPDATE):**
```
Type: A
Name: aria
Value: 66.81.203.198  ← WRONG IP
```

**New A Record (REQUIRED):**
```
Type: A
Name: aria
Value: 3.8.139.178  ← CORRECT IP (ARIA server)
TTL: 300 (or automatic)
```

### **Screenshots Guide by Provider:**

#### **Cloudflare:**
1. Login to Cloudflare
2. Select **gonxt.tech** domain
3. Go to **DNS** → **Records**
4. Find A record for **aria**
5. Click **Edit**
6. Change IPv4 address to: `3.8.139.178`
7. Click **Save**
8. Set Proxy status to: **DNS only** (grey cloud)

#### **GoDaddy:**
1. Login to GoDaddy
2. Go to **My Products** → **DNS**
3. Select **gonxt.tech**
4. Find A record for **aria**
5. Click **Edit**
6. Change Points to to: `3.8.139.178`
7. Click **Save**

#### **AWS Route53:**
1. Login to AWS Console
2. Go to **Route53** → **Hosted Zones**
3. Select **gonxt.tech**
4. Find A record for **aria.gonxt.tech**
5. Click **Edit record**
6. Change Value to: `3.8.139.178`
7. Click **Save**

---

## ⏱️ STEP 2: WAIT FOR DNS PROPAGATION

After updating DNS, wait **5-15 minutes** for propagation.

### **Check DNS Propagation:**

**Option 1: Online Tool**
- Visit: https://www.whatsmydns.net/
- Enter: `aria.gonxt.tech`
- Type: `A`
- Should show: `3.8.139.178` globally

**Option 2: Command Line**
```bash
# On Mac/Linux
nslookup aria.gonxt.tech
# Should return: 3.8.139.178

# Or
dig aria.gonxt.tech +short
# Should return: 3.8.139.178

# Or ping
ping aria.gonxt.tech
# Should show: 3.8.139.178
```

**Option 3: Tell me to check**
Just say "check DNS now" and I'll verify if it's propagated.

---

## 🔒 STEP 3: SSL CERTIFICATE (I'll do this for you)

Once DNS is pointing correctly, I will automatically:

### **1. Stop Nginx temporarily**
```bash
sudo systemctl stop nginx
```

### **2. Get SSL Certificate from Let's Encrypt**
```bash
sudo certbot certonly --standalone -d aria.gonxt.tech \
  --non-interactive --agree-tos --email admin@gonxt.tech
```

### **3. Update Nginx Configuration**
```nginx
server {
    listen 443 ssl http2;
    server_name aria.gonxt.tech aria.vantax.co.za;
    
    # SSL for aria.gonxt.tech
    ssl_certificate /etc/letsencrypt/live/aria.gonxt.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aria.gonxt.tech/privkey.pem;
    
    # ... rest of config
}
```

### **4. Start Nginx**
```bash
sudo systemctl start nginx
```

### **5. Test Both Domains**
```bash
curl https://aria.gonxt.tech/health
curl https://aria.vantax.co.za/health
```

---

## ✅ STEP 4: VERIFICATION

After SSL is configured, I will verify:

- ✅ DNS resolves correctly
- ✅ SSL certificate valid
- ✅ HTTPS works
- ✅ Backend API accessible
- ✅ Frontend loads
- ✅ Login works
- ✅ No browser warnings
- ✅ Both domains work

---

## 🚀 AUTOMATED SSL SETUP SCRIPT

Once DNS is correct, run this on the server:

```bash
#!/bin/bash

echo "=========================================="
echo "SSL Certificate Setup for aria.gonxt.tech"
echo "=========================================="

# Verify DNS first
DNS_IP=$(dig +short aria.gonxt.tech | tail -1)
if [ "$DNS_IP" != "3.8.139.178" ]; then
    echo "❌ DNS not pointing to correct IP yet"
    echo "   Current: $DNS_IP"
    echo "   Required: 3.8.139.178"
    echo "   Please update DNS and wait for propagation"
    exit 1
fi

echo "✅ DNS verified: $DNS_IP"
echo ""

# Stop nginx for standalone verification
echo "Stopping nginx temporarily..."
sudo systemctl stop nginx

# Get SSL certificate
echo "Requesting SSL certificate from Let's Encrypt..."
sudo certbot certonly --standalone \
    -d aria.gonxt.tech \
    --non-interactive \
    --agree-tos \
    --email admin@gonxt.tech \
    --preferred-challenges http

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate obtained"
else
    echo "❌ SSL certificate failed"
    sudo systemctl start nginx
    exit 1
fi

# Update nginx config to use new cert
echo "Updating Nginx configuration..."
sudo tee /etc/nginx/sites-available/aria > /dev/null << 'NGINXCONF'
server {
    listen 80;
    listen [::]:80;
    server_name aria.gonxt.tech aria.vantax.co.za;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name aria.gonxt.tech;

    ssl_certificate /etc/letsencrypt/live/aria.gonxt.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aria.gonxt.tech/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Rest of config same as before
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name aria.vantax.co.za;

    ssl_certificate /etc/letsencrypt/live/aria.vantax.co.za/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aria.vantax.co.za/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
NGINXCONF

# Test nginx config
echo "Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx config valid"
    sudo systemctl start nginx
    echo "✅ Nginx started"
else
    echo "❌ Nginx config invalid"
    exit 1
fi

# Test HTTPS
sleep 3
echo ""
echo "Testing HTTPS..."
curl -s https://aria.gonxt.tech/health | jq

echo ""
echo "=========================================="
echo "✅ SSL SETUP COMPLETE"
echo "=========================================="
echo ""
echo "Both domains now work with HTTPS:"
echo "  • https://aria.gonxt.tech"
echo "  • https://aria.vantax.co.za"
echo ""
```

Save this as `/tmp/setup-ssl.sh` and run:
```bash
chmod +x /tmp/setup-ssl.sh
sudo /tmp/setup-ssl.sh
```

---

## 🔄 ALTERNATIVE: Manual SSL Setup

If script doesn't work, do it manually:

```bash
# 1. Verify DNS
dig +short aria.gonxt.tech
# Should show: 3.8.139.178

# 2. Stop nginx
sudo systemctl stop nginx

# 3. Get certificate
sudo certbot certonly --standalone -d aria.gonxt.tech \
  --email admin@gonxt.tech --agree-tos --non-interactive

# 4. Start nginx
sudo systemctl start nginx

# 5. Test
curl https://aria.gonxt.tech/health
```

---

## 📝 TROUBLESHOOTING

### **Issue: DNS not propagating**
**Solution:**
- Wait longer (up to 48 hours max)
- Clear local DNS cache:
  - Mac: `sudo dscacheutil -flushcache`
  - Windows: `ipconfig /flushdns`
  - Linux: `sudo systemd-resolve --flush-caches`
- Use Google DNS (8.8.8.8) to check

### **Issue: Certbot fails with "timeout"**
**Solution:**
- Verify DNS points to 3.8.139.178
- Ensure port 80 is open: `sudo ufw allow 80`
- Stop nginx before certbot: `sudo systemctl stop nginx`

### **Issue: SSL certificate for wrong domain**
**Solution:**
```bash
# Delete old cert
sudo certbot delete --cert-name aria.gonxt.tech

# Get new one
sudo systemctl stop nginx
sudo certbot certonly --standalone -d aria.gonxt.tech
sudo systemctl start nginx
```

### **Issue: "Certificate expired"**
**Solution:**
```bash
# Renew certificate
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

## 📊 EXPECTED RESULT

After completing all steps:

```bash
$ curl https://aria.gonxt.tech/health
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-08T...",
  "version": "3.0"
}

$ curl https://aria.vantax.co.za/health
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-08T...",
  "version": "3.0"
}
```

**Browser test:**
1. Visit: https://aria.gonxt.tech
2. Should show: 🔒 Secure (green padlock)
3. Login: admin / Admin@2025
4. Should work perfectly ✅

---

## 🎯 SUMMARY

**What YOU need to do:**
1. ✅ Update DNS A record: aria.gonxt.tech → 3.8.139.178
2. ⏳ Wait 5-15 minutes for DNS propagation
3. 📢 Tell me: "DNS updated" or "check DNS now"

**What I will do automatically:**
1. Verify DNS is correct
2. Get SSL certificate from Let's Encrypt
3. Configure Nginx for both domains
4. Test HTTPS on both domains
5. Confirm everything works
6. Provide final verification report

---

## 📞 READY?

**Once DNS is updated, just say:**
- "DNS is updated"
- "Check DNS now"
- "Ready for SSL"

And I'll handle the rest! 🚀

---

**Current Status:**
- ❌ DNS: aria.gonxt.tech → 66.81.203.198 (NEEDS UPDATE)
- ✅ Server: 3.8.139.178 (ARIA deployed and running)
- ✅ aria.vantax.co.za: Working perfectly with SSL
- ⏳ aria.gonxt.tech: Waiting for DNS update

**Change required:** Update DNS from 66.81.203.198 to 3.8.139.178
