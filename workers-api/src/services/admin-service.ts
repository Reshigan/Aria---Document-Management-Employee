// Admin Tooling Service - Impersonation, Support Tickets, System Administration

import { D1Database } from '@cloudflare/workers-types';

interface ImpersonationLog {
  id: string;
  admin_user_id: string;
  target_user_id: string;
  target_company_id: string;
  reason: string;
  started_at: string;
  ended_at?: string;
  actions_performed?: string[];
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface SupportTicket {
  id: string;
  company_id: string;
  user_id?: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: 'bug' | 'feature_request' | 'question' | 'billing' | 'integration' | 'other';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'waiting_internal' | 'resolved' | 'closed';
  assigned_to?: string;
  resolution?: string;
  first_response_at?: string;
  resolved_at?: string;
  closed_at?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  user_type: 'customer' | 'support' | 'system';
  content: string;
  is_internal: boolean;
  attachments?: string[];
  created_at: string;
}

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  value_type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
  is_sensitive: boolean;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

// Start impersonation session
export async function startImpersonation(
  db: D1Database,
  adminUserId: string,
  targetUserId: string,
  targetCompanyId: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<ImpersonationLog> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Verify admin has permission (in production, check admin role)
  // For now, we'll just log the impersonation
  
  await db.prepare(`
    INSERT INTO admin_impersonation_logs (
      id, admin_user_id, target_user_id, target_company_id, reason,
      started_at, ip_address, user_agent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    adminUserId,
    targetUserId,
    targetCompanyId,
    reason,
    now,
    ipAddress || null,
    userAgent || null,
    now
  ).run();
  
  return {
    id,
    admin_user_id: adminUserId,
    target_user_id: targetUserId,
    target_company_id: targetCompanyId,
    reason,
    started_at: now,
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: now
  };
}

// End impersonation session
export async function endImpersonation(
  db: D1Database,
  impersonationId: string,
  actionsPerformed?: string[]
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE admin_impersonation_logs 
    SET ended_at = ?, actions_performed = ?
    WHERE id = ?
  `).bind(
    now,
    actionsPerformed ? JSON.stringify(actionsPerformed) : null,
    impersonationId
  ).run();
}

// Get impersonation logs
export async function getImpersonationLogs(
  db: D1Database,
  options: {
    adminUserId?: string;
    targetCompanyId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
): Promise<ImpersonationLog[]> {
  let query = 'SELECT * FROM admin_impersonation_logs WHERE 1=1';
  const params: (string | number)[] = [];
  
  if (options.adminUserId) {
    query += ' AND admin_user_id = ?';
    params.push(options.adminUserId);
  }
  
  if (options.targetCompanyId) {
    query += ' AND target_company_id = ?';
    params.push(options.targetCompanyId);
  }
  
  if (options.startDate) {
    query += ' AND started_at >= ?';
    params.push(options.startDate);
  }
  
  if (options.endDate) {
    query += ' AND started_at <= ?';
    params.push(options.endDate);
  }
  
  query += ' ORDER BY started_at DESC';
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  const results = await db.prepare(query).bind(...params).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    actions_performed: row.actions_performed ? JSON.parse(row.actions_performed as string) : undefined
  })) as ImpersonationLog[];
}

// Generate ticket number
async function generateTicketNumber(db: D1Database): Promise<string> {
  const today = new Date();
  const prefix = `TKT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const lastTicket = await db.prepare(`
    SELECT ticket_number FROM support_tickets 
    WHERE ticket_number LIKE ? 
    ORDER BY ticket_number DESC LIMIT 1
  `).bind(`${prefix}%`).first<{ ticket_number: string }>();
  
  let sequence = 1;
  if (lastTicket) {
    const lastSequence = parseInt(lastTicket.ticket_number.split('-')[2] || '0');
    sequence = lastSequence + 1;
  }
  
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

// Create support ticket
export async function createSupportTicket(
  db: D1Database,
  input: Omit<SupportTicket, 'id' | 'ticket_number' | 'created_at' | 'updated_at' | 'status'>
): Promise<SupportTicket> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const ticketNumber = await generateTicketNumber(db);
  
  await db.prepare(`
    INSERT INTO support_tickets (
      id, company_id, user_id, ticket_number, subject, description,
      category, priority, status, assigned_to, tags, metadata,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.user_id || null,
    ticketNumber,
    input.subject,
    input.description,
    input.category,
    input.priority || 'normal',
    input.assigned_to || null,
    input.tags ? JSON.stringify(input.tags) : null,
    input.metadata ? JSON.stringify(input.metadata) : null,
    now,
    now
  ).run();
  
  return {
    id,
    ticket_number: ticketNumber,
    ...input,
    status: 'open',
    created_at: now,
    updated_at: now
  };
}

// Get support ticket by ID
export async function getSupportTicket(db: D1Database, ticketId: string): Promise<SupportTicket | null> {
  const result = await db.prepare(`
    SELECT * FROM support_tickets WHERE id = ?
  `).bind(ticketId).first();
  
  if (!result) return null;
  
  return {
    ...result,
    tags: result.tags ? JSON.parse(result.tags as string) : undefined,
    metadata: result.metadata ? JSON.parse(result.metadata as string) : undefined
  } as SupportTicket;
}

// List support tickets
export async function listSupportTickets(
  db: D1Database,
  options: {
    companyId?: string;
    status?: SupportTicket['status'];
    priority?: SupportTicket['priority'];
    assignedTo?: string;
    limit?: number;
  } = {}
): Promise<SupportTicket[]> {
  let query = 'SELECT * FROM support_tickets WHERE 1=1';
  const params: (string | number)[] = [];
  
  if (options.companyId) {
    query += ' AND company_id = ?';
    params.push(options.companyId);
  }
  
  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }
  
  if (options.priority) {
    query += ' AND priority = ?';
    params.push(options.priority);
  }
  
  if (options.assignedTo) {
    query += ' AND assigned_to = ?';
    params.push(options.assignedTo);
  }
  
  query += ' ORDER BY CASE priority WHEN \'urgent\' THEN 1 WHEN \'high\' THEN 2 WHEN \'normal\' THEN 3 ELSE 4 END, created_at DESC';
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  const results = await db.prepare(query).bind(...params).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags as string) : undefined,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
  })) as SupportTicket[];
}

// Update ticket status
export async function updateTicketStatus(
  db: D1Database,
  ticketId: string,
  status: SupportTicket['status'],
  resolution?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  let updateFields = 'status = ?, updated_at = ?';
  const params: (string | null)[] = [status, now];
  
  if (status === 'resolved' && resolution) {
    updateFields += ', resolution = ?, resolved_at = ?';
    params.push(resolution, now);
  }
  
  if (status === 'closed') {
    updateFields += ', closed_at = ?';
    params.push(now);
  }
  
  params.push(ticketId);
  
  await db.prepare(`
    UPDATE support_tickets SET ${updateFields} WHERE id = ?
  `).bind(...params).run();
}

// Assign ticket
export async function assignTicket(
  db: D1Database,
  ticketId: string,
  assignedTo: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE support_tickets 
    SET assigned_to = ?, status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END, updated_at = ?
    WHERE id = ?
  `).bind(assignedTo, now, ticketId).run();
}

// Add ticket comment
export async function addTicketComment(
  db: D1Database,
  input: Omit<TicketComment, 'id' | 'created_at'>
): Promise<TicketComment> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO support_ticket_comments (
      id, ticket_id, user_id, user_type, content, is_internal, attachments, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.ticket_id,
    input.user_id,
    input.user_type,
    input.content,
    input.is_internal ? 1 : 0,
    input.attachments ? JSON.stringify(input.attachments) : null,
    now
  ).run();
  
  // Update ticket's first response time if this is first support response
  if (input.user_type === 'support') {
    await db.prepare(`
      UPDATE support_tickets 
      SET first_response_at = COALESCE(first_response_at, ?), updated_at = ?
      WHERE id = ?
    `).bind(now, now, input.ticket_id).run();
  }
  
  return {
    id,
    ...input,
    created_at: now
  };
}

// Get ticket comments
export async function getTicketComments(
  db: D1Database,
  ticketId: string,
  includeInternal: boolean = false
): Promise<TicketComment[]> {
  let query = 'SELECT * FROM support_ticket_comments WHERE ticket_id = ?';
  
  if (!includeInternal) {
    query += ' AND is_internal = 0';
  }
  
  query += ' ORDER BY created_at ASC';
  
  const results = await db.prepare(query).bind(ticketId).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    is_internal: Boolean(row.is_internal),
    attachments: row.attachments ? JSON.parse(row.attachments as string) : undefined
  })) as TicketComment[];
}

// Get or create system setting
export async function getSystemSetting(
  db: D1Database,
  key: string,
  defaultValue?: string
): Promise<string | null> {
  const result = await db.prepare(`
    SELECT value FROM system_settings WHERE key = ?
  `).bind(key).first<{ value: string }>();
  
  return result?.value ?? defaultValue ?? null;
}

// Set system setting
export async function setSystemSetting(
  db: D1Database,
  key: string,
  value: string,
  options: {
    valueType?: SystemSetting['value_type'];
    category?: string;
    description?: string;
    isSensitive?: boolean;
    updatedBy?: string;
  } = {}
): Promise<void> {
  const now = new Date().toISOString();
  
  // Check if setting exists
  const existing = await db.prepare(`
    SELECT id FROM system_settings WHERE key = ?
  `).bind(key).first();
  
  if (existing) {
    await db.prepare(`
      UPDATE system_settings 
      SET value = ?, updated_by = ?, updated_at = ?
      WHERE key = ?
    `).bind(value, options.updatedBy || null, now, key).run();
  } else {
    const id = crypto.randomUUID();
    
    await db.prepare(`
      INSERT INTO system_settings (
        id, key, value, value_type, category, description, is_sensitive,
        updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      key,
      value,
      options.valueType || 'string',
      options.category || 'general',
      options.description || null,
      options.isSensitive ? 1 : 0,
      options.updatedBy || null,
      now,
      now
    ).run();
  }
}

// Get all system settings by category
export async function getSystemSettings(
  db: D1Database,
  category?: string,
  includeSensitive: boolean = false
): Promise<SystemSetting[]> {
  let query = 'SELECT * FROM system_settings WHERE 1=1';
  const params: string[] = [];
  
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  
  if (!includeSensitive) {
    query += ' AND is_sensitive = 0';
  }
  
  query += ' ORDER BY category, key';
  
  const results = await db.prepare(query).bind(...params).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    is_sensitive: Boolean(row.is_sensitive)
  })) as SystemSetting[];
}

// Get support ticket statistics
export async function getTicketStatistics(
  db: D1Database,
  companyId?: string
): Promise<{
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  avg_resolution_time_hours: number;
  avg_first_response_time_hours: number;
}> {
  let whereClause = '';
  const params: string[] = [];
  
  if (companyId) {
    whereClause = 'WHERE company_id = ?';
    params.push(companyId);
  }
  
  const stats = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved,
      AVG(CASE WHEN resolved_at IS NOT NULL 
        THEN (julianday(resolved_at) - julianday(created_at)) * 24 
        ELSE NULL END) as avg_resolution_time_hours,
      AVG(CASE WHEN first_response_at IS NOT NULL 
        THEN (julianday(first_response_at) - julianday(created_at)) * 24 
        ELSE NULL END) as avg_first_response_time_hours
    FROM support_tickets ${whereClause}
  `).bind(...params).first();
  
  return {
    total: (stats as Record<string, number>)?.total || 0,
    open: (stats as Record<string, number>)?.open || 0,
    in_progress: (stats as Record<string, number>)?.in_progress || 0,
    resolved: (stats as Record<string, number>)?.resolved || 0,
    avg_resolution_time_hours: Math.round(((stats as Record<string, number>)?.avg_resolution_time_hours || 0) * 10) / 10,
    avg_first_response_time_hours: Math.round(((stats as Record<string, number>)?.avg_first_response_time_hours || 0) * 10) / 10
  };
}

// Get company overview for admin
export async function getCompanyOverview(
  db: D1Database,
  companyId: string
): Promise<{
  company: Record<string, unknown>;
  user_count: number;
  invoice_count: number;
  total_revenue: number;
  active_integrations: number;
  recent_activity: Array<Record<string, unknown>>;
}> {
  const company = await db.prepare(`
    SELECT * FROM companies WHERE id = ?
  `).bind(companyId).first();
  
  const userCount = await db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE company_id = ?
  `).bind(companyId).first<{ count: number }>();
  
  const invoiceStats = await db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
    FROM invoices WHERE company_id = ?
  `).bind(companyId).first<{ count: number; total: number }>();
  
  const integrations = await db.prepare(`
    SELECT COUNT(*) as count FROM integration_connectors 
    WHERE company_id = ? AND is_active = 1
  `).bind(companyId).first<{ count: number }>();
  
  const recentActivity = await db.prepare(`
    SELECT * FROM audit_logs 
    WHERE company_id = ? 
    ORDER BY created_at DESC LIMIT 20
  `).bind(companyId).all();
  
  return {
    company: company as Record<string, unknown>,
    user_count: userCount?.count || 0,
    invoice_count: invoiceStats?.count || 0,
    total_revenue: invoiceStats?.total || 0,
    active_integrations: integrations?.count || 0,
    recent_activity: (recentActivity.results || []) as Array<Record<string, unknown>>
  };
}

// Bulk update companies (admin only)
export async function bulkUpdateCompanies(
  db: D1Database,
  companyIds: string[],
  updates: Record<string, unknown>
): Promise<{ updated: number }> {
  const now = new Date().toISOString();
  
  const setClauses: string[] = [];
  const values: unknown[] = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (['status', 'plan', 'settings'].includes(key)) {
      setClauses.push(`${key} = ?`);
      values.push(typeof value === 'object' ? JSON.stringify(value) : value);
    }
  }
  
  if (setClauses.length === 0) {
    return { updated: 0 };
  }
  
  setClauses.push('updated_at = ?');
  values.push(now);
  
  let updated = 0;
  
  for (const companyId of companyIds) {
    await db.prepare(`
      UPDATE companies SET ${setClauses.join(', ')} WHERE id = ?
    `).bind(...values, companyId).run();
    updated++;
  }
  
  return { updated };
}
