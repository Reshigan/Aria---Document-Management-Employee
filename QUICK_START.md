# ARIA ERP & BOTS - QUICK START GUIDE
## Get Up and Running in 5 Minutes

---

## 🚀 OPTION 1: Docker (RECOMMENDED)

### Prerequisites
- Docker installed
- Docker Compose installed

### Commands
```bash
# Clone or navigate to repository
cd Aria---Document-Management-Employee

# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f
```

### Access Points
- **Frontend**: https://work-1-rkasyntaaioiwqjt.prod-runtime.all-hands.dev (or http://localhost:12000)
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

---

## 💻 OPTION 2: Local Development

### Backend Setup
```bash
# Navigate to backend
cd backend

# Install dependencies (auto-installer)
python start_backend.py

# Or manual installation
pip install -r requirements.txt

# Start backend
python minimal_app.py
```

Backend will start on: http://localhost:8000

### Frontend Setup
```bash
# Navigate to frontend (in new terminal)
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Start frontend
npm run dev
```

Frontend will start on: http://localhost:12000

---

## 🧪 TESTING THE SYSTEM

### 1. Check Backend Health
```bash
curl http://localhost:8000/health
```

Expected Response:
```json
{
  "status": "healthy",
  "bots_loaded": 8,
  "erp_modules": 5
}
```

### 2. List All Available Bots
```bash
curl http://localhost:8000/api/bots
```

Should return 8 bots:
- invoice_reconciliation
- expense_management
- accounts_payable
- ar_collections
- bank_reconciliation
- lead_qualification
- payroll_sa
- bbbee_compliance

### 3. Test Bot Execution
```bash
curl -X POST http://localhost:8000/api/bots/execute \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "invoice_reconciliation",
    "task": "reconcile",
    "data": {
      "invoice_number": "INV-001",
      "amount": 1000.00
    }
  }'
```

### 4. Test ERP Modules
```bash
# Financial Module
curl http://localhost:8000/api/erp/financial

# HR Module
curl http://localhost:8000/api/erp/hr

# CRM Module
curl http://localhost:8000/api/erp/crm

# Procurement Module
curl http://localhost:8000/api/erp/procurement

# Compliance Module
curl http://localhost:8000/api/erp/compliance
```

### 5. Access Frontend
Open browser: https://work-1-rkasyntaaioiwqjt.prod-runtime.all-hands.dev

---

## 📋 AVAILABLE BOTS QUICK REFERENCE

| Bot Name | Bot ID | Primary Function |
|----------|--------|------------------|
| Invoice Reconciliation | `invoice_reconciliation` | Match invoices with payments |
| Expense Management | `expense_management` | Process expense claims |
| Accounts Payable | `accounts_payable` | Manage vendor invoices |
| AR Collections | `ar_collections` | Track outstanding invoices |
| Bank Reconciliation | `bank_reconciliation` | Match bank transactions |
| Lead Qualification | `lead_qualification` | Score and qualify leads |
| Payroll SA | `payroll_sa` | South African payroll |
| BBBEE Compliance | `bbbee_compliance` | BBBEE tracking & reporting |

---

## 🏢 ERP MODULES QUICK REFERENCE

| Module | Endpoint | Features |
|--------|----------|----------|
| Financial | `/api/erp/financial` | GL, AP/AR, Financial Reports |
| HR | `/api/erp/hr` | Employees, Payroll, Leave |
| CRM | `/api/erp/crm` | Contacts, Sales, Communications |
| Procurement | `/api/erp/procurement` | POs, Vendors, Inventory |
| Compliance | `/api/erp/compliance` | BBBEE, Regulatory, Audits |

---

## 🔧 COMMON COMMANDS

### Docker Commands
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend

# Rebuild and start
docker-compose up --build -d
```

### Backend Commands
```bash
# Start backend
cd backend && python minimal_app.py

# Install dependencies
cd backend && python start_backend.py

# Check what's running
ps aux | grep uvicorn
```

### Frontend Commands
```bash
# Start frontend
cd frontend && npm run dev

# Install dependencies
cd frontend && npm install --legacy-peer-deps

# Build for production
cd frontend && npm run build
```

---

## 🔍 TROUBLESHOOTING

### Backend Issues

**Problem**: Backend won't start
```bash
cd backend
pip install -r requirements.txt
python minimal_app.py
```

**Problem**: Port 8000 already in use
```bash
# Find and kill process
ps aux | grep uvicorn
kill -9 <PID>

# Or change port in minimal_app.py
```

### Frontend Issues

**Problem**: Frontend won't start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run dev
```

**Problem**: Port 12000 already in use
```bash
# Find and kill process
ps aux | grep vite
kill -9 <PID>
```

### Docker Issues

**Problem**: Containers won't start
```bash
docker-compose down -v
docker-compose up --build
```

**Problem**: Need to reset everything
```bash
docker-compose down -v --remove-orphans
docker system prune -a
docker-compose up --build -d
```

---

## 🌐 API DOCUMENTATION

### Interactive API Docs
Once backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Example API Calls

#### Execute Invoice Reconciliation Bot
```bash
curl -X POST http://localhost:8000/api/bots/execute \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "invoice_reconciliation",
    "task": "reconcile_invoices",
    "data": {
      "invoice_ids": ["INV-001", "INV-002"],
      "payment_ids": ["PAY-001", "PAY-002"]
    }
  }'
```

#### Execute Expense Management Bot
```bash
curl -X POST http://localhost:8000/api/bots/execute \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "expense_management",
    "task": "process_expense",
    "data": {
      "employee_id": "EMP-001",
      "amount": 250.00,
      "category": "travel",
      "receipt_url": "https://example.com/receipt.pdf"
    }
  }'
```

#### Get Financial Module Info
```bash
curl http://localhost:8000/api/erp/financial
```

---

## 📊 CURRENT STATUS

### ✅ What's Working
- Backend API (8 bots + 5 ERP modules)
- Frontend development server
- Docker configuration
- All dependencies installed
- Health checks
- API documentation

### 🚧 Production Considerations
- [ ] SSL certificates for HTTPS
- [ ] Production database setup
- [ ] Reverse proxy (nginx)
- [ ] Monitoring and alerting
- [ ] Backup and disaster recovery
- [ ] Log aggregation

---

## 🎉 SUCCESS!

If you can access these URLs, you're ready:

1. **Backend Health**: http://localhost:8000/health
2. **API Docs**: http://localhost:8000/docs
3. **Frontend**: https://work-1-rkasyntaaioiwqjt.prod-runtime.all-hands.dev

### Next Steps
1. Test individual bots using the API
2. Explore ERP modules
3. Customize frontend for your needs
4. Configure production environment
5. Deploy to production server

---

## 📞 NEED HELP?

Check these resources:
1. **Full Status**: See DEPLOYMENT_STATUS.md
2. **API Docs**: http://localhost:8000/docs
3. **Logs**: `docker-compose logs -f` or check `/tmp/backend.log` and `/tmp/frontend.log`

---

**You're all set! Start building with ARIA ERP & BOTS! 🚀**
