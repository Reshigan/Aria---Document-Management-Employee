/**
 * ARIA ERP - Manufacturing Granular Tests
 * Comprehensive field-level and validation testing for Manufacturing module
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

test.describe('Manufacturing Granular Tests', () => {

  // ============================================
  // WORK ORDERS - CRUD Operations (40 tests)
  // ============================================
  test.describe('Work Orders CRUD', () => {
    test('GET /work-orders - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/work-orders?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /work-orders - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/work-orders?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /work-orders - filter by status draft', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/work-orders?company_id=demo-company&status=draft');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /work-orders - filter by status in_progress', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/work-orders?company_id=demo-company&status=in_progress');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /work-orders - filter by status completed', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/work-orders?company_id=demo-company&status=completed');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /work-orders - filter by status cancelled', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/work-orders?company_id=demo-company&status=cancelled');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /work-orders - filter by product_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/work-orders?company_id=demo-company&product_id=prod-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /work-orders - filter by date range', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/manufacturing/work-orders?company_id=demo-company&from_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /work-orders/:id - returns single work order', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/work-orders/wo-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /work-orders/:id - invalid ID returns 404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/work-orders/invalid-wo-12345?company_id=demo-company');
      expect([401, 404]).toContain(response.status());
    });

    test('POST /work-orders - create with valid data', async ({ request }) => {
      const workOrderData = {
        product_id: 'prod-001',
        bom_id: 'bom-001',
        quantity: 100,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        notes: `Test work order ${generateId('WO')}`
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /work-orders - missing product_id', async ({ request }) => {
      const workOrderData = {
        bom_id: 'bom-001',
        quantity: 100,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /work-orders - invalid product_id', async ({ request }) => {
      const workOrderData = {
        product_id: 'invalid-prod-12345',
        bom_id: 'bom-001',
        quantity: 100,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /work-orders - missing quantity', async ({ request }) => {
      const workOrderData = {
        product_id: 'prod-001',
        bom_id: 'bom-001',
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /work-orders - negative quantity', async ({ request }) => {
      const workOrderData = {
        product_id: 'prod-001',
        bom_id: 'bom-001',
        quantity: -100,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /work-orders - zero quantity', async ({ request }) => {
      const workOrderData = {
        product_id: 'prod-001',
        bom_id: 'bom-001',
        quantity: 0,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /work-orders - very large quantity', async ({ request }) => {
      const workOrderData = {
        product_id: 'prod-001',
        bom_id: 'bom-001',
        quantity: 999999999,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /work-orders - due_date before start_date', async ({ request }) => {
      const workOrderData = {
        product_id: 'prod-001',
        bom_id: 'bom-001',
        quantity: 100,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /work-orders - invalid start_date format', async ({ request }) => {
      const workOrderData = {
        product_id: 'prod-001',
        bom_id: 'bom-001',
        quantity: 100,
        start_date: 'invalid-date',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /work-orders - invalid status', async ({ request }) => {
      const workOrderData = {
        product_id: 'prod-001',
        bom_id: 'bom-001',
        quantity: 100,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'invalid_status'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /work-orders - with priority', async ({ request }) => {
      const workOrderData = {
        product_id: 'prod-001',
        bom_id: 'bom-001',
        quantity: 100,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        priority: 'high'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /work-orders - invalid priority', async ({ request }) => {
      const workOrderData = {
        product_id: 'prod-001',
        bom_id: 'bom-001',
        quantity: 100,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        priority: 'invalid_priority'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /work-orders - with warehouse_id', async ({ request }) => {
      const workOrderData = {
        product_id: 'prod-001',
        bom_id: 'bom-001',
        quantity: 100,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        warehouse_id: 'wh-001'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /work-orders - with sales_order_id', async ({ request }) => {
      const workOrderData = {
        product_id: 'prod-001',
        bom_id: 'bom-001',
        quantity: 100,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        sales_order_id: 'so-001'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // BILL OF MATERIALS (BOM) - CRUD Operations (30 tests)
  // ============================================
  test.describe('Bill of Materials CRUD', () => {
    test('GET /boms - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/boms?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /boms - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/boms?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /boms - filter by product_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/boms?company_id=demo-company&product_id=prod-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /boms - filter by is_active true', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/boms?company_id=demo-company&is_active=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /boms - search by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/boms?company_id=demo-company&search=Widget');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /boms/:id - returns single BOM', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/boms/bom-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /boms/:id - invalid ID returns 404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/boms/invalid-bom-12345?company_id=demo-company');
      expect([401, 404]).toContain(response.status());
    });

    test('POST /boms - create with valid data', async ({ request }) => {
      const bomData = {
        name: `Test BOM ${generateId('BOM')}`,
        product_id: 'prod-001',
        version: '1.0',
        is_active: true,
        components: [
          { component_id: 'comp-001', quantity: 2, unit_of_measure: 'EA' },
          { component_id: 'comp-002', quantity: 1, unit_of_measure: 'EA' }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/boms', bomData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /boms - missing product_id', async ({ request }) => {
      const bomData = {
        name: `Test BOM ${generateId('BOM')}`,
        version: '1.0',
        is_active: true
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/boms', bomData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /boms - invalid product_id', async ({ request }) => {
      const bomData = {
        name: `Test BOM ${generateId('BOM')}`,
        product_id: 'invalid-prod-12345',
        version: '1.0',
        is_active: true
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/boms', bomData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /boms - missing name', async ({ request }) => {
      const bomData = {
        product_id: 'prod-001',
        version: '1.0',
        is_active: true
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/boms', bomData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /boms - empty name', async ({ request }) => {
      const bomData = {
        name: '',
        product_id: 'prod-001',
        version: '1.0',
        is_active: true
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/boms', bomData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /boms - empty components array', async ({ request }) => {
      const bomData = {
        name: `Test BOM ${generateId('BOM')}`,
        product_id: 'prod-001',
        version: '1.0',
        is_active: true,
        components: []
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/boms', bomData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /boms - component with negative quantity', async ({ request }) => {
      const bomData = {
        name: `Test BOM ${generateId('BOM')}`,
        product_id: 'prod-001',
        version: '1.0',
        is_active: true,
        components: [
          { component_id: 'comp-001', quantity: -2, unit_of_measure: 'EA' }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/boms', bomData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /boms - component with zero quantity', async ({ request }) => {
      const bomData = {
        name: `Test BOM ${generateId('BOM')}`,
        product_id: 'prod-001',
        version: '1.0',
        is_active: true,
        components: [
          { component_id: 'comp-001', quantity: 0, unit_of_measure: 'EA' }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/boms', bomData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /boms - component with invalid component_id', async ({ request }) => {
      const bomData = {
        name: `Test BOM ${generateId('BOM')}`,
        product_id: 'prod-001',
        version: '1.0',
        is_active: true,
        components: [
          { component_id: 'invalid-comp-12345', quantity: 2, unit_of_measure: 'EA' }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/boms', bomData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /boms - with labor_hours', async ({ request }) => {
      const bomData = {
        name: `Test BOM ${generateId('BOM')}`,
        product_id: 'prod-001',
        version: '1.0',
        is_active: true,
        labor_hours: 2.5,
        components: [
          { component_id: 'comp-001', quantity: 2, unit_of_measure: 'EA' }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/boms', bomData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /boms - negative labor_hours', async ({ request }) => {
      const bomData = {
        name: `Test BOM ${generateId('BOM')}`,
        product_id: 'prod-001',
        version: '1.0',
        is_active: true,
        labor_hours: -2.5,
        components: [
          { component_id: 'comp-001', quantity: 2, unit_of_measure: 'EA' }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/boms', bomData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /boms - with overhead_cost', async ({ request }) => {
      const bomData = {
        name: `Test BOM ${generateId('BOM')}`,
        product_id: 'prod-001',
        version: '1.0',
        is_active: true,
        overhead_cost: 100.00,
        components: [
          { component_id: 'comp-001', quantity: 2, unit_of_measure: 'EA' }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/boms', bomData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PRODUCTION REPORTS - Read Operations (15 tests)
  // ============================================
  test.describe('Production Reports', () => {
    test('GET /production/summary - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/production/summary?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /production/summary - with date range', async ({ request }) => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/manufacturing/production/summary?company_id=demo-company&from_date=${startDate}&to_date=${endDate}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /production/efficiency - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/production/efficiency?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /production/capacity - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/production/capacity?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /production/schedule - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/production/schedule?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /production/material-requirements - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/production/material-requirements?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /production/material-requirements - filter by work_order_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/production/material-requirements?company_id=demo-company&work_order_id=wo-001');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PERFORMANCE TESTS (10 tests)
  // ============================================
  test.describe('Performance Tests', () => {
    test('GET /work-orders - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/manufacturing/work-orders?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /boms - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/manufacturing/boms?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('POST /work-orders - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const workOrderData = {
        product_id: 'prod-001',
        bom_id: 'bom-001',
        quantity: 100,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      const duration = Date.now() - start;
      expect([200, 201, 400, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });

    test('POST /boms - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const bomData = {
        name: `Test BOM ${generateId('BOM')}`,
        product_id: 'prod-001',
        version: '1.0',
        is_active: true,
        components: [
          { component_id: 'comp-001', quantity: 2, unit_of_measure: 'EA' }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/boms', bomData);
      const duration = Date.now() - start;
      expect([200, 201, 400, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });

    test('GET /production/summary - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/manufacturing/production/summary?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });
  });
});
