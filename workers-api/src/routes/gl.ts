/**
 * General Ledger Routes
 * Chart of Accounts, Journal Entries, Trial Balance
 */

import { Hono } from 'hono';
import { getSecureCompanyId } from '../middleware/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// ==================== CHART OF ACCOUNTS ====================

// List all accounts
app.get('/chart-of-accounts', async (c) => {
  const companyId = await getSecureCompanyId(c);

  try {
    const search = c.req.query('search') || '';
    const type = c.req.query('type') || '';
    
    let query = 'SELECT * FROM gl_accounts WHERE company_id = ?';
    const params: any[] = [companyId];
    
    if (search) {
      query += ' AND (account_code LIKE ? OR account_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (type) {
      query += ' AND account_type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY account_code';
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({
      accounts: result.results || [],
      total: result.results?.length || 0
    });
  } catch (error) {
    console.error('Error loading accounts:', error);
    return c.json({ error: 'Failed to load accounts' }, 500);
  }
});

// Create account
app.post('/chart-of-accounts', async (c) => {
  const companyId = await getSecureCompanyId(c);

  try {
    const body = await c.req.json();
    const { account_code, account_name, account_type, account_category, is_active } = body;
    
    if (!account_code || !account_name || !account_type) {
      return c.json({ error: 'Account code, name, and type are required' }, 400);
    }
    
    // Check for duplicate account code
    const existing = await c.env.DB.prepare(
      'SELECT id FROM gl_accounts WHERE company_id = ? AND account_code = ?'
    ).bind(companyId, account_code).first();
    
    if (existing) {
      return c.json({ error: 'Account code already exists' }, 409);
    }
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      INSERT INTO gl_accounts (id, company_id, account_code, account_name, account_type, account_category, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, companyId, account_code, account_name, account_type, account_category || null, is_active !== false ? 1 : 0, now, now).run();
    
    return c.json({
      id,
      account_code,
      account_name,
      account_type,
      account_category,
      is_active: is_active !== false,
      created_at: now
    }, 201);
  } catch (error) {
    console.error('Error creating account:', error);
    return c.json({ error: 'Failed to create account' }, 500);
  }
});

// Update account
app.put('/chart-of-accounts/:code', async (c) => {
  const companyId = await getSecureCompanyId(c);

  try {
    const code = c.req.param('code');
    const body = await c.req.json();
    const { account_name, account_type, account_category, is_active } = body;
    
    const existing = await c.env.DB.prepare(
      'SELECT id FROM gl_accounts WHERE company_id = ? AND account_code = ?'
    ).bind(companyId, code).first();
    
    if (!existing) {
      return c.json({ error: 'Account not found' }, 404);
    }
    
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      UPDATE gl_accounts 
      SET account_name = ?, account_type = ?, account_category = ?, is_active = ?, updated_at = ?
      WHERE company_id = ? AND account_code = ?
    `).bind(account_name, account_type, account_category || null, is_active !== false ? 1 : 0, now, companyId, code).run();
    
    return c.json({ message: 'Account updated successfully' });
  } catch (error) {
    console.error('Error updating account:', error);
    return c.json({ error: 'Failed to update account' }, 500);
  }
});

// Delete account
app.delete('/chart-of-accounts/:code', async (c) => {
  const companyId = await getSecureCompanyId(c);

  try {
    const code = c.req.param('code');
    
    // Check if account has journal entries
    const hasEntries = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      JOIN gl_accounts ga ON jel.account_id = ga.id
      WHERE ga.company_id = ? AND ga.account_code = ?
    `).bind(companyId, code).first();
    
    if (hasEntries && (hasEntries as any).count > 0) {
      return c.json({ error: 'Cannot delete account with journal entries' }, 400);
    }
    
    await c.env.DB.prepare(
      'DELETE FROM gl_accounts WHERE company_id = ? AND account_code = ?'
    ).bind(companyId, code).run();
    
    return c.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

// ==================== JOURNAL ENTRIES ====================

// List journal entries
app.get('/journal-entries', async (c) => {
  const companyId = await getSecureCompanyId(c);

  try {
    const result = await c.env.DB.prepare(`
      SELECT je.*, 
        (SELECT GROUP_CONCAT(jel.account_id || ':' || jel.debit_amount || ':' || jel.credit_amount, '|')
         FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id) as lines_data
      FROM journal_entries je
      WHERE je.company_id = ?
      ORDER BY je.entry_date DESC, je.entry_number DESC
    `).bind(companyId).all();
    
    const entries = (result.results || []).map((entry: any) => ({
      ...entry,
      lines: entry.lines_data ? entry.lines_data.split('|').map((line: string, idx: number) => {
        const [account_id, debit, credit] = line.split(':');
        return {
          line_number: idx + 1,
          account_id,
          debit_amount: parseFloat(debit) || 0,
          credit_amount: parseFloat(credit) || 0
        };
      }) : []
    }));
    
    return c.json({ entries });
  } catch (error) {
    console.error('Error loading journal entries:', error);
    return c.json({ error: 'Failed to load journal entries' }, 500);
  }
});

// Create journal entry
app.post('/journal-entries', async (c) => {
  const companyId = await getSecureCompanyId(c);

  try {
    const body = await c.req.json();
    const { entry_date, description, reference, lines } = body;
    
    if (!entry_date || !description || !lines || lines.length < 2) {
      return c.json({ error: 'Entry date, description, and at least 2 lines are required' }, 400);
    }
    
    // Validate balanced entry
    const totalDebits = lines.reduce((sum: number, line: any) => sum + (parseFloat(line.debit_amount) || 0), 0);
    const totalCredits = lines.reduce((sum: number, line: any) => sum + (parseFloat(line.credit_amount) || 0), 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return c.json({ error: 'Journal entry must be balanced (debits must equal credits)' }, 400);
    }
    
    // Generate entry number
    const lastEntry = await c.env.DB.prepare(
      "SELECT entry_number FROM journal_entries WHERE company_id = ? ORDER BY entry_number DESC LIMIT 1"
    ).bind(companyId).first();
    
    let entryNumber = 'JE-0001';
    if (lastEntry && (lastEntry as any).entry_number) {
      const lastNum = parseInt((lastEntry as any).entry_number.replace('JE-', '')) || 0;
      entryNumber = `JE-${String(lastNum + 1).padStart(4, '0')}`;
    }
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      INSERT INTO journal_entries(id, company_id, entry_number, entry_date, description, reference, status, total_debit, total_credit, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, companyId, entryNumber, entry_date, description, reference || null, 'draft', totalDebits, totalCredits, now, now).run();
    
    // Insert journal entry lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.account_code || (line.debit_amount === 0 && line.credit_amount === 0)) continue;
      
      // Get account ID from account code
      const account = await c.env.DB.prepare(
        'SELECT id FROM gl_accounts WHERE company_id = ? AND account_code = ?'
      ).bind(companyId, line.account_code).first();
      
      if (!account) {
        return c.json({ error: `Account ${line.account_code} not found` }, 400);
      }
      
      const lineId = crypto.randomUUID();
      await c.env.DB.prepare(`
        INSERT INTO journal_entry_lines (id, journal_entry_id, line_number, account_id, description, debit_amount, credit_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(lineId, id, i + 1, (account as any).id, line.description || null, line.debit_amount || 0, line.credit_amount || 0).run();
    }
    
    return c.json({
      id,
      entry_number: entryNumber,
      entry_date,
      description,
      status: 'draft',
      total_debit: totalDebits,
      total_credit: totalCredits
    }, 201);
  } catch (error) {
    console.error('Error creating journal entry:', error);
    return c.json({ error: 'Failed to create journal entry' }, 500);
  }
});

// Post journal entry
app.post('/journal-entries/:id/post', async (c) => {
  const companyId = await getSecureCompanyId(c);

  try {
    const id = c.req.param('id');
    
    const entry = await c.env.DB.prepare(
      'SELECT * FROM journal_entries WHERE id = ? AND company_id = ?'
    ).bind(id, companyId).first();
    
    if (!entry) {
      return c.json({ error: 'Journal entry not found' }, 404);
    }
    
    if ((entry as any).status === 'posted') {
      return c.json({ error: 'Journal entry is already posted' }, 400);
    }
    
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      UPDATE journal_entries SET status = 'posted', posted_at = ?, updated_at = ? WHERE id = ?
    `).bind(now, now, id).run();
    
    return c.json({ message: 'Journal entry posted successfully' });
  } catch (error) {
    console.error('Error posting journal entry:', error);
    return c.json({ error: 'Failed to post journal entry' }, 500);
  }
});

export default app;
