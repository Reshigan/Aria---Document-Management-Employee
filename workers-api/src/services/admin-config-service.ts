/**
 * Admin Configuration Service
 * 
 * Provides functionality for:
 * - Chart of Accounts management
 * - Invoice Template Designer
 * - Lock Dates configuration
 * - Payment Terms management
 * - Tax Rates management
 * - Email Template customization
 * - Tracking Categories (dimensions)
 */

import { D1Database } from '@cloudflare/workers-types';

// ==================== INTERFACES ====================

export interface ChartOfAccount {
  id: string;
  company_id: string;
  code: string;
  name: string;
  account_type: string;
  tax_rate_id: string | null;
  description: string | null;
  parent_account_id: string | null;
  is_system_account: boolean;
  is_active: boolean;
  show_in_expense_claims: boolean;
  enable_payments: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceTemplate {
  id: string;
  company_id: string;
  name: string;
  is_default: boolean;
  template_type: string;
  logo_url: string | null;
  logo_position: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  show_logo: boolean;
  show_payment_advice: boolean;
  show_tax_summary: boolean;
  show_discount_column: boolean;
  show_unit_price: boolean;
  show_quantity: boolean;
  header_text: string | null;
  footer_text: string | null;
  terms_and_conditions: string | null;
  payment_instructions: string | null;
  custom_css: string | null;
  layout_config: string | null;
  created_at: string;
  updated_at: string;
}

export interface LockDate {
  id: string;
  company_id: string;
  lock_type: string;
  lock_date: string;
  reason: string | null;
  locked_by: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentTerm {
  id: string;
  company_id: string;
  name: string;
  days: number;
  term_type: string;
  day_of_month: number | null;
  is_default: boolean;
  is_active: boolean;
  description: string | null;
  early_payment_discount_percent: number | null;
  early_payment_discount_days: number | null;
  late_fee_percent: number | null;
  late_fee_grace_days: number | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaxRate {
  id: string;
  company_id: string;
  name: string;
  rate: number;
  tax_type: string;
  tax_component: string;
  is_default: boolean;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  applies_to: string;
  report_code: string | null;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  company_id: string;
  template_type: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  is_default: boolean;
  is_active: boolean;
  variables: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackingCategory {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
  is_required_for_sales: boolean;
  is_required_for_purchases: boolean;
  is_required_for_expenses: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  options?: TrackingCategoryOption[];
}

export interface TrackingCategoryOption {
  id: string;
  tracking_category_id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialSettings {
  id: string;
  company_id: string;
  financial_year_start_month: number;
  financial_year_start_day: number;
  lock_date_all_users: string | null;
  lock_date_non_admin: string | null;
  conversion_date: string | null;
  conversion_balances_entered: boolean;
  default_sales_account_id: string | null;
  default_purchases_account_id: string | null;
  default_tax_rate_id: string | null;
  default_payment_term_id: string | null;
  multi_currency_enabled: boolean;
  base_currency: string;
  created_at: string;
  updated_at: string;
}

// ==================== CHART OF ACCOUNTS ====================

export async function listChartOfAccounts(
  db: D1Database,
  companyId: string,
  options?: { accountType?: string; isActive?: boolean; parentId?: string }
): Promise<ChartOfAccount[]> {
  let query = `SELECT * FROM chart_of_accounts WHERE company_id = ?`;
  const params: any[] = [companyId];

  if (options?.accountType) {
    query += ` AND account_type = ?`;
    params.push(options.accountType);
  }
  if (options?.isActive !== undefined) {
    query += ` AND is_active = ?`;
    params.push(options.isActive ? 1 : 0);
  }
  if (options?.parentId) {
    query += ` AND parent_account_id = ?`;
    params.push(options.parentId);
  }

  query += ` ORDER BY display_order, code`;

  const result = await db.prepare(query).bind(...params).all();
  return (result.results || []).map((row: any) => ({
    ...row,
    is_system_account: Boolean(row.is_system_account),
    is_active: Boolean(row.is_active),
    show_in_expense_claims: Boolean(row.show_in_expense_claims),
    enable_payments: Boolean(row.enable_payments)
  })) as ChartOfAccount[];
}

export async function getChartOfAccount(
  db: D1Database,
  companyId: string,
  accountId: string
): Promise<ChartOfAccount | null> {
  const result = await db.prepare(`
    SELECT * FROM chart_of_accounts WHERE id = ? AND company_id = ?
  `).bind(accountId, companyId).first();

  if (!result) return null;

  return {
    ...result,
    is_system_account: Boolean((result as any).is_system_account),
    is_active: Boolean((result as any).is_active),
    show_in_expense_claims: Boolean((result as any).show_in_expense_claims),
    enable_payments: Boolean((result as any).enable_payments)
  } as ChartOfAccount;
}

export async function createChartOfAccount(
  db: D1Database,
  companyId: string,
  input: {
    code: string;
    name: string;
    account_type: string;
    tax_rate_id?: string;
    description?: string;
    parent_account_id?: string;
    show_in_expense_claims?: boolean;
    enable_payments?: boolean;
    display_order?: number;
  }
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO chart_of_accounts (
      id, company_id, code, name, account_type, tax_rate_id, description,
      parent_account_id, show_in_expense_claims, enable_payments, display_order,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    companyId,
    input.code,
    input.name,
    input.account_type,
    input.tax_rate_id || null,
    input.description || null,
    input.parent_account_id || null,
    input.show_in_expense_claims ? 1 : 0,
    input.enable_payments ? 1 : 0,
    input.display_order || 0,
    now,
    now
  ).run();

  return id;
}

export async function updateChartOfAccount(
  db: D1Database,
  companyId: string,
  accountId: string,
  input: Partial<{
    code: string;
    name: string;
    account_type: string;
    tax_rate_id: string | null;
    description: string | null;
    parent_account_id: string | null;
    is_active: boolean;
    show_in_expense_claims: boolean;
    enable_payments: boolean;
    display_order: number;
  }>
): Promise<void> {
  const account = await getChartOfAccount(db, companyId, accountId);
  if (!account) throw new Error('Account not found');
  if (account.is_system_account) throw new Error('Cannot modify system account');

  const updates: string[] = [];
  const params: any[] = [];

  if (input.code !== undefined) { updates.push('code = ?'); params.push(input.code); }
  if (input.name !== undefined) { updates.push('name = ?'); params.push(input.name); }
  if (input.account_type !== undefined) { updates.push('account_type = ?'); params.push(input.account_type); }
  if (input.tax_rate_id !== undefined) { updates.push('tax_rate_id = ?'); params.push(input.tax_rate_id); }
  if (input.description !== undefined) { updates.push('description = ?'); params.push(input.description); }
  if (input.parent_account_id !== undefined) { updates.push('parent_account_id = ?'); params.push(input.parent_account_id); }
  if (input.is_active !== undefined) { updates.push('is_active = ?'); params.push(input.is_active ? 1 : 0); }
  if (input.show_in_expense_claims !== undefined) { updates.push('show_in_expense_claims = ?'); params.push(input.show_in_expense_claims ? 1 : 0); }
  if (input.enable_payments !== undefined) { updates.push('enable_payments = ?'); params.push(input.enable_payments ? 1 : 0); }
  if (input.display_order !== undefined) { updates.push('display_order = ?'); params.push(input.display_order); }

  if (updates.length === 0) return;

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(accountId);
  params.push(companyId);

  await db.prepare(`
    UPDATE chart_of_accounts SET ${updates.join(', ')} WHERE id = ? AND company_id = ?
  `).bind(...params).run();
}

export async function deleteChartOfAccount(
  db: D1Database,
  companyId: string,
  accountId: string
): Promise<void> {
  const account = await getChartOfAccount(db, companyId, accountId);
  if (!account) throw new Error('Account not found');
  if (account.is_system_account) throw new Error('Cannot delete system account');

  await db.prepare(`
    DELETE FROM chart_of_accounts WHERE id = ? AND company_id = ?
  `).bind(accountId, companyId).run();
}

// ==================== INVOICE TEMPLATES ====================

export async function listInvoiceTemplates(
  db: D1Database,
  companyId: string,
  templateType?: string
): Promise<InvoiceTemplate[]> {
  let query = `SELECT * FROM invoice_templates WHERE company_id = ?`;
  const params: any[] = [companyId];

  if (templateType) {
    query += ` AND template_type = ?`;
    params.push(templateType);
  }

  query += ` ORDER BY is_default DESC, name`;

  const result = await db.prepare(query).bind(...params).all();
  return (result.results || []).map((row: any) => ({
    ...row,
    is_default: Boolean(row.is_default),
    show_logo: Boolean(row.show_logo),
    show_payment_advice: Boolean(row.show_payment_advice),
    show_tax_summary: Boolean(row.show_tax_summary),
    show_discount_column: Boolean(row.show_discount_column),
    show_unit_price: Boolean(row.show_unit_price),
    show_quantity: Boolean(row.show_quantity)
  })) as InvoiceTemplate[];
}

export async function getInvoiceTemplate(
  db: D1Database,
  companyId: string,
  templateId: string
): Promise<InvoiceTemplate | null> {
  const result = await db.prepare(`
    SELECT * FROM invoice_templates WHERE id = ? AND company_id = ?
  `).bind(templateId, companyId).first();

  if (!result) return null;

  return {
    ...result,
    is_default: Boolean((result as any).is_default),
    show_logo: Boolean((result as any).show_logo),
    show_payment_advice: Boolean((result as any).show_payment_advice),
    show_tax_summary: Boolean((result as any).show_tax_summary),
    show_discount_column: Boolean((result as any).show_discount_column),
    show_unit_price: Boolean((result as any).show_unit_price),
    show_quantity: Boolean((result as any).show_quantity)
  } as InvoiceTemplate;
}

export async function createInvoiceTemplate(
  db: D1Database,
  companyId: string,
  input: {
    name: string;
    template_type: string;
    logo_url?: string;
    logo_position?: string;
    primary_color?: string;
    secondary_color?: string;
    font_family?: string;
    show_logo?: boolean;
    show_payment_advice?: boolean;
    show_tax_summary?: boolean;
    show_discount_column?: boolean;
    show_unit_price?: boolean;
    show_quantity?: boolean;
    header_text?: string;
    footer_text?: string;
    terms_and_conditions?: string;
    payment_instructions?: string;
    custom_css?: string;
    layout_config?: string;
    is_default?: boolean;
  }
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // If setting as default, unset other defaults
  if (input.is_default) {
    await db.prepare(`
      UPDATE invoice_templates SET is_default = 0 WHERE company_id = ? AND template_type = ?
    `).bind(companyId, input.template_type).run();
  }

  await db.prepare(`
    INSERT INTO invoice_templates (
      id, company_id, name, template_type, logo_url, logo_position,
      primary_color, secondary_color, font_family, show_logo, show_payment_advice,
      show_tax_summary, show_discount_column, show_unit_price, show_quantity,
      header_text, footer_text, terms_and_conditions, payment_instructions,
      custom_css, layout_config, is_default, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    companyId,
    input.name,
    input.template_type,
    input.logo_url || null,
    input.logo_position || 'left',
    input.primary_color || '#1e40af',
    input.secondary_color || '#64748b',
    input.font_family || 'Inter',
    input.show_logo !== false ? 1 : 0,
    input.show_payment_advice !== false ? 1 : 0,
    input.show_tax_summary !== false ? 1 : 0,
    input.show_discount_column ? 1 : 0,
    input.show_unit_price !== false ? 1 : 0,
    input.show_quantity !== false ? 1 : 0,
    input.header_text || null,
    input.footer_text || null,
    input.terms_and_conditions || null,
    input.payment_instructions || null,
    input.custom_css || null,
    input.layout_config || null,
    input.is_default ? 1 : 0,
    now,
    now
  ).run();

  return id;
}

export async function updateInvoiceTemplate(
  db: D1Database,
  companyId: string,
  templateId: string,
  input: Partial<InvoiceTemplate>
): Promise<void> {
  const template = await getInvoiceTemplate(db, companyId, templateId);
  if (!template) throw new Error('Template not found');

  // If setting as default, unset other defaults
  if (input.is_default) {
    await db.prepare(`
      UPDATE invoice_templates SET is_default = 0 WHERE company_id = ? AND template_type = ? AND id != ?
    `).bind(companyId, template.template_type, templateId).run();
  }

  const updates: string[] = [];
  const params: any[] = [];

  const fields = [
    'name', 'logo_url', 'logo_position', 'primary_color', 'secondary_color',
    'font_family', 'header_text', 'footer_text', 'terms_and_conditions',
    'payment_instructions', 'custom_css', 'layout_config'
  ];

  for (const field of fields) {
    if ((input as any)[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push((input as any)[field]);
    }
  }

  const boolFields = [
    'show_logo', 'show_payment_advice', 'show_tax_summary', 'show_discount_column',
    'show_unit_price', 'show_quantity', 'is_default'
  ];

  for (const field of boolFields) {
    if ((input as any)[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push((input as any)[field] ? 1 : 0);
    }
  }

  if (updates.length === 0) return;

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(templateId);
  params.push(companyId);

  await db.prepare(`
    UPDATE invoice_templates SET ${updates.join(', ')} WHERE id = ? AND company_id = ?
  `).bind(...params).run();
}

export async function deleteInvoiceTemplate(
  db: D1Database,
  companyId: string,
  templateId: string
): Promise<void> {
  const template = await getInvoiceTemplate(db, companyId, templateId);
  if (!template) throw new Error('Template not found');
  if (template.is_default) throw new Error('Cannot delete default template');

  await db.prepare(`
    DELETE FROM invoice_templates WHERE id = ? AND company_id = ?
  `).bind(templateId, companyId).run();
}

// ==================== LOCK DATES ====================

export async function getFinancialSettings(
  db: D1Database,
  companyId: string
): Promise<FinancialSettings | null> {
  const result = await db.prepare(`
    SELECT * FROM financial_settings WHERE company_id = ?
  `).bind(companyId).first();

  if (!result) return null;

  return {
    ...result,
    conversion_balances_entered: Boolean((result as any).conversion_balances_entered),
    multi_currency_enabled: Boolean((result as any).multi_currency_enabled)
  } as FinancialSettings;
}

export async function updateFinancialSettings(
  db: D1Database,
  companyId: string,
  input: Partial<{
    financial_year_start_month: number;
    financial_year_start_day: number;
    lock_date_all_users: string | null;
    lock_date_non_admin: string | null;
    conversion_date: string | null;
    conversion_balances_entered: boolean;
    default_sales_account_id: string | null;
    default_purchases_account_id: string | null;
    default_tax_rate_id: string | null;
    default_payment_term_id: string | null;
    multi_currency_enabled: boolean;
    base_currency: string;
  }>
): Promise<void> {
  const existing = await getFinancialSettings(db, companyId);
  const now = new Date().toISOString();

  if (!existing) {
    // Create new settings
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO financial_settings (
        id, company_id, financial_year_start_month, financial_year_start_day,
        lock_date_all_users, lock_date_non_admin, conversion_date, conversion_balances_entered,
        default_sales_account_id, default_purchases_account_id, default_tax_rate_id,
        default_payment_term_id, multi_currency_enabled, base_currency, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      companyId,
      input.financial_year_start_month || 1,
      input.financial_year_start_day || 1,
      input.lock_date_all_users || null,
      input.lock_date_non_admin || null,
      input.conversion_date || null,
      input.conversion_balances_entered ? 1 : 0,
      input.default_sales_account_id || null,
      input.default_purchases_account_id || null,
      input.default_tax_rate_id || null,
      input.default_payment_term_id || null,
      input.multi_currency_enabled ? 1 : 0,
      input.base_currency || 'ZAR',
      now,
      now
    ).run();
  } else {
    // Update existing settings
    const updates: string[] = [];
    const params: any[] = [];

    const fields = [
      'financial_year_start_month', 'financial_year_start_day',
      'lock_date_all_users', 'lock_date_non_admin', 'conversion_date',
      'default_sales_account_id', 'default_purchases_account_id',
      'default_tax_rate_id', 'default_payment_term_id', 'base_currency'
    ];

    for (const field of fields) {
      if ((input as any)[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push((input as any)[field]);
      }
    }

    if (input.conversion_balances_entered !== undefined) {
      updates.push('conversion_balances_entered = ?');
      params.push(input.conversion_balances_entered ? 1 : 0);
    }
    if (input.multi_currency_enabled !== undefined) {
      updates.push('multi_currency_enabled = ?');
      params.push(input.multi_currency_enabled ? 1 : 0);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    params.push(now);
    params.push(companyId);

    await db.prepare(`
      UPDATE financial_settings SET ${updates.join(', ')} WHERE company_id = ?
    `).bind(...params).run();
  }
}

export async function checkLockDate(
  db: D1Database,
  companyId: string,
  transactionDate: string,
  isAdmin: boolean
): Promise<{ locked: boolean; reason?: string }> {
  const settings = await getFinancialSettings(db, companyId);
  if (!settings) return { locked: false };

  const txnDate = new Date(transactionDate);

  // Check all users lock date
  if (settings.lock_date_all_users) {
    const lockDate = new Date(settings.lock_date_all_users);
    if (txnDate <= lockDate) {
      return { locked: true, reason: `Period is locked for all users until ${settings.lock_date_all_users}` };
    }
  }

  // Check non-admin lock date
  if (!isAdmin && settings.lock_date_non_admin) {
    const lockDate = new Date(settings.lock_date_non_admin);
    if (txnDate <= lockDate) {
      return { locked: true, reason: `Period is locked for non-admin users until ${settings.lock_date_non_admin}` };
    }
  }

  return { locked: false };
}

// ==================== PAYMENT TERMS ====================

export async function listPaymentTerms(
  db: D1Database,
  companyId: string,
  activeOnly: boolean = true
): Promise<PaymentTerm[]> {
  let query = `SELECT * FROM payment_terms WHERE company_id = ?`;
  const params: any[] = [companyId];

  if (activeOnly) {
    query += ` AND is_active = 1`;
  }

  query += ` ORDER BY display_order, name`;

  const result = await db.prepare(query).bind(...params).all();
  return (result.results || []).map((row: any) => ({
    ...row,
    is_default: Boolean(row.is_default),
    is_active: Boolean(row.is_active)
  })) as PaymentTerm[];
}

export async function getPaymentTerm(
  db: D1Database,
  companyId: string,
  termId: string
): Promise<PaymentTerm | null> {
  const result = await db.prepare(`
    SELECT * FROM payment_terms WHERE id = ? AND company_id = ?
  `).bind(termId, companyId).first();

  if (!result) return null;

  return {
    ...result,
    is_default: Boolean((result as any).is_default),
    is_active: Boolean((result as any).is_active)
  } as PaymentTerm;
}

export async function createPaymentTerm(
  db: D1Database,
  companyId: string,
  input: {
    name: string;
    days: number;
    term_type: string;
    day_of_month?: number;
    is_default?: boolean;
    description?: string;
    early_payment_discount_percent?: number;
    early_payment_discount_days?: number;
    late_fee_percent?: number;
    late_fee_grace_days?: number;
    display_order?: number;
  }
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // If setting as default, unset other defaults
  if (input.is_default) {
    await db.prepare(`
      UPDATE payment_terms SET is_default = 0 WHERE company_id = ?
    `).bind(companyId).run();
  }

  await db.prepare(`
    INSERT INTO payment_terms (
      id, company_id, name, days, term_type, day_of_month, is_default,
      description, early_payment_discount_percent, early_payment_discount_days,
      late_fee_percent, late_fee_grace_days, display_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    companyId,
    input.name,
    input.days,
    input.term_type,
    input.day_of_month || null,
    input.is_default ? 1 : 0,
    input.description || null,
    input.early_payment_discount_percent || null,
    input.early_payment_discount_days || null,
    input.late_fee_percent || null,
    input.late_fee_grace_days || null,
    input.display_order || 0,
    now,
    now
  ).run();

  return id;
}

export async function updatePaymentTerm(
  db: D1Database,
  companyId: string,
  termId: string,
  input: Partial<PaymentTerm>
): Promise<void> {
  const term = await getPaymentTerm(db, companyId, termId);
  if (!term) throw new Error('Payment term not found');

  // If setting as default, unset other defaults
  if (input.is_default) {
    await db.prepare(`
      UPDATE payment_terms SET is_default = 0 WHERE company_id = ? AND id != ?
    `).bind(companyId, termId).run();
  }

  const updates: string[] = [];
  const params: any[] = [];

  const fields = [
    'name', 'days', 'term_type', 'day_of_month', 'description',
    'early_payment_discount_percent', 'early_payment_discount_days',
    'late_fee_percent', 'late_fee_grace_days', 'display_order'
  ];

  for (const field of fields) {
    if ((input as any)[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push((input as any)[field]);
    }
  }

  if (input.is_default !== undefined) {
    updates.push('is_default = ?');
    params.push(input.is_default ? 1 : 0);
  }
  if (input.is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(input.is_active ? 1 : 0);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(termId);
  params.push(companyId);

  await db.prepare(`
    UPDATE payment_terms SET ${updates.join(', ')} WHERE id = ? AND company_id = ?
  `).bind(...params).run();
}

export async function deletePaymentTerm(
  db: D1Database,
  companyId: string,
  termId: string
): Promise<void> {
  const term = await getPaymentTerm(db, companyId, termId);
  if (!term) throw new Error('Payment term not found');
  if (term.is_default) throw new Error('Cannot delete default payment term');

  await db.prepare(`
    DELETE FROM payment_terms WHERE id = ? AND company_id = ?
  `).bind(termId, companyId).run();
}

export function calculateDueDate(term: PaymentTerm, invoiceDate: Date): Date {
  const dueDate = new Date(invoiceDate);

  switch (term.term_type) {
    case 'due_on_receipt':
      return dueDate;
    case 'net_days':
      dueDate.setDate(dueDate.getDate() + term.days);
      return dueDate;
    case 'day_of_month':
      if (term.day_of_month) {
        dueDate.setDate(term.day_of_month);
        if (dueDate <= invoiceDate) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }
      }
      return dueDate;
    case 'day_of_following_month':
      dueDate.setMonth(dueDate.getMonth() + 1);
      if (term.day_of_month) {
        dueDate.setDate(term.day_of_month);
      }
      return dueDate;
    default:
      dueDate.setDate(dueDate.getDate() + term.days);
      return dueDate;
  }
}

// ==================== TAX RATES ====================

export async function listTaxRates(
  db: D1Database,
  companyId: string,
  options?: { taxType?: string; appliesTo?: string; activeOnly?: boolean }
): Promise<TaxRate[]> {
  let query = `SELECT * FROM tax_rates WHERE company_id = ?`;
  const params: any[] = [companyId];

  if (options?.taxType) {
    query += ` AND tax_type = ?`;
    params.push(options.taxType);
  }
  if (options?.appliesTo) {
    query += ` AND (applies_to = 'all' OR applies_to = ?)`;
    params.push(options.appliesTo);
  }
  if (options?.activeOnly !== false) {
    query += ` AND is_active = 1`;
  }

  query += ` ORDER BY display_order, name`;

  const result = await db.prepare(query).bind(...params).all();
  return (result.results || []).map((row: any) => ({
    ...row,
    is_default: Boolean(row.is_default),
    is_active: Boolean(row.is_active)
  })) as TaxRate[];
}

export async function getTaxRate(
  db: D1Database,
  companyId: string,
  taxRateId: string
): Promise<TaxRate | null> {
  const result = await db.prepare(`
    SELECT * FROM tax_rates WHERE id = ? AND company_id = ?
  `).bind(taxRateId, companyId).first();

  if (!result) return null;

  return {
    ...result,
    is_default: Boolean((result as any).is_default),
    is_active: Boolean((result as any).is_active)
  } as TaxRate;
}

export async function createTaxRate(
  db: D1Database,
  companyId: string,
  input: {
    name: string;
    rate: number;
    tax_type: string;
    tax_component?: string;
    is_default?: boolean;
    effective_from?: string;
    effective_to?: string;
    applies_to?: string;
    report_code?: string;
    description?: string;
    display_order?: number;
  }
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // If setting as default, unset other defaults
  if (input.is_default) {
    await db.prepare(`
      UPDATE tax_rates SET is_default = 0 WHERE company_id = ?
    `).bind(companyId).run();
  }

  await db.prepare(`
    INSERT INTO tax_rates (
      id, company_id, name, rate, tax_type, tax_component, is_default,
      effective_from, effective_to, applies_to, report_code, description,
      display_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    companyId,
    input.name,
    input.rate,
    input.tax_type,
    input.tax_component || 'single',
    input.is_default ? 1 : 0,
    input.effective_from || null,
    input.effective_to || null,
    input.applies_to || 'all',
    input.report_code || null,
    input.description || null,
    input.display_order || 0,
    now,
    now
  ).run();

  return id;
}

export async function updateTaxRate(
  db: D1Database,
  companyId: string,
  taxRateId: string,
  input: Partial<TaxRate>
): Promise<void> {
  const taxRate = await getTaxRate(db, companyId, taxRateId);
  if (!taxRate) throw new Error('Tax rate not found');

  // If setting as default, unset other defaults
  if (input.is_default) {
    await db.prepare(`
      UPDATE tax_rates SET is_default = 0 WHERE company_id = ? AND id != ?
    `).bind(companyId, taxRateId).run();
  }

  const updates: string[] = [];
  const params: any[] = [];

  const fields = [
    'name', 'rate', 'tax_type', 'tax_component', 'effective_from', 'effective_to',
    'applies_to', 'report_code', 'description', 'display_order'
  ];

  for (const field of fields) {
    if ((input as any)[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push((input as any)[field]);
    }
  }

  if (input.is_default !== undefined) {
    updates.push('is_default = ?');
    params.push(input.is_default ? 1 : 0);
  }
  if (input.is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(input.is_active ? 1 : 0);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(taxRateId);
  params.push(companyId);

  await db.prepare(`
    UPDATE tax_rates SET ${updates.join(', ')} WHERE id = ? AND company_id = ?
  `).bind(...params).run();
}

export async function deleteTaxRate(
  db: D1Database,
  companyId: string,
  taxRateId: string
): Promise<void> {
  const taxRate = await getTaxRate(db, companyId, taxRateId);
  if (!taxRate) throw new Error('Tax rate not found');
  if (taxRate.is_default) throw new Error('Cannot delete default tax rate');

  await db.prepare(`
    DELETE FROM tax_rates WHERE id = ? AND company_id = ?
  `).bind(taxRateId, companyId).run();
}

// ==================== EMAIL TEMPLATES ====================

export async function listEmailTemplates(
  db: D1Database,
  companyId: string,
  templateType?: string
): Promise<EmailTemplate[]> {
  let query = `SELECT * FROM email_templates WHERE company_id = ?`;
  const params: any[] = [companyId];

  if (templateType) {
    query += ` AND template_type = ?`;
    params.push(templateType);
  }

  query += ` ORDER BY template_type, is_default DESC, name`;

  const result = await db.prepare(query).bind(...params).all();
  return (result.results || []).map((row: any) => ({
    ...row,
    is_default: Boolean(row.is_default),
    is_active: Boolean(row.is_active)
  })) as EmailTemplate[];
}

export async function getEmailTemplate(
  db: D1Database,
  companyId: string,
  templateId: string
): Promise<EmailTemplate | null> {
  const result = await db.prepare(`
    SELECT * FROM email_templates WHERE id = ? AND company_id = ?
  `).bind(templateId, companyId).first();

  if (!result) return null;

  return {
    ...result,
    is_default: Boolean((result as any).is_default),
    is_active: Boolean((result as any).is_active)
  } as EmailTemplate;
}

export async function createEmailTemplate(
  db: D1Database,
  companyId: string,
  input: {
    template_type: string;
    name: string;
    subject: string;
    body_html: string;
    body_text?: string;
    is_default?: boolean;
    variables?: string;
  }
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // If setting as default, unset other defaults
  if (input.is_default) {
    await db.prepare(`
      UPDATE email_templates SET is_default = 0 WHERE company_id = ? AND template_type = ?
    `).bind(companyId, input.template_type).run();
  }

  await db.prepare(`
    INSERT INTO email_templates (
      id, company_id, template_type, name, subject, body_html, body_text,
      is_default, variables, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    companyId,
    input.template_type,
    input.name,
    input.subject,
    input.body_html,
    input.body_text || null,
    input.is_default ? 1 : 0,
    input.variables || null,
    now,
    now
  ).run();

  return id;
}

export async function updateEmailTemplate(
  db: D1Database,
  companyId: string,
  templateId: string,
  input: Partial<EmailTemplate>
): Promise<void> {
  const template = await getEmailTemplate(db, companyId, templateId);
  if (!template) throw new Error('Email template not found');

  // If setting as default, unset other defaults
  if (input.is_default) {
    await db.prepare(`
      UPDATE email_templates SET is_default = 0 WHERE company_id = ? AND template_type = ? AND id != ?
    `).bind(companyId, template.template_type, templateId).run();
  }

  const updates: string[] = [];
  const params: any[] = [];

  const fields = ['name', 'subject', 'body_html', 'body_text', 'variables'];

  for (const field of fields) {
    if ((input as any)[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push((input as any)[field]);
    }
  }

  if (input.is_default !== undefined) {
    updates.push('is_default = ?');
    params.push(input.is_default ? 1 : 0);
  }
  if (input.is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(input.is_active ? 1 : 0);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(templateId);
  params.push(companyId);

  await db.prepare(`
    UPDATE email_templates SET ${updates.join(', ')} WHERE id = ? AND company_id = ?
  `).bind(...params).run();
}

export async function deleteEmailTemplate(
  db: D1Database,
  companyId: string,
  templateId: string
): Promise<void> {
  const template = await getEmailTemplate(db, companyId, templateId);
  if (!template) throw new Error('Email template not found');
  if (template.is_default) throw new Error('Cannot delete default email template');

  await db.prepare(`
    DELETE FROM email_templates WHERE id = ? AND company_id = ?
  `).bind(templateId, companyId).run();
}

export function renderEmailTemplate(
  template: EmailTemplate,
  variables: Record<string, string>
): { subject: string; body_html: string; body_text: string } {
  let subject = template.subject;
  let body_html = template.body_html;
  let body_text = template.body_text || '';

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    subject = subject.replace(new RegExp(placeholder, 'g'), value);
    body_html = body_html.replace(new RegExp(placeholder, 'g'), value);
    body_text = body_text.replace(new RegExp(placeholder, 'g'), value);
  }

  return { subject, body_html, body_text };
}

// ==================== TRACKING CATEGORIES ====================

export async function listTrackingCategories(
  db: D1Database,
  companyId: string,
  includeOptions: boolean = false
): Promise<TrackingCategory[]> {
  const result = await db.prepare(`
    SELECT * FROM tracking_categories WHERE company_id = ? ORDER BY display_order, name
  `).bind(companyId).all();

  const categories = (result.results || []).map((row: any) => ({
    ...row,
    is_active: Boolean(row.is_active),
    is_required_for_sales: Boolean(row.is_required_for_sales),
    is_required_for_purchases: Boolean(row.is_required_for_purchases),
    is_required_for_expenses: Boolean(row.is_required_for_expenses)
  })) as TrackingCategory[];

  if (includeOptions) {
    for (const category of categories) {
      const optionsResult = await db.prepare(`
        SELECT * FROM tracking_category_options WHERE tracking_category_id = ? ORDER BY display_order, name
      `).bind(category.id).all();

      category.options = (optionsResult.results || []).map((row: any) => ({
        ...row,
        is_active: Boolean(row.is_active)
      })) as TrackingCategoryOption[];
    }
  }

  return categories;
}

export async function getTrackingCategory(
  db: D1Database,
  companyId: string,
  categoryId: string,
  includeOptions: boolean = true
): Promise<TrackingCategory | null> {
  const result = await db.prepare(`
    SELECT * FROM tracking_categories WHERE id = ? AND company_id = ?
  `).bind(categoryId, companyId).first();

  if (!result) return null;

  const category = {
    ...result,
    is_active: Boolean((result as any).is_active),
    is_required_for_sales: Boolean((result as any).is_required_for_sales),
    is_required_for_purchases: Boolean((result as any).is_required_for_purchases),
    is_required_for_expenses: Boolean((result as any).is_required_for_expenses)
  } as TrackingCategory;

  if (includeOptions) {
    const optionsResult = await db.prepare(`
      SELECT * FROM tracking_category_options WHERE tracking_category_id = ? ORDER BY display_order, name
    `).bind(categoryId).all();

    category.options = (optionsResult.results || []).map((row: any) => ({
      ...row,
      is_active: Boolean(row.is_active)
    })) as TrackingCategoryOption[];
  }

  return category;
}

export async function createTrackingCategory(
  db: D1Database,
  companyId: string,
  input: {
    name: string;
    is_required_for_sales?: boolean;
    is_required_for_purchases?: boolean;
    is_required_for_expenses?: boolean;
    display_order?: number;
    options?: { name: string; code?: string }[];
  }
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO tracking_categories (
      id, company_id, name, is_required_for_sales, is_required_for_purchases,
      is_required_for_expenses, display_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    companyId,
    input.name,
    input.is_required_for_sales ? 1 : 0,
    input.is_required_for_purchases ? 1 : 0,
    input.is_required_for_expenses ? 1 : 0,
    input.display_order || 0,
    now,
    now
  ).run();

  // Create options if provided
  if (input.options && input.options.length > 0) {
    for (let i = 0; i < input.options.length; i++) {
      const option = input.options[i];
      await db.prepare(`
        INSERT INTO tracking_category_options (
          id, tracking_category_id, name, code, display_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        id,
        option.name,
        option.code || null,
        i + 1,
        now,
        now
      ).run();
    }
  }

  return id;
}

export async function updateTrackingCategory(
  db: D1Database,
  companyId: string,
  categoryId: string,
  input: Partial<{
    name: string;
    is_active: boolean;
    is_required_for_sales: boolean;
    is_required_for_purchases: boolean;
    is_required_for_expenses: boolean;
    display_order: number;
  }>
): Promise<void> {
  const category = await getTrackingCategory(db, companyId, categoryId, false);
  if (!category) throw new Error('Tracking category not found');

  const updates: string[] = [];
  const params: any[] = [];

  if (input.name !== undefined) { updates.push('name = ?'); params.push(input.name); }
  if (input.display_order !== undefined) { updates.push('display_order = ?'); params.push(input.display_order); }
  if (input.is_active !== undefined) { updates.push('is_active = ?'); params.push(input.is_active ? 1 : 0); }
  if (input.is_required_for_sales !== undefined) { updates.push('is_required_for_sales = ?'); params.push(input.is_required_for_sales ? 1 : 0); }
  if (input.is_required_for_purchases !== undefined) { updates.push('is_required_for_purchases = ?'); params.push(input.is_required_for_purchases ? 1 : 0); }
  if (input.is_required_for_expenses !== undefined) { updates.push('is_required_for_expenses = ?'); params.push(input.is_required_for_expenses ? 1 : 0); }

  if (updates.length === 0) return;

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(categoryId);
  params.push(companyId);

  await db.prepare(`
    UPDATE tracking_categories SET ${updates.join(', ')} WHERE id = ? AND company_id = ?
  `).bind(...params).run();
}

export async function deleteTrackingCategory(
  db: D1Database,
  companyId: string,
  categoryId: string
): Promise<void> {
  const category = await getTrackingCategory(db, companyId, categoryId, false);
  if (!category) throw new Error('Tracking category not found');

  // Delete options first (cascade should handle this, but being explicit)
  await db.prepare(`
    DELETE FROM tracking_category_options WHERE tracking_category_id = ?
  `).bind(categoryId).run();

  await db.prepare(`
    DELETE FROM tracking_categories WHERE id = ? AND company_id = ?
  `).bind(categoryId, companyId).run();
}

export async function addTrackingCategoryOption(
  db: D1Database,
  categoryId: string,
  input: { name: string; code?: string; display_order?: number }
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO tracking_category_options (
      id, tracking_category_id, name, code, display_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    categoryId,
    input.name,
    input.code || null,
    input.display_order || 0,
    now,
    now
  ).run();

  return id;
}

export async function updateTrackingCategoryOption(
  db: D1Database,
  optionId: string,
  input: Partial<{ name: string; code: string; is_active: boolean; display_order: number }>
): Promise<void> {
  const updates: string[] = [];
  const params: any[] = [];

  if (input.name !== undefined) { updates.push('name = ?'); params.push(input.name); }
  if (input.code !== undefined) { updates.push('code = ?'); params.push(input.code); }
  if (input.display_order !== undefined) { updates.push('display_order = ?'); params.push(input.display_order); }
  if (input.is_active !== undefined) { updates.push('is_active = ?'); params.push(input.is_active ? 1 : 0); }

  if (updates.length === 0) return;

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(optionId);

  await db.prepare(`
    UPDATE tracking_category_options SET ${updates.join(', ')} WHERE id = ?
  `).bind(...params).run();
}

export async function deleteTrackingCategoryOption(
  db: D1Database,
  optionId: string
): Promise<void> {
  await db.prepare(`
    DELETE FROM tracking_category_options WHERE id = ?
  `).bind(optionId).run();
}

export default {
  // Chart of Accounts
  listChartOfAccounts,
  getChartOfAccount,
  createChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount,
  // Invoice Templates
  listInvoiceTemplates,
  getInvoiceTemplate,
  createInvoiceTemplate,
  updateInvoiceTemplate,
  deleteInvoiceTemplate,
  // Financial Settings & Lock Dates
  getFinancialSettings,
  updateFinancialSettings,
  checkLockDate,
  // Payment Terms
  listPaymentTerms,
  getPaymentTerm,
  createPaymentTerm,
  updatePaymentTerm,
  deletePaymentTerm,
  calculateDueDate,
  // Tax Rates
  listTaxRates,
  getTaxRate,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
  // Email Templates
  listEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  renderEmailTemplate,
  // Tracking Categories
  listTrackingCategories,
  getTrackingCategory,
  createTrackingCategory,
  updateTrackingCategory,
  deleteTrackingCategory,
  addTrackingCategoryOption,
  updateTrackingCategoryOption,
  deleteTrackingCategoryOption
};
