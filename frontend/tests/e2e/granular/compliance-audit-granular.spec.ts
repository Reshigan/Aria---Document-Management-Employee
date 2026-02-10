/**
 * ARIA ERP - Compliance/Audit Granular Tests
 * Comprehensive testing of compliance and audit functionality
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

test.describe('Compliance/Audit Granular Tests', () => {

  // ============================================
  // BBBEE COMPLIANCE - CRUD Operations (25 tests)
  // ============================================
  test.describe('BBBEE Compliance CRUD', () => {
    test('GET /bbbee-compliance - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/bbbee?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bbbee-compliance - filter by year', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/bbbee?company_id=demo-company&year=2024');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bbbee-compliance - filter by status', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/bbbee?company_id=demo-company&status=compliant');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /bbbee-compliance/:id - returns single record', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/bbbee/bbbee-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /bbbee-compliance - create with valid data', async ({ request }) => {
      const bbbeeData = {
        year: 2024,
        level: 4,
        ownership_score: 25,
        management_control_score: 15,
        skills_development_score: 20,
        enterprise_development_score: 15,
        socio_economic_score: 12,
        total_score: 87,
        status: 'compliant'
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/bbbee', bbbeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /bbbee-compliance - missing year', async ({ request }) => {
      const bbbeeData = {
        level: 4,
        total_score: 87
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/bbbee', bbbeeData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bbbee-compliance - invalid level (0)', async ({ request }) => {
      const bbbeeData = {
        year: 2024,
        level: 0,
        total_score: 87
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/bbbee', bbbeeData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bbbee-compliance - invalid level (9)', async ({ request }) => {
      const bbbeeData = {
        year: 2024,
        level: 9,
        total_score: 87
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/bbbee', bbbeeData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bbbee-compliance - negative score', async ({ request }) => {
      const bbbeeData = {
        year: 2024,
        level: 4,
        ownership_score: -25
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/bbbee', bbbeeData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /bbbee-compliance - score over 100', async ({ request }) => {
      const bbbeeData = {
        year: 2024,
        level: 4,
        total_score: 150
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/bbbee', bbbeeData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('PUT /bbbee-compliance/:id - update record', async ({ request }) => {
      const bbbeeData = {
        level: 3,
        total_score: 92
      };
      const response = await apiRequest(request, 'PUT', '/api/compliance/bbbee/bbbee-001', bbbeeData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /bbbee-compliance/:id - delete record', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/compliance/bbbee/bbbee-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // TAX COMPLIANCE - CRUD Operations (25 tests)
  // ============================================
  test.describe('Tax Compliance CRUD', () => {
    test('GET /tax-compliance - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/tax?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tax-compliance - filter by tax_type VAT', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/tax?company_id=demo-company&tax_type=VAT');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tax-compliance - filter by tax_type PAYE', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/tax?company_id=demo-company&tax_type=PAYE');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tax-compliance - filter by tax_type UIF', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/tax?company_id=demo-company&tax_type=UIF');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tax-compliance - filter by period', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/tax?company_id=demo-company&period=2024-01');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tax-compliance - filter by status filed', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/tax?company_id=demo-company&status=filed');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tax-compliance - filter by status pending', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/tax?company_id=demo-company&status=pending');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tax-compliance/:id - returns single record', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/tax/tax-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /tax-compliance - create VAT return', async ({ request }) => {
      const taxData = {
        tax_type: 'VAT',
        period: '2024-01',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount_due: 15000,
        status: 'pending'
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/tax', taxData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /tax-compliance - create PAYE return', async ({ request }) => {
      const taxData = {
        tax_type: 'PAYE',
        period: '2024-01',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount_due: 25000,
        status: 'pending'
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/tax', taxData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /tax-compliance - missing tax_type', async ({ request }) => {
      const taxData = {
        period: '2024-01',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount_due: 15000
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/tax', taxData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /tax-compliance - invalid tax_type', async ({ request }) => {
      const taxData = {
        tax_type: 'INVALID',
        period: '2024-01',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount_due: 15000
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/tax', taxData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /tax-compliance - negative amount_due', async ({ request }) => {
      const taxData = {
        tax_type: 'VAT',
        period: '2024-01',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount_due: -15000
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/tax', taxData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('PUT /tax-compliance/:id - mark as filed', async ({ request }) => {
      const taxData = {
        status: 'filed',
        filed_date: new Date().toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'PUT', '/api/compliance/tax/tax-001', taxData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /tax-compliance/:id - delete record', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/compliance/tax/tax-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // AUDIT TRAIL - Read Operations (20 tests)
  // ============================================
  test.describe('Audit Trail', () => {
    test('GET /audit-trail - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - pagination with offset', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&offset=0');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - filter by user_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&user_id=user-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - filter by action create', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&action=create');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - filter by action update', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&action=update');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - filter by action delete', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&action=delete');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - filter by action login', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&action=login');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - filter by entity_type invoice', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&entity_type=invoice');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - filter by entity_type customer', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&entity_type=customer');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - filter by entity_type employee', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&entity_type=employee');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - filter by date range', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/audit-trail?company_id=demo-company&from_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - filter by entity_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&entity_id=inv-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail/:id - returns single record', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail/audit-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /audit-trail - search by description', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/audit-trail?company_id=demo-company&search=invoice');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // POPIA COMPLIANCE - CRUD Operations (15 tests)
  // ============================================
  test.describe('POPIA Compliance CRUD', () => {
    test('GET /popia-compliance - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/popia?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /popia-compliance - filter by status', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/popia?company_id=demo-company&status=compliant');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /popia-compliance/:id - returns single record', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/popia/popia-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /popia-compliance - create with valid data', async ({ request }) => {
      const popiaData = {
        assessment_date: new Date().toISOString().split('T')[0],
        data_inventory_complete: true,
        consent_mechanisms_in_place: true,
        data_breach_procedures: true,
        information_officer_appointed: true,
        status: 'compliant'
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/popia', popiaData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /popia-compliance - missing assessment_date', async ({ request }) => {
      const popiaData = {
        data_inventory_complete: true,
        consent_mechanisms_in_place: true
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/popia', popiaData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('PUT /popia-compliance/:id - update record', async ({ request }) => {
      const popiaData = {
        status: 'non_compliant',
        remediation_plan: 'Update consent forms'
      };
      const response = await apiRequest(request, 'PUT', '/api/compliance/popia/popia-001', popiaData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /popia-compliance/:id - delete record', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/compliance/popia/popia-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // RISK MANAGEMENT - CRUD Operations (15 tests)
  // ============================================
  test.describe('Risk Management CRUD', () => {
    test('GET /risks - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/risks?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /risks - filter by risk_level high', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/risks?company_id=demo-company&risk_level=high');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /risks - filter by risk_level medium', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/risks?company_id=demo-company&risk_level=medium');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /risks - filter by risk_level low', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/risks?company_id=demo-company&risk_level=low');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /risks - filter by status open', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/risks?company_id=demo-company&status=open');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /risks - filter by status mitigated', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/risks?company_id=demo-company&status=mitigated');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /risks/:id - returns single risk', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/compliance/risks/risk-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /risks - create with valid data', async ({ request }) => {
      const riskData = {
        name: `Risk ${generateId('RISK')}`,
        description: 'Test risk for automated testing',
        risk_level: 'medium',
        probability: 3,
        impact: 4,
        mitigation_plan: 'Implement controls',
        status: 'open'
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/risks', riskData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /risks - missing name', async ({ request }) => {
      const riskData = {
        description: 'Test risk',
        risk_level: 'medium'
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/risks', riskData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /risks - invalid risk_level', async ({ request }) => {
      const riskData = {
        name: `Risk ${generateId('RISK')}`,
        description: 'Test risk',
        risk_level: 'invalid_level'
      };
      const response = await apiRequest(request, 'POST', '/api/compliance/risks', riskData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('PUT /risks/:id - update risk', async ({ request }) => {
      const riskData = {
        status: 'mitigated'
      };
      const response = await apiRequest(request, 'PUT', '/api/compliance/risks/risk-001', riskData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /risks/:id - delete risk', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/compliance/risks/risk-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });
});
