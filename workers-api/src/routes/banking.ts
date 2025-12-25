import { Hono } from 'hono';
interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// BANK ACCOUNTS
// ============================================================================

// List bank accounts
app.get('/accounts', async (c) => {
  const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
  

  try {
    const db = c.env.DB;
    
    const accounts = await db.prepare(`
      SELECT * FROM bank_accounts WHERE company_id = ? ORDER BY is_primary DESC, account_name
    `).bind(companyId).all();
    
    return c.json({ accounts: accounts.results });
  } catch (error: any) {
    console.error('Bank accounts list error:', error);
    return c.json({ error: error.message || 'Failed to list bank accounts' }, 500);
  }
});

// Get bank account by ID
app.get('/accounts/:id', async (c) => {
  const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
  

  try {
    const accountId = c.req.param('id');
    const db = c.env.DB;
    
    const account = await db.prepare(`
      SELECT * FROM bank_accounts WHERE id = ? AND company_id = ?
    `).bind(accountId, companyId).first();
    
    if (!account) {
      return c.json({ error: 'Bank account not found' }, 404);
    }
    
    return c.json(account);
  } catch (error: any) {
    console.error('Bank account fetch error:', error);
    return c.json({ error: error.message || 'Failed to fetch bank account' }, 500);
  }
});

// Create bank account
app.post('/accounts', async (c) => {
  const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
  

  try {
    const body = await c.req.json();
    const db = c.env.DB;
    
    const accountId = crypto.randomUUID();
    
    await db.prepare(`
      INSERT INTO bank_accounts (
        id, company_id, account_name, bank_name, account_number, branch_code,
        swift_code, currency, gl_account_id, current_balance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      accountId,
      companyId,
      body.account_name,
      body.bank_name,
      body.account_number,
      body.branch_code || null,
      body.swift_code || null,
      body.currency || 'ZAR',
      body.gl_account_id || null,
      body.opening_balance || 0
    ).run();
    
    return c.json({ success: true, id: accountId });
  } catch (error: any) {
    console.error('Bank account create error:', error);
    return c.json({ error: error.message || 'Failed to create bank account' }, 500);
  }
});

// Update bank account
app.put('/accounts/:id', async (c) => {
  const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
  

  try {
    const accountId = c.req.param('id');
    const body = await c.req.json();
    const db = c.env.DB;
    
    await db.prepare(`
      UPDATE bank_accounts SET
        account_name = ?, bank_name = ?, account_number = ?, branch_code = ?,
        swift_code = ?, currency = ?, gl_account_id = ?,
        updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(
      body.account_name,
      body.bank_name,
      body.account_number,
      body.branch_code || null,
      body.swift_code || null,
      body.currency || 'ZAR',
      body.gl_account_id || null,
      new Date().toISOString(),
      accountId,
      companyId
    ).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Bank account update error:', error);
    return c.json({ error: error.message || 'Failed to update bank account' }, 500);
  }
});

// ============================================================================
// BANK TRANSACTIONS
// ============================================================================

// List bank transactions
app.get('/accounts/:accountId/transactions', async (c) => {
  const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
  

  try {
    const accountId = c.req.param('accountId');
    const db = c.env.DB;
    
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    const reconciled = c.req.query('reconciled');
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');
    
    let query = `
      SELECT * FROM bank_transactions
      WHERE company_id = ? AND bank_account_id = ?
    `;
    const params: any[] = [companyId, accountId];
    
    if (startDate) {
      query += ' AND transaction_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND transaction_date <= ?';
      params.push(endDate);
    }
    
    if (reconciled !== undefined) {
      query += ' AND is_reconciled = ?';
      params.push(reconciled === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY transaction_date DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const transactions = await db.prepare(query).bind(...params).all();
    
    // Get totals
    const totals = await db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_credits,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_debits,
        SUM(CASE WHEN is_reconciled = 0 THEN 1 ELSE 0 END) as unreconciled_count
      FROM bank_transactions
      WHERE company_id = ? AND bank_account_id = ?
    `).bind(companyId, accountId).first();
    
    return c.json({
      transactions: transactions.results,
      totals,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Bank transactions list error:', error);
    return c.json({ error: error.message || 'Failed to list transactions' }, 500);
  }
});

// Import bank transactions (CSV)
app.post('/accounts/:accountId/import', async (c) => {
  const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
  

  try {
    const accountId = c.req.param('accountId');
    const body = await c.req.json();
    const { transactions, mapping } = body;
    const db = c.env.DB;
    
    const batchId = crypto.randomUUID();
    let imported = 0;
    let skipped = 0;
    const errors: any[] = [];
    
    for (const row of transactions) {
      try {
        // Map fields based on provided mapping
        const txnDate = row[mapping.date_field];
        const description = row[mapping.description_field];
        const amount = parseFloat(row[mapping.amount_field] || '0');
        const reference = row[mapping.reference_field];
        const balance = row[mapping.balance_field] ? parseFloat(row[mapping.balance_field]) : null;
        
        // Check for duplicate
        const existing = await db.prepare(`
          SELECT id FROM bank_transactions
          WHERE company_id = ? AND bank_account_id = ? AND transaction_date = ? AND amount = ? AND description = ?
        `).bind(companyId, accountId, txnDate, amount, description).first();
        
        if (existing) {
          skipped++;
          continue;
        }
        
        const txnId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO bank_transactions (
            id, company_id, bank_account_id, transaction_date, description, reference,
            amount, balance_after, is_manual, import_batch_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `).bind(
          txnId,
          companyId,
          accountId,
          txnDate,
          description,
          reference || null,
          amount,
          balance,
          batchId,
          new Date().toISOString()
        ).run();
        
        imported++;
      } catch (err: any) {
        errors.push({ row, error: err.message });
      }
    }
    
    // Update bank account balance
    const latestTxn = await db.prepare(`
      SELECT balance_after FROM bank_transactions
      WHERE company_id = ? AND bank_account_id = ? AND balance_after IS NOT NULL
      ORDER BY transaction_date DESC, created_at DESC LIMIT 1
    `).bind(companyId, accountId).first<{ balance_after: number }>();
    
    if (latestTxn?.balance_after) {
      await db.prepare(`
        UPDATE bank_accounts SET current_balance = ?, updated_at = ? WHERE id = ?
      `).bind(latestTxn.balance_after, new Date().toISOString(), accountId).run();
    }
    
    return c.json({
      success: true,
      batch_id: batchId,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Bank import error:', error);
    return c.json({ error: error.message || 'Failed to import transactions' }, 500);
  }
});

// ============================================================================
// BANK RECONCILIATION
// ============================================================================

// Get reconciliation summary
app.get('/accounts/:accountId/reconciliation', async (c) => {
  const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
  

  try {
    const accountId = c.req.param('accountId');
    const db = c.env.DB;
    
    // Get account details
    const account = await db.prepare(`
      SELECT * FROM bank_accounts WHERE id = ? AND company_id = ?
    `).bind(accountId, companyId).first<any>();
    
    if (!account) {
      return c.json({ error: 'Bank account not found' }, 404);
    }
    
    // Get unreconciled transactions
    const unreconciled = await db.prepare(`
      SELECT * FROM bank_transactions
      WHERE company_id = ? AND bank_account_id = ? AND is_reconciled = 0
      ORDER BY transaction_date DESC
    `).bind(companyId, accountId).all();
    
    // Get suggested matches from ERP transactions
    const suggestions: any[] = [];
    for (const txn of unreconciled.results as any[]) {
      // Try to match with customer receipts
      if (txn.amount > 0) {
        const matches = await db.prepare(`
          SELECT 'customer_receipt' as type, id, customer_id, amount, receipt_date, reference
          FROM customer_receipts
          WHERE company_id = ? AND amount = ? AND is_reconciled = 0
          ORDER BY ABS(julianday(receipt_date) - julianday(?)) LIMIT 3
        `).bind(companyId, txn.amount, txn.transaction_date).all();
        
        if (matches.results.length > 0) {
          suggestions.push({
            bank_transaction_id: txn.id,
            matches: matches.results,
            confidence: 0.9
          });
        }
      }
      
      // Try to match with supplier payments
      if (txn.amount < 0) {
        const matches = await db.prepare(`
          SELECT 'supplier_payment' as type, id, supplier_id, amount, payment_date, reference
          FROM supplier_payments
          WHERE company_id = ? AND amount = ? AND is_reconciled = 0
          ORDER BY ABS(julianday(payment_date) - julianday(?)) LIMIT 3
        `).bind(companyId, Math.abs(txn.amount), txn.transaction_date).all();
        
        if (matches.results.length > 0) {
          suggestions.push({
            bank_transaction_id: txn.id,
            matches: matches.results,
            confidence: 0.9
          });
        }
      }
    }
    
    // Calculate reconciliation status
    const unreconciledTotal = (unreconciled.results as any[]).reduce((sum, t) => sum + t.amount, 0);
    
    return c.json({
      account,
      unreconciled_transactions: unreconciled.results,
      unreconciled_count: unreconciled.results.length,
      unreconciled_total: unreconciledTotal,
      suggested_matches: suggestions,
      last_reconciled_date: account.last_reconciled_date,
      last_reconciled_balance: account.last_reconciled_balance
    });
  } catch (error: any) {
    console.error('Reconciliation summary error:', error);
    return c.json({ error: error.message || 'Failed to get reconciliation summary' }, 500);
  }
});

// Reconcile transaction
app.post('/transactions/:txnId/reconcile', async (c) => {
  const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
  

  try {
    const txnId = c.req.param('txnId');
    const body = await c.req.json();
    const { matched_transaction_id, matched_transaction_type } = body;
    const db = c.env.DB;
    const userId = 'system';
    
    // Update bank transaction
    await db.prepare(`
      UPDATE bank_transactions SET
        is_reconciled = 1,
        reconciled_at = ?,
        reconciled_by = ?,
        matched_transaction_id = ?,
        matched_transaction_type = ?,
        updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(
      new Date().toISOString(),
      userId,
      matched_transaction_id || null,
      matched_transaction_type || null,
      new Date().toISOString(),
      txnId,
      companyId
    ).run();
    
    // If matched to an ERP transaction, mark that as reconciled too
    if (matched_transaction_id && matched_transaction_type) {
      const table = matched_transaction_type === 'customer_receipt' ? 'customer_receipts' : 'supplier_payments';
      await db.prepare(`
        UPDATE ${table} SET is_reconciled = 1, reconciled_at = ? WHERE id = ? AND company_id = ?
      `).bind(new Date().toISOString(), matched_transaction_id, companyId).run();
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Reconcile transaction error:', error);
    return c.json({ error: error.message || 'Failed to reconcile transaction' }, 500);
  }
});

// Bulk reconcile transactions
app.post('/accounts/:accountId/reconcile-bulk', async (c) => {
  const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
  

  try {
    const accountId = c.req.param('accountId');
    const body = await c.req.json();
    const { matches } = body; // Array of { bank_transaction_id, matched_transaction_id, matched_transaction_type }
    const db = c.env.DB;
    const userId = 'system';
    
    let reconciled = 0;
    
    for (const match of matches) {
      await db.prepare(`
        UPDATE bank_transactions SET
          is_reconciled = 1,
          reconciled_at = ?,
          reconciled_by = ?,
          matched_transaction_id = ?,
          matched_transaction_type = ?,
          updated_at = ?
        WHERE id = ? AND company_id = ? AND bank_account_id = ?
      `).bind(
        new Date().toISOString(),
        userId,
        match.matched_transaction_id || null,
        match.matched_transaction_type || null,
        new Date().toISOString(),
        match.bank_transaction_id,
        companyId,
        accountId
      ).run();
      
      reconciled++;
    }
    
    // Update last reconciled date on account
    await db.prepare(`
      UPDATE bank_accounts SET
        last_reconciled_date = ?,
        updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(new Date().toISOString().split('T')[0], new Date().toISOString(), accountId, companyId).run();
    
    return c.json({ success: true, reconciled });
  } catch (error: any) {
    console.error('Bulk reconcile error:', error);
    return c.json({ error: error.message || 'Failed to bulk reconcile' }, 500);
  }
});

// ============================================================================
// MATCHING RULES
// ============================================================================

// List matching rules
app.get('/rules', async (c) => {
  const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
  

  try {
    const db = c.env.DB;
    
    const rules = await db.prepare(`
      SELECT * FROM bank_matching_rules WHERE company_id = ? ORDER BY priority DESC
    `).bind(companyId).all();
    
    return c.json({ rules: rules.results });
  } catch (error: any) {
    console.error('Matching rules list error:', error);
    return c.json({ error: error.message || 'Failed to list matching rules' }, 500);
  }
});

// Create matching rule
app.post('/rules', async (c) => {
  const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
  

  try {
    const body = await c.req.json();
    const db = c.env.DB;
    
    const ruleId = crypto.randomUUID();
    
    await db.prepare(`
      INSERT INTO bank_matching_rules (
        id, company_id, rule_name, priority, is_active,
        match_field, match_operator, match_value,
        action_type, action_category, action_gl_account_id, action_tax_code, auto_reconcile
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      ruleId,
      companyId,
      body.rule_name,
      body.priority || 0,
      body.is_active !== false ? 1 : 0,
      body.match_field,
      body.match_operator,
      body.match_value,
      body.action_type,
      body.action_category || null,
      body.action_gl_account_id || null,
      body.action_tax_code || null,
      body.auto_reconcile ? 1 : 0
    ).run();
    
    return c.json({ success: true, id: ruleId });
  } catch (error: any) {
    console.error('Create matching rule error:', error);
    return c.json({ error: error.message || 'Failed to create matching rule' }, 500);
  }
});

// Apply matching rules to unreconciled transactions
app.post('/accounts/:accountId/apply-rules', async (c) => {
  const companyId = c.req.header('X-Company-ID') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
  

  try {
    const accountId = c.req.param('accountId');
    const db = c.env.DB;
    
    // Get active rules
    const rules = await db.prepare(`
      SELECT * FROM bank_matching_rules WHERE company_id = ? AND is_active = 1 ORDER BY priority DESC
    `).bind(companyId).all();
    
    // Get unreconciled transactions
    const transactions = await db.prepare(`
      SELECT * FROM bank_transactions
      WHERE company_id = ? AND bank_account_id = ? AND is_reconciled = 0
    `).bind(companyId, accountId).all();
    
    let matched = 0;
    let autoReconciled = 0;
    
    for (const txn of transactions.results as any[]) {
      for (const rule of rules.results as any[]) {
        let isMatch = false;
        const fieldValue = txn[rule.match_field] || '';
        
        switch (rule.match_operator) {
          case 'contains':
            isMatch = fieldValue.toLowerCase().includes(rule.match_value.toLowerCase());
            break;
          case 'equals':
            isMatch = fieldValue.toLowerCase() === rule.match_value.toLowerCase();
            break;
          case 'starts_with':
            isMatch = fieldValue.toLowerCase().startsWith(rule.match_value.toLowerCase());
            break;
          case 'ends_with':
            isMatch = fieldValue.toLowerCase().endsWith(rule.match_value.toLowerCase());
            break;
          case 'regex':
            isMatch = new RegExp(rule.match_value, 'i').test(fieldValue);
            break;
        }
        
        if (isMatch) {
          // Apply rule action
          await db.prepare(`
            UPDATE bank_transactions SET
              category = ?,
              is_reconciled = ?,
              reconciled_at = CASE WHEN ? = 1 THEN ? ELSE reconciled_at END,
              updated_at = ?
            WHERE id = ?
          `).bind(
            rule.action_category,
            rule.auto_reconcile,
            rule.auto_reconcile,
            new Date().toISOString(),
            new Date().toISOString(),
            txn.id
          ).run();
          
          matched++;
          if (rule.auto_reconcile) autoReconciled++;
          break; // Stop after first matching rule
        }
      }
    }
    
    return c.json({
      success: true,
      transactions_processed: transactions.results.length,
      matched,
      auto_reconciled: autoReconciled
    });
  } catch (error: any) {
    console.error('Apply rules error:', error);
    return c.json({ error: error.message || 'Failed to apply matching rules' }, 500);
  }
});

export default app;
