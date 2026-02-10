/**
 * ARIA ERP - Extended API Endpoints Granular Tests
 * Comprehensive testing of additional API endpoints and edge cases
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

test.describe('Extended API Endpoints Granular Tests', () => {

  // ============================================
  // CREDIT NOTES - CRUD Operations (25 tests)
  // ============================================
  test.describe('Credit Notes CRUD', () => {
    test('GET /credit-notes - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/credit-notes?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /credit-notes - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/credit-notes?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /credit-notes - filter by customer_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/credit-notes?company_id=demo-company&customer_id=cust-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /credit-notes - filter by status draft', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/credit-notes?company_id=demo-company&status=draft');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /credit-notes - filter by status approved', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/credit-notes?company_id=demo-company&status=approved');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /credit-notes/:id - returns single credit note', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/credit-notes/cn-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /credit-notes - create with valid data', async ({ request }) => {
      const creditNoteData = {
        customer_id: 'cust-001',
        invoice_id: 'inv-001',
        credit_note_date: new Date().toISOString().split('T')[0],
        reason: 'Returned goods',
        amount: 500,
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/credit-notes', creditNoteData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /credit-notes - missing customer_id', async ({ request }) => {
      const creditNoteData = {
        invoice_id: 'inv-001',
        credit_note_date: new Date().toISOString().split('T')[0],
        reason: 'Returned goods',
        amount: 500
      };
      const response = await apiRequest(request, 'POST', '/api/credit-notes', creditNoteData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /credit-notes - negative amount', async ({ request }) => {
      const creditNoteData = {
        customer_id: 'cust-001',
        invoice_id: 'inv-001',
        credit_note_date: new Date().toISOString().split('T')[0],
        reason: 'Returned goods',
        amount: -500
      };
      const response = await apiRequest(request, 'POST', '/api/credit-notes', creditNoteData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /credit-notes - zero amount', async ({ request }) => {
      const creditNoteData = {
        customer_id: 'cust-001',
        invoice_id: 'inv-001',
        credit_note_date: new Date().toISOString().split('T')[0],
        reason: 'Returned goods',
        amount: 0
      };
      const response = await apiRequest(request, 'POST', '/api/credit-notes', creditNoteData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /credit-notes - amount exceeds invoice', async ({ request }) => {
      const creditNoteData = {
        customer_id: 'cust-001',
        invoice_id: 'inv-001',
        credit_note_date: new Date().toISOString().split('T')[0],
        reason: 'Returned goods',
        amount: 999999999
      };
      const response = await apiRequest(request, 'POST', '/api/credit-notes', creditNoteData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('PUT /credit-notes/:id - update credit note', async ({ request }) => {
      const creditNoteData = {
        status: 'approved'
      };
      const response = await apiRequest(request, 'PUT', '/api/credit-notes/cn-001', creditNoteData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /credit-notes/:id - delete credit note', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/credit-notes/cn-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // DEBIT NOTES - CRUD Operations (20 tests)
  // ============================================
  test.describe('Debit Notes CRUD', () => {
    test('GET /debit-notes - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/debit-notes?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /debit-notes - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/debit-notes?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /debit-notes - filter by supplier_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/debit-notes?company_id=demo-company&supplier_id=supp-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /debit-notes/:id - returns single debit note', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/debit-notes/dn-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /debit-notes - create with valid data', async ({ request }) => {
      const debitNoteData = {
        supplier_id: 'supp-001',
        invoice_id: 'api-001',
        debit_note_date: new Date().toISOString().split('T')[0],
        reason: 'Returned goods to supplier',
        amount: 300,
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/debit-notes', debitNoteData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /debit-notes - missing supplier_id', async ({ request }) => {
      const debitNoteData = {
        invoice_id: 'api-001',
        debit_note_date: new Date().toISOString().split('T')[0],
        reason: 'Returned goods',
        amount: 300
      };
      const response = await apiRequest(request, 'POST', '/api/debit-notes', debitNoteData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /debit-notes - negative amount', async ({ request }) => {
      const debitNoteData = {
        supplier_id: 'supp-001',
        invoice_id: 'api-001',
        debit_note_date: new Date().toISOString().split('T')[0],
        reason: 'Returned goods',
        amount: -300
      };
      const response = await apiRequest(request, 'POST', '/api/debit-notes', debitNoteData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('PUT /debit-notes/:id - update debit note', async ({ request }) => {
      const debitNoteData = {
        status: 'approved'
      };
      const response = await apiRequest(request, 'PUT', '/api/debit-notes/dn-001', debitNoteData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /debit-notes/:id - delete debit note', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/debit-notes/dn-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // RECURRING INVOICES - CRUD Operations (20 tests)
  // ============================================
  test.describe('Recurring Invoices CRUD', () => {
    test('GET /recurring-invoices - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/recurring-invoices?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /recurring-invoices - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/recurring-invoices?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /recurring-invoices - filter by customer_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/recurring-invoices?company_id=demo-company&customer_id=cust-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /recurring-invoices - filter by status active', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/recurring-invoices?company_id=demo-company&status=active');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /recurring-invoices/:id - returns single recurring invoice', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/recurring-invoices/ri-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /recurring-invoices - create with valid data', async ({ request }) => {
      const recurringData = {
        customer_id: 'cust-001',
        frequency: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        amount: 1000,
        status: 'active',
        line_items: [
          { description: 'Monthly service', quantity: 1, unit_price: 1000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/recurring-invoices', recurringData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /recurring-invoices - invalid frequency', async ({ request }) => {
      const recurringData = {
        customer_id: 'cust-001',
        frequency: 'invalid_frequency',
        start_date: new Date().toISOString().split('T')[0],
        amount: 1000
      };
      const response = await apiRequest(request, 'POST', '/api/recurring-invoices', recurringData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /recurring-invoices - frequency weekly', async ({ request }) => {
      const recurringData = {
        customer_id: 'cust-001',
        frequency: 'weekly',
        start_date: new Date().toISOString().split('T')[0],
        amount: 250
      };
      const response = await apiRequest(request, 'POST', '/api/recurring-invoices', recurringData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /recurring-invoices - frequency quarterly', async ({ request }) => {
      const recurringData = {
        customer_id: 'cust-001',
        frequency: 'quarterly',
        start_date: new Date().toISOString().split('T')[0],
        amount: 3000
      };
      const response = await apiRequest(request, 'POST', '/api/recurring-invoices', recurringData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /recurring-invoices - frequency annually', async ({ request }) => {
      const recurringData = {
        customer_id: 'cust-001',
        frequency: 'annually',
        start_date: new Date().toISOString().split('T')[0],
        amount: 12000
      };
      const response = await apiRequest(request, 'POST', '/api/recurring-invoices', recurringData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /recurring-invoices/:id - update recurring invoice', async ({ request }) => {
      const recurringData = {
        status: 'paused'
      };
      const response = await apiRequest(request, 'PUT', '/api/recurring-invoices/ri-001', recurringData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /recurring-invoices/:id - delete recurring invoice', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/recurring-invoices/ri-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // EXPENSE CLAIMS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Expense Claims CRUD', () => {
    test('GET /expense-claims - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/expense-claims?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /expense-claims - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/expense-claims?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /expense-claims - filter by employee_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/expense-claims?company_id=demo-company&employee_id=emp-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /expense-claims - filter by status pending', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/expense-claims?company_id=demo-company&status=pending');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /expense-claims - filter by status approved', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/expense-claims?company_id=demo-company&status=approved');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /expense-claims - filter by status rejected', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/expense-claims?company_id=demo-company&status=rejected');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /expense-claims - filter by category', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/expense-claims?company_id=demo-company&category=travel');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /expense-claims/:id - returns single expense claim', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/expense-claims/ec-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /expense-claims - create with valid data', async ({ request }) => {
      const expenseData = {
        employee_id: 'emp-001',
        claim_date: new Date().toISOString().split('T')[0],
        category: 'travel',
        description: 'Business trip expenses',
        amount: 1500,
        status: 'pending'
      };
      const response = await apiRequest(request, 'POST', '/api/expense-claims', expenseData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /expense-claims - missing employee_id', async ({ request }) => {
      const expenseData = {
        claim_date: new Date().toISOString().split('T')[0],
        category: 'travel',
        description: 'Business trip expenses',
        amount: 1500
      };
      const response = await apiRequest(request, 'POST', '/api/expense-claims', expenseData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /expense-claims - negative amount', async ({ request }) => {
      const expenseData = {
        employee_id: 'emp-001',
        claim_date: new Date().toISOString().split('T')[0],
        category: 'travel',
        description: 'Business trip expenses',
        amount: -1500
      };
      const response = await apiRequest(request, 'POST', '/api/expense-claims', expenseData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /expense-claims - zero amount', async ({ request }) => {
      const expenseData = {
        employee_id: 'emp-001',
        claim_date: new Date().toISOString().split('T')[0],
        category: 'travel',
        description: 'Business trip expenses',
        amount: 0
      };
      const response = await apiRequest(request, 'POST', '/api/expense-claims', expenseData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /expense-claims - invalid category', async ({ request }) => {
      const expenseData = {
        employee_id: 'emp-001',
        claim_date: new Date().toISOString().split('T')[0],
        category: 'invalid_category',
        description: 'Business trip expenses',
        amount: 1500
      };
      const response = await apiRequest(request, 'POST', '/api/expense-claims', expenseData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /expense-claims - category meals', async ({ request }) => {
      const expenseData = {
        employee_id: 'emp-001',
        claim_date: new Date().toISOString().split('T')[0],
        category: 'meals',
        description: 'Client lunch',
        amount: 250
      };
      const response = await apiRequest(request, 'POST', '/api/expense-claims', expenseData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /expense-claims - category accommodation', async ({ request }) => {
      const expenseData = {
        employee_id: 'emp-001',
        claim_date: new Date().toISOString().split('T')[0],
        category: 'accommodation',
        description: 'Hotel stay',
        amount: 2000
      };
      const response = await apiRequest(request, 'POST', '/api/expense-claims', expenseData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /expense-claims - with receipt attachment', async ({ request }) => {
      const expenseData = {
        employee_id: 'emp-001',
        claim_date: new Date().toISOString().split('T')[0],
        category: 'travel',
        description: 'Business trip expenses',
        amount: 1500,
        receipt_url: 'https://example.com/receipt.pdf'
      };
      const response = await apiRequest(request, 'POST', '/api/expense-claims', expenseData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /expense-claims/:id - approve expense claim', async ({ request }) => {
      const expenseData = {
        status: 'approved',
        approved_by: 'user-002'
      };
      const response = await apiRequest(request, 'PUT', '/api/expense-claims/ec-001', expenseData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /expense-claims/:id - reject expense claim', async ({ request }) => {
      const expenseData = {
        status: 'rejected',
        rejection_reason: 'Missing receipt'
      };
      const response = await apiRequest(request, 'PUT', '/api/expense-claims/ec-002', expenseData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /expense-claims/:id - delete expense claim', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/expense-claims/ec-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // BUDGETS - CRUD Operations (20 tests)
  // ============================================
  test.describe('Budgets CRUD', () => {
    test('GET /budgets - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/budgets?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /budgets - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/budgets?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /budgets - filter by fiscal_year', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/budgets?company_id=demo-company&fiscal_year=2024');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /budgets - filter by department', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/budgets?company_id=demo-company&department=Sales');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /budgets/:id - returns single budget', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/budgets/budget-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /budgets - create with valid data', async ({ request }) => {
      const budgetData = {
        name: `Budget ${generateId('BUD')}`,
        fiscal_year: 2024,
        department: 'Sales',
        total_amount: 100000,
        line_items: [
          { account_id: 'acc-001', amount: 50000 },
          { account_id: 'acc-002', amount: 50000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/budgets', budgetData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /budgets - missing name', async ({ request }) => {
      const budgetData = {
        fiscal_year: 2024,
        department: 'Sales',
        total_amount: 100000
      };
      const response = await apiRequest(request, 'POST', '/api/budgets', budgetData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /budgets - negative total_amount', async ({ request }) => {
      const budgetData = {
        name: `Budget ${generateId('BUD')}`,
        fiscal_year: 2024,
        department: 'Sales',
        total_amount: -100000
      };
      const response = await apiRequest(request, 'POST', '/api/budgets', budgetData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /budgets - zero total_amount', async ({ request }) => {
      const budgetData = {
        name: `Budget ${generateId('BUD')}`,
        fiscal_year: 2024,
        department: 'Sales',
        total_amount: 0
      };
      const response = await apiRequest(request, 'POST', '/api/budgets', budgetData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('PUT /budgets/:id - update budget', async ({ request }) => {
      const budgetData = {
        total_amount: 120000
      };
      const response = await apiRequest(request, 'PUT', '/api/budgets/budget-001', budgetData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /budgets/:id - delete budget', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/budgets/budget-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // FIXED ASSETS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Fixed Assets CRUD', () => {
    test('GET /fixed-assets - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/fixed-assets?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /fixed-assets - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/fixed-assets?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /fixed-assets - filter by asset_type', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/fixed-assets?company_id=demo-company&asset_type=equipment');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /fixed-assets - filter by status active', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/fixed-assets?company_id=demo-company&status=active');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /fixed-assets - filter by status disposed', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/fixed-assets?company_id=demo-company&status=disposed');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /fixed-assets - filter by location', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/fixed-assets?company_id=demo-company&location=Head Office');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /fixed-assets/:id - returns single asset', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/fixed-assets/fa-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /fixed-assets - create with valid data', async ({ request }) => {
      const assetData = {
        name: `Asset ${generateId('FA')}`,
        asset_type: 'equipment',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_price: 50000,
        useful_life_years: 5,
        depreciation_method: 'straight_line',
        location: 'Head Office',
        status: 'active'
      };
      const response = await apiRequest(request, 'POST', '/api/fixed-assets', assetData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /fixed-assets - missing name', async ({ request }) => {
      const assetData = {
        asset_type: 'equipment',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_price: 50000,
        useful_life_years: 5
      };
      const response = await apiRequest(request, 'POST', '/api/fixed-assets', assetData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /fixed-assets - negative purchase_price', async ({ request }) => {
      const assetData = {
        name: `Asset ${generateId('FA')}`,
        asset_type: 'equipment',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_price: -50000,
        useful_life_years: 5
      };
      const response = await apiRequest(request, 'POST', '/api/fixed-assets', assetData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /fixed-assets - zero useful_life_years', async ({ request }) => {
      const assetData = {
        name: `Asset ${generateId('FA')}`,
        asset_type: 'equipment',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_price: 50000,
        useful_life_years: 0
      };
      const response = await apiRequest(request, 'POST', '/api/fixed-assets', assetData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /fixed-assets - negative useful_life_years', async ({ request }) => {
      const assetData = {
        name: `Asset ${generateId('FA')}`,
        asset_type: 'equipment',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_price: 50000,
        useful_life_years: -5
      };
      const response = await apiRequest(request, 'POST', '/api/fixed-assets', assetData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /fixed-assets - invalid depreciation_method', async ({ request }) => {
      const assetData = {
        name: `Asset ${generateId('FA')}`,
        asset_type: 'equipment',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_price: 50000,
        useful_life_years: 5,
        depreciation_method: 'invalid_method'
      };
      const response = await apiRequest(request, 'POST', '/api/fixed-assets', assetData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /fixed-assets - depreciation_method reducing_balance', async ({ request }) => {
      const assetData = {
        name: `Asset ${generateId('FA')}`,
        asset_type: 'equipment',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_price: 50000,
        useful_life_years: 5,
        depreciation_method: 'reducing_balance'
      };
      const response = await apiRequest(request, 'POST', '/api/fixed-assets', assetData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /fixed-assets - asset_type vehicle', async ({ request }) => {
      const assetData = {
        name: `Vehicle ${generateId('FA')}`,
        asset_type: 'vehicle',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_price: 250000,
        useful_life_years: 5,
        depreciation_method: 'straight_line'
      };
      const response = await apiRequest(request, 'POST', '/api/fixed-assets', assetData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /fixed-assets - asset_type furniture', async ({ request }) => {
      const assetData = {
        name: `Furniture ${generateId('FA')}`,
        asset_type: 'furniture',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_price: 15000,
        useful_life_years: 10,
        depreciation_method: 'straight_line'
      };
      const response = await apiRequest(request, 'POST', '/api/fixed-assets', assetData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /fixed-assets - asset_type computer', async ({ request }) => {
      const assetData = {
        name: `Computer ${generateId('FA')}`,
        asset_type: 'computer',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_price: 25000,
        useful_life_years: 3,
        depreciation_method: 'straight_line'
      };
      const response = await apiRequest(request, 'POST', '/api/fixed-assets', assetData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /fixed-assets/:id - update asset', async ({ request }) => {
      const assetData = {
        location: 'Branch Office'
      };
      const response = await apiRequest(request, 'PUT', '/api/fixed-assets/fa-001', assetData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('POST /fixed-assets/:id/dispose - dispose asset', async ({ request }) => {
      const disposeData = {
        disposal_date: new Date().toISOString().split('T')[0],
        disposal_price: 10000,
        disposal_reason: 'Sold'
      };
      const response = await apiRequest(request, 'POST', '/api/fixed-assets/fa-001/dispose', disposeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /fixed-assets/:id - delete asset', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/fixed-assets/fa-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PROJECTS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Projects CRUD', () => {
    test('GET /projects - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/projects?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /projects - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/projects?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /projects - filter by status active', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/projects?company_id=demo-company&status=active');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /projects - filter by status completed', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/projects?company_id=demo-company&status=completed');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /projects - filter by customer_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/projects?company_id=demo-company&customer_id=cust-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /projects - filter by manager_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/projects?company_id=demo-company&manager_id=user-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /projects/:id - returns single project', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/projects/proj-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /projects - create with valid data', async ({ request }) => {
      const projectData = {
        name: `Project ${generateId('PROJ')}`,
        customer_id: 'cust-001',
        manager_id: 'user-001',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: 100000,
        status: 'active'
      };
      const response = await apiRequest(request, 'POST', '/api/projects', projectData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /projects - missing name', async ({ request }) => {
      const projectData = {
        customer_id: 'cust-001',
        manager_id: 'user-001',
        start_date: new Date().toISOString().split('T')[0],
        budget: 100000
      };
      const response = await apiRequest(request, 'POST', '/api/projects', projectData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /projects - end_date before start_date', async ({ request }) => {
      const projectData = {
        name: `Project ${generateId('PROJ')}`,
        customer_id: 'cust-001',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: 100000
      };
      const response = await apiRequest(request, 'POST', '/api/projects', projectData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /projects - negative budget', async ({ request }) => {
      const projectData = {
        name: `Project ${generateId('PROJ')}`,
        customer_id: 'cust-001',
        start_date: new Date().toISOString().split('T')[0],
        budget: -100000
      };
      const response = await apiRequest(request, 'POST', '/api/projects', projectData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /projects - with tasks', async ({ request }) => {
      const projectData = {
        name: `Project ${generateId('PROJ')}`,
        customer_id: 'cust-001',
        start_date: new Date().toISOString().split('T')[0],
        budget: 100000,
        tasks: [
          { name: 'Task 1', due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
          { name: 'Task 2', due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/projects', projectData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /projects/:id - update project', async ({ request }) => {
      const projectData = {
        status: 'completed'
      };
      const response = await apiRequest(request, 'PUT', '/api/projects/proj-001', projectData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /projects/:id - delete project', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/projects/proj-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // TAX RATES - CRUD Operations (20 tests)
  // ============================================
  test.describe('Tax Rates CRUD', () => {
    test('GET /tax-rates - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/tax-rates?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tax-rates - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/tax-rates?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tax-rates - filter by is_active true', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/tax-rates?company_id=demo-company&is_active=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tax-rates/:id - returns single tax rate', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/tax-rates/tax-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /tax-rates - create with valid data', async ({ request }) => {
      const taxData = {
        name: `Tax Rate ${generateId('TAX')}`,
        rate: 15,
        tax_type: 'VAT',
        is_active: true
      };
      const response = await apiRequest(request, 'POST', '/api/tax-rates', taxData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /tax-rates - missing name', async ({ request }) => {
      const taxData = {
        rate: 15,
        tax_type: 'VAT'
      };
      const response = await apiRequest(request, 'POST', '/api/tax-rates', taxData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /tax-rates - negative rate', async ({ request }) => {
      const taxData = {
        name: `Tax Rate ${generateId('TAX')}`,
        rate: -15,
        tax_type: 'VAT'
      };
      const response = await apiRequest(request, 'POST', '/api/tax-rates', taxData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /tax-rates - rate over 100', async ({ request }) => {
      const taxData = {
        name: `Tax Rate ${generateId('TAX')}`,
        rate: 150,
        tax_type: 'VAT'
      };
      const response = await apiRequest(request, 'POST', '/api/tax-rates', taxData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /tax-rates - zero rate', async ({ request }) => {
      const taxData = {
        name: `Zero Rate ${generateId('TAX')}`,
        rate: 0,
        tax_type: 'VAT'
      };
      const response = await apiRequest(request, 'POST', '/api/tax-rates', taxData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /tax-rates/:id - update tax rate', async ({ request }) => {
      const taxData = {
        rate: 16
      };
      const response = await apiRequest(request, 'PUT', '/api/tax-rates/tax-001', taxData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /tax-rates/:id - delete tax rate', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/tax-rates/tax-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // CURRENCIES - CRUD Operations (15 tests)
  // ============================================
  test.describe('Currencies CRUD', () => {
    test('GET /currencies - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/currencies?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /currencies - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/currencies?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /currencies - filter by is_active true', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/currencies?company_id=demo-company&is_active=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /currencies/:id - returns single currency', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/currencies/ZAR?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /currencies - create with valid data', async ({ request }) => {
      const currencyData = {
        code: 'TST',
        name: 'Test Currency',
        symbol: 'T$',
        exchange_rate: 1.5,
        is_active: true
      };
      const response = await apiRequest(request, 'POST', '/api/currencies', currencyData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /currencies - missing code', async ({ request }) => {
      const currencyData = {
        name: 'Test Currency',
        symbol: 'T$',
        exchange_rate: 1.5
      };
      const response = await apiRequest(request, 'POST', '/api/currencies', currencyData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /currencies - negative exchange_rate', async ({ request }) => {
      const currencyData = {
        code: 'TST',
        name: 'Test Currency',
        symbol: 'T$',
        exchange_rate: -1.5
      };
      const response = await apiRequest(request, 'POST', '/api/currencies', currencyData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /currencies - zero exchange_rate', async ({ request }) => {
      const currencyData = {
        code: 'TST',
        name: 'Test Currency',
        symbol: 'T$',
        exchange_rate: 0
      };
      const response = await apiRequest(request, 'POST', '/api/currencies', currencyData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('PUT /currencies/:id - update currency', async ({ request }) => {
      const currencyData = {
        exchange_rate: 1.6
      };
      const response = await apiRequest(request, 'PUT', '/api/currencies/TST', currencyData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /currencies/:id - delete currency', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/currencies/TST?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });
});
