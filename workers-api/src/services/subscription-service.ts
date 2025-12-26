/**
 * Subscription & Usage Metering Service
 * 
 * Provides SaaS subscription management:
 * - Plan management (features, limits, pricing)
 * - Usage metering (API calls, storage, users, bots)
 * - Entitlement enforcement
 * - Billing integration
 * - Tenant lifecycle (suspend, cancel, data export)
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: PlanFeatures;
  limits: PlanLimits;
  is_active: boolean;
  sort_order: number;
}

export interface PlanFeatures {
  modules: string[];  // ['o2c', 'p2p', 'manufacturing', 'hr', 'bi']
  bots_enabled: boolean;
  api_access: boolean;
  webhooks: boolean;
  custom_reports: boolean;
  multi_currency: boolean;
  multi_warehouse: boolean;
  audit_logs: boolean;
  sso: boolean;
  priority_support: boolean;
}

export interface PlanLimits {
  users: number;           // Max users (-1 = unlimited)
  storage_gb: number;      // Max storage in GB
  api_calls_monthly: number;  // Max API calls per month
  bot_runs_monthly: number;   // Max bot executions per month
  documents_monthly: number;  // Max documents processed per month
  transactions_monthly: number; // Max transactions per month
}

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  status: 'active' | 'trial' | 'past_due' | 'suspended' | 'cancelled';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageRecord {
  id: string;
  company_id: string;
  metric: UsageMetric;
  value: number;
  period_start: string;
  period_end: string;
  recorded_at: string;
}

export type UsageMetric = 
  | 'api_calls' | 'storage_bytes' | 'users' | 'bot_runs' 
  | 'documents' | 'transactions' | 'webhooks' | 'reports';

// Default plans
const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_starter',
    name: 'Starter',
    code: 'starter',
    description: 'Perfect for small businesses getting started',
    price_monthly: 49,
    price_yearly: 490,
    currency: 'USD',
    features: {
      modules: ['o2c', 'p2p'],
      bots_enabled: false,
      api_access: false,
      webhooks: false,
      custom_reports: false,
      multi_currency: false,
      multi_warehouse: false,
      audit_logs: false,
      sso: false,
      priority_support: false,
    },
    limits: {
      users: 3,
      storage_gb: 5,
      api_calls_monthly: 0,
      bot_runs_monthly: 0,
      documents_monthly: 100,
      transactions_monthly: 500,
    },
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'plan_professional',
    name: 'Professional',
    code: 'professional',
    description: 'For growing businesses with automation needs',
    price_monthly: 149,
    price_yearly: 1490,
    currency: 'USD',
    features: {
      modules: ['o2c', 'p2p', 'inventory', 'hr'],
      bots_enabled: true,
      api_access: true,
      webhooks: true,
      custom_reports: true,
      multi_currency: false,
      multi_warehouse: false,
      audit_logs: true,
      sso: false,
      priority_support: false,
    },
    limits: {
      users: 10,
      storage_gb: 25,
      api_calls_monthly: 10000,
      bot_runs_monthly: 1000,
      documents_monthly: 500,
      transactions_monthly: 2500,
    },
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    code: 'enterprise',
    description: 'Full-featured ERP for larger organizations',
    price_monthly: 499,
    price_yearly: 4990,
    currency: 'USD',
    features: {
      modules: ['o2c', 'p2p', 'inventory', 'hr', 'manufacturing', 'bi', 'governance'],
      bots_enabled: true,
      api_access: true,
      webhooks: true,
      custom_reports: true,
      multi_currency: true,
      multi_warehouse: true,
      audit_logs: true,
      sso: true,
      priority_support: true,
    },
    limits: {
      users: -1,  // Unlimited
      storage_gb: 100,
      api_calls_monthly: 100000,
      bot_runs_monthly: 10000,
      documents_monthly: 5000,
      transactions_monthly: -1,  // Unlimited
    },
    is_active: true,
    sort_order: 3,
  },
];

/**
 * Get all available plans
 */
export async function getPlans(db: D1Database): Promise<SubscriptionPlan[]> {
  const result = await db.prepare(`
    SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order ASC
  `).all();

  if (!result.results?.length) {
    // Return default plans if none in database
    return DEFAULT_PLANS;
  }

  return (result.results || []).map((row: any) => ({
    ...row,
    features: JSON.parse(row.features || '{}'),
    limits: JSON.parse(row.limits || '{}'),
    is_active: row.is_active === 1,
  }));
}

/**
 * Get a company's subscription
 */
export async function getSubscription(
  db: D1Database,
  companyId: string
): Promise<Subscription | null> {
  const result = await db.prepare(`
    SELECT * FROM subscriptions WHERE company_id = ?
  `).bind(companyId).first();

  if (!result) return null;

  return result as unknown as Subscription;
}

/**
 * Create a subscription for a company
 */
export async function createSubscription(
  db: D1Database,
  companyId: string,
  planId: string,
  billingCycle: 'monthly' | 'yearly' = 'monthly',
  trialDays: number = 14
): Promise<Subscription> {
  const id = crypto.randomUUID();
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'yearly' ? 12 : 1));
  
  const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;

  await db.prepare(`
    INSERT INTO subscriptions (
      id, company_id, plan_id, status, billing_cycle,
      current_period_start, current_period_end, trial_ends_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, companyId, planId, trialDays > 0 ? 'trial' : 'active', billingCycle,
    now.toISOString(), periodEnd.toISOString(),
    trialEnd?.toISOString() || null, now.toISOString(), now.toISOString()
  ).run();

  return {
    id,
    company_id: companyId,
    plan_id: planId,
    status: trialDays > 0 ? 'trial' : 'active',
    billing_cycle: billingCycle,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    trial_ends_at: trialEnd?.toISOString() || null,
    cancelled_at: null,
    stripe_subscription_id: null,
    stripe_customer_id: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

/**
 * Update subscription status
 */
export async function updateSubscriptionStatus(
  db: D1Database,
  companyId: string,
  status: Subscription['status']
): Promise<boolean> {
  const result = await db.prepare(`
    UPDATE subscriptions SET status = ?, updated_at = datetime('now')
    WHERE company_id = ?
  `).bind(status, companyId).run();

  return (result.meta?.changes || 0) > 0;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  db: D1Database,
  companyId: string,
  immediate: boolean = false
): Promise<boolean> {
  const status = immediate ? 'cancelled' : 'active'; // If not immediate, stays active until period end
  
  const result = await db.prepare(`
    UPDATE subscriptions 
    SET status = ?, cancelled_at = datetime('now'), updated_at = datetime('now')
    WHERE company_id = ?
  `).bind(status, companyId).run();

  return (result.meta?.changes || 0) > 0;
}

/**
 * Record usage for a metric
 */
export async function recordUsage(
  db: D1Database,
  companyId: string,
  metric: UsageMetric,
  value: number = 1
): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  try {
    // Try to update existing record for this period
    const result = await db.prepare(`
      UPDATE usage_records 
      SET value = value + ?, recorded_at = datetime('now')
      WHERE company_id = ? AND metric = ? AND period_start = ?
    `).bind(value, companyId, metric, periodStart.toISOString()).run();

    if ((result.meta?.changes || 0) === 0) {
      // Create new record
      await db.prepare(`
        INSERT INTO usage_records (id, company_id, metric, value, period_start, period_end, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        crypto.randomUUID(), companyId, metric, value,
        periodStart.toISOString(), periodEnd.toISOString()
      ).run();
    }
  } catch (error) {
    console.error('Failed to record usage:', error);
  }
}

/**
 * Get current usage for a company
 */
export async function getCurrentUsage(
  db: D1Database,
  companyId: string
): Promise<Record<UsageMetric, number>> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const result = await db.prepare(`
    SELECT metric, value FROM usage_records
    WHERE company_id = ? AND period_start = ?
  `).bind(companyId, periodStart.toISOString()).all();

  const usage: Record<string, number> = {
    api_calls: 0,
    storage_bytes: 0,
    users: 0,
    bot_runs: 0,
    documents: 0,
    transactions: 0,
    webhooks: 0,
    reports: 0,
  };

  for (const row of (result.results || []) as any[]) {
    usage[row.metric] = row.value;
  }

  // Get current user count
  const userCount = await db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE company_id = ? AND is_active = 1
  `).bind(companyId).first();
  usage.users = (userCount as any)?.count || 0;

  return usage as Record<UsageMetric, number>;
}

/**
 * Check if a feature is enabled for a company
 */
export async function hasFeature(
  db: D1Database,
  companyId: string,
  feature: keyof PlanFeatures
): Promise<boolean> {
  const subscription = await getSubscription(db, companyId);
  if (!subscription || subscription.status === 'cancelled' || subscription.status === 'suspended') {
    return false;
  }

  const plans = await getPlans(db);
  const plan = plans.find(p => p.id === subscription.plan_id);
  if (!plan) return false;

  const featureValue = plan.features[feature];
  if (typeof featureValue === 'boolean') return featureValue;
  if (Array.isArray(featureValue)) return featureValue.length > 0;
  return false;
}

/**
 * Check if usage is within limits
 */
export async function checkLimit(
  db: D1Database,
  companyId: string,
  metric: keyof PlanLimits
): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
  const subscription = await getSubscription(db, companyId);
  if (!subscription || subscription.status === 'cancelled' || subscription.status === 'suspended') {
    return { allowed: false, current: 0, limit: 0, remaining: 0 };
  }

  const plans = await getPlans(db);
  const plan = plans.find(p => p.id === subscription.plan_id);
  if (!plan) {
    return { allowed: false, current: 0, limit: 0, remaining: 0 };
  }

  const limit = plan.limits[metric];
  if (limit === -1) {
    // Unlimited
    return { allowed: true, current: 0, limit: -1, remaining: -1 };
  }

  const usage = await getCurrentUsage(db, companyId);
  const metricMap: Record<keyof PlanLimits, UsageMetric> = {
    users: 'users',
    storage_gb: 'storage_bytes',
    api_calls_monthly: 'api_calls',
    bot_runs_monthly: 'bot_runs',
    documents_monthly: 'documents',
    transactions_monthly: 'transactions',
  };

  const usageMetric = metricMap[metric];
  let current = usage[usageMetric] || 0;

  // Convert storage from bytes to GB for comparison
  if (metric === 'storage_gb') {
    current = current / (1024 * 1024 * 1024);
  }

  const remaining = Math.max(0, limit - current);
  return {
    allowed: current < limit,
    current: Math.round(current * 100) / 100,
    limit,
    remaining: Math.round(remaining * 100) / 100,
  };
}

/**
 * Enforce entitlement (throws if not allowed)
 */
export async function enforceEntitlement(
  db: D1Database,
  companyId: string,
  feature?: keyof PlanFeatures,
  limit?: keyof PlanLimits
): Promise<void> {
  if (feature) {
    const hasAccess = await hasFeature(db, companyId, feature);
    if (!hasAccess) {
      throw new Error(`Feature '${feature}' is not available on your current plan. Please upgrade.`);
    }
  }

  if (limit) {
    const check = await checkLimit(db, companyId, limit);
    if (!check.allowed) {
      throw new Error(`You have reached your ${limit} limit (${check.current}/${check.limit}). Please upgrade.`);
    }
  }
}

/**
 * Get usage history for a company
 */
export async function getUsageHistory(
  db: D1Database,
  companyId: string,
  months: number = 6
): Promise<{ period: string; usage: Record<UsageMetric, number> }[]> {
  const result = await db.prepare(`
    SELECT metric, value, period_start FROM usage_records
    WHERE company_id = ? AND period_start >= date('now', '-' || ? || ' months')
    ORDER BY period_start DESC
  `).bind(companyId, months).all();

  const history: Record<string, Record<string, number>> = {};

  for (const row of (result.results || []) as any[]) {
    const period = row.period_start.substring(0, 7); // YYYY-MM
    if (!history[period]) {
      history[period] = {};
    }
    history[period][row.metric] = row.value;
  }

  return Object.entries(history).map(([period, usage]) => ({
    period,
    usage: usage as Record<UsageMetric, number>,
  }));
}

/**
 * Export company data (for GDPR compliance)
 */
export async function exportCompanyData(
  db: D1Database,
  companyId: string
): Promise<Record<string, any[]>> {
  const tables = [
    'companies', 'users', 'customers', 'suppliers', 'products',
    'quotes', 'sales_orders', 'purchase_orders', 'customer_invoices',
    'supplier_invoices', 'gl_entries', 'audit_logs'
  ];

  const data: Record<string, any[]> = {};

  for (const table of tables) {
    try {
      const result = await db.prepare(`
        SELECT * FROM ${table} WHERE company_id = ?
      `).bind(companyId).all();
      data[table] = result.results || [];
    } catch (error) {
      // Table might not exist or have company_id column
      data[table] = [];
    }
  }

  return data;
}

/**
 * Delete company data (for GDPR compliance)
 */
export async function deleteCompanyData(
  db: D1Database,
  companyId: string
): Promise<{ tables_cleared: string[]; errors: string[] }> {
  const tables = [
    'audit_logs', 'usage_records', 'webhook_deliveries', 'webhooks',
    'api_key_usage', 'api_keys', 'bot_runs', 'gl_entries',
    'invoice_items', 'customer_invoices', 'supplier_invoices',
    'purchase_order_items', 'purchase_orders', 'sales_order_items',
    'sales_orders', 'quote_items', 'quotes', 'products',
    'suppliers', 'customers', 'employees', 'user_sessions',
    'user_roles', 'users', 'subscriptions', 'companies'
  ];

  const cleared: string[] = [];
  const errors: string[] = [];

  for (const table of tables) {
    try {
      await db.prepare(`DELETE FROM ${table} WHERE company_id = ?`).bind(companyId).run();
      cleared.push(table);
    } catch (error) {
      errors.push(`${table}: ${String(error)}`);
    }
  }

  return { tables_cleared: cleared, errors };
}

export default {
  getPlans,
  getSubscription,
  createSubscription,
  updateSubscriptionStatus,
  cancelSubscription,
  recordUsage,
  getCurrentUsage,
  hasFeature,
  checkLimit,
  enforceEntitlement,
  getUsageHistory,
  exportCompanyData,
  deleteCompanyData,
};
