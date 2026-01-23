/**
 * Budget vs Actual Service
 * 
 * Provides functionality for:
 * - Creating and managing budgets
 * - Budget vs actual comparison reports
 * - Variance analysis
 * - Budget forecasting
 */

import { D1Database } from '@cloudflare/workers-types';

export interface Budget {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  fiscal_year: number;
  budget_type: 'annual' | 'quarterly' | 'monthly' | 'project';
  status: 'draft' | 'approved' | 'active' | 'closed';
  start_date: string;
  end_date: string;
  total_amount: number;
  currency: string;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetLine {
  id: string;
  budget_id: string;
  gl_account_id: string;
  gl_account_code: string;
  gl_account_name: string;
  department_id: string | null;
  project_id: string | null;
  period_1: number;
  period_2: number;
  period_3: number;
  period_4: number;
  period_5: number;
  period_6: number;
  period_7: number;
  period_8: number;
  period_9: number;
  period_10: number;
  period_11: number;
  period_12: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetVsActual {
  gl_account_id: string;
  gl_account_code: string;
  gl_account_name: string;
  department_id: string | null;
  department_name: string | null;
  budget_amount: number;
  actual_amount: number;
  variance_amount: number;
  variance_percent: number;
  is_favorable: boolean;
}

export interface BudgetSummary {
  budget_id: string;
  budget_name: string;
  fiscal_year: number;
  total_budget: number;
  total_actual: number;
  total_variance: number;
  variance_percent: number;
  periods: Array<{
    period: number;
    budget: number;
    actual: number;
    variance: number;
  }>;
  by_account: BudgetVsActual[];
  by_department: Array<{
    department_id: string | null;
    department_name: string | null;
    budget: number;
    actual: number;
    variance: number;
  }>;
}

// Create a new budget
export async function createBudget(
  db: D1Database,
  companyId: string,
  input: {
    name: string;
    description?: string;
    fiscal_year: number;
    budget_type: Budget['budget_type'];
    start_date: string;
    end_date: string;
    currency?: string;
    created_by: string;
  }
): Promise<Budget> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO budgets (
      id, company_id, name, description, fiscal_year, budget_type,
      status, start_date, end_date, total_amount, currency,
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, 0, ?, ?, ?, ?)
  `).bind(
    id,
    companyId,
    input.name,
    input.description || null,
    input.fiscal_year,
    input.budget_type,
    input.start_date,
    input.end_date,
    input.currency || 'ZAR',
    input.created_by,
    now,
    now
  ).run();
  
  return {
    id,
    company_id: companyId,
    name: input.name,
    description: input.description || null,
    fiscal_year: input.fiscal_year,
    budget_type: input.budget_type,
    status: 'draft',
    start_date: input.start_date,
    end_date: input.end_date,
    total_amount: 0,
    currency: input.currency || 'ZAR',
    created_by: input.created_by,
    approved_by: null,
    approved_at: null,
    created_at: now,
    updated_at: now
  };
}

// Get budget by ID
export async function getBudget(
  db: D1Database,
  companyId: string,
  budgetId: string
): Promise<Budget | null> {
  const result = await db.prepare(`
    SELECT * FROM budgets WHERE id = ? AND company_id = ?
  `).bind(budgetId, companyId).first();
  
  return result as Budget | null;
}

// List budgets
export async function listBudgets(
  db: D1Database,
  companyId: string,
  options?: { fiscalYear?: number; status?: Budget['status'] }
): Promise<Budget[]> {
  let query = 'SELECT * FROM budgets WHERE company_id = ?';
  const params: any[] = [companyId];
  
  if (options?.fiscalYear) {
    query += ' AND fiscal_year = ?';
    params.push(options.fiscalYear);
  }
  
  if (options?.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }
  
  query += ' ORDER BY fiscal_year DESC, name';
  
  const result = await db.prepare(query).bind(...params).all();
  return (result.results || []) as unknown as Budget[];
}

// Add budget line
export async function addBudgetLine(
  db: D1Database,
  budgetId: string,
  input: {
    gl_account_id: string;
    department_id?: string;
    project_id?: string;
    periods: number[];
    notes?: string;
  }
): Promise<BudgetLine> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Get GL account details
  const glAccount = await db.prepare(`
    SELECT account_code, account_name FROM gl_accounts WHERE id = ?
  `).bind(input.gl_account_id).first<{ account_code: string; account_name: string }>();
  
  const periods = input.periods.length === 12 ? input.periods : Array(12).fill(0);
  const totalAmount = periods.reduce((sum, p) => sum + p, 0);
  
  await db.prepare(`
    INSERT INTO budget_lines (
      id, budget_id, gl_account_id, gl_account_code, gl_account_name,
      department_id, project_id,
      period_1, period_2, period_3, period_4, period_5, period_6,
      period_7, period_8, period_9, period_10, period_11, period_12,
      total_amount, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    budgetId,
    input.gl_account_id,
    glAccount?.account_code || '',
    glAccount?.account_name || '',
    input.department_id || null,
    input.project_id || null,
    periods[0], periods[1], periods[2], periods[3], periods[4], periods[5],
    periods[6], periods[7], periods[8], periods[9], periods[10], periods[11],
    totalAmount,
    input.notes || null,
    now,
    now
  ).run();
  
  // Update budget total
  await updateBudgetTotal(db, budgetId);
  
  return {
    id,
    budget_id: budgetId,
    gl_account_id: input.gl_account_id,
    gl_account_code: glAccount?.account_code || '',
    gl_account_name: glAccount?.account_name || '',
    department_id: input.department_id || null,
    project_id: input.project_id || null,
    period_1: periods[0],
    period_2: periods[1],
    period_3: periods[2],
    period_4: periods[3],
    period_5: periods[4],
    period_6: periods[5],
    period_7: periods[6],
    period_8: periods[7],
    period_9: periods[8],
    period_10: periods[9],
    period_11: periods[10],
    period_12: periods[11],
    total_amount: totalAmount,
    notes: input.notes || null,
    created_at: now,
    updated_at: now
  };
}

// Update budget line
export async function updateBudgetLine(
  db: D1Database,
  lineId: string,
  periods: number[],
  notes?: string
): Promise<void> {
  const now = new Date().toISOString();
  const totalAmount = periods.reduce((sum, p) => sum + p, 0);
  
  const line = await db.prepare(`
    SELECT budget_id FROM budget_lines WHERE id = ?
  `).bind(lineId).first<{ budget_id: string }>();
  
  await db.prepare(`
    UPDATE budget_lines SET
      period_1 = ?, period_2 = ?, period_3 = ?, period_4 = ?,
      period_5 = ?, period_6 = ?, period_7 = ?, period_8 = ?,
      period_9 = ?, period_10 = ?, period_11 = ?, period_12 = ?,
      total_amount = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    periods[0] || 0, periods[1] || 0, periods[2] || 0, periods[3] || 0,
    periods[4] || 0, periods[5] || 0, periods[6] || 0, periods[7] || 0,
    periods[8] || 0, periods[9] || 0, periods[10] || 0, periods[11] || 0,
    totalAmount,
    notes || null,
    now,
    lineId
  ).run();
  
  if (line) {
    await updateBudgetTotal(db, line.budget_id);
  }
}

// Delete budget line
export async function deleteBudgetLine(db: D1Database, lineId: string): Promise<void> {
  const line = await db.prepare(`
    SELECT budget_id FROM budget_lines WHERE id = ?
  `).bind(lineId).first<{ budget_id: string }>();
  
  await db.prepare(`DELETE FROM budget_lines WHERE id = ?`).bind(lineId).run();
  
  if (line) {
    await updateBudgetTotal(db, line.budget_id);
  }
}

// Update budget total
async function updateBudgetTotal(db: D1Database, budgetId: string): Promise<void> {
  const result = await db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total FROM budget_lines WHERE budget_id = ?
  `).bind(budgetId).first<{ total: number }>();
  
  await db.prepare(`
    UPDATE budgets SET total_amount = ?, updated_at = ? WHERE id = ?
  `).bind(result?.total || 0, new Date().toISOString(), budgetId).run();
}

// Get budget lines
export async function getBudgetLines(
  db: D1Database,
  budgetId: string
): Promise<BudgetLine[]> {
  const result = await db.prepare(`
    SELECT bl.*, d.department_name
    FROM budget_lines bl
    LEFT JOIN departments d ON bl.department_id = d.id
    WHERE bl.budget_id = ?
    ORDER BY bl.gl_account_code
  `).bind(budgetId).all();
  
  return (result.results || []) as unknown as BudgetLine[];
}

// Approve budget
export async function approveBudget(
  db: D1Database,
  companyId: string,
  budgetId: string,
  approvedBy: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE budgets SET status = 'approved', approved_by = ?, approved_at = ?, updated_at = ?
    WHERE id = ? AND company_id = ?
  `).bind(approvedBy, now, now, budgetId, companyId).run();
}

// Activate budget
export async function activateBudget(
  db: D1Database,
  companyId: string,
  budgetId: string
): Promise<void> {
  await db.prepare(`
    UPDATE budgets SET status = 'active', updated_at = ?
    WHERE id = ? AND company_id = ?
  `).bind(new Date().toISOString(), budgetId, companyId).run();
}

// Get actual amounts from GL for a period
async function getActualAmounts(
  db: D1Database,
  companyId: string,
  startDate: string,
  endDate: string,
  glAccountIds: string[]
): Promise<Map<string, number>> {
  if (glAccountIds.length === 0) return new Map();
  
  const placeholders = glAccountIds.map(() => '?').join(',');
  
  const result = await db.prepare(`
    SELECT gl_account_id, SUM(
      CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END
    ) as total
    FROM gl_entries
    WHERE company_id = ? AND gl_account_id IN (${placeholders})
      AND entry_date >= ? AND entry_date <= ?
    GROUP BY gl_account_id
  `).bind(companyId, ...glAccountIds, startDate, endDate).all();
  
  const actuals = new Map<string, number>();
  for (const row of (result.results || []) as any[]) {
    actuals.set(row.gl_account_id, row.total || 0);
  }
  
  return actuals;
}

// Get budget vs actual report
export async function getBudgetVsActual(
  db: D1Database,
  companyId: string,
  budgetId: string,
  options?: { period?: number; departmentId?: string }
): Promise<BudgetSummary> {
  const budget = await getBudget(db, companyId, budgetId);
  if (!budget) throw new Error('Budget not found');
  
  const lines = await getBudgetLines(db, budgetId);
  
  // Get actual amounts
  const glAccountIds = [...new Set(lines.map(l => l.gl_account_id))];
  const actuals = await getActualAmounts(db, companyId, budget.start_date, budget.end_date, glAccountIds);
  
  // Calculate by account
  const byAccount: BudgetVsActual[] = [];
  const byDepartmentMap = new Map<string | null, { budget: number; actual: number }>();
  
  for (const line of lines) {
    if (options?.departmentId && line.department_id !== options.departmentId) continue;
    
    const actual = actuals.get(line.gl_account_id) || 0;
    const variance = line.total_amount - actual;
    const variancePercent = line.total_amount !== 0 ? (variance / line.total_amount) * 100 : 0;
    
    // Determine if variance is favorable (depends on account type - expense under budget is good)
    const isFavorable = variance >= 0;
    
    byAccount.push({
      gl_account_id: line.gl_account_id,
      gl_account_code: line.gl_account_code,
      gl_account_name: line.gl_account_name,
      department_id: line.department_id,
      department_name: null, // Would need to join
      budget_amount: line.total_amount,
      actual_amount: actual,
      variance_amount: variance,
      variance_percent: Math.round(variancePercent * 100) / 100,
      is_favorable: isFavorable
    });
    
    // Aggregate by department
    const deptKey = line.department_id;
    const existing = byDepartmentMap.get(deptKey) || { budget: 0, actual: 0 };
    existing.budget += line.total_amount;
    existing.actual += actual;
    byDepartmentMap.set(deptKey, existing);
  }
  
  // Calculate totals
  const totalBudget = byAccount.reduce((sum, a) => sum + a.budget_amount, 0);
  const totalActual = byAccount.reduce((sum, a) => sum + a.actual_amount, 0);
  const totalVariance = totalBudget - totalActual;
  const variancePercent = totalBudget !== 0 ? (totalVariance / totalBudget) * 100 : 0;
  
  // Calculate by period (simplified - would need actual period dates)
  const periods: Array<{ period: number; budget: number; actual: number; variance: number }> = [];
  for (let i = 1; i <= 12; i++) {
    const periodBudget = lines.reduce((sum, l) => sum + ((l as any)[`period_${i}`] || 0), 0);
    // Actual by period would require date-based GL query
    periods.push({
      period: i,
      budget: periodBudget,
      actual: 0, // Would need period-specific actual calculation
      variance: periodBudget
    });
  }
  
  // Convert department map to array
  const byDepartment = Array.from(byDepartmentMap.entries()).map(([deptId, data]) => ({
    department_id: deptId,
    department_name: null, // Would need to look up
    budget: data.budget,
    actual: data.actual,
    variance: data.budget - data.actual
  }));
  
  return {
    budget_id: budgetId,
    budget_name: budget.name,
    fiscal_year: budget.fiscal_year,
    total_budget: totalBudget,
    total_actual: totalActual,
    total_variance: totalVariance,
    variance_percent: Math.round(variancePercent * 100) / 100,
    periods,
    by_account: byAccount,
    by_department: byDepartment
  };
}

// Copy budget to new year
export async function copyBudget(
  db: D1Database,
  companyId: string,
  sourceBudgetId: string,
  newFiscalYear: number,
  adjustmentPercent: number = 0,
  createdBy: string
): Promise<Budget> {
  const sourceBudget = await getBudget(db, companyId, sourceBudgetId);
  if (!sourceBudget) throw new Error('Source budget not found');
  
  const sourceLines = await getBudgetLines(db, sourceBudgetId);
  
  // Calculate new dates
  const yearDiff = newFiscalYear - sourceBudget.fiscal_year;
  const newStartDate = new Date(sourceBudget.start_date);
  newStartDate.setFullYear(newStartDate.getFullYear() + yearDiff);
  const newEndDate = new Date(sourceBudget.end_date);
  newEndDate.setFullYear(newEndDate.getFullYear() + yearDiff);
  
  // Create new budget
  const newBudget = await createBudget(db, companyId, {
    name: `${sourceBudget.name} - ${newFiscalYear}`,
    description: `Copied from ${sourceBudget.name}`,
    fiscal_year: newFiscalYear,
    budget_type: sourceBudget.budget_type,
    start_date: newStartDate.toISOString().split('T')[0],
    end_date: newEndDate.toISOString().split('T')[0],
    currency: sourceBudget.currency,
    created_by: createdBy
  });
  
  // Copy lines with adjustment
  const multiplier = 1 + (adjustmentPercent / 100);
  
  for (const line of sourceLines) {
    const adjustedPeriods = [
      line.period_1, line.period_2, line.period_3, line.period_4,
      line.period_5, line.period_6, line.period_7, line.period_8,
      line.period_9, line.period_10, line.period_11, line.period_12
    ].map(p => Math.round(p * multiplier * 100) / 100);
    
    await addBudgetLine(db, newBudget.id, {
      gl_account_id: line.gl_account_id,
      department_id: line.department_id || undefined,
      project_id: line.project_id || undefined,
      periods: adjustedPeriods,
      notes: line.notes || undefined
    });
  }
  
  return newBudget;
}

// Get budget variance alerts
export async function getBudgetVarianceAlerts(
  db: D1Database,
  companyId: string,
  thresholdPercent: number = 10
): Promise<Array<{
  budget_id: string;
  budget_name: string;
  gl_account_code: string;
  gl_account_name: string;
  budget_amount: number;
  actual_amount: number;
  variance_percent: number;
  alert_type: 'over_budget' | 'significantly_under';
}>> {
  const activeBudgets = await listBudgets(db, companyId, { status: 'active' });
  const alerts: Array<any> = [];
  
  for (const budget of activeBudgets) {
    const summary = await getBudgetVsActual(db, companyId, budget.id);
    
    for (const account of summary.by_account) {
      const overBudget = account.actual_amount > account.budget_amount;
      const varianceAbs = Math.abs(account.variance_percent);
      
      if (varianceAbs >= thresholdPercent) {
        alerts.push({
          budget_id: budget.id,
          budget_name: budget.name,
          gl_account_code: account.gl_account_code,
          gl_account_name: account.gl_account_name,
          budget_amount: account.budget_amount,
          actual_amount: account.actual_amount,
          variance_percent: account.variance_percent,
          alert_type: overBudget ? 'over_budget' : 'significantly_under'
        });
      }
    }
  }
  
  return alerts.sort((a, b) => Math.abs(b.variance_percent) - Math.abs(a.variance_percent));
}

export default {
  createBudget,
  getBudget,
  listBudgets,
  addBudgetLine,
  updateBudgetLine,
  deleteBudgetLine,
  getBudgetLines,
  approveBudget,
  activateBudget,
  getBudgetVsActual,
  copyBudget,
  getBudgetVarianceAlerts
};
