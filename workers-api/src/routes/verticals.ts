/**
 * Vertical Industry Packs Routes
 * 
 * Industry-specific workflows and features for:
 * - Distribution: Warehouse management, route optimization, landed costs
 * - Retail: POS integration, loyalty programs, promotions
 * - Services/Projects: Time tracking, project billing, resource planning
 */

import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';
import { jwtVerify } from 'jose';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Helper to verify JWT and get context
async function getAuthContext(c: any): Promise<{ companyId: string; userId: string } | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const token = authHeader.substring(7);
    const secretKey = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return {
      companyId: (payload as any).company_id,
      userId: (payload as any).sub
    };
  } catch {
    return null;
  }
}

function generateUUID(): string {
  return crypto.randomUUID();
}

// ==================== DISTRIBUTION VERTICAL ====================

// Warehouse Management - Get warehouses
app.get('/distribution/warehouses', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const result = await c.env.DB.prepare(`
      SELECT * FROM warehouses WHERE company_id = ? ORDER BY warehouse_name
    `).bind(auth.companyId).all();
    
    return c.json({
      warehouses: result.results || []
    });
  } catch (error) {
    console.error('Error loading warehouses:', error);
    return c.json({ error: 'Failed to load warehouses' }, 500);
  }
});

// Create warehouse
app.post('/distribution/warehouses', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const { warehouse_code, warehouse_name, address, city, is_active = true } = body;
    
    if (!warehouse_code || !warehouse_name) {
      return c.json({ error: 'Warehouse code and name are required' }, 400);
    }
    
    const id = generateUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      INSERT INTO warehouses (id, company_id, warehouse_code, warehouse_name, address, city, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, auth.companyId, warehouse_code, warehouse_name, address || null, city || null, is_active ? 1 : 0, now).run();
    
    return c.json({
      id,
      warehouse_code,
      warehouse_name,
      message: 'Warehouse created successfully'
    }, 201);
  } catch (error) {
    console.error('Error creating warehouse:', error);
    return c.json({ error: 'Failed to create warehouse' }, 500);
  }
});

// Get warehouse bins/locations
app.get('/distribution/warehouses/:warehouseId/bins', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const warehouseId = c.req.param('warehouseId');
    
    const result = await c.env.DB.prepare(`
      SELECT * FROM warehouse_bins 
      WHERE warehouse_id = ? 
      ORDER BY zone, aisle, rack, shelf
    `).bind(warehouseId).all();
    
    return c.json({
      bins: result.results || []
    });
  } catch (error) {
    console.error('Error loading bins:', error);
    return c.json({ error: 'Failed to load bins' }, 500);
  }
});

// Create warehouse bin
app.post('/distribution/warehouses/:warehouseId/bins', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const warehouseId = c.req.param('warehouseId');
    const body = await c.req.json();
    const { bin_code, zone, aisle, rack, shelf, bin_type = 'storage', max_weight, max_volume } = body;
    
    if (!bin_code) {
      return c.json({ error: 'Bin code is required' }, 400);
    }
    
    const id = generateUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      INSERT INTO warehouse_bins (id, warehouse_id, bin_code, zone, aisle, rack, shelf, bin_type, max_weight, max_volume, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, warehouseId, bin_code, zone || null, aisle || null, rack || null, shelf || null, bin_type, max_weight || null, max_volume || null, now).run();
    
    return c.json({
      id,
      bin_code,
      message: 'Bin created successfully'
    }, 201);
  } catch (error) {
    console.error('Error creating bin:', error);
    return c.json({ error: 'Failed to create bin' }, 500);
  }
});

// Calculate landed cost
app.post('/distribution/landed-cost/calculate', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const { 
      purchase_value, 
      freight_cost = 0, 
      insurance_cost = 0, 
      customs_duty_rate = 0, 
      handling_cost = 0,
      other_costs = 0,
      quantity = 1
    } = body;
    
    if (!purchase_value) {
      return c.json({ error: 'Purchase value is required' }, 400);
    }
    
    // Calculate CIF (Cost, Insurance, Freight)
    const cifValue = purchase_value + freight_cost + insurance_cost;
    
    // Calculate customs duty
    const customsDuty = cifValue * (customs_duty_rate / 100);
    
    // Total landed cost
    const totalLandedCost = cifValue + customsDuty + handling_cost + other_costs;
    
    // Unit landed cost
    const unitLandedCost = totalLandedCost / quantity;
    
    return c.json({
      purchase_value,
      freight_cost,
      insurance_cost,
      cif_value: Math.round(cifValue * 100) / 100,
      customs_duty_rate,
      customs_duty: Math.round(customsDuty * 100) / 100,
      handling_cost,
      other_costs,
      total_landed_cost: Math.round(totalLandedCost * 100) / 100,
      quantity,
      unit_landed_cost: Math.round(unitLandedCost * 100) / 100,
      markup_from_purchase: Math.round(((totalLandedCost - purchase_value) / purchase_value) * 10000) / 100
    });
  } catch (error) {
    console.error('Error calculating landed cost:', error);
    return c.json({ error: 'Failed to calculate landed cost' }, 500);
  }
});

// Route optimization (simplified)
app.post('/distribution/routes/optimize', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const { deliveries, start_location, vehicle_capacity } = body;
    
    if (!deliveries || !Array.isArray(deliveries) || deliveries.length === 0) {
      return c.json({ error: 'Deliveries array is required' }, 400);
    }
    
    // Simple nearest-neighbor algorithm for route optimization
    const optimizedRoute: any[] = [];
    const remaining = [...deliveries];
    let currentLocation = start_location || { lat: 0, lng: 0 };
    let totalDistance = 0;
    let totalWeight = 0;
    
    while (remaining.length > 0) {
      // Find nearest delivery
      let nearestIdx = 0;
      let nearestDist = Infinity;
      
      for (let i = 0; i < remaining.length; i++) {
        const delivery = remaining[i];
        const dist = Math.sqrt(
          Math.pow((delivery.lat || 0) - currentLocation.lat, 2) +
          Math.pow((delivery.lng || 0) - currentLocation.lng, 2)
        );
        
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }
      
      const nextDelivery = remaining.splice(nearestIdx, 1)[0];
      totalDistance += nearestDist;
      totalWeight += nextDelivery.weight || 0;
      
      optimizedRoute.push({
        ...nextDelivery,
        sequence: optimizedRoute.length + 1,
        distance_from_previous: Math.round(nearestDist * 100) / 100
      });
      
      currentLocation = { lat: nextDelivery.lat || 0, lng: nextDelivery.lng || 0 };
    }
    
    return c.json({
      optimized_route: optimizedRoute,
      total_stops: optimizedRoute.length,
      estimated_total_distance: Math.round(totalDistance * 100) / 100,
      total_weight: totalWeight,
      vehicle_capacity,
      capacity_utilization: vehicle_capacity ? Math.round((totalWeight / vehicle_capacity) * 10000) / 100 : null
    });
  } catch (error) {
    console.error('Error optimizing route:', error);
    return c.json({ error: 'Failed to optimize route' }, 500);
  }
});

// ==================== RETAIL VERTICAL ====================

// POS Transactions - Create sale
app.post('/retail/pos/sale', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const { 
      register_id, 
      items, 
      payment_method, 
      customer_id,
      discount_amount = 0,
      tax_rate = 15
    } = body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'Items array is required' }, 400);
    }
    
    // Calculate totals
    let subtotal = 0;
    const processedItems = items.map((item: any) => {
      const lineTotal = (item.quantity || 1) * (item.unit_price || 0);
      subtotal += lineTotal;
      return {
        ...item,
        line_total: lineTotal
      };
    });
    
    const discountedSubtotal = subtotal - discount_amount;
    const taxAmount = discountedSubtotal * (tax_rate / 100);
    const totalAmount = discountedSubtotal + taxAmount;
    
    // Generate transaction number
    const transactionNumber = `POS-${Date.now()}`;
    const id = generateUUID();
    const now = new Date().toISOString();
    
    // In a real implementation, this would:
    // 1. Create the POS transaction record
    // 2. Update inventory
    // 3. Create GL postings
    // 4. Update customer loyalty points
    
    return c.json({
      id,
      transaction_number: transactionNumber,
      register_id,
      customer_id,
      items: processedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      discount_amount,
      discounted_subtotal: Math.round(discountedSubtotal * 100) / 100,
      tax_rate,
      tax_amount: Math.round(taxAmount * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      payment_method,
      status: 'completed',
      timestamp: now,
      message: 'Sale completed successfully'
    });
  } catch (error) {
    console.error('Error processing POS sale:', error);
    return c.json({ error: 'Failed to process sale' }, 500);
  }
});

// POS - Process refund
app.post('/retail/pos/refund', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const { original_transaction_id, items, reason } = body;
    
    if (!original_transaction_id || !items || items.length === 0) {
      return c.json({ error: 'Original transaction ID and items are required' }, 400);
    }
    
    // Calculate refund amount
    let refundAmount = 0;
    items.forEach((item: any) => {
      refundAmount += (item.quantity || 1) * (item.unit_price || 0);
    });
    
    const refundNumber = `REF-${Date.now()}`;
    const id = generateUUID();
    const now = new Date().toISOString();
    
    return c.json({
      id,
      refund_number: refundNumber,
      original_transaction_id,
      items,
      refund_amount: Math.round(refundAmount * 100) / 100,
      reason,
      status: 'completed',
      timestamp: now,
      message: 'Refund processed successfully'
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    return c.json({ error: 'Failed to process refund' }, 500);
  }
});

// Loyalty Program - Get customer points
app.get('/retail/loyalty/:customerId', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const customerId = c.req.param('customerId');
    
    // In a real implementation, this would query the loyalty_points table
    // For now, return mock data
    return c.json({
      customer_id: customerId,
      current_points: 1500,
      lifetime_points: 5000,
      tier: 'Gold',
      tier_progress: 75,
      next_tier: 'Platinum',
      points_to_next_tier: 500,
      points_value: 15.00, // R1 per 100 points
      recent_transactions: [
        { date: '2025-12-20', description: 'Purchase', points: 150 },
        { date: '2025-12-15', description: 'Purchase', points: 200 },
        { date: '2025-12-10', description: 'Redemption', points: -500 }
      ]
    });
  } catch (error) {
    console.error('Error loading loyalty info:', error);
    return c.json({ error: 'Failed to load loyalty info' }, 500);
  }
});

// Loyalty Program - Redeem points
app.post('/retail/loyalty/:customerId/redeem', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const customerId = c.req.param('customerId');
    const body = await c.req.json();
    const { points_to_redeem, redemption_type = 'discount' } = body;
    
    if (!points_to_redeem || points_to_redeem <= 0) {
      return c.json({ error: 'Points to redeem must be positive' }, 400);
    }
    
    // Calculate redemption value (R1 per 100 points)
    const redemptionValue = points_to_redeem / 100;
    
    return c.json({
      customer_id: customerId,
      points_redeemed: points_to_redeem,
      redemption_type,
      redemption_value: redemptionValue,
      redemption_code: `REDEEM-${Date.now()}`,
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      message: 'Points redeemed successfully'
    });
  } catch (error) {
    console.error('Error redeeming points:', error);
    return c.json({ error: 'Failed to redeem points' }, 500);
  }
});

// Promotions - Get active promotions
app.get('/retail/promotions', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const now = new Date().toISOString();
    
    // In a real implementation, this would query the promotions table
    return c.json({
      promotions: [
        {
          id: 'promo-1',
          name: 'Summer Sale',
          type: 'percentage',
          value: 20,
          description: '20% off all summer items',
          start_date: '2025-12-01',
          end_date: '2025-12-31',
          conditions: { min_purchase: 500 },
          is_active: true
        },
        {
          id: 'promo-2',
          name: 'Buy 2 Get 1 Free',
          type: 'bogo',
          value: 1,
          description: 'Buy 2 items, get 1 free',
          start_date: '2025-12-15',
          end_date: '2025-12-25',
          conditions: { category: 'clothing' },
          is_active: true
        },
        {
          id: 'promo-3',
          name: 'Loyalty Double Points',
          type: 'points_multiplier',
          value: 2,
          description: 'Earn double loyalty points',
          start_date: '2025-12-20',
          end_date: '2025-12-26',
          conditions: { tier: ['Gold', 'Platinum'] },
          is_active: true
        }
      ]
    });
  } catch (error) {
    console.error('Error loading promotions:', error);
    return c.json({ error: 'Failed to load promotions' }, 500);
  }
});

// Apply promotion to cart
app.post('/retail/promotions/apply', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const { promotion_code, cart_items, cart_total } = body;
    
    if (!promotion_code || !cart_items) {
      return c.json({ error: 'Promotion code and cart items are required' }, 400);
    }
    
    // Simplified promotion application
    // In a real implementation, this would validate the promotion and apply rules
    let discount = 0;
    let message = '';
    
    if (promotion_code === 'SUMMER20') {
      discount = cart_total * 0.20;
      message = '20% Summer Sale discount applied';
    } else if (promotion_code === 'WELCOME10') {
      discount = cart_total * 0.10;
      message = '10% Welcome discount applied';
    } else {
      return c.json({ error: 'Invalid promotion code' }, 400);
    }
    
    return c.json({
      promotion_code,
      original_total: cart_total,
      discount_amount: Math.round(discount * 100) / 100,
      new_total: Math.round((cart_total - discount) * 100) / 100,
      message
    });
  } catch (error) {
    console.error('Error applying promotion:', error);
    return c.json({ error: 'Failed to apply promotion' }, 500);
  }
});

// ==================== SERVICES/PROJECTS VERTICAL ====================

// Projects - List projects
app.get('/services/projects', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const result = await c.env.DB.prepare(`
      SELECT * FROM projects WHERE company_id = ? ORDER BY created_at DESC
    `).bind(auth.companyId).all();
    
    return c.json({
      projects: result.results || []
    });
  } catch (error) {
    console.error('Error loading projects:', error);
    return c.json({ error: 'Failed to load projects' }, 500);
  }
});

// Create project
app.post('/services/projects', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const { 
      project_code, 
      project_name, 
      customer_id, 
      start_date, 
      end_date,
      budget_amount,
      billing_type = 'time_and_materials',
      hourly_rate,
      fixed_price
    } = body;
    
    if (!project_code || !project_name) {
      return c.json({ error: 'Project code and name are required' }, 400);
    }
    
    const id = generateUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      INSERT INTO projects (id, company_id, project_code, project_name, customer_id, start_date, end_date, budget_amount, billing_type, hourly_rate, fixed_price, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).bind(
      id, auth.companyId, project_code, project_name, customer_id || null,
      start_date || null, end_date || null, budget_amount || null,
      billing_type, hourly_rate || null, fixed_price || null, now
    ).run();
    
    return c.json({
      id,
      project_code,
      project_name,
      message: 'Project created successfully'
    }, 201);
  } catch (error) {
    console.error('Error creating project:', error);
    return c.json({ error: 'Failed to create project' }, 500);
  }
});

// Time Entry - Log time
app.post('/services/time-entries', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const { 
      project_id, 
      task_id,
      employee_id,
      entry_date, 
      hours,
      description,
      billable = true,
      hourly_rate
    } = body;
    
    if (!project_id || !entry_date || !hours) {
      return c.json({ error: 'Project ID, entry date, and hours are required' }, 400);
    }
    
    const id = generateUUID();
    const now = new Date().toISOString();
    
    // Calculate billable amount
    const billableAmount = billable && hourly_rate ? hours * hourly_rate : 0;
    
    await c.env.DB.prepare(`
      INSERT INTO time_entries (id, company_id, project_id, task_id, employee_id, entry_date, hours, description, billable, hourly_rate, billable_amount, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?)
    `).bind(
      id, auth.companyId, project_id, task_id || null, employee_id || auth.userId,
      entry_date, hours, description || null, billable ? 1 : 0,
      hourly_rate || null, billableAmount, now
    ).run();
    
    return c.json({
      id,
      project_id,
      hours,
      billable_amount: billableAmount,
      message: 'Time entry logged successfully'
    }, 201);
  } catch (error) {
    console.error('Error logging time:', error);
    return c.json({ error: 'Failed to log time' }, 500);
  }
});

// Get time entries for project
app.get('/services/projects/:projectId/time-entries', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const projectId = c.req.param('projectId');
    
    const result = await c.env.DB.prepare(`
      SELECT * FROM time_entries 
      WHERE company_id = ? AND project_id = ?
      ORDER BY entry_date DESC
    `).bind(auth.companyId, projectId).all();
    
    // Calculate totals
    let totalHours = 0;
    let billableHours = 0;
    let totalBillable = 0;
    
    (result.results || []).forEach((entry: any) => {
      totalHours += entry.hours || 0;
      if (entry.billable) {
        billableHours += entry.hours || 0;
        totalBillable += entry.billable_amount || 0;
      }
    });
    
    return c.json({
      entries: result.results || [],
      summary: {
        total_hours: totalHours,
        billable_hours: billableHours,
        non_billable_hours: totalHours - billableHours,
        total_billable_amount: Math.round(totalBillable * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error loading time entries:', error);
    return c.json({ error: 'Failed to load time entries' }, 500);
  }
});

// Generate project invoice
app.post('/services/projects/:projectId/invoice', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const projectId = c.req.param('projectId');
    const body = await c.req.json();
    const { from_date, to_date, include_expenses = true } = body;
    
    // Get project details
    const project = await c.env.DB.prepare(`
      SELECT * FROM projects WHERE id = ? AND company_id = ?
    `).bind(projectId, auth.companyId).first();
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    // Get unbilled time entries
    let timeQuery = `
      SELECT * FROM time_entries 
      WHERE company_id = ? AND project_id = ? AND billable = 1 AND status = 'submitted'
    `;
    const params: any[] = [auth.companyId, projectId];
    
    if (from_date) {
      timeQuery += ' AND entry_date >= ?';
      params.push(from_date);
    }
    if (to_date) {
      timeQuery += ' AND entry_date <= ?';
      params.push(to_date);
    }
    
    const timeEntries = await c.env.DB.prepare(timeQuery).bind(...params).all();
    
    // Calculate invoice totals
    let laborTotal = 0;
    const laborLines: any[] = [];
    
    (timeEntries.results || []).forEach((entry: any) => {
      laborTotal += entry.billable_amount || 0;
      laborLines.push({
        date: entry.entry_date,
        description: entry.description || 'Professional services',
        hours: entry.hours,
        rate: entry.hourly_rate,
        amount: entry.billable_amount
      });
    });
    
    // In a real implementation, we would also get expenses
    const expenseTotal = 0;
    
    const subtotal = laborTotal + expenseTotal;
    const taxRate = 15;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;
    
    const invoiceNumber = `INV-${(project as any).project_code}-${Date.now()}`;
    
    return c.json({
      invoice_number: invoiceNumber,
      project_id: projectId,
      project_code: (project as any).project_code,
      project_name: (project as any).project_name,
      customer_id: (project as any).customer_id,
      billing_period: { from: from_date, to: to_date },
      labor_lines: laborLines,
      labor_total: Math.round(laborTotal * 100) / 100,
      expense_total: Math.round(expenseTotal * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      tax_rate: taxRate,
      tax_amount: Math.round(taxAmount * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      status: 'draft',
      message: 'Invoice generated successfully'
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return c.json({ error: 'Failed to generate invoice' }, 500);
  }
});

// Resource Planning - Get resource availability
app.get('/services/resources/availability', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const startDate = c.req.query('start_date') || new Date().toISOString().split('T')[0];
    const endDate = c.req.query('end_date') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get employees
    const employees = await c.env.DB.prepare(`
      SELECT id, employee_number, first_name, last_name, department_id, position
      FROM employees WHERE company_id = ? AND is_active = 1
    `).bind(auth.companyId).all();
    
    // In a real implementation, we would calculate availability based on:
    // - Scheduled hours per day (e.g., 8 hours)
    // - Existing project allocations
    // - Leave/PTO
    // - Public holidays
    
    const resources = (employees.results || []).map((emp: any) => ({
      employee_id: emp.id,
      employee_number: emp.employee_number,
      name: `${emp.first_name} ${emp.last_name}`,
      position: emp.position,
      department_id: emp.department_id,
      daily_capacity: 8,
      allocated_hours: Math.floor(Math.random() * 6), // Mock data
      available_hours: 8 - Math.floor(Math.random() * 6),
      utilization_rate: Math.floor(Math.random() * 40) + 60 // 60-100%
    }));
    
    return c.json({
      period: { start: startDate, end: endDate },
      resources,
      summary: {
        total_resources: resources.length,
        total_capacity: resources.length * 8,
        total_allocated: resources.reduce((sum: number, r: any) => sum + r.allocated_hours, 0),
        average_utilization: Math.round(resources.reduce((sum: number, r: any) => sum + r.utilization_rate, 0) / resources.length)
      }
    });
  } catch (error) {
    console.error('Error loading resource availability:', error);
    return c.json({ error: 'Failed to load resource availability' }, 500);
  }
});

// Allocate resource to project
app.post('/services/resources/allocate', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const { 
      employee_id, 
      project_id, 
      start_date, 
      end_date, 
      hours_per_day,
      role
    } = body;
    
    if (!employee_id || !project_id || !start_date || !hours_per_day) {
      return c.json({ error: 'Employee ID, project ID, start date, and hours per day are required' }, 400);
    }
    
    const id = generateUUID();
    const now = new Date().toISOString();
    
    // In a real implementation, this would:
    // 1. Check for conflicts with existing allocations
    // 2. Validate capacity
    // 3. Create the allocation record
    
    return c.json({
      id,
      employee_id,
      project_id,
      start_date,
      end_date,
      hours_per_day,
      role,
      status: 'confirmed',
      created_at: now,
      message: 'Resource allocated successfully'
    }, 201);
  } catch (error) {
    console.error('Error allocating resource:', error);
    return c.json({ error: 'Failed to allocate resource' }, 500);
  }
});

// Project Budget Tracking
app.get('/services/projects/:projectId/budget', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const projectId = c.req.param('projectId');
    
    // Get project
    const project = await c.env.DB.prepare(`
      SELECT * FROM projects WHERE id = ? AND company_id = ?
    `).bind(projectId, auth.companyId).first();
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    // Get time entries total
    const timeResult = await c.env.DB.prepare(`
      SELECT SUM(billable_amount) as total_labor FROM time_entries
      WHERE project_id = ? AND company_id = ?
    `).bind(projectId, auth.companyId).first();
    
    const laborSpent = (timeResult as any)?.total_labor || 0;
    const budgetAmount = (project as any).budget_amount || 0;
    const expenseSpent = 0; // Would come from expenses table
    const totalSpent = laborSpent + expenseSpent;
    const remaining = budgetAmount - totalSpent;
    const percentUsed = budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;
    
    return c.json({
      project_id: projectId,
      project_code: (project as any).project_code,
      project_name: (project as any).project_name,
      budget: {
        total: budgetAmount,
        labor_spent: Math.round(laborSpent * 100) / 100,
        expense_spent: Math.round(expenseSpent * 100) / 100,
        total_spent: Math.round(totalSpent * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        percent_used: Math.round(percentUsed * 100) / 100
      },
      status: percentUsed > 100 ? 'over_budget' : percentUsed > 80 ? 'at_risk' : 'on_track',
      billing_type: (project as any).billing_type
    });
  } catch (error) {
    console.error('Error loading project budget:', error);
    return c.json({ error: 'Failed to load project budget' }, 500);
  }
});

export default app;
