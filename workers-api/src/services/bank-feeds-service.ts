/**
 * Bank Feeds Service (Plaid Integration)
 * 
 * Provides functionality for:
 * - Connecting bank accounts via Plaid
 * - Automatic transaction import
 * - Real-time balance updates
 * - Transaction categorization
 */

import { D1Database } from '@cloudflare/workers-types';

export interface BankConnection {
  id: string;
  company_id: string;
  bank_account_id: string;
  provider: 'plaid' | 'yodlee' | 'truelayer' | 'manual';
  access_token_encrypted: string | null;
  item_id: string | null;
  institution_id: string | null;
  institution_name: string | null;
  account_id: string | null;
  account_name: string | null;
  account_type: string | null;
  account_subtype: string | null;
  account_mask: string | null;
  status: 'active' | 'pending' | 'error' | 'disconnected';
  last_sync_at: string | null;
  last_sync_status: string | null;
  sync_frequency_hours: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankFeedTransaction {
  id: string;
  company_id: string;
  bank_account_id: string;
  connection_id: string;
  external_id: string;
  transaction_date: string;
  posted_date: string | null;
  amount: number;
  currency: string;
  description: string;
  merchant_name: string | null;
  category: string | null;
  subcategory: string | null;
  pending: boolean;
  transaction_type: 'debit' | 'credit';
  check_number: string | null;
  location: string | null;
  is_matched: boolean;
  matched_to_type: string | null;
  matched_to_id: string | null;
  suggested_gl_account_id: string | null;
  created_at: string;
}

export interface PlaidConfig {
  client_id: string;
  secret: string;
  environment: 'sandbox' | 'development' | 'production';
}

// Plaid API base URLs
const PLAID_URLS = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com'
};

// Create Plaid link token for connecting a bank
export async function createPlaidLinkToken(
  db: D1Database,
  companyId: string,
  userId: string,
  config: PlaidConfig
): Promise<{ linkToken: string; expiration: string }> {
  const baseUrl = PLAID_URLS[config.environment];
  
  // Get company info for client name
  const company = await db.prepare(`
    SELECT name FROM companies WHERE id = ?
  `).bind(companyId).first<{ name: string }>();
  
  const response = await fetch(`${baseUrl}/link/token/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: config.client_id,
      secret: config.secret,
      client_name: company?.name || 'ARIA ERP',
      user: {
        client_user_id: userId
      },
      products: ['transactions'],
      country_codes: ['US', 'GB', 'ZA', 'CA', 'AU'],
      language: 'en',
      webhook: `https://aria-api.workers.dev/api/bank-feeds/webhook`,
      account_filters: {
        depository: {
          account_subtypes: ['checking', 'savings']
        }
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(`Plaid error: ${error.error_message || 'Failed to create link token'}`);
  }
  
  const data = await response.json() as any;
  
  return {
    linkToken: data.link_token,
    expiration: data.expiration
  };
}

// Exchange public token for access token after user connects bank
export async function exchangePlaidPublicToken(
  db: D1Database,
  companyId: string,
  bankAccountId: string,
  publicToken: string,
  config: PlaidConfig
): Promise<BankConnection> {
  const baseUrl = PLAID_URLS[config.environment];
  
  // Exchange public token for access token
  const tokenResponse = await fetch(`${baseUrl}/item/public_token/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.client_id,
      secret: config.secret,
      public_token: publicToken
    })
  });
  
  if (!tokenResponse.ok) {
    const error = await tokenResponse.json() as any;
    throw new Error(`Plaid error: ${error.error_message || 'Failed to exchange token'}`);
  }
  
  const tokenData = await tokenResponse.json() as any;
  const accessToken = tokenData.access_token;
  const itemId = tokenData.item_id;
  
  // Get account info
  const accountsResponse = await fetch(`${baseUrl}/accounts/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.client_id,
      secret: config.secret,
      access_token: accessToken
    })
  });
  
  if (!accountsResponse.ok) {
    throw new Error('Failed to get account info');
  }
  
  const accountsData = await accountsResponse.json() as any;
  const account = accountsData.accounts[0]; // Use first account
  const institution = accountsData.item?.institution_id;
  
  // Get institution name
  let institutionName = 'Unknown Bank';
  if (institution) {
    try {
      const instResponse = await fetch(`${baseUrl}/institutions/get_by_id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: config.client_id,
          secret: config.secret,
          institution_id: institution,
          country_codes: ['US', 'GB', 'ZA', 'CA', 'AU']
        })
      });
      if (instResponse.ok) {
        const instData = await instResponse.json() as any;
        institutionName = instData.institution?.name || institutionName;
      }
    } catch {
      // Ignore institution lookup errors
    }
  }
  
  const connectionId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Store connection (access token should be encrypted in production)
  await db.prepare(`
    INSERT INTO bank_connections (
      id, company_id, bank_account_id, provider, access_token_encrypted,
      item_id, institution_id, institution_name, account_id, account_name,
      account_type, account_subtype, account_mask, status, sync_frequency_hours,
      created_at, updated_at
    ) VALUES (?, ?, ?, 'plaid', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 24, ?, ?)
  `).bind(
    connectionId,
    companyId,
    bankAccountId,
    accessToken, // Should be encrypted
    itemId,
    institution,
    institutionName,
    account?.account_id || null,
    account?.name || null,
    account?.type || null,
    account?.subtype || null,
    account?.mask || null,
    now,
    now
  ).run();
  
  // Update bank account with connection info
  await db.prepare(`
    UPDATE bank_accounts SET 
      connector_id = ?, 
      account_name = COALESCE(account_name, ?),
      updated_at = ?
    WHERE id = ? AND company_id = ?
  `).bind(connectionId, account?.name, now, bankAccountId, companyId).run();
  
  return {
    id: connectionId,
    company_id: companyId,
    bank_account_id: bankAccountId,
    provider: 'plaid',
    access_token_encrypted: accessToken,
    item_id: itemId,
    institution_id: institution,
    institution_name: institutionName,
    account_id: account?.account_id || null,
    account_name: account?.name || null,
    account_type: account?.type || null,
    account_subtype: account?.subtype || null,
    account_mask: account?.mask || null,
    status: 'active',
    last_sync_at: null,
    last_sync_status: null,
    sync_frequency_hours: 24,
    error_message: null,
    created_at: now,
    updated_at: now
  };
}

// Sync transactions from Plaid
export async function syncPlaidTransactions(
  db: D1Database,
  connectionId: string,
  config: PlaidConfig,
  startDate?: string,
  endDate?: string
): Promise<{ added: number; modified: number; removed: number }> {
  const connection = await db.prepare(`
    SELECT * FROM bank_connections WHERE id = ?
  `).bind(connectionId).first<BankConnection>();
  
  if (!connection || !connection.access_token_encrypted) {
    throw new Error('Connection not found or invalid');
  }
  
  const baseUrl = PLAID_URLS[config.environment];
  const now = new Date();
  const defaultStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  
  const response = await fetch(`${baseUrl}/transactions/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.client_id,
      secret: config.secret,
      access_token: connection.access_token_encrypted,
      start_date: startDate || defaultStartDate.toISOString().split('T')[0],
      end_date: endDate || now.toISOString().split('T')[0],
      options: {
        count: 500,
        offset: 0
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json() as any;
    
    // Update connection status
    await db.prepare(`
      UPDATE bank_connections SET 
        status = 'error', 
        error_message = ?,
        last_sync_at = ?,
        last_sync_status = 'failed',
        updated_at = ?
      WHERE id = ?
    `).bind(error.error_message || 'Sync failed', now.toISOString(), now.toISOString(), connectionId).run();
    
    throw new Error(`Plaid error: ${error.error_message || 'Failed to get transactions'}`);
  }
  
  const data = await response.json() as any;
  const transactions = data.transactions || [];
  
  let added = 0;
  let modified = 0;
  let removed = 0;
  
  for (const txn of transactions) {
    // Check if transaction already exists
    const existing = await db.prepare(`
      SELECT id FROM bank_feed_transactions WHERE external_id = ? AND connection_id = ?
    `).bind(txn.transaction_id, connectionId).first();
    
    const transactionType = txn.amount < 0 ? 'credit' : 'debit';
    const amount = Math.abs(txn.amount);
    
    if (existing) {
      // Update existing transaction
      await db.prepare(`
        UPDATE bank_feed_transactions SET
          transaction_date = ?,
          posted_date = ?,
          amount = ?,
          description = ?,
          merchant_name = ?,
          category = ?,
          pending = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        txn.date,
        txn.authorized_date || null,
        amount,
        txn.name || txn.merchant_name || 'Unknown',
        txn.merchant_name || null,
        txn.category?.[0] || null,
        txn.pending ? 1 : 0,
        now.toISOString(),
        (existing as any).id
      ).run();
      modified++;
    } else {
      // Insert new transaction
      await db.prepare(`
        INSERT INTO bank_feed_transactions (
          id, company_id, bank_account_id, connection_id, external_id,
          transaction_date, posted_date, amount, currency, description,
          merchant_name, category, subcategory, pending, transaction_type,
          check_number, location, is_matched, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).bind(
        crypto.randomUUID(),
        connection.company_id,
        connection.bank_account_id,
        connectionId,
        txn.transaction_id,
        txn.date,
        txn.authorized_date || null,
        amount,
        txn.iso_currency_code || 'USD',
        txn.name || txn.merchant_name || 'Unknown',
        txn.merchant_name || null,
        txn.category?.[0] || null,
        txn.category?.[1] || null,
        txn.pending ? 1 : 0,
        transactionType,
        txn.check_number || null,
        txn.location?.city || null,
        now.toISOString()
      ).run();
      added++;
    }
  }
  
  // Handle removed transactions (Plaid sends these separately)
  if (data.removed) {
    for (const removedTxn of data.removed) {
      await db.prepare(`
        DELETE FROM bank_feed_transactions WHERE external_id = ? AND connection_id = ?
      `).bind(removedTxn.transaction_id, connectionId).run();
      removed++;
    }
  }
  
  // Update connection sync status
  await db.prepare(`
    UPDATE bank_connections SET 
      status = 'active',
      last_sync_at = ?,
      last_sync_status = 'success',
      error_message = NULL,
      updated_at = ?
    WHERE id = ?
  `).bind(now.toISOString(), now.toISOString(), connectionId).run();
  
  return { added, modified, removed };
}

// Get bank connections for a company
export async function listBankConnections(
  db: D1Database,
  companyId: string
): Promise<BankConnection[]> {
  const result = await db.prepare(`
    SELECT bc.*, ba.account_name as aria_account_name, ba.account_number
    FROM bank_connections bc
    JOIN bank_accounts ba ON bc.bank_account_id = ba.id
    WHERE bc.company_id = ?
    ORDER BY bc.institution_name
  `).bind(companyId).all();
  
  return (result.results || []).map((row: any) => ({
    ...row,
    access_token_encrypted: null // Don't expose access token
  })) as BankConnection[];
}

// Get unmatched transactions
export async function getUnmatchedTransactions(
  db: D1Database,
  companyId: string,
  bankAccountId?: string,
  limit: number = 100
): Promise<BankFeedTransaction[]> {
  let query = `
    SELECT * FROM bank_feed_transactions
    WHERE company_id = ? AND is_matched = 0 AND pending = 0
  `;
  const params: any[] = [companyId];
  
  if (bankAccountId) {
    query += ' AND bank_account_id = ?';
    params.push(bankAccountId);
  }
  
  query += ' ORDER BY transaction_date DESC LIMIT ?';
  params.push(limit);
  
  const result = await db.prepare(query).bind(...params).all();
  return (result.results || []) as unknown as BankFeedTransaction[];
}

// Match transaction to GL entry or invoice
export async function matchTransaction(
  db: D1Database,
  transactionId: string,
  matchedToType: 'gl_entry' | 'invoice' | 'payment' | 'expense',
  matchedToId: string
): Promise<void> {
  await db.prepare(`
    UPDATE bank_feed_transactions SET
      is_matched = 1,
      matched_to_type = ?,
      matched_to_id = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(matchedToType, matchedToId, new Date().toISOString(), transactionId).run();
}

// Auto-match transactions using rules
export async function autoMatchTransactions(
  db: D1Database,
  companyId: string,
  bankAccountId: string
): Promise<{ matched: number }> {
  // Get unmatched transactions
  const transactions = await getUnmatchedTransactions(db, companyId, bankAccountId, 500);
  
  let matched = 0;
  
  for (const txn of transactions) {
    // Try to match with invoices by amount
    if (txn.transaction_type === 'credit') {
      const invoice = await db.prepare(`
        SELECT id FROM customer_invoices
        WHERE company_id = ? AND balance_due = ? AND status IN ('sent', 'posted', 'partial')
        LIMIT 1
      `).bind(companyId, txn.amount).first<{ id: string }>();
      
      if (invoice) {
        await matchTransaction(db, txn.id, 'invoice', invoice.id);
        matched++;
        continue;
      }
    }
    
    // Try to match with supplier invoices
    if (txn.transaction_type === 'debit') {
      const supplierInvoice = await db.prepare(`
        SELECT id FROM supplier_invoices
        WHERE company_id = ? AND balance_due = ? AND status IN ('approved', 'partial')
        LIMIT 1
      `).bind(companyId, txn.amount).first<{ id: string }>();
      
      if (supplierInvoice) {
        await matchTransaction(db, txn.id, 'payment', supplierInvoice.id);
        matched++;
        continue;
      }
    }
    
    // Try to match using bank rules
    const rules = await db.prepare(`
      SELECT * FROM bank_matching_rules
      WHERE company_id = ? AND is_active = 1
      ORDER BY priority DESC
    `).bind(companyId).all();
    
    for (const rule of (rules.results || []) as any[]) {
      let matches = false;
      
      if (rule.match_type === 'contains' && txn.description.toLowerCase().includes(rule.match_value.toLowerCase())) {
        matches = true;
      } else if (rule.match_type === 'exact' && txn.description.toLowerCase() === rule.match_value.toLowerCase()) {
        matches = true;
      } else if (rule.match_type === 'starts_with' && txn.description.toLowerCase().startsWith(rule.match_value.toLowerCase())) {
        matches = true;
      }
      
      if (matches && rule.gl_account_id) {
        // Create GL entry and match
        await db.prepare(`
          UPDATE bank_feed_transactions SET
            is_matched = 1,
            suggested_gl_account_id = ?,
            updated_at = ?
          WHERE id = ?
        `).bind(rule.gl_account_id, new Date().toISOString(), txn.id).run();
        matched++;
        break;
      }
    }
  }
  
  return { matched };
}

// Disconnect bank connection
export async function disconnectBank(
  db: D1Database,
  companyId: string,
  connectionId: string,
  config?: PlaidConfig
): Promise<void> {
  const connection = await db.prepare(`
    SELECT * FROM bank_connections WHERE id = ? AND company_id = ?
  `).bind(connectionId, companyId).first<BankConnection>();
  
  if (!connection) {
    throw new Error('Connection not found');
  }
  
  // Remove access from Plaid if we have config
  if (config && connection.access_token_encrypted && connection.provider === 'plaid') {
    try {
      const baseUrl = PLAID_URLS[config.environment];
      await fetch(`${baseUrl}/item/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: config.client_id,
          secret: config.secret,
          access_token: connection.access_token_encrypted
        })
      });
    } catch {
      // Ignore Plaid removal errors
    }
  }
  
  // Update connection status
  await db.prepare(`
    UPDATE bank_connections SET 
      status = 'disconnected',
      access_token_encrypted = NULL,
      updated_at = ?
    WHERE id = ?
  `).bind(new Date().toISOString(), connectionId).run();
  
  // Update bank account
  await db.prepare(`
    UPDATE bank_accounts SET connector_id = NULL, updated_at = ? WHERE id = ?
  `).bind(new Date().toISOString(), connection.bank_account_id).run();
}

// Get balance from Plaid
export async function getPlaidBalance(
  db: D1Database,
  connectionId: string,
  config: PlaidConfig
): Promise<{ current: number; available: number | null; currency: string }> {
  const connection = await db.prepare(`
    SELECT * FROM bank_connections WHERE id = ?
  `).bind(connectionId).first<BankConnection>();
  
  if (!connection || !connection.access_token_encrypted) {
    throw new Error('Connection not found or invalid');
  }
  
  const baseUrl = PLAID_URLS[config.environment];
  
  const response = await fetch(`${baseUrl}/accounts/balance/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.client_id,
      secret: config.secret,
      access_token: connection.access_token_encrypted
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to get balance');
  }
  
  const data = await response.json() as any;
  const account = data.accounts?.[0];
  
  return {
    current: account?.balances?.current || 0,
    available: account?.balances?.available || null,
    currency: account?.balances?.iso_currency_code || 'USD'
  };
}

// Process Plaid webhook
export async function processPlaidWebhook(
  db: D1Database,
  webhookType: string,
  webhookCode: string,
  itemId: string,
  config: PlaidConfig
): Promise<void> {
  // Find connection by item_id
  const connection = await db.prepare(`
    SELECT * FROM bank_connections WHERE item_id = ?
  `).bind(itemId).first<BankConnection>();
  
  if (!connection) {
    console.log(`No connection found for item_id: ${itemId}`);
    return;
  }
  
  switch (webhookType) {
    case 'TRANSACTIONS':
      if (webhookCode === 'SYNC_UPDATES_AVAILABLE' || webhookCode === 'DEFAULT_UPDATE') {
        // Sync new transactions
        await syncPlaidTransactions(db, connection.id, config);
      }
      break;
      
    case 'ITEM':
      if (webhookCode === 'ERROR') {
        // Mark connection as error
        await db.prepare(`
          UPDATE bank_connections SET 
            status = 'error',
            error_message = 'Bank connection requires attention',
            updated_at = ?
          WHERE id = ?
        `).bind(new Date().toISOString(), connection.id).run();
      } else if (webhookCode === 'PENDING_EXPIRATION') {
        // Notify about expiring connection
        await db.prepare(`
          UPDATE bank_connections SET 
            error_message = 'Bank connection will expire soon - please re-authenticate',
            updated_at = ?
          WHERE id = ?
        `).bind(new Date().toISOString(), connection.id).run();
      }
      break;
  }
}

// Sync all active connections (called by cron)
export async function syncAllConnections(
  db: D1Database,
  config: PlaidConfig
): Promise<{ synced: number; errors: string[] }> {
  const connections = await db.prepare(`
    SELECT * FROM bank_connections
    WHERE status = 'active' AND provider = 'plaid'
      AND (last_sync_at IS NULL OR datetime(last_sync_at, '+' || sync_frequency_hours || ' hours') < datetime('now'))
  `).all();
  
  let synced = 0;
  const errors: string[] = [];
  
  for (const connection of (connections.results || []) as unknown as BankConnection[]) {
    try {
      await syncPlaidTransactions(db, connection.id, config);
      synced++;
    } catch (error: any) {
      errors.push(`Connection ${connection.id}: ${error.message}`);
    }
  }
  
  return { synced, errors };
}

export default {
  createPlaidLinkToken,
  exchangePlaidPublicToken,
  syncPlaidTransactions,
  listBankConnections,
  getUnmatchedTransactions,
  matchTransaction,
  autoMatchTransactions,
  disconnectBank,
  getPlaidBalance,
  processPlaidWebhook,
  syncAllConnections
};
