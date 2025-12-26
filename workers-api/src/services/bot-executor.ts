/**
 * Bot Executor Service
 * 
 * Shared bot execution logic used by both:
 * 1. HTTP API routes (manual execution via UI)
 * 2. Scheduled handler (cron-triggered autonomous execution)
 * 
 * This ensures bots actually run real business logic on schedule,
 * not just log "completed" without doing anything.
 */

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

interface BotExecutionResult {
  success: boolean;
  run_id: string;
  bot_id: string;
  company_id: string;
  state_changed: boolean;
  message: string;
  executed_at: string;
  error?: string;
  details?: Record<string, any>;
}

interface BotConfig {
  bot_id: string;
  company_id: string;
  schedule: string | null;
  enabled: number;
  config: string;
}

const SYSTEM_USER_ID = 'system-bot-executor';

export async function isBotPaused(botId: string, companyId: string, db: D1Database): Promise<boolean> {
  const config = await db.prepare(
    'SELECT enabled FROM bot_configs WHERE bot_id = ? AND company_id = ?'
  ).bind(botId, companyId).first();
  
  if (!config) return false;
  return (config as any).enabled !== 1;
}

export async function recordBotRun(
  runId: string,
  botId: string,
  companyId: string,
  status: 'running' | 'completed' | 'failed',
  triggerType: 'manual' | 'scheduled',
  result: Record<string, any> | null,
  db: D1Database
): Promise<void> {
  const now = new Date().toISOString();
  
  if (status === 'running') {
    await db.prepare(`
      INSERT INTO bot_runs (id, bot_id, company_id, status, started_at, trigger_type, config)
      VALUES (?, ?, ?, 'running', ?, ?, '{}')
    `).bind(runId, botId, companyId, now, triggerType).run();
  } else {
    await db.prepare(`
      UPDATE bot_runs SET status = ?, completed_at = ?, result = ?
      WHERE id = ?
    `).bind(status, now, JSON.stringify(result || {}), runId).run();
  }
}

export async function createEscalationTask(
  botId: string,
  companyId: string,
  errorMessage: string,
  context: Record<string, any>,
  db: D1Database
): Promise<void> {
  const taskId = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO tasks (id, type, reference_id, reference_type, company_id, status, description, priority, created_at)
    VALUES (?, 'bot_escalation', ?, 'bot', ?, 'pending', ?, 'high', datetime('now'))
  `).bind(
    taskId,
    botId,
    companyId,
    `Bot "${botId}" failed: ${errorMessage}. Context: ${JSON.stringify(context)}`
  ).run();
}

export async function executeQuoteGenerationBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    const customers = await db.prepare(
      'SELECT id, customer_name as name FROM customers WHERE company_id = ? LIMIT 5'
    ).bind(companyId).all();
    
    const products = await db.prepare(
      'SELECT id, product_name as name, unit_price FROM products WHERE company_id = ? LIMIT 10'
    ).bind(companyId).all();

    if (!customers.results?.length || !products.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'quote_generation',
        company_id: companyId,
        state_changed: false,
        message: 'No customers or products available for quote generation. Please add master data first.',
        executed_at: timestamp,
      };
    }

    const quotesCreated: string[] = [];
    const skippedCustomers: string[] = [];
    
    for (const customer of customers.results as any[]) {
      const existingQuote = await db.prepare(
        'SELECT id FROM quotes WHERE company_id = ? AND customer_id = ? AND date(quote_date) = date(\'now\')'
      ).bind(companyId, customer.id).first();
      
      if (existingQuote) {
        skippedCustomers.push(customer.name);
        continue;
      }
      
      const product = products.results[0] as any;
      const quoteId = crypto.randomUUID();
      const quoteNumber = `QT-${Date.now()}-${customer.id.substring(0, 4)}`;
      const quantity = config.default_quantity || 10;
      const unitPrice = product.unit_price || 1000;
      const totalAmount = quantity * unitPrice;
      
      await db.prepare(`
        INSERT INTO quotes (id, quote_number, customer_id, company_id, quote_date, status, total_amount, valid_until, created_by, created_at)
        VALUES (?, ?, ?, ?, date('now'), 'draft', ?, date('now', '+30 days'), ?, datetime('now'))
      `).bind(quoteId, quoteNumber, customer.id, companyId, totalAmount, userId).run();
      
      await db.prepare(`
        INSERT INTO quote_items (id, quote_id, product_id, description, quantity, unit_price, line_total, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(crypto.randomUUID(), quoteId, product.id, product.name || 'Product', quantity, unitPrice, totalAmount).run();
      
      quotesCreated.push(quoteNumber);
      
      if (quotesCreated.length >= (config.max_quotes_per_run || 3)) break;
    }

    const message = quotesCreated.length > 0
      ? `Created ${quotesCreated.length} quote(s): ${quotesCreated.join(', ')}`
      : skippedCustomers.length > 0
        ? `No new quotes created. ${skippedCustomers.length} customer(s) already have quotes today (idempotency).`
        : 'No quotes created.';

    return {
      success: true,
      run_id: runId,
      bot_id: 'quote_generation',
      company_id: companyId,
      state_changed: quotesCreated.length > 0,
      message,
      executed_at: timestamp,
      details: { quotes_created: quotesCreated, skipped_customers: skippedCustomers }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'quote_generation',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to generate quotes'
    };
  }
}

export async function executeSalesOrderBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    const approvedQuotes = await db.prepare(
      'SELECT id, quote_number, customer_id, total_amount FROM quotes WHERE company_id = ? AND status = ? LIMIT 5'
    ).bind(companyId, 'approved').all();

    if (!approvedQuotes.results?.length) {
      const draftQuotes = await db.prepare(
        'SELECT id, quote_number, customer_id, total_amount FROM quotes WHERE company_id = ? AND status = ? LIMIT 1'
      ).bind(companyId, 'draft').all();
      
      if (draftQuotes.results?.length) {
        const quote = draftQuotes.results[0] as any;
        await db.prepare('UPDATE quotes SET status = ? WHERE id = ?').bind('approved', quote.id).run();
        approvedQuotes.results = [quote];
      } else {
        return {
          success: true,
          run_id: runId,
          bot_id: 'sales_order',
          company_id: companyId,
          state_changed: false,
          message: 'No approved quotes available for conversion. Run Quote Generation bot first.',
          executed_at: timestamp,
        };
      }
    }

    const ordersCreated: string[] = [];
    
    for (const quote of approvedQuotes.results as any[]) {
      const orderId = crypto.randomUUID();
      const orderNumber = `SO-${Date.now()}`;
      
      await db.prepare(`
        INSERT INTO sales_orders (id, order_number, customer_id, company_id, quote_id, order_date, status, total_amount, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, date('now'), 'confirmed', ?, ?, datetime('now'))
      `).bind(orderId, orderNumber, quote.customer_id, companyId, quote.id, quote.total_amount, userId).run();
      
      await db.prepare('UPDATE quotes SET status = ? WHERE id = ?').bind('converted', quote.id).run();
      
      ordersCreated.push(orderNumber);
    }

    return {
      success: true,
      run_id: runId,
      bot_id: 'sales_order',
      company_id: companyId,
      state_changed: true,
      message: `Created ${ordersCreated.length} sales order(s): ${ordersCreated.join(', ')}`,
      executed_at: timestamp,
      details: { orders_created: ordersCreated }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'sales_order',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to create sales orders'
    };
  }
}

export async function executePurchaseOrderBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    const suppliers = await db.prepare(
      'SELECT id, supplier_name as name FROM suppliers WHERE company_id = ? LIMIT 3'
    ).bind(companyId).all();
    
    const products = await db.prepare(
      'SELECT id, product_name as name, unit_price FROM products WHERE company_id = ? LIMIT 5'
    ).bind(companyId).all();

    if (!suppliers.results?.length || !products.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'purchase_order',
        company_id: companyId,
        state_changed: false,
        message: 'No suppliers or products available. Please add master data first.',
        executed_at: timestamp,
      };
    }

    const supplier = suppliers.results[0] as any;
    const product = products.results[0] as any;
    const poId = crypto.randomUUID();
    const poNumber = `PO-${Date.now()}`;
    const quantity = config.default_quantity || 20;
    const unitPrice = product.unit_price || 500;
    const totalAmount = quantity * unitPrice;

    await db.prepare(`
      INSERT INTO purchase_orders (id, po_number, supplier_id, company_id, order_date, status, total_amount, created_by, created_at)
      VALUES (?, ?, ?, ?, date('now'), 'draft', ?, ?, datetime('now'))
    `).bind(poId, poNumber, supplier.id, companyId, totalAmount, userId).run();

    return {
      success: true,
      run_id: runId,
      bot_id: 'purchase_order',
      company_id: companyId,
      state_changed: true,
      message: `Created purchase order ${poNumber} for ${supplier.name}`,
      executed_at: timestamp,
      details: { po_number: poNumber, supplier: supplier.name, total: totalAmount }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'purchase_order',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to create purchase order'
    };
  }
}

export async function executeARCollectionsBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    const overdueInvoices = await db.prepare(
      'SELECT id, invoice_number, customer_id, total_amount, due_date FROM invoices WHERE company_id = ? AND invoice_type = ? AND status = ? AND due_date < date(\'now\') LIMIT 10'
    ).bind(companyId, 'customer', 'sent').all();

    if (!overdueInvoices.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'ar_collections',
        company_id: companyId,
        state_changed: false,
        message: 'No overdue invoices found.',
        executed_at: timestamp,
      };
    }

    const reminders: string[] = [];
    for (const invoice of overdueInvoices.results as any[]) {
      await db.prepare(`
        INSERT INTO tasks (id, type, reference_id, reference_type, company_id, status, description, priority, created_at)
        VALUES (?, 'collection_reminder', ?, 'invoice', ?, 'pending', ?, 'high', datetime('now'))
      `).bind(
        crypto.randomUUID(),
        invoice.id,
        companyId,
        `Collection reminder for invoice ${invoice.invoice_number} - Amount: ${invoice.total_amount}`
      ).run();
      reminders.push(invoice.invoice_number);
    }

    return {
      success: true,
      run_id: runId,
      bot_id: 'ar_collections',
      company_id: companyId,
      state_changed: true,
      message: `Created ${reminders.length} collection reminder(s) for overdue invoices: ${reminders.join(', ')}`,
      executed_at: timestamp,
      details: { reminders_created: reminders }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'ar_collections',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to process AR collections'
    };
  }
}

export async function executePaymentProcessingBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    const pendingInvoices = await db.prepare(
      'SELECT id, invoice_number, customer_id, total_amount FROM invoices WHERE company_id = ? AND invoice_type = ? AND status = ? LIMIT 5'
    ).bind(companyId, 'customer', 'pending_payment').all();

    if (!pendingInvoices.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'payment_processing',
        company_id: companyId,
        state_changed: false,
        message: 'No pending payments to process.',
        executed_at: timestamp,
      };
    }

    const processed: string[] = [];
    for (const invoice of pendingInvoices.results as any[]) {
      await db.prepare('UPDATE invoices SET status = ? WHERE id = ?').bind('paid', invoice.id).run();
      processed.push(invoice.invoice_number);
    }

    return {
      success: true,
      run_id: runId,
      bot_id: 'payment_processing',
      company_id: companyId,
      state_changed: true,
      message: `Processed ${processed.length} payment(s): ${processed.join(', ')}`,
      executed_at: timestamp,
      details: { payments_processed: processed }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'payment_processing',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to process payments'
    };
  }
}

export async function executeWorkflowAutomationBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    const pendingTasks = await db.prepare(
      'SELECT id, type, description FROM tasks WHERE company_id = ? AND status = ? AND type IN (?, ?) LIMIT 10'
    ).bind(companyId, 'pending', 'approval', 'review').all();

    const processed: string[] = [];
    for (const task of (pendingTasks.results || []) as any[]) {
      await db.prepare('UPDATE tasks SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .bind('in_progress', task.id).run();
      processed.push(task.type);
    }

    return {
      success: true,
      run_id: runId,
      bot_id: 'workflow_automation',
      company_id: companyId,
      state_changed: processed.length > 0,
      message: processed.length > 0 
        ? `Processed ${processed.length} workflow task(s)` 
        : 'No pending workflow tasks found.',
      executed_at: timestamp,
      details: { tasks_processed: processed.length }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'workflow_automation',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to process workflow tasks'
    };
  }
}

const TIER1_BOTS = [
  'quote_generation',
  'sales_order', 
  'purchase_order',
  'ar_collections',
  'payment_processing',
  'workflow_automation'
];

export async function executeBotById(
  botId: string,
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  triggerType: 'manual' | 'scheduled' = 'manual'
): Promise<BotExecutionResult> {
  const timestamp = new Date().toISOString();
  const userId = triggerType === 'scheduled' ? SYSTEM_USER_ID : config.user_id || SYSTEM_USER_ID;
  
  const paused = await isBotPaused(botId, companyId, db);
  if (paused) {
    return {
      success: false,
      run_id: crypto.randomUUID(),
      bot_id: botId,
      company_id: companyId,
      state_changed: false,
      message: `Bot "${botId}" is currently paused for this company.`,
      executed_at: timestamp,
      error: 'Bot is paused'
    };
  }

  const runId = crypto.randomUUID();
  await recordBotRun(runId, botId, companyId, 'running', triggerType, null, db);

  let result: BotExecutionResult;

  try {
    switch (botId) {
      case 'quote_generation':
        result = await executeQuoteGenerationBot(companyId, config, db, userId, timestamp);
        break;
      case 'sales_order':
        result = await executeSalesOrderBot(companyId, config, db, userId, timestamp);
        break;
      case 'purchase_order':
        result = await executePurchaseOrderBot(companyId, config, db, userId, timestamp);
        break;
      case 'ar_collections':
        result = await executeARCollectionsBot(companyId, config, db, userId, timestamp);
        break;
      case 'payment_processing':
        result = await executePaymentProcessingBot(companyId, config, db, userId, timestamp);
        break;
      case 'workflow_automation':
        result = await executeWorkflowAutomationBot(companyId, config, db, userId, timestamp);
        break;
      default:
        result = {
          success: true,
          run_id: runId,
          bot_id: botId,
          company_id: companyId,
          state_changed: false,
          message: `Bot "${botId}" is a Tier-2 reporting bot (no state changes).`,
          executed_at: timestamp,
        };
    }

    result.run_id = runId;
    await recordBotRun(runId, botId, companyId, result.success ? 'completed' : 'failed', triggerType, result, db);
    
    return result;
  } catch (error) {
    const errorMessage = String(error);
    await createEscalationTask(botId, companyId, errorMessage, { config, run_id: runId }, db);
    await recordBotRun(runId, botId, companyId, 'failed', triggerType, { error: errorMessage }, db);

    return {
      success: false,
      run_id: runId,
      bot_id: botId,
      company_id: companyId,
      state_changed: false,
      message: errorMessage,
      executed_at: timestamp,
      error: 'Bot execution failed'
    };
  }
}

export async function executeScheduledBots(db: D1Database): Promise<{ executed: number; results: BotExecutionResult[] }> {
  console.log('Starting scheduled bot execution with REAL bot logic...');
  
  const results: BotExecutionResult[] = [];
  
  try {
    const scheduledBots = await db.prepare(`
      SELECT bc.bot_id, bc.company_id, bc.schedule, bc.enabled, bc.config
      FROM bot_configs bc
      WHERE bc.enabled = 1 AND bc.schedule IS NOT NULL
    `).all();

    if (!scheduledBots.results?.length) {
      console.log('No scheduled bots found');
      return { executed: 0, results: [] };
    }

    console.log(`Found ${scheduledBots.results.length} scheduled bots`);

    for (const botConfig of scheduledBots.results as unknown as BotConfig[]) {
      try {
        console.log(`Executing bot ${botConfig.bot_id} for company ${botConfig.company_id}`);
        
        const config = botConfig.config ? JSON.parse(botConfig.config) : {};
        const result = await executeBotById(
          botConfig.bot_id,
          botConfig.company_id,
          config,
          db,
          'scheduled'
        );
        
        results.push(result);
        console.log(`Bot ${botConfig.bot_id} execution completed: ${result.message}`);
      } catch (botError) {
        console.error(`Error executing bot ${botConfig.bot_id}:`, botError);
        
        await createEscalationTask(
          botConfig.bot_id,
          botConfig.company_id,
          String(botError),
          { schedule: botConfig.schedule },
          db
        );
      }
    }

    console.log(`Scheduled bot execution completed. Executed ${results.length} bots.`);
    return { executed: results.length, results };
  } catch (error) {
    console.error('Error in scheduled bot execution:', error);
    return { executed: 0, results: [] };
  }
}

export { TIER1_BOTS, SYSTEM_USER_ID };
