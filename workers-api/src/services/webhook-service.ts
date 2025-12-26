/**
 * Outbound Webhook Service
 * 
 * Provides webhook delivery for external integrations:
 * - Register webhook endpoints per tenant
 * - Event-based triggers (order created, invoice paid, etc.)
 * - Retry with exponential backoff
 * - HMAC signature verification
 * - Delivery logging and analytics
 */

export interface Webhook {
  id: string;
  company_id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];  // ['order.created', 'invoice.paid', 'payment.received']
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, any>;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempts: number;
  max_attempts: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  created_at: string;
  delivered_at: string | null;
}

export type WebhookEventType = 
  // Order-to-Cash events
  | 'quote.created' | 'quote.approved' | 'quote.rejected' | 'quote.converted'
  | 'sales_order.created' | 'sales_order.confirmed' | 'sales_order.shipped' | 'sales_order.delivered'
  | 'invoice.created' | 'invoice.sent' | 'invoice.paid' | 'invoice.overdue'
  | 'payment.received' | 'payment.failed' | 'payment.refunded'
  // Procure-to-Pay events
  | 'purchase_order.created' | 'purchase_order.approved' | 'purchase_order.received'
  | 'supplier_invoice.received' | 'supplier_invoice.approved' | 'supplier_invoice.paid'
  // Inventory events
  | 'stock.low' | 'stock.out' | 'stock.received' | 'stock.adjusted'
  // Manufacturing events
  | 'work_order.created' | 'work_order.started' | 'work_order.completed'
  | 'quality.passed' | 'quality.failed'
  // HR events
  | 'employee.hired' | 'employee.terminated' | 'leave.requested' | 'leave.approved'
  | 'payroll.processed'
  // Bot events
  | 'bot.started' | 'bot.completed' | 'bot.failed' | 'bot.escalated'
  // System events
  | 'user.created' | 'user.updated' | 'user.deleted'
  | 'company.updated' | 'subscription.changed';

/**
 * Generate HMAC signature for webhook payload
 */
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const hashArray = Array.from(new Uint8Array(signature));
  return 'sha256=' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a secure webhook secret
 */
function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let secret = 'whsec_';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

/**
 * Create a new webhook
 */
export async function createWebhook(
  db: D1Database,
  companyId: string,
  userId: string,
  name: string,
  url: string,
  events: WebhookEventType[]
): Promise<Webhook> {
  const id = crypto.randomUUID();
  const secret = generateWebhookSecret();
  const timestamp = new Date().toISOString();

  await db.prepare(`
    INSERT INTO webhooks (id, company_id, name, url, secret, events, is_active, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).bind(id, companyId, name, url, secret, JSON.stringify(events), userId, timestamp, timestamp).run();

  return {
    id,
    company_id: companyId,
    name,
    url,
    secret,
    events,
    is_active: true,
    created_by: userId,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

/**
 * List webhooks for a company
 */
export async function listWebhooks(
  db: D1Database,
  companyId: string
): Promise<Webhook[]> {
  const result = await db.prepare(`
    SELECT * FROM webhooks WHERE company_id = ? ORDER BY created_at DESC
  `).bind(companyId).all();

  return (result.results || []).map((row: any) => ({
    ...row,
    events: JSON.parse(row.events || '[]'),
    is_active: row.is_active === 1,
  }));
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  db: D1Database,
  companyId: string,
  webhookId: string,
  updates: { name?: string; url?: string; events?: WebhookEventType[]; is_active?: boolean }
): Promise<boolean> {
  const setClauses: string[] = ['updated_at = datetime(\'now\')'];
  const params: any[] = [];

  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    params.push(updates.name);
  }
  if (updates.url !== undefined) {
    setClauses.push('url = ?');
    params.push(updates.url);
  }
  if (updates.events !== undefined) {
    setClauses.push('events = ?');
    params.push(JSON.stringify(updates.events));
  }
  if (updates.is_active !== undefined) {
    setClauses.push('is_active = ?');
    params.push(updates.is_active ? 1 : 0);
  }

  params.push(webhookId, companyId);

  const result = await db.prepare(`
    UPDATE webhooks SET ${setClauses.join(', ')} WHERE id = ? AND company_id = ?
  `).bind(...params).run();

  return (result.meta?.changes || 0) > 0;
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(
  db: D1Database,
  companyId: string,
  webhookId: string
): Promise<boolean> {
  const result = await db.prepare(`
    DELETE FROM webhooks WHERE id = ? AND company_id = ?
  `).bind(webhookId, companyId).run();

  return (result.meta?.changes || 0) > 0;
}

/**
 * Regenerate webhook secret
 */
export async function regenerateSecret(
  db: D1Database,
  companyId: string,
  webhookId: string
): Promise<string | null> {
  const secret = generateWebhookSecret();
  
  const result = await db.prepare(`
    UPDATE webhooks SET secret = ?, updated_at = datetime('now') WHERE id = ? AND company_id = ?
  `).bind(secret, webhookId, companyId).run();

  return (result.meta?.changes || 0) > 0 ? secret : null;
}

/**
 * Queue a webhook delivery
 */
export async function queueWebhookDelivery(
  db: D1Database,
  companyId: string,
  eventType: WebhookEventType,
  payload: Record<string, any>
): Promise<string[]> {
  // Find all active webhooks subscribed to this event
  const webhooks = await db.prepare(`
    SELECT * FROM webhooks WHERE company_id = ? AND is_active = 1
  `).bind(companyId).all();

  const deliveryIds: string[] = [];
  const timestamp = new Date().toISOString();

  for (const webhook of (webhooks.results || []) as any[]) {
    const events = JSON.parse(webhook.events || '[]');
    if (!events.includes(eventType) && !events.includes('*')) continue;

    const deliveryId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO webhook_deliveries (
        id, webhook_id, event_type, payload, status, attempts, max_attempts, created_at
      ) VALUES (?, ?, ?, ?, 'pending', 0, 5, ?)
    `).bind(deliveryId, webhook.id, eventType, JSON.stringify(payload), timestamp).run();

    deliveryIds.push(deliveryId);
  }

  return deliveryIds;
}

/**
 * Deliver a webhook (with retry logic)
 */
export async function deliverWebhook(
  db: D1Database,
  deliveryId: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  // Get delivery and webhook details
  const delivery = await db.prepare(`
    SELECT wd.*, w.url, w.secret FROM webhook_deliveries wd
    JOIN webhooks w ON wd.webhook_id = w.id
    WHERE wd.id = ?
  `).bind(deliveryId).first() as any;

  if (!delivery) {
    return { success: false, error: 'Delivery not found' };
  }

  const payload = JSON.parse(delivery.payload);
  const payloadString = JSON.stringify({
    id: deliveryId,
    event: delivery.event_type,
    created_at: delivery.created_at,
    data: payload,
  });

  const signature = await generateSignature(payloadString, delivery.secret);
  const timestamp = new Date().toISOString();

  try {
    const response = await fetch(delivery.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-Event': delivery.event_type,
        'X-Webhook-Delivery-Id': deliveryId,
      },
      body: payloadString,
    });

    const responseBody = await response.text().catch(() => '');

    if (response.ok) {
      // Success
      await db.prepare(`
        UPDATE webhook_deliveries
        SET status = 'delivered', attempts = attempts + 1, last_attempt_at = ?,
            response_status = ?, response_body = ?, delivered_at = ?
        WHERE id = ?
      `).bind(timestamp, response.status, responseBody.substring(0, 1000), timestamp, deliveryId).run();

      return { success: true, statusCode: response.status };
    } else {
      // Failed - schedule retry
      const attempts = delivery.attempts + 1;
      const nextRetry = attempts < delivery.max_attempts
        ? new Date(Date.now() + Math.pow(2, attempts) * 60 * 1000).toISOString() // Exponential backoff
        : null;

      await db.prepare(`
        UPDATE webhook_deliveries
        SET status = ?, attempts = ?, last_attempt_at = ?, next_retry_at = ?,
            response_status = ?, response_body = ?, error_message = ?
        WHERE id = ?
      `).bind(
        attempts >= delivery.max_attempts ? 'failed' : 'retrying',
        attempts, timestamp, nextRetry, response.status,
        responseBody.substring(0, 1000), `HTTP ${response.status}`, deliveryId
      ).run();

      return { success: false, statusCode: response.status, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    // Network error - schedule retry
    const attempts = delivery.attempts + 1;
    const nextRetry = attempts < delivery.max_attempts
      ? new Date(Date.now() + Math.pow(2, attempts) * 60 * 1000).toISOString()
      : null;

    await db.prepare(`
      UPDATE webhook_deliveries
      SET status = ?, attempts = ?, last_attempt_at = ?, next_retry_at = ?, error_message = ?
      WHERE id = ?
    `).bind(
      attempts >= delivery.max_attempts ? 'failed' : 'retrying',
      attempts, timestamp, nextRetry, String(error), deliveryId
    ).run();

    return { success: false, error: String(error) };
  }
}

/**
 * Process pending webhook deliveries (called by scheduled handler)
 */
export async function processPendingDeliveries(db: D1Database): Promise<{ processed: number; succeeded: number; failed: number }> {
  const pending = await db.prepare(`
    SELECT id FROM webhook_deliveries
    WHERE (status = 'pending' OR (status = 'retrying' AND next_retry_at <= datetime('now')))
    LIMIT 50
  `).all();

  let processed = 0, succeeded = 0, failed = 0;

  for (const delivery of (pending.results || []) as any[]) {
    const result = await deliverWebhook(db, delivery.id);
    processed++;
    if (result.success) succeeded++;
    else failed++;
  }

  return { processed, succeeded, failed };
}

/**
 * Get webhook delivery history
 */
export async function getDeliveryHistory(
  db: D1Database,
  companyId: string,
  webhookId: string | null = null,
  limit: number = 50
): Promise<WebhookDelivery[]> {
  let query = `
    SELECT wd.* FROM webhook_deliveries wd
    JOIN webhooks w ON wd.webhook_id = w.id
    WHERE w.company_id = ?
  `;
  const params: any[] = [companyId];

  if (webhookId) {
    query += ' AND wd.webhook_id = ?';
    params.push(webhookId);
  }

  query += ' ORDER BY wd.created_at DESC LIMIT ?';
  params.push(limit);

  const result = await db.prepare(query).bind(...params).all();

  return (result.results || []).map((row: any) => ({
    ...row,
    payload: JSON.parse(row.payload || '{}'),
  }));
}

/**
 * Get webhook statistics
 */
export async function getWebhookStats(
  db: D1Database,
  companyId: string,
  days: number = 30
): Promise<{
  total_deliveries: number;
  successful: number;
  failed: number;
  pending: number;
  success_rate: number;
  by_event: { event: string; count: number }[];
}> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const statsResult = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN wd.status = 'delivered' THEN 1 ELSE 0 END) as successful,
      SUM(CASE WHEN wd.status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN wd.status IN ('pending', 'retrying') THEN 1 ELSE 0 END) as pending
    FROM webhook_deliveries wd
    JOIN webhooks w ON wd.webhook_id = w.id
    WHERE w.company_id = ? AND wd.created_at >= ?
  `).bind(companyId, startDate).first() as any;

  const byEventResult = await db.prepare(`
    SELECT wd.event_type as event, COUNT(*) as count
    FROM webhook_deliveries wd
    JOIN webhooks w ON wd.webhook_id = w.id
    WHERE w.company_id = ? AND wd.created_at >= ?
    GROUP BY wd.event_type
    ORDER BY count DESC
    LIMIT 10
  `).bind(companyId, startDate).all();

  const total = statsResult?.total || 0;
  const successful = statsResult?.successful || 0;

  return {
    total_deliveries: total,
    successful,
    failed: statsResult?.failed || 0,
    pending: statsResult?.pending || 0,
    success_rate: total > 0 ? Math.round((successful / total) * 100) : 0,
    by_event: (byEventResult.results || []).map((r: any) => ({
      event: r.event,
      count: r.count,
    })),
  };
}

/**
 * Trigger a webhook event
 */
export async function triggerEvent(
  db: D1Database,
  companyId: string,
  eventType: WebhookEventType,
  data: Record<string, any>
): Promise<void> {
  const deliveryIds = await queueWebhookDelivery(db, companyId, eventType, data);
  
  // Attempt immediate delivery for each queued webhook
  for (const deliveryId of deliveryIds) {
    await deliverWebhook(db, deliveryId);
  }
}

export default {
  createWebhook,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
  regenerateSecret,
  queueWebhookDelivery,
  deliverWebhook,
  processPendingDeliveries,
  getDeliveryHistory,
  getWebhookStats,
  triggerEvent,
};
