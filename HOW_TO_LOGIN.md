# 🚀 HOW TO LOGIN & ACCESS THE SYSTEM

**Quick Guide to Start & Access Aria ERP**

---

## 🎯 STEP-BY-STEP LOGIN GUIDE

### Step 1: Start the Backend Server

Open a terminal and run:

```bash
cd /workspace/project/Aria---Document-Management-Employee/backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**You should see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

✅ **Backend is now running!**

---

### Step 2: Start the Frontend (React)

Open a **NEW terminal** (keep the backend running) and run:

```bash
cd /workspace/project/Aria---Document-Management-Employee/frontend
npm start
```

**Or if you prefer:**
```bash
cd /workspace/project/Aria---Document-Management-Employee/frontend
npm run dev
```

**You should see:**
```
> aria-erp@1.0.0 start
> react-scripts start

Compiled successfully!

You can now view aria-erp in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

✅ **Frontend is now running!**

---

### Step 3: Open Your Browser

Open your web browser and go to:

```
http://localhost:3000
```

**Or use the provided URL:**
```
https://work-1-rkasyntaaioiwqjt.prod-runtime.all-hands.dev
```

---

### Step 4: Login with Default Credentials

**🔑 ADMINISTRATOR LOGIN**

```
Email:    admin@vantax.co.za
Password: Admin@123
```

Click **"Sign In"** or press **Enter**

---

## 🎨 WHAT YOU'LL SEE

### Dashboard Overview

After successful login, you'll see:

1. **📊 Main Dashboard**
   - Company overview
   - Quick statistics
   - Recent activities
   - Pending approvals

2. **📂 Left Sidebar Menu**
   - Dashboard
   - Financial Management
   - Sales & CRM
   - Procurement
   - Inventory
   - Manufacturing
   - HR & Payroll
   - Reports
   - Settings

3. **🔔 Top Navigation Bar**
   - Search bar
   - Notifications
   - User profile
   - Quick actions

---

## 🚀 ALTERNATIVE: ONE-COMMAND START

Want to start everything at once? Create this script:

### Create `start_aria.sh`:

```bash
#!/bin/bash

echo "🚀 Starting Aria ERP System..."
echo ""

# Start backend
echo "📦 Starting Backend Server..."
cd /workspace/project/Aria---Document-Management-Employee/backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "Backend started (PID: $BACKEND_PID)"
echo ""

# Wait for backend to initialize
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Start frontend
echo "🎨 Starting Frontend Server..."
cd /workspace/project/Aria---Document-Management-Employee/frontend
npm start &
FRONTEND_PID=$!

echo "Frontend started (PID: $FRONTEND_PID)"
echo ""

echo "✅ Aria ERP is starting up!"
echo ""
echo "📝 Access the system at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo ""
echo "🔑 Login credentials:"
echo "   Email:    admin@vantax.co.za"
echo "   Password: Admin@123"
echo ""
echo "Press CTRL+C to stop all services"
echo ""

# Wait for user to stop
wait
```

### Make it executable and run:

```bash
chmod +x start_aria.sh
./start_aria.sh
```

---

## 🧪 TEST API DIRECTLY (Optional)

### Test Backend API Without Frontend

You can also access the API directly:

**1. API Documentation (Swagger UI):**
```
http://localhost:8000/docs
```

**2. Login API Test:**

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vantax.co.za",
    "password": "Admin@123"
  }'
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "admin@vantax.co.za",
    "first_name": "System",
    "last_name": "Administrator",
    "role": "admin"
  }
}
```

**3. Get Company Info:**

```bash
# First, get the token from login
TOKEN="your_access_token_here"

curl -X GET "http://localhost:8000/api/company/info" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔍 CHECKING IF SYSTEM IS RUNNING

### Check Backend Status:

```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-29T12:00:00"
}
```

### Check Frontend Status:

Open browser to `http://localhost:3000` - you should see the login page.

---

## 🐛 TROUBLESHOOTING

### ❌ Backend Won't Start?

**Error: Port 8000 already in use**

```bash
# Find and kill process on port 8000
lsof -i :8000
kill -9 <PID>

# Or use fuser
fuser -k 8000/tcp
```

**Error: Database connection failed**

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Check connection
psql -U aria -d aria_erp -c "SELECT 1;"
```

**Error: Module not found**

```bash
cd /workspace/project/Aria---Document-Management-Employee/backend
pip install -r requirements.txt
```

---

### ❌ Frontend Won't Start?

**Error: Port 3000 already in use**

```bash
# Kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or use fuser
fuser -k 3000/tcp
```

**Error: npm command not found**

```bash
# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**Error: Dependencies not installed**

```bash
cd /workspace/project/Aria---Document-Management-Employee/frontend
rm -rf node_modules package-lock.json
npm install
```

---

### ❌ Can't Login?

**Check 1: Verify credentials**
```
Email:    admin@vantax.co.za (NOT admin@vantax.com)
Password: Admin@123 (case-sensitive, with @)
```

**Check 2: Check database users**

```bash
psql -U aria -d aria_erp -c "SELECT email, first_name, last_name FROM users;"
```

**Check 3: Reset password if needed**

```bash
cd /workspace/project/Aria---Document-Management-Employee/backend
python -c "
from database import SessionLocal
from models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
db = SessionLocal()

user = db.query(User).filter_by(email='admin@vantax.co.za').first()
if user:
    user.password = pwd_context.hash('Admin@123')
    db.commit()
    print('✅ Password reset to: Admin@123')
else:
    print('❌ User not found')
"
```

---

## 📱 ACCESS FROM MOBILE/TABLET

### Same Network Access

If you want to access from your phone/tablet on the same network:

1. **Find your computer's IP address:**

```bash
# On Linux/Mac
ifconfig | grep "inet "

# On Windows
ipconfig
```

2. **Access from mobile browser:**

```
http://YOUR_IP_ADDRESS:3000
```

Example: `http://192.168.1.100:3000`

---

## 🌐 PRODUCTION ACCESS

### When Deployed to Production Server

**Production URL:**
```
https://aria.vantax.co.za
```

**Same login credentials:**
```
Email:    admin@vantax.co.za
Password: Admin@123
```

**Then immediately change your password!**

---

## 📋 QUICK CHECKLIST

Before logging in, make sure:

- [ ] PostgreSQL database is running
- [ ] Backend server is running (port 8000)
- [ ] Frontend server is running (port 3000)
- [ ] Browser is open to http://localhost:3000
- [ ] You have the correct credentials

---

## 🎉 YOU'RE IN! WHAT'S NEXT?

Once logged in, try these:

### 1. Explore the Dashboard
- View company information
- Check quick statistics
- See recent activities

### 2. View Master Data
- Navigate to **HR & Payroll** → **Employees** (5 demo employees)
- Navigate to **Sales** → **Customers** (3 demo customers)
- Navigate to **Procurement** → **Suppliers** (3 demo suppliers)

### 3. Generate a Report
- Navigate to **Reports** → **Financial Reports**
- Select **Balance Sheet**
- Choose date: October 31, 2025
- Click **Generate**

### 4. Test Email Automation
- Open your email client
- Send any PDF to: **aria@vantax.co.za**
- Wait 30 seconds
- Check your email for confirmation
- Go to **Dashboard** → **Recent Activities**
- See the processed document

### 5. Try an AI Bot
- Navigate to **AI Bots** → **Financial Bots**
- Select **Invoice Generator**
- Fill in customer details
- Click **Generate Invoice**
- Download the PDF

---

## 💡 TIPS FOR FIRST TIME USERS

1. **Start Simple**
   - Explore the dashboard first
   - Click around to get familiar
   - Check out the demo data

2. **Generate Reports**
   - Try the balance sheet
   - Generate an income statement
   - View the chart of accounts

3. **Test Workflows**
   - Create a purchase requisition
   - Submit a leave request
   - Generate an invoice

4. **Read the Guides**
   - Check `QUICK_START_GUIDE.md`
   - Review `LOGIN_CREDENTIALS.md`
   - See `OFFICE365_CONFIGURATION_COMPLETE.md`

5. **Ask for Help**
   - Check the troubleshooting section
   - Review the documentation
   - Contact support@vantax.co.za

---

## 🆘 NEED HELP?

### Documentation Files
- `LOGIN_CREDENTIALS.md` - All login details
- `QUICK_START_GUIDE.md` - Complete setup guide
- `ARIA_AUTOMATION_DEPLOYMENT.md` - Deployment guide
- `OFFICE365_CONFIGURATION_COMPLETE.md` - Email setup

### Test Scripts
- `test_office365_config.py` - Test email integration
- `deploy_and_test.py` - Full system test

### Support
- Email: support@vantax.co.za
- Documentation: See all .md files in root directory

---

**🎉 ENJOY USING ARIA ERP! 🎉**

**Your AI-Powered, Fully Automated Business Management System**

---

*Document Version: 1.0*  
*Last Updated: October 29, 2025*
