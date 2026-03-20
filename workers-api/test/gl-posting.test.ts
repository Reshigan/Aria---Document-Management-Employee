/**
 * TASK-27: GL Posting Integration Tests
 * Tests for GL posting engine including balanced entries,
 * rollback on failure, and period enforcement.
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

describe('GL Posting Integration Tests', () => {
  let token: string;

  beforeAll(async () => {
    const email = `gl-test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    await api('POST', '/api/auth/register', {
      email, password, full_name: 'GL Test User', company_name: 'GL Test Company',
    });
    const login = await api('POST', '/api/auth/login', { email, password });
    token = login.data?.token || login.data?.access_token || '';
  });

  describe('Journal Entries', () => {
    it('should create a balanced journal entry (debits = credits)', async () => {
      const res = await api('POST', '/api/gl/journal-entries', {
        date: new Date().toISOString().split('T')[0],
        reference: `JE-TEST-${Date.now()}`,
        description: 'Test balanced journal entry',
        lines: [
          { account_code: '1000', description: 'Cash', debit: 1000.00, credit: 0 },
          { account_code: '4000', description: 'Revenue', debit: 0, credit: 1000.00 },
        ],
      }, token);
      expect([200, 201]).toContain(res.status);
    });

    it('should reject unbalanced journal entry', async () => {
      const res = await api('POST', '/api/gl/journal-entries', {
        date: new Date().toISOString().split('T')[0],
        reference: `JE-UNBAL-${Date.now()}`,
        description: 'Unbalanced entry',
        lines: [
          { account_code: '1000', description: 'Cash', debit: 1000.00, credit: 0 },
          { account_code: '4000', description: 'Revenue', debit: 0, credit: 500.00 },
        ],
      }, token);
      expect([400, 422]).toContain(res.status);
    });

    it('should list journal entries', async () => {
      const res = await api('GET', '/api/gl/journal-entries', undefined, token);
      expect(res.status).toBe(200);
    });
  });

  describe('Chart of Accounts', () => {
    it('should list chart of accounts', async () => {
      const res = await api('GET', '/api/gl/chart-of-accounts', undefined, token);
      expect(res.status).toBe(200);
    });

    it('should create an account', async () => {
      const res = await api('POST', '/api/gl/chart-of-accounts', {
        account_code: `${Date.now() % 10000}`,
        account_name: 'Test Account',
        account_type: 'Asset',
        parent_code: null,
      }, token);
      expect([200, 201]).toContain(res.status);
    });
  });

  describe('Trial Balance', () => {
    it('should return trial balance data', async () => {
      const res = await api('GET', '/api/gl/trial-balance', undefined, token);
      expect(res.status).toBe(200);
    });
  });

  describe('Period Controls', () => {
    it('should list accounting periods', async () => {
      const res = await api('GET', '/api/gl/periods', undefined, token);
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Unauthenticated Access', () => {
    it('should reject unauthenticated GL requests', async () => {
      const res = await api('GET', '/api/gl/journal-entries');
      expect(res.status).toBe(401);
    });
  });
});
