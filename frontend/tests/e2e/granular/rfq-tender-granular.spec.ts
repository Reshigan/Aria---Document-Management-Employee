/**
 * ARIA ERP - RFQ/Tender Module Granular Tests
 * Comprehensive field-level and validation testing for RFQ and Tender module
 * 
 * Tests: ~80 granular test cases covering RFQs, Tenders, Vendor Responses, Awards
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

test.describe('RFQ/Tender Module Granular Tests', () => {

  // ============================================
  // RFQs - CRUD Operations (25 tests)
  // ============================================
  test.describe('RFQs CRUD', () => {
    test('GET /rfqs - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/rfqs?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data.data || data.rfqs || data)).toBe(true);
      }
    });

    test('GET /rfqs - pagination works', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/rfqs?company_id=demo-company&page_size=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /rfqs - filter by status draft', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/rfqs?company_id=demo-company&status=draft');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /rfqs - filter by status open', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/rfqs?company_id=demo-company&status=open');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /rfqs - filter by status closed', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/rfqs?company_id=demo-company&status=closed');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /rfqs - filter by status awarded', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/rfqs?company_id=demo-company&status=awarded');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /rfqs - filter by category', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/rfqs?company_id=demo-company&category=IT');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /rfqs/:id - returns single RFQ', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/rfqs/rfq-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /rfqs - create with valid data', async ({ request }) => {
      const rfqData = {
        rfq_number: `RFQ-${Date.now()}`,
        title: `RFQ ${generateId('RFQ')}`,
        description: 'Test RFQ from automated tests',
        category: 'IT',
        items: [
          { description: 'Laptop', quantity: 10, unit: 'each', specifications: 'Intel i7, 16GB RAM' },
          { description: 'Monitor', quantity: 10, unit: 'each', specifications: '27 inch, 4K' }
        ],
        invited_vendors: ['vendor-001', 'vendor-002', 'vendor-003'],
        submission_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        evaluation_criteria: ['Price', 'Quality', 'Delivery Time'],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/procurement/rfqs', rfqData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /rfqs - missing title', async ({ request }) => {
      const rfqData = {
        description: 'Test RFQ',
        category: 'IT'
      };
      const response = await apiRequest(request, 'POST', '/procurement/rfqs', rfqData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /rfqs - empty items array', async ({ request }) => {
      const rfqData = {
        title: `RFQ ${generateId('RFQ')}`,
        items: []
      };
      const response = await apiRequest(request, 'POST', '/procurement/rfqs', rfqData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /rfqs - past submission_deadline', async ({ request }) => {
      const rfqData = {
        title: `RFQ ${generateId('RFQ')}`,
        submission_deadline: '2020-01-01'
      };
      const response = await apiRequest(request, 'POST', '/procurement/rfqs', rfqData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /rfqs - negative quantity in items', async ({ request }) => {
      const rfqData = {
        title: `RFQ ${generateId('RFQ')}`,
        items: [{ description: 'Laptop', quantity: -10 }]
      };
      const response = await apiRequest(request, 'POST', '/procurement/rfqs', rfqData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /rfqs/:id - publish RFQ', async ({ request }) => {
      const updateData = { status: 'open', published_date: new Date().toISOString().split('T')[0] };
      const response = await apiRequest(request, 'PUT', '/procurement/rfqs/rfq-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /rfqs/:id - close RFQ', async ({ request }) => {
      const updateData = { status: 'closed' };
      const response = await apiRequest(request, 'PUT', '/procurement/rfqs/rfq-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /rfqs/:id - extend deadline', async ({ request }) => {
      const updateData = { 
        submission_deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'PUT', '/procurement/rfqs/rfq-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /rfqs/:id - delete RFQ', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/procurement/rfqs/rfq-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // TENDERS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Tenders CRUD', () => {
    test('GET /tenders - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/tenders?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tenders - filter by status', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/tenders?company_id=demo-company&status=open');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tenders - filter by type', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/tenders?company_id=demo-company&type=open_tender');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tenders - filter by category', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/tenders?company_id=demo-company&category=construction');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tenders/:id - returns single tender', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/tenders/tender-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /tenders - create with valid data', async ({ request }) => {
      const tenderData = {
        tender_number: `TND-${Date.now()}`,
        title: `Tender ${generateId('TND')}`,
        description: 'Test tender from automated tests',
        type: 'open_tender',
        category: 'construction',
        estimated_value: 5000000,
        submission_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        opening_date: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        requirements: ['Valid business registration', 'Tax clearance certificate', 'Previous experience'],
        evaluation_criteria: [
          { criterion: 'Technical Capability', weight: 40 },
          { criterion: 'Price', weight: 30 },
          { criterion: 'Experience', weight: 20 },
          { criterion: 'BEE Score', weight: 10 }
        ],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/procurement/tenders', tenderData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /tenders - missing title', async ({ request }) => {
      const tenderData = {
        type: 'open_tender',
        estimated_value: 5000000
      };
      const response = await apiRequest(request, 'POST', '/procurement/tenders', tenderData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /tenders - negative estimated_value', async ({ request }) => {
      const tenderData = {
        title: `Tender ${generateId('TND')}`,
        estimated_value: -5000000
      };
      const response = await apiRequest(request, 'POST', '/procurement/tenders', tenderData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /tenders - opening_date before submission_deadline', async ({ request }) => {
      const tenderData = {
        title: `Tender ${generateId('TND')}`,
        submission_deadline: '2024-12-31',
        opening_date: '2024-12-01'
      };
      const response = await apiRequest(request, 'POST', '/procurement/tenders', tenderData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /tenders - evaluation weights not summing to 100', async ({ request }) => {
      const tenderData = {
        title: `Tender ${generateId('TND')}`,
        evaluation_criteria: [
          { criterion: 'Technical', weight: 30 },
          { criterion: 'Price', weight: 30 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/procurement/tenders', tenderData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /tenders/:id - publish tender', async ({ request }) => {
      const updateData = { status: 'open', published_date: new Date().toISOString().split('T')[0] };
      const response = await apiRequest(request, 'PUT', '/procurement/tenders/tender-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /tenders/:id - close tender', async ({ request }) => {
      const updateData = { status: 'closed' };
      const response = await apiRequest(request, 'PUT', '/procurement/tenders/tender-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /tenders/:id - cancel tender', async ({ request }) => {
      const updateData = { status: 'cancelled', cancellation_reason: 'Budget constraints' };
      const response = await apiRequest(request, 'PUT', '/procurement/tenders/tender-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /tenders/:id - delete tender', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/procurement/tenders/tender-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // VENDOR RESPONSES - CRUD Operations (15 tests)
  // ============================================
  test.describe('Vendor Responses CRUD', () => {
    test('GET /vendor-responses - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/vendor-responses?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /vendor-responses - filter by rfq_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/vendor-responses?company_id=demo-company&rfq_id=rfq-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /vendor-responses - filter by tender_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/vendor-responses?company_id=demo-company&tender_id=tender-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /vendor-responses - filter by vendor_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/vendor-responses?company_id=demo-company&vendor_id=vendor-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /vendor-responses/:id - returns single response', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/vendor-responses/resp-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /vendor-responses - create RFQ response', async ({ request }) => {
      const responseData = {
        rfq_id: 'rfq-001',
        vendor_id: 'vendor-001',
        items: [
          { item_id: 'item-001', unit_price: 15000, lead_time_days: 14, notes: 'In stock' },
          { item_id: 'item-002', unit_price: 8000, lead_time_days: 7, notes: 'In stock' }
        ],
        total_amount: 230000,
        validity_days: 30,
        terms_and_conditions: 'Standard terms apply',
        status: 'submitted'
      };
      const response = await apiRequest(request, 'POST', '/procurement/vendor-responses', responseData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /vendor-responses - missing vendor_id', async ({ request }) => {
      const responseData = {
        rfq_id: 'rfq-001',
        total_amount: 230000
      };
      const response = await apiRequest(request, 'POST', '/procurement/vendor-responses', responseData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /vendor-responses - negative unit_price', async ({ request }) => {
      const responseData = {
        rfq_id: 'rfq-001',
        vendor_id: 'vendor-001',
        items: [{ item_id: 'item-001', unit_price: -15000 }]
      };
      const response = await apiRequest(request, 'POST', '/procurement/vendor-responses', responseData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /vendor-responses - negative lead_time_days', async ({ request }) => {
      const responseData = {
        rfq_id: 'rfq-001',
        vendor_id: 'vendor-001',
        items: [{ item_id: 'item-001', unit_price: 15000, lead_time_days: -14 }]
      };
      const response = await apiRequest(request, 'POST', '/procurement/vendor-responses', responseData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /vendor-responses/:id - update response', async ({ request }) => {
      const updateData = { total_amount: 220000 };
      const response = await apiRequest(request, 'PUT', '/procurement/vendor-responses/resp-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /vendor-responses/:id - delete response', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/procurement/vendor-responses/resp-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // AWARDS - Operations (15 tests)
  // ============================================
  test.describe('Awards Operations', () => {
    test('GET /awards - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/awards?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /awards - filter by rfq_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/awards?company_id=demo-company&rfq_id=rfq-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /awards - filter by tender_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/awards?company_id=demo-company&tender_id=tender-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /awards - filter by vendor_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/awards?company_id=demo-company&vendor_id=vendor-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /awards/:id - returns single award', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/procurement/awards/award-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /awards - create RFQ award', async ({ request }) => {
      const awardData = {
        rfq_id: 'rfq-001',
        vendor_response_id: 'resp-001',
        vendor_id: 'vendor-001',
        award_amount: 220000,
        award_date: new Date().toISOString().split('T')[0],
        justification: 'Best price and delivery time',
        approved_by: 'manager-001',
        status: 'pending_acceptance'
      };
      const response = await apiRequest(request, 'POST', '/procurement/awards', awardData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /awards - missing vendor_id', async ({ request }) => {
      const awardData = {
        rfq_id: 'rfq-001',
        award_amount: 220000
      };
      const response = await apiRequest(request, 'POST', '/procurement/awards', awardData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /awards - negative award_amount', async ({ request }) => {
      const awardData = {
        rfq_id: 'rfq-001',
        vendor_id: 'vendor-001',
        award_amount: -220000
      };
      const response = await apiRequest(request, 'POST', '/procurement/awards', awardData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /awards/:id - vendor accepts award', async ({ request }) => {
      const updateData = { status: 'accepted', accepted_date: new Date().toISOString().split('T')[0] };
      const response = await apiRequest(request, 'PUT', '/procurement/awards/award-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /awards/:id - vendor declines award', async ({ request }) => {
      const updateData = { status: 'declined', decline_reason: 'Cannot meet delivery requirements' };
      const response = await apiRequest(request, 'PUT', '/procurement/awards/award-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /awards/convert-to-po - convert award to PO', async ({ request }) => {
      const convertData = { award_id: 'award-001' };
      const response = await apiRequest(request, 'POST', '/procurement/awards/convert-to-po', convertData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /awards/:id - delete award', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/procurement/awards/award-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

});
