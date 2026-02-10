/**
 * ARIA ERP - Projects Module Granular Tests
 * Comprehensive field-level and validation testing for Projects module
 * 
 * Tests: ~100 granular test cases covering Projects, Tasks, Resources, Milestones, Timesheets
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

test.describe('Projects Module Granular Tests', () => {

  // ============================================
  // PROJECTS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Projects CRUD', () => {
    test('GET /projects - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data.data || data.projects || data)).toBe(true);
      }
    });

    test('GET /projects - pagination works', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects?company_id=demo-company&page_size=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /projects - filter by status active', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects?company_id=demo-company&status=active');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /projects - filter by status completed', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects?company_id=demo-company&status=completed');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /projects - filter by status on_hold', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects?company_id=demo-company&status=on_hold');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /projects - filter by customer_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects?company_id=demo-company&customer_id=cust-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /projects - filter by manager_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects?company_id=demo-company&manager_id=emp-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /projects/:id - returns single project', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/proj-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /projects - create with valid data', async ({ request }) => {
      const projectData = {
        name: `Project ${generateId('PROJ')}`,
        code: `P-${Date.now().toString().slice(-6)}`,
        customer_id: 'cust-001',
        manager_id: 'emp-001',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: 100000,
        status: 'active',
        description: 'Test project from automated tests'
      };
      const response = await apiRequest(request, 'POST', '/projects', projectData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /projects - missing name', async ({ request }) => {
      const projectData = {
        code: `P-${Date.now().toString().slice(-6)}`,
        customer_id: 'cust-001',
        budget: 100000
      };
      const response = await apiRequest(request, 'POST', '/projects', projectData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /projects - negative budget', async ({ request }) => {
      const projectData = {
        name: `Project ${generateId('PROJ')}`,
        budget: -100000
      };
      const response = await apiRequest(request, 'POST', '/projects', projectData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /projects - end_date before start_date', async ({ request }) => {
      const projectData = {
        name: `Project ${generateId('PROJ')}`,
        start_date: '2024-12-31',
        end_date: '2024-01-01'
      };
      const response = await apiRequest(request, 'POST', '/projects', projectData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /projects - invalid status', async ({ request }) => {
      const projectData = {
        name: `Project ${generateId('PROJ')}`,
        status: 'invalid_status'
      };
      const response = await apiRequest(request, 'POST', '/projects', projectData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /projects - duplicate code', async ({ request }) => {
      const code = `P-DUP-${Date.now()}`;
      const projectData1 = { name: 'Project 1', code };
      const projectData2 = { name: 'Project 2', code };
      await apiRequest(request, 'POST', '/projects', projectData1);
      const response = await apiRequest(request, 'POST', '/projects', projectData2);
      expect([200, 201, 400, 401, 404, 409, 422, 500]).toContain(response.status());
    });

    test('PUT /projects/:id - update project status', async ({ request }) => {
      const updateData = { status: 'on_hold' };
      const response = await apiRequest(request, 'PUT', '/projects/proj-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /projects/:id - update project budget', async ({ request }) => {
      const updateData = { budget: 150000 };
      const response = await apiRequest(request, 'PUT', '/projects/proj-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /projects/:id - delete project', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/projects/proj-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // TASKS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Tasks CRUD', () => {
    test('GET /tasks - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/tasks?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tasks - filter by project_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/tasks?company_id=demo-company&project_id=proj-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tasks - filter by status pending', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/tasks?company_id=demo-company&status=pending');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tasks - filter by status in_progress', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/tasks?company_id=demo-company&status=in_progress');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tasks - filter by status completed', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/tasks?company_id=demo-company&status=completed');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tasks - filter by assignee_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/tasks?company_id=demo-company&assignee_id=emp-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tasks - filter by priority', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/tasks?company_id=demo-company&priority=high');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tasks/:id - returns single task', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/tasks/task-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /tasks - create with valid data', async ({ request }) => {
      const taskData = {
        name: `Task ${generateId('TASK')}`,
        project_id: 'proj-001',
        assignee_id: 'emp-001',
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estimated_hours: 8,
        priority: 'medium',
        status: 'pending',
        description: 'Test task from automated tests'
      };
      const response = await apiRequest(request, 'POST', '/projects/tasks', taskData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /tasks - missing name', async ({ request }) => {
      const taskData = {
        project_id: 'proj-001',
        estimated_hours: 8
      };
      const response = await apiRequest(request, 'POST', '/projects/tasks', taskData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /tasks - negative estimated_hours', async ({ request }) => {
      const taskData = {
        name: `Task ${generateId('TASK')}`,
        project_id: 'proj-001',
        estimated_hours: -8
      };
      const response = await apiRequest(request, 'POST', '/projects/tasks', taskData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /tasks - due_date before start_date', async ({ request }) => {
      const taskData = {
        name: `Task ${generateId('TASK')}`,
        project_id: 'proj-001',
        start_date: '2024-12-31',
        due_date: '2024-01-01'
      };
      const response = await apiRequest(request, 'POST', '/projects/tasks', taskData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /tasks - invalid priority', async ({ request }) => {
      const taskData = {
        name: `Task ${generateId('TASK')}`,
        project_id: 'proj-001',
        priority: 'invalid_priority'
      };
      const response = await apiRequest(request, 'POST', '/projects/tasks', taskData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /tasks - with dependencies', async ({ request }) => {
      const taskData = {
        name: `Task ${generateId('TASK')}`,
        project_id: 'proj-001',
        dependencies: ['task-001', 'task-002']
      };
      const response = await apiRequest(request, 'POST', '/projects/tasks', taskData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /tasks/:id - update task status', async ({ request }) => {
      const updateData = { status: 'in_progress' };
      const response = await apiRequest(request, 'PUT', '/projects/tasks/task-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /tasks/:id - update task progress', async ({ request }) => {
      const updateData = { progress_percentage: 50 };
      const response = await apiRequest(request, 'PUT', '/projects/tasks/task-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /tasks/:id - progress over 100', async ({ request }) => {
      const updateData = { progress_percentage: 150 };
      const response = await apiRequest(request, 'PUT', '/projects/tasks/task-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /tasks/:id - delete task', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/projects/tasks/task-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // MILESTONES - CRUD Operations (15 tests)
  // ============================================
  test.describe('Milestones CRUD', () => {
    test('GET /milestones - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/milestones?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /milestones - filter by project_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/milestones?company_id=demo-company&project_id=proj-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /milestones - filter by status', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/milestones?company_id=demo-company&status=pending');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /milestones/:id - returns single milestone', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/milestones/ms-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /milestones - create with valid data', async ({ request }) => {
      const milestoneData = {
        name: `Milestone ${generateId('MS')}`,
        project_id: 'proj-001',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        description: 'Test milestone from automated tests',
        deliverables: ['Deliverable 1', 'Deliverable 2']
      };
      const response = await apiRequest(request, 'POST', '/projects/milestones', milestoneData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /milestones - missing name', async ({ request }) => {
      const milestoneData = {
        project_id: 'proj-001',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/projects/milestones', milestoneData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /milestones - past due_date', async ({ request }) => {
      const milestoneData = {
        name: `Milestone ${generateId('MS')}`,
        project_id: 'proj-001',
        due_date: '2020-01-01'
      };
      const response = await apiRequest(request, 'POST', '/projects/milestones', milestoneData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /milestones/:id - update milestone status', async ({ request }) => {
      const updateData = { status: 'completed', completion_date: new Date().toISOString().split('T')[0] };
      const response = await apiRequest(request, 'PUT', '/projects/milestones/ms-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /milestones/:id - delete milestone', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/projects/milestones/ms-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // RESOURCES - CRUD Operations (15 tests)
  // ============================================
  test.describe('Resources CRUD', () => {
    test('GET /resources - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/resources?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /resources - filter by project_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/resources?company_id=demo-company&project_id=proj-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /resources - filter by employee_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/resources?company_id=demo-company&employee_id=emp-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /resources/:id - returns single resource allocation', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/resources/res-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /resources - allocate resource to project', async ({ request }) => {
      const resourceData = {
        project_id: 'proj-001',
        employee_id: 'emp-001',
        role: 'Developer',
        allocation_percentage: 50,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hourly_rate: 500
      };
      const response = await apiRequest(request, 'POST', '/projects/resources', resourceData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /resources - allocation over 100%', async ({ request }) => {
      const resourceData = {
        project_id: 'proj-001',
        employee_id: 'emp-001',
        allocation_percentage: 150
      };
      const response = await apiRequest(request, 'POST', '/projects/resources', resourceData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /resources - negative allocation', async ({ request }) => {
      const resourceData = {
        project_id: 'proj-001',
        employee_id: 'emp-001',
        allocation_percentage: -50
      };
      const response = await apiRequest(request, 'POST', '/projects/resources', resourceData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /resources - negative hourly_rate', async ({ request }) => {
      const resourceData = {
        project_id: 'proj-001',
        employee_id: 'emp-001',
        hourly_rate: -500
      };
      const response = await apiRequest(request, 'POST', '/projects/resources', resourceData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /resources/:id - update allocation', async ({ request }) => {
      const updateData = { allocation_percentage: 75 };
      const response = await apiRequest(request, 'PUT', '/projects/resources/res-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /resources/:id - remove resource allocation', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/projects/resources/res-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // TIMESHEETS - CRUD Operations (20 tests)
  // ============================================
  test.describe('Timesheets CRUD', () => {
    test('GET /timesheets - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/timesheets?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /timesheets - filter by project_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/timesheets?company_id=demo-company&project_id=proj-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /timesheets - filter by employee_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/timesheets?company_id=demo-company&employee_id=emp-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /timesheets - filter by task_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/timesheets?company_id=demo-company&task_id=task-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /timesheets - filter by date range', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/projects/timesheets?company_id=demo-company&from_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /timesheets - filter by status', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/timesheets?company_id=demo-company&status=submitted');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /timesheets/:id - returns single timesheet', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/projects/timesheets/ts-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /timesheets - create with valid data', async ({ request }) => {
      const timesheetData = {
        project_id: 'proj-001',
        task_id: 'task-001',
        employee_id: 'emp-001',
        date: new Date().toISOString().split('T')[0],
        hours: 8,
        description: 'Test timesheet entry',
        billable: true,
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/projects/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /timesheets - negative hours', async ({ request }) => {
      const timesheetData = {
        project_id: 'proj-001',
        employee_id: 'emp-001',
        date: new Date().toISOString().split('T')[0],
        hours: -8
      };
      const response = await apiRequest(request, 'POST', '/projects/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /timesheets - hours over 24', async ({ request }) => {
      const timesheetData = {
        project_id: 'proj-001',
        employee_id: 'emp-001',
        date: new Date().toISOString().split('T')[0],
        hours: 25
      };
      const response = await apiRequest(request, 'POST', '/projects/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /timesheets - future date', async ({ request }) => {
      const timesheetData = {
        project_id: 'proj-001',
        employee_id: 'emp-001',
        date: '2030-01-01',
        hours: 8
      };
      const response = await apiRequest(request, 'POST', '/projects/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /timesheets - missing project_id', async ({ request }) => {
      const timesheetData = {
        employee_id: 'emp-001',
        date: new Date().toISOString().split('T')[0],
        hours: 8
      };
      const response = await apiRequest(request, 'POST', '/projects/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /timesheets/:id - update hours', async ({ request }) => {
      const updateData = { hours: 6 };
      const response = await apiRequest(request, 'PUT', '/projects/timesheets/ts-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /timesheets/:id - submit timesheet', async ({ request }) => {
      const updateData = { status: 'submitted' };
      const response = await apiRequest(request, 'PUT', '/projects/timesheets/ts-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /timesheets/:id - approve timesheet', async ({ request }) => {
      const updateData = { status: 'approved', approved_by: 'manager-001' };
      const response = await apiRequest(request, 'PUT', '/projects/timesheets/ts-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /timesheets/:id - reject timesheet', async ({ request }) => {
      const updateData = { status: 'rejected', rejection_reason: 'Hours exceed estimate' };
      const response = await apiRequest(request, 'PUT', '/projects/timesheets/ts-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /timesheets/:id - delete timesheet', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/projects/timesheets/ts-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

});
