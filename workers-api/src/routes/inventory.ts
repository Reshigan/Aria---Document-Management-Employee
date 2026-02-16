/**
 * Inventory Routes - Warehouses, Stock Movements, Items
 */
import { Hono } from 'hono';
import { validateWarehouse, safeNumber } from '../services/business-rules';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const inventory = new Hono<{ Bindings: Env }>();

// Helper to get company_id from JWT
async function getCompanyId(c: any): Promise<string | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  try {
    const token = authHeader.substring(7);
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return (payload as any).company_id || null;
  } catch {
    return null;
  }
}

// ==================== WAREHOUSES ====================

// GET /api/inventory/warehouses - List all warehouses
inventory.get('/warehouses', async (c) => {
  try {
    const companyId = await getCompanyId(c);
    
    let query = 'SELECT * FROM warehouses';
    const params: string[] = [];
    
    if (companyId) {
      query += ' WHERE company_id = ?';
      params.push(companyId);
    }
    
    query += ' ORDER BY warehouse_name ASC';
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({ warehouses: result.results || [] });
  } catch (error: any) {
    console.error('Error fetching warehouses:', error);
    return c.json({ error: 'Failed to fetch warehouses', detail: error.message }, 500);
  }
});

// GET /api/inventory/warehouses/:id - Get single warehouse
inventory.get('/warehouses/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const companyId = await getCompanyId(c);
    
    let query = 'SELECT * FROM warehouses WHERE id = ?';
    const params: (string | number)[] = [id];
    
    if (companyId) {
      query += ' AND company_id = ?';
      params.push(companyId);
    }
    
    const result = await c.env.DB.prepare(query).bind(...params).first();
    
    if (!result) {
      return c.json({ error: 'Warehouse not found' }, 404);
    }
    
    return c.json(result);
  } catch (error: any) {
    console.error('Error fetching warehouse:', error);
    return c.json({ error: 'Failed to fetch warehouse', detail: error.message }, 500);
  }
});

// POST /api/inventory/warehouses - Create warehouse
inventory.post('/warehouses', async (c) => {
  try {
    const body = await c.req.json();
    const companyId = await getCompanyId(c);
    
    const { warehouse_code, warehouse_name, location, capacity, current_stock_value, is_active } = body;
    
    const validation = validateWarehouse(body as Record<string, unknown>);
    if (!validation.valid) {
      return c.json({ error: validation.errors.join('; '), errors: validation.errors, warnings: validation.warnings }, 400);
    }
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      INSERT INTO warehouses (id, company_id, warehouse_code, warehouse_name, location, capacity, current_stock_value, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      companyId,
      warehouse_code,
      warehouse_name,
      location || '',
      capacity || 0,
      current_stock_value || 0,
      is_active !== false ? 1 : 0,
      now,
      now
    ).run();
    
    return c.json({ id, warehouse_code, warehouse_name, message: 'Warehouse created successfully' }, 201);
  } catch (error: any) {
    console.error('Error creating warehouse:', error);
    return c.json({ error: 'Failed to create warehouse', detail: error.message }, 500);
  }
});

// PUT /api/inventory/warehouses/:id - Update warehouse
inventory.put('/warehouses/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const companyId = await getCompanyId(c);
    
    const { warehouse_code, warehouse_name, location, capacity, current_stock_value, is_active } = body;
    
    const now = new Date().toISOString();
    
    let query = `
      UPDATE warehouses 
      SET warehouse_code = ?, warehouse_name = ?, location = ?, capacity = ?, current_stock_value = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `;
    const params: (string | number)[] = [
      warehouse_code,
      warehouse_name,
      location || '',
      capacity || 0,
      current_stock_value || 0,
      is_active !== false ? 1 : 0,
      now,
      id
    ];
    
    if (companyId) {
      query = query.replace('WHERE id = ?', 'WHERE id = ? AND company_id = ?');
      params.push(companyId);
    }
    
    await c.env.DB.prepare(query).bind(...params).run();
    
    return c.json({ id, message: 'Warehouse updated successfully' });
  } catch (error: any) {
    console.error('Error updating warehouse:', error);
    return c.json({ error: 'Failed to update warehouse', detail: error.message }, 500);
  }
});

// DELETE /api/inventory/warehouses/:id - Delete warehouse
inventory.delete('/warehouses/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const companyId = await getCompanyId(c);
    
    let query = 'DELETE FROM warehouses WHERE id = ?';
    const params: string[] = [id];
    
    if (companyId) {
      query += ' AND company_id = ?';
      params.push(companyId);
    }
    
    await c.env.DB.prepare(query).bind(...params).run();
    
    return c.json({ message: 'Warehouse deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting warehouse:', error);
    return c.json({ error: 'Failed to delete warehouse', detail: error.message }, 500);
  }
});

// ==================== STOCK ITEMS ====================

// GET /api/inventory/items - List all inventory items
inventory.get('/items', async (c) => {
  try {
    const companyId = await getCompanyId(c);
    const search = c.req.query('search');
    const warehouseId = c.req.query('warehouse_id');
    
    let query = 'SELECT * FROM products';
    const conditions: string[] = [];
    const params: string[] = [];
    
    if (companyId) {
      conditions.push('company_id = ?');
      params.push(companyId);
    }
    
    if (search) {
      conditions.push('(name LIKE ? OR code LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY name ASC LIMIT 100';
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({ items: result.results || [] });
  } catch (error: any) {
    console.error('Error fetching inventory items:', error);
    return c.json({ error: 'Failed to fetch inventory items', detail: error.message }, 500);
  }
});

// ==================== STOCK MOVEMENTS ====================

// GET /api/inventory/stock-movements - List stock movements
inventory.get('/stock-movements', async (c) => {
  try {
    const companyId = await getCompanyId(c);
    const productId = c.req.query('product_id');
    const warehouseId = c.req.query('warehouse_id');
    
    let query = 'SELECT * FROM stock_movements';
    const conditions: string[] = [];
    const params: string[] = [];
    
    if (companyId) {
      conditions.push('company_id = ?');
      params.push(companyId);
    }
    
    if (productId) {
      conditions.push('product_id = ?');
      params.push(productId);
    }
    
    if (warehouseId) {
      conditions.push('warehouse_id = ?');
      params.push(warehouseId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC LIMIT 100';
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({ movements: result.results || [] });
  } catch (error: any) {
    console.error('Error fetching stock movements:', error);
    return c.json({ error: 'Failed to fetch stock movements', detail: error.message }, 500);
  }
});

// POST /api/inventory/stock-movements - Create stock movement
inventory.post('/stock-movements', async (c) => {
  try {
    const body = await c.req.json();
    const companyId = await getCompanyId(c);
    
    const { product_id, warehouse_id, movement_type, quantity, reference, notes } = body;
    
    if (!product_id || !movement_type || quantity === undefined) {
      return c.json({ error: 'Product ID, movement type, and quantity are required' }, 400);
    }
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      INSERT INTO stock_movements (id, company_id, product_id, warehouse_id, movement_type, quantity, reference, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      companyId,
      product_id,
      warehouse_id || null,
      movement_type,
      quantity,
      reference || '',
      notes || '',
      now
    ).run();
    
    return c.json({ id, message: 'Stock movement created successfully' }, 201);
  } catch (error: any) {
    console.error('Error creating stock movement:', error);
    return c.json({ error: 'Failed to create stock movement', detail: error.message }, 500);
  }
});

// ==================== INVENTORY VALUATION ====================

// GET /api/inventory/valuation - Get inventory valuation summary
inventory.get('/valuation', async (c) => {
  try {
    const companyId = await getCompanyId(c);
    
    let query = `
      SELECT 
        COUNT(*) as total_items,
        SUM(COALESCE(stock_quantity, 0)) as total_quantity,
        SUM(COALESCE(stock_quantity, 0) * COALESCE(cost_price, 0)) as total_value
      FROM products
    `;
    const params: string[] = [];
    
    if (companyId) {
      query += ' WHERE company_id = ?';
      params.push(companyId);
    }
    
    const result = await c.env.DB.prepare(query).bind(...params).first();
    
    return c.json({
      total_items: result?.total_items || 0,
      total_quantity: result?.total_quantity || 0,
      total_value: result?.total_value || 0
    });
  } catch (error: any) {
    console.error('Error fetching inventory valuation:', error);
    return c.json({ error: 'Failed to fetch inventory valuation', detail: error.message }, 500);
  }
});

// ==================== STOCK ON HAND ====================

inventory.get('/stock-on-hand', async (c) => {
  try {
    const companyId = await getCompanyId(c);
    let query = `
      SELECT p.id, p.product_code, p.product_name, p.category,
             COALESCE(p.quantity_on_hand, 0) as quantity_on_hand,
             COALESCE(p.cost_price, 0) as cost_price,
             COALESCE(p.unit_price, 0) as unit_price,
             COALESCE(p.reorder_level, 0) as reorder_level,
             COALESCE(p.quantity_on_hand, 0) * COALESCE(p.cost_price, 0) as stock_value
      FROM products p
      WHERE p.is_active = 1 AND p.is_service = 0
    `;
    const params: string[] = [];
    if (companyId) {
      query += ' AND p.company_id = ?';
      params.push(companyId);
    }
    query += ' ORDER BY p.product_name ASC';
    const result = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ stock: result.results || [], total: result.results?.length || 0 });
  } catch (error: any) {
    console.error('Error fetching stock on hand:', error);
    return c.json({ stock: [], total: 0 });
  }
});

inventory.get('/stock-levels', async (c) => {
  try {
    const companyId = await getCompanyId(c);
    const query = companyId
      ? 'SELECT p.id, p.product_code, p.product_name, COALESCE(p.quantity_on_hand, 0) as quantity, COALESCE(p.reorder_level, 0) as reorder_level FROM products p WHERE p.company_id = ? AND p.is_active = 1 ORDER BY p.product_name'
      : 'SELECT p.id, p.product_code, p.product_name, COALESCE(p.quantity_on_hand, 0) as quantity, COALESCE(p.reorder_level, 0) as reorder_level FROM products p WHERE p.is_active = 1 ORDER BY p.product_name';
    const result = companyId ? await c.env.DB.prepare(query).bind(companyId).all() : await c.env.DB.prepare(query).all();
    return c.json({ data: result.results || [] });
  } catch { return c.json({ data: [] }); }
});

inventory.get('/metrics', async (c) => {
  return c.json({ total_products: 0, total_warehouses: 0, low_stock_items: 0, stock_value: 0 });
});

export default inventory;
