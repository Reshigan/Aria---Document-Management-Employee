/**
 * Authentication Middleware for ARIA ERP
 * Provides JWT verification and tenant isolation
 */

import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';

export interface TokenPayload {
  sub: string;
  email: string;
  company_id: string | null;
  role: string;
  exp: number;
}

export interface AuthContext {
  user: TokenPayload;
  companyId: string;
}

/**
 * Verify JWT token and extract payload
 */
export async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Authentication middleware - requires valid JWT token
 * Sets c.set('auth', { user, companyId }) for downstream handlers
 */
export function requireAuth() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header required' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token, c.env.JWT_SECRET);

    if (!payload) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    if (!payload.company_id) {
      return c.json({ error: 'User not associated with a company' }, 403);
    }

    // Set auth context for downstream handlers
    c.set('auth', {
      user: payload,
      companyId: payload.company_id,
    } as AuthContext);

    await next();
  };
}

/**
 * Optional authentication middleware - allows unauthenticated requests
 * but sets auth context if token is provided
 */
export function optionalAuth() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await verifyToken(token, c.env.JWT_SECRET);

      if (payload && payload.company_id) {
        c.set('auth', {
          user: payload,
          companyId: payload.company_id,
        } as AuthContext);
      }
    }

    await next();
  };
}

/**
 * Get authenticated company ID from context
 * Throws error if not authenticated
 */
export function getCompanyId(c: Context): string {
  const auth = c.get('auth') as AuthContext | undefined;
  if (!auth || !auth.companyId) {
    throw new Error('Not authenticated');
  }
  return auth.companyId;
}

/**
 * Get authenticated user from context
 * Returns null if not authenticated
 */
export function getAuthUser(c: Context): TokenPayload | null {
  const auth = c.get('auth') as AuthContext | undefined;
  return auth?.user || null;
}

/**
 * Get user ID from context
 * Returns 'system' if not authenticated
 */
export function getUserId(c: Context): string {
  const auth = c.get('auth') as AuthContext | undefined;
  return auth?.user?.sub || 'system';
}

/**
 * SECURE: Get company ID from JWT token
 * This function extracts company_id ONLY from a valid JWT token.
 * Returns null if no valid authentication is present.
 * 
 * IMPORTANT: This is the ONLY secure way to get company_id in multi-tenant routes.
 * Callers MUST check for null and return 401 if not authenticated.
 */
export async function getSecureCompanyId(c: Context): Promise<string | null> {
  // First check if auth context is already set by middleware
  const auth = c.get('auth') as AuthContext | undefined;
  if (auth?.companyId) {
    return auth.companyId;
  }

  // Try to extract from Authorization header
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (payload?.company_id) {
      return payload.company_id;
    }
  }

  // No valid authentication found
  return null;
}

/**
 * SECURE: Get user ID from JWT token
 * Returns null if no valid authentication is present.
 * Callers MUST check for null and return 401 if not authenticated.
 */
/**
 * Subscription check middleware - enforces plan limits and subscription status.
 * Runs after auth. Returns 402 if suspended/cancelled, 403 if module not included,
 * 429 if API call limit exceeded.
 */
export function checkSubscription(requiredModule?: string) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as AuthContext | undefined;
    if (!auth?.companyId) {
      // No auth context - let the route handler deal with it
      return next();
    }

    const db = c.env.DB;
    try {
      // Get subscription
      const subscription = await db.prepare(`
        SELECT s.status, s.plan_id, sp.features, sp.limits
        FROM subscriptions s
        LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
        WHERE s.company_id = ?
        ORDER BY s.created_at DESC LIMIT 1
      `).bind(auth.companyId).first() as { status: string; plan_id: string; features: string; limits: string } | null;

      if (subscription) {
        // Check subscription status
        if (subscription.status === 'suspended' || subscription.status === 'cancelled') {
          return c.json({
            error: 'Subscription inactive',
            message: 'Your subscription is ' + subscription.status + '. Please update your billing to continue.',
            code: 'SUBSCRIPTION_INACTIVE'
          }, 402);
        }

        // Check module access
        if (requiredModule && subscription.features) {
          try {
            const features = JSON.parse(subscription.features);
            const modules: string[] = features.modules || [];
            if (modules.length > 0 && !modules.includes(requiredModule)) {
              return c.json({
                error: 'Feature not available',
                message: `Upgrade your plan to access ${requiredModule}`,
                code: 'MODULE_NOT_INCLUDED'
              }, 403);
            }
          } catch { /* ignore parse errors */ }
        }

        // Check API call limits
        if (subscription.limits) {
          try {
            const limits = JSON.parse(subscription.limits);
            const monthlyLimit = limits.api_calls_monthly;
            if (monthlyLimit && monthlyLimit > 0) {
              const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
              const usage = await db.prepare(
                `SELECT COUNT(*) as cnt FROM audit_logs WHERE company_id = ? AND event_type = 'API' AND created_at >= ?`
              ).bind(auth.companyId, startOfMonth).first() as { cnt: number } | null;
              if (usage && usage.cnt >= monthlyLimit) {
                return c.json({
                  error: 'API limit exceeded',
                  message: `Monthly API call limit (${monthlyLimit}) exceeded. Upgrade your plan for more.`,
                  code: 'API_LIMIT_EXCEEDED'
                }, 429);
              }
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (error) {
      // Don't block requests if subscription check fails
      console.error('Subscription check error:', error);
    }

    return next();
  };
}

export async function getSecureUserId(c: Context): Promise<string | null> {
  const auth = c.get('auth') as AuthContext | undefined;
  if (auth?.user?.sub) {
    return auth.user.sub;
  }

  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (payload?.sub) {
      return payload.sub;
    }
  }

  // No valid authentication found
  return null;
}
