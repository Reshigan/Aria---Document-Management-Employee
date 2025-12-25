/**
 * ARIA ERP - Products API Routes
 * Phase 2: Master Data - Products CRUD
 */

import { Hono } from 'hono';
import { getSecureCompanyId } from '../middleware/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT?: string;
}

interface Product {
  id: string;
  company_id: string;
  product_code: string;
  product_name: string;
  description: string | null;
  category: string | null;
  unit_of_measure: string;
  unit_price: number;
  cost_price: number;
  tax_rate: number;
  quantity_on_hand: number;
  reorder_level: number;
  is_active: number;
  is_service: number;
  created_at: string;
  updated_at: string;
}

const products = new Hono<{ Bindings: Env }>();

// List all products
products.get('/', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const search = c.req.query('search') || '';
    const category = c.req.query('category') || '';
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('page_size') || '50');
    const offset = (page - 1) * pageSize;

    let countQuery = 'SELECT COUNT(*) as count FROM products WHERE company_id = ?';
    const countParams: string[] = [companyId];
    
    if (search) {
      countQuery += ' AND (product_name LIKE ? OR product_code LIKE ? OR description LIKE ?)';
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }
    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();
    const totalCount = countResult?.count || 0;

    let query = `
      SELECT id, product_code, product_name, description, category, unit_of_measure,
             unit_price, cost_price, tax_rate, quantity_on_hand, reorder_level,
             is_active, is_service, created_at, updated_at
      FROM products
      WHERE company_id = ?
    `;
    const params: (string | number)[] = [companyId];

    if (search) {
      query += ' AND (product_name LIKE ? OR product_code LIKE ? OR description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY product_name LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all<Product>();

    return c.json({
      data: result.results.map(product => ({
        id: product.id,
        code: product.product_code,
        product_code: product.product_code,
        name: product.product_name,
        product_name: product.product_name,
        description: product.description,
        category: product.category,
        unit_of_measure: product.unit_of_measure,
        unit_price: product.unit_price,
        cost_price: product.cost_price,
        tax_rate: product.tax_rate,
        quantity_on_hand: product.quantity_on_hand,
        reorder_level: product.reorder_level,
        is_active: product.is_active === 1,
        is_service: product.is_service === 1,
        created_at: product.created_at,
        updated_at: product.updated_at,
      })),
      meta: {
        page,
        page_size: pageSize,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('List products error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get single product
products.get('/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);

    const product = await c.env.DB.prepare(`
      SELECT * FROM products WHERE id = ? AND company_id = ?
    `).bind(productId, companyId).first<Product>();

    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    return c.json({
      id: product.id,
      product_code: product.product_code,
      product_name: product.product_name,
      description: product.description,
      category: product.category,
      unit_of_measure: product.unit_of_measure,
      unit_price: product.unit_price,
      cost_price: product.cost_price,
      tax_rate: product.tax_rate,
      quantity_on_hand: product.quantity_on_hand,
      reorder_level: product.reorder_level,
      is_active: product.is_active === 1,
      is_service: product.is_service === 1,
      created_at: product.created_at,
      updated_at: product.updated_at,
    });
  } catch (error) {
    console.error('Get product error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create product
products.post('/', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const body = await c.req.json<Partial<Product>>();

    if (!body.product_name) {
      return c.json({ error: 'Product name is required' }, 400);
    }

    let productCode = body.product_code;
    if (!productCode) {
      const lastProduct = await c.env.DB.prepare(
        'SELECT product_code FROM products WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(companyId).first<{ product_code: string }>();
      
      const lastNum = lastProduct ? parseInt(lastProduct.product_code.split('-')[1]) : 0;
      productCode = `PRD-${String(lastNum + 1).padStart(5, '0')}`;
    }

    const productId = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO products (id, company_id, product_code, product_name, description, category, unit_of_measure, unit_price, cost_price, tax_rate, quantity_on_hand, reorder_level, is_service, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      productId,
      companyId,
      productCode,
      body.product_name,
      body.description || null,
      body.category || null,
      body.unit_of_measure || 'Each',
      body.unit_price || 0,
      body.cost_price || 0,
      body.tax_rate || 15,
      body.quantity_on_hand || 0,
      body.reorder_level || 0,
      body.is_service ? 1 : 0,
      now,
      now
    ).run();

    return c.json({
      id: productId,
      product_code: productCode,
      product_name: body.product_name,
      message: 'Product created successfully',
    }, 201);
  } catch (error) {
    console.error('Create product error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update product
products.put('/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);
    const body = await c.req.json<Partial<Product>>();

    const result = await c.env.DB.prepare(`
      UPDATE products
      SET product_name = COALESCE(?, product_name),
          description = COALESCE(?, description),
          category = COALESCE(?, category),
          unit_of_measure = COALESCE(?, unit_of_measure),
          unit_price = COALESCE(?, unit_price),
          cost_price = COALESCE(?, cost_price),
          tax_rate = COALESCE(?, tax_rate),
          quantity_on_hand = COALESCE(?, quantity_on_hand),
          reorder_level = COALESCE(?, reorder_level),
          updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(
      body.product_name || null,
      body.description || null,
      body.category || null,
      body.unit_of_measure || null,
      body.unit_price ?? null,
      body.cost_price ?? null,
      body.tax_rate ?? null,
      body.quantity_on_hand ?? null,
      body.reorder_level ?? null,
      new Date().toISOString(),
      productId,
      companyId
    ).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Product not found' }, 404);
    }

    return c.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete product
products.delete('/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    const companyId = await getSecureCompanyId(c);

    const result = await c.env.DB.prepare(
      'DELETE FROM products WHERE id = ? AND company_id = ?'
    ).bind(productId, companyId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Product not found' }, 404);
    }

    return c.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default products;
