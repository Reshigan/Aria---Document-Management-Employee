# ARIA ERP - Automated Test Suite

Comprehensive automated test suite for the ARIA ERP system. This test suite covers all 254 pages, 37 API routes, and every bit of functionality in the system.

## Quick Start

```bash
# Install Playwright browsers (first time only)
npm run test:install

# Run all tests against production
npm run test:full

# Run API integration tests
npm run test:api

# Run smoke tests
npm run test:smoke

# Run tests with UI (interactive mode)
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed

# View test report
npm run test:report
```

## Test Files

| File | Description | Tests |
|------|-------------|-------|
| `full-system-test.spec.ts` | Comprehensive E2E tests for all pages | 400+ |
| `api-integration.spec.ts` | API endpoint tests | 50+ |
| `smoke.spec.ts` | Quick smoke tests | 20+ |
| `auth.spec.ts` | Authentication tests | 10+ |
| `erp-modules.spec.ts` | ERP module tests | 50+ |
| `comprehensive.spec.ts` | Legacy comprehensive tests | 100+ |

## Test Configuration

Configuration is centralized in `test-config.ts`:

- **BASE_URL**: Frontend URL (default: https://aria.vantax.co.za)
- **API_URL**: Backend API URL (default: https://aria-api.reshigan-085.workers.dev)
- **DEMO_USER**: Test credentials (demo@aria.vantax.co.za / Demo123!)

## Test Coverage by Module

### 1. Authentication Module (10 tests)
- Login page loading
- Valid/invalid credential handling
- Session persistence
- Protected route redirects

### 2. Dashboard Module (15 tests)
- Executive dashboard loading
- Financial metrics display
- Automation agents section
- Navigation menu
- Search functionality (Ctrl+K)

### 3. Financial Module - General Ledger (20 tests)
- Chart of Accounts
- Journal Entries
- Budget Management
- Cost Centers

### 4. Financial Module - Accounts Payable (25 tests)
- AP Dashboard
- Bills management
- Payments
- Suppliers
- Payment Batches
- Expense Claims

### 5. Financial Module - Accounts Receivable (25 tests)
- AR Dashboard
- Customers
- Invoices (list and create)
- Receipts
- Credit Notes
- Collections

### 6. Financial Module - Banking (15 tests)
- Bank Accounts
- Reconciliation
- Cash Forecast
- Bank Transfers

### 7. Financial Reports (20 tests)
- Profit & Loss Statement
- Balance Sheet
- AR Aging Report
- VAT Summary Report

### 8. Operations Module - Sales & CRM (30 tests)
- CRM Dashboard
- Customers
- Quotes (with New Quote button)
- Sales Orders
- Deliveries
- Price Lists
- Discounts
- Sales Targets
- Commissions

### 9. Operations Module - Inventory (25 tests)
- Products
- Stock
- Warehouses
- Stock Movements
- Stock Adjustments
- Stock Transfers
- Reorder Points

### 10. Operations Module - Procurement (30 tests)
- Purchase Orders
- ERP Purchase Orders
- Goods Receipts
- Suppliers
- RFQ
- Requisitions

### 11. Operations Module - Manufacturing (20 tests)
- Work Orders
- BOM
- Production
- Production Planning
- Machine Maintenance

### 12. People Module - HR (25 tests)
- HR Dashboard
- Employees
- Departments
- Attendance
- Leave Management
- Positions
- Performance Reviews
- Training
- Skills Matrix

### 13. People Module - Payroll (20 tests)
- Payroll Dashboard
- Employees
- Payroll Runs
- Tax Filings
- Salary Structures
- Deductions
- PAYE Returns
- UIF Returns

### 14. People Module - Recruitment (15 tests)
- Job Postings
- Applicants
- Onboarding

### 15. Services Module - Field Service (25 tests)
- Service Orders
- Technicians
- Scheduling
- Route Planning
- Service Contracts

### 16. Services Module - Projects (20 tests)
- Projects Dashboard
- Tasks
- Timesheets
- Project Reports
- Milestones

### 17. Services Module - Support (15 tests)
- Support Tickets
- Knowledge Base
- Helpdesk
- Helpdesk Teams

### 18. Compliance Module (25 tests)
- VAT Returns
- Asset Register
- B-BBEE
- Audit Trail
- Risk Register
- Document Control
- Policies
- Tax Compliance
- Fixed Assets

### 19. Admin Module (30 tests)
- Settings
- System Settings
- Company Settings
- Bot Configuration
- User Management
- Data Import
- RBAC Management
- Integrations
- Mobile Management

### 20. Agents & Bots Module (20 tests)
- Agents page
- Bot Dashboard

### 21. Documents Module (20 tests)
- Document Templates
- Generate Document
- Document Classification

### 22. Reports Module (25 tests)
- Reports Dashboard
- Stock Valuation Report
- Payroll Activity Report
- Expense Management Report
- B-BBEE Compliance Report

### 23. Chat & AI Module (15 tests)
- Chat page
- Ask ARIA

### 24. Master Data Module (20 tests)
- Customers
- Suppliers

### 25. Pending Actions Module (10 tests)
- Pending Actions page

### 26. Pricing Module (15 tests)
- Pricing page
- Customer Groups
- Pricelists
- Pricing Rules
- Price Calculator

### 27. Product Hierarchy Module (15 tests)
- Product Categories
- Product Templates
- Product Attributes
- Product Variants

### 28. Quality Module (10 tests)
- Quality Dashboard

### 29. Migration Module (10 tests)
- Migration Jobs
- Migration Validation

### 30. End-to-End Workflow Tests (50 tests)
- Quote to Sales Order workflow
- Purchase Order to Goods Receipt workflow
- Customer creation workflow
- Supplier creation workflow
- Invoice creation workflow
- Navigation between modules

## API Integration Tests

### Health Check (2 tests)
- Health endpoint returns 200
- Valid JSON response

### Authentication API (2 tests)
- Login with valid credentials
- Login with invalid credentials

### Dashboard API (2 tests)
- Executive dashboard endpoint
- Dashboard metrics endpoint

### BI & Analytics API (5 tests)
- Executive dashboard BI
- AR Aging report
- AP Aging report
- Sales analytics
- Procurement analytics

### ERP Master Data API (3 tests)
- Customers list
- Suppliers list
- Products list

### ERP Transactions API (5 tests)
- Purchase orders
- Goods receipts
- Quotes
- Sales orders
- Invoices

### Bots API (3 tests)
- Bots list
- Bot configurations
- Bot runs history

### Documents API (1 test)
- Document types

### New Pages API (11 tests)
- Budgets, Cost Centers, Expense Claims
- Collections, Requisitions, Positions
- Performance Reviews, Training Courses
- VAT Returns, B-BBEE Scorecards
- Support Tickets

### Microfeatures API (3 tests)
- Notifications
- Recent items
- Favorites

### Menu API (1 test)
- Menu structure

### CRUD Operations (4 tests)
- Create, Read, Update, Delete customer

### Error Handling (3 tests)
- Invalid endpoint returns 404
- Invalid JSON body returns error
- Missing required fields returns error

### Performance Tests (3 tests)
- Health endpoint < 1 second
- Dashboard endpoint < 3 seconds
- List endpoints < 2 seconds

### Data Validation Tests (3 tests)
- Customer list structure
- Invoice list structure
- BI dashboard metrics

## Running Tests

### Run All Tests
```bash
npm run test:full
```

### Run Specific Test File
```bash
npx playwright test full-system-test.spec.ts
```

### Run Specific Test
```bash
npx playwright test -g "Login with valid credentials"
```

### Run Tests in Debug Mode
```bash
npm run test:debug
```

### Run Tests with Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FRONTEND_URL` | Frontend URL to test | https://aria.vantax.co.za |
| `API_URL` | API URL to test | https://aria-api.reshigan-085.workers.dev |
| `TEST_EMAIL` | Test user email | demo@aria.vantax.co.za |
| `TEST_PASSWORD` | Test user password | Demo123! |

## Test Reports

After running tests, view the HTML report:
```bash
npm run test:report
```

Reports are generated in:
- `test-results/html-report/` - HTML report
- `test-results/results.json` - JSON results
- `test-results/results.xml` - JUnit XML results

## CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run Tests
  run: npm run test:full
  env:
    FRONTEND_URL: https://aria.vantax.co.za

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: frontend/test-results/
```

## Troubleshooting

### Tests failing with timeout
Increase timeout in playwright.config.ts or use:
```bash
npx playwright test --timeout=60000
```

### Browser not installed
```bash
npm run test:install
```

### Authentication issues
Verify credentials in test-config.ts match the demo user.

### Network errors
Check that the FRONTEND_URL and API_URL are accessible.

## Contributing

When adding new pages or features:
1. Add route to `test-config.ts` ROUTES object
2. Add API endpoint to `test-config.ts` API_ENDPOINTS object
3. Add test cases to appropriate test file
4. Run tests to verify

## Total Test Count

- **E2E Tests**: 400+
- **API Tests**: 50+
- **Total**: 450+ automated tests

This test suite ensures comprehensive coverage of the entire ARIA ERP system and should be run after every code change to catch regressions.
