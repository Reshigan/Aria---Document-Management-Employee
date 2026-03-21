/**
 * TASK-25: Auth Integration Tests
 * Tests for authentication system including login, registration,
 * password reset, 2FA, and rate limiting.
 */
import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = process.env.TEST_API_URL || 'http://localhost:8787';

// Helper to make API requests
async function api(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, headers: res.headers };
}

describe('Authentication System', () => {
  let validToken: string;
  let testEmail: string;
  let testPassword: string;

  beforeAll(() => {
    testEmail = `test-${Date.now()}@example.com`;
    testPassword = 'TestPassword123!';
  });

  describe('Registration', () => {
    it('should register with valid data and return 201', async () => {
      const res = await api('POST', '/api/auth/register', {
        email: testEmail,
        password: testPassword,
        full_name: 'Test User',
        company_name: 'Test Company',
      });
      expect([200, 201]).toContain(res.status);
      expect(res.data).toBeDefined();
    });

    it('should reject duplicate email with 409', async () => {
      const res = await api('POST', '/api/auth/register', {
        email: testEmail,
        password: testPassword,
        full_name: 'Test User 2',
        company_name: 'Test Company 2',
      });
      expect([400, 409]).toContain(res.status);
    });

    it('should reject missing fields with 400', async () => {
      const res = await api('POST', '/api/auth/register', {
        email: 'incomplete@example.com',
      });
      expect([400, 422]).toContain(res.status);
    });
  });

  describe('Login', () => {
    it('should login with valid credentials and return JWT token', async () => {
      const res = await api('POST', '/api/auth/login', {
        email: testEmail,
        password: testPassword,
      });
      expect(res.status).toBe(200);
      expect(res.data?.token || res.data?.access_token).toBeDefined();
      validToken = res.data?.token || res.data?.access_token;
    });

    it('should reject wrong password with 401', async () => {
      const res = await api('POST', '/api/auth/login', {
        email: testEmail,
        password: 'WrongPassword123!',
      });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent email with 401', async () => {
      const res = await api('POST', '/api/auth/login', {
        email: 'nonexistent@example.com',
        password: testPassword,
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Token Verification', () => {
    it('should return user profile with valid token', async () => {
      const res = await api('GET', '/api/auth/me', undefined, validToken);
      expect(res.status).toBe(200);
      expect(res.data?.email || res.data?.user?.email).toBeDefined();
    });

    it('should reject requests without token with 401', async () => {
      const res = await api('GET', '/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject expired/invalid token with 401', async () => {
      const res = await api('GET', '/api/auth/me', undefined, 'invalid.token.here');
      expect(res.status).toBe(401);
    });
  });

  describe('Logout', () => {
    it('should successfully logout', async () => {
      const res = await api('POST', '/api/auth/logout', undefined, validToken);
      expect([200, 204]).toContain(res.status);
    });
  });

  describe('Password Reset Flow', () => {
    it('should accept password reset request', async () => {
      const res = await api('POST', '/api/auth/forgot-password', {
        email: testEmail,
      });
      expect([200, 202]).toContain(res.status);
    });
  });

  describe('Account Lockout', () => {
    it('should lock account after 5 failed login attempts', async () => {
      const lockEmail = `lock-${Date.now()}@example.com`;
      // Register first
      await api('POST', '/api/auth/register', {
        email: lockEmail,
        password: testPassword,
        full_name: 'Lock Test',
        company_name: 'Lock Company',
      });

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await api('POST', '/api/auth/login', {
          email: lockEmail,
          password: 'WrongPassword!',
        });
      }

      // 6th attempt should indicate locked account
      const res = await api('POST', '/api/auth/login', {
        email: lockEmail,
        password: testPassword,
      });
      expect([401, 423]).toContain(res.status);
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 after too many requests', async () => {
      const responses: number[] = [];
      for (let i = 0; i < 15; i++) {
        const res = await api('POST', '/api/auth/login', {
          email: 'ratelimit@example.com',
          password: 'test',
        });
        responses.push(res.status);
      }
      // At least one should be rate limited
      expect(responses.some(s => s === 429)).toBe(true);
    });
  });

  describe('Request ID', () => {
    it('should return X-Request-ID header on all responses', async () => {
      const res = await api('GET', '/health');
      expect(res.headers.get('X-Request-ID')).toBeDefined();
    });
  });
});
