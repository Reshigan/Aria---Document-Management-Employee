/**
 * TypeScript types for ARIA API responses
 * Auto-generated from backend API specs
 */

// ============================================================================
// ADMIN API TYPES
// ============================================================================

export interface CompanySettings {
  id: string;
  name: string;
  registration_number: string;
  vat_number: string;
  tax_number: string;
  bbbee_level: number;
  bbbee_certificate_url?: string;
  bbbee_expiry_date?: string;
  sars_tax_number: string;
  sars_paye_number?: string;
  sars_uif_number?: string;
  sars_sdl_number?: string;
  financial_year_end: string;
  vat_rate: number;
  currency: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'employee' | 'finance' | 'hr' | 'procurement';
  department?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface BotConfig {
  bot_id: string;
  bot_name: string;
  enabled: boolean;
  auto_approval_limit?: number;
  notification_channels: ('email' | 'whatsapp' | 'sms' | 'in_app')[];
  settings: Record<string, any>;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

// ============================================================================
// REPORTS API TYPES
// ============================================================================

export interface ReportPeriod {
  start: string;
  end: string;
}

export interface InvoiceReconciliationReport {
  report_type: 'invoice_reconciliation';
  tenant_id: string;
  period: string;
  date_range: ReportPeriod;
  summary: {
    total_invoices_processed: number;
    successfully_matched: number;
    discrepancies_found: number;
    auto_approved: number;
    manual_review_required: number;
    avg_processing_time_seconds: number;
    success_rate_percent: number;
  };
  activity_by_day: Array<{
    date: string;
    processed: number;
    matched: number;
    discrepancies: number;
  }>;
  discrepancy_breakdown: Array<{
    reason: string;
    count: number;
    total_amount: number;
    avg_difference?: number;
  }>;
  top_suppliers_processed: Array<{
    supplier: string;
    invoices: number;
    total_amount: number;
  }>;
  recent_activity: Array<{
    timestamp: string;
    action: string;
    invoice_number: string;
    supplier: string;
    amount: number;
    status: string;
    issue?: string;
  }>;
  performance_metrics: {
    avg_processing_time_seconds: number;
    fastest_processing_seconds: number;
    slowest_processing_seconds: number;
    bot_uptime_percent: number;
    errors_encountered: number;
  };
  generated_at: string;
}

export interface BBBEEComplianceReport {
  report_type: 'bbbee_compliance';
  tenant_id: string;
  period: string;
  current_status: {
    bbbee_level: number;
    total_score: number;
    max_score: number;
    compliance_percent: number;
    procurement_recognition: number;
    certificate_valid_until: string;
    trend: 'improving' | 'stable' | 'declining';
  };
  scorecard_by_element: Array<{
    element: string;
    weight: number;
    score: number;
    compliance_percent: number;
    trend: 'improving' | 'stable' | 'declining';
    last_updated: string;
  }>;
  activity_log: Array<{
    timestamp: string;
    action: string;
    triggered_by: string;
    result: string;
    change?: string;
    supplier?: string;
    bbbee_level?: number;
    certificate_expiry?: string;
    status?: string;
  }>;
  supplier_verification_summary: {
    total_suppliers: number;
    verified_this_period: number;
    valid_certificates: number;
    expired_certificates: number;
    missing_certificates: number;
    avg_supplier_level: number;
  };
  improvement_opportunities: Array<{
    element: string;
    current_score: number;
    max_score: number;
    recommendation: string;
    potential_level_improvement: string;
  }>;
  compliance_alerts: Array<{
    severity: 'warning' | 'info' | 'error';
    message: string;
    action_required: string;
  }>;
  generated_at: string;
}

export interface PayrollActivityReport {
  report_type: 'payroll_activity';
  tenant_id: string;
  period: string;
  summary: {
    payroll_runs: number;
    employees_processed: number;
    total_gross_pay: number;
    total_paye: number;
    total_uif: number;
    total_sdl: number;
    total_net_pay: number;
    avg_processing_time_minutes: number;
    compliance_status: string;
  };
  payroll_runs: Array<{
    run_date: string;
    period: string;
    employees: number;
    status: string;
    gross_pay: number;
    net_pay: number;
    emp201_prepared: boolean;
    emp201_status: string;
    payslips_generated: number;
    payslips_emailed: number;
  }>;
  breakdown_by_department: Array<{
    department: string;
    employees: number;
    gross_pay: number;
    avg_salary: number;
  }>;
  sars_compliance: {
    emp201_status: string;
    emp201_due_date: string;
    days_until_due: number;
    paye_amount: number;
    uif_amount: number;
    sdl_amount: number;
    total_liability: number;
    last_submission: string;
    last_submission_status: string;
  };
  recent_activity: Array<{
    timestamp: string;
    action: string;
    period?: string;
    employees?: number;
    duration_seconds?: number;
    count?: number;
    delivery_rate?: string;
    amount?: number;
    status?: string;
  }>;
  year_to_date_summary: {
    payroll_runs: number;
    total_gross_pay: number;
    total_paye: number;
    total_uif: number;
    total_sdl: number;
    avg_monthly_payroll: number;
    compliance_rate: string;
  };
  alerts: Array<{
    severity: 'info' | 'warning' | 'error';
    message: string;
    action: string;
  }>;
  generated_at: string;
}

export interface ExpenseManagementReport {
  report_type: 'expense_management';
  tenant_id: string;
  period: string;
  summary: {
    total_claims: number;
    total_amount: number;
    auto_approved: number;
    manual_review: number;
    rejected: number;
    avg_claim_amount: number;
    avg_approval_time_hours: number;
    policy_violations: number;
  };
  breakdown_by_category: Array<{
    category: string;
    claims: number;
    amount: number;
    avg_amount: number;
    policy_limit: number;
    within_policy: number;
    exceeds_policy: number;
  }>;
  top_claimants: Array<{
    employee: string;
    department: string;
    claims: number;
    total_amount: number;
    avg_claim: number;
  }>;
  policy_violations_detected: Array<{
    violation_type: string;
    count: number;
    total_amount: number;
    action_taken: string;
  }>;
  approval_workflow_performance: {
    avg_approval_time_hours: number;
    fastest_approval_minutes: number;
    slowest_approval_days: number;
    auto_approval_rate: number;
    manual_review_rate: number;
  };
  recent_activity: Array<{
    timestamp: string;
    employee: string;
    category: string;
    amount: number;
    status: string;
    reason: string;
  }>;
  trends: {
    month_over_month_change: string;
    most_popular_category: string;
    peak_day_of_week: string;
    seasonal_pattern: string;
  };
  generated_at: string;
}

export interface DashboardSummary {
  timestamp: string;
  bot_activity: {
    invoice_reconciliation: {
      today: number;
      this_week: number;
      success_rate: number;
    };
    bbbee_compliance: {
      current_level: number;
      score: number;
      trend: string;
    };
    payroll: {
      last_run: string;
      employees: number;
      status: string;
    };
    expense_management: {
      today: number;
      pending_approval: number;
      total_amount: number;
    };
  };
  workflows: {
    active: number;
    completed_this_week: number;
    overdue: number;
    sla_compliance: number;
  };
  bot_actions: {
    pending: number;
    notifications_sent_today: number;
    escalations_active: number;
  };
  integrations: {
    active: number;
    last_sync: string;
    success_rate: number;
  };
  alerts: Array<{
    severity: 'warning' | 'info' | 'error';
    message: string;
  }>;
  recent_activity: Array<{
    timestamp: string;
    type: string;
    description: string;
  }>;
}

// ============================================================================
// BOT ACTION TYPES
// ============================================================================

export interface BotAction {
  id: string;
  action_type: 'approval' | 'review' | 'payment' | 'followup';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  assignee_id: string;
  assignee_email: string;
  due_date: string;
  status: 'pending' | 'completed' | 'overdue';
  entity_type: string;
  entity_id: string;
  metadata: Record<string, any>;
  reminders_sent: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

export interface Workflow {
  id: string;
  workflow_type: 'P2P' | 'O2C' | 'H2R' | 'EXPENSE' | 'BBBEE';
  name: string;
  status: 'active' | 'completed' | 'overdue';
  current_step: string;
  progress_percent: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  due_date: string;
  metadata: Record<string, any>;
}

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

export interface Integration {
  id: string;
  integration_type: 'xero' | 'sage' | 'pastel' | 'microsoft' | 'sars' | 'odoo';
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  last_sync: string;
  sync_frequency: string;
  settings: Record<string, any>;
}

// ============================================================================
// FINANCIAL REPORT TYPES
// ============================================================================

export interface ProfitLossReport {
  report_type: 'profit_loss';
  period: ReportPeriod;
  revenue: Array<{
    account: string;
    amount: number;
  }>;
  expenses: Array<{
    account: string;
    amount: number;
  }>;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  generated_at: string;
}

export interface BalanceSheetReport {
  report_type: 'balance_sheet';
  as_of_date: string;
  assets: Array<{
    account: string;
    amount: number;
  }>;
  liabilities: Array<{
    account: string;
    amount: number;
  }>;
  equity: Array<{
    account: string;
    amount: number;
  }>;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  generated_at: string;
}

export interface AgedDebtorsReport {
  report_type: 'aged_debtors';
  as_of_date: string;
  debtors: Array<{
    customer: string;
    current: number;
    days_30: number;
    days_60: number;
    days_90: number;
    days_120_plus: number;
    total: number;
  }>;
  totals: {
    current: number;
    days_30: number;
    days_60: number;
    days_90: number;
    days_120_plus: number;
    total: number;
  };
  generated_at: string;
}
