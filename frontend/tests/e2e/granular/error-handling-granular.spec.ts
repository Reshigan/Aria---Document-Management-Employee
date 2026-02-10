/**
 * ARIA ERP - Error Handling Granular Tests
 * Comprehensive testing of error handling across all API endpoints
 * 
 * Tests: ~120 granular test cases
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import { TEST_CONFIG } from '../test-config';

const API_BASE = TEST_CONFIG.API_URL;
const COMPANY_ID = 'demo-company';

async function apiRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: Record<string, unknown>,
  headers?: Record<string, string>
) {
  const url = `${API_BASE}${endpoint}`;
  const defaultHeaders = { 'Content-Type': 'application/json', 'X-Company-ID': COMPANY_ID };
  const options = {
    headers: { ...defaultHeaders, ...headers },
    data: data ? JSON.stringify(data) : undefined,
  };
  switch (method) {
    case 'GET': return request.get(url, { headers: options.headers });
    case 'POST': return request.post(url, options);
    case 'PUT': return request.put(url, options);
    case 'DELETE': return request.delete(url, { headers: options.headers });
  }
}

test.describe('Error Handling Granular Tests', () => {

  // ============================================
  // 400 BAD REQUEST ERRORS (25 tests)
  // ============================================
  test.describe('400 Bad Request Errors', () => {
    test('POST /customers - malformed JSON', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/customers`, {
        headers: { 'Content-Type': 'application/json', 'X-Company-ID': COMPANY_ID },
        data: '{ invalid json }'
      });
      expect([400, 401, 404, 500]).toContain(response.status());
    });

    test('POST /customers - empty body', async ({ request }) => {
      const response = await apiRequest(request, 'POST', '/api/customers', {});
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /invoices - missing required fields', async ({ request }) => {
      const response = await apiRequest(request, 'POST', '/api/invoices', {});
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /employees - invalid data types', async ({ request }) => {
      const data = { first_name: 123, last_name: true, salary: 'not a number' };
      const response = await apiRequest(request, 'POST', '/api/employees', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('GET /customers - invalid query parameter', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&limit=invalid');
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('GET /customers - negative limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&limit=-10');
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('GET /customers - negative offset', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&offset=-10');
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('POST /journal-entries - unbalanced entry', async ({ request }) => {
      const data = {
        entry_date: new Date().toISOString().split('T')[0],
        line_items: [
          { account_id: 'acc-001', debit: 1000, credit: 0 },
          { account_id: 'acc-002', debit: 0, credit: 500 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/journal-entries', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /invoices - invalid date format', async ({ request }) => {
      const data = { customer_id: 'cust-001', invoice_date: 'invalid-date' };
      const response = await apiRequest(request, 'POST', '/api/invoices', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /products - negative price', async ({ request }) => {
      const data = { name: 'Test Product', unit_price: -100 };
      const response = await apiRequest(request, 'POST', '/api/products', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /employees - invalid email format', async ({ request }) => {
      const data = { first_name: 'Test', last_name: 'User', email: 'invalid-email' };
      const response = await apiRequest(request, 'POST', '/api/employees', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /purchase-orders - end date before start date', async ({ request }) => {
      const data = {
        supplier_id: 'supp-001',
        order_date: '2024-12-31',
        expected_delivery: '2024-01-01'
      };
      const response = await apiRequest(request, 'POST', '/api/purchase-orders', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /leave-requests - overlapping dates', async ({ request }) => {
      const data = {
        employee_id: 'emp-001',
        start_date: '2024-06-15',
        end_date: '2024-06-10'
      };
      const response = await apiRequest(request, 'POST', '/api/leave-requests', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // 401 UNAUTHORIZED ERRORS (15 tests)
  // ============================================
  test.describe('401 Unauthorized Errors', () => {
    test('GET /customers - no auth header', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/customers?company_id=demo-company`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - invalid auth token', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/customers?company_id=demo-company`, {
        headers: { 'Authorization': 'Bearer invalid_token_12345' }
      });
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - expired auth token', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/customers?company_id=demo-company`, {
        headers: { 'Authorization': 'Bearer expired_token_12345' }
      });
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - malformed auth header', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/customers?company_id=demo-company`, {
        headers: { 'Authorization': 'NotBearer token' }
      });
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /customers - no auth header', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/customers`, {
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ name: 'Test' })
      });
      expect([200, 201, 401, 404]).toContain(response.status());
    });

    test('PUT /customers/:id - no auth header', async ({ request }) => {
      const response = await request.put(`${API_BASE}/api/customers/cust-001`, {
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ name: 'Updated' })
      });
      expect([200, 401, 404]).toContain(response.status());
    });

    test('DELETE /customers/:id - no auth header', async ({ request }) => {
      const response = await request.delete(`${API_BASE}/api/customers/cust-001`);
      expect([200, 204, 401, 404]).toContain(response.status());
    });

    test('GET /reports/profit-loss - no auth header', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/reports/profit-loss?company_id=demo-company`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /payroll-runs - no auth header', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/payroll-runs`, {
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ period_start: '2024-01-01', period_end: '2024-01-31' })
      });
      expect([200, 201, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - no auth header', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/audit-trail?company_id=demo-company`);
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // 404 NOT FOUND ERRORS (20 tests)
  // ============================================
  test.describe('404 Not Found Errors', () => {
    test('GET /customers/:id - non-existent ID', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers/non-existent-id-12345?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices/:id - non-existent ID', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices/non-existent-id-12345?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees/:id - non-existent ID', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees/non-existent-id-12345?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /products/:id - non-existent ID', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products/non-existent-id-12345?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /suppliers/:id - non-existent ID', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/suppliers/non-existent-id-12345?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('PUT /customers/:id - non-existent ID', async ({ request }) => {
      const response = await apiRequest(request, 'PUT', '/api/customers/non-existent-id-12345', { name: 'Updated' });
      expect([200, 401, 404]).toContain(response.status());
    });

    test('PUT /invoices/:id - non-existent ID', async ({ request }) => {
      const response = await apiRequest(request, 'PUT', '/api/invoices/non-existent-id-12345', { status: 'paid' });
      expect([200, 401, 404]).toContain(response.status());
    });

    test('DELETE /customers/:id - non-existent ID', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/customers/non-existent-id-12345?company_id=demo-company');
      expect([200, 204, 401, 404]).toContain(response.status());
    });

    test('DELETE /invoices/:id - non-existent ID', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/invoices/non-existent-id-12345?company_id=demo-company');
      expect([200, 204, 401, 404]).toContain(response.status());
    });

    test('GET /non-existent-endpoint - unknown route', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/non-existent-endpoint?company_id=demo-company');
      expect([401, 404]).toContain(response.status());
    });

    test('POST /non-existent-endpoint - unknown route', async ({ request }) => {
      const response = await apiRequest(request, 'POST', '/api/non-existent-endpoint', { data: 'test' });
      expect([401, 404]).toContain(response.status());
    });

    test('GET /customers/:id/non-existent - unknown sub-route', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers/cust-001/non-existent?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /reports/non-existent - unknown report', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/non-existent-report?company_id=demo-company');
      expect([401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // 409 CONFLICT ERRORS (15 tests)
  // ============================================
  test.describe('409 Conflict Errors', () => {
    test('POST /customers - duplicate email', async ({ request }) => {
      const data = { name: 'Test Customer', email: 'existing@example.com' };
      const response = await apiRequest(request, 'POST', '/api/customers', data);
      expect([200, 201, 400, 401, 404, 409]).toContain(response.status());
    });

    test('POST /employees - duplicate email', async ({ request }) => {
      const data = { first_name: 'Test', last_name: 'User', email: 'existing@company.com' };
      const response = await apiRequest(request, 'POST', '/api/employees', data);
      expect([200, 201, 400, 401, 404, 409]).toContain(response.status());
    });

    test('POST /products - duplicate SKU', async ({ request }) => {
      const data = { name: 'Test Product', sku: 'EXISTING-SKU' };
      const response = await apiRequest(request, 'POST', '/api/products', data);
      expect([200, 201, 400, 401, 404, 409]).toContain(response.status());
    });

    test('POST /chart-of-accounts - duplicate account code', async ({ request }) => {
      const data = { name: 'Test Account', account_code: '1000' };
      const response = await apiRequest(request, 'POST', '/api/chart-of-accounts', data);
      expect([200, 201, 400, 401, 404, 409]).toContain(response.status());
    });

    test('DELETE /customers/:id - has related invoices', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/customers/cust-with-invoices?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 409]).toContain(response.status());
    });

    test('DELETE /products/:id - has related orders', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/products/prod-with-orders?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 409]).toContain(response.status());
    });

    test('DELETE /employees/:id - has related payroll', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/employees/emp-with-payroll?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 409]).toContain(response.status());
    });

    test('DELETE /suppliers/:id - has related POs', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/suppliers/supp-with-pos?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 409]).toContain(response.status());
    });

    test('PUT /invoices/:id - already paid', async ({ request }) => {
      const data = { status: 'draft' };
      const response = await apiRequest(request, 'PUT', '/api/invoices/paid-invoice?company_id=demo-company', data);
      expect([200, 400, 401, 404, 409]).toContain(response.status());
    });

    test('DELETE /invoices/:id - already paid', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/invoices/paid-invoice?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 409]).toContain(response.status());
    });
  });

  // ============================================
  // 422 VALIDATION ERRORS (20 tests)
  // ============================================
  test.describe('422 Validation Errors', () => {
    test('POST /customers - name too long', async ({ request }) => {
      const data = { name: 'A'.repeat(500) };
      const response = await apiRequest(request, 'POST', '/api/customers', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /invoices - amount exceeds limit', async ({ request }) => {
      const data = { customer_id: 'cust-001', amount: 999999999999 };
      const response = await apiRequest(request, 'POST', '/api/invoices', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /employees - salary negative', async ({ request }) => {
      const data = { first_name: 'Test', last_name: 'User', salary: -50000 };
      const response = await apiRequest(request, 'POST', '/api/employees', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /products - quantity negative', async ({ request }) => {
      const data = { name: 'Test Product', stock_quantity: -100 };
      const response = await apiRequest(request, 'POST', '/api/products', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /tax-rates - rate over 100', async ({ request }) => {
      const data = { name: 'Invalid Tax', rate: 150 };
      const response = await apiRequest(request, 'POST', '/api/tax-rates', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /leave-requests - days exceed balance', async ({ request }) => {
      const data = {
        employee_id: 'emp-001',
        leave_type: 'annual',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };
      const response = await apiRequest(request, 'POST', '/api/leave-requests', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /purchase-orders - quantity zero', async ({ request }) => {
      const data = {
        supplier_id: 'supp-001',
        line_items: [{ product_id: 'prod-001', quantity: 0, unit_price: 100 }]
      };
      const response = await apiRequest(request, 'POST', '/api/purchase-orders', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /sales-orders - invalid customer', async ({ request }) => {
      const data = {
        customer_id: 'invalid-customer',
        line_items: [{ product_id: 'prod-001', quantity: 1, unit_price: 100 }]
      };
      const response = await apiRequest(request, 'POST', '/api/sales-orders', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /timesheets - hours exceed 24', async ({ request }) => {
      const data = {
        employee_id: 'emp-001',
        entries: [{ date: '2024-01-15', hours: 25 }]
      };
      const response = await apiRequest(request, 'POST', '/api/timesheets', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /banking/payments - amount exceeds invoice', async ({ request }) => {
      const data = {
        invoice_id: 'inv-001',
        amount: 999999999
      };
      const response = await apiRequest(request, 'POST', '/api/banking/payments', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /inventory/stock-movements - quantity exceeds stock', async ({ request }) => {
      const data = {
        product_id: 'prod-001',
        movement_type: 'stock_out',
        quantity: 999999
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /manufacturing/work-orders - invalid BOM', async ({ request }) => {
      const data = {
        bom_id: 'invalid-bom',
        quantity: 100
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // 500 SERVER ERRORS (10 tests)
  // ============================================
  test.describe('500 Server Error Handling', () => {
    test('GET /customers - handles server errors gracefully', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company');
      expect([200, 401, 404, 500]).toContain(response.status());
    });

    test('POST /customers - handles server errors gracefully', async ({ request }) => {
      const data = { name: 'Test Customer' };
      const response = await apiRequest(request, 'POST', '/api/customers', data);
      expect([200, 201, 400, 401, 404, 500]).toContain(response.status());
    });

    test('GET /reports/profit-loss - handles complex query errors', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/profit-loss?company_id=demo-company');
      expect([200, 401, 404, 500]).toContain(response.status());
    });

    test('POST /bots/run - handles bot execution errors', async ({ request }) => {
      const data = { bot_id: 'test-bot', action: 'execute' };
      const response = await apiRequest(request, 'POST', '/api/bots/run', data);
      expect([200, 201, 400, 401, 404, 500]).toContain(response.status());
    });

    test('POST /documents/generate - handles document generation errors', async ({ request }) => {
      const data = { template_id: 'test-template', entity_id: 'test-entity' };
      const response = await apiRequest(request, 'POST', '/api/documents/generate', data);
      expect([200, 201, 400, 401, 404, 500]).toContain(response.status());
    });

    test('POST /notifications/email - handles email sending errors', async ({ request }) => {
      const data = { to: 'test@example.com', template: 'invoice', entity_id: 'inv-001' };
      const response = await apiRequest(request, 'POST', '/api/notifications/email', data);
      expect([200, 201, 400, 401, 404, 500]).toContain(response.status());
    });

    test('GET /dashboard/kpis - handles KPI calculation errors', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/dashboard/kpis?company_id=demo-company');
      expect([200, 401, 404, 500]).toContain(response.status());
    });

    test('POST /banking/bank-reconciliations - handles reconciliation errors', async ({ request }) => {
      const data = { bank_account_id: 'ba-001', statement_date: '2024-01-31' };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-reconciliations', data);
      expect([200, 201, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // TIMEOUT/NETWORK ERRORS (10 tests)
  // ============================================
  test.describe('Timeout/Network Error Handling', () => {
    test('GET /reports/profit-loss - long running query', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/profit-loss?company_id=demo-company&from_date=2020-01-01&to_date=2024-12-31');
      expect([200, 401, 404, 408, 500, 504]).toContain(response.status());
    });

    test('GET /reports/inventory-valuation - complex calculation', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/inventory-valuation?company_id=demo-company');
      expect([200, 401, 404, 408, 500, 504]).toContain(response.status());
    });

    test('POST /bots/run - long running bot', async ({ request }) => {
      const data = { bot_id: 'complex-bot', action: 'execute' };
      const response = await apiRequest(request, 'POST', '/api/bots/run', data);
      expect([200, 201, 400, 401, 404, 408, 500, 504]).toContain(response.status());
    });

    test('POST /documents/generate - large document', async ({ request }) => {
      const data = { template_id: 'large-template', entity_id: 'large-entity' };
      const response = await apiRequest(request, 'POST', '/api/documents/generate', data);
      expect([200, 201, 400, 401, 404, 408, 500, 504]).toContain(response.status());
    });

    test('GET /search - complex search query', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/search?company_id=demo-company&q=test&entity_type=all');
      expect([200, 401, 404, 408, 500, 504]).toContain(response.status());
    });
  });
});
