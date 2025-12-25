/**
 * Financial Period Management Routes
 * 
 * Handles fiscal periods, period open/close, and period locks.
 * This is critical for accounting integrity - prevents posting to closed periods.
 */

import { Hono } from 'hono';
import { jwtVerify } from 'jose';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Helper to verify JWT and get company_id and user_id
async function getAuthContext(c: any): Promise<{ companyId: string; userId: string } | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    const secretKey = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return {
      companyId: (payload as any).company_id,
      userId: (payload as any).sub
    };
  } catch {
    return null;
  }
}

function generateUUID(): string {
  return crypto.randomUUID();
}

// ==================== FINANCIAL PERIODS ====================

// List all financial periods
app.get('/financial-periods', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const fiscalYear = c.req.query('fiscal_year');
    
    let query = 'SELECT * FROM financial_periods WHERE company_id = ?';
    const params: any[] = [auth.companyId];
    
    if (fiscalYear) {
      query += ' AND fiscal_year = ?';
      params.push(parseInt(fiscalYear));
    }
    
    query += ' ORDER BY fiscal_year DESC, period_number ASC';
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({
      periods: result.results || [],
      total: result.results?.length || 0
    });
  } catch (error) {
    console.error('Error loading periods:', error);
    return c.json({ error: 'Failed to load periods' }, 500);
  }
});

// Create financial periods for a fiscal year
app.post('/financial-periods/generate', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { fiscal_year, start_month = 1 } = body;
    
    if (!fiscal_year) {
      return c.json({ error: 'Fiscal year is required' }, 400);
    }
    
    // Check if periods already exist
    const existing = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM financial_periods WHERE company_id = ? AND fiscal_year = ?'
    ).bind(auth.companyId, fiscal_year).first();
    
    if (existing && (existing as any).count > 0) {
      return c.json({ error: 'Periods already exist for this fiscal year' }, 409);
    }
    
    const now = new Date().toISOString();
    const periods = [];
    
    // Generate 12 monthly periods
    for (let i = 0; i < 12; i++) {
      const periodNumber = i + 1;
      const month = ((start_month - 1 + i) % 12) + 1;
      const year = month < start_month ? fiscal_year + 1 : fiscal_year;
      
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of month
      
      const id = generateUUID();
      const periodName = `${startDate.toLocaleString('default', { month: 'short' })} ${year}`;
      
      await c.env.DB.prepare(`
        INSERT INTO financial_periods (id, company_id, period_name, start_date, end_date, fiscal_year, period_number, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)
      `).bind(
        id,
        auth.companyId,
        periodName,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        fiscal_year,
        periodNumber,
        now
      ).run();
      
      periods.push({
        id,
        period_name: periodName,
        period_number: periodNumber,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });
    }
    
    return c.json({
      message: `Generated 12 periods for fiscal year ${fiscal_year}`,
      periods
    }, 201);
  } catch (error) {
    console.error('Error generating periods:', error);
    return c.json({ error: 'Failed to generate periods' }, 500);
  }
});

// Close a financial period
app.post('/financial-periods/:id/close', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const periodId = c.req.param('id');
    
    // Get the period
    const period = await c.env.DB.prepare(
      'SELECT * FROM financial_periods WHERE id = ? AND company_id = ?'
    ).bind(periodId, auth.companyId).first();
    
    if (!period) {
      return c.json({ error: 'Period not found' }, 404);
    }
    
    if ((period as any).status === 'closed') {
      return c.json({ error: 'Period is already closed' }, 400);
    }
    
    if ((period as any).status === 'locked') {
      return c.json({ error: 'Period is locked and cannot be modified' }, 400);
    }
    
    const now = new Date().toISOString();
    
    // Close the period
    await c.env.DB.prepare(`
      UPDATE financial_periods 
      SET status = 'closed', closed_by = ?, closed_at = ?
      WHERE id = ?
    `).bind(auth.userId, now, periodId).run();
    
    // Create period locks for all modules
    const modules = ['gl', 'ar', 'ap', 'inventory', 'payroll'];
    const periodYYYYMM = (period as any).start_date.substring(0, 7);
    
    for (const module of modules) {
      const lockId = generateUUID();
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO period_locks (id, company_id, period, module, is_locked, locked_by, locked_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `).bind(lockId, auth.companyId, periodYYYYMM, module, auth.userId, now).run();
    }
    
    return c.json({ 
      message: 'Period closed successfully',
      period_id: periodId,
      closed_at: now
    });
  } catch (error) {
    console.error('Error closing period:', error);
    return c.json({ error: 'Failed to close period' }, 500);
  }
});

// Reopen a financial period
app.post('/financial-periods/:id/reopen', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const periodId = c.req.param('id');
    const body = await c.req.json();
    const { reason } = body;
    
    if (!reason) {
      return c.json({ error: 'Reason for reopening is required' }, 400);
    }
    
    // Get the period
    const period = await c.env.DB.prepare(
      'SELECT * FROM financial_periods WHERE id = ? AND company_id = ?'
    ).bind(periodId, auth.companyId).first();
    
    if (!period) {
      return c.json({ error: 'Period not found' }, 404);
    }
    
    if ((period as any).status === 'open') {
      return c.json({ error: 'Period is already open' }, 400);
    }
    
    if ((period as any).status === 'locked') {
      return c.json({ error: 'Period is locked and cannot be reopened' }, 400);
    }
    
    const now = new Date().toISOString();
    
    // Reopen the period
    await c.env.DB.prepare(`
      UPDATE financial_periods 
      SET status = 'open', closed_by = NULL, closed_at = NULL
      WHERE id = ?
    `).bind(periodId).run();
    
    // Remove period locks
    const periodYYYYMM = (period as any).start_date.substring(0, 7);
    await c.env.DB.prepare(`
      UPDATE period_locks 
      SET is_locked = 0, unlock_reason = ?
      WHERE company_id = ? AND period = ?
    `).bind(reason, auth.companyId, periodYYYYMM).run();
    
    // Record in audit trail
    const historyId = generateUUID();
    await c.env.DB.prepare(`
      INSERT INTO transaction_status_history (id, company_id, transaction_type, transaction_id, from_status, to_status, changed_by, changed_at, reason)
      VALUES (?, ?, 'financial_period', ?, 'closed', 'open', ?, ?, ?)
    `).bind(historyId, auth.companyId, periodId, auth.userId, now, reason).run();
    
    return c.json({ 
      message: 'Period reopened successfully',
      period_id: periodId,
      reopened_at: now
    });
  } catch (error) {
    console.error('Error reopening period:', error);
    return c.json({ error: 'Failed to reopen period' }, 500);
  }
});

// ==================== PERIOD LOCKS ====================

// Get period lock status
app.get('/period-locks', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const period = c.req.query('period'); // YYYY-MM format
    const module = c.req.query('module');
    
    let query = 'SELECT * FROM period_locks WHERE company_id = ?';
    const params: any[] = [auth.companyId];
    
    if (period) {
      query += ' AND period = ?';
      params.push(period);
    }
    
    if (module) {
      query += ' AND module = ?';
      params.push(module);
    }
    
    query += ' ORDER BY period DESC, module ASC';
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({
      locks: result.results || []
    });
  } catch (error) {
    console.error('Error loading period locks:', error);
    return c.json({ error: 'Failed to load period locks' }, 500);
  }
});

// Check if a specific period/module is locked
app.get('/period-locks/check', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const period = c.req.query('period'); // YYYY-MM format
    const module = c.req.query('module');
    
    if (!period || !module) {
      return c.json({ error: 'Period and module are required' }, 400);
    }
    
    const lock = await c.env.DB.prepare(
      'SELECT is_locked FROM period_locks WHERE company_id = ? AND period = ? AND module = ?'
    ).bind(auth.companyId, period, module).first();
    
    return c.json({
      period,
      module,
      is_locked: lock ? (lock as any).is_locked === 1 : false
    });
  } catch (error) {
    console.error('Error checking period lock:', error);
    return c.json({ error: 'Failed to check period lock' }, 500);
  }
});

// Lock a specific module for a period
app.post('/period-locks', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { period, module } = body;
    
    if (!period || !module) {
      return c.json({ error: 'Period and module are required' }, 400);
    }
    
    const validModules = ['gl', 'ar', 'ap', 'inventory', 'payroll'];
    if (!validModules.includes(module)) {
      return c.json({ error: 'Invalid module' }, 400);
    }
    
    const now = new Date().toISOString();
    const id = generateUUID();
    
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO period_locks (id, company_id, period, module, is_locked, locked_by, locked_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).bind(id, auth.companyId, period, module, auth.userId, now).run();
    
    return c.json({
      message: 'Period locked successfully',
      period,
      module,
      locked_at: now
    }, 201);
  } catch (error) {
    console.error('Error locking period:', error);
    return c.json({ error: 'Failed to lock period' }, 500);
  }
});

// Unlock a specific module for a period
app.delete('/period-locks/:period/:module', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const period = c.req.param('period');
    const module = c.req.param('module');
    const reason = c.req.query('reason') || 'Manual unlock';
    
    await c.env.DB.prepare(`
      UPDATE period_locks 
      SET is_locked = 0, unlock_reason = ?
      WHERE company_id = ? AND period = ? AND module = ?
    `).bind(reason, auth.companyId, period, module).run();
    
    return c.json({
      message: 'Period unlocked successfully',
      period,
      module
    });
  } catch (error) {
    console.error('Error unlocking period:', error);
    return c.json({ error: 'Failed to unlock period' }, 500);
  }
});

export default app;
