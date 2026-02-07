/**
 * AI Orchestrator Service
 * 
 * Uses Cloudflare Workers AI (Llama 3.1) for intelligent intent classification
 * and autonomous bot execution without human interaction.
 * 
 * This replaces the rule-based regex pattern matching with actual AI understanding.
 */

interface Env {
  DB: D1Database;
  AI: any; // Cloudflare Workers AI binding
}

interface BotDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: string[];
  examples: string[];
}

interface IntentClassification {
  intent: string;
  confidence: number;
  bot_id: string | null;
  parameters: Record<string, any>;
  requires_confirmation: boolean;
  response: string;
}

interface OrchestrationResult {
  success: boolean;
  intent: string;
  bot_id: string | null;
  action_taken: string;
  response: string;
  data?: any;
  next_step?: string;
}

// All 67 bots organized by category for the AI to understand
const BOT_CATALOG: BotDefinition[] = [
  // Order-to-Cash (O2C)
  { id: 'quote_generation', name: 'Quote Generation Bot', description: 'Creates quotes for customers with products', category: 'O2C', parameters: ['customer_id', 'products'], examples: ['create a quote', 'generate quote for customer', 'new quotation'] },
  { id: 'sales_order', name: 'Sales Order Bot', description: 'Converts approved quotes to sales orders', category: 'O2C', parameters: ['quote_id'], examples: ['create sales order', 'convert quote to order', 'new sales order'] },
  { id: 'invoice_generation', name: 'Invoice Generation Bot', description: 'Creates invoices from confirmed sales orders', category: 'O2C', parameters: ['sales_order_id'], examples: ['create invoice', 'generate invoice', 'bill customer'] },
  { id: 'ar_collections', name: 'AR Collections Bot', description: 'Sends reminders for overdue invoices', category: 'O2C', parameters: [], examples: ['collect overdue', 'send reminders', 'ar aging'] },
  { id: 'payment_processing', name: 'Payment Processing Bot', description: 'Processes customer payments', category: 'O2C', parameters: ['invoice_id', 'amount'], examples: ['process payment', 'record payment', 'customer paid'] },
  
  // Procure-to-Pay (P2P)
  { id: 'purchase_order', name: 'Purchase Order Bot', description: 'Creates purchase orders for suppliers', category: 'P2P', parameters: ['supplier_id', 'products'], examples: ['create po', 'purchase order', 'order from supplier'] },
  { id: 'goods_receipt', name: 'Goods Receipt Bot', description: 'Records goods received from suppliers', category: 'P2P', parameters: ['po_id'], examples: ['receive goods', 'goods receipt', 'stock received'] },
  { id: 'supplier_invoice', name: 'Supplier Invoice Bot', description: 'Processes supplier invoices', category: 'P2P', parameters: ['po_id'], examples: ['supplier bill', 'vendor invoice', 'ap invoice'] },
  { id: 'ap_payment', name: 'AP Payment Bot', description: 'Processes payments to suppliers', category: 'P2P', parameters: ['invoice_id'], examples: ['pay supplier', 'vendor payment', 'ap payment'] },
  
  // Financial
  { id: 'bank_reconciliation', name: 'Bank Reconciliation Bot', description: 'Reconciles bank transactions', category: 'Financial', parameters: [], examples: ['reconcile bank', 'bank recon', 'match transactions'] },
  { id: 'financial_close', name: 'Financial Close Bot', description: 'Performs month-end close', category: 'Financial', parameters: ['period'], examples: ['close month', 'financial close', 'period end'] },
  { id: 'general_ledger', name: 'General Ledger Bot', description: 'Posts journal entries', category: 'Financial', parameters: [], examples: ['post journals', 'gl entries', 'ledger update'] },
  { id: 'invoice_reconciliation', name: 'Invoice Reconciliation Bot', description: 'Matches invoices with payments', category: 'Financial', parameters: [], examples: ['reconcile invoices', 'match payments', 'invoice matching'] },
  { id: 'tax_compliance', name: 'Tax Compliance Bot', description: 'Calculates and files taxes', category: 'Financial', parameters: [], examples: ['calculate tax', 'vat return', 'tax filing'] },
  { id: 'financial_reporting', name: 'Financial Reporting Bot', description: 'Generates financial reports', category: 'Financial', parameters: ['report_type'], examples: ['generate report', 'financial statements', 'trial balance'] },
  
  // Inventory
  { id: 'inventory', name: 'Inventory Bot', description: 'Monitors stock levels and reorder points', category: 'Inventory', parameters: [], examples: ['check stock', 'inventory levels', 'low stock'] },
  { id: 'stock_movement', name: 'Stock Movement Bot', description: 'Processes stock transfers and adjustments', category: 'Inventory', parameters: ['product_id', 'quantity'], examples: ['move stock', 'transfer inventory', 'stock adjustment'] },
  { id: 'reorder', name: 'Reorder Bot', description: 'Creates purchase orders for low stock items', category: 'Inventory', parameters: [], examples: ['reorder stock', 'auto purchase', 'replenish'] },
  
  // Manufacturing
  { id: 'work_order', name: 'Work Order Bot', description: 'Creates manufacturing work orders', category: 'Manufacturing', parameters: ['product_id', 'quantity'], examples: ['create work order', 'production order', 'manufacture'] },
  { id: 'production', name: 'Production Bot', description: 'Tracks production progress', category: 'Manufacturing', parameters: ['work_order_id'], examples: ['start production', 'production status', 'manufacturing'] },
  { id: 'quality_control', name: 'Quality Control Bot', description: 'Performs quality inspections', category: 'Manufacturing', parameters: ['work_order_id'], examples: ['quality check', 'qc inspection', 'quality control'] },
  { id: 'bom_management', name: 'BOM Management Bot', description: 'Manages bills of materials', category: 'Manufacturing', parameters: ['product_id'], examples: ['update bom', 'bill of materials', 'recipe'] },
  
  // HR & Payroll
  { id: 'payroll', name: 'Payroll Bot', description: 'Processes payroll runs', category: 'HR', parameters: ['period'], examples: ['run payroll', 'process salaries', 'pay employees'] },
  { id: 'leave_management', name: 'Leave Management Bot', description: 'Processes leave requests', category: 'HR', parameters: [], examples: ['approve leave', 'leave request', 'time off'] },
  { id: 'expense_management', name: 'Expense Management Bot', description: 'Processes expense claims', category: 'HR', parameters: [], examples: ['process expenses', 'expense claim', 'reimbursement'] },
  
  // CRM
  { id: 'lead_scoring', name: 'Lead Scoring Bot', description: 'Scores and prioritizes leads', category: 'CRM', parameters: [], examples: ['score leads', 'lead priority', 'hot leads'] },
  { id: 'opportunity', name: 'Opportunity Bot', description: 'Manages sales opportunities', category: 'CRM', parameters: ['lead_id'], examples: ['create opportunity', 'sales pipeline', 'deal'] },
  { id: 'customer_onboarding', name: 'Customer Onboarding Bot', description: 'Onboards new customers', category: 'CRM', parameters: ['customer_id'], examples: ['onboard customer', 'new customer setup', 'welcome customer'] },
  
  // Compliance
  { id: 'bbbee_compliance', name: 'B-BBEE Compliance Bot', description: 'Tracks B-BBEE compliance (South Africa)', category: 'Compliance', parameters: [], examples: ['bbbee report', 'bee compliance', 'transformation'] },
  { id: 'audit_trail', name: 'Audit Trail Bot', description: 'Maintains audit logs', category: 'Compliance', parameters: [], examples: ['audit log', 'compliance audit', 'track changes'] },
  
  // Workflow
  { id: 'workflow_automation', name: 'Workflow Automation Bot', description: 'Processes workflow tasks and approvals', category: 'Workflow', parameters: [], examples: ['process approvals', 'workflow tasks', 'pending approvals'] },
  { id: 'document_processing', name: 'Document Processing Bot', description: 'Processes and classifies documents', category: 'Workflow', parameters: ['document_id'], examples: ['process document', 'classify document', 'ocr'] },
  { id: 'email_automation', name: 'Email Automation Bot', description: 'Sends automated emails', category: 'Workflow', parameters: ['template', 'recipient'], examples: ['send email', 'email notification', 'automated email'] },
];

// Data query intents (not bot executions)
const QUERY_INTENTS = [
  { intent: 'list_customers', description: 'List all customers', examples: ['show customers', 'list customers', 'customer list', 'who are my customers'] },
  { intent: 'list_suppliers', description: 'List all suppliers', examples: ['show suppliers', 'list vendors', 'supplier list', 'who are my suppliers'] },
  { intent: 'list_products', description: 'List all products', examples: ['show products', 'list items', 'inventory', 'what products do we have'] },
  { intent: 'list_invoices', description: 'List invoices', examples: ['show invoices', 'list bills', 'recent invoices', 'outstanding invoices'] },
  { intent: 'list_sales_orders', description: 'List sales orders', examples: ['show orders', 'list sales orders', 'pending orders'] },
  { intent: 'list_purchase_orders', description: 'List purchase orders', examples: ['show pos', 'list purchase orders', 'pending purchases'] },
  { intent: 'list_quotes', description: 'List quotes', examples: ['show quotes', 'list quotations', 'pending quotes'] },
  { intent: 'dashboard', description: 'Show business summary', examples: ['dashboard', 'summary', 'overview', 'how is business'] },
  { intent: 'list_bots', description: 'List available bots', examples: ['show bots', 'list agents', 'what bots are available', 'automation agents'] },
  { intent: 'help', description: 'Show help', examples: ['help', 'what can you do', 'commands', 'how to use'] },
];

/**
 * Build the system prompt for the AI model
 */
function buildSystemPrompt(): string {
  const botList = BOT_CATALOG.map(b => 
    `- ${b.id}: ${b.name} - ${b.description} (Category: ${b.category})`
  ).join('\n');
  
  const queryList = QUERY_INTENTS.map(q => 
    `- ${q.intent}: ${q.description}`
  ).join('\n');

  return `You are ARIA, an AI-powered ERP assistant that helps users manage their business operations autonomously.

Your job is to understand user requests and either:
1. Execute a bot to perform a transaction (create orders, invoices, etc.)
2. Query data (list customers, show invoices, etc.)
3. Provide help and guidance

AVAILABLE BOTS FOR TRANSACTIONS:
${botList}

AVAILABLE DATA QUERIES:
${queryList}

RESPONSE FORMAT:
You must respond with a JSON object containing:
{
  "intent": "the classified intent (bot_id or query intent)",
  "confidence": 0.0-1.0,
  "bot_id": "bot_id if executing a bot, null otherwise",
  "parameters": { extracted parameters from the user message },
  "requires_confirmation": false (always false for autonomous execution),
  "action": "execute_bot" | "query_data" | "help" | "clarify",
  "response": "A brief message to the user about what you're doing"
}

IMPORTANT RULES:
1. Always try to understand the user's intent, even if phrased differently
2. Extract any mentioned entities (customer names, product names, amounts, etc.)
3. For transactions, set requires_confirmation to false - execute autonomously
4. If you can't determine the intent, ask for clarification
5. Be helpful and proactive - suggest next steps when appropriate

Examples:
- "create a sales order for Acme Corp" -> intent: "sales_order", parameters: {customer_name: "Acme Corp"}
- "show me all customers" -> intent: "list_customers", action: "query_data"
- "run the payroll bot" -> intent: "payroll", bot_id: "payroll", action: "execute_bot"
- "what's our inventory status" -> intent: "inventory", action: "query_data" or bot_id: "inventory"`;
}

/**
 * Use hybrid approach: rule-based first for known commands, then AI for complex queries
 * This ensures reliable bot execution while still supporting natural language
 */
export async function classifyIntent(
  message: string,
  conversationHistory: Array<{role: string, content: string}>,
  env: Env
): Promise<IntentClassification> {
  // STEP 1: Try rule-based classification FIRST for known commands
  // This is faster and more reliable for common bot commands
  const ruleBasedResult = enhancedRuleBasedClassification(message);
  
  // If rule-based found a high-confidence match, use it immediately
  if (ruleBasedResult.confidence >= 0.7) {
    console.log(`Rule-based match: ${ruleBasedResult.intent} (confidence: ${ruleBasedResult.confidence})`);
    return ruleBasedResult;
  }
  
  // STEP 2: Try AI classification for complex/ambiguous queries
  try {
    const systemPrompt = buildSystemPrompt();
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-5), // Last 5 messages for context
      { role: 'user', content: message }
    ];

    // Call Cloudflare Workers AI
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages,
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more consistent classification
    });

    // Parse the AI response
    const aiResponse = response.response || response.text || '';
    
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const aiResult = {
          intent: parsed.intent || 'unknown',
          confidence: parsed.confidence || 0.5,
          bot_id: parsed.bot_id || null,
          parameters: parsed.parameters || {},
          requires_confirmation: false, // Always autonomous
          response: parsed.response || 'Processing your request...',
        };
        
        // If AI found a valid intent, use it
        if (aiResult.intent !== 'unknown' && aiResult.confidence > 0.4) {
          console.log(`AI match: ${aiResult.intent} (confidence: ${aiResult.confidence})`);
          return aiResult;
        }
      } catch (e) {
        console.error('JSON parsing failed:', e);
      }
    }

    // STEP 3: If AI didn't find anything useful, return rule-based result (even if low confidence)
    // This ensures we always try to do something helpful
    if (ruleBasedResult.intent !== 'unknown') {
      console.log(`Falling back to rule-based: ${ruleBasedResult.intent}`);
      return ruleBasedResult;
    }
    
    // Last resort: return unknown with AI response
    return {
      intent: 'unknown',
      confidence: 0.3,
      bot_id: null,
      parameters: {},
      requires_confirmation: false,
      response: aiResponse || "I'm not sure what you'd like me to do. Try saying 'help' to see available commands.",
    };
  } catch (error) {
    console.error('AI classification error:', error);
    // Return rule-based result on AI error
    return ruleBasedResult.intent !== 'unknown' ? ruleBasedResult : fallbackClassification(message);
  }
}

/**
 * Enhanced rule-based classification with fuzzy matching and keyword extraction
 * This is the primary classification method for known commands
 */
function enhancedRuleBasedClassification(message: string): IntentClassification {
  const lowerMessage = message.toLowerCase().trim();
  const words = lowerMessage.split(/\s+/);
  
  // Direct command patterns with high confidence
  const directCommands: Array<{patterns: RegExp[], bot_id: string, name: string, confidence: number}> = [
    // O2C Commands
    { patterns: [/create\s+(a\s+)?quote/i, /new\s+quote/i, /generate\s+quote/i, /make\s+(a\s+)?quote/i], bot_id: 'quote_generation', name: 'Quote Generation Bot', confidence: 0.95 },
    { patterns: [/create\s+(a\s+)?sales\s+order/i, /new\s+sales\s+order/i, /convert\s+quote/i, /make\s+(a\s+)?sales\s+order/i], bot_id: 'sales_order', name: 'Sales Order Bot', confidence: 0.95 },
    { patterns: [/create\s+(an?\s+)?invoice/i, /generate\s+invoice/i, /new\s+invoice/i, /bill\s+customer/i], bot_id: 'invoice_generation', name: 'Invoice Generation Bot', confidence: 0.95 },
    { patterns: [/collect\s+overdue/i, /ar\s+collection/i, /send\s+reminder/i, /overdue\s+invoice/i], bot_id: 'ar_collections', name: 'AR Collections Bot', confidence: 0.9 },
    { patterns: [/process\s+payment/i, /record\s+payment/i, /customer\s+paid/i, /receive\s+payment/i], bot_id: 'payment_processing', name: 'Payment Processing Bot', confidence: 0.9 },
    
    // P2P Commands
    { patterns: [/create\s+(a\s+)?purchase\s+order/i, /new\s+purchase\s+order/i, /create\s+(a\s+)?po\b/i, /new\s+po\b/i, /order\s+from\s+supplier/i], bot_id: 'purchase_order', name: 'Purchase Order Bot', confidence: 0.95 },
    { patterns: [/receive\s+goods/i, /goods\s+receipt/i, /stock\s+received/i, /grn/i], bot_id: 'goods_receipt', name: 'Goods Receipt Bot', confidence: 0.9 },
    { patterns: [/supplier\s+invoice/i, /vendor\s+invoice/i, /ap\s+invoice/i, /supplier\s+bill/i], bot_id: 'supplier_invoice', name: 'Supplier Invoice Bot', confidence: 0.9 },
    { patterns: [/pay\s+supplier/i, /vendor\s+payment/i, /ap\s+payment/i, /pay\s+vendor/i], bot_id: 'ap_payment', name: 'AP Payment Bot', confidence: 0.9 },
    
    // Financial Commands
    { patterns: [/bank\s+reconcil/i, /reconcile\s+bank/i, /bank\s+recon/i, /match\s+transaction/i, /run\s+bank/i], bot_id: 'bank_reconciliation', name: 'Bank Reconciliation Bot', confidence: 0.9 },
    { patterns: [/financial\s+close/i, /close\s+month/i, /month\s*-?\s*end\s+close/i, /period\s+end/i], bot_id: 'financial_close', name: 'Financial Close Bot', confidence: 0.9 },
    { patterns: [/post\s+journal/i, /gl\s+entr/i, /general\s+ledger/i, /ledger\s+update/i], bot_id: 'general_ledger', name: 'General Ledger Bot', confidence: 0.9 },
    { patterns: [/invoice\s+reconcil/i, /reconcile\s+invoice/i, /match\s+payment/i, /run\s+invoice\s+reconcil/i, /run\s+.*reconcil/i, /sales.*invoice.*reconcil/i], bot_id: 'invoice_reconciliation', name: 'Invoice Reconciliation Bot', confidence: 0.9 },
    { patterns: [/tax\s+compliance/i, /calculate\s+tax/i, /vat\s+return/i, /tax\s+filing/i], bot_id: 'tax_compliance', name: 'Tax Compliance Bot', confidence: 0.9 },
    { patterns: [/financial\s+report/i, /generate\s+report/i, /trial\s+balance/i, /financial\s+statement/i], bot_id: 'financial_reporting', name: 'Financial Reporting Bot', confidence: 0.9 },
    
    // Inventory Commands
    { patterns: [/check\s+stock/i, /inventory\s+level/i, /low\s+stock/i, /stock\s+status/i], bot_id: 'inventory', name: 'Inventory Bot', confidence: 0.9 },
    { patterns: [/move\s+stock/i, /stock\s+movement/i, /transfer\s+inventory/i, /stock\s+adjustment/i], bot_id: 'stock_movement', name: 'Stock Movement Bot', confidence: 0.9 },
    { patterns: [/reorder\s+stock/i, /auto\s+purchase/i, /replenish/i, /reorder\s+point/i], bot_id: 'reorder', name: 'Reorder Bot', confidence: 0.9 },
    
    // Manufacturing Commands
    { patterns: [/create\s+work\s*order/i, /new\s+work\s*order/i, /production\s+order/i, /manufacture/i, /work\s*order/i], bot_id: 'work_order', name: 'Work Order Bot', confidence: 0.9 },
    { patterns: [/start\s+production/i, /production\s+status/i, /manufacturing\s+status/i], bot_id: 'production', name: 'Production Bot', confidence: 0.9 },
    { patterns: [/quality\s+check/i, /qc\s+inspection/i, /quality\s+control/i], bot_id: 'quality_control', name: 'Quality Control Bot', confidence: 0.9 },
    { patterns: [/update\s+bom/i, /bill\s+of\s+material/i, /bom\s+management/i], bot_id: 'bom_management', name: 'BOM Management Bot', confidence: 0.9 },
    
    // HR Commands
    { patterns: [/run\s+payroll/i, /process\s+payroll/i, /process\s+salaries/i, /pay\s+employees/i], bot_id: 'payroll', name: 'Payroll Bot', confidence: 0.95 },
    { patterns: [/approve\s+leave/i, /leave\s+request/i, /time\s+off/i, /leave\s+management/i], bot_id: 'leave_management', name: 'Leave Management Bot', confidence: 0.9 },
    { patterns: [/process\s+expense/i, /expense\s+claim/i, /reimbursement/i], bot_id: 'expense_management', name: 'Expense Management Bot', confidence: 0.9 },
    
    // CRM Commands
    { patterns: [/score\s+lead/i, /lead\s+scoring/i, /lead\s+priority/i, /hot\s+lead/i], bot_id: 'lead_scoring', name: 'Lead Scoring Bot', confidence: 0.9 },
    { patterns: [/create\s+opportunity/i, /sales\s+pipeline/i, /new\s+deal/i], bot_id: 'opportunity', name: 'Opportunity Bot', confidence: 0.9 },
    { patterns: [/onboard\s+customer/i, /customer\s+onboarding/i, /welcome\s+customer/i], bot_id: 'customer_onboarding', name: 'Customer Onboarding Bot', confidence: 0.9 },
    
    // Compliance Commands
    { patterns: [/bbbee/i, /bee\s+compliance/i, /transformation/i], bot_id: 'bbbee_compliance', name: 'B-BBEE Compliance Bot', confidence: 0.9 },
    { patterns: [/audit\s+log/i, /audit\s+trail/i, /compliance\s+audit/i], bot_id: 'audit_trail', name: 'Audit Trail Bot', confidence: 0.9 },
    
    // Workflow Commands
    { patterns: [/process\s+approval/i, /workflow\s+task/i, /pending\s+approval/i], bot_id: 'workflow_automation', name: 'Workflow Automation Bot', confidence: 0.9 },
    { patterns: [/process\s+document/i, /classify\s+document/i, /ocr/i], bot_id: 'document_processing', name: 'Document Processing Bot', confidence: 0.9 },
    { patterns: [/send\s+email/i, /email\s+notification/i, /automated\s+email/i], bot_id: 'email_automation', name: 'Email Automation Bot', confidence: 0.9 },
  ];
  
  // Check direct command patterns first
  for (const cmd of directCommands) {
    for (const pattern of cmd.patterns) {
      if (pattern.test(lowerMessage)) {
        return {
          intent: cmd.bot_id,
          confidence: cmd.confidence,
          bot_id: cmd.bot_id,
          parameters: extractParameters(message),
          requires_confirmation: false,
          response: `Executing ${cmd.name}...`,
        };
      }
    }
  }
  
  // Query patterns for data retrieval
  const queryPatterns: Array<{patterns: RegExp[], intent: string, description: string}> = [
    { patterns: [/show\s+(me\s+)?(all\s+)?customers?/i, /list\s+(all\s+)?customers?/i, /customer\s+list/i], intent: 'list_customers', description: 'customers' },
    { patterns: [/show\s+(me\s+)?(all\s+)?suppliers?/i, /list\s+(all\s+)?suppliers?/i, /vendor\s+list/i], intent: 'list_suppliers', description: 'suppliers' },
    { patterns: [/show\s+(me\s+)?(all\s+)?products?/i, /list\s+(all\s+)?products?/i, /inventory/i], intent: 'list_products', description: 'products' },
    { patterns: [/show\s+(me\s+)?(all\s+)?invoices?/i, /list\s+(all\s+)?invoices?/i, /recent\s+invoices?/i], intent: 'list_invoices', description: 'invoices' },
    { patterns: [/show\s+(me\s+)?(all\s+)?sales\s+orders?/i, /list\s+(all\s+)?sales\s+orders?/i], intent: 'list_sales_orders', description: 'sales orders' },
    { patterns: [/show\s+(me\s+)?(all\s+)?purchase\s+orders?/i, /list\s+(all\s+)?purchase\s+orders?/i, /show\s+pos?/i], intent: 'list_purchase_orders', description: 'purchase orders' },
    { patterns: [/show\s+(me\s+)?(all\s+)?quotes?/i, /list\s+(all\s+)?quotes?/i, /quotations?/i], intent: 'list_quotes', description: 'quotes' },
    { patterns: [/dashboard/i, /summary/i, /overview/i, /business\s+status/i], intent: 'dashboard', description: 'dashboard' },
    { patterns: [/show\s+(all\s+)?bots?/i, /list\s+(all\s+)?bots?/i, /what\s+bots/i, /available\s+bots?/i, /automation\s+agents?/i], intent: 'list_bots', description: 'available bots' },
    { patterns: [/^help$/i, /what\s+can\s+you\s+do/i, /commands?/i, /capabilities/i], intent: 'help', description: 'help' },
  ];
  
  for (const query of queryPatterns) {
    for (const pattern of query.patterns) {
      if (pattern.test(lowerMessage)) {
        return {
          intent: query.intent,
          confidence: 0.85,
          bot_id: null,
          parameters: {},
          requires_confirmation: false,
          response: `Fetching ${query.description}...`,
        };
      }
    }
  }
  
  // Keyword-based matching as fallback (lower confidence)
  const keywordMatches = [
    { keywords: ['quote', 'quotation'], bot_id: 'quote_generation', name: 'Quote Generation Bot' },
    { keywords: ['sales', 'order'], bot_id: 'sales_order', name: 'Sales Order Bot' },
    { keywords: ['invoice', 'bill'], bot_id: 'invoice_generation', name: 'Invoice Generation Bot' },
    { keywords: ['purchase', 'po'], bot_id: 'purchase_order', name: 'Purchase Order Bot' },
    { keywords: ['payroll', 'salary'], bot_id: 'payroll', name: 'Payroll Bot' },
    { keywords: ['inventory', 'stock'], bot_id: 'inventory', name: 'Inventory Bot' },
    { keywords: ['reconcil'], bot_id: 'bank_reconciliation', name: 'Bank Reconciliation Bot' },
  ];
  
  for (const match of keywordMatches) {
    const hasKeyword = match.keywords.some(kw => lowerMessage.includes(kw));
    const hasActionWord = ['create', 'run', 'execute', 'process', 'generate', 'make', 'start'].some(w => lowerMessage.includes(w));
    if (hasKeyword && hasActionWord) {
      return {
        intent: match.bot_id,
        confidence: 0.6,
        bot_id: match.bot_id,
        parameters: extractParameters(message),
        requires_confirmation: false,
        response: `Executing ${match.name}...`,
      };
    }
  }
  
  return {
    intent: 'unknown',
    confidence: 0.2,
    bot_id: null,
    parameters: {},
    requires_confirmation: false,
    response: "I'm not sure what you'd like me to do. Try saying 'help' to see available commands.",
  };
}

/**
 * Extract parameters from message (customer names, amounts, etc.)
 */
function extractParameters(message: string): Record<string, any> {
  const params: Record<string, any> = {};
  
  // Extract amounts (R1000, $500, 1000.00)
  const amountMatch = message.match(/[R$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (amountMatch) {
    params.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }
  
  // Extract quoted strings (customer names, product names)
  const quotedMatch = message.match(/"([^"]+)"|'([^']+)'/);
  if (quotedMatch) {
    params.name = quotedMatch[1] || quotedMatch[2];
  }
  
  // Extract "for X" patterns
  const forMatch = message.match(/for\s+([A-Z][a-zA-Z\s]+?)(?:\s+with|\s+at|\s*$)/i);
  if (forMatch) {
    params.target = forMatch[1].trim();
  }
  
  return params;
}

/**
 * Fallback rule-based classification when AI is unavailable
 */
function fallbackClassification(message: string): IntentClassification {
  const lowerMessage = message.toLowerCase();
  
  // Check for bot execution patterns
  for (const bot of BOT_CATALOG) {
    for (const example of bot.examples) {
      if (lowerMessage.includes(example.toLowerCase())) {
        return {
          intent: bot.id,
          confidence: 0.8,
          bot_id: bot.id,
          parameters: {},
          requires_confirmation: false,
          response: `Executing ${bot.name}...`,
        };
      }
    }
  }
  
  // Check for query patterns
  for (const query of QUERY_INTENTS) {
    for (const example of query.examples) {
      if (lowerMessage.includes(example.toLowerCase())) {
        return {
          intent: query.intent,
          confidence: 0.8,
          bot_id: null,
          parameters: {},
          requires_confirmation: false,
          response: `Fetching ${query.description.toLowerCase()}...`,
        };
      }
    }
  }
  
  return {
    intent: 'unknown',
    confidence: 0.2,
    bot_id: null,
    parameters: {},
    requires_confirmation: false,
    response: "I'm not sure what you'd like me to do. Try saying 'help' to see available commands.",
  };
}

/**
 * Execute a bot based on the classified intent
 */
export async function executeBot(
  botId: string,
  parameters: Record<string, any>,
  companyId: string,
  userId: string,
  env: Env
): Promise<OrchestrationResult> {
  const timestamp = new Date().toISOString();
  
  // Import bot executor functions dynamically
  const {
    executeQuoteGenerationBot,
    executeSalesOrderBot,
    executePurchaseOrderBot,
    executeARCollectionsBot,
    executePaymentProcessingBot,
    executeWorkflowAutomationBot,
    executeWorkOrderBot,
    executeProductionBot,
    executeQualityControlBot,
    executeInventoryBot,
    executeStockMovementBot,
    executePayrollBot,
    executeLeaveManagementBot,
    executeBankReconciliationBot,
    executeGoodsReceiptBot,
    executeInvoiceGenerationBot,
    executeExpenseManagementBot,
    executeLeadScoringBot,
    executeOpportunityBot,
    executeAccountsPayableBot,
    executeFinancialCloseBot,
    executeGeneralLedgerBot,
    executeInvoiceReconciliationBot,
    executeTaxComplianceBot,
    executeBBBEEComplianceBot,
    executeFinancialReportingBot,
  } = await import('./bot-executor');
  
  const config = parameters;
  
  // Map bot IDs to executor functions
  const botExecutors: Record<string, () => Promise<any>> = {
    'quote_generation': () => executeQuoteGenerationBot(companyId, config, env.DB, userId, timestamp),
    'sales_order': () => executeSalesOrderBot(companyId, config, env.DB, userId, timestamp),
    'purchase_order': () => executePurchaseOrderBot(companyId, config, env.DB, userId, timestamp),
    'ar_collections': () => executeARCollectionsBot(companyId, config, env.DB, userId, timestamp),
    'payment_processing': () => executePaymentProcessingBot(companyId, config, env.DB, userId, timestamp),
    'workflow_automation': () => executeWorkflowAutomationBot(companyId, config, env.DB, userId, timestamp),
    'work_order': () => executeWorkOrderBot(companyId, config, env.DB, userId, timestamp),
    'production': () => executeProductionBot(companyId, config, env.DB, userId, timestamp),
    'quality_control': () => executeQualityControlBot(companyId, config, env.DB, userId, timestamp),
    'inventory': () => executeInventoryBot(companyId, config, env.DB, userId, timestamp),
    'stock_movement': () => executeStockMovementBot(companyId, config, env.DB, userId, timestamp),
    'payroll': () => executePayrollBot(companyId, config, env.DB, userId, timestamp),
    'leave_management': () => executeLeaveManagementBot(companyId, config, env.DB, userId, timestamp),
    'bank_reconciliation': () => executeBankReconciliationBot(companyId, config, env.DB, userId, timestamp),
    'goods_receipt': () => executeGoodsReceiptBot(companyId, config, env.DB, userId, timestamp),
    'invoice_generation': () => executeInvoiceGenerationBot(companyId, config, env.DB, userId, timestamp),
    'expense_management': () => executeExpenseManagementBot(companyId, config, env.DB, userId, timestamp),
    'lead_scoring': () => executeLeadScoringBot(companyId, config, env.DB, userId, timestamp),
    'opportunity': () => executeOpportunityBot(companyId, config, env.DB, userId, timestamp),
    'ap_payment': () => executeAccountsPayableBot(companyId, config, env.DB, userId, timestamp),
    'financial_close': () => executeFinancialCloseBot(companyId, config, env.DB, userId, timestamp),
    'general_ledger': () => executeGeneralLedgerBot(companyId, config, env.DB, userId, timestamp),
    'invoice_reconciliation': () => executeInvoiceReconciliationBot(companyId, config, env.DB, userId, timestamp),
    'tax_compliance': () => executeTaxComplianceBot(companyId, config, env.DB, userId, timestamp),
    'bbbee_compliance': () => executeBBBEEComplianceBot(companyId, config, env.DB, userId, timestamp),
    'financial_reporting': () => executeFinancialReportingBot(companyId, config, env.DB, userId, timestamp),
  };
  
  const executor = botExecutors[botId];
  if (!executor) {
    return {
      success: false,
      intent: botId,
      bot_id: botId,
      action_taken: 'none',
      response: `Bot "${botId}" is not yet implemented. Please try a different command.`,
    };
  }
  
  try {
    const result = await executor();
    return {
      success: result.success,
      intent: botId,
      bot_id: botId,
      action_taken: result.state_changed ? 'executed' : 'no_action',
      response: result.message,
      data: result.details,
      next_step: result.state_changed ? 'View the results in the relevant module' : undefined,
    };
  } catch (error) {
    return {
      success: false,
      intent: botId,
      bot_id: botId,
      action_taken: 'error',
      response: `Failed to execute ${botId}: ${String(error)}`,
    };
  }
}

/**
 * Execute a data query
 */
export async function executeQuery(
  intent: string,
  parameters: Record<string, any>,
  companyId: string,
  env: Env
): Promise<OrchestrationResult> {
  const db = env.DB;
  
  try {
    switch (intent) {
      case 'list_customers': {
        const result = await db.prepare(
          'SELECT id, customer_name, customer_code, email FROM customers WHERE company_id = ? LIMIT 20'
        ).bind(companyId).all();
        const customers = result.results || [];
        const list = customers.map((c: any) => `- ${c.customer_name} (${c.customer_code})`).join('\n');
        return {
          success: true,
          intent,
          bot_id: null,
          action_taken: 'query',
          response: customers.length > 0 
            ? `Found ${customers.length} customers:\n\n${list}`
            : 'No customers found. Would you like to create one?',
          data: customers,
        };
      }
      
      case 'list_suppliers': {
        const result = await db.prepare(
          'SELECT id, supplier_name, supplier_code, email FROM suppliers WHERE company_id = ? LIMIT 20'
        ).bind(companyId).all();
        const suppliers = result.results || [];
        const list = suppliers.map((s: any) => `- ${s.supplier_name} (${s.supplier_code})`).join('\n');
        return {
          success: true,
          intent,
          bot_id: null,
          action_taken: 'query',
          response: suppliers.length > 0 
            ? `Found ${suppliers.length} suppliers:\n\n${list}`
            : 'No suppliers found. Would you like to add one?',
          data: suppliers,
        };
      }
      
      case 'list_products': {
        const result = await db.prepare(
          'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? LIMIT 20'
        ).bind(companyId).all();
        const products = result.results || [];
        const list = products.map((p: any) => `- ${p.product_name} (${p.product_code}) - R${p.unit_price || 0}`).join('\n');
        return {
          success: true,
          intent,
          bot_id: null,
          action_taken: 'query',
          response: products.length > 0 
            ? `Found ${products.length} products:\n\n${list}`
            : 'No products found. Would you like to add one?',
          data: products,
        };
      }
      
      case 'list_invoices': {
        const result = await db.prepare(
          'SELECT id, invoice_number, total_amount, status FROM customer_invoices WHERE company_id = ? ORDER BY created_at DESC LIMIT 10'
        ).bind(companyId).all();
        const invoices = result.results || [];
        const list = invoices.map((i: any) => `- ${i.invoice_number} - R${i.total_amount || 0} (${i.status})`).join('\n');
        return {
          success: true,
          intent,
          bot_id: null,
          action_taken: 'query',
          response: invoices.length > 0 
            ? `Found ${invoices.length} recent invoices:\n\n${list}`
            : 'No invoices found.',
          data: invoices,
        };
      }
      
      case 'list_sales_orders': {
        const result = await db.prepare(
          'SELECT id, order_number, total_amount, status FROM sales_orders WHERE company_id = ? ORDER BY created_at DESC LIMIT 10'
        ).bind(companyId).all();
        const orders = result.results || [];
        const list = orders.map((o: any) => `- ${o.order_number} - R${o.total_amount || 0} (${o.status})`).join('\n');
        return {
          success: true,
          intent,
          bot_id: null,
          action_taken: 'query',
          response: orders.length > 0 
            ? `Found ${orders.length} sales orders:\n\n${list}`
            : 'No sales orders found.',
          data: orders,
        };
      }
      
      case 'list_purchase_orders': {
        const result = await db.prepare(
          'SELECT id, po_number, total_amount, status FROM purchase_orders WHERE company_id = ? ORDER BY created_at DESC LIMIT 10'
        ).bind(companyId).all();
        const orders = result.results || [];
        const list = orders.map((o: any) => `- ${o.po_number} - R${o.total_amount || 0} (${o.status})`).join('\n');
        return {
          success: true,
          intent,
          bot_id: null,
          action_taken: 'query',
          response: orders.length > 0 
            ? `Found ${orders.length} purchase orders:\n\n${list}`
            : 'No purchase orders found.',
          data: orders,
        };
      }
      
      case 'list_quotes': {
        const result = await db.prepare(
          'SELECT id, quote_number, total_amount, status FROM quotes WHERE company_id = ? ORDER BY created_at DESC LIMIT 10'
        ).bind(companyId).all();
        const quotes = result.results || [];
        const list = quotes.map((q: any) => `- ${q.quote_number} - R${q.total_amount || 0} (${q.status})`).join('\n');
        return {
          success: true,
          intent,
          bot_id: null,
          action_taken: 'query',
          response: quotes.length > 0 
            ? `Found ${quotes.length} quotes:\n\n${list}`
            : 'No quotes found.',
          data: quotes,
        };
      }
      
      case 'dashboard': {
        const [customers, suppliers, products, invoices, orders] = await Promise.all([
          db.prepare('SELECT COUNT(*) as count FROM customers WHERE company_id = ?').bind(companyId).first(),
          db.prepare('SELECT COUNT(*) as count FROM suppliers WHERE company_id = ?').bind(companyId).first(),
          db.prepare('SELECT COUNT(*) as count FROM products WHERE company_id = ?').bind(companyId).first(),
          db.prepare('SELECT COUNT(*) as count FROM customer_invoices WHERE company_id = ?').bind(companyId).first(),
          db.prepare('SELECT COUNT(*) as count FROM sales_orders WHERE company_id = ?').bind(companyId).first(),
        ]);
        
        return {
          success: true,
          intent,
          bot_id: null,
          action_taken: 'query',
          response: `**Business Summary**\n\n` +
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
      }
      
      case 'list_bots': {
        const botList = BOT_CATALOG.map(b => `- **${b.name}**: ${b.description}`).join('\n');
        return {
          success: true,
          intent,
          bot_id: null,
          action_taken: 'query',
          response: `**Available Automation Bots (${BOT_CATALOG.length} total)**\n\n${botList}\n\nSay "run [bot name]" to execute any bot.`,
          data: BOT_CATALOG,
        };
      }
      
      case 'help': {
        return {
          success: true,
          intent,
          bot_id: null,
          action_taken: 'help',
          response: `**ARIA ERP Assistant**\n\nI can help you with:\n\n` +
            `**View Data:**\n` +
            `- "Show customers" - List all customers\n` +
            `- "Show products" - List all products\n` +
            `- "Show invoices" - List recent invoices\n` +
            `- "Dashboard" - Business overview\n\n` +
            `**Execute Bots:**\n` +
            `- "Create a quote" - Generate a new quote\n` +
            `- "Create sales order" - Create a sales order\n` +
            `- "Run payroll" - Process payroll\n` +
            `- "List bots" - See all available bots\n\n` +
            `Just type naturally and I'll understand!`,
        };
      }
      
      default:
        return {
          success: false,
          intent,
          bot_id: null,
          action_taken: 'unknown',
          response: "I'm not sure how to handle that query. Try 'help' for available commands.",
        };
    }
  } catch (error) {
    return {
      success: false,
      intent,
      bot_id: null,
      action_taken: 'error',
      response: `Query failed: ${String(error)}`,
    };
  }
}

/**
 * Main orchestration function - the entry point for all user requests
 */
export async function orchestrate(
  message: string,
  companyId: string,
  userId: string,
  conversationHistory: Array<{role: string, content: string}>,
  env: Env
): Promise<OrchestrationResult> {
  // Step 1: Classify the intent using AI
  const classification = await classifyIntent(message, conversationHistory, env);
  
  // Step 2: Execute based on classification
  if (classification.bot_id) {
    // Execute a bot
    return executeBot(classification.bot_id, classification.parameters, companyId, userId, env);
  } else if (QUERY_INTENTS.some(q => q.intent === classification.intent)) {
    // Execute a data query
    return executeQuery(classification.intent, classification.parameters, companyId, env);
  } else {
    // Unknown intent - return the AI's response
    return {
      success: true,
      intent: classification.intent,
      bot_id: null,
      action_taken: 'clarify',
      response: classification.response,
    };
  }
}

export { BOT_CATALOG, QUERY_INTENTS };
