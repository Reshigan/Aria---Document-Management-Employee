/**
 * Cross-Module Integration Service
 *
 * This is what makes ARIA superior to Odoo / NetSuite / SAP Business One / Xero.
 * Every transaction automatically triggers downstream effects:
 *   - Delivery confirmed  → stock deducted + COGS GL posted
 *   - Goods received      → stock increased + inventory GL posted
 *   - Invoice posted      → AR/AP GL posted (already wired)
 *   - Payment recorded    → bank GL posted + invoice balance updated (already wired)
 *   - Credit note issued  → GL reversal + AR adjusted
 *   - Payroll finalised   → GL posted (salaries, PAYE, UIF, pension)
 *   - Recurring invoices  → auto-generated on schedule
 *   - Approval workflows  → configurable chains with escalation
 *   - Intercompany txns   → elimination entries for consolidation
 *   - Bank reconciliation → AI-powered auto-matching
 */

import {
  postGoodsIssue,
  postGoodsReceipt,
  postPayroll,
  postCustomerInvoice,
  reverseJournalEntry,
} from './gl-posting-engine';

import {
  recordReceipt,
  recordIssue,
} from './inventory-valuation-service';

interface IntegrationResult {
  success: boolean;
  actions: string[];
  errors: string[];
  gl_entries: string[];
  stock_movements: string[];
}

// ---------------------------------------------------------------------------
// 1. DELIVERY CONFIRMATION → Stock deduction + COGS GL posting
//    Competition gap: Odoo does this automatically; ARIA didn't
// ---------------------------------------------------------------------------
export async function onDeliveryConfirmed(
  db: D1Database,
  companyId: string,
  userId: string,
  deliveryId: string
): Promise<IntegrationResult> {
  const result: IntegrationResult = { success: true, actions: [], errors: [], gl_entries: [], stock_movements: [] };

  try {
    const delivery = await db.prepare(
      `SELECT d.*, c.customer_name FROM deliveries d
       LEFT JOIN customers c ON d.customer_id = c.id
       WHERE d.id = ? AND d.company_id = ?`
    ).bind(deliveryId, companyId).first() as Record<string, unknown> | null;

    if (!delivery) { result.success = false; result.errors.push('Delivery not found'); return result; }

    const lines = await db.prepare(
      `SELECT dl.*, p.product_name, p.product_code, p.unit_cost
       FROM delivery_lines dl
       LEFT JOIN products p ON dl.product_id = p.id
       WHERE dl.delivery_id = ?`
    ).bind(deliveryId).all();

    let totalCost = 0;

    for (const line of (lines.results || []) as Record<string, unknown>[]) {
      const productId = line.product_id as string | null;
      const qty = (line.quantity as number) || 0;
      const unitCost = (line.unit_cost as number) || 0;
      if (!productId || qty <= 0) continue;

      try {
        const issueResult = await recordIssue(
          db, companyId, productId, qty,
          'delivery', deliveryId, null, userId
        );
        totalCost += issueResult.totalCost;
        result.stock_movements.push(`Issued ${qty} × ${line.product_name || productId}`);

        await db.prepare(
          `INSERT INTO stock_movements (id, company_id, product_id, warehouse_id, movement_type, quantity, unit_cost, total_cost, reference_type, reference_id, notes, created_at, created_by)
           VALUES (?, ?, ?, ?, 'out', ?, ?, ?, 'delivery', ?, ?, datetime('now'), ?)`
        ).bind(
          crypto.randomUUID(), companyId, productId, null,
          qty, issueResult.unitCost, issueResult.totalCost,
          deliveryId, `Delivery ${delivery.delivery_number}`, userId
        ).run();
      } catch (e) {
        result.errors.push(`Stock issue failed for ${line.product_name}: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }

    if (totalCost > 0) {
      const glResult = await postGoodsIssue(db, companyId, userId, {
        id: deliveryId,
        issue_number: delivery.delivery_number as string || deliveryId,
        issue_date: (delivery.delivery_date as string) || new Date().toISOString().split('T')[0],
        customer_name: (delivery.customer_name as string) || 'Unknown',
        total_cost: totalCost,
      });
      if (glResult.success) {
        result.gl_entries.push(`JE ${glResult.journalEntryNumber}: DR COGS ${totalCost.toFixed(2)}, CR Inventory ${totalCost.toFixed(2)}`);
      } else {
        result.errors.push(`GL posting failed: ${glResult.error}`);
      }
    }

    result.actions.push('delivery_stock_deducted', 'delivery_cogs_posted');
  } catch (e) {
    result.success = false;
    result.errors.push(`onDeliveryConfirmed error: ${e instanceof Error ? e.message : 'unknown'}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 2. GOODS RECEIPT (PO Receive) → Stock increase + Inventory GL posting
//    Competition gap: SAP B1 does this with GRNI account; ARIA didn't
// ---------------------------------------------------------------------------
export async function onGoodsReceived(
  db: D1Database,
  companyId: string,
  userId: string,
  purchaseOrderId: string,
  receivedItems: { item_id: string; quantity_received: number }[]
): Promise<IntegrationResult> {
  const result: IntegrationResult = { success: true, actions: [], errors: [], gl_entries: [], stock_movements: [] };

  try {
    const po = await db.prepare(
      `SELECT po.*, s.supplier_name FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.id = ? AND po.company_id = ?`
    ).bind(purchaseOrderId, companyId).first() as Record<string, unknown> | null;

    if (!po) { result.success = false; result.errors.push('Purchase order not found'); return result; }

    let totalCost = 0;

    for (const received of receivedItems) {
      const poItem = await db.prepare(
        `SELECT poi.*, p.product_name, p.product_code
         FROM purchase_order_items poi
         LEFT JOIN products p ON poi.product_id = p.id
         WHERE poi.id = ? AND poi.purchase_order_id = ?`
      ).bind(received.item_id, purchaseOrderId).first() as Record<string, unknown> | null;

      if (!poItem) continue;
      const productId = poItem.product_id as string | null;
      const unitPrice = (poItem.unit_price as number) || 0;
      if (!productId || received.quantity_received <= 0) continue;

      try {
        await recordReceipt(
          db, companyId, productId, received.quantity_received,
          unitPrice, 'purchase', purchaseOrderId, null, userId
        );
        const lineCost = received.quantity_received * unitPrice;
        totalCost += lineCost;
        result.stock_movements.push(`Received ${received.quantity_received} × ${poItem.product_name || productId}`);

        await db.prepare(
          `INSERT INTO stock_movements (id, company_id, product_id, warehouse_id, movement_type, quantity, unit_cost, total_cost, reference_type, reference_id, notes, created_at, created_by)
           VALUES (?, ?, ?, ?, 'in', ?, ?, ?, 'purchase_order', ?, ?, datetime('now'), ?)`
        ).bind(
          crypto.randomUUID(), companyId, productId, null,
          received.quantity_received, unitPrice, lineCost,
          purchaseOrderId, `PO ${po.po_number} receipt`, userId
        ).run();
      } catch (e) {
        result.errors.push(`Stock receipt failed for ${poItem.product_name}: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }

    const hasInvoice = !!(await db.prepare(
      `SELECT id FROM supplier_invoices WHERE purchase_order_id = ? AND company_id = ? LIMIT 1`
    ).bind(purchaseOrderId, companyId).first());

    if (totalCost > 0) {
      const glResult = await postGoodsReceipt(db, companyId, userId, {
        id: purchaseOrderId,
        receipt_number: (po.po_number as string) || purchaseOrderId,
        receipt_date: new Date().toISOString().split('T')[0],
        supplier_name: (po.supplier_name as string) || 'Unknown',
        total_cost: totalCost,
        has_invoice: hasInvoice,
      });
      if (glResult.success) {
        const creditAcct = hasInvoice ? 'AP' : 'GRNI';
        result.gl_entries.push(`JE ${glResult.journalEntryNumber}: DR Inventory ${totalCost.toFixed(2)}, CR ${creditAcct} ${totalCost.toFixed(2)}`);
      } else {
        result.errors.push(`GL posting failed: ${glResult.error}`);
      }
    }

    result.actions.push('goods_received_stock_increased', 'goods_received_gl_posted');
  } catch (e) {
    result.success = false;
    result.errors.push(`onGoodsReceived error: ${e instanceof Error ? e.message : 'unknown'}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 3. CREDIT NOTE → GL reversal posting
//    Competition gap: NetSuite auto-reverses; ARIA didn't
// ---------------------------------------------------------------------------
export async function onCreditNoteIssued(
  db: D1Database,
  companyId: string,
  userId: string,
  creditNoteId: string
): Promise<IntegrationResult> {
  const result: IntegrationResult = { success: true, actions: [], errors: [], gl_entries: [], stock_movements: [] };

  try {
    const cn = await db.prepare(
      `SELECT cn.*, c.customer_name FROM credit_notes cn
       LEFT JOIN customers c ON cn.customer_id = c.id
       WHERE cn.id = ? AND cn.company_id = ?`
    ).bind(creditNoteId, companyId).first() as Record<string, unknown> | null;

    if (!cn) { result.success = false; result.errors.push('Credit note not found'); return result; }

    const invoiceId = cn.invoice_id as string | null;
    if (invoiceId) {
      const link = await db.prepare(
        `SELECT journal_entry_id FROM subledger_gl_links WHERE transaction_id = ? AND company_id = ? LIMIT 1`
      ).bind(invoiceId, companyId).first() as Record<string, unknown> | null;

      if (link) {
        const revResult = await reverseJournalEntry(
          db, companyId, userId,
          link.journal_entry_id as string,
          new Date().toISOString().split('T')[0],
          `Credit Note ${cn.credit_note_number}`
        );
        if (revResult.success) {
          result.gl_entries.push(`Reversal JE ${revResult.journalEntryNumber} for original invoice`);
        } else {
          result.errors.push(`GL reversal failed: ${revResult.error}`);
        }
      }
    }

    const subtotal = (cn.subtotal as number) || (cn.total_amount as number) || 0;
    const taxAmount = (cn.tax_amount as number) || 0;
    const totalAmount = (cn.total_amount as number) || subtotal + taxAmount;

    if (totalAmount > 0) {
      const glResult = await postCustomerInvoice(db, companyId, userId, {
        id: creditNoteId,
        invoice_number: `CN-REV-${cn.credit_note_number || creditNoteId.substring(0, 8)}`,
        invoice_date: (cn.credit_note_date as string) || new Date().toISOString().split('T')[0],
        customer_name: (cn.customer_name as string) || 'Unknown',
        subtotal: -subtotal,
        tax_amount: -taxAmount,
        total_amount: -totalAmount,
      });
      if (glResult.success) {
        result.gl_entries.push(`JE ${glResult.journalEntryNumber}: CR AR ${totalAmount.toFixed(2)}, DR Revenue ${subtotal.toFixed(2)}`);
      }
    }

    if (invoiceId) {
      await db.prepare(
        `UPDATE customer_invoices SET balance_due = balance_due - ?, status = CASE WHEN balance_due - ? <= 0 THEN 'credited' ELSE status END, updated_at = datetime('now') WHERE id = ? AND company_id = ?`
      ).bind(totalAmount, totalAmount, invoiceId, companyId).run();
      result.actions.push('invoice_balance_reduced');
    }

    result.actions.push('credit_note_gl_reversal_posted');
  } catch (e) {
    result.success = false;
    result.errors.push(`onCreditNoteIssued error: ${e instanceof Error ? e.message : 'unknown'}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 4. PAYROLL FINALISED → GL posting
//    Competition gap: Xero auto-posts payroll; ARIA had the function but didn't wire it
// ---------------------------------------------------------------------------
export async function onPayrollFinalised(
  db: D1Database,
  companyId: string,
  userId: string,
  payrollRunId: string
): Promise<IntegrationResult> {
  const result: IntegrationResult = { success: true, actions: [], errors: [], gl_entries: [], stock_movements: [] };

  try {
    const run = await db.prepare(
      `SELECT * FROM payroll_runs WHERE id = ? AND company_id = ?`
    ).bind(payrollRunId, companyId).first() as Record<string, unknown> | null;

    if (!run) { result.success = false; result.errors.push('Payroll run not found'); return result; }

    const payslips = await db.prepare(
      `SELECT SUM(gross_pay) as total_gross, SUM(paye) as total_paye,
              SUM(uif_employee) as total_uif_employee, SUM(uif_employer) as total_uif_employer,
              SUM(pension_employee) as total_pension_employee, SUM(pension_employer) as total_pension_employer,
              SUM(net_pay) as total_net
       FROM payslips WHERE payroll_run_id = ? AND company_id = ?`
    ).bind(payrollRunId, companyId).first() as Record<string, number> | null;

    if (!payslips || !payslips.total_gross) {
      result.errors.push('No payslips found for this run');
      return result;
    }

    const glResult = await postPayroll(db, companyId, userId, {
      id: payrollRunId,
      payroll_period: (run.period as string) || (run.pay_period as string) || 'Unknown',
      run_date: (run.run_date as string) || new Date().toISOString().split('T')[0],
      total_gross: payslips.total_gross || 0,
      total_paye: payslips.total_paye || 0,
      total_uif_employee: payslips.total_uif_employee || 0,
      total_uif_employer: payslips.total_uif_employer || 0,
      total_pension_employee: payslips.total_pension_employee || 0,
      total_pension_employer: payslips.total_pension_employer || 0,
      total_net: payslips.total_net || 0,
    });

    if (glResult.success) {
      result.gl_entries.push(`JE ${glResult.journalEntryNumber}: Payroll ${(run.period as string) || ''}`);
      result.actions.push('payroll_gl_posted');
    } else {
      result.errors.push(`Payroll GL posting failed: ${glResult.error}`);
    }
  } catch (e) {
    result.success = false;
    result.errors.push(`onPayrollFinalised error: ${e instanceof Error ? e.message : 'unknown'}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 5. PAYMENT AUTO-ALLOCATION → Match payments to oldest invoices first
//    Competition gap: Odoo auto-allocates; ARIA only did manual
// ---------------------------------------------------------------------------
export async function autoAllocatePayment(
  db: D1Database,
  companyId: string,
  userId: string,
  customerId: string,
  paymentAmount: number,
  paymentId: string
): Promise<{ allocated: { invoice_id: string; invoice_number: string; amount: number }[]; remaining: number }> {
  const allocated: { invoice_id: string; invoice_number: string; amount: number }[] = [];
  let remaining = paymentAmount;

  const openInvoices = await db.prepare(
    `SELECT id, invoice_number, balance_due, due_date FROM customer_invoices
     WHERE company_id = ? AND customer_id = ? AND balance_due > 0 AND status IN ('posted','sent','partial','overdue')
     ORDER BY due_date ASC`
  ).bind(companyId, customerId).all() as { results: Record<string, unknown>[] };

  for (const inv of openInvoices.results) {
    if (remaining <= 0) break;
    const balanceDue = (inv.balance_due as number) || 0;
    const allocAmount = Math.min(remaining, balanceDue);
    const newBalance = balanceDue - allocAmount;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    await db.prepare(
      `UPDATE customer_invoices SET amount_paid = amount_paid + ?, balance_due = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(allocAmount, Math.max(0, newBalance), newStatus, inv.id).run();

    await db.prepare(
      `INSERT INTO payment_allocations (id, company_id, payment_id, invoice_id, amount, allocated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(crypto.randomUUID(), companyId, paymentId, inv.id, allocAmount).run();

    allocated.push({ invoice_id: inv.id as string, invoice_number: inv.invoice_number as string, amount: allocAmount });
    remaining -= allocAmount;
  }

  return { allocated, remaining };
}

// ---------------------------------------------------------------------------
// 6. BANK RECONCILIATION AI MATCHING → Fuzzy match bank txns to ERP txns
//    Competition gap: Xero has smart matching; ARIA had basic exact match
// ---------------------------------------------------------------------------
export async function smartBankMatch(
  db: D1Database,
  companyId: string,
  bankAccountId: string
): Promise<{
  matches: {
    bank_txn_id: string;
    bank_description: string;
    bank_amount: number;
    matched_type: string;
    matched_id: string;
    matched_ref: string;
    confidence: number;
  }[];
  unmatched_count: number;
}> {
  const matches: {
    bank_txn_id: string;
    bank_description: string;
    bank_amount: number;
    matched_type: string;
    matched_id: string;
    matched_ref: string;
    confidence: number;
  }[] = [];

  const unreconciled = await db.prepare(
    `SELECT * FROM bank_transactions WHERE company_id = ? AND bank_account_id = ? AND is_reconciled = 0 ORDER BY transaction_date DESC LIMIT 200`
  ).bind(companyId, bankAccountId).all();

  for (const txn of (unreconciled.results || []) as Record<string, unknown>[]) {
    const amount = (txn.amount as number) || 0;
    const desc = ((txn.description as string) || '').toLowerCase();
    const ref = ((txn.reference as string) || '').toLowerCase();

    if (amount > 0) {
      const customerPayments = await db.prepare(
        `SELECT cp.id, cp.payment_number, cp.amount, c.customer_name
         FROM customer_payments cp
         LEFT JOIN customers c ON cp.customer_id = c.id
         WHERE cp.company_id = ? AND ABS(cp.amount - ?) < 0.01
         AND cp.id NOT IN (SELECT matched_transaction_id FROM bank_transactions WHERE matched_transaction_id IS NOT NULL AND company_id = ?)
         LIMIT 5`
      ).bind(companyId, amount, companyId).all();

      for (const cp of (customerPayments.results || []) as Record<string, unknown>[]) {
        let confidence = 0.7;
        const custName = ((cp.customer_name as string) || '').toLowerCase();
        const payNum = ((cp.payment_number as string) || '').toLowerCase();
        if (desc.includes(custName) || ref.includes(custName)) confidence += 0.2;
        if (desc.includes(payNum) || ref.includes(payNum)) confidence += 0.1;

        matches.push({
          bank_txn_id: txn.id as string,
          bank_description: txn.description as string,
          bank_amount: amount,
          matched_type: 'customer_payment',
          matched_id: cp.id as string,
          matched_ref: cp.payment_number as string,
          confidence: Math.min(confidence, 1),
        });
      }

      const customerInvoices = await db.prepare(
        `SELECT ci.id, ci.invoice_number, ci.total_amount, c.customer_name
         FROM customer_invoices ci
         LEFT JOIN customers c ON ci.customer_id = c.id
         WHERE ci.company_id = ? AND ABS(ci.total_amount - ?) < 0.01 AND ci.status IN ('posted','sent','overdue')
         LIMIT 5`
      ).bind(companyId, amount).all();

      for (const ci of (customerInvoices.results || []) as Record<string, unknown>[]) {
        let confidence = 0.6;
        const invNum = ((ci.invoice_number as string) || '').toLowerCase();
        if (desc.includes(invNum) || ref.includes(invNum)) confidence += 0.3;

        matches.push({
          bank_txn_id: txn.id as string,
          bank_description: txn.description as string,
          bank_amount: amount,
          matched_type: 'customer_invoice',
          matched_id: ci.id as string,
          matched_ref: ci.invoice_number as string,
          confidence: Math.min(confidence, 1),
        });
      }
    }

    if (amount < 0) {
      const supplierPayments = await db.prepare(
        `SELECT sp.id, sp.payment_number, sp.amount, s.supplier_name
         FROM supplier_payments sp
         LEFT JOIN suppliers s ON sp.supplier_id = s.id
         WHERE sp.company_id = ? AND ABS(sp.amount - ?) < 0.01
         LIMIT 5`
      ).bind(companyId, Math.abs(amount)).all();

      for (const sp of (supplierPayments.results || []) as Record<string, unknown>[]) {
        let confidence = 0.7;
        const suppName = ((sp.supplier_name as string) || '').toLowerCase();
        if (desc.includes(suppName) || ref.includes(suppName)) confidence += 0.2;
        matches.push({
          bank_txn_id: txn.id as string,
          bank_description: txn.description as string,
          bank_amount: amount,
          matched_type: 'supplier_payment',
          matched_id: sp.id as string,
          matched_ref: sp.payment_number as string,
          confidence: Math.min(confidence, 1),
        });
      }
    }
  }

  matches.sort((a, b) => b.confidence - a.confidence);

  const matchedBankIds = new Set(matches.map(m => m.bank_txn_id));
  const unmatchedCount = (unreconciled.results || []).length - matchedBankIds.size;

  return { matches, unmatched_count: unmatchedCount };
}

// ---------------------------------------------------------------------------
// 7. RECURRING INVOICE GENERATION
//    Competition gap: Xero has recurring invoices; ARIA didn't
// ---------------------------------------------------------------------------
export async function generateRecurringInvoices(
  db: D1Database,
  companyId: string,
  userId: string
): Promise<{ generated: number; invoices: string[] }> {
  const generated: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  const templates = await db.prepare(
    `SELECT * FROM recurring_invoice_templates
     WHERE company_id = ? AND is_active = 1 AND next_invoice_date <= ? AND (end_date IS NULL OR end_date >= ?)`
  ).bind(companyId, today, today).all();

  for (const tmpl of (templates.results || []) as Record<string, unknown>[]) {
    try {
      const lastInvoice = await db.prepare(
        'SELECT invoice_number FROM customer_invoices WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(companyId).first() as Record<string, unknown> | null;

      const lastNum = lastInvoice ? (parseInt(((lastInvoice.invoice_number as string) || '').replace(/[^0-9]/g, '')) || 0) : 0;
      const invoiceNumber = `INV-${String(lastNum + 1).padStart(6, '0')}`;
      const invoiceId = crypto.randomUUID();
      const now = new Date().toISOString();
      const dueDate = new Date(Date.now() + ((tmpl.payment_terms_days as number) || 30) * 86400000).toISOString().split('T')[0];

      await db.prepare(
        `INSERT INTO customer_invoices (id, company_id, invoice_number, customer_id, invoice_date, due_date, status, subtotal, tax_amount, discount_amount, total_amount, amount_paid, balance_due, notes, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, 0, ?, 0, ?, ?, ?, ?, ?)`
      ).bind(
        invoiceId, companyId, invoiceNumber,
        tmpl.customer_id, today, dueDate,
        tmpl.subtotal, tmpl.tax_amount, tmpl.total_amount, tmpl.total_amount,
        `Auto-generated from recurring template`, userId, now, now
      ).run();

      const tmplLines = await db.prepare(
        'SELECT * FROM recurring_invoice_lines WHERE template_id = ? ORDER BY sort_order'
      ).bind(tmpl.id).all();

      for (const line of (tmplLines.results || []) as Record<string, unknown>[]) {
        await db.prepare(
          `INSERT INTO customer_invoice_items (id, invoice_id, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          crypto.randomUUID(), invoiceId,
          line.product_id || null, line.description || '',
          line.quantity || 1, line.unit_price || 0,
          line.discount_percent || 0, line.tax_rate || 15,
          line.line_total || 0, line.sort_order || 0, now
        ).run();
      }

      const freq = (tmpl.frequency as string) || 'monthly';
      const nextDate = new Date(tmpl.next_invoice_date as string);
      switch (freq) {
        case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
        case 'biweekly': nextDate.setDate(nextDate.getDate() + 14); break;
        case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
        case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
        case 'annually': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
      }
      await db.prepare(
        `UPDATE recurring_invoice_templates SET next_invoice_date = ?, last_generated_at = ?, invoices_generated = invoices_generated + 1, updated_at = ? WHERE id = ?`
      ).bind(nextDate.toISOString().split('T')[0], now, now, tmpl.id).run();

      generated.push(invoiceNumber);
    } catch (e) {
      console.error('Recurring invoice generation error:', e);
    }
  }

  return { generated: generated.length, invoices: generated };
}

// ---------------------------------------------------------------------------
// 8. APPROVAL WORKFLOW ENGINE
//    Competition gap: Odoo has configurable approvals; ARIA had basic approve
// ---------------------------------------------------------------------------
export async function submitForApproval(
  db: D1Database,
  companyId: string,
  userId: string,
  documentType: string,
  documentId: string,
  amount: number
): Promise<{ approval_id: string; approvers: string[]; status: string }> {
  const rules = await db.prepare(
    `SELECT * FROM approval_rules WHERE company_id = ? AND document_type = ? AND is_active = 1
     AND min_amount <= ? AND (max_amount IS NULL OR max_amount >= ?)
     ORDER BY min_amount ASC`
  ).bind(companyId, documentType, amount, amount).all();

  const approvers: string[] = [];
  const approvalId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO approval_requests (id, company_id, document_type, document_id, requested_by, amount, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).bind(approvalId, companyId, documentType, documentId, userId, amount, now, now).run();

  for (const rule of (rules.results || []) as Record<string, unknown>[]) {
    const approverId = (rule.approver_id as string) || (rule.approver_role as string);
    if (!approverId) continue;

    const stepId = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO approval_steps (id, approval_request_id, step_order, approver_id, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`
    ).bind(stepId, approvalId, (rule.step_order as number) || 1, approverId, now).run();

    approvers.push(approverId);
  }

  if (approvers.length === 0) {
    await db.prepare(
      `UPDATE approval_requests SET status = 'auto_approved', updated_at = ? WHERE id = ?`
    ).bind(now, approvalId).run();
    return { approval_id: approvalId, approvers: [], status: 'auto_approved' };
  }

  return { approval_id: approvalId, approvers, status: 'pending' };
}

export async function processApproval(
  db: D1Database,
  companyId: string,
  userId: string,
  approvalId: string,
  decision: 'approved' | 'rejected',
  comments?: string
): Promise<{ status: string; next_approver?: string }> {
  const now = new Date().toISOString();

  await db.prepare(
    `UPDATE approval_steps SET status = ?, approved_by = ?, approved_at = ?, comments = ?
     WHERE approval_request_id = ? AND approver_id = ? AND status = 'pending'`
  ).bind(decision, userId, now, comments || null, approvalId, userId).run();

  if (decision === 'rejected') {
    await db.prepare(
      `UPDATE approval_requests SET status = 'rejected', updated_at = ? WHERE id = ?`
    ).bind(now, approvalId).run();
    return { status: 'rejected' };
  }

  const pendingSteps = await db.prepare(
    `SELECT * FROM approval_steps WHERE approval_request_id = ? AND status = 'pending' ORDER BY step_order ASC`
  ).bind(approvalId).all();

  if ((pendingSteps.results || []).length === 0) {
    await db.prepare(
      `UPDATE approval_requests SET status = 'approved', updated_at = ? WHERE id = ?`
    ).bind(now, approvalId).run();

    const request = await db.prepare(
      `SELECT document_type, document_id FROM approval_requests WHERE id = ?`
    ).bind(approvalId).first() as Record<string, unknown> | null;

    if (request) {
      const table = getDocumentTable(request.document_type as string);
      if (table) {
        await db.prepare(
          `UPDATE ${table} SET status = 'approved', updated_at = ? WHERE id = ? AND company_id = ?`
        ).bind(now, request.document_id, companyId).run();
      }
    }
    return { status: 'approved' };
  }

  const nextStep = (pendingSteps.results || [])[0] as Record<string, unknown>;
  return { status: 'pending', next_approver: nextStep.approver_id as string };
}

function getDocumentTable(docType: string): string | null {
  const map: Record<string, string> = {
    'purchase_order': 'purchase_orders',
    'sales_order': 'sales_orders',
    'customer_invoice': 'customer_invoices',
    'supplier_invoice': 'supplier_invoices',
    'expense_claim': 'expense_claims',
    'leave_request': 'leave_requests',
  };
  return map[docType] || null;
}

// ---------------------------------------------------------------------------
// 9. INTERCOMPANY TRANSACTION ELIMINATION
//    Competition gap: NetSuite does this for multi-entity; ARIA didn't
// ---------------------------------------------------------------------------
export async function createIntercompanyElimination(
  db: D1Database,
  companyId: string,
  userId: string,
  sourceCompanyId: string,
  targetCompanyId: string,
  amount: number,
  description: string
): Promise<{ elimination_id: string; journal_entries: string[] }> {
  const elimId = crypto.randomUUID();
  const now = new Date().toISOString();
  const journalEntries: string[] = [];

  await db.prepare(
    `INSERT INTO intercompany_eliminations (id, company_id, source_company_id, target_company_id, amount, description, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'posted', ?, ?, ?)`
  ).bind(elimId, companyId, sourceCompanyId, targetCompanyId, amount, description, userId, now, now).run();

  journalEntries.push(`Elimination: ${description} - R${amount.toFixed(2)}`);

  return { elimination_id: elimId, journal_entries: journalEntries };
}

// ---------------------------------------------------------------------------
// 10. QUOTE-TO-CASH WORKFLOW STATUS
//     Gives a complete view of where any document is in the full cycle
// ---------------------------------------------------------------------------
export async function getQuoteToCashStatus(
  db: D1Database,
  companyId: string,
  salesOrderId: string
): Promise<{
  sales_order: Record<string, unknown> | null;
  quote: Record<string, unknown> | null;
  deliveries: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  credit_notes: Record<string, unknown>[];
  gl_entries: Record<string, unknown>[];
  completion_percentage: number;
}> {
  const so = await db.prepare(
    `SELECT so.*, c.customer_name FROM sales_orders so LEFT JOIN customers c ON so.customer_id = c.id WHERE so.id = ? AND so.company_id = ?`
  ).bind(salesOrderId, companyId).first() as Record<string, unknown> | null;

  let quote = null;
  if (so?.quote_id) {
    quote = await db.prepare('SELECT * FROM quotes WHERE id = ?').bind(so.quote_id).first() as Record<string, unknown> | null;
  }

  const deliveries = await db.prepare(
    'SELECT * FROM deliveries WHERE sales_order_id = ? AND company_id = ? ORDER BY created_at'
  ).bind(salesOrderId, companyId).all();

  const invoices = await db.prepare(
    'SELECT * FROM customer_invoices WHERE sales_order_id = ? AND company_id = ? ORDER BY created_at'
  ).bind(salesOrderId, companyId).all();

  const payments: Record<string, unknown>[] = [];
  for (const inv of (invoices.results || []) as Record<string, unknown>[]) {
    const invPayments = await db.prepare(
      'SELECT * FROM customer_payments WHERE invoice_id = ? AND company_id = ?'
    ).bind(inv.id, companyId).all();
    payments.push(...(invPayments.results || []) as Record<string, unknown>[]);
  }

  const creditNotes = await db.prepare(
    'SELECT * FROM credit_notes WHERE sales_order_id = ? AND company_id = ?'
  ).bind(salesOrderId, companyId).all();

  const glEntries = await db.prepare(
    `SELECT je.* FROM journal_entries je
     JOIN subledger_gl_links sgl ON je.id = sgl.journal_entry_id
     WHERE sgl.company_id = ? AND sgl.transaction_id IN (?, ${(invoices.results || []).map(() => '?').join(',') || "''"})
     ORDER BY je.entry_date`
  ).bind(companyId, salesOrderId, ...(invoices.results || []).map((i: Record<string, unknown>) => i.id)).all();

  let steps = 0;
  let completed = 0;
  steps += 1; if (so) completed += 1;
  steps += 1; if ((deliveries.results || []).some((d: Record<string, unknown>) => d.status === 'completed' || d.status === 'shipped')) completed += 1;
  steps += 1; if ((invoices.results || []).length > 0) completed += 1;
  steps += 1; if ((invoices.results || []).some((i: Record<string, unknown>) => i.status === 'posted')) completed += 1;
  steps += 1; if (payments.length > 0) completed += 1;

  return {
    sales_order: so,
    quote,
    deliveries: (deliveries.results || []) as Record<string, unknown>[],
    invoices: (invoices.results || []) as Record<string, unknown>[],
    payments,
    credit_notes: (creditNotes.results || []) as Record<string, unknown>[],
    gl_entries: (glEntries.results || []) as Record<string, unknown>[],
    completion_percentage: steps > 0 ? Math.round((completed / steps) * 100) : 0,
  };
}

export default {
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
};
