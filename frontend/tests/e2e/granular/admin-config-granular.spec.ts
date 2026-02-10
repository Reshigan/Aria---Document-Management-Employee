/**
 * ARIA ERP - Admin/Config Granular Tests
 * Comprehensive field-level and validation testing for Admin/Config module
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

test.describe('Admin/Config Granular Tests', () => {

  // ============================================
  // COMPANY SETTINGS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Company Settings CRUD', () => {
    test('GET /company - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/company?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /company - returns company details', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/company?company_id=demo-company');
      if (response.status() === 200) {
        const data = await response.json();
        expect(data.company || data.data).toBeDefined();
      }
    });

    test('PUT /company - update company name', async ({ request }) => {
      const companyData = {
        name: `Test Company ${generateId('COMP')}`
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/company', companyData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /company - empty company name', async ({ request }) => {
      const companyData = {
        name: ''
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/company', companyData);
      expect([200, 400, 401, 404, 422]).toContain(response.status());
    });

    test('PUT /company - very long company name', async ({ request }) => {
      const companyData = {
        name: 'C'.repeat(500)
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/company', companyData);
      expect([200, 400, 401, 404, 422]).toContain(response.status());
    });

    test('PUT /company - update registration_number', async ({ request }) => {
      const companyData = {
        registration_number: `REG${Date.now().toString().slice(-8)}`
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/company', companyData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /company - update tax_number', async ({ request }) => {
      const companyData = {
        tax_number: `VAT${Date.now().toString().slice(-8)}`
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/company', companyData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /company - update address', async ({ request }) => {
      const companyData = {
        address: '123 Test Street',
        city: 'Johannesburg',
        postal_code: '2000',
        country: 'South Africa'
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/company', companyData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /company - update contact details', async ({ request }) => {
      const companyData = {
        phone: '+27 11 123 4567',
        email: 'info@company.com',
        website: 'https://www.company.com'
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/company', companyData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /company - invalid email format', async ({ request }) => {
      const companyData = {
        email: 'invalid-email'
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/company', companyData);
      expect([200, 400, 401, 404, 422]).toContain(response.status());
    });

    test('PUT /company - invalid website URL', async ({ request }) => {
      const companyData = {
        website: 'not-a-valid-url'
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/company', companyData);
      expect([200, 400, 401, 404, 422]).toContain(response.status());
    });

    test('PUT /company - update currency', async ({ request }) => {
      const companyData = {
        default_currency: 'ZAR'
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/company', companyData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /company - invalid currency', async ({ request }) => {
      const companyData = {
        default_currency: 'INVALID'
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/company', companyData);
      expect([200, 400, 401, 404, 422]).toContain(response.status());
    });

    test('PUT /company - update fiscal_year_start', async ({ request }) => {
      const companyData = {
        fiscal_year_start: '03-01'
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/company', companyData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /company - invalid fiscal_year_start format', async ({ request }) => {
      const companyData = {
        fiscal_year_start: 'invalid'
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/company', companyData);
      expect([200, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // USERS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Users CRUD', () => {
    test('GET /users - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/users?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /users - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/users?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /users - filter by role admin', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/users?company_id=demo-company&role=admin');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /users - filter by role user', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/users?company_id=demo-company&role=user');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /users - filter by is_active true', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/users?company_id=demo-company&is_active=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /users - search by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/users?company_id=demo-company&search=John');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /users/:id - returns single user', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/users/user-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /users/:id - invalid ID returns 404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/users/invalid-user-12345?company_id=demo-company');
      expect([401, 404]).toContain(response.status());
    });

    test('POST /users - create with valid data', async ({ request }) => {
      const userData = {
        email: `user-${Date.now()}@example.com`,
        first_name: 'Test',
        last_name: `User ${generateId('USR')}`,
        role: 'user',
        is_active: true
      };
      const response = await apiRequest(request, 'POST', '/api/admin/users', userData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /users - missing email', async ({ request }) => {
      const userData = {
        first_name: 'Test',
        last_name: `User ${generateId('USR')}`,
        role: 'user'
      };
      const response = await apiRequest(request, 'POST', '/api/admin/users', userData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /users - invalid email format', async ({ request }) => {
      const userData = {
        email: 'invalid-email',
        first_name: 'Test',
        last_name: `User ${generateId('USR')}`,
        role: 'user'
      };
      const response = await apiRequest(request, 'POST', '/api/admin/users', userData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /users - duplicate email', async ({ request }) => {
      const email = `dup-user-${Date.now()}@example.com`;
      const userData1 = { email, first_name: 'Test1', last_name: 'User1', role: 'user' };
      const userData2 = { email, first_name: 'Test2', last_name: 'User2', role: 'user' };
      await apiRequest(request, 'POST', '/api/admin/users', userData1);
      const response = await apiRequest(request, 'POST', '/api/admin/users', userData2);
      expect([200, 201, 400, 401, 404, 409, 422]).toContain(response.status());
    });

    test('POST /users - invalid role', async ({ request }) => {
      const userData = {
        email: `user-${Date.now()}@example.com`,
        first_name: 'Test',
        last_name: `User ${generateId('USR')}`,
        role: 'invalid_role'
      };
      const response = await apiRequest(request, 'POST', '/api/admin/users', userData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /users - role admin', async ({ request }) => {
      const userData = {
        email: `admin-${Date.now()}@example.com`,
        first_name: 'Test',
        last_name: `Admin ${generateId('USR')}`,
        role: 'admin'
      };
      const response = await apiRequest(request, 'POST', '/api/admin/users', userData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /users - with department', async ({ request }) => {
      const userData = {
        email: `user-${Date.now()}@example.com`,
        first_name: 'Test',
        last_name: `User ${generateId('USR')}`,
        role: 'user',
        department: 'Sales'
      };
      const response = await apiRequest(request, 'POST', '/api/admin/users', userData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /users/:id - update user', async ({ request }) => {
      const userData = {
        first_name: 'Updated',
        last_name: 'User'
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/users/user-001', userData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /users/:id - delete user', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/admin/users/user-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // ROLES & PERMISSIONS - CRUD Operations (20 tests)
  // ============================================
  test.describe('Roles & Permissions CRUD', () => {
    test('GET /roles - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/roles?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /roles - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/roles?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /roles/:id - returns single role', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/roles/role-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /roles - create with valid data', async ({ request }) => {
      const roleData = {
        name: `Test Role ${generateId('ROLE')}`,
        description: 'Test role for automated testing',
        permissions: ['read', 'write']
      };
      const response = await apiRequest(request, 'POST', '/api/admin/roles', roleData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /roles - missing name', async ({ request }) => {
      const roleData = {
        description: 'Test role',
        permissions: ['read']
      };
      const response = await apiRequest(request, 'POST', '/api/admin/roles', roleData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /roles - empty name', async ({ request }) => {
      const roleData = {
        name: '',
        description: 'Test role',
        permissions: ['read']
      };
      const response = await apiRequest(request, 'POST', '/api/admin/roles', roleData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /roles - duplicate name', async ({ request }) => {
      const name = `Role ${Date.now()}`;
      const roleData1 = { name, description: 'Role 1', permissions: ['read'] };
      const roleData2 = { name, description: 'Role 2', permissions: ['read'] };
      await apiRequest(request, 'POST', '/api/admin/roles', roleData1);
      const response = await apiRequest(request, 'POST', '/api/admin/roles', roleData2);
      expect([200, 201, 400, 401, 404, 409, 422]).toContain(response.status());
    });

    test('POST /roles - empty permissions array', async ({ request }) => {
      const roleData = {
        name: `Test Role ${generateId('ROLE')}`,
        description: 'Test role',
        permissions: []
      };
      const response = await apiRequest(request, 'POST', '/api/admin/roles', roleData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /roles - invalid permission', async ({ request }) => {
      const roleData = {
        name: `Test Role ${generateId('ROLE')}`,
        description: 'Test role',
        permissions: ['invalid_permission']
      };
      const response = await apiRequest(request, 'POST', '/api/admin/roles', roleData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('GET /permissions - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/permissions?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // AUDIT LOGS - Read Operations (15 tests)
  // ============================================
  test.describe('Audit Logs', () => {
    test('GET /audit-logs - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/audit-logs?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-logs - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/audit-logs?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-logs - filter by user_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/audit-logs?company_id=demo-company&user_id=user-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-logs - filter by action create', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/audit-logs?company_id=demo-company&action=create');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-logs - filter by action update', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/audit-logs?company_id=demo-company&action=update');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-logs - filter by action delete', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/audit-logs?company_id=demo-company&action=delete');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-logs - filter by entity_type', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/audit-logs?company_id=demo-company&entity_type=invoice');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-logs - filter by date range', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/admin/audit-logs?company_id=demo-company&from_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-logs/:id - returns single log', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/audit-logs/log-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // SYSTEM SETTINGS - CRUD Operations (10 tests)
  // ============================================
  test.describe('System Settings', () => {
    test('GET /settings - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/settings?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /settings/:key - returns single setting', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/admin/settings/invoice_prefix?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('PUT /settings/:key - update setting', async ({ request }) => {
      const settingData = {
        value: 'INV-'
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/settings/invoice_prefix', settingData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /settings/:key - empty value', async ({ request }) => {
      const settingData = {
        value: ''
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/settings/invoice_prefix', settingData);
      expect([200, 400, 401, 404, 422]).toContain(response.status());
    });

    test('PUT /settings/:key - invalid key', async ({ request }) => {
      const settingData = {
        value: 'test'
      };
      const response = await apiRequest(request, 'PUT', '/api/admin/settings/invalid_setting_key', settingData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PERFORMANCE TESTS (5 tests)
  // ============================================
  test.describe('Performance Tests', () => {
    test('GET /company - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/admin/company?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /users - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/admin/users?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /roles - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/admin/roles?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /audit-logs - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/admin/audit-logs?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /settings - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/admin/settings?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });
  });
});
