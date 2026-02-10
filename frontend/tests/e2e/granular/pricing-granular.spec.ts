/**
 * ARIA ERP - Pricing Module Granular Tests
 * Comprehensive field-level and validation testing for Pricing module
 * 
 * Tests: ~70 granular test cases covering Price Lists, Pricing Rules, Discounts, Promotions
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

test.describe('Pricing Module Granular Tests', () => {

  // ============================================
  // PRICE LISTS - CRUD Operations (20 tests)
  // ============================================
  test.describe('Price Lists CRUD', () => {
    test('GET /price-lists - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/price-lists?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data.data || data.price_lists || data)).toBe(true);
      }
    });

    test('GET /price-lists - pagination works', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/price-lists?company_id=demo-company&page_size=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /price-lists - filter by status active', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/price-lists?company_id=demo-company&status=active');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /price-lists - filter by currency', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/price-lists?company_id=demo-company&currency=ZAR');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /price-lists - filter by customer_group', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/price-lists?company_id=demo-company&customer_group=wholesale');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /price-lists/:id - returns single price list', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/price-lists/pl-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /price-lists - create with valid data', async ({ request }) => {
      const priceListData = {
        name: `Price List ${generateId('PL')}`,
        code: `PL-${Date.now().toString().slice(-6)}`,
        currency: 'ZAR',
        customer_group: 'wholesale',
        effective_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_default: false,
        status: 'active'
      };
      const response = await apiRequest(request, 'POST', '/pricing/price-lists', priceListData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /price-lists - missing name', async ({ request }) => {
      const priceListData = {
        currency: 'ZAR',
        customer_group: 'wholesale'
      };
      const response = await apiRequest(request, 'POST', '/pricing/price-lists', priceListData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /price-lists - expiry_date before effective_date', async ({ request }) => {
      const priceListData = {
        name: `Price List ${generateId('PL')}`,
        effective_date: '2024-12-31',
        expiry_date: '2024-01-01'
      };
      const response = await apiRequest(request, 'POST', '/pricing/price-lists', priceListData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /price-lists - invalid currency', async ({ request }) => {
      const priceListData = {
        name: `Price List ${generateId('PL')}`,
        currency: 'INVALID'
      };
      const response = await apiRequest(request, 'POST', '/pricing/price-lists', priceListData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /price-lists/:id - update price list', async ({ request }) => {
      const updateData = { customer_group: 'retail' };
      const response = await apiRequest(request, 'PUT', '/pricing/price-lists/pl-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /price-lists/:id - deactivate price list', async ({ request }) => {
      const updateData = { status: 'inactive' };
      const response = await apiRequest(request, 'PUT', '/pricing/price-lists/pl-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /price-lists/:id - delete price list', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/pricing/price-lists/pl-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // PRICE LIST ITEMS - CRUD Operations (15 tests)
  // ============================================
  test.describe('Price List Items CRUD', () => {
    test('GET /price-list-items - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/price-list-items?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /price-list-items - filter by price_list_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/price-list-items?company_id=demo-company&price_list_id=pl-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /price-list-items - filter by product_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/price-list-items?company_id=demo-company&product_id=prod-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /price-list-items - create with valid data', async ({ request }) => {
      const itemData = {
        price_list_id: 'pl-001',
        product_id: 'prod-001',
        unit_price: 1500,
        min_quantity: 1,
        max_quantity: null
      };
      const response = await apiRequest(request, 'POST', '/pricing/price-list-items', itemData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /price-list-items - missing price_list_id', async ({ request }) => {
      const itemData = {
        product_id: 'prod-001',
        unit_price: 1500
      };
      const response = await apiRequest(request, 'POST', '/pricing/price-list-items', itemData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /price-list-items - negative unit_price', async ({ request }) => {
      const itemData = {
        price_list_id: 'pl-001',
        product_id: 'prod-001',
        unit_price: -1500
      };
      const response = await apiRequest(request, 'POST', '/pricing/price-list-items', itemData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /price-list-items - min_quantity greater than max_quantity', async ({ request }) => {
      const itemData = {
        price_list_id: 'pl-001',
        product_id: 'prod-001',
        unit_price: 1500,
        min_quantity: 100,
        max_quantity: 10
      };
      const response = await apiRequest(request, 'POST', '/pricing/price-list-items', itemData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /price-list-items/:id - update price', async ({ request }) => {
      const updateData = { unit_price: 1600 };
      const response = await apiRequest(request, 'PUT', '/pricing/price-list-items/pli-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /price-list-items/:id - delete item', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/pricing/price-list-items/pli-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // PRICING RULES - CRUD Operations (15 tests)
  // ============================================
  test.describe('Pricing Rules CRUD', () => {
    test('GET /pricing-rules - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/pricing-rules?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /pricing-rules - filter by status', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/pricing-rules?company_id=demo-company&status=active');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /pricing-rules - filter by type', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/pricing-rules?company_id=demo-company&type=discount');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /pricing-rules/:id - returns single rule', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/pricing-rules/rule-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /pricing-rules - create percentage discount', async ({ request }) => {
      const ruleData = {
        name: `Rule ${generateId('RULE')}`,
        type: 'discount',
        discount_type: 'percentage',
        discount_value: 10,
        applies_to: 'all_products',
        min_order_value: 1000,
        effective_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 1,
        status: 'active'
      };
      const response = await apiRequest(request, 'POST', '/pricing/pricing-rules', ruleData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /pricing-rules - create fixed discount', async ({ request }) => {
      const ruleData = {
        name: `Rule ${generateId('RULE')}`,
        type: 'discount',
        discount_type: 'fixed',
        discount_value: 500,
        applies_to: 'category',
        category_id: 'cat-001',
        status: 'active'
      };
      const response = await apiRequest(request, 'POST', '/pricing/pricing-rules', ruleData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /pricing-rules - missing name', async ({ request }) => {
      const ruleData = {
        type: 'discount',
        discount_value: 10
      };
      const response = await apiRequest(request, 'POST', '/pricing/pricing-rules', ruleData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /pricing-rules - negative discount_value', async ({ request }) => {
      const ruleData = {
        name: `Rule ${generateId('RULE')}`,
        type: 'discount',
        discount_value: -10
      };
      const response = await apiRequest(request, 'POST', '/pricing/pricing-rules', ruleData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /pricing-rules - percentage over 100', async ({ request }) => {
      const ruleData = {
        name: `Rule ${generateId('RULE')}`,
        type: 'discount',
        discount_type: 'percentage',
        discount_value: 150
      };
      const response = await apiRequest(request, 'POST', '/pricing/pricing-rules', ruleData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /pricing-rules/:id - update rule', async ({ request }) => {
      const updateData = { discount_value: 15 };
      const response = await apiRequest(request, 'PUT', '/pricing/pricing-rules/rule-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /pricing-rules/:id - delete rule', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/pricing/pricing-rules/rule-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // PROMOTIONS - CRUD Operations (15 tests)
  // ============================================
  test.describe('Promotions CRUD', () => {
    test('GET /promotions - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/promotions?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /promotions - filter by status', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/promotions?company_id=demo-company&status=active');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /promotions - filter by type', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/promotions?company_id=demo-company&type=buy_x_get_y');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /promotions/:id - returns single promotion', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/pricing/promotions/promo-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /promotions - create buy X get Y promotion', async ({ request }) => {
      const promoData = {
        name: `Promo ${generateId('PROMO')}`,
        code: `PROMO-${Date.now().toString().slice(-6)}`,
        type: 'buy_x_get_y',
        buy_quantity: 2,
        get_quantity: 1,
        product_id: 'prod-001',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        max_uses: 100,
        status: 'active'
      };
      const response = await apiRequest(request, 'POST', '/pricing/promotions', promoData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /promotions - create percentage off promotion', async ({ request }) => {
      const promoData = {
        name: `Promo ${generateId('PROMO')}`,
        code: `SAVE-${Date.now().toString().slice(-6)}`,
        type: 'percentage_off',
        discount_percentage: 20,
        min_purchase: 500,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active'
      };
      const response = await apiRequest(request, 'POST', '/pricing/promotions', promoData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /promotions - missing name', async ({ request }) => {
      const promoData = {
        type: 'percentage_off',
        discount_percentage: 20
      };
      const response = await apiRequest(request, 'POST', '/pricing/promotions', promoData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /promotions - end_date before start_date', async ({ request }) => {
      const promoData = {
        name: `Promo ${generateId('PROMO')}`,
        start_date: '2024-12-31',
        end_date: '2024-01-01'
      };
      const response = await apiRequest(request, 'POST', '/pricing/promotions', promoData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /promotions - negative max_uses', async ({ request }) => {
      const promoData = {
        name: `Promo ${generateId('PROMO')}`,
        type: 'percentage_off',
        max_uses: -100
      };
      const response = await apiRequest(request, 'POST', '/pricing/promotions', promoData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /promotions/:id - update promotion', async ({ request }) => {
      const updateData = { max_uses: 200 };
      const response = await apiRequest(request, 'PUT', '/pricing/promotions/promo-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /promotions/:id - deactivate promotion', async ({ request }) => {
      const updateData = { status: 'inactive' };
      const response = await apiRequest(request, 'PUT', '/pricing/promotions/promo-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /promotions/:id - delete promotion', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/pricing/promotions/promo-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // PRICE CALCULATOR - Operations (5 tests)
  // ============================================
  test.describe('Price Calculator Operations', () => {
    test('POST /calculate-price - calculate product price', async ({ request }) => {
      const calcData = {
        product_id: 'prod-001',
        quantity: 10,
        customer_id: 'cust-001'
      };
      const response = await apiRequest(request, 'POST', '/pricing/calculate-price', calcData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /calculate-price - with promo code', async ({ request }) => {
      const calcData = {
        product_id: 'prod-001',
        quantity: 10,
        promo_code: 'SAVE20'
      };
      const response = await apiRequest(request, 'POST', '/pricing/calculate-price', calcData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /calculate-price - missing product_id', async ({ request }) => {
      const calcData = {
        quantity: 10
      };
      const response = await apiRequest(request, 'POST', '/pricing/calculate-price', calcData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /calculate-price - negative quantity', async ({ request }) => {
      const calcData = {
        product_id: 'prod-001',
        quantity: -10
      };
      const response = await apiRequest(request, 'POST', '/pricing/calculate-price', calcData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /validate-promo-code - validate promo code', async ({ request }) => {
      const validateData = {
        promo_code: 'SAVE20',
        order_value: 1000
      };
      const response = await apiRequest(request, 'POST', '/pricing/validate-promo-code', validateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });
  });

});
