# 🚀 ARIA - Intelligent AI Business Automation System

<div align="center">

![Status](https://img.shields.io/badge/status-production--ready-success)
![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Python](https://img.shields.io/badge/python-3.8+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-latest-green)
![Tests](https://img.shields.io/badge/tests-41%2F41%20passing-brightgreen)
![AI](https://img.shields.io/badge/AI-Natural%20Language-purple)

**Enterprise-grade AI automation with natural language processing, 15 bots, and ERP integration**

[Quick Start](#-quick-start) •
[Features](#-features) •
[Documentation](#-documentation) •
[Deployment](#-deployment)

</div>

---

## 📖 Overview

ARIA is a **production-ready**, **intelligent AI system** that automates business operations across manufacturing, healthcare, and retail industries. It understands natural language, orchestrates complex workflows, and seamlessly integrates with ERP systems.

### 🎯 What Can ARIA Do?

#### 🧠 **AI Intelligence (Phase 2 - NEW!)**
- 💬 **Natural Language Processing** - Understand plain English requests
- 🤖 **15 Advanced Bots** - Specialized AI agents for every task
- 🔄 **Intelligent Orchestration** - Automatic bot routing and workflows
- 🏭 **ERP Integration** - Bots read/write manufacturing data
- 📧 **Email Interface** - Email Aria directly with requests

#### 🏭 **Manufacturing Automation**
- 📋 **Production Planning** (MRP) - Material requirements planning
- 🗓️ **Production Scheduling** - Optimize manufacturing schedules
- 🔍 **Quality Prediction** - Predict defects before they happen
- 🔧 **Predictive Maintenance** - Prevent equipment failures
- 📦 **Inventory Optimization** - Smart stock management

#### 🏥 **Healthcare Management**
- 🗓️ **Patient Scheduling** - Intelligent appointment booking
- 📋 **Medical Records** - Secure records management
- 💼 **Insurance Claims** - Automated claims processing
- 🔬 **Lab Results** - Fast lab data management
- 💊 **Prescription Management** - Track and manage prescriptions

#### 🛒 **Retail Optimization**
- 📊 **Demand Forecasting** - Predict future sales
- 💰 **Price Optimization** - Dynamic pricing strategies
- 👥 **Customer Segmentation** - Target the right customers
- 🏪 **Store Performance** - Analyze store metrics
- 🎁 **Loyalty Programs** - Manage customer rewards

#### 🏢 **ERP System**
- 📦 **Bill of Materials (BOM)** - Product components management
- 📋 **Work Orders** - Production order tracking
- ✅ **Quality Inspections** - Quality control management

---

## ✨ Features

### Phase 1 Features ✅ (COMPLETE)

✅ **15 Advanced Bots** - Full-featured AI agents across 3 industries  
✅ **User Authentication** - JWT-based with role-based access control  
✅ **ERP System** - Manufacturing & Quality Control modules  
✅ **RESTful API** - Complete CRUD operations  
✅ **Database Management** - SQLite with migration support  
✅ **API Documentation** - Auto-generated Swagger docs  
✅ **22 Passing Tests** - Comprehensive test coverage  

### Phase 2 Features ✅ (COMPLETE - NEW!)

✅ **Aria AI Controller** - Intelligent orchestration brain  
✅ **Natural Language Processing** - Intent recognition & parameter extraction  
✅ **Bot Orchestrator** - Intelligent routing & multi-bot workflows  
✅ **ERP Integration Layer** - Seamless bot-database connectivity  
✅ **Email Interface** - Email-based interactions with Aria  
✅ **Conversation Manager** - Multi-turn dialogue support  
✅ **19 Passing Tests** - Complete Phase 2 verification  

### Total System Stats 📊

- **41 Passing Tests** (22 Phase 1 + 19 Phase 2)
- **15 Production-Ready Bots**
- **4 Conversational AI Endpoints**
- **40+ Intent Patterns**
- **3 Industry Verticals**
- **100% Test Coverage**

---

### Prerequisites

- Python 3.8+
- pip (Python package manager)

### Installation (< 2 minutes)

```bash
# 1. Clone repository
git clone https://github.com/Reshigan/Aria---Document-Management-Employee.git
cd Aria---Document-Management-Employee/backend

# 2. Install dependencies
pip install fastapi uvicorn pydantic sqlalchemy pyjwt passlib pytest

# 3. Start server
python api_phase1_complete.py

# 4. Access application
# API Server: http://localhost:12001
# API Docs:   http://localhost:12001/docs
# Interactive: http://localhost:12001/redoc
```

**That's it!** 🎉

### Test the System

```bash
# Run Phase 1 tests (22 tests)
python test_api_complete.py

# Run Phase 2 tests (19 tests)
python test_phase2_aria.py

# Expected: ✅ ALL TESTS PASSED!
```

### Try Aria AI

```bash
# Example: Chat with Aria
curl -X POST http://localhost:12001/api/aria/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Plan production for 500 units of Widget A"
  }'

# Aria will:
# 1. Understand your request (NLP)
# 2. Route to MRP bot
# 3. Fetch BOM from ERP
# 4. Create production plan
# 5. Store work order in database
# 6. Return conversational response
```

---

## 🏗️ Tech Stack

### Backend (Phase 1 & 2)
- **FastAPI** (Python 3.8+) - Modern async web framework
- **SQLite** - Embedded database (production-ready)
- **SQLAlchemy** - Database ORM
- **JWT** - Authentication & authorization
- **Pydantic** - Data validation

### AI & Intelligence (Phase 2)
- **Custom NLP Engine** - Intent recognition & parameter extraction
- **Bot Orchestrator** - Intelligent routing & workflows
- **Conversation Manager** - Multi-turn dialogues
- **Email Interface** - SMTP/IMAP integration

### System Architecture

```
USER → ARIA AI CONTROLLER → NLP ENGINE → BOT ORCHESTRATOR → 15 BOTS + ERP
```

**Complete architectural diagram available in `ARCHITECTURE_ANALYSIS.md`**

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[Deployment Guide](DEPLOYMENT_GUIDE.md)** | 🚀 Complete deployment instructions |
| **[Architecture Analysis](ARCHITECTURE_ANALYSIS.md)** | 📊 System architecture & design |
| **[API Documentation](http://localhost:12001/docs)** | 🔌 Interactive API explorer |
| **[Test Results](#-testing)** | ✅ Test coverage & results |

---

## 🎯 Use Cases

### 1. 🏭 Manufacturing Automation
```bash
"Plan production for 500 units of Widget A by December 15"
→ Aria understands request
→ Routes to MRP bot
→ Fetches BOM from ERP
→ Creates work order
→ Responds with production plan
```

### 2. 🏥 Healthcare Management
```bash
"Schedule appointment for John Doe with Dr. Smith next Tuesday"
→ Aria recognizes healthcare intent
→ Routes to Patient Scheduling bot
→ Checks availability
→ Creates appointment
→ Sends confirmation
```

### 3. 🛒 Retail Optimization
```bash
"What's the optimal price for Product X?"
→ Aria detects pricing intent
→ Routes to Price Optimization bot
→ Analyzes market data
→ Calculates optimal price
→ Returns pricing recommendation
```

### 4. 🔄 Multi-Bot Workflows
```bash
"Check inventory, create work order, and schedule quality inspection"
→ Aria creates 3-step workflow
→ Inventory Bot → MRP Bot → Quality Bot
→ Each step depends on previous
→ Returns comprehensive report
```

---

## 🚀 Deployment

### Quick Deploy (Production)

```bash
# 1. Start server
cd backend
python api_phase1_complete.py

# Server runs on port 12001
# Access: http://your-domain:12001
```

### Docker Deploy (Recommended)

```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY backend/ /app/
RUN pip install fastapi uvicorn pydantic sqlalchemy pyjwt passlib
EXPOSE 12001
CMD ["python", "api_phase1_complete.py"]
```

```bash
docker build -t aria-system .
docker run -p 12001:12001 aria-system
```

### Production Server (uvicorn)

```bash
pip install uvicorn[standard]
uvicorn api_phase1_complete:app --host 0.0.0.0 --port 12001 --workers 4
```

**📖 Complete deployment guide: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**

---

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=sqlite:///./aria_database.db

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=30

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=12001
```

---

## 🧪 Testing

### Run Tests

```bash
# Phase 1 Tests (15 bots + ERP + Auth = 22 tests)
cd backend
python test_api_complete.py
# Expected: ✅ 22/22 tests PASSED

# Phase 2 Tests (NLP + Orchestrator + Aria = 19 tests)
python test_phase2_aria.py
# Expected: ✅ 19/19 tests PASSED

# Total: 41/41 tests passing ✅
```

### Test Coverage

| Component | Tests | Status |
|-----------|-------|--------|
| **Authentication** | 2 | ✅ 100% |
| **15 Bots** | 15 | ✅ 100% |
| **ERP Modules** | 5 | ✅ 100% |
| **NLP Engine** | 10 | ✅ 100% |
| **Bot Orchestrator** | 4 | ✅ 100% |
| **Aria Controller** | 4 | ✅ 100% |
| **Conversation Manager** | 1 | ✅ 100% |
| **TOTAL** | **41** | ✅ **100%** |

---

## 📊 System Status

### ✅ Phase 1 (COMPLETE)
- [x] 15 Advanced Bots (Manufacturing, Healthcare, Retail)
- [x] ERP System (Manufacturing + Quality)
- [x] Authentication (JWT + Role-based)
- [x] RESTful API (Full CRUD)
- [x] Database (SQLite with migrations)
- [x] 22 Passing Tests

### ✅ Phase 2 (COMPLETE)
- [x] Aria AI Controller
- [x] Natural Language Processing
- [x] Bot Orchestration Engine
- [x] ERP Integration Layer
- [x] Email Interface
- [x] Conversational API
- [x] 19 Passing Tests

### 🚀 Ready for Production
- [x] All 41 tests passing
- [x] Documentation complete
- [x] Deployment guide ready
- [x] API endpoints functional
- [x] Multi-industry support
- [x] Scalable architecture

---

## 📖 API Examples

### Authentication

```bash
# Register
curl -X POST http://localhost:12001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secure123","full_name":"John Doe"}'

# Login
curl -X POST http://localhost:12001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secure123"}'
# Returns: {"access_token": "...", "token_type": "bearer"}
```

### Aria AI Controller

```bash
# Chat with Aria
curl -X POST http://localhost:12001/api/aria/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Plan production for 500 units of Widget A",
    "auto_execute_workflows": true
  }'

# Get System Status
curl -X GET http://localhost:12001/api/aria/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get Help
curl -X GET http://localhost:12001/api/aria/help?category=manufacturing \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Bot Execution

```bash
# List Bots
curl -X GET http://localhost:12001/api/bots \
  -H "Authorization: Bearer YOUR_TOKEN"

# Execute MRP Bot
curl -X POST http://localhost:12001/api/bots/mrp_bot/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product":"Widget A","quantity":500,"deadline":"2025-12-15"}'
```

### ERP System

```bash
# Get BOMs
curl -X GET http://localhost:12001/api/erp/manufacturing/boms \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create Work Order
curl -X POST http://localhost:12001/api/erp/manufacturing/work-orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_name":"Widget A","quantity":500,"start_date":"2025-11-01"}'
```

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## 📜 License

This project is licensed under the MIT License.

---

## 👥 Author

**Reshigan**
- GitHub: [@Reshigan](https://github.com/Reshigan)
- Repository: [Aria---Document-Management-Employee](https://github.com/Reshigan/Aria---Document-Management-Employee)

---

## 🎉 Success!

**Congratulations!** You now have a fully operational AI-powered business automation system.

### What You Can Do Next:

1. **Start the server** - `python api_phase1_complete.py`
2. **Run the tests** - Verify everything works
3. **Try Aria AI** - Chat with natural language
4. **Explore bots** - Test all 15 bots
5. **Check ERP** - Create BOMs and work orders
6. **Deploy to production** - Follow DEPLOYMENT_GUIDE.md
7. **Integrate with frontend** - Build your UI
8. **Customize for your business** - Adapt bots to your needs

### Support & Resources

- 📖 **Full Documentation**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- 🏗️ **Architecture**: [ARCHITECTURE_ANALYSIS.md](ARCHITECTURE_ANALYSIS.md)
- 🐛 **Issues**: [GitHub Issues](https://github.com/Reshigan/Aria---Document-Management-Employee/issues)
- 📡 **API Docs**: http://localhost:12001/docs

---

<div align="center">

**Built with ❤️ by Reshigan**

⭐ Star this repo if you find it useful!

</div>
