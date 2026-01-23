/**
 * Recurring Invoice Service
 * 
 * Provides functionality for:
 * - Creating recurring invoice templates
 * - Scheduling automatic invoice generation
 * - Managing recurring invoice cycles
 */

import { D1Database } from '@cloudflare/workers-types';

export interface RecurringInvoice {
  id: string;
  company_id: string;
  customer_id: string;
  template_name: string;
  frequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually';
  start_date: string;
  end_date: string | null;
  next_invoice_date: string;
  last_invoice_date: string | null;
  invoice_prefix: string;
  payment_terms_days: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  is_active: boolean;
  auto_send: boolean;
  invoices_generated: number;
  created_at: string;
  updated_at: string;
}

export interface RecurringInvoiceItem {
  id: string;
  recurring_invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
  sort_order: number;
}

// Calculate next invoice date based on frequency
export function calculateNextDate(currentDate: string, frequency: RecurringInvoice['frequency']): string {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'fortnightly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'annually':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date.toISOString().split('T')[0];
}

// Create a recurring invoice template
export async function createRecurringInvoice(
  db: D1Database,
  companyId: string,
  input: {
    customer_id: string;
    template_name: string;
    frequency: RecurringInvoice['frequency'];
    start_date: string;
    end_date?: string;
    invoice_prefix?: string;
    payment_terms_days?: number;
    notes?: string;
    auto_send?: boolean;
    items: Array<{
      product_id?: string;
      description: string;
      quantity: number;
      unit_price: number;
      tax_rate?: number;
    }>;
  }
): Promise<RecurringInvoice> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Calculate totals from items
  let subtotal = 0;
  let taxAmount = 0;
  
  for (const item of input.items) {
    const lineTotal = item.quantity * item.unit_price;
    const lineTax = lineTotal * ((item.tax_rate || 15) / 100);
    subtotal += lineTotal;
    taxAmount += lineTax;
  }
  
  const totalAmount = subtotal + taxAmount;
  const avgTaxRate = subtotal > 0 ? (taxAmount / subtotal) * 100 : 15;
  
  await db.prepare(`
    INSERT INTO recurring_invoices (
      id, company_id, customer_id, template_name, frequency,
      start_date, end_date, next_invoice_date, invoice_prefix,
      payment_terms_days, subtotal, tax_rate, tax_amount, total_amount,
      notes, is_active, auto_send, invoices_generated, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0, ?, ?)
  `).bind(
    id,
    companyId,
    input.customer_id,
    input.template_name,
    input.frequency,
    input.start_date,
    input.end_date || null,
    input.start_date, // next_invoice_date starts at start_date
    input.invoice_prefix || 'INV',
    input.payment_terms_days || 30,
    subtotal,
    avgTaxRate,
    taxAmount,
    totalAmount,
    input.notes || null,
    input.auto_send !== false ? 1 : 0,
    now,
    now
  ).run();
  
  // Insert items
  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i];
    const lineTotal = item.quantity * item.unit_price;
    
    await db.prepare(`
      INSERT INTO recurring_invoice_items (
        id, recurring_invoice_id, product_id, description,
        quantity, unit_price, tax_rate, line_total, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      id,
      item.product_id || null,
      item.description,
      item.quantity,
      item.unit_price,
      item.tax_rate || 15,
      lineTotal,
      i + 1
    ).run();
  }
  
  return {
    id,
    company_id: companyId,
    customer_id: input.customer_id,
    template_name: input.template_name,
    frequency: input.frequency,
    start_date: input.start_date,
    end_date: input.end_date || null,
    next_invoice_date: input.start_date,
    last_invoice_date: null,
    invoice_prefix: input.invoice_prefix || 'INV',
    payment_terms_days: input.payment_terms_days || 30,
    subtotal,
    tax_rate: avgTaxRate,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    notes: input.notes || null,
    is_active: true,
    auto_send: input.auto_send !== false,
    invoices_generated: 0,
    created_at: now,
    updated_at: now
  };
}

// Get recurring invoices for a company
export async function listRecurringInvoices(
  db: D1Database,
  companyId: string,
  options?: { customerId?: string; isActive?: boolean }
): Promise<RecurringInvoice[]> {
  let query = `
    SELECT ri.*, c.customer_name
    FROM recurring_invoices ri
    LEFT JOIN customers c ON ri.customer_id = c.id
    WHERE ri.company_id = ?
  `;
  const params: any[] = [companyId];
  
  if (options?.customerId) {
    query += ' AND ri.customer_id = ?';
    params.push(options.customerId);
  }
  
  if (options?.isActive !== undefined) {
    query += ' AND ri.is_active = ?';
    params.push(options.isActive ? 1 : 0);
  }
  
  query += ' ORDER BY ri.next_invoice_date ASC';
  
  const result = await db.prepare(query).bind(...params).all();
  return (result.results || []) as unknown as RecurringInvoice[];
}

// Get recurring invoice by ID with items
export async function getRecurringInvoice(
  db: D1Database,
  companyId: string,
  recurringInvoiceId: string
): Promise<{ invoice: RecurringInvoice; items: RecurringInvoiceItem[] } | null> {
  const invoice = await db.prepare(`
    SELECT ri.*, c.customer_name, c.email as customer_email
    FROM recurring_invoices ri
    LEFT JOIN customers c ON ri.customer_id = c.id
    WHERE ri.id = ? AND ri.company_id = ?
  `).bind(recurringInvoiceId, companyId).first();
  
  if (!invoice) return null;
  
  const items = await db.prepare(`
    SELECT * FROM recurring_invoice_items
    WHERE recurring_invoice_id = ?
    ORDER BY sort_order
  `).bind(recurringInvoiceId).all();
  
  return {
    invoice: invoice as unknown as RecurringInvoice,
    items: (items.results || []) as unknown as RecurringInvoiceItem[]
  };
}

// Generate invoice from recurring template
export async function generateInvoiceFromRecurring(
  db: D1Database,
  companyId: string,
  recurringInvoiceId: string,
  userId: string
): Promise<{ invoiceId: string; invoiceNumber: string }> {
  const recurring = await getRecurringInvoice(db, companyId, recurringInvoiceId);
  if (!recurring) throw new Error('Recurring invoice not found');
  
  const { invoice, items } = recurring;
  const now = new Date().toISOString();
  const invoiceDate = now.split('T')[0];
  
  // Calculate due date
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + invoice.payment_terms_days);
  
  // Generate invoice number
  const lastInvoice = await db.prepare(`
    SELECT invoice_number FROM customer_invoices
    WHERE company_id = ? ORDER BY created_at DESC LIMIT 1
  `).bind(companyId).first<{ invoice_number: string }>();
  
  const lastNum = lastInvoice ? parseInt(lastInvoice.invoice_number.split('-')[1] || '0') : 0;
  const invoiceNumber = `${invoice.invoice_prefix}-${String(lastNum + 1).padStart(5, '0')}`;
  
  const invoiceId = crypto.randomUUID();
  
  // Create the invoice
  await db.prepare(`
    INSERT INTO customer_invoices (
      id, company_id, invoice_number, customer_id, recurring_invoice_id,
      invoice_date, due_date, status, subtotal, tax_amount, discount_amount,
      total_amount, amount_paid, balance_due, notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, 0, ?, 0, ?, ?, ?, ?, ?)
  `).bind(
    invoiceId,
    companyId,
    invoiceNumber,
    invoice.customer_id,
    recurringInvoiceId,
    invoiceDate,
    dueDate.toISOString().split('T')[0],
    invoice.subtotal,
    invoice.tax_amount,
    invoice.total_amount,
    invoice.total_amount,
    invoice.notes,
    userId,
    now,
    now
  ).run();
  
  // Copy items to invoice
  for (const item of items) {
    await db.prepare(`
      INSERT INTO customer_invoice_items (
        id, invoice_id, product_id, description, quantity,
        unit_price, tax_rate, line_total, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      invoiceId,
      item.product_id,
      item.description,
      item.quantity,
      item.unit_price,
      item.tax_rate,
      item.line_total,
      item.sort_order
    ).run();
  }
  
  // Update recurring invoice
  const nextDate = calculateNextDate(invoice.next_invoice_date, invoice.frequency);
  
  await db.prepare(`
    UPDATE recurring_invoices SET
      last_invoice_date = ?,
      next_invoice_date = ?,
      invoices_generated = invoices_generated + 1,
      updated_at = ?
    WHERE id = ?
  `).bind(invoiceDate, nextDate, now, recurringInvoiceId).run();
  
  return { invoiceId, invoiceNumber };
}

// Process all due recurring invoices (called by cron)
export async function processDueRecurringInvoices(
  db: D1Database,
  systemUserId: string = 'system'
): Promise<{ processed: number; errors: string[] }> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get all active recurring invoices due today or earlier
  const dueInvoices = await db.prepare(`
    SELECT ri.*, c.customer_name
    FROM recurring_invoices ri
    LEFT JOIN customers c ON ri.customer_id = c.id
    WHERE ri.is_active = 1
      AND ri.next_invoice_date <= ?
      AND (ri.end_date IS NULL OR ri.end_date >= ?)
  `).bind(today, today).all();
  
  let processed = 0;
  const errors: string[] = [];
  
  for (const recurring of (dueInvoices.results || []) as any[]) {
    try {
      await generateInvoiceFromRecurring(db, recurring.company_id, recurring.id, systemUserId);
      processed++;
    } catch (error: any) {
      errors.push(`Failed to generate invoice for ${recurring.template_name}: ${error.message}`);
    }
  }
  
  return { processed, errors };
}

// Update recurring invoice
export async function updateRecurringInvoice(
  db: D1Database,
  companyId: string,
  recurringInvoiceId: string,
  updates: Partial<{
    template_name: string;
    frequency: RecurringInvoice['frequency'];
    end_date: string | null;
    payment_terms_days: number;
    notes: string;
    is_active: boolean;
    auto_send: boolean;
  }>
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.template_name !== undefined) {
    fields.push('template_name = ?');
    values.push(updates.template_name);
  }
  if (updates.frequency !== undefined) {
    fields.push('frequency = ?');
    values.push(updates.frequency);
  }
  if (updates.end_date !== undefined) {
    fields.push('end_date = ?');
    values.push(updates.end_date);
  }
  if (updates.payment_terms_days !== undefined) {
    fields.push('payment_terms_days = ?');
    values.push(updates.payment_terms_days);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes);
  }
  if (updates.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.is_active ? 1 : 0);
  }
  if (updates.auto_send !== undefined) {
    fields.push('auto_send = ?');
    values.push(updates.auto_send ? 1 : 0);
  }
  
  if (fields.length === 0) return;
  
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(recurringInvoiceId);
  values.push(companyId);
  
  await db.prepare(`
    UPDATE recurring_invoices SET ${fields.join(', ')}
    WHERE id = ? AND company_id = ?
  `).bind(...values).run();
}

// Delete recurring invoice
export async function deleteRecurringInvoice(
  db: D1Database,
  companyId: string,
  recurringInvoiceId: string
): Promise<void> {
  await db.prepare(`
    DELETE FROM recurring_invoice_items WHERE recurring_invoice_id = ?
  `).bind(recurringInvoiceId).run();
  
  await db.prepare(`
    DELETE FROM recurring_invoices WHERE id = ? AND company_id = ?
  `).bind(recurringInvoiceId, companyId).run();
}

export default {
  calculateNextDate,
  createRecurringInvoice,
  listRecurringInvoices,
  getRecurringInvoice,
  generateInvoiceFromRecurring,
  processDueRecurringInvoices,
  updateRecurringInvoice,
  deleteRecurringInvoice
};
