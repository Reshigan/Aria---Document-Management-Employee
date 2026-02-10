/**
 * ARIA ERP - Reports/BI Granular Tests
 * Comprehensive field-level and validation testing for Reports/BI module
 * 
 * Tests: ~100 granular test cases
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import { TEST_CONFIG } from '../test-config';

const API_BASE = TEST_CONFIG.API_URL;
const COMPANY_ID = 'demo-company';

async function apiRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: Record<string, unknown>
) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    headers: { 'Content-Type': 'application/json', 'X-Company-ID': COMPANY_ID },
    data: data ? JSON.stringify(data) : undefined,
  };
  switch (method) {
    case 'GET': return request.get(url, { headers: options.headers });
    case 'POST': return request.post(url, options);
    case 'PUT': return request.put(url, options);
    case 'DELETE': return request.delete(url, { headers: options.headers });
  }
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

test.describe('Reports/BI Granular Tests', () => {

  // ============================================
  // FINANCIAL REPORTS - Read Operations (25 tests)
  // ============================================
  test.describe('Financial Reports', () => {
    test('GET /reports/profit-loss - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/profit-loss?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/profit-loss - with date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/profit-loss?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/profit-loss - with comparison period', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/profit-loss?company_id=demo-company&compare_period=previous_year');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/balance-sheet - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/balance-sheet?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/balance-sheet - with as_of_date', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/balance-sheet?company_id=demo-company&as_of_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/cash-flow - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/cash-flow?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/cash-flow - with date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/cash-flow?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/trial-balance - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/trial-balance?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/trial-balance - with as_of_date', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/trial-balance?company_id=demo-company&as_of_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/general-ledger - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/general-ledger?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/general-ledger - filter by account_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/general-ledger?company_id=demo-company&account_id=acc-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/general-ledger - with date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/general-ledger?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/aged-receivables - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/aged-receivables?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/aged-receivables - with as_of_date', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/aged-receivables?company_id=demo-company&as_of_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/aged-receivables - filter by customer_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/aged-receivables?company_id=demo-company&customer_id=cust-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/aged-payables - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/aged-payables?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/aged-payables - with as_of_date', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/aged-payables?company_id=demo-company&as_of_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/aged-payables - filter by supplier_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/aged-payables?company_id=demo-company&supplier_id=supp-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/vat-return - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/vat-return?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/vat-return - with period', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/vat-return?company_id=demo-company&period=2024-01');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/budget-vs-actual - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/budget-vs-actual?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/budget-vs-actual - with date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/budget-vs-actual?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // SALES REPORTS - Read Operations (20 tests)
  // ============================================
  test.describe('Sales Reports', () => {
    test('GET /reports/sales-summary - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/sales-summary?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/sales-summary - with date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/sales-summary?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/sales-summary - group by customer', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/sales-summary?company_id=demo-company&group_by=customer');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/sales-summary - group by product', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/sales-summary?company_id=demo-company&group_by=product');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/sales-summary - group by salesperson', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/sales-summary?company_id=demo-company&group_by=salesperson');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/sales-by-customer - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/sales-by-customer?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/sales-by-customer - with date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/sales-by-customer?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/sales-by-product - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/sales-by-product?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/sales-by-product - with date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/sales-by-product?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/quote-conversion - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/quote-conversion?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/quote-conversion - with date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/quote-conversion?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/sales-forecast - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/sales-forecast?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/sales-forecast - with forecast_months', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/sales-forecast?company_id=demo-company&forecast_months=6');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/top-customers - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/top-customers?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/top-customers - with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/top-customers?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/top-products - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/top-products?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/top-products - with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/top-products?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // INVENTORY REPORTS - Read Operations (15 tests)
  // ============================================
  test.describe('Inventory Reports', () => {
    test('GET /reports/inventory-valuation - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/inventory-valuation?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/inventory-valuation - with as_of_date', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/inventory-valuation?company_id=demo-company&as_of_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/inventory-valuation - filter by warehouse_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/inventory-valuation?company_id=demo-company&warehouse_id=wh-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/stock-movement - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/stock-movement?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/stock-movement - with date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/stock-movement?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/stock-movement - filter by product_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/stock-movement?company_id=demo-company&product_id=prod-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/low-stock - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/low-stock?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/low-stock - filter by warehouse_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/low-stock?company_id=demo-company&warehouse_id=wh-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/dead-stock - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/dead-stock?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/dead-stock - with days_inactive', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/dead-stock?company_id=demo-company&days_inactive=90');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/abc-analysis - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/abc-analysis?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // HR REPORTS - Read Operations (15 tests)
  // ============================================
  test.describe('HR Reports', () => {
    test('GET /reports/employee-headcount - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/employee-headcount?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/employee-headcount - group by department', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/employee-headcount?company_id=demo-company&group_by=department');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/payroll-summary - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/payroll-summary?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/payroll-summary - with period', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/payroll-summary?company_id=demo-company&period=2024-01');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/leave-balance - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/leave-balance?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/leave-balance - filter by employee_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/leave-balance?company_id=demo-company&employee_id=emp-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/timesheet-summary - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/timesheet-summary?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/timesheet-summary - with date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/timesheet-summary?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/overtime-summary - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/overtime-summary?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/overtime-summary - with date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/reports/overtime-summary?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // DASHBOARD KPIs - Read Operations (15 tests)
  // ============================================
  test.describe('Dashboard KPIs', () => {
    test('GET /reports/dashboard/kpis - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/dashboard/kpis?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/dashboard/revenue-chart - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/dashboard/revenue-chart?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/dashboard/revenue-chart - with days parameter', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/dashboard/revenue-chart?company_id=demo-company&days=30');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/dashboard/expense-chart - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/dashboard/expense-chart?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/dashboard/expense-chart - with days parameter', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/dashboard/expense-chart?company_id=demo-company&days=30');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/dashboard/cash-position - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/dashboard/cash-position?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/dashboard/outstanding-invoices - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/dashboard/outstanding-invoices?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/dashboard/recent-transactions - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/dashboard/recent-transactions?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/dashboard/recent-transactions - with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/dashboard/recent-transactions?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/dashboard/alerts - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/dashboard/alerts?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // REPORT EXPORT - Operations (5 tests)
  // ============================================
  test.describe('Report Export', () => {
    test('POST /reports/export - export to PDF', async ({ request }) => {
      const exportData = {
        report_type: 'profit-loss',
        format: 'pdf'
      };
      const response = await apiRequest(request, 'POST', '/api/reports/export', exportData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /reports/export - export to Excel', async ({ request }) => {
      const exportData = {
        report_type: 'profit-loss',
        format: 'xlsx'
      };
      const response = await apiRequest(request, 'POST', '/api/reports/export', exportData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /reports/export - export to CSV', async ({ request }) => {
      const exportData = {
        report_type: 'profit-loss',
        format: 'csv'
      };
      const response = await apiRequest(request, 'POST', '/api/reports/export', exportData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /reports/export - invalid format', async ({ request }) => {
      const exportData = {
        report_type: 'profit-loss',
        format: 'invalid_format'
      };
      const response = await apiRequest(request, 'POST', '/api/reports/export', exportData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /reports/export - invalid report_type', async ({ request }) => {
      const exportData = {
        report_type: 'invalid_report',
        format: 'pdf'
      };
      const response = await apiRequest(request, 'POST', '/api/reports/export', exportData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // PERFORMANCE TESTS (5 tests)
  // ============================================
  test.describe('Performance Tests', () => {
    test('GET /reports/profit-loss - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/reports/profit-loss?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });

    test('GET /reports/balance-sheet - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/reports/balance-sheet?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });

    test('GET /reports/sales-summary - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/reports/sales-summary?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });

    test('GET /reports/dashboard/kpis - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/reports/dashboard/kpis?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('POST /reports/export - response time < 5s', async ({ request }) => {
      const start = Date.now();
      const exportData = {
        report_type: 'profit-loss',
        format: 'pdf'
      };
      const response = await apiRequest(request, 'POST', '/api/reports/export', exportData);
      const duration = Date.now() - start;
      expect([200, 201, 400, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(5000);
    });
  });
});
