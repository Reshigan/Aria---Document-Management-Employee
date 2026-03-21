/**
 * Reports Routes
 * Trial Balance, Financial Reports
 */

import { Hono } from 'hono';
import { getSecureCompanyId } from '../middleware/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// ==================== TRIAL BALANCE ====================

app.get('/trial-balance', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const asOfDate = c.req.query('as_of_date') || new Date().toISOString().split('T')[0];
    
    // Get all accounts with their balances from posted journal entries
    const result = await c.env.DB.prepare(`
      SELECT 
        ga.account_code,
        ga.account_name,
        ga.account_type,
        COALESCE(SUM(jel.debit_amount), 0) as total_debits,
        COALESCE(SUM(jel.credit_amount), 0) as total_credits
      FROM gl_accounts ga
      LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted' AND je.entry_date <= ?
      WHERE ga.company_id = ? AND ga.is_active = 1
      GROUP BY ga.id, ga.account_code, ga.account_name, ga.account_type
      ORDER BY ga.account_code
    `).bind(asOfDate, companyId).all();
    
    const accounts = (result.results || []).map((acc: any) => {
      const debits = parseFloat(acc.total_debits) || 0;
      const credits = parseFloat(acc.total_credits) || 0;
      let balance = 0;
      let balanceType: 'debit' | 'credit' = 'debit';
      
      // Calculate balance based on account type
      if (['asset', 'expense'].includes(acc.account_type)) {
        balance = debits - credits;
        balanceType = balance >= 0 ? 'debit' : 'credit';
      } else {
        balance = credits - debits;
        balanceType = balance >= 0 ? 'credit' : 'debit';
      }
      
      return {
        account_code: acc.account_code,
        account_name: acc.account_name,
        account_type: acc.account_type,
        balance: Math.abs(balance),
        balance_type: balanceType
      };
    }).filter((acc: any) => acc.balance !== 0);
    
    const totalDebits = accounts
      .filter((acc: any) => acc.balance_type === 'debit')
      .reduce((sum: number, acc: any) => sum + acc.balance, 0);
    
    const totalCredits = accounts
      .filter((acc: any) => acc.balance_type === 'credit')
      .reduce((sum: number, acc: any) => sum + acc.balance, 0);
    
    return c.json({
      as_of_date: asOfDate,
      accounts,
      total_debits: totalDebits,
      total_credits: totalCredits,
      balanced: Math.abs(totalDebits - totalCredits) < 0.01
    });
  } catch (error) {
    console.error('Error generating trial balance:', error);
    return c.json({ error: 'Failed to generate trial balance' }, 500);
  }
});

// ==================== INCOME STATEMENT ====================

app.get('/income-statement', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const startDate = c.req.query('start_date') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = c.req.query('end_date') || new Date().toISOString().split('T')[0];
    
    // Get revenue accounts
    const revenueResult = await c.env.DB.prepare(`
      SELECT 
        ga.account_code,
        ga.account_name,
        COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) as balance
      FROM gl_accounts ga
      LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
        AND je.status = 'posted' 
        AND je.entry_date BETWEEN ? AND ?
      WHERE ga.company_id = ? AND ga.account_type = 'revenue' AND ga.is_active = 1
      GROUP BY ga.id, ga.account_code, ga.account_name
      HAVING balance != 0
      ORDER BY ga.account_code
    `).bind(startDate, endDate, companyId).all();
    
    // Get expense accounts
    const expenseResult = await c.env.DB.prepare(`
      SELECT 
        ga.account_code,
        ga.account_name,
        COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) as balance
      FROM gl_accounts ga
      LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
        AND je.status = 'posted' 
        AND je.entry_date BETWEEN ? AND ?
      WHERE ga.company_id = ? AND ga.account_type = 'expense' AND ga.is_active = 1
      GROUP BY ga.id, ga.account_code, ga.account_name
      HAVING balance != 0
      ORDER BY ga.account_code
    `).bind(startDate, endDate, companyId).all();
    
    const totalRevenue = (revenueResult.results || []).reduce((sum: number, acc: any) => sum + (parseFloat(acc.balance) || 0), 0);
    const totalExpenses = (expenseResult.results || []).reduce((sum: number, acc: any) => sum + (parseFloat(acc.balance) || 0), 0);
    const netIncome = totalRevenue - totalExpenses;
    
    return c.json({
      period: { start_date: startDate, end_date: endDate },
      revenue: {
        accounts: revenueResult.results || [],
        total: totalRevenue
      },
      expenses: {
        accounts: expenseResult.results || [],
        total: totalExpenses
      },
      net_income: netIncome
    });
  } catch (error) {
    console.error('Error generating income statement:', error);
    return c.json({ error: 'Failed to generate income statement' }, 500);
  }
});

// ==================== BALANCE SHEET ====================

app.get('/balance-sheet', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const asOfDate = c.req.query('as_of_date') || new Date().toISOString().split('T')[0];
    
    // Get asset accounts
    const assetResult = await c.env.DB.prepare(`
      SELECT 
        ga.account_code,
        ga.account_name,
        ga.account_category,
        COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) as balance
      FROM gl_accounts ga
      LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
        AND je.status = 'posted' 
        AND je.entry_date <= ?
      WHERE ga.company_id = ? AND ga.account_type = 'asset' AND ga.is_active = 1
      GROUP BY ga.id, ga.account_code, ga.account_name, ga.account_category
      HAVING balance != 0
      ORDER BY ga.account_code
    `).bind(asOfDate, companyId).all();
    
    // Get liability accounts
    const liabilityResult = await c.env.DB.prepare(`
      SELECT 
        ga.account_code,
        ga.account_name,
        ga.account_category,
        COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) as balance
      FROM gl_accounts ga
      LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
        AND je.status = 'posted' 
        AND je.entry_date <= ?
      WHERE ga.company_id = ? AND ga.account_type = 'liability' AND ga.is_active = 1
      GROUP BY ga.id, ga.account_code, ga.account_name, ga.account_category
      HAVING balance != 0
      ORDER BY ga.account_code
    `).bind(asOfDate, companyId).all();
    
    // Get equity accounts
    const equityResult = await c.env.DB.prepare(`
      SELECT 
        ga.account_code,
        ga.account_name,
        ga.account_category,
        COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) as balance
      FROM gl_accounts ga
      LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
        AND je.status = 'posted' 
        AND je.entry_date <= ?
      WHERE ga.company_id = ? AND ga.account_type = 'equity' AND ga.is_active = 1
      GROUP BY ga.id, ga.account_code, ga.account_name, ga.account_category
      HAVING balance != 0
      ORDER BY ga.account_code
    `).bind(asOfDate, companyId).all();
    
    const totalAssets = (assetResult.results || []).reduce((sum: number, acc: any) => sum + (parseFloat(acc.balance) || 0), 0);
    const totalLiabilities = (liabilityResult.results || []).reduce((sum: number, acc: any) => sum + (parseFloat(acc.balance) || 0), 0);
    const totalEquity = (equityResult.results || []).reduce((sum: number, acc: any) => sum + (parseFloat(acc.balance) || 0), 0);
    
    return c.json({
      as_of_date: asOfDate,
      assets: {
        accounts: assetResult.results || [],
        total: totalAssets
      },
      liabilities: {
        accounts: liabilityResult.results || [],
        total: totalLiabilities
      },
      equity: {
        accounts: equityResult.results || [],
        total: totalEquity
      },
      total_liabilities_and_equity: totalLiabilities + totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
    });
  } catch (error) {
    console.error('Error generating balance sheet:', error);
    return c.json({ error: 'Failed to generate balance sheet' }, 500);
  }
});

// ==================== AGENT/BOT DASHBOARD ====================

app.get('/agents/dashboard', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    // Get bot execution stats from bot_executions table
    const statsResult = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_actions,
        ROUND(AVG(CASE WHEN status = 'completed' THEN 100.0 ELSE 0.0 END), 1) as success_rate,
        COUNT(DISTINCT bot_id) as active_bots
      FROM bot_executions 
      WHERE company_id = ?
    `).bind(companyId).first();
    
    // Calculate time saved (estimate 5 minutes per action)
    const totalActions = (statsResult as any)?.total_actions || 0;
    const timeSavedHours = Math.round((totalActions * 5) / 60);
    
    return c.json({
      total_actions: totalActions,
      success_rate: (statsResult as any)?.success_rate || 0,
      time_saved_hours: timeSavedHours,
      active_bots: (statsResult as any)?.active_bots || 0
    });
  } catch (error) {
    console.error('Error fetching agent dashboard:', error);
    return c.json({
      total_actions: 0,
      success_rate: 0,
      time_saved_hours: 0,
      active_bots: 0
    });
  }
});

app.get('/agents/activity-chart', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    // Get activity for last 7 days
    const result = await c.env.DB.prepare(`
      SELECT 
        strftime('%w', created_at) as day_num,
        COUNT(*) as actions
      FROM bot_executions 
      WHERE company_id = ? 
        AND created_at >= datetime('now', '-7 days')
      GROUP BY strftime('%w', created_at)
      ORDER BY day_num
    `).bind(companyId).all();
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = dayNames.map((day, idx) => {
      const found = (result.results || []).find((r: any) => parseInt(r.day_num) === idx);
      return {
        day,
        actions: found ? (found as any).actions : 0
      };
    });
    
    return c.json({ chart_data: chartData });
  } catch (error) {
    console.error('Error fetching activity chart:', error);
    return c.json({ chart_data: [] });
  }
});

app.get('/agents/performance', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const result = await c.env.DB.prepare(`
      SELECT 
        bot_id as name,
        COUNT(*) as actions,
        ROUND(AVG(CASE WHEN status = 'completed' THEN 100.0 ELSE 0.0 END), 0) as success
      FROM bot_executions 
      WHERE company_id = ?
      GROUP BY bot_id
      ORDER BY actions DESC
      LIMIT 10
    `).bind(companyId).all();
    
    const agents = (result.results || []).map((r: any) => ({
      name: r.name?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown',
      success: r.success || 0,
      actions: r.actions || 0
    }));
    
    return c.json({ agents });
  } catch (error) {
    console.error('Error fetching agent performance:', error);
    return c.json({ agents: [] });
  }
});

app.get('/agents/recent-actions', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const result = await c.env.DB.prepare(`
      SELECT 
        bot_id,
        action_type,
        created_at
      FROM bot_executions 
      WHERE company_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(companyId).all();
    
    const now = new Date();
    const actions = (result.results || []).map((r: any) => {
      const createdAt = new Date(r.created_at);
      const diffMs = now.getTime() - createdAt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      let time = '';
      if (diffDays > 0) time = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      else if (diffHours > 0) time = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      else if (diffMins > 0) time = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      else time = 'Just now';
      
      return {
        agent: r.bot_id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown Agent',
        action: r.action_type || 'Executed task',
        time
      };
    });
    
    return c.json({ actions });
  } catch (error) {
    console.error('Error fetching recent actions:', error);
    return c.json({ actions: [] });
  }
});

// ==================== AR AGING REPORT ====================

app.get('/ar-aging', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  try {
    const aging = await c.env.DB.prepare(`
      SELECT c.customer_name, c.customer_code, ci.invoice_number, ci.invoice_date, ci.due_date,
             COALESCE(ci.total_amount, 0) as total_amount, COALESCE(ci.balance_due, 0) as balance_due,
             CAST((julianday('now') - julianday(ci.due_date)) AS INTEGER) as days_overdue
      FROM customer_invoices ci
      JOIN customers c ON ci.customer_id = c.id
      WHERE ci.company_id = ? AND ci.balance_due > 0
      ORDER BY days_overdue DESC
    `).bind(companyId).all();
    let current = 0, days30 = 0, days60 = 0, days90 = 0, over90 = 0;
    for (const inv of aging.results as any[]) {
      const bal = inv.balance_due || 0;
      if (inv.days_overdue <= 0) current += bal;
      else if (inv.days_overdue <= 30) days30 += bal;
      else if (inv.days_overdue <= 60) days60 += bal;
      else if (inv.days_overdue <= 90) days90 += bal;
      else over90 += bal;
    }
    return c.json({
      summary: { current, '1-30_days': days30, '31-60_days': days60, '61-90_days': days90, 'over_90_days': over90, total: current + days30 + days60 + days90 + over90 },
      details: aging.results
    });
  } catch (error) {
    return c.json({ summary: { current: 0, '1-30_days': 0, '31-60_days': 0, '61-90_days': 0, 'over_90_days': 0, total: 0 }, details: [] });
  }
});

// ==================== AP AGING REPORT ====================

app.get('/ap-aging', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  try {
    const aging = await c.env.DB.prepare(`
      SELECT s.supplier_name, s.supplier_code, si.invoice_number, si.invoice_date, si.due_date,
             COALESCE(si.total_amount, 0) as total_amount, COALESCE(si.balance_due, 0) as balance_due,
             CAST((julianday('now') - julianday(si.due_date)) AS INTEGER) as days_overdue
      FROM supplier_invoices si
      JOIN suppliers s ON si.supplier_id = s.id
      WHERE si.company_id = ? AND si.balance_due > 0
      ORDER BY days_overdue DESC
    `).bind(companyId).all();
    let current = 0, days30 = 0, days60 = 0, days90 = 0, over90 = 0;
    for (const inv of aging.results as any[]) {
      const bal = inv.balance_due || 0;
      if (inv.days_overdue <= 0) current += bal;
      else if (inv.days_overdue <= 30) days30 += bal;
      else if (inv.days_overdue <= 60) days60 += bal;
      else if (inv.days_overdue <= 90) days90 += bal;
      else over90 += bal;
    }
    return c.json({
      summary: { current, '1-30_days': days30, '31-60_days': days60, '61-90_days': days90, 'over_90_days': over90, total: current + days30 + days60 + days90 + over90 },
      details: aging.results
    });
  } catch (error) {
    return c.json({ summary: { current: 0, '1-30_days': 0, '31-60_days': 0, '61-90_days': 0, 'over_90_days': 0, total: 0 }, details: [] });
  }
});

// ==================== PROFIT & LOSS (alias for income-statement) ====================

app.get('/profit-loss', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  try {
    const startDate = c.req.query('start_date') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = c.req.query('end_date') || new Date().toISOString().split('T')[0];
    const revenueResult = await c.env.DB.prepare(`
      SELECT ga.account_code, ga.account_name, COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) as balance
      FROM gl_accounts ga LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted' AND je.entry_date BETWEEN ? AND ?
      WHERE ga.company_id = ? AND ga.account_type = 'revenue' AND ga.is_active = 1
      GROUP BY ga.id, ga.account_code, ga.account_name HAVING balance != 0 ORDER BY ga.account_code
    `).bind(startDate, endDate, companyId).all();
    const expenseResult = await c.env.DB.prepare(`
      SELECT ga.account_code, ga.account_name, COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) as balance
      FROM gl_accounts ga LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted' AND je.entry_date BETWEEN ? AND ?
      WHERE ga.company_id = ? AND ga.account_type = 'expense' AND ga.is_active = 1
      GROUP BY ga.id, ga.account_code, ga.account_name HAVING balance != 0 ORDER BY ga.account_code
    `).bind(startDate, endDate, companyId).all();
    const totalRevenue = (revenueResult.results || []).reduce((sum: number, acc: any) => sum + (parseFloat(acc.balance) || 0), 0);
    const totalExpenses = (expenseResult.results || []).reduce((sum: number, acc: any) => sum + (parseFloat(acc.balance) || 0), 0);
    return c.json({ period: { start_date: startDate, end_date: endDate }, revenue: { accounts: revenueResult.results || [], total: totalRevenue }, expenses: { accounts: expenseResult.results || [], total: totalExpenses }, net_income: totalRevenue - totalExpenses });
  } catch (error) {
    return c.json({ period: {}, revenue: { accounts: [], total: 0 }, expenses: { accounts: [], total: 0 }, net_income: 0 });
  }
});

// ==================== CASH FLOW ====================

app.get('/cash-flow', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  try {
    const startDate = c.req.query('start_date') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = c.req.query('end_date') || new Date().toISOString().split('T')[0];
    return c.json({ period: { start_date: startDate, end_date: endDate }, operating: { items: [], total: 0 }, investing: { items: [], total: 0 }, financing: { items: [], total: 0 }, net_change: 0, opening_balance: 0, closing_balance: 0 });
  } catch (error) {
    return c.json({ period: {}, operating: { items: [], total: 0 }, investing: { items: [], total: 0 }, financing: { items: [], total: 0 }, net_change: 0 });
  }
});

// ==================== AGED RECEIVABLES ====================

app.get('/aged-receivables', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  try {
    const aging = await c.env.DB.prepare(`
      SELECT c.customer_name, ci.invoice_number, ci.due_date, COALESCE(ci.balance_due, 0) as balance_due,
             CAST((julianday('now') - julianday(ci.due_date)) AS INTEGER) as days_overdue
      FROM customer_invoices ci JOIN customers c ON ci.customer_id = c.id
      WHERE ci.company_id = ? AND ci.balance_due > 0 ORDER BY days_overdue DESC
    `).bind(companyId).all();
    return c.json({ data: aging.results || [], total: (aging.results || []).reduce((s: number, r: any) => s + (r.balance_due || 0), 0) });
  } catch (error) {
    return c.json({ data: [], total: 0 });
  }
});

// ==================== STOCK VALUATION ====================

app.get('/stock-valuation', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  try {
    const products = await c.env.DB.prepare(`
      SELECT product_name, product_code, COALESCE(stock_on_hand, 0) as quantity, COALESCE(unit_cost, 0) as unit_cost,
             COALESCE(stock_on_hand * unit_cost, 0) as total_value
      FROM products WHERE company_id = ? AND is_active = 1 ORDER BY product_name
    `).bind(companyId).all();
    return c.json({ data: products.results || [], total_value: (products.results || []).reduce((s: number, r: any) => s + (parseFloat(r.total_value) || 0), 0) });
  } catch (error) {
    return c.json({ data: [], total_value: 0 });
  }
});

// ==================== VAT SUMMARY ====================

app.get('/vat-summary', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  try {
    return c.json({ output_vat: 0, input_vat: 0, net_vat: 0, periods: [] });
  } catch (error) {
    return c.json({ output_vat: 0, input_vat: 0, net_vat: 0, periods: [] });
  }
});

// ==================== AGED (generic) ====================

app.get('/aged', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  try {
    const asOfDate = c.req.query('as_of_date') || new Date().toISOString().split('T')[0];
    return c.json({ as_of_date: asOfDate, receivables: { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, 'over_90': 0, total: 0 }, payables: { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, 'over_90': 0, total: 0 } });
  } catch (error) {
    return c.json({ receivables: {}, payables: {} });
  }
});

// ==================== EXPORT ENDPOINTS ====================

app.get('/aged/export', async (c) => {
  return c.text('account,amount\n', 200, { 'Content-Type': 'text/csv' });
});

app.get('/balance-sheet/export', async (c) => {
  return c.text('account,amount\n', 200, { 'Content-Type': 'text/csv' });
});

app.get('/cash-flow/export', async (c) => {
  return c.text('account,amount\n', 200, { 'Content-Type': 'text/csv' });
});

app.get('/profit-loss/export', async (c) => {
  return c.text('account,amount\n', 200, { 'Content-Type': 'text/csv' });
});

// ==================== BBBEE REPORT ====================

app.get('/bbbee/current', async (c) => {
  return c.json({ level: 1, score: 0, categories: [], expiry_date: null });
});

app.get('/bbbee/export', async (c) => {
  return c.text('category,score\n', 200, { 'Content-Type': 'text/csv' });
});

// ==================== EXPENSE REPORTS ====================

app.get('/expenses/summary', async (c) => {
  return c.json({ total: 0, by_category: [], by_employee: [] });
});

app.get('/expenses/claims', async (c) => {
  return c.json({ data: [] });
});

app.get('/expenses/export', async (c) => {
  return c.text('employee,amount,category\n', 200, { 'Content-Type': 'text/csv' });
});

// ==================== PAYROLL REPORTS ====================

app.get('/payroll/summary', async (c) => {
  return c.json({ total_gross: 0, total_net: 0, total_tax: 0, employee_count: 0 });
});

app.get('/payroll/runs', async (c) => {
  return c.json({ data: [] });
});

app.get('/payroll/export', async (c) => {
  return c.text('employee,gross,net,tax\n', 200, { 'Content-Type': 'text/csv' });
});

// ==================== INVOICE RECONCILIATION REPORT ====================

app.get('/agents/invoice-reconciliation', async (c) => {
  return c.json({ matched: 0, unmatched: 0, total: 0, items: [] });
});

export default app;
