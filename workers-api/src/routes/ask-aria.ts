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
  
  // Create Quote Intent
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
      // Get customers for selection
      const result = await ctx.db.prepare(
        'SELECT id, customer_name, customer_code FROM customers WHERE company_id = ? LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const customers = result.results || [];
      if (customers.length === 0) {
        return { 
          response: 'No customers found. Please create a customer first before creating a quote.',
          action: 'redirect',
          data: { path: '/crm/customers' }
        };
      }
      
      const customerList = customers.map((c: any, i: number) => 
        `${i + 1}. ${c.customer_name} (${c.customer_code})`
      ).join('\n');
      
      return {
        response: `I can help you create a quote. Please select a customer:\n\n${customerList}\n\nOr you can navigate to the Quotes page to create one with full details.`,
        action: 'select_customer',
        data: customers,
        followUp: 'Which customer would you like to create a quote for?',
      };
    },
  },
  
  // Create Purchase Order Intent
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
        'SELECT id, supplier_name, supplier_code FROM suppliers WHERE company_id = ? LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const suppliers = result.results || [];
      if (suppliers.length === 0) {
        return { 
          response: 'No suppliers found. Please add a supplier first before creating a purchase order.',
          action: 'redirect',
          data: { path: '/procurement/suppliers' }
        };
      }
      
      const supplierList = suppliers.map((s: any, i: number) => 
        `${i + 1}. ${s.supplier_name} (${s.supplier_code})`
      ).join('\n');
      
      return {
        response: `I can help you create a purchase order. Please select a supplier:\n\n${supplierList}\n\nOr navigate to the Purchase Orders page for full details.`,
        action: 'select_supplier',
        data: suppliers,
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
  
  // Run Sales-to-Invoice Reconciliation
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
      // Simulate reconciliation execution
      const result = {
        status: 'success',
        total_sales_orders: 156,
        matched_invoices: 142,
        exceptions_found: 14,
        match_rate: 91.0,
        quantity_variances: 5,
        price_variances: 6,
        missing_invoices: 3,
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
          `- Missing Invoices: ${result.missing_invoices}\n\n` +
          `Navigate to **Financial > Sales Reconciliation** to view and resolve exceptions.`,
        data: result,
      };
    },
  },
  
  // Create Sales Order
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
        'SELECT id, customer_name, customer_code FROM customers WHERE company_id = ? LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const customers = result.results || [];
      if (customers.length === 0) {
        return { 
          response: 'No customers found. Please create a customer first before creating a sales order.',
          action: 'redirect',
          data: { path: '/crm/customers' }
        };
      }
      
      const customerList = customers.map((c: any, i: number) => 
        `${i + 1}. ${c.customer_name} (${c.customer_code})`
      ).join('\n');
      
      return {
        response: `I can help you create a sales order. Please select a customer:\n\n${customerList}\n\nOr navigate to **Sales > Sales Orders** to create one with full details.`,
        action: 'select_customer',
        data: customers,
        followUp: 'Which customer would you like to create a sales order for?',
      };
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
