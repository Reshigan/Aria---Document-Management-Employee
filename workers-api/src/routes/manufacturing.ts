/**
 * Manufacturing Routes - Work Orders, BOMs, Production
 */

import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const manufacturing = new Hono<{ Bindings: Env }>();

// Get all work orders
manufacturing.get('/work-orders', async (c) => {
  try {
    const companyId = c.req.query('company_id') || c.req.header('X-Company-ID');
    
    // Return demo data for now - in production this would query the database
    const workOrders = [
      {
        id: 'wo-001',
        wo_number: 'WO-2025-001',
        product_id: 'prod-001',
        product_name: 'Laptop Dell XPS 15',
        quantity_to_produce: 50,
        quantity_produced: 25,
        warehouse_id: 'wh-001',
        warehouse_name: 'Main Warehouse',
        start_date: '2025-01-15',
        due_date: '2025-01-30',
        status: 'in_progress',
        priority: 'high',
        notes: 'Rush order for Q1',
        created_by: 'system',
        created_at: '2025-01-10T08:00:00Z'
      },
      {
        id: 'wo-002',
        wo_number: 'WO-2025-002',
        product_id: 'prod-002',
        product_name: 'Office Chair Executive',
        quantity_to_produce: 100,
        quantity_produced: 100,
        warehouse_id: 'wh-001',
        warehouse_name: 'Main Warehouse',
        start_date: '2025-01-05',
        due_date: '2025-01-20',
        completion_date: '2025-01-18',
        status: 'completed',
        priority: 'normal',
        notes: 'Standard production run',
        created_by: 'system',
        created_at: '2025-01-03T08:00:00Z'
      },
      {
        id: 'wo-003',
        wo_number: 'WO-2025-003',
        product_id: 'prod-003',
        product_name: 'Printer HP LaserJet',
        quantity_to_produce: 30,
        quantity_produced: 0,
        warehouse_id: 'wh-002',
        warehouse_name: 'Secondary Warehouse',
        start_date: '2025-02-01',
        due_date: '2025-02-15',
        status: 'draft',
        priority: 'low',
        notes: 'Pending materials',
        created_by: 'system',
        created_at: '2025-01-20T08:00:00Z'
      }
    ];

    return c.json(workOrders);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return c.json({ error: 'Failed to fetch work orders' }, 500);
  }
});

// Get single work order
manufacturing.get('/work-orders/:id', async (c) => {
  const id = c.req.param('id');
  
  return c.json({
    id,
    wo_number: 'WO-2025-001',
    product_id: 'prod-001',
    product_name: 'Laptop Dell XPS 15',
    quantity_to_produce: 50,
    quantity_produced: 25,
    status: 'in_progress',
    priority: 'high'
  });
});

// Create work order
manufacturing.post('/work-orders', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    
    return c.json({
      id,
      wo_number: `WO-${Date.now()}`,
      ...body,
      status: 'draft',
      quantity_produced: 0,
      created_at: new Date().toISOString()
    }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create work order' }, 500);
  }
});

// Release work order
manufacturing.post('/work-orders/:id/release', async (c) => {
  const id = c.req.param('id');
  return c.json({ id, status: 'released', message: 'Work order released' });
});

// Start work order
manufacturing.post('/work-orders/:id/start', async (c) => {
  const id = c.req.param('id');
  return c.json({ id, status: 'in_progress', message: 'Work order started' });
});

// Complete work order
manufacturing.post('/work-orders/:id/complete', async (c) => {
  const id = c.req.param('id');
  return c.json({ id, status: 'completed', message: 'Work order completed' });
});

// Get BOMs (Bill of Materials)
manufacturing.get('/boms', async (c) => {
  return c.json([
    {
      id: 'bom-001',
      product_id: 'prod-001',
      product_name: 'Laptop Dell XPS 15',
      version: '1.0',
      status: 'active',
      components: [
        { item_id: 'comp-001', item_name: 'CPU Intel i7', quantity: 1, unit: 'pcs' },
        { item_id: 'comp-002', item_name: 'RAM 16GB', quantity: 2, unit: 'pcs' },
        { item_id: 'comp-003', item_name: 'SSD 512GB', quantity: 1, unit: 'pcs' }
      ]
    }
  ]);
});

// Get production runs
manufacturing.get('/production', async (c) => {
  return c.json([
    {
      id: 'prod-run-001',
      work_order_id: 'wo-001',
      wo_number: 'WO-2025-001',
      quantity_planned: 50,
      quantity_completed: 25,
      start_time: '2025-01-15T08:00:00Z',
      status: 'in_progress'
    }
  ]);
});

// Get quality checks
manufacturing.get('/quality', async (c) => {
  return c.json([
    {
      id: 'qc-001',
      work_order_id: 'wo-002',
      wo_number: 'WO-2025-002',
      inspection_date: '2025-01-18',
      result: 'passed',
      inspector: 'John Smith',
      notes: 'All units passed quality inspection'
    }
  ]);
});

export default manufacturing;
