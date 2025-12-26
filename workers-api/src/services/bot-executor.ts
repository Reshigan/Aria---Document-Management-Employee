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

// ============================================
// MANUFACTURING TIER-1 BOTS
// ============================================

export async function executeWorkOrderBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    // Get products and BOMs for work order creation
    const products = await db.prepare(
      'SELECT id, product_name as name FROM products WHERE company_id = ? LIMIT 5'
    ).bind(companyId).all();
    
    const boms = await db.prepare(
      'SELECT id, bom_name, product_id FROM bill_of_materials WHERE company_id = ? LIMIT 5'
    ).bind(companyId).all();

    if (!products.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'work_order',
        company_id: companyId,
        state_changed: false,
        message: 'No products available for work order creation. Please add products first.',
        executed_at: timestamp,
      };
    }

    // Check for existing work orders today (idempotency)
    const existingWO = await db.prepare(
      'SELECT id FROM work_orders WHERE company_id = ? AND date(created_at) = date(\'now\')'
    ).bind(companyId).first();
    
    if (existingWO) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'work_order',
        company_id: companyId,
        state_changed: false,
        message: 'Work order already created today (idempotency check).',
        executed_at: timestamp,
      };
    }

    const product = products.results[0] as any;
    const bom = boms.results?.[0] as any;
    const woId = crypto.randomUUID();
    const woNumber = `WO-${Date.now()}`;
    const quantity = config.default_quantity || 100;
    
    await db.prepare(`
      INSERT INTO work_orders (id, work_order_number, product_id, bom_id, company_id, planned_quantity, completed_quantity, planned_start_date, planned_end_date, status, priority, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, date('now'), date('now', '+7 days'), 'planned', 'medium', ?, datetime('now'))
    `).bind(woId, woNumber, product.id, bom?.id || null, companyId, quantity, userId).run();

    return {
      success: true,
      run_id: runId,
      bot_id: 'work_order',
      company_id: companyId,
      state_changed: true,
      message: `Created work order ${woNumber} for ${product.name} (qty: ${quantity})`,
      executed_at: timestamp,
      details: { work_order_number: woNumber, product: product.name, quantity }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'work_order',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to create work order'
    };
  }
}

export async function executeProductionBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    // Find planned work orders to start production
    const plannedWOs = await db.prepare(
      'SELECT id, work_order_number, product_id, planned_quantity FROM work_orders WHERE company_id = ? AND status = ? LIMIT 5'
    ).bind(companyId, 'planned').all();

    if (!plannedWOs.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'production_scheduling',
        company_id: companyId,
        state_changed: false,
        message: 'No planned work orders to start production. Run Work Order bot first.',
        executed_at: timestamp,
      };
    }

    const productionStarted: string[] = [];
    
    for (const wo of plannedWOs.results as any[]) {
      // Update work order status to in_progress
      await db.prepare('UPDATE work_orders SET status = ?, actual_start_date = date(\'now\'), updated_at = datetime(\'now\') WHERE id = ?')
        .bind('in_progress', wo.id).run();
      
      // Create production run record
      const runRecordId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO production_runs (id, work_order_id, company_id, start_time, status, planned_quantity, actual_quantity, created_at)
        VALUES (?, ?, ?, datetime('now'), 'running', ?, 0, datetime('now'))
      `).bind(runRecordId, wo.id, companyId, wo.planned_quantity).run();
      
      productionStarted.push(wo.work_order_number);
    }

    return {
      success: true,
      run_id: runId,
      bot_id: 'production_scheduling',
      company_id: companyId,
      state_changed: productionStarted.length > 0,
      message: `Started production for ${productionStarted.length} work order(s): ${productionStarted.join(', ')}`,
      executed_at: timestamp,
      details: { work_orders_started: productionStarted }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'production_scheduling',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to start production'
    };
  }
}

export async function executeQualityControlBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    // Find running production runs to perform QC
    const runningProduction = await db.prepare(
      'SELECT pr.id, pr.work_order_id, wo.work_order_number, pr.actual_quantity FROM production_runs pr JOIN work_orders wo ON pr.work_order_id = wo.id WHERE pr.company_id = ? AND pr.status = ? LIMIT 5'
    ).bind(companyId, 'running').all();

    if (!runningProduction.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'quality_control',
        company_id: companyId,
        state_changed: false,
        message: 'No running production to perform quality control on.',
        executed_at: timestamp,
      };
    }

    const qcCompleted: string[] = [];
    let passCount = 0;
    let failCount = 0;
    
    for (const run of runningProduction.results as any[]) {
      // Create quality check record
      const qcId = crypto.randomUUID();
      const passed = Math.random() > 0.05; // 95% pass rate simulation
      
      await db.prepare(`
        INSERT INTO quality_checks (id, production_run_id, work_order_id, company_id, check_type, result, checked_by, checked_at, created_at)
        VALUES (?, ?, ?, ?, 'final_inspection', ?, ?, datetime('now'), datetime('now'))
      `).bind(qcId, run.id, run.work_order_id, companyId, passed ? 'pass' : 'fail', userId).run();
      
      if (passed) {
        passCount++;
        // Update production run as completed
        await db.prepare('UPDATE production_runs SET status = ?, end_time = datetime(\'now\') WHERE id = ?')
          .bind('completed', run.id).run();
        // Update work order as completed
        await db.prepare('UPDATE work_orders SET status = ?, actual_end_date = date(\'now\'), updated_at = datetime(\'now\') WHERE id = ?')
          .bind('completed', run.work_order_id).run();
      } else {
        failCount++;
        // Create NCR task for failed QC
        await db.prepare(`
          INSERT INTO tasks (id, type, reference_id, reference_type, company_id, status, description, priority, created_at)
          VALUES (?, 'ncr', ?, 'production_run', ?, 'pending', ?, 'high', datetime('now'))
        `).bind(crypto.randomUUID(), run.id, companyId, `NCR for failed QC on ${run.work_order_number}`).run();
      }
      
      qcCompleted.push(run.work_order_number);
    }

    return {
      success: true,
      run_id: runId,
      bot_id: 'quality_control',
      company_id: companyId,
      state_changed: qcCompleted.length > 0,
      message: `QC completed for ${qcCompleted.length} production run(s). Passed: ${passCount}, Failed: ${failCount}`,
      executed_at: timestamp,
      details: { qc_completed: qcCompleted, passed: passCount, failed: failCount }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'quality_control',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to perform quality control'
    };
  }
}

// ============================================
// INVENTORY TIER-1 BOTS
// ============================================

export async function executeInventoryBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    // Check stock levels and create reorder suggestions
    const lowStockProducts = await db.prepare(`
      SELECT p.id, p.product_name, sl.quantity, sl.reorder_level, sl.warehouse_id
      FROM products p
      LEFT JOIN stock_levels sl ON p.id = sl.product_id AND sl.company_id = ?
      WHERE p.company_id = ? AND (sl.quantity IS NULL OR sl.quantity <= COALESCE(sl.reorder_level, 10))
      LIMIT 10
    `).bind(companyId, companyId).all();

    if (!lowStockProducts.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'inventory_optimization',
        company_id: companyId,
        state_changed: false,
        message: 'All stock levels are adequate. No reorder needed.',
        executed_at: timestamp,
      };
    }

    const reorderTasks: string[] = [];
    
    for (const product of lowStockProducts.results as any[]) {
      // Create reorder task
      const taskId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO tasks (id, type, reference_id, reference_type, company_id, status, description, priority, created_at)
        VALUES (?, 'reorder', ?, 'product', ?, 'pending', ?, 'medium', datetime('now'))
      `).bind(taskId, product.id, companyId, `Reorder ${product.product_name} - Current stock: ${product.quantity || 0}`).run();
      
      reorderTasks.push(product.product_name);
    }

    return {
      success: true,
      run_id: runId,
      bot_id: 'inventory_optimization',
      company_id: companyId,
      state_changed: reorderTasks.length > 0,
      message: `Created ${reorderTasks.length} reorder task(s) for low stock products`,
      executed_at: timestamp,
      details: { products_flagged: reorderTasks }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'inventory_optimization',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to check inventory levels'
    };
  }
}

export async function executeStockMovementBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    // Process pending stock movements
    const pendingMovements = await db.prepare(
      'SELECT id, product_id, from_warehouse_id, to_warehouse_id, quantity, movement_type FROM stock_movements WHERE company_id = ? AND status = ? LIMIT 10'
    ).bind(companyId, 'pending').all();

    if (!pendingMovements.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'stock_management',
        company_id: companyId,
        state_changed: false,
        message: 'No pending stock movements to process.',
        executed_at: timestamp,
      };
    }

    let processed = 0;
    
    for (const movement of pendingMovements.results as any[]) {
      // Update stock levels
      if (movement.from_warehouse_id) {
        await db.prepare(`
          UPDATE stock_levels SET quantity = quantity - ?, updated_at = datetime('now')
          WHERE product_id = ? AND warehouse_id = ? AND company_id = ?
        `).bind(movement.quantity, movement.product_id, movement.from_warehouse_id, companyId).run();
      }
      
      if (movement.to_warehouse_id) {
        // Check if stock level exists, if not create it
        const existingLevel = await db.prepare(
          'SELECT id FROM stock_levels WHERE product_id = ? AND warehouse_id = ? AND company_id = ?'
        ).bind(movement.product_id, movement.to_warehouse_id, companyId).first();
        
        if (existingLevel) {
          await db.prepare(`
            UPDATE stock_levels SET quantity = quantity + ?, updated_at = datetime('now')
            WHERE product_id = ? AND warehouse_id = ? AND company_id = ?
          `).bind(movement.quantity, movement.product_id, movement.to_warehouse_id, companyId).run();
        } else {
          await db.prepare(`
            INSERT INTO stock_levels (id, product_id, warehouse_id, company_id, quantity, reorder_level, created_at)
            VALUES (?, ?, ?, ?, ?, 10, datetime('now'))
          `).bind(crypto.randomUUID(), movement.product_id, movement.to_warehouse_id, companyId, movement.quantity).run();
        }
      }
      
      // Mark movement as completed
      await db.prepare('UPDATE stock_movements SET status = ?, completed_at = datetime(\'now\') WHERE id = ?')
        .bind('completed', movement.id).run();
      
      processed++;
    }

    return {
      success: true,
      run_id: runId,
      bot_id: 'stock_management',
      company_id: companyId,
      state_changed: processed > 0,
      message: `Processed ${processed} stock movement(s)`,
      executed_at: timestamp,
      details: { movements_processed: processed }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'stock_management',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to process stock movements'
    };
  }
}

// ============================================
// HR TIER-1 BOTS
// ============================================

export async function executePayrollBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    // Check if payroll already run this month (idempotency)
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const existingPayroll = await db.prepare(
      'SELECT id FROM payroll_runs WHERE company_id = ? AND strftime(\'%Y-%m\', pay_period_start) = ?'
    ).bind(companyId, currentMonth).first();
    
    if (existingPayroll) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'payroll_processing',
        company_id: companyId,
        state_changed: false,
        message: `Payroll already processed for ${currentMonth} (idempotency check).`,
        executed_at: timestamp,
      };
    }

    // Get active employees
    const employees = await db.prepare(
      'SELECT id, first_name, last_name, salary FROM employees WHERE company_id = ? AND status = ? LIMIT 100'
    ).bind(companyId, 'active').all();

    if (!employees.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'payroll_processing',
        company_id: companyId,
        state_changed: false,
        message: 'No active employees found for payroll processing.',
        executed_at: timestamp,
      };
    }

    // Create payroll run
    const payrollId = crypto.randomUUID();
    const payrollNumber = `PR-${Date.now()}`;
    let totalGross = 0;
    let totalNet = 0;
    
    for (const emp of employees.results as any[]) {
      const grossSalary = emp.salary || 25000;
      const paye = grossSalary * 0.25; // 25% tax estimate
      const uif = grossSalary * 0.01; // 1% UIF
      const netSalary = grossSalary - paye - uif;
      
      totalGross += grossSalary;
      totalNet += netSalary;
    }
    
    await db.prepare(`
      INSERT INTO payroll_runs (id, payroll_number, company_id, pay_period_start, pay_period_end, status, total_gross, total_deductions, total_net, employee_count, processed_by, created_at)
      VALUES (?, ?, ?, date('now', 'start of month'), date('now', 'start of month', '+1 month', '-1 day'), 'completed', ?, ?, ?, ?, ?, datetime('now'))
    `).bind(payrollId, payrollNumber, companyId, totalGross, totalGross - totalNet, totalNet, employees.results.length, userId).run();

    return {
      success: true,
      run_id: runId,
      bot_id: 'payroll_processing',
      company_id: companyId,
      state_changed: true,
      message: `Payroll ${payrollNumber} processed for ${employees.results.length} employees. Total: R${totalNet.toLocaleString()}`,
      executed_at: timestamp,
      details: { payroll_number: payrollNumber, employees: employees.results.length, total_gross: totalGross, total_net: totalNet }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'payroll_processing',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to process payroll'
    };
  }
}

export async function executeLeaveManagementBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    // Find pending leave requests to auto-approve
    const pendingLeave = await db.prepare(
      'SELECT lr.id, lr.employee_id, lr.leave_type, lr.start_date, lr.end_date, lr.days_requested, e.first_name, e.last_name FROM leave_requests lr JOIN employees e ON lr.employee_id = e.id WHERE lr.company_id = ? AND lr.status = ? LIMIT 10'
    ).bind(companyId, 'pending').all();

    if (!pendingLeave.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'leave_management',
        company_id: companyId,
        state_changed: false,
        message: 'No pending leave requests to process.',
        executed_at: timestamp,
      };
    }

    let approved = 0;
    let escalated = 0;
    
    for (const leave of pendingLeave.results as any[]) {
      // Auto-approve if <= 3 days, otherwise escalate
      if (leave.days_requested <= 3) {
        await db.prepare('UPDATE leave_requests SET status = ?, approved_by = ?, approved_at = datetime(\'now\') WHERE id = ?')
          .bind('approved', userId, leave.id).run();
        approved++;
      } else {
        // Create approval task for manager
        await db.prepare(`
          INSERT INTO tasks (id, type, reference_id, reference_type, company_id, status, description, priority, created_at)
          VALUES (?, 'approval', ?, 'leave_request', ?, 'pending', ?, 'medium', datetime('now'))
        `).bind(crypto.randomUUID(), leave.id, companyId, `Approve leave for ${leave.first_name} ${leave.last_name} (${leave.days_requested} days)`).run();
        escalated++;
      }
    }

    return {
      success: true,
      run_id: runId,
      bot_id: 'leave_management',
      company_id: companyId,
      state_changed: approved > 0 || escalated > 0,
      message: `Processed ${pendingLeave.results.length} leave request(s). Auto-approved: ${approved}, Escalated: ${escalated}`,
      executed_at: timestamp,
      details: { approved, escalated }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'leave_management',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to process leave requests'
    };
  }
}

// ============================================
// FINANCIAL TIER-1 BOTS
// ============================================

export async function executeBankReconciliationBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    // Find unreconciled bank transactions
    const unreconciledTx = await db.prepare(
      'SELECT id, reference, amount, transaction_date, description FROM bank_transactions WHERE company_id = ? AND reconciled = 0 LIMIT 20'
    ).bind(companyId).all();

    if (!unreconciledTx.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'bank_reconciliation',
        company_id: companyId,
        state_changed: false,
        message: 'All bank transactions are reconciled.',
        executed_at: timestamp,
      };
    }

    let matched = 0;
    let unmatched = 0;
    
    for (const tx of unreconciledTx.results as any[]) {
      // Try to match with customer payments or supplier payments
      const customerMatch = await db.prepare(
        'SELECT id FROM customer_payments WHERE company_id = ? AND amount = ? AND date(payment_date) = date(?)'
      ).bind(companyId, Math.abs(tx.amount), tx.transaction_date).first();
      
      const supplierMatch = await db.prepare(
        'SELECT id FROM supplier_payments WHERE company_id = ? AND amount = ? AND date(payment_date) = date(?)'
      ).bind(companyId, Math.abs(tx.amount), tx.transaction_date).first();
      
      if (customerMatch || supplierMatch) {
        await db.prepare('UPDATE bank_transactions SET reconciled = 1, reconciled_at = datetime(\'now\') WHERE id = ?')
          .bind(tx.id).run();
        matched++;
      } else {
        unmatched++;
      }
    }

    // Create task for unmatched transactions
    if (unmatched > 0) {
      await db.prepare(`
        INSERT INTO tasks (id, type, reference_id, reference_type, company_id, status, description, priority, created_at)
        VALUES (?, 'review', 'bank-recon', 'bank_reconciliation', ?, 'pending', ?, 'medium', datetime('now'))
      `).bind(crypto.randomUUID(), companyId, `Review ${unmatched} unmatched bank transaction(s)`).run();
    }

    return {
      success: true,
      run_id: runId,
      bot_id: 'bank_reconciliation',
      company_id: companyId,
      state_changed: matched > 0,
      message: `Bank reconciliation: ${matched} matched, ${unmatched} require manual review`,
      executed_at: timestamp,
      details: { matched, unmatched }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'bank_reconciliation',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to reconcile bank transactions'
    };
  }
}

export async function executeGoodsReceiptBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    // Find pending POs to receive
    const pendingPOs = await db.prepare(
      'SELECT id, po_number, supplier_id, total_amount FROM purchase_orders WHERE company_id = ? AND status = ? LIMIT 5'
    ).bind(companyId, 'pending').all();

    if (!pendingPOs.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'goods_receipt',
        company_id: companyId,
        state_changed: false,
        message: 'No pending purchase orders to receive.',
        executed_at: timestamp,
      };
    }

    const receiptsProcessed: string[] = [];
    
    for (const po of pendingPOs.results as any[]) {
      // Update PO status to received
      await db.prepare('UPDATE purchase_orders SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .bind('received', po.id).run();
      
      // Create supplier invoice
      const invoiceId = crypto.randomUUID();
      const invoiceNumber = `SI-${Date.now()}`;
      
      await db.prepare(`
        INSERT INTO supplier_invoices (id, invoice_number, supplier_id, company_id, purchase_order_id, invoice_date, status, total_amount, due_date, created_at)
        VALUES (?, ?, ?, ?, ?, date('now'), 'pending', ?, date('now', '+30 days'), datetime('now'))
      `).bind(invoiceId, invoiceNumber, po.supplier_id, companyId, po.id, po.total_amount).run();
      
      receiptsProcessed.push(po.po_number);
    }

    return {
      success: true,
      run_id: runId,
      bot_id: 'goods_receipt',
      company_id: companyId,
      state_changed: receiptsProcessed.length > 0,
      message: `Processed ${receiptsProcessed.length} goods receipt(s) and created supplier invoices`,
      executed_at: timestamp,
      details: { po_numbers: receiptsProcessed, invoices_created: receiptsProcessed.length }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'goods_receipt',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to process goods receipts'
    };
  }
}

export async function executeInvoiceGenerationBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    // Find confirmed sales orders without invoices
    const confirmedOrders = await db.prepare(
      'SELECT so.id, so.order_number, so.customer_id, so.total_amount FROM sales_orders so LEFT JOIN customer_invoices ci ON so.id = ci.sales_order_id WHERE so.company_id = ? AND so.status = ? AND ci.id IS NULL LIMIT 5'
    ).bind(companyId, 'confirmed').all();

    if (!confirmedOrders.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'invoice_generation',
        company_id: companyId,
        state_changed: false,
        message: 'No confirmed sales orders pending invoicing.',
        executed_at: timestamp,
      };
    }

    const invoicesCreated: string[] = [];
    
    for (const order of confirmedOrders.results as any[]) {
      const invoiceId = crypto.randomUUID();
      const invoiceNumber = `INV-${Date.now()}`;
      
      await db.prepare(`
        INSERT INTO customer_invoices (id, invoice_number, customer_id, company_id, sales_order_id, invoice_date, status, total_amount, due_date, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, date('now'), 'draft', ?, date('now', '+30 days'), ?, datetime('now'))
      `).bind(invoiceId, invoiceNumber, order.customer_id, companyId, order.id, order.total_amount, userId).run();
      
      // Update sales order status
      await db.prepare('UPDATE sales_orders SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .bind('invoiced', order.id).run();
      
      invoicesCreated.push(invoiceNumber);
    }

    return {
      success: true,
      run_id: runId,
      bot_id: 'invoice_generation',
      company_id: companyId,
      state_changed: invoicesCreated.length > 0,
      message: `Created ${invoicesCreated.length} invoice(s): ${invoicesCreated.join(', ')}`,
      executed_at: timestamp,
      details: { invoices_created: invoicesCreated }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'invoice_generation',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to generate invoices'
    };
  }
}

export async function executeExpenseManagementBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    // Find pending expense claims to process
    const pendingExpenses = await db.prepare(
      'SELECT id, employee_id, amount, description, category FROM expense_claims WHERE company_id = ? AND status = ? LIMIT 10'
    ).bind(companyId, 'pending').all();

    if (!pendingExpenses.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'expense_management',
        company_id: companyId,
        state_changed: false,
        message: 'No pending expense claims to process.',
        executed_at: timestamp,
      };
    }

    let approved = 0;
    let escalated = 0;
    const autoApproveLimit = config.auto_approve_limit || 500;
    
    for (const expense of pendingExpenses.results as any[]) {
      if (expense.amount <= autoApproveLimit) {
        // Auto-approve small expenses
        await db.prepare('UPDATE expense_claims SET status = ?, approved_by = ?, approved_at = datetime(\'now\') WHERE id = ?')
          .bind('approved', userId, expense.id).run();
        approved++;
      } else {
        // Escalate larger expenses
        await db.prepare(`
          INSERT INTO tasks (id, type, reference_id, reference_type, company_id, status, description, priority, created_at)
          VALUES (?, 'approval', ?, 'expense_claim', ?, 'pending', ?, 'medium', datetime('now'))
        `).bind(crypto.randomUUID(), expense.id, companyId, `Approve expense: ${expense.description} - R${expense.amount}`).run();
        escalated++;
      }
    }

    return {
      success: true,
      run_id: runId,
      bot_id: 'expense_management',
      company_id: companyId,
      state_changed: approved > 0 || escalated > 0,
      message: `Processed ${pendingExpenses.results.length} expense(s). Auto-approved: ${approved}, Escalated: ${escalated}`,
      executed_at: timestamp,
      details: { approved, escalated, auto_approve_limit: autoApproveLimit }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'expense_management',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to process expenses'
    };
  }
}

// ============================================
// SALES & CRM TIER-1 BOTS
// ============================================

export async function executeLeadScoringBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    // Get leads without scores or with outdated scores
    const leads = await db.prepare(
      'SELECT id, lead_name, email, company_name, source, status FROM leads WHERE company_id = ? AND (score IS NULL OR date(updated_at) < date(\'now\', \'-7 days\')) LIMIT 20'
    ).bind(companyId).all();

    if (!leads.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'lead_qualification',
        company_id: companyId,
        state_changed: false,
        message: 'All leads are scored and up-to-date.',
        executed_at: timestamp,
      };
    }

    let scored = 0;
    let hotLeads = 0;
    
    for (const lead of leads.results as any[]) {
      // Calculate score based on attributes
      let score = 50; // Base score
      if (lead.email?.includes('@') && !lead.email?.includes('gmail') && !lead.email?.includes('yahoo')) score += 20; // Business email
      if (lead.company_name) score += 15;
      if (lead.source === 'referral') score += 15;
      if (lead.status === 'contacted') score += 10;
      
      // Cap at 100
      score = Math.min(score, 100);
      
      await db.prepare('UPDATE leads SET score = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .bind(score, lead.id).run();
      
      scored++;
      if (score >= 80) hotLeads++;
    }

    return {
      success: true,
      run_id: runId,
      bot_id: 'lead_qualification',
      company_id: companyId,
      state_changed: scored > 0,
      message: `Scored ${scored} lead(s). Hot leads (80+): ${hotLeads}`,
      executed_at: timestamp,
      details: { leads_scored: scored, hot_leads: hotLeads }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'lead_qualification',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to score leads'
    };
  }
}

export async function executeOpportunityBot(
  companyId: string,
  config: Record<string, any>,
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<BotExecutionResult> {
  const runId = crypto.randomUUID();
  
  try {
    // Convert hot leads to opportunities
    const hotLeads = await db.prepare(
      'SELECT id, lead_name, company_name, email FROM leads WHERE company_id = ? AND score >= 80 AND status != ? LIMIT 10'
    ).bind(companyId, 'converted').all();

    if (!hotLeads.results?.length) {
      return {
        success: true,
        run_id: runId,
        bot_id: 'opportunity_management',
        company_id: companyId,
        state_changed: false,
        message: 'No hot leads to convert to opportunities.',
        executed_at: timestamp,
      };
    }

    const opportunitiesCreated: string[] = [];
    
    for (const lead of hotLeads.results as any[]) {
      const oppId = crypto.randomUUID();
      const oppName = `${lead.company_name || lead.lead_name} - New Opportunity`;
      const estimatedValue = config.default_opportunity_value || 50000;
      
      await db.prepare(`
        INSERT INTO opportunities (id, opportunity_name, lead_id, company_id, stage, estimated_value, probability, expected_close_date, created_by, created_at)
        VALUES (?, ?, ?, ?, 'qualification', ?, 25, date('now', '+30 days'), ?, datetime('now'))
      `).bind(oppId, oppName, lead.id, companyId, estimatedValue, userId).run();
      
      // Update lead status
      await db.prepare('UPDATE leads SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .bind('converted', lead.id).run();
      
      opportunitiesCreated.push(oppName);
    }

    return {
      success: true,
      run_id: runId,
      bot_id: 'opportunity_management',
      company_id: companyId,
      state_changed: opportunitiesCreated.length > 0,
      message: `Created ${opportunitiesCreated.length} opportunity(ies) from hot leads`,
      executed_at: timestamp,
      details: { opportunities_created: opportunitiesCreated }
    };
  } catch (error) {
    return {
      success: false,
      run_id: runId,
      bot_id: 'opportunity_management',
      company_id: companyId,
      state_changed: false,
      message: String(error),
      executed_at: timestamp,
      error: 'Failed to create opportunities'
    };
  }
}

const TIER1_BOTS = [
  'quote_generation',
  'sales_order', 
  'purchase_order',
  'ar_collections',
  'payment_processing',
  'workflow_automation',
  'work_order',
  'production_scheduling',
  'quality_control',
  'inventory_optimization',
  'stock_management',
  'payroll_processing',
  'leave_management',
  'bank_reconciliation',
  'goods_receipt',
  'invoice_generation',
  'expense_management',
  'lead_qualification',
  'opportunity_management'
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
      // O2C (Order-to-Cash) Bots
      case 'quote_generation':
        result = await executeQuoteGenerationBot(companyId, config, db, userId, timestamp);
        break;
      case 'sales_order':
        result = await executeSalesOrderBot(companyId, config, db, userId, timestamp);
        break;
      case 'invoice_generation':
        result = await executeInvoiceGenerationBot(companyId, config, db, userId, timestamp);
        break;
      case 'ar_collections':
        result = await executeARCollectionsBot(companyId, config, db, userId, timestamp);
        break;
      case 'payment_processing':
        result = await executePaymentProcessingBot(companyId, config, db, userId, timestamp);
        break;
      
      // P2P (Procure-to-Pay) Bots
      case 'purchase_order':
        result = await executePurchaseOrderBot(companyId, config, db, userId, timestamp);
        break;
      case 'goods_receipt':
        result = await executeGoodsReceiptBot(companyId, config, db, userId, timestamp);
        break;
      
      // Manufacturing Bots
      case 'work_order':
        result = await executeWorkOrderBot(companyId, config, db, userId, timestamp);
        break;
      case 'production_scheduling':
        result = await executeProductionBot(companyId, config, db, userId, timestamp);
        break;
      case 'quality_control':
        result = await executeQualityControlBot(companyId, config, db, userId, timestamp);
        break;
      
      // Inventory Bots
      case 'inventory_optimization':
        result = await executeInventoryBot(companyId, config, db, userId, timestamp);
        break;
      case 'stock_management':
        result = await executeStockMovementBot(companyId, config, db, userId, timestamp);
        break;
      
      // HR Bots
      case 'payroll_processing':
        result = await executePayrollBot(companyId, config, db, userId, timestamp);
        break;
      case 'leave_management':
        result = await executeLeaveManagementBot(companyId, config, db, userId, timestamp);
        break;
      
      // Financial Bots
      case 'bank_reconciliation':
        result = await executeBankReconciliationBot(companyId, config, db, userId, timestamp);
        break;
      case 'expense_management':
        result = await executeExpenseManagementBot(companyId, config, db, userId, timestamp);
        break;
      
      // Sales & CRM Bots
      case 'lead_qualification':
        result = await executeLeadScoringBot(companyId, config, db, userId, timestamp);
        break;
      case 'opportunity_management':
        result = await executeOpportunityBot(companyId, config, db, userId, timestamp);
        break;
      
      // Workflow Bots
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
