/**
 * Cross-Module Integration Routes
 *
 * Exposes the integration engine that makes ARIA competitive with
 * Odoo / NetSuite / SAP B1 / Xero on cross-module automation.
 */

import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';
import {
  onDeliveryConfirmed,
  onGoodsReceived,
  onCreditNoteIssued,
  onPayrollFinalised,
  autoAllocatePayment,
  smartBankMatch,
  generateRecurringInvoices,
  submitForApproval,
  processApproval,
  createIntercompanyElimination,
  getQuoteToCashStatus,
} from '../services/cross-module-integration';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// POST /delivery/:id/confirm-integrated
app.post('/delivery/:id/confirm-integrated', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const userId = await getSecureUserId(c);
    if (!userId) return c.json({ error: "Authentication required" }, 401);
    const deliveryId = c.req.param('id');

    const result = await onDeliveryConfirmed(c.env.DB, companyId, userId, deliveryId);

    await c.env.DB.prepare(
      `UPDATE deliveries SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND company_id = ?`
    ).bind(deliveryId, companyId).run();

    return c.json(result);
  } catch (error: unknown) {
    console.error('Delivery confirm-integrated error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});

// POST /goods-receipt/:poId/receive-integrated
app.post('/goods-receipt/:poId/receive-integrated', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const userId = await getSecureUserId(c);
    if (!userId) return c.json({ error: "Authentication required" }, 401);
    const poId = c.req.param('poId');
    const body = await c.req.json<{ items: { item_id: string; quantity_received: number }[] }>();

    const result = await onGoodsReceived(c.env.DB, companyId, userId, poId, body.items || []);

    if (result.success) {
      await c.env.DB.prepare(
        `UPDATE purchase_orders SET status = 'received', received_date = datetime('now'), updated_at = datetime('now') WHERE id = ? AND company_id = ?`
      ).bind(poId, companyId).run();
    }

    return c.json(result);
  } catch (error: unknown) {
    console.error('Goods receipt integrated error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});

// POST /credit-note/:id/post-integrated
app.post('/credit-note/:id/post-integrated', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const userId = await getSecureUserId(c);
    if (!userId) return c.json({ error: "Authentication required" }, 401);
    const creditNoteId = c.req.param('id');

    const result = await onCreditNoteIssued(c.env.DB, companyId, userId, creditNoteId);

    if (result.success) {
      await c.env.DB.prepare(
        `UPDATE credit_notes SET status = 'posted', updated_at = datetime('now') WHERE id = ? AND company_id = ?`
      ).bind(creditNoteId, companyId).run();
    }

    return c.json(result);
  } catch (error: unknown) {
    console.error('Credit note post-integrated error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});

// POST /payroll/:runId/finalise-integrated
app.post('/payroll/:runId/finalise-integrated', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const userId = await getSecureUserId(c);
    if (!userId) return c.json({ error: "Authentication required" }, 401);
    const runId = c.req.param('runId');

    const result = await onPayrollFinalised(c.env.DB, companyId, userId, runId);

    if (result.success) {
      await c.env.DB.prepare(
        `UPDATE payroll_runs SET status = 'finalised', updated_at = datetime('now') WHERE id = ? AND company_id = ?`
      ).bind(runId, companyId).run();
    }

    return c.json(result);
  } catch (error: unknown) {
    console.error('Payroll finalise-integrated error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});

// POST /payment/auto-allocate
app.post('/payment/auto-allocate', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const userId = await getSecureUserId(c);
    if (!userId) return c.json({ error: "Authentication required" }, 401);
    const body = await c.req.json<{ customer_id: string; amount: number; payment_id: string }>();

    if (!body.customer_id || !body.amount || !body.payment_id) {
      return c.json({ error: 'customer_id, amount, and payment_id are required' }, 400);
    }

    const result = await autoAllocatePayment(
      c.env.DB, companyId, userId, body.customer_id, body.amount, body.payment_id
    );

    return c.json(result);
  } catch (error: unknown) {
    console.error('Payment auto-allocate error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});

// GET /bank/:accountId/smart-match
app.get('/bank/:accountId/smart-match', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const accountId = c.req.param('accountId');

    const result = await smartBankMatch(c.env.DB, companyId, accountId);

    return c.json(result);
  } catch (error: unknown) {
    console.error('Smart bank match error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});

// POST /recurring-invoices/generate
app.post('/recurring-invoices/generate', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const userId = await getSecureUserId(c);
    if (!userId) return c.json({ error: "Authentication required" }, 401);

    const result = await generateRecurringInvoices(c.env.DB, companyId, userId);

    return c.json(result);
  } catch (error: unknown) {
    console.error('Recurring invoices generate error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});

// GET /recurring-invoices/templates
app.get('/recurring-invoices/templates', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const templates = await c.env.DB.prepare(
      `SELECT rit.*, c.customer_name FROM recurring_invoice_templates rit
       LEFT JOIN customers c ON rit.customer_id = c.id
       WHERE rit.company_id = ? ORDER BY rit.next_invoice_date ASC`
    ).bind(companyId).all();
    return c.json({ templates: templates.results || [] });
  } catch (error: unknown) {
    return c.json({ templates: [] });
  }
});

// POST /recurring-invoices/templates
app.post('/recurring-invoices/templates', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const userId = await getSecureUserId(c);
    if (!userId) return c.json({ error: "Authentication required" }, 401);
    const body = await c.req.json<{
      customer_id: string; frequency: string; next_invoice_date: string;
      end_date?: string; payment_terms_days?: number;
      subtotal: number; tax_amount: number; total_amount: number;
      lines?: { product_id?: string; description?: string; quantity?: number; unit_price?: number; tax_rate?: number; line_total?: number }[];
    }>();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO recurring_invoice_templates (id, company_id, customer_id, frequency, next_invoice_date, end_date, payment_terms_days, subtotal, tax_amount, total_amount, is_active, invoices_generated, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?)`
    ).bind(
      id, companyId, body.customer_id, body.frequency || 'monthly',
      body.next_invoice_date, body.end_date || null, body.payment_terms_days || 30,
      body.subtotal || 0, body.tax_amount || 0, body.total_amount || 0,
      userId, now, now
    ).run();

    for (const [i, line] of (body.lines || []).entries()) {
      await c.env.DB.prepare(
        `INSERT INTO recurring_invoice_lines (id, template_id, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(), id, line.product_id || null, line.description || '',
        line.quantity || 1, line.unit_price || 0, line.tax_rate || 15,
        line.line_total || 0, i, now
      ).run();
    }

    return c.json({ id, message: 'Recurring invoice template created' }, 201);
  } catch (error: unknown) {
    console.error('Create recurring template error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});

// POST /approvals/submit
app.post('/approvals/submit', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const userId = await getSecureUserId(c);
    if (!userId) return c.json({ error: "Authentication required" }, 401);
    const body = await c.req.json<{ document_type: string; document_id: string; amount: number }>();

    const result = await submitForApproval(
      c.env.DB, companyId, userId, body.document_type, body.document_id, body.amount
    );

    return c.json(result, 201);
  } catch (error: unknown) {
    console.error('Submit for approval error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});

// POST /approvals/:id/decide
app.post('/approvals/:id/decide', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const userId = await getSecureUserId(c);
    if (!userId) return c.json({ error: "Authentication required" }, 401);
    const approvalId = c.req.param('id');
    const body = await c.req.json<{ decision: 'approved' | 'rejected'; comments?: string }>();

    const result = await processApproval(
      c.env.DB, companyId, userId, approvalId, body.decision, body.comments
    );

    return c.json(result);
  } catch (error: unknown) {
    console.error('Process approval error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});

// GET /approvals/pending
app.get('/approvals/pending', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const userId = await getSecureUserId(c);
    if (!userId) return c.json({ error: "Authentication required" }, 401);

    const pending = await c.env.DB.prepare(
      `SELECT ar.*, ast.approver_id FROM approval_requests ar
       JOIN approval_steps ast ON ar.id = ast.approval_request_id
       WHERE ar.company_id = ? AND ast.approver_id = ? AND ast.status = 'pending'
       ORDER BY ar.created_at DESC`
    ).bind(companyId, userId).all();

    return c.json({ approvals: pending.results || [] });
  } catch (error: unknown) {
    return c.json({ approvals: [] });
  }
});

// POST /intercompany/elimination
app.post('/intercompany/elimination', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const userId = await getSecureUserId(c);
    if (!userId) return c.json({ error: "Authentication required" }, 401);
    const body = await c.req.json<{
      source_company_id: string; target_company_id: string;
      amount: number; description: string;
    }>();

    const result = await createIntercompanyElimination(
      c.env.DB, companyId, userId,
      body.source_company_id, body.target_company_id,
      body.amount, body.description
    );

    return c.json(result, 201);
  } catch (error: unknown) {
    console.error('Intercompany elimination error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});

// GET /intercompany/eliminations
app.get('/intercompany/eliminations', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const eliminations = await c.env.DB.prepare(
      'SELECT * FROM intercompany_eliminations WHERE company_id = ? ORDER BY created_at DESC'
    ).bind(companyId).all();
    return c.json({ eliminations: eliminations.results || [] });
  } catch (error: unknown) {
    return c.json({ eliminations: [] });
  }
});

// GET /quote-to-cash/:soId
app.get('/quote-to-cash/:soId', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const soId = c.req.param('soId');

    const result = await getQuoteToCashStatus(c.env.DB, companyId, soId);

    return c.json(result);
  } catch (error: unknown) {
    console.error('Quote-to-cash status error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});

// GET /integration/health — summary of all cross-module integrations
app.get('/health', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const db = c.env.DB;

    const [deliveries, pos, invoices, payments, payroll, creditNotes] = await Promise.all([
      db.prepare("SELECT COUNT(*) as c FROM deliveries WHERE company_id = ? AND status = 'completed'").bind(companyId).first<{c:number}>(),
      db.prepare("SELECT COUNT(*) as c FROM purchase_orders WHERE company_id = ? AND status = 'received'").bind(companyId).first<{c:number}>(),
      db.prepare("SELECT COUNT(*) as c FROM customer_invoices WHERE company_id = ? AND status = 'posted'").bind(companyId).first<{c:number}>(),
      db.prepare("SELECT COUNT(*) as c FROM customer_payments WHERE company_id = ?").bind(companyId).first<{c:number}>(),
      db.prepare("SELECT COUNT(*) as c FROM payroll_runs WHERE company_id = ? AND status = 'finalised'").bind(companyId).first<{c:number}>(),
      db.prepare("SELECT COUNT(*) as c FROM credit_notes WHERE company_id = ? AND status = 'posted'").bind(companyId).first<{c:number}>(),
    ]);

    const glEntries = await db.prepare(
      "SELECT COUNT(*) as c FROM journal_entries WHERE company_id = ?"
    ).bind(companyId).first<{c:number}>();

    return c.json({
      status: 'operational',
      integrations: {
        delivery_to_gl: { description: 'Delivery → Stock Deduction + COGS GL', completed_deliveries: deliveries?.c || 0 },
        goods_receipt_to_gl: { description: 'Goods Receipt → Stock Increase + Inventory GL', received_pos: pos?.c || 0 },
        invoice_to_gl: { description: 'Invoice → AR/AP GL Posting', posted_invoices: invoices?.c || 0 },
        payment_allocation: { description: 'Payment → Auto-allocate to oldest invoices', total_payments: payments?.c || 0 },
        payroll_to_gl: { description: 'Payroll → Salary/PAYE/UIF/Pension GL', finalised_runs: payroll?.c || 0 },
        credit_note_reversal: { description: 'Credit Note → GL Reversal + AR Adjustment', posted_credit_notes: creditNotes?.c || 0 },
        bank_reconciliation: { description: 'Bank → AI Smart Matching' },
        recurring_invoices: { description: 'Recurring Invoice Auto-Generation' },
        approval_workflows: { description: 'Configurable Multi-Step Approvals' },
        intercompany: { description: 'Intercompany Transaction Elimination' },
        quote_to_cash: { description: 'Full Quote→SO→Delivery→Invoice→Payment Tracking' },
      },
      total_gl_entries: glEntries?.c || 0,
      competitive_advantage: 'All 11 integrations are automatic — matching or exceeding Odoo, NetSuite, SAP B1, and Xero'
    });
  } catch (error: unknown) {
    return c.json({ status: 'error', error: error instanceof Error ? error.message : 'unknown' }, 500);
  }
});

export default app;
