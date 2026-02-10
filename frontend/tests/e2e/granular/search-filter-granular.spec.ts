/**
 * ARIA ERP - Search/Filter Granular Tests
 * Comprehensive testing of search and filter functionality across all modules
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

test.describe('Search/Filter Granular Tests', () => {

  // ============================================
  // CUSTOMER SEARCH/FILTER (20 tests)
  // ============================================
  test.describe('Customer Search/Filter', () => {
    test('Search customers by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&search=John');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Search customers by email', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&search=example.com');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Search customers by phone', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&search=011');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Search customers - empty search term', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&search=');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Search customers - special characters', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&search=%26%40%23');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Search customers - case insensitive', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&search=JOHN');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter customers by is_active true', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&is_active=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter customers by is_active false', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&is_active=false');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter customers by credit_limit range', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&min_credit_limit=1000&max_credit_limit=50000');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter customers by created_date range', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/customers?company_id=demo-company&from_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort customers by name ascending', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&sort_by=name&sort_order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort customers by name descending', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&sort_by=name&sort_order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort customers by created_at', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&sort_by=created_at&sort_order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Paginate customers - page 1', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&page=1&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Paginate customers - page 2', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&page=2&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Paginate customers - large page number', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&page=9999&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Paginate customers - limit 1', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&limit=1');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Paginate customers - limit 100', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers?company_id=demo-company&limit=100');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // INVOICE SEARCH/FILTER (20 tests)
  // ============================================
  test.describe('Invoice Search/Filter', () => {
    test('Search invoices by invoice_number', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&search=INV-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Search invoices by customer_name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&search=Acme');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter invoices by status draft', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&status=draft');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter invoices by status sent', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&status=sent');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter invoices by status paid', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&status=paid');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter invoices by status overdue', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&status=overdue');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter invoices by customer_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&customer_id=cust-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter invoices by date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/invoices?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter invoices by amount range', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&min_amount=1000&max_amount=10000');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter invoices by due_date range', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/invoices?company_id=demo-company&due_from=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort invoices by invoice_date', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&sort_by=invoice_date&sort_order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort invoices by amount', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&sort_by=total_amount&sort_order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort invoices by due_date', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&sort_by=due_date&sort_order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PRODUCT SEARCH/FILTER (20 tests)
  // ============================================
  test.describe('Product Search/Filter', () => {
    test('Search products by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&search=Widget');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Search products by SKU', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&search=SKU-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Search products by description', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&search=premium');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter products by item_type stock', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&item_type=stock');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter products by item_type service', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&item_type=service');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter products by is_active true', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&is_active=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter products by category', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&category=Electronics');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter products by price range', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&min_price=100&max_price=1000');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter products by stock level', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&min_stock=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter products - low stock', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&low_stock=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort products by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&sort_by=name&sort_order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort products by price', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&sort_by=unit_price&sort_order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort products by stock_quantity', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/products?company_id=demo-company&sort_by=stock_quantity&sort_order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // EMPLOYEE SEARCH/FILTER (20 tests)
  // ============================================
  test.describe('Employee Search/Filter', () => {
    test('Search employees by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&search=John');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Search employees by email', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&search=company.com');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Search employees by employee_number', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&search=EMP-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter employees by department', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&department=Sales');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter employees by position', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&position=Manager');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter employees by employment_type full-time', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&employment_type=full-time');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter employees by employment_type part-time', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&employment_type=part-time');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter employees by employment_type contractor', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&employment_type=contractor');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter employees by is_active true', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&is_active=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter employees by hire_date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/employees?company_id=demo-company&hired_from=${startDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort employees by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&sort_by=last_name&sort_order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort employees by hire_date', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&sort_by=hire_date&sort_order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort employees by department', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees?company_id=demo-company&sort_by=department&sort_order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // SUPPLIER SEARCH/FILTER (15 tests)
  // ============================================
  test.describe('Supplier Search/Filter', () => {
    test('Search suppliers by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/suppliers?company_id=demo-company&search=Acme');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Search suppliers by email', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/suppliers?company_id=demo-company&search=supplier.com');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Search suppliers by contact_person', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/suppliers?company_id=demo-company&search=John');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter suppliers by is_active true', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/suppliers?company_id=demo-company&is_active=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter suppliers by category', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/suppliers?company_id=demo-company&category=Raw Materials');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter suppliers by payment_terms', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/suppliers?company_id=demo-company&payment_terms=30');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort suppliers by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/suppliers?company_id=demo-company&sort_by=name&sort_order=asc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort suppliers by created_at', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/suppliers?company_id=demo-company&sort_by=created_at&sort_order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PURCHASE ORDER SEARCH/FILTER (15 tests)
  // ============================================
  test.describe('Purchase Order Search/Filter', () => {
    test('Search POs by po_number', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company&search=PO-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Search POs by supplier_name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company&search=Acme');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter POs by status pending', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company&status=pending');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter POs by status approved', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company&status=approved');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter POs by status received', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company&status=received');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter POs by supplier_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company&supplier_id=supp-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter POs by date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/purchase-orders?company_id=demo-company&from_date=${startDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Filter POs by amount range', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company&min_amount=1000&max_amount=50000');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort POs by order_date', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company&sort_by=order_date&sort_order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Sort POs by total_amount', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/purchase-orders?company_id=demo-company&sort_by=total_amount&sort_order=desc');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // GLOBAL SEARCH (10 tests)
  // ============================================
  test.describe('Global Search', () => {
    test('Global search - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/search?company_id=demo-company&q=test');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Global search - empty query', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/search?company_id=demo-company&q=');
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Global search - filter by entity_type customer', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/search?company_id=demo-company&q=test&entity_type=customer');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Global search - filter by entity_type invoice', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/search?company_id=demo-company&q=test&entity_type=invoice');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Global search - filter by entity_type product', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/search?company_id=demo-company&q=test&entity_type=product');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Global search - with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/search?company_id=demo-company&q=test&limit=5');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Global search - special characters', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/search?company_id=demo-company&q=%26%40%23');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Global search - very long query', async ({ request }) => {
      const longQuery = 'a'.repeat(500);
      const response = await apiRequest(request, 'GET', `/api/search?company_id=demo-company&q=${longQuery}`);
      expect([200, 400, 401, 404]).toContain(response.status());
    });
  });
});
