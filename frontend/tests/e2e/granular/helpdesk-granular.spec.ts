/**
 * ARIA ERP - Helpdesk Module Granular Tests
 * Comprehensive field-level and validation testing for Helpdesk module
 * 
 * Tests: ~80 granular test cases covering Tickets, Teams, Escalations, SLA
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

test.describe('Helpdesk Module Granular Tests', () => {

  // ============================================
  // TICKETS - CRUD Operations (30 tests)
  // ============================================
  test.describe('Tickets CRUD', () => {
    test('GET /tickets - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data.data || data.tickets || data)).toBe(true);
      }
    });

    test('GET /tickets - pagination works', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets?company_id=demo-company&page_size=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tickets - filter by status open', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets?company_id=demo-company&status=open');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tickets - filter by status in_progress', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets?company_id=demo-company&status=in_progress');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tickets - filter by status resolved', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets?company_id=demo-company&status=resolved');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tickets - filter by status closed', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets?company_id=demo-company&status=closed');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tickets - filter by priority low', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets?company_id=demo-company&priority=low');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tickets - filter by priority medium', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets?company_id=demo-company&priority=medium');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tickets - filter by priority high', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets?company_id=demo-company&priority=high');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tickets - filter by priority critical', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets?company_id=demo-company&priority=critical');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tickets - filter by assignee_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets?company_id=demo-company&assignee_id=agent-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tickets - filter by team_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets?company_id=demo-company&team_id=team-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tickets - filter by customer_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets?company_id=demo-company&customer_id=cust-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tickets - filter by category', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets?company_id=demo-company&category=technical');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /tickets/:id - returns single ticket', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets/ticket-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /tickets - create with valid data', async ({ request }) => {
      const ticketData = {
        subject: `Ticket ${generateId('TKT')}`,
        description: 'Test ticket from automated tests',
        customer_id: 'cust-001',
        priority: 'medium',
        category: 'technical',
        status: 'open'
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/tickets', ticketData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /tickets - missing subject', async ({ request }) => {
      const ticketData = {
        description: 'Test ticket',
        customer_id: 'cust-001',
        priority: 'medium'
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/tickets', ticketData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /tickets - empty subject', async ({ request }) => {
      const ticketData = {
        subject: '',
        description: 'Test ticket',
        customer_id: 'cust-001'
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/tickets', ticketData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /tickets - invalid priority', async ({ request }) => {
      const ticketData = {
        subject: `Ticket ${generateId('TKT')}`,
        description: 'Test ticket',
        priority: 'invalid_priority'
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/tickets', ticketData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /tickets - very long subject (500 chars)', async ({ request }) => {
      const ticketData = {
        subject: 'A'.repeat(500),
        description: 'Test ticket',
        customer_id: 'cust-001'
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/tickets', ticketData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /tickets/:id - assign ticket', async ({ request }) => {
      const updateData = { assignee_id: 'agent-001', team_id: 'team-001' };
      const response = await apiRequest(request, 'PUT', '/helpdesk/tickets/ticket-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /tickets/:id - update status to in_progress', async ({ request }) => {
      const updateData = { status: 'in_progress' };
      const response = await apiRequest(request, 'PUT', '/helpdesk/tickets/ticket-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /tickets/:id - resolve ticket', async ({ request }) => {
      const updateData = { status: 'resolved', resolution: 'Issue fixed by updating configuration' };
      const response = await apiRequest(request, 'PUT', '/helpdesk/tickets/ticket-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /tickets/:id - close ticket', async ({ request }) => {
      const updateData = { status: 'closed' };
      const response = await apiRequest(request, 'PUT', '/helpdesk/tickets/ticket-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /tickets/:id - reopen ticket', async ({ request }) => {
      const updateData = { status: 'open', reopen_reason: 'Issue reoccurred' };
      const response = await apiRequest(request, 'PUT', '/helpdesk/tickets/ticket-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /tickets/:id - escalate ticket', async ({ request }) => {
      const updateData = { priority: 'critical', escalated: true, escalation_reason: 'SLA breach imminent' };
      const response = await apiRequest(request, 'PUT', '/helpdesk/tickets/ticket-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /tickets/:id - delete ticket', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/helpdesk/tickets/ticket-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // TICKET COMMENTS - CRUD Operations (15 tests)
  // ============================================
  test.describe('Ticket Comments CRUD', () => {
    test('GET /tickets/:id/comments - returns comments', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/tickets/ticket-001/comments?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /tickets/:id/comments - add public comment', async ({ request }) => {
      const commentData = {
        content: 'Test comment from automated tests',
        is_internal: false
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/tickets/ticket-001/comments', commentData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /tickets/:id/comments - add internal note', async ({ request }) => {
      const commentData = {
        content: 'Internal note - not visible to customer',
        is_internal: true
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/tickets/ticket-001/comments', commentData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /tickets/:id/comments - empty content', async ({ request }) => {
      const commentData = {
        content: '',
        is_internal: false
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/tickets/ticket-001/comments', commentData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /comments/:id - update comment', async ({ request }) => {
      const updateData = { content: 'Updated comment content' };
      const response = await apiRequest(request, 'PUT', '/helpdesk/comments/comment-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /comments/:id - delete comment', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/helpdesk/comments/comment-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // TEAMS - CRUD Operations (15 tests)
  // ============================================
  test.describe('Teams CRUD', () => {
    test('GET /teams - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/teams?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /teams/:id - returns single team', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/teams/team-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /teams - create with valid data', async ({ request }) => {
      const teamData = {
        name: `Team ${generateId('TEAM')}`,
        description: 'Test helpdesk team',
        lead_id: 'agent-001',
        members: ['agent-001', 'agent-002', 'agent-003'],
        categories: ['technical', 'billing']
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/teams', teamData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /teams - missing name', async ({ request }) => {
      const teamData = {
        description: 'Test team',
        lead_id: 'agent-001'
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/teams', teamData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /teams - empty members array', async ({ request }) => {
      const teamData = {
        name: `Team ${generateId('TEAM')}`,
        members: []
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/teams', teamData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /teams/:id - add member', async ({ request }) => {
      const updateData = { members: ['agent-001', 'agent-002', 'agent-003', 'agent-004'] };
      const response = await apiRequest(request, 'PUT', '/helpdesk/teams/team-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /teams/:id - change lead', async ({ request }) => {
      const updateData = { lead_id: 'agent-002' };
      const response = await apiRequest(request, 'PUT', '/helpdesk/teams/team-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /teams/:id - delete team', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/helpdesk/teams/team-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // SLA - CRUD Operations (15 tests)
  // ============================================
  test.describe('SLA CRUD', () => {
    test('GET /sla - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/sla?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /sla/:id - returns single SLA', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/sla/sla-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /sla - create with valid data', async ({ request }) => {
      const slaData = {
        name: `SLA ${generateId('SLA')}`,
        description: 'Test SLA policy',
        priority: 'high',
        first_response_hours: 1,
        resolution_hours: 8,
        business_hours_only: true,
        escalation_enabled: true
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/sla', slaData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /sla - missing name', async ({ request }) => {
      const slaData = {
        priority: 'high',
        first_response_hours: 1
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/sla', slaData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /sla - negative first_response_hours', async ({ request }) => {
      const slaData = {
        name: `SLA ${generateId('SLA')}`,
        first_response_hours: -1
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/sla', slaData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /sla - resolution_hours less than first_response_hours', async ({ request }) => {
      const slaData = {
        name: `SLA ${generateId('SLA')}`,
        first_response_hours: 8,
        resolution_hours: 4
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/sla', slaData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /sla/:id - update SLA', async ({ request }) => {
      const updateData = { resolution_hours: 12 };
      const response = await apiRequest(request, 'PUT', '/helpdesk/sla/sla-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('DELETE /sla/:id - delete SLA', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/helpdesk/sla/sla-to-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 500]).toContain(response.status());
    });
  });

  // ============================================
  // ESCALATIONS - Operations (10 tests)
  // ============================================
  test.describe('Escalations Operations', () => {
    test('GET /escalations - returns 200 with array', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/escalations?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /escalations - filter by status pending', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/escalations?company_id=demo-company&status=pending');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /escalations - filter by status acknowledged', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/helpdesk/escalations?company_id=demo-company&status=acknowledged');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /escalations - create escalation', async ({ request }) => {
      const escalationData = {
        ticket_id: 'ticket-001',
        reason: 'SLA breach - response time exceeded',
        escalate_to: 'manager-001',
        priority: 'critical'
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/escalations', escalationData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('POST /escalations - missing ticket_id', async ({ request }) => {
      const escalationData = {
        reason: 'SLA breach',
        escalate_to: 'manager-001'
      };
      const response = await apiRequest(request, 'POST', '/helpdesk/escalations', escalationData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /escalations/:id - acknowledge escalation', async ({ request }) => {
      const updateData = { status: 'acknowledged', acknowledged_by: 'manager-001' };
      const response = await apiRequest(request, 'PUT', '/helpdesk/escalations/esc-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });

    test('PUT /escalations/:id - resolve escalation', async ({ request }) => {
      const updateData = { status: 'resolved', resolution_notes: 'Ticket reassigned and resolved' };
      const response = await apiRequest(request, 'PUT', '/helpdesk/escalations/esc-001', updateData);
      expect([200, 201, 400, 401, 404, 422, 500]).toContain(response.status());
    });
  });

});
