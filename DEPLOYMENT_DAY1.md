# Day 1 Deployment Guide - Database Foundation

**Goal**: Initialize database with 52 tables and seed 1000+ realistic records

**Time Estimate**: 1-2 hours

---

## 📋 Prerequisites

- [x] PostgreSQL 16 installed and running
- [x] Backend code deployed to server
- [x] SSH access: `ubuntu@3.8.139.178` with `Vantax-2.pem`
- [x] Scripts created and pushed to GitHub

---

## 🚀 Step-by-Step Deployment

### 1. Connect to Server

```bash
ssh -i ~/Vantax-2.pem ubuntu@3.8.139.178
```

### 2. Pull Latest Code

```bash
cd /opt/aria
sudo git pull origin main
```

**Expected files**:
- `backend/scripts/init_database.py`
- `backend/scripts/seed_comprehensive_data.py`

### 3. Install Python Dependencies

```bash
cd /opt/aria/backend
sudo /opt/aria/backend/venv/bin/pip install sqlalchemy psycopg2-binary passlib bcrypt python-jose
```

**Why these packages**:
- `sqlalchemy` - ORM for database operations
- `psycopg2-binary` - PostgreSQL adapter
- `passlib`, `bcrypt` - Password hashing
- `python-jose` - JWT token generation

### 4. Initialize Database Tables

```bash
cd /opt/aria/backend
sudo /opt/aria/backend/venv/bin/python scripts/init_database.py
```

**Expected output**:
```
======================================================================
   🗄️  ARIA DATABASE INITIALIZATION
======================================================================

🔧 Creating database tables...
   ✅ Created table: users
   ✅ Created table: customers
   ✅ Created table: suppliers
   ... (52 tables total)

🎉 Database initialization complete!
   📊 Total tables created: 52

✨ Database is ready for data seeding!
```

**Troubleshooting**:
- If error "already exists": Tables already created (OK to continue)
- If error "connection refused": Check PostgreSQL is running
  ```bash
  sudo systemctl status postgresql
  sudo systemctl start postgresql
  ```
- If error "database does not exist": Create database
  ```bash
  sudo -u postgres psql
  CREATE DATABASE aria_db;
  \q
  ```

### 5. Seed Demo Data

```bash
cd /opt/aria/backend
sudo /opt/aria/backend/venv/bin/python scripts/seed_comprehensive_data.py
```

**Expected output**:
```
======================================================================
   🌱 ARIA COMPREHENSIVE DATA SEEDING
======================================================================

🔐 Setting up admin user...
   ✅ Admin user created: admin@vantax.co.za

👥 Creating 14 standard users...
   ✅ 14 users ready

💼 Creating 50 customers...
   ✅ 50 customers created

🏭 Creating 30 suppliers...
   ✅ 30 suppliers created

📦 Creating 100 products...
   ✅ 100 products created

📄 Creating 100 invoices with line items...
   ✅ 100 invoices created

👨‍💼 Creating 25 employees...
   ✅ 25 employees created

======================================================================
   🎉 SEEDING COMPLETE!
======================================================================

📊 Summary:
   • 1 Admin + 14 Users = 15 total
   • 50 Customers
   • 30 Suppliers
   • 100 Products
   • 100 Invoices (~300 line items)
   • 25 Employees

   📈 TOTAL RECORDS: ~620

🔐 Login Credentials:
   📧 Email: admin@vantax.co.za
   🔑 Password: Demo@2025

🌐 Access Platform:
   🔗 URL: https://aria.vantax.co.za

✨ Platform is now ready for demonstration!
```

**Troubleshooting**:
- If error "duplicate key": Data already exists (script is idempotent, can re-run)
- If error "foreign key constraint": Ensure init_database.py ran successfully first

### 6. Verify Database

```bash
sudo -u postgres psql -d aria_db
```

**SQL verification queries**:

```sql
-- Count tables
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Should show: 52

-- Count users
SELECT COUNT(*) FROM users;
-- Should show: 15 (1 admin + 14 staff)

-- Count customers
SELECT COUNT(*) FROM customers;
-- Should show: 50

-- Count invoices
SELECT COUNT(*) FROM invoices;
-- Should show: 100

-- Check admin user
SELECT email, full_name, is_superuser FROM users WHERE email = 'admin@vantax.co.za';
-- Should show: admin@vantax.co.za | Demo Administrator | t

-- Exit psql
\q
```

### 7. Restart Backend Service

```bash
sudo systemctl restart aria-backend
sudo systemctl status aria-backend
```

**Expected**: Service running without errors

### 8. Test Login

**Option A: Browser**
1. Navigate to: https://aria.vantax.co.za
2. Login with:
   - **Email**: admin@vantax.co.za
   - **Password**: Demo@2025
3. Should see dashboard with data

**Option B: API Test (curl)**

```bash
# Test login endpoint
curl -X POST https://aria.vantax.co.za/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vantax.co.za",
    "password": "Demo@2025"
  }'
```

**Expected response**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "admin@vantax.co.za",
    "full_name": "Demo Administrator",
    "is_superuser": true
  }
}
```

---

## 🔒 SSL Setup (Optional but Recommended)

### Install Certbot

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

### Obtain Certificate

```bash
sudo certbot --nginx -d aria.vantax.co.za
```

**Follow prompts**:
- Email: (your email)
- Agree to terms: Y
- Share email: N
- Redirect HTTP to HTTPS: 2 (Yes)

### Test SSL

```bash
# Check certificate
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run
```

### Verify HTTPS

Visit: https://aria.vantax.co.za (should show lock icon)

---

## ✅ Day 1 Completion Checklist

- [ ] Connected to server successfully
- [ ] Pulled latest code from GitHub
- [ ] Installed Python dependencies
- [ ] Ran `init_database.py` - 52 tables created
- [ ] Ran `seed_comprehensive_data.py` - 620+ records created
- [ ] Verified data in PostgreSQL
- [ ] Restarted backend service
- [ ] Tested login via browser OR curl
- [ ] SSL certificate installed (optional)

---

## 📊 What You Should Have Now

### Database
✅ 52 tables created
✅ 15 users (1 admin + 14 staff)
✅ 50 customers with full SA details
✅ 30 suppliers with banking info
✅ 100 products (goods & services)
✅ 100 invoices with 300+ line items
✅ 25 employees with payroll data

### Credentials
📧 **Admin**: admin@vantax.co.za
🔑 **Password**: Demo@2025

### URLs
🌐 **Frontend**: https://aria.vantax.co.za
🔗 **Backend API**: https://aria.vantax.co.za/api
📖 **API Docs**: https://aria.vantax.co.za/api/docs

---

## 🐛 Common Issues & Solutions

### Issue: "Module not found" error

**Solution**: Install missing dependencies
```bash
cd /opt/aria/backend
sudo /opt/aria/backend/venv/bin/pip install -r requirements.txt
```

### Issue: "Connection to server failed"

**Solution**: Check PostgreSQL is running
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Issue: "Permission denied" when running scripts

**Solution**: Use sudo or change ownership
```bash
sudo chown -R ubuntu:ubuntu /opt/aria
```

### Issue: Login returns 401 Unauthorized

**Solution**: Check backend logs
```bash
sudo journalctl -u aria-backend -n 50 -f
```

---

## 🎯 Next Steps (Day 2)

Once Day 1 is complete, proceed to:

1. **Day 2**: Backend API Development
   - Financial endpoints (Invoices, Payments, GL)
   - CRM endpoints (Customers, Leads, Opportunities)
   
2. **Day 3**: More API Development
   - Procurement endpoints (POs, Suppliers, Products)
   - HR endpoints (Employees, Payroll, Leave)
   - Document endpoints (Upload, OCR, Workflow)

See `SYSTEM_DEVELOPMENT_COMPLETION_PLAN.md` for full roadmap.

---

## 📞 Support

If you encounter issues:
1. Check logs: `sudo journalctl -u aria-backend -n 100`
2. Check database: `sudo -u postgres psql -d aria_db`
3. Check service: `sudo systemctl status aria-backend`
4. Restart all: `sudo systemctl restart aria-backend && sudo systemctl restart nginx`

---

**Status**: 📄 Ready for Day 1 Execution
**Time Required**: 1-2 hours
**Difficulty**: ⭐⭐☆☆☆ (Easy - mostly automated)
