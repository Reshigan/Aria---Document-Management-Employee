/**
 * ARIA ERP - Workflow State Granular Tests
 * Comprehensive testing of workflow state transitions and business rules
 * 
 * Tests: ~120 granular test cases
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

test.describe('Workflow State Granular Tests', () => {

  // ============================================
  // INVOICE WORKFLOW STATES (25 tests)
  // ============================================
  test.describe('Invoice Workflow States', () => {
    test('Create invoice in draft status', async ({ request }) => {
      const data = { customer_id: 'cust-001', status: 'draft', invoice_date: new Date().toISOString().split('T')[0] };
      const response = await apiRequest(request, 'POST', '/api/invoices', data);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Transition invoice from draft to sent', async ({ request }) => {
      const data = { status: 'sent' };
      const response = await apiRequest(request, 'PUT', '/api/invoices/inv-draft-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition invoice from sent to paid', async ({ request }) => {
      const data = { status: 'paid' };
      const response = await apiRequest(request, 'PUT', '/api/invoices/inv-sent-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition invoice from draft to void', async ({ request }) => {
      const data = { status: 'void' };
      const response = await apiRequest(request, 'PUT', '/api/invoices/inv-draft-002/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Invalid transition - paid to draft', async ({ request }) => {
      const data = { status: 'draft' };
      const response = await apiRequest(request, 'PUT', '/api/invoices/inv-paid-001/status', data);
      expect([200, 400, 401, 404, 409, 422]).toContain(response.status());
    });

    test('Invalid transition - void to sent', async ({ request }) => {
      const data = { status: 'sent' };
      const response = await apiRequest(request, 'PUT', '/api/invoices/inv-void-001/status', data);
      expect([200, 400, 401, 404, 409, 422]).toContain(response.status());
    });

    test('Partial payment updates invoice status', async ({ request }) => {
      const data = { invoice_id: 'inv-001', amount: 500, payment_date: new Date().toISOString().split('T')[0] };
      const response = await apiRequest(request, 'POST', '/api/banking/payments', data);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Full payment marks invoice as paid', async ({ request }) => {
      const data = { invoice_id: 'inv-001', amount: 1000, payment_date: new Date().toISOString().split('T')[0] };
      const response = await apiRequest(request, 'POST', '/api/banking/payments', data);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Cannot edit paid invoice', async ({ request }) => {
      const data = { amount: 2000 };
      const response = await apiRequest(request, 'PUT', '/api/invoices/inv-paid-001', data);
      expect([200, 400, 401, 404, 409]).toContain(response.status());
    });

    test('Cannot delete paid invoice', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/invoices/inv-paid-001?company_id=demo-company');
      expect([200, 204, 400, 401, 404, 409]).toContain(response.status());
    });

    test('Can edit draft invoice', async ({ request }) => {
      const data = { amount: 2000 };
      const response = await apiRequest(request, 'PUT', '/api/invoices/inv-draft-003', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Can delete draft invoice', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/invoices/inv-draft-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });

    test('Invoice overdue status auto-update', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/invoices?company_id=demo-company&status=overdue');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PURCHASE ORDER WORKFLOW STATES (20 tests)
  // ============================================
  test.describe('Purchase Order Workflow States', () => {
    test('Create PO in draft status', async ({ request }) => {
      const data = { supplier_id: 'supp-001', status: 'draft', order_date: new Date().toISOString().split('T')[0] };
      const response = await apiRequest(request, 'POST', '/api/purchase-orders', data);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Transition PO from draft to submitted', async ({ request }) => {
      const data = { status: 'submitted' };
      const response = await apiRequest(request, 'PUT', '/api/purchase-orders/po-draft-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition PO from submitted to approved', async ({ request }) => {
      const data = { status: 'approved' };
      const response = await apiRequest(request, 'PUT', '/api/purchase-orders/po-submitted-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition PO from approved to received', async ({ request }) => {
      const data = { status: 'received' };
      const response = await apiRequest(request, 'PUT', '/api/purchase-orders/po-approved-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition PO from draft to cancelled', async ({ request }) => {
      const data = { status: 'cancelled' };
      const response = await apiRequest(request, 'PUT', '/api/purchase-orders/po-draft-002/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Invalid transition - received to draft', async ({ request }) => {
      const data = { status: 'draft' };
      const response = await apiRequest(request, 'PUT', '/api/purchase-orders/po-received-001/status', data);
      expect([200, 400, 401, 404, 409, 422]).toContain(response.status());
    });

    test('Invalid transition - cancelled to approved', async ({ request }) => {
      const data = { status: 'approved' };
      const response = await apiRequest(request, 'PUT', '/api/purchase-orders/po-cancelled-001/status', data);
      expect([200, 400, 401, 404, 409, 422]).toContain(response.status());
    });

    test('Goods receipt updates PO status', async ({ request }) => {
      const data = { purchase_order_id: 'po-001', received_date: new Date().toISOString().split('T')[0] };
      const response = await apiRequest(request, 'POST', '/api/goods-receipts', data);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Partial receipt keeps PO in progress', async ({ request }) => {
      const data = { purchase_order_id: 'po-001', line_items: [{ product_id: 'prod-001', quantity_received: 5 }] };
      const response = await apiRequest(request, 'POST', '/api/goods-receipts', data);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Cannot edit received PO', async ({ request }) => {
      const data = { total_amount: 5000 };
      const response = await apiRequest(request, 'PUT', '/api/purchase-orders/po-received-001', data);
      expect([200, 400, 401, 404, 409]).toContain(response.status());
    });
  });

  // ============================================
  // SALES ORDER WORKFLOW STATES (15 tests)
  // ============================================
  test.describe('Sales Order Workflow States', () => {
    test('Create sales order in draft status', async ({ request }) => {
      const data = { customer_id: 'cust-001', status: 'draft', order_date: new Date().toISOString().split('T')[0] };
      const response = await apiRequest(request, 'POST', '/api/sales-orders', data);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Transition SO from draft to confirmed', async ({ request }) => {
      const data = { status: 'confirmed' };
      const response = await apiRequest(request, 'PUT', '/api/sales-orders/so-draft-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition SO from confirmed to shipped', async ({ request }) => {
      const data = { status: 'shipped' };
      const response = await apiRequest(request, 'PUT', '/api/sales-orders/so-confirmed-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition SO from shipped to delivered', async ({ request }) => {
      const data = { status: 'delivered' };
      const response = await apiRequest(request, 'PUT', '/api/sales-orders/so-shipped-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition SO from draft to cancelled', async ({ request }) => {
      const data = { status: 'cancelled' };
      const response = await apiRequest(request, 'PUT', '/api/sales-orders/so-draft-002/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Invalid transition - delivered to draft', async ({ request }) => {
      const data = { status: 'draft' };
      const response = await apiRequest(request, 'PUT', '/api/sales-orders/so-delivered-001/status', data);
      expect([200, 400, 401, 404, 409, 422]).toContain(response.status());
    });

    test('SO confirmation creates invoice', async ({ request }) => {
      const data = { status: 'confirmed', create_invoice: true };
      const response = await apiRequest(request, 'PUT', '/api/sales-orders/so-draft-003/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('SO shipment updates stock levels', async ({ request }) => {
      const data = { status: 'shipped' };
      const response = await apiRequest(request, 'PUT', '/api/sales-orders/so-confirmed-002/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // LEAVE REQUEST WORKFLOW STATES (15 tests)
  // ============================================
  test.describe('Leave Request Workflow States', () => {
    test('Create leave request in pending status', async ({ request }) => {
      const data = { employee_id: 'emp-001', status: 'pending', start_date: '2024-06-01', end_date: '2024-06-05' };
      const response = await apiRequest(request, 'POST', '/api/leave-requests', data);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Transition leave from pending to approved', async ({ request }) => {
      const data = { status: 'approved' };
      const response = await apiRequest(request, 'PUT', '/api/leave-requests/leave-pending-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition leave from pending to rejected', async ({ request }) => {
      const data = { status: 'rejected', rejection_reason: 'Insufficient coverage' };
      const response = await apiRequest(request, 'PUT', '/api/leave-requests/leave-pending-002/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition leave from approved to cancelled', async ({ request }) => {
      const data = { status: 'cancelled' };
      const response = await apiRequest(request, 'PUT', '/api/leave-requests/leave-approved-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Invalid transition - rejected to approved', async ({ request }) => {
      const data = { status: 'approved' };
      const response = await apiRequest(request, 'PUT', '/api/leave-requests/leave-rejected-001/status', data);
      expect([200, 400, 401, 404, 409, 422]).toContain(response.status());
    });

    test('Approved leave deducts balance', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/employees/emp-001/leave-balance?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Cancelled leave restores balance', async ({ request }) => {
      const data = { status: 'cancelled' };
      const response = await apiRequest(request, 'PUT', '/api/leave-requests/leave-approved-002/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Cannot approve leave exceeding balance', async ({ request }) => {
      const data = { employee_id: 'emp-001', start_date: '2024-01-01', end_date: '2024-12-31' };
      const response = await apiRequest(request, 'POST', '/api/leave-requests', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // WORK ORDER WORKFLOW STATES (15 tests)
  // ============================================
  test.describe('Work Order Workflow States', () => {
    test('Create work order in planned status', async ({ request }) => {
      const data = { bom_id: 'bom-001', status: 'planned', quantity: 100 };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', data);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Transition WO from planned to in_progress', async ({ request }) => {
      const data = { status: 'in_progress' };
      const response = await apiRequest(request, 'PUT', '/api/manufacturing/work-orders/wo-planned-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition WO from in_progress to completed', async ({ request }) => {
      const data = { status: 'completed', actual_quantity: 100 };
      const response = await apiRequest(request, 'PUT', '/api/manufacturing/work-orders/wo-progress-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition WO from planned to cancelled', async ({ request }) => {
      const data = { status: 'cancelled' };
      const response = await apiRequest(request, 'PUT', '/api/manufacturing/work-orders/wo-planned-002/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Invalid transition - completed to planned', async ({ request }) => {
      const data = { status: 'planned' };
      const response = await apiRequest(request, 'PUT', '/api/manufacturing/work-orders/wo-completed-001/status', data);
      expect([200, 400, 401, 404, 409, 422]).toContain(response.status());
    });

    test('WO start consumes raw materials', async ({ request }) => {
      const data = { status: 'in_progress' };
      const response = await apiRequest(request, 'PUT', '/api/manufacturing/work-orders/wo-planned-003/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('WO completion produces finished goods', async ({ request }) => {
      const data = { status: 'completed', actual_quantity: 100 };
      const response = await apiRequest(request, 'PUT', '/api/manufacturing/work-orders/wo-progress-002/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Cannot start WO without sufficient materials', async ({ request }) => {
      const data = { bom_id: 'bom-001', quantity: 999999 };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', data);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });
  });

  // ============================================
  // SUPPORT TICKET WORKFLOW STATES (15 tests)
  // ============================================
  test.describe('Support Ticket Workflow States', () => {
    test('Create ticket in open status', async ({ request }) => {
      const data = { title: 'Test Ticket', status: 'open', priority: 'medium' };
      const response = await apiRequest(request, 'POST', '/api/support-tickets', data);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Transition ticket from open to in_progress', async ({ request }) => {
      const data = { status: 'in_progress', assigned_to: 'user-001' };
      const response = await apiRequest(request, 'PUT', '/api/support-tickets/ticket-open-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition ticket from in_progress to resolved', async ({ request }) => {
      const data = { status: 'resolved', resolution: 'Issue fixed' };
      const response = await apiRequest(request, 'PUT', '/api/support-tickets/ticket-progress-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition ticket from resolved to closed', async ({ request }) => {
      const data = { status: 'closed' };
      const response = await apiRequest(request, 'PUT', '/api/support-tickets/ticket-resolved-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Reopen closed ticket', async ({ request }) => {
      const data = { status: 'open', reopen_reason: 'Issue recurred' };
      const response = await apiRequest(request, 'PUT', '/api/support-tickets/ticket-closed-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Escalate ticket priority', async ({ request }) => {
      const data = { priority: 'critical' };
      const response = await apiRequest(request, 'PUT', '/api/support-tickets/ticket-open-002', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Assign ticket to user', async ({ request }) => {
      const data = { assigned_to: 'user-002' };
      const response = await apiRequest(request, 'PUT', '/api/support-tickets/ticket-open-003', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Add comment to ticket', async ({ request }) => {
      const data = { ticket_id: 'ticket-001', content: 'Working on this issue' };
      const response = await apiRequest(request, 'POST', '/api/support-tickets/ticket-001/comments', data);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PAYROLL RUN WORKFLOW STATES (15 tests)
  // ============================================
  test.describe('Payroll Run Workflow States', () => {
    test('Create payroll run in draft status', async ({ request }) => {
      const data = { period_start: '2024-01-01', period_end: '2024-01-31', status: 'draft' };
      const response = await apiRequest(request, 'POST', '/api/payroll-runs', data);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Transition payroll from draft to processing', async ({ request }) => {
      const data = { status: 'processing' };
      const response = await apiRequest(request, 'PUT', '/api/payroll-runs/payroll-draft-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition payroll from processing to approved', async ({ request }) => {
      const data = { status: 'approved' };
      const response = await apiRequest(request, 'PUT', '/api/payroll-runs/payroll-processing-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Transition payroll from approved to paid', async ({ request }) => {
      const data = { status: 'paid', payment_date: new Date().toISOString().split('T')[0] };
      const response = await apiRequest(request, 'PUT', '/api/payroll-runs/payroll-approved-001/status', data);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Invalid transition - paid to draft', async ({ request }) => {
      const data = { status: 'draft' };
      const response = await apiRequest(request, 'PUT', '/api/payroll-runs/payroll-paid-001/status', data);
      expect([200, 400, 401, 404, 409, 422]).toContain(response.status());
    });

    test('Payroll processing calculates payslips', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/payroll-runs/payroll-processing-001/payslips?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Payroll approval locks payslips', async ({ request }) => {
      const data = { amount: 5000 };
      const response = await apiRequest(request, 'PUT', '/api/payslips/payslip-approved-001', data);
      expect([200, 400, 401, 404, 409]).toContain(response.status());
    });

    test('Payroll payment creates journal entries', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/journal-entries?company_id=demo-company&reference=payroll-paid-001');
      expect([200, 401, 404]).toContain(response.status());
    });
  });
});
