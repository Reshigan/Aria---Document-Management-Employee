// Pricing Engine Service - Pricelists, customer groups, rules, contract pricing

interface CustomerGroup {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Pricelist {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  currency: string;
  is_default: boolean;
  customer_group_id?: string;
  valid_from?: string;
  valid_to?: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PricelistRule {
  id: string;
  pricelist_id: string;
  name?: string;
  applied_on: 'all' | 'category' | 'template' | 'variant';
  category_id?: string;
  template_id?: string;
  variant_id?: string;
  min_quantity: number;
  compute_price: 'fixed' | 'percentage' | 'formula';
  fixed_price?: number;
  percent_discount?: number;
  base: 'list_price' | 'cost_price' | 'other_pricelist';
  base_pricelist_id?: string;
  price_surcharge: number;
  price_round?: number;
  price_min_margin?: number;
  price_max_margin?: number;
  valid_from?: string;
  valid_to?: string;
  sequence: number;
  is_active: boolean;
  created_at: string;
}

interface ContractPrice {
  id: string;
  company_id: string;
  customer_id: string;
  variant_id?: string;
  template_id?: string;
  fixed_price: number;
  min_quantity: number;
  valid_from: string;
  valid_to: string;
  contract_reference?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

interface PriceResult {
  unit_price: number;
  original_price: number;
  discount_percent: number;
  rule_applied?: string;
  pricelist_id?: string;
  contract_id?: string;
  explanation: string;
}

export async function createCustomerGroup(
  db: D1Database,
  input: Omit<CustomerGroup, 'id' | 'created_at' | 'updated_at'>
): Promise<CustomerGroup> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO customer_groups (id, company_id, name, code, description, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.name,
    input.code || null,
    input.description || null,
    input.is_active ? 1 : 0,
    now,
    now
  ).run();
  
  return { id, ...input, created_at: now, updated_at: now };
}

export async function listCustomerGroups(db: D1Database, companyId: string): Promise<CustomerGroup[]> {
  const results = await db.prepare(`
    SELECT * FROM customer_groups WHERE company_id = ? AND is_active = 1 ORDER BY name
  `).bind(companyId).all();
  
  return (results.results || []) as unknown as CustomerGroup[];
}

export async function addCustomerToGroup(
  db: D1Database,
  customerId: string,
  groupId: string
): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT OR REPLACE INTO customer_group_members (id, customer_id, group_id, created_at)
    VALUES (?, ?, ?, ?)
  `).bind(id, customerId, groupId, now).run();
}

export async function getCustomerGroups(db: D1Database, customerId: string): Promise<CustomerGroup[]> {
  const results = await db.prepare(`
    SELECT g.* FROM customer_groups g
    JOIN customer_group_members m ON g.id = m.group_id
    WHERE m.customer_id = ? AND g.is_active = 1
  `).bind(customerId).all();
  
  return (results.results || []) as unknown as CustomerGroup[];
}

export async function createPricelist(
  db: D1Database,
  input: Omit<Pricelist, 'id' | 'created_at' | 'updated_at'>
): Promise<Pricelist> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  if (input.is_default) {
    await db.prepare(`
      UPDATE pricelists SET is_default = 0 WHERE company_id = ?
    `).bind(input.company_id).run();
  }
  
  await db.prepare(`
    INSERT INTO pricelists (
      id, company_id, name, code, currency, is_default, customer_group_id,
      valid_from, valid_to, priority, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.name,
    input.code || null,
    input.currency,
    input.is_default ? 1 : 0,
    input.customer_group_id || null,
    input.valid_from || null,
    input.valid_to || null,
    input.priority,
    input.is_active ? 1 : 0,
    now,
    now
  ).run();
  
  return { id, ...input, created_at: now, updated_at: now };
}

export async function getPricelist(db: D1Database, pricelistId: string): Promise<Pricelist | null> {
  const result = await db.prepare(`
    SELECT * FROM pricelists WHERE id = ?
  `).bind(pricelistId).first();
  
  return result as Pricelist | null;
}

export async function listPricelists(
  db: D1Database,
  companyId: string,
  customerGroupId?: string
): Promise<Pricelist[]> {
  let query = 'SELECT * FROM pricelists WHERE company_id = ? AND is_active = 1';
  const params: string[] = [companyId];
  
  if (customerGroupId) {
    query += ' AND (customer_group_id = ? OR customer_group_id IS NULL)';
    params.push(customerGroupId);
  }
  
  query += ' ORDER BY priority DESC, name';
  
  const results = await db.prepare(query).bind(...params).all();
  return (results.results || []) as unknown as Pricelist[];
}

export async function getDefaultPricelist(db: D1Database, companyId: string): Promise<Pricelist | null> {
  const result = await db.prepare(`
    SELECT * FROM pricelists WHERE company_id = ? AND is_default = 1 AND is_active = 1
  `).bind(companyId).first();
  
  return result as Pricelist | null;
}

export async function createPricelistRule(
  db: D1Database,
  input: Omit<PricelistRule, 'id' | 'created_at'>
): Promise<PricelistRule> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO pricelist_rules (
      id, pricelist_id, name, applied_on, category_id, template_id, variant_id,
      min_quantity, compute_price, fixed_price, percent_discount, base, base_pricelist_id,
      price_surcharge, price_round, price_min_margin, price_max_margin,
      valid_from, valid_to, sequence, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.pricelist_id,
    input.name || null,
    input.applied_on,
    input.category_id || null,
    input.template_id || null,
    input.variant_id || null,
    input.min_quantity,
    input.compute_price,
    input.fixed_price || null,
    input.percent_discount || null,
    input.base,
    input.base_pricelist_id || null,
    input.price_surcharge,
    input.price_round || null,
    input.price_min_margin || null,
    input.price_max_margin || null,
    input.valid_from || null,
    input.valid_to || null,
    input.sequence,
    input.is_active ? 1 : 0,
    now
  ).run();
  
  return { id, ...input, created_at: now };
}

export async function listPricelistRules(db: D1Database, pricelistId: string): Promise<PricelistRule[]> {
  const results = await db.prepare(`
    SELECT * FROM pricelist_rules WHERE pricelist_id = ? AND is_active = 1 ORDER BY sequence
  `).bind(pricelistId).all();
  
  return (results.results || []) as unknown as PricelistRule[];
}

export async function assignPricelistToCustomer(
  db: D1Database,
  customerId: string,
  pricelistId: string,
  isDefault: boolean = true,
  validFrom?: string,
  validTo?: string
): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  if (isDefault) {
    await db.prepare(`
      UPDATE customer_pricelists SET is_default = 0 WHERE customer_id = ?
    `).bind(customerId).run();
  }
  
  await db.prepare(`
    INSERT INTO customer_pricelists (id, customer_id, pricelist_id, is_default, valid_from, valid_to, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, customerId, pricelistId, isDefault ? 1 : 0, validFrom || null, validTo || null, now).run();
}

export async function getCustomerPricelist(db: D1Database, customerId: string): Promise<Pricelist | null> {
  const now = new Date().toISOString();
  
  const assignment = await db.prepare(`
    SELECT pricelist_id FROM customer_pricelists 
    WHERE customer_id = ? AND is_default = 1
    AND (valid_from IS NULL OR valid_from <= ?)
    AND (valid_to IS NULL OR valid_to >= ?)
  `).bind(customerId, now, now).first<{ pricelist_id: string }>();
  
  if (assignment) {
    return getPricelist(db, assignment.pricelist_id);
  }
  
  return null;
}

export async function createContractPrice(
  db: D1Database,
  input: Omit<ContractPrice, 'id' | 'created_at'>
): Promise<ContractPrice> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO contract_prices (
      id, company_id, customer_id, variant_id, template_id, fixed_price,
      min_quantity, valid_from, valid_to, contract_reference, notes, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.customer_id,
    input.variant_id || null,
    input.template_id || null,
    input.fixed_price,
    input.min_quantity,
    input.valid_from,
    input.valid_to,
    input.contract_reference || null,
    input.notes || null,
    input.is_active ? 1 : 0,
    now
  ).run();
  
  return { id, ...input, created_at: now };
}

export async function getContractPrice(
  db: D1Database,
  customerId: string,
  variantId: string,
  quantity: number
): Promise<ContractPrice | null> {
  const now = new Date().toISOString();
  
  const result = await db.prepare(`
    SELECT * FROM contract_prices 
    WHERE customer_id = ? AND (variant_id = ? OR template_id = (SELECT template_id FROM product_variants WHERE id = ?))
    AND min_quantity <= ? AND is_active = 1
    AND valid_from <= ? AND valid_to >= ?
    ORDER BY min_quantity DESC
    LIMIT 1
  `).bind(customerId, variantId, variantId, quantity, now, now).first();
  
  return result as ContractPrice | null;
}

export async function calculatePrice(
  db: D1Database,
  companyId: string,
  variantId: string,
  quantity: number,
  customerId?: string,
  pricelistId?: string
): Promise<PriceResult> {
  const now = new Date().toISOString();
  const explanations: string[] = [];
  
  const variant = await db.prepare(`
    SELECT v.*, t.list_price as template_list_price, t.cost_price as template_cost_price, t.category_id
    FROM product_variants v
    JOIN product_templates t ON v.template_id = t.id
    WHERE v.id = ?
  `).bind(variantId).first<{
    list_price: number | null;
    cost_price: number | null;
    template_list_price: number;
    template_cost_price: number;
    template_id: string;
    category_id: string | null;
  }>();
  
  if (!variant) {
    throw new Error('Product variant not found');
  }
  
  const baseListPrice = variant.list_price ?? variant.template_list_price;
  const baseCostPrice = variant.cost_price ?? variant.template_cost_price;
  let finalPrice = baseListPrice;
  let ruleApplied: string | undefined;
  let appliedPricelistId: string | undefined;
  let contractId: string | undefined;
  
  explanations.push(`Base list price: ${baseListPrice}`);
  
  if (customerId) {
    const contractPrice = await getContractPrice(db, customerId, variantId, quantity);
    if (contractPrice) {
      finalPrice = contractPrice.fixed_price;
      contractId = contractPrice.id;
      explanations.push(`Contract price applied: ${contractPrice.fixed_price} (ref: ${contractPrice.contract_reference || contractPrice.id})`);
      
      return {
        unit_price: finalPrice,
        original_price: baseListPrice,
        discount_percent: baseListPrice > 0 ? ((baseListPrice - finalPrice) / baseListPrice) * 100 : 0,
        contract_id: contractId,
        explanation: explanations.join(' -> ')
      };
    }
  }
  
  let pricelist: Pricelist | null = null;
  
  if (pricelistId) {
    pricelist = await getPricelist(db, pricelistId);
  } else if (customerId) {
    pricelist = await getCustomerPricelist(db, customerId);
    if (!pricelist) {
      const customerGroups = await getCustomerGroups(db, customerId);
      for (const group of customerGroups) {
        const groupPricelists = await listPricelists(db, companyId, group.id);
        if (groupPricelists.length > 0) {
          pricelist = groupPricelists[0];
          break;
        }
      }
    }
  }
  
  if (!pricelist) {
    pricelist = await getDefaultPricelist(db, companyId);
  }
  
  if (pricelist) {
    appliedPricelistId = pricelist.id;
    explanations.push(`Using pricelist: ${pricelist.name}`);
    
    const rules = await db.prepare(`
      SELECT * FROM pricelist_rules 
      WHERE pricelist_id = ? AND is_active = 1
      AND min_quantity <= ?
      AND (valid_from IS NULL OR valid_from <= ?)
      AND (valid_to IS NULL OR valid_to >= ?)
      ORDER BY sequence, applied_on DESC
    `).bind(pricelist.id, quantity, now, now).all();
    
    for (const rule of (rules.results || []) as unknown as PricelistRule[]) {
      let matches = false;
      
      switch (rule.applied_on) {
        case 'all':
          matches = true;
          break;
        case 'category':
          if (variant.category_id && rule.category_id) {
            const categoryPath = await db.prepare(`
              SELECT path FROM product_category_tree WHERE id = ?
            `).bind(variant.category_id).first<{ path: string }>();
            
            if (categoryPath && categoryPath.path.includes(rule.category_id)) {
              matches = true;
            }
          }
          break;
        case 'template':
          matches = rule.template_id === variant.template_id;
          break;
        case 'variant':
          matches = rule.variant_id === variantId;
          break;
      }
      
      if (matches) {
        ruleApplied = rule.name || rule.id;
        
        let basePrice = baseListPrice;
        if (rule.base === 'cost_price') {
          basePrice = baseCostPrice;
        } else if (rule.base === 'other_pricelist' && rule.base_pricelist_id) {
          const otherResult = await calculatePrice(db, companyId, variantId, quantity, customerId, rule.base_pricelist_id);
          basePrice = otherResult.unit_price;
        }
        
        switch (rule.compute_price) {
          case 'fixed':
            finalPrice = rule.fixed_price || basePrice;
            explanations.push(`Fixed price rule: ${finalPrice}`);
            break;
          case 'percentage':
            const discount = rule.percent_discount || 0;
            finalPrice = basePrice * (1 - discount / 100);
            explanations.push(`${discount}% discount: ${finalPrice}`);
            break;
          case 'formula':
            finalPrice = basePrice + (rule.price_surcharge || 0);
            
            if (rule.price_min_margin !== undefined && rule.price_min_margin !== null) {
              const minPrice = baseCostPrice * (1 + rule.price_min_margin / 100);
              if (finalPrice < minPrice) {
                finalPrice = minPrice;
                explanations.push(`Min margin applied: ${finalPrice}`);
              }
            }
            
            if (rule.price_max_margin !== undefined && rule.price_max_margin !== null) {
              const maxPrice = baseCostPrice * (1 + rule.price_max_margin / 100);
              if (finalPrice > maxPrice) {
                finalPrice = maxPrice;
                explanations.push(`Max margin applied: ${finalPrice}`);
              }
            }
            
            if (rule.price_round) {
              finalPrice = Math.round(finalPrice / rule.price_round) * rule.price_round;
              explanations.push(`Rounded to: ${finalPrice}`);
            }
            break;
        }
        
        break;
      }
    }
  }
  
  const discountPercent = baseListPrice > 0 ? ((baseListPrice - finalPrice) / baseListPrice) * 100 : 0;
  
  return {
    unit_price: Math.round(finalPrice * 100) / 100,
    original_price: baseListPrice,
    discount_percent: Math.round(discountPercent * 100) / 100,
    rule_applied: ruleApplied,
    pricelist_id: appliedPricelistId,
    explanation: explanations.join(' -> ')
  };
}

export async function logPriceAudit(
  db: D1Database,
  companyId: string,
  orderLineId: string,
  variantId: string,
  customerId: string,
  quantity: number,
  priceResult: PriceResult
): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO price_audit_log (
      id, company_id, order_line_id, variant_id, customer_id, quantity,
      unit_price, rule_applied, pricelist_id, explanation, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    companyId,
    orderLineId,
    variantId,
    customerId,
    quantity,
    priceResult.unit_price,
    priceResult.rule_applied || null,
    priceResult.pricelist_id || null,
    priceResult.explanation,
    now
  ).run();
}

export async function getPricingSummary(
  db: D1Database,
  companyId: string
): Promise<{
  total_pricelists: number;
  total_rules: number;
  total_customer_groups: number;
  total_contract_prices: number;
  active_promotions: number;
}> {
  const pricelists = await db.prepare(`
    SELECT COUNT(*) as count FROM pricelists WHERE company_id = ? AND is_active = 1
  `).bind(companyId).first<{ count: number }>();
  
  const rules = await db.prepare(`
    SELECT COUNT(*) as count FROM pricelist_rules r
    JOIN pricelists p ON r.pricelist_id = p.id
    WHERE p.company_id = ? AND r.is_active = 1
  `).bind(companyId).first<{ count: number }>();
  
  const groups = await db.prepare(`
    SELECT COUNT(*) as count FROM customer_groups WHERE company_id = ? AND is_active = 1
  `).bind(companyId).first<{ count: number }>();
  
  const contracts = await db.prepare(`
    SELECT COUNT(*) as count FROM contract_prices WHERE company_id = ? AND is_active = 1
  `).bind(companyId).first<{ count: number }>();
  
  const now = new Date().toISOString();
  const promotions = await db.prepare(`
    SELECT COUNT(*) as count FROM pricelist_rules r
    JOIN pricelists p ON r.pricelist_id = p.id
    WHERE p.company_id = ? AND r.is_active = 1
    AND r.valid_from IS NOT NULL AND r.valid_to IS NOT NULL
    AND r.valid_from <= ? AND r.valid_to >= ?
  `).bind(companyId, now, now).first<{ count: number }>();
  
  return {
    total_pricelists: pricelists?.count || 0,
    total_rules: rules?.count || 0,
    total_customer_groups: groups?.count || 0,
    total_contract_prices: contracts?.count || 0,
    active_promotions: promotions?.count || 0
  };
}

export async function bulkCalculatePrices(
  db: D1Database,
  companyId: string,
  items: Array<{ variant_id: string; quantity: number }>,
  customerId?: string,
  pricelistId?: string
): Promise<Array<{ variant_id: string; quantity: number; result: PriceResult }>> {
  const results: Array<{ variant_id: string; quantity: number; result: PriceResult }> = [];
  
  for (const item of items) {
    const result = await calculatePrice(db, companyId, item.variant_id, item.quantity, customerId, pricelistId);
    results.push({ variant_id: item.variant_id, quantity: item.quantity, result });
  }
  
  return results;
}
