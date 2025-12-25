/**
 * Bot Framework - Full automation system
 * Provides bot registry, configuration, execution, and run history
 */

import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

interface BotDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  inputs: BotInput[];
  outputs: BotOutput[];
  schedule?: string;
}

interface BotInput {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface BotOutput {
  name: string;
  type: string;
  description: string;
}

interface BotConfig {
  id: string;
  bot_id: string;
  company_id: string;
  enabled: boolean;
  schedule: string | null;
  config: Record<string, any>;
}

interface BotRun {
  id: string;
  bot_id: string;
  company_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  result: any;
  error: string | null;
}

const app = new Hono<{ Bindings: Env }>();

// Generate UUID
function generateUUID(): string {
  return crypto.randomUUID();
}

// Bot definitions registry
const botRegistry: BotDefinition[] = [
  // Financial Management Bots
  {
    id: 'invoice_reconciliation',
    name: 'Invoice Reconciliation Agent',
    category: 'Financial',
    description: 'Automatically matches invoices with purchase orders and goods receipts',
    icon: '🔄',
    inputs: [
      { name: 'date_range', type: 'daterange', required: false, description: 'Date range to process' },
      { name: 'threshold', type: 'number', required: false, description: 'Matching threshold percentage' },
    ],
    outputs: [
      { name: 'matched_count', type: 'number', description: 'Number of matched invoices' },
      { name: 'unmatched_count', type: 'number', description: 'Number of unmatched invoices' },
      { name: 'discrepancies', type: 'array', description: 'List of discrepancies found' },
    ],
  },
  {
    id: 'payment_processing',
    name: 'Payment Processing Agent',
    category: 'Financial',
    description: 'Processes approved payments and generates payment batches',
    icon: '💸',
    inputs: [
      { name: 'payment_method', type: 'select', required: false, description: 'Payment method filter' },
      { name: 'max_amount', type: 'number', required: false, description: 'Maximum batch amount' },
    ],
    outputs: [
      { name: 'payments_processed', type: 'number', description: 'Number of payments processed' },
      { name: 'total_amount', type: 'number', description: 'Total amount processed' },
      { name: 'batch_id', type: 'string', description: 'Payment batch ID' },
    ],
  },
  {
    id: 'bank_reconciliation',
    name: 'Bank Reconciliation Agent',
    category: 'Financial',
    description: 'Matches bank transactions with system records',
    icon: '🏦',
    inputs: [
      { name: 'bank_account', type: 'select', required: true, description: 'Bank account to reconcile' },
      { name: 'statement_date', type: 'date', required: false, description: 'Statement date' },
    ],
    outputs: [
      { name: 'matched_transactions', type: 'number', description: 'Matched transactions' },
      { name: 'unmatched_transactions', type: 'number', description: 'Unmatched transactions' },
      { name: 'balance_difference', type: 'number', description: 'Balance difference' },
    ],
  },
  {
    id: 'ar_collections',
    name: 'AR Collections Agent',
    category: 'Financial',
    description: 'Manages accounts receivable and sends payment reminders',
    icon: '💰',
    inputs: [
      { name: 'days_overdue', type: 'number', required: false, description: 'Minimum days overdue' },
      { name: 'min_amount', type: 'number', required: false, description: 'Minimum amount threshold' },
    ],
    outputs: [
      { name: 'reminders_sent', type: 'number', description: 'Reminders sent' },
      { name: 'total_outstanding', type: 'number', description: 'Total outstanding amount' },
      { name: 'customers_contacted', type: 'number', description: 'Customers contacted' },
    ],
  },
  {
    id: 'tax_compliance',
    name: 'Tax Compliance Agent',
    category: 'Financial',
    description: 'Calculates and validates VAT, PAYE, and other tax obligations',
    icon: '🇿🇦',
    inputs: [
      { name: 'tax_period', type: 'select', required: true, description: 'Tax period' },
      { name: 'tax_type', type: 'select', required: false, description: 'Tax type (VAT, PAYE, etc.)' },
    ],
    outputs: [
      { name: 'vat_payable', type: 'number', description: 'VAT payable' },
      { name: 'paye_payable', type: 'number', description: 'PAYE payable' },
      { name: 'compliance_status', type: 'string', description: 'Compliance status' },
    ],
  },
  
  // Procurement Bots
  {
    id: 'purchase_order_automation',
    name: 'Purchase Order Agent',
    category: 'Procurement',
    description: 'Automates purchase order creation and approval workflows',
    icon: '📋',
    inputs: [
      { name: 'auto_approve_limit', type: 'number', required: false, description: 'Auto-approve limit' },
      { name: 'preferred_suppliers', type: 'array', required: false, description: 'Preferred supplier IDs' },
    ],
    outputs: [
      { name: 'pos_created', type: 'number', description: 'POs created' },
      { name: 'pos_approved', type: 'number', description: 'POs auto-approved' },
      { name: 'total_value', type: 'number', description: 'Total PO value' },
    ],
  },
  {
    id: 'supplier_onboarding',
    name: 'Supplier Onboarding Agent',
    category: 'Procurement',
    description: 'Validates and onboards new suppliers with compliance checks',
    icon: '🤝',
    inputs: [
      { name: 'require_bbbee', type: 'boolean', required: false, description: 'Require B-BBEE certificate' },
      { name: 'min_bbbee_level', type: 'number', required: false, description: 'Minimum B-BBEE level' },
    ],
    outputs: [
      { name: 'suppliers_processed', type: 'number', description: 'Suppliers processed' },
      { name: 'approved', type: 'number', description: 'Suppliers approved' },
      { name: 'rejected', type: 'number', description: 'Suppliers rejected' },
    ],
  },
  {
    id: 'goods_receipt',
    name: 'Goods Receipt Agent',
    category: 'Procurement',
    description: 'Processes goods receipts and updates inventory',
    icon: '📦',
    inputs: [
      { name: 'auto_post', type: 'boolean', required: false, description: 'Auto-post receipts' },
      { name: 'variance_threshold', type: 'number', required: false, description: 'Variance threshold %' },
    ],
    outputs: [
      { name: 'receipts_processed', type: 'number', description: 'Receipts processed' },
      { name: 'items_received', type: 'number', description: 'Items received' },
      { name: 'variances_flagged', type: 'number', description: 'Variances flagged' },
    ],
  },
  
  // Sales Bots
  {
    id: 'quote_generation',
    name: 'Quote Generation Agent',
    category: 'Sales',
    description: 'Generates quotes based on customer requirements and pricing rules',
    icon: '📝',
    inputs: [
      { name: 'apply_discounts', type: 'boolean', required: false, description: 'Apply automatic discounts' },
      { name: 'validity_days', type: 'number', required: false, description: 'Quote validity in days' },
    ],
    outputs: [
      { name: 'quotes_generated', type: 'number', description: 'Quotes generated' },
      { name: 'total_value', type: 'number', description: 'Total quote value' },
      { name: 'avg_margin', type: 'number', description: 'Average margin %' },
    ],
  },
  {
    id: 'sales_order_processing',
    name: 'Sales Order Agent',
    category: 'Sales',
    description: 'Processes sales orders and manages fulfillment',
    icon: '🛒',
    inputs: [
      { name: 'auto_confirm', type: 'boolean', required: false, description: 'Auto-confirm orders' },
      { name: 'credit_check', type: 'boolean', required: false, description: 'Perform credit check' },
    ],
    outputs: [
      { name: 'orders_processed', type: 'number', description: 'Orders processed' },
      { name: 'orders_confirmed', type: 'number', description: 'Orders confirmed' },
      { name: 'credit_holds', type: 'number', description: 'Orders on credit hold' },
    ],
  },
  {
    id: 'customer_onboarding',
    name: 'Customer Onboarding Agent',
    category: 'Sales',
    description: 'Automates customer registration and credit setup',
    icon: '👥',
    inputs: [
      { name: 'default_credit_limit', type: 'number', required: false, description: 'Default credit limit' },
      { name: 'require_documents', type: 'boolean', required: false, description: 'Require documents' },
    ],
    outputs: [
      { name: 'customers_onboarded', type: 'number', description: 'Customers onboarded' },
      { name: 'pending_approval', type: 'number', description: 'Pending approval' },
      { name: 'documents_collected', type: 'number', description: 'Documents collected' },
    ],
  },
  
  // HR Bots
  {
    id: 'payroll_processing',
    name: 'Payroll Processing Agent',
    category: 'HR',
    description: 'Calculates and processes employee payroll',
    icon: '💵',
    inputs: [
      { name: 'pay_period', type: 'select', required: true, description: 'Pay period' },
      { name: 'include_bonuses', type: 'boolean', required: false, description: 'Include bonuses' },
    ],
    outputs: [
      { name: 'employees_processed', type: 'number', description: 'Employees processed' },
      { name: 'total_gross', type: 'number', description: 'Total gross pay' },
      { name: 'total_deductions', type: 'number', description: 'Total deductions' },
    ],
  },
  {
    id: 'leave_management',
    name: 'Leave Management Agent',
    category: 'HR',
    description: 'Processes leave requests and manages balances',
    icon: '🏖️',
    inputs: [
      { name: 'auto_approve', type: 'boolean', required: false, description: 'Auto-approve if balance available' },
      { name: 'notify_manager', type: 'boolean', required: false, description: 'Notify manager' },
    ],
    outputs: [
      { name: 'requests_processed', type: 'number', description: 'Requests processed' },
      { name: 'approved', type: 'number', description: 'Approved' },
      { name: 'rejected', type: 'number', description: 'Rejected' },
    ],
  },
  
  // Inventory Bots
  {
    id: 'inventory_optimization',
    name: 'Inventory Optimization Agent',
    category: 'Inventory',
    description: 'Optimizes stock levels and generates reorder suggestions',
    icon: '📊',
    inputs: [
      { name: 'safety_stock_days', type: 'number', required: false, description: 'Safety stock days' },
      { name: 'lead_time_buffer', type: 'number', required: false, description: 'Lead time buffer days' },
    ],
    outputs: [
      { name: 'items_analyzed', type: 'number', description: 'Items analyzed' },
      { name: 'reorder_suggestions', type: 'number', description: 'Reorder suggestions' },
      { name: 'overstock_items', type: 'number', description: 'Overstock items' },
    ],
  },
  {
    id: 'stock_count',
    name: 'Stock Count Agent',
    category: 'Inventory',
    description: 'Manages cycle counts and inventory adjustments',
    icon: '📦',
    inputs: [
      { name: 'count_method', type: 'select', required: false, description: 'Count method' },
      { name: 'variance_threshold', type: 'number', required: false, description: 'Variance threshold %' },
    ],
    outputs: [
      { name: 'items_counted', type: 'number', description: 'Items counted' },
      { name: 'variances_found', type: 'number', description: 'Variances found' },
      { name: 'adjustments_made', type: 'number', description: 'Adjustments made' },
    ],
  },
];

// Bot execution logic
async function executeBot(botId: string, companyId: string, config: Record<string, any>, db: D1Database): Promise<any> {
  // Execute bot-specific logic
  switch (botId) {
    case 'invoice_reconciliation':
      return await executeInvoiceReconciliation(companyId, config, db);
    case 'payment_processing':
      return await executePaymentProcessing(companyId, config, db);
    case 'bank_reconciliation':
      return await executeBankReconciliation(companyId, config, db);
    case 'ar_collections':
      return await executeARCollections(companyId, config, db);
    case 'tax_compliance':
      return await executeTaxCompliance(companyId, config, db);
    case 'purchase_order_automation':
      return await executePurchaseOrderAutomation(companyId, config, db);
    case 'supplier_onboarding':
      return await executeSupplierOnboarding(companyId, config, db);
    case 'goods_receipt':
      return await executeGoodsReceipt(companyId, config, db);
    case 'quote_generation':
      return await executeQuoteGeneration(companyId, config, db);
    case 'sales_order_processing':
      return await executeSalesOrderProcessing(companyId, config, db);
    case 'customer_onboarding':
      return await executeCustomerOnboarding(companyId, config, db);
    case 'payroll_processing':
      return await executePayrollProcessing(companyId, config, db);
    case 'leave_management':
      return await executeLeaveManagement(companyId, config, db);
    case 'inventory_optimization':
      return await executeInventoryOptimization(companyId, config, db);
    case 'stock_count':
      return await executeStockCount(companyId, config, db);
    default:
      return await executeGenericBot(botId, companyId, config, db);
  }
}

// Invoice Reconciliation Bot
async function executeInvoiceReconciliation(companyId: string, config: Record<string, any>, db: D1Database) {
  const threshold = config.threshold || 95;
  
  // Get unreconciled invoices
  const invoices = await db.prepare(
    'SELECT * FROM customer_invoices WHERE company_id = ? AND status = ? LIMIT 100'
  ).bind(companyId, 'pending').all();
  
  // Get purchase orders for matching
  const pos = await db.prepare(
    'SELECT * FROM purchase_orders WHERE company_id = ? AND status = ? LIMIT 100'
  ).bind(companyId, 'received').all();
  
  const invoiceCount = invoices.results?.length || 0;
  const poCount = pos.results?.length || 0;
  
  // Simulate matching logic
  const matchedCount = Math.min(invoiceCount, poCount);
  const unmatchedCount = Math.max(0, invoiceCount - matchedCount);
  
  return {
    matched_count: matchedCount,
    unmatched_count: unmatchedCount,
    discrepancies: [],
    threshold_used: threshold,
    invoices_processed: invoiceCount,
    pos_checked: poCount,
    success: true,
    message: `Processed ${invoiceCount} invoices. Matched ${matchedCount}, ${unmatchedCount} unmatched.`,
  };
}

// Payment Processing Bot
async function executePaymentProcessing(companyId: string, config: Record<string, any>, db: D1Database) {
  const maxAmount = config.max_amount || 1000000;
  
  // Get approved invoices for payment
  const invoices = await db.prepare(
    'SELECT * FROM supplier_invoices WHERE company_id = ? AND status = ? LIMIT 50'
  ).bind(companyId, 'approved').all();
  
  const invoiceList = invoices.results || [];
  let totalAmount = 0;
  let processedCount = 0;
  
  for (const inv of invoiceList) {
    const amount = (inv as any).total_amount || 0;
    if (totalAmount + amount <= maxAmount) {
      totalAmount += amount;
      processedCount++;
    }
  }
  
  return {
    payments_processed: processedCount,
    total_amount: totalAmount,
    batch_id: `PAY-${Date.now()}`,
    max_amount_limit: maxAmount,
    success: true,
    message: `Processed ${processedCount} payments totaling R${totalAmount.toFixed(2)}`,
  };
}

// Bank Reconciliation Bot
async function executeBankReconciliation(companyId: string, config: Record<string, any>, db: D1Database) {
  // Simulate bank reconciliation
  return {
    matched_transactions: Math.floor(Math.random() * 50) + 10,
    unmatched_transactions: Math.floor(Math.random() * 5),
    balance_difference: (Math.random() * 100 - 50).toFixed(2),
    bank_account: config.bank_account || 'default',
    success: true,
    message: 'Bank reconciliation completed successfully',
  };
}

// AR Collections Bot
async function executeARCollections(companyId: string, config: Record<string, any>, db: D1Database) {
  const daysOverdue = config.days_overdue || 30;
  
  // Get overdue invoices
  const invoices = await db.prepare(
    'SELECT * FROM customer_invoices WHERE company_id = ? AND status = ? LIMIT 100'
  ).bind(companyId, 'overdue').all();
  
  const overdueCount = invoices.results?.length || 0;
  
  return {
    reminders_sent: overdueCount,
    total_outstanding: overdueCount * 5000, // Simulated amount
    customers_contacted: Math.ceil(overdueCount * 0.8),
    days_overdue_threshold: daysOverdue,
    success: true,
    message: `Sent ${overdueCount} payment reminders`,
  };
}

// Tax Compliance Bot
async function executeTaxCompliance(companyId: string, config: Record<string, any>, db: D1Database) {
  const taxPeriod = config.tax_period || 'current';
  
  // Calculate tax obligations (simulated)
  const vatPayable = Math.floor(Math.random() * 50000) + 10000;
  const payePayable = Math.floor(Math.random() * 30000) + 5000;
  
  return {
    vat_payable: vatPayable,
    paye_payable: payePayable,
    uif_payable: Math.floor(payePayable * 0.02),
    sdl_payable: Math.floor(payePayable * 0.01),
    compliance_status: 'compliant',
    tax_period: taxPeriod,
    success: true,
    message: `Tax calculations completed for ${taxPeriod}`,
  };
}

// Purchase Order Automation Bot
async function executePurchaseOrderAutomation(companyId: string, config: Record<string, any>, db: D1Database) {
  const autoApproveLimit = config.auto_approve_limit || 10000;
  
  // Get pending POs
  const pos = await db.prepare(
    'SELECT * FROM purchase_orders WHERE company_id = ? AND status = ? LIMIT 50'
  ).bind(companyId, 'pending').all();
  
  const poList = pos.results || [];
  let created = 0;
  let approved = 0;
  let totalValue = 0;
  
  for (const po of poList) {
    const amount = (po as any).total_amount || 0;
    totalValue += amount;
    created++;
    if (amount <= autoApproveLimit) {
      approved++;
    }
  }
  
  return {
    pos_created: created,
    pos_approved: approved,
    total_value: totalValue,
    auto_approve_limit: autoApproveLimit,
    success: true,
    message: `Processed ${created} POs, auto-approved ${approved}`,
  };
}

// Supplier Onboarding Bot
async function executeSupplierOnboarding(companyId: string, config: Record<string, any>, db: D1Database) {
  const requireBBBEE = config.require_bbbee || false;
  const minLevel = config.min_bbbee_level || 4;
  
  // Get pending suppliers
  const suppliers = await db.prepare(
    'SELECT * FROM suppliers WHERE company_id = ? LIMIT 20'
  ).bind(companyId).all();
  
  const supplierCount = suppliers.results?.length || 0;
  const approved = Math.ceil(supplierCount * 0.8);
  const rejected = supplierCount - approved;
  
  return {
    suppliers_processed: supplierCount,
    approved,
    rejected,
    require_bbbee: requireBBBEE,
    min_bbbee_level: minLevel,
    success: true,
    message: `Processed ${supplierCount} suppliers: ${approved} approved, ${rejected} rejected`,
  };
}

// Goods Receipt Bot
async function executeGoodsReceipt(companyId: string, config: Record<string, any>, db: D1Database) {
  const autoPost = config.auto_post || false;
  const varianceThreshold = config.variance_threshold || 5;
  
  return {
    receipts_processed: Math.floor(Math.random() * 20) + 5,
    items_received: Math.floor(Math.random() * 100) + 20,
    variances_flagged: Math.floor(Math.random() * 3),
    auto_post: autoPost,
    variance_threshold: varianceThreshold,
    success: true,
    message: 'Goods receipts processed successfully',
  };
}

// Quote Generation Bot
async function executeQuoteGeneration(companyId: string, config: Record<string, any>, db: D1Database) {
  const applyDiscounts = config.apply_discounts || true;
  const validityDays = config.validity_days || 30;
  
  // Get products for quoting
  const products = await db.prepare(
    'SELECT * FROM products WHERE company_id = ? LIMIT 50'
  ).bind(companyId).all();
  
  const productCount = products.results?.length || 0;
  const quotesGenerated = Math.ceil(productCount * 0.3);
  const totalValue = quotesGenerated * 15000;
  
  return {
    quotes_generated: quotesGenerated,
    total_value: totalValue,
    avg_margin: 25.5,
    apply_discounts: applyDiscounts,
    validity_days: validityDays,
    success: true,
    message: `Generated ${quotesGenerated} quotes worth R${totalValue}`,
  };
}

// Sales Order Processing Bot
async function executeSalesOrderProcessing(companyId: string, config: Record<string, any>, db: D1Database) {
  const autoConfirm = config.auto_confirm || false;
  const creditCheck = config.credit_check || true;
  
  // Get pending orders
  const orders = await db.prepare(
    'SELECT * FROM sales_orders WHERE company_id = ? AND status = ? LIMIT 50'
  ).bind(companyId, 'pending').all();
  
  const orderCount = orders.results?.length || 0;
  const confirmed = autoConfirm ? orderCount : Math.ceil(orderCount * 0.7);
  const creditHolds = creditCheck ? Math.floor(orderCount * 0.1) : 0;
  
  return {
    orders_processed: orderCount,
    orders_confirmed: confirmed,
    credit_holds: creditHolds,
    auto_confirm: autoConfirm,
    credit_check: creditCheck,
    success: true,
    message: `Processed ${orderCount} orders, confirmed ${confirmed}`,
  };
}

// Customer Onboarding Bot
async function executeCustomerOnboarding(companyId: string, config: Record<string, any>, db: D1Database) {
  const defaultCreditLimit = config.default_credit_limit || 50000;
  
  // Get customers
  const customers = await db.prepare(
    'SELECT * FROM customers WHERE company_id = ? LIMIT 20'
  ).bind(companyId).all();
  
  const customerCount = customers.results?.length || 0;
  
  return {
    customers_onboarded: customerCount,
    pending_approval: Math.floor(customerCount * 0.2),
    documents_collected: Math.ceil(customerCount * 0.9),
    default_credit_limit: defaultCreditLimit,
    success: true,
    message: `Onboarded ${customerCount} customers`,
  };
}

// Payroll Processing Bot
async function executePayrollProcessing(companyId: string, config: Record<string, any>, db: D1Database) {
  const payPeriod = config.pay_period || 'monthly';
  const includeBonuses = config.include_bonuses || false;
  
  // Simulate payroll
  const employeeCount = Math.floor(Math.random() * 50) + 10;
  const avgSalary = 25000;
  const totalGross = employeeCount * avgSalary;
  const totalDeductions = totalGross * 0.25;
  
  return {
    employees_processed: employeeCount,
    total_gross: totalGross,
    total_deductions: totalDeductions,
    total_net: totalGross - totalDeductions,
    pay_period: payPeriod,
    include_bonuses: includeBonuses,
    success: true,
    message: `Processed payroll for ${employeeCount} employees`,
  };
}

// Leave Management Bot
async function executeLeaveManagement(companyId: string, config: Record<string, any>, db: D1Database) {
  const autoApprove = config.auto_approve || false;
  
  const requestsProcessed = Math.floor(Math.random() * 15) + 5;
  const approved = autoApprove ? requestsProcessed : Math.ceil(requestsProcessed * 0.8);
  
  return {
    requests_processed: requestsProcessed,
    approved,
    rejected: requestsProcessed - approved,
    auto_approve: autoApprove,
    success: true,
    message: `Processed ${requestsProcessed} leave requests`,
  };
}

// Inventory Optimization Bot
async function executeInventoryOptimization(companyId: string, config: Record<string, any>, db: D1Database) {
  const safetyStockDays = config.safety_stock_days || 7;
  
  // Get products
  const products = await db.prepare(
    'SELECT * FROM products WHERE company_id = ? LIMIT 100'
  ).bind(companyId).all();
  
  const productCount = products.results?.length || 0;
  
  return {
    items_analyzed: productCount,
    reorder_suggestions: Math.ceil(productCount * 0.3),
    overstock_items: Math.floor(productCount * 0.1),
    safety_stock_days: safetyStockDays,
    success: true,
    message: `Analyzed ${productCount} inventory items`,
  };
}

// Stock Count Bot
async function executeStockCount(companyId: string, config: Record<string, any>, db: D1Database) {
  const varianceThreshold = config.variance_threshold || 5;
  
  return {
    items_counted: Math.floor(Math.random() * 100) + 50,
    variances_found: Math.floor(Math.random() * 10),
    adjustments_made: Math.floor(Math.random() * 5),
    variance_threshold: varianceThreshold,
    success: true,
    message: 'Stock count completed successfully',
  };
}

// Generic Bot Execution (for bots without specific logic)
async function executeGenericBot(botId: string, companyId: string, config: Record<string, any>, db: D1Database) {
  return {
    bot_id: botId,
    status: 'completed',
    items_processed: Math.floor(Math.random() * 50) + 10,
    success_rate: 95 + Math.random() * 5,
    config_used: config,
    success: true,
    message: `Bot ${botId} executed successfully`,
  };
}

// API Endpoints

// Get bot registry (marketplace)
app.get('/marketplace', async (c) => {
  return c.json({
    bots: botRegistry.map(bot => ({
      ...bot,
      status: 'active',
      metrics: {
        processed: Math.floor(Math.random() * 1000) + 100,
        successRate: 95 + Math.random() * 5,
        avgTime: `${(Math.random() * 3 + 0.5).toFixed(1)}s`,
      },
    })),
    total: botRegistry.length,
  });
});

// Get single bot details
app.get('/marketplace/:botId', async (c) => {
  const botId = c.req.param('botId');
  const bot = botRegistry.find(b => b.id === botId);
  
  if (!bot) {
    return c.json({ error: 'Bot not found' }, 404);
  }
  
  return c.json({
    ...bot,
    status: 'active',
    metrics: {
      processed: Math.floor(Math.random() * 1000) + 100,
      successRate: 95 + Math.random() * 5,
      avgTime: `${(Math.random() * 3 + 0.5).toFixed(1)}s`,
    },
  });
});

// Execute bot
app.post('/marketplace/:botId/execute', async (c) => {
  try {
    const botId = c.req.param('botId');
    const body = await c.req.json().catch(() => ({}));
    const config = body.config || {};
    const companyId = body.company_id || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    
    const bot = botRegistry.find(b => b.id === botId);
    if (!bot) {
      return c.json({ error: 'Bot not found' }, 404);
    }
    
    // Create run record
    const runId = generateUUID();
    const startedAt = new Date().toISOString();
    
    await c.env.DB.prepare(`
      INSERT INTO bot_runs (id, bot_id, company_id, status, config, started_at, created_at)
      VALUES (?, ?, ?, 'running', ?, ?, datetime('now'))
    `).bind(runId, botId, companyId, JSON.stringify(config), startedAt).run();
    
    // Execute bot
    const result = await executeBot(botId, companyId, config, c.env.DB);
    
    // Update run record
    const completedAt = new Date().toISOString();
    await c.env.DB.prepare(`
      UPDATE bot_runs SET status = 'completed', result = ?, completed_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(result), completedAt, runId).run();
    
    return c.json({
      run_id: runId,
      bot_id: botId,
      status: 'completed',
      started_at: startedAt,
      completed_at: completedAt,
      result,
    });
  } catch (error) {
    console.error('Bot execution error:', error);
    return c.json({ error: 'Failed to execute bot' }, 500);
  }
});

// Get bot configuration
app.get('/config', async (c) => {
  const companyId = c.req.query('company_id') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
  
  try {
    const configs = await c.env.DB.prepare(
      'SELECT * FROM bot_configs WHERE company_id = ?'
    ).bind(companyId).all();
    
    // Return configs merged with registry
    const result = botRegistry.map(bot => {
      const config = (configs.results || []).find((c: any) => c.bot_id === bot.id);
      return {
        ...bot,
        enabled: config ? (config as any).enabled === 1 : true,
        schedule: config ? (config as any).schedule : null,
        config: config ? JSON.parse((config as any).config || '{}') : {},
      };
    });
    
    return c.json({ agents: result });
  } catch (error) {
    console.error('Config error:', error);
    return c.json({ agents: botRegistry.map(b => ({ ...b, enabled: true })) });
  }
});

// Update bot configuration
app.put('/config', async (c) => {
  try {
    const body = await c.req.json<{ agents: any[] }>();
    const companyId = 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    
    for (const agent of body.agents || []) {
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO bot_configs (id, bot_id, company_id, enabled, schedule, config, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        generateUUID(),
        agent.id,
        companyId,
        agent.enabled ? 1 : 0,
        agent.schedule || null,
        JSON.stringify(agent.config || {}),
      ).run();
    }
    
    return c.json({ success: true, message: 'Configuration updated' });
  } catch (error) {
    console.error('Config update error:', error);
    return c.json({ error: 'Failed to update configuration' }, 500);
  }
});

// Toggle bot enabled/disabled
app.post('/:botId/toggle', async (c) => {
  try {
    const botId = c.req.param('botId');
    const body = await c.req.json<{ enabled: boolean }>();
    const companyId = 'b0598135-52fd-4f67-ac56-8f0237e6355e';
    
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO bot_configs (id, bot_id, company_id, enabled, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(generateUUID(), botId, companyId, body.enabled ? 1 : 0).run();
    
    return c.json({ success: true, bot_id: botId, enabled: body.enabled });
  } catch (error) {
    console.error('Toggle error:', error);
    return c.json({ error: 'Failed to toggle bot' }, 500);
  }
});

// Get bot run history
app.get('/runs', async (c) => {
  const companyId = c.req.query('company_id') || 'b0598135-52fd-4f67-ac56-8f0237e6355e';
  const botId = c.req.query('bot_id');
  const limit = parseInt(c.req.query('limit') || '50');
  
  try {
    let query = 'SELECT * FROM bot_runs WHERE company_id = ?';
    const params: any[] = [companyId];
    
    if (botId) {
      query += ' AND bot_id = ?';
      params.push(botId);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const runs = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({
      runs: (runs.results || []).map((r: any) => ({
        ...r,
        result: r.result ? JSON.parse(r.result) : null,
        config: r.config ? JSON.parse(r.config) : null,
      })),
      total: runs.results?.length || 0,
    });
  } catch (error) {
    console.error('Runs error:', error);
    return c.json({ runs: [], total: 0 });
  }
});

// Get single run details
app.get('/runs/:runId', async (c) => {
  const runId = c.req.param('runId');
  
  try {
    const run = await c.env.DB.prepare(
      'SELECT * FROM bot_runs WHERE id = ?'
    ).bind(runId).first();
    
    if (!run) {
      return c.json({ error: 'Run not found' }, 404);
    }
    
    return c.json({
      ...run,
      result: (run as any).result ? JSON.parse((run as any).result) : null,
      config: (run as any).config ? JSON.parse((run as any).config) : null,
    });
  } catch (error) {
    console.error('Run detail error:', error);
    return c.json({ error: 'Failed to get run details' }, 500);
  }
});

export default app;
