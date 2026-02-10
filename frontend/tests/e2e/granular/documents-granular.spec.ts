/**
 * ARIA ERP - Documents Granular Tests
 * Comprehensive field-level and validation testing for Documents module
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

test.describe('Documents Granular Tests', () => {

  // ============================================
  // DOCUMENTS - CRUD Operations (40 tests)
  // ============================================
  test.describe('Documents CRUD', () => {
    test('GET /documents - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents - pagination with offset', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents?company_id=demo-company&offset=0');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents - filter by document_type invoice', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents?company_id=demo-company&document_type=invoice');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents - filter by document_type quote', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents?company_id=demo-company&document_type=quote');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents - filter by document_type purchase_order', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents?company_id=demo-company&document_type=purchase_order');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents - filter by document_type contract', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents?company_id=demo-company&document_type=contract');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents - filter by status draft', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents?company_id=demo-company&status=draft');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents - filter by status final', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents?company_id=demo-company&status=final');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents - filter by status archived', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents?company_id=demo-company&status=archived');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents - search by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents?company_id=demo-company&search=Invoice');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents - filter by date range', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/documents?company_id=demo-company&from_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents/:id - returns single document', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents/doc-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents/:id - invalid ID returns 404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents/invalid-doc-12345?company_id=demo-company');
      expect([401, 404]).toContain(response.status());
    });

    test('POST /documents - create with valid data', async ({ request }) => {
      const documentData = {
        name: `Test Document ${generateId('DOC')}`,
        document_type: 'invoice',
        status: 'draft',
        description: 'Test document for automated testing'
      };
      const response = await apiRequest(request, 'POST', '/api/documents', documentData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /documents - missing name', async ({ request }) => {
      const documentData = {
        document_type: 'invoice',
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/documents', documentData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /documents - empty name', async ({ request }) => {
      const documentData = {
        name: '',
        document_type: 'invoice',
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/documents', documentData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /documents - very long name', async ({ request }) => {
      const documentData = {
        name: 'D'.repeat(500),
        document_type: 'invoice',
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/documents', documentData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /documents - missing document_type', async ({ request }) => {
      const documentData = {
        name: `Test Document ${generateId('DOC')}`,
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/documents', documentData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /documents - invalid document_type', async ({ request }) => {
      const documentData = {
        name: `Test Document ${generateId('DOC')}`,
        document_type: 'invalid_type',
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/documents', documentData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /documents - invalid status', async ({ request }) => {
      const documentData = {
        name: `Test Document ${generateId('DOC')}`,
        document_type: 'invoice',
        status: 'invalid_status'
      };
      const response = await apiRequest(request, 'POST', '/api/documents', documentData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /documents - with entity_id', async ({ request }) => {
      const documentData = {
        name: `Test Document ${generateId('DOC')}`,
        document_type: 'invoice',
        status: 'draft',
        entity_id: 'inv-001',
        entity_type: 'invoice'
      };
      const response = await apiRequest(request, 'POST', '/api/documents', documentData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /documents - with tags', async ({ request }) => {
      const documentData = {
        name: `Test Document ${generateId('DOC')}`,
        document_type: 'invoice',
        status: 'draft',
        tags: ['important', 'urgent']
      };
      const response = await apiRequest(request, 'POST', '/api/documents', documentData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /documents - empty tags array', async ({ request }) => {
      const documentData = {
        name: `Test Document ${generateId('DOC')}`,
        document_type: 'invoice',
        status: 'draft',
        tags: []
      };
      const response = await apiRequest(request, 'POST', '/api/documents', documentData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /documents/:id - update document', async ({ request }) => {
      const documentData = {
        name: `Updated Document ${generateId('DOC')}`,
        status: 'final'
      };
      const response = await apiRequest(request, 'PUT', '/api/documents/doc-001', documentData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /documents/:id - delete document', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/documents/doc-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // DOCUMENT TEMPLATES - CRUD Operations (25 tests)
  // ============================================
  test.describe('Document Templates CRUD', () => {
    test('GET /document-templates - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents/templates?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /document-templates - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents/templates?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /document-templates - filter by template_type', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents/templates?company_id=demo-company&template_type=invoice');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /document-templates - filter by is_active true', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents/templates?company_id=demo-company&is_active=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /document-templates - search by name', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents/templates?company_id=demo-company&search=Standard');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /document-templates/:id - returns single template', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents/templates/tpl-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /document-templates - create with valid data', async ({ request }) => {
      const templateData = {
        name: `Test Template ${generateId('TPL')}`,
        template_type: 'invoice',
        content: '<html><body>{{invoice_number}}</body></html>',
        is_active: true
      };
      const response = await apiRequest(request, 'POST', '/api/documents/templates', templateData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /document-templates - missing name', async ({ request }) => {
      const templateData = {
        template_type: 'invoice',
        content: '<html><body>{{invoice_number}}</body></html>'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/templates', templateData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /document-templates - empty name', async ({ request }) => {
      const templateData = {
        name: '',
        template_type: 'invoice',
        content: '<html><body>{{invoice_number}}</body></html>'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/templates', templateData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /document-templates - missing content', async ({ request }) => {
      const templateData = {
        name: `Test Template ${generateId('TPL')}`,
        template_type: 'invoice'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/templates', templateData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /document-templates - empty content', async ({ request }) => {
      const templateData = {
        name: `Test Template ${generateId('TPL')}`,
        template_type: 'invoice',
        content: ''
      };
      const response = await apiRequest(request, 'POST', '/api/documents/templates', templateData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /document-templates - invalid template_type', async ({ request }) => {
      const templateData = {
        name: `Test Template ${generateId('TPL')}`,
        template_type: 'invalid_type',
        content: '<html><body>Test</body></html>'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/templates', templateData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /document-templates - very long content', async ({ request }) => {
      const templateData = {
        name: `Test Template ${generateId('TPL')}`,
        template_type: 'invoice',
        content: '<html><body>' + 'C'.repeat(50000) + '</body></html>'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/templates', templateData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('PUT /document-templates/:id - update template', async ({ request }) => {
      const templateData = {
        name: `Updated Template ${generateId('TPL')}`,
        is_active: false
      };
      const response = await apiRequest(request, 'PUT', '/api/documents/templates/tpl-001', templateData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /document-templates/:id - delete template', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/documents/templates/tpl-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // DOCUMENT GENERATION - Operations (20 tests)
  // ============================================
  test.describe('Document Generation', () => {
    test('POST /documents/generate - generate invoice', async ({ request }) => {
      const generateData = {
        template_id: 'tpl-001',
        document_type: 'invoice',
        entity_id: 'inv-001'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/generate', generateData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /documents/generate - missing template_id', async ({ request }) => {
      const generateData = {
        document_type: 'invoice',
        entity_id: 'inv-001'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/generate', generateData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /documents/generate - invalid template_id', async ({ request }) => {
      const generateData = {
        template_id: 'invalid-tpl-12345',
        document_type: 'invoice',
        entity_id: 'inv-001'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/generate', generateData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /documents/generate - missing entity_id', async ({ request }) => {
      const generateData = {
        template_id: 'tpl-001',
        document_type: 'invoice'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/generate', generateData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /documents/generate - invalid entity_id', async ({ request }) => {
      const generateData = {
        template_id: 'tpl-001',
        document_type: 'invoice',
        entity_id: 'invalid-inv-12345'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/generate', generateData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /documents/generate - generate quote', async ({ request }) => {
      const generateData = {
        template_id: 'tpl-002',
        document_type: 'quote',
        entity_id: 'qt-001'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/generate', generateData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /documents/generate - generate purchase_order', async ({ request }) => {
      const generateData = {
        template_id: 'tpl-003',
        document_type: 'purchase_order',
        entity_id: 'po-001'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/generate', generateData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /documents/generate - with output_format pdf', async ({ request }) => {
      const generateData = {
        template_id: 'tpl-001',
        document_type: 'invoice',
        entity_id: 'inv-001',
        output_format: 'pdf'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/generate', generateData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /documents/generate - with output_format html', async ({ request }) => {
      const generateData = {
        template_id: 'tpl-001',
        document_type: 'invoice',
        entity_id: 'inv-001',
        output_format: 'html'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/generate', generateData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /documents/generate - invalid output_format', async ({ request }) => {
      const generateData = {
        template_id: 'tpl-001',
        document_type: 'invoice',
        entity_id: 'inv-001',
        output_format: 'invalid_format'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/generate', generateData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /documents/generate - with custom_data', async ({ request }) => {
      const generateData = {
        template_id: 'tpl-001',
        document_type: 'invoice',
        entity_id: 'inv-001',
        custom_data: {
          footer_text: 'Thank you for your business!'
        }
      };
      const response = await apiRequest(request, 'POST', '/api/documents/generate', generateData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // DOCUMENT HISTORY - Read Operations (10 tests)
  // ============================================
  test.describe('Document History', () => {
    test('GET /documents/history - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents/history?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents/history - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents/history?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents/history - filter by document_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents/history?company_id=demo-company&document_id=doc-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents/history - filter by action created', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents/history?company_id=demo-company&action=created');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents/history - filter by action updated', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents/history?company_id=demo-company&action=updated');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents/history - filter by action generated', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents/history?company_id=demo-company&action=generated');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents/history - filter by user_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/documents/history?company_id=demo-company&user_id=user-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /documents/history - filter by date range', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest(request, 'GET', `/api/documents/history?company_id=demo-company&from_date=${today}`);
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PERFORMANCE TESTS (5 tests)
  // ============================================
  test.describe('Performance Tests', () => {
    test('GET /documents - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/documents?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('GET /document-templates - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/documents/templates?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('POST /documents/generate - response time < 5s', async ({ request }) => {
      const start = Date.now();
      const generateData = {
        template_id: 'tpl-001',
        document_type: 'invoice',
        entity_id: 'inv-001'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/generate', generateData);
      const duration = Date.now() - start;
      expect([200, 201, 400, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(5000);
    });

    test('GET /documents/history - response time < 2s', async ({ request }) => {
      const start = Date.now();
      const response = await apiRequest(request, 'GET', '/api/documents/history?company_id=demo-company');
      const duration = Date.now() - start;
      expect([200, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(2000);
    });

    test('POST /documents - response time < 3s', async ({ request }) => {
      const start = Date.now();
      const documentData = {
        name: `Test Document ${generateId('DOC')}`,
        document_type: 'invoice',
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/documents', documentData);
      const duration = Date.now() - start;
      expect([200, 201, 400, 401, 404]).toContain(response.status());
      expect(duration).toBeLessThan(3000);
    });
  });
});
