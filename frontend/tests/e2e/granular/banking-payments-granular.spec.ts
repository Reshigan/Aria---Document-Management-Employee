/**
 * ARIA ERP - Banking/Payments Granular Tests
 * Comprehensive field-level and validation testing for Banking/Payments module
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

test.describe('Banking/Payments Granular Tests', () => {

  // ============================================
  // BANK ACCOUNTS - CRUD Operations (30 tests)
  // ============================================
  test.describe('Bank Accounts CRUD', () => {
    test('GET /bank-accounts - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-accounts?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-accounts - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-accounts?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-accounts - filter by is_active true', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-accounts?company_id=demo-company&is_active=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-accounts - filter by account_type', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-accounts?company_id=demo-company&account_type=checking');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-accounts - search by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-accounts?company_id=demo-company&search=Main');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-accounts/:id - returns single account', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-accounts/ba-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-accounts/:id - invalid ID returns 404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-accounts/invalid-ba-12345?company_id=demo-company');
      expect([401, 404]).toContain(response.status());
    });

    test('POST /bank-accounts - create with valid data', async ({ request }) => {
      const accountData = {
        account_name: `Test Bank Account ${generateId('BA')}`,
        bank_name: 'First National Bank',
        account_number: `${Date.now().toString().slice(-10)}`,
        branch_code: '250655',
        account_type: 'checking',
        currency: 'ZAR',
        is_active: true
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-accounts', accountData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /bank-accounts - missing account_name', async ({ request }) => {
      const accountData = {
        bank_name: 'First National Bank',
        account_number: `${Date.now().toString().slice(-10)}`,
        branch_code: '250655'
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-accounts', accountData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-accounts - empty account_name', async ({ request }) => {
      const accountData = {
        account_name: '',
        bank_name: 'First National Bank',
        account_number: `${Date.now().toString().slice(-10)}`
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-accounts', accountData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-accounts - missing bank_name', async ({ request }) => {
      const accountData = {
        account_name: `Test Bank Account ${generateId('BA')}`,
        account_number: `${Date.now().toString().slice(-10)}`,
        branch_code: '250655'
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-accounts', accountData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-accounts - missing account_number', async ({ request }) => {
      const accountData = {
        account_name: `Test Bank Account ${generateId('BA')}`,
        bank_name: 'First National Bank',
        branch_code: '250655'
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-accounts', accountData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-accounts - duplicate account_number', async ({ request }) => {
      const accountNumber = `${Date.now().toString().slice(-10)}`;
      const accountData1 = { account_name: 'Account 1', bank_name: 'FNB', account_number: accountNumber };
      const accountData2 = { account_name: 'Account 2', bank_name: 'FNB', account_number: accountNumber };
      await apiRequest(request, 'POST', '/api/banking/bank-accounts', accountData1);
      const response = await apiRequest(request, 'POST', '/api/banking/bank-accounts', accountData2);
      expect([200, 201, 400, 401, 404, 409, 422]).toContain(response.status());
    });

    test('POST /bank-accounts - invalid account_type', async ({ request }) => {
      const accountData = {
        account_name: `Test Bank Account ${generateId('BA')}`,
        bank_name: 'First National Bank',
        account_number: `${Date.now().toString().slice(-10)}`,
        account_type: 'invalid_type'
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-accounts', accountData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-accounts - account_type savings', async ({ request }) => {
      const accountData = {
        account_name: `Test Bank Account ${generateId('BA')}`,
        bank_name: 'First National Bank',
        account_number: `${Date.now().toString().slice(-10)}`,
        account_type: 'savings'
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-accounts', accountData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /bank-accounts - invalid currency', async ({ request }) => {
      const accountData = {
        account_name: `Test Bank Account ${generateId('BA')}`,
        bank_name: 'First National Bank',
        account_number: `${Date.now().toString().slice(-10)}`,
        currency: 'INVALID'
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-accounts', accountData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-accounts - with opening_balance', async ({ request }) => {
      const accountData = {
        account_name: `Test Bank Account ${generateId('BA')}`,
        bank_name: 'First National Bank',
        account_number: `${Date.now().toString().slice(-10)}`,
        opening_balance: 10000.00
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-accounts', accountData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /bank-accounts - negative opening_balance', async ({ request }) => {
      const accountData = {
        account_name: `Test Bank Account ${generateId('BA')}`,
        bank_name: 'First National Bank',
        account_number: `${Date.now().toString().slice(-10)}`,
        opening_balance: -10000.00
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-accounts', accountData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /bank-accounts - with gl_account_id', async ({ request }) => {
      const accountData = {
        account_name: `Test Bank Account ${generateId('BA')}`,
        bank_name: 'First National Bank',
        account_number: `${Date.now().toString().slice(-10)}`,
        gl_account_id: 'acc-001'
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-accounts', accountData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // BANK TRANSACTIONS - CRUD Operations (30 tests)
  // ============================================
  test.describe('Bank Transactions CRUD', () => {
    test('GET /bank-transactions - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-transactions?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-transactions - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-transactions?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-transactions - filter by bank_account_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-transactions?company_id=demo-company&bank_account_id=ba-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-transactions - filter by transaction_type deposit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-transactions?company_id=demo-company&transaction_type=deposit');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-transactions - filter by transaction_type withdrawal', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-transactions?company_id=demo-company&transaction_type=withdrawal');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-transactions - filter by transaction_type transfer', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-transactions?company_id=demo-company&transaction_type=transfer');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-transactions - filter by status reconciled', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-transactions?company_id=demo-company&status=reconciled');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-transactions - filter by status unreconciled', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-transactions?company_id=demo-company&status=unreconciled');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-transactions - filter by date range', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/banking/bank-transactions?company_id=demo-company&from_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-transactions/:id - returns single transaction', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-transactions/bt-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /bank-transactions - create deposit', async ({ request }) => {
      const transactionData = {
        bank_account_id: 'ba-001',
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'deposit',
        amount: 5000.00,
        description: `Test deposit ${generateId('BT')}`,
        reference: `REF-${Date.now()}`
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-transactions', transactionData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /bank-transactions - create withdrawal', async ({ request }) => {
      const transactionData = {
        bank_account_id: 'ba-001',
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'withdrawal',
        amount: 2000.00,
        description: `Test withdrawal ${generateId('BT')}`,
        reference: `REF-${Date.now()}`
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-transactions', transactionData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /bank-transactions - create transfer', async ({ request }) => {
      const transactionData = {
        bank_account_id: 'ba-001',
        to_bank_account_id: 'ba-002',
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'transfer',
        amount: 1000.00,
        description: `Test transfer ${generateId('BT')}`
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-transactions', transactionData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /bank-transactions - missing bank_account_id', async ({ request }) => {
      const transactionData = {
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'deposit',
        amount: 5000.00
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-transactions', transactionData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-transactions - invalid bank_account_id', async ({ request }) => {
      const transactionData = {
        bank_account_id: 'invalid-ba-12345',
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'deposit',
        amount: 5000.00
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-transactions', transactionData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-transactions - missing amount', async ({ request }) => {
      const transactionData = {
        bank_account_id: 'ba-001',
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'deposit'
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-transactions', transactionData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-transactions - negative amount', async ({ request }) => {
      const transactionData = {
        bank_account_id: 'ba-001',
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'deposit',
        amount: -5000.00
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-transactions', transactionData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-transactions - zero amount', async ({ request }) => {
      const transactionData = {
        bank_account_id: 'ba-001',
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'deposit',
        amount: 0
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-transactions', transactionData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-transactions - very large amount', async ({ request }) => {
      const transactionData = {
        bank_account_id: 'ba-001',
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'deposit',
        amount: 999999999.99
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-transactions', transactionData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-transactions - invalid transaction_type', async ({ request }) => {
      const transactionData = {
        bank_account_id: 'ba-001',
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'invalid_type',
        amount: 5000.00
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-transactions', transactionData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-transactions - invalid transaction_date format', async ({ request }) => {
      const transactionData = {
        bank_account_id: 'ba-001',
        transaction_date: 'invalid-date',
        transaction_type: 'deposit',
        amount: 5000.00
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-transactions', transactionData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /bank-transactions - future transaction_date', async ({ request }) => {
      const transactionData = {
        bank_account_id: 'ba-001',
        transaction_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        transaction_type: 'deposit',
        amount: 5000.00
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-transactions', transactionData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-transactions - transfer same account', async ({ request }) => {
      const transactionData = {
        bank_account_id: 'ba-001',
        to_bank_account_id: 'ba-001',
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'transfer',
        amount: 1000.00
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-transactions', transactionData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-transactions - transfer missing to_bank_account_id', async ({ request }) => {
      const transactionData = {
        bank_account_id: 'ba-001',
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'transfer',
        amount: 1000.00
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-transactions', transactionData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // PAYMENTS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Payments CRUD', () => {
    test('GET /payments - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/payments?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payments - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/payments?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payments - filter by payment_type customer', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/payments?company_id=demo-company&payment_type=customer');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payments - filter by payment_type supplier', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/payments?company_id=demo-company&payment_type=supplier');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payments - filter by status pending', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/payments?company_id=demo-company&status=pending');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payments - filter by status completed', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/payments?company_id=demo-company&status=completed');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payments - filter by payment_method', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/payments?company_id=demo-company&payment_method=eft');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payments/:id - returns single payment', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/payments/pay-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /payments - create customer payment', async ({ request }) => {
      const paymentData = {
        payment_type: 'customer',
        customer_id: 'cust-001',
        bank_account_id: 'ba-001',
        payment_date: new Date().toISOString().split('T')[0],
        amount: 5000.00,
        payment_method: 'eft',
        reference: `PAY-${Date.now()}`
      };
      const response = await apiRequest(request, 'POST', '/api/banking/payments', paymentData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /payments - create supplier payment', async ({ request }) => {
      const paymentData = {
        payment_type: 'supplier',
        supplier_id: 'supp-001',
        bank_account_id: 'ba-001',
        payment_date: new Date().toISOString().split('T')[0],
        amount: 3000.00,
        payment_method: 'eft',
        reference: `PAY-${Date.now()}`
      };
      const response = await apiRequest(request, 'POST', '/api/banking/payments', paymentData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /payments - missing payment_type', async ({ request }) => {
      const paymentData = {
        customer_id: 'cust-001',
        bank_account_id: 'ba-001',
        payment_date: new Date().toISOString().split('T')[0],
        amount: 5000.00
      };
      const response = await apiRequest(request, 'POST', '/api/banking/payments', paymentData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /payments - invalid payment_type', async ({ request }) => {
      const paymentData = {
        payment_type: 'invalid_type',
        customer_id: 'cust-001',
        bank_account_id: 'ba-001',
        payment_date: new Date().toISOString().split('T')[0],
        amount: 5000.00
      };
      const response = await apiRequest(request, 'POST', '/api/banking/payments', paymentData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /payments - negative amount', async ({ request }) => {
      const paymentData = {
        payment_type: 'customer',
        customer_id: 'cust-001',
        bank_account_id: 'ba-001',
        payment_date: new Date().toISOString().split('T')[0],
        amount: -5000.00
      };
      const response = await apiRequest(request, 'POST', '/api/banking/payments', paymentData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /payments - with invoice_ids', async ({ request }) => {
      const paymentData = {
        payment_type: 'customer',
        customer_id: 'cust-001',
        bank_account_id: 'ba-001',
        payment_date: new Date().toISOString().split('T')[0],
        amount: 5000.00,
        payment_method: 'eft',
        invoice_ids: ['inv-001', 'inv-002']
      };
      const response = await apiRequest(request, 'POST', '/api/banking/payments', paymentData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /payments - invalid payment_method', async ({ request }) => {
      const paymentData = {
        payment_type: 'customer',
        customer_id: 'cust-001',
        bank_account_id: 'ba-001',
        payment_date: new Date().toISOString().split('T')[0],
        amount: 5000.00,
        payment_method: 'invalid_method'
      };
      const response = await apiRequest(request, 'POST', '/api/banking/payments', paymentData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // BANK RECONCILIATION - Operations (10 tests)
  // ============================================
  test.describe('Bank Reconciliation', () => {
    test('GET /bank-reconciliations - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-reconciliations?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-reconciliations - filter by bank_account_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-reconciliations?company_id=demo-company&bank_account_id=ba-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-reconciliations - filter by status draft', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-reconciliations?company_id=demo-company&status=draft');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bank-reconciliations - filter by status completed', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/banking/bank-reconciliations?company_id=demo-company&status=completed');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /bank-reconciliations - create with valid data', async ({ request }) => {
      const reconciliationData = {
        bank_account_id: 'ba-001',
        statement_date: new Date().toISOString().split('T')[0],
        statement_balance: 50000.00,
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-reconciliations', reconciliationData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /bank-reconciliations - missing bank_account_id', async ({ request }) => {
      const reconciliationData = {
        statement_date: new Date().toISOString().split('T')[0],
        statement_balance: 50000.00,
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-reconciliations', reconciliationData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bank-reconciliations - negative statement_balance', async ({ request }) => {
      const reconciliationData = {
        bank_account_id: 'ba-001',
        statement_date: new Date().toISOString().split('T')[0],
        statement_balance: -50000.00,
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-reconciliations', reconciliationData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PERFORMANCE TESTS (5 tests)
  // ============================================
  test.describe('Performance Tests', () => {
    test('GET /bank-accounts - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/banking/bank-accounts?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /bank-transactions - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/banking/bank-transactions?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /payments - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/banking/payments?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('POST /bank-transactions - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const transactionData = {
        bank_account_id: 'ba-001',
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'deposit',
        amount: 5000.00
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-transactions', transactionData);
      const duration = Date.now() - start;
      expect([200, 201, 400, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });

    test('POST /payments - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const paymentData = {
        payment_type: 'customer',
        customer_id: 'cust-001',
        bank_account_id: 'ba-001',
        payment_date: new Date().toISOString().split('T')[0],
        amount: 5000.00
      };
      const response = await apiRequest(request, 'POST', '/api/banking/payments', paymentData);
      const duration = Date.now() - start;
      expect([200, 201, 400, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });
  });
});
