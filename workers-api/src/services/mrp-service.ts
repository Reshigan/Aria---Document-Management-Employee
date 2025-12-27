// MRP (Material Requirements Planning) & Demand Planning Service

import { D1Database } from '@cloudflare/workers-types';

interface DemandForecast {
  id: string;
  company_id: string;
  product_id: string;
  warehouse_id?: string;
  forecast_date: string;
  forecast_quantity: number;
  forecast_method?: 'manual' | 'moving_average' | 'exponential_smoothing' | 'seasonal';
  confidence_level?: number;
  actual_quantity?: number;
  variance?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ReorderRule {
  id: string;
  company_id: string;
  product_id: string;
  warehouse_id?: string;
  min_quantity: number;
  max_quantity?: number;
  reorder_quantity: number;
  lead_time_days: number;
  safety_stock: number;
  preferred_supplier_id?: string;
  is_active: boolean;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
}

interface MRPRun {
  id: string;
  company_id: string;
  run_date: string;
  planning_horizon_days: number;
  status: 'running' | 'completed' | 'failed';
  products_analyzed: number;
  purchase_suggestions: number;
  production_suggestions: number;
  transfer_suggestions: number;
  completed_at?: string;
  created_at: string;
}

interface MRPSuggestion {
  id: string;
  company_id: string;
  mrp_run_id: string;
  suggestion_type: 'purchase' | 'production' | 'transfer';
  product_id: string;
  warehouse_id?: string;
  suggested_quantity: number;
  required_date: string;
  supplier_id?: string;
  estimated_cost?: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'converted';
  converted_to_type?: 'purchase_order' | 'work_order' | 'transfer';
  converted_to_id?: string;
  notes?: string;
  created_at: string;
}

// Create a demand forecast
export async function createDemandForecast(
  db: D1Database,
  input: Omit<DemandForecast, 'id' | 'created_at' | 'updated_at'>
): Promise<DemandForecast> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO demand_forecasts (
      id, company_id, product_id, warehouse_id, forecast_date, forecast_quantity,
      forecast_method, confidence_level, actual_quantity, variance, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.product_id,
    input.warehouse_id || null,
    input.forecast_date,
    input.forecast_quantity,
    input.forecast_method || 'manual',
    input.confidence_level || null,
    input.actual_quantity || null,
    input.variance || null,
    input.notes || null,
    now,
    now
  ).run();
  
  return {
    id,
    ...input,
    created_at: now,
    updated_at: now
  };
}

// Generate forecast using moving average
export async function generateMovingAverageForecast(
  db: D1Database,
  companyId: string,
  productId: string,
  periods: number = 3,
  forecastMonths: number = 3
): Promise<DemandForecast[]> {
  // Get historical sales data
  const historicalData = await db.prepare(`
    SELECT 
      strftime('%Y-%m', order_date) as month,
      SUM(quantity) as total_quantity
    FROM sales_order_lines sol
    JOIN sales_orders so ON sol.sales_order_id = so.id
    WHERE so.company_id = ? AND sol.product_id = ? AND so.status = 'completed'
    GROUP BY strftime('%Y-%m', order_date)
    ORDER BY month DESC
    LIMIT ?
  `).bind(companyId, productId, periods).all();
  
  const quantities = (historicalData.results || []).map((r: Record<string, unknown>) => r.total_quantity as number);
  
  if (quantities.length === 0) {
    return [];
  }
  
  // Calculate moving average
  const average = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
  
  // Generate forecasts for future months
  const forecasts: DemandForecast[] = [];
  const now = new Date();
  
  for (let i = 1; i <= forecastMonths; i++) {
    const forecastDate = new Date(now);
    forecastDate.setMonth(forecastDate.getMonth() + i);
    
    const forecast = await createDemandForecast(db, {
      company_id: companyId,
      product_id: productId,
      forecast_date: forecastDate.toISOString().split('T')[0],
      forecast_quantity: Math.round(average),
      forecast_method: 'moving_average',
      confidence_level: 0.7
    });
    
    forecasts.push(forecast);
  }
  
  return forecasts;
}

// Create a reorder rule
export async function createReorderRule(
  db: D1Database,
  input: Omit<ReorderRule, 'id' | 'created_at' | 'updated_at' | 'is_active'>
): Promise<ReorderRule> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO reorder_rules (
      id, company_id, product_id, warehouse_id, min_quantity, max_quantity,
      reorder_quantity, lead_time_days, safety_stock, preferred_supplier_id,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.product_id,
    input.warehouse_id || null,
    input.min_quantity,
    input.max_quantity || null,
    input.reorder_quantity,
    input.lead_time_days || 0,
    input.safety_stock || 0,
    input.preferred_supplier_id || null,
    now,
    now
  ).run();
  
  return {
    id,
    ...input,
    is_active: true,
    created_at: now,
    updated_at: now
  };
}

// Get reorder rule for a product
export async function getReorderRule(
  db: D1Database,
  productId: string,
  warehouseId?: string
): Promise<ReorderRule | null> {
  let query = 'SELECT * FROM reorder_rules WHERE product_id = ? AND is_active = 1';
  const params: string[] = [productId];
  
  if (warehouseId) {
    query += ' AND (warehouse_id = ? OR warehouse_id IS NULL)';
    params.push(warehouseId);
  }
  
  query += ' ORDER BY warehouse_id DESC NULLS LAST LIMIT 1';
  
  const result = await db.prepare(query).bind(...params).first();
  
  if (!result) return null;
  
  return {
    ...result,
    is_active: Boolean(result.is_active)
  } as ReorderRule;
}

// List reorder rules
export async function listReorderRules(
  db: D1Database,
  companyId: string
): Promise<ReorderRule[]> {
  const results = await db.prepare(`
    SELECT * FROM reorder_rules WHERE company_id = ? AND is_active = 1 ORDER BY product_id
  `).bind(companyId).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    is_active: Boolean(row.is_active)
  })) as ReorderRule[];
}

// Run MRP calculation
export async function runMRP(
  db: D1Database,
  companyId: string,
  planningHorizonDays: number = 30
): Promise<MRPRun> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const runDate = now.split('T')[0];
  
  // Create MRP run record
  await db.prepare(`
    INSERT INTO mrp_runs (
      id, company_id, run_date, planning_horizon_days, status,
      products_analyzed, purchase_suggestions, production_suggestions,
      transfer_suggestions, created_at
    ) VALUES (?, ?, ?, ?, 'running', 0, 0, 0, 0, ?)
  `).bind(id, companyId, runDate, planningHorizonDays, now).run();
  
  let productsAnalyzed = 0;
  let purchaseSuggestions = 0;
  let productionSuggestions = 0;
  let transferSuggestions = 0;
  
  try {
    // Get all products with reorder rules
    const rules = await listReorderRules(db, companyId);
    
    for (const rule of rules) {
      productsAnalyzed++;
      
      // Get current stock level
      const stockResult = await db.prepare(`
        SELECT COALESCE(SUM(quantity_on_hand), 0) as stock
        FROM inventory
        WHERE company_id = ? AND product_id = ?
        ${rule.warehouse_id ? 'AND warehouse_id = ?' : ''}
      `).bind(
        companyId,
        rule.product_id,
        ...(rule.warehouse_id ? [rule.warehouse_id] : [])
      ).first<{ stock: number }>();
      
      const currentStock = stockResult?.stock || 0;
      
      // Get pending demand (open sales orders)
      const demandResult = await db.prepare(`
        SELECT COALESCE(SUM(sol.quantity - COALESCE(sol.quantity_delivered, 0)), 0) as demand
        FROM sales_order_lines sol
        JOIN sales_orders so ON sol.sales_order_id = so.id
        WHERE so.company_id = ? AND sol.product_id = ? 
          AND so.status IN ('confirmed', 'processing')
          AND so.order_date <= date('now', '+' || ? || ' days')
      `).bind(companyId, rule.product_id, planningHorizonDays).first<{ demand: number }>();
      
      const pendingDemand = demandResult?.demand || 0;
      
      // Get pending supply (open purchase orders)
      const supplyResult = await db.prepare(`
        SELECT COALESCE(SUM(pol.quantity - COALESCE(pol.quantity_received, 0)), 0) as supply
        FROM purchase_order_lines pol
        JOIN purchase_orders po ON pol.purchase_order_id = po.id
        WHERE po.company_id = ? AND pol.product_id = ?
          AND po.status IN ('confirmed', 'sent')
      `).bind(companyId, rule.product_id).first<{ supply: number }>();
      
      const pendingSupply = supplyResult?.supply || 0;
      
      // Calculate projected stock
      const projectedStock = currentStock + pendingSupply - pendingDemand;
      
      // Check if reorder is needed
      if (projectedStock < rule.min_quantity + rule.safety_stock) {
        const shortfall = (rule.min_quantity + rule.safety_stock) - projectedStock;
        const orderQuantity = Math.max(shortfall, rule.reorder_quantity);
        
        // Calculate required date based on lead time
        const requiredDate = new Date();
        requiredDate.setDate(requiredDate.getDate() + rule.lead_time_days);
        
        // Determine priority
        let priority: MRPSuggestion['priority'] = 'normal';
        if (projectedStock < 0) {
          priority = 'urgent';
        } else if (projectedStock < rule.safety_stock) {
          priority = 'high';
        }
        
        // Check if product is manufactured or purchased
        const product = await db.prepare(`
          SELECT type, cost_price FROM products WHERE id = ?
        `).bind(rule.product_id).first<{ type: string; cost_price: number }>();
        
        const suggestionType = product?.type === 'manufactured' ? 'production' : 'purchase';
        const estimatedCost = (product?.cost_price || 0) * orderQuantity;
        
        // Create suggestion
        const suggestionId = crypto.randomUUID();
        
        await db.prepare(`
          INSERT INTO mrp_suggestions (
            id, company_id, mrp_run_id, suggestion_type, product_id, warehouse_id,
            suggested_quantity, required_date, supplier_id, estimated_cost,
            priority, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `).bind(
          suggestionId,
          companyId,
          id,
          suggestionType,
          rule.product_id,
          rule.warehouse_id || null,
          orderQuantity,
          requiredDate.toISOString().split('T')[0],
          rule.preferred_supplier_id || null,
          estimatedCost,
          priority,
          now
        ).run();
        
        if (suggestionType === 'purchase') {
          purchaseSuggestions++;
        } else {
          productionSuggestions++;
        }
      }
    }
    
    // Update MRP run as completed
    await db.prepare(`
      UPDATE mrp_runs 
      SET status = 'completed', products_analyzed = ?, purchase_suggestions = ?,
          production_suggestions = ?, transfer_suggestions = ?, completed_at = ?
      WHERE id = ?
    `).bind(
      productsAnalyzed,
      purchaseSuggestions,
      productionSuggestions,
      transferSuggestions,
      new Date().toISOString(),
      id
    ).run();
    
  } catch (error) {
    // Update MRP run as failed
    await db.prepare(`
      UPDATE mrp_runs SET status = 'failed' WHERE id = ?
    `).bind(id).run();
    
    throw error;
  }
  
  return {
    id,
    company_id: companyId,
    run_date: runDate,
    planning_horizon_days: planningHorizonDays,
    status: 'completed',
    products_analyzed: productsAnalyzed,
    purchase_suggestions: purchaseSuggestions,
    production_suggestions: productionSuggestions,
    transfer_suggestions: transferSuggestions,
    completed_at: new Date().toISOString(),
    created_at: now
  };
}

// Get MRP suggestions
export async function getMRPSuggestions(
  db: D1Database,
  mrpRunId: string,
  options: { status?: MRPSuggestion['status']; type?: MRPSuggestion['suggestion_type'] } = {}
): Promise<MRPSuggestion[]> {
  let query = 'SELECT * FROM mrp_suggestions WHERE mrp_run_id = ?';
  const params: string[] = [mrpRunId];
  
  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }
  
  if (options.type) {
    query += ' AND suggestion_type = ?';
    params.push(options.type);
  }
  
  query += ' ORDER BY priority DESC, required_date ASC';
  
  const results = await db.prepare(query).bind(...params).all();
  
  return (results.results || []) as unknown as MRPSuggestion[];
}

// Approve MRP suggestion
export async function approveSuggestion(
  db: D1Database,
  suggestionId: string
): Promise<void> {
  await db.prepare(`
    UPDATE mrp_suggestions SET status = 'approved' WHERE id = ?
  `).bind(suggestionId).run();
}

// Reject MRP suggestion
export async function rejectSuggestion(
  db: D1Database,
  suggestionId: string,
  notes?: string
): Promise<void> {
  await db.prepare(`
    UPDATE mrp_suggestions SET status = 'rejected', notes = ? WHERE id = ?
  `).bind(notes || null, suggestionId).run();
}

// Convert suggestion to order
export async function convertSuggestion(
  db: D1Database,
  suggestionId: string,
  convertedToType: MRPSuggestion['converted_to_type'],
  convertedToId: string
): Promise<void> {
  await db.prepare(`
    UPDATE mrp_suggestions 
    SET status = 'converted', converted_to_type = ?, converted_to_id = ?
    WHERE id = ?
  `).bind(convertedToType, convertedToId, suggestionId).run();
}

// Get MRP runs
export async function getMRPRuns(
  db: D1Database,
  companyId: string,
  limit: number = 10
): Promise<MRPRun[]> {
  const results = await db.prepare(`
    SELECT * FROM mrp_runs WHERE company_id = ? ORDER BY created_at DESC LIMIT ?
  `).bind(companyId, limit).all();
  
  return (results.results || []) as unknown as MRPRun[];
}

// Get inventory status for MRP dashboard
export async function getInventoryStatus(
  db: D1Database,
  companyId: string
): Promise<{
  total_products: number;
  below_reorder_point: number;
  below_safety_stock: number;
  out_of_stock: number;
  overstocked: number;
}> {
  const result = await db.prepare(`
    SELECT 
      COUNT(DISTINCT p.id) as total_products,
      SUM(CASE WHEN COALESCE(i.quantity_on_hand, 0) < COALESCE(r.min_quantity, 0) THEN 1 ELSE 0 END) as below_reorder_point,
      SUM(CASE WHEN COALESCE(i.quantity_on_hand, 0) < COALESCE(r.safety_stock, 0) THEN 1 ELSE 0 END) as below_safety_stock,
      SUM(CASE WHEN COALESCE(i.quantity_on_hand, 0) = 0 THEN 1 ELSE 0 END) as out_of_stock,
      SUM(CASE WHEN COALESCE(i.quantity_on_hand, 0) > COALESCE(r.max_quantity, 999999) THEN 1 ELSE 0 END) as overstocked
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id AND i.company_id = ?
    LEFT JOIN reorder_rules r ON p.id = r.product_id AND r.company_id = ? AND r.is_active = 1
    WHERE p.company_id = ? AND p.is_active = 1
  `).bind(companyId, companyId, companyId).first();
  
  return result as {
    total_products: number;
    below_reorder_point: number;
    below_safety_stock: number;
    out_of_stock: number;
    overstocked: number;
  };
}

// Calculate optimal reorder quantity (EOQ)
export function calculateEOQ(
  annualDemand: number,
  orderingCost: number,
  holdingCostPerUnit: number
): number {
  if (annualDemand <= 0 || orderingCost <= 0 || holdingCostPerUnit <= 0) {
    return 0;
  }
  
  // EOQ = sqrt((2 * D * S) / H)
  // D = Annual demand
  // S = Ordering cost per order
  // H = Holding cost per unit per year
  const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);
  
  return Math.round(eoq);
}

// Calculate safety stock
export function calculateSafetyStock(
  averageDailyDemand: number,
  leadTimeDays: number,
  demandStdDev: number,
  serviceLevel: number = 0.95
): number {
  // Z-score for service level (95% = 1.65, 99% = 2.33)
  const zScores: Record<number, number> = {
    0.90: 1.28,
    0.95: 1.65,
    0.99: 2.33
  };
  
  const z = zScores[serviceLevel] || 1.65;
  
  // Safety Stock = Z * σ * √L
  // σ = standard deviation of demand
  // L = lead time in days
  const safetyStock = z * demandStdDev * Math.sqrt(leadTimeDays);
  
  return Math.round(safetyStock);
}

// Get demand forecast summary
export async function getDemandForecastSummary(
  db: D1Database,
  companyId: string,
  months: number = 3
): Promise<Array<{
  product_id: string;
  product_name: string;
  forecast_quantity: number;
  actual_quantity: number;
  variance_percent: number;
}>> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  const results = await db.prepare(`
    SELECT 
      df.product_id,
      p.name as product_name,
      SUM(df.forecast_quantity) as forecast_quantity,
      SUM(COALESCE(df.actual_quantity, 0)) as actual_quantity,
      CASE 
        WHEN SUM(df.forecast_quantity) > 0 
        THEN ((SUM(COALESCE(df.actual_quantity, 0)) - SUM(df.forecast_quantity)) / SUM(df.forecast_quantity)) * 100
        ELSE 0
      END as variance_percent
    FROM demand_forecasts df
    JOIN products p ON df.product_id = p.id
    WHERE df.company_id = ? AND df.forecast_date >= ?
    GROUP BY df.product_id, p.name
    ORDER BY variance_percent DESC
  `).bind(companyId, startDate.toISOString().split('T')[0]).all();
  
  return (results.results || []) as Array<{
    product_id: string;
    product_name: string;
    forecast_quantity: number;
    actual_quantity: number;
    variance_percent: number;
  }>;
}
