/**
 * Inventory Valuation Service
 * 
 * Provides comprehensive inventory costing:
 * - FIFO (First In, First Out)
 * - Weighted Average Cost
 * - Standard Cost with variance tracking
 * - Inventory value reports
 * - Cost of Goods Sold calculation
 */

export interface InventoryLayer {
  id: string;
  company_id: string;
  product_id: string;
  warehouse_id: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  receipt_date: string;
  reference_type: 'purchase' | 'production' | 'adjustment' | 'opening';
  reference_id: string | null;
  remaining_quantity: number;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  company_id: string;
  product_id: string;
  warehouse_id: string | null;
  movement_type: 'receipt' | 'issue' | 'transfer' | 'adjustment';
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reference_type: string;
  reference_id: string | null;
  layers_consumed: { layer_id: string; quantity: number; cost: number }[];
  created_at: string;
  created_by: string;
}

export interface ProductCost {
  product_id: string;
  costing_method: 'fifo' | 'weighted_average' | 'standard';
  current_cost: number;
  standard_cost: number | null;
  quantity_on_hand: number;
  total_value: number;
  last_receipt_cost: number | null;
  last_receipt_date: string | null;
}

export type CostingMethod = 'fifo' | 'weighted_average' | 'standard';

/**
 * Get product costing method
 */
export async function getProductCostingMethod(
  db: D1Database,
  companyId: string,
  productId: string
): Promise<CostingMethod> {
  const product = await db.prepare(`
    SELECT costing_method FROM products WHERE id = ? AND company_id = ?
  `).bind(productId, companyId).first();

  return ((product as any)?.costing_method as CostingMethod) || 'weighted_average';
}

/**
 * Record inventory receipt (purchase, production, adjustment)
 */
export async function recordReceipt(
  db: D1Database,
  companyId: string,
  productId: string,
  quantity: number,
  unitCost: number,
  referenceType: InventoryLayer['reference_type'],
  referenceId: string | null,
  warehouseId: string | null,
  userId: string
): Promise<InventoryLayer> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const totalCost = quantity * unitCost;

  // Create inventory layer for FIFO tracking
  await db.prepare(`
    INSERT INTO inventory_layers (
      id, company_id, product_id, warehouse_id, quantity, unit_cost, total_cost,
      receipt_date, reference_type, reference_id, remaining_quantity, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, companyId, productId, warehouseId, quantity, unitCost, totalCost,
    timestamp, referenceType, referenceId, quantity, timestamp
  ).run();

  // Record movement
  await db.prepare(`
    INSERT INTO inventory_movements (
      id, company_id, product_id, warehouse_id, movement_type, quantity,
      unit_cost, total_cost, reference_type, reference_id, layers_consumed, created_at, created_by
    ) VALUES (?, ?, ?, ?, 'receipt', ?, ?, ?, ?, ?, '[]', ?, ?)
  `).bind(
    crypto.randomUUID(), companyId, productId, warehouseId, quantity,
    unitCost, totalCost, referenceType, referenceId, timestamp, userId
  ).run();

  // Update product quantity and weighted average cost
  await updateProductCost(db, companyId, productId, quantity, totalCost, 'add');

  return {
    id,
    company_id: companyId,
    product_id: productId,
    warehouse_id: warehouseId,
    quantity,
    unit_cost: unitCost,
    total_cost: totalCost,
    receipt_date: timestamp,
    reference_type: referenceType,
    reference_id: referenceId,
    remaining_quantity: quantity,
    created_at: timestamp,
  };
}

/**
 * Record inventory issue (sale, production consumption)
 */
export async function recordIssue(
  db: D1Database,
  companyId: string,
  productId: string,
  quantity: number,
  referenceType: string,
  referenceId: string | null,
  warehouseId: string | null,
  userId: string
): Promise<{ totalCost: number; unitCost: number; layersConsumed: { layer_id: string; quantity: number; cost: number }[] }> {
  const costingMethod = await getProductCostingMethod(db, companyId, productId);
  const timestamp = new Date().toISOString();

  let totalCost = 0;
  const layersConsumed: { layer_id: string; quantity: number; cost: number }[] = [];
  let remainingToIssue = quantity;

  if (costingMethod === 'fifo') {
    // FIFO: Consume oldest layers first
    const layers = await db.prepare(`
      SELECT * FROM inventory_layers
      WHERE company_id = ? AND product_id = ? AND remaining_quantity > 0
      ${warehouseId ? 'AND warehouse_id = ?' : ''}
      ORDER BY receipt_date ASC
    `).bind(...(warehouseId ? [companyId, productId, warehouseId] : [companyId, productId])).all();

    for (const layer of (layers.results || []) as unknown as InventoryLayer[]) {
      if (remainingToIssue <= 0) break;

      const qtyFromLayer = Math.min(remainingToIssue, layer.remaining_quantity);
      const costFromLayer = qtyFromLayer * layer.unit_cost;

      layersConsumed.push({
        layer_id: layer.id,
        quantity: qtyFromLayer,
        cost: costFromLayer,
      });

      totalCost += costFromLayer;
      remainingToIssue -= qtyFromLayer;

      // Update layer remaining quantity
      await db.prepare(`
        UPDATE inventory_layers SET remaining_quantity = remaining_quantity - ? WHERE id = ?
      `).bind(qtyFromLayer, layer.id).run();
    }
  } else if (costingMethod === 'weighted_average') {
    // Weighted Average: Use current average cost
    const product = await db.prepare(`
      SELECT unit_cost, quantity_on_hand FROM products WHERE id = ? AND company_id = ?
    `).bind(productId, companyId).first() as any;

    const avgCost = product?.unit_cost || 0;
    totalCost = quantity * avgCost;

    layersConsumed.push({
      layer_id: 'weighted_average',
      quantity,
      cost: totalCost,
    });
  } else if (costingMethod === 'standard') {
    // Standard Cost: Use standard cost
    const product = await db.prepare(`
      SELECT standard_cost FROM products WHERE id = ? AND company_id = ?
    `).bind(productId, companyId).first() as any;

    const stdCost = product?.standard_cost || 0;
    totalCost = quantity * stdCost;

    layersConsumed.push({
      layer_id: 'standard_cost',
      quantity,
      cost: totalCost,
    });
  }

  // Record movement
  await db.prepare(`
    INSERT INTO inventory_movements (
      id, company_id, product_id, warehouse_id, movement_type, quantity,
      unit_cost, total_cost, reference_type, reference_id, layers_consumed, created_at, created_by
    ) VALUES (?, ?, ?, ?, 'issue', ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(), companyId, productId, warehouseId, quantity,
    totalCost / quantity, totalCost, referenceType, referenceId,
    JSON.stringify(layersConsumed), timestamp, userId
  ).run();

  // Update product quantity
  await updateProductCost(db, companyId, productId, -quantity, -totalCost, 'subtract');

  return {
    totalCost,
    unitCost: totalCost / quantity,
    layersConsumed,
  };
}

/**
 * Update product cost and quantity
 */
async function updateProductCost(
  db: D1Database,
  companyId: string,
  productId: string,
  quantityChange: number,
  costChange: number,
  operation: 'add' | 'subtract'
): Promise<void> {
  const product = await db.prepare(`
    SELECT quantity_on_hand, unit_cost FROM products WHERE id = ? AND company_id = ?
  `).bind(productId, companyId).first() as any;

  const currentQty = product?.quantity_on_hand || 0;
  const currentCost = product?.unit_cost || 0;
  const currentValue = currentQty * currentCost;

  const newQty = currentQty + quantityChange;
  const newValue = currentValue + costChange;
  const newUnitCost = newQty > 0 ? newValue / newQty : 0;

  await db.prepare(`
    UPDATE products SET quantity_on_hand = ?, unit_cost = ? WHERE id = ? AND company_id = ?
  `).bind(newQty, newUnitCost, productId, companyId).run();
}

/**
 * Get inventory valuation report
 */
export async function getInventoryValuation(
  db: D1Database,
  companyId: string,
  warehouseId?: string,
  asOfDate?: string
): Promise<{
  products: {
    product_id: string;
    sku: string;
    name: string;
    quantity: number;
    unit_cost: number;
    total_value: number;
    costing_method: CostingMethod;
  }[];
  total_value: number;
  total_items: number;
}> {
  let query = `
    SELECT p.id as product_id, p.sku, p.name, p.quantity_on_hand as quantity,
           p.unit_cost, (p.quantity_on_hand * p.unit_cost) as total_value,
           p.costing_method
    FROM products p
    WHERE p.company_id = ? AND p.quantity_on_hand > 0
  `;
  const params: any[] = [companyId];

  query += ' ORDER BY p.name';

  const result = await db.prepare(query).bind(...params).all();
  const products = (result.results || []).map((row: any) => ({
    product_id: row.product_id,
    sku: row.sku,
    name: row.name,
    quantity: row.quantity,
    unit_cost: Math.round(row.unit_cost * 100) / 100,
    total_value: Math.round(row.total_value * 100) / 100,
    costing_method: row.costing_method || 'weighted_average',
  }));

  const totalValue = products.reduce((sum, p) => sum + p.total_value, 0);

  return {
    products,
    total_value: Math.round(totalValue * 100) / 100,
    total_items: products.length,
  };
}

/**
 * Get FIFO layers for a product
 */
export async function getFifoLayers(
  db: D1Database,
  companyId: string,
  productId: string
): Promise<InventoryLayer[]> {
  const result = await db.prepare(`
    SELECT * FROM inventory_layers
    WHERE company_id = ? AND product_id = ? AND remaining_quantity > 0
    ORDER BY receipt_date ASC
  `).bind(companyId, productId).all();

  return (result.results || []) as unknown as InventoryLayer[];
}

/**
 * Get inventory movement history
 */
export async function getMovementHistory(
  db: D1Database,
  companyId: string,
  productId?: string,
  startDate?: string,
  endDate?: string,
  limit: number = 100
): Promise<InventoryMovement[]> {
  let query = 'SELECT * FROM inventory_movements WHERE company_id = ?';
  const params: any[] = [companyId];

  if (productId) {
    query += ' AND product_id = ?';
    params.push(productId);
  }
  if (startDate) {
    query += ' AND created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND created_at <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const result = await db.prepare(query).bind(...params).all();

  return (result.results || []).map((row: any) => ({
    ...row,
    layers_consumed: JSON.parse(row.layers_consumed || '[]'),
  }));
}

/**
 * Calculate Cost of Goods Sold for a period
 */
export async function calculateCOGS(
  db: D1Database,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<{
  total_cogs: number;
  by_product: { product_id: string; name: string; quantity: number; cogs: number }[];
}> {
  const result = await db.prepare(`
    SELECT im.product_id, p.name, SUM(im.quantity) as quantity, SUM(im.total_cost) as cogs
    FROM inventory_movements im
    JOIN products p ON im.product_id = p.id
    WHERE im.company_id = ? AND im.movement_type = 'issue'
    AND im.reference_type IN ('sale', 'invoice')
    AND im.created_at >= ? AND im.created_at <= ?
    GROUP BY im.product_id, p.name
    ORDER BY cogs DESC
  `).bind(companyId, startDate, endDate).all();

  const byProduct = (result.results || []).map((row: any) => ({
    product_id: row.product_id,
    name: row.name,
    quantity: row.quantity,
    cogs: Math.round(row.cogs * 100) / 100,
  }));

  const totalCogs = byProduct.reduce((sum, p) => sum + p.cogs, 0);

  return {
    total_cogs: Math.round(totalCogs * 100) / 100,
    by_product: byProduct,
  };
}

/**
 * Record inventory adjustment
 */
export async function recordAdjustment(
  db: D1Database,
  companyId: string,
  productId: string,
  quantityChange: number,
  reason: string,
  warehouseId: string | null,
  userId: string
): Promise<void> {
  const timestamp = new Date().toISOString();

  if (quantityChange > 0) {
    // Positive adjustment - get current cost
    const product = await db.prepare(`
      SELECT unit_cost FROM products WHERE id = ? AND company_id = ?
    `).bind(productId, companyId).first() as any;

    const unitCost = product?.unit_cost || 0;
    await recordReceipt(db, companyId, productId, quantityChange, unitCost, 'adjustment', null, warehouseId, userId);
  } else {
    // Negative adjustment
    await recordIssue(db, companyId, productId, Math.abs(quantityChange), 'adjustment', null, warehouseId, userId);
  }

  // Log the adjustment
  await db.prepare(`
    INSERT INTO inventory_adjustments (id, company_id, product_id, warehouse_id, quantity_change, reason, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), companyId, productId, warehouseId, quantityChange, reason, timestamp, userId).run();
}

/**
 * Calculate standard cost variance
 */
export async function calculateStandardCostVariance(
  db: D1Database,
  companyId: string,
  productId: string,
  startDate: string,
  endDate: string
): Promise<{
  purchase_price_variance: number;
  usage_variance: number;
  total_variance: number;
}> {
  const product = await db.prepare(`
    SELECT standard_cost FROM products WHERE id = ? AND company_id = ?
  `).bind(productId, companyId).first() as any;

  const standardCost = product?.standard_cost || 0;

  // Get receipts for the period
  const receipts = await db.prepare(`
    SELECT SUM(quantity) as qty, SUM(total_cost) as cost
    FROM inventory_movements
    WHERE company_id = ? AND product_id = ? AND movement_type = 'receipt'
    AND created_at >= ? AND created_at <= ?
  `).bind(companyId, productId, startDate, endDate).first() as any;

  const actualReceiptCost = receipts?.cost || 0;
  const receiptQty = receipts?.qty || 0;
  const standardReceiptCost = receiptQty * standardCost;
  const purchasePriceVariance = actualReceiptCost - standardReceiptCost;

  // Get issues for the period
  const issues = await db.prepare(`
    SELECT SUM(quantity) as qty, SUM(total_cost) as cost
    FROM inventory_movements
    WHERE company_id = ? AND product_id = ? AND movement_type = 'issue'
    AND created_at >= ? AND created_at <= ?
  `).bind(companyId, productId, startDate, endDate).first() as any;

  const actualIssueCost = issues?.cost || 0;
  const issueQty = issues?.qty || 0;
  const standardIssueCost = issueQty * standardCost;
  const usageVariance = actualIssueCost - standardIssueCost;

  return {
    purchase_price_variance: Math.round(purchasePriceVariance * 100) / 100,
    usage_variance: Math.round(usageVariance * 100) / 100,
    total_variance: Math.round((purchasePriceVariance + usageVariance) * 100) / 100,
  };
}

export default {
  getProductCostingMethod,
  recordReceipt,
  recordIssue,
  getInventoryValuation,
  getFifoLayers,
  getMovementHistory,
  calculateCOGS,
  recordAdjustment,
  calculateStandardCostVariance,
};
