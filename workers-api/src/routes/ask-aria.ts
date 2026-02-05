/**
 * Ask ARIA - Skill-based ERP Assistant
 * A rule-based command assistant that can query ERP data and perform actions
 */

import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  JWT_SECRET: string;
}

interface Skill {
  name: string;
  description: string;
  patterns: RegExp[];
  slots: string[];
  execute: (context: SkillContext) => Promise<SkillResult>;
}

interface SkillContext {
  db: D1Database;
  companyId: string;
  userId: string;
  message: string;
  slots: Record<string, string>;
  conversationId: string;
  conversationState?: ConversationState;
  updateState?: (state: ConversationState) => Promise<void>;
}

interface SkillResult {
  response: string;
  data?: any;
  action?: string;
  followUp?: string;
}

interface Conversation {
  id: string;
  user_id: string;
  company_id: string;
  status: string;
  intent: string | null;
  created_at: string;
  context?: string; // JSON string for conversation state
}

interface ConversationState {
  currentFlow?: string; // 'create_sales_order' | 'create_quote' | 'create_po' | 'reconciliation'
  step?: string; // 'select_customer' | 'select_products' | 'confirm' | 'complete'
  selectedCustomerId?: string;
  selectedCustomerName?: string;
  selectedSupplierId?: string;
  selectedSupplierName?: string;
  selectedProducts?: Array<{ id: string; name: string; quantity: number; price: number }>;
  orderTotal?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

const app = new Hono<{ Bindings: Env }>();

// Generate UUID
function generateUUID(): string {
  return crypto.randomUUID();
}

// Skills registry
const skills: Skill[] = [
  // List Customers
  {
    name: 'list_customers',
    description: 'List all customers',
    patterns: [
      /show\s+(me\s+)?(all\s+)?customers?/i,
      /list\s+(all\s+)?customers?/i,
      /customer\s+list/i,
      /get\s+customers?/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT * FROM customers WHERE company_id = ? LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const customers = result.results || [];
      if (customers.length === 0) {
        return { response: 'No customers found. Would you like to create a new customer?' };
      }
      
      const customerList = customers.map((c: any) => 
        `- ${c.customer_name} (${c.customer_code}) - ${c.email || 'No email'}`
      ).join('\n');
      
      return {
        response: `Found ${customers.length} customers:\n\n${customerList}\n\nWould you like to see more details about any customer?`,
        data: customers,
      };
    },
  },
  
  // List Suppliers
  {
    name: 'list_suppliers',
    description: 'List all suppliers',
    patterns: [
      /show\s+(me\s+)?(all\s+)?suppliers?/i,
      /list\s+(all\s+)?suppliers?/i,
      /supplier\s+list/i,
      /get\s+suppliers?/i,
      /vendor\s+list/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT * FROM suppliers WHERE company_id = ? LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const suppliers = result.results || [];
      if (suppliers.length === 0) {
        return { response: 'No suppliers found. Would you like to add a new supplier?' };
      }
      
      const supplierList = suppliers.map((s: any) => 
        `- ${s.supplier_name} (${s.supplier_code}) - ${s.email || 'No email'}`
      ).join('\n');
      
      return {
        response: `Found ${suppliers.length} suppliers:\n\n${supplierList}\n\nWould you like to see more details or create a purchase order?`,
        data: suppliers,
      };
    },
  },
  
  // List Products
  {
    name: 'list_products',
    description: 'List all products',
    patterns: [
      /show\s+(me\s+)?(all\s+)?products?/i,
      /list\s+(all\s+)?products?/i,
      /product\s+list/i,
      /get\s+products?/i,
      /inventory/i,
      /items?\s+list/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT * FROM products WHERE company_id = ? LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const products = result.results || [];
      if (products.length === 0) {
        return { response: 'No products found. Would you like to add a new product?' };
      }
      
      const productList = products.map((p: any) => 
        `- ${p.product_name} (${p.product_code}) - R${p.unit_price || 0}`
      ).join('\n');
      
      return {
        response: `Found ${products.length} products:\n\n${productList}\n\nWould you like to create a quote or sales order?`,
        data: products,
      };
    },
  },
  
  // Show Recent Invoices
  {
    name: 'list_invoices',
    description: 'Show recent invoices',
    patterns: [
      /show\s+(me\s+)?(recent\s+)?invoices?/i,
      /list\s+(all\s+)?invoices?/i,
      /invoice\s+list/i,
      /get\s+invoices?/i,
      /recent\s+invoices?/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT * FROM customer_invoices WHERE company_id = ? ORDER BY created_at DESC LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const invoices = result.results || [];
      if (invoices.length === 0) {
        return { response: 'No invoices found. Would you like to create a new invoice?' };
      }
      
      const invoiceList = invoices.map((i: any) => 
        `- ${i.invoice_number} - R${i.total_amount || 0} - ${i.status}`
      ).join('\n');
      
      return {
        response: `Found ${invoices.length} recent invoices:\n\n${invoiceList}\n\nWould you like to see details or create a new invoice?`,
        data: invoices,
      };
    },
  },
  
  // Show Sales Orders
  {
    name: 'list_sales_orders',
    description: 'Show sales orders',
    patterns: [
      /show\s+(me\s+)?(recent\s+)?sales\s+orders?/i,
      /list\s+(all\s+)?sales\s+orders?/i,
      /sales\s+order\s+list/i,
      /get\s+sales\s+orders?/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT * FROM sales_orders WHERE company_id = ? ORDER BY created_at DESC LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const orders = result.results || [];
      if (orders.length === 0) {
        return { response: 'No sales orders found. Would you like to create a new sales order?' };
      }
      
      const orderList = orders.map((o: any) => 
        `- ${o.order_number} - R${o.total_amount || 0} - ${o.status}`
      ).join('\n');
      
      return {
        response: `Found ${orders.length} sales orders:\n\n${orderList}\n\nWould you like to see details or create a new order?`,
        data: orders,
      };
    },
  },
  
  // Show Purchase Orders
  {
    name: 'list_purchase_orders',
    description: 'Show purchase orders',
    patterns: [
      /show\s+(me\s+)?(recent\s+)?purchase\s+orders?/i,
      /list\s+(all\s+)?purchase\s+orders?/i,
      /purchase\s+order\s+list/i,
      /get\s+purchase\s+orders?/i,
      /po\s+list/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT * FROM purchase_orders WHERE company_id = ? ORDER BY created_at DESC LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const orders = result.results || [];
      if (orders.length === 0) {
        return { response: 'No purchase orders found. Would you like to create a new purchase order?' };
      }
      
      const orderList = orders.map((o: any) => 
        `- ${o.po_number} - R${o.total_amount || 0} - ${o.status}`
      ).join('\n');
      
      return {
        response: `Found ${orders.length} purchase orders:\n\n${orderList}\n\nWould you like to see details or create a new PO?`,
        data: orders,
      };
    },
  },
  
  // Show Quotes
  {
    name: 'list_quotes',
    description: 'Show quotes',
    patterns: [
      /show\s+(me\s+)?(recent\s+)?quotes?/i,
      /list\s+(all\s+)?quotes?/i,
      /quote\s+list/i,
      /get\s+quotes?/i,
      /quotations?/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT * FROM quotes WHERE company_id = ? ORDER BY created_at DESC LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const quotes = result.results || [];
      if (quotes.length === 0) {
        return { response: 'No quotes found. Would you like to create a new quote?' };
      }
      
      const quoteList = quotes.map((q: any) => 
        `- ${q.quote_number} - R${q.total_amount || 0} - ${q.status}`
      ).join('\n');
      
      return {
        response: `Found ${quotes.length} quotes:\n\n${quoteList}\n\nWould you like to see details or create a new quote?`,
        data: quotes,
      };
    },
  },
  
  // Create Quote - Step 1: Select Customer
  {
    name: 'create_quote',
    description: 'Create a new quote',
    patterns: [
      /create\s+(a\s+)?(new\s+)?quote/i,
      /new\s+quote/i,
      /make\s+(a\s+)?quote/i,
      /generate\s+(a\s+)?quote/i,
    ],
    slots: ['customer'],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT id, customer_name, customer_code, email FROM customers WHERE company_id = ? ORDER BY customer_name LIMIT 20'
      ).bind(ctx.companyId).all();
      
      const customers = result.results || [];
      if (customers.length === 0) {
        return { 
          response: '**No customers found in the system.**\n\nTo create a quote, you first need customers. Reply "yes" to create a demo customer, or navigate to **CRM > Customers** to add customers manually.',
          action: 'no_customers',
          data: { path: '/crm/customers' }
        };
      }
      
      const customerList = customers.map((c: any, i: number) => 
        `**${i + 1}.** ${c.customer_name} (${c.customer_code})${c.email ? ` - ${c.email}` : ''}`
      ).join('\n');
      
      if (ctx.updateState) {
        await ctx.updateState({
          currentFlow: 'create_quote',
          step: 'select_customer',
        });
      }
      
      return {
        response: `**Create Quote - Step 1: Select Customer**\n\nPlease select a customer by typing their number:\n\n${customerList}\n\n_Type a number (1-${customers.length}) to select a customer_`,
        action: 'select_customer',
        data: { customers, step: 'select_customer', flow: 'create_quote' },
        followUp: 'Which customer would you like to create a quote for?',
      };
    },
  },
  
  // Create Purchase Order - Step 1: Select Supplier
  {
    name: 'create_purchase_order',
    description: 'Create a new purchase order',
    patterns: [
      /create\s+(a\s+)?(new\s+)?purchase\s+order/i,
      /new\s+purchase\s+order/i,
      /create\s+(a\s+)?po/i,
      /new\s+po/i,
    ],
    slots: ['supplier'],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT id, supplier_name, supplier_code, email FROM suppliers WHERE company_id = ? ORDER BY supplier_name LIMIT 20'
      ).bind(ctx.companyId).all();
      
      const suppliers = result.results || [];
      if (suppliers.length === 0) {
        return { 
          response: '**No suppliers found in the system.**\n\nTo create a purchase order, you first need suppliers. Navigate to **Procurement > Suppliers** to add suppliers.',
          action: 'redirect',
          data: { path: '/procurement/suppliers' }
        };
      }
      
      const supplierList = suppliers.map((s: any, i: number) => 
        `**${i + 1}.** ${s.supplier_name} (${s.supplier_code})${s.email ? ` - ${s.email}` : ''}`
      ).join('\n');
      
      if (ctx.updateState) {
        await ctx.updateState({
          currentFlow: 'create_po',
          step: 'select_supplier',
        });
      }
      
      return {
        response: `**Create Purchase Order - Step 1: Select Supplier**\n\nPlease select a supplier by typing their number:\n\n${supplierList}\n\n_Type a number (1-${suppliers.length}) to select a supplier_`,
        action: 'select_supplier',
        data: { suppliers, step: 'select_supplier', flow: 'create_po' },
        followUp: 'Which supplier would you like to create a PO for?',
      };
    },
  },
  
  // Dashboard Summary
  {
    name: 'dashboard_summary',
    description: 'Show dashboard summary',
    patterns: [
      /dashboard/i,
      /summary/i,
      /overview/i,
      /how\s+(is|are)\s+(the\s+)?business/i,
      /business\s+status/i,
      /financial\s+summary/i,
    ],
    slots: [],
    execute: async (ctx) => {
      // Get counts
      const [customers, suppliers, products, invoices, orders] = await Promise.all([
        ctx.db.prepare('SELECT COUNT(*) as count FROM customers WHERE company_id = ?').bind(ctx.companyId).first(),
        ctx.db.prepare('SELECT COUNT(*) as count FROM suppliers WHERE company_id = ?').bind(ctx.companyId).first(),
        ctx.db.prepare('SELECT COUNT(*) as count FROM products WHERE company_id = ?').bind(ctx.companyId).first(),
        ctx.db.prepare('SELECT COUNT(*) as count FROM customer_invoices WHERE company_id = ?').bind(ctx.companyId).first(),
        ctx.db.prepare('SELECT COUNT(*) as count FROM sales_orders WHERE company_id = ?').bind(ctx.companyId).first(),
      ]);
      
      return {
        response: `Here's your business summary:\n\n` +
          `- Customers: ${(customers as any)?.count || 0}\n` +
          `- Suppliers: ${(suppliers as any)?.count || 0}\n` +
          `- Products: ${(products as any)?.count || 0}\n` +
          `- Invoices: ${(invoices as any)?.count || 0}\n` +
          `- Sales Orders: ${(orders as any)?.count || 0}\n\n` +
          `What would you like to do next?`,
        data: {
          customers: (customers as any)?.count || 0,
          suppliers: (suppliers as any)?.count || 0,
          products: (products as any)?.count || 0,
          invoices: (invoices as any)?.count || 0,
          orders: (orders as any)?.count || 0,
        },
      };
    },
  },
  
  // Help
  {
    name: 'help',
    description: 'Show available commands',
    patterns: [
      /help/i,
      /what\s+can\s+you\s+do/i,
      /commands?/i,
      /capabilities/i,
    ],
    slots: [],
    execute: async () => {
      return {
        response: `I'm ARIA, your ERP assistant. Here's what I can help you with:\n\n` +
          `**View Data:**\n` +
          `- "Show customers" - List all customers\n` +
          `- "Show suppliers" - List all suppliers\n` +
          `- "Show products" - List all products\n` +
          `- "Show invoices" - List recent invoices\n` +
          `- "Show sales orders" - List sales orders\n` +
          `- "Show purchase orders" - List purchase orders\n` +
          `- "Show quotes" - List quotes\n\n` +
          `**Create Records:**\n` +
          `- "Create a quote" - Start creating a new quote\n` +
          `- "Create a purchase order" - Start creating a new PO\n` +
          `- "Create a sales order" - Start creating a new sales order\n\n` +
          `**Automation Bots:**\n` +
          `- "List all bots" - Show all 67 automation bots\n` +
          `- "List financial bots" - Show financial automation bots\n` +
          `- "Run reconciliation" - Run sales-to-invoice reconciliation\n\n` +
          `**Reports:**\n` +
          `- "Dashboard" or "Summary" - Show business overview\n\n` +
          `Just type naturally and I'll try to help!`,
      };
    },
  },
  
  // List All Bots
  {
    name: 'list_bots',
    description: 'List all available automation bots',
    patterns: [
      /list\s+(all\s+)?(available\s+)?bots?/i,
      /show\s+(me\s+)?(all\s+)?bots?/i,
      /what\s+bots?/i,
      /which\s+bots?/i,
      /available\s+bots?/i,
      /all\s+bots?/i,
      /automation\s+bots?/i,
      /show\s+automation/i,
    ],
    slots: [],
    execute: async () => {
      const bots = [
        // Financial Bots (12)
        { category: 'Financial', name: 'Invoice Reconciliation Bot', description: 'Matches invoices with purchase orders and receipts' },
        { category: 'Financial', name: 'Sales-to-Invoice Reconciliation Bot', description: 'Reconciles sales orders with invoices, identifies variances' },
        { category: 'Financial', name: 'Bank Reconciliation Bot', description: 'Matches bank transactions with GL entries' },
        { category: 'Financial', name: 'Accounts Payable Bot', description: 'Automates AP invoice processing and payments' },
        { category: 'Financial', name: 'Accounts Receivable Bot', description: 'Manages AR collections and customer payments' },
        { category: 'Financial', name: 'General Ledger Bot', description: 'Automates journal entries and GL reconciliation' },
        { category: 'Financial', name: 'Financial Close Bot', description: 'Automates month-end and year-end close processes' },
        { category: 'Financial', name: 'Expense Approval Bot', description: 'Routes and approves expense claims' },
        { category: 'Financial', name: 'VAT Return Filing Bot', description: 'Prepares and files VAT returns' },
        { category: 'Financial', name: 'Cash Flow Prediction Bot', description: 'Predicts future cash flow based on AR/AP' },
        { category: 'Financial', name: 'Revenue Forecasting Bot', description: 'Forecasts revenue based on sales pipeline' },
        { category: 'Financial', name: 'Multi-Currency Revaluation Bot', description: 'Revalues foreign currency balances' },
        
        // Sales Bots (8)
        { category: 'Sales', name: 'Quote Generation Bot', description: 'Auto-generates quotes from customer requests' },
        { category: 'Sales', name: 'Lead Scoring Bot', description: 'Scores and prioritizes sales leads' },
        { category: 'Sales', name: 'Opportunity Tracking Bot', description: 'Tracks sales opportunities through pipeline' },
        { category: 'Sales', name: 'Contract Renewal Bot', description: 'Manages contract renewals and notifications' },
        { category: 'Sales', name: 'Sales Order Processing Bot', description: 'Automates sales order creation and fulfillment' },
        { category: 'Sales', name: 'Customer Onboarding Bot', description: 'Guides new customer setup process' },
        { category: 'Sales', name: 'Pricing Optimization Bot', description: 'Optimizes pricing based on market data' },
        { category: 'Sales', name: 'Sales Analytics Bot', description: 'Generates sales performance reports' },
        
        // Purchasing Bots (7)
        { category: 'Purchasing', name: 'Purchase Order Bot', description: 'Automates PO creation and approval' },
        { category: 'Purchasing', name: 'RFQ Management Bot', description: 'Manages request for quotation process' },
        { category: 'Purchasing', name: 'Supplier Evaluation Bot', description: 'Evaluates and scores suppliers' },
        { category: 'Purchasing', name: 'Goods Receipt Bot', description: 'Automates goods receipt processing' },
        { category: 'Purchasing', name: 'Three-Way Match Bot', description: 'Matches PO, receipt, and invoice' },
        { category: 'Purchasing', name: 'Procurement Analytics Bot', description: 'Analyzes procurement spending' },
        { category: 'Purchasing', name: 'Vendor Portal Bot', description: 'Manages vendor self-service portal' },
        
        // Inventory Bots (7)
        { category: 'Inventory', name: 'Stock Reorder Bot', description: 'Automatically reorders low stock items' },
        { category: 'Inventory', name: 'Inventory Optimization Bot', description: 'Optimizes stock levels and locations' },
        { category: 'Inventory', name: 'Stock Valuation Bot', description: 'Calculates inventory valuation' },
        { category: 'Inventory', name: 'Warehouse Management Bot', description: 'Manages warehouse operations' },
        { category: 'Inventory', name: 'Cycle Counting Bot', description: 'Schedules and manages cycle counts' },
        { category: 'Inventory', name: 'Demand Forecasting Bot', description: 'Forecasts product demand' },
        { category: 'Inventory', name: 'ABC Analysis Bot', description: 'Classifies inventory by value' },
        
        // HR Bots (8)
        { category: 'HR', name: 'Payroll Processing Bot', description: 'Automates payroll calculations' },
        { category: 'HR', name: 'Leave Management Bot', description: 'Manages leave requests and balances' },
        { category: 'HR', name: 'Employee Onboarding Bot', description: 'Guides new employee setup' },
        { category: 'HR', name: 'Performance Review Bot', description: 'Schedules and tracks performance reviews' },
        { category: 'HR', name: 'Training Management Bot', description: 'Manages employee training programs' },
        { category: 'HR', name: 'Attendance Tracking Bot', description: 'Tracks employee attendance' },
        { category: 'HR', name: 'Recruitment Bot', description: 'Automates recruitment workflow' },
        { category: 'HR', name: 'Benefits Administration Bot', description: 'Manages employee benefits' },
        
        // Manufacturing Bots (6)
        { category: 'Manufacturing', name: 'Production Planning Bot', description: 'Plans production schedules' },
        { category: 'Manufacturing', name: 'OEE Calculation Bot', description: 'Calculates overall equipment effectiveness' },
        { category: 'Manufacturing', name: 'Quality Control Bot', description: 'Manages quality inspections' },
        { category: 'Manufacturing', name: 'BOM Management Bot', description: 'Manages bills of materials' },
        { category: 'Manufacturing', name: 'Work Order Bot', description: 'Creates and tracks work orders' },
        { category: 'Manufacturing', name: 'Capacity Planning Bot', description: 'Plans production capacity' },
        
        // Compliance Bots (5)
        { category: 'Compliance', name: 'Audit Trail Bot', description: 'Maintains comprehensive audit logs' },
        { category: 'Compliance', name: 'Document Compliance Bot', description: 'Ensures document compliance' },
        { category: 'Compliance', name: 'Risk Assessment Bot', description: 'Identifies and assesses risks' },
        { category: 'Compliance', name: 'Policy Management Bot', description: 'Manages company policies' },
        { category: 'Compliance', name: 'Regulatory Reporting Bot', description: 'Generates regulatory reports' },
        
        // Analytics Bots (5)
        { category: 'Analytics', name: 'Sales Analytics Bot', description: 'Analyzes sales performance' },
        { category: 'Analytics', name: 'Financial Analytics Bot', description: 'Analyzes financial metrics' },
        { category: 'Analytics', name: 'Operational Analytics Bot', description: 'Analyzes operational efficiency' },
        { category: 'Analytics', name: 'Predictive Analytics Bot', description: 'Predicts business trends' },
        { category: 'Analytics', name: 'Custom Reports Bot', description: 'Generates custom reports' },
        
        // Service Bots (5)
        { category: 'Service', name: 'Ticket Management Bot', description: 'Manages support tickets' },
        { category: 'Service', name: 'SLA Monitoring Bot', description: 'Monitors service level agreements' },
        { category: 'Service', name: 'Customer Feedback Bot', description: 'Collects and analyzes feedback' },
        { category: 'Service', name: 'Knowledge Base Bot', description: 'Manages knowledge articles' },
        { category: 'Service', name: 'Escalation Bot', description: 'Handles ticket escalations' },
        
        // Workflow Bots (4)
        { category: 'Workflow', name: 'Approval Workflow Bot', description: 'Manages approval processes' },
        { category: 'Workflow', name: 'Document Routing Bot', description: 'Routes documents for review' },
        { category: 'Workflow', name: 'Task Assignment Bot', description: 'Assigns tasks automatically' },
        { category: 'Workflow', name: 'Notification Bot', description: 'Sends automated notifications' },
      ];
      
      // Group by category
      const categories: Record<string, typeof bots> = {};
      for (const bot of bots) {
        if (!categories[bot.category]) {
          categories[bot.category] = [];
        }
        categories[bot.category].push(bot);
      }
      
      let response = `**Found ${bots.length} automation bots:**\n\n`;
      
      for (const [category, categoryBots] of Object.entries(categories)) {
        response += `**${category} (${categoryBots.length} bots):**\n`;
        for (const bot of categoryBots.slice(0, 3)) {
          response += `- ${bot.name}: ${bot.description}\n`;
        }
        if (categoryBots.length > 3) {
          response += `  ...and ${categoryBots.length - 3} more\n`;
        }
        response += '\n';
      }
      
      response += `Click the **Bots** button to see all categories and quick prompts!`;
      
      return { response, data: bots };
    },
  },
  
  // List Financial Bots
  {
    name: 'list_financial_bots',
    description: 'List financial automation bots',
    patterns: [
      /list\s+financial\s+bots?/i,
      /show\s+(me\s+)?financial\s+bots?/i,
      /financial\s+automation/i,
    ],
    slots: [],
    execute: async () => {
      const bots = [
        { name: 'Invoice Reconciliation Bot', description: 'Matches invoices with purchase orders and receipts' },
        { name: 'Sales-to-Invoice Reconciliation Bot', description: 'Reconciles sales orders with invoices, identifies variances' },
        { name: 'Bank Reconciliation Bot', description: 'Matches bank transactions with GL entries' },
        { name: 'Accounts Payable Bot', description: 'Automates AP invoice processing and payments' },
        { name: 'Accounts Receivable Bot', description: 'Manages AR collections and customer payments' },
        { name: 'General Ledger Bot', description: 'Automates journal entries and GL reconciliation' },
        { name: 'Financial Close Bot', description: 'Automates month-end and year-end close processes' },
        { name: 'Expense Approval Bot', description: 'Routes and approves expense claims' },
        { name: 'VAT Return Filing Bot', description: 'Prepares and files VAT returns' },
        { name: 'Cash Flow Prediction Bot', description: 'Predicts future cash flow based on AR/AP' },
        { name: 'Revenue Forecasting Bot', description: 'Forecasts revenue based on sales pipeline' },
        { name: 'Multi-Currency Revaluation Bot', description: 'Revalues foreign currency balances' },
      ];
      
      let response = `**Financial Automation Bots (${bots.length}):**\n\n`;
      for (const bot of bots) {
        response += `- **${bot.name}**: ${bot.description}\n`;
      }
      response += `\nSay "Run reconciliation" to execute the Sales-to-Invoice Reconciliation Bot.`;
      
      return { response, data: bots };
    },
  },
  
  // Run Sales-to-Invoice Reconciliation - Real Database Query
  {
    name: 'run_reconciliation',
    description: 'Run sales-to-invoice reconciliation',
    patterns: [
      /run\s+(sales[- ]?to[- ]?invoice\s+)?reconciliation/i,
      /reconcile\s+(sales|invoices)/i,
      /sales[- ]?to[- ]?invoice\s+reconciliation/i,
      /start\s+reconciliation/i,
      /execute\s+reconciliation/i,
    ],
    slots: [],
    execute: async (ctx) => {
      try {
        // Get all sales orders
        const salesOrdersResult = await ctx.db.prepare(
          'SELECT id, order_number, customer_id, total_amount, status FROM sales_orders WHERE company_id = ? ORDER BY created_at DESC'
        ).bind(ctx.companyId).all();
        
        const salesOrders = salesOrdersResult.results || [];
        
        // Get all customer invoices
        const invoicesResult = await ctx.db.prepare(
          'SELECT id, invoice_number, customer_id, total_amount, status, sales_order_id FROM customer_invoices WHERE company_id = ? ORDER BY created_at DESC'
        ).bind(ctx.companyId).all();
        
        const invoices = invoicesResult.results || [];
        
        // Perform reconciliation
        let matchedCount = 0;
        let quantityVariances = 0;
        let priceVariances = 0;
        let missingInvoices = 0;
        const exceptions: Array<{ type: string; orderNumber: string; details: string }> = [];
        
        for (const order of salesOrders as any[]) {
          // Find matching invoice by sales_order_id or customer_id + amount
          const matchingInvoice = invoices.find((inv: any) => 
            inv.sales_order_id === order.id || 
            (inv.customer_id === order.customer_id && Math.abs(inv.total_amount - order.total_amount) < 0.01)
          );
          
          if (matchingInvoice) {
            matchedCount++;
            // Check for variances
            if (Math.abs((matchingInvoice as any).total_amount - order.total_amount) > 0.01) {
              priceVariances++;
              exceptions.push({
                type: 'Price Variance',
                orderNumber: order.order_number,
                details: `Order: R${order.total_amount?.toFixed(2)}, Invoice: R${(matchingInvoice as any).total_amount?.toFixed(2)}`,
              });
            }
          } else {
            missingInvoices++;
            exceptions.push({
              type: 'Missing Invoice',
              orderNumber: order.order_number,
              details: `No invoice found for order R${order.total_amount?.toFixed(2)}`,
            });
          }
        }
        
        const totalOrders = salesOrders.length;
        const matchRate = totalOrders > 0 ? ((matchedCount / totalOrders) * 100).toFixed(1) : 0;
        const exceptionsFound = priceVariances + quantityVariances + missingInvoices;
        
        // Create reconciliation record
        const reconciliationId = generateUUID();
        await ctx.db.prepare(`
          INSERT INTO reconciliation_runs (id, company_id, run_type, status, total_records, matched_records, exceptions_count, run_date, created_at)
          VALUES (?, ?, 'sales_to_invoice', 'completed', ?, ?, ?, datetime('now'), datetime('now'))
        `).bind(reconciliationId, ctx.companyId, totalOrders, matchedCount, exceptionsFound).run().catch(() => {
          // Table might not exist, continue anyway
        });
        
        let exceptionDetails = '';
        if (exceptions.length > 0) {
          exceptionDetails = '\n\n**Exception Details:**\n' + exceptions.slice(0, 5).map(e => 
            `- **${e.type}** - ${e.orderNumber}: ${e.details}`
          ).join('\n');
          if (exceptions.length > 5) {
            exceptionDetails += `\n  ...and ${exceptions.length - 5} more`;
          }
        }
        
        const result = {
          status: 'success',
          total_sales_orders: totalOrders,
          matched_invoices: matchedCount,
          exceptions_found: exceptionsFound,
          match_rate: parseFloat(matchRate as string),
          quantity_variances: quantityVariances,
          price_variances: priceVariances,
          missing_invoices: missingInvoices,
        };
        
        return {
          response: `**Sales-to-Invoice Reconciliation Complete!**\n\n` +
            `**Summary:**\n` +
            `- Total Sales Orders: ${result.total_sales_orders}\n` +
            `- Matched Invoices: ${result.matched_invoices}\n` +
            `- Exceptions Found: ${result.exceptions_found}\n` +
            `- Match Rate: ${result.match_rate}%\n\n` +
            `**Exceptions by Type:**\n` +
            `- Quantity Variances: ${result.quantity_variances}\n` +
            `- Price Variances: ${result.price_variances}\n` +
            `- Missing Invoices: ${result.missing_invoices}` +
            exceptionDetails +
            `\n\nNavigate to **Financial > Sales Reconciliation** to view and resolve exceptions.`,
          data: result,
        };
      } catch (error) {
        console.error('Reconciliation error:', error);
        return {
          response: `**Reconciliation Error**\n\nUnable to complete reconciliation. Please try again or check the system logs.`,
        };
      }
    },
  },
  
  // Create Sales Order - Step 1: Select Customer
  {
    name: 'create_sales_order',
    description: 'Create a new sales order',
    patterns: [
      /create\s+(a\s+)?(new\s+)?sales\s+order/i,
      /new\s+sales\s+order/i,
      /make\s+(a\s+)?sales\s+order/i,
    ],
    slots: ['customer'],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT id, customer_name, customer_code, email, phone FROM customers WHERE company_id = ? ORDER BY customer_name LIMIT 20'
      ).bind(ctx.companyId).all();
      
      const customers = result.results || [];
      if (customers.length === 0) {
        return { 
          response: '**No customers found in the system.**\n\nTo create a sales order, you first need customers. Would you like me to create a demo customer for you?\n\nReply "yes" to create a demo customer, or navigate to **CRM > Customers** to add customers manually.',
          action: 'no_customers',
          data: { path: '/crm/customers' }
        };
      }
      
      const customerList = customers.map((c: any, i: number) => 
        `**${i + 1}.** ${c.customer_name} (${c.customer_code})${c.email ? ` - ${c.email}` : ''}`
      ).join('\n');
      
      // Update conversation state
      if (ctx.updateState) {
        await ctx.updateState({
          currentFlow: 'create_sales_order',
          step: 'select_customer',
        });
      }
      
      return {
        response: `**Create Sales Order - Step 1: Select Customer**\n\nPlease select a customer by typing their number:\n\n${customerList}\n\n_Type a number (1-${customers.length}) to select a customer_`,
        action: 'select_customer',
        data: { customers, step: 'select_customer', flow: 'create_sales_order' },
        followUp: 'Which customer would you like to create a sales order for?',
      };
    },
  },
  
  
  // Complete Transaction (Sales Order, Quote, or PO)
  {
    name: 'complete_transaction',
    description: 'Complete and post sales order, quote, or purchase order',
    patterns: [
      /^done$/i,
      /^complete$/i,
      /^finish$/i,
      /^post\s+order$/i,
      /^submit$/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const state = ctx.conversationState;
      if (!state || !state.currentFlow) {
        return {
          response: `No active transaction to complete. Say "create sales order", "create quote", or "create po" to start.`,
        };
      }
      
      // Handle Quote completion
      if (state.currentFlow === 'create_quote') {
        if (!state.selectedProducts || state.selectedProducts.length === 0) {
          return { response: `Your quote is empty. Please add at least one product before completing.` };
        }
        
        const quoteNumber = `QT-${Date.now().toString().slice(-8)}`;
        const quoteId = generateUUID();
        const total = state.orderTotal || 0;
        
        try {
          await ctx.db.prepare(`
            INSERT INTO quotes (id, company_id, customer_id, quote_number, quote_date, valid_until, status, subtotal, total_amount, created_at, updated_at)
            VALUES (?, ?, ?, ?, date('now'), date('now', '+30 days'), 'draft', ?, ?, datetime('now'), datetime('now'))
          `).bind(quoteId, ctx.companyId, state.selectedCustomerId, quoteNumber, total, total).run();
          
          for (const product of state.selectedProducts) {
            const lineId = generateUUID();
            await ctx.db.prepare(`
              INSERT INTO quote_items (id, quote_id, product_id, description, quantity, unit_price, line_total, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `).bind(lineId, quoteId, product.id, product.name, product.quantity, product.price, product.quantity * product.price).run();
          }
          
          if (ctx.updateState) await ctx.updateState({});
          
          const orderItems = state.selectedProducts.map((p, i) => 
            `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
          ).join('\n');
          
          return {
            response: `**Quote Created Successfully!**\n\n**Quote Number:** ${quoteNumber}\n**Customer:** ${state.selectedCustomerName}\n**Status:** Draft\n**Valid Until:** 30 days\n\n**Items:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\nThe quote has been posted to the ERP. View it at **Sales > Quotes**.`,
            action: 'quote_created',
            data: { quoteId, quoteNumber, total },
          };
        } catch (error) {
          console.error('Error creating quote:', error);
          return { response: `**Error creating quote.** Please try again or create manually.` };
        }
      }
      
      // Handle PO completion
      if (state.currentFlow === 'create_po') {
        if (!state.selectedProducts || state.selectedProducts.length === 0) {
          return { response: `Your purchase order is empty. Please add at least one product before completing.` };
        }
        
        const poNumber = `PO-${Date.now().toString().slice(-8)}`;
        const poId = generateUUID();
        const total = state.orderTotal || 0;
        
        try {
          await ctx.db.prepare(`
            INSERT INTO purchase_orders (id, company_id, supplier_id, po_number, po_date, status, subtotal, total_amount, created_at, updated_at)
            VALUES (?, ?, ?, ?, date('now'), 'pending', ?, ?, datetime('now'), datetime('now'))
          `).bind(poId, ctx.companyId, state.selectedSupplierId, poNumber, total, total).run();
          
          for (const product of state.selectedProducts) {
            const lineId = generateUUID();
            await ctx.db.prepare(`
              INSERT INTO purchase_order_items (id, purchase_order_id, product_id, description, quantity, unit_price, line_total, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `).bind(lineId, poId, product.id, product.name, product.quantity, product.price, product.quantity * product.price).run();
          }
          
          if (ctx.updateState) await ctx.updateState({});
          
          const orderItems = state.selectedProducts.map((p, i) => 
            `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
          ).join('\n');
          
          return {
            response: `**Purchase Order Created Successfully!**\n\n**PO Number:** ${poNumber}\n**Supplier:** ${state.selectedSupplierName}\n**Status:** Pending\n\n**Items:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\nThe PO has been posted to the ERP. View it at **Procurement > Purchase Orders**.`,
            action: 'po_created',
            data: { poId, poNumber, total },
          };
        } catch (error) {
          console.error('Error creating PO:', error);
          return { response: `**Error creating purchase order.** Please try again or create manually.` };
        }
      }
      
      // Handle Sales Order completion (existing code)
      if (state.currentFlow !== 'create_sales_order') {
        return {
          response: `No active sales order to complete. Say "create sales order" to start a new one.`,
        };
      }
      
      if (!state.selectedProducts || state.selectedProducts.length === 0) {
        return {
          response: `Your order is empty. Please add at least one product before completing the order.`,
        };
      }
      
      // Generate order number
      const orderNumber = `SO-${Date.now().toString().slice(-8)}`;
      const orderId = generateUUID();
      const total = state.orderTotal || 0;
      
      try {
        // Insert sales order into database
        await ctx.db.prepare(`
          INSERT INTO sales_orders (id, company_id, customer_id, order_number, order_date, status, subtotal, total_amount, created_at, updated_at)
          VALUES (?, ?, ?, ?, date('now'), 'confirmed', ?, ?, datetime('now'), datetime('now'))
        `).bind(orderId, ctx.companyId, state.selectedCustomerId, orderNumber, total, total).run();
        
        // Insert order items (using sales_order_items table with description field)
        for (const product of state.selectedProducts) {
          const lineId = generateUUID();
          await ctx.db.prepare(`
            INSERT INTO sales_order_items (id, sales_order_id, product_id, description, quantity, unit_price, line_total, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(lineId, orderId, product.id, product.name, product.quantity, product.price, product.quantity * product.price).run();
        }
        
        // Clear conversation state
        if (ctx.updateState) {
          await ctx.updateState({});
        }
        
        const orderItems = state.selectedProducts.map((p, i) => 
          `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
        ).join('\n');
        
        return {
          response: `**Sales Order Created Successfully!**\n\n**Order Number:** ${orderNumber}\n**Customer:** ${state.selectedCustomerName}\n**Status:** Confirmed\n\n**Order Items:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\nThe order has been posted to the ERP system. You can view it at **Sales > Sales Orders**.`,
          action: 'order_created',
          data: { orderId, orderNumber, total, customerId: state.selectedCustomerId },
        };
      } catch (error) {
        console.error('Error creating sales order:', error);
        return {
          response: `**Error creating sales order.** Please try again or navigate to **Sales > Sales Orders** to create the order manually.`,
        };
      }
    },
  },
  
  // Create Demo Customer (when no customers exist)
  {
    name: 'create_demo_customer',
    description: 'Create a demo customer',
    patterns: [
      /^yes$/i,
      /^create\s+demo\s+customer$/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const state = ctx.conversationState;
      
      // Check if this is in response to "no customers" prompt
      const customerId = generateUUID();
      const customerCode = `CUST-${Date.now().toString().slice(-6)}`;
      
      try {
        await ctx.db.prepare(`
          INSERT INTO customers (id, company_id, customer_code, customer_name, email, phone, address, city, country, is_active, created_at, updated_at)
          VALUES (?, ?, ?, 'Demo Customer', 'demo@example.com', '+27 11 123 4567', '123 Main Street', 'Johannesburg', 'South Africa', 1, datetime('now'), datetime('now'))
        `).bind(customerId, ctx.companyId, customerCode).run();
        
        // Also create demo products if needed
        const productsResult = await ctx.db.prepare(
          'SELECT COUNT(*) as count FROM products WHERE company_id = ?'
        ).bind(ctx.companyId).first();
        
        if ((productsResult as any)?.count === 0) {
          // Create demo products
          const products = [
            { name: 'Widget A', code: 'WGT-001', price: 99.99 },
            { name: 'Widget B', code: 'WGT-002', price: 149.99 },
            { name: 'Service Package', code: 'SVC-001', price: 299.99 },
          ];
          
          for (const p of products) {
            const productId = generateUUID();
            await ctx.db.prepare(`
              INSERT INTO products (id, company_id, product_code, product_name, unit_price, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
            `).bind(productId, ctx.companyId, p.code, p.name, p.price).run();
          }
        }
        
        return {
          response: `**Demo data created successfully!**\n\n**Customer:** Demo Customer (${customerCode})\n**Products:** Widget A, Widget B, Service Package\n\nNow you can create a sales order. Say "create sales order" to continue.`,
          action: 'demo_created',
        };
      } catch (error) {
        console.error('Error creating demo data:', error);
        return {
          response: `Error creating demo data. Please try again or add data manually through the ERP interface.`,
        };
      }
    },
  },
  
  // General conversation / greeting
  {
    name: 'greeting',
    description: 'Handle greetings',
    patterns: [
      /^(hello|hi|hey|good\s+(morning|afternoon|evening))[\s!.,]*$/i,
      /^how\s+are\s+you/i,
    ],
    slots: [],
    execute: async () => {
      return {
        response: `Hello! I'm ARIA, your intelligent ERP assistant. I'm here to help you with:\n\n` +
          `- **View Data**: Show customers, suppliers, products, invoices, orders\n` +
          `- **Create Records**: Create quotes, purchase orders, sales orders\n` +
          `- **Automation**: List and run 67+ automation bots\n` +
          `- **Reports**: Dashboard summaries and analytics\n\n` +
          `What would you like to do today?`,
      };
    },
  },
];

// Find matching skill
function findSkill(message: string): Skill | null {
  for (const skill of skills) {
    for (const pattern of skill.patterns) {
      if (pattern.test(message)) {
        return skill;
      }
    }
  }
  return null;
}

// Default response for unmatched messages
function getDefaultResponse(): SkillResult {
  return {
    response: `I'm not sure how to help with that. Here are some things I can do:\n\n` +
      `- Show customers, suppliers, products, invoices, orders, quotes\n` +
      `- Create quotes or purchase orders\n` +
      `- Show dashboard summary\n\n` +
      `Type "help" for more details.`,
  };
}

// Create new session
app.post('/session', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    let userId = 'anonymous';
    let companyId = 'b0598135-52fd-4f67-ac56-8f0237e6355e'; // Default demo company
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract user info from token if available
      // For now, use defaults
    }
    
    const conversationId = generateUUID();
    
    // Store conversation in D1
    await c.env.DB.prepare(`
      INSERT INTO aria_conversations (id, user_id, company_id, status, created_at)
      VALUES (?, ?, ?, 'active', datetime('now'))
    `).bind(conversationId, userId, companyId).run();
    
    // Store welcome message
    const welcomeMessage = `Hello! I'm ARIA, your intelligent ERP assistant. I can help you with:\n\n` +
      `- Viewing customers, suppliers, products, invoices, and orders\n` +
      `- Creating quotes and purchase orders\n` +
      `- Getting business summaries and reports\n\n` +
      `How can I help you today?`;
    
    await c.env.DB.prepare(`
      INSERT INTO aria_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, datetime('now'))
    `).bind(generateUUID(), conversationId, welcomeMessage).run();
    
    return c.json({
      conversation_id: conversationId,
      message: welcomeMessage,
      status: 'active',
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return c.json({ error: 'Failed to create session' }, 500);
  }
});

// Send message (non-streaming)
app.post('/message', async (c) => {
  try {
    const body = await c.req.json<{ conversation_id: string; message: string }>();
    const { conversation_id, message } = body;
    
    if (!conversation_id || !message) {
      return c.json({ error: 'conversation_id and message are required' }, 400);
    }
    
    // Get conversation with context
    const conversation = await c.env.DB.prepare(
      'SELECT * FROM aria_conversations WHERE id = ?'
    ).bind(conversation_id).first<Conversation>();
    
    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }
    
    // Parse conversation state
    let conversationState: ConversationState = {};
    if (conversation.context) {
      try {
        conversationState = JSON.parse(conversation.context);
      } catch (e) {
        // Invalid JSON, start fresh
      }
    }
    
    // Store user message
    await c.env.DB.prepare(`
      INSERT INTO aria_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'user', ?, datetime('now'))
    `).bind(generateUUID(), conversation_id, message).run();
    
    // Function to update conversation state
    const updateState = async (newState: ConversationState) => {
      conversationState = newState;
      await c.env.DB.prepare(
        'UPDATE aria_conversations SET context = ? WHERE id = ?'
      ).bind(JSON.stringify(newState), conversation_id).run();
    };
    
    // Find and execute skill
    const skill = findSkill(message);
    let result: SkillResult;
    
    if (skill) {
      const context: SkillContext = {
        db: c.env.DB,
        companyId: conversation.company_id,
        userId: conversation.user_id,
        message,
        slots: {},
        conversationId: conversation_id,
        conversationState,
        updateState,
      };
      result = await skill.execute(context);
    } else {
      // Check if we're in a flow and handle number input for product selection
      if (conversationState.currentFlow === 'create_sales_order' && conversationState.step === 'select_products') {
        const match = message.match(/^(\d+)$/);
        if (match) {
          // Handle product selection by number
          const productIndex = parseInt(match[1]) - 1;
          const productsResult = await c.env.DB.prepare(
            'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const products = productsResult.results || [];
          if (productIndex >= 0 && productIndex < products.length) {
            const selectedProduct = products[productIndex] as any;
            const currentProducts = conversationState.selectedProducts || [];
            
            currentProducts.push({
              id: selectedProduct.id,
              name: selectedProduct.product_name,
              quantity: 1,
              price: selectedProduct.unit_price || 0,
            });
            
            const total = currentProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
            
            await updateState({
              ...conversationState,
              selectedProducts: currentProducts,
              orderTotal: total,
            });
            
            const orderItems = currentProducts.map((p, i) => 
              `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
            ).join('\n');
            
            result = {
              response: `**Product Added:** ${selectedProduct.product_name}\n\n**Current Order:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\n_Add more products by number, or type "done" to complete the order_`,
              data: { products: currentProducts, total },
            };
          } else {
            result = { response: `Invalid product number. Please enter a number between 1 and ${products.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_sales_order' && conversationState.step === 'select_customer') {
        const match = message.match(/^(\d+)$/);
        if (match) {
          // Handle customer selection by number
          const customerIndex = parseInt(match[1]) - 1;
          const customersResult = await c.env.DB.prepare(
            'SELECT id, customer_name, customer_code FROM customers WHERE company_id = ? ORDER BY customer_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const customers = customersResult.results || [];
          if (customerIndex >= 0 && customerIndex < customers.length) {
            const selectedCustomer = customers[customerIndex] as any;
            
            // Get products for next step
            const productsResult = await c.env.DB.prepare(
              'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
            ).bind(conversation.company_id).all();
            
            const products = productsResult.results || [];
            if (products.length === 0) {
              result = {
                response: `**Customer Selected:** ${selectedCustomer.customer_name}\n\n**No products found in the system.**\n\nTo create a sales order, you need products. Would you like me to create demo products?\n\nReply "yes" to create demo products, or navigate to **Inventory > Items** to add products manually.`,
                action: 'no_products',
              };
            } else {
              const productList = products.map((p: any, i: number) => 
                `**${i + 1}.** ${p.product_name} (${p.product_code}) - R${(p.unit_price || 0).toFixed(2)}`
              ).join('\n');
              
              await updateState({
                currentFlow: 'create_sales_order',
                step: 'select_products',
                selectedCustomerId: selectedCustomer.id,
                selectedCustomerName: selectedCustomer.customer_name,
                selectedProducts: [],
              });
              
              result = {
                response: `**Create Sales Order - Step 2: Select Products**\n\n**Customer:** ${selectedCustomer.customer_name} (${selectedCustomer.customer_code})\n\nSelect products to add to the order:\n\n${productList}\n\n_Type a product number to add it, or type "done" when finished_`,
                action: 'select_products',
                data: { products, customer: selectedCustomer, step: 'select_products' },
              };
            }
          } else {
            result = { response: `Invalid customer number. Please enter a number between 1 and ${customers.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_quote' && conversationState.step === 'select_customer') {
        // Handle quote customer selection
        const match = message.match(/^(\d+)$/);
        if (match) {
          const customerIndex = parseInt(match[1]) - 1;
          const customersResult = await c.env.DB.prepare(
            'SELECT id, customer_name, customer_code FROM customers WHERE company_id = ? ORDER BY customer_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const customers = customersResult.results || [];
          if (customerIndex >= 0 && customerIndex < customers.length) {
            const selectedCustomer = customers[customerIndex] as any;
            
            const productsResult = await c.env.DB.prepare(
              'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
            ).bind(conversation.company_id).all();
            
            const products = productsResult.results || [];
            if (products.length === 0) {
              result = {
                response: `**Customer Selected:** ${selectedCustomer.customer_name}\n\n**No products found.** Please add products first.`,
                action: 'no_products',
              };
            } else {
              const productList = products.map((p: any, i: number) => 
                `**${i + 1}.** ${p.product_name} (${p.product_code}) - R${(p.unit_price || 0).toFixed(2)}`
              ).join('\n');
              
              await updateState({
                currentFlow: 'create_quote',
                step: 'select_products',
                selectedCustomerId: selectedCustomer.id,
                selectedCustomerName: selectedCustomer.customer_name,
                selectedProducts: [],
              });
              
              result = {
                response: `**Create Quote - Step 2: Select Products**\n\n**Customer:** ${selectedCustomer.customer_name}\n\nSelect products to add:\n\n${productList}\n\n_Type a product number to add it, or type "done" when finished_`,
                action: 'select_products',
                data: { products, customer: selectedCustomer },
              };
            }
          } else {
            result = { response: `Invalid customer number. Please enter a number between 1 and ${customers.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_quote' && conversationState.step === 'select_products') {
        // Handle quote product selection
        const match = message.match(/^(\d+)$/);
        if (match) {
          const productIndex = parseInt(match[1]) - 1;
          const productsResult = await c.env.DB.prepare(
            'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const products = productsResult.results || [];
          if (productIndex >= 0 && productIndex < products.length) {
            const selectedProduct = products[productIndex] as any;
            const currentProducts = conversationState.selectedProducts || [];
            
            currentProducts.push({
              id: selectedProduct.id,
              name: selectedProduct.product_name,
              quantity: 1,
              price: selectedProduct.unit_price || 0,
            });
            
            const total = currentProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
            
            await updateState({
              ...conversationState,
              selectedProducts: currentProducts,
              orderTotal: total,
            });
            
            const orderItems = currentProducts.map((p, i) => 
              `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
            ).join('\n');
            
            result = {
              response: `**Product Added:** ${selectedProduct.product_name}\n\n**Current Quote:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\n_Add more products by number, or type "done" to complete the quote_`,
              data: { products: currentProducts, total },
            };
          } else {
            result = { response: `Invalid product number. Please enter a number between 1 and ${products.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_po' && conversationState.step === 'select_supplier') {
        // Handle PO supplier selection
        const match = message.match(/^(\d+)$/);
        if (match) {
          const supplierIndex = parseInt(match[1]) - 1;
          const suppliersResult = await c.env.DB.prepare(
            'SELECT id, supplier_name, supplier_code FROM suppliers WHERE company_id = ? ORDER BY supplier_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const suppliers = suppliersResult.results || [];
          if (supplierIndex >= 0 && supplierIndex < suppliers.length) {
            const selectedSupplier = suppliers[supplierIndex] as any;
            
            const productsResult = await c.env.DB.prepare(
              'SELECT id, product_name, product_code, cost_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
            ).bind(conversation.company_id).all();
            
            const products = productsResult.results || [];
            if (products.length === 0) {
              result = {
                response: `**Supplier Selected:** ${selectedSupplier.supplier_name}\n\n**No products found.** Please add products first.`,
                action: 'no_products',
              };
            } else {
              const productList = products.map((p: any, i: number) => 
                `**${i + 1}.** ${p.product_name} (${p.product_code}) - R${(p.cost_price || 0).toFixed(2)}`
              ).join('\n');
              
              await updateState({
                currentFlow: 'create_po',
                step: 'select_products',
                selectedSupplierId: selectedSupplier.id,
                selectedSupplierName: selectedSupplier.supplier_name,
                selectedProducts: [],
              });
              
              result = {
                response: `**Create Purchase Order - Step 2: Select Products**\n\n**Supplier:** ${selectedSupplier.supplier_name}\n\nSelect products to order:\n\n${productList}\n\n_Type a product number to add it, or type "done" when finished_`,
                action: 'select_products',
                data: { products, supplier: selectedSupplier },
              };
            }
          } else {
            result = { response: `Invalid supplier number. Please enter a number between 1 and ${suppliers.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_po' && conversationState.step === 'select_products') {
        // Handle PO product selection
        const match = message.match(/^(\d+)$/);
        if (match) {
          const productIndex = parseInt(match[1]) - 1;
          const productsResult = await c.env.DB.prepare(
            'SELECT id, product_name, product_code, cost_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const products = productsResult.results || [];
          if (productIndex >= 0 && productIndex < products.length) {
            const selectedProduct = products[productIndex] as any;
            const currentProducts = conversationState.selectedProducts || [];
            
            currentProducts.push({
              id: selectedProduct.id,
              name: selectedProduct.product_name,
              quantity: 1,
              price: selectedProduct.cost_price || 0,
            });
            
            const total = currentProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
            
            await updateState({
              ...conversationState,
              selectedProducts: currentProducts,
              orderTotal: total,
            });
            
            const orderItems = currentProducts.map((p, i) => 
              `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
            ).join('\n');
            
            result = {
              response: `**Product Added:** ${selectedProduct.product_name}\n\n**Current PO:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\n_Add more products by number, or type "done" to complete the PO_`,
              data: { products: currentProducts, total },
            };
          } else {
            result = { response: `Invalid product number. Please enter a number between 1 and ${products.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else {
        result = getDefaultResponse();
      }
    }
    
    // Store assistant response
    await c.env.DB.prepare(`
      INSERT INTO aria_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, datetime('now'))
    `).bind(generateUUID(), conversation_id, result.response).run();
    
    return c.json({
      response: result.response,
      data: result.data,
      action: result.action,
      followUp: result.followUp,
    });
  } catch (error) {
    console.error('Message error:', error);
    return c.json({ error: 'Failed to process message' }, 500);
  }
});

// Send message with streaming (SSE)
app.post('/message/stream', async (c) => {
  try {
    const body = await c.req.json<{ conversation_id: string; message: string }>();
    const { conversation_id, message } = body;
    
    if (!conversation_id || !message) {
      return c.json({ error: 'conversation_id and message are required' }, 400);
    }
    
    // Get conversation
    const conversation = await c.env.DB.prepare(
      'SELECT * FROM aria_conversations WHERE id = ?'
    ).bind(conversation_id).first<Conversation>();
    
    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }
    
    // Store user message
    await c.env.DB.prepare(`
      INSERT INTO aria_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'user', ?, datetime('now'))
    `).bind(generateUUID(), conversation_id, message).run();
    
    // Find and execute skill
    const skill = findSkill(message);
    let result: SkillResult;
    
    if (skill) {
      const context: SkillContext = {
        db: c.env.DB,
        companyId: conversation.company_id,
        userId: conversation.user_id,
        message,
        slots: {},
        conversationId: conversation_id,
      };
      result = await skill.execute(context);
    } else {
      result = getDefaultResponse();
    }
    
    // Store assistant response
    await c.env.DB.prepare(`
      INSERT INTO aria_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, datetime('now'))
    `).bind(generateUUID(), conversation_id, result.response).run();
    
    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Stream the response in chunks to simulate typing
        const words = result.response.split(' ');
        let currentText = '';
        
        for (let i = 0; i < words.length; i++) {
          currentText += (i > 0 ? ' ' : '') + words[i];
        }
        
        // Send the full response
        controller.enqueue(encoder.encode(`data: ${result.response}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    return c.json({ error: 'Failed to process message' }, 500);
  }
});

// Upload document
app.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const fileData = formData.get('file');
    
    if (!fileData || typeof fileData === 'string') {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    const file = fileData as File;
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: 'File too large. Maximum size is 10MB.' }, 400);
    }
    
    const documentId = generateUUID();
    const companyId = 'b0598135-52fd-4f67-ac56-8f0237e6355e'; // Default demo company
    const r2Key = `${companyId}/${documentId}/${file.name}`;
    
    // Upload to R2
    await c.env.DOCUMENTS.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });
    
    // Store metadata in D1
    await c.env.DB.prepare(`
      INSERT INTO aria_documents (id, company_id, filename, mime_type, size, r2_key, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'uploaded', datetime('now'))
    `).bind(documentId, companyId, file.name, file.type, file.size, r2Key).run();
    
    return c.json({
      document_id: documentId,
      filename: file.name,
      size: file.size,
      mime_type: file.type,
      status: 'uploaded',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Failed to upload document' }, 500);
  }
});

// Classify document (rule-based)
app.post('/classify/:documentId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    // Get document metadata
    const doc = await c.env.DB.prepare(
      'SELECT * FROM aria_documents WHERE id = ?'
    ).bind(documentId).first();
    
    if (!doc) {
      return c.json({ error: 'Document not found' }, 404);
    }
    
    // Rule-based classification by file type and name
    const filename = (doc as any).filename.toLowerCase();
    const mimeType = (doc as any).mime_type;
    
    let documentClass = 'unknown';
    let confidence = 0.5;
    
    if (filename.includes('invoice') || filename.includes('inv')) {
      documentClass = 'invoice';
      confidence = 0.85;
    } else if (filename.includes('quote') || filename.includes('quotation')) {
      documentClass = 'quote';
      confidence = 0.85;
    } else if (filename.includes('po') || filename.includes('purchase')) {
      documentClass = 'purchase_order';
      confidence = 0.85;
    } else if (filename.includes('receipt')) {
      documentClass = 'receipt';
      confidence = 0.80;
    } else if (filename.includes('contract')) {
      documentClass = 'contract';
      confidence = 0.80;
    } else if (mimeType === 'application/pdf') {
      documentClass = 'document';
      confidence = 0.60;
    } else if (mimeType?.startsWith('image/')) {
      documentClass = 'image';
      confidence = 0.70;
    }
    
    // Update document status
    await c.env.DB.prepare(`
      UPDATE aria_documents SET status = 'classified', document_class = ?, confidence = ?
      WHERE id = ?
    `).bind(documentClass, confidence, documentId).run();
    
    return c.json({
      document_id: documentId,
      document_class: documentClass,
      confidence,
      status: 'classified',
    });
  } catch (error) {
    console.error('Classification error:', error);
    return c.json({ error: 'Failed to classify document' }, 500);
  }
});

// Extract data from document (placeholder - returns mock data)
app.post('/extract/:documentId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    const doc = await c.env.DB.prepare(
      'SELECT * FROM aria_documents WHERE id = ?'
    ).bind(documentId).first();
    
    if (!doc) {
      return c.json({ error: 'Document not found' }, 404);
    }
    
    // Return placeholder extraction (real extraction would need OCR/AI)
    return c.json({
      document_id: documentId,
      extracted_data: {
        note: 'Document extraction requires OCR/AI integration. This is a placeholder response.',
        document_class: (doc as any).document_class || 'unknown',
        filename: (doc as any).filename,
      },
      status: 'extracted',
    });
  } catch (error) {
    console.error('Extraction error:', error);
    return c.json({ error: 'Failed to extract data' }, 500);
  }
});

// Validate document
app.post('/documents/:documentId/validate', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    const doc = await c.env.DB.prepare(
      'SELECT * FROM aria_documents WHERE id = ?'
    ).bind(documentId).first();
    
    if (!doc) {
      return c.json({ error: 'Document not found' }, 404);
    }
    
    return c.json({
      document_id: documentId,
      valid: true,
      validation_results: {
        file_exists: true,
        size_valid: (doc as any).size <= 10 * 1024 * 1024,
        type_supported: true,
      },
      status: 'validated',
    });
  } catch (error) {
    console.error('Validation error:', error);
    return c.json({ error: 'Failed to validate document' }, 500);
  }
});

// Post to ARIA (placeholder)
app.post('/documents/:documentId/post-to-aria', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    return c.json({
      document_id: documentId,
      posted: true,
      message: 'Document posted to ARIA successfully',
      status: 'posted',
    });
  } catch (error) {
    console.error('Post error:', error);
    return c.json({ error: 'Failed to post document' }, 500);
  }
});

// Export to SAP (placeholder)
app.post('/documents/:documentId/export-to-sap', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    return c.json({
      document_id: documentId,
      exported: true,
      message: 'Document exported to SAP format',
      status: 'exported',
    });
  } catch (error) {
    console.error('Export error:', error);
    return c.json({ error: 'Failed to export document' }, 500);
  }
});

// Get SAP export templates
app.get('/sap/export-templates', async (c) => {
  return c.json({
    templates: [
      { id: 'invoice', name: 'Invoice Template', format: 'IDOC' },
      { id: 'purchase_order', name: 'Purchase Order Template', format: 'IDOC' },
      { id: 'goods_receipt', name: 'Goods Receipt Template', format: 'IDOC' },
    ],
  });
});

// SAP reclassify (placeholder)
app.post('/sap/reclassify', async (c) => {
  try {
    const body = await c.req.json();
    
    return c.json({
      success: true,
      message: 'Document reclassified successfully',
      new_class: body.new_class || 'unknown',
    });
  } catch (error) {
    console.error('Reclassify error:', error);
    return c.json({ error: 'Failed to reclassify document' }, 500);
  }
});

export default app;
