/**
 * ARIA Multi-Step Agent
 * 
 * Full multi-step agent architecture that decomposes natural language requests
 * into multi-bot workflows with intelligent planning and orchestration.
 * 
 * Layers:
 *   1. Intent Classification + Entity Extraction (via Workers AI)
 *   2. Bot Registry with semantic descriptions and parameter schemas
 *   3. Multi-step Planner (decomposes complex requests into bot sequences)
 *   4. Entity Resolution (natural language names -> DB IDs)
 *   5. Orchestration + Confirmation flow
 */

// ─── Types ────────────────────────────────────────────────────────────────────

interface Env {
  DB: D1Database;
  AI?: AIBinding;
}

interface AIBinding {
  run(model: string, options: {
    messages: Array<{ role: string; content: string }>;
    max_tokens?: number;
    temperature?: number;
  }): Promise<{ response?: string; text?: string }>;
}

/** A single step in a multi-step execution plan */
export interface PlanStep {
  step_number: number;
  bot_id: string;
  bot_name: string;
  description: string;
  parameters: Record<string, unknown>;
  depends_on: number[];         // step numbers this depends on
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: Record<string, unknown>;
  error?: string;
}

/** The full execution plan returned by the planner */
export interface ExecutionPlan {
  id: string;
  user_request: string;
  summary: string;
  steps: PlanStep[];
  requires_confirmation: boolean;
  resolved_entities: ResolvedEntity[];
  created_at: string;
}

/** A resolved entity mapping natural language to DB record */
export interface ResolvedEntity {
  type: 'customer' | 'supplier' | 'product' | 'invoice' | 'quote' | 'sales_order' | 'purchase_order';
  raw_text: string;
  resolved_id: string | null;
  resolved_name: string | null;
  confidence: number;
  ambiguous: boolean;
  candidates?: Array<{ id: string; name: string; code?: string }>;
}

/** Result from the agent processing a message */
export interface AgentResponse {
  type: 'plan' | 'execution_result' | 'clarification' | 'confirmation' | 'simple_response';
  message: string;
  plan?: ExecutionPlan;
  step_results?: PlanStep[];
  needs_confirmation?: boolean;
  needs_clarification?: boolean;
  clarification_prompt?: string;
  data?: Record<string, unknown>;
}

// ─── Semantic Bot Registry ────────────────────────────────────────────────────

interface SemanticBot {
  id: string;
  name: string;
  category: string;
  description: string;
  triggers: string[];
  required_params: string[];
  optional_params: string[];
  produces: string[];            // what data this bot creates (e.g. 'quote_id')
  consumes: string[];            // what data this bot needs from previous steps
}

/**
 * Enriched bot registry with semantic descriptions, trigger phrases, and
 * parameter schemas. This is used by the planner to match intents to bots
 * and to understand data flow between steps.
 */
const SEMANTIC_BOT_REGISTRY: SemanticBot[] = [
  // ── Order-to-Cash ──
  {
    id: 'quote_generation',
    name: 'Quote Generation Bot',
    category: 'O2C',
    description: 'Creates a new quote/quotation for a customer with products and pricing',
    triggers: ['create a quote', 'generate quotation', 'make a quote', 'new quote for', 'quote for customer'],
    required_params: ['customer_id'],
    optional_params: ['products', 'discount', 'valid_days'],
    produces: ['quote_id', 'quote_number'],
    consumes: [],
  },
  {
    id: 'sales_order',
    name: 'Sales Order Bot',
    category: 'O2C',
    description: 'Creates a sales order, typically by converting an approved quote',
    triggers: ['create sales order', 'convert quote to order', 'new sales order', 'SO from quote'],
    required_params: [],
    optional_params: ['quote_id', 'customer_id'],
    produces: ['sales_order_id', 'order_number'],
    consumes: ['quote_id'],
  },
  {
    id: 'invoice_generation',
    name: 'Invoice Generation Bot',
    category: 'O2C',
    description: 'Creates a customer invoice from a confirmed sales order',
    triggers: ['create invoice', 'generate invoice', 'bill customer', 'invoice from sales order'],
    required_params: [],
    optional_params: ['sales_order_id', 'customer_id'],
    produces: ['invoice_id', 'invoice_number'],
    consumes: ['sales_order_id'],
  },
  {
    id: 'ar_collections',
    name: 'AR Collections Bot',
    category: 'O2C',
    description: 'Sends payment reminders for overdue customer invoices',
    triggers: ['collect overdue', 'send reminders', 'ar aging', 'chase payments', 'overdue invoices'],
    required_params: [],
    optional_params: ['days_overdue', 'min_amount'],
    produces: ['reminders_sent'],
    consumes: [],
  },
  {
    id: 'payment_processing',
    name: 'Payment Processing Bot',
    category: 'O2C',
    description: 'Processes and records customer payments against invoices',
    triggers: ['process payment', 'record payment', 'customer paid', 'receive payment'],
    required_params: [],
    optional_params: ['invoice_id', 'amount'],
    produces: ['payment_id'],
    consumes: ['invoice_id'],
  },

  // ── Procure-to-Pay ──
  {
    id: 'purchase_order',
    name: 'Purchase Order Bot',
    category: 'P2P',
    description: 'Creates a purchase order for a supplier',
    triggers: ['create purchase order', 'new PO', 'order from supplier', 'buy from supplier'],
    required_params: [],
    optional_params: ['supplier_id', 'products'],
    produces: ['po_id', 'po_number'],
    consumes: [],
  },
  {
    id: 'goods_receipt',
    name: 'Goods Receipt Bot',
    category: 'P2P',
    description: 'Records receipt of goods against a purchase order',
    triggers: ['receive goods', 'goods receipt', 'stock received', 'GRN', 'mark PO received'],
    required_params: [],
    optional_params: ['po_id'],
    produces: ['receipt_id'],
    consumes: ['po_id'],
  },
  {
    id: 'supplier_invoice',
    name: 'Supplier Invoice Bot',
    category: 'P2P',
    description: 'Creates a supplier/vendor invoice after goods receipt',
    triggers: ['supplier invoice', 'vendor invoice', 'AP invoice', 'supplier bill'],
    required_params: [],
    optional_params: ['po_id', 'receipt_id'],
    produces: ['supplier_invoice_id'],
    consumes: ['receipt_id', 'po_id'],
  },
  {
    id: 'ap_payment',
    name: 'AP Payment Bot',
    category: 'P2P',
    description: 'Processes payment to a supplier for an invoice',
    triggers: ['pay supplier', 'vendor payment', 'AP payment', 'pay vendor'],
    required_params: [],
    optional_params: ['invoice_id', 'amount'],
    produces: ['payment_id'],
    consumes: ['supplier_invoice_id'],
  },

  // ── Financial ──
  {
    id: 'bank_reconciliation',
    name: 'Bank Reconciliation Bot',
    category: 'Financial',
    description: 'Reconciles bank statements with GL entries',
    triggers: ['reconcile bank', 'bank recon', 'match transactions', 'bank statement'],
    required_params: [],
    optional_params: ['bank_account', 'statement_date'],
    produces: ['reconciliation_report'],
    consumes: [],
  },
  {
    id: 'financial_close',
    name: 'Financial Close Bot',
    category: 'Financial',
    description: 'Performs period-end financial close',
    triggers: ['close month', 'month-end close', 'period end', 'financial close'],
    required_params: [],
    optional_params: ['period'],
    produces: ['close_report'],
    consumes: [],
  },
  {
    id: 'general_ledger',
    name: 'General Ledger Bot',
    category: 'Financial',
    description: 'Posts journal entries and manages the general ledger',
    triggers: ['post journal', 'GL entry', 'general ledger', 'ledger update'],
    required_params: [],
    optional_params: ['journal_batch'],
    produces: ['journal_entries'],
    consumes: [],
  },
  {
    id: 'invoice_reconciliation',
    name: 'Invoice Reconciliation Bot',
    category: 'Financial',
    description: 'Matches invoices with payments and bank transactions',
    triggers: ['reconcile invoices', 'invoice matching', 'match payments', 'three-way match'],
    required_params: [],
    optional_params: ['date_range'],
    produces: ['reconciliation_report'],
    consumes: [],
  },
  {
    id: 'tax_compliance',
    name: 'Tax Compliance Bot',
    category: 'Financial',
    description: 'Calculates and files SA taxes (VAT, PAYE, UIF)',
    triggers: ['tax compliance', 'calculate tax', 'VAT return', 'tax filing', 'SARS submission'],
    required_params: [],
    optional_params: ['tax_period', 'tax_type'],
    produces: ['tax_report'],
    consumes: [],
  },
  {
    id: 'financial_reporting',
    name: 'Financial Reporting Bot',
    category: 'Financial',
    description: 'Generates financial reports (trial balance, income statement, balance sheet)',
    triggers: ['financial report', 'generate report', 'trial balance', 'income statement', 'balance sheet'],
    required_params: [],
    optional_params: ['report_type', 'period'],
    produces: ['report'],
    consumes: [],
  },
  {
    id: 'expense_management',
    name: 'Expense Management Bot',
    category: 'Financial',
    description: 'Processes employee expense claims and reimbursements',
    triggers: ['process expense', 'expense claim', 'reimbursement', 'expense report'],
    required_params: [],
    optional_params: ['expense_batch'],
    produces: ['expenses_processed'],
    consumes: [],
  },
  {
    id: 'accounts_payable',
    name: 'Accounts Payable Bot',
    category: 'Financial',
    description: 'Automates AP processing, invoice validation, and approval workflows',
    triggers: ['accounts payable', 'AP processing', 'vendor invoices', 'payables'],
    required_params: [],
    optional_params: ['invoice_batch'],
    produces: ['invoices_processed'],
    consumes: [],
  },
  {
    id: 'bbbee_compliance',
    name: 'B-BBEE Compliance Bot',
    category: 'Financial',
    description: 'Calculates B-BBEE scorecard and tracks transformation compliance',
    triggers: ['BBBEE', 'BEE compliance', 'transformation scorecard', 'BEE level'],
    required_params: [],
    optional_params: ['scorecard_year'],
    produces: ['bbbee_report'],
    consumes: [],
  },
  {
    id: 'credit_control',
    name: 'Credit Control Bot',
    category: 'Financial',
    description: 'Manages customer credit limits and credit risk',
    triggers: ['credit control', 'credit limit', 'credit check', 'credit risk'],
    required_params: [],
    optional_params: [],
    produces: ['credit_report'],
    consumes: [],
  },
  {
    id: 'invoice_reminder',
    name: 'Invoice Reminder Bot',
    category: 'Financial',
    description: 'Sends automated invoice payment reminders',
    triggers: ['invoice reminder', 'payment reminder', 'send invoice reminder'],
    required_params: [],
    optional_params: [],
    produces: ['reminders_sent'],
    consumes: [],
  },

  // ── Procurement & Supply Chain ──
  {
    id: 'supplier_management',
    name: 'Supplier Management Bot',
    category: 'Procurement',
    description: 'Manages vendor master data and onboarding',
    triggers: ['manage suppliers', 'vendor onboarding', 'supplier master'],
    required_params: [],
    optional_params: [],
    produces: ['suppliers_processed'],
    consumes: [],
  },
  {
    id: 'supplier_performance',
    name: 'Supplier Performance Bot',
    category: 'Procurement',
    description: 'Evaluates supplier KPIs and generates scorecards',
    triggers: ['supplier performance', 'vendor scorecard', 'supplier KPI'],
    required_params: [],
    optional_params: [],
    produces: ['performance_report'],
    consumes: [],
  },
  {
    id: 'supplier_risk',
    name: 'Supplier Risk Bot',
    category: 'Procurement',
    description: 'Assesses supply chain risk and generates alerts',
    triggers: ['supplier risk', 'supply chain risk', 'vendor risk assessment'],
    required_params: [],
    optional_params: [],
    produces: ['risk_report'],
    consumes: [],
  },
  {
    id: 'supplier_onboarding',
    name: 'Supplier Onboarding Bot',
    category: 'Procurement',
    description: 'Automates new supplier onboarding and compliance checks',
    triggers: ['onboard supplier', 'new vendor setup', 'supplier registration'],
    required_params: [],
    optional_params: [],
    produces: ['onboarding_status'],
    consumes: [],
  },
  {
    id: 'rfq_management',
    name: 'RFQ Management Bot',
    category: 'Procurement',
    description: 'Creates and manages RFQs/RFPs',
    triggers: ['create RFQ', 'request for quote', 'RFP management'],
    required_params: [],
    optional_params: [],
    produces: ['rfq_id'],
    consumes: [],
  },
  {
    id: 'procurement_analytics',
    name: 'Procurement Analytics Bot',
    category: 'Procurement',
    description: 'Procurement spend analysis and insights',
    triggers: ['procurement analytics', 'spend analysis', 'procurement report'],
    required_params: [],
    optional_params: [],
    produces: ['analytics_report'],
    consumes: [],
  },
  {
    id: 'spend_analysis',
    name: 'Spend Analysis Bot',
    category: 'Procurement',
    description: 'Detailed spend categorization and analysis',
    triggers: ['spend analysis', 'spending report', 'cost analysis'],
    required_params: [],
    optional_params: [],
    produces: ['spend_report'],
    consumes: [],
  },
  {
    id: 'source_to_pay',
    name: 'Source-to-Pay Bot',
    category: 'Procurement',
    description: 'End-to-end source-to-pay process automation',
    triggers: ['source to pay', 'S2P process', 'procurement cycle'],
    required_params: [],
    optional_params: [],
    produces: ['s2p_report'],
    consumes: [],
  },
  {
    id: 'inventory',
    name: 'Inventory Optimization Bot',
    category: 'Procurement',
    description: 'Optimizes inventory levels, manages stock, and calculates reorder points',
    triggers: ['optimize inventory', 'inventory optimization', 'stock optimization', 'manage inventory', 'inventory check', 'stock levels'],
    required_params: [],
    optional_params: [],
    produces: ['optimization_report'],
    consumes: [],
  },
  {
    id: 'reorder_point',
    name: 'Reorder Point Bot',
    category: 'Procurement',
    description: 'Calculates and sets automatic reorder points',
    triggers: ['reorder point', 'auto reorder', 'replenishment'],
    required_params: [],
    optional_params: [],
    produces: ['reorder_report'],
    consumes: [],
  },
  {
    id: 'delivery_scheduling',
    name: 'Delivery Scheduling Bot',
    category: 'Procurement',
    description: 'Schedules and optimizes delivery routes',
    triggers: ['schedule delivery', 'delivery planning', 'logistics scheduling'],
    required_params: [],
    optional_params: [],
    produces: ['delivery_schedule'],
    consumes: [],
  },

  // ── Sales & CRM ──
  {
    id: 'customer_onboarding',
    name: 'Customer Onboarding Bot',
    category: 'Sales',
    description: 'Automates new customer onboarding and welcome workflows',
    triggers: ['onboard customer', 'new customer setup', 'customer welcome'],
    required_params: [],
    optional_params: ['customer_id'],
    produces: ['onboarding_status'],
    consumes: [],
  },
  {
    id: 'lead_scoring',
    name: 'Lead Scoring & Qualification Bot',
    category: 'Sales',
    description: 'Manages, tracks, scores, and qualifies sales leads',
    triggers: ['manage leads', 'lead tracking', 'new lead', 'qualify leads', 'lead scoring', 'score leads', 'lead priority'],
    required_params: [],
    optional_params: [],
    produces: ['leads_processed', 'qualification_report'],
    consumes: [],
  },
  {
    id: 'opportunity',
    name: 'Opportunity Management Bot',
    category: 'Sales',
    description: 'Manages sales pipeline opportunities',
    triggers: ['manage opportunities', 'sales pipeline', 'new deal', 'opportunity tracking'],
    required_params: [],
    optional_params: [],
    produces: ['opportunities_processed'],
    consumes: [],
  },
  {
    id: 'order_fulfillment',
    name: 'Order Fulfillment Bot',
    category: 'Sales',
    description: 'Manages order picking, packing, and shipping',
    triggers: ['fulfill order', 'pick pack ship', 'order fulfillment'],
    required_params: [],
    optional_params: [],
    produces: ['fulfillment_status'],
    consumes: ['sales_order_id'],
  },
  {
    id: 'quote_follow_up',
    name: 'Quote Follow-up Bot',
    category: 'Sales',
    description: 'Sends follow-up reminders for open quotes',
    triggers: ['follow up quotes', 'quote reminder', 'chase quotes'],
    required_params: [],
    optional_params: [],
    produces: ['followups_sent'],
    consumes: [],
  },
  {
    id: 'sales_analytics',
    name: 'Sales Analytics Bot',
    category: 'Sales',
    description: 'Sales performance analytics and KPI reporting',
    triggers: ['sales analytics', 'sales report', 'sales KPI', 'revenue analysis'],
    required_params: [],
    optional_params: [],
    produces: ['analytics_report'],
    consumes: [],
  },

  // ── Manufacturing ──
  {
    id: 'production',
    name: 'Production Scheduling Bot',
    category: 'Manufacturing',
    description: 'Schedules production runs and allocates resources',
    triggers: ['schedule production', 'production planning', 'manufacturing schedule', 'run production'],
    required_params: [],
    optional_params: [],
    produces: ['production_schedule'],
    consumes: [],
  },
  {
    id: 'quality_control',
    name: 'Quality Control Bot',
    category: 'Manufacturing',
    description: 'Performs QC inspections and tracks quality metrics',
    triggers: ['quality check', 'QC inspection', 'quality control', 'quality report'],
    required_params: [],
    optional_params: [],
    produces: ['qc_report'],
    consumes: [],
  },
  {
    id: 'machine_monitoring',
    name: 'Machine Monitoring Bot',
    category: 'Manufacturing',
    description: 'Monitors machine status and performance',
    triggers: ['machine status', 'equipment monitoring', 'machine health'],
    required_params: [],
    optional_params: [],
    produces: ['machine_report'],
    consumes: [],
  },
  {
    id: 'oee_calculation',
    name: 'OEE Calculation Bot',
    category: 'Manufacturing',
    description: 'Calculates Overall Equipment Effectiveness',
    triggers: ['OEE calculation', 'equipment effectiveness', 'production efficiency'],
    required_params: [],
    optional_params: [],
    produces: ['oee_report'],
    consumes: [],
  },
  {
    id: 'downtime_tracking',
    name: 'Downtime Tracking Bot',
    category: 'Manufacturing',
    description: 'Tracks and analyzes machine downtime',
    triggers: ['track downtime', 'downtime analysis', 'machine downtime'],
    required_params: [],
    optional_params: [],
    produces: ['downtime_report'],
    consumes: [],
  },
  {
    id: 'scrap_management',
    name: 'Scrap Management Bot',
    category: 'Manufacturing',
    description: 'Manages scrap and waste tracking',
    triggers: ['track scrap', 'waste management', 'scrap report'],
    required_params: [],
    optional_params: [],
    produces: ['scrap_report'],
    consumes: [],
  },
  {
    id: 'tool_management',
    name: 'Tool Management Bot',
    category: 'Manufacturing',
    description: 'Manages tooling inventory and maintenance',
    triggers: ['tool management', 'tooling inventory', 'tool maintenance'],
    required_params: [],
    optional_params: [],
    produces: ['tool_report'],
    consumes: [],
  },
  {
    id: 'operator_instructions',
    name: 'Operator Instructions Bot',
    category: 'Manufacturing',
    description: 'Manages work instructions for operators',
    triggers: ['operator instructions', 'work instructions', 'SOP management'],
    required_params: [],
    optional_params: [],
    produces: ['instructions_report'],
    consumes: [],
  },
  {
    id: 'production_reporting',
    name: 'Production Reporting Bot',
    category: 'Manufacturing',
    description: 'Generates production output and efficiency reports',
    triggers: ['production report', 'manufacturing report', 'output report'],
    required_params: [],
    optional_params: [],
    produces: ['production_report'],
    consumes: [],
  },
  {
    id: 'mes_integration',
    name: 'MES Integration Bot',
    category: 'Manufacturing',
    description: 'Integrates with Manufacturing Execution Systems',
    triggers: ['MES integration', 'manufacturing execution', 'shop floor data'],
    required_params: [],
    optional_params: [],
    produces: ['mes_report'],
    consumes: [],
  },

  // ── HR & People ──
  {
    id: 'payroll',
    name: 'SA Payroll Bot',
    category: 'HR',
    description: 'Processes South African payroll with PAYE, UIF, SDL',
    triggers: ['run payroll', 'process payroll', 'process salaries', 'pay employees'],
    required_params: [],
    optional_params: ['period'],
    produces: ['payroll_run_id'],
    consumes: [],
  },
  {
    id: 'time_attendance',
    name: 'Time & Attendance Bot',
    category: 'HR',
    description: 'Processes employee time and attendance records',
    triggers: ['time attendance', 'clock records', 'attendance processing'],
    required_params: [],
    optional_params: [],
    produces: ['attendance_report'],
    consumes: [],
  },
  {
    id: 'recruitment',
    name: 'Recruitment Bot',
    category: 'HR',
    description: 'Manages job postings, applicants, and hiring',
    triggers: ['recruitment', 'hiring', 'job posting', 'new hire'],
    required_params: [],
    optional_params: [],
    produces: ['recruitment_report'],
    consumes: [],
  },
  {
    id: 'onboarding',
    name: 'Employee Onboarding Bot',
    category: 'HR',
    description: 'Automates new employee onboarding',
    triggers: ['employee onboarding', 'new hire setup', 'onboard employee'],
    required_params: [],
    optional_params: [],
    produces: ['onboarding_status'],
    consumes: [],
  },
  {
    id: 'performance_management',
    name: 'Performance Management Bot',
    category: 'HR',
    description: 'Manages performance reviews and goals',
    triggers: ['performance review', 'employee evaluation', 'goal setting'],
    required_params: [],
    optional_params: [],
    produces: ['performance_report'],
    consumes: [],
  },
  {
    id: 'benefits_administration',
    name: 'Benefits Administration Bot',
    category: 'HR',
    description: 'Manages employee benefits and enrollment',
    triggers: ['benefits admin', 'employee benefits', 'benefit enrollment'],
    required_params: [],
    optional_params: [],
    produces: ['benefits_report'],
    consumes: [],
  },
  {
    id: 'learning_development',
    name: 'Learning & Development Bot',
    category: 'HR',
    description: 'Manages training programs and certifications',
    triggers: ['training', 'learning development', 'employee training', 'certification'],
    required_params: [],
    optional_params: [],
    produces: ['training_report'],
    consumes: [],
  },
  {
    id: 'employee_self_service',
    name: 'Employee Self-Service Bot',
    category: 'HR',
    description: 'Handles employee self-service requests (leave, expenses, info updates)',
    triggers: ['self service', 'employee request', 'update my details', 'employee portal'],
    required_params: [],
    optional_params: [],
    produces: ['request_status'],
    consumes: [],
  },

  // ── Document Management ──
  {
    id: 'document_classification',
    name: 'Document Classification Bot',
    category: 'Documents',
    description: 'Classifies uploaded documents by type',
    triggers: ['classify document', 'document type', 'categorize document'],
    required_params: [],
    optional_params: ['document_id'],
    produces: ['classification_result'],
    consumes: [],
  },
  {
    id: 'document_scanner',
    name: 'Document Scanner Bot',
    category: 'Documents',
    description: 'Scans and digitizes physical documents',
    triggers: ['scan document', 'digitize document', 'OCR'],
    required_params: [],
    optional_params: [],
    produces: ['scan_result'],
    consumes: [],
  },
  {
    id: 'data_extraction',
    name: 'Data Extraction Bot',
    category: 'Documents',
    description: 'Extracts structured data from documents',
    triggers: ['extract data', 'document extraction', 'pull data from document'],
    required_params: [],
    optional_params: ['document_id'],
    produces: ['extraction_result'],
    consumes: [],
  },
  {
    id: 'data_validation',
    name: 'Data Validation Bot',
    category: 'Documents',
    description: 'Validates extracted document data against business rules',
    triggers: ['validate data', 'document validation', 'check document'],
    required_params: [],
    optional_params: [],
    produces: ['validation_result'],
    consumes: [],
  },
  {
    id: 'archive_management',
    name: 'Archive Management Bot',
    category: 'Documents',
    description: 'Manages document archiving and retention',
    triggers: ['archive documents', 'document retention', 'archiving'],
    required_params: [],
    optional_params: [],
    produces: ['archive_report'],
    consumes: [],
  },

  // ── Governance ──
  {
    id: 'audit_management',
    name: 'Audit Management Bot',
    category: 'Governance',
    description: 'Manages internal audit trails and compliance audits',
    triggers: ['audit trail', 'compliance audit', 'audit management'],
    required_params: [],
    optional_params: [],
    produces: ['audit_report'],
    consumes: [],
  },
  {
    id: 'risk_management',
    name: 'Risk Management Bot',
    category: 'Governance',
    description: 'Enterprise risk assessment and monitoring',
    triggers: ['risk management', 'risk assessment', 'enterprise risk'],
    required_params: [],
    optional_params: [],
    produces: ['risk_report'],
    consumes: [],
  },
  {
    id: 'policy_management',
    name: 'Policy Management Bot',
    category: 'Governance',
    description: 'Manages corporate policies and compliance',
    triggers: ['policy management', 'compliance policies', 'corporate policies'],
    required_params: [],
    optional_params: [],
    produces: ['policy_report'],
    consumes: [],
  },
  {
    id: 'contract_management',
    name: 'Contract Management Bot',
    category: 'Governance',
    description: 'Manages contracts, renewals, and obligations',
    triggers: ['contract management', 'manage contracts', 'contract renewal'],
    required_params: [],
    optional_params: [],
    produces: ['contract_report'],
    consumes: [],
  },

  // ── Workflow & Admin ──
  {
    id: 'workflow_automation',
    name: 'Workflow Automation Bot',
    category: 'Workflow',
    description: 'Automates approval workflows and task routing',
    triggers: ['workflow automation', 'pending approvals', 'process approvals'],
    required_params: [],
    optional_params: [],
    produces: ['workflow_report'],
    consumes: [],
  },
  {
    id: 'auto_approval',
    name: 'Auto Approval Bot',
    category: 'Workflow',
    description: 'Automatically approves items within configured thresholds',
    triggers: ['auto approve', 'automatic approval', 'approve pending'],
    required_params: [],
    optional_params: [],
    produces: ['approval_report'],
    consumes: [],
  },
  {
    id: 'email_processing',
    name: 'Email Processing Bot',
    category: 'Workflow',
    description: 'Processes incoming emails and routes to appropriate workflows',
    triggers: ['process emails', 'email automation', 'incoming email'],
    required_params: [],
    optional_params: [],
    produces: ['email_report'],
    consumes: [],
  },
  {
    id: 'helpdesk_bot',
    name: 'Helpdesk Bot',
    category: 'Workflow',
    description: 'Manages support tickets, assignment, and resolution',
    triggers: ['helpdesk', 'support ticket', 'create ticket', 'open ticket'],
    required_params: [],
    optional_params: [],
    produces: ['ticket_id'],
    consumes: [],
  },
  {
    id: 'category_management',
    name: 'Category Management Bot',
    category: 'Workflow',
    description: 'Manages product and procurement categories',
    triggers: ['category management', 'manage categories', 'product categories'],
    required_params: [],
    optional_params: [],
    produces: ['category_report'],
    consumes: [],
  },
  {
    id: 'work_order',
    name: 'Work Order Bot',
    category: 'Workflow',
    description: 'Creates and manages work orders for maintenance or manufacturing',
    triggers: ['create work order', 'new work order', 'maintenance order'],
    required_params: [],
    optional_params: [],
    produces: ['work_order_id'],
    consumes: [],
  },
  {
    id: 'stock_movement',
    name: 'Stock Movement Bot',
    category: 'Procurement',
    description: 'Records stock transfers, adjustments, and movements between warehouses',
    triggers: ['stock movement', 'stock transfer', 'move stock', 'warehouse transfer', 'stock adjustment'],
    required_params: [],
    optional_params: ['from_warehouse', 'to_warehouse', 'product_id', 'quantity'],
    produces: ['movement_id'],
    consumes: [],
  },
  {
    id: 'leave_management',
    name: 'Leave Management Bot',
    category: 'HR',
    description: 'Manages employee leave requests, approvals, and balances',
    triggers: ['manage leave', 'leave request', 'approve leave', 'leave balance', 'annual leave'],
    required_params: [],
    optional_params: ['employee_id', 'leave_type'],
    produces: ['leave_report'],
    consumes: [],
  },
];

// ─── Well-known multi-step workflow templates ─────────────────────────────────

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  triggers: RegExp[];
  steps: Array<{ bot_id: string; description: string; depends_on: number[] }>;
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'order_to_cash',
    name: 'Order-to-Cash',
    description: 'Full O2C cycle: Quote -> Sales Order -> Invoice -> Payment',
    triggers: [
      /order[- ]?to[- ]?cash/i,
      /o2c\s+(?:cycle|flow|process)/i,
      /full\s+sales\s+(?:cycle|process)/i,
      /quote\s+(?:to|through|thru)\s+(?:payment|cash)/i,
    ],
    steps: [
      { bot_id: 'quote_generation', description: 'Generate quote for customer', depends_on: [] },
      { bot_id: 'sales_order', description: 'Convert quote to sales order', depends_on: [1] },
      { bot_id: 'invoice_generation', description: 'Generate invoice from sales order', depends_on: [2] },
      { bot_id: 'payment_processing', description: 'Process customer payment', depends_on: [3] },
    ],
  },
  {
    id: 'procure_to_pay',
    name: 'Procure-to-Pay',
    description: 'Full P2P cycle: PO -> Goods Receipt -> AP Processing',
    triggers: [
      /procure[- ]?to[- ]?pay/i,
      /p2p\s+(?:cycle|flow|process)/i,
      /full\s+procurement\s+(?:cycle|process)/i,
      /po\s+(?:to|through|thru)\s+(?:payment|pay)/i,
    ],
    steps: [
      { bot_id: 'purchase_order', description: 'Create purchase order', depends_on: [] },
      { bot_id: 'goods_receipt', description: 'Record goods receipt', depends_on: [1] },
      { bot_id: 'ap_payment', description: 'Process supplier invoice and payment', depends_on: [2] },
    ],
  },
  {
    id: 'month_end_close',
    name: 'Month-End Close',
    description: 'Month-end close workflow: Reconciliation -> Reporting -> Close',
    triggers: [
      /month[- ]?end/i,
      /period[- ]?end/i,
      /financial\s+close/i,
      /close\s+(?:the\s+)?(?:month|period|books)/i,
    ],
    steps: [
      { bot_id: 'invoice_reconciliation', description: 'Reconcile all invoices', depends_on: [] },
      { bot_id: 'bank_reconciliation', description: 'Reconcile bank statements', depends_on: [] },
      { bot_id: 'financial_reporting', description: 'Generate financial reports', depends_on: [1, 2] },
      { bot_id: 'financial_close', description: 'Close the period', depends_on: [3] },
    ],
  },
  {
    id: 'po_to_invoice',
    name: 'PO to Invoice',
    description: 'Create PO, receive goods, process supplier invoice and payment',
    triggers: [
      /create\s+(?:a\s+)?po\s+and\s+(?:once\s+)?(?:received|receipt|goods)/i,
      /purchase\s+order.*(?:then|and).*(?:invoice|bill)/i,
      /po.*goods\s+receipt.*invoice/i,
    ],
    steps: [
      { bot_id: 'purchase_order', description: 'Create purchase order', depends_on: [] },
      { bot_id: 'goods_receipt', description: 'Record goods receipt', depends_on: [1] },
      { bot_id: 'ap_payment', description: 'Process supplier invoice and payment', depends_on: [2] },
    ],
  },
  {
    id: 'quote_to_invoice',
    name: 'Quote to Invoice',
    description: 'Create quote, convert to SO, generate invoice',
    triggers: [
      /quote.*(?:then|and).*(?:invoice|bill)/i,
      /quote\s+to\s+invoice/i,
      /quote.*sales\s+order.*invoice/i,
    ],
    steps: [
      { bot_id: 'quote_generation', description: 'Generate quote for customer', depends_on: [] },
      { bot_id: 'sales_order', description: 'Convert to sales order', depends_on: [1] },
      { bot_id: 'invoice_generation', description: 'Generate customer invoice', depends_on: [2] },
    ],
  },
  {
    id: 'full_reconciliation',
    name: 'Full Reconciliation',
    description: 'Run all reconciliation bots',
    triggers: [
      /(?:full\s+)?reconciliation\s+(?:suite|process|cycle)/i,
      /reconcile\s+everything/i,
      /run\s+all\s+reconciliation/i,
    ],
    steps: [
      { bot_id: 'invoice_reconciliation', description: 'Reconcile invoices with payments', depends_on: [] },
      { bot_id: 'bank_reconciliation', description: 'Reconcile bank statements', depends_on: [] },
      { bot_id: 'ar_collections', description: 'Review overdue AR', depends_on: [1] },
    ],
  },
];

// ─── Utility ──────────────────────────────────────────────────────────────────

function parseAIJSON<T>(text: string, fallback: T): T {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
  } catch {
    // fall through
  }
  return fallback;
}

function generateUUID(): string {
  return crypto.randomUUID();
}

// ─── Layer 1: Intent Classification + Entity Extraction ───────────────────────

interface ClassifiedIntent {
  is_multi_step: boolean;
  workflow_template_id: string | null;
  bot_ids: string[];
  entities: ExtractedEntity[];
  confidence: number;
  reasoning: string;
}

interface ExtractedEntity {
  type: 'customer' | 'supplier' | 'product' | 'amount' | 'date' | 'quantity' | 'reference';
  value: string;
  raw_text: string;
}

/**
 * Classifies user intent using a combination of:
 * 1. Template matching (regex) for known multi-step workflows
 * 2. AI classification for complex/ambiguous requests
 * 3. Semantic matching against bot registry
 */
async function classifyAgentIntent(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  ai: AIBinding | undefined
): Promise<ClassifiedIntent> {
  const lowerMessage = message.toLowerCase().trim();

  // Step 1: Check workflow templates first (high confidence)
  for (const template of WORKFLOW_TEMPLATES) {
    for (const trigger of template.triggers) {
      if (trigger.test(lowerMessage)) {
        return {
          is_multi_step: true,
          workflow_template_id: template.id,
          bot_ids: template.steps.map(s => s.bot_id),
          entities: extractEntitiesRuleBased(message),
          confidence: 0.9,
          reasoning: `Matched workflow template: ${template.name}`,
        };
      }
    }
  }

  // Step 2: Check for multi-step indicators (e.g. "and then", "after that", "once done")
  const multiStepIndicators = [
    /\b(?:and\s+then|then\s+(?:also|create|generate|run|process))\b/i,
    /\b(?:after\s+that|once\s+(?:done|complete|finished|received))\b/i,
    /\b(?:followed\s+by|and\s+also|as\s+well\s+as)\b/i,
    /\b(?:first|next|finally|lastly)\b.*\b(?:then|after|and)\b/i,
  ];
  const hasMultiStepIndicator = multiStepIndicators.some(p => p.test(lowerMessage));

  // Step 3: Try AI classification for complex requests
  if (ai && (hasMultiStepIndicator || !matchSingleBot(lowerMessage))) {
    try {
      const botListStr = SEMANTIC_BOT_REGISTRY.map(b =>
        `${b.id}: ${b.name} - ${b.description} [triggers: ${b.triggers.join(', ')}]`
      ).join('\n');

      const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: `You are ARIA's intent classifier for a South African ERP system. Given a user message, determine:
1. Whether it requires multiple bots (is_multi_step)
2. Which bot(s) to execute (bot_ids) - use exact IDs from the list
3. What entities are mentioned (customer names, supplier names, amounts, dates)
4. Your confidence (0-1)

Available bots:
${botListStr}

IMPORTANT: Respond with ONLY valid JSON matching this schema:
{"is_multi_step":boolean,"bot_ids":["string"],"entities":[{"type":"customer|supplier|product|amount|date|quantity|reference","value":"string","raw_text":"string"}],"confidence":number,"reasoning":"string"}`,
          },
          ...conversationHistory.slice(-3).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ],
        max_tokens: 500,
        temperature: 0.2,
      });

      const text = response.response || response.text || '';
      const parsed = parseAIJSON<Partial<ClassifiedIntent>>(text, {});
      if (parsed.bot_ids && parsed.bot_ids.length > 0) {
        // Validate bot IDs exist
        const validBotIds = parsed.bot_ids.filter(id =>
          SEMANTIC_BOT_REGISTRY.some(b => b.id === id)
        );
        if (validBotIds.length > 0) {
          return {
            is_multi_step: parsed.is_multi_step || validBotIds.length > 1,
            workflow_template_id: null,
            bot_ids: validBotIds,
            entities: parsed.entities || extractEntitiesRuleBased(message),
            confidence: parsed.confidence || 0.7,
            reasoning: parsed.reasoning || 'AI classification',
          };
        }
      }
    } catch (error) {
      console.error('AI intent classification failed:', error);
    }
  }

  // Step 4: Fall back to single-bot matching
  const matchedBot = matchSingleBot(lowerMessage);
  if (matchedBot) {
    return {
      is_multi_step: false,
      workflow_template_id: null,
      bot_ids: [matchedBot],
      entities: extractEntitiesRuleBased(message),
      confidence: 0.8,
      reasoning: `Matched single bot: ${matchedBot}`,
    };
  }

  // Step 5: No match
  return {
    is_multi_step: false,
    workflow_template_id: null,
    bot_ids: [],
    entities: extractEntitiesRuleBased(message),
    confidence: 0,
    reasoning: 'No matching bot found',
  };
}

/** Simple rule-based entity extraction */
function extractEntitiesRuleBased(message: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  // Extract amounts (R1,000 or R1000 or R 1 000.50)
  const amountMatches = message.matchAll(/R\s?([\d,\s]+(?:\.\d{2})?)/gi);
  for (const match of amountMatches) {
    entities.push({
      type: 'amount',
      value: match[1].replace(/[,\s]/g, ''),
      raw_text: match[0],
    });
  }

  // Extract quantities (100 units, 50 items, qty 25)
  const qtyMatches = message.matchAll(/(\d+)\s*(?:units?|items?|pieces?|pcs|each|qty)/gi);
  for (const match of qtyMatches) {
    entities.push({
      type: 'quantity',
      value: match[1],
      raw_text: match[0],
    });
  }

  // Extract dates
  const dateMatches = message.matchAll(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g);
  for (const match of dateMatches) {
    entities.push({
      type: 'date',
      value: match[1],
      raw_text: match[0],
    });
  }

  // Extract "for <Name>" patterns (customer or supplier names)
  const forPatterns = message.matchAll(/(?:for|from|to)\s+([A-Z][A-Za-z\s&'.,-]+?)(?:\s+(?:for|with|at|and|then|,)|$)/g);
  for (const match of forPatterns) {
    const name = match[1].trim();
    if (name.length > 2 && name.length < 50) {
      // Guess type based on context
      const before = message.substring(0, match.index || 0).toLowerCase();
      const entityType: ExtractedEntity['type'] =
        before.includes('supplier') || before.includes('vendor') || before.includes('purchase') || before.includes('po')
          ? 'supplier'
          : before.includes('product') || before.includes('item')
            ? 'product'
            : 'customer';
      entities.push({
        type: entityType,
        value: name,
        raw_text: match[0].trim(),
      });
    }
  }

  return entities;
}

/** Match a message to a single bot using trigger phrases */
function matchSingleBot(lowerMessage: string): string | null {
  let bestMatch: { id: string; score: number } | null = null;

  for (const bot of SEMANTIC_BOT_REGISTRY) {
    for (const trigger of bot.triggers) {
      const triggerLower = trigger.toLowerCase();
      const triggerWords = triggerLower.split(/\s+/);
      // Check if all words of the trigger appear in the message
      const allWordsPresent = triggerWords.every(word => lowerMessage.includes(word));
      if (allWordsPresent) {
        const score = triggerLower.length; // longer matches are more specific
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { id: bot.id, score };
        }
      }
    }
  }

  return bestMatch?.id || null;
}

// ─── Layer 4: Entity Resolution ───────────────────────────────────────────────

/**
 * Resolves extracted entities (natural language names) to database IDs.
 * Queries the database for matches and handles ambiguity.
 */
async function resolveEntities(
  entities: ExtractedEntity[],
  companyId: string,
  db: D1Database
): Promise<ResolvedEntity[]> {
  const resolved: ResolvedEntity[] = [];

  for (const entity of entities) {
    if (entity.type === 'amount' || entity.type === 'date' || entity.type === 'quantity' || entity.type === 'reference') {
      // These don't need DB resolution
      continue;
    }

    const searchName = entity.value.trim();
    let resolvedEntity: ResolvedEntity;

    switch (entity.type) {
      case 'customer': {
        const results = await db.prepare(
          `SELECT id, customer_name, customer_code FROM customers 
           WHERE company_id = ? AND (
             customer_name LIKE ? OR customer_code LIKE ?
           ) LIMIT 5`
        ).bind(companyId, `%${searchName}%`, `%${searchName}%`).all();

        const candidates = (results.results || []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          name: r.customer_name as string,
          code: r.customer_code as string,
        }));

        if (candidates.length === 1) {
          resolvedEntity = {
            type: 'customer',
            raw_text: entity.raw_text,
            resolved_id: candidates[0].id,
            resolved_name: candidates[0].name,
            confidence: 0.95,
            ambiguous: false,
          };
        } else if (candidates.length > 1) {
          // Check for exact match
          const exact = candidates.find(c =>
            c.name.toLowerCase() === searchName.toLowerCase()
          );
          if (exact) {
            resolvedEntity = {
              type: 'customer',
              raw_text: entity.raw_text,
              resolved_id: exact.id,
              resolved_name: exact.name,
              confidence: 0.98,
              ambiguous: false,
            };
          } else {
            resolvedEntity = {
              type: 'customer',
              raw_text: entity.raw_text,
              resolved_id: null,
              resolved_name: null,
              confidence: 0.5,
              ambiguous: true,
              candidates,
            };
          }
        } else {
          resolvedEntity = {
            type: 'customer',
            raw_text: entity.raw_text,
            resolved_id: null,
            resolved_name: null,
            confidence: 0,
            ambiguous: false,
          };
        }
        break;
      }

      case 'supplier': {
        const results = await db.prepare(
          `SELECT id, supplier_name, supplier_code FROM suppliers 
           WHERE company_id = ? AND (
             supplier_name LIKE ? OR supplier_code LIKE ?
           ) LIMIT 5`
        ).bind(companyId, `%${searchName}%`, `%${searchName}%`).all();

        const candidates = (results.results || []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          name: r.supplier_name as string,
          code: r.supplier_code as string,
        }));

        if (candidates.length === 1) {
          resolvedEntity = {
            type: 'supplier',
            raw_text: entity.raw_text,
            resolved_id: candidates[0].id,
            resolved_name: candidates[0].name,
            confidence: 0.95,
            ambiguous: false,
          };
        } else if (candidates.length > 1) {
          const exact = candidates.find(c =>
            c.name.toLowerCase() === searchName.toLowerCase()
          );
          if (exact) {
            resolvedEntity = {
              type: 'supplier',
              raw_text: entity.raw_text,
              resolved_id: exact.id,
              resolved_name: exact.name,
              confidence: 0.98,
              ambiguous: false,
            };
          } else {
            resolvedEntity = {
              type: 'supplier',
              raw_text: entity.raw_text,
              resolved_id: null,
              resolved_name: null,
              confidence: 0.5,
              ambiguous: true,
              candidates,
            };
          }
        } else {
          resolvedEntity = {
            type: 'supplier',
            raw_text: entity.raw_text,
            resolved_id: null,
            resolved_name: null,
            confidence: 0,
            ambiguous: false,
          };
        }
        break;
      }

      case 'product': {
        const results = await db.prepare(
          `SELECT id, product_name, product_code FROM products 
           WHERE company_id = ? AND (
             product_name LIKE ? OR product_code LIKE ?
           ) LIMIT 5`
        ).bind(companyId, `%${searchName}%`, `%${searchName}%`).all();

        const candidates = (results.results || []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          name: r.product_name as string,
          code: r.product_code as string,
        }));

        if (candidates.length === 1) {
          resolvedEntity = {
            type: 'product',
            raw_text: entity.raw_text,
            resolved_id: candidates[0].id,
            resolved_name: candidates[0].name,
            confidence: 0.95,
            ambiguous: false,
          };
        } else if (candidates.length > 1) {
          const exact = candidates.find(c =>
            c.name.toLowerCase() === searchName.toLowerCase()
          );
          if (exact) {
            resolvedEntity = {
              type: 'product',
              raw_text: entity.raw_text,
              resolved_id: exact.id,
              resolved_name: exact.name,
              confidence: 0.98,
              ambiguous: false,
            };
          } else {
            resolvedEntity = {
              type: 'product',
              raw_text: entity.raw_text,
              resolved_id: null,
              resolved_name: null,
              confidence: 0.5,
              ambiguous: true,
              candidates,
            };
          }
        } else {
          resolvedEntity = {
            type: 'product',
            raw_text: entity.raw_text,
            resolved_id: null,
            resolved_name: null,
            confidence: 0,
            ambiguous: false,
          };
        }
        break;
      }

      default:
        continue;
    }

    resolved.push(resolvedEntity);
  }

  return resolved;
}

// ─── Layer 3: Multi-step Planner ──────────────────────────────────────────────

/**
 * Creates an execution plan from a classified intent.
 * If a workflow template was matched, uses that template.
 * Otherwise, uses AI to decompose the request or creates a single-step plan.
 */
async function planWorkflow(
  intent: ClassifiedIntent,
  userMessage: string,
  resolvedEntities: ResolvedEntity[],
  ai: AIBinding | undefined
): Promise<ExecutionPlan> {
  const planId = generateUUID();
  const now = new Date().toISOString();

  // Case 1: Matched a workflow template
  if (intent.workflow_template_id) {
    const template = WORKFLOW_TEMPLATES.find(t => t.id === intent.workflow_template_id);
    if (template) {
      return {
        id: planId,
        user_request: userMessage,
        summary: template.description,
        steps: template.steps.map((s, i) => {
          const bot = SEMANTIC_BOT_REGISTRY.find(b => b.id === s.bot_id);
          return {
            step_number: i + 1,
            bot_id: s.bot_id,
            bot_name: bot?.name || s.bot_id,
            description: s.description,
            parameters: buildParametersFromEntities(s.bot_id, resolvedEntities, intent.entities),
            depends_on: s.depends_on,
            status: 'pending' as const,
          };
        }),
        requires_confirmation: true,
        resolved_entities: resolvedEntities,
        created_at: now,
      };
    }
  }

  // Case 2: AI-classified multi-step
  if (intent.is_multi_step && intent.bot_ids.length > 1) {
    // Build steps from the AI-selected bots, inferring dependencies
    const steps: PlanStep[] = intent.bot_ids.map((botId, i) => {
      const bot = SEMANTIC_BOT_REGISTRY.find(b => b.id === botId);
      const depends_on: number[] = [];

      // Infer dependencies: if this bot consumes something the previous bot produces
      if (bot && i > 0) {
        for (let j = 0; j < i; j++) {
          const prevBot = SEMANTIC_BOT_REGISTRY.find(b => b.id === intent.bot_ids[j]);
          if (prevBot) {
            const hasDepend = bot.consumes.some(c => prevBot.produces.includes(c));
            if (hasDepend) {
              depends_on.push(j + 1);
            }
          }
        }
        // If no explicit dependency found but sequential, depend on previous
        if (depends_on.length === 0) {
          depends_on.push(i);
        }
      }

      return {
        step_number: i + 1,
        bot_id: botId,
        bot_name: bot?.name || botId,
        description: bot?.description || `Execute ${botId}`,
        parameters: buildParametersFromEntities(botId, resolvedEntities, intent.entities),
        depends_on,
        status: 'pending' as const,
      };
    });

    // Generate summary using AI if available
    let summary = `Execute ${steps.length} bots in sequence`;
    if (ai) {
      try {
        const stepList = steps.map(s => `${s.step_number}. ${s.bot_name}: ${s.description}`).join('\n');
        const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            { role: 'system', content: 'You are ARIA. Summarize this execution plan in one concise sentence.' },
            { role: 'user', content: `User asked: "${userMessage}"\n\nPlan:\n${stepList}\n\nSummarize in one sentence:` },
          ],
          max_tokens: 100,
          temperature: 0.3,
        });
        const text = response.response || response.text || '';
        if (text.length > 10 && text.length < 200) {
          summary = text.trim();
        }
      } catch {
        // Use default summary
      }
    }

    return {
      id: planId,
      user_request: userMessage,
      summary,
      steps,
      requires_confirmation: true,
      resolved_entities: resolvedEntities,
      created_at: now,
    };
  }

  // Case 3: Single bot execution
  if (intent.bot_ids.length === 1) {
    const botId = intent.bot_ids[0];
    const bot = SEMANTIC_BOT_REGISTRY.find(b => b.id === botId);
    return {
      id: planId,
      user_request: userMessage,
      summary: bot?.description || `Execute ${botId}`,
      steps: [{
        step_number: 1,
        bot_id: botId,
        bot_name: bot?.name || botId,
        description: bot?.description || `Execute ${botId}`,
        parameters: buildParametersFromEntities(botId, resolvedEntities, intent.entities),
        depends_on: [],
        status: 'pending' as const,
      }],
      requires_confirmation: false,
      resolved_entities: resolvedEntities,
      created_at: now,
    };
  }

  // No plan possible
  return {
    id: planId,
    user_request: userMessage,
    summary: 'Unable to create an execution plan',
    steps: [],
    requires_confirmation: false,
    resolved_entities: resolvedEntities,
    created_at: now,
  };
}

/** Build bot parameters from resolved entities and extracted values */
function buildParametersFromEntities(
  botId: string,
  resolvedEntities: ResolvedEntity[],
  extractedEntities: ExtractedEntity[]
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const bot = SEMANTIC_BOT_REGISTRY.find(b => b.id === botId);
  if (!bot) return params;

  // Map resolved entities to bot parameters
  for (const entity of resolvedEntities) {
    if (entity.resolved_id) {
      if (entity.type === 'customer' && (bot.required_params.includes('customer_id') || bot.optional_params.includes('customer_id'))) {
        params.customer_id = entity.resolved_id;
        params.customer_name = entity.resolved_name;
      }
      if (entity.type === 'supplier' && (bot.required_params.includes('supplier_id') || bot.optional_params.includes('supplier_id'))) {
        params.supplier_id = entity.resolved_id;
        params.supplier_name = entity.resolved_name;
      }
    }
  }

  // Map extracted values
  for (const entity of extractedEntities) {
    if (entity.type === 'amount') {
      params.amount = parseFloat(entity.value);
    }
    if (entity.type === 'quantity') {
      params.quantity = parseInt(entity.value, 10);
    }
    if (entity.type === 'date') {
      params.date = entity.value;
    }
  }

  return params;
}

// ─── Layer 5: Orchestration + Execution ───────────────────────────────────────

/**
 * Executes a plan step by step, passing results between dependent steps.
 * Uses the existing bot execution infrastructure from ai-orchestrator.
 */
async function executePlan(
  plan: ExecutionPlan,
  companyId: string,
  userId: string,
  env: Env
): Promise<ExecutionPlan> {
  // Import executeBot dynamically to avoid circular deps
  const { executeBot } = await import('./ai-orchestrator');

  // Sort steps by dependency order (topological sort)
  const executionOrder = topologicalSort(plan.steps);

  for (const stepNumber of executionOrder) {
    const step = plan.steps.find(s => s.step_number === stepNumber);
    if (!step || step.status !== 'pending') continue;

    // Check all dependencies are completed
    const depsComplete = step.depends_on.every(dep => {
      const depStep = plan.steps.find(s => s.step_number === dep);
      return depStep?.status === 'completed';
    });

    if (!depsComplete) {
      step.status = 'skipped';
      step.error = 'Dependency not met';
      continue;
    }

    // Merge parameters from previous step results
    const mergedParams = { ...step.parameters };
    for (const depNum of step.depends_on) {
      const depStep = plan.steps.find(s => s.step_number === depNum);
      if (depStep?.result) {
        // Pass output IDs from previous steps
        const resultData = depStep.result;
        if (resultData.quote_id) mergedParams.quote_id = resultData.quote_id;
        if (resultData.sales_order_id) mergedParams.sales_order_id = resultData.sales_order_id;
        if (resultData.invoice_id) mergedParams.invoice_id = resultData.invoice_id;
        if (resultData.po_id) mergedParams.po_id = resultData.po_id;
        if (resultData.receipt_id) mergedParams.receipt_id = resultData.receipt_id;
        if (resultData.supplier_invoice_id) mergedParams.supplier_invoice_id = resultData.supplier_invoice_id;
      }
    }

    // Execute the bot
    step.status = 'running';
    try {
      const result = await executeBot(step.bot_id, mergedParams, companyId, userId, env as { DB: D1Database; AI: AIBinding });
      if (result.success) {
        step.status = 'completed';
        step.result = result.data || { message: result.response };
      } else {
        step.status = 'failed';
        step.error = result.response;
      }
    } catch (error) {
      step.status = 'failed';
      step.error = String(error);
    }
  }

  return plan;
}

/** Topological sort of plan steps based on dependencies */
function topologicalSort(steps: PlanStep[]): number[] {
  const order: number[] = [];
  const visited = new Set<number>();
  const visiting = new Set<number>();

  function visit(stepNum: number) {
    if (visited.has(stepNum)) return;
    if (visiting.has(stepNum)) return; // cycle
    visiting.add(stepNum);

    const step = steps.find(s => s.step_number === stepNum);
    if (step) {
      for (const dep of step.depends_on) {
        visit(dep);
      }
    }

    visiting.delete(stepNum);
    visited.add(stepNum);
    order.push(stepNum);
  }

  for (const step of steps) {
    visit(step.step_number);
  }

  return order;
}

// ─── Main Agent Entry Point ───────────────────────────────────────────────────

/**
 * Format a plan as a human-readable confirmation message
 */
function formatPlanConfirmation(plan: ExecutionPlan): string {
  const lines: string[] = [];
  lines.push(`**Execution Plan**`);
  lines.push(``);
  lines.push(`> ${plan.summary}`);
  lines.push(``);

  for (const step of plan.steps) {
    const deps = step.depends_on.length > 0
      ? ` _(after step ${step.depends_on.join(', ')})_`
      : '';
    lines.push(`**Step ${step.step_number}.** ${step.bot_name}${deps}`);
    lines.push(`   ${step.description}`);

    const paramEntries = Object.entries(step.parameters).filter(([, v]) => v !== undefined);
    if (paramEntries.length > 0) {
      const paramStr = paramEntries.map(([k, v]) => `${k}=${v}`).join(', ');
      lines.push(`   _Params: ${paramStr}_`);
    }
  }

  // Show resolved entities
  if (plan.resolved_entities.length > 0) {
    lines.push(``);
    lines.push(`**Resolved Entities:**`);
    for (const entity of plan.resolved_entities) {
      if (entity.resolved_id) {
        lines.push(`- ${entity.type}: "${entity.raw_text}" -> ${entity.resolved_name} (${entity.resolved_id.substring(0, 8)}...)`);
      } else if (entity.ambiguous && entity.candidates) {
        lines.push(`- ${entity.type}: "${entity.raw_text}" -> **Ambiguous** (${entity.candidates.length} matches found)`);
        for (const c of entity.candidates) {
          lines.push(`  - ${c.name} (${c.code || c.id.substring(0, 8)})`);
        }
      }
    }
  }

  lines.push(``);
  lines.push(`Reply **"yes"** to execute, or **"no"** to cancel.`);

  return lines.join('\n');
}

/**
 * Format execution results as a human-readable message
 */
function formatExecutionResults(plan: ExecutionPlan): string {
  const lines: string[] = [];
  lines.push(`**Workflow Complete**`);
  lines.push(``);

  const completed = plan.steps.filter(s => s.status === 'completed').length;
  const failed = plan.steps.filter(s => s.status === 'failed').length;
  const skipped = plan.steps.filter(s => s.status === 'skipped').length;
  const total = plan.steps.length;

  lines.push(`> ${completed}/${total} steps completed${failed > 0 ? `, ${failed} failed` : ''}${skipped > 0 ? `, ${skipped} skipped` : ''}`);
  lines.push(``);

  for (const step of plan.steps) {
    const icon = step.status === 'completed' ? 'Done' : step.status === 'failed' ? 'FAILED' : step.status === 'skipped' ? 'Skipped' : 'Pending';
    lines.push(`**Step ${step.step_number}. ${step.bot_name}** — ${icon}`);

    if (step.status === 'completed' && step.result) {
      const message = step.result.message as string;
      if (message) {
        // Show first 200 chars of the result message
        const truncated = message.length > 200 ? message.substring(0, 200) + '...' : message;
        lines.push(`   ${truncated}`);
      }
    } else if (step.status === 'failed' && step.error) {
      lines.push(`   Error: ${step.error}`);
    }
  }

  return lines.join('\n');
}

/**
 * The main agent function. Processes a user message through the full pipeline:
 * 1. Classify intent + extract entities
 * 2. Resolve entities against database
 * 3. Create execution plan
 * 4. If multi-step: show confirmation
 * 5. If single-step or confirmed: execute
 * 6. Return results
 */
export async function processAgentMessage(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  companyId: string,
  userId: string,
  env: Env,
  pendingPlan?: ExecutionPlan | null
): Promise<AgentResponse> {
  const lowerMessage = message.toLowerCase().trim();

  // Handle confirmation of a pending plan
  if (pendingPlan && pendingPlan.steps.length > 0) {
    if (/^(?:yes|y|confirm|proceed|go|execute|ok|sure|do it)$/i.test(lowerMessage)) {
      // Execute the plan
      const executedPlan = await executePlan(pendingPlan, companyId, userId, env);
      return {
        type: 'execution_result',
        message: formatExecutionResults(executedPlan),
        plan: executedPlan,
        step_results: executedPlan.steps,
      };
    }
    if (/^(?:no|n|cancel|abort|stop|never\s*mind)$/i.test(lowerMessage)) {
      return {
        type: 'simple_response',
        message: 'Workflow cancelled. How else can I help?',
      };
    }
    // Not a confirmation - treat as a new message
  }

  // Step 1: Classify intent
  const intent = await classifyAgentIntent(message, conversationHistory, env.AI as AIBinding | undefined);

  // No match - return clarification
  if (intent.bot_ids.length === 0) {
    return {
      type: 'clarification',
      message: buildNoMatchMessage(message),
      needs_clarification: true,
    };
  }

  // Step 2: Resolve entities
  const resolvedEntities = await resolveEntities(intent.entities, companyId, env.DB);

  // Check for ambiguous entities that need clarification
  const ambiguousEntities = resolvedEntities.filter(e => e.ambiguous);
  if (ambiguousEntities.length > 0) {
    const clarification = buildAmbiguityMessage(ambiguousEntities);
    return {
      type: 'clarification',
      message: clarification,
      needs_clarification: true,
      clarification_prompt: clarification,
    };
  }

  // Step 3: Create execution plan
  const plan = await planWorkflow(intent, message, resolvedEntities, env.AI as AIBinding | undefined);

  if (plan.steps.length === 0) {
    return {
      type: 'clarification',
      message: buildNoMatchMessage(message),
      needs_clarification: true,
    };
  }

  // Step 4: If multi-step, show confirmation first
  if (plan.requires_confirmation) {
    return {
      type: 'confirmation',
      message: formatPlanConfirmation(plan),
      plan,
      needs_confirmation: true,
    };
  }

  // Step 5: Single-step - execute immediately
  const executedPlan = await executePlan(plan, companyId, userId, env);
  return {
    type: 'execution_result',
    message: formatExecutionResults(executedPlan),
    plan: executedPlan,
    step_results: executedPlan.steps,
  };
}

function buildNoMatchMessage(message: string): string {
  // Find closest matching bots
  const words = message.toLowerCase().split(/\s+/);
  const suggestions: string[] = [];

  for (const bot of SEMANTIC_BOT_REGISTRY) {
    const matchScore = bot.triggers.reduce((score, trigger) => {
      const triggerWords = trigger.toLowerCase().split(/\s+/);
      const matches = triggerWords.filter(tw => words.some(w => w.includes(tw) || tw.includes(w))).length;
      return Math.max(score, matches / triggerWords.length);
    }, 0);
    if (matchScore > 0.3) {
      suggestions.push(`- "${bot.triggers[0]}" -> ${bot.name}`);
    }
  }

  let msg = `**I'm not sure what you'd like to do.**\n\n`;
  if (suggestions.length > 0) {
    msg += `Did you mean one of these?\n${suggestions.slice(0, 5).join('\n')}\n\n`;
  }
  msg += `**Available workflows:**\n`;
  msg += `- "Order to cash" - Full O2C cycle\n`;
  msg += `- "Procure to pay" - Full P2P cycle\n`;
  msg += `- "Month-end close" - Financial close workflow\n`;
  msg += `- "Create a quote" - Single bot execution\n`;
  msg += `- "Run payroll" - Single bot execution\n\n`;
  msg += `Type **"help"** for all available commands.`;
  return msg;
}

function buildAmbiguityMessage(ambiguousEntities: ResolvedEntity[]): string {
  const lines: string[] = [];
  lines.push(`**I found multiple matches. Please clarify:**\n`);

  for (const entity of ambiguousEntities) {
    lines.push(`For "${entity.raw_text}" (${entity.type}):`);
    if (entity.candidates) {
      entity.candidates.forEach((c, i) => {
        lines.push(`  **${i + 1}.** ${c.name}${c.code ? ` (${c.code})` : ''}`);
      });
    }
  }

  lines.push(`\n_Reply with the number to select, or type the exact name._`);
  return lines.join('\n');
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { SEMANTIC_BOT_REGISTRY, WORKFLOW_TEMPLATES };
