/**
 * API Keys Service
 * 
 * Provides per-tenant API key management for external integrations:
 * - Create, list, revoke API keys
 * - Scope-based permissions (read, write, admin)
 * - Rate limiting per key
 * - Usage tracking and analytics
 * - Key rotation support
 */

export interface ApiKey {
  id: string;
  company_id: string;
  name: string;
  key_prefix: string;  // First 8 chars for identification
  key_hash: string;    // SHA-256 hash of full key
  scopes: string[];    // ['read', 'write', 'admin', 'bots', 'webhooks']
  rate_limit: number;  // Requests per minute
  expires_at: string | null;
  last_used_at: string | null;
  usage_count: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
}

export interface ApiKeyUsage {
  id: string;
  api_key_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  ip_address: string;
  created_at: string;
}

export type ApiKeyScope = 'read' | 'write' | 'admin' | 'bots' | 'webhooks' | 'reports';

/**
 * Generate a secure API key
 */
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'aria_';
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Hash an API key for storage
 */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a new API key
 */
export async function createApiKey(
  db: D1Database,
  companyId: string,
  userId: string,
  name: string,
  scopes: ApiKeyScope[] = ['read'],
  rateLimit: number = 100,
  expiresInDays: number | null = null
): Promise<{ key: string; keyData: Partial<ApiKey> }> {
  const id = crypto.randomUUID();
  const key = generateApiKey();
  const keyPrefix = key.substring(0, 13); // 'aria_' + 8 chars
  const keyHash = await hashApiKey(key);
  const timestamp = new Date().toISOString();
  const expiresAt = expiresInDays 
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  await db.prepare(`
    INSERT INTO api_keys (
      id, company_id, name, key_prefix, key_hash, scopes, rate_limit,
      expires_at, is_active, created_by, created_at, usage_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0)
  `).bind(
    id, companyId, name, keyPrefix, keyHash, JSON.stringify(scopes),
    rateLimit, expiresAt, userId, timestamp
  ).run();

  return {
    key, // Return full key only once - it cannot be retrieved later
    keyData: {
      id,
      company_id: companyId,
      name,
      key_prefix: keyPrefix,
      scopes,
      rate_limit: rateLimit,
      expires_at: expiresAt,
      is_active: true,
      created_by: userId,
      created_at: timestamp,
    }
  };
}

/**
 * Validate an API key and return its data
 */
export async function validateApiKey(
  db: D1Database,
  key: string
): Promise<ApiKey | null> {
  const keyHash = await hashApiKey(key);
  
  const result = await db.prepare(`
    SELECT * FROM api_keys
    WHERE key_hash = ? AND is_active = 1
    AND (expires_at IS NULL OR expires_at > datetime('now'))
  `).bind(keyHash).first();

  if (!result) return null;

  const apiKey = result as any;
  
  // Update last used timestamp and usage count
  await db.prepare(`
    UPDATE api_keys SET last_used_at = datetime('now'), usage_count = usage_count + 1
    WHERE id = ?
  `).bind(apiKey.id).run();

  return {
    ...apiKey,
    scopes: JSON.parse(apiKey.scopes || '[]'),
    is_active: apiKey.is_active === 1,
  };
}

/**
 * Check if API key has required scope
 */
export function hasScope(apiKey: ApiKey, requiredScope: ApiKeyScope): boolean {
  return apiKey.scopes.includes(requiredScope) || apiKey.scopes.includes('admin');
}

/**
 * List API keys for a company
 */
export async function listApiKeys(
  db: D1Database,
  companyId: string
): Promise<Partial<ApiKey>[]> {
  const result = await db.prepare(`
    SELECT id, company_id, name, key_prefix, scopes, rate_limit, expires_at,
           last_used_at, usage_count, is_active, created_by, created_at,
           revoked_at, revoked_by
    FROM api_keys
    WHERE company_id = ?
    ORDER BY created_at DESC
  `).bind(companyId).all();

  return (result.results || []).map((row: any) => ({
    ...row,
    scopes: JSON.parse(row.scopes || '[]'),
    is_active: row.is_active === 1,
  }));
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  db: D1Database,
  companyId: string,
  keyId: string,
  userId: string
): Promise<boolean> {
  const result = await db.prepare(`
    UPDATE api_keys
    SET is_active = 0, revoked_at = datetime('now'), revoked_by = ?
    WHERE id = ? AND company_id = ?
  `).bind(userId, keyId, companyId).run();

  return (result.meta?.changes || 0) > 0;
}

/**
 * Log API key usage
 */
export async function logApiKeyUsage(
  db: D1Database,
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  ipAddress: string
): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO api_key_usage (id, api_key_id, endpoint, method, status_code, response_time_ms, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      crypto.randomUUID(), apiKeyId, endpoint, method, statusCode, responseTimeMs, ipAddress
    ).run();
  } catch (error) {
    console.error('Failed to log API key usage:', error);
  }
}

/**
 * Get API key usage statistics
 */
export async function getApiKeyUsageStats(
  db: D1Database,
  companyId: string,
  keyId: string | null = null,
  days: number = 30
): Promise<{
  total_requests: number;
  avg_response_time: number;
  error_rate: number;
  top_endpoints: { endpoint: string; count: number }[];
  daily_usage: { date: string; count: number }[];
}> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  let whereClause = 'WHERE ak.company_id = ? AND aku.created_at >= ?';
  const params: any[] = [companyId, startDate];
  
  if (keyId) {
    whereClause += ' AND aku.api_key_id = ?';
    params.push(keyId);
  }

  // Total requests and avg response time
  const statsResult = await db.prepare(`
    SELECT 
      COUNT(*) as total_requests,
      AVG(aku.response_time_ms) as avg_response_time,
      SUM(CASE WHEN aku.status_code >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as error_rate
    FROM api_key_usage aku
    JOIN api_keys ak ON aku.api_key_id = ak.id
    ${whereClause}
  `).bind(...params).first();

  // Top endpoints
  const endpointsResult = await db.prepare(`
    SELECT aku.endpoint, COUNT(*) as count
    FROM api_key_usage aku
    JOIN api_keys ak ON aku.api_key_id = ak.id
    ${whereClause}
    GROUP BY aku.endpoint
    ORDER BY count DESC
    LIMIT 10
  `).bind(...params).all();

  // Daily usage
  const dailyResult = await db.prepare(`
    SELECT DATE(aku.created_at) as date, COUNT(*) as count
    FROM api_key_usage aku
    JOIN api_keys ak ON aku.api_key_id = ak.id
    ${whereClause}
    GROUP BY DATE(aku.created_at)
    ORDER BY date DESC
    LIMIT 30
  `).bind(...params).all();

  const stats = statsResult as any;
  return {
    total_requests: stats?.total_requests || 0,
    avg_response_time: Math.round(stats?.avg_response_time || 0),
    error_rate: Math.round((stats?.error_rate || 0) * 100) / 100,
    top_endpoints: (endpointsResult.results || []).map((r: any) => ({
      endpoint: r.endpoint,
      count: r.count,
    })),
    daily_usage: (dailyResult.results || []).map((r: any) => ({
      date: r.date,
      count: r.count,
    })),
  };
}

/**
 * Check rate limit for API key
 */
export async function checkRateLimit(
  db: D1Database,
  apiKeyId: string,
  rateLimit: number
): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const windowStart = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute window
  
  const result = await db.prepare(`
    SELECT COUNT(*) as count FROM api_key_usage
    WHERE api_key_id = ? AND created_at >= ?
  `).bind(apiKeyId, windowStart).first();

  const count = (result as any)?.count || 0;
  const remaining = Math.max(0, rateLimit - count);
  const resetAt = new Date(Date.now() + 60 * 1000).toISOString();

  return {
    allowed: count < rateLimit,
    remaining,
    resetAt,
  };
}

export default {
  createApiKey,
  validateApiKey,
  hasScope,
  listApiKeys,
  revokeApiKey,
  logApiKeyUsage,
  getApiKeyUsageStats,
  checkRateLimit,
};
