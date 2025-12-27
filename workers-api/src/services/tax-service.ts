// Tax/VAT Handling Service - Multi-country tax calculations and compliance

import { D1Database } from '@cloudflare/workers-types';

interface TaxRate {
  id: string;
  company_id: string;
  name: string;
  code: string;
  rate: number;
  tax_type: 'vat' | 'gst' | 'sales_tax' | 'withholding';
  country: string;
  region?: string;
  is_compound: boolean;
  is_inclusive: boolean;
  applies_to: 'all' | 'goods' | 'services';
  effective_from?: string;
  effective_to?: string;
  is_active: boolean;
  created_at: string;
}

interface TaxExemption {
  id: string;
  company_id: string;
  entity_type: 'customer' | 'supplier' | 'product';
  entity_id: string;
  tax_rate_id?: string;
  exemption_type: 'full' | 'partial' | 'zero_rated' | 'exempt';
  exemption_reason?: string;
  certificate_number?: string;
  valid_from?: string;
  valid_to?: string;
  is_active: boolean;
  created_at: string;
}

interface TaxReturn {
  id: string;
  company_id: string;
  return_type: 'vat' | 'gst' | 'sales_tax' | 'withholding';
  period_start: string;
  period_end: string;
  due_date?: string;
  status: 'draft' | 'calculated' | 'filed' | 'paid';
  total_sales: number;
  total_purchases: number;
  output_tax: number;
  input_tax: number;
  net_tax: number;
  adjustments: number;
  penalties: number;
  filed_at?: string;
  filed_reference?: string;
  paid_at?: string;
  payment_reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface TaxCalculationResult {
  subtotal: number;
  taxes: Array<{
    tax_rate_id: string;
    tax_name: string;
    tax_code: string;
    rate: number;
    taxable_amount: number;
    tax_amount: number;
  }>;
  total_tax: number;
  total: number;
}

// Get applicable tax rates for a transaction
export async function getApplicableTaxRates(
  db: D1Database,
  companyId: string,
  country: string,
  region?: string,
  itemType: 'goods' | 'services' = 'goods',
  transactionDate?: string
): Promise<TaxRate[]> {
  const date = transactionDate || new Date().toISOString().split('T')[0];
  
  let query = `
    SELECT * FROM tax_rates 
    WHERE (company_id = ? OR company_id = 'system')
      AND country = ?
      AND is_active = 1
      AND (applies_to = 'all' OR applies_to = ?)
      AND (effective_from IS NULL OR effective_from <= ?)
      AND (effective_to IS NULL OR effective_to >= ?)
  `;
  const params: (string | null)[] = [companyId, country, itemType, date, date];
  
  if (region) {
    query += ' AND (region IS NULL OR region = ?)';
    params.push(region);
  }
  
  query += ' ORDER BY is_compound ASC, rate DESC';
  
  const results = await db.prepare(query).bind(...params).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    is_compound: Boolean(row.is_compound),
    is_inclusive: Boolean(row.is_inclusive),
    is_active: Boolean(row.is_active)
  })) as TaxRate[];
}

// Check for tax exemptions
export async function checkExemption(
  db: D1Database,
  companyId: string,
  entityType: 'customer' | 'supplier' | 'product',
  entityId: string,
  taxRateId?: string
): Promise<TaxExemption | null> {
  const now = new Date().toISOString().split('T')[0];
  
  let query = `
    SELECT * FROM tax_exemptions 
    WHERE company_id = ? 
      AND entity_type = ? 
      AND entity_id = ?
      AND is_active = 1
      AND (valid_from IS NULL OR valid_from <= ?)
      AND (valid_to IS NULL OR valid_to >= ?)
  `;
  const params: string[] = [companyId, entityType, entityId, now, now];
  
  if (taxRateId) {
    query += ' AND (tax_rate_id IS NULL OR tax_rate_id = ?)';
    params.push(taxRateId);
  }
  
  query += ' LIMIT 1';
  
  const result = await db.prepare(query).bind(...params).first();
  
  if (!result) return null;
  
  return {
    ...result,
    is_active: Boolean(result.is_active)
  } as TaxExemption;
}

// Calculate taxes for a line item
export async function calculateLineTax(
  db: D1Database,
  companyId: string,
  amount: number,
  country: string,
  options: {
    region?: string;
    itemType?: 'goods' | 'services';
    customerId?: string;
    productId?: string;
    priceIncludesTax?: boolean;
  } = {}
): Promise<TaxCalculationResult> {
  const taxRates = await getApplicableTaxRates(
    db,
    companyId,
    country,
    options.region,
    options.itemType || 'goods'
  );
  
  const taxes: TaxCalculationResult['taxes'] = [];
  let subtotal = amount;
  let totalTax = 0;
  let runningBase = amount;
  
  // Check for customer exemption
  if (options.customerId) {
    const exemption = await checkExemption(db, companyId, 'customer', options.customerId);
    if (exemption?.exemption_type === 'full') {
      return {
        subtotal: amount,
        taxes: [],
        total_tax: 0,
        total: amount
      };
    }
  }
  
  // Check for product exemption
  if (options.productId) {
    const exemption = await checkExemption(db, companyId, 'product', options.productId);
    if (exemption?.exemption_type === 'full' || exemption?.exemption_type === 'zero_rated') {
      return {
        subtotal: amount,
        taxes: [],
        total_tax: 0,
        total: amount
      };
    }
  }
  
  // If price includes tax, we need to extract it
  if (options.priceIncludesTax) {
    const totalRate = taxRates.reduce((sum, rate) => sum + rate.rate, 0);
    subtotal = amount / (1 + totalRate / 100);
    runningBase = subtotal;
  }
  
  // Calculate each tax
  for (const rate of taxRates) {
    const taxableAmount = rate.is_compound ? runningBase + totalTax : runningBase;
    const taxAmount = taxableAmount * (rate.rate / 100);
    
    taxes.push({
      tax_rate_id: rate.id,
      tax_name: rate.name,
      tax_code: rate.code,
      rate: rate.rate,
      taxable_amount: Math.round(taxableAmount * 100) / 100,
      tax_amount: Math.round(taxAmount * 100) / 100
    });
    
    totalTax += taxAmount;
  }
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxes,
    total_tax: Math.round(totalTax * 100) / 100,
    total: Math.round((subtotal + totalTax) * 100) / 100
  };
}

// Calculate taxes for an invoice
export async function calculateInvoiceTax(
  db: D1Database,
  companyId: string,
  lines: Array<{
    amount: number;
    product_id?: string;
    item_type?: 'goods' | 'services';
  }>,
  customerCountry: string,
  options: {
    region?: string;
    customerId?: string;
    priceIncludesTax?: boolean;
  } = {}
): Promise<{
  lines: TaxCalculationResult[];
  summary: {
    subtotal: number;
    total_tax: number;
    total: number;
    tax_breakdown: Array<{
      tax_code: string;
      tax_name: string;
      rate: number;
      taxable_amount: number;
      tax_amount: number;
    }>;
  };
}> {
  const lineResults: TaxCalculationResult[] = [];
  const taxBreakdown: Map<string, { tax_code: string; tax_name: string; rate: number; taxable_amount: number; tax_amount: number }> = new Map();
  
  let totalSubtotal = 0;
  let totalTax = 0;
  
  for (const line of lines) {
    const result = await calculateLineTax(db, companyId, line.amount, customerCountry, {
      region: options.region,
      itemType: line.item_type,
      customerId: options.customerId,
      productId: line.product_id,
      priceIncludesTax: options.priceIncludesTax
    });
    
    lineResults.push(result);
    totalSubtotal += result.subtotal;
    totalTax += result.total_tax;
    
    // Aggregate tax breakdown
    for (const tax of result.taxes) {
      const existing = taxBreakdown.get(tax.tax_code);
      if (existing) {
        existing.taxable_amount += tax.taxable_amount;
        existing.tax_amount += tax.tax_amount;
      } else {
        taxBreakdown.set(tax.tax_code, {
          tax_code: tax.tax_code,
          tax_name: tax.tax_name,
          rate: tax.rate,
          taxable_amount: tax.taxable_amount,
          tax_amount: tax.tax_amount
        });
      }
    }
  }
  
  return {
    lines: lineResults,
    summary: {
      subtotal: Math.round(totalSubtotal * 100) / 100,
      total_tax: Math.round(totalTax * 100) / 100,
      total: Math.round((totalSubtotal + totalTax) * 100) / 100,
      tax_breakdown: Array.from(taxBreakdown.values()).map(t => ({
        ...t,
        taxable_amount: Math.round(t.taxable_amount * 100) / 100,
        tax_amount: Math.round(t.tax_amount * 100) / 100
      }))
    }
  };
}

// Create a tax return
export async function createTaxReturn(
  db: D1Database,
  input: {
    company_id: string;
    return_type: TaxReturn['return_type'];
    period_start: string;
    period_end: string;
    due_date?: string;
  }
): Promise<TaxReturn> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO tax_returns (
      id, company_id, return_type, period_start, period_end, due_date,
      status, total_sales, total_purchases, output_tax, input_tax, net_tax,
      adjustments, penalties, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'draft', 0, 0, 0, 0, 0, 0, 0, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.return_type,
    input.period_start,
    input.period_end,
    input.due_date || null,
    now,
    now
  ).run();
  
  return {
    id,
    company_id: input.company_id,
    return_type: input.return_type,
    period_start: input.period_start,
    period_end: input.period_end,
    due_date: input.due_date,
    status: 'draft',
    total_sales: 0,
    total_purchases: 0,
    output_tax: 0,
    input_tax: 0,
    net_tax: 0,
    adjustments: 0,
    penalties: 0,
    created_at: now,
    updated_at: now
  };
}

// Calculate tax return from transactions
export async function calculateTaxReturn(
  db: D1Database,
  returnId: string
): Promise<TaxReturn> {
  const taxReturn = await db.prepare(`
    SELECT * FROM tax_returns WHERE id = ?
  `).bind(returnId).first<TaxReturn>();
  
  if (!taxReturn) throw new Error('Tax return not found');
  
  // Calculate output tax (from sales invoices)
  const salesResult = await db.prepare(`
    SELECT 
      COALESCE(SUM(total_amount), 0) as total_sales,
      COALESCE(SUM(tax_amount), 0) as output_tax
    FROM invoices 
    WHERE company_id = ? 
      AND invoice_date BETWEEN ? AND ?
      AND status NOT IN ('draft', 'cancelled')
  `).bind(taxReturn.company_id, taxReturn.period_start, taxReturn.period_end).first<{ total_sales: number; output_tax: number }>();
  
  // Calculate input tax (from purchase invoices)
  const purchaseResult = await db.prepare(`
    SELECT 
      COALESCE(SUM(total_amount), 0) as total_purchases,
      COALESCE(SUM(tax_amount), 0) as input_tax
    FROM ap_invoices 
    WHERE company_id = ? 
      AND invoice_date BETWEEN ? AND ?
      AND status NOT IN ('draft', 'cancelled')
  `).bind(taxReturn.company_id, taxReturn.period_start, taxReturn.period_end).first<{ total_purchases: number; input_tax: number }>();
  
  const totalSales = salesResult?.total_sales || 0;
  const outputTax = salesResult?.output_tax || 0;
  const totalPurchases = purchaseResult?.total_purchases || 0;
  const inputTax = purchaseResult?.input_tax || 0;
  const netTax = outputTax - inputTax + taxReturn.adjustments;
  
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE tax_returns 
    SET total_sales = ?, total_purchases = ?, output_tax = ?, input_tax = ?, 
        net_tax = ?, status = 'calculated', updated_at = ?
    WHERE id = ?
  `).bind(totalSales, totalPurchases, outputTax, inputTax, netTax, now, returnId).run();
  
  return {
    ...taxReturn,
    total_sales: totalSales,
    total_purchases: totalPurchases,
    output_tax: outputTax,
    input_tax: inputTax,
    net_tax: netTax,
    status: 'calculated',
    updated_at: now
  };
}

// File a tax return
export async function fileTaxReturn(
  db: D1Database,
  returnId: string,
  filedReference: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE tax_returns 
    SET status = 'filed', filed_at = ?, filed_reference = ?, updated_at = ?
    WHERE id = ?
  `).bind(now, filedReference, now, returnId).run();
}

// Record tax payment
export async function recordTaxPayment(
  db: D1Database,
  returnId: string,
  paymentReference: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE tax_returns 
    SET status = 'paid', paid_at = ?, payment_reference = ?, updated_at = ?
    WHERE id = ?
  `).bind(now, paymentReference, now, returnId).run();
}

// Get tax returns for a company
export async function listTaxReturns(
  db: D1Database,
  companyId: string,
  returnType?: TaxReturn['return_type']
): Promise<TaxReturn[]> {
  let query = 'SELECT * FROM tax_returns WHERE company_id = ?';
  const params: string[] = [companyId];
  
  if (returnType) {
    query += ' AND return_type = ?';
    params.push(returnType);
  }
  
  query += ' ORDER BY period_end DESC';
  
  const results = await db.prepare(query).bind(...params).all();
  
  return (results.results || []) as unknown as TaxReturn[];
}

// Create a tax rate
export async function createTaxRate(
  db: D1Database,
  input: Omit<TaxRate, 'id' | 'created_at' | 'is_active'>
): Promise<TaxRate> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO tax_rates (
      id, company_id, name, code, rate, tax_type, country, region,
      is_compound, is_inclusive, applies_to, effective_from, effective_to,
      is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(
    id,
    input.company_id,
    input.name,
    input.code,
    input.rate,
    input.tax_type,
    input.country,
    input.region || null,
    input.is_compound ? 1 : 0,
    input.is_inclusive ? 1 : 0,
    input.applies_to,
    input.effective_from || null,
    input.effective_to || null,
    now
  ).run();
  
  return {
    id,
    ...input,
    is_active: true,
    created_at: now
  };
}

// Create a tax exemption
export async function createTaxExemption(
  db: D1Database,
  input: Omit<TaxExemption, 'id' | 'created_at' | 'is_active'>
): Promise<TaxExemption> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO tax_exemptions (
      id, company_id, entity_type, entity_id, tax_rate_id, exemption_type,
      exemption_reason, certificate_number, valid_from, valid_to, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(
    id,
    input.company_id,
    input.entity_type,
    input.entity_id,
    input.tax_rate_id || null,
    input.exemption_type,
    input.exemption_reason || null,
    input.certificate_number || null,
    input.valid_from || null,
    input.valid_to || null,
    now
  ).run();
  
  return {
    id,
    ...input,
    is_active: true,
    created_at: now
  };
}

// Get tax summary for dashboard
export async function getTaxSummary(
  db: D1Database,
  companyId: string,
  year: number
): Promise<{
  total_output_tax: number;
  total_input_tax: number;
  net_tax_liability: number;
  returns_filed: number;
  returns_pending: number;
  next_due_date?: string;
}> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  
  const result = await db.prepare(`
    SELECT 
      COALESCE(SUM(output_tax), 0) as total_output_tax,
      COALESCE(SUM(input_tax), 0) as total_input_tax,
      COALESCE(SUM(net_tax), 0) as net_tax_liability,
      SUM(CASE WHEN status IN ('filed', 'paid') THEN 1 ELSE 0 END) as returns_filed,
      SUM(CASE WHEN status IN ('draft', 'calculated') THEN 1 ELSE 0 END) as returns_pending
    FROM tax_returns 
    WHERE company_id = ? AND period_start >= ? AND period_end <= ?
  `).bind(companyId, yearStart, yearEnd).first();
  
  const nextDue = await db.prepare(`
    SELECT due_date FROM tax_returns 
    WHERE company_id = ? AND status NOT IN ('filed', 'paid') AND due_date IS NOT NULL
    ORDER BY due_date ASC LIMIT 1
  `).bind(companyId).first<{ due_date: string }>();
  
  return {
    total_output_tax: (result as Record<string, number>)?.total_output_tax || 0,
    total_input_tax: (result as Record<string, number>)?.total_input_tax || 0,
    net_tax_liability: (result as Record<string, number>)?.net_tax_liability || 0,
    returns_filed: (result as Record<string, number>)?.returns_filed || 0,
    returns_pending: (result as Record<string, number>)?.returns_pending || 0,
    next_due_date: nextDue?.due_date
  };
}
