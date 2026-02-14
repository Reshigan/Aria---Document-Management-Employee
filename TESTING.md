# ARIA ERP - Testing Documentation

## Overview

Comprehensive automated testing framework covering frontend UI, backend API, database integrity, D1 table verification, integration/E2E flows, and CI/CD pipeline.

## Test Structure

```
├── frontend/
│   ├── src/__tests__/           # Unit tests (Vitest + React Testing Library)
│   │   ├── components/          # UI component tests
│   │   ├── hooks/               # Custom hook tests
│   │   ├── services/            # API client tests
│   │   └── utils/               # Utility function tests
│   └── tests/e2e/               # E2E tests (Playwright)
│       ├── smoke-basic.spec.ts
│       ├── responsive-layouts.spec.ts
│       ├── form-validations.spec.ts
│       ├── error-states.spec.ts
│       └── user-journeys.spec.ts
├── backend/tests/               # Python tests (pytest)
│   ├── unit/                    # Unit tests
│   │   ├── test_security.py
│   │   ├── test_models.py
│   │   ├── test_config.py
│   │   └── test_middleware.py
│   └── integration/             # Integration tests
│       ├── test_auth_api.py
│       ├── test_erp_endpoints.py
│       └── test_database.py
├── workers-api/test/            # Cloudflare Workers tests (Vitest)
│   ├── auth.test.ts
│   ├── api-endpoints.test.ts
│   ├── services.test.ts
│   ├── middleware.test.ts
│   └── d1-tables.test.ts
└── .github/workflows/
    ├── test.yml                 # CI test pipeline
    └── production.yml           # Production CI/CD
```

## Running Tests Locally

### Frontend Unit Tests

```bash
cd frontend
npm ci
npm run test:unit              # Run unit tests
npm run test:unit:coverage     # Run with coverage report
```

### Frontend E2E Tests

```bash
cd frontend
npm ci
npx playwright install --with-deps
npx playwright test                          # Run all E2E tests
npx playwright test smoke-basic.spec.ts      # Run smoke tests only
npx playwright test --project=chromium       # Specific browser
```

### Backend Tests (Python)

```bash
cd backend
pip install -r requirements.txt
pip install pytest pytest-asyncio pytest-cov httpx
pytest                                       # Run all tests
pytest tests/unit/                           # Unit tests only
pytest tests/integration/                    # Integration tests only
pytest --cov=app --cov-report=html           # With coverage
```

### Workers API Tests

```bash
cd workers-api
npm ci
npm test                                     # Run all tests
npx vitest run test/d1-tables.test.ts        # D1 table tests only
npx vitest run test/services.test.ts         # Service tests only
```

## Environment Variables

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://aria-api.vantax.co.za` |
| `BASE_URL` | Frontend URL for E2E tests | `https://aria.vantax.co.za` |
| `FRONTEND_URL` | Alias for BASE_URL in CI | `https://aria.vantax.co.za` |

### Backend

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET_KEY` | Secret for JWT signing | Yes |
| `ENVIRONMENT` | `development` / `production` | No |

### Workers API

| Variable | Description |
|----------|-------------|
| `ENVIRONMENT` | Runtime environment |
| `JWT_SECRET` | JWT signing secret |

## Test Categories

### 1. Frontend Unit Tests
- **Components**: ErrorBoundary, EmptyState, Layout, Dashboard
- **Hooks**: useKeyboardShortcuts
- **Services**: API client (HTTP methods, error handling, interceptors)
- **Utils**: Formatters, currency, auth helpers

### 2. Frontend E2E Tests
- **Responsive Layouts**: Desktop (1280x720), Tablet (768x1024), Mobile (375x812)
- **Form Validations**: Login, registration, required fields, input formats
- **Error States**: 404 handling, network errors, auth errors, empty states
- **User Journeys**: Login flow, navigation, CRUD operations, data persistence

### 3. Backend Unit Tests
- **Security**: Password hashing, JWT token creation/verification
- **Models**: User, Company, Customer, Supplier, Invoice, Payment
- **Config**: Settings validation, defaults, JWT parameters
- **Middleware**: Rate limiting, IP extraction, request tracking

### 4. Backend Integration Tests
- **Auth API**: Registration, login, token validation, user management
- **ERP Endpoints**: Customers, suppliers, products, quotes, invoices, POs
- **Database**: Constraints, relationships, data types, indexes, table structure

### 5. Workers API Tests
- **Auth**: Password hashing, JWT, registration, login, sessions
- **API Endpoints**: All CRUD endpoints with status codes and validation
- **Services**: Intent classification, bot scheduling, quote/invoice/payroll generation
- **Middleware**: Token extraction, RBAC, CORS, rate limiting, error handling
- **D1 Tables**: All 90+ table definitions, seed data, indexes, foreign keys

### 6. D1 Database Verification
- **Table Existence**: Verifies all tables from 20 migration files exist
- **Seed Data**: Validates demo company, customers, suppliers, products, employees, departments, warehouses, bank accounts, chart of accounts, stock levels
- **Indexes**: Verifies 50+ indexes for performance (company_id, status, FKs)
- **Foreign Keys**: Validates 20+ relationships with cascade deletes
- **SA Compliance**: PAYE, UIF, VAT accounts for South African tax requirements

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/test.yml`) runs on every push and PR:

1. **Frontend Unit Tests** - Vitest with coverage reporting
2. **Frontend E2E Tests** - Playwright against production
3. **Backend Tests** - Workers API Vitest tests
4. **Network Error Detection** - Production endpoint monitoring
5. **Smoke Tests** - Post-build production smoke tests
6. **Test Summary** - Aggregated results report

### Coverage Threshold

Minimum coverage threshold: **80%**

## Test Commands Reference

| Command | Description |
|---------|-------------|
| `cd frontend && npm run test:unit` | Frontend unit tests |
| `cd frontend && npm run test:unit:coverage` | Frontend unit tests with coverage |
| `cd frontend && npx playwright test` | Frontend E2E tests |
| `cd backend && pytest` | Backend tests |
| `cd backend && pytest --cov=app` | Backend tests with coverage |
| `cd workers-api && npm test` | Workers API tests |
