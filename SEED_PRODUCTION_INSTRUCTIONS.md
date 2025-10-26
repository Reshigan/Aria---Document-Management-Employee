# VantaXDemo Production Seeding Instructions

## Step 1: Upload Seed Script to Production

```bash
# Copy seed script to production server
scp -i Vantax-2.pem backend/seed_vantaxdemo.py ubuntu@3.8.139.178:/home/ubuntu/Aria---Document-Management-Employee/backend/
```

## Step 2: SSH to Production Server

```bash
ssh -i Vantax-2.pem ubuntu@3.8.139.178
```

## Step 3: Run Seed Script

```bash
cd /home/ubuntu/Aria---Document-Management-Employee/backend
python3 seed_vantaxdemo.py
```

## Step 4: Verify Seeding

```bash
# Check if demo user was created
sudo -u postgres psql -d aria_production -c "SELECT email, full_name, is_active FROM users WHERE email LIKE '%vantax.co.za';"
```

## Expected Output

```
===============================================================================
🌱 VANTAXDEMO COMPANY SEEDING
===============================================================================
Creating database tables...
✅ Tables created successfully

🏢 Creating VantaXDemo Company...
✅ Created VantaXDemo company with 5 users

📋 Demo User Credentials:
============================================================
Admin:      demo@vantax.co.za / Demo@2025
Finance:    finance@vantax.co.za / Finance@2025
HR:         hr@vantax.co.za / HR@2025
Compliance: compliance@vantax.co.za / Compliance@2025
Operations: operations@vantax.co.za / Operations@2025
============================================================

... (seeding progress for all 67 bots)

✅ SEEDING COMPLETE!
```

## Step 5: Test Login

Navigate to: https://aria.vantax.co.za

**Login Credentials:**
- Email: `demo@vantax.co.za`
- Password: `Demo@2025`

## Troubleshooting

### If seed script fails:

```bash
# Check backend logs
sudo journalctl -u aria-backend -n 50

# Check database connection
sudo -u postgres psql -d aria_production -c "\dt"

# Restart backend if needed
sudo systemctl restart aria-backend
```

### If database tables don't exist:

```bash
# Run migrations
cd /home/ubuntu/Aria---Document-Management-Employee/backend
python3 -c "from core.database import engine; from models.base import Base; Base.metadata.create_all(bind=engine)"
```

## Next: Run Bot Tests

After seeding, proceed to test all 67 bots with the demo data.
