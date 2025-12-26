// Bank Feeds & Reconciliation Service

import { D1Database } from '@cloudflare/workers-types';

interface BankAccount {
  id: string;
  company_id: string;
  connector_id?: string;
  account_name: string;
  account_number?: string;
  account_type?: 'checking' | 'savings' | 'credit' | 'loan';
  currency: string;
  current_balance: number;
  available_balance?: number;
  institution_name?: string;
  institution_id?: string;
  gl_account_id?: string;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

interface BankTransaction {
  id: string;
  company_id: string;
  bank_account_id: string;
  external_id?: string;
  transaction_date: string;
  post_date?: string;
  description?: string;
  amount: number;
  transaction_type: 'debit' | 'credit';
  category?: string;
  merchant_name?: string;
  pending: boolean;
  reconciliation_status: 'unmatched' | 'matched' | 'reconciled' | 'excluded';
  matched_transaction_id?: string;
  matched_transaction_type?: 'payment' | 'receipt' | 'journal' | 'invoice';
  notes?: string;
  created_at: string;
  reconciled_at?: string;
  reconciled_by?: string;
}

interface BankReconciliation {
  id: string;
  company_id: string;
  bank_account_id: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  closing_balance: number;
  statement_balance?: number;
  reconciled_balance?: number;
  difference: number;
  status: 'in_progress' | 'completed' | 'approved';
  completed_at?: string;
  completed_by?: string;
  approved_at?: string;
  approved_by?: string;
  notes?: string;
  created_at: string;
}

// Create a bank account
export async function createBankAccount(
  db: D1Database,
  input: Omit<BankAccount, 'id' | 'created_at' | 'updated_at' | 'is_active'>
): Promise<BankAccount> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO bank_accounts (
      id, company_id, connector_id, account_name, account_number, account_type,
      currency, current_balance, available_balance, institution_name, institution_id,
      gl_account_id, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.connector_id || null,
    input.account_name,
    input.account_number || null,
    input.account_type || null,
    input.currency || 'USD',
    input.current_balance || 0,
    input.available_balance || null,
    input.institution_name || null,
    input.institution_id || null,
    input.gl_account_id || null,
    now,
    now
  ).run();
  
  return {
    id,
    ...input,
    is_active: true,
    created_at: now,
    updated_at: now
  };
}

// Get bank account by ID
export async function getBankAccount(db: D1Database, accountId: string): Promise<BankAccount | null> {
  const result = await db.prepare(`
    SELECT * FROM bank_accounts WHERE id = ?
  `).bind(accountId).first();
  
  if (!result) return null;
  
  return {
    ...result,
    is_active: Boolean(result.is_active)
  } as BankAccount;
}

// List bank accounts for a company
export async function listBankAccounts(db: D1Database, companyId: string): Promise<BankAccount[]> {
  const results = await db.prepare(`
    SELECT * FROM bank_accounts WHERE company_id = ? AND is_active = 1 ORDER BY account_name
  `).bind(companyId).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    is_active: Boolean(row.is_active)
  })) as BankAccount[];
}

// Update bank account balance
export async function updateBankBalance(
  db: D1Database,
  accountId: string,
  currentBalance: number,
  availableBalance?: number
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE bank_accounts 
    SET current_balance = ?, available_balance = ?, updated_at = ?, last_sync_at = ?
    WHERE id = ?
  `).bind(currentBalance, availableBalance || null, now, now, accountId).run();
}

// Import bank transactions (from statement or feed)
export async function importTransactions(
  db: D1Database,
  accountId: string,
  companyId: string,
  transactions: Array<{
    external_id?: string;
    transaction_date: string;
    post_date?: string;
    description?: string;
    amount: number;
    category?: string;
    merchant_name?: string;
    pending?: boolean;
  }>
): Promise<{ imported: number; duplicates: number }> {
  let imported = 0;
  let duplicates = 0;
  
  for (const txn of transactions) {
    // Check for duplicate by external_id
    if (txn.external_id) {
      const existing = await db.prepare(`
        SELECT id FROM bank_transactions WHERE bank_account_id = ? AND external_id = ?
      `).bind(accountId, txn.external_id).first();
      
      if (existing) {
        duplicates++;
        continue;
      }
    }
    
    const id = crypto.randomUUID();
    const transactionType = txn.amount >= 0 ? 'credit' : 'debit';
    
    await db.prepare(`
      INSERT INTO bank_transactions (
        id, company_id, bank_account_id, external_id, transaction_date, post_date,
        description, amount, transaction_type, category, merchant_name, pending,
        reconciliation_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unmatched', ?)
    `).bind(
      id,
      companyId,
      accountId,
      txn.external_id || null,
      txn.transaction_date,
      txn.post_date || null,
      txn.description || null,
      Math.abs(txn.amount),
      transactionType,
      txn.category || null,
      txn.merchant_name || null,
      txn.pending ? 1 : 0,
      new Date().toISOString()
    ).run();
    
    imported++;
  }
  
  return { imported, duplicates };
}

// Get unmatched transactions
export async function getUnmatchedTransactions(
  db: D1Database,
  accountId: string,
  limit: number = 100
): Promise<BankTransaction[]> {
  const results = await db.prepare(`
    SELECT * FROM bank_transactions 
    WHERE bank_account_id = ? AND reconciliation_status = 'unmatched'
    ORDER BY transaction_date DESC
    LIMIT ?
  `).bind(accountId, limit).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    pending: Boolean(row.pending)
  })) as BankTransaction[];
}

// Auto-match transactions with AR/AP
export async function autoMatchTransactions(
  db: D1Database,
  companyId: string,
  accountId: string
): Promise<{ matched: number }> {
  let matched = 0;
  
  // Get unmatched transactions
  const transactions = await getUnmatchedTransactions(db, accountId, 500);
  
  for (const txn of transactions) {
    // Try to match with payments by amount and date range
    const matchQuery = txn.transaction_type === 'credit'
      ? `SELECT id, 'receipt' as type FROM ar_receipts WHERE company_id = ? AND amount = ? AND receipt_date BETWEEN date(?, '-7 days') AND date(?, '+7 days') LIMIT 1`
      : `SELECT id, 'payment' as type FROM ap_payments WHERE company_id = ? AND amount = ? AND payment_date BETWEEN date(?, '-7 days') AND date(?, '+7 days') LIMIT 1`;
    
    const match = await db.prepare(matchQuery)
      .bind(companyId, txn.amount, txn.transaction_date, txn.transaction_date)
      .first<{ id: string; type: string }>();
    
    if (match) {
      await db.prepare(`
        UPDATE bank_transactions 
        SET reconciliation_status = 'matched', matched_transaction_id = ?, matched_transaction_type = ?
        WHERE id = ?
      `).bind(match.id, match.type, txn.id).run();
      
      matched++;
    }
  }
  
  return { matched };
}

// Manually match a transaction
export async function matchTransaction(
  db: D1Database,
  transactionId: string,
  matchedId: string,
  matchedType: 'payment' | 'receipt' | 'journal' | 'invoice',
  userId: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE bank_transactions 
    SET reconciliation_status = 'matched', matched_transaction_id = ?, 
        matched_transaction_type = ?, reconciled_by = ?
    WHERE id = ?
  `).bind(matchedId, matchedType, userId, transactionId).run();
}

// Reconcile matched transactions
export async function reconcileTransactions(
  db: D1Database,
  transactionIds: string[],
  userId: string
): Promise<number> {
  const now = new Date().toISOString();
  let reconciled = 0;
  
  for (const id of transactionIds) {
    const result = await db.prepare(`
      UPDATE bank_transactions 
      SET reconciliation_status = 'reconciled', reconciled_at = ?, reconciled_by = ?
      WHERE id = ? AND reconciliation_status = 'matched'
    `).bind(now, userId, id).run();
    
    if (result.meta.changes) reconciled++;
  }
  
  return reconciled;
}

// Exclude a transaction from reconciliation
export async function excludeTransaction(
  db: D1Database,
  transactionId: string,
  notes: string
): Promise<void> {
  await db.prepare(`
    UPDATE bank_transactions 
    SET reconciliation_status = 'excluded', notes = ?
    WHERE id = ?
  `).bind(notes, transactionId).run();
}

// Create a bank reconciliation
export async function createReconciliation(
  db: D1Database,
  input: {
    company_id: string;
    bank_account_id: string;
    period_start: string;
    period_end: string;
    opening_balance: number;
    statement_balance: number;
  }
): Promise<BankReconciliation> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Calculate reconciled balance from matched/reconciled transactions
  const txnResult = await db.prepare(`
    SELECT 
      SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END) as net
    FROM bank_transactions 
    WHERE bank_account_id = ? 
      AND transaction_date BETWEEN ? AND ?
      AND reconciliation_status IN ('matched', 'reconciled')
  `).bind(input.bank_account_id, input.period_start, input.period_end).first<{ net: number }>();
  
  const reconciledBalance = input.opening_balance + (txnResult?.net || 0);
  const difference = input.statement_balance - reconciledBalance;
  
  await db.prepare(`
    INSERT INTO bank_reconciliations (
      id, company_id, bank_account_id, period_start, period_end,
      opening_balance, closing_balance, statement_balance, reconciled_balance,
      difference, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', ?)
  `).bind(
    id,
    input.company_id,
    input.bank_account_id,
    input.period_start,
    input.period_end,
    input.opening_balance,
    input.statement_balance,
    input.statement_balance,
    reconciledBalance,
    difference,
    now
  ).run();
  
  return {
    id,
    company_id: input.company_id,
    bank_account_id: input.bank_account_id,
    period_start: input.period_start,
    period_end: input.period_end,
    opening_balance: input.opening_balance,
    closing_balance: input.statement_balance,
    statement_balance: input.statement_balance,
    reconciled_balance: reconciledBalance,
    difference,
    status: 'in_progress',
    created_at: now
  };
}

// Complete a reconciliation
export async function completeReconciliation(
  db: D1Database,
  reconciliationId: string,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();
  
  // Verify difference is zero
  const recon = await db.prepare(`
    SELECT * FROM bank_reconciliations WHERE id = ?
  `).bind(reconciliationId).first<BankReconciliation>();
  
  if (!recon) throw new Error('Reconciliation not found');
  if (Math.abs(recon.difference) > 0.01) {
    throw new Error('Cannot complete reconciliation with non-zero difference');
  }
  
  await db.prepare(`
    UPDATE bank_reconciliations 
    SET status = 'completed', completed_at = ?, completed_by = ?
    WHERE id = ?
  `).bind(now, userId, reconciliationId).run();
}

// Get reconciliation summary
export async function getReconciliationSummary(
  db: D1Database,
  accountId: string
): Promise<{
  total_transactions: number;
  unmatched: number;
  matched: number;
  reconciled: number;
  excluded: number;
  unmatched_amount: number;
}> {
  const result = await db.prepare(`
    SELECT 
      COUNT(*) as total_transactions,
      SUM(CASE WHEN reconciliation_status = 'unmatched' THEN 1 ELSE 0 END) as unmatched,
      SUM(CASE WHEN reconciliation_status = 'matched' THEN 1 ELSE 0 END) as matched,
      SUM(CASE WHEN reconciliation_status = 'reconciled' THEN 1 ELSE 0 END) as reconciled,
      SUM(CASE WHEN reconciliation_status = 'excluded' THEN 1 ELSE 0 END) as excluded,
      SUM(CASE WHEN reconciliation_status = 'unmatched' THEN amount ELSE 0 END) as unmatched_amount
    FROM bank_transactions WHERE bank_account_id = ?
  `).bind(accountId).first();
  
  return result as {
    total_transactions: number;
    unmatched: number;
    matched: number;
    reconciled: number;
    excluded: number;
    unmatched_amount: number;
  };
}

// Parse bank statement (CSV format)
export function parseCSVStatement(
  csvContent: string,
  dateColumn: number,
  descriptionColumn: number,
  amountColumn: number,
  hasHeader: boolean = true
): Array<{
  transaction_date: string;
  description: string;
  amount: number;
}> {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const transactions: Array<{ transaction_date: string; description: string; amount: number }> = [];
  
  const startIndex = hasHeader ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const columns = lines[i].split(',').map(col => col.trim().replace(/^"|"$/g, ''));
    
    if (columns.length > Math.max(dateColumn, descriptionColumn, amountColumn)) {
      const dateStr = columns[dateColumn];
      const description = columns[descriptionColumn];
      const amountStr = columns[amountColumn].replace(/[^0-9.-]/g, '');
      
      // Parse date (try common formats)
      let parsedDate: Date;
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts[2].length === 4) {
          parsedDate = new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
        } else {
          parsedDate = new Date(`20${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
        }
      } else {
        parsedDate = new Date(dateStr);
      }
      
      if (!isNaN(parsedDate.getTime()) && !isNaN(parseFloat(amountStr))) {
        transactions.push({
          transaction_date: parsedDate.toISOString().split('T')[0],
          description,
          amount: parseFloat(amountStr)
        });
      }
    }
  }
  
  return transactions;
}
