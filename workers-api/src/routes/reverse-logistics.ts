/**
 * ARIA ERP - Reverse Logistics API Routes
 * Sales Returns, Customer Refunds, and Credit Notes (enhanced)
 * Covers the full backward logistics flow: Return → Inspect → Credit Note → Refund
 */

import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

interface JWTPayload {
  sub: string;
  email: string;
  company_id: string;
  role: string;
}

const app = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

function getCompanyId(c: any): string {
    const user = c.get('user') as JWTPayload | undefined;
    return user?.company_id || c.req.query('company_id') || '';
}

// ========================================
// SALES RETURNS
// ========================================

app.get('/returns', async (c) => {
  try {
    const companyId = getCompanyId(c);
    if (!companyId) return c.json({ error: 'Company ID required' }, 400);

    const status = c.req.query('status');
    const customerId = c.req.query('customer_id');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = `
      SELECT sr.*, c.customer_name as customer_name
      FROM sales_returns sr
      LEFT JOIN customers c ON sr.customer_id = c.id
      WHERE sr.company_id = ?
    `;
    const params: any[] = [companyId];

    if (status) {
      query += ' AND sr.status = ?';
      params.push(status);
    }
    if (customerId) {
      query += ' AND sr.customer_id = ?';
      params.push(customerId);
    }

    query += ' ORDER BY sr.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM sales_returns WHERE company_id = ?'
    ).bind(companyId).first<{ total: number }>();

    const statsResult = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as received,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(total_amount) as total_value
      FROM sales_returns WHERE company_id = ?
    `).bind(companyId).first();

    return c.json({
      returns: result.results || [],
      total: countResult?.total || 0,
      stats: statsResult || {},
    });
  } catch (error) {
    console.error('List returns error:', error);
    return c.json({ error: 'Failed to fetch returns' }, 500);
  }
});

app.get('/returns/:id', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const id = c.req.param('id');

    const ret = await c.env.DB.prepare(`
      SELECT sr.*, c.customer_name as customer_name
      FROM sales_returns sr
      LEFT JOIN customers c ON sr.customer_id = c.id
      WHERE sr.id = ? AND sr.company_id = ?
    `).bind(id, companyId).first();

    if (!ret) return c.json({ error: 'Return not found' }, 404);

    const items = await c.env.DB.prepare(`
      SELECT sri.*, p.product_name as product_name, p.product_code as product_sku
      FROM sales_return_items sri
      LEFT JOIN products p ON sri.product_id = p.id
      WHERE sri.return_id = ? AND sri.company_id = ?
      ORDER BY sri.sort_order ASC
    `).bind(id, companyId).all();

    return c.json({
      ...ret,
      items: items.results || [],
    });
  } catch (error) {
    console.error('Get return error:', error);
    return c.json({ error: 'Failed to fetch return' }, 500);
  }
});

app.post('/returns', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const user = c.get('user') || { sub: 'system', email: '', company_id: companyId, role: '' };
    if (!companyId) return c.json({ error: 'Company ID required' }, 400);

    const body = await c.req.json<{
      customer_id: string;
      sales_order_id?: string;
      invoice_id?: string;
      reason: string;
      return_type?: string;
      warehouse_id?: string;
      resolution?: string;
      notes?: string;
      items: Array<{
        product_id?: string;
        description: string;
        quantity_returned: number;
        unit_price: number;
        tax_rate?: number;
        condition?: string;
        restock?: string;
      }>;
    }>();

    if (!body.customer_id) return c.json({ error: 'customer_id is required' }, 400);
    if (!body.reason) return c.json({ error: 'reason is required' }, 400);
    if (!body.items || body.items.length === 0) return c.json({ error: 'At least one return item is required' }, 400);

    const lastReturn = await c.env.DB.prepare(
      "SELECT return_number FROM sales_returns WHERE company_id = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(companyId).first<{ return_number: string }>();

    const lastNum = lastReturn ? parseInt(lastReturn.return_number.replace('RET-', '')) : 0;
    const returnNumber = `RET-${String(lastNum + 1).padStart(5, '0')}`;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    let subtotal = 0;
    let taxAmount = 0;
    for (const item of body.items) {
      const lineTotal = item.quantity_returned * item.unit_price;
      const lineTax = lineTotal * ((item.tax_rate || 15) / 100);
      subtotal += lineTotal;
      taxAmount += lineTax;
    }
    const totalAmount = subtotal + taxAmount;

    await c.env.DB.prepare(`
      INSERT INTO sales_returns (id, company_id, return_number, customer_id, sales_order_id, invoice_id, return_date, reason, return_type, status, subtotal, tax_amount, total_amount, currency, warehouse_id, resolution, notes, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, companyId, returnNumber, body.customer_id,
      body.sales_order_id || null, body.invoice_id || null,
      now.split('T')[0], body.reason,
      body.return_type || 'full', 'draft',
      Math.round(subtotal * 100) / 100,
      Math.round(taxAmount * 100) / 100,
      Math.round(totalAmount * 100) / 100,
      'ZAR', body.warehouse_id || null,
      body.resolution || 'credit_note',
      body.notes || null, user.sub, now, now
    ).run();

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      const lineTotal = item.quantity_returned * item.unit_price;

      await c.env.DB.prepare(`
        INSERT INTO sales_return_items (id, return_id, company_id, product_id, description, quantity_returned, unit_price, tax_rate, line_total, condition, restock, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), id, companyId,
        item.product_id || null, item.description,
        item.quantity_returned, item.unit_price,
        item.tax_rate || 15,
        Math.round(lineTotal * 100) / 100,
        item.condition || 'unknown',
        item.restock || 'yes', i, now
      ).run();
    }

    return c.json({
      id,
      return_number: returnNumber,
      status: 'draft',
      total_amount: Math.round(totalAmount * 100) / 100,
      items_count: body.items.length,
      message: 'Sales return created successfully',
    }, 201);
  } catch (error) {
    console.error('Create return error:', error);
    return c.json({ error: 'Failed to create return' }, 500);
  }
});

app.put('/returns/:id/status', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const user = c.get('user') || { sub: 'system', email: '', company_id: '', role: '' };
    const id = c.req.param('id');
    const body = await c.req.json<{ status: string; notes?: string; inspection_notes?: string }>();

    const validStatuses = ['draft', 'pending_approval', 'approved', 'received', 'inspected', 'completed', 'rejected', 'cancelled'];
    if (!validStatuses.includes(body.status)) {
      return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
    }

    const existing = await c.env.DB.prepare(
      'SELECT id, status FROM sales_returns WHERE id = ? AND company_id = ?'
    ).bind(id, companyId).first<{ id: string; status: string }>();

    if (!existing) return c.json({ error: 'Return not found' }, 404);

    const allowedTransitions: Record<string, string[]> = {
      draft: ['pending_approval', 'cancelled'],
      pending_approval: ['approved', 'rejected'],
      approved: ['received', 'cancelled'],
      received: ['inspected'],
      inspected: ['completed', 'rejected'],
      completed: [],
      rejected: ['draft'],
      cancelled: ['draft'],
    };

    if (!allowedTransitions[existing.status]?.includes(body.status)) {
      return c.json({ error: `Cannot transition from '${existing.status}' to '${body.status}'` }, 400);
    }

    const now = new Date().toISOString();
    let extraFields = '';

    if (body.status === 'received') {
      extraFields = `, received_date = '${now.split('T')[0]}', received_by = '${user.sub}'`;
    }
    if (body.inspection_notes) {
      extraFields += `, inspection_notes = '${body.inspection_notes.replace(/'/g, "''")}'`;
    }
    if (body.notes) {
      extraFields += `, notes = '${body.notes.replace(/'/g, "''")}'`;
    }

    await c.env.DB.prepare(`
      UPDATE sales_returns SET status = ?, updated_at = ?${extraFields}
      WHERE id = ? AND company_id = ?
    `).bind(body.status, now, id, companyId).run();

    return c.json({ id, status: body.status, message: `Return status updated to '${body.status}'` });
  } catch (error) {
    console.error('Update return status error:', error);
    return c.json({ error: 'Failed to update return status' }, 500);
  }
});

app.put('/returns/:id/receive', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const user = c.get('user') || { sub: 'system', email: '', company_id: '', role: '' };
    const id = c.req.param('id');
    const body = await c.req.json<{
      items: Array<{
        item_id: string;
        quantity_received: number;
        quantity_accepted: number;
        quantity_rejected: number;
        condition: string;
        rejection_reason?: string;
      }>;
    }>();

    const existing = await c.env.DB.prepare(
      'SELECT id, status FROM sales_returns WHERE id = ? AND company_id = ?'
    ).bind(id, companyId).first<{ id: string; status: string }>();

    if (!existing) return c.json({ error: 'Return not found' }, 404);
    if (existing.status !== 'approved' && existing.status !== 'received') {
      return c.json({ error: 'Return must be approved before receiving items' }, 400);
    }

    const now = new Date().toISOString();

    for (const item of body.items) {
      await c.env.DB.prepare(`
        UPDATE sales_return_items
        SET quantity_received = ?, quantity_accepted = ?, quantity_rejected = ?, condition = ?, rejection_reason = ?
        WHERE id = ? AND return_id = ? AND company_id = ?
      `).bind(
        item.quantity_received, item.quantity_accepted, item.quantity_rejected,
        item.condition, item.rejection_reason || null,
        item.item_id, id, companyId
      ).run();
    }

    await c.env.DB.prepare(`
      UPDATE sales_returns SET status = 'received', received_date = ?, received_by = ?, updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(now.split('T')[0], user.sub, now, id, companyId).run();

    return c.json({ id, status: 'received', message: 'Return items received successfully' });
  } catch (error) {
    console.error('Receive return items error:', error);
    return c.json({ error: 'Failed to receive return items' }, 500);
  }
});

app.delete('/returns/:id', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const id = c.req.param('id');

    const existing = await c.env.DB.prepare(
      'SELECT id, status FROM sales_returns WHERE id = ? AND company_id = ?'
    ).bind(id, companyId).first<{ id: string; status: string }>();

    if (!existing) return c.json({ error: 'Return not found' }, 404);
    if (existing.status !== 'draft' && existing.status !== 'cancelled') {
      return c.json({ error: 'Only draft or cancelled returns can be deleted' }, 400);
    }

    await c.env.DB.prepare('DELETE FROM sales_return_items WHERE return_id = ? AND company_id = ?').bind(id, companyId).run();
    await c.env.DB.prepare('DELETE FROM sales_returns WHERE id = ? AND company_id = ?').bind(id, companyId).run();

    return c.json({ message: 'Return deleted successfully' });
  } catch (error) {
    console.error('Delete return error:', error);
    return c.json({ error: 'Failed to delete return' }, 500);
  }
});

// ========================================
// CUSTOMER REFUNDS
// ========================================

app.get('/refunds', async (c) => {
  try {
    const companyId = getCompanyId(c);
    if (!companyId) return c.json({ error: 'Company ID required' }, 400);

    const status = c.req.query('status');
    const customerId = c.req.query('customer_id');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = `
      SELECT cr.*, c.customer_name as customer_name
      FROM customer_refunds cr
      LEFT JOIN customers c ON cr.customer_id = c.id
      WHERE cr.company_id = ?
    `;
    const params: any[] = [companyId];

    if (status) {
      query += ' AND cr.status = ?';
      params.push(status);
    }
    if (customerId) {
      query += ' AND cr.customer_id = ?';
      params.push(customerId);
    }

    query += ' ORDER BY cr.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    const statsResult = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_refunded,
        SUM(CASE WHEN status = 'pending' OR status = 'approved' THEN amount ELSE 0 END) as total_pending
      FROM customer_refunds WHERE company_id = ?
    `).bind(companyId).first();

    return c.json({
      refunds: result.results || [],
      stats: statsResult || {},
    });
  } catch (error) {
    console.error('List refunds error:', error);
    return c.json({ error: 'Failed to fetch refunds' }, 500);
  }
});

app.get('/refunds/:id', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const id = c.req.param('id');

    const refund = await c.env.DB.prepare(`
      SELECT cr.*, c.customer_name as customer_name,
        sr.return_number, cn.credit_note_number
      FROM customer_refunds cr
      LEFT JOIN customers c ON cr.customer_id = c.id
      LEFT JOIN sales_returns sr ON cr.return_id = sr.id
      LEFT JOIN credit_notes cn ON cr.credit_note_id = cn.id
      WHERE cr.id = ? AND cr.company_id = ?
    `).bind(id, companyId).first();

    if (!refund) return c.json({ error: 'Refund not found' }, 404);

    return c.json(refund);
  } catch (error) {
    console.error('Get refund error:', error);
    return c.json({ error: 'Failed to fetch refund' }, 500);
  }
});

app.post('/refunds', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const user = c.get('user') || { sub: 'system', email: '', company_id: '', role: '' };
    if (!companyId) return c.json({ error: 'Company ID required' }, 400);

    const body = await c.req.json<{
      customer_id: string;
      return_id?: string;
      credit_note_id?: string;
      invoice_id?: string;
      amount: number;
      refund_method?: string;
      bank_account_id?: string;
      reference?: string;
      reason?: string;
      notes?: string;
    }>();

    if (!body.customer_id) return c.json({ error: 'customer_id is required' }, 400);
    if (!body.amount || body.amount <= 0) return c.json({ error: 'amount must be greater than 0' }, 400);

    const lastRefund = await c.env.DB.prepare(
      "SELECT refund_number FROM customer_refunds WHERE company_id = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(companyId).first<{ refund_number: string }>();

    const lastNum = lastRefund ? parseInt(lastRefund.refund_number.replace('REF-', '')) : 0;
    const refundNumber = `REF-${String(lastNum + 1).padStart(5, '0')}`;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO customer_refunds (id, company_id, refund_number, customer_id, return_id, credit_note_id, invoice_id, refund_date, refund_method, amount, currency, status, reference, bank_account_id, reason, notes, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, companyId, refundNumber, body.customer_id,
      body.return_id || null, body.credit_note_id || null, body.invoice_id || null,
      now.split('T')[0],
      body.refund_method || 'bank_transfer',
      Math.round(body.amount * 100) / 100,
      'ZAR', 'pending',
      body.reference || null, body.bank_account_id || null,
      body.reason || null, body.notes || null,
      user.sub, now, now
    ).run();

    return c.json({
      id,
      refund_number: refundNumber,
      amount: Math.round(body.amount * 100) / 100,
      status: 'pending',
      message: 'Refund created successfully',
    }, 201);
  } catch (error) {
    console.error('Create refund error:', error);
    return c.json({ error: 'Failed to create refund' }, 500);
  }
});

app.put('/refunds/:id/status', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const user = c.get('user') || { sub: 'system', email: '', company_id: '', role: '' };
    const id = c.req.param('id');
    const body = await c.req.json<{ status: string; transaction_reference?: string; notes?: string }>();

    const validStatuses = ['pending', 'approved', 'processing', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(body.status)) {
      return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
    }

    const existing = await c.env.DB.prepare(
      'SELECT id, status FROM customer_refunds WHERE id = ? AND company_id = ?'
    ).bind(id, companyId).first<{ id: string; status: string }>();

    if (!existing) return c.json({ error: 'Refund not found' }, 404);

    const allowedTransitions: Record<string, string[]> = {
      pending: ['approved', 'cancelled'],
      approved: ['processing', 'cancelled'],
      processing: ['completed', 'failed'],
      completed: [],
      failed: ['processing', 'cancelled'],
      cancelled: ['pending'],
    };

    if (!allowedTransitions[existing.status]?.includes(body.status)) {
      return c.json({ error: `Cannot transition from '${existing.status}' to '${body.status}'` }, 400);
    }

    const now = new Date().toISOString();
    let extraFields = '';

    if (body.status === 'completed') {
      extraFields = `, processed_date = '${now.split('T')[0]}', processed_by = '${user.sub}'`;
    }
    if (body.transaction_reference) {
      extraFields += `, transaction_reference = '${body.transaction_reference.replace(/'/g, "''")}'`;
    }
    if (body.notes) {
      extraFields += `, notes = '${body.notes.replace(/'/g, "''")}'`;
    }

    await c.env.DB.prepare(`
      UPDATE customer_refunds SET status = ?, updated_at = ?${extraFields}
      WHERE id = ? AND company_id = ?
    `).bind(body.status, now, id, companyId).run();

    return c.json({ id, status: body.status, message: `Refund status updated to '${body.status}'` });
  } catch (error) {
    console.error('Update refund status error:', error);
    return c.json({ error: 'Failed to update refund status' }, 500);
  }
});

app.put('/refunds/:id/process', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const user = c.get('user') || { sub: 'system', email: '', company_id: '', role: '' };
    const id = c.req.param('id');
    const body = await c.req.json<{ transaction_reference?: string }>();

    const existing = await c.env.DB.prepare(
      'SELECT id, status, amount FROM customer_refunds WHERE id = ? AND company_id = ?'
    ).bind(id, companyId).first<{ id: string; status: string; amount: number }>();

    if (!existing) return c.json({ error: 'Refund not found' }, 404);
    if (existing.status !== 'approved' && existing.status !== 'processing') {
      return c.json({ error: 'Refund must be approved or processing before completing' }, 400);
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      UPDATE customer_refunds
      SET status = 'completed', processed_date = ?, processed_by = ?, transaction_reference = ?, updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(
      now.split('T')[0], user.sub,
      body.transaction_reference || `TXN-${Date.now()}`,
      now, id, companyId
    ).run();

    return c.json({
      id,
      status: 'completed',
      amount: existing.amount,
      message: 'Refund processed successfully',
    });
  } catch (error) {
    console.error('Process refund error:', error);
    return c.json({ error: 'Failed to process refund' }, 500);
  }
});

app.delete('/refunds/:id', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const id = c.req.param('id');

    const existing = await c.env.DB.prepare(
      'SELECT id, status FROM customer_refunds WHERE id = ? AND company_id = ?'
    ).bind(id, companyId).first<{ id: string; status: string }>();

    if (!existing) return c.json({ error: 'Refund not found' }, 404);
    if (existing.status !== 'pending' && existing.status !== 'cancelled') {
      return c.json({ error: 'Only pending or cancelled refunds can be deleted' }, 400);
    }

    await c.env.DB.prepare('DELETE FROM customer_refunds WHERE id = ? AND company_id = ?').bind(id, companyId).run();

    return c.json({ message: 'Refund deleted successfully' });
  } catch (error) {
    console.error('Delete refund error:', error);
    return c.json({ error: 'Failed to delete refund' }, 500);
  }
});

// ========================================
// CREDIT NOTES (enhanced - uses credit_notes table)
// ========================================

app.get('/credit-notes', async (c) => {
  try {
    const companyId = getCompanyId(c);
    if (!companyId) return c.json({ error: 'Company ID required' }, 400);

    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = `
      SELECT cn.*, c.customer_name as customer_name
      FROM credit_notes cn
      LEFT JOIN customers c ON cn.customer_id = c.id
      WHERE cn.company_id = ?
    `;
    const params: any[] = [companyId];

    if (status) {
      query += ' AND cn.status = ?';
      params.push(status);
    }

    query += ' ORDER BY cn.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    const statsResult = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(total_amount) as total_value,
        SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied
      FROM credit_notes WHERE company_id = ?
    `).bind(companyId).first();

    return c.json({
      credit_notes: result.results || [],
      stats: statsResult || {},
    });
  } catch (error) {
    console.error('List credit notes error:', error);
    return c.json({ error: 'Failed to fetch credit notes' }, 500);
  }
});

app.get('/credit-notes/:id', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const id = c.req.param('id');

    const cn = await c.env.DB.prepare(`
      SELECT cn.*, c.customer_name as customer_name
      FROM credit_notes cn
      LEFT JOIN customers c ON cn.customer_id = c.id
      WHERE cn.id = ? AND cn.company_id = ?
    `).bind(id, companyId).first();

    if (!cn) return c.json({ error: 'Credit note not found' }, 404);

    return c.json(cn);
  } catch (error) {
    console.error('Get credit note error:', error);
    return c.json({ error: 'Failed to fetch credit note' }, 500);
  }
});

app.post('/credit-notes', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const user = c.get('user') || { sub: 'system', email: '', company_id: '', role: '' };
    if (!companyId) return c.json({ error: 'Company ID required' }, 400);

    const body = await c.req.json<{
      customer_id: string;
      invoice_id?: string;
      reason?: string;
      subtotal?: number;
      tax_amount?: number;
      total_amount?: number;
      currency?: string;
      notes?: string;
      lines?: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        tax_rate?: number;
      }>;
    }>();

    if (!body.customer_id) return c.json({ error: 'customer_id is required' }, 400);

    const lastCN = await c.env.DB.prepare(
      "SELECT credit_note_number FROM credit_notes WHERE company_id = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(companyId).first<{ credit_note_number: string }>();

    const lastNum = lastCN ? parseInt(lastCN.credit_note_number.replace('CN-', '')) : 0;
    const creditNoteNumber = `CN-${String(lastNum + 1).padStart(5, '0')}`;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    let subtotal = body.subtotal || 0;
    let taxAmount = body.tax_amount || 0;
    let totalAmount = body.total_amount || 0;

    if (body.lines && body.lines.length > 0) {
      subtotal = 0;
      taxAmount = 0;
      for (const line of body.lines) {
        const lineTotal = line.quantity * line.unit_price;
        const lineTax = lineTotal * ((line.tax_rate || 15) / 100);
        subtotal += lineTotal;
        taxAmount += lineTax;
      }
      totalAmount = subtotal + taxAmount;
    }

    await c.env.DB.prepare(`
      INSERT INTO credit_notes (id, company_id, credit_note_number, customer_id, invoice_id, credit_note_date, reason, subtotal, tax_amount, total_amount, currency, status, notes, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, companyId, creditNoteNumber, body.customer_id,
      body.invoice_id || null,
      now.split('T')[0],
      body.reason || null,
      Math.round(subtotal * 100) / 100,
      Math.round(taxAmount * 100) / 100,
      Math.round(totalAmount * 100) / 100,
      body.currency || 'ZAR',
      'draft',
      body.notes || null,
      user.sub, now, now
    ).run();

    return c.json({
      id,
      credit_note_number: creditNoteNumber,
      total_amount: Math.round(totalAmount * 100) / 100,
      status: 'draft',
      message: 'Credit note created successfully',
    }, 201);
  } catch (error) {
    console.error('Create credit note error:', error);
    return c.json({ error: 'Failed to create credit note' }, 500);
  }
});

app.put('/credit-notes/:id/issue', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const id = c.req.param('id');

    const existing = await c.env.DB.prepare(
      'SELECT id, status FROM credit_notes WHERE id = ? AND company_id = ?'
    ).bind(id, companyId).first<{ id: string; status: string }>();

    if (!existing) return c.json({ error: 'Credit note not found' }, 404);
    if (existing.status !== 'draft') {
      return c.json({ error: 'Only draft credit notes can be issued' }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE credit_notes SET status = 'issued', updated_at = datetime('now')
      WHERE id = ? AND company_id = ?
    `).bind(id, companyId).run();

    return c.json({ id, status: 'issued', message: 'Credit note issued successfully' });
  } catch (error) {
    console.error('Issue credit note error:', error);
    return c.json({ error: 'Failed to issue credit note' }, 500);
  }
});

app.put('/credit-notes/:id/apply', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const id = c.req.param('id');
    const body = await c.req.json<{ invoice_id?: string; amount?: number }>();

    const existing = await c.env.DB.prepare(
      'SELECT id, status, total_amount, applied_amount FROM credit_notes WHERE id = ? AND company_id = ?'
    ).bind(id, companyId).first<{ id: string; status: string; total_amount: number; applied_amount: number }>();

    if (!existing) return c.json({ error: 'Credit note not found' }, 404);
    if (existing.status !== 'issued') {
      return c.json({ error: 'Only issued credit notes can be applied' }, 400);
    }

    const applyAmount = body.amount || existing.total_amount;
    const newApplied = (existing.applied_amount || 0) + applyAmount;
    const newStatus = newApplied >= existing.total_amount ? 'applied' : 'issued';

    await c.env.DB.prepare(`
      UPDATE credit_notes SET applied_amount = ?, status = ?, updated_at = datetime('now')
      WHERE id = ? AND company_id = ?
    `).bind(Math.round(newApplied * 100) / 100, newStatus, id, companyId).run();

    return c.json({
      id,
      applied_amount: Math.round(newApplied * 100) / 100,
      status: newStatus,
      message: 'Credit note applied successfully',
    });
  } catch (error) {
    console.error('Apply credit note error:', error);
    return c.json({ error: 'Failed to apply credit note' }, 500);
  }
});

app.delete('/credit-notes/:id', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const id = c.req.param('id');

    const existing = await c.env.DB.prepare(
      'SELECT id, status FROM credit_notes WHERE id = ? AND company_id = ?'
    ).bind(id, companyId).first<{ id: string; status: string }>();

    if (!existing) return c.json({ error: 'Credit note not found' }, 404);
    if (existing.status !== 'draft') {
      return c.json({ error: 'Only draft credit notes can be deleted' }, 400);
    }

    await c.env.DB.prepare('DELETE FROM credit_notes WHERE id = ? AND company_id = ?').bind(id, companyId).run();

    return c.json({ message: 'Credit note deleted successfully' });
  } catch (error) {
    console.error('Delete credit note error:', error);
    return c.json({ error: 'Failed to delete credit note' }, 500);
  }
});

// ========================================
// ORCHESTRATION: Full reverse flow
// Return → Inspect → Credit Note → Refund
// ========================================

app.post('/returns/:id/create-credit-note', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const user = c.get('user') || { sub: 'system', email: '', company_id: '', role: '' };
    const returnId = c.req.param('id');

    const ret = await c.env.DB.prepare(
      'SELECT * FROM sales_returns WHERE id = ? AND company_id = ?'
    ).bind(returnId, companyId).first<any>();

    if (!ret) return c.json({ error: 'Return not found' }, 404);
    if (ret.status !== 'inspected' && ret.status !== 'completed') {
      return c.json({ error: 'Return must be inspected before creating a credit note' }, 400);
    }

    const lastCN = await c.env.DB.prepare(
      "SELECT credit_note_number FROM credit_notes WHERE company_id = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(companyId).first<{ credit_note_number: string }>();

    const lastNum = lastCN ? parseInt(lastCN.credit_note_number.replace('CN-', '')) : 0;
    const creditNoteNumber = `CN-${String(lastNum + 1).padStart(5, '0')}`;

    const cnId = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO credit_notes (id, company_id, credit_note_number, customer_id, invoice_id, credit_note_date, reason, subtotal, tax_amount, total_amount, currency, status, notes, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      cnId, companyId, creditNoteNumber, ret.customer_id,
      ret.invoice_id || null,
      now.split('T')[0],
      `Credit note from return ${ret.return_number}: ${ret.reason}`,
      ret.subtotal, ret.tax_amount, ret.total_amount,
      ret.currency || 'ZAR', 'draft',
      `Auto-generated from return ${ret.return_number}`,
      user.sub, now, now
    ).run();

    await c.env.DB.prepare(`
      UPDATE sales_returns SET credit_note_id = ?, updated_at = ? WHERE id = ? AND company_id = ?
    `).bind(cnId, now, returnId, companyId).run();

    return c.json({
      credit_note_id: cnId,
      credit_note_number: creditNoteNumber,
      return_id: returnId,
      total_amount: ret.total_amount,
      message: 'Credit note created from return',
    }, 201);
  } catch (error) {
    console.error('Create CN from return error:', error);
    return c.json({ error: 'Failed to create credit note from return' }, 500);
  }
});

app.post('/returns/:id/create-refund', async (c) => {
  try {
    const companyId = getCompanyId(c);
    const user = c.get('user') || { sub: 'system', email: '', company_id: '', role: '' };
    const returnId = c.req.param('id');
    const body = await c.req.json<{ refund_method?: string; bank_account_id?: string }>();

    const ret = await c.env.DB.prepare(
      'SELECT * FROM sales_returns WHERE id = ? AND company_id = ?'
    ).bind(returnId, companyId).first<any>();

    if (!ret) return c.json({ error: 'Return not found' }, 404);
    if (ret.status !== 'inspected' && ret.status !== 'completed') {
      return c.json({ error: 'Return must be inspected before creating a refund' }, 400);
    }

    const lastRefund = await c.env.DB.prepare(
      "SELECT refund_number FROM customer_refunds WHERE company_id = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(companyId).first<{ refund_number: string }>();

    const lastNum = lastRefund ? parseInt(lastRefund.refund_number.replace('REF-', '')) : 0;
    const refundNumber = `REF-${String(lastNum + 1).padStart(5, '0')}`;

    const refundId = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO customer_refunds (id, company_id, refund_number, customer_id, return_id, credit_note_id, invoice_id, refund_date, refund_method, amount, currency, status, reason, notes, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      refundId, companyId, refundNumber, ret.customer_id,
      returnId, ret.credit_note_id || null, ret.invoice_id || null,
      now.split('T')[0],
      body.refund_method || 'bank_transfer',
      ret.total_amount, ret.currency || 'ZAR', 'pending',
      `Refund for return ${ret.return_number}`,
      `Auto-generated from return ${ret.return_number}`,
      user.sub, now, now
    ).run();

    return c.json({
      refund_id: refundId,
      refund_number: refundNumber,
      return_id: returnId,
      amount: ret.total_amount,
      status: 'pending',
      message: 'Refund created from return',
    }, 201);
  } catch (error) {
    console.error('Create refund from return error:', error);
    return c.json({ error: 'Failed to create refund from return' }, 500);
  }
});

// ========================================
// DASHBOARD / SUMMARY
// ========================================

app.get('/summary', async (c) => {
  try {
    const companyId = getCompanyId(c);
    if (!companyId) return c.json({ error: 'Company ID required' }, 400);

    const returnsStats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_returns,
        SUM(CASE WHEN status IN ('draft','pending_approval','approved','received') THEN 1 ELSE 0 END) as open_returns,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_returns,
        SUM(total_amount) as total_return_value
      FROM sales_returns WHERE company_id = ?
    `).bind(companyId).first();

    const refundsStats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_refunds,
        SUM(CASE WHEN status IN ('pending','approved','processing') THEN 1 ELSE 0 END) as pending_refunds,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_refunds,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_refunded
      FROM customer_refunds WHERE company_id = ?
    `).bind(companyId).first();

    const creditNotesStats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_credit_notes,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_credit_notes,
        SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued_credit_notes,
        SUM(total_amount) as total_credit_value
      FROM credit_notes WHERE company_id = ?
    `).bind(companyId).first();

    return c.json({
      returns: returnsStats || {},
      refunds: refundsStats || {},
      credit_notes: creditNotesStats || {},
    });
  } catch (error) {
    console.error('Reverse logistics summary error:', error);
    return c.json({ error: 'Failed to fetch summary' }, 500);
  }
});

export default app;
