// Fixed Assets & Depreciation Service

import { D1Database } from '@cloudflare/workers-types';

interface AssetCategory {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  depreciation_method: 'straight_line' | 'declining_balance' | 'units_of_production' | 'sum_of_years';
  useful_life_years?: number;
  salvage_value_percent: number;
  asset_account_id?: string;
  depreciation_account_id?: string;
  accumulated_depreciation_account_id?: string;
  is_active: boolean;
  created_at: string;
}

interface FixedAsset {
  id: string;
  company_id: string;
  category_id: string;
  asset_number: string;
  name: string;
  description?: string;
  serial_number?: string;
  location?: string;
  custodian?: string;
  purchase_date: string;
  in_service_date?: string;
  purchase_cost: number;
  salvage_value: number;
  useful_life_months?: number;
  depreciation_method?: string;
  current_value?: number;
  accumulated_depreciation: number;
  status: 'active' | 'disposed' | 'fully_depreciated' | 'impaired';
  disposal_date?: string;
  disposal_amount?: number;
  disposal_method?: 'sale' | 'scrap' | 'donation' | 'trade_in';
  warranty_expiry?: string;
  insurance_policy?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface DepreciationSchedule {
  id: string;
  company_id: string;
  asset_id: string;
  period_start: string;
  period_end: string;
  depreciation_amount: number;
  accumulated_depreciation: number;
  book_value: number;
  status: 'scheduled' | 'posted' | 'adjusted';
  journal_entry_id?: string;
  posted_at?: string;
  created_at: string;
}

// Create an asset category
export async function createAssetCategory(
  db: D1Database,
  input: Omit<AssetCategory, 'id' | 'created_at' | 'is_active'>
): Promise<AssetCategory> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO asset_categories (
      id, company_id, name, code, depreciation_method, useful_life_years,
      salvage_value_percent, asset_account_id, depreciation_account_id,
      accumulated_depreciation_account_id, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(
    id,
    input.company_id,
    input.name,
    input.code || null,
    input.depreciation_method,
    input.useful_life_years || null,
    input.salvage_value_percent,
    input.asset_account_id || null,
    input.depreciation_account_id || null,
    input.accumulated_depreciation_account_id || null,
    now
  ).run();
  
  return {
    id,
    ...input,
    is_active: true,
    created_at: now
  };
}

// Get asset category by ID
export async function getAssetCategory(db: D1Database, categoryId: string): Promise<AssetCategory | null> {
  const result = await db.prepare(`
    SELECT * FROM asset_categories WHERE id = ?
  `).bind(categoryId).first();
  
  if (!result) return null;
  
  return {
    ...result,
    is_active: Boolean(result.is_active)
  } as AssetCategory;
}

// List asset categories
export async function listAssetCategories(db: D1Database, companyId: string): Promise<AssetCategory[]> {
  const results = await db.prepare(`
    SELECT * FROM asset_categories WHERE (company_id = ? OR company_id = 'system') AND is_active = 1 ORDER BY name
  `).bind(companyId).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    is_active: Boolean(row.is_active)
  })) as AssetCategory[];
}

// Create a fixed asset
export async function createFixedAsset(
  db: D1Database,
  input: Omit<FixedAsset, 'id' | 'created_at' | 'updated_at' | 'accumulated_depreciation' | 'current_value'>
): Promise<FixedAsset> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Get category for default values
  const category = await getAssetCategory(db, input.category_id);
  
  const usefulLifeMonths = input.useful_life_months || (category?.useful_life_years ? category.useful_life_years * 12 : 60);
  const depreciationMethod = input.depreciation_method || category?.depreciation_method || 'straight_line';
  
  await db.prepare(`
    INSERT INTO fixed_assets (
      id, company_id, asset_category, asset_code, asset_name, description, serial_number,
      location, assigned_to, purchase_date, purchase_price, salvage_value,
      useful_life_years, depreciation_method, current_book_value, accumulated_depreciation,
      status, warranty_expiry, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.category_id,
    input.asset_number,
    input.name,
    input.description || null,
    input.serial_number || null,
    input.location || null,
    input.custodian || null,
    input.purchase_date,
    input.purchase_cost,
    input.salvage_value,
    Math.round((usefulLifeMonths || 60) / 12),
    depreciationMethod,
    input.purchase_cost,
    input.warranty_expiry || null,
    now,
    now
  ).run();
  
  return {
    id,
    ...input,
    useful_life_months: usefulLifeMonths,
    depreciation_method: depreciationMethod,
    current_value: input.purchase_cost,
    accumulated_depreciation: 0,
    status: 'active',
    created_at: now,
    updated_at: now
  };
}

// Get fixed asset by ID
export async function getFixedAsset(db: D1Database, assetId: string): Promise<FixedAsset | null> {
  const result = await db.prepare(`
    SELECT * FROM fixed_assets WHERE id = ?
  `).bind(assetId).first();
  
  return result as FixedAsset | null;
}

// List fixed assets
export async function listFixedAssets(
  db: D1Database,
  companyId: string,
  options: { status?: FixedAsset['status']; categoryId?: string; limit?: number } = {}
): Promise<FixedAsset[]> {
  let query = 'SELECT * FROM fixed_assets WHERE company_id = ?';
  const params: (string | number)[] = [companyId];
  
  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }
  
  if (options.categoryId) {
    query += ' AND asset_category = ?';
    params.push(options.categoryId);
  }
  
  query += ' ORDER BY asset_code';
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  const results = await db.prepare(query).bind(...params).all();
  
  return (results.results || []) as unknown as FixedAsset[];
}

// Calculate depreciation for an asset
export function calculateDepreciation(
  asset: FixedAsset,
  periodMonths: number = 1
): number {
  const depreciableAmount = asset.purchase_cost - asset.salvage_value;
  const usefulLifeMonths = asset.useful_life_months || 60;
  const method = asset.depreciation_method || 'straight_line';
  
  // Calculate months since in-service date
  const inServiceDate = new Date(asset.in_service_date || asset.purchase_date);
  const now = new Date();
  const monthsInService = Math.floor((now.getTime() - inServiceDate.getTime()) / (30 * 24 * 3600000));
  
  let depreciation = 0;
  
  switch (method) {
    case 'straight_line':
      // Equal depreciation each period
      depreciation = (depreciableAmount / usefulLifeMonths) * periodMonths;
      break;
    
    case 'declining_balance':
      // Double declining balance
      const rate = 2 / (usefulLifeMonths / 12); // Annual rate
      const monthlyRate = rate / 12;
      const currentBookValue = asset.current_value || (asset.purchase_cost - asset.accumulated_depreciation);
      depreciation = currentBookValue * monthlyRate * periodMonths;
      // Don't depreciate below salvage value
      depreciation = Math.min(depreciation, currentBookValue - asset.salvage_value);
      break;
    
    case 'sum_of_years':
      // Sum of years' digits
      const totalYears = usefulLifeMonths / 12;
      const sumOfYears = (totalYears * (totalYears + 1)) / 2;
      const currentYear = Math.floor(monthsInService / 12) + 1;
      const remainingYears = Math.max(0, totalYears - currentYear + 1);
      const yearlyDepreciation = (remainingYears / sumOfYears) * depreciableAmount;
      depreciation = (yearlyDepreciation / 12) * periodMonths;
      break;
    
    case 'units_of_production':
      // This would require usage data - default to straight line
      depreciation = (depreciableAmount / usefulLifeMonths) * periodMonths;
      break;
    
    default:
      depreciation = (depreciableAmount / usefulLifeMonths) * periodMonths;
  }
  
  // Don't depreciate below salvage value
  const maxDepreciation = (asset.current_value || asset.purchase_cost) - asset.salvage_value - asset.accumulated_depreciation;
  depreciation = Math.max(0, Math.min(depreciation, maxDepreciation));
  
  return Math.round(depreciation * 100) / 100;
}

// Generate depreciation schedule for an asset
export async function generateDepreciationSchedule(
  db: D1Database,
  assetId: string
): Promise<DepreciationSchedule[]> {
  const asset = await getFixedAsset(db, assetId);
  if (!asset) throw new Error('Asset not found');
  
  const schedules: DepreciationSchedule[] = [];
  const usefulLifeMonths = asset.useful_life_months || 60;
  const inServiceDate = new Date(asset.in_service_date || asset.purchase_date);
  
  let accumulatedDepreciation = 0;
  let bookValue = asset.purchase_cost;
  
  for (let month = 0; month < usefulLifeMonths; month++) {
    const periodStart = new Date(inServiceDate);
    periodStart.setMonth(periodStart.getMonth() + month);
    
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(periodEnd.getDate() - 1);
    
    // Create a temporary asset state for calculation
    const tempAsset: FixedAsset = {
      ...asset,
      accumulated_depreciation: accumulatedDepreciation,
      current_value: bookValue
    };
    
    const depreciation = calculateDepreciation(tempAsset, 1);
    accumulatedDepreciation += depreciation;
    bookValue = asset.purchase_cost - accumulatedDepreciation;
    
    if (depreciation <= 0) break; // Fully depreciated
    
    const scheduleId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    schedules.push({
      id: scheduleId,
      company_id: asset.company_id,
      asset_id: assetId,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      depreciation_amount: depreciation,
      accumulated_depreciation: accumulatedDepreciation,
      book_value: Math.max(bookValue, asset.salvage_value),
      status: 'scheduled',
      created_at: now
    });
  }
  
  return schedules;
}

// Run depreciation for a period
export async function runDepreciation(
  db: D1Database,
  companyId: string,
  periodEnd: string
): Promise<{ processed: number; totalDepreciation: number; journalEntryId?: string }> {
  const assets = await listFixedAssets(db, companyId, { status: 'active' });
  
  let totalDepreciation = 0;
  let processed = 0;
  const now = new Date().toISOString();
  
  for (const asset of assets) {
    // Check if depreciation already run for this period
    const existing = await db.prepare(`
      SELECT id FROM asset_depreciation_schedule 
      WHERE asset_id = ? AND period_end = ? AND status = 'posted'
    `).bind(asset.id, periodEnd).first();
    
    if (existing) continue;
    
    const depreciation = calculateDepreciation(asset, 1);
    if (depreciation <= 0) continue;
    
    const scheduleId = crypto.randomUUID();
    const periodStart = new Date(periodEnd);
    periodStart.setMonth(periodStart.getMonth() - 1);
    periodStart.setDate(periodStart.getDate() + 1);
    
    const newAccumulated = asset.accumulated_depreciation + depreciation;
    const newBookValue = (asset.purchase_cost || 0) - newAccumulated;
    
    // Create depreciation schedule entry
    await db.prepare(`
      INSERT INTO asset_depreciation_schedule (
        id, company_id, asset_id, period_start, period_end,
        depreciation_amount, accumulated_depreciation, book_value, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `).bind(
      scheduleId,
      companyId,
      asset.id,
      periodStart.toISOString().split('T')[0],
      periodEnd,
      depreciation,
      newAccumulated,
      newBookValue,
      now
    ).run();
    
    // Update asset
    const newStatus = newBookValue <= asset.salvage_value ? 'fully_depreciated' : 'active';
    
    await db.prepare(`
      UPDATE fixed_assets 
      SET accumulated_depreciation = ?, current_book_value = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).bind(newAccumulated, newBookValue, newStatus, now, asset.id).run();
    
    totalDepreciation += depreciation;
    processed++;
  }
  
  return { processed, totalDepreciation };
}

// Post depreciation to GL
export async function postDepreciationToGL(
  db: D1Database,
  companyId: string,
  periodEnd: string
): Promise<{ journalEntryId: string; totalAmount: number }> {
  // Get unposted depreciation for the period
  const schedules = await db.prepare(`
    SELECT s.*, a.category_id, c.depreciation_account_id, c.accumulated_depreciation_account_id
    FROM asset_depreciation_schedule s
    JOIN fixed_assets a ON s.asset_id = a.id
    JOIN asset_categories c ON a.category_id = c.id
    WHERE s.company_id = ? AND s.period_end = ? AND s.status = 'scheduled'
  `).bind(companyId, periodEnd).all();
  
  if (!schedules.results || schedules.results.length === 0) {
    throw new Error('No depreciation to post for this period');
  }
  
  const totalAmount = (schedules.results as Array<{ depreciation_amount: number }>)
    .reduce((sum, s) => sum + s.depreciation_amount, 0);
  
  // Create journal entry (simplified - in production would use proper GL service)
  const journalEntryId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Mark schedules as posted
  for (const schedule of schedules.results as Array<{ id: string }>) {
    await db.prepare(`
      UPDATE asset_depreciation_schedule 
      SET status = 'posted', journal_entry_id = ?, posted_at = ?
      WHERE id = ?
    `).bind(journalEntryId, now, schedule.id).run();
  }
  
  return { journalEntryId, totalAmount };
}

// Dispose of an asset
export async function disposeAsset(
  db: D1Database,
  assetId: string,
  input: {
    disposal_date: string;
    disposal_amount: number;
    disposal_method: FixedAsset['disposal_method'];
    notes?: string;
  }
): Promise<{ gain_loss: number }> {
  const asset = await getFixedAsset(db, assetId);
  if (!asset) throw new Error('Asset not found');
  
  const bookValue = asset.purchase_cost - asset.accumulated_depreciation;
  const gainLoss = input.disposal_amount - bookValue;
  
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE fixed_assets 
    SET status = 'disposed', disposal_date = ?, disposal_amount = ?, 
        disposal_reason = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    input.disposal_date,
    input.disposal_amount,
    input.disposal_method,
    input.notes || null,
    now,
    assetId
  ).run();
  
  return { gain_loss: gainLoss };
}

// Get asset summary for dashboard
export async function getAssetSummary(
  db: D1Database,
  companyId: string
): Promise<{
  total_assets: number;
  total_cost: number;
  total_accumulated_depreciation: number;
  total_book_value: number;
  by_category: Array<{
    category_name: string;
    count: number;
    cost: number;
    book_value: number;
  }>;
}> {
  const summary = await db.prepare(`
    SELECT 
      COUNT(*) as total_assets,
      COALESCE(SUM(purchase_price), 0) as total_cost,
      COALESCE(SUM(accumulated_depreciation), 0) as total_accumulated_depreciation,
      COALESCE(SUM(current_book_value), 0) as total_book_value
    FROM fixed_assets
    WHERE company_id = ? AND status != 'disposed'
  `).bind(companyId).first();
  
  const byCategory = await db.prepare(`
    SELECT 
      c.name as category_name,
      COUNT(*) as count,
      COALESCE(SUM(a.purchase_price), 0) as cost,
      COALESCE(SUM(a.current_book_value), 0) as book_value
    FROM fixed_assets a
    JOIN asset_categories c ON a.category_id = c.id
    WHERE a.company_id = ? AND a.status != 'disposed'
    GROUP BY c.id, c.name
    ORDER BY c.name
  `).bind(companyId).all();
  
  return {
    total_assets: (summary as Record<string, number>)?.total_assets || 0,
    total_cost: (summary as Record<string, number>)?.total_cost || 0,
    total_accumulated_depreciation: (summary as Record<string, number>)?.total_accumulated_depreciation || 0,
    total_book_value: (summary as Record<string, number>)?.total_book_value || 0,
    by_category: (byCategory.results || []) as Array<{
      category_name: string;
      count: number;
      cost: number;
      book_value: number;
    }>
  };
}

// Generate asset register report
export async function generateAssetRegister(
  db: D1Database,
  companyId: string,
  asOfDate?: string
): Promise<Array<{
  asset_number: string;
  name: string;
  category: string;
  purchase_date: string;
  purchase_cost: number;
  accumulated_depreciation: number;
  book_value: number;
  status: string;
}>> {
  const results = await db.prepare(`
    SELECT 
      a.asset_code as asset_number,
      a.asset_name as name,
      COALESCE(a.asset_category, '') as category,
      a.purchase_date,
      COALESCE(a.purchase_price, 0) as purchase_cost,
      COALESCE(a.accumulated_depreciation, 0) as accumulated_depreciation,
      COALESCE(a.current_book_value, 0) as book_value,
      a.status
    FROM fixed_assets a
    WHERE a.company_id = ?
    ORDER BY a.asset_category, a.asset_code
  `).bind(companyId).all();
  
  return (results.results || []) as Array<{
    asset_number: string;
    name: string;
    category: string;
    purchase_date: string;
    purchase_cost: number;
    accumulated_depreciation: number;
    book_value: number;
    status: string;
  }>;
}
