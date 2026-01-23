/**
 * Invoice Reminder Service
 * 
 * Provides functionality for:
 * - Automated overdue invoice reminders
 * - Configurable reminder schedules
 * - Email notification sending
 * - Reminder history tracking
 */

import { D1Database } from '@cloudflare/workers-types';

export interface ReminderSchedule {
  id: string;
  company_id: string;
  name: string;
  days_before_due: number | null;  // null = after due date
  days_after_due: number | null;   // null = before due date
  email_subject: string;
  email_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceReminder {
  id: string;
  company_id: string;
  invoice_id: string;
  schedule_id: string | null;
  reminder_type: 'before_due' | 'on_due' | 'overdue' | 'manual';
  sent_at: string;
  sent_to: string;
  email_subject: string;
  email_body: string;
  status: 'sent' | 'failed' | 'bounced';
  error_message: string | null;
}

// Default reminder templates
export const DEFAULT_TEMPLATES = {
  before_due: {
    subject: 'Payment Reminder: Invoice {{invoice_number}} due in {{days}} days',
    body: `Dear {{customer_name}},

This is a friendly reminder that invoice {{invoice_number}} for {{currency}} {{amount}} is due on {{due_date}}.

Invoice Details:
- Invoice Number: {{invoice_number}}
- Amount Due: {{currency}} {{amount}}
- Due Date: {{due_date}}

Please ensure payment is made by the due date to avoid any late fees.

If you have already made this payment, please disregard this reminder.

Thank you for your business.

Best regards,
{{company_name}}`
  },
  on_due: {
    subject: 'Payment Due Today: Invoice {{invoice_number}}',
    body: `Dear {{customer_name}},

This is a reminder that invoice {{invoice_number}} for {{currency}} {{amount}} is due today.

Invoice Details:
- Invoice Number: {{invoice_number}}
- Amount Due: {{currency}} {{amount}}
- Due Date: {{due_date}}

Please arrange payment at your earliest convenience.

If you have already made this payment, please disregard this reminder.

Thank you for your business.

Best regards,
{{company_name}}`
  },
  overdue: {
    subject: 'OVERDUE: Invoice {{invoice_number}} - {{days}} days past due',
    body: `Dear {{customer_name}},

Our records indicate that invoice {{invoice_number}} for {{currency}} {{amount}} is now {{days}} days overdue.

Invoice Details:
- Invoice Number: {{invoice_number}}
- Amount Due: {{currency}} {{amount}}
- Original Due Date: {{due_date}}
- Days Overdue: {{days}}

Please arrange payment immediately to avoid any further action.

If you have already made this payment, please contact us with the payment details so we can update our records.

If you are experiencing difficulties making this payment, please contact us to discuss payment arrangements.

Thank you for your prompt attention to this matter.

Best regards,
{{company_name}}`
  }
};

// Create default reminder schedules for a company
export async function createDefaultSchedules(
  db: D1Database,
  companyId: string
): Promise<void> {
  const now = new Date().toISOString();
  
  const schedules = [
    { name: '7 Days Before Due', days_before_due: 7, days_after_due: null, ...DEFAULT_TEMPLATES.before_due },
    { name: '3 Days Before Due', days_before_due: 3, days_after_due: null, ...DEFAULT_TEMPLATES.before_due },
    { name: 'On Due Date', days_before_due: 0, days_after_due: null, ...DEFAULT_TEMPLATES.on_due },
    { name: '7 Days Overdue', days_before_due: null, days_after_due: 7, ...DEFAULT_TEMPLATES.overdue },
    { name: '14 Days Overdue', days_before_due: null, days_after_due: 14, ...DEFAULT_TEMPLATES.overdue },
    { name: '30 Days Overdue', days_before_due: null, days_after_due: 30, ...DEFAULT_TEMPLATES.overdue },
  ];
  
  for (const schedule of schedules) {
    await db.prepare(`
      INSERT INTO reminder_schedules (
        id, company_id, name, days_before_due, days_after_due,
        email_subject, email_template, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      crypto.randomUUID(),
      companyId,
      schedule.name,
      schedule.days_before_due,
      schedule.days_after_due,
      schedule.subject,
      schedule.body,
      now,
      now
    ).run();
  }
}

// Get reminder schedules for a company
export async function listReminderSchedules(
  db: D1Database,
  companyId: string
): Promise<ReminderSchedule[]> {
  const result = await db.prepare(`
    SELECT * FROM reminder_schedules
    WHERE company_id = ?
    ORDER BY 
      CASE WHEN days_before_due IS NOT NULL THEN days_before_due ELSE 999 END DESC,
      CASE WHEN days_after_due IS NOT NULL THEN days_after_due ELSE 0 END ASC
  `).bind(companyId).all();
  
  return (result.results || []) as unknown as ReminderSchedule[];
}

// Create or update a reminder schedule
export async function upsertReminderSchedule(
  db: D1Database,
  companyId: string,
  input: {
    id?: string;
    name: string;
    days_before_due?: number | null;
    days_after_due?: number | null;
    email_subject: string;
    email_template: string;
    is_active?: boolean;
  }
): Promise<string> {
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  
  if (input.id) {
    await db.prepare(`
      UPDATE reminder_schedules SET
        name = ?, days_before_due = ?, days_after_due = ?,
        email_subject = ?, email_template = ?, is_active = ?, updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(
      input.name,
      input.days_before_due ?? null,
      input.days_after_due ?? null,
      input.email_subject,
      input.email_template,
      input.is_active !== false ? 1 : 0,
      now,
      input.id,
      companyId
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO reminder_schedules (
        id, company_id, name, days_before_due, days_after_due,
        email_subject, email_template, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      companyId,
      input.name,
      input.days_before_due ?? null,
      input.days_after_due ?? null,
      input.email_subject,
      input.email_template,
      input.is_active !== false ? 1 : 0,
      now,
      now
    ).run();
  }
  
  return id;
}

// Delete a reminder schedule
export async function deleteReminderSchedule(
  db: D1Database,
  companyId: string,
  scheduleId: string
): Promise<void> {
  await db.prepare(`
    DELETE FROM reminder_schedules WHERE id = ? AND company_id = ?
  `).bind(scheduleId, companyId).run();
}

// Replace template variables
function replaceTemplateVars(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return result;
}

// Get invoices that need reminders
export async function getInvoicesNeedingReminders(
  db: D1Database,
  companyId: string
): Promise<Array<{
  invoice: any;
  schedule: ReminderSchedule;
  days: number;
  reminderType: 'before_due' | 'on_due' | 'overdue';
}>> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Get active schedules
  const schedules = await listReminderSchedules(db, companyId);
  const activeSchedules = schedules.filter(s => s.is_active);
  
  // Get unpaid invoices
  const invoices = await db.prepare(`
    SELECT ci.*, c.customer_name, c.email as customer_email, co.name as company_name, co.currency
    FROM customer_invoices ci
    LEFT JOIN customers c ON ci.customer_id = c.id
    LEFT JOIN companies co ON ci.company_id = co.id
    WHERE ci.company_id = ?
      AND ci.status IN ('sent', 'posted', 'partial', 'overdue')
      AND ci.balance_due > 0
  `).bind(companyId).all();
  
  const results: Array<{
    invoice: any;
    schedule: ReminderSchedule;
    days: number;
    reminderType: 'before_due' | 'on_due' | 'overdue';
  }> = [];
  
  for (const invoice of (invoices.results || []) as any[]) {
    const dueDate = new Date(invoice.due_date);
    const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    for (const schedule of activeSchedules) {
      let shouldRemind = false;
      let reminderType: 'before_due' | 'on_due' | 'overdue' = 'before_due';
      let days = 0;
      
      if (schedule.days_before_due !== null && schedule.days_before_due >= 0) {
        // Before or on due date
        if (diffDays === schedule.days_before_due) {
          shouldRemind = true;
          reminderType = diffDays === 0 ? 'on_due' : 'before_due';
          days = diffDays;
        }
      } else if (schedule.days_after_due !== null && schedule.days_after_due > 0) {
        // After due date (overdue)
        if (-diffDays === schedule.days_after_due) {
          shouldRemind = true;
          reminderType = 'overdue';
          days = -diffDays;
        }
      }
      
      if (shouldRemind) {
        // Check if reminder already sent today for this schedule
        const existingReminder = await db.prepare(`
          SELECT id FROM invoice_reminders
          WHERE invoice_id = ? AND schedule_id = ?
            AND DATE(sent_at) = ?
        `).bind(invoice.id, schedule.id, todayStr).first();
        
        if (!existingReminder) {
          results.push({ invoice, schedule, days, reminderType });
        }
      }
    }
  }
  
  return results;
}

// Send a reminder for an invoice
export async function sendInvoiceReminder(
  db: D1Database,
  companyId: string,
  invoiceId: string,
  scheduleId: string | null,
  reminderType: 'before_due' | 'on_due' | 'overdue' | 'manual',
  emailService: { sendEmail: (to: string, subject: string, body: string) => Promise<boolean> }
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();
  
  // Get invoice details
  const invoice = await db.prepare(`
    SELECT ci.*, c.customer_name, c.email as customer_email, co.name as company_name, co.currency
    FROM customer_invoices ci
    LEFT JOIN customers c ON ci.customer_id = c.id
    LEFT JOIN companies co ON ci.company_id = co.id
    WHERE ci.id = ? AND ci.company_id = ?
  `).bind(invoiceId, companyId).first<any>();
  
  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }
  
  if (!invoice.customer_email) {
    return { success: false, error: 'Customer has no email address' };
  }
  
  // Get schedule template or use default
  let subject: string;
  let body: string;
  
  if (scheduleId) {
    const schedule = await db.prepare(`
      SELECT * FROM reminder_schedules WHERE id = ? AND company_id = ?
    `).bind(scheduleId, companyId).first<ReminderSchedule>();
    
    if (schedule) {
      subject = schedule.email_subject;
      body = schedule.email_template;
    } else {
      const template = DEFAULT_TEMPLATES[reminderType === 'manual' ? 'overdue' : reminderType];
      subject = template.subject;
      body = template.body;
    }
  } else {
    const template = DEFAULT_TEMPLATES[reminderType === 'manual' ? 'overdue' : reminderType];
    subject = template.subject;
    body = template.body;
  }
  
  // Calculate days
  const dueDate = new Date(invoice.due_date);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  const days = Math.abs(diffDays);
  
  // Replace template variables
  const vars = {
    customer_name: invoice.customer_name || 'Valued Customer',
    invoice_number: invoice.invoice_number,
    amount: invoice.balance_due.toFixed(2),
    currency: invoice.currency || 'ZAR',
    due_date: invoice.due_date,
    days: days,
    company_name: invoice.company_name || 'Our Company'
  };
  
  const finalSubject = replaceTemplateVars(subject, vars);
  const finalBody = replaceTemplateVars(body, vars);
  
  // Send email
  let status: 'sent' | 'failed' = 'sent';
  let errorMessage: string | null = null;
  
  try {
    const sent = await emailService.sendEmail(invoice.customer_email, finalSubject, finalBody);
    if (!sent) {
      status = 'failed';
      errorMessage = 'Email service returned false';
    }
  } catch (error: any) {
    status = 'failed';
    errorMessage = error.message;
  }
  
  // Record the reminder
  await db.prepare(`
    INSERT INTO invoice_reminders (
      id, company_id, invoice_id, schedule_id, reminder_type,
      sent_at, sent_to, email_subject, email_body, status, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    companyId,
    invoiceId,
    scheduleId,
    reminderType,
    now,
    invoice.customer_email,
    finalSubject,
    finalBody,
    status,
    errorMessage
  ).run();
  
  return status === 'sent' 
    ? { success: true } 
    : { success: false, error: errorMessage || 'Failed to send email' };
}

// Process all due reminders (called by cron)
export async function processDueReminders(
  db: D1Database,
  emailService: { sendEmail: (to: string, subject: string, body: string) => Promise<boolean> }
): Promise<{ sent: number; failed: number; errors: string[] }> {
  // Get all companies
  const companies = await db.prepare(`SELECT id FROM companies`).all();
  
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (const company of (companies.results || []) as any[]) {
    const invoicesNeedingReminders = await getInvoicesNeedingReminders(db, company.id);
    
    for (const { invoice, schedule, reminderType } of invoicesNeedingReminders) {
      const result = await sendInvoiceReminder(
        db,
        company.id,
        invoice.id,
        schedule.id,
        reminderType,
        emailService
      );
      
      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push(`Invoice ${invoice.invoice_number}: ${result.error}`);
      }
    }
  }
  
  return { sent, failed, errors };
}

// Get reminder history for an invoice
export async function getInvoiceReminderHistory(
  db: D1Database,
  companyId: string,
  invoiceId: string
): Promise<InvoiceReminder[]> {
  const result = await db.prepare(`
    SELECT * FROM invoice_reminders
    WHERE company_id = ? AND invoice_id = ?
    ORDER BY sent_at DESC
  `).bind(companyId, invoiceId).all();
  
  return (result.results || []) as unknown as InvoiceReminder[];
}

export default {
  DEFAULT_TEMPLATES,
  createDefaultSchedules,
  listReminderSchedules,
  upsertReminderSchedule,
  deleteReminderSchedule,
  getInvoicesNeedingReminders,
  sendInvoiceReminder,
  processDueReminders,
  getInvoiceReminderHistory
};
