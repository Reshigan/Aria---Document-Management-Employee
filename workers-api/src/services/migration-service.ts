// Migration Service - Odoo data import, mapping, validation

interface MigrationJob {
  id: string;
  company_id: string;
  source_system: string;
  source_version?: string;
  job_type: 'full' | 'incremental' | 'validation';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  total_records: number;
  processed_records: number;
  failed_records: number;
  error_log?: string;
  created_by?: string;
  created_at: string;
}

interface MigrationMapping {
  id: string;
  job_id: string;
  entity_type: string;
  source_id: string;
  target_id: string;
  status: 'pending' | 'migrated' | 'failed' | 'skipped';
  error_message?: string;
  created_at: string;
}

interface MigrationValidation {
  id: string;
  job_id: string;
  validation_type: string;
  entity_type?: string;
  source_value?: string;
  target_value?: string;
  difference?: string;
  status: 'pass' | 'fail' | 'warning';
  notes?: string;
  created_at: string;
}

interface OdooCustomer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state_id?: [number, string];
  country_id?: [number, string];
  zip?: string;
  vat?: string;
  property_payment_term_id?: [number, string];
  property_product_pricelist?: [number, string];
}

interface OdooProduct {
  id: number;
  name: string;
  default_code?: string;
  barcode?: string;
  list_price: number;
  standard_price: number;
  categ_id?: [number, string];
  type: string;
  uom_id?: [number, string];
  qty_available?: number;
}

interface OdooInvoice {
  id: number;
  name: string;
  partner_id: [number, string];
  invoice_date: string;
  invoice_date_due: string;
  amount_total: number;
  amount_residual: number;
  state: string;
  move_type: string;
  invoice_line_ids: number[];
}

export async function createMigrationJob(
  db: D1Database,
  input: Omit<MigrationJob, 'id' | 'started_at' | 'completed_at' | 'total_records' | 'processed_records' | 'failed_records' | 'created_at'>
): Promise<MigrationJob> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO migration_jobs (
      id, company_id, source_system, source_version, job_type, status,
      total_records, processed_records, failed_records, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.source_system,
    input.source_version || null,
    input.job_type,
    input.status,
    input.created_by || null,
    now
  ).run();
  
  return {
    id,
    ...input,
    total_records: 0,
    processed_records: 0,
    failed_records: 0,
    created_at: now
  };
}

export async function getMigrationJob(db: D1Database, jobId: string): Promise<MigrationJob | null> {
  const result = await db.prepare(`
    SELECT * FROM migration_jobs WHERE id = ?
  `).bind(jobId).first();
  
  return result as MigrationJob | null;
}

export async function listMigrationJobs(
  db: D1Database,
  companyId: string,
  limit: number = 20
): Promise<MigrationJob[]> {
  const results = await db.prepare(`
    SELECT * FROM migration_jobs WHERE company_id = ? ORDER BY created_at DESC LIMIT ?
  `).bind(companyId, limit).all();
  
  return (results.results || []) as unknown as MigrationJob[];
}

export async function updateJobStatus(
  db: D1Database,
  jobId: string,
  status: MigrationJob['status'],
  errorLog?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  let query = 'UPDATE migration_jobs SET status = ?';
  const params: (string | null)[] = [status];
  
  if (status === 'running') {
    query += ', started_at = ?';
    params.push(now);
  } else if (status === 'completed' || status === 'failed') {
    query += ', completed_at = ?';
    params.push(now);
  }
  
  if (errorLog) {
    query += ', error_log = ?';
    params.push(errorLog);
  }
  
  query += ' WHERE id = ?';
  params.push(jobId);
  
  await db.prepare(query).bind(...params).run();
}

export async function updateJobProgress(
  db: D1Database,
  jobId: string,
  totalRecords: number,
  processedRecords: number,
  failedRecords: number
): Promise<void> {
  await db.prepare(`
    UPDATE migration_jobs 
    SET total_records = ?, processed_records = ?, failed_records = ?
    WHERE id = ?
  `).bind(totalRecords, processedRecords, failedRecords, jobId).run();
}

export async function createMapping(
  db: D1Database,
  input: Omit<MigrationMapping, 'id' | 'created_at'>
): Promise<MigrationMapping> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO migration_mappings (
      id, job_id, entity_type, source_id, target_id, status, error_message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.job_id,
    input.entity_type,
    input.source_id,
    input.target_id,
    input.status,
    input.error_message || null,
    now
  ).run();
  
  return { id, ...input, created_at: now };
}

export async function getMapping(
  db: D1Database,
  jobId: string,
  entityType: string,
  sourceId: string
): Promise<MigrationMapping | null> {
  const result = await db.prepare(`
    SELECT * FROM migration_mappings 
    WHERE job_id = ? AND entity_type = ? AND source_id = ?
  `).bind(jobId, entityType, sourceId).first();
  
  return result as MigrationMapping | null;
}

export async function getMappingByTarget(
  db: D1Database,
  entityType: string,
  targetId: string
): Promise<MigrationMapping | null> {
  const result = await db.prepare(`
    SELECT * FROM migration_mappings 
    WHERE entity_type = ? AND target_id = ? AND status = 'migrated'
    ORDER BY created_at DESC LIMIT 1
  `).bind(entityType, targetId).first();
  
  return result as MigrationMapping | null;
}

export async function listMappings(
  db: D1Database,
  jobId: string,
  entityType?: string,
  status?: string
): Promise<MigrationMapping[]> {
  let query = 'SELECT * FROM migration_mappings WHERE job_id = ?';
  const params: string[] = [jobId];
  
  if (entityType) {
    query += ' AND entity_type = ?';
    params.push(entityType);
  }
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at';
  
  const results = await db.prepare(query).bind(...params).all();
  return (results.results || []) as unknown as MigrationMapping[];
}

export async function createValidation(
  db: D1Database,
  input: Omit<MigrationValidation, 'id' | 'created_at'>
): Promise<MigrationValidation> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO migration_validations (
      id, job_id, validation_type, entity_type, source_value, target_value,
      difference, status, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.job_id,
    input.validation_type,
    input.entity_type || null,
    input.source_value || null,
    input.target_value || null,
    input.difference || null,
    input.status,
    input.notes || null,
    now
  ).run();
  
  return { id, ...input, created_at: now };
}

export async function listValidations(
  db: D1Database,
  jobId: string,
  status?: string
): Promise<MigrationValidation[]> {
  let query = 'SELECT * FROM migration_validations WHERE job_id = ?';
  const params: string[] = [jobId];
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at';
  
  const results = await db.prepare(query).bind(...params).all();
  return (results.results || []) as unknown as MigrationValidation[];
}

export async function migrateOdooCustomer(
  db: D1Database,
  jobId: string,
  companyId: string,
  customer: OdooCustomer
): Promise<{ success: boolean; targetId?: string; error?: string }> {
  try {
    const existingMapping = await getMapping(db, jobId, 'customer', String(customer.id));
    if (existingMapping?.status === 'migrated') {
      return { success: true, targetId: existingMapping.target_id };
    }
    
    const targetId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await db.prepare(`
      INSERT INTO customers (
        id, company_id, name, email, phone, address, city, state, country,
        postal_code, tax_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      targetId,
      companyId,
      customer.name,
      customer.email || null,
      customer.phone || null,
      customer.street || null,
      customer.city || null,
      customer.state_id?.[1] || null,
      customer.country_id?.[1] || null,
      customer.zip || null,
      customer.vat || null,
      now,
      now
    ).run();
    
    await createMapping(db, {
      job_id: jobId,
      entity_type: 'customer',
      source_id: String(customer.id),
      target_id: targetId,
      status: 'migrated'
    });
    
    return { success: true, targetId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await createMapping(db, {
      job_id: jobId,
      entity_type: 'customer',
      source_id: String(customer.id),
      target_id: '',
      status: 'failed',
      error_message: errorMessage
    });
    
    return { success: false, error: errorMessage };
  }
}

export async function migrateOdooProduct(
  db: D1Database,
  jobId: string,
  companyId: string,
  product: OdooProduct
): Promise<{ success: boolean; targetId?: string; error?: string }> {
  try {
    const existingMapping = await getMapping(db, jobId, 'product', String(product.id));
    if (existingMapping?.status === 'migrated') {
      return { success: true, targetId: existingMapping.target_id };
    }
    
    const templateId = crypto.randomUUID();
    const variantId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const productType = product.type === 'service' ? 'service' : 
                        product.type === 'consu' ? 'consumable' : 'physical';
    
    await db.prepare(`
      INSERT INTO product_templates (
        id, company_id, name, sku_prefix, product_type, list_price, cost_price,
        can_be_sold, can_be_purchased, track_inventory, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, 1, ?, ?)
    `).bind(
      templateId,
      companyId,
      product.name,
      product.default_code || null,
      productType,
      product.list_price,
      product.standard_price,
      productType === 'physical' ? 1 : 0,
      now,
      now
    ).run();
    
    await db.prepare(`
      INSERT INTO product_variants (
        id, company_id, template_id, name, sku, barcode, list_price, cost_price,
        quantity_on_hand, quantity_reserved, quantity_available, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?)
    `).bind(
      variantId,
      companyId,
      templateId,
      product.name,
      product.default_code || null,
      product.barcode || null,
      product.list_price,
      product.standard_price,
      product.qty_available || 0,
      product.qty_available || 0,
      now,
      now
    ).run();
    
    await createMapping(db, {
      job_id: jobId,
      entity_type: 'product',
      source_id: String(product.id),
      target_id: variantId,
      status: 'migrated'
    });
    
    await createMapping(db, {
      job_id: jobId,
      entity_type: 'product_template',
      source_id: String(product.id),
      target_id: templateId,
      status: 'migrated'
    });
    
    return { success: true, targetId: variantId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await createMapping(db, {
      job_id: jobId,
      entity_type: 'product',
      source_id: String(product.id),
      target_id: '',
      status: 'failed',
      error_message: errorMessage
    });
    
    return { success: false, error: errorMessage };
  }
}

export async function validateTrialBalance(
  db: D1Database,
  jobId: string,
  companyId: string,
  odooTrialBalance: Array<{ account_code: string; debit: number; credit: number }>
): Promise<{ passed: boolean; validations: MigrationValidation[] }> {
  const validations: MigrationValidation[] = [];
  let allPassed = true;
  
  for (const odooAccount of odooTrialBalance) {
    const ariaBalance = await db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as debit,
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as credit
      FROM journal_entries
      WHERE company_id = ? AND account_code = ?
    `).bind(companyId, odooAccount.account_code).first<{ debit: number; credit: number }>();
    
    const ariaDebit = ariaBalance?.debit || 0;
    const ariaCredit = ariaBalance?.credit || 0;
    
    const debitDiff = Math.abs(odooAccount.debit - ariaDebit);
    const creditDiff = Math.abs(odooAccount.credit - ariaCredit);
    
    const tolerance = 0.01;
    const passed = debitDiff <= tolerance && creditDiff <= tolerance;
    
    if (!passed) allPassed = false;
    
    const validation = await createValidation(db, {
      job_id: jobId,
      validation_type: 'trial_balance',
      entity_type: 'account',
      source_value: JSON.stringify({ account: odooAccount.account_code, debit: odooAccount.debit, credit: odooAccount.credit }),
      target_value: JSON.stringify({ account: odooAccount.account_code, debit: ariaDebit, credit: ariaCredit }),
      difference: JSON.stringify({ debit_diff: debitDiff, credit_diff: creditDiff }),
      status: passed ? 'pass' : 'fail',
      notes: passed ? undefined : `Difference: Debit ${debitDiff.toFixed(2)}, Credit ${creditDiff.toFixed(2)}`
    });
    
    validations.push(validation);
  }
  
  return { passed: allPassed, validations };
}

export async function validateARAgeing(
  db: D1Database,
  jobId: string,
  companyId: string,
  odooARAgeing: { current: number; days_30: number; days_60: number; days_90_plus: number }
): Promise<MigrationValidation> {
  const now = new Date();
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const days60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const days90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  
  const ariaAgeing = await db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN due_date >= ? THEN balance_due ELSE 0 END), 0) as current_amount,
      COALESCE(SUM(CASE WHEN due_date < ? AND due_date >= ? THEN balance_due ELSE 0 END), 0) as days_30,
      COALESCE(SUM(CASE WHEN due_date < ? AND due_date >= ? THEN balance_due ELSE 0 END), 0) as days_60,
      COALESCE(SUM(CASE WHEN due_date < ? THEN balance_due ELSE 0 END), 0) as days_90_plus
    FROM ar_invoices
    WHERE company_id = ? AND status != 'paid'
  `).bind(
    now.toISOString(), now.toISOString(), days30, days30, days60, days90, companyId
  ).first();
  
  const ariaCurrent = (ariaAgeing as Record<string, number>)?.current_amount || 0;
  const aria30 = (ariaAgeing as Record<string, number>)?.days_30 || 0;
  const aria60 = (ariaAgeing as Record<string, number>)?.days_60 || 0;
  const aria90Plus = (ariaAgeing as Record<string, number>)?.days_90_plus || 0;
  
  const tolerance = 1.00;
  const passed = 
    Math.abs(odooARAgeing.current - ariaCurrent) <= tolerance &&
    Math.abs(odooARAgeing.days_30 - aria30) <= tolerance &&
    Math.abs(odooARAgeing.days_60 - aria60) <= tolerance &&
    Math.abs(odooARAgeing.days_90_plus - aria90Plus) <= tolerance;
  
  return createValidation(db, {
    job_id: jobId,
    validation_type: 'ar_ageing',
    source_value: JSON.stringify(odooARAgeing),
    target_value: JSON.stringify({ current: ariaCurrent, days_30: aria30, days_60: aria60, days_90_plus: aria90Plus }),
    status: passed ? 'pass' : 'fail',
    notes: passed ? 'AR ageing matches within tolerance' : 'AR ageing mismatch detected'
  });
}

export async function validateStockValuation(
  db: D1Database,
  jobId: string,
  companyId: string,
  odooStockValue: number
): Promise<MigrationValidation> {
  const ariaStock = await db.prepare(`
    SELECT COALESCE(SUM(quantity_on_hand * COALESCE(cost_price, 0)), 0) as total_value
    FROM product_variants
    WHERE company_id = ? AND is_active = 1
  `).bind(companyId).first<{ total_value: number }>();
  
  const ariaValue = ariaStock?.total_value || 0;
  const difference = Math.abs(odooStockValue - ariaValue);
  const tolerance = odooStockValue * 0.01;
  
  const passed = difference <= tolerance;
  
  return createValidation(db, {
    job_id: jobId,
    validation_type: 'stock_valuation',
    source_value: String(odooStockValue),
    target_value: String(ariaValue),
    difference: String(difference),
    status: passed ? 'pass' : 'fail',
    notes: passed ? 'Stock valuation matches within 1%' : `Stock valuation difference: ${difference.toFixed(2)}`
  });
}

export async function runFullMigration(
  db: D1Database,
  jobId: string,
  companyId: string,
  odooData: {
    customers: OdooCustomer[];
    products: OdooProduct[];
  }
): Promise<{
  customers_migrated: number;
  customers_failed: number;
  products_migrated: number;
  products_failed: number;
}> {
  await updateJobStatus(db, jobId, 'running');
  
  const totalRecords = odooData.customers.length + odooData.products.length;
  let processedRecords = 0;
  let customersMigrated = 0;
  let customersFailed = 0;
  let productsMigrated = 0;
  let productsFailed = 0;
  
  for (const customer of odooData.customers) {
    const result = await migrateOdooCustomer(db, jobId, companyId, customer);
    if (result.success) {
      customersMigrated++;
    } else {
      customersFailed++;
    }
    processedRecords++;
    
    if (processedRecords % 100 === 0) {
      await updateJobProgress(db, jobId, totalRecords, processedRecords, customersFailed + productsFailed);
    }
  }
  
  for (const product of odooData.products) {
    const result = await migrateOdooProduct(db, jobId, companyId, product);
    if (result.success) {
      productsMigrated++;
    } else {
      productsFailed++;
    }
    processedRecords++;
    
    if (processedRecords % 100 === 0) {
      await updateJobProgress(db, jobId, totalRecords, processedRecords, customersFailed + productsFailed);
    }
  }
  
  await updateJobProgress(db, jobId, totalRecords, processedRecords, customersFailed + productsFailed);
  
  const finalStatus = (customersFailed + productsFailed) === 0 ? 'completed' : 'completed';
  await updateJobStatus(db, jobId, finalStatus);
  
  return {
    customers_migrated: customersMigrated,
    customers_failed: customersFailed,
    products_migrated: productsMigrated,
    products_failed: productsFailed
  };
}

export async function getMigrationSummary(
  db: D1Database,
  jobId: string
): Promise<{
  job: MigrationJob | null;
  mappings_by_type: Record<string, { migrated: number; failed: number; skipped: number }>;
  validations_summary: { pass: number; fail: number; warning: number };
}> {
  const job = await getMigrationJob(db, jobId);
  
  const mappingStats = await db.prepare(`
    SELECT entity_type, status, COUNT(*) as count
    FROM migration_mappings
    WHERE job_id = ?
    GROUP BY entity_type, status
  `).bind(jobId).all();
  
  const mappingsByType: Record<string, { migrated: number; failed: number; skipped: number }> = {};
  
  for (const row of (mappingStats.results || []) as unknown as Array<{ entity_type: string; status: string; count: number }>) {
    if (!mappingsByType[row.entity_type]) {
      mappingsByType[row.entity_type] = { migrated: 0, failed: 0, skipped: 0 };
    }
    if (row.status === 'migrated') mappingsByType[row.entity_type].migrated = row.count;
    if (row.status === 'failed') mappingsByType[row.entity_type].failed = row.count;
    if (row.status === 'skipped') mappingsByType[row.entity_type].skipped = row.count;
  }
  
  const validationStats = await db.prepare(`
    SELECT status, COUNT(*) as count
    FROM migration_validations
    WHERE job_id = ?
    GROUP BY status
  `).bind(jobId).all();
  
  const validationsSummary = { pass: 0, fail: 0, warning: 0 };
  
  for (const row of (validationStats.results || []) as unknown as Array<{ status: string; count: number }>) {
    if (row.status === 'pass') validationsSummary.pass = row.count;
    if (row.status === 'fail') validationsSummary.fail = row.count;
    if (row.status === 'warning') validationsSummary.warning = row.count;
  }
  
  return {
    job,
    mappings_by_type: mappingsByType,
    validations_summary: validationsSummary
  };
}

export async function generateMigrationReport(
  db: D1Database,
  jobId: string
): Promise<string> {
  const summary = await getMigrationSummary(db, jobId);
  
  if (!summary.job) {
    return 'Migration job not found';
  }
  
  let report = `# Migration Report\n\n`;
  report += `**Job ID:** ${summary.job.id}\n`;
  report += `**Source System:** ${summary.job.source_system} ${summary.job.source_version || ''}\n`;
  report += `**Status:** ${summary.job.status}\n`;
  report += `**Started:** ${summary.job.started_at || 'N/A'}\n`;
  report += `**Completed:** ${summary.job.completed_at || 'N/A'}\n\n`;
  
  report += `## Records Summary\n\n`;
  report += `- Total Records: ${summary.job.total_records}\n`;
  report += `- Processed: ${summary.job.processed_records}\n`;
  report += `- Failed: ${summary.job.failed_records}\n\n`;
  
  report += `## Entity Mappings\n\n`;
  for (const [entityType, stats] of Object.entries(summary.mappings_by_type)) {
    report += `### ${entityType}\n`;
    report += `- Migrated: ${stats.migrated}\n`;
    report += `- Failed: ${stats.failed}\n`;
    report += `- Skipped: ${stats.skipped}\n\n`;
  }
  
  report += `## Validations\n\n`;
  report += `- Passed: ${summary.validations_summary.pass}\n`;
  report += `- Failed: ${summary.validations_summary.fail}\n`;
  report += `- Warnings: ${summary.validations_summary.warning}\n`;
  
  if (summary.job.error_log) {
    report += `\n## Errors\n\n`;
    report += `\`\`\`\n${summary.job.error_log}\n\`\`\`\n`;
  }
  
  return report;
}
