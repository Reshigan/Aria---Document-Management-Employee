/**
 * Report Builder Service
 * 
 * Provides dynamic report generation with:
 * - Custom filters, grouping, and aggregations
 * - Scheduled report delivery
 * - Multiple export formats (CSV, Excel, PDF)
 * - Saved report templates
 * - Drill-down from KPIs to transactions
 */

export interface ReportDefinition {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  report_type: ReportType;
  data_source: string;  // Table or view name
  columns: ReportColumn[];
  filters: ReportFilter[];
  grouping: string[];
  sorting: ReportSort[];
  aggregations: ReportAggregation[];
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReportColumn {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'boolean';
  format?: string;
  width?: number;
  visible: boolean;
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between' | 'is_null' | 'is_not_null';
  value: any;
  value2?: any;  // For 'between' operator
}

export interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ReportAggregation {
  field: string;
  function: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'count_distinct';
  alias: string;
}

export type ReportType = 
  | 'sales' | 'purchases' | 'inventory' | 'financial' | 'hr' | 'manufacturing' | 'custom';

export interface ScheduledReport {
  id: string;
  report_id: string;
  company_id: string;
  name: string;
  schedule: string;  // Cron expression
  format: 'csv' | 'excel' | 'pdf';
  recipients: string[];  // Email addresses
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_by: string;
  created_at: string;
}

// Pre-defined report templates
const REPORT_TEMPLATES: Record<string, Partial<ReportDefinition>> = {
  sales_by_customer: {
    name: 'Sales by Customer',
    report_type: 'sales',
    data_source: 'customer_invoices',
    columns: [
      { field: 'customer_name', label: 'Customer', type: 'string', visible: true },
      { field: 'invoice_count', label: 'Invoices', type: 'number', visible: true },
      { field: 'total_amount', label: 'Total Sales', type: 'currency', visible: true },
      { field: 'paid_amount', label: 'Paid', type: 'currency', visible: true },
      { field: 'outstanding', label: 'Outstanding', type: 'currency', visible: true },
    ],
    grouping: ['customer_id'],
    aggregations: [
      { field: 'id', function: 'count', alias: 'invoice_count' },
      { field: 'total_amount', function: 'sum', alias: 'total_amount' },
      { field: 'paid_amount', function: 'sum', alias: 'paid_amount' },
    ],
  },
  sales_by_product: {
    name: 'Sales by Product',
    report_type: 'sales',
    data_source: 'invoice_items',
    columns: [
      { field: 'product_name', label: 'Product', type: 'string', visible: true },
      { field: 'quantity_sold', label: 'Qty Sold', type: 'number', visible: true },
      { field: 'total_revenue', label: 'Revenue', type: 'currency', visible: true },
      { field: 'avg_price', label: 'Avg Price', type: 'currency', visible: true },
    ],
    grouping: ['product_id'],
    aggregations: [
      { field: 'quantity', function: 'sum', alias: 'quantity_sold' },
      { field: 'line_total', function: 'sum', alias: 'total_revenue' },
      { field: 'unit_price', function: 'avg', alias: 'avg_price' },
    ],
  },
  ar_aging: {
    name: 'AR Aging Report',
    report_type: 'financial',
    data_source: 'customer_invoices',
    columns: [
      { field: 'customer_name', label: 'Customer', type: 'string', visible: true },
      { field: 'current', label: 'Current', type: 'currency', visible: true },
      { field: 'days_30', label: '1-30 Days', type: 'currency', visible: true },
      { field: 'days_60', label: '31-60 Days', type: 'currency', visible: true },
      { field: 'days_90', label: '61-90 Days', type: 'currency', visible: true },
      { field: 'over_90', label: '90+ Days', type: 'currency', visible: true },
      { field: 'total', label: 'Total', type: 'currency', visible: true },
    ],
    filters: [{ field: 'status', operator: 'neq', value: 'paid' }],
    grouping: ['customer_id'],
  },
  ap_aging: {
    name: 'AP Aging Report',
    report_type: 'financial',
    data_source: 'supplier_invoices',
    columns: [
      { field: 'supplier_name', label: 'Supplier', type: 'string', visible: true },
      { field: 'current', label: 'Current', type: 'currency', visible: true },
      { field: 'days_30', label: '1-30 Days', type: 'currency', visible: true },
      { field: 'days_60', label: '31-60 Days', type: 'currency', visible: true },
      { field: 'days_90', label: '61-90 Days', type: 'currency', visible: true },
      { field: 'over_90', label: '90+ Days', type: 'currency', visible: true },
      { field: 'total', label: 'Total', type: 'currency', visible: true },
    ],
    filters: [{ field: 'status', operator: 'neq', value: 'paid' }],
    grouping: ['supplier_id'],
  },
  inventory_valuation: {
    name: 'Inventory Valuation',
    report_type: 'inventory',
    data_source: 'products',
    columns: [
      { field: 'sku', label: 'SKU', type: 'string', visible: true },
      { field: 'name', label: 'Product', type: 'string', visible: true },
      { field: 'quantity_on_hand', label: 'Qty on Hand', type: 'number', visible: true },
      { field: 'unit_cost', label: 'Unit Cost', type: 'currency', visible: true },
      { field: 'total_value', label: 'Total Value', type: 'currency', visible: true },
    ],
    aggregations: [
      { field: 'quantity_on_hand', function: 'sum', alias: 'total_qty' },
      { field: 'total_value', function: 'sum', alias: 'total_value' },
    ],
  },
  trial_balance: {
    name: 'Trial Balance',
    report_type: 'financial',
    data_source: 'gl_accounts',
    columns: [
      { field: 'account_code', label: 'Account', type: 'string', visible: true },
      { field: 'account_name', label: 'Name', type: 'string', visible: true },
      { field: 'debit_balance', label: 'Debit', type: 'currency', visible: true },
      { field: 'credit_balance', label: 'Credit', type: 'currency', visible: true },
    ],
    sorting: [{ field: 'account_code', direction: 'asc' }],
  },
  employee_list: {
    name: 'Employee List',
    report_type: 'hr',
    data_source: 'employees',
    columns: [
      { field: 'employee_number', label: 'Emp #', type: 'string', visible: true },
      { field: 'full_name', label: 'Name', type: 'string', visible: true },
      { field: 'department', label: 'Department', type: 'string', visible: true },
      { field: 'position', label: 'Position', type: 'string', visible: true },
      { field: 'hire_date', label: 'Hire Date', type: 'date', visible: true },
      { field: 'status', label: 'Status', type: 'string', visible: true },
    ],
    sorting: [{ field: 'full_name', direction: 'asc' }],
  },
};

/**
 * Build SQL query from report definition
 */
function buildReportQuery(
  report: ReportDefinition,
  companyId: string,
  runtimeFilters: ReportFilter[] = []
): { sql: string; params: any[] } {
  const params: any[] = [];
  let sql = 'SELECT ';

  // Build SELECT clause
  if (report.grouping.length > 0) {
    const selectFields = report.grouping.map(g => g);
    for (const agg of report.aggregations) {
      selectFields.push(`${agg.function.toUpperCase()}(${agg.field}) as ${agg.alias}`);
    }
    sql += selectFields.join(', ');
  } else {
    sql += report.columns.filter(c => c.visible).map(c => c.field).join(', ');
  }

  sql += ` FROM ${report.data_source}`;

  // Build WHERE clause
  const allFilters = [...report.filters, ...runtimeFilters];
  const whereClauses = [`company_id = ?`];
  params.push(companyId);

  for (const filter of allFilters) {
    const clause = buildFilterClause(filter, params);
    if (clause) whereClauses.push(clause);
  }

  sql += ` WHERE ${whereClauses.join(' AND ')}`;

  // Build GROUP BY clause
  if (report.grouping.length > 0) {
    sql += ` GROUP BY ${report.grouping.join(', ')}`;
  }

  // Build ORDER BY clause
  if (report.sorting.length > 0) {
    sql += ` ORDER BY ${report.sorting.map(s => `${s.field} ${s.direction.toUpperCase()}`).join(', ')}`;
  }

  return { sql, params };
}

/**
 * Build filter clause for SQL
 */
function buildFilterClause(filter: ReportFilter, params: any[]): string | null {
  switch (filter.operator) {
    case 'eq':
      params.push(filter.value);
      return `${filter.field} = ?`;
    case 'neq':
      params.push(filter.value);
      return `${filter.field} != ?`;
    case 'gt':
      params.push(filter.value);
      return `${filter.field} > ?`;
    case 'gte':
      params.push(filter.value);
      return `${filter.field} >= ?`;
    case 'lt':
      params.push(filter.value);
      return `${filter.field} < ?`;
    case 'lte':
      params.push(filter.value);
      return `${filter.field} <= ?`;
    case 'like':
      params.push(`%${filter.value}%`);
      return `${filter.field} LIKE ?`;
    case 'in':
      if (Array.isArray(filter.value) && filter.value.length > 0) {
        const placeholders = filter.value.map(() => '?').join(', ');
        params.push(...filter.value);
        return `${filter.field} IN (${placeholders})`;
      }
      return null;
    case 'between':
      params.push(filter.value, filter.value2);
      return `${filter.field} BETWEEN ? AND ?`;
    case 'is_null':
      return `${filter.field} IS NULL`;
    case 'is_not_null':
      return `${filter.field} IS NOT NULL`;
    default:
      return null;
  }
}

/**
 * Create a new report definition
 */
export async function createReport(
  db: D1Database,
  companyId: string,
  userId: string,
  report: Omit<ReportDefinition, 'id' | 'company_id' | 'created_by' | 'created_at' | 'updated_at'>
): Promise<ReportDefinition> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  await db.prepare(`
    INSERT INTO report_definitions (
      id, company_id, name, description, report_type, data_source,
      columns, filters, grouping, sorting, aggregations,
      is_public, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, companyId, report.name, report.description || null, report.report_type, report.data_source,
    JSON.stringify(report.columns), JSON.stringify(report.filters), JSON.stringify(report.grouping),
    JSON.stringify(report.sorting), JSON.stringify(report.aggregations),
    report.is_public ? 1 : 0, userId, timestamp, timestamp
  ).run();

  return {
    id,
    company_id: companyId,
    ...report,
    created_by: userId,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

/**
 * Get report templates
 */
export function getReportTemplates(): { id: string; name: string; type: ReportType }[] {
  return Object.entries(REPORT_TEMPLATES).map(([id, template]) => ({
    id,
    name: template.name || id,
    type: template.report_type || 'custom',
  }));
}

/**
 * Create report from template
 */
export async function createFromTemplate(
  db: D1Database,
  companyId: string,
  userId: string,
  templateId: string
): Promise<ReportDefinition | null> {
  const template = REPORT_TEMPLATES[templateId];
  if (!template) return null;

  return createReport(db, companyId, userId, {
    name: template.name || templateId,
    description: null,
    report_type: template.report_type || 'custom',
    data_source: template.data_source || '',
    columns: template.columns || [],
    filters: template.filters || [],
    grouping: template.grouping || [],
    sorting: template.sorting || [],
    aggregations: template.aggregations || [],
    is_public: false,
  });
}

/**
 * List reports for a company
 */
export async function listReports(
  db: D1Database,
  companyId: string,
  userId: string
): Promise<ReportDefinition[]> {
  const result = await db.prepare(`
    SELECT * FROM report_definitions
    WHERE company_id = ? AND (is_public = 1 OR created_by = ?)
    ORDER BY name ASC
  `).bind(companyId, userId).all();

  return (result.results || []).map((row: any) => ({
    ...row,
    columns: JSON.parse(row.columns || '[]'),
    filters: JSON.parse(row.filters || '[]'),
    grouping: JSON.parse(row.grouping || '[]'),
    sorting: JSON.parse(row.sorting || '[]'),
    aggregations: JSON.parse(row.aggregations || '[]'),
    is_public: row.is_public === 1,
  }));
}

/**
 * Get a report by ID
 */
export async function getReport(
  db: D1Database,
  companyId: string,
  reportId: string
): Promise<ReportDefinition | null> {
  const result = await db.prepare(`
    SELECT * FROM report_definitions WHERE id = ? AND company_id = ?
  `).bind(reportId, companyId).first();

  if (!result) return null;

  const row = result as any;
  return {
    ...row,
    columns: JSON.parse(row.columns || '[]'),
    filters: JSON.parse(row.filters || '[]'),
    grouping: JSON.parse(row.grouping || '[]'),
    sorting: JSON.parse(row.sorting || '[]'),
    aggregations: JSON.parse(row.aggregations || '[]'),
    is_public: row.is_public === 1,
  };
}

/**
 * Execute a report and return results
 */
export async function executeReport(
  db: D1Database,
  companyId: string,
  reportId: string,
  runtimeFilters: ReportFilter[] = [],
  pagination: { page: number; pageSize: number } = { page: 1, pageSize: 100 }
): Promise<{ data: any[]; total: number; columns: ReportColumn[] }> {
  const report = await getReport(db, companyId, reportId);
  if (!report) {
    throw new Error('Report not found');
  }

  const { sql, params } = buildReportQuery(report, companyId, runtimeFilters);

  // Get total count
  const countSql = `SELECT COUNT(*) as count FROM (${sql}) as subquery`;
  const countResult = await db.prepare(countSql).bind(...params).first();
  const total = (countResult as any)?.count || 0;

  // Get paginated results
  const offset = (pagination.page - 1) * pagination.pageSize;
  const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
  const dataResult = await db.prepare(paginatedSql).bind(...params, pagination.pageSize, offset).all();

  return {
    data: dataResult.results || [],
    total,
    columns: report.columns,
  };
}

/**
 * Export report to CSV
 */
export function exportToCsv(data: any[], columns: ReportColumn[]): string {
  const visibleColumns = columns.filter(c => c.visible);
  const headers = visibleColumns.map(c => `"${c.label}"`).join(',');
  
  const rows = data.map(row => {
    return visibleColumns.map(col => {
      const value = row[col.field];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
      return String(value);
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Schedule a report
 */
export async function scheduleReport(
  db: D1Database,
  companyId: string,
  userId: string,
  reportId: string,
  name: string,
  schedule: string,
  format: 'csv' | 'excel' | 'pdf',
  recipients: string[]
): Promise<ScheduledReport> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  await db.prepare(`
    INSERT INTO scheduled_reports (
      id, report_id, company_id, name, schedule, format, recipients,
      is_active, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    id, reportId, companyId, name, schedule, format,
    JSON.stringify(recipients), userId, timestamp
  ).run();

  return {
    id,
    report_id: reportId,
    company_id: companyId,
    name,
    schedule,
    format,
    recipients,
    is_active: true,
    last_run_at: null,
    next_run_at: null,
    created_by: userId,
    created_at: timestamp,
  };
}

/**
 * List scheduled reports
 */
export async function listScheduledReports(
  db: D1Database,
  companyId: string
): Promise<ScheduledReport[]> {
  const result = await db.prepare(`
    SELECT * FROM scheduled_reports WHERE company_id = ? ORDER BY name ASC
  `).bind(companyId).all();

  return (result.results || []).map((row: any) => ({
    ...row,
    recipients: JSON.parse(row.recipients || '[]'),
    is_active: row.is_active === 1,
  }));
}

/**
 * Delete a scheduled report
 */
export async function deleteScheduledReport(
  db: D1Database,
  companyId: string,
  scheduleId: string
): Promise<boolean> {
  const result = await db.prepare(`
    DELETE FROM scheduled_reports WHERE id = ? AND company_id = ?
  `).bind(scheduleId, companyId).run();

  return (result.meta?.changes || 0) > 0;
}

export default {
  createReport,
  getReportTemplates,
  createFromTemplate,
  listReports,
  getReport,
  executeReport,
  exportToCsv,
  scheduleReport,
  listScheduledReports,
  deleteScheduledReport,
};
