/**
 * Reports Routes
 * Trial Balance, Financial Reports
 */

import { Hono } from 'hono';
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

export default app;
