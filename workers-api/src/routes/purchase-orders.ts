/**
 * ARIA ERP - Purchase Orders API Routes
 * Phase 2: Procure to Pay - Purchase Orders CRUD
 */

import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

interface PurchaseOrder {
  id: string;
  company_id: string;
  po_number: string;
  supplier_id: string;
  po_date: string;
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

interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  line_total: number;
  quantity_received: number;
  sort_order: number;
}

const purchaseOrders = new Hono<{ Bindings: Env }>();

// List all purchase orders
purchaseOrders.get('/', async (c) => {
  try {
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    const status = c.req.query('status') || '';
    const supplierId = c.req.query('supplier_id') || '';
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('page_size') || '50');
    const offset = (page - 1) * pageSize;

    let countQuery = 'SELECT COUNT(*) as count FROM purchase_orders WHERE company_id = ?';
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
      SELECT po.*, s.supplier_name, s.supplier_code
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.company_id = ?
    `;
    const params: (string | number)[] = [companyId];

    if (status) {
      query += ' AND po.status = ?';
      params.push(status);
    }
    if (supplierId) {
      query += ' AND po.supplier_id = ?';
      params.push(supplierId);
    }

    query += ' ORDER BY po.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all<PurchaseOrder & { supplier_name: string; supplier_code: string }>();

    return c.json({
      data: result.results.map(po => ({
        id: po.id,
        po_number: po.po_number,
        supplier_id: po.supplier_id,
        supplier_name: po.supplier_name,
        supplier_code: po.supplier_code,
        po_date: po.po_date,
        expected_delivery_date: po.expected_delivery_date,
        status: po.status,
        subtotal: po.subtotal,
        tax_amount: po.tax_amount,
        discount_amount: po.discount_amount,
        total_amount: po.total_amount,
        created_at: po.created_at,
        updated_at: po.updated_at,
      })),
      meta: {
        page,
        page_size: pageSize,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('List purchase orders error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get single purchase order with line items
purchaseOrders.get('/:id', async (c) => {
  try {
    const poId = c.req.param('id');
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';

    const po = await c.env.DB.prepare(`
      SELECT po.*, s.supplier_name, s.supplier_code, s.email as supplier_email
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ? AND po.company_id = ?
    `).bind(poId, companyId).first<PurchaseOrder & { supplier_name: string; supplier_code: string; supplier_email: string }>();

    if (!po) {
      return c.json({ error: 'Purchase order not found' }, 404);
    }

    const items = await c.env.DB.prepare(`
      SELECT poi.*, p.product_name, p.product_code
      FROM purchase_order_items poi
      LEFT JOIN products p ON poi.product_id = p.id
      WHERE poi.purchase_order_id = ?
      ORDER BY poi.sort_order
    `).bind(poId).all<PurchaseOrderItem & { product_name: string; product_code: string }>();

    return c.json({
      ...po,
      items: items.results.map(item => ({
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
        quantity_received: item.quantity_received,
      })),
    });
  } catch (error) {
    console.error('Get purchase order error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create purchase order
purchaseOrders.post('/', async (c) => {
  try {
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    const body = await c.req.json<Partial<PurchaseOrder> & { items?: Partial<PurchaseOrderItem>[] }>();

    if (!body.supplier_id) {
      return c.json({ error: 'Supplier is required' }, 400);
    }

    // Generate PO number
    const lastPO = await c.env.DB.prepare(
      'SELECT po_number FROM purchase_orders WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(companyId).first<{ po_number: string }>();
    
    const lastNum = lastPO ? parseInt(lastPO.po_number.split('-')[1]) : 0;
    const poNumber = `PO-${String(lastNum + 1).padStart(5, '0')}`;

    const poId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Calculate totals from items
    let subtotal = 0;
    let taxAmount = 0;
    const items = body.items || [];
    
    for (const item of items) {
      const lineTotal = (item.quantity || 1) * (item.unit_price || 0) * (1 - (item.discount_percent || 0) / 100);
      const lineTax = lineTotal * ((item.tax_rate || 15) / 100);
      subtotal += lineTotal;
      taxAmount += lineTax;
    }

    const discountAmount = body.discount_amount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    await c.env.DB.prepare(`
      INSERT INTO purchase_orders (id, company_id, po_number, supplier_id, po_date, expected_delivery_date, status, subtotal, tax_amount, discount_amount, total_amount, shipping_address, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      poId,
      companyId,
      poNumber,
      body.supplier_id,
      body.po_date || now.split('T')[0],
      body.expected_delivery_date || null,
      'draft',
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
        INSERT INTO purchase_order_items (id, purchase_order_id, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        poId,
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
      id: poId,
      po_number: poNumber,
      total_amount: totalAmount,
      message: 'Purchase order created successfully',
    }, 201);
  } catch (error) {
    console.error('Create purchase order error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update purchase order status
purchaseOrders.put('/:id/status', async (c) => {
  try {
    const poId = c.req.param('id');
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    const body = await c.req.json<{ status: string }>();

    const validStatuses = ['draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled', 'invoiced'];
    if (!validStatuses.includes(body.status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const result = await c.env.DB.prepare(`
      UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?
    `).bind(body.status, new Date().toISOString(), poId, companyId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Purchase order not found' }, 404);
    }

    return c.json({ message: 'Purchase order status updated successfully' });
  } catch (error) {
    console.error('Update purchase order status error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Receive goods for purchase order
purchaseOrders.post('/:id/receive', async (c) => {
  try {
    const poId = c.req.param('id');
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    const body = await c.req.json<{ items: { item_id: string; quantity_received: number }[] }>();

    // Get purchase order
    const po = await c.env.DB.prepare(
      'SELECT * FROM purchase_orders WHERE id = ? AND company_id = ?'
    ).bind(poId, companyId).first<PurchaseOrder>();

    if (!po) {
      return c.json({ error: 'Purchase order not found' }, 404);
    }

    const now = new Date().toISOString();

    // Update received quantities
    for (const item of body.items) {
      await c.env.DB.prepare(`
        UPDATE purchase_order_items 
        SET quantity_received = quantity_received + ?
        WHERE id = ? AND purchase_order_id = ?
      `).bind(item.quantity_received, item.item_id, poId).run();
    }

    // Check if all items are fully received
    const items = await c.env.DB.prepare(
      'SELECT quantity, quantity_received FROM purchase_order_items WHERE purchase_order_id = ?'
    ).bind(poId).all<{ quantity: number; quantity_received: number }>();

    const allReceived = items.results.every(item => item.quantity_received >= item.quantity);
    const partialReceived = items.results.some(item => item.quantity_received > 0);

    let newStatus = po.status;
    if (allReceived) {
      newStatus = 'received';
    } else if (partialReceived) {
      newStatus = 'partial';
    }

    await c.env.DB.prepare(
      'UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?'
    ).bind(newStatus, now, poId).run();

    return c.json({ message: 'Goods received successfully', status: newStatus });
  } catch (error) {
    console.error('Receive goods error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create supplier invoice from purchase order
purchaseOrders.post('/:id/invoice', async (c) => {
  try {
    const poId = c.req.param('id');
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';

    // Get purchase order
    const po = await c.env.DB.prepare(
      'SELECT * FROM purchase_orders WHERE id = ? AND company_id = ?'
    ).bind(poId, companyId).first<PurchaseOrder>();

    if (!po) {
      return c.json({ error: 'Purchase order not found' }, 404);
    }

    if (po.status === 'invoiced') {
      return c.json({ error: 'Purchase order already invoiced' }, 400);
    }

    // Generate invoice number
    const lastInvoice = await c.env.DB.prepare(
      'SELECT invoice_number FROM supplier_invoices WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(companyId).first<{ invoice_number: string }>();
    
    const lastNum = lastInvoice ? parseInt(lastInvoice.invoice_number.split('-')[1]) : 0;
    const invoiceNumber = `SINV-${String(lastNum + 1).padStart(5, '0')}`;

    const invoiceId = crypto.randomUUID();
    const now = new Date().toISOString();
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create supplier invoice
    await c.env.DB.prepare(`
      INSERT INTO supplier_invoices (id, company_id, invoice_number, supplier_id, purchase_order_id, invoice_date, due_date, status, subtotal, tax_amount, discount_amount, total_amount, balance_due, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      invoiceId,
      companyId,
      invoiceNumber,
      po.supplier_id,
      poId,
      now.split('T')[0],
      dueDate,
      'draft',
      po.subtotal,
      po.tax_amount,
      po.discount_amount,
      po.total_amount,
      po.total_amount,
      po.notes,
      now,
      now
    ).run();

    // Update purchase order status
    await c.env.DB.prepare(
      'UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?'
    ).bind('invoiced', now, poId).run();

    return c.json({
      id: invoiceId,
      invoice_number: invoiceNumber,
      message: 'Supplier invoice created successfully',
    }, 201);
  } catch (error) {
    console.error('Create supplier invoice error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete purchase order
purchaseOrders.delete('/:id', async (c) => {
  try {
    const poId = c.req.param('id');
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';

    // Delete line items first
    await c.env.DB.prepare('DELETE FROM purchase_order_items WHERE purchase_order_id = ?').bind(poId).run();

    const result = await c.env.DB.prepare(
      'DELETE FROM purchase_orders WHERE id = ? AND company_id = ?'
    ).bind(poId, companyId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Purchase order not found' }, 404);
    }

    return c.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default purchaseOrders;
