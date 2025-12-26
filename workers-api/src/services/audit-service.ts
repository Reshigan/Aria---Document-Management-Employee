/**
 * Comprehensive Audit Logging Service
 * 
 * Provides tamper-evident audit logging for all key events:
 * - Authentication events (login, logout, password changes)
 * - Permission changes (role assignments, permission grants)
 * - Data changes (create, update, delete on business objects)
 * - Approvals and rejections
 * - Document access and downloads
 * - Bot executions
 * - API key usage
 * - Webhook deliveries
 */

export interface AuditEvent {
  id: string;
  company_id: string;
  user_id: string | null;
  event_type: AuditEventType;
  resource_type: string;
  resource_id: string | null;
  action: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  correlation_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export type AuditEventType = 
  | 'AUTH'           // Authentication events
  | 'PERMISSION'     // Permission/role changes
  | 'DATA'           // Data CRUD operations
  | 'APPROVAL'       // Approval workflow events
  | 'DOCUMENT'       // Document access/download
  | 'BOT'            // Bot execution events
  | 'API_KEY'        // API key usage
  | 'WEBHOOK'        // Webhook delivery events
  | 'SYSTEM'         // System events
  | 'SECURITY';      // Security events (failed logins, etc.)

export interface AuditLogOptions {
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  db: D1Database,
  companyId: string,
  userId: string | null,
  eventType: AuditEventType,
  resourceType: string,
  action: string,
  resourceId: string | null = null,
  oldValues: Record<string, any> | null = null,
  newValues: Record<string, any> | null = null,
  options: AuditLogOptions = {}
): Promise<string> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    await db.prepare(`
      INSERT INTO audit_logs (
        id, company_id, user_id, event_type, resource_type, resource_id,
        action, old_values, new_values, ip_address, user_agent,
        correlation_id, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      companyId,
      userId,
      eventType,
      resourceType,
      resourceId,
      action,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      options.ipAddress || null,
      options.userAgent || null,
      options.correlationId || null,
      options.metadata ? JSON.stringify(options.metadata) : null,
      timestamp
    ).run();

    return id;
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break business operations
    return id;
  }
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  db: D1Database,
  companyId: string,
  userId: string,
  action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE' | 'PASSWORD_RESET' | 'MFA_ENABLED' | 'MFA_DISABLED' | 'SESSION_EXPIRED',
  options: AuditLogOptions = {}
): Promise<string> {
  return logAuditEvent(db, companyId, userId, 'AUTH', 'user', action, userId, null, null, options);
}

/**
 * Log permission change event
 */
export async function logPermissionEvent(
  db: D1Database,
  companyId: string,
  userId: string,
  targetUserId: string,
  action: 'ROLE_ASSIGNED' | 'ROLE_REMOVED' | 'PERMISSION_GRANTED' | 'PERMISSION_REVOKED',
  roleOrPermission: string,
  options: AuditLogOptions = {}
): Promise<string> {
  return logAuditEvent(
    db, companyId, userId, 'PERMISSION', 'user_role', action, targetUserId,
    null, { role_or_permission: roleOrPermission }, options
  );
}

/**
 * Log data change event
 */
export async function logDataEvent(
  db: D1Database,
  companyId: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'RESTORE',
  oldValues: Record<string, any> | null = null,
  newValues: Record<string, any> | null = null,
  options: AuditLogOptions = {}
): Promise<string> {
  return logAuditEvent(db, companyId, userId, 'DATA', resourceType, action, resourceId, oldValues, newValues, options);
}

/**
 * Log approval event
 */
export async function logApprovalEvent(
  db: D1Database,
  companyId: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'RECALLED',
  comments: string | null = null,
  options: AuditLogOptions = {}
): Promise<string> {
  return logAuditEvent(
    db, companyId, userId, 'APPROVAL', resourceType, action, resourceId,
    null, { comments }, options
  );
}

/**
 * Log document access event
 */
export async function logDocumentEvent(
  db: D1Database,
  companyId: string,
  userId: string,
  documentId: string,
  action: 'VIEW' | 'DOWNLOAD' | 'PRINT' | 'SHARE' | 'DELETE',
  options: AuditLogOptions = {}
): Promise<string> {
  return logAuditEvent(db, companyId, userId, 'DOCUMENT', 'document', action, documentId, null, null, options);
}

/**
 * Log bot execution event
 */
export async function logBotEvent(
  db: D1Database,
  companyId: string,
  botId: string,
  runId: string,
  action: 'STARTED' | 'COMPLETED' | 'FAILED' | 'PAUSED' | 'RESUMED',
  details: Record<string, any> | null = null,
  options: AuditLogOptions = {}
): Promise<string> {
  return logAuditEvent(
    db, companyId, null, 'BOT', 'bot', action, botId,
    null, { run_id: runId, ...details },
    { ...options, correlationId: runId }
  );
}

/**
 * Log API key usage event
 */
export async function logApiKeyEvent(
  db: D1Database,
  companyId: string,
  apiKeyId: string,
  action: 'CREATED' | 'USED' | 'REVOKED' | 'EXPIRED',
  endpoint: string | null = null,
  options: AuditLogOptions = {}
): Promise<string> {
  return logAuditEvent(
    db, companyId, null, 'API_KEY', 'api_key', action, apiKeyId,
    null, { endpoint }, options
  );
}

/**
 * Log webhook delivery event
 */
export async function logWebhookEvent(
  db: D1Database,
  companyId: string,
  webhookId: string,
  deliveryId: string,
  action: 'DELIVERED' | 'FAILED' | 'RETRYING',
  statusCode: number | null = null,
  options: AuditLogOptions = {}
): Promise<string> {
  return logAuditEvent(
    db, companyId, null, 'WEBHOOK', 'webhook', action, webhookId,
    null, { delivery_id: deliveryId, status_code: statusCode },
    { ...options, correlationId: deliveryId }
  );
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  db: D1Database,
  companyId: string,
  userId: string | null,
  action: 'SUSPICIOUS_LOGIN' | 'BRUTE_FORCE_DETECTED' | 'UNAUTHORIZED_ACCESS' | 'DATA_EXPORT' | 'BULK_DELETE',
  details: Record<string, any> | null = null,
  options: AuditLogOptions = {}
): Promise<string> {
  return logAuditEvent(db, companyId, userId, 'SECURITY', 'security', action, null, null, details, options);
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(
  db: D1Database,
  companyId: string,
  filters: {
    eventType?: AuditEventType;
    resourceType?: string;
    resourceId?: string;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    correlationId?: string;
  } = {},
  pagination: { page: number; pageSize: number } = { page: 1, pageSize: 50 }
): Promise<{ logs: AuditEvent[]; total: number; page: number; pageSize: number }> {
  let whereClause = 'WHERE company_id = ?';
  const params: any[] = [companyId];

  if (filters.eventType) {
    whereClause += ' AND event_type = ?';
    params.push(filters.eventType);
  }
  if (filters.resourceType) {
    whereClause += ' AND resource_type = ?';
    params.push(filters.resourceType);
  }
  if (filters.resourceId) {
    whereClause += ' AND resource_id = ?';
    params.push(filters.resourceId);
  }
  if (filters.userId) {
    whereClause += ' AND user_id = ?';
    params.push(filters.userId);
  }
  if (filters.action) {
    whereClause += ' AND action = ?';
    params.push(filters.action);
  }
  if (filters.startDate) {
    whereClause += ' AND created_at >= ?';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    whereClause += ' AND created_at <= ?';
    params.push(filters.endDate);
  }
  if (filters.correlationId) {
    whereClause += ' AND correlation_id = ?';
    params.push(filters.correlationId);
  }

  // Get total count
  const countResult = await db.prepare(`SELECT COUNT(*) as count FROM audit_logs ${whereClause}`).bind(...params).first();
  const total = (countResult as any)?.count || 0;

  // Get paginated results
  const offset = (pagination.page - 1) * pagination.pageSize;
  const logsResult = await db.prepare(`
    SELECT * FROM audit_logs ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...params, pagination.pageSize, offset).all();

  const logs = (logsResult.results || []).map((row: any) => ({
    ...row,
    old_values: row.old_values ? JSON.parse(row.old_values) : null,
    new_values: row.new_values ? JSON.parse(row.new_values) : null,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  }));

  return { logs, total, page: pagination.page, pageSize: pagination.pageSize };
}

/**
 * Get audit trail for a specific resource
 */
export async function getResourceAuditTrail(
  db: D1Database,
  companyId: string,
  resourceType: string,
  resourceId: string
): Promise<AuditEvent[]> {
  const result = await db.prepare(`
    SELECT * FROM audit_logs
    WHERE company_id = ? AND resource_type = ? AND resource_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).bind(companyId, resourceType, resourceId).all();

  return (result.results || []).map((row: any) => ({
    ...row,
    old_values: row.old_values ? JSON.parse(row.old_values) : null,
    new_values: row.new_values ? JSON.parse(row.new_values) : null,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  }));
}

export default {
  logAuditEvent,
  logAuthEvent,
  logPermissionEvent,
  logDataEvent,
  logApprovalEvent,
  logDocumentEvent,
  logBotEvent,
  logApiKeyEvent,
  logWebhookEvent,
  logSecurityEvent,
  queryAuditLogs,
  getResourceAuditTrail,
};
