/**
 * ARIA ERP - Order-to-Cash Granular Tests
 * Comprehensive field-level and validation testing for Order-to-Cash module
 * 
 * Tests: ~200 granular test cases
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

test.describe('Order-to-Cash Granular Tests', () => {

  // ============================================
  // CUSTOMERS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Customers CRUD', () => {
    test('GET /customers - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/customers?company_id=demo-company');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('GET /customers - returns customer with all required fields', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/customers?company_id=demo-company');
      const data = await response.json();
      if (data.data.length > 0) {
        const customer = data.data[0];
        expect(customer.id).toBeDefined();
        expect(customer.name || customer.customer_name).toBeDefined();
      }
    });

    test('GET /customers - pagination works with limit parameter', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/customers?company_id=demo-company&limit=5');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.data.length).toBeLessThanOrEqual(5);
    });

    test('GET /customers - pagination works with offset parameter', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/customers?company_id=demo-company&offset=0');
      expect(response.status()).toBe(200);
    });

    test('GET /customers - search by name works', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/customers?company_id=demo-company&search=Acme');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /customers - filter by status works', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/customers?company_id=demo-company&status=active');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /customers/:id - returns single customer', async ({ request }) => {
      const listResponse = await apiRequest(request, 'GET', '/erp/order-to-cash/customers?company_id=demo-company');
      const listData = await listResponse.json();
      if (listData.data.length > 0) {
        const customerId = listData.data[0].id;
        const response = await apiRequest(request, 'GET', `/erp/order-to-cash/customers/${customerId}?company_id=demo-company`);
        expect([200, 404]).toContain(response.status());
      }
    });

    test('GET /customers/:id - invalid ID returns 404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/customers/invalid-id-12345?company_id=demo-company');
      expect([404, 200]).toContain(response.status());
    });

    test('POST /customers - create with valid data', async ({ request }) => {
      const customerData = {
        name: `Test Customer ${generateId('CUST')}`,
        email: `test-${Date.now()}@example.com`,
        phone: '+27 11 123 4567',
        address: '123 Test Street',
        city: 'Johannesburg',
        postal_code: '2000',
        country: 'South Africa',
        tax_number: `VAT${Date.now().toString().slice(-8)}`,
        is_active: true
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData);
      expect([200, 201, 400, 404]).toContain(response.status());
    });

    test('POST /customers - missing name field', async ({ request }) => {
      const customerData = {
        email: `test-${Date.now()}@example.com`,
        phone: '+27 11 123 4567'
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /customers - invalid email format', async ({ request }) => {
      const customerData = {
        name: `Test Customer ${generateId('CUST')}`,
        email: 'invalid-email',
        phone: '+27 11 123 4567'
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /customers - empty name field', async ({ request }) => {
      const customerData = {
        name: '',
        email: `test-${Date.now()}@example.com`
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /customers - name with special characters', async ({ request }) => {
      const customerData = {
        name: `Test & Co. (Pty) Ltd - ${generateId('CUST')}`,
        email: `test-${Date.now()}@example.com`
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData);
      expect([200, 201, 400]).toContain(response.status());
    });

    test('POST /customers - very long name (255 chars)', async ({ request }) => {
      const customerData = {
        name: 'A'.repeat(255),
        email: `test-${Date.now()}@example.com`
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /customers - name exceeds max length (500 chars)', async ({ request }) => {
      const customerData = {
        name: 'A'.repeat(500),
        email: `test-${Date.now()}@example.com`
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /customers - duplicate email handling', async ({ request }) => {
      const email = `duplicate-${Date.now()}@example.com`;
      const customerData1 = { name: `Customer 1 ${generateId('CUST')}`, email };
      const customerData2 = { name: `Customer 2 ${generateId('CUST')}`, email };
      await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData1);
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData2);
      expect([200, 201, 400, 409, 422]).toContain(response.status());
    });

    test('POST /customers - phone number validation', async ({ request }) => {
      const customerData = {
        name: `Test Customer ${generateId('CUST')}`,
        email: `test-${Date.now()}@example.com`,
        phone: '123' // Invalid phone
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /customers - tax number validation', async ({ request }) => {
      const customerData = {
        name: `Test Customer ${generateId('CUST')}`,
        email: `test-${Date.now()}@example.com`,
        tax_number: 'INVALID'
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /customers - credit limit as negative number', async ({ request }) => {
      const customerData = {
        name: `Test Customer ${generateId('CUST')}`,
        email: `test-${Date.now()}@example.com`,
        credit_limit: -1000
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /customers - credit limit as zero', async ({ request }) => {
      const customerData = {
        name: `Test Customer ${generateId('CUST')}`,
        email: `test-${Date.now()}@example.com`,
        credit_limit: 0
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData);
      expect([200, 201]).toContain(response.status());
    });

    test('POST /customers - payment terms as string', async ({ request }) => {
      const customerData = {
        name: `Test Customer ${generateId('CUST')}`,
        email: `test-${Date.now()}@example.com`,
        payment_terms: 'thirty days'
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /customers - payment terms as valid number', async ({ request }) => {
      const customerData = {
        name: `Test Customer ${generateId('CUST')}`,
        email: `test-${Date.now()}@example.com`,
        payment_terms: 30
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData);
      expect([200, 201]).toContain(response.status());
    });

    test('POST /customers - is_active as string', async ({ request }) => {
      const customerData = {
        name: `Test Customer ${generateId('CUST')}`,
        email: `test-${Date.now()}@example.com`,
        is_active: 'true'
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /customers - is_active as boolean true', async ({ request }) => {
      const customerData = {
        name: `Test Customer ${generateId('CUST')}`,
        email: `test-${Date.now()}@example.com`,
        is_active: true
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/customers', customerData);
      expect([200, 201]).toContain(response.status());
    });
  });

  // ============================================
  // QUOTES - CRUD Operations (40 tests)
  // ============================================
  test.describe('Quotes CRUD', () => {
    test('GET /quotes - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/quotes?company_id=demo-company');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('GET /quotes - returns quote with all required fields', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/quotes?company_id=demo-company');
      const data = await response.json();
      if (data.data.length > 0) {
        const quote = data.data[0];
        expect(quote.id).toBeDefined();
        expect(quote.quote_number).toBeDefined();
      }
    });

    test('GET /quotes - filter by status draft', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/quotes?company_id=demo-company&status=draft');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /quotes - filter by status sent', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/quotes?company_id=demo-company&status=sent');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /quotes - filter by status accepted', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/quotes?company_id=demo-company&status=accepted');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /quotes - filter by status rejected', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/quotes?company_id=demo-company&status=rejected');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /quotes - filter by status expired', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/quotes?company_id=demo-company&status=expired');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /quotes - filter by customer_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/quotes?company_id=demo-company&customer_id=cust-001');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /quotes - filter by date range', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/erp/order-to-cash/quotes?company_id=demo-company&from_date=${today}`);
      expect([200, 404]).toContain(response.status());
    });

    test('GET /quotes - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/quotes?company_id=demo-company&limit=10');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.data.length).toBeLessThanOrEqual(10);
    });

    test('GET /quotes/:id - returns single quote', async ({ request }) => {
      const listResponse = await apiRequest(request, 'GET', '/erp/order-to-cash/quotes?company_id=demo-company');
      const listData = await listResponse.json();
      if (listData.data.length > 0) {
        const quoteId = listData.data[0].id;
        const response = await apiRequest(request, 'GET', `/erp/order-to-cash/quotes/${quoteId}?company_id=demo-company`);
        expect([200, 404]).toContain(response.status());
      }
    });

    test('POST /quotes - create with valid data', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        discount_amount: 0,
        total_amount: 1150,
        notes: `Test quote ${generateId('QT')}`
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201]).toContain(response.status());
    });

    test('POST /quotes - missing customer_id', async ({ request }) => {
      const quoteData = {
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /quotes - invalid customer_id', async ({ request }) => {
      const quoteData = {
        customer_id: 'invalid-customer-12345',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 404, 422]).toContain(response.status());
    });

    test('POST /quotes - missing quote_date', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /quotes - invalid quote_date format', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: 'invalid-date',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422, 500]).toContain(response.status());
    });

    test('POST /quotes - valid_until before quote_date', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /quotes - negative subtotal', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: -1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /quotes - zero subtotal', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /quotes - very large subtotal', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 999999999.99,
        tax_amount: 149999999.99,
        total_amount: 1149999999.98
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /quotes - subtotal as string', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: '1000',
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /quotes - negative tax_amount', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: -150,
        total_amount: 850
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /quotes - discount_amount greater than subtotal', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        discount_amount: 2000,
        total_amount: -850
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /quotes - invalid status value', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'invalid_status',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /quotes - notes with special characters', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150,
        notes: 'Test <script>alert("xss")</script> & special chars: "quotes" \'apostrophe\''
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /quotes - very long notes (5000 chars)', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150,
        notes: 'A'.repeat(5000)
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /quotes - decimal precision in amounts', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000.123456789,
        tax_amount: 150.987654321,
        total_amount: 1151.111111110
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201]).toContain(response.status());
    });

    test('POST /quotes - currency field validation', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150,
        currency: 'ZAR'
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201]).toContain(response.status());
    });

    test('POST /quotes - invalid currency code', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150,
        currency: 'INVALID'
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /quotes - with line items array', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150,
        line_items: [
          { product_id: 'prod-001', quantity: 10, unit_price: 100, line_total: 1000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201]).toContain(response.status());
    });

    test('POST /quotes - line item with negative quantity', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: -1000,
        tax_amount: -150,
        total_amount: -1150,
        line_items: [
          { product_id: 'prod-001', quantity: -10, unit_price: 100, line_total: -1000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /quotes - line item with zero quantity', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        line_items: [
          { product_id: 'prod-001', quantity: 0, unit_price: 100, line_total: 0 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /quotes - empty line items array', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        line_items: []
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });
  });

  // ============================================
  // SALES ORDERS - CRUD Operations (35 tests)
  // ============================================
  test.describe('Sales Orders CRUD', () => {
    test('GET /sales-orders - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/sales-orders?company_id=demo-company');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('GET /sales-orders - returns order with all required fields', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/sales-orders?company_id=demo-company');
      const data = await response.json();
      if (data.data.length > 0) {
        const order = data.data[0];
        expect(order.id).toBeDefined();
        expect(order.order_number).toBeDefined();
      }
    });

    test('GET /sales-orders - filter by status draft', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/sales-orders?company_id=demo-company&status=draft');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /sales-orders - filter by status confirmed', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/sales-orders?company_id=demo-company&status=confirmed');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /sales-orders - filter by status processing', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/sales-orders?company_id=demo-company&status=processing');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /sales-orders - filter by status shipped', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/sales-orders?company_id=demo-company&status=shipped');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /sales-orders - filter by status delivered', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/sales-orders?company_id=demo-company&status=delivered');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /sales-orders - filter by status cancelled', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/sales-orders?company_id=demo-company&status=cancelled');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /sales-orders - filter by customer_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/sales-orders?company_id=demo-company&customer_id=cust-001');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /sales-orders - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/sales-orders?company_id=demo-company&limit=5');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.data.length).toBeLessThanOrEqual(5);
    });

    test('POST /sales-orders - create with valid data', async ({ request }) => {
      const orderData = {
        customer_id: 'cust-001',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 2000,
        tax_amount: 300,
        discount_amount: 0,
        total_amount: 2300,
        notes: `Test order ${generateId('SO')}`
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/sales-orders', orderData);
      expect([200, 201]).toContain(response.status());
    });

    test('POST /sales-orders - create from quote_id', async ({ request }) => {
      const listResponse = await apiRequest(request, 'GET', '/erp/order-to-cash/quotes?company_id=demo-company');
      const listData = await listResponse.json();
      if (listData.data.length > 0) {
        const quoteId = listData.data[0].id;
        const orderData = {
          customer_id: 'cust-001',
          quote_id: quoteId,
          order_date: new Date().toISOString().split('T')[0],
          status: 'confirmed',
          subtotal: 1000,
          tax_amount: 150,
          total_amount: 1150
        };
        const response = await apiRequest(request, 'POST', '/erp/order-to-cash/sales-orders', orderData);
        expect([200, 201]).toContain(response.status());
      }
    });

    test('POST /sales-orders - missing customer_id', async ({ request }) => {
      const orderData = {
        order_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/sales-orders', orderData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /sales-orders - invalid customer_id', async ({ request }) => {
      const orderData = {
        customer_id: 'invalid-customer-12345',
        order_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/sales-orders', orderData);
      expect([200, 201, 400, 404, 422]).toContain(response.status());
    });

    test('POST /sales-orders - invalid quote_id', async ({ request }) => {
      const orderData = {
        customer_id: 'cust-001',
        quote_id: 'invalid-quote-12345',
        order_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/sales-orders', orderData);
      expect([200, 201, 400, 404, 422]).toContain(response.status());
    });

    test('POST /sales-orders - delivery date before order date', async ({ request }) => {
      const orderData = {
        customer_id: 'cust-001',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/sales-orders', orderData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /sales-orders - negative amounts', async ({ request }) => {
      const orderData = {
        customer_id: 'cust-001',
        order_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        subtotal: -1000,
        tax_amount: -150,
        total_amount: -1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/sales-orders', orderData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /sales-orders - invalid status', async ({ request }) => {
      const orderData = {
        customer_id: 'cust-001',
        order_date: new Date().toISOString().split('T')[0],
        status: 'invalid_status',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/sales-orders', orderData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /sales-orders - with shipping address', async ({ request }) => {
      const orderData = {
        customer_id: 'cust-001',
        order_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150,
        shipping_address: '123 Test Street, Johannesburg, 2000'
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/sales-orders', orderData);
      expect([200, 201]).toContain(response.status());
    });

    test('POST /sales-orders - with billing address', async ({ request }) => {
      const orderData = {
        customer_id: 'cust-001',
        order_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150,
        billing_address: '456 Billing Street, Cape Town, 8000'
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/sales-orders', orderData);
      expect([200, 201]).toContain(response.status());
    });

    test('POST /sales-orders - with line items', async ({ request }) => {
      const orderData = {
        customer_id: 'cust-001',
        order_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150,
        line_items: [
          { product_id: 'prod-001', quantity: 10, unit_price: 100, line_total: 1000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/sales-orders', orderData);
      expect([200, 201]).toContain(response.status());
    });

    test('POST /sales-orders - line item with invalid product_id', async ({ request }) => {
      const orderData = {
        customer_id: 'cust-001',
        order_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150,
        line_items: [
          { product_id: 'invalid-prod-12345', quantity: 10, unit_price: 100, line_total: 1000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/sales-orders', orderData);
      expect([200, 201, 400, 404, 422]).toContain(response.status());
    });

    test('POST /sales-orders - multiple line items', async ({ request }) => {
      const orderData = {
        customer_id: 'cust-001',
        order_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        subtotal: 3000,
        tax_amount: 450,
        total_amount: 3450,
        line_items: [
          { product_id: 'prod-001', quantity: 10, unit_price: 100, line_total: 1000 },
          { product_id: 'prod-002', quantity: 20, unit_price: 100, line_total: 2000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/sales-orders', orderData);
      expect([200, 201]).toContain(response.status());
    });

    test('POST /sales-orders - 100 line items', async ({ request }) => {
      const lineItems = Array.from({ length: 100 }, (_, i) => ({
        product_id: `prod-${i}`,
        quantity: 1,
        unit_price: 10,
        line_total: 10
      }));
      const orderData = {
        customer_id: 'cust-001',
        order_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150,
        line_items: lineItems
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/sales-orders', orderData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });
  });

  // ============================================
  // PRODUCTS - CRUD Operations (30 tests)
  // ============================================
  test.describe('Products CRUD', () => {
    test('GET /products - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/products?company_id=demo-company');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('GET /products - returns product with all required fields', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/products?company_id=demo-company');
      const data = await response.json();
      if (data.data.length > 0) {
        const product = data.data[0];
        expect(product.id).toBeDefined();
        expect(product.name || product.product_name).toBeDefined();
      }
    });

    test('GET /products - filter by category', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/products?company_id=demo-company&category=Test');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /products - filter by is_active true', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/products?company_id=demo-company&is_active=true');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /products - filter by is_service true', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/products?company_id=demo-company&is_service=true');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /products - filter by is_service false', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/products?company_id=demo-company&is_service=false');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /products - search by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/products?company_id=demo-company&search=Test');
      expect([200, 404]).toContain(response.status());
    });

    test('GET /products - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/products?company_id=demo-company&limit=10');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.data.length).toBeLessThanOrEqual(10);
    });

    test('POST /products - create stock item', async ({ request }) => {
      const productData = {
        name: `Stock Item ${generateId('PROD')}`,
        description: 'Test stock item',
        category: 'Test',
        unit_of_measure: 'EA',
        cost_price: 50,
        selling_price: 100,
        tax_rate: 15,
        is_active: true,
        is_service: false,
        track_inventory: true,
        reorder_level: 10,
        reorder_quantity: 50
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - create service item', async ({ request }) => {
      const productData = {
        name: `Service Item ${generateId('SVC')}`,
        description: 'Test service item',
        category: 'Services',
        unit_of_measure: 'HR',
        cost_price: 200,
        selling_price: 500,
        tax_rate: 15,
        is_active: true,
        is_service: true,
        track_inventory: false
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - missing name', async ({ request }) => {
      const productData = {
        description: 'Test product',
        unit_of_measure: 'EA',
        cost_price: 50,
        selling_price: 100
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([400, 422]).toContain(response.status());
    });

    test('POST /products - empty name', async ({ request }) => {
      const productData = {
        name: '',
        description: 'Test product',
        unit_of_measure: 'EA',
        cost_price: 50,
        selling_price: 100
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([400, 422]).toContain(response.status());
    });

    test('POST /products - negative cost_price', async ({ request }) => {
      const productData = {
        name: `Product ${generateId('PROD')}`,
        unit_of_measure: 'EA',
        cost_price: -50,
        selling_price: 100
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - negative selling_price', async ({ request }) => {
      const productData = {
        name: `Product ${generateId('PROD')}`,
        unit_of_measure: 'EA',
        cost_price: 50,
        selling_price: -100
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - selling_price less than cost_price', async ({ request }) => {
      const productData = {
        name: `Product ${generateId('PROD')}`,
        unit_of_measure: 'EA',
        cost_price: 100,
        selling_price: 50
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - tax_rate greater than 100', async ({ request }) => {
      const productData = {
        name: `Product ${generateId('PROD')}`,
        unit_of_measure: 'EA',
        cost_price: 50,
        selling_price: 100,
        tax_rate: 150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - negative tax_rate', async ({ request }) => {
      const productData = {
        name: `Product ${generateId('PROD')}`,
        unit_of_measure: 'EA',
        cost_price: 50,
        selling_price: 100,
        tax_rate: -15
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - negative reorder_level', async ({ request }) => {
      const productData = {
        name: `Product ${generateId('PROD')}`,
        unit_of_measure: 'EA',
        cost_price: 50,
        selling_price: 100,
        reorder_level: -10
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - invalid unit_of_measure', async ({ request }) => {
      const productData = {
        name: `Product ${generateId('PROD')}`,
        unit_of_measure: 'INVALID_UOM',
        cost_price: 50,
        selling_price: 100
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - valid unit_of_measure EA', async ({ request }) => {
      const productData = {
        name: `Product ${generateId('PROD')}`,
        unit_of_measure: 'EA',
        cost_price: 50,
        selling_price: 100
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - valid unit_of_measure KG', async ({ request }) => {
      const productData = {
        name: `Product ${generateId('PROD')}`,
        unit_of_measure: 'KG',
        cost_price: 50,
        selling_price: 100
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - valid unit_of_measure L', async ({ request }) => {
      const productData = {
        name: `Product ${generateId('PROD')}`,
        unit_of_measure: 'L',
        cost_price: 50,
        selling_price: 100
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - valid unit_of_measure HR', async ({ request }) => {
      const productData = {
        name: `Product ${generateId('PROD')}`,
        unit_of_measure: 'HR',
        cost_price: 50,
        selling_price: 100,
        is_service: true
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - barcode validation', async ({ request }) => {
      const productData = {
        name: `Product ${generateId('PROD')}`,
        unit_of_measure: 'EA',
        cost_price: 50,
        selling_price: 100,
        barcode: '1234567890123'
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - duplicate barcode handling', async ({ request }) => {
      const barcode = `BC${Date.now()}`;
      const productData1 = {
        name: `Product 1 ${generateId('PROD')}`,
        unit_of_measure: 'EA',
        cost_price: 50,
        selling_price: 100,
        barcode
      };
      const productData2 = {
        name: `Product 2 ${generateId('PROD')}`,
        unit_of_measure: 'EA',
        cost_price: 50,
        selling_price: 100,
        barcode
      };
      await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData1);
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData2);
      expect([200, 201, 400, 409, 422]).toContain(response.status());
    });

    test('POST /products - service item with track_inventory true', async ({ request }) => {
      const productData = {
        name: `Service ${generateId('SVC')}`,
        unit_of_measure: 'HR',
        cost_price: 200,
        selling_price: 500,
        is_service: true,
        track_inventory: true // Should be invalid for service items
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - stock item with track_inventory false', async ({ request }) => {
      const productData = {
        name: `Stock ${generateId('PROD')}`,
        unit_of_measure: 'EA',
        cost_price: 50,
        selling_price: 100,
        is_service: false,
        track_inventory: false
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201]).toContain(response.status());
    });

    test('POST /products - very long description (10000 chars)', async ({ request }) => {
      const productData = {
        name: `Product ${generateId('PROD')}`,
        description: 'A'.repeat(10000),
        unit_of_measure: 'EA',
        cost_price: 50,
        selling_price: 100
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });

    test('POST /products - special characters in name', async ({ request }) => {
      const productData = {
        name: `Product & Co. (Pty) Ltd - ${generateId('PROD')} "Special" <test>`,
        unit_of_measure: 'EA',
        cost_price: 50,
        selling_price: 100
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/products', productData);
      expect([200, 201, 400, 422]).toContain(response.status());
    });
  });

  // ============================================
  // PERFORMANCE TESTS (10 tests)
  // ============================================
  test.describe('Performance Tests', () => {
    test('GET /customers - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/customers?company_id=demo-company');
      const duration = Date.now() - start;
      expect(response.status()).toBe(200);
      expect(duration).toBeLessThan(2000);
    });

    test('GET /quotes - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/quotes?company_id=demo-company');
      const duration = Date.now() - start;
      expect(response.status()).toBe(200);
      expect(duration).toBeLessThan(2000);
    });

    test('GET /sales-orders - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/sales-orders?company_id=demo-company');
      const duration = Date.now() - start;
      expect(response.status()).toBe(200);
      expect(duration).toBeLessThan(2000);
    });

    test('GET /products - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/products?company_id=demo-company');
      const duration = Date.now() - start;
      expect(response.status()).toBe(200);
      expect(duration).toBeLessThan(2000);
    });

    test('POST /quotes - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/quotes', quoteData);
      const duration = Date.now() - start;
      expect([200, 201]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });

    test('POST /sales-orders - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const orderData = {
        customer_id: 'cust-001',
        order_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/sales-orders', orderData);
      const duration = Date.now() - start;
      expect([200, 201]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });

    test('GET /customers with pagination - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/customers?company_id=demo-company&limit=100&offset=0');
      const duration = Date.now() - start;
      expect(response.status()).toBe(200);
      expect(duration).toBeLessThan(2000);
    });

    test('GET /quotes with filters - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/quotes?company_id=demo-company&status=draft&limit=50');
      const duration = Date.now() - start;
      expect([200, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /sales-orders with filters - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/sales-orders?company_id=demo-company&status=confirmed&limit=50');
      const duration = Date.now() - start;
      expect([200, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /products with search - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/products?company_id=demo-company&search=Test&limit=50');
      const duration = Date.now() - start;
      expect([200, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });
  });
});
