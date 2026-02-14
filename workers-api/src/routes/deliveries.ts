/**
 * ARIA ERP - Deliveries API Routes
 * Order to Cash - Deliveries CRUD
 */

import { Hono } from 'hono';
import { getSecureCompanyId } from '../middleware/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT?: string;
}

const deliveries = new Hono<{ Bindings: Env }>();

// Get all deliveries
deliveries.get('/', async (c) => {
  const db = c.env.DB;
  const companyId = await getSecureCompanyId(c);
  
  try {
    const url = new URL(c.req.url);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const customerId = url.searchParams.get('customer_id') || '';
    
    let query = `
      SELECT 
        d.id,
        d.delivery_number,
        d.sales_order_id,
        so.order_number as sales_order_number,
        d.customer_id,
        c.name as customer_name,
        d.warehouse_id,
        w.name as warehouse_name,
        d.delivery_date,
        d.status,
        d.tracking_number,
        d.carrier,
        d.notes,
        d.created_at,
        d.updated_at
      FROM deliveries d
      LEFT JOIN sales_orders so ON d.sales_order_id = so.id
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN warehouses w ON d.warehouse_id = w.id
      WHERE d.company_id = ?
    `;
    
    const params: (string | number)[] = [companyId];
    
    if (search) {
      query += ` AND (d.delivery_number LIKE ? OR c.name LIKE ? OR d.tracking_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (status) {
      query += ` AND d.status = ?`;
      params.push(status);
    }
    
    if (customerId) {
      query += ` AND d.customer_id = ?`;
      params.push(customerId);
    }
    
    query += ` ORDER BY d.created_at DESC LIMIT 100`;
    
    const result = await db.prepare(query).bind(...params).all();
    
    return c.json(result.results || []);
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    // Return empty array on error (table might not exist)
    return c.json([]);
  }
});

// Get single delivery by ID
deliveries.get('/:id', async (c) => {
  const db = c.env.DB;
  const companyId = await getSecureCompanyId(c);
  const id = c.req.param('id');
  
  try {
    const delivery = await db.prepare(`
      SELECT 
        d.*,
        so.order_number as sales_order_number,
        c.name as customer_name,
        w.name as warehouse_name
      FROM deliveries d
      LEFT JOIN sales_orders so ON d.sales_order_id = so.id
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN warehouses w ON d.warehouse_id = w.id
      WHERE d.id = ? AND d.company_id = ?
    `).bind(id, companyId).first();
    
    if (!delivery) {
      return c.json({ error: 'Delivery not found' }, 404);
    }
    
    // Get delivery lines
    const lines = await db.prepare(`
      SELECT 
        dl.*,
        p.code as product_code,
        p.name as product_name
      FROM delivery_lines dl
      LEFT JOIN products p ON dl.product_id = p.id
      WHERE dl.delivery_id = ?
      ORDER BY dl.line_number
    `).bind(id).all();
    
    return c.json({
      ...delivery,
      lines: lines.results || []
    });
  } catch (error) {
    console.error('Error fetching delivery:', error);
    return c.json({ error: 'Failed to fetch delivery' }, 500);
  }
});

// Create new delivery
deliveries.post('/', async (c) => {
  const db = c.env.DB;
  const companyId = await getSecureCompanyId(c);
  const body = await c.req.json();
  
  try {
    const id = crypto.randomUUID();
    
    // Generate delivery number
    const lastDelivery = await db.prepare(`
      SELECT delivery_number FROM deliveries 
      WHERE company_id = ? 
      ORDER BY created_at DESC LIMIT 1
    `).bind(companyId).first<{ delivery_number: string }>();
    
    let nextNumber = 1;
    if (lastDelivery?.delivery_number) {
      const match = lastDelivery.delivery_number.match(/DEL-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    const deliveryNumber = `DEL-${String(nextNumber).padStart(6, '0')}`;
    
    await db.prepare(`
      INSERT INTO deliveries (
        id, company_id, delivery_number, sales_order_id, customer_id,
        warehouse_id, delivery_date, status, tracking_number, carrier, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      id,
      companyId,
      deliveryNumber,
      body.sales_order_id || null,
      body.customer_id,
      body.warehouse_id || null,
      body.delivery_date || new Date().toISOString().split('T')[0],
      body.tracking_number || null,
      body.carrier || null,
      body.notes || null
    ).run();
    
    // Insert delivery lines
    if (body.lines && Array.isArray(body.lines)) {
      for (const line of body.lines) {
        const lineId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO delivery_lines (
            id, delivery_id, line_number, product_id, description,
            quantity, quantity_shipped, storage_location_id
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)
        `).bind(
          lineId,
          id,
          line.line_number || 1,
          line.product_id || null,
          line.description || '',
          line.quantity || 0,
          line.storage_location_id || null
        ).run();
      }
    }
    
    return c.json({ id, delivery_number: deliveryNumber }, 201);
  } catch (error) {
    console.error('Error creating delivery:', error);
    return c.json({ error: 'Failed to create delivery' }, 500);
  }
});

// Update delivery
deliveries.put('/:id', async (c) => {
  const db = c.env.DB;
  const companyId = await getSecureCompanyId(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  
  try {
    // Check if delivery exists and belongs to company
    const existing = await db.prepare(`
      SELECT id, status FROM deliveries WHERE id = ? AND company_id = ?
    `).bind(id, companyId).first();
    
    if (!existing) {
      return c.json({ error: 'Delivery not found' }, 404);
    }
    
    await db.prepare(`
      UPDATE deliveries SET
        customer_id = ?,
        warehouse_id = ?,
        delivery_date = ?,
        tracking_number = ?,
        carrier = ?,
        notes = ?,
        updated_at = datetime('now')
      WHERE id = ? AND company_id = ?
    `).bind(
      body.customer_id,
      body.warehouse_id || null,
      body.delivery_date,
      body.tracking_number || null,
      body.carrier || null,
      body.notes || null,
      id,
      companyId
    ).run();
    
    // Update lines if provided
    if (body.lines && Array.isArray(body.lines)) {
      // Delete existing lines
      await db.prepare(`DELETE FROM delivery_lines WHERE delivery_id = ?`).bind(id).run();
      
      // Insert new lines
      for (const line of body.lines) {
        const lineId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO delivery_lines (
            id, delivery_id, line_number, product_id, description,
            quantity, quantity_shipped, storage_location_id
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)
        `).bind(
          lineId,
          id,
          line.line_number || 1,
          line.product_id || null,
          line.description || '',
          line.quantity || 0,
          line.storage_location_id || null
        ).run();
      }
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating delivery:', error);
    return c.json({ error: 'Failed to update delivery' }, 500);
  }
});

// Ship delivery
deliveries.post('/:id/ship', async (c) => {
  const db = c.env.DB;
  const companyId = await getSecureCompanyId(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  
  try {
    // Check if delivery exists
    const delivery = await db.prepare(`
      SELECT id, status FROM deliveries WHERE id = ? AND company_id = ?
    `).bind(id, companyId).first();
    
    if (!delivery) {
      return c.json({ error: 'Delivery not found' }, 404);
    }
    
    // Update delivery status to shipped
    await db.prepare(`
      UPDATE deliveries SET
        status = 'shipped',
        tracking_number = COALESCE(?, tracking_number),
        carrier = COALESCE(?, carrier),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ? AND company_id = ?
    `).bind(
      body.tracking_number || null,
      body.carrier || null,
      body.notes || null,
      id,
      companyId
    ).run();
    
    // Update line quantities shipped
    await db.prepare(`
      UPDATE delivery_lines SET quantity_shipped = quantity WHERE delivery_id = ?
    `).bind(id).run();
    
    return c.json({ success: true, status: 'shipped' });
  } catch (error) {
    console.error('Error shipping delivery:', error);
    return c.json({ error: 'Failed to ship delivery' }, 500);
  }
});

// Complete delivery
deliveries.post('/:id/complete', async (c) => {
  const db = c.env.DB;
  const companyId = await getSecureCompanyId(c);
  const id = c.req.param('id');
  
  try {
    // Check if delivery exists
    const delivery = await db.prepare(`
      SELECT id, status FROM deliveries WHERE id = ? AND company_id = ?
    `).bind(id, companyId).first();
    
    if (!delivery) {
      return c.json({ error: 'Delivery not found' }, 404);
    }
    
    // Update delivery status to completed
    await db.prepare(`
      UPDATE deliveries SET
        status = 'completed',
        updated_at = datetime('now')
      WHERE id = ? AND company_id = ?
    `).bind(id, companyId).run();
    
    return c.json({ success: true, status: 'completed' });
  } catch (error) {
    console.error('Error completing delivery:', error);
    return c.json({ error: 'Failed to complete delivery' }, 500);
  }
});

// Delete delivery
deliveries.delete('/:id', async (c) => {
  const db = c.env.DB;
  const companyId = await getSecureCompanyId(c);
  const id = c.req.param('id');
  
  try {
    // Check if delivery exists and is in draft status
    const delivery = await db.prepare(`
      SELECT id, status FROM deliveries WHERE id = ? AND company_id = ?
    `).bind(id, companyId).first<{ id: string; status: string }>();
    
    if (!delivery) {
      return c.json({ error: 'Delivery not found' }, 404);
    }
    
    if (delivery.status !== 'draft') {
      return c.json({ error: 'Can only delete draft deliveries' }, 400);
    }
    
    // Delete lines first
    await db.prepare(`DELETE FROM delivery_lines WHERE delivery_id = ?`).bind(id).run();
    
    // Delete delivery
    await db.prepare(`DELETE FROM deliveries WHERE id = ? AND company_id = ?`).bind(id, companyId).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting delivery:', error);
    return c.json({ error: 'Failed to delete delivery' }, 500);
  }
});

export default deliveries;
