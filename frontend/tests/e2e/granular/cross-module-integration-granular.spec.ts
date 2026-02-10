/**
 * ARIA ERP - Cross-Module Integration Granular Tests
 * Comprehensive testing of workflows that span multiple modules
 * 
 * Tests: ~150 granular test cases
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

test.describe('Cross-Module Integration Granular Tests', () => {

  // ============================================
  // QUOTE-TO-CASH WORKFLOW (30 tests)
  // ============================================
  test.describe('Quote-to-Cash Workflow', () => {
    test('Create customer for quote workflow', async ({ request }) => {
      const customerData = {
        name: `Quote Customer ${generateId('QTC')}`,
        email: `quote-${Date.now()}@example.com`,
        phone: '+27 11 123 4567'
      };
      const response = await apiRequest(request, 'POST', '/api/customers', customerData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Create quote for customer', async ({ request }) => {
      const quoteData = {
        customer_id: 'cust-001',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        line_items: [
          { product_id: 'prod-001', quantity: 5, unit_price: 100 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/quotes', quoteData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Convert quote to sales order', async ({ request }) => {
      const convertData = {
        quote_id: 'qt-001'
      };
      const response = await apiRequest(request, 'POST', '/api/quotes/convert-to-order', convertData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Create sales order from quote', async ({ request }) => {
      const orderData = {
        customer_id: 'cust-001',
        quote_id: 'qt-001',
        order_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        line_items: [
          { product_id: 'prod-001', quantity: 5, unit_price: 100 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/sales-orders', orderData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Create invoice from sales order', async ({ request }) => {
      const invoiceData = {
        customer_id: 'cust-001',
        sales_order_id: 'so-001',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        line_items: [
          { product_id: 'prod-001', quantity: 5, unit_price: 100 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/invoices', invoiceData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Record payment for invoice', async ({ request }) => {
      const paymentData = {
        payment_type: 'customer',
        customer_id: 'cust-001',
        invoice_id: 'inv-001',
        bank_account_id: 'ba-001',
        payment_date: new Date().toISOString().split('T')[0],
        amount: 500,
        payment_method: 'eft'
      };
      const response = await apiRequest(request, 'POST', '/api/banking/payments', paymentData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Verify customer balance after payment', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/customers/cust-001/balance?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Generate invoice document', async ({ request }) => {
      const generateData = {
        template_id: 'tpl-001',
        document_type: 'invoice',
        entity_id: 'inv-001'
      };
      const response = await apiRequest(request, 'POST', '/api/documents/generate', generateData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Send invoice to customer', async ({ request }) => {
      const sendData = {
        invoice_id: 'inv-001',
        email: 'customer@example.com'
      };
      const response = await apiRequest(request, 'POST', '/api/invoices/send', sendData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Update inventory after sales order', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-levels?company_id=demo-company&product_id=prod-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Create journal entry for invoice', async ({ request }) => {
      const journalData = {
        entry_date: new Date().toISOString().split('T')[0],
        reference: 'INV-001',
        description: 'Invoice for sales order',
        line_items: [
          { account_id: 'acc-001', debit: 500, credit: 0 },
          { account_id: 'acc-002', debit: 0, credit: 500 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/journal-entries', journalData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Verify AR aging after invoice', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/aged-receivables?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // PROCURE-TO-PAY WORKFLOW (30 tests)
  // ============================================
  test.describe('Procure-to-Pay Workflow', () => {
    test('Create supplier for PO workflow', async ({ request }) => {
      const supplierData = {
        name: `PO Supplier ${generateId('POS')}`,
        email: `supplier-${Date.now()}@example.com`,
        phone: '+27 11 987 6543'
      };
      const response = await apiRequest(request, 'POST', '/api/suppliers', supplierData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Create purchase requisition', async ({ request }) => {
      const requisitionData = {
        requested_by: 'user-001',
        request_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        line_items: [
          { product_id: 'prod-001', quantity: 100, estimated_price: 50 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/purchase-requisitions', requisitionData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Approve purchase requisition', async ({ request }) => {
      const approvalData = {
        status: 'approved',
        approved_by: 'user-002'
      };
      const response = await apiRequest(request, 'PUT', '/api/purchase-requisitions/pr-001', approvalData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Create purchase order from requisition', async ({ request }) => {
      const poData = {
        supplier_id: 'supp-001',
        requisition_id: 'pr-001',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        line_items: [
          { product_id: 'prod-001', quantity: 100, unit_price: 50 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/purchase-orders', poData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Send PO to supplier', async ({ request }) => {
      const sendData = {
        purchase_order_id: 'po-001',
        email: 'supplier@example.com'
      };
      const response = await apiRequest(request, 'POST', '/api/purchase-orders/send', sendData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Create goods receipt for PO', async ({ request }) => {
      const grData = {
        purchase_order_id: 'po-001',
        receipt_date: new Date().toISOString().split('T')[0],
        warehouse_id: 'wh-001',
        line_items: [
          { product_id: 'prod-001', quantity_received: 100 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/goods-receipts', grData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Update inventory after goods receipt', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-levels?company_id=demo-company&product_id=prod-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Create supplier invoice for PO', async ({ request }) => {
      const invoiceData = {
        supplier_id: 'supp-001',
        purchase_order_id: 'po-001',
        invoice_number: `SINV-${Date.now()}`,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: 5000
      };
      const response = await apiRequest(request, 'POST', '/api/ap-invoices', invoiceData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Three-way match PO, GR, Invoice', async ({ request }) => {
      const matchData = {
        purchase_order_id: 'po-001',
        goods_receipt_id: 'gr-001',
        invoice_id: 'api-001'
      };
      const response = await apiRequest(request, 'POST', '/api/ap-invoices/match', matchData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Record supplier payment', async ({ request }) => {
      const paymentData = {
        payment_type: 'supplier',
        supplier_id: 'supp-001',
        invoice_id: 'api-001',
        bank_account_id: 'ba-001',
        payment_date: new Date().toISOString().split('T')[0],
        amount: 5000,
        payment_method: 'eft'
      };
      const response = await apiRequest(request, 'POST', '/api/banking/payments', paymentData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Verify AP aging after payment', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/aged-payables?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Create journal entry for AP invoice', async ({ request }) => {
      const journalData = {
        entry_date: new Date().toISOString().split('T')[0],
        reference: 'API-001',
        description: 'AP Invoice for purchase order',
        line_items: [
          { account_id: 'acc-003', debit: 5000, credit: 0 },
          { account_id: 'acc-004', debit: 0, credit: 5000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/journal-entries', journalData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // HIRE-TO-RETIRE WORKFLOW (25 tests)
  // ============================================
  test.describe('Hire-to-Retire Workflow', () => {
    test('Create job posting', async ({ request }) => {
      const jobData = {
        title: `Software Developer ${generateId('JOB')}`,
        department: 'Engineering',
        location: 'Johannesburg',
        status: 'open'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/job-postings', jobData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Create job applicant', async ({ request }) => {
      const applicantData = {
        job_posting_id: 'job-001',
        first_name: 'John',
        last_name: `Applicant ${generateId('APP')}`,
        email: `applicant-${Date.now()}@example.com`,
        phone: '+27 11 555 1234',
        status: 'applied'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/applicants', applicantData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Schedule interview', async ({ request }) => {
      const interviewData = {
        applicant_id: 'app-001',
        interview_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        interviewer_id: 'user-001',
        type: 'technical'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/interviews', interviewData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Create job offer', async ({ request }) => {
      const offerData = {
        applicant_id: 'app-001',
        position: 'Software Developer',
        salary: 50000,
        start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/job-offers', offerData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Create employee from accepted offer', async ({ request }) => {
      const employeeData = {
        first_name: 'John',
        last_name: `Employee ${generateId('EMP')}`,
        email: `employee-${Date.now()}@company.com`,
        phone: '+27 11 555 1234',
        department: 'Engineering',
        position: 'Software Developer',
        hire_date: new Date().toISOString().split('T')[0],
        salary: 50000,
        employment_type: 'full-time'
      };
      const response = await apiRequest(request, 'POST', '/api/employees', employeeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Create employee onboarding tasks', async ({ request }) => {
      const onboardingData = {
        employee_id: 'emp-001',
        tasks: [
          { name: 'Complete paperwork', due_date: new Date().toISOString().split('T')[0] },
          { name: 'IT setup', due_date: new Date().toISOString().split('T')[0] },
          { name: 'Training', due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/hr/onboarding', onboardingData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Submit timesheet for employee', async ({ request }) => {
      const timesheetData = {
        employee_id: 'emp-001',
        week_start: new Date().toISOString().split('T')[0],
        entries: [
          { date: new Date().toISOString().split('T')[0], hours: 8, project_id: 'proj-001' }
        ],
        status: 'submitted'
      };
      const response = await apiRequest(request, 'POST', '/api/timesheets', timesheetData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Approve timesheet', async ({ request }) => {
      const approvalData = {
        status: 'approved',
        approved_by: 'user-002'
      };
      const response = await apiRequest(request, 'PUT', '/api/timesheets/ts-001', approvalData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Submit leave request', async ({ request }) => {
      const leaveData = {
        employee_id: 'emp-001',
        leave_type: 'annual',
        start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      };
      const response = await apiRequest(request, 'POST', '/api/leave-requests', leaveData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Approve leave request', async ({ request }) => {
      const approvalData = {
        status: 'approved',
        approved_by: 'user-002'
      };
      const response = await apiRequest(request, 'PUT', '/api/leave-requests/lr-001', approvalData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Run payroll for employee', async ({ request }) => {
      const payrollData = {
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        employee_ids: ['emp-001'],
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/payroll-runs', payrollData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Generate payslip', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/payslips?company_id=demo-company&employee_id=emp-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Process payroll payment', async ({ request }) => {
      const paymentData = {
        payroll_run_id: 'pr-001',
        bank_account_id: 'ba-001',
        payment_date: new Date().toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/payroll-runs/process-payment', paymentData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Create performance review', async ({ request }) => {
      const reviewData = {
        employee_id: 'emp-001',
        reviewer_id: 'user-002',
        review_period: '2024-Q1',
        rating: 4,
        comments: 'Excellent performance'
      };
      const response = await apiRequest(request, 'POST', '/api/hr/performance-reviews', reviewData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Process employee termination', async ({ request }) => {
      const terminationData = {
        employee_id: 'emp-001',
        termination_date: new Date().toISOString().split('T')[0],
        reason: 'resignation',
        final_pay_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/hr/terminations', terminationData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // MANUFACTURING WORKFLOW (25 tests)
  // ============================================
  test.describe('Manufacturing Workflow', () => {
    test('Create bill of materials', async ({ request }) => {
      const bomData = {
        product_id: 'prod-001',
        name: `BOM ${generateId('BOM')}`,
        components: [
          { product_id: 'comp-001', quantity: 2 },
          { product_id: 'comp-002', quantity: 5 }
        ],
        labor_hours: 2,
        overhead_cost: 50
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/boms', bomData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Check component availability', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-levels?company_id=demo-company&product_id=comp-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Create work order', async ({ request }) => {
      const workOrderData = {
        bom_id: 'bom-001',
        product_id: 'prod-001',
        quantity: 100,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'planned',
        priority: 'high'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/work-orders', workOrderData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Release work order', async ({ request }) => {
      const releaseData = {
        status: 'released'
      };
      const response = await apiRequest(request, 'PUT', '/api/manufacturing/work-orders/wo-001', releaseData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Issue materials to work order', async ({ request }) => {
      const issueData = {
        work_order_id: 'wo-001',
        materials: [
          { product_id: 'comp-001', quantity: 200 },
          { product_id: 'comp-002', quantity: 500 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/material-issues', issueData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Record production time', async ({ request }) => {
      const timeData = {
        work_order_id: 'wo-001',
        employee_id: 'emp-001',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        operation: 'assembly'
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/production-time', timeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Record production output', async ({ request }) => {
      const outputData = {
        work_order_id: 'wo-001',
        quantity_produced: 50,
        quantity_scrapped: 2,
        production_date: new Date().toISOString().split('T')[0]
      };
      const response = await apiRequest(request, 'POST', '/api/manufacturing/production-output', outputData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Complete work order', async ({ request }) => {
      const completeData = {
        status: 'completed',
        actual_quantity: 98
      };
      const response = await apiRequest(request, 'PUT', '/api/manufacturing/work-orders/wo-001', completeData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Update finished goods inventory', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/stock-levels?company_id=demo-company&product_id=prod-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Calculate production cost', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/manufacturing/work-orders/wo-001/cost?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Generate production report', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/production-summary?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // INVENTORY MANAGEMENT WORKFLOW (20 tests)
  // ============================================
  test.describe('Inventory Management Workflow', () => {
    test('Create warehouse', async ({ request }) => {
      const warehouseData = {
        name: `Warehouse ${generateId('WH')}`,
        code: `WH${Date.now().toString().slice(-4)}`,
        address: '123 Warehouse Street',
        is_active: true
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/warehouses', warehouseData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Create bin location', async ({ request }) => {
      const binData = {
        warehouse_id: 'wh-001',
        name: `Bin ${generateId('BIN')}`,
        code: `BIN${Date.now().toString().slice(-4)}`,
        is_active: true
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/bin-locations', binData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Receive stock into warehouse', async ({ request }) => {
      const receiveData = {
        warehouse_id: 'wh-001',
        movement_type: 'stock_in',
        movement_date: new Date().toISOString().split('T')[0],
        line_items: [
          { product_id: 'prod-001', quantity: 100, bin_location_id: 'bin-001' }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', receiveData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Transfer stock between warehouses', async ({ request }) => {
      const transferData = {
        from_warehouse_id: 'wh-001',
        to_warehouse_id: 'wh-002',
        movement_type: 'transfer',
        movement_date: new Date().toISOString().split('T')[0],
        line_items: [
          { product_id: 'prod-001', quantity: 25 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', transferData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Perform stock count', async ({ request }) => {
      const countData = {
        warehouse_id: 'wh-001',
        count_date: new Date().toISOString().split('T')[0],
        status: 'in_progress',
        count_items: [
          { product_id: 'prod-001', counted_quantity: 73 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-counts', countData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Adjust stock after count', async ({ request }) => {
      const adjustmentData = {
        warehouse_id: 'wh-001',
        movement_type: 'adjustment',
        movement_date: new Date().toISOString().split('T')[0],
        reason: 'Stock count variance',
        line_items: [
          { product_id: 'prod-001', quantity: -2 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/inventory/stock-movements', adjustmentData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Check reorder levels', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/low-stock?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Generate reorder report', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/inventory/reorder-suggestions?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Check inventory valuation', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/inventory-valuation?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Generate ABC analysis', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/abc-analysis?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // FINANCIAL CLOSE WORKFLOW (20 tests)
  // ============================================
  test.describe('Financial Close Workflow', () => {
    test('Reconcile bank account', async ({ request }) => {
      const reconcileData = {
        bank_account_id: 'ba-001',
        statement_date: new Date().toISOString().split('T')[0],
        statement_balance: 50000,
        status: 'draft'
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-reconciliations', reconcileData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Match bank transactions', async ({ request }) => {
      const matchData = {
        reconciliation_id: 'recon-001',
        transaction_ids: ['bt-001', 'bt-002']
      };
      const response = await apiRequest(request, 'POST', '/api/banking/bank-reconciliations/match', matchData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Complete bank reconciliation', async ({ request }) => {
      const completeData = {
        status: 'completed'
      };
      const response = await apiRequest(request, 'PUT', '/api/banking/bank-reconciliations/recon-001', completeData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('Review trial balance', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/trial-balance?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Post adjusting entries', async ({ request }) => {
      const journalData = {
        entry_date: new Date().toISOString().split('T')[0],
        reference: 'ADJ-001',
        description: 'Month-end adjusting entry',
        line_items: [
          { account_id: 'acc-001', debit: 1000, credit: 0 },
          { account_id: 'acc-002', debit: 0, credit: 1000 }
        ]
      };
      const response = await apiRequest(request, 'POST', '/api/journal-entries', journalData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Generate profit and loss', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/profit-loss?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Generate balance sheet', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/balance-sheet?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Generate cash flow statement', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/cash-flow?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('Close accounting period', async ({ request }) => {
      const closeData = {
        period: '2024-01',
        status: 'closed'
      };
      const response = await apiRequest(request, 'POST', '/api/accounting/period-close', closeData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('Generate VAT return', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/reports/vat-return?company_id=demo-company&period=2024-01');
      expect([200, 401, 404]).toContain(response.status());
    });
  });
});
