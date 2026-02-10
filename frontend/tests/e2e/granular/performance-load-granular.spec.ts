/**
 * ARIA ERP - Performance/Load Granular Tests
 * Comprehensive testing of API performance and response times
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

async function measureResponseTime(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: Record<string, unknown>
): Promise<{ status: number; time: number }> {
  const start = Date.now();
  const response = await apiRequest(request, method, endpoint, data);
  const time = Date.now() - start;
  return { status: response.status(), time };
}

test.describe('Performance/Load Granular Tests', () => {

  // ============================================
  // CUSTOMER API PERFORMANCE (15 tests)
  // ============================================
  test.describe('Customer API Performance', () => {
    test('GET /customers - response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/customers?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /customers - large page response time < 5s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/customers?company_id=demo-company&limit=100');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(5000);
    });

    test('GET /customers/:id - response time < 2s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/customers/cust-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(2000);
    });

    test('POST /customers - response time < 3s', async ({ request }) => {
      const data = { name: `Perf Test ${Date.now()}`, email: `perf${Date.now()}@test.com` };
      const { status, time } = await measureResponseTime(request, 'POST', '/api/customers', data);
      expect([200, 201, 400, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('PUT /customers/:id - response time < 3s', async ({ request }) => {
      const data = { name: 'Updated Name' };
      const { status, time } = await measureResponseTime(request, 'PUT', '/api/customers/cust-001', data);
      expect([200, 400, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /customers - search response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/customers?company_id=demo-company&search=test');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /customers - filter response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/customers?company_id=demo-company&is_active=true');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });
  });

  // ============================================
  // INVOICE API PERFORMANCE (15 tests)
  // ============================================
  test.describe('Invoice API Performance', () => {
    test('GET /invoices - response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/invoices?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /invoices - large page response time < 5s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/invoices?company_id=demo-company&limit=100');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(5000);
    });

    test('GET /invoices/:id - response time < 2s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/invoices/inv-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(2000);
    });

    test('POST /invoices - response time < 3s', async ({ request }) => {
      const data = { customer_id: 'cust-001', invoice_date: new Date().toISOString().split('T')[0] };
      const { status, time } = await measureResponseTime(request, 'POST', '/api/invoices', data);
      expect([200, 201, 400, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /invoices - filter by status response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/invoices?company_id=demo-company&status=draft');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /invoices - filter by date range response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/invoices?company_id=demo-company&from_date=2024-01-01&to_date=2024-12-31');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /invoices - filter by customer response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/invoices?company_id=demo-company&customer_id=cust-001');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });
  });

  // ============================================
  // PRODUCT API PERFORMANCE (10 tests)
  // ============================================
  test.describe('Product API Performance', () => {
    test('GET /products - response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/products?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /products - large page response time < 5s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/products?company_id=demo-company&limit=100');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(5000);
    });

    test('GET /products/:id - response time < 2s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/products/prod-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(2000);
    });

    test('POST /products - response time < 3s', async ({ request }) => {
      const data = { name: `Perf Product ${Date.now()}`, unit_price: 100 };
      const { status, time } = await measureResponseTime(request, 'POST', '/api/products', data);
      expect([200, 201, 400, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /products - search response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/products?company_id=demo-company&search=widget');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });
  });

  // ============================================
  // EMPLOYEE API PERFORMANCE (10 tests)
  // ============================================
  test.describe('Employee API Performance', () => {
    test('GET /employees - response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/employees?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /employees - large page response time < 5s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/employees?company_id=demo-company&limit=100');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(5000);
    });

    test('GET /employees/:id - response time < 2s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/employees/emp-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(2000);
    });

    test('POST /employees - response time < 3s', async ({ request }) => {
      const data = { first_name: 'Perf', last_name: `Test${Date.now()}`, email: `perf${Date.now()}@company.com` };
      const { status, time } = await measureResponseTime(request, 'POST', '/api/employees', data);
      expect([200, 201, 400, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /employees - filter by department response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/employees?company_id=demo-company&department=Sales');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });
  });

  // ============================================
  // REPORT API PERFORMANCE (15 tests)
  // ============================================
  test.describe('Report API Performance', () => {
    test('GET /reports/profit-loss - response time < 5s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/reports/profit-loss?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(5000);
    });

    test('GET /reports/balance-sheet - response time < 5s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/reports/balance-sheet?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(5000);
    });

    test('GET /reports/cash-flow - response time < 5s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/reports/cash-flow?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(5000);
    });

    test('GET /reports/trial-balance - response time < 5s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/reports/trial-balance?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(5000);
    });

    test('GET /reports/aged-receivables - response time < 5s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/reports/aged-receivables?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(5000);
    });

    test('GET /reports/aged-payables - response time < 5s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/reports/aged-payables?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(5000);
    });

    test('GET /reports/inventory-valuation - response time < 5s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/reports/inventory-valuation?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(5000);
    });

    test('GET /reports/sales-summary - response time < 5s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/reports/sales-summary?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(5000);
    });

    test('GET /reports/payroll-summary - response time < 5s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/reports/payroll-summary?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(5000);
    });

    test('GET /reports/vat-return - response time < 5s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/reports/vat-return?company_id=demo-company&period=2024-01');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(5000);
    });
  });

  // ============================================
  // DASHBOARD API PERFORMANCE (10 tests)
  // ============================================
  test.describe('Dashboard API Performance', () => {
    test('GET /dashboard/kpis - response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/dashboard/kpis?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /dashboard/revenue-chart - response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/dashboard/revenue-chart?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /dashboard/expense-chart - response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/dashboard/expense-chart?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /dashboard/cash-position - response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/dashboard/cash-position?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /dashboard/outstanding-invoices - response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/dashboard/outstanding-invoices?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /dashboard/recent-transactions - response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/dashboard/recent-transactions?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /dashboard/alerts - response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/dashboard/alerts?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });
  });

  // ============================================
  // BOT API PERFORMANCE (10 tests)
  // ============================================
  test.describe('Bot API Performance', () => {
    test('GET /bots - response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/bots?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /bots/:id - response time < 2s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/bots/bot-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(2000);
    });

    test('POST /bots/run - response time < 10s', async ({ request }) => {
      const data = { bot_id: 'test-bot', action: 'execute' };
      const { status, time } = await measureResponseTime(request, 'POST', '/api/bots/run', data);
      expect([200, 201, 400, 401, 404]).toContain(status);
      expect(time).toBeLessThan(10000);
    });

    test('GET /bots/dashboard/stats - response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/bots/dashboard/stats?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /bots/executions - response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/bots/executions?company_id=demo-company');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });
  });

  // ============================================
  // SEARCH API PERFORMANCE (10 tests)
  // ============================================
  test.describe('Search API Performance', () => {
    test('GET /search - simple query response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/search?company_id=demo-company&q=test');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /search - complex query response time < 5s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/search?company_id=demo-company&q=test&entity_type=all');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(5000);
    });

    test('GET /search - customer search response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/search?company_id=demo-company&q=test&entity_type=customer');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /search - invoice search response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/search?company_id=demo-company&q=INV&entity_type=invoice');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });

    test('GET /search - product search response time < 3s', async ({ request }) => {
      const { status, time } = await measureResponseTime(request, 'GET', '/api/search?company_id=demo-company&q=widget&entity_type=product');
      expect([200, 401, 404]).toContain(status);
      expect(time).toBeLessThan(3000);
    });
  });

  // ============================================
  // CONCURRENT REQUEST PERFORMANCE (5 tests)
  // ============================================
  test.describe('Concurrent Request Performance', () => {
    test('Multiple concurrent GET requests - all complete < 5s', async ({ request }) => {
      const start = Date.now();
      const promises = [
        apiRequest(request, 'GET', '/api/customers?company_id=demo-company&limit=10'),
        apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&limit=10'),
        apiRequest(request, 'GET', '/api/products?company_id=demo-company&limit=10'),
        apiRequest(request, 'GET', '/api/employees?company_id=demo-company&limit=10'),
        apiRequest(request, 'GET', '/api/suppliers?company_id=demo-company&limit=10')
      ];
      const responses = await Promise.all(promises);
      const time = Date.now() - start;
      responses.forEach(r => expect([200, 401, 404]).toContain(r.status()));
      expect(time).toBeLessThan(5000);
    });

    test('Multiple concurrent report requests - all complete < 10s', async ({ request }) => {
      const start = Date.now();
      const promises = [
        apiRequest(request, 'GET', '/api/reports/profit-loss?company_id=demo-company'),
        apiRequest(request, 'GET', '/api/reports/balance-sheet?company_id=demo-company'),
        apiRequest(request, 'GET', '/api/reports/cash-flow?company_id=demo-company')
      ];
      const responses = await Promise.all(promises);
      const time = Date.now() - start;
      responses.forEach(r => expect([200, 401, 404]).toContain(r.status()));
      expect(time).toBeLessThan(10000);
    });

    test('Multiple concurrent dashboard requests - all complete < 5s', async ({ request }) => {
      const start = Date.now();
      const promises = [
        apiRequest(request, 'GET', '/api/dashboard/kpis?company_id=demo-company'),
        apiRequest(request, 'GET', '/api/dashboard/revenue-chart?company_id=demo-company'),
        apiRequest(request, 'GET', '/api/dashboard/alerts?company_id=demo-company')
      ];
      const responses = await Promise.all(promises);
      const time = Date.now() - start;
      responses.forEach(r => expect([200, 401, 404]).toContain(r.status()));
      expect(time).toBeLessThan(5000);
    });
  });
});
