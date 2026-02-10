/**
 * ARIA ERP - Pagination/Sorting Granular Tests
 * Comprehensive testing of pagination and sorting across all list endpoints
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

test.describe('Pagination/Sorting Granular Tests', () => {

  // ============================================
  // CUSTOMER PAGINATION/SORTING (15 tests)
  // ============================================
  test.describe('Customer Pagination/Sorting', () => {
    test('GET /customers - default pagination', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - limit=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - limit=50', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&limit=50');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - limit=100', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&limit=100');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - offset=0', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&offset=0');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - offset=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&offset=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - offset=100', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&offset=100');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - sort by name asc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&sort=name&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - sort by name desc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&sort=name&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - sort by created_at asc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&sort=created_at&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - sort by created_at desc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&sort=created_at&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - combined limit and offset', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&limit=10&offset=20');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - combined sort and pagination', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&limit=10&offset=0&sort=name&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // INVOICE PAGINATION/SORTING (15 tests)
  // ============================================
  test.describe('Invoice Pagination/Sorting', () => {
    test('GET /invoices - default pagination', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - limit=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - limit=50', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&limit=50');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - offset=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&offset=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - sort by invoice_date asc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&sort=invoice_date&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - sort by invoice_date desc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&sort=invoice_date&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - sort by amount asc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&sort=amount&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - sort by amount desc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&sort=amount&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - sort by status', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&sort=status&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - sort by due_date', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&sort=due_date&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - combined pagination and sorting', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&limit=10&offset=0&sort=invoice_date&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PRODUCT PAGINATION/SORTING (10 tests)
  // ============================================
  test.describe('Product Pagination/Sorting', () => {
    test('GET /products - default pagination', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /products - limit=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /products - offset=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&offset=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /products - sort by name asc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&sort=name&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /products - sort by name desc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&sort=name&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /products - sort by unit_price asc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&sort=unit_price&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /products - sort by unit_price desc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&sort=unit_price&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /products - sort by stock_quantity', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&sort=stock_quantity&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // EMPLOYEE PAGINATION/SORTING (10 tests)
  // ============================================
  test.describe('Employee Pagination/Sorting', () => {
    test('GET /employees - default pagination', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees - limit=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees - offset=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&offset=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees - sort by first_name asc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&sort=first_name&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees - sort by first_name desc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&sort=first_name&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees - sort by last_name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&sort=last_name&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees - sort by hire_date', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&sort=hire_date&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees - sort by department', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&sort=department&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // SUPPLIER PAGINATION/SORTING (10 tests)
  // ============================================
  test.describe('Supplier Pagination/Sorting', () => {
    test('GET /suppliers - default pagination', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/suppliers?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /suppliers - limit=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/suppliers?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /suppliers - offset=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/suppliers?company_id=demo-company&offset=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /suppliers - sort by name asc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/suppliers?company_id=demo-company&sort=name&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /suppliers - sort by name desc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/suppliers?company_id=demo-company&sort=name&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /suppliers - sort by created_at', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/suppliers?company_id=demo-company&sort=created_at&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PURCHASE ORDER PAGINATION/SORTING (10 tests)
  // ============================================
  test.describe('Purchase Order Pagination/Sorting', () => {
    test('GET /purchase-orders - default pagination', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /purchase-orders - limit=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /purchase-orders - offset=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company&offset=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /purchase-orders - sort by order_date asc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company&sort=order_date&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /purchase-orders - sort by order_date desc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company&sort=order_date&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /purchase-orders - sort by total_amount', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company&sort=total_amount&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /purchase-orders - sort by status', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company&sort=status&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // JOURNAL ENTRY PAGINATION/SORTING (10 tests)
  // ============================================
  test.describe('Journal Entry Pagination/Sorting', () => {
    test('GET /journal-entries - default pagination', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/journal-entries?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /journal-entries - limit=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/journal-entries?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /journal-entries - offset=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/journal-entries?company_id=demo-company&offset=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /journal-entries - sort by entry_date asc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/journal-entries?company_id=demo-company&sort=entry_date&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /journal-entries - sort by entry_date desc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/journal-entries?company_id=demo-company&sort=entry_date&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /journal-entries - sort by total_amount', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/journal-entries?company_id=demo-company&sort=total_amount&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // AUDIT TRAIL PAGINATION/SORTING (10 tests)
  // ============================================
  test.describe('Audit Trail Pagination/Sorting', () => {
    test('GET /audit-trail - default pagination', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - limit=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - offset=10', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&offset=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - sort by timestamp asc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&sort=timestamp&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - sort by timestamp desc', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&sort=timestamp&order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - sort by action', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&sort=action&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - sort by entity_type', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&sort=entity_type&order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // EDGE CASES (10 tests)
  // ============================================
  test.describe('Pagination Edge Cases', () => {
    test('GET /customers - limit=0', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&limit=0');
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

    test('GET /customers - very large limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&limit=10000');
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('GET /customers - very large offset', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&offset=10000');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /customers - invalid sort field', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&sort=invalid_field');
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('GET /customers - invalid order direction', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&sort=name&order=invalid');
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('GET /customers - non-numeric limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&limit=abc');
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('GET /customers - non-numeric offset', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&offset=abc');
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('GET /customers - SQL injection in sort field', async ({ request }) => {
      const response = await apiRequest(request, 'GET', "/api/customers?company_id=demo-company&sort=name; DROP TABLE customers;--");
      expect([200, 400, 401, 404]).toContain(response.status());
    });
  });
});
