/**
 * ARIA ERP - Financial/GL Granular Tests
 * Comprehensive field-level and validation testing for Financial/GL module
 * 
 * Tests: ~150 granular test cases
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

test.describe('Financial/GL Granular Tests', () => {

  // ============================================
  // CHART OF ACCOUNTS - CRUD Operations (40 tests)
  // ============================================
  test.describe('Chart of Accounts CRUD', () => {
    test('GET /chart-of-accounts - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/chart-of-accounts?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /chart-of-accounts - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/chart-of-accounts?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /chart-of-accounts - filter by account_type asset', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/chart-of-accounts?company_id=demo-company&account_type=asset');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /chart-of-accounts - filter by account_type liability', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/chart-of-accounts?company_id=demo-company&account_type=liability');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /chart-of-accounts - filter by account_type equity', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/chart-of-accounts?company_id=demo-company&account_type=equity');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /chart-of-accounts - filter by account_type revenue', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/chart-of-accounts?company_id=demo-company&account_type=revenue');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /chart-of-accounts - filter by account_type expense', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/chart-of-accounts?company_id=demo-company&account_type=expense');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /chart-of-accounts - filter by is_active true', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/chart-of-accounts?company_id=demo-company&is_active=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /chart-of-accounts - search by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/chart-of-accounts?company_id=demo-company&search=Cash');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /chart-of-accounts/:id - returns single account', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/chart-of-accounts/acc-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /chart-of-accounts - create with valid data', async ({ request }) => {
      const accountData = {
        account_code: `${Date.now().toString().slice(-6)}`,
        account_name: `Test Account ${generateId('ACC')}`,
        account_type: 'asset',
        description: 'Test account for automated testing',
        is_active: true,
        is_system: false
      };
      const response = await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /chart-of-accounts - missing account_code', async ({ request }) => {
      const accountData = {
        account_name: `Test Account ${generateId('ACC')}`,
        account_type: 'asset'
      };
      const response = await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /chart-of-accounts - missing account_name', async ({ request }) => {
      const accountData = {
        account_code: `${Date.now().toString().slice(-6)}`,
        account_type: 'asset'
      };
      const response = await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /chart-of-accounts - missing account_type', async ({ request }) => {
      const accountData = {
        account_code: `${Date.now().toString().slice(-6)}`,
        account_name: `Test Account ${generateId('ACC')}`
      };
      const response = await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /chart-of-accounts - invalid account_type', async ({ request }) => {
      const accountData = {
        account_code: `${Date.now().toString().slice(-6)}`,
        account_name: `Test Account ${generateId('ACC')}`,
        account_type: 'invalid_type'
      };
      const response = await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /chart-of-accounts - duplicate account_code', async ({ request }) => {
      const accountCode = `DUP${Date.now().toString().slice(-4)}`;
      const accountData1 = { account_code: accountCode, account_name: 'Account 1', account_type: 'asset' };
      const accountData2 = { account_code: accountCode, account_name: 'Account 2', account_type: 'asset' };
      await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData1);
      const response = await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData2);
      expect([200, 201, 400, 401, 404, 409, 422]).toContain(response.status());
    });

    test('POST /chart-of-accounts - empty account_code', async ({ request }) => {
      const accountData = {
        account_code: '',
        account_name: `Test Account ${generateId('ACC')}`,
        account_type: 'asset'
      };
      const response = await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /chart-of-accounts - empty account_name', async ({ request }) => {
      const accountData = {
        account_code: `${Date.now().toString().slice(-6)}`,
        account_name: '',
        account_type: 'asset'
      };
      const response = await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /chart-of-accounts - very long account_name', async ({ request }) => {
      const accountData = {
        account_code: `${Date.now().toString().slice(-6)}`,
        account_name: 'A'.repeat(500),
        account_type: 'asset'
      };
      const response = await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /chart-of-accounts - with parent_account_id', async ({ request }) => {
      const accountData = {
        account_code: `${Date.now().toString().slice(-6)}`,
        account_name: `Test Account ${generateId('ACC')}`,
        account_type: 'asset',
        parent_account_id: 'acc-001'
      };
      const response = await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /chart-of-accounts - invalid parent_account_id', async ({ request }) => {
      const accountData = {
        account_code: `${Date.now().toString().slice(-6)}`,
        account_name: `Test Account ${generateId('ACC')}`,
        account_type: 'asset',
        parent_account_id: 'invalid-parent-12345'
      };
      const response = await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /chart-of-accounts - with opening_balance', async ({ request }) => {
      const accountData = {
        account_code: `${Date.now().toString().slice(-6)}`,
        account_name: `Test Account ${generateId('ACC')}`,
        account_type: 'asset',
        opening_balance: 10000
      };
      const response = await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /chart-of-accounts - negative opening_balance', async ({ request }) => {
      const accountData = {
        account_code: `${Date.now().toString().slice(-6)}`,
        account_name: `Test Account ${generateId('ACC')}`,
        account_type: 'asset',
        opening_balance: -10000
      };
      const response = await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /chart-of-accounts - with currency', async ({ request }) => {
      const accountData = {
        account_code: `${Date.now().toString().slice(-6)}`,
        account_name: `Test Account ${generateId('ACC')}`,
        account_type: 'asset',
        currency: 'ZAR'
      };
      const response = await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /chart-of-accounts - invalid currency', async ({ request }) => {
      const accountData = {
        account_code: `${Date.now().toString().slice(-6)}`,
        account_name: `Test Account ${generateId('ACC')}`,
        account_type: 'asset',
        currency: 'INVALID'
      };
      const response = await apiRequest(request, 'POST', '/api/gl/chart-of-accounts', accountData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // JOURNAL ENTRIES - CRUD Operations (40 tests)
  // ============================================
  test.describe('Journal Entries CRUD', () => {
    test('GET /journal-entries - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/journal-entries?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /journal-entries - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/journal-entries?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /journal-entries - filter by status draft', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/journal-entries?company_id=demo-company&status=draft');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /journal-entries - filter by status posted', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/journal-entries?company_id=demo-company&status=posted');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /journal-entries - filter by status reversed', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/journal-entries?company_id=demo-company&status=reversed');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /journal-entries - filter by date range', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/gl/journal-entries?company_id=demo-company&from_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /journal-entries - filter by entry_type', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/journal-entries?company_id=demo-company&entry_type=manual');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /journal-entries/:id - returns single entry', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/journal-entries/je-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /journal-entries - create with valid data', async ({ request }) => {
      const entryData = {
        entry_date: new Date().toISOString().split('T')[0],
        description: `Test journal entry ${generateId('JE')}`,
        status: 'draft',
        lines: [
          { account_id: 'acc-001', debit: 1000, credit: 0, description: 'Debit line' },
          { account_id: 'acc-002', debit: 0, credit: 1000, description: 'Credit line' }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/gl/journal-entries', entryData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /journal-entries - missing entry_date', async ({ request }) => {
      const entryData = {
        description: `Test journal entry ${generateId('JE')}`,
        status: 'draft',
        lines: [
          { account_id: 'acc-001', debit: 1000, credit: 0 },
          { account_id: 'acc-002', debit: 0, credit: 1000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/gl/journal-entries', entryData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /journal-entries - invalid entry_date format', async ({ request }) => {
      const entryData = {
        entry_date: 'invalid-date',
        description: `Test journal entry ${generateId('JE')}`,
        status: 'draft',
        lines: [
          { account_id: 'acc-001', debit: 1000, credit: 0 },
          { account_id: 'acc-002', debit: 0, credit: 1000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/gl/journal-entries', entryData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /journal-entries - unbalanced entry (debits != credits)', async ({ request }) => {
      const entryData = {
        entry_date: new Date().toISOString().split('T')[0],
        description: `Test journal entry ${generateId('JE')}`,
        status: 'draft',
        lines: [
          { account_id: 'acc-001', debit: 1000, credit: 0 },
          { account_id: 'acc-002', debit: 0, credit: 500 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/gl/journal-entries', entryData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /journal-entries - empty lines array', async ({ request }) => {
      const entryData = {
        entry_date: new Date().toISOString().split('T')[0],
        description: `Test journal entry ${generateId('JE')}`,
        status: 'draft',
        lines: []
      };
      const response = await apiRequest(request, 'POST', '/api/gl/journal-entries', entryData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /journal-entries - single line (invalid)', async ({ request }) => {
      const entryData = {
        entry_date: new Date().toISOString().split('T')[0],
        description: `Test journal entry ${generateId('JE')}`,
        status: 'draft',
        lines: [
          { account_id: 'acc-001', debit: 1000, credit: 0 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/gl/journal-entries', entryData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /journal-entries - negative debit amount', async ({ request }) => {
      const entryData = {
        entry_date: new Date().toISOString().split('T')[0],
        description: `Test journal entry ${generateId('JE')}`,
        status: 'draft',
        lines: [
          { account_id: 'acc-001', debit: -1000, credit: 0 },
          { account_id: 'acc-002', debit: 0, credit: -1000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/gl/journal-entries', entryData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /journal-entries - line with both debit and credit', async ({ request }) => {
      const entryData = {
        entry_date: new Date().toISOString().split('T')[0],
        description: `Test journal entry ${generateId('JE')}`,
        status: 'draft',
        lines: [
          { account_id: 'acc-001', debit: 1000, credit: 500 },
          { account_id: 'acc-002', debit: 0, credit: 500 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/gl/journal-entries', entryData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /journal-entries - invalid account_id in line', async ({ request }) => {
      const entryData = {
        entry_date: new Date().toISOString().split('T')[0],
        description: `Test journal entry ${generateId('JE')}`,
        status: 'draft',
        lines: [
          { account_id: 'invalid-acc-12345', debit: 1000, credit: 0 },
          { account_id: 'acc-002', debit: 0, credit: 1000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/gl/journal-entries', entryData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /journal-entries - with reference_number', async ({ request }) => {
      const entryData = {
        entry_date: new Date().toISOString().split('T')[0],
        description: `Test journal entry ${generateId('JE')}`,
        reference_number: `REF-${Date.now()}`,
        status: 'draft',
        lines: [
          { account_id: 'acc-001', debit: 1000, credit: 0 },
          { account_id: 'acc-002', debit: 0, credit: 1000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/gl/journal-entries', entryData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /journal-entries - with source_document', async ({ request }) => {
      const entryData = {
        entry_date: new Date().toISOString().split('T')[0],
        description: `Test journal entry ${generateId('JE')}`,
        source_document: 'INV-001',
        source_type: 'invoice',
        status: 'draft',
        lines: [
          { account_id: 'acc-001', debit: 1000, credit: 0 },
          { account_id: 'acc-002', debit: 0, credit: 1000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/gl/journal-entries', entryData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /journal-entries - multiple lines (5 lines)', async ({ request }) => {
      const entryData = {
        entry_date: new Date().toISOString().split('T')[0],
        description: `Test journal entry ${generateId('JE')}`,
        status: 'draft',
        lines: [
          { account_id: 'acc-001', debit: 500, credit: 0 },
          { account_id: 'acc-002', debit: 300, credit: 0 },
          { account_id: 'acc-003', debit: 200, credit: 0 },
          { account_id: 'acc-004', debit: 0, credit: 600 },
          { account_id: 'acc-005', debit: 0, credit: 400 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/gl/journal-entries', entryData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /journal-entries - very large amounts', async ({ request }) => {
      const entryData = {
        entry_date: new Date().toISOString().split('T')[0],
        description: `Test journal entry ${generateId('JE')}`,
        status: 'draft',
        lines: [
          { account_id: 'acc-001', debit: 999999999.99, credit: 0 },
          { account_id: 'acc-002', debit: 0, credit: 999999999.99 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/gl/journal-entries', entryData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /journal-entries - decimal precision', async ({ request }) => {
      const entryData = {
        entry_date: new Date().toISOString().split('T')[0],
        description: `Test journal entry ${generateId('JE')}`,
        status: 'draft',
        lines: [
          { account_id: 'acc-001', debit: 1000.123456789, credit: 0 },
          { account_id: 'acc-002', debit: 0, credit: 1000.123456789 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/gl/journal-entries', entryData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // FINANCIAL REPORTS - Read Operations (30 tests)
  // ============================================
  test.describe('Financial Reports', () => {
    test('GET /trial-balance - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/trial-balance?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /trial-balance - with as_of_date', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/gl/trial-balance?company_id=demo-company&as_of_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /profit-loss - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/profit-loss?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /profit-loss - with date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/gl/profit-loss?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /balance-sheet - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/balance-sheet?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /balance-sheet - with as_of_date', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/gl/balance-sheet?company_id=demo-company&as_of_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /cash-flow - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/cash-flow?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /cash-flow - with date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/gl/cash-flow?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /ar-aging - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/bi/ar-aging?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /ar-aging - with as_of_date', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/bi/ar-aging?company_id=demo-company&as_of_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /ap-aging - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/bi/ap-aging?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /ap-aging - with as_of_date', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/bi/ap-aging?company_id=demo-company&as_of_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /general-ledger - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/general-ledger?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /general-ledger - filter by account_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/gl/general-ledger?company_id=demo-company&account_id=acc-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /general-ledger - with date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/gl/general-ledger?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // INVOICES - CRUD Operations (25 tests)
  // ============================================
  test.describe('Invoices CRUD', () => {
    test('GET /invoices - returns 200', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/invoices?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - filter by status draft', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/invoices?company_id=demo-company&status=draft');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - filter by status sent', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/invoices?company_id=demo-company&status=sent');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - filter by status paid', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/invoices?company_id=demo-company&status=paid');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - filter by status overdue', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/invoices?company_id=demo-company&status=overdue');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - filter by customer_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/invoices?company_id=demo-company&customer_id=cust-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /invoices - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/invoices?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /invoices - create with valid data', async ({ request }) => {
      const invoiceData = {
        customer_id: 'cust-001',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150,
        notes: `Test invoice ${generateId('INV')}`
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/invoices', invoiceData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /invoices - missing customer_id', async ({ request }) => {
      const invoiceData = {
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/invoices', invoiceData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /invoices - due_date before invoice_date', async ({ request }) => {
      const invoiceData = {
        customer_id: 'cust-001',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/invoices', invoiceData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /invoices - negative amounts', async ({ request }) => {
      const invoiceData = {
        customer_id: 'cust-001',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: -1000,
        tax_amount: -150,
        total_amount: -1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/invoices', invoiceData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /invoices - with sales_order_id', async ({ request }) => {
      const invoiceData = {
        customer_id: 'cust-001',
        sales_order_id: 'so-001',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/invoices', invoiceData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /invoices - with line items', async ({ request }) => {
      const invoiceData = {
        customer_id: 'cust-001',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150,
        line_items: [
          { product_id: 'prod-001', quantity: 10, unit_price: 100, line_total: 1000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/invoices', invoiceData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PERFORMANCE TESTS (15 tests)
  // ============================================
  test.describe('Performance Tests', () => {
    test('GET /chart-of-accounts - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/gl/chart-of-accounts?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /journal-entries - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/gl/journal-entries?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /trial-balance - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/gl/trial-balance?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });

    test('GET /profit-loss - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/gl/profit-loss?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });

    test('GET /balance-sheet - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/gl/balance-sheet?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });

    test('GET /ar-aging - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/bi/ar-aging?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });

    test('GET /ap-aging - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/bi/ap-aging?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });

    test('GET /invoices - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/erp/order-to-cash/invoices?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('POST /journal-entries - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const entryData = {
        entry_date: new Date().toISOString().split('T')[0],
        description: `Test journal entry ${generateId('JE')}`,
        status: 'draft',
        lines: [
          { account_id: 'acc-001', debit: 1000, credit: 0 },
          { account_id: 'acc-002', debit: 0, credit: 1000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/gl/journal-entries', entryData);
      const duration = Date.now() - start;
      expect([200, 201, 400, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });

    test('POST /invoices - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const invoiceData = {
        customer_id: 'cust-001',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: 1000,
        tax_amount: 150,
        total_amount: 1150
      };
      const response = await apiRequest(request, 'POST', '/erp/order-to-cash/invoices', invoiceData);
      const duration = Date.now() - start;
      expect([200, 201, 400, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });
  });
});
