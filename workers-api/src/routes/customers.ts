/**
 * ARIA ERP - Customers API Routes
 * Phase 2: Master Data - Customers CRUD
 */

import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

interface Customer {
  id: string;
  company_id: string;
  customer_code: string;
  customer_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_number: string | null;
  credit_limit: number;
  payment_terms: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const customers = new Hono<{ Bindings: Env }>();

// List all customers
customers.get('/', async (c) => {
  try {
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    const search = c.req.query('search') || '';
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('page_size') || '50');
    const offset = (page - 1) * pageSize;

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM customers WHERE company_id = ?';
    const countParams: string[] = [companyId];
    
    if (search) {
      countQuery += ' AND (customer_name LIKE ? OR customer_code LIKE ? OR email LIKE ?)';
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();
    const totalCount = countResult?.count || 0;

    // Get customers
    let query = `
      SELECT id, customer_code, customer_name, email, phone, address, city, country,
             tax_number, credit_limit, payment_terms, is_active, created_at, updated_at
      FROM customers
      WHERE company_id = ?
    `;
    const params: (string | number)[] = [companyId];

    if (search) {
      query += ' AND (customer_name LIKE ? OR customer_code LIKE ? OR email LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY customer_name LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all<Customer>();

    return c.json({
      data: result.results.map(customer => ({
        id: customer.id,
        code: customer.customer_code,
        customer_code: customer.customer_code,
        name: customer.customer_name,
        customer_name: customer.customer_name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        country: customer.country,
        tax_number: customer.tax_number,
        credit_limit: customer.credit_limit,
        payment_terms: customer.payment_terms,
        is_active: customer.is_active === 1,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
      })),
      meta: {
        page,
        page_size: pageSize,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('List customers error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get single customer
customers.get('/:id', async (c) => {
  try {
    const customerId = c.req.param('id');
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';

    const customer = await c.env.DB.prepare(`
      SELECT c.*,
             (SELECT COUNT(*) FROM quotes WHERE customer_id = c.id) as total_quotes,
             (SELECT COUNT(*) FROM sales_orders WHERE customer_id = c.id) as total_orders,
             (SELECT COALESCE(SUM(total_amount), 0) FROM customer_invoices WHERE customer_id = c.id AND status = 'posted') as total_revenue
      FROM customers c
      WHERE c.id = ? AND c.company_id = ?
    `).bind(customerId, companyId).first<Customer & { total_quotes: number; total_orders: number; total_revenue: number }>();

    if (!customer) {
      return c.json({ error: 'Customer not found' }, 404);
    }

    return c.json({
      id: customer.id,
      customer_code: customer.customer_code,
      customer_name: customer.customer_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      country: customer.country,
      tax_number: customer.tax_number,
      credit_limit: customer.credit_limit,
      payment_terms: customer.payment_terms,
      is_active: customer.is_active === 1,
      total_quotes: customer.total_quotes || 0,
      total_orders: customer.total_orders || 0,
      total_revenue: customer.total_revenue || 0,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
    });
  } catch (error) {
    console.error('Get customer error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create customer
customers.post('/', async (c) => {
  try {
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    const body = await c.req.json<Partial<Customer>>();

    if (!body.customer_name) {
      return c.json({ error: 'Customer name is required' }, 400);
    }

    // Generate customer code if not provided
    let customerCode = body.customer_code;
    if (!customerCode) {
      const lastCustomer = await c.env.DB.prepare(
        'SELECT customer_code FROM customers WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(companyId).first<{ customer_code: string }>();
      
      const lastNum = lastCustomer ? parseInt(lastCustomer.customer_code.split('-')[1]) : 0;
      customerCode = `CUS-${String(lastNum + 1).padStart(5, '0')}`;
    }

    const customerId = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO customers (id, company_id, customer_code, customer_name, email, phone, address, city, country, tax_number, credit_limit, payment_terms, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      customerId,
      companyId,
      customerCode,
      body.customer_name,
      body.email || null,
      body.phone || null,
      body.address || null,
      body.city || null,
      body.country || 'South Africa',
      body.tax_number || null,
      body.credit_limit || 0,
      body.payment_terms || 'Net 30',
      now,
      now
    ).run();

    return c.json({
      id: customerId,
      customer_code: customerCode,
      customer_name: body.customer_name,
      message: 'Customer created successfully',
    }, 201);
  } catch (error) {
    console.error('Create customer error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update customer
customers.put('/:id', async (c) => {
  try {
    const customerId = c.req.param('id');
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    const body = await c.req.json<Partial<Customer>>();

    const result = await c.env.DB.prepare(`
      UPDATE customers
      SET customer_name = COALESCE(?, customer_name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          country = COALESCE(?, country),
          tax_number = COALESCE(?, tax_number),
          credit_limit = COALESCE(?, credit_limit),
          payment_terms = COALESCE(?, payment_terms),
          updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(
      body.customer_name || null,
      body.email || null,
      body.phone || null,
      body.address || null,
      body.city || null,
      body.country || null,
      body.tax_number || null,
      body.credit_limit ?? null,
      body.payment_terms || null,
      new Date().toISOString(),
      customerId,
      companyId
    ).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Customer not found' }, 404);
    }

    return c.json({ message: 'Customer updated successfully' });
  } catch (error) {
    console.error('Update customer error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete customer
customers.delete('/:id', async (c) => {
  try {
    const customerId = c.req.param('id');
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';

    const result = await c.env.DB.prepare(
      'DELETE FROM customers WHERE id = ? AND company_id = ?'
    ).bind(customerId, companyId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Customer not found' }, 404);
    }

    return c.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default customers;
