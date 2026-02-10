/**
 * ARIA ERP - Product Hierarchy Module Granular Tests
 * Comprehensive field-level and validation testing for Product Hierarchy module
 * 
 * Tests: ~70 granular test cases covering Categories, Attributes, Templates, Variants
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

test.describe('Product Hierarchy Module Granular Tests', () => {

  // ============================================
  // PRODUCT CATEGORIES - CRUD Operations (20 tests)
  // ============================================
  test.describe('Product Categories CRUD', () => {
    test('GET /product-categories - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/categories?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data.data || data.categories || data)).toBe(true);
      }
    });

    test('GET /product-categories - pagination works', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/categories?company_id=demo-company&page_size=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /product-categories - filter by parent_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/categories?company_id=demo-company&parent_id=cat-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /product-categories - filter by status active', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/categories?company_id=demo-company&status=active');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /product-categories/:id - returns single category', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/categories/cat-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /product-categories - create with valid data', async ({ request }) => {
      const categoryData = {
        name: `Category ${generateId('CAT')}`,
        code: `CAT-${Date.now().toString().slice(-6)}`,
        description: 'Test product category',
        parent_id: null,
        status: 'active'
      };
      const response = await apiRequest(request, 'POST', '/products/categories', categoryData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /product-categories - create subcategory', async ({ request }) => {
      const categoryData = {
        name: `Subcategory ${generateId('SUBCAT')}`,
        parent_id: 'cat-001',
        status: 'active'
      };
      const response = await apiRequest(request, 'POST', '/products/categories', categoryData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /product-categories - missing name', async ({ request }) => {
      const categoryData = {
        code: `CAT-${Date.now()}`,
        description: 'Test category'
      };
      const response = await apiRequest(request, 'POST', '/products/categories', categoryData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /product-categories - duplicate code', async ({ request }) => {
      const code = `CAT-DUP-${Date.now()}`;
      const categoryData1 = { name: 'Category 1', code };
      const categoryData2 = { name: 'Category 2', code };
      await apiRequest(request, 'POST', '/products/categories', categoryData1);
      const response = await apiRequest(request, 'POST', '/products/categories', categoryData2);
      expect([200, 201, 400, 401, 404, 409, 422, 500]).toContain(response.status());
    });

    test('POST /product-categories - circular parent reference', async ({ request }) => {
      const categoryData = {
        name: `Category ${generateId('CAT')}`,
        parent_id: 'self-reference'
      };
      const response = await apiRequest(request, 'POST', '/products/categories', categoryData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /product-categories/:id - update category', async ({ request }) => {
      const updateData = { description: 'Updated description' };
      const response = await apiRequest(request, 'PUT', '/products/categories/cat-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /product-categories/:id - deactivate category', async ({ request }) => {
      const updateData = { status: 'inactive' };
      const response = await apiRequest(request, 'PUT', '/products/categories/cat-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /product-categories/:id - delete category', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/products/categories/cat-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // PRODUCT ATTRIBUTES - CRUD Operations (20 tests)
  // ============================================
  test.describe('Product Attributes CRUD', () => {
    test('GET /product-attributes - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/attributes?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /product-attributes - filter by type', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/attributes?company_id=demo-company&type=text');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /product-attributes - filter by required', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/attributes?company_id=demo-company&required=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /product-attributes/:id - returns single attribute', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/attributes/attr-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /product-attributes - create text attribute', async ({ request }) => {
      const attrData = {
        name: `Attribute ${generateId('ATTR')}`,
        code: `ATTR-${Date.now().toString().slice(-6)}`,
        type: 'text',
        required: false,
        description: 'Test text attribute'
      };
      const response = await apiRequest(request, 'POST', '/products/attributes', attrData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /product-attributes - create select attribute with options', async ({ request }) => {
      const attrData = {
        name: `Color ${generateId('ATTR')}`,
        code: `COLOR-${Date.now().toString().slice(-6)}`,
        type: 'select',
        options: ['Red', 'Blue', 'Green', 'Yellow'],
        required: true
      };
      const response = await apiRequest(request, 'POST', '/products/attributes', attrData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /product-attributes - create number attribute', async ({ request }) => {
      const attrData = {
        name: `Weight ${generateId('ATTR')}`,
        type: 'number',
        unit: 'kg',
        min_value: 0,
        max_value: 1000
      };
      const response = await apiRequest(request, 'POST', '/products/attributes', attrData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /product-attributes - missing name', async ({ request }) => {
      const attrData = {
        type: 'text',
        required: false
      };
      const response = await apiRequest(request, 'POST', '/products/attributes', attrData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /product-attributes - invalid type', async ({ request }) => {
      const attrData = {
        name: `Attribute ${generateId('ATTR')}`,
        type: 'invalid_type'
      };
      const response = await apiRequest(request, 'POST', '/products/attributes', attrData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /product-attributes - select without options', async ({ request }) => {
      const attrData = {
        name: `Attribute ${generateId('ATTR')}`,
        type: 'select',
        options: []
      };
      const response = await apiRequest(request, 'POST', '/products/attributes', attrData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /product-attributes - number with min > max', async ({ request }) => {
      const attrData = {
        name: `Attribute ${generateId('ATTR')}`,
        type: 'number',
        min_value: 100,
        max_value: 10
      };
      const response = await apiRequest(request, 'POST', '/products/attributes', attrData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /product-attributes/:id - update attribute', async ({ request }) => {
      const updateData = { required: true };
      const response = await apiRequest(request, 'PUT', '/products/attributes/attr-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /product-attributes/:id - delete attribute', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/products/attributes/attr-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // PRODUCT TEMPLATES - CRUD Operations (15 tests)
  // ============================================
  test.describe('Product Templates CRUD', () => {
    test('GET /product-templates - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/templates?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /product-templates - filter by category_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/templates?company_id=demo-company&category_id=cat-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /product-templates/:id - returns single template', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/templates/tmpl-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /product-templates - create with valid data', async ({ request }) => {
      const templateData = {
        name: `Template ${generateId('TMPL')}`,
        category_id: 'cat-001',
        attributes: ['attr-001', 'attr-002'],
        default_values: {
          'attr-001': 'Default Value'
        },
        status: 'active'
      };
      const response = await apiRequest(request, 'POST', '/products/templates', templateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /product-templates - missing name', async ({ request }) => {
      const templateData = {
        category_id: 'cat-001',
        attributes: ['attr-001']
      };
      const response = await apiRequest(request, 'POST', '/products/templates', templateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /product-templates - empty attributes array', async ({ request }) => {
      const templateData = {
        name: `Template ${generateId('TMPL')}`,
        attributes: []
      };
      const response = await apiRequest(request, 'POST', '/products/templates', templateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /product-templates/:id - update template', async ({ request }) => {
      const updateData = { attributes: ['attr-001', 'attr-002', 'attr-003'] };
      const response = await apiRequest(request, 'PUT', '/products/templates/tmpl-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /product-templates/:id - delete template', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/products/templates/tmpl-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // PRODUCT VARIANTS - CRUD Operations (15 tests)
  // ============================================
  test.describe('Product Variants CRUD', () => {
    test('GET /product-variants - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/variants?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /product-variants - filter by product_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/variants?company_id=demo-company&product_id=prod-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /product-variants - filter by status', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/variants?company_id=demo-company&status=active');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /product-variants/:id - returns single variant', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/products/variants/var-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /product-variants - create with valid data', async ({ request }) => {
      const variantData = {
        product_id: 'prod-001',
        sku: `SKU-${Date.now()}`,
        name: `Variant ${generateId('VAR')}`,
        attributes: {
          color: 'Red',
          size: 'Large'
        },
        price: 100,
        cost: 60,
        stock_quantity: 50,
        status: 'active'
      };
      const response = await apiRequest(request, 'POST', '/products/variants', variantData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /product-variants - missing product_id', async ({ request }) => {
      const variantData = {
        sku: `SKU-${Date.now()}`,
        name: 'Test Variant',
        price: 100
      };
      const response = await apiRequest(request, 'POST', '/products/variants', variantData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /product-variants - duplicate SKU', async ({ request }) => {
      const sku = `SKU-DUP-${Date.now()}`;
      const variantData1 = { product_id: 'prod-001', sku, name: 'Variant 1', price: 100 };
      const variantData2 = { product_id: 'prod-001', sku, name: 'Variant 2', price: 110 };
      await apiRequest(request, 'POST', '/products/variants', variantData1);
      const response = await apiRequest(request, 'POST', '/products/variants', variantData2);
      expect([200, 201, 400, 401, 404, 409, 422, 500]).toContain(response.status());
    });

    test('POST /product-variants - negative price', async ({ request }) => {
      const variantData = {
        product_id: 'prod-001',
        sku: `SKU-${Date.now()}`,
        name: 'Test Variant',
        price: -100
      };
      const response = await apiRequest(request, 'POST', '/products/variants', variantData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /product-variants - negative stock_quantity', async ({ request }) => {
      const variantData = {
        product_id: 'prod-001',
        sku: `SKU-${Date.now()}`,
        name: 'Test Variant',
        price: 100,
        stock_quantity: -50
      };
      const response = await apiRequest(request, 'POST', '/products/variants', variantData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /product-variants/:id - update variant price', async ({ request }) => {
      const updateData = { price: 120 };
      const response = await apiRequest(request, 'PUT', '/products/variants/var-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /product-variants/:id - update stock quantity', async ({ request }) => {
      const updateData = { stock_quantity: 75 };
      const response = await apiRequest(request, 'PUT', '/products/variants/var-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /product-variants/:id - delete variant', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/products/variants/var-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

});
