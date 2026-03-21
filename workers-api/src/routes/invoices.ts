/**
 * ARIA ERP - Invoices API Routes
 * Phase 2: Customer and Supplier Invoices CRUD
 */

import { Hono, Context } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';
import { postCustomerInvoice, postCustomerPayment, postSupplierInvoice, postSupplierPayment } from '../services/gl-posting-engine';
import { validateInvoice, validatePayment, validateStatusTransition, safeNumber } from '../services/business-rules';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT?: string;
}

interface CustomerInvoice {
  id: string;
  company_id: string;
  invoice_number: string;
  customer_id: string;
  sales_order_id: string | null;
  invoice_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface SupplierInvoice {
  id: string;
  company_id: string;
  invoice_number: string;
  supplier_id: string;
  purchase_order_id: string | null;
  invoice_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const invoices = new Hono<{ Bindings: Env }>();

// ========================================
// CUSTOMER INVOICES (AR)
// ========================================

// List customer invoices
invoices.get('/customer', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const status = c.req.query('status') || '';
    const customerId = c.req.query('customer_id') || '';
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('page_size') || '50');
    const offset = (page - 1) * pageSize;

    let countQuery = 'SELECT COUNT(*) as count FROM customer_invoices WHERE company_id = ?';
    const countParams: string[] = [companyId];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (customerId) {
      countQuery += ' AND customer_id = ?';
      countParams.push(customerId);
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();
    const totalCount = countResult?.count || 0;

    let query = `
      SELECT ci.*, c.customer_name, c.customer_code
      FROM customer_invoices ci
      LEFT JOIN customers c ON ci.customer_id = c.id
      WHERE ci.company_id = ?
    `;
    const params: (string | number)[] = [companyId];

    if (status) {
      query += ' AND ci.status = ?';
      params.push(status);
    }
    if (customerId) {
      query += ' AND ci.customer_id = ?';
      params.push(customerId);
    }

    query += ' ORDER BY ci.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all<CustomerInvoice & { customer_name: string; customer_code: string }>();

    return c.json({
      data: result.results.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer_id: inv.customer_id,
        customer_name: inv.customer_name,
        customer_code: inv.customer_code,
        sales_order_id: inv.sales_order_id,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        status: inv.status,
        subtotal: inv.subtotal,
        tax_amount: inv.tax_amount,
        total_amount: inv.total_amount,
        amount_paid: inv.amount_paid,
        balance_due: inv.balance_due,
        created_at: inv.created_at,
      })),
      meta: {
        page,
        page_size: pageSize,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('List customer invoices error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get single customer invoice
invoices.get('/customer/:id', async (c) => {
  try {
    const invoiceId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);

    if (!companyId) return c.json({ error: 'Authentication required' }, 401);

    const invoice = await c.env.DB.prepare(`
      SELECT ci.*, c.customer_name, c.customer_code, c.email as customer_email
      FROM customer_invoices ci
      LEFT JOIN customers c ON ci.customer_id = c.id
      WHERE ci.id = ? AND ci.company_id = ?
    `).bind(invoiceId, companyId).first<CustomerInvoice & { customer_name: string; customer_code: string; customer_email: string }>();

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    const items = await c.env.DB.prepare(`
      SELECT cii.*, p.product_name, p.product_code
      FROM customer_invoice_items cii
      LEFT JOIN products p ON cii.product_id = p.id
      WHERE cii.invoice_id = ?
      ORDER BY cii.sort_order
    `).bind(invoiceId).all();

    return c.json({
      ...invoice,
      items: items.results,
    });
  } catch (error) {
    console.error('Get customer invoice error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update customer invoice status
invoices.put('/customer/:id/status', async (c) => {
  try {
    const invoiceId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const userId = await getSecureUserId(c);
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json<{ status: string }>();

    const validStatuses = ['draft', 'sent', 'posted', 'partial', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(body.status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    // Get invoice details for GL posting
    const invoice = await c.env.DB.prepare(`
      SELECT ci.*, c.customer_name
      FROM customer_invoices ci
      LEFT JOIN customers c ON ci.customer_id = c.id
      WHERE ci.id = ? AND ci.company_id = ?
    `).bind(invoiceId, companyId).first<CustomerInvoice & { customer_name: string }>();

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    const result = await c.env.DB.prepare(`
      UPDATE customer_invoices SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?
    `).bind(body.status, new Date().toISOString(), invoiceId, companyId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Post to GL when status changes to 'posted'
    let glPostingResult = null;
    if (body.status === 'posted' && invoice.status !== 'posted') {
      glPostingResult = await postCustomerInvoice(c.env.DB, companyId, userId, {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        customer_name: invoice.customer_name || 'Unknown Customer',
        subtotal: invoice.subtotal,
        tax_amount: invoice.tax_amount,
        total_amount: invoice.total_amount
      });
      
      if (!glPostingResult.success) {
        console.error('GL posting failed:', glPostingResult.error);
      }
    }

    return c.json({ 
      message: 'Invoice status updated successfully',
      gl_posting: glPostingResult
    });
  } catch (error) {
    console.error('Update invoice status error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Record payment for customer invoice
invoices.post('/customer/:id/payment', async (c) => {
  try {
    const invoiceId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const userId = await getSecureUserId(c);
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json<{ amount: number; payment_method?: string; reference?: string }>();

    // Get invoice with customer name
    const invoice = await c.env.DB.prepare(`
      SELECT ci.*, c.customer_name
      FROM customer_invoices ci
      LEFT JOIN customers c ON ci.customer_id = c.id
      WHERE ci.id = ? AND ci.company_id = ?
    `).bind(invoiceId, companyId).first<CustomerInvoice & { customer_name: string }>();

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    const paymentValidation = validatePayment(safeNumber(body.amount), safeNumber(invoice.total_amount), safeNumber(invoice.amount_paid));
    if (!paymentValidation.valid) {
      return c.json({ error: paymentValidation.errors.join('; ') }, 400);
    }

    // Generate payment number
    const lastPayment = await c.env.DB.prepare(
      'SELECT payment_number FROM customer_payments WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(companyId).first<{ payment_number: string }>();
    
    const lastNum = lastPayment ? parseInt(lastPayment.payment_number.split('-')[1]) : 0;
    const paymentNumber = `REC-${String(lastNum + 1).padStart(5, '0')}`;

    const paymentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const paymentDate = now.split('T')[0];

    // Create payment record
    await c.env.DB.prepare(`
      INSERT INTO customer_payments (id, company_id, payment_number, customer_id, invoice_id, payment_date, amount, payment_method, reference, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      paymentId,
      companyId,
      paymentNumber,
      invoice.customer_id,
      invoiceId,
      paymentDate,
      body.amount,
      body.payment_method || 'bank_transfer',
      body.reference || null,
      now
    ).run();

    // Update invoice
    const newAmountPaid = invoice.amount_paid + body.amount;
    const newBalanceDue = invoice.total_amount - newAmountPaid;
    const newStatus = newBalanceDue <= 0 ? 'paid' : 'partial';

    await c.env.DB.prepare(`
      UPDATE customer_invoices 
      SET amount_paid = ?, balance_due = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).bind(newAmountPaid, Math.max(0, newBalanceDue), newStatus, now, invoiceId).run();

    // Post payment to GL
    const glPostingResult = await postCustomerPayment(c.env.DB, companyId, userId, {
      id: paymentId,
      payment_number: paymentNumber,
      payment_date: paymentDate,
      customer_name: invoice.customer_name || 'Unknown Customer',
      amount: body.amount
    });

    if (!glPostingResult.success) {
      console.error('GL posting failed for payment:', glPostingResult.error);
    }

    return c.json({
      id: paymentId,
      payment_number: paymentNumber,
      amount: body.amount,
      balance_due: Math.max(0, newBalanceDue),
      message: 'Payment recorded successfully',
      gl_posting: glPostingResult
    }, 201);
  } catch (error) {
    console.error('Record payment error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create customer invoice - shared handler
const createCustomerInvoiceHandler = async (c: Context<{ Bindings: Env }>) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const userId = await getSecureUserId(c);
    const body = await c.req.json<{
      customer_name?: string;
      customer_email?: string;
      customer_id?: string;
      invoice_date?: string;
      due_date?: string;
      notes?: string;
      reference?: string;
      lines?: Array<{
        line_number?: number;
        product_id?: string;
        description?: string;
        quantity?: number;
        unit_price?: number;
        discount_percent?: number;
        tax_rate?: number;
        vat_rate?: number;
      }>;
      subtotal?: number;
      vat_amount?: number;
      total_amount?: number;
    }>();

    let customerId: string | undefined = body.customer_id;
    if (customerId) {
      const existingCustomer = await c.env.DB.prepare(
        'SELECT id FROM customers WHERE id = ? AND company_id = ?'
      ).bind(customerId, companyId).first<{ id: string }>();
      if (!existingCustomer) {
        customerId = undefined;
      }
    }
    if (!customerId && body.customer_name) {
      const customer = await c.env.DB.prepare(
        'SELECT id FROM customers WHERE company_id = ? AND customer_name = ? LIMIT 1'
      ).bind(companyId, body.customer_name).first<{ id: string }>();
      customerId = customer?.id || undefined;
    }

    if (!customerId) {
      if (!body.customer_name) {
        return c.json({ error: 'customer_name is required when customer_id is not provided' }, 400);
      }
      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      const code = `CUST-${Date.now()}`;
      try {
        await c.env.DB.prepare(
          'INSERT INTO customers (id, company_id, customer_code, customer_name, email, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)'
        ).bind(newId, companyId, code, body.customer_name, body.customer_email || null, now, now).run();
        customerId = newId;
      } catch {
        customerId = newId;
      }
    }

    const lastInvoice = await c.env.DB.prepare(
      'SELECT invoice_number FROM customer_invoices WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(companyId).first<{ invoice_number: string }>();

    const lastNum = lastInvoice ? (parseInt((lastInvoice.invoice_number || '').replace(/[^0-9]/g, '')) || 0) : 0;
    const nextNum = lastNum + 1;
    const invoiceNumber = `INV-${String(nextNum).padStart(6, '0')}`;

    const invoiceId = crypto.randomUUID();
    const now = new Date().toISOString();
    const invoiceDate = body.invoice_date || now.split('T')[0];
    const dueDate = body.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const lines = body.lines || [];
    let subtotal = 0;
    let taxAmount = 0;
    for (const line of lines) {
      const qty = safeNumber(line.quantity) || 1;
      const price = safeNumber(line.unit_price);
      const discount = safeNumber(line.discount_percent);
      const taxRate = safeNumber(line.tax_rate ?? line.vat_rate) || 15;
      const lineSubtotal = qty * price * (1 - discount / 100);
      subtotal += lineSubtotal;
      taxAmount += lineSubtotal * (taxRate / 100);
    }
    const totalAmount = subtotal + taxAmount;

    await c.env.DB.prepare(`
      INSERT INTO customer_invoices (id, company_id, invoice_number, customer_id, sales_order_id, invoice_date, due_date, status, subtotal, tax_amount, discount_amount, total_amount, amount_paid, balance_due, notes, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      invoiceId, companyId, invoiceNumber, customerId, null,
      invoiceDate, dueDate, 'draft',
      subtotal, taxAmount, 0, totalAmount, 0, totalAmount,
      body.notes || null, userId, now, now
    ).run();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const qty = safeNumber(line.quantity) || 1;
      const price = safeNumber(line.unit_price);
      const discount = safeNumber(line.discount_percent);
      const taxRate = safeNumber(line.tax_rate ?? line.vat_rate) || 15;
      const lineTotal = qty * price * (1 - discount / 100);

      await c.env.DB.prepare(`
        INSERT INTO customer_invoice_items (id, invoice_id, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), invoiceId,
        line.product_id || null, line.description || '',
        qty, price, discount, taxRate, lineTotal, i, now
      ).run();
    }

    return c.json({
      id: invoiceId,
      invoice_number: invoiceNumber,
      total_amount: totalAmount,
      message: 'Invoice created successfully'
    }, 201);
  } catch (error) {
    console.error('Create customer invoice error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};

invoices.post('/customer', createCustomerInvoiceHandler);
invoices.post('/', createCustomerInvoiceHandler);
invoices.post('/invoices', createCustomerInvoiceHandler);

// ========================================
// SUPPLIER INVOICES (AP)
// ========================================

// List supplier invoices
invoices.get('/supplier', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const status = c.req.query('status') || '';
    const supplierId = c.req.query('supplier_id') || '';
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('page_size') || '50');
    const offset = (page - 1) * pageSize;

    let countQuery = 'SELECT COUNT(*) as count FROM supplier_invoices WHERE company_id = ?';
    const countParams: string[] = [companyId];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (supplierId) {
      countQuery += ' AND supplier_id = ?';
      countParams.push(supplierId);
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();
    const totalCount = countResult?.count || 0;

    let query = `
      SELECT si.*, s.supplier_name, s.supplier_code
      FROM supplier_invoices si
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      WHERE si.company_id = ?
    `;
    const params: (string | number)[] = [companyId];

    if (status) {
      query += ' AND si.status = ?';
      params.push(status);
    }
    if (supplierId) {
      query += ' AND si.supplier_id = ?';
      params.push(supplierId);
    }

    query += ' ORDER BY si.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all<SupplierInvoice & { supplier_name: string; supplier_code: string }>();

    return c.json({
      data: result.results.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        supplier_id: inv.supplier_id,
        supplier_name: inv.supplier_name,
        supplier_code: inv.supplier_code,
        purchase_order_id: inv.purchase_order_id,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        status: inv.status,
        subtotal: inv.subtotal,
        tax_amount: inv.tax_amount,
        total_amount: inv.total_amount,
        amount_paid: inv.amount_paid,
        balance_due: inv.balance_due,
        created_at: inv.created_at,
      })),
      meta: {
        page,
        page_size: pageSize,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('List supplier invoices error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get single supplier invoice
invoices.get('/supplier/:id', async (c) => {
  try {
    const invoiceId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);

    if (!companyId) return c.json({ error: 'Authentication required' }, 401);

    const invoice = await c.env.DB.prepare(`
      SELECT si.*, s.supplier_name, s.supplier_code, s.email as supplier_email
      FROM supplier_invoices si
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      WHERE si.id = ? AND si.company_id = ?
    `).bind(invoiceId, companyId).first<SupplierInvoice & { supplier_name: string; supplier_code: string; supplier_email: string }>();

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    return c.json(invoice);
  } catch (error) {
    console.error('Get supplier invoice error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create supplier invoice
invoices.post('/supplier', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const userId = await getSecureUserId(c);
    const body = await c.req.json<{
      supplier_id?: string;
      supplier_name?: string;
      purchase_order_id?: string;
      invoice_date?: string;
      due_date?: string;
      notes?: string;
      reference?: string;
      lines?: Array<{
        product_id?: string;
        description?: string;
        quantity?: number;
        unit_price?: number;
        discount_percent?: number;
        tax_rate?: number;
      }>;
    }>();

    let supplierId: string | undefined = body.supplier_id;
    if (supplierId) {
      const existingSupplier = await c.env.DB.prepare(
        'SELECT id FROM suppliers WHERE id = ? AND company_id = ?'
      ).bind(supplierId, companyId).first<{ id: string }>();
      if (!existingSupplier) {
        supplierId = undefined;
      }
    }
    if (!supplierId && body.supplier_name) {
      const supplier = await c.env.DB.prepare(
        'SELECT id FROM suppliers WHERE company_id = ? AND supplier_name = ? LIMIT 1'
      ).bind(companyId, body.supplier_name).first<{ id: string }>();
      supplierId = supplier?.id || undefined;
    }

    if (!supplierId) {
      return c.json({ error: 'supplier_id or supplier_name is required' }, 400);
    }

    const lastInvoice = await c.env.DB.prepare(
      'SELECT invoice_number FROM supplier_invoices WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(companyId).first<{ invoice_number: string }>();

    const lastNum = lastInvoice ? (parseInt((lastInvoice.invoice_number || '').replace(/[^0-9]/g, '')) || 0) : 0;
    const nextNum = lastNum + 1;
    const invoiceNumber = `BILL-${String(nextNum).padStart(5, '0')}`;

    const invoiceId = crypto.randomUUID();
    const now = new Date().toISOString();
    const invoiceDate = body.invoice_date || now.split('T')[0];
    const dueDate = body.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const lines = body.lines || [];
    let subtotal = 0;
    let taxAmount = 0;
    for (const line of lines) {
      const qty = safeNumber(line.quantity) || 1;
      const price = safeNumber(line.unit_price);
      const discount = safeNumber(line.discount_percent);
      const taxRate = safeNumber(line.tax_rate) || 15;
      const lineSubtotal = qty * price * (1 - discount / 100);
      subtotal += lineSubtotal;
      taxAmount += lineSubtotal * (taxRate / 100);
    }
    const totalAmount = subtotal + taxAmount;

    await c.env.DB.prepare(`
      INSERT INTO supplier_invoices (id, company_id, invoice_number, supplier_id, purchase_order_id, invoice_date, due_date, status, subtotal, tax_amount, discount_amount, total_amount, amount_paid, balance_due, notes, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      invoiceId, companyId, invoiceNumber, supplierId, body.purchase_order_id || null,
      invoiceDate, dueDate, 'draft',
      subtotal, taxAmount, 0, totalAmount, 0, totalAmount,
      body.notes || null, userId, now, now
    ).run();

    return c.json({
      id: invoiceId,
      invoice_number: invoiceNumber,
      total_amount: totalAmount,
      message: 'Supplier invoice created successfully'
    }, 201);
  } catch (error) {
    console.error('Create supplier invoice error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update supplier invoice status
invoices.put('/supplier/:id/status', async (c) => {
  try {
    const invoiceId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const userId = await getSecureUserId(c);
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json<{ status: string }>();

    const validStatuses = ['draft', 'received', 'approved', 'partial', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(body.status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    // Get invoice details for GL posting
    const invoice = await c.env.DB.prepare(`
      SELECT si.*, s.supplier_name
      FROM supplier_invoices si
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      WHERE si.id = ? AND si.company_id = ?
    `).bind(invoiceId, companyId).first<SupplierInvoice & { supplier_name: string }>();

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    const result = await c.env.DB.prepare(`
      UPDATE supplier_invoices SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?
    `).bind(body.status, new Date().toISOString(), invoiceId, companyId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Post to GL when status changes to 'approved'
    let glPostingResult = null;
    if (body.status === 'approved' && invoice.status !== 'approved') {
      glPostingResult = await postSupplierInvoice(c.env.DB, companyId, userId, {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        supplier_name: invoice.supplier_name || 'Unknown Supplier',
        subtotal: invoice.subtotal,
        tax_amount: invoice.tax_amount,
        total_amount: invoice.total_amount
      });
      
      if (!glPostingResult.success) {
        console.error('GL posting failed:', glPostingResult.error);
      }
    }

    return c.json({ 
      message: 'Invoice status updated successfully',
      gl_posting: glPostingResult
    });
  } catch (error) {
    console.error('Update supplier invoice status error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Record payment for supplier invoice
invoices.post('/supplier/:id/payment', async (c) => {
  try {
    const invoiceId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const userId = await getSecureUserId(c);
    if (!userId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json<{ amount: number; payment_method?: string; reference?: string }>();

    if (!body.amount || body.amount <= 0) {
      return c.json({ error: 'Valid payment amount is required' }, 400);
    }

    // Get invoice with supplier name
    const invoice = await c.env.DB.prepare(`
      SELECT si.*, s.supplier_name
      FROM supplier_invoices si
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      WHERE si.id = ? AND si.company_id = ?
    `).bind(invoiceId, companyId).first<SupplierInvoice & { supplier_name: string }>();

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Generate payment number
    const lastPayment = await c.env.DB.prepare(
      'SELECT payment_number FROM supplier_payments WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(companyId).first<{ payment_number: string }>();
    
    const lastNum = lastPayment ? parseInt(lastPayment.payment_number.split('-')[1]) : 0;
    const paymentNumber = `PAY-${String(lastNum + 1).padStart(5, '0')}`;

    const paymentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const paymentDate = now.split('T')[0];

    // Create payment record
    await c.env.DB.prepare(`
      INSERT INTO supplier_payments (id, company_id, payment_number, supplier_id, invoice_id, payment_date, amount, payment_method, reference, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      paymentId,
      companyId,
      paymentNumber,
      invoice.supplier_id,
      invoiceId,
      paymentDate,
      body.amount,
      body.payment_method || 'bank_transfer',
      body.reference || null,
      now
    ).run();

    // Update invoice
    const newAmountPaid = invoice.amount_paid + body.amount;
    const newBalanceDue = invoice.total_amount - newAmountPaid;
    const newStatus = newBalanceDue <= 0 ? 'paid' : 'partial';

    await c.env.DB.prepare(`
      UPDATE supplier_invoices 
      SET amount_paid = ?, balance_due = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).bind(newAmountPaid, Math.max(0, newBalanceDue), newStatus, now, invoiceId).run();

    // Post payment to GL
    const glPostingResult = await postSupplierPayment(c.env.DB, companyId, userId, {
      id: paymentId,
      payment_number: paymentNumber,
      payment_date: paymentDate,
      supplier_name: invoice.supplier_name || 'Unknown Supplier',
      amount: body.amount
    });

    if (!glPostingResult.success) {
      console.error('GL posting failed for supplier payment:', glPostingResult.error);
    }

    return c.json({
      id: paymentId,
      payment_number: paymentNumber,
      amount: body.amount,
      balance_due: Math.max(0, newBalanceDue),
      message: 'Payment recorded successfully',
      gl_posting: glPostingResult
    }, 201);
  } catch (error) {
    console.error('Record supplier payment error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ========================================
// CREDIT NOTES
// ========================================

// Create credit note from sales order
invoices.post('/credit-notes', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json<{
      sales_order_id?: string;
      invoice_id?: string;
      customer_id?: string;
      reason?: string;
      lines?: Array<{
        product_id?: string;
        description?: string;
        quantity: number;
        unit_price: number;
        tax_rate?: number;
      }>;
    }>();

    // Generate credit note number
    const lastCreditNote = await c.env.DB.prepare(
      'SELECT invoice_number FROM customer_invoices WHERE company_id = ? AND invoice_number LIKE ? ORDER BY created_at DESC LIMIT 1'
    ).bind(companyId, 'CN-%').first<{ invoice_number: string }>();
    
    const lastNum = lastCreditNote ? parseInt(lastCreditNote.invoice_number.split('-')[1]) : 0;
    const creditNoteNumber = `CN-${String(lastNum + 1).padStart(5, '0')}`;

    const creditNoteId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Get customer from sales order or invoice if provided
    let customerId = body.customer_id;
    let sourceOrderId = body.sales_order_id;
    let sourceInvoiceId = body.invoice_id;

    if (body.sales_order_id && !customerId) {
      const order = await c.env.DB.prepare(
        'SELECT customer_id FROM sales_orders WHERE id = ? AND company_id = ?'
      ).bind(body.sales_order_id, companyId).first<{ customer_id: string }>();
      if (order) {
        customerId = order.customer_id;
      }
    }

    if (body.invoice_id && !customerId) {
      const invoice = await c.env.DB.prepare(
        'SELECT customer_id, sales_order_id FROM customer_invoices WHERE id = ? AND company_id = ?'
      ).bind(body.invoice_id, companyId).first<{ customer_id: string; sales_order_id: string }>();
      if (invoice) {
        customerId = invoice.customer_id;
        sourceOrderId = invoice.sales_order_id;
      }
    }

    if (!customerId) {
      return c.json({ error: 'Customer ID is required' }, 400);
    }

    // Calculate totals from lines
    let subtotal = 0;
    let taxAmount = 0;
    const lines = body.lines || [];
    
    for (const line of lines) {
      const lineTotal = line.quantity * line.unit_price;
      const lineTax = lineTotal * ((line.tax_rate || 15) / 100);
      subtotal += lineTotal;
      taxAmount += lineTax;
    }

    const totalAmount = subtotal + taxAmount;

    // Create credit note as a negative invoice
    await c.env.DB.prepare(`
      INSERT INTO customer_invoices (id, company_id, invoice_number, customer_id, sales_order_id, invoice_date, due_date, status, subtotal, tax_amount, discount_amount, total_amount, amount_paid, balance_due, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      creditNoteId,
      companyId,
      creditNoteNumber,
      customerId,
      sourceOrderId || null,
      now.split('T')[0],
      now.split('T')[0],
      'posted',
      -subtotal,
      -taxAmount,
      0,
      -totalAmount,
      0,
      -totalAmount,
      body.reason || 'Credit note',
      now,
      now
    ).run();

    // Insert line items
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineTotal = line.quantity * line.unit_price;
      
      await c.env.DB.prepare(`
        INSERT INTO customer_invoice_items (id, invoice_id, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        creditNoteId,
        line.product_id || null,
        line.description || 'Credit note line',
        -line.quantity,
        line.unit_price,
        0,
        line.tax_rate || 15,
        -lineTotal,
        i,
        now
      ).run();
    }

    return c.json({
      id: creditNoteId,
      credit_note_number: creditNoteNumber,
      total_amount: totalAmount,
      message: 'Credit note created successfully'
    }, 201);
  } catch (error) {
    console.error('Create credit note error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ========================================
// INVOICE LINES (for timesheet integration)
// ========================================

// Create invoice line item (for timesheet→invoice workflow)
invoices.post('/invoice-lines', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json<{
      invoice_id?: string;
      description: string;
      quantity: number;
      unit_price: number;
      amount?: number;
      source_type?: string;
      source_id?: string;
      project_id?: string;
      date?: string;
      tax_rate?: number;
    }>();

    if (!body.description || !body.quantity || !body.unit_price) {
      return c.json({ error: 'Description, quantity, and unit_price are required' }, 400);
    }

    const lineId = crypto.randomUUID();
    const now = new Date().toISOString();
    const lineTotal = body.quantity * body.unit_price;
    const taxRate = body.tax_rate || 15;

    // If invoice_id is provided, add to existing invoice
    if (body.invoice_id) {
      // Verify invoice exists and belongs to company
      const invoice = await c.env.DB.prepare(
        'SELECT id FROM customer_invoices WHERE id = ? AND company_id = ?'
      ).bind(body.invoice_id, companyId).first();

      if (!invoice) {
        return c.json({ error: 'Invoice not found' }, 404);
      }

      // Get max sort order
      const maxSort = await c.env.DB.prepare(
        'SELECT MAX(sort_order) as max_sort FROM customer_invoice_items WHERE invoice_id = ?'
      ).bind(body.invoice_id).first<{ max_sort: number }>();

      await c.env.DB.prepare(`
        INSERT INTO customer_invoice_items (id, invoice_id, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        lineId,
        body.invoice_id,
        null,
        body.description,
        body.quantity,
        body.unit_price,
        0,
        taxRate,
        lineTotal,
        (maxSort?.max_sort || 0) + 1,
        now
      ).run();

      // Update invoice totals
      const taxAmount = lineTotal * (taxRate / 100);
      await c.env.DB.prepare(`
        UPDATE customer_invoices 
        SET subtotal = subtotal + ?, tax_amount = tax_amount + ?, total_amount = total_amount + ?, balance_due = balance_due + ?, updated_at = ?
        WHERE id = ?
      `).bind(lineTotal, taxAmount, lineTotal + taxAmount, lineTotal + taxAmount, now, body.invoice_id).run();

      return c.json({
        id: lineId,
        invoice_id: body.invoice_id,
        line_total: lineTotal,
        message: 'Invoice line added successfully'
      }, 201);
    }

    // If no invoice_id, store as pending invoice line for later batching
    await c.env.DB.prepare(`
      INSERT INTO pending_invoice_lines (id, company_id, description, quantity, unit_price, tax_rate, line_total, source_type, source_id, project_id, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      lineId,
      companyId,
      body.description,
      body.quantity,
      body.unit_price,
      taxRate,
      lineTotal,
      body.source_type || null,
      body.source_id || null,
      body.project_id || null,
      body.date || now.split('T')[0],
      now
    ).run();

    return c.json({
      id: lineId,
      line_total: lineTotal,
      message: 'Invoice line created (pending invoice assignment)'
    }, 201);
  } catch (error) {
    console.error('Create invoice line error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});


// DELETE /:id - Delete invoice (safeguards)
invoices.delete('/:id', async (c) => {
  try {
    const invoiceId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);

    const inv = await c.env.DB.prepare(
      'SELECT id, status, amount_paid FROM customer_invoices WHERE id = ? AND company_id = ?'
    ).bind(invoiceId, companyId).first<{ id: string; status: string; amount_paid: number }>();

    if (!inv) return c.json({ error: 'Invoice not found' }, 404);
    if ((inv.status && inv.status !== 'draft') || (inv.amount_paid && inv.amount_paid > 0)) {
      return c.json({ error: 'Cannot delete a non-draft or partially/fully paid invoice' }, 400);
    }

    await c.env.DB.prepare('DELETE FROM customer_invoice_items WHERE invoice_id = ?')
      .bind(invoiceId).run();
    const result = await c.env.DB.prepare('DELETE FROM customer_invoices WHERE id = ? AND company_id = ?')
      .bind(invoiceId, companyId).run();

    if (result.meta.changes === 0) return c.json({ error: 'Invoice not found' }, 404);
    return c.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== AR/AP ALIAS ENDPOINTS ====================
// These map frontend paths like /ar/invoices, /ar/receipts, /ap/payments, /ap/invoices
// to the existing customer/supplier invoice handlers

invoices.get('/invoices', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: "Authentication required" }, 401);
    const status = c.req.query('status') || '';
    const search = c.req.query('search') || '';
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('page_size') || '50');
    const offset = (page - 1) * pageSize;

    let query = 'SELECT ci.*, c.customer_name, c.email as customer_email FROM customer_invoices ci LEFT JOIN customers c ON ci.customer_id = c.id WHERE ci.company_id = ?';
    const params: (string | number)[] = [companyId];

    if (status) { query += ' AND ci.status = ?'; params.push(status); }
    if (search) { query += ' AND (ci.invoice_number LIKE ? OR c.customer_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' ORDER BY ci.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ data: result.results || [], total: result.results?.length || 0 });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return c.json({ data: [], total: 0 });
  }
});

invoices.get('/receipts', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Authentication required' }, 401);
    const token = authHeader.substring(7);
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const companyId = (payload as any).company_id;
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);

    const result = await c.env.DB.prepare(`
      SELECT cp.*, ci.invoice_number, c.customer_name
      FROM customer_payments cp
      LEFT JOIN customer_invoices ci ON cp.invoice_id = ci.id
      LEFT JOIN customers c ON ci.customer_id = c.id
      WHERE cp.company_id = ?
      ORDER BY cp.payment_date DESC LIMIT 100
    `).bind(companyId).all();
    return c.json({ receipts: result.results || [], total: result.results?.length || 0 });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return c.json({ receipts: [], total: 0 });
  }
});

invoices.get('/payments', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Authentication required' }, 401);
    const token = authHeader.substring(7);
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const companyId = (payload as any).company_id;
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);

    const result = await c.env.DB.prepare(`
      SELECT sp.*, si.invoice_number, s.supplier_name
      FROM supplier_payments sp
      LEFT JOIN supplier_invoices si ON sp.invoice_id = si.id
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      WHERE sp.company_id = ?
      ORDER BY sp.payment_date DESC LIMIT 100
    `).bind(companyId).all();
    return c.json({ payments: result.results || [], total: result.results?.length || 0 });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return c.json({ payments: [], total: 0 });
  }
});

invoices.get('/bills', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Authentication required' }, 401);
    const token = authHeader.substring(7);
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const companyId = (payload as any).company_id;
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);

    const result = await c.env.DB.prepare(`
      SELECT si.*, s.supplier_name, s.supplier_code
      FROM supplier_invoices si
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      WHERE si.company_id = ?
      ORDER BY si.created_at DESC LIMIT 100
    `).bind(companyId).all();
    const bills = (result.results || []).map((inv: any) => ({
      ...inv,
      total_amount: inv.total_amount ?? 0,
      balance_due: inv.balance_due ?? 0,
      tax_amount: inv.tax_amount ?? 0,
      subtotal: inv.subtotal ?? 0
    }));
    return c.json({ bills, total: bills.length });
  } catch (error) {
    console.error('Error fetching bills:', error);
    return c.json({ bills: [], total: 0 });
  }
});

// GET /customers - alias for AR customer list
invoices.get('/customers', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Authentication required' }, 401);
    const token = authHeader.substring(7);
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const companyId = (payload as any).company_id;
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);

    const result = await c.env.DB.prepare(
      'SELECT id, customer_code, customer_name, email, phone, is_active, created_at FROM customers WHERE company_id = ? ORDER BY customer_name ASC'
    ).bind(companyId).all();
    return c.json({ customers: result.results || [], total: result.results?.length || 0 });
  } catch (error) {
    return c.json({ customers: [], total: 0 });
  }
});

export default invoices;
