/**
 * Manufacturing Routes - Work Orders, BOMs, Production, Quality
 * 
 * Now queries REAL database tables instead of returning hardcoded demo data.
 * Tables: work_orders, bill_of_materials, bom_components, production_runs, quality_checks, machines
 */

import { Hono } from 'hono';
import { jwtVerify } from 'jose';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const manufacturing = new Hono<{ Bindings: Env }>();

// Helper to verify JWT and get company_id
async function getAuthenticatedCompanyId(c: any): Promise<string | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.req.query('company_id') || c.req.header('X-Company-ID') || null;
  }
  
  try {
    const token = authHeader.substring(7);
    const secretKey = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return (payload as any).company_id || c.req.query('company_id') || null;
  } catch {
    return c.req.query('company_id') || c.req.header('X-Company-ID') || null;
  }
}

// ==================== WORK ORDERS ====================

// Get all work orders
manufacturing.get('/work-orders', async (c) => {
  try {
    const companyId = await getAuthenticatedCompanyId(c);
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }
    
    const status = c.req.query('status');
    
    let query = `
      SELECT wo.*, p.product_name, bom.bom_name
      FROM work_orders wo
      LEFT JOIN products p ON wo.product_id = p.id
      LEFT JOIN bill_of_materials bom ON wo.bom_id = bom.id
      WHERE wo.company_id = ?
    `;
    const params: any[] = [companyId];
    
    if (status) {
      query += ' AND wo.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY wo.created_at DESC';
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    const workOrders = (result.results || []).map((wo: any) => ({
      id: wo.id,
      wo_number: wo.work_order_number,
      product_id: wo.product_id,
      product_name: wo.product_name || 'Unknown Product',
      quantity_to_produce: wo.planned_quantity,
      quantity_produced: wo.completed_quantity,
      start_date: wo.planned_start_date,
      due_date: wo.planned_end_date,
      status: wo.status,
      priority: wo.priority,
      notes: wo.notes,
      created_at: wo.created_at
    }));

    return c.json(workOrders);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return c.json({ error: 'Failed to fetch work orders' }, 500);
  }
});

// Get single work order
manufacturing.get('/work-orders/:id', async (c) => {
  try {
    const companyId = await getAuthenticatedCompanyId(c);
    const id = c.req.param('id');
    
    const wo = await c.env.DB.prepare(`
      SELECT wo.*, p.product_name
      FROM work_orders wo
      LEFT JOIN products p ON wo.product_id = p.id
      WHERE wo.id = ? AND wo.company_id = ?
    `).bind(id, companyId).first();
    
    if (!wo) {
      return c.json({ error: 'Work order not found' }, 404);
    }
    
    return c.json({
      id: wo.id,
      wo_number: wo.work_order_number,
      product_id: wo.product_id,
      product_name: wo.product_name,
      quantity_to_produce: wo.planned_quantity,
      quantity_produced: wo.completed_quantity,
      status: wo.status,
      priority: wo.priority
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch work order' }, 500);
  }
});

// Create work order
manufacturing.post('/work-orders', async (c) => {
  try {
    const companyId = await getAuthenticatedCompanyId(c);
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }
    
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const woNumber = `WO-${Date.now()}`;
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      INSERT INTO work_orders (id, company_id, work_order_number, product_id, planned_quantity, status, priority, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?)
    `).bind(id, companyId, woNumber, body.product_id, body.planned_quantity || 1, body.priority || 'normal', body.notes || null, now, now).run();
    
    return c.json({ id, wo_number: woNumber, status: 'planned' }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create work order' }, 500);
  }
});

// Release work order
manufacturing.post('/work-orders/:id/release', async (c) => {
  try {
    const companyId = await getAuthenticatedCompanyId(c);
    const id = c.req.param('id');
    await c.env.DB.prepare('UPDATE work_orders SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?')
      .bind('released', new Date().toISOString(), id, companyId).run();
    return c.json({ id, status: 'released', message: 'Work order released' });
  } catch (error) {
    return c.json({ error: 'Failed to release work order' }, 500);
  }
});

// Start work order
manufacturing.post('/work-orders/:id/start', async (c) => {
  try {
    const companyId = await getAuthenticatedCompanyId(c);
    const id = c.req.param('id');
    const now = new Date().toISOString();
    await c.env.DB.prepare('UPDATE work_orders SET status = ?, actual_start_date = ?, updated_at = ? WHERE id = ? AND company_id = ?')
      .bind('in_progress', now, now, id, companyId).run();
    return c.json({ id, status: 'in_progress', message: 'Work order started' });
  } catch (error) {
    return c.json({ error: 'Failed to start work order' }, 500);
  }
});

// Complete work order
manufacturing.post('/work-orders/:id/complete', async (c) => {
  try {
    const companyId = await getAuthenticatedCompanyId(c);
    const id = c.req.param('id');
    const now = new Date().toISOString();
    await c.env.DB.prepare('UPDATE work_orders SET status = ?, actual_end_date = ?, updated_at = ? WHERE id = ? AND company_id = ?')
      .bind('completed', now, now, id, companyId).run();
    return c.json({ id, status: 'completed', message: 'Work order completed' });
  } catch (error) {
    return c.json({ error: 'Failed to complete work order' }, 500);
  }
});

// ==================== BILL OF MATERIALS ====================

manufacturing.get('/boms', async (c) => {
  try {
    const companyId = await getAuthenticatedCompanyId(c);
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }
    
    const result = await c.env.DB.prepare(`
      SELECT bom.*, p.product_name
      FROM bill_of_materials bom
      LEFT JOIN products p ON bom.product_id = p.id
      WHERE bom.company_id = ?
      ORDER BY bom.created_at DESC
    `).bind(companyId).all();
    
    return c.json(result.results || []);
  } catch (error) {
    return c.json({ error: 'Failed to fetch BOMs' }, 500);
  }
});

// ==================== PRODUCTION RUNS ====================

manufacturing.get('/production', async (c) => {
  try {
    const companyId = await getAuthenticatedCompanyId(c);
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }
    
    const result = await c.env.DB.prepare(`
      SELECT pr.*, wo.work_order_number as wo_number
      FROM production_runs pr
      LEFT JOIN work_orders wo ON pr.work_order_id = wo.id
      WHERE pr.company_id = ?
      ORDER BY pr.run_date DESC
    `).bind(companyId).all();
    
    return c.json(result.results || []);
  } catch (error) {
    return c.json({ error: 'Failed to fetch production runs' }, 500);
  }
});

// ==================== QUALITY CHECKS ====================

manufacturing.get('/quality', async (c) => {
  try {
    const companyId = await getAuthenticatedCompanyId(c);
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }
    
    const result = await c.env.DB.prepare(`
      SELECT qc.*, e.first_name || ' ' || e.last_name as inspector_name
      FROM quality_checks qc
      LEFT JOIN employees e ON qc.inspector_id = e.id
      WHERE qc.company_id = ?
      ORDER BY qc.check_date DESC
    `).bind(companyId).all();
    
    return c.json(result.results || []);
  } catch (error) {
    return c.json({ error: 'Failed to fetch quality checks' }, 500);
  }
});

// ==================== MACHINES ====================

manufacturing.get('/machines', async (c) => {
  try {
    const companyId = await getAuthenticatedCompanyId(c);
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }
    
    const result = await c.env.DB.prepare('SELECT * FROM machines WHERE company_id = ? ORDER BY machine_code')
      .bind(companyId).all();
    
    return c.json(result.results || []);
  } catch (error) {
    return c.json({ error: 'Failed to fetch machines' }, 500);
  }
});

export default manufacturing;
