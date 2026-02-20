/**
 * ARIA ERP - Sales Orders API Routes
 * Phase 2: Order to Cash - Sales Orders CRUD
 */

import { Hono } from 'hono';
import { getSecureCompanyId } from '../middleware/auth';
import { validateSalesOrder, validateStatusTransition, calculateLineTotals, safeNumber } from '../services/business-rules';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT?: string;
}

interface SalesOrder {
  id: string;
  company_id: string;
  order_number: string;
  customer_id: string;
  quote_id: string | null;
  order_date: string;
  expected_delivery_date: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  shipping_address: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  line_total: number;
  quantity_delivered: number;
  sort_order: number;
}

const salesOrders = new Hono<{ Bindings: Env }>();

// List all sales orders
salesOrders.get('/', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const status = c.req.query('status') || '';
    const customerId = c.req.query('customer_id') || '';
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('page_size') || '50');
    const offset = (page - 1) * pageSize;

    let countQuery = 'SELECT COUNT(*) as count FROM sales_orders WHERE company_id = ?';
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
      SELECT so.*, c.customer_name, c.customer_code
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE so.company_id = ?
    `;
    const params: (string | number)[] = [companyId];

    if (status) {
      query += ' AND so.status = ?';
      params.push(status);
    }
    if (customerId) {
      query += ' AND so.customer_id = ?';
      params.push(customerId);
    }

    query += ' ORDER BY so.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all<SalesOrder & { customer_name: string; customer_code: string }>();

    return c.json({
      data: result.results.map(order => ({
        id: order.id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        customer_code: order.customer_code,
        quote_id: order.quote_id,
        order_date: order.order_date,
        expected_delivery_date: order.expected_delivery_date,
        status: order.status,
        subtotal: order.subtotal,
        tax_amount: order.tax_amount,
        discount_amount: order.discount_amount,
        total_amount: order.total_amount,
        created_at: order.created_at,
        updated_at: order.updated_at,
      })),
      meta: {
        page,
        page_size: pageSize,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('List sales orders error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get single sales order with line items
salesOrders.get('/:id', async (c) => {
  try {
    const orderId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);

    const order = await c.env.DB.prepare(`
      SELECT so.*, c.customer_name, c.customer_code, c.email as customer_email
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE so.id = ? AND so.company_id = ?
    `).bind(orderId, companyId).first<SalesOrder & { customer_name: string; customer_code: string; customer_email: string }>();

    if (!order) {
      return c.json({ error: 'Sales order not found' }, 404);
    }

    const items = await c.env.DB.prepare(`
      SELECT soi.*, p.product_name, p.product_code
      FROM sales_order_items soi
      LEFT JOIN products p ON soi.product_id = p.id
      WHERE soi.sales_order_id = ?
      ORDER BY soi.sort_order
    `).bind(orderId).all<SalesOrderItem & { product_name: string; product_code: string }>();

    const mappedItems = items.results.map(item => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_code: item.product_code,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent,
      tax_rate: item.tax_rate,
      line_total: item.line_total,
      quantity_delivered: item.quantity_delivered,
    }));

    return c.json({
      ...order,
      items: mappedItems,
      lines: mappedItems,
      line_items: mappedItems,
    });
  } catch (error) {
    console.error('Get sales order error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create sales order
salesOrders.post('/', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const body = await c.req.json<Partial<SalesOrder> & { items?: Partial<SalesOrderItem>[] }>();

    const validation = validateSalesOrder(body as Record<string, unknown>);
    if (!validation.valid) {
      return c.json({ error: validation.errors.join('; '), errors: validation.errors, warnings: validation.warnings }, 400);
    }

    // Generate order number
    const lastOrder = await c.env.DB.prepare(
      'SELECT order_number FROM sales_orders WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(companyId).first<{ order_number: string }>();
    
    const lastNum = lastOrder ? parseInt(lastOrder.order_number.split('-')[1]) : 0;
    const orderNumber = `SO-${String(lastNum + 1).padStart(5, '0')}`;

    const orderId = crypto.randomUUID();
    const now = new Date().toISOString();

    const items = body.items || (body as any).lines || [];
    const totals = calculateLineTotals(items as Array<{ quantity?: number; unit_price?: number; discount_percent?: number; tax_rate?: number }>);
    const subtotal = totals.subtotal;
    const taxAmount = totals.tax_amount;
    const discountAmount = safeNumber(body.discount_amount);
    const totalAmount = totals.total_amount - discountAmount;

    await c.env.DB.prepare(`
      INSERT INTO sales_orders (id, company_id, order_number, customer_id, quote_id, order_date, expected_delivery_date, status, subtotal, tax_amount, discount_amount, total_amount, shipping_address, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      orderId,
      companyId,
      orderNumber,
      body.customer_id,
      body.quote_id || null,
      body.order_date || now.split('T')[0],
      body.expected_delivery_date || (body as any).required_date || null,
      'pending',
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      body.shipping_address || null,
      body.notes || null,
      now,
      now
    ).run();

    // Insert line items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lineTotal = (item.quantity || 1) * (item.unit_price || 0) * (1 - (item.discount_percent || 0) / 100);
      
      await c.env.DB.prepare(`
        INSERT INTO sales_order_items (id, sales_order_id, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        orderId,
        item.product_id || null,
        item.description || '',
        item.quantity || 1,
        item.unit_price || 0,
        item.discount_percent || 0,
        item.tax_rate || 15,
        lineTotal,
        i,
        now
      ).run();
    }

    return c.json({
      id: orderId,
      order_number: orderNumber,
      total_amount: totalAmount,
      message: 'Sales order created successfully',
    }, 201);
  } catch (error) {
    console.error('Create sales order error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update sales order status
salesOrders.put('/:id/status', async (c) => {
  try {
    const orderId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);
    const body = await c.req.json<{ status: string }>();

    const existing = await c.env.DB.prepare(
      'SELECT status FROM sales_orders WHERE id = ? AND company_id = ?'
    ).bind(orderId, companyId).first<{ status: string }>();
    if (!existing) return c.json({ error: 'Sales order not found' }, 404);

    const transition = validateStatusTransition('sales_order', existing.status, body.status);
    if (!transition.valid) {
      return c.json({ error: transition.errors.join('; ') }, 400);
    }

    const result = await c.env.DB.prepare(`
      UPDATE sales_orders SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?
    `).bind(body.status, new Date().toISOString(), orderId, companyId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Sales order not found' }, 404);
    }

    return c.json({ message: 'Sales order status updated successfully' });
  } catch (error) {
    console.error('Update sales order status error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Convert sales order to invoice
salesOrders.post('/:id/invoice', async (c) => {
  try {
    const orderId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);

    // Get sales order
    const order = await c.env.DB.prepare(
      'SELECT * FROM sales_orders WHERE id = ? AND company_id = ?'
    ).bind(orderId, companyId).first<SalesOrder>();

    if (!order) {
      return c.json({ error: 'Sales order not found' }, 404);
    }

    if (order.status === 'invoiced') {
      return c.json({ error: 'Sales order already invoiced' }, 400);
    }

    // Generate invoice number
    const lastInvoice = await c.env.DB.prepare(
      'SELECT invoice_number FROM customer_invoices WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(companyId).first<{ invoice_number: string }>();
    
    const lastNum = lastInvoice ? parseInt(lastInvoice.invoice_number.split('-')[1]) : 0;
    const invoiceNumber = `INV-${String(lastNum + 1).padStart(5, '0')}`;

    const invoiceId = crypto.randomUUID();
    const now = new Date().toISOString();
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create invoice
    await c.env.DB.prepare(`
      INSERT INTO customer_invoices (id, company_id, invoice_number, customer_id, sales_order_id, invoice_date, due_date, status, subtotal, tax_amount, discount_amount, total_amount, balance_due, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      invoiceId,
      companyId,
      invoiceNumber,
      order.customer_id,
      orderId,
      now.split('T')[0],
      dueDate,
      'draft',
      order.subtotal,
      order.tax_amount,
      order.discount_amount,
      order.total_amount,
      order.total_amount,
      order.notes,
      now,
      now
    ).run();

    // Copy line items
    const items = await c.env.DB.prepare(
      'SELECT * FROM sales_order_items WHERE sales_order_id = ?'
    ).bind(orderId).all<SalesOrderItem>();

    for (const item of items.results) {
      await c.env.DB.prepare(`
        INSERT INTO customer_invoice_items (id, invoice_id, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        invoiceId,
        item.product_id,
        item.description,
        item.quantity,
        item.unit_price,
        item.discount_percent,
        item.tax_rate,
        item.line_total,
        item.sort_order,
        now
      ).run();
    }

    // Update sales order status
    await c.env.DB.prepare(
      'UPDATE sales_orders SET status = ?, updated_at = ? WHERE id = ?'
    ).bind('invoiced', now, orderId).run();

    return c.json({
      id: invoiceId,
      invoice_number: invoiceNumber,
      message: 'Invoice created successfully',
    }, 201);
  } catch (error) {
    console.error('Create invoice error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Cancel sales order
salesOrders.post('/:id/cancel', async (c) => {
  try {
    const orderId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);

    const order = await c.env.DB.prepare(
      'SELECT * FROM sales_orders WHERE id = ? AND company_id = ?'
    ).bind(orderId, companyId).first<SalesOrder>();

    if (!order) {
      return c.json({ error: 'Sales order not found' }, 404);
    }

    if (order.status === 'cancelled') {
      return c.json({ error: 'Sales order is already cancelled' }, 400);
    }

    if (order.status === 'completed' || order.status === 'invoiced') {
      return c.json({ error: 'Cannot cancel a completed or invoiced order' }, 400);
    }

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'UPDATE sales_orders SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?'
    ).bind('cancelled', now, orderId, companyId).run();

    return c.json({ 
      message: 'Sales order cancelled successfully',
      order_number: order.order_number
    });
  } catch (error) {
    console.error('Cancel sales order error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Approve sales order
salesOrders.post('/:id/approve', async (c) => {
  try {
    const orderId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);

    const order = await c.env.DB.prepare(
      'SELECT * FROM sales_orders WHERE id = ? AND company_id = ?'
    ).bind(orderId, companyId).first<SalesOrder>();

    if (!order) {
      return c.json({ error: 'Sales order not found' }, 404);
    }

    if (order.status !== 'pending' && order.status !== 'draft') {
      return c.json({ error: 'Only draft/pending orders can be approved' }, 400);
    }

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'UPDATE sales_orders SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?'
    ).bind('approved', now, orderId, companyId).run();

    return c.json({ 
      message: 'Sales order approved successfully',
      order_number: order.order_number
    });
  } catch (error) {
    console.error('Approve sales order error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete sales order
salesOrders.delete('/:id', async (c) => {
  try {
    const orderId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);

    // Delete line items first
    await c.env.DB.prepare('DELETE FROM sales_order_items WHERE sales_order_id = ?').bind(orderId).run();

    const result = await c.env.DB.prepare(
      'DELETE FROM sales_orders WHERE id = ? AND company_id = ?'
    ).bind(orderId, companyId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Sales order not found' }, 404);
    }

    return c.json({ message: 'Sales order deleted successfully' });
  } catch (error) {
    console.error('Delete sales order error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default salesOrders;
