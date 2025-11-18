# Go-Live Testing Procedure for ARIA ERP System

## Document Information
- **Version:** 1.0
- **Date:** November 18, 2025
- **System:** ARIA v3.0 - Complete Production System
- **Environment:** Production Readiness Testing

## Executive Summary

This document outlines the comprehensive testing procedure for validating the ARIA ERP system before go-live. The procedure includes automated API testing, manual verification steps, and success criteria for production deployment.

## Table of Contents

1. [Overview and Scope](#overview-and-scope)
2. [Readiness Prerequisites](#readiness-prerequisites)
3. [Test Matrix](#test-matrix)
4. [Automation Strategy](#automation-strategy)
5. [Execution Plan](#execution-plan)
6. [Success Criteria](#success-criteria)
7. [Sign-Off Process](#sign-off-process)

---

## 1. Overview and Scope

### 1.1 Objective

Validate that the ARIA ERP system is ready for production deployment by testing:
- Core system health and connectivity
- Authentication and authorization
- All ERP module CRUD operations
- Cross-module business processes (P2P, O2C)
- Data integrity and consistency
- Performance and latency requirements
- Frontend-backend integration

### 1.2 Environments Under Test

- **Backend API:** http://localhost:8000 (Production: TBD)
- **Frontend:** http://localhost:12001 (Production: TBD)
- **Database:** PostgreSQL 14 on localhost:5432
- **Database Name:** aria_erp
- **Test Company ID:** 6dbbf872-eebc-4341-8e2c-cac36587a5cb

### 1.3 Test Data Policy

- **Seeding:** Automated tests will create minimal test data with prefix `GOLIVE_TEST_`
- **Cleanup:** Test data cleanup is optional (controlled by `TEST_ENABLE_CLEANUP` env var)
- **Isolation:** Tests use dedicated test company to avoid polluting production data

### 1.4 Out of Scope

- Performance testing under high load (separate load testing required)
- Security penetration testing (separate security audit required)
- Third-party integrations (SAP, Office365, etc.)
- Mobile app testing
- Bot execution testing (67 bots are loaded but not tested individually)

---

## 2. Readiness Prerequisites

### 2.1 Infrastructure Requirements

- [ ] PostgreSQL 14+ installed and running
- [ ] Database `aria_erp` created with user `aria_user`
- [ ] All migrations executed successfully (101+ tables expected)
- [ ] Backend server running on port 8000
- [ ] Frontend server running on port 12001
- [ ] Network connectivity between frontend and backend

### 2.2 Database Verification

```bash
# Check PostgreSQL is running
systemctl status postgresql

# Verify database exists and is accessible
PGPASSWORD=aria_password psql -h localhost -U aria_user -d aria_erp -c "\dt"

# Count tables (should be 101+)
PGPASSWORD=aria_password psql -h localhost -U aria_user -d aria_erp -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

### 2.3 Backend Verification

```bash
# Check backend is running
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","version":"3.0.0","bots":67,"erp_modules":8}
```

### 2.4 Test User Credentials

- **Admin User:** admin@test.com / admin123 (created automatically by tests)
- **Standard User:** user@test.com / user123 (created automatically by tests)
- **Company ID:** 6dbbf872-eebc-4341-8e2c-cac36587a5cb

---

## 3. Test Matrix

### 3.1 Priority Levels

- **P0 (Critical):** Must pass 100% for go-live approval
- **P1 (High):** Must pass ≥90% for go-live approval
- **P2 (Medium):** Nice to have, can be fixed post-launch

### 3.2 Module Coverage

| Module | Priority | Endpoints | CRUD Operations | E2E Flows |
|--------|----------|-----------|-----------------|-----------|
| **General Ledger** | P0 | `/api/erp/gl/*` | Chart of Accounts, Journal Entries | Journal Entry Posting |
| **Order-to-Cash** | P0 | `/api/erp/order-to-cash/*` | Quotes, Sales Orders, Deliveries, Invoices | Quote → SO → Delivery → Invoice |
| **Procure-to-Pay** | P0 | `/api/erp/procure/*` | Purchase Orders, Goods Receipts, AP Invoices | PO → GRN → AP Invoice |
| **Master Data** | P0 | `/api/erp/master-data/*` | Customers, Suppliers, Products | Data creation and validation |
| **Banking** | P1 | `/api/erp/banking/*` | Bank Accounts, Transactions | Account creation, transaction posting |
| **HR & Payroll** | P1 | `/api/erp/hr/*` | Employees, Payroll Runs, Leave | Employee onboarding, payroll run |
| **Inventory/WMS** | P1 | `/api/inventory/*` | Warehouses, Stock Movements, Stock On Hand | Stock receipt, movement, adjustment |
| **Manufacturing** | P1 | `/api/erp/manufacturing/*` | Work Orders, Production Runs | Work order creation and completion |
| **CRM** | P2 | `/api/erp/crm/*` | Leads, Opportunities | Lead conversion |
| **Field Service** | P2 | `/api/erp/field-service/*` | Service Requests, Technicians | Service request lifecycle |
| **Fixed Assets** | P2 | `/api/erp/fixed-assets/*` | Assets, Depreciation | Asset acquisition and depreciation |

### 3.3 Test Categories

#### 3.3.1 Smoke Tests (P0)
- System health check
- OpenAPI spec accessibility
- Authentication endpoints
- Database connectivity
- No 500 errors on basic endpoints

#### 3.3.2 CRUD Tests (P0/P1)
For each module:
- **Create:** POST new entity with valid data
- **Read:** GET entity by ID and list entities
- **Update:** PUT/PATCH entity with modified data
- **Delete:** DELETE entity (or mark inactive)

#### 3.3.3 E2E Business Process Tests (P0)
- **Procure-to-Pay:** Supplier → Product → PO → GRN → AP Invoice → Payment
- **Order-to-Cash:** Customer → Product → Quote → SO → Delivery → AR Invoice → Receipt
- **GL Posting:** Create journal entry → Post → Verify trial balance

#### 3.3.4 Data Integrity Tests (P0)
- Journal entries are balanced (debit = credit)
- Stock on hand reconciles to movements
- AR/AP aging ties to invoices and payments
- No negative stock (unless allowed by config)

#### 3.3.5 Performance Tests (P1)
- Median API latency < 500ms for CRUD operations
- P95 latency < 1500ms
- No memory leaks during test execution

#### 3.3.6 Frontend Integration Tests (P1)
- All ERP routes render without errors
- Forms open and submit successfully
- No console errors on critical pages

---

## 4. Automation Strategy

### 4.1 Test Framework

- **API Testing:** pytest + requests
- **UI Testing:** Playwright (optional, for smoke tests only)
- **Reporting:** JUnit XML + HTML summary + Go/No-Go checklist

### 4.2 Test Structure

```
tests/
├── __init__.py
├── config.py                    # Test configuration
├── test_smoke.py                # P0 smoke tests
├── test_gl.py                   # General Ledger tests
├── test_order_to_cash.py        # O2C module tests
├── test_procure_to_pay.py       # P2P module tests
├── test_master_data.py          # Master data tests
├── test_banking.py              # Banking tests
├── test_hr_payroll.py           # HR & Payroll tests
├── test_inventory.py            # Inventory/WMS tests
├── test_manufacturing.py        # Manufacturing tests
├── test_e2e_p2p.py             # E2E Procure-to-Pay flow
├── test_e2e_o2c.py             # E2E Order-to-Cash flow
├── utils/
│   ├── __init__.py
│   ├── client.py               # API client with auth
│   └── auth.py                 # Authentication helpers
├── fixtures/
│   ├── __init__.py
│   └── seed_data.py            # Test data seeding
└── reports/
    └── latest/                 # Generated test reports
```

### 4.3 Running Tests

```bash
# Set environment variables (optional)
export TEST_BASE_URL="http://localhost:8000"
export TEST_COMPANY_ID="6dbbf872-eebc-4341-8e2c-cac36587a5cb"
export TEST_ADMIN_EMAIL="admin@test.com"
export TEST_ADMIN_PASSWORD="admin123"

# Run all tests
cd tests/
python3 -m pytest -v --tb=short --html=reports/latest/index.html

# Run specific test category
python3 -m pytest test_smoke.py -v              # Smoke tests only
python3 -m pytest test_gl.py -v                 # GL tests only
python3 -m pytest test_e2e_*.py -v              # E2E tests only

# Run with coverage
python3 -m pytest --cov=. --cov-report=html
```

---

## 5. Execution Plan

### 5.1 Test Execution Order

Tests should be executed in the following order to ensure dependencies are met:

1. **Phase 1: Infrastructure (P0)**
   - Smoke tests
   - Database connectivity
   - Authentication

2. **Phase 2: Master Data (P0)**
   - Chart of Accounts
   - Products
   - Customers (if available)
   - Suppliers (if available)

3. **Phase 3: Core ERP Modules (P0)**
   - General Ledger
   - Order-to-Cash
   - Procure-to-Pay

4. **Phase 4: Supporting Modules (P1)**
   - Banking
   - HR & Payroll
   - Inventory/WMS
   - Manufacturing

5. **Phase 5: E2E Business Processes (P0)**
   - Procure-to-Pay flow
   - Order-to-Cash flow

6. **Phase 6: Data Integrity (P0)**
   - GL balancing
   - Stock reconciliation
   - AR/AP aging

7. **Phase 7: Performance (P1)**
   - Latency measurements
   - Resource utilization

8. **Phase 8: Frontend Integration (P1)**
   - Route accessibility
   - Form submissions
   - Console error checks

### 5.2 Test Execution Timeline

- **Automated Tests:** 15-30 minutes
- **Manual Verification:** 30-60 minutes
- **Report Generation:** 5 minutes
- **Total:** ~2 hours

### 5.3 Test Environment Setup

Before running tests:

```bash
# 1. Ensure PostgreSQL is running
sudo systemctl start postgresql

# 2. Ensure backend is running
cd backend/
python3 production_main.py &

# 3. Ensure frontend is running
cd frontend/
npm run dev &

# 4. Wait for services to be ready
sleep 10

# 5. Verify health
curl http://localhost:8000/health
curl http://localhost:12001
```

---

## 6. Success Criteria

### 6.1 Functional Criteria

- [ ] **P0 Tests:** 100% pass rate (0 failures allowed)
- [ ] **P1 Tests:** ≥90% pass rate (max 10% failures allowed)
- [ ] **P2 Tests:** ≥70% pass rate (informational only)
- [ ] **No 5xx Errors:** Zero internal server errors during test execution
- [ ] **No 401/403 Errors:** Zero authentication/authorization errors for authenticated requests
- [ ] **E2E Flows Complete:** All P0 business processes complete end-to-end successfully

### 6.2 Non-Functional Criteria

- [ ] **Median API Latency:** < 500ms for CRUD operations
- [ ] **P95 API Latency:** < 1500ms for CRUD operations
- [ ] **Database Queries:** No slow queries (>1s) in logs
- [ ] **Memory Usage:** Backend memory stable (no leaks)
- [ ] **Frontend Console:** No errors on P0 routes

### 6.3 Data Integrity Criteria

- [ ] **GL Entries Balanced:** All journal entries have debit = credit
- [ ] **Stock Reconciliation:** Stock on hand = receipts - issues
- [ ] **AR/AP Aging:** Aging reports tie to invoices and payments
- [ ] **No Orphaned Records:** All foreign keys valid

### 6.4 Go/No-Go Decision Matrix

| Criteria | Weight | Pass Threshold | Status |
|----------|--------|----------------|--------|
| P0 Functional Tests | 40% | 100% | ⬜ |
| P1 Functional Tests | 20% | 90% | ⬜ |
| E2E Business Processes | 20% | 100% | ⬜ |
| Performance (Latency) | 10% | <500ms median | ⬜ |
| Data Integrity | 10% | 100% | ⬜ |
| **TOTAL** | **100%** | **≥90%** | ⬜ |

**Go-Live Decision:**
- **GO:** Total score ≥90% AND all P0 criteria met
- **NO-GO:** Total score <90% OR any P0 criteria failed

---

## 7. Sign-Off Process

### 7.1 Test Report Deliverables

1. **Automated Test Report** (`reports/latest/index.html`)
   - Test execution summary
   - Pass/fail counts by module
   - Failed test details with stack traces
   - Performance metrics (latency, throughput)

2. **Go/No-Go Checklist** (`reports/latest/go_no_go_checklist.md`)
   - One-page summary of all success criteria
   - Pass/fail status for each criterion
   - Overall recommendation (GO/NO-GO)
   - Known issues and workarounds

3. **Test Evidence** (`reports/latest/evidence/`)
   - API request/response logs
   - Database state snapshots
   - Frontend screenshots (if UI tests run)

### 7.2 Sign-Off Roles

| Role | Responsibility | Sign-Off Required |
|------|----------------|-------------------|
| **QA Lead** | Execute tests, generate reports | ✅ Required |
| **Technical Lead** | Review technical issues, approve fixes | ✅ Required |
| **Product Owner** | Review business process flows | ✅ Required |
| **DevOps Lead** | Verify infrastructure readiness | ✅ Required |
| **Project Manager** | Final go-live approval | ✅ Required |

### 7.3 Sign-Off Template

```
ARIA ERP System - Go-Live Approval

Test Execution Date: _______________
Test Report Version: _______________

Test Results Summary:
- P0 Tests: ___% pass rate
- P1 Tests: ___% pass rate
- E2E Flows: ___% pass rate
- Performance: ___ ms median latency
- Data Integrity: ___% pass rate

Overall Score: ___%

Decision: [ ] GO  [ ] NO-GO

Signatures:
- QA Lead: _________________ Date: _______
- Technical Lead: ___________ Date: _______
- Product Owner: ____________ Date: _______
- DevOps Lead: ______________ Date: _______
- Project Manager: __________ Date: _______

Known Issues (if any):
1. _______________________________________
2. _______________________________________
3. _______________________________________

Mitigation Plan (if NO-GO):
_____________________________________________
_____________________________________________
```

---

## 8. Known Issues and Limitations

### 8.1 Current System State (as of Nov 18, 2025)

**✅ Working:**
- PostgreSQL database with 101 tables
- Backend API with 8 ERP modules loaded
- Frontend with all routes configured
- Authentication system
- General Ledger endpoints
- Order-to-Cash endpoints
- Banking endpoints
- Journal Entries
- Chart of Accounts
- Warehouses
- Stock On Hand

**⚠️ Issues Found:**
- `customers` and `suppliers` base tables missing from database
  - Related tables exist: `supplier_invoices`, `supplier_payments`, etc.
  - Endpoints return 500 errors when accessing these tables
  - **Impact:** Master Data module partially non-functional
  - **Workaround:** Use Order-to-Cash customers endpoint instead
  - **Fix Required:** Create migration for base customers/suppliers tables

**📋 Not Tested:**
- 67 bots (loaded but not individually tested)
- SAP integration endpoints
- Document generation
- Workflow orchestration
- Mobile API
- Third-party integrations

### 8.2 Recommendations

1. **Immediate (Pre-Go-Live):**
   - Create customers and suppliers base tables
   - Run full automated test suite
   - Fix any P0 failures

2. **Short-Term (Post-Go-Live):**
   - Add comprehensive E2E tests for all modules
   - Implement performance monitoring
   - Add automated regression testing to CI/CD

3. **Long-Term:**
   - Implement load testing (100+ concurrent users)
   - Add security penetration testing
   - Implement automated UI testing with Playwright
   - Add monitoring and alerting for production

---

## 9. Appendix

### 9.1 Environment Variables

```bash
# Test Configuration
TEST_BASE_URL=http://localhost:8000
TEST_FRONTEND_URL=http://localhost:12001
TEST_COMPANY_ID=6dbbf872-eebc-4341-8e2c-cac36587a5cb

# Authentication
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=admin123
TEST_USER_EMAIL=user@test.com
TEST_USER_PASSWORD=user123

# Test Behavior
TEST_TIMEOUT=30
TEST_ENABLE_SEED=true
TEST_ENABLE_CLEANUP=false

# Success Criteria
MAX_API_LATENCY_MS=500
MAX_P95_LATENCY_MS=1500
MIN_P0_PASS_RATE=1.0
MIN_P1_PASS_RATE=0.9
```

### 9.2 Useful Commands

```bash
# Check database tables
PGPASSWORD=aria_password psql -h localhost -U aria_user -d aria_erp -c "\dt"

# Check backend logs
tail -f backend/logs/production.log

# Check frontend logs
tail -f frontend/logs/vite.log

# Test specific endpoint
curl -H "Authorization: Bearer <token>" \
     "http://localhost:8000/api/erp/gl/accounts?company_id=<company_id>"

# Generate test report
cd tests/
python3 -m pytest --html=reports/latest/index.html --self-contained-html
```

### 9.3 Contact Information

- **Technical Support:** support@aria-erp.com
- **Project Manager:** pm@aria-erp.com
- **Emergency Hotline:** +1-XXX-XXX-XXXX

---

**Document Version:** 1.0  
**Last Updated:** November 18, 2025  
**Next Review Date:** Before Go-Live
