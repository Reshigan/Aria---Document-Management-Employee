/**
 * ARIA ERP - Quotes API Routes
 * Phase 2: Order to Cash - Quotes CRUD
 */

import { Hono } from 'hono';
import { getSecureCompanyId } from '../middleware/auth';
import { validateQuote, validateStatusTransition, calculateLineTotals, safeNumber } from '../services/business-rules';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT?: string;
}

interface Quote {
  id: string;
  company_id: string;
  quote_number: string;
  customer_id: string;
  quote_date: string;
  valid_until: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  terms: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  line_total: number;
  sort_order: number;
}

const quotes = new Hono<{ Bindings: Env }>();

// List all quotes
quotes.get('/', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const status = c.req.query('status') || '';
    const customerId = c.req.query('customer_id') || '';
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('page_size') || '50');
    const offset = (page - 1) * pageSize;

    let countQuery = 'SELECT COUNT(*) as count FROM quotes WHERE company_id = ?';
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
      SELECT q.*, c.customer_name, c.customer_code
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.company_id = ?
    `;
    const params: (string | number)[] = [companyId];

    if (status) {
      query += ' AND q.status = ?';
      params.push(status);
    }
    if (customerId) {
      query += ' AND q.customer_id = ?';
      params.push(customerId);
    }

    query += ' ORDER BY q.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all<Quote & { customer_name: string; customer_code: string }>();

    return c.json({
      data: result.results.map(quote => ({
        id: quote.id,
        quote_number: quote.quote_number,
        customer_id: quote.customer_id,
        customer_name: quote.customer_name,
        customer_code: quote.customer_code,
        quote_date: quote.quote_date,
        valid_until: quote.valid_until,
        status: quote.status,
        subtotal: quote.subtotal,
        tax_amount: quote.tax_amount,
        discount_amount: quote.discount_amount,
        total_amount: quote.total_amount,
        created_at: quote.created_at,
        updated_at: quote.updated_at,
      })),
      meta: {
        page,
        page_size: pageSize,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('List quotes error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get single quote with line items
quotes.get('/:id', async (c) => {
  try {
    const quoteId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);

    if (!companyId) return c.json({ error: 'Authentication required' }, 401);

    const quote = await c.env.DB.prepare(`
      SELECT q.*, c.customer_name, c.customer_code, c.email as customer_email
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = ? AND q.company_id = ?
    `).bind(quoteId, companyId).first<Quote & { customer_name: string; customer_code: string; customer_email: string }>();

    if (!quote) {
      return c.json({ error: 'Quote not found' }, 404);
    }

    const items = await c.env.DB.prepare(`
      SELECT qi.*, p.product_name, p.product_code
      FROM quote_items qi
      LEFT JOIN products p ON qi.product_id = p.id
      WHERE qi.quote_id = ?
      ORDER BY qi.sort_order
    `).bind(quoteId).all<QuoteItem & { product_name: string; product_code: string }>();

    return c.json({
      ...quote,
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
      })),
    });
  } catch (error) {
    console.error('Get quote error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create quote
quotes.post('/', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json<Partial<Quote> & { items?: Partial<QuoteItem>[] }>();

    const validation = validateQuote(body as Record<string, unknown>);
    if (!validation.valid) {
      return c.json({ error: validation.errors.join('; '), errors: validation.errors, warnings: validation.warnings }, 400);
    }

    // Generate quote number
    const lastQuote = await c.env.DB.prepare(
      'SELECT quote_number FROM quotes WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(companyId).first<{ quote_number: string }>();
    
    const lastNum = lastQuote ? parseInt(lastQuote.quote_number.split('-')[1]) : 0;
    const quoteNumber = `QUO-${String(lastNum + 1).padStart(5, '0')}`;

    const quoteId = crypto.randomUUID();
    const now = new Date().toISOString();
    const validUntil = body.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const items = body.items || (body as any).lines || [];
    const totals = calculateLineTotals(items as Array<{ quantity?: number; unit_price?: number; discount_percent?: number; tax_rate?: number }>);
    const subtotal = totals.subtotal;
    const taxAmount = totals.tax_amount;
    const discountAmount = safeNumber(body.discount_amount);
    const totalAmount = totals.total_amount - discountAmount;

    await c.env.DB.prepare(`
      INSERT INTO quotes (id, company_id, quote_number, customer_id, quote_date, valid_until, status, subtotal, tax_amount, discount_amount, total_amount, notes, terms, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      quoteId,
      companyId,
      quoteNumber,
      body.customer_id,
      body.quote_date || now.split('T')[0],
      validUntil,
      'draft',
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      body.notes || null,
      body.terms || null,
      now,
      now
    ).run();

    // Insert line items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lineTotal = (item.quantity || 1) * (item.unit_price || 0) * (1 - (item.discount_percent || 0) / 100);
      
      await c.env.DB.prepare(`
        INSERT INTO quote_items (id, quote_id, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        quoteId,
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
      id: quoteId,
      quote_number: quoteNumber,
      total_amount: totalAmount,
      message: 'Quote created successfully',
    }, 201);
  } catch (error) {
    console.error('Create quote error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Full update quote (recalculates totals)
quotes.put('/:id', async (c) => {
  try {
    const quoteId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);
    const body = await c.req.json<Partial<Quote> & { items?: Partial<QuoteItem>[]; lines?: Partial<QuoteItem>[] }>();

    const existing = await c.env.DB.prepare(
      'SELECT * FROM quotes WHERE id = ? AND company_id = ?'
    ).bind(quoteId, companyId).first<Quote>();
    if (!existing) return c.json({ error: 'Quote not found' }, 404);

    const items = body.items || body.lines || [];
    const now = new Date().toISOString();

    let subtotal = existing.subtotal;
    let taxAmount = existing.tax_amount;
    let totalAmount = existing.total_amount;
    const discountAmount = safeNumber(body.discount_amount ?? existing.discount_amount);

    if (items.length > 0) {
      const totals = calculateLineTotals(items as Array<{ quantity?: number; unit_price?: number; discount_percent?: number; tax_rate?: number }>);
      subtotal = totals.subtotal;
      taxAmount = totals.tax_amount;
      totalAmount = totals.total_amount - discountAmount;

      await c.env.DB.prepare('DELETE FROM quote_items WHERE quote_id = ?').bind(quoteId).run();
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const lineTotal = (safeNumber(item.quantity) || 1) * safeNumber(item.unit_price) * (1 - safeNumber(item.discount_percent) / 100);
        await c.env.DB.prepare(`
          INSERT INTO quote_items (id, quote_id, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total, sort_order, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(), quoteId,
          item.product_id || null, item.description || '',
          safeNumber(item.quantity) || 1, safeNumber(item.unit_price),
          safeNumber(item.discount_percent), safeNumber(item.tax_rate) || 15,
          lineTotal, i, now
        ).run();
      }
    }

    await c.env.DB.prepare(`
      UPDATE quotes SET
        customer_id = ?, quote_date = ?, valid_until = ?,
        subtotal = ?, tax_amount = ?, discount_amount = ?, total_amount = ?,
        notes = ?, terms = ?, updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(
      body.customer_id ?? existing.customer_id,
      body.quote_date ?? existing.quote_date,
      body.valid_until ?? existing.valid_until,
      subtotal, taxAmount, discountAmount, totalAmount,
      body.notes ?? existing.notes,
      body.terms ?? existing.terms,
      now, quoteId, companyId
    ).run();

    return c.json({
      id: quoteId,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      message: 'Quote updated successfully',
    });
  } catch (error) {
    console.error('Update quote error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update quote status
quotes.put('/:id/status', async (c) => {
  try {
    const quoteId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json<{ status: string }>();

    const existing = await c.env.DB.prepare(
      'SELECT status FROM quotes WHERE id = ? AND company_id = ?'
    ).bind(quoteId, companyId).first<{ status: string }>();
    if (!existing) return c.json({ error: 'Quote not found' }, 404);

    const transition = validateStatusTransition('quote', existing.status, body.status);
    if (!transition.valid) {
      return c.json({ error: transition.errors.join('; ') }, 400);
    }

    const result = await c.env.DB.prepare(`
      UPDATE quotes SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?
    `).bind(body.status, new Date().toISOString(), quoteId, companyId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Quote not found' }, 404);
    }

    return c.json({ message: 'Quote status updated successfully' });
  } catch (error) {
    console.error('Update quote status error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Convert quote to sales order
quotes.post('/:id/convert', async (c) => {
  try {
    const quoteId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);

    if (!companyId) return c.json({ error: 'Authentication required' }, 401);

    // Get quote
    const quote = await c.env.DB.prepare(
      'SELECT * FROM quotes WHERE id = ? AND company_id = ?'
    ).bind(quoteId, companyId).first<Quote>();

    if (!quote) {
      return c.json({ error: 'Quote not found' }, 404);
    }

    if (quote.status === 'converted') {
      return c.json({ error: 'Quote already converted' }, 400);
    }

    // Generate sales order number
    const lastOrder = await c.env.DB.prepare(
      'SELECT order_number FROM sales_orders WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(companyId).first<{ order_number: string }>();
    
    const lastNum = lastOrder ? parseInt(lastOrder.order_number.split('-')[1]) : 0;
    const orderNumber = `SO-${String(lastNum + 1).padStart(5, '0')}`;

    const orderId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create sales order
    await c.env.DB.prepare(`
      INSERT INTO sales_orders (id, company_id, order_number, customer_id, quote_id, order_date, status, subtotal, tax_amount, discount_amount, total_amount, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      orderId,
      companyId,
      orderNumber,
      quote.customer_id,
      quoteId,
      now.split('T')[0],
      'pending',
      quote.subtotal,
      quote.tax_amount,
      quote.discount_amount,
      quote.total_amount,
      quote.notes,
      now,
      now
    ).run();

    // Copy line items
    const items = await c.env.DB.prepare(
      'SELECT * FROM quote_items WHERE quote_id = ?'
    ).bind(quoteId).all<QuoteItem>();

    for (const item of items.results) {
      await c.env.DB.prepare(`
        INSERT INTO sales_order_items (id, sales_order_id, product_id, description, quantity, unit_price, discount_percent, tax_rate, line_total, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        orderId,
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

    // Update quote status
    await c.env.DB.prepare(
      'UPDATE quotes SET status = ?, updated_at = ? WHERE id = ?'
    ).bind('converted', now, quoteId).run();

    return c.json({
      id: orderId,
      order_number: orderNumber,
      message: 'Quote converted to sales order successfully',
    }, 201);
  } catch (error) {
    console.error('Convert quote error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete quote
quotes.delete('/:id', async (c) => {
  try {
    const quoteId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);

    if (!companyId) return c.json({ error: 'Authentication required' }, 401);

    // Delete line items first
    await c.env.DB.prepare('DELETE FROM quote_items WHERE quote_id = ?').bind(quoteId).run();

    const result = await c.env.DB.prepare(
      'DELETE FROM quotes WHERE id = ? AND company_id = ?'
    ).bind(quoteId, companyId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Quote not found' }, 404);
    }

    return c.json({ message: 'Quote deleted successfully' });
  } catch (error) {
    console.error('Delete quote error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default quotes;
