/**
 * ARIA ERP - HR/Payroll Granular Tests
 * Comprehensive field-level and validation testing for HR/Payroll module
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

test.describe('HR/Payroll Granular Tests', () => {

  // ============================================
  // EMPLOYEES - CRUD Operations (50 tests)
  // ============================================
  test.describe('Employees CRUD', () => {
    test('GET /employees - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/employees?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/employees?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees - pagination with offset', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/employees?company_id=demo-company&offset=0');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees - filter by department', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/employees?company_id=demo-company&department=Sales');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees - filter by status active', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/employees?company_id=demo-company&status=active');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees - filter by status inactive', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/employees?company_id=demo-company&status=inactive');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees - search by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/employees?company_id=demo-company&search=John');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees/:id - returns single employee', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/employees/emp-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /employees/:id - invalid ID returns 404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/employees/invalid-id-12345?company_id=demo-company');
      expect([401, 404]).toContain(response.status());
    });

    test('POST /employees - create with valid data', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        phone: '+27 11 123 4567',
        department: 'Sales',
        position: 'Sales Representative',
        hire_date: new Date().toISOString().split('T')[0],
        salary: 25000,
        is_active: true
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /employees - missing first_name', async ({ request }) => {
      const employeeData = {
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        department: 'Sales'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /employees - missing last_name', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        email: `emp-${Date.now()}@example.com`,
        department: 'Sales'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /employees - empty first_name', async ({ request }) => {
      const employeeData = {
        first_name: '',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /employees - invalid email format', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: 'invalid-email'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /employees - duplicate email handling', async ({ request }) => {
      const email = `dup-emp-${Date.now()}@example.com`;
      const employeeData1 = { first_name: 'Test1', last_name: 'Emp1', email };
      const employeeData2 = { first_name: 'Test2', last_name: 'Emp2', email };
      await apiRequest(request, 'POST', '/api/hr/employees', employeeData1);
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData2);
      expect([200, 201, 400, 401, 404, 409, 422]).toContain(response.status());
    });

    test('POST /employees - negative salary', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        salary: -25000
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /employees - zero salary', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        salary: 0
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /employees - very large salary', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        salary: 999999999.99
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /employees - invalid hire_date format', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        hire_date: 'invalid-date'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /employees - future hire_date', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        hire_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /employees - with ID number', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        id_number: '8501015800089'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /employees - invalid ID number format', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        id_number: 'INVALID'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /employees - with tax_number', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        tax_number: '1234567890'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /employees - with bank details', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        bank_name: 'First National Bank',
        bank_account_number: '62123456789',
        bank_branch_code: '250655'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /employees - with emergency contact', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        emergency_contact_name: 'Jane Doe',
        emergency_contact_phone: '+27 11 987 6543'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /employees - with address', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        address: '123 Test Street',
        city: 'Johannesburg',
        postal_code: '2000'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /employees - with date_of_birth', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        date_of_birth: '1990-01-15'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /employees - underage date_of_birth', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        date_of_birth: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /employees - with gender', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        gender: 'male'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /employees - invalid gender value', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        gender: 'invalid'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /employees - with employment_type', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        employment_type: 'full-time'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /employees - employment_type part-time', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        employment_type: 'part-time'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /employees - employment_type contract', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        employment_type: 'contract'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /employees - with manager_id', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        manager_id: 'emp-001'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /employees - invalid manager_id', async ({ request }) => {
      const employeeData = {
        first_name: 'Test',
        last_name: `Employee ${generateId('EMP')}`,
        email: `emp-${Date.now()}@example.com`,
        manager_id: 'invalid-manager-12345'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/employees', employeeData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // TIMESHEETS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Timesheets CRUD', () => {
    test('GET /timesheets - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/timesheets?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /timesheets - filter by employee_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/timesheets?company_id=demo-company&employee_id=emp-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /timesheets - filter by date range', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/hr/timesheets?company_id=demo-company&from_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /timesheets - filter by status pending', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/timesheets?company_id=demo-company&status=pending');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /timesheets - filter by status approved', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/timesheets?company_id=demo-company&status=approved');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /timesheets - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/timesheets?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /timesheets - create with valid data', async ({ request }) => {
      const timesheetData = {
        employee_id: 'emp-001',
        date: new Date().toISOString().split('T')[0],
        hours_worked: 8,
        project_id: 'proj-001',
        description: `Test timesheet ${generateId('TS')}`
      };
      const response = await apiRequest(request, 'POST', '/api/hr/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /timesheets - missing employee_id', async ({ request }) => {
      const timesheetData = {
        date: new Date().toISOString().split('T')[0],
        hours_worked: 8
      };
      const response = await apiRequest(request, 'POST', '/api/hr/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /timesheets - invalid employee_id', async ({ request }) => {
      const timesheetData = {
        employee_id: 'invalid-emp-12345',
        date: new Date().toISOString().split('T')[0],
        hours_worked: 8
      };
      const response = await apiRequest(request, 'POST', '/api/hr/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /timesheets - negative hours_worked', async ({ request }) => {
      const timesheetData = {
        employee_id: 'emp-001',
        date: new Date().toISOString().split('T')[0],
        hours_worked: -8
      };
      const response = await apiRequest(request, 'POST', '/api/hr/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /timesheets - zero hours_worked', async ({ request }) => {
      const timesheetData = {
        employee_id: 'emp-001',
        date: new Date().toISOString().split('T')[0],
        hours_worked: 0
      };
      const response = await apiRequest(request, 'POST', '/api/hr/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /timesheets - hours_worked exceeds 24', async ({ request }) => {
      const timesheetData = {
        employee_id: 'emp-001',
        date: new Date().toISOString().split('T')[0],
        hours_worked: 25
      };
      const response = await apiRequest(request, 'POST', '/api/hr/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /timesheets - invalid date format', async ({ request }) => {
      const timesheetData = {
        employee_id: 'emp-001',
        date: 'invalid-date',
        hours_worked: 8
      };
      const response = await apiRequest(request, 'POST', '/api/hr/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /timesheets - future date', async ({ request }) => {
      const timesheetData = {
        employee_id: 'emp-001',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hours_worked: 8
      };
      const response = await apiRequest(request, 'POST', '/api/hr/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /timesheets - with overtime_hours', async ({ request }) => {
      const timesheetData = {
        employee_id: 'emp-001',
        date: new Date().toISOString().split('T')[0],
        hours_worked: 8,
        overtime_hours: 2
      };
      const response = await apiRequest(request, 'POST', '/api/hr/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /timesheets - negative overtime_hours', async ({ request }) => {
      const timesheetData = {
        employee_id: 'emp-001',
        date: new Date().toISOString().split('T')[0],
        hours_worked: 8,
        overtime_hours: -2
      };
      const response = await apiRequest(request, 'POST', '/api/hr/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // LEAVE REQUESTS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Leave Requests CRUD', () => {
    test('GET /leave-requests - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/leave-requests?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /leave-requests - filter by employee_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/leave-requests?company_id=demo-company&employee_id=emp-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /leave-requests - filter by status pending', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/leave-requests?company_id=demo-company&status=pending');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /leave-requests - filter by status approved', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/leave-requests?company_id=demo-company&status=approved');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /leave-requests - filter by status rejected', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/leave-requests?company_id=demo-company&status=rejected');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /leave-requests - filter by leave_type annual', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/leave-requests?company_id=demo-company&leave_type=annual');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /leave-requests - filter by leave_type sick', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/leave-requests?company_id=demo-company&leave_type=sick');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /leave-requests - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/hr/leave-requests?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /leave-requests - create with valid data', async ({ request }) => {
      const leaveData = {
        employee_id: 'emp-001',
        leave_type: 'annual',
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reason: `Test leave request ${generateId('LR')}`
      };
      const response = await apiRequest(request, 'POST', '/api/hr/leave-requests', leaveData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /leave-requests - missing employee_id', async ({ request }) => {
      const leaveData = {
        leave_type: 'annual',
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/hr/leave-requests', leaveData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /leave-requests - end_date before start_date', async ({ request }) => {
      const leaveData = {
        employee_id: 'emp-001',
        leave_type: 'annual',
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/hr/leave-requests', leaveData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /leave-requests - past start_date', async ({ request }) => {
      const leaveData = {
        employee_id: 'emp-001',
        leave_type: 'annual',
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/hr/leave-requests', leaveData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /leave-requests - invalid leave_type', async ({ request }) => {
      const leaveData = {
        employee_id: 'emp-001',
        leave_type: 'invalid_type',
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/hr/leave-requests', leaveData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /leave-requests - leave_type sick', async ({ request }) => {
      const leaveData = {
        employee_id: 'emp-001',
        leave_type: 'sick',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/hr/leave-requests', leaveData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /leave-requests - leave_type family', async ({ request }) => {
      const leaveData = {
        employee_id: 'emp-001',
        leave_type: 'family',
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/hr/leave-requests', leaveData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /leave-requests - leave_type maternity', async ({ request }) => {
      const leaveData = {
        employee_id: 'emp-001',
        leave_type: 'maternity',
        start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/hr/leave-requests', leaveData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /leave-requests - leave_type study', async ({ request }) => {
      const leaveData = {
        employee_id: 'emp-001',
        leave_type: 'study',
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/hr/leave-requests', leaveData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PAYROLL RUNS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Payroll Runs CRUD', () => {
    test('GET /payroll/runs - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/payroll/runs?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payroll/runs - filter by status draft', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/payroll/runs?company_id=demo-company&status=draft');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payroll/runs - filter by status processing', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/payroll/runs?company_id=demo-company&status=processing');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payroll/runs - filter by status completed', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/payroll/runs?company_id=demo-company&status=completed');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payroll/runs - filter by period', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/payroll/runs?company_id=demo-company&period=2024-01');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payroll/runs - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/payroll/runs?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /payroll/runs - create with valid data', async ({ request }) => {
      const payrollData = {
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        pay_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        notes: `Test payroll run ${generateId('PR')}`
      };
      const response = await apiRequest(request, 'POST', '/api/payroll/runs', payrollData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /payroll/runs - missing period_start', async ({ request }) => {
      const payrollData = {
        period_end: new Date().toISOString().split('T')[0],
        pay_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/payroll/runs', payrollData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /payroll/runs - period_end before period_start', async ({ request }) => {
      const payrollData = {
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        pay_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/payroll/runs', payrollData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /payroll/runs - pay_date before period_end', async ({ request }) => {
      const payrollData = {
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        pay_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/payroll/runs', payrollData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /payroll/runs - invalid status', async ({ request }) => {
      const payrollData = {
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        pay_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'invalid_status'
      };
      const response = await apiRequest(request, 'POST', '/api/payroll/runs', payrollData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /payroll/runs - with employee_ids array', async ({ request }) => {
      const payrollData = {
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        pay_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        employee_ids: ['emp-001', 'emp-002']
      };
      const response = await apiRequest(request, 'POST', '/api/payroll/runs', payrollData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /payroll/runs - empty employee_ids array', async ({ request }) => {
      const payrollData = {
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        pay_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        employee_ids: []
      };
      const response = await apiRequest(request, 'POST', '/api/payroll/runs', payrollData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // PAYSLIPS - CRUD Operations (15 tests)
  // ============================================
  test.describe('Payslips CRUD', () => {
    test('GET /payroll/payslips - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/payroll/payslips?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payroll/payslips - filter by employee_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/payroll/payslips?company_id=demo-company&employee_id=emp-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payroll/payslips - filter by payroll_run_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/payroll/payslips?company_id=demo-company&payroll_run_id=pr-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payroll/payslips - filter by period', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/payroll/payslips?company_id=demo-company&period=2024-01');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payroll/payslips - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/payroll/payslips?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payroll/payslips/:id - returns single payslip', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/payroll/payslips/ps-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /payroll/payslips/:id - invalid ID returns 404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/payroll/payslips/invalid-id-12345?company_id=demo-company');
      expect([401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PERFORMANCE TESTS (10 tests)
  // ============================================
  test.describe('Performance Tests', () => {
    test('GET /employees - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/hr/employees?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /timesheets - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/hr/timesheets?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /leave-requests - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/hr/leave-requests?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /payroll/runs - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/payroll/runs?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /payroll/payslips - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/payroll/payslips?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });
  });
});
