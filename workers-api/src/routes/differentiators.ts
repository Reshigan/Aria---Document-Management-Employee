import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';
import { jwtVerify } from 'jose';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const differentiators = new Hono<{ Bindings: Env }>();

// Helper to verify JWT and get context
async function getAuthContext(c: any): Promise<{ company_id: string; user_id: string } | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const token = authHeader.substring(7);
    const secretKey = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return {
      company_id: (payload as any).company_id,
      user_id: (payload as any).sub
    };
  } catch {
    return null;
  }
}

function generateUUID(): string {
  return crypto.randomUUID();
}

// ==================== WHATSAPP WORKFLOWS ====================

// WhatsApp webhook verification (for WhatsApp Business API / Twilio)
differentiators.get('/whatsapp/webhook', async (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');
  
  // Verify token should be configured in environment
  const verifyToken = 'aria-whatsapp-verify-token';
  
  if (mode === 'subscribe' && token === verifyToken) {
    return c.text(challenge || '', 200);
  }
  
  return c.json({ error: 'Verification failed' }, 403);
});

// WhatsApp webhook to receive messages
differentiators.post('/whatsapp/webhook', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const db = c.env.DB;
    
    // Parse WhatsApp message format (Meta/Twilio format)
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;
    
    if (!messages || messages.length === 0) {
      // Status update or other non-message event
      return c.json({ status: 'acknowledged' });
    }
    
    const message = messages[0];
    const from = message.from; // Phone number
    const text = message.text?.body || '';
    const messageId = message.id;
    
    // Log incoming message
    await db.prepare(`
      INSERT INTO whatsapp_messages (id, phone_number, direction, message_text, message_id, status, created_at)
      VALUES (?, ?, 'inbound', ?, ?, 'received', datetime('now'))
    `).bind(generateUUID(), from, text, messageId).run().catch(() => {});
    
    // Parse command from message
    const command = parseWhatsAppCommand(text);
    
    // Execute command and get response
    const response = await executeWhatsAppCommand(db, from, command);
    
    return c.json({
      status: 'processed',
      command: command.action,
      response: response.message
    });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return c.json({ status: 'error', message: 'Failed to process message' }, 500);
  }
});

// Parse WhatsApp command from text
function parseWhatsAppCommand(text: string): { action: string; params: Record<string, string> } {
  const lowerText = text.toLowerCase().trim();
  
  // Stock check: "stock [product]" or "check stock [product]"
  if (lowerText.startsWith('stock ') || lowerText.startsWith('check stock ')) {
    const product = text.replace(/^(check )?stock /i, '').trim();
    return { action: 'check_stock', params: { product } };
  }
  
  // Order status: "order [number]" or "status [number]"
  if (lowerText.startsWith('order ') || lowerText.startsWith('status ')) {
    const orderNumber = text.replace(/^(order|status) /i, '').trim();
    return { action: 'order_status', params: { order_number: orderNumber } };
  }
  
  // Balance: "balance" or "my balance"
  if (lowerText === 'balance' || lowerText === 'my balance' || lowerText === 'account balance') {
    return { action: 'account_balance', params: {} };
  }
  
  // Approve: "approve [document]"
  if (lowerText.startsWith('approve ')) {
    const document = text.replace(/^approve /i, '').trim();
    return { action: 'approve', params: { document } };
  }
  
  // Reject: "reject [document]"
  if (lowerText.startsWith('reject ')) {
    const document = text.replace(/^reject /i, '').trim();
    return { action: 'reject', params: { document } };
  }
  
  // Invoice: "invoice [customer]"
  if (lowerText.startsWith('invoice ')) {
    const customer = text.replace(/^invoice /i, '').trim();
    return { action: 'create_invoice', params: { customer } };
  }
  
  // Quote: "quote [customer]"
  if (lowerText.startsWith('quote ')) {
    const customer = text.replace(/^quote /i, '').trim();
    return { action: 'create_quote', params: { customer } };
  }
  
  // Help
  if (lowerText === 'help' || lowerText === '?' || lowerText === 'commands') {
    return { action: 'help', params: {} };
  }
  
  // Dashboard/summary
  if (lowerText === 'dashboard' || lowerText === 'summary' || lowerText === 'today') {
    return { action: 'dashboard', params: {} };
  }
  
  // Pending approvals
  if (lowerText === 'pending' || lowerText === 'approvals' || lowerText === 'pending approvals') {
    return { action: 'pending_approvals', params: {} };
  }
  
  // Unknown command
  return { action: 'unknown', params: { original: text } };
}

// Execute WhatsApp command
async function executeWhatsAppCommand(
  db: D1Database,
  phoneNumber: string,
  command: { action: string; params: Record<string, string> }
): Promise<{ message: string; data?: any }> {
  
  // Look up user by phone number
  const user = await db.prepare(`
    SELECT u.id, u.company_id, u.full_name 
    FROM users u 
    WHERE u.phone = ? OR u.phone = ?
  `).bind(phoneNumber, '+' + phoneNumber).first().catch(() => null);
  
  const companyId = user?.company_id;
  if (!companyId) {
    return { message: 'Unable to determine company. Please register your phone number.' };
  }
  
  switch (command.action) {
    case 'help':
      return {
        message: `*ARIA ERP Commands*\n\n` +
          `*Stock:* stock [product name]\n` +
          `*Order Status:* order [number]\n` +
          `*Balance:* balance\n` +
          `*Approve:* approve [PO/INV number]\n` +
          `*Reject:* reject [PO/INV number]\n` +
          `*Dashboard:* dashboard\n` +
          `*Pending:* pending approvals\n\n` +
          `Reply with any command to get started!`
      };
      
    case 'check_stock': {
      const productName = command.params.product;
      const products = await db.prepare(`
        SELECT name, sku, quantity_on_hand, reorder_level
        FROM products
        WHERE company_id = ? AND (name LIKE ? OR sku LIKE ?)
        LIMIT 5
      `).bind(companyId, `%${productName}%`, `%${productName}%`).all().catch(() => ({ results: [] }));
      
      if (products.results.length === 0) {
        return { message: `No products found matching "${productName}"` };
      }
      
      const stockList = products.results.map((p: any) => 
        `*${p.name}* (${p.sku})\nStock: ${p.quantity_on_hand} | Reorder: ${p.reorder_level}`
      ).join('\n\n');
      
      return { message: `*Stock Levels*\n\n${stockList}`, data: products.results };
    }
    
    case 'order_status': {
      const orderNumber = command.params.order_number;
      const order = await db.prepare(`
        SELECT so.order_number, so.status, so.total_amount, so.order_date, c.name as customer_name
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        WHERE so.company_id = ? AND so.order_number LIKE ?
        LIMIT 1
      `).bind(companyId, `%${orderNumber}%`).first().catch(() => null);
      
      if (!order) {
        return { message: `Order "${orderNumber}" not found` };
      }
      
      return {
        message: `*Order ${order.order_number}*\n\n` +
          `Customer: ${order.customer_name}\n` +
          `Status: ${order.status}\n` +
          `Amount: R${order.total_amount?.toLocaleString()}\n` +
          `Date: ${order.order_date}`,
        data: order
      };
    }
    
    case 'account_balance': {
      // Get AR balance for the user's linked customer
      const balance = await db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'invoice' THEN amount ELSE 0 END) as total_invoiced,
          SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END) as total_paid
        FROM ar_invoices
        WHERE company_id = ?
      `).bind(companyId).first().catch(() => ({ total_invoiced: 0, total_paid: 0 }));
      
      const totalInvoiced = Number(balance?.total_invoiced) || 0;
      const totalPaid = Number(balance?.total_paid) || 0;
      const outstanding = totalInvoiced - totalPaid;
      
      return {
        message: `*Account Balance*\n\n` +
          `Total Invoiced: R${(balance?.total_invoiced || 0).toLocaleString()}\n` +
          `Total Paid: R${(balance?.total_paid || 0).toLocaleString()}\n` +
          `Outstanding: R${outstanding.toLocaleString()}`,
        data: balance
      };
    }
    
    case 'dashboard': {
      const today = new Date().toISOString().split('T')[0];
      
      const stats = await Promise.all([
        db.prepare(`SELECT COUNT(*) as count FROM sales_orders WHERE company_id = ? AND date(order_date) = ?`).bind(companyId, today).first(),
        db.prepare(`SELECT SUM(total_amount) as total FROM sales_orders WHERE company_id = ? AND date(order_date) = ?`).bind(companyId, today).first(),
        db.prepare(`SELECT COUNT(*) as count FROM purchase_orders WHERE company_id = ? AND status = 'pending'`).bind(companyId).first(),
        db.prepare(`SELECT COUNT(*) as count FROM ar_invoices WHERE company_id = ? AND status = 'overdue'`).bind(companyId).first()
      ]).catch(() => [{ count: 0 }, { total: 0 }, { count: 0 }, { count: 0 }]);
      
      return {
        message: `*Today's Dashboard*\n\n` +
          `Orders Today: ${stats[0]?.count || 0}\n` +
          `Sales Today: R${(stats[1]?.total || 0).toLocaleString()}\n` +
          `Pending POs: ${stats[2]?.count || 0}\n` +
          `Overdue Invoices: ${stats[3]?.count || 0}`,
        data: stats
      };
    }
    
    case 'pending_approvals': {
      const pending = await db.prepare(`
        SELECT document_type, document_id, amount, submitted_at
        FROM approval_workflows
        WHERE company_id = ? AND status = 'pending'
        ORDER BY submitted_at DESC
        LIMIT 5
      `).bind(companyId).all().catch(() => ({ results: [] }));
      
      if (pending.results.length === 0) {
        return { message: `No pending approvals` };
      }
      
      const list = pending.results.map((p: any, i: number) => 
        `${i + 1}. ${p.document_type} ${p.document_id}\n   Amount: R${p.amount?.toLocaleString() || 'N/A'}`
      ).join('\n\n');
      
      return {
        message: `*Pending Approvals*\n\n${list}\n\nReply "approve [number]" or "reject [number]"`,
        data: pending.results
      };
    }
    
    case 'approve':
    case 'reject': {
      const documentId = command.params.document;
      const action = command.action;
      
      // Update approval status
      const result = await db.prepare(`
        UPDATE approval_workflows
        SET status = ?, approved_at = datetime('now')
        WHERE company_id = ? AND (document_id LIKE ? OR id LIKE ?)
      `).bind(action === 'approve' ? 'approved' : 'rejected', companyId, `%${documentId}%`, `%${documentId}%`).run().catch(() => ({ meta: { changes: 0 } }));
      
      if ((result as any).meta?.changes === 0) {
        return { message: `Document "${documentId}" not found or already processed` };
      }
      
      return {
        message: `Document ${documentId} has been *${action === 'approve' ? 'APPROVED' : 'REJECTED'}*`
      };
    }
    
    case 'unknown':
    default:
      return {
        message: `I didn't understand "${command.params.original || 'that'}"\n\nReply *help* to see available commands.`
      };
  }
}

// Send WhatsApp notification (outbound)
differentiators.post('/whatsapp/send', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const { phone_number, message, template_name, template_params } = body;
    
    if (!phone_number || (!message && !template_name)) {
      return c.json({ error: 'phone_number and message or template_name required' }, 400);
    }
    
    const db = c.env.DB;
    const messageId = generateUUID();
    
    // Log outbound message
    await db.prepare(`
      INSERT INTO whatsapp_messages (id, company_id, phone_number, direction, message_text, template_name, status, created_at)
      VALUES (?, ?, ?, 'outbound', ?, ?, 'queued', datetime('now'))
    `).bind(messageId, auth.company_id, phone_number, message || '', template_name || null).run().catch(() => {});
    
    // In production, this would call WhatsApp Business API / Twilio
    // For now, return success with the queued message
    return c.json({
      success: true,
      message_id: messageId,
      status: 'queued',
      note: 'Configure WHATSAPP_API_KEY environment variable to enable actual sending'
    });
  } catch (error) {
    return c.json({ error: 'Failed to queue message' }, 500);
  }
});

// Get WhatsApp message history
differentiators.get('/whatsapp/messages', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  const phoneNumber = c.req.query('phone_number');
  const db = c.env.DB;
  
  let query = `
    SELECT id, phone_number, direction, message_text, template_name, status, created_at
    FROM whatsapp_messages
    WHERE company_id = ?
  `;
  const params: any[] = [auth.company_id];
  
  if (phoneNumber) {
    query += ` AND phone_number = ?`;
    params.push(phoneNumber);
  }
  
  query += ` ORDER BY created_at DESC LIMIT 100`;
  
  const messages = await db.prepare(query).bind(...params).all().catch(() => ({ results: [] }));
  
  return c.json({ messages: messages.results });
});

// WhatsApp notification templates
differentiators.get('/whatsapp/templates', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  // Pre-defined notification templates
  const templates = [
    {
      name: 'invoice_reminder',
      description: 'Invoice payment reminder',
      message: 'Hi {{customer_name}}, this is a reminder that invoice {{invoice_number}} for R{{amount}} is due on {{due_date}}. Please arrange payment to avoid late fees.',
      variables: ['customer_name', 'invoice_number', 'amount', 'due_date']
    },
    {
      name: 'order_confirmation',
      description: 'Order confirmation',
      message: 'Thank you for your order {{order_number}}! Your order of R{{amount}} has been confirmed and will be processed shortly.',
      variables: ['order_number', 'amount']
    },
    {
      name: 'shipment_notification',
      description: 'Shipment tracking',
      message: 'Your order {{order_number}} has been shipped! Track your delivery: {{tracking_url}}',
      variables: ['order_number', 'tracking_url']
    },
    {
      name: 'approval_request',
      description: 'Approval request notification',
      message: 'Action required: {{document_type}} {{document_number}} for R{{amount}} requires your approval. Reply "approve {{document_number}}" or "reject {{document_number}}"',
      variables: ['document_type', 'document_number', 'amount']
    },
    {
      name: 'payment_received',
      description: 'Payment confirmation',
      message: 'Payment received! We have received your payment of R{{amount}} for invoice {{invoice_number}}. Thank you for your business.',
      variables: ['amount', 'invoice_number']
    },
    {
      name: 'stock_alert',
      description: 'Low stock alert',
      message: 'Stock Alert: {{product_name}} ({{sku}}) is running low. Current stock: {{quantity}}. Reorder level: {{reorder_level}}',
      variables: ['product_name', 'sku', 'quantity', 'reorder_level']
    }
  ];
  
  return c.json({ templates });
});

// ==================== MOBILE-FIRST + OFFLINE ====================

// Service worker manifest for PWA
differentiators.get('/mobile/manifest', async (c) => {
  return c.json({
    name: 'ARIA ERP',
    short_name: 'ARIA',
    description: 'Bot-driven ERP system for emerging markets',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    icons: [
      { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    categories: ['business', 'productivity', 'finance'],
    screenshots: [
      { src: '/screenshots/dashboard.png', sizes: '1280x720', type: 'image/png' },
      { src: '/screenshots/mobile.png', sizes: '750x1334', type: 'image/png' }
    ]
  });
});

// Push notification subscription
differentiators.post('/mobile/push/subscribe', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const { subscription, device_name } = body;
    
    if (!subscription || !subscription.endpoint) {
      return c.json({ error: 'Push subscription object required' }, 400);
    }
    
    const db = c.env.DB;
    const subscriptionId = generateUUID();
    
    // Store push subscription
    await db.prepare(`
      INSERT OR REPLACE INTO push_subscriptions (id, user_id, company_id, endpoint, p256dh_key, auth_key, device_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      subscriptionId,
      auth.user_id,
      auth.company_id,
      subscription.endpoint,
      subscription.keys?.p256dh || '',
      subscription.keys?.auth || '',
      device_name || 'Unknown Device'
    ).run();
    
    return c.json({
      success: true,
      subscription_id: subscriptionId,
      message: 'Push notifications enabled'
    });
  } catch (error) {
    return c.json({ error: 'Failed to save subscription' }, 500);
  }
});

// Unsubscribe from push notifications
differentiators.post('/mobile/push/unsubscribe', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const { endpoint } = body;
    
    const db = c.env.DB;
    
    await db.prepare(`
      DELETE FROM push_subscriptions
      WHERE user_id = ? AND endpoint = ?
    `).bind(auth.user_id, endpoint).run();
    
    return c.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (error) {
    return c.json({ error: 'Failed to unsubscribe' }, 500);
  }
});

// Offline sync - queue actions when offline
differentiators.post('/mobile/sync/queue', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const { actions } = body;
    
    if (!Array.isArray(actions) || actions.length === 0) {
      return c.json({ error: 'actions array required' }, 400);
    }
    
    const db = c.env.DB;
    const results: any[] = [];
    
    for (const action of actions) {
      const actionId = generateUUID();
      
      await db.prepare(`
        INSERT INTO offline_sync_queue (id, user_id, company_id, action_type, entity_type, entity_id, payload, client_timestamp, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
      `).bind(
        actionId,
        auth.user_id,
        auth.company_id,
        action.action_type, // 'create', 'update', 'delete'
        action.entity_type, // 'customer', 'product', 'invoice', etc.
        action.entity_id || null,
        JSON.stringify(action.payload || {}),
        action.client_timestamp || new Date().toISOString()
      ).run();
      
      results.push({ action_id: actionId, status: 'queued' });
    }
    
    return c.json({
      success: true,
      queued_count: results.length,
      actions: results
    });
  } catch (error) {
    return c.json({ error: 'Failed to queue actions' }, 500);
  }
});

// Offline sync - process queued actions
differentiators.post('/mobile/sync/process', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const db = c.env.DB;
    
    // Get pending actions for this user
    const pending = await db.prepare(`
      SELECT id, action_type, entity_type, entity_id, payload, client_timestamp
      FROM offline_sync_queue
      WHERE user_id = ? AND company_id = ? AND status = 'pending'
      ORDER BY client_timestamp ASC
      LIMIT 50
    `).bind(auth.user_id, auth.company_id).all();
    
    const results: any[] = [];
    
    for (const action of pending.results as any[]) {
      try {
        const companyId = await getSecureCompanyId(c);
        if (!companyId) return c.json({ error: 'Authentication required' }, 401);
        const payload = JSON.parse(action.payload || '{}');
        
        // Process action based on type
        let result: any = { success: false };
        
        if (action.action_type === 'create') {
          result = await processCreateAction(db, auth.company_id, action.entity_type, payload);
        } else if (action.action_type === 'update') {
          result = await processUpdateAction(db, auth.company_id, action.entity_type, action.entity_id, payload);
        } else if (action.action_type === 'delete') {
          result = await processDeleteAction(db, auth.company_id, action.entity_type, action.entity_id);
        }
        
        // Update action status
        await db.prepare(`
          UPDATE offline_sync_queue
          SET status = ?, processed_at = datetime('now'), result = ?
          WHERE id = ?
        `).bind(
          result.success ? 'completed' : 'failed',
          JSON.stringify(result),
          action.id
        ).run();
        
        results.push({
          action_id: action.id,
          status: result.success ? 'completed' : 'failed',
          result
        });
      } catch (error) {
        await db.prepare(`
          UPDATE offline_sync_queue
          SET status = 'failed', processed_at = datetime('now'), result = ?
          WHERE id = ?
        `).bind(JSON.stringify({ error: 'Processing failed' }), action.id).run();
        
        results.push({
          action_id: action.id,
          status: 'failed',
          error: 'Processing failed'
        });
      }
    }
    
    return c.json({
      success: true,
      processed_count: results.length,
      results
    });
  } catch (error) {
    return c.json({ error: 'Failed to process sync queue' }, 500);
  }
});

// Helper functions for offline sync processing
async function processCreateAction(db: D1Database, companyId: string, entityType: string, payload: any): Promise<any> {
  const id = generateUUID();
  
  switch (entityType) {
    case 'customer':
      await db.prepare(`
        INSERT INTO customers (id, company_id, name, email, phone, address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(id, companyId, payload.name, payload.email, payload.phone, payload.address).run();
      return { success: true, entity_id: id };
      
    case 'product':
      await db.prepare(`
        INSERT INTO products (id, company_id, name, sku, price, quantity_on_hand, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(id, companyId, payload.name, payload.sku, payload.price, payload.quantity || 0).run();
      return { success: true, entity_id: id };
      
    case 'time_entry':
      await db.prepare(`
        INSERT INTO time_entries (id, company_id, project_id, employee_id, entry_date, hours, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(id, companyId, payload.project_id, payload.employee_id, payload.entry_date, payload.hours, payload.description).run();
      return { success: true, entity_id: id };
      
    default:
      return { success: false, error: `Unknown entity type: ${entityType}` };
  }
}

async function processUpdateAction(db: D1Database, companyId: string, entityType: string, entityId: string, payload: any): Promise<any> {
  switch (entityType) {
    case 'customer':
      await db.prepare(`
        UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, updated_at = datetime('now')
        WHERE id = ? AND company_id = ?
      `).bind(payload.name, payload.email, payload.phone, payload.address, entityId, companyId).run();
      return { success: true };
      
    case 'product':
      await db.prepare(`
        UPDATE products SET name = ?, sku = ?, price = ?, quantity_on_hand = ?, updated_at = datetime('now')
        WHERE id = ? AND company_id = ?
      `).bind(payload.name, payload.sku, payload.price, payload.quantity, entityId, companyId).run();
      return { success: true };
      
    default:
      return { success: false, error: `Unknown entity type: ${entityType}` };
  }
}

async function processDeleteAction(db: D1Database, companyId: string, entityType: string, entityId: string): Promise<any> {
  const tableMap: Record<string, string> = {
    customer: 'customers',
    product: 'products',
    time_entry: 'time_entries'
  };
  
  const table = tableMap[entityType];
  if (!table) {
    return { success: false, error: `Unknown entity type: ${entityType}` };
  }
  
  await db.prepare(`DELETE FROM ${table} WHERE id = ? AND company_id = ?`).bind(entityId, companyId).run();
  return { success: true };
}

// Get sync status
differentiators.get('/mobile/sync/status', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  const db = c.env.DB;
  
  const stats = await db.prepare(`
    SELECT 
      status,
      COUNT(*) as count
    FROM offline_sync_queue
    WHERE user_id = ? AND company_id = ?
    GROUP BY status
  `).bind(auth.user_id, auth.company_id).all();
  
  const statusMap: Record<string, number> = {};
  for (const row of stats.results as any[]) {
    statusMap[row.status] = row.count;
  }
  
  return c.json({
    pending: statusMap.pending || 0,
    completed: statusMap.completed || 0,
    failed: statusMap.failed || 0,
    last_sync: new Date().toISOString()
  });
});

// Mobile-optimized lightweight data endpoints
differentiators.get('/mobile/data/dashboard', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  const db = c.env.DB;
  
  // Lightweight dashboard data for mobile
  const [orders, revenue, pending, overdue] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as count FROM sales_orders WHERE company_id = ? AND date(order_date) >= date('now', '-7 days')`).bind(auth.company_id).first(),
    db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM sales_orders WHERE company_id = ? AND date(order_date) >= date('now', '-7 days')`).bind(auth.company_id).first(),
    db.prepare(`SELECT COUNT(*) as count FROM approval_workflows WHERE company_id = ? AND status = 'pending'`).bind(auth.company_id).first(),
    db.prepare(`SELECT COUNT(*) as count FROM ar_invoices WHERE company_id = ? AND status = 'overdue'`).bind(auth.company_id).first()
  ]).catch(() => [{ count: 0 }, { total: 0 }, { count: 0 }, { count: 0 }]);
  
  return c.json({
    orders_7d: orders?.count || 0,
    revenue_7d: revenue?.total || 0,
    pending_approvals: pending?.count || 0,
    overdue_invoices: overdue?.count || 0,
    timestamp: new Date().toISOString()
  });
});

// ==================== SPREADSHEET MIGRATION TOOLS ====================

// Get migration templates
differentiators.get('/migration/templates', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  const templates = [
    {
      name: 'customers',
      description: 'Customer master data',
      columns: [
        { name: 'name', type: 'string', required: true, description: 'Customer name' },
        { name: 'email', type: 'string', required: false, description: 'Email address' },
        { name: 'phone', type: 'string', required: false, description: 'Phone number' },
        { name: 'address', type: 'string', required: false, description: 'Street address' },
        { name: 'city', type: 'string', required: false, description: 'City' },
        { name: 'country', type: 'string', required: false, description: 'Country' },
        { name: 'tax_number', type: 'string', required: false, description: 'VAT/Tax registration number' },
        { name: 'credit_limit', type: 'number', required: false, description: 'Credit limit' },
        { name: 'payment_terms', type: 'number', required: false, description: 'Payment terms (days)' }
      ],
      sample_data: [
        { name: 'Acme Corp', email: 'info@acme.com', phone: '+27 11 123 4567', city: 'Johannesburg', country: 'South Africa', credit_limit: 50000 }
      ]
    },
    {
      name: 'suppliers',
      description: 'Supplier master data',
      columns: [
        { name: 'name', type: 'string', required: true, description: 'Supplier name' },
        { name: 'email', type: 'string', required: false, description: 'Email address' },
        { name: 'phone', type: 'string', required: false, description: 'Phone number' },
        { name: 'address', type: 'string', required: false, description: 'Street address' },
        { name: 'city', type: 'string', required: false, description: 'City' },
        { name: 'country', type: 'string', required: false, description: 'Country' },
        { name: 'tax_number', type: 'string', required: false, description: 'VAT/Tax registration number' },
        { name: 'payment_terms', type: 'number', required: false, description: 'Payment terms (days)' },
        { name: 'bank_account', type: 'string', required: false, description: 'Bank account number' }
      ],
      sample_data: [
        { name: 'Global Supplies Ltd', email: 'orders@globalsupplies.com', city: 'Cape Town', country: 'South Africa' }
      ]
    },
    {
      name: 'products',
      description: 'Product master data',
      columns: [
        { name: 'name', type: 'string', required: true, description: 'Product name' },
        { name: 'sku', type: 'string', required: true, description: 'Stock keeping unit (unique code)' },
        { name: 'description', type: 'string', required: false, description: 'Product description' },
        { name: 'category', type: 'string', required: false, description: 'Product category' },
        { name: 'unit_price', type: 'number', required: true, description: 'Selling price' },
        { name: 'cost_price', type: 'number', required: false, description: 'Cost price' },
        { name: 'quantity_on_hand', type: 'number', required: false, description: 'Current stock quantity' },
        { name: 'reorder_level', type: 'number', required: false, description: 'Minimum stock level' },
        { name: 'tax_rate', type: 'number', required: false, description: 'Tax rate (%)' }
      ],
      sample_data: [
        { name: 'Widget A', sku: 'WGT-001', unit_price: 99.99, cost_price: 50, quantity_on_hand: 100, reorder_level: 20, tax_rate: 15 }
      ]
    },
    {
      name: 'chart_of_accounts',
      description: 'GL Chart of Accounts',
      columns: [
        { name: 'account_code', type: 'string', required: true, description: 'Account code (e.g., 1000)' },
        { name: 'account_name', type: 'string', required: true, description: 'Account name' },
        { name: 'account_type', type: 'string', required: true, description: 'Type: asset, liability, equity, revenue, expense' },
        { name: 'parent_code', type: 'string', required: false, description: 'Parent account code' },
        { name: 'is_active', type: 'boolean', required: false, description: 'Active status' }
      ],
      sample_data: [
        { account_code: '1000', account_name: 'Cash and Bank', account_type: 'asset', is_active: true },
        { account_code: '1100', account_name: 'Accounts Receivable', account_type: 'asset', parent_code: '1000', is_active: true }
      ]
    },
    {
      name: 'opening_balances',
      description: 'Opening balances for GL accounts',
      columns: [
        { name: 'account_code', type: 'string', required: true, description: 'GL account code' },
        { name: 'debit_amount', type: 'number', required: false, description: 'Debit balance' },
        { name: 'credit_amount', type: 'number', required: false, description: 'Credit balance' },
        { name: 'as_of_date', type: 'date', required: true, description: 'Balance date (YYYY-MM-DD)' }
      ],
      sample_data: [
        { account_code: '1000', debit_amount: 100000, credit_amount: 0, as_of_date: '2025-01-01' }
      ]
    },
    {
      name: 'employees',
      description: 'Employee master data',
      columns: [
        { name: 'employee_number', type: 'string', required: true, description: 'Employee ID/number' },
        { name: 'first_name', type: 'string', required: true, description: 'First name' },
        { name: 'last_name', type: 'string', required: true, description: 'Last name' },
        { name: 'email', type: 'string', required: false, description: 'Email address' },
        { name: 'phone', type: 'string', required: false, description: 'Phone number' },
        { name: 'department', type: 'string', required: false, description: 'Department' },
        { name: 'position', type: 'string', required: false, description: 'Job title' },
        { name: 'hire_date', type: 'date', required: false, description: 'Hire date (YYYY-MM-DD)' },
        { name: 'salary', type: 'number', required: false, description: 'Monthly salary' },
        { name: 'tax_number', type: 'string', required: false, description: 'Tax/ID number' }
      ],
      sample_data: [
        { employee_number: 'EMP001', first_name: 'John', last_name: 'Smith', department: 'Sales', position: 'Sales Manager', salary: 45000 }
      ]
    }
  ];
  
  return c.json({ templates });
});

// Download template as CSV
differentiators.get('/migration/templates/:template/download', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  const templateName = c.req.param('template');
  
  // Get template definition
  const templates: Record<string, { columns: { name: string }[], sample_data: any[] }> = {
    customers: {
      columns: [
        { name: 'name' }, { name: 'email' }, { name: 'phone' }, { name: 'address' },
        { name: 'city' }, { name: 'country' }, { name: 'tax_number' }, { name: 'credit_limit' }, { name: 'payment_terms' }
      ],
      sample_data: [{ name: 'Example Customer', email: 'customer@example.com', city: 'Johannesburg', country: 'South Africa' }]
    },
    suppliers: {
      columns: [
        { name: 'name' }, { name: 'email' }, { name: 'phone' }, { name: 'address' },
        { name: 'city' }, { name: 'country' }, { name: 'tax_number' }, { name: 'payment_terms' }, { name: 'bank_account' }
      ],
      sample_data: [{ name: 'Example Supplier', email: 'supplier@example.com', city: 'Cape Town', country: 'South Africa' }]
    },
    products: {
      columns: [
        { name: 'name' }, { name: 'sku' }, { name: 'description' }, { name: 'category' },
        { name: 'unit_price' }, { name: 'cost_price' }, { name: 'quantity_on_hand' }, { name: 'reorder_level' }, { name: 'tax_rate' }
      ],
      sample_data: [{ name: 'Example Product', sku: 'SKU-001', unit_price: 100, cost_price: 50, quantity_on_hand: 100 }]
    },
    employees: {
      columns: [
        { name: 'employee_number' }, { name: 'first_name' }, { name: 'last_name' }, { name: 'email' },
        { name: 'phone' }, { name: 'department' }, { name: 'position' }, { name: 'hire_date' }, { name: 'salary' }, { name: 'tax_number' }
      ],
      sample_data: [{ employee_number: 'EMP001', first_name: 'John', last_name: 'Doe', department: 'Sales' }]
    }
  };
  
  const template = templates[templateName];
  if (!template) {
    return c.json({ error: 'Template not found' }, 404);
  }
  
  // Generate CSV
  const headers = template.columns.map(col => col.name).join(',');
  const sampleRow = template.columns.map(col => {
    const value = template.sample_data[0]?.[col.name] || '';
    return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
  }).join(',');
  
  const csv = `${headers}\n${sampleRow}`;
  
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${templateName}_template.csv"`
    }
  });
});

// Upload and validate migration data
differentiators.post('/migration/upload', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const formData = await c.req.formData();
    const fileEntry = formData.get('file');
    const entityType = formData.get('entity_type') as string;
    
    if (!fileEntry || !entityType) {
      return c.json({ error: 'file and entity_type required' }, 400);
    }
    
    // Handle both File and string types
    let content: string;
    if (typeof fileEntry === 'string') {
      content = fileEntry;
    } else {
      content = await (fileEntry as File).text();
    }
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return c.json({ error: 'File must contain header row and at least one data row' }, 400);
    }
    
    // Parse CSV
    const headers = parseCSVLine(lines[0]);
    const rows: any[] = [];
    const errors: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: any = {};
      
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || '';
      }
      
      // Validate row
      const validation = validateMigrationRow(entityType, row, i + 1);
      if (validation.errors.length > 0) {
        errors.push(...validation.errors);
      } else {
        rows.push(row);
      }
    }
    
    // Create migration job
    const db = c.env.DB;
    const jobId = generateUUID();
    
    await db.prepare(`
      INSERT INTO migration_jobs (id, company_id, entity_type, total_rows, valid_rows, status, uploaded_data, errors, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now'))
    `).bind(
      jobId,
      auth.company_id,
      entityType,
      lines.length - 1,
      rows.length,
      JSON.stringify(rows),
      JSON.stringify(errors)
    ).run().catch(() => {});
    
    return c.json({
      job_id: jobId,
      entity_type: entityType,
      total_rows: lines.length - 1,
      valid_rows: rows.length,
      error_count: errors.length,
      errors: errors.slice(0, 10), // Return first 10 errors
      status: errors.length === 0 ? 'ready' : 'has_errors',
      message: errors.length === 0 
        ? `${rows.length} rows validated successfully. Call /migration/execute/${jobId} to import.`
        : `${errors.length} validation errors found. Fix errors and re-upload.`
    });
  } catch (error) {
    return c.json({ error: 'Failed to process file' }, 500);
  }
});

// Parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Validate migration row
function validateMigrationRow(entityType: string, row: any, rowNumber: number): { errors: any[] } {
  const errors: any[] = [];
  
  switch (entityType) {
    case 'customers':
    case 'suppliers':
      if (!row.name || row.name.trim() === '') {
        errors.push({ row: rowNumber, field: 'name', error: 'Name is required' });
      }
      if (row.email && !row.email.includes('@')) {
        errors.push({ row: rowNumber, field: 'email', error: 'Invalid email format' });
      }
      if (row.credit_limit && isNaN(parseFloat(row.credit_limit))) {
        errors.push({ row: rowNumber, field: 'credit_limit', error: 'Credit limit must be a number' });
      }
      break;
      
    case 'products':
      if (!row.name || row.name.trim() === '') {
        errors.push({ row: rowNumber, field: 'name', error: 'Name is required' });
      }
      if (!row.sku || row.sku.trim() === '') {
        errors.push({ row: rowNumber, field: 'sku', error: 'SKU is required' });
      }
      if (!row.unit_price || isNaN(parseFloat(row.unit_price))) {
        errors.push({ row: rowNumber, field: 'unit_price', error: 'Unit price is required and must be a number' });
      }
      break;
      
    case 'employees':
      if (!row.employee_number || row.employee_number.trim() === '') {
        errors.push({ row: rowNumber, field: 'employee_number', error: 'Employee number is required' });
      }
      if (!row.first_name || row.first_name.trim() === '') {
        errors.push({ row: rowNumber, field: 'first_name', error: 'First name is required' });
      }
      if (!row.last_name || row.last_name.trim() === '') {
        errors.push({ row: rowNumber, field: 'last_name', error: 'Last name is required' });
      }
      break;
      
    case 'chart_of_accounts':
      if (!row.account_code || row.account_code.trim() === '') {
        errors.push({ row: rowNumber, field: 'account_code', error: 'Account code is required' });
      }
      if (!row.account_name || row.account_name.trim() === '') {
        errors.push({ row: rowNumber, field: 'account_name', error: 'Account name is required' });
      }
      const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
      if (!row.account_type || !validTypes.includes(row.account_type.toLowerCase())) {
        errors.push({ row: rowNumber, field: 'account_type', error: `Account type must be one of: ${validTypes.join(', ')}` });
      }
      break;
  }
  
  return { errors };
}

// Execute migration job
differentiators.post('/migration/execute/:jobId', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  const jobId = c.req.param('jobId');
  const db = c.env.DB;
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    // Get migration job
    const job = await db.prepare(`
      SELECT * FROM migration_jobs
      WHERE id = ? AND company_id = ? AND status = 'pending'
    `).bind(jobId, auth.company_id).first();
    
    if (!job) {
      return c.json({ error: 'Migration job not found or already executed' }, 404);
    }
    
    const rows = JSON.parse(job.uploaded_data as string || '[]');
    const entityType = job.entity_type as string;
    
    let imported = 0;
    let failed = 0;
    const importErrors: any[] = [];
    
    // Import rows
    for (let i = 0; i < rows.length; i++) {
      try {
        const companyId = await getSecureCompanyId(c);
        if (!companyId) return c.json({ error: 'Authentication required' }, 401);
        await importRow(db, auth.company_id, entityType, rows[i]);
        imported++;
      } catch (error: any) {
        failed++;
        importErrors.push({ row: i + 2, error: error.message || 'Import failed' });
      }
    }
    
    // Update job status
    await db.prepare(`
      UPDATE migration_jobs
      SET status = ?, imported_rows = ?, failed_rows = ?, import_errors = ?, completed_at = datetime('now')
      WHERE id = ?
    `).bind(
      failed === 0 ? 'completed' : 'completed_with_errors',
      imported,
      failed,
      JSON.stringify(importErrors),
      jobId
    ).run();
    
    return c.json({
      job_id: jobId,
      status: failed === 0 ? 'completed' : 'completed_with_errors',
      imported: imported,
      failed: failed,
      errors: importErrors.slice(0, 10),
      message: `Imported ${imported} of ${rows.length} rows`
    });
  } catch (error) {
    return c.json({ error: 'Failed to execute migration' }, 500);
  }
});

// Import a single row
async function importRow(db: D1Database, companyId: string, entityType: string, row: any): Promise<void> {
  const id = generateUUID();
  
  switch (entityType) {
    case 'customers':
      await db.prepare(`
        INSERT INTO customers (id, company_id, name, email, phone, address, city, country, tax_number, credit_limit, payment_terms, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        id, companyId, row.name, row.email || null, row.phone || null, row.address || null,
        row.city || null, row.country || null, row.tax_number || null,
        row.credit_limit ? parseFloat(row.credit_limit) : null,
        row.payment_terms ? parseInt(row.payment_terms) : null
      ).run();
      break;
      
    case 'suppliers':
      await db.prepare(`
        INSERT INTO suppliers (id, company_id, name, email, phone, address, city, country, tax_number, payment_terms, bank_account, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        id, companyId, row.name, row.email || null, row.phone || null, row.address || null,
        row.city || null, row.country || null, row.tax_number || null,
        row.payment_terms ? parseInt(row.payment_terms) : null, row.bank_account || null
      ).run();
      break;
      
    case 'products':
      await db.prepare(`
        INSERT INTO products (id, company_id, name, sku, description, category, price, cost_price, quantity_on_hand, reorder_level, tax_rate, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        id, companyId, row.name, row.sku, row.description || null, row.category || null,
        parseFloat(row.unit_price), row.cost_price ? parseFloat(row.cost_price) : null,
        row.quantity_on_hand ? parseInt(row.quantity_on_hand) : 0,
        row.reorder_level ? parseInt(row.reorder_level) : null,
        row.tax_rate ? parseFloat(row.tax_rate) : null
      ).run();
      break;
      
    case 'employees':
      await db.prepare(`
        INSERT INTO employees (id, company_id, employee_number, first_name, last_name, email, phone, department, position, hire_date, salary, tax_number, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        id, companyId, row.employee_number, row.first_name, row.last_name,
        row.email || null, row.phone || null, row.department || null, row.position || null,
        row.hire_date || null, row.salary ? parseFloat(row.salary) : null, row.tax_number || null
      ).run();
      break;
      
    case 'chart_of_accounts':
      await db.prepare(`
        INSERT INTO chart_of_accounts (id, company_id, account_code, account_name, account_type, parent_code, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        id, companyId, row.account_code, row.account_name, row.account_type.toLowerCase(),
        row.parent_code || null, row.is_active !== 'false' && row.is_active !== '0' ? 1 : 0
      ).run();
      break;
      
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

// Get migration job status
differentiators.get('/migration/jobs/:jobId', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  const jobId = c.req.param('jobId');
  const db = c.env.DB;
  
  const job = await db.prepare(`
    SELECT id, entity_type, total_rows, valid_rows, imported_rows, failed_rows, status, errors, import_errors, created_at, completed_at
    FROM migration_jobs
    WHERE id = ? AND company_id = ?
  `).bind(jobId, auth.company_id).first();
  
  if (!job) {
    return c.json({ error: 'Migration job not found' }, 404);
  }
  
  return c.json({
    ...job,
    errors: JSON.parse(job.errors as string || '[]'),
    import_errors: JSON.parse(job.import_errors as string || '[]')
  });
});

// List migration jobs
differentiators.get('/migration/jobs', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  const db = c.env.DB;
  
  const jobs = await db.prepare(`
    SELECT id, entity_type, total_rows, valid_rows, imported_rows, failed_rows, status, created_at, completed_at
    FROM migration_jobs
    WHERE company_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).bind(auth.company_id).all();
  
  return c.json({ jobs: jobs.results });
});

// Rollback migration job
differentiators.post('/migration/rollback/:jobId', async (c) => {
    const auth = await getAuthContext(c);
    if (!auth) return c.json({ error: 'Authentication required' }, 401);
  
  const jobId = c.req.param('jobId');
  const db = c.env.DB;
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    // Get migration job
    const job = await db.prepare(`
      SELECT * FROM migration_jobs
      WHERE id = ? AND company_id = ? AND status IN ('completed', 'completed_with_errors')
    `).bind(jobId, auth.company_id).first();
    
    if (!job) {
      return c.json({ error: 'Migration job not found or cannot be rolled back' }, 404);
    }
    
    const rows = JSON.parse(job.uploaded_data as string || '[]');
    const entityType = job.entity_type as string;
    
    // Delete imported records
    // Note: This is a simplified rollback - in production you'd want to track exactly which records were created
    const tableMap: Record<string, string> = {
      customers: 'customers',
      suppliers: 'suppliers',
      products: 'products',
      employees: 'employees',
      chart_of_accounts: 'chart_of_accounts'
    };
    
    const table = tableMap[entityType];
    if (!table) {
      return c.json({ error: 'Cannot rollback this entity type' }, 400);
    }
    
    // Delete records created after job creation
    await db.prepare(`
      DELETE FROM ${table}
      WHERE company_id = ? AND created_at >= ?
    `).bind(auth.company_id, job.created_at).run();
    
    // Update job status
    await db.prepare(`
      UPDATE migration_jobs
      SET status = 'rolled_back'
      WHERE id = ?
    `).bind(jobId).run();
    
    return c.json({
      job_id: jobId,
      status: 'rolled_back',
      message: 'Migration has been rolled back'
    });
  } catch (error) {
    return c.json({ error: 'Failed to rollback migration' }, 500);
  }
});

export default differentiators;
