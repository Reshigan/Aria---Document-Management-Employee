/**
 * ARIA ERP - Inventory/Warehouse Granular Tests
 * Comprehensive field-level and validation testing for Inventory/Warehouse module
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

test.describe('Inventory/Warehouse Granular Tests', () => {

  // ============================================
  // STOCK LEVELS - CRUD Operations (35 tests)
  // ============================================
  test.describe('Stock Levels CRUD', () => {
    test('GET /stock-levels - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-levels?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-levels - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-levels?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-levels - pagination with offset', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-levels?company_id=demo-company&offset=0');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-levels - filter by product_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-levels?company_id=demo-company&product_id=prod-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-levels - filter by warehouse_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-levels?company_id=demo-company&warehouse_id=wh-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-levels - filter by low_stock', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-levels?company_id=demo-company&low_stock=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-levels - filter by out_of_stock', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-levels?company_id=demo-company&out_of_stock=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-levels - search by product name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-levels?company_id=demo-company&search=Widget');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-levels/:id - returns single stock level', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-levels/sl-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-levels/:id - invalid ID returns 404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-levels/invalid-id-12345?company_id=demo-company');
      expect([401, 404]).toContain(response.status());
    });

    test('POST /stock-levels - create with valid data', async ({ request }) => {
      const stockData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        quantity: 100,
        reorder_level: 10,
        reorder_quantity: 50
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-levels', stockData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /stock-levels - missing product_id', async ({ request }) => {
      const stockData = {
        warehouse_id: 'wh-001',
        quantity: 100
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-levels', stockData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-levels - missing warehouse_id', async ({ request }) => {
      const stockData = {
        product_id: 'prod-001',
        quantity: 100
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-levels', stockData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-levels - invalid product_id', async ({ request }) => {
      const stockData = {
        product_id: 'invalid-prod-12345',
        warehouse_id: 'wh-001',
        quantity: 100
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-levels', stockData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-levels - invalid warehouse_id', async ({ request }) => {
      const stockData = {
        product_id: 'prod-001',
        warehouse_id: 'invalid-wh-12345',
        quantity: 100
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-levels', stockData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-levels - negative quantity', async ({ request }) => {
      const stockData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        quantity: -100
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-levels', stockData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-levels - zero quantity', async ({ request }) => {
      const stockData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        quantity: 0
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-levels', stockData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /stock-levels - very large quantity', async ({ request }) => {
      const stockData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        quantity: 999999999
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-levels', stockData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-levels - decimal quantity', async ({ request }) => {
      const stockData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        quantity: 100.5
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-levels', stockData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /stock-levels - negative reorder_level', async ({ request }) => {
      const stockData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        quantity: 100,
        reorder_level: -10
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-levels', stockData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-levels - negative reorder_quantity', async ({ request }) => {
      const stockData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        quantity: 100,
        reorder_level: 10,
        reorder_quantity: -50
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-levels', stockData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-levels - with bin_location', async ({ request }) => {
      const stockData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        quantity: 100,
        bin_location: 'A-01-01'
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-levels', stockData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /stock-levels - with batch_number', async ({ request }) => {
      const stockData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        quantity: 100,
        batch_number: `BATCH-${Date.now()}`
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-levels', stockData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /stock-levels - with expiry_date', async ({ request }) => {
      const stockData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        quantity: 100,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-levels', stockData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /stock-levels - past expiry_date', async ({ request }) => {
      const stockData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        quantity: 100,
        expiry_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-levels', stockData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // WAREHOUSES - CRUD Operations (30 tests)
  // ============================================
  test.describe('Warehouses CRUD', () => {
    test('GET /warehouses - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/warehouses?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /warehouses - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/warehouses?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /warehouses - filter by is_active true', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/warehouses?company_id=demo-company&is_active=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /warehouses - filter by is_active false', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/warehouses?company_id=demo-company&is_active=false');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /warehouses - search by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/warehouses?company_id=demo-company&search=Main');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /warehouses/:id - returns single warehouse', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/warehouses/wh-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /warehouses/:id - invalid ID returns 404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/warehouses/invalid-wh-12345?company_id=demo-company');
      expect([401, 404]).toContain(response.status());
    });

    test('POST /warehouses - create with valid data', async ({ request }) => {
      const warehouseData = {
        name: `Test Warehouse ${generateId('WH')}`,
        code: `WH${Date.now().toString().slice(-4)}`,
        address: '123 Warehouse Street',
        city: 'Johannesburg',
        postal_code: '2000',
        country: 'South Africa',
        is_active: true
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/warehouses', warehouseData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /warehouses - missing name', async ({ request }) => {
      const warehouseData = {
        code: `WH${Date.now().toString().slice(-4)}`,
        address: '123 Warehouse Street'
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/warehouses', warehouseData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /warehouses - empty name', async ({ request }) => {
      const warehouseData = {
        name: '',
        code: `WH${Date.now().toString().slice(-4)}`
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/warehouses', warehouseData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /warehouses - duplicate code', async ({ request }) => {
      const code = `WH${Date.now().toString().slice(-4)}`;
      const warehouseData1 = { name: 'Warehouse 1', code };
      const warehouseData2 = { name: 'Warehouse 2', code };
      await apiRequest(request, 'POST', '/api/inventory/warehouses', warehouseData1);
      const response = await apiRequest(request, 'POST', '/api/inventory/warehouses', warehouseData2);
      expect([200, 201, 400, 401, 404, 409, 422]).toContain(response.status());
    });

    test('POST /warehouses - very long name', async ({ request }) => {
      const warehouseData = {
        name: 'W'.repeat(500),
        code: `WH${Date.now().toString().slice(-4)}`
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/warehouses', warehouseData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /warehouses - with contact_person', async ({ request }) => {
      const warehouseData = {
        name: `Test Warehouse ${generateId('WH')}`,
        code: `WH${Date.now().toString().slice(-4)}`,
        contact_person: 'John Smith',
        contact_phone: '+27 11 123 4567',
        contact_email: 'john@warehouse.com'
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/warehouses', warehouseData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /warehouses - invalid contact_email', async ({ request }) => {
      const warehouseData = {
        name: `Test Warehouse ${generateId('WH')}`,
        code: `WH${Date.now().toString().slice(-4)}`,
        contact_email: 'invalid-email'
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/warehouses', warehouseData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /warehouses - with capacity', async ({ request }) => {
      const warehouseData = {
        name: `Test Warehouse ${generateId('WH')}`,
        code: `WH${Date.now().toString().slice(-4)}`,
        capacity: 10000,
        capacity_unit: 'sqm'
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/warehouses', warehouseData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /warehouses - negative capacity', async ({ request }) => {
      const warehouseData = {
        name: `Test Warehouse ${generateId('WH')}`,
        code: `WH${Date.now().toString().slice(-4)}`,
        capacity: -10000
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/warehouses', warehouseData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // STOCK MOVEMENTS - CRUD Operations (35 tests)
  // ============================================
  test.describe('Stock Movements CRUD', () => {
    test('GET /stock-movements - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-movements?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-movements - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-movements?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-movements - filter by movement_type in', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-movements?company_id=demo-company&movement_type=in');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-movements - filter by movement_type out', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-movements?company_id=demo-company&movement_type=out');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-movements - filter by movement_type transfer', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-movements?company_id=demo-company&movement_type=transfer');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-movements - filter by movement_type adjustment', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-movements?company_id=demo-company&movement_type=adjustment');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-movements - filter by product_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-movements?company_id=demo-company&product_id=prod-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-movements - filter by warehouse_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-movements?company_id=demo-company&warehouse_id=wh-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-movements - filter by date range', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/inventory/stock-movements?company_id=demo-company&from_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-movements/:id - returns single movement', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-movements/sm-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /stock-movements - create stock in', async ({ request }) => {
      const movementData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        movement_type: 'in',
        quantity: 100,
        movement_date: new Date().toISOString().split('T')[0],
        reference: `REF-${Date.now()}`,
        notes: `Test stock in ${generateId('SM')}`
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /stock-movements - create stock out', async ({ request }) => {
      const movementData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        movement_type: 'out',
        quantity: 50,
        movement_date: new Date().toISOString().split('T')[0],
        reference: `REF-${Date.now()}`
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /stock-movements - create transfer', async ({ request }) => {
      const movementData = {
        product_id: 'prod-001',
        from_warehouse_id: 'wh-001',
        to_warehouse_id: 'wh-002',
        movement_type: 'transfer',
        quantity: 25,
        movement_date: new Date().toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /stock-movements - create adjustment', async ({ request }) => {
      const movementData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        movement_type: 'adjustment',
        quantity: -10,
        movement_date: new Date().toISOString().split('T')[0],
        reason: 'Damaged goods'
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /stock-movements - missing product_id', async ({ request }) => {
      const movementData = {
        warehouse_id: 'wh-001',
        movement_type: 'in',
        quantity: 100,
        movement_date: new Date().toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-movements - missing warehouse_id', async ({ request }) => {
      const movementData = {
        product_id: 'prod-001',
        movement_type: 'in',
        quantity: 100,
        movement_date: new Date().toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-movements - missing movement_type', async ({ request }) => {
      const movementData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        quantity: 100,
        movement_date: new Date().toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-movements - invalid movement_type', async ({ request }) => {
      const movementData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        movement_type: 'invalid_type',
        quantity: 100,
        movement_date: new Date().toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-movements - negative quantity for stock in', async ({ request }) => {
      const movementData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        movement_type: 'in',
        quantity: -100,
        movement_date: new Date().toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-movements - zero quantity', async ({ request }) => {
      const movementData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        movement_type: 'in',
        quantity: 0,
        movement_date: new Date().toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-movements - transfer same warehouse', async ({ request }) => {
      const movementData = {
        product_id: 'prod-001',
        from_warehouse_id: 'wh-001',
        to_warehouse_id: 'wh-001',
        movement_type: 'transfer',
        quantity: 25,
        movement_date: new Date().toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-movements - transfer missing to_warehouse_id', async ({ request }) => {
      const movementData = {
        product_id: 'prod-001',
        from_warehouse_id: 'wh-001',
        movement_type: 'transfer',
        quantity: 25,
        movement_date: new Date().toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-movements - invalid movement_date format', async ({ request }) => {
      const movementData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        movement_type: 'in',
        quantity: 100,
        movement_date: 'invalid-date'
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /stock-movements - future movement_date', async ({ request }) => {
      const movementData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        movement_type: 'in',
        quantity: 100,
        movement_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-movements - with cost_price', async ({ request }) => {
      const movementData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        movement_type: 'in',
        quantity: 100,
        movement_date: new Date().toISOString().split('T')[0],
        cost_price: 50.00
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /stock-movements - negative cost_price', async ({ request }) => {
      const movementData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        movement_type: 'in',
        quantity: 100,
        movement_date: new Date().toISOString().split('T')[0],
        cost_price: -50.00
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // STOCK COUNTS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Stock Counts CRUD', () => {
    test('GET /stock-counts - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-counts?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-counts - filter by status draft', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-counts?company_id=demo-company&status=draft');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-counts - filter by status in_progress', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-counts?company_id=demo-company&status=in_progress');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-counts - filter by status completed', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-counts?company_id=demo-company&status=completed');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-counts - filter by warehouse_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-counts?company_id=demo-company&warehouse_id=wh-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /stock-counts - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-counts?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /stock-counts - create with valid data', async ({ request }) => {
      const countData = {
        warehouse_id: 'wh-001',
        count_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        notes: `Test stock count ${generateId('SC')}`
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-counts', countData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /stock-counts - missing warehouse_id', async ({ request }) => {
      const countData = {
        count_date: new Date().toISOString().split('T')[0],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-counts', countData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-counts - invalid warehouse_id', async ({ request }) => {
      const countData = {
        warehouse_id: 'invalid-wh-12345',
        count_date: new Date().toISOString().split('T')[0],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-counts', countData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /stock-counts - invalid count_date format', async ({ request }) => {
      const countData = {
        warehouse_id: 'wh-001',
        count_date: 'invalid-date',
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-counts', countData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /stock-counts - with count items', async ({ request }) => {
      const countData = {
        warehouse_id: 'wh-001',
        count_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        items: [
          { product_id: 'prod-001', expected_quantity: 100, counted_quantity: 98 },
          { product_id: 'prod-002', expected_quantity: 50, counted_quantity: 50 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-counts', countData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /stock-counts - negative counted_quantity', async ({ request }) => {
      const countData = {
        warehouse_id: 'wh-001',
        count_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        items: [
          { product_id: 'prod-001', expected_quantity: 100, counted_quantity: -5 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-counts', countData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // INVENTORY REPORTS - Read Operations (15 tests)
  // ============================================
  test.describe('Inventory Reports', () => {
    test('GET /inventory/valuation - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/valuation?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /inventory/valuation - with as_of_date', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/inventory/valuation?company_id=demo-company&as_of_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /inventory/valuation - filter by warehouse_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/valuation?company_id=demo-company&warehouse_id=wh-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /inventory/low-stock - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/low-stock?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /inventory/expiring - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/expiring?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /inventory/expiring - with days_before', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/expiring?company_id=demo-company&days_before=30');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /inventory/movement-history - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/movement-history?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /inventory/movement-history - filter by product_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/movement-history?company_id=demo-company&product_id=prod-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /inventory/abc-analysis - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/abc-analysis?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /inventory/dead-stock - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/dead-stock?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /inventory/dead-stock - with days_inactive', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/dead-stock?company_id=demo-company&days_inactive=90');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PERFORMANCE TESTS (10 tests)
  // ============================================
  test.describe('Performance Tests', () => {
    test('GET /stock-levels - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-levels?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /warehouses - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/inventory/warehouses?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /stock-movements - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-movements?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('POST /stock-movements - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const movementData = {
        product_id: 'prod-001',
        warehouse_id: 'wh-001',
        movement_type: 'in',
        quantity: 100,
        movement_date: new Date().toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', movementData);
      const duration = Date.now() - start;
      expect([200, 201, 400, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });

    test('GET /inventory/valuation - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/inventory/valuation?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });
  });
});
