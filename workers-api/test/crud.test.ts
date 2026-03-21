/**
 * TASK-26: CRUD Integration Tests for Core Modules
 * Tests for customers, suppliers, products, invoices, quotes
 * proving data integrity and tenant isolation.
 */
import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = process.env.TEST_API_URL || 'http://localhost:8787';

async function api(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function loginAs(email: string, password: string): Promise<string> {
  const res = await api('POST', '/api/auth/login', { email, password });
  return res.data?.token || res.data?.access_token || '';
}

describe('CRUD Integration Tests', () => {
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    // Register two companies for tenant isolation tests
    const emailA = `crud-a-${Date.now()}@example.com`;
    const emailB = `crud-b-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    await api('POST', '/api/auth/register', {
      email: emailA, password, full_name: 'Company A User', company_name: 'Company A',
    });
    await api('POST', '/api/auth/register', {
      email: emailB, password, full_name: 'Company B User', company_name: 'Company B',
    });

    tokenA = await loginAs(emailA, password);
    tokenB = await loginAs(emailB, password);
  });

  describe('Customers CRUD', () => {
    let customerId: string;

    it('should create a customer with valid data', async () => {
      const res = await api('POST', '/api/erp/master-data/customers', {
        name: 'Test Customer',
        email: 'customer@test.com',
        phone: '0821234567',
        type: 'individual',
      }, tokenA);
      expect([200, 201]).toContain(res.status);
      customerId = res.data?.id || res.data?.customer?.id;
      expect(customerId).toBeDefined();
    });

    it('should reject creation with missing required fields', async () => {
      const res = await api('POST', '/api/erp/master-data/customers', {}, tokenA);
      expect([400, 422]).toContain(res.status);
    });

    it('should list customers for authenticated company', async () => {
      const res = await api('GET', '/api/erp/master-data/customers', undefined, tokenA);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data?.customers || res.data)).toBe(true);
    });

    it('should get a single customer by ID', async () => {
      if (!customerId) return;
      const res = await api('GET', `/api/erp/master-data/customers/${customerId}`, undefined, tokenA);
      expect(res.status).toBe(200);
    });

    it('should update a customer', async () => {
      if (!customerId) return;
      const res = await api('PUT', `/api/erp/master-data/customers/${customerId}`, {
        name: 'Updated Customer',
        email: 'updated@test.com',
        phone: '0829876543',
      }, tokenA);
      expect(res.status).toBe(200);
    });

    it('should enforce tenant isolation - Company B cannot see Company A customer', async () => {
      if (!customerId) return;
      const res = await api('GET', `/api/erp/master-data/customers/${customerId}`, undefined, tokenB);
      expect([403, 404]).toContain(res.status);
    });

    it('should delete a customer', async () => {
      if (!customerId) return;
      const res = await api('DELETE', `/api/erp/master-data/customers/${customerId}`, undefined, tokenA);
      expect([200, 204]).toContain(res.status);
    });

    it('should return 404 for deleted customer', async () => {
      if (!customerId) return;
      const res = await api('GET', `/api/erp/master-data/customers/${customerId}`, undefined, tokenA);
      expect([404]).toContain(res.status);
    });
  });

  describe('Suppliers CRUD', () => {
    let supplierId: string;

    it('should create a supplier', async () => {
      const res = await api('POST', '/api/erp/master-data/suppliers', {
        name: 'Test Supplier',
        email: 'supplier@test.com',
        phone: '0831234567',
        type: 'company',
      }, tokenA);
      expect([200, 201]).toContain(res.status);
      supplierId = res.data?.id || res.data?.supplier?.id;
    });

    it('should list suppliers', async () => {
      const res = await api('GET', '/api/erp/master-data/suppliers', undefined, tokenA);
      expect(res.status).toBe(200);
    });

    it('should enforce tenant isolation on suppliers', async () => {
      if (!supplierId) return;
      const res = await api('GET', `/api/erp/master-data/suppliers/${supplierId}`, undefined, tokenB);
      expect([403, 404]).toContain(res.status);
    });

    it('should delete a supplier', async () => {
      if (!supplierId) return;
      const res = await api('DELETE', `/api/erp/master-data/suppliers/${supplierId}`, undefined, tokenA);
      expect([200, 204]).toContain(res.status);
    });
  });

  describe('Products CRUD', () => {
    let productId: string;

    it('should create a product', async () => {
      const res = await api('POST', '/api/erp/order-to-cash/products', {
        name: 'Test Product',
        sku: `SKU-${Date.now()}`,
        price: 100.00,
        cost: 50.00,
        category: 'General',
      }, tokenA);
      expect([200, 201]).toContain(res.status);
      productId = res.data?.id || res.data?.product?.id;
    });

    it('should list products', async () => {
      const res = await api('GET', '/api/erp/order-to-cash/products', undefined, tokenA);
      expect(res.status).toBe(200);
    });

    it('should enforce tenant isolation on products', async () => {
      if (!productId) return;
      const res = await api('GET', `/api/erp/order-to-cash/products/${productId}`, undefined, tokenB);
      expect([403, 404]).toContain(res.status);
    });

    it('should delete a product', async () => {
      if (!productId) return;
      const res = await api('DELETE', `/api/erp/order-to-cash/products/${productId}`, undefined, tokenA);
      expect([200, 204]).toContain(res.status);
    });
  });

  describe('Quotes CRUD', () => {
    let quoteId: string;

    it('should create a quote', async () => {
      const res = await api('POST', '/api/erp/order-to-cash/quotes', {
        customer_name: 'Quote Customer',
        items: [{ description: 'Service', quantity: 1, unit_price: 1000.00 }],
        notes: 'Test quote',
      }, tokenA);
      expect([200, 201]).toContain(res.status);
      quoteId = res.data?.id || res.data?.quote?.id;
    });

    it('should list quotes', async () => {
      const res = await api('GET', '/api/erp/order-to-cash/quotes', undefined, tokenA);
      expect(res.status).toBe(200);
    });

    it('should enforce tenant isolation on quotes', async () => {
      if (!quoteId) return;
      const res = await api('GET', `/api/erp/order-to-cash/quotes/${quoteId}`, undefined, tokenB);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('Unauthenticated Access', () => {
    it('should reject unauthenticated requests to customers', async () => {
      const res = await api('GET', '/api/erp/master-data/customers');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated requests to suppliers', async () => {
      const res = await api('GET', '/api/erp/master-data/suppliers');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated requests to products', async () => {
      const res = await api('GET', '/api/erp/order-to-cash/products');
      expect(res.status).toBe(401);
    });
  });
});
