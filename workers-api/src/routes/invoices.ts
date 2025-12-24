/**
 * ARIA ERP - Invoices API Routes
 * Phase 2: Customer and Supplier Invoices CRUD
 */

import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
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
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
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
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';

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
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    const body = await c.req.json<{ status: string }>();

    const validStatuses = ['draft', 'sent', 'posted', 'partial', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(body.status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const result = await c.env.DB.prepare(`
      UPDATE customer_invoices SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?
    `).bind(body.status, new Date().toISOString(), invoiceId, companyId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    return c.json({ message: 'Invoice status updated successfully' });
  } catch (error) {
    console.error('Update invoice status error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Record payment for customer invoice
invoices.post('/customer/:id/payment', async (c) => {
  try {
    const invoiceId = c.req.param('id');
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    const body = await c.req.json<{ amount: number; payment_method?: string; reference?: string }>();

    if (!body.amount || body.amount <= 0) {
      return c.json({ error: 'Valid payment amount is required' }, 400);
    }

    // Get invoice
    const invoice = await c.env.DB.prepare(
      'SELECT * FROM customer_invoices WHERE id = ? AND company_id = ?'
    ).bind(invoiceId, companyId).first<CustomerInvoice>();

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Generate payment number
    const lastPayment = await c.env.DB.prepare(
      'SELECT payment_number FROM customer_payments WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(companyId).first<{ payment_number: string }>();
    
    const lastNum = lastPayment ? parseInt(lastPayment.payment_number.split('-')[1]) : 0;
    const paymentNumber = `REC-${String(lastNum + 1).padStart(5, '0')}`;

    const paymentId = crypto.randomUUID();
    const now = new Date().toISOString();

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
      now.split('T')[0],
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

    return c.json({
      id: paymentId,
      payment_number: paymentNumber,
      amount: body.amount,
      balance_due: Math.max(0, newBalanceDue),
      message: 'Payment recorded successfully',
    }, 201);
  } catch (error) {
    console.error('Record payment error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ========================================
// SUPPLIER INVOICES (AP)
// ========================================

// List supplier invoices
invoices.get('/supplier', async (c) => {
  try {
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
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
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';

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

// Update supplier invoice status
invoices.put('/supplier/:id/status', async (c) => {
  try {
    const invoiceId = c.req.param('id');
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    const body = await c.req.json<{ status: string }>();

    const validStatuses = ['draft', 'received', 'approved', 'partial', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(body.status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const result = await c.env.DB.prepare(`
      UPDATE supplier_invoices SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?
    `).bind(body.status, new Date().toISOString(), invoiceId, companyId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    return c.json({ message: 'Invoice status updated successfully' });
  } catch (error) {
    console.error('Update supplier invoice status error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Record payment for supplier invoice
invoices.post('/supplier/:id/payment', async (c) => {
  try {
    const invoiceId = c.req.param('id');
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    const body = await c.req.json<{ amount: number; payment_method?: string; reference?: string }>();

    if (!body.amount || body.amount <= 0) {
      return c.json({ error: 'Valid payment amount is required' }, 400);
    }

    // Get invoice
    const invoice = await c.env.DB.prepare(
      'SELECT * FROM supplier_invoices WHERE id = ? AND company_id = ?'
    ).bind(invoiceId, companyId).first<SupplierInvoice>();

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
      now.split('T')[0],
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

    return c.json({
      id: paymentId,
      payment_number: paymentNumber,
      amount: body.amount,
      balance_due: Math.max(0, newBalanceDue),
      message: 'Payment recorded successfully',
    }, 201);
  } catch (error) {
    console.error('Record supplier payment error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default invoices;
