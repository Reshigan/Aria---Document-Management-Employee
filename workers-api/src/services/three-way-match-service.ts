/**
 * Three-Way Match Service
 * 
 * Provides comprehensive PO/GRN/Invoice matching:
 * - Automatic matching with tolerance thresholds
 * - Variance detection and reporting
 * - Approval workflows for exceptions
 * - Audit trail for all matches
 */

export interface MatchResult {
  id: string;
  company_id: string;
  purchase_order_id: string;
  goods_receipt_id: string | null;
  supplier_invoice_id: string;
  match_status: 'matched' | 'partial' | 'exception' | 'pending';
  match_type: 'two_way' | 'three_way';
  po_amount: number;
  grn_amount: number | null;
  invoice_amount: number;
  quantity_variance: number;
  price_variance: number;
  total_variance: number;
  variance_percentage: number;
  within_tolerance: boolean;
  exception_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchLineItem {
  id: string;
  match_id: string;
  product_id: string;
  po_quantity: number;
  po_unit_price: number;
  grn_quantity: number | null;
  invoice_quantity: number;
  invoice_unit_price: number;
  quantity_variance: number;
  price_variance: number;
  line_variance: number;
  match_status: 'matched' | 'exception';
}

export interface MatchingConfig {
  enable_three_way_match: boolean;
  quantity_tolerance_percent: number;  // e.g., 5 = 5%
  price_tolerance_percent: number;     // e.g., 2 = 2%
  amount_tolerance_absolute: number;   // e.g., 100 = $100
  auto_approve_within_tolerance: boolean;
  require_grn_before_invoice: boolean;
}

const DEFAULT_CONFIG: MatchingConfig = {
  enable_three_way_match: true,
  quantity_tolerance_percent: 5,
  price_tolerance_percent: 2,
  amount_tolerance_absolute: 100,
  auto_approve_within_tolerance: true,
  require_grn_before_invoice: true,
};

/**
 * Get matching configuration for a company
 */
export async function getMatchingConfig(
  db: D1Database,
  companyId: string
): Promise<MatchingConfig> {
  const result = await db.prepare(`
    SELECT matching_config FROM company_settings WHERE company_id = ?
  `).bind(companyId).first();

  if (result && (result as any).matching_config) {
    return { ...DEFAULT_CONFIG, ...JSON.parse((result as any).matching_config) };
  }

  return DEFAULT_CONFIG;
}

/**
 * Update matching configuration
 */
export async function updateMatchingConfig(
  db: D1Database,
  companyId: string,
  config: Partial<MatchingConfig>
): Promise<MatchingConfig> {
  const currentConfig = await getMatchingConfig(db, companyId);
  const newConfig = { ...currentConfig, ...config };

  await db.prepare(`
    INSERT INTO company_settings (company_id, matching_config, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(company_id) DO UPDATE SET matching_config = ?, updated_at = datetime('now')
  `).bind(companyId, JSON.stringify(newConfig), JSON.stringify(newConfig)).run();

  return newConfig;
}

/**
 * Perform three-way match for a supplier invoice
 */
export async function performMatch(
  db: D1Database,
  companyId: string,
  supplierInvoiceId: string,
  userId: string
): Promise<MatchResult> {
  const config = await getMatchingConfig(db, companyId);
  const timestamp = new Date().toISOString();

  // Get supplier invoice with line items
  const invoice = await db.prepare(`
    SELECT si.*, s.name as supplier_name
    FROM supplier_invoices si
    LEFT JOIN suppliers s ON si.supplier_id = s.id
    WHERE si.id = ? AND si.company_id = ?
  `).bind(supplierInvoiceId, companyId).first() as any;

  if (!invoice) {
    throw new Error('Supplier invoice not found');
  }

  const invoiceItems = await db.prepare(`
    SELECT * FROM supplier_invoice_items WHERE invoice_id = ?
  `).bind(supplierInvoiceId).all();

  // Find matching purchase order
  const purchaseOrder = await db.prepare(`
    SELECT * FROM purchase_orders
    WHERE id = ? AND company_id = ?
  `).bind(invoice.purchase_order_id, companyId).first() as any;

  if (!purchaseOrder) {
    throw new Error('No matching purchase order found');
  }

  const poItems = await db.prepare(`
    SELECT * FROM purchase_order_items WHERE purchase_order_id = ?
  `).bind(purchaseOrder.id).all();

  // Find goods receipt if three-way match is enabled
  let goodsReceipt: any = null;
  let grnItems: any[] = [];

  if (config.enable_three_way_match) {
    goodsReceipt = await db.prepare(`
      SELECT * FROM goods_receipts
      WHERE purchase_order_id = ? AND company_id = ? AND status = 'completed'
      ORDER BY created_at DESC LIMIT 1
    `).bind(purchaseOrder.id, companyId).first();

    if (goodsReceipt) {
      const grnResult = await db.prepare(`
        SELECT * FROM goods_receipt_items WHERE goods_receipt_id = ?
      `).bind(goodsReceipt.id).all();
      grnItems = grnResult.results || [];
    } else if (config.require_grn_before_invoice) {
      // Create exception - no GRN found
      return createMatchResult(db, companyId, {
        purchase_order_id: purchaseOrder.id,
        goods_receipt_id: null,
        supplier_invoice_id: supplierInvoiceId,
        match_status: 'exception',
        match_type: 'three_way',
        po_amount: purchaseOrder.total_amount,
        grn_amount: null,
        invoice_amount: invoice.total_amount,
        quantity_variance: 0,
        price_variance: 0,
        total_variance: invoice.total_amount - purchaseOrder.total_amount,
        variance_percentage: 0,
        within_tolerance: false,
        exception_reason: 'No goods receipt found for this purchase order',
      }, timestamp);
    }
  }

  // Calculate variances
  let totalQuantityVariance = 0;
  let totalPriceVariance = 0;
  const lineMatches: Partial<MatchLineItem>[] = [];

  for (const invItem of (invoiceItems.results || []) as any[]) {
    const poItem = (poItems.results || []).find((p: any) => p.product_id === invItem.product_id) as any;
    const grnItem = grnItems.find((g: any) => g.product_id === invItem.product_id);

    if (!poItem) {
      // Item not on PO - exception
      lineMatches.push({
        product_id: invItem.product_id,
        po_quantity: 0,
        po_unit_price: 0,
        grn_quantity: grnItem?.quantity || null,
        invoice_quantity: invItem.quantity,
        invoice_unit_price: invItem.unit_price,
        quantity_variance: invItem.quantity,
        price_variance: invItem.quantity * invItem.unit_price,
        line_variance: invItem.quantity * invItem.unit_price,
        match_status: 'exception',
      });
      totalQuantityVariance += invItem.quantity;
      totalPriceVariance += invItem.quantity * invItem.unit_price;
      continue;
    }

    // Calculate quantity variance
    const expectedQty = config.enable_three_way_match && grnItem 
      ? grnItem.quantity 
      : poItem.quantity;
    const qtyVariance = invItem.quantity - expectedQty;
    const qtyVariancePercent = Math.abs(qtyVariance / expectedQty) * 100;

    // Calculate price variance
    const priceVariance = invItem.unit_price - poItem.unit_price;
    const priceVariancePercent = Math.abs(priceVariance / poItem.unit_price) * 100;

    // Calculate line total variance
    const lineVariance = (invItem.quantity * invItem.unit_price) - (expectedQty * poItem.unit_price);

    const isQtyWithinTolerance = qtyVariancePercent <= config.quantity_tolerance_percent;
    const isPriceWithinTolerance = priceVariancePercent <= config.price_tolerance_percent;

    lineMatches.push({
      product_id: invItem.product_id,
      po_quantity: poItem.quantity,
      po_unit_price: poItem.unit_price,
      grn_quantity: grnItem?.quantity || null,
      invoice_quantity: invItem.quantity,
      invoice_unit_price: invItem.unit_price,
      quantity_variance: qtyVariance,
      price_variance: priceVariance * invItem.quantity,
      line_variance: lineVariance,
      match_status: isQtyWithinTolerance && isPriceWithinTolerance ? 'matched' : 'exception',
    });

    totalQuantityVariance += Math.abs(qtyVariance);
    totalPriceVariance += Math.abs(priceVariance * invItem.quantity);
  }

  // Calculate total variance
  const poAmount = purchaseOrder.total_amount;
  const grnAmount = goodsReceipt?.total_amount || null;
  const invoiceAmount = invoice.total_amount;
  const totalVariance = invoiceAmount - poAmount;
  const variancePercent = Math.abs(totalVariance / poAmount) * 100;

  // Determine if within tolerance
  const withinTolerance = 
    variancePercent <= config.price_tolerance_percent ||
    Math.abs(totalVariance) <= config.amount_tolerance_absolute;

  // Determine match status
  let matchStatus: MatchResult['match_status'];
  let exceptionReason: string | null = null;

  if (lineMatches.every(l => l.match_status === 'matched') && withinTolerance) {
    matchStatus = 'matched';
  } else if (lineMatches.some(l => l.match_status === 'matched')) {
    matchStatus = 'partial';
    exceptionReason = `${lineMatches.filter(l => l.match_status === 'exception').length} line(s) with variance outside tolerance`;
  } else {
    matchStatus = 'exception';
    exceptionReason = 'All lines have variance outside tolerance';
  }

  // Create match result
  const matchResult = await createMatchResult(db, companyId, {
    purchase_order_id: purchaseOrder.id,
    goods_receipt_id: goodsReceipt?.id || null,
    supplier_invoice_id: supplierInvoiceId,
    match_status: matchStatus,
    match_type: config.enable_three_way_match ? 'three_way' : 'two_way',
    po_amount: poAmount,
    grn_amount: grnAmount,
    invoice_amount: invoiceAmount,
    quantity_variance: totalQuantityVariance,
    price_variance: totalPriceVariance,
    total_variance: totalVariance,
    variance_percentage: variancePercent,
    within_tolerance: withinTolerance,
    exception_reason: exceptionReason,
  }, timestamp);

  // Create line item matches
  for (const line of lineMatches) {
    await db.prepare(`
      INSERT INTO match_line_items (
        id, match_id, product_id, po_quantity, po_unit_price,
        grn_quantity, invoice_quantity, invoice_unit_price,
        quantity_variance, price_variance, line_variance, match_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), matchResult.id, line.product_id,
      line.po_quantity, line.po_unit_price, line.grn_quantity,
      line.invoice_quantity, line.invoice_unit_price,
      line.quantity_variance, line.price_variance, line.line_variance, line.match_status
    ).run();
  }

  // Auto-approve if within tolerance and configured
  if (config.auto_approve_within_tolerance && withinTolerance && matchStatus === 'matched') {
    await approveMatch(db, companyId, matchResult.id, 'system');
  }

  return matchResult;
}

/**
 * Create match result record
 */
async function createMatchResult(
  db: D1Database,
  companyId: string,
  data: Omit<MatchResult, 'id' | 'company_id' | 'approved_by' | 'approved_at' | 'created_at' | 'updated_at'>,
  timestamp: string
): Promise<MatchResult> {
  const id = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO match_results (
      id, company_id, purchase_order_id, goods_receipt_id, supplier_invoice_id,
      match_status, match_type, po_amount, grn_amount, invoice_amount,
      quantity_variance, price_variance, total_variance, variance_percentage,
      within_tolerance, exception_reason, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, companyId, data.purchase_order_id, data.goods_receipt_id, data.supplier_invoice_id,
    data.match_status, data.match_type, data.po_amount, data.grn_amount, data.invoice_amount,
    data.quantity_variance, data.price_variance, data.total_variance, data.variance_percentage,
    data.within_tolerance ? 1 : 0, data.exception_reason, timestamp, timestamp
  ).run();

  return {
    id,
    company_id: companyId,
    ...data,
    approved_by: null,
    approved_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

/**
 * Approve a match exception
 */
export async function approveMatch(
  db: D1Database,
  companyId: string,
  matchId: string,
  userId: string,
  comments?: string
): Promise<boolean> {
  const timestamp = new Date().toISOString();

  const result = await db.prepare(`
    UPDATE match_results
    SET match_status = 'matched', approved_by = ?, approved_at = ?, updated_at = ?
    WHERE id = ? AND company_id = ?
  `).bind(userId, timestamp, timestamp, matchId, companyId).run();

  if ((result.meta?.changes || 0) > 0) {
    // Update supplier invoice status to approved
    const match = await db.prepare(`
      SELECT supplier_invoice_id FROM match_results WHERE id = ?
    `).bind(matchId).first() as any;

    if (match) {
      await db.prepare(`
        UPDATE supplier_invoices SET status = 'approved', updated_at = ? WHERE id = ?
      `).bind(timestamp, match.supplier_invoice_id).run();
    }

    // Log approval
    await db.prepare(`
      INSERT INTO match_approvals (id, match_id, approved_by, comments, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), matchId, userId, comments || null, timestamp).run();

    return true;
  }

  return false;
}

/**
 * Reject a match
 */
export async function rejectMatch(
  db: D1Database,
  companyId: string,
  matchId: string,
  userId: string,
  reason: string
): Promise<boolean> {
  const timestamp = new Date().toISOString();

  const result = await db.prepare(`
    UPDATE match_results
    SET match_status = 'exception', exception_reason = ?, updated_at = ?
    WHERE id = ? AND company_id = ?
  `).bind(reason, timestamp, matchId, companyId).run();

  if ((result.meta?.changes || 0) > 0) {
    // Log rejection
    await db.prepare(`
      INSERT INTO match_approvals (id, match_id, approved_by, action, comments, created_at)
      VALUES (?, ?, ?, 'rejected', ?, ?)
    `).bind(crypto.randomUUID(), matchId, userId, reason, timestamp).run();

    return true;
  }

  return false;
}

/**
 * Get match results for a company
 */
export async function getMatchResults(
  db: D1Database,
  companyId: string,
  filters: {
    status?: MatchResult['match_status'];
    supplierId?: string;
    startDate?: string;
    endDate?: string;
  } = {},
  pagination: { page: number; pageSize: number } = { page: 1, pageSize: 50 }
): Promise<{ results: MatchResult[]; total: number }> {
  let whereClause = 'WHERE mr.company_id = ?';
  const params: any[] = [companyId];

  if (filters.status) {
    whereClause += ' AND mr.match_status = ?';
    params.push(filters.status);
  }
  if (filters.supplierId) {
    whereClause += ' AND si.supplier_id = ?';
    params.push(filters.supplierId);
  }
  if (filters.startDate) {
    whereClause += ' AND mr.created_at >= ?';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    whereClause += ' AND mr.created_at <= ?';
    params.push(filters.endDate);
  }

  // Get total count
  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM match_results mr
    LEFT JOIN supplier_invoices si ON mr.supplier_invoice_id = si.id
    ${whereClause}
  `).bind(...params).first();
  const total = (countResult as any)?.count || 0;

  // Get paginated results
  const offset = (pagination.page - 1) * pagination.pageSize;
  const result = await db.prepare(`
    SELECT mr.*, po.po_number, si.invoice_number as supplier_invoice_number,
           s.name as supplier_name
    FROM match_results mr
    LEFT JOIN purchase_orders po ON mr.purchase_order_id = po.id
    LEFT JOIN supplier_invoices si ON mr.supplier_invoice_id = si.id
    LEFT JOIN suppliers s ON si.supplier_id = s.id
    ${whereClause}
    ORDER BY mr.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...params, pagination.pageSize, offset).all();

  return {
    results: (result.results || []).map((row: any) => ({
      ...row,
      within_tolerance: row.within_tolerance === 1,
    })),
    total,
  };
}

/**
 * Get match details with line items
 */
export async function getMatchDetails(
  db: D1Database,
  companyId: string,
  matchId: string
): Promise<{ match: MatchResult; lineItems: MatchLineItem[] } | null> {
  const match = await db.prepare(`
    SELECT mr.*, po.po_number, si.invoice_number as supplier_invoice_number,
           s.name as supplier_name
    FROM match_results mr
    LEFT JOIN purchase_orders po ON mr.purchase_order_id = po.id
    LEFT JOIN supplier_invoices si ON mr.supplier_invoice_id = si.id
    LEFT JOIN suppliers s ON si.supplier_id = s.id
    WHERE mr.id = ? AND mr.company_id = ?
  `).bind(matchId, companyId).first() as any;

  if (!match) return null;

  const lineItems = await db.prepare(`
    SELECT mli.*, p.name as product_name, p.sku
    FROM match_line_items mli
    LEFT JOIN products p ON mli.product_id = p.id
    WHERE mli.match_id = ?
  `).bind(matchId).all();

  return {
    match: {
      ...match,
      within_tolerance: match.within_tolerance === 1,
    },
    lineItems: (lineItems.results || []) as unknown as MatchLineItem[],
  };
}

/**
 * Get matching statistics
 */
export async function getMatchingStats(
  db: D1Database,
  companyId: string,
  days: number = 30
): Promise<{
  total_matches: number;
  matched: number;
  partial: number;
  exceptions: number;
  pending: number;
  match_rate: number;
  avg_variance: number;
  total_variance_amount: number;
}> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const result = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN match_status = 'matched' THEN 1 ELSE 0 END) as matched,
      SUM(CASE WHEN match_status = 'partial' THEN 1 ELSE 0 END) as partial,
      SUM(CASE WHEN match_status = 'exception' THEN 1 ELSE 0 END) as exceptions,
      SUM(CASE WHEN match_status = 'pending' THEN 1 ELSE 0 END) as pending,
      AVG(ABS(variance_percentage)) as avg_variance,
      SUM(ABS(total_variance)) as total_variance_amount
    FROM match_results
    WHERE company_id = ? AND created_at >= ?
  `).bind(companyId, startDate).first() as any;

  const total = result?.total || 0;
  const matched = result?.matched || 0;

  return {
    total_matches: total,
    matched,
    partial: result?.partial || 0,
    exceptions: result?.exceptions || 0,
    pending: result?.pending || 0,
    match_rate: total > 0 ? Math.round((matched / total) * 100) : 0,
    avg_variance: Math.round((result?.avg_variance || 0) * 100) / 100,
    total_variance_amount: Math.round((result?.total_variance_amount || 0) * 100) / 100,
  };
}

export default {
  getMatchingConfig,
  updateMatchingConfig,
  performMatch,
  approveMatch,
  rejectMatch,
  getMatchResults,
  getMatchDetails,
  getMatchingStats,
};
