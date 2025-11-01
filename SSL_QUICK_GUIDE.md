# 🔒 Quick SSL Setup for aria.vantax.co.za

## Current Status

✅ **Server is configured and ready for SSL**
🟡 **Waiting for DNS configuration**

## 3-Step Process

### Step 1: Configure DNS (You need to do this)

Add this A record in your DNS provider:

```
Type:  A
Name:  aria
Value: 3.8.139.178
TTL:   300
```

**Common DNS Providers:**
- **GoDaddy:** DNS → Manage → Add Record
- **Cloudflare:** DNS → Add Record
- **AWS Route53:** Hosted Zones → Create Record
- **Namecheap:** Advanced DNS → Add New Record

### Step 2: Wait 5-10 Minutes

DNS propagation takes time. After configuring, wait then verify:

```bash
nslookup aria.vantax.co.za
# Should return: 3.8.139.178
```

Check propagation: https://www.whatsmydns.net/#A/aria.vantax.co.za

### Step 3: Get SSL Certificate

Once DNS works, run:

```bash
/workspace/project/obtain_ssl_cert.sh
```

That's it! 🎉

---

## What Happens Next

The script will:
1. ✅ Verify DNS is working
2. ✅ Get free SSL certificate from Let's Encrypt
3. ✅ Configure Nginx for HTTPS
4. ✅ Enable auto-redirect HTTP → HTTPS
5. ✅ Setup automatic renewal
6. ✅ Rebuild frontend with HTTPS

**Time:** ~2 minutes total

---

## After SSL Setup

Your site will be accessible at:

- ✅ https://aria.vantax.co.za (primary)
- ✅ https://www.aria.vantax.co.za (alias)
- ✅ http://aria.vantax.co.za (redirects to HTTPS)
- ✅ http://3.8.139.178 (still works)

---

## Important AWS Setting

Make sure port 443 is open in your AWS Security Group:

1. Go to EC2 → Security Groups
2. Select your instance's security group
3. Add inbound rule:
   - Type: HTTPS
   - Protocol: TCP  
   - Port: 443
   - Source: 0.0.0.0/0

---

## Troubleshooting

**DNS not resolving?**
- Wait longer (up to 1 hour max)
- Check DNS record is correct
- Use different DNS server to test

**Certbot fails?**
- Verify DNS: `nslookup aria.vantax.co.za` returns 3.8.139.178
- Check port 80 is accessible from internet
- Ensure no firewall blocking Let's Encrypt

**Need more help?**
- Read: `DNS_AND_SSL_SETUP.md` (comprehensive guide)
- Check: AWS Security Group settings
- Test: https://www.ssllabs.com/ssltest/ after setup

---

## Manual Commands (Advanced)

If you prefer to run commands manually:

```bash
# SSH into server
ssh -i "Vantax-2.pem" ubuntu@3.8.139.178

# Get SSL certificate
sudo certbot --nginx \
    -d aria.vantax.co.za \
    -d www.aria.vantax.co.za \
    --email admin@vantax.co.za \
    --agree-tos \
    --redirect

# Rebuild frontend
cd /home/ubuntu/aria-erp
git pull origin main
cd frontend
npm run build
sudo systemctl restart nginx
```

---

## Certificate Auto-Renewal

**Good news:** SSL certificate auto-renews automatically!

- Certbot checks daily for expiration
- Renews 30 days before expiry
- No manual action needed
- Lasts 90 days per certificate

Check renewal: `sudo certbot renew --dry-run`

---

## Current Access

**Right now (HTTP only):**
- http://3.8.139.178 ✅ Working

**After SSL (HTTPS):**
- https://aria.vantax.co.za ✅ Will work
- 🔒 Secure padlock icon
- A+ SSL grade (expected)

---

## Quick Reference

```bash
# Check DNS
nslookup aria.vantax.co.za

# Get SSL certificate (after DNS works)
/workspace/project/obtain_ssl_cert.sh

# Test HTTPS
curl -I https://aria.vantax.co.za

# Check certificate status
ssh -i "Vantax-2.pem" ubuntu@3.8.139.178 "sudo certbot certificates"
```

---

## Summary

1. **DNS:** Configure A record → 3.8.139.178
2. **Wait:** 5-10 minutes for DNS propagation
3. **SSL:** Run `/workspace/project/obtain_ssl_cert.sh`
4. **Done:** Access https://aria.vantax.co.za 🎉

Everything else is automated and ready to go!

---

**Last Updated:** November 1, 2025  
**Status:** Ready for DNS configuration
