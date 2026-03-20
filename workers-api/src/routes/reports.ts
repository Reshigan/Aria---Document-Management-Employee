/**
 * Reports Routes
 * Trial Balance, Financial Reports
 */

import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';
import { jwtVerify } from 'jose';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Helper to verify JWT and get company_id
async function getAuthenticatedCompanyId(c: any): Promise<string | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const token = authHeader.substring(7);
    const secretKey = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return (payload as any).company_id || null;
  } catch {
    return null;
  }
}

// ==================== TRIAL BALANCE ====================

app.get('/trial-balance', async (c) => {
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
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
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
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
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
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
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
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
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
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
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
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
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
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

export default app;
