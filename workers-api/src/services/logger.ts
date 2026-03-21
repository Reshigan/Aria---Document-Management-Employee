/**
 * Structured Logger Service
 * 
 * Provides consistent, structured logging with correlation IDs,
 * request context, and JSON formatting for Cloudflare Workers logs.
 */

export interface LogContext {
  requestId: string;
  method: string;
  path: string;
  userId?: string | null;
  companyId?: string | null;
}

export interface ErrorLogEntry {
  level: 'error' | 'warn' | 'info';
  requestId: string;
  method: string;
  path: string;
  userId: string | null;
  companyId: string | null;
  error: string;
  stack: string | null;
  timestamp: string;
}

/**
 * Create a request context with a unique requestId
 */
export function createRequestContext(method: string, path: string, userId?: string | null, companyId?: string | null): LogContext {
  return {
    requestId: crypto.randomUUID(),
    method,
    path,
    userId,
    companyId,
  };
}

/**
 * Log a structured error with full request context
 */
export function logError(context: LogContext, error: unknown): ErrorLogEntry {
  const entry: ErrorLogEntry = {
    level: 'error',
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    userId: context.userId || null,
    companyId: context.companyId || null,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack || null : null,
    timestamp: new Date().toISOString(),
  };

  console.error(JSON.stringify(entry));
  return entry;
}

/**
 * Log a structured warning
 */
export function logWarn(context: LogContext, message: string, details?: Record<string, unknown>): void {
  console.warn(JSON.stringify({
    level: 'warn',
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    userId: context.userId || null,
    companyId: context.companyId || null,
    message,
    details: details || null,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Log a structured info message
 */
export function logInfo(context: LogContext, message: string, details?: Record<string, unknown>): void {
  console.log(JSON.stringify({
    level: 'info',
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    userId: context.userId || null,
    companyId: context.companyId || null,
    message,
    details: details || null,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Shared audit log helper for route handlers.
 * Wraps the audit service's logAuditEvent for convenience.
 */
export async function auditLog(
  db: D1Database,
  params: {
    userId: string | null;
    companyId: string;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    details?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO audit_logs (
        id, company_id, user_id, event_type, resource_type, resource_id,
        action, new_values, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, 'DATA', ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      crypto.randomUUID(),
      params.companyId,
      params.userId,
      params.resourceType,
      params.resourceId || null,
      params.action,
      params.details ? JSON.stringify(params.details) : null,
      params.ipAddress || null,
      params.userAgent || null
    ).run();
  } catch (error) {
    // Never let audit logging break business operations
    console.error('Audit log write failed:', error);
  }
}
