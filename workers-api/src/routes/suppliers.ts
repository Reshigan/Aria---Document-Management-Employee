/**
 * ARIA ERP - Suppliers API Routes
 * Phase 2: Master Data - Suppliers CRUD
 */

import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

interface Supplier {
  id: string;
  company_id: string;
  supplier_code: string;
  supplier_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_number: string | null;
  payment_terms: string | null;
  bank_name: string | null;
  bank_account: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const suppliers = new Hono<{ Bindings: Env }>();

// List all suppliers
suppliers.get('/', async (c) => {
  try {
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    const search = c.req.query('search') || '';
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('page_size') || '50');
    const offset = (page - 1) * pageSize;

    let countQuery = 'SELECT COUNT(*) as count FROM suppliers WHERE company_id = ?';
    const countParams: string[] = [companyId];
    
    if (search) {
      countQuery += ' AND (supplier_name LIKE ? OR supplier_code LIKE ? OR email LIKE ?)';
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();
    const totalCount = countResult?.count || 0;

    let query = `
      SELECT id, supplier_code, supplier_name, email, phone, address, city, country,
             tax_number, payment_terms, bank_name, bank_account, is_active, created_at, updated_at
      FROM suppliers
      WHERE company_id = ?
    `;
    const params: (string | number)[] = [companyId];

    if (search) {
      query += ' AND (supplier_name LIKE ? OR supplier_code LIKE ? OR email LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY supplier_name LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all<Supplier>();

    const suppliersData = result.results.map(supplier => ({
      id: supplier.id,
      code: supplier.supplier_code,
      supplier_code: supplier.supplier_code,
      name: supplier.supplier_name,
      supplier_name: supplier.supplier_name,
      contact_person: null,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      country: supplier.country,
      tax_number: supplier.tax_number,
      payment_terms: supplier.payment_terms ? parseInt(supplier.payment_terms.replace(/\D/g, '')) || 30 : 30,
      bbbee_level: 4,
      bank_name: supplier.bank_name,
      bank_account: supplier.bank_account,
      is_active: supplier.is_active === 1,
      created_at: supplier.created_at,
      updated_at: supplier.updated_at,
    }));

    return c.json({
      data: suppliersData,
      suppliers: suppliersData,
      meta: {
        page,
        page_size: pageSize,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('List suppliers error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get single supplier
suppliers.get('/:id', async (c) => {
  try {
    const supplierId = c.req.param('id');
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';

    const supplier = await c.env.DB.prepare(`
      SELECT s.*,
             (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = s.id) as total_orders,
             (SELECT COALESCE(SUM(total_amount), 0) FROM supplier_invoices WHERE supplier_id = s.id) as total_spend
      FROM suppliers s
      WHERE s.id = ? AND s.company_id = ?
    `).bind(supplierId, companyId).first<Supplier & { total_orders: number; total_spend: number }>();

    if (!supplier) {
      return c.json({ error: 'Supplier not found' }, 404);
    }

    return c.json({
      id: supplier.id,
      supplier_code: supplier.supplier_code,
      supplier_name: supplier.supplier_name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      country: supplier.country,
      tax_number: supplier.tax_number,
      payment_terms: supplier.payment_terms,
      bank_name: supplier.bank_name,
      bank_account: supplier.bank_account,
      is_active: supplier.is_active === 1,
      total_orders: supplier.total_orders || 0,
      total_spend: supplier.total_spend || 0,
      created_at: supplier.created_at,
      updated_at: supplier.updated_at,
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create supplier
suppliers.post('/', async (c) => {
  try {
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    const body = await c.req.json<Partial<Supplier>>();

    if (!body.supplier_name) {
      return c.json({ error: 'Supplier name is required' }, 400);
    }

    let supplierCode = body.supplier_code;
    if (!supplierCode) {
      const lastSupplier = await c.env.DB.prepare(
        'SELECT supplier_code FROM suppliers WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(companyId).first<{ supplier_code: string }>();
      
      const lastNum = lastSupplier ? parseInt(lastSupplier.supplier_code.split('-')[1]) : 0;
      supplierCode = `SUP-${String(lastNum + 1).padStart(5, '0')}`;
    }

    const supplierId = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO suppliers (id, company_id, supplier_code, supplier_name, email, phone, address, city, country, tax_number, payment_terms, bank_name, bank_account, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      supplierId,
      companyId,
      supplierCode,
      body.supplier_name,
      body.email || null,
      body.phone || null,
      body.address || null,
      body.city || null,
      body.country || 'South Africa',
      body.tax_number || null,
      body.payment_terms || 'Net 30',
      body.bank_name || null,
      body.bank_account || null,
      now,
      now
    ).run();

    return c.json({
      id: supplierId,
      supplier_code: supplierCode,
      supplier_name: body.supplier_name,
      message: 'Supplier created successfully',
    }, 201);
  } catch (error) {
    console.error('Create supplier error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update supplier
suppliers.put('/:id', async (c) => {
  try {
    const supplierId = c.req.param('id');
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    const body = await c.req.json<Partial<Supplier>>();

    const result = await c.env.DB.prepare(`
      UPDATE suppliers
      SET supplier_name = COALESCE(?, supplier_name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          country = COALESCE(?, country),
          tax_number = COALESCE(?, tax_number),
          payment_terms = COALESCE(?, payment_terms),
          bank_name = COALESCE(?, bank_name),
          bank_account = COALESCE(?, bank_account),
          updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(
      body.supplier_name || null,
      body.email || null,
      body.phone || null,
      body.address || null,
      body.city || null,
      body.country || null,
      body.tax_number || null,
      body.payment_terms || null,
      body.bank_name || null,
      body.bank_account || null,
      new Date().toISOString(),
      supplierId,
      companyId
    ).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Supplier not found' }, 404);
    }

    return c.json({ message: 'Supplier updated successfully' });
  } catch (error) {
    console.error('Update supplier error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete supplier
suppliers.delete('/:id', async (c) => {
  try {
    const supplierId = c.req.param('id');
    const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';

    const result = await c.env.DB.prepare(
      'DELETE FROM suppliers WHERE id = ? AND company_id = ?'
    ).bind(supplierId, companyId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Supplier not found' }, 404);
    }

    return c.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default suppliers;
