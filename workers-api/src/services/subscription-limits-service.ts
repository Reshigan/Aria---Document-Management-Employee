/**
 * Subscription Limits Service
 * 
 * Enforces system limits based on the company's subscription tier.
 * Limits include: users, storage, API calls, bot runs, documents, transactions
 */

interface SubscriptionLimits {
  users: number;
  storage_gb: number;
  api_calls_monthly: number;
  bot_runs_monthly: number;
  documents_monthly: number;
  transactions_monthly: number;
}

interface UsageStats {
  users: number;
  storage_gb: number;
  api_calls_monthly: number;
  bot_runs_monthly: number;
  documents_monthly: number;
  transactions_monthly: number;
}

interface LimitCheckResult {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
  message?: string;
}

/**
 * Get the subscription limits for a company
 */
export async function getCompanyLimits(db: D1Database, companyId: string): Promise<SubscriptionLimits | null> {
  try {
    // Get the company's active subscription and plan limits
    const result = await db.prepare(`
      SELECT sp.limits
      FROM subscriptions s
      JOIN subscription_plans sp ON sp.id = s.plan_id
      WHERE s.company_id = ? AND s.status IN ('active', 'trial')
      ORDER BY s.created_at DESC
      LIMIT 1
    `).bind(companyId).first();

    if (!result) {
      // Return default free tier limits if no subscription
      return {
        users: 1,
        storage_gb: 1,
        api_calls_monthly: 100,
        bot_runs_monthly: 10,
        documents_monthly: 50,
        transactions_monthly: 100,
      };
    }

    const limits = JSON.parse((result as any).limits || '{}');
    return {
      users: limits.users || 1,
      storage_gb: limits.storage_gb || 1,
      api_calls_monthly: limits.api_calls_monthly || 100,
      bot_runs_monthly: limits.bot_runs_monthly || 10,
      documents_monthly: limits.documents_monthly || 50,
      transactions_monthly: limits.transactions_monthly || 100,
    };
  } catch (error) {
    console.error('Error getting company limits:', error);
    return null;
  }
}

/**
 * Get current usage stats for a company
 */
export async function getCompanyUsage(db: D1Database, companyId: string): Promise<UsageStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  try {
    // Get user count
    const userCount = await db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE company_id = ? AND is_active = 1
    `).bind(companyId).first();

    // Get storage usage (from documents table if exists)
    let storageGb = 0;
    try {
      const storageResult = await db.prepare(`
        SELECT COALESCE(SUM(file_size), 0) as total_bytes FROM documents WHERE company_id = ?
      `).bind(companyId).first();
      storageGb = ((storageResult as any)?.total_bytes || 0) / (1024 * 1024 * 1024);
    } catch {
      // Documents table may not exist
    }

    // Get API calls this month (from audit_logs)
    let apiCalls = 0;
    try {
      const apiResult = await db.prepare(`
        SELECT COUNT(*) as count FROM audit_logs 
        WHERE company_id = ? AND event_type = 'API' AND created_at >= ?
      `).bind(companyId, startOfMonth).first();
      apiCalls = (apiResult as any)?.count || 0;
    } catch {
      // Audit logs may not have this data
    }

    // Get bot runs this month
    let botRuns = 0;
    try {
      const botResult = await db.prepare(`
        SELECT COUNT(*) as count FROM bot_runs 
        WHERE company_id = ? AND started_at >= ?
      `).bind(companyId, startOfMonth).first();
      botRuns = (botResult as any)?.count || 0;
    } catch {
      // Bot runs table may not exist
    }

    // Get documents created this month
    let documents = 0;
    try {
      const docResult = await db.prepare(`
        SELECT COUNT(*) as count FROM documents 
        WHERE company_id = ? AND created_at >= ?
      `).bind(companyId, startOfMonth).first();
      documents = (docResult as any)?.count || 0;
    } catch {
      // Documents table may not exist
    }

    // Get transactions this month (invoices, orders, etc.)
    let transactions = 0;
    try {
      const txResult = await db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM customer_invoices WHERE company_id = ? AND created_at >= ?) +
          (SELECT COUNT(*) FROM supplier_invoices WHERE company_id = ? AND created_at >= ?) +
          (SELECT COUNT(*) FROM sales_orders WHERE company_id = ? AND created_at >= ?) +
          (SELECT COUNT(*) FROM purchase_orders WHERE company_id = ? AND created_at >= ?)
        as count
      `).bind(companyId, startOfMonth, companyId, startOfMonth, companyId, startOfMonth, companyId, startOfMonth).first();
      transactions = (txResult as any)?.count || 0;
    } catch {
      // Tables may not exist
    }

    return {
      users: (userCount as any)?.count || 0,
      storage_gb: storageGb,
      api_calls_monthly: apiCalls,
      bot_runs_monthly: botRuns,
      documents_monthly: documents,
      transactions_monthly: transactions,
    };
  } catch (error) {
    console.error('Error getting company usage:', error);
    return {
      users: 0,
      storage_gb: 0,
      api_calls_monthly: 0,
      bot_runs_monthly: 0,
      documents_monthly: 0,
      transactions_monthly: 0,
    };
  }
}

/**
 * Check if a specific limit allows the action
 */
export async function checkLimit(
  db: D1Database,
  companyId: string,
  limitType: keyof SubscriptionLimits,
  increment: number = 1
): Promise<LimitCheckResult> {
  const limits = await getCompanyLimits(db, companyId);
  if (!limits) {
    return {
      allowed: false,
      limit: 0,
      current: 0,
      remaining: 0,
      message: 'No active subscription found',
    };
  }

  const usage = await getCompanyUsage(db, companyId);
  const limit = limits[limitType];
  const current = usage[limitType];
  const remaining = Math.max(0, limit - current);

  // Check if limit is -1 (unlimited)
  if (limit === -1) {
    return {
      allowed: true,
      limit: -1,
      current,
      remaining: -1,
      message: 'Unlimited',
    };
  }

  const allowed = current + increment <= limit;

  return {
    allowed,
    limit,
    current,
    remaining,
    message: allowed ? undefined : `${limitType} limit reached (${current}/${limit})`,
  };
}

/**
 * Check user limit before adding a new user
 */
export async function checkUserLimit(db: D1Database, companyId: string): Promise<LimitCheckResult> {
  return checkLimit(db, companyId, 'users');
}

/**
 * Check storage limit before uploading a file
 */
export async function checkStorageLimit(db: D1Database, companyId: string, fileSizeBytes: number): Promise<LimitCheckResult> {
  const fileSizeGb = fileSizeBytes / (1024 * 1024 * 1024);
  return checkLimit(db, companyId, 'storage_gb', fileSizeGb);
}

/**
 * Check bot run limit before executing a bot
 */
export async function checkBotRunLimit(db: D1Database, companyId: string): Promise<LimitCheckResult> {
  return checkLimit(db, companyId, 'bot_runs_monthly');
}

/**
 * Check document limit before creating a document
 */
export async function checkDocumentLimit(db: D1Database, companyId: string): Promise<LimitCheckResult> {
  return checkLimit(db, companyId, 'documents_monthly');
}

/**
 * Check transaction limit before creating a transaction
 */
export async function checkTransactionLimit(db: D1Database, companyId: string): Promise<LimitCheckResult> {
  return checkLimit(db, companyId, 'transactions_monthly');
}

/**
 * Get full subscription status for a company
 */
export async function getSubscriptionStatus(db: D1Database, companyId: string): Promise<{
  hasActiveSubscription: boolean;
  planName: string | null;
  status: string | null;
  limits: SubscriptionLimits | null;
  usage: UsageStats;
  expiresAt: string | null;
}> {
  try {
    const subscription = await db.prepare(`
      SELECT s.*, sp.name as plan_name, sp.limits
      FROM subscriptions s
      JOIN subscription_plans sp ON sp.id = s.plan_id
      WHERE s.company_id = ? AND s.status IN ('active', 'trial')
      ORDER BY s.created_at DESC
      LIMIT 1
    `).bind(companyId).first();

    const usage = await getCompanyUsage(db, companyId);

    if (!subscription) {
      return {
        hasActiveSubscription: false,
        planName: null,
        status: null,
        limits: null,
        usage,
        expiresAt: null,
      };
    }

    const limits = JSON.parse((subscription as any).limits || '{}');

    return {
      hasActiveSubscription: true,
      planName: (subscription as any).plan_name,
      status: (subscription as any).status,
      limits: {
        users: limits.users || 1,
        storage_gb: limits.storage_gb || 1,
        api_calls_monthly: limits.api_calls_monthly || 100,
        bot_runs_monthly: limits.bot_runs_monthly || 10,
        documents_monthly: limits.documents_monthly || 50,
        transactions_monthly: limits.transactions_monthly || 100,
      },
      usage,
      expiresAt: (subscription as any).current_period_end,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    const usage = await getCompanyUsage(db, companyId);
    return {
      hasActiveSubscription: false,
      planName: null,
      status: null,
      limits: null,
      usage,
      expiresAt: null,
    };
  }
}

/**
 * Record API call for rate limiting
 */
export async function recordApiCall(db: D1Database, companyId: string, endpoint: string): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO audit_logs (id, company_id, event_type, action, resource_type, details, created_at)
      VALUES (?, ?, 'API', 'CALL', 'api', ?, datetime('now'))
    `).bind(crypto.randomUUID(), companyId, JSON.stringify({ endpoint })).run();
  } catch {
    // Silently fail - don't block the request
  }
}

/**
 * Record bot run for limit tracking
 */
export async function recordBotRun(db: D1Database, companyId: string, botId: string): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO bot_runs (id, company_id, bot_id, started_at, status)
      VALUES (?, ?, ?, datetime('now'), 'started')
    `).bind(crypto.randomUUID(), companyId, botId).run();
  } catch {
    // Silently fail - don't block the request
  }
}
