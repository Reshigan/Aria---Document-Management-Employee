/**
 * Xero Parity Routes
 * 
 * API endpoints for:
 * - Recurring Invoices
 * - Invoice Reminders
 * - Customer Statements
 * - Customer Portal
 * - Budget vs Actual
 * - Bank Feeds (Plaid)
 */

import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';

// Import services
import * as recurringInvoiceService from '../services/recurring-invoice-service';
import * as invoiceReminderService from '../services/invoice-reminder-service';
import * as customerStatementService from '../services/customer-statement-service';
import * as customerPortalService from '../services/customer-portal-service';
import * as budgetService from '../services/budget-service';
import * as bankFeedsService from '../services/bank-feeds-service';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  PLAID_CLIENT_ID?: string;
  PLAID_SECRET?: string;
  PLAID_ENV?: 'sandbox' | 'development' | 'production';
}

const app = new Hono<{ Bindings: Env }>();


// Dummy email service for now
const dummyEmailService = {
  sendEmail: async (to: string, subject: string, body: string, html?: string): Promise<boolean> => {
    console.log(`[Email] To: ${to}, Subject: ${subject}`);
    return true;
  }
};

// ==================== RECURRING INVOICES ====================

// List recurring invoices
app.get('/recurring-invoices', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const customerId = c.req.query('customer_id');
    const isActive = c.req.query('is_active');
    
    const invoices = await recurringInvoiceService.listRecurringInvoices(
      c.env.DB,
      companyId,
      { 
        customerId, 
        isActive: isActive !== undefined ? isActive === 'true' : undefined 
      }
    );
    
    return c.json({ recurring_invoices: invoices });
  } catch (error: any) {
    console.error('Error listing recurring invoices:', error);
    return c.json({ error: error.message || 'Failed to list recurring invoices' }, 500);
  }
});

// Create recurring invoice
app.post('/recurring-invoices', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    
    const invoice = await recurringInvoiceService.createRecurringInvoice(
      c.env.DB,
      companyId,
      {
        customer_id: body.customer_id,
        template_name: body.template_name,
        frequency: body.frequency,
        start_date: body.start_date,
        end_date: body.end_date,
        invoice_prefix: body.invoice_prefix,
        payment_terms_days: body.payment_terms_days,
        notes: body.notes,
        auto_send: body.auto_send,
        items: body.items || []
      }
    );
    
    return c.json(invoice, 201);
  } catch (error: any) {
    console.error('Error creating recurring invoice:', error);
    return c.json({ error: error.message || 'Failed to create recurring invoice' }, 500);
  }
});

// Get recurring invoice
app.get('/recurring-invoices/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const id = c.req.param('id');
    const result = await recurringInvoiceService.getRecurringInvoice(c.env.DB, companyId, id);
    
    if (!result) {
      return c.json({ error: 'Recurring invoice not found' }, 404);
    }
    
    return c.json(result);
  } catch (error: any) {
    console.error('Error getting recurring invoice:', error);
    return c.json({ error: error.message || 'Failed to get recurring invoice' }, 500);
  }
});

// Update recurring invoice
app.put('/recurring-invoices/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    await recurringInvoiceService.updateRecurringInvoice(c.env.DB, companyId, id, body);
    
    return c.json({ message: 'Recurring invoice updated successfully' });
  } catch (error: any) {
    console.error('Error updating recurring invoice:', error);
    return c.json({ error: error.message || 'Failed to update recurring invoice' }, 500);
  }
});

// Pause recurring invoice
app.post('/recurring-invoices/:id/pause', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const id = c.req.param('id');
    await recurringInvoiceService.updateRecurringInvoice(c.env.DB, companyId, id, { is_active: false });
    
    return c.json({ message: 'Recurring invoice paused' });
  } catch (error: any) {
    console.error('Error pausing recurring invoice:', error);
    return c.json({ error: error.message || 'Failed to pause recurring invoice' }, 500);
  }
});

// Resume recurring invoice
app.post('/recurring-invoices/:id/resume', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const id = c.req.param('id');
    await recurringInvoiceService.updateRecurringInvoice(c.env.DB, companyId, id, { is_active: true });
    
    return c.json({ message: 'Recurring invoice resumed' });
  } catch (error: any) {
    console.error('Error resuming recurring invoice:', error);
    return c.json({ error: error.message || 'Failed to resume recurring invoice' }, 500);
  }
});

// Generate invoice from recurring
app.post('/recurring-invoices/:id/generate', async (c) => {
  const companyId = await getSecureCompanyId(c);
  const userId = await getSecureUserId(c);
  if (!companyId || !userId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const id = c.req.param('id');
    const invoice = await recurringInvoiceService.generateInvoiceFromRecurring(c.env.DB, companyId, id, userId);
    
    return c.json(invoice, 201);
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return c.json({ error: error.message || 'Failed to generate invoice' }, 500);
  }
});

// Process all due recurring invoices (called by cron)
app.post('/recurring-invoices/process-due', async (c) => {
  try {
    const result = await recurringInvoiceService.processDueRecurringInvoices(c.env.DB);
    return c.json(result);
  } catch (error: any) {
    console.error('Error processing due recurring invoices:', error);
    return c.json({ error: error.message || 'Failed to process recurring invoices' }, 500);
  }
});

// Delete recurring invoice
app.delete('/recurring-invoices/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const id = c.req.param('id');
    await recurringInvoiceService.deleteRecurringInvoice(c.env.DB, companyId, id);
    
    return c.json({ message: 'Recurring invoice deleted' });
  } catch (error: any) {
    console.error('Error deleting recurring invoice:', error);
    return c.json({ error: error.message || 'Failed to delete recurring invoice' }, 500);
  }
});

// ==================== INVOICE REMINDERS ====================

// List reminder schedules
app.get('/invoice-reminders/schedules', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const schedules = await invoiceReminderService.listReminderSchedules(c.env.DB, companyId);
    return c.json({ schedules });
  } catch (error: any) {
    console.error('Error listing reminder schedules:', error);
    return c.json({ error: error.message || 'Failed to list reminder schedules' }, 500);
  }
});

// Create reminder schedule
app.post('/invoice-reminders/schedules', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    
    const scheduleId = await invoiceReminderService.upsertReminderSchedule(c.env.DB, companyId, {
      name: body.name,
      days_before_due: body.days_before_due,
      days_after_due: body.days_after_due,
      email_subject: body.email_subject,
      email_template: body.email_template,
      is_active: body.is_active
    });
    
    return c.json({ id: scheduleId }, 201);
  } catch (error: any) {
    console.error('Error creating reminder schedule:', error);
    return c.json({ error: error.message || 'Failed to create reminder schedule' }, 500);
  }
});

// Update reminder schedule
app.put('/invoice-reminders/schedules/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    await invoiceReminderService.upsertReminderSchedule(c.env.DB, companyId, {
      id,
      name: body.name,
      days_before_due: body.days_before_due,
      days_after_due: body.days_after_due,
      email_subject: body.email_subject,
      email_template: body.email_template,
      is_active: body.is_active
    });
    
    return c.json({ message: 'Reminder schedule updated' });
  } catch (error: any) {
    console.error('Error updating reminder schedule:', error);
    return c.json({ error: error.message || 'Failed to update reminder schedule' }, 500);
  }
});

// Delete reminder schedule
app.delete('/invoice-reminders/schedules/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const id = c.req.param('id');
    await invoiceReminderService.deleteReminderSchedule(c.env.DB, companyId, id);
    
    return c.json({ message: 'Reminder schedule deleted' });
  } catch (error: any) {
    console.error('Error deleting reminder schedule:', error);
    return c.json({ error: error.message || 'Failed to delete reminder schedule' }, 500);
  }
});

// Get reminder history for an invoice
app.get('/invoice-reminders/history/:invoiceId', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const invoiceId = c.req.param('invoiceId');
    const history = await invoiceReminderService.getInvoiceReminderHistory(c.env.DB, companyId, invoiceId);
    
    return c.json({ history });
  } catch (error: any) {
    console.error('Error getting reminder history:', error);
    return c.json({ error: error.message || 'Failed to get reminder history' }, 500);
  }
});

// Send manual reminder
app.post('/invoice-reminders/send/:invoiceId', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const invoiceId = c.req.param('invoiceId');
    const body = await c.req.json();
    
    const result = await invoiceReminderService.sendInvoiceReminder(
      c.env.DB,
      companyId,
      invoiceId,
      body.schedule_id || null,
      'manual',
      dummyEmailService
    );
    
    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }
    
    return c.json({ message: 'Reminder sent successfully' });
  } catch (error: any) {
    console.error('Error sending reminder:', error);
    return c.json({ error: error.message || 'Failed to send reminder' }, 500);
  }
});

// Process all due reminders (called by cron)
app.post('/invoice-reminders/process-due', async (c) => {
  try {
    const result = await invoiceReminderService.processDueReminders(c.env.DB, dummyEmailService);
    return c.json(result);
  } catch (error: any) {
    console.error('Error processing due reminders:', error);
    return c.json({ error: error.message || 'Failed to process reminders' }, 500);
  }
});

// Create default schedules for a company
app.post('/invoice-reminders/create-defaults', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    await invoiceReminderService.createDefaultSchedules(c.env.DB, companyId);
    return c.json({ message: 'Default schedules created' });
  } catch (error: any) {
    console.error('Error creating default schedules:', error);
    return c.json({ error: error.message || 'Failed to create default schedules' }, 500);
  }
});

// ==================== CUSTOMER STATEMENTS ====================

// Generate statement for a customer
app.post('/statements/generate', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    
    const statement = await customerStatementService.generateStatement(
      c.env.DB,
      companyId,
      body.customer_id,
      body.start_date,
      body.end_date
    );
    
    return c.json(statement);
  } catch (error: any) {
    console.error('Error generating statement:', error);
    return c.json({ error: error.message || 'Failed to generate statement' }, 500);
  }
});

// Get statement HTML
app.get('/statements/:customerId/html', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const customerId = c.req.param('customerId');
    const startDate = c.req.query('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = c.req.query('end_date') || new Date().toISOString().split('T')[0];
    
    const statement = await customerStatementService.generateStatement(
      c.env.DB,
      companyId,
      customerId,
      startDate,
      endDate
    );
    
    // Get company info for HTML generation
    const company = await c.env.DB.prepare(`
      SELECT name, address, phone, email FROM companies WHERE id = ?
    `).bind(companyId).first<{ name: string; address: string; phone: string; email: string }>();
    
    const html = customerStatementService.generateStatementHTML(statement, {
      name: company?.name || 'Company',
      address: company?.address,
      phone: company?.phone,
      email: company?.email
    });
    
    return c.html(html);
  } catch (error: any) {
    console.error('Error generating statement HTML:', error);
    return c.json({ error: error.message || 'Failed to generate statement' }, 500);
  }
});

// Email statement to customer
app.post('/statements/:customerId/email', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const customerId = c.req.param('customerId');
    const body = await c.req.json();
    
    const statement = await customerStatementService.generateStatement(
      c.env.DB,
      companyId,
      customerId,
      body.start_date,
      body.end_date
    );
    
    // Save statement record
    await customerStatementService.saveStatementRecord(c.env.DB, statement);
    
    // Get company info
    const company = await c.env.DB.prepare(`
      SELECT name, email FROM companies WHERE id = ?
    `).bind(companyId).first<{ name: string; email: string }>();
    
    const result = await customerStatementService.emailStatement(
      c.env.DB,
      statement,
      { name: company?.name || 'Company', email: company?.email },
      dummyEmailService
    );
    
    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }
    
    return c.json({ message: 'Statement emailed successfully' });
  } catch (error: any) {
    console.error('Error emailing statement:', error);
    return c.json({ error: error.message || 'Failed to email statement' }, 500);
  }
});

// Get statement history
app.get('/statements/history', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const customerId = c.req.query('customer_id');
    if (!customerId) {
      return c.json({ error: 'customer_id is required' }, 400);
    }
    const history = await customerStatementService.getStatementHistory(c.env.DB, companyId, customerId);
    
    return c.json({ history });
  } catch (error: any) {
    console.error('Error getting statement history:', error);
    return c.json({ error: error.message || 'Failed to get statement history' }, 500);
  }
});

// Bulk generate statements
app.post('/statements/bulk-generate', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    
    const result = await customerStatementService.bulkGenerateStatements(
      c.env.DB,
      companyId,
      body.start_date,
      body.end_date
    );
    
    return c.json(result);
  } catch (error: any) {
    console.error('Error bulk generating statements:', error);
    return c.json({ error: error.message || 'Failed to bulk generate statements' }, 500);
  }
});

// ==================== CUSTOMER PORTAL ====================

// List portal users
app.get('/portal/users', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const users = await customerPortalService.listPortalUsers(c.env.DB, companyId);
    return c.json({ users });
  } catch (error: any) {
    console.error('Error listing portal users:', error);
    return c.json({ error: error.message || 'Failed to list portal users' }, 500);
  }
});

// Invite customer to portal
app.post('/portal/invite', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    
    const result = await customerPortalService.createPortalInvite(
      c.env.DB,
      companyId,
      body.customer_id,
      body.email
    );
    
    return c.json(result, 201);
  } catch (error: any) {
    console.error('Error creating portal invite:', error);
    return c.json({ error: error.message || 'Failed to create portal invite' }, 500);
  }
});

// Accept portal invite (public endpoint)
app.post('/portal/accept-invite', async (c) => {
  try {
    const body = await c.req.json();
    
    const result = await customerPortalService.acceptPortalInvite(
      c.env.DB,
      body.token,
      body.password
    );
    
    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }
    
    return c.json({ message: 'Portal access created', accessId: result.accessId });
  } catch (error: any) {
    console.error('Error accepting portal invite:', error);
    return c.json({ error: error.message || 'Failed to accept portal invite' }, 500);
  }
});

// Portal login (public endpoint)
app.post('/portal/login', async (c) => {
  try {
    const body = await c.req.json();
    
    const result = await customerPortalService.portalLogin(
      c.env.DB,
      body.email,
      body.password
    );
    
    if (!result.success) {
      return c.json({ error: result.error }, 401);
    }
    
    return c.json({
      token: result.token,
      expiresAt: result.expiresAt,
      customerId: result.customerId
    });
  } catch (error: any) {
    console.error('Error logging in to portal:', error);
    return c.json({ error: error.message || 'Failed to login' }, 500);
  }
});

// Portal logout
app.post('/portal/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await customerPortalService.portalLogout(c.env.DB, token);
    }
    
    return c.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Error logging out:', error);
    return c.json({ error: error.message || 'Failed to logout' }, 500);
  }
});

// Get portal data (for logged-in portal users)
app.get('/portal/data', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    
    const token = authHeader.substring(7);
    const session = await customerPortalService.validatePortalSession(c.env.DB, token);
    
    if (!session.valid || !session.customerId || !session.companyId) {
      return c.json({ error: 'Invalid session' }, 401);
    }
    
    const data = await customerPortalService.getCustomerPortalData(
      c.env.DB,
      session.companyId,
      session.customerId
    );
    
    return c.json(data);
  } catch (error: any) {
    console.error('Error getting portal data:', error);
    return c.json({ error: error.message || 'Failed to get portal data' }, 500);
  }
});

// Get invoice details (for portal users)
app.get('/portal/invoices/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    
    const token = authHeader.substring(7);
    const session = await customerPortalService.validatePortalSession(c.env.DB, token);
    
    if (!session.valid || !session.customerId || !session.companyId) {
      return c.json({ error: 'Invalid session' }, 401);
    }
    
    const invoiceId = c.req.param('id');
    const invoice = await customerPortalService.getPortalInvoiceDetails(
      c.env.DB,
      session.companyId,
      session.customerId,
      invoiceId
    );
    
    return c.json(invoice);
  } catch (error: any) {
    console.error('Error getting invoice details:', error);
    return c.json({ error: error.message || 'Failed to get invoice' }, 500);
  }
});

// Create payment link (for portal users)
app.post('/portal/invoices/:id/pay', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    
    const token = authHeader.substring(7);
    const session = await customerPortalService.validatePortalSession(c.env.DB, token);
    
    if (!session.valid || !session.customerId || !session.companyId) {
      return c.json({ error: 'Invalid session' }, 401);
    }
    
    const invoiceId = c.req.param('id');
    const result = await customerPortalService.createPortalPaymentLink(
      c.env.DB,
      session.companyId,
      session.customerId,
      invoiceId
    );
    
    return c.json(result);
  } catch (error: any) {
    console.error('Error creating payment link:', error);
    return c.json({ error: error.message || 'Failed to create payment link' }, 500);
  }
});

// Disable portal user
app.delete('/portal/users/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const accessId = c.req.param('id');
    await customerPortalService.disablePortalAccess(c.env.DB, companyId, accessId);
    
    return c.json({ message: 'Portal access disabled' });
  } catch (error: any) {
    console.error('Error disabling portal access:', error);
    return c.json({ error: error.message || 'Failed to disable portal access' }, 500);
  }
});

// ==================== BUDGETS ====================

// List budgets
app.get('/budgets', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const fiscalYear = c.req.query('fiscal_year');
    const status = c.req.query('status') as any;
    
    const budgets = await budgetService.listBudgets(c.env.DB, companyId, {
      fiscalYear: fiscalYear ? parseInt(fiscalYear) : undefined,
      status
    });
    
    return c.json({ budgets });
  } catch (error: any) {
    console.error('Error listing budgets:', error);
    return c.json({ error: error.message || 'Failed to list budgets' }, 500);
  }
});

// Create budget
app.post('/budgets', async (c) => {
  const companyId = await getSecureCompanyId(c);
  const userId = await getSecureUserId(c);
  if (!companyId || !userId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    
    const budget = await budgetService.createBudget(c.env.DB, companyId, {
      name: body.name,
      description: body.description,
      fiscal_year: body.fiscal_year,
      budget_type: body.budget_type,
      start_date: body.start_date,
      end_date: body.end_date,
      currency: body.currency,
      created_by: userId
    });
    
    return c.json(budget, 201);
  } catch (error: any) {
    console.error('Error creating budget:', error);
    return c.json({ error: error.message || 'Failed to create budget' }, 500);
  }
});

// Get budget
app.get('/budgets/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const id = c.req.param('id');
    const budget = await budgetService.getBudget(c.env.DB, companyId, id);
    
    if (!budget) {
      return c.json({ error: 'Budget not found' }, 404);
    }
    
    const lines = await budgetService.getBudgetLines(c.env.DB, id);
    
    return c.json({ budget, lines });
  } catch (error: any) {
    console.error('Error getting budget:', error);
    return c.json({ error: error.message || 'Failed to get budget' }, 500);
  }
});

// Add budget line
app.post('/budgets/:id/lines', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const budgetId = c.req.param('id');
    const body = await c.req.json();
    
    const line = await budgetService.addBudgetLine(c.env.DB, budgetId, {
      gl_account_id: body.gl_account_id,
      department_id: body.department_id,
      project_id: body.project_id,
      periods: body.periods || [],
      notes: body.notes
    });
    
    return c.json(line, 201);
  } catch (error: any) {
    console.error('Error adding budget line:', error);
    return c.json({ error: error.message || 'Failed to add budget line' }, 500);
  }
});

// Update budget line
app.put('/budgets/lines/:lineId', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const lineId = c.req.param('lineId');
    const body = await c.req.json();
    
    await budgetService.updateBudgetLine(c.env.DB, lineId, body.periods || [], body.notes);
    
    return c.json({ message: 'Budget line updated' });
  } catch (error: any) {
    console.error('Error updating budget line:', error);
    return c.json({ error: error.message || 'Failed to update budget line' }, 500);
  }
});

// Delete budget line
app.delete('/budgets/lines/:lineId', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const lineId = c.req.param('lineId');
    await budgetService.deleteBudgetLine(c.env.DB, lineId);
    
    return c.json({ message: 'Budget line deleted' });
  } catch (error: any) {
    console.error('Error deleting budget line:', error);
    return c.json({ error: error.message || 'Failed to delete budget line' }, 500);
  }
});

// Approve budget
app.post('/budgets/:id/approve', async (c) => {
  const companyId = await getSecureCompanyId(c);
  const userId = await getSecureUserId(c);
  if (!companyId || !userId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const budgetId = c.req.param('id');
    await budgetService.approveBudget(c.env.DB, companyId, budgetId, userId);
    
    return c.json({ message: 'Budget approved' });
  } catch (error: any) {
    console.error('Error approving budget:', error);
    return c.json({ error: error.message || 'Failed to approve budget' }, 500);
  }
});

// Activate budget
app.post('/budgets/:id/activate', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const budgetId = c.req.param('id');
    await budgetService.activateBudget(c.env.DB, companyId, budgetId);
    
    return c.json({ message: 'Budget activated' });
  } catch (error: any) {
    console.error('Error activating budget:', error);
    return c.json({ error: error.message || 'Failed to activate budget' }, 500);
  }
});

// Get budget vs actual report
app.get('/budgets/:id/vs-actual', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const budgetId = c.req.param('id');
    const period = c.req.query('period');
    const departmentId = c.req.query('department_id');
    
    const report = await budgetService.getBudgetVsActual(c.env.DB, companyId, budgetId, {
      period: period ? parseInt(period) : undefined,
      departmentId
    });
    
    return c.json(report);
  } catch (error: any) {
    console.error('Error getting budget vs actual:', error);
    return c.json({ error: error.message || 'Failed to get budget vs actual' }, 500);
  }
});

// Copy budget
app.post('/budgets/:id/copy', async (c) => {
  const companyId = await getSecureCompanyId(c);
  const userId = await getSecureUserId(c);
  if (!companyId || !userId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const budgetId = c.req.param('id');
    const body = await c.req.json();
    
    const newBudget = await budgetService.copyBudget(
      c.env.DB,
      companyId,
      budgetId,
      body.new_fiscal_year,
      body.adjustment_percent || 0,
      userId
    );
    
    return c.json(newBudget, 201);
  } catch (error: any) {
    console.error('Error copying budget:', error);
    return c.json({ error: error.message || 'Failed to copy budget' }, 500);
  }
});

// Get budget variance alerts
app.get('/budgets/alerts', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const threshold = c.req.query('threshold');
    const alerts = await budgetService.getBudgetVarianceAlerts(
      c.env.DB,
      companyId,
      threshold ? parseFloat(threshold) : 10
    );
    
    return c.json({ alerts });
  } catch (error: any) {
    console.error('Error getting budget alerts:', error);
    return c.json({ error: error.message || 'Failed to get budget alerts' }, 500);
  }
});

// ==================== BANK FEEDS ====================

// List bank connections
app.get('/bank-feeds/connections', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const connections = await bankFeedsService.listBankConnections(c.env.DB, companyId);
    return c.json({ connections });
  } catch (error: any) {
    console.error('Error listing bank connections:', error);
    return c.json({ error: error.message || 'Failed to list bank connections' }, 500);
  }
});

// Create Plaid link token
app.post('/bank-feeds/link-token', async (c) => {
  const companyId = await getSecureCompanyId(c);
  const userId = await getSecureUserId(c);
  if (!companyId || !userId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    if (!c.env.PLAID_CLIENT_ID || !c.env.PLAID_SECRET) {
      return c.json({ error: 'Plaid not configured' }, 400);
    }
    
    const result = await bankFeedsService.createPlaidLinkToken(
      c.env.DB,
      companyId,
      userId,
      {
        client_id: c.env.PLAID_CLIENT_ID,
        secret: c.env.PLAID_SECRET,
        environment: c.env.PLAID_ENV || 'sandbox'
      }
    );
    
    return c.json(result);
  } catch (error: any) {
    console.error('Error creating link token:', error);
    return c.json({ error: error.message || 'Failed to create link token' }, 500);
  }
});

// Exchange Plaid public token
app.post('/bank-feeds/exchange-token', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    
    if (!c.env.PLAID_CLIENT_ID || !c.env.PLAID_SECRET) {
      return c.json({ error: 'Plaid not configured' }, 400);
    }
    
    const connection = await bankFeedsService.exchangePlaidPublicToken(
      c.env.DB,
      companyId,
      body.bank_account_id,
      body.public_token,
      {
        client_id: c.env.PLAID_CLIENT_ID,
        secret: c.env.PLAID_SECRET,
        environment: c.env.PLAID_ENV || 'sandbox'
      }
    );
    
    return c.json(connection, 201);
  } catch (error: any) {
    console.error('Error exchanging token:', error);
    return c.json({ error: error.message || 'Failed to exchange token' }, 500);
  }
});

// Sync transactions for a connection
app.post('/bank-feeds/connections/:id/sync', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const connectionId = c.req.param('id');
    const body = await c.req.json();
    
    if (!c.env.PLAID_CLIENT_ID || !c.env.PLAID_SECRET) {
      return c.json({ error: 'Plaid not configured' }, 400);
    }
    
    const result = await bankFeedsService.syncPlaidTransactions(
      c.env.DB,
      connectionId,
      {
        client_id: c.env.PLAID_CLIENT_ID,
        secret: c.env.PLAID_SECRET,
        environment: c.env.PLAID_ENV || 'sandbox'
      },
      body.start_date,
      body.end_date
    );
    
    return c.json(result);
  } catch (error: any) {
    console.error('Error syncing transactions:', error);
    return c.json({ error: error.message || 'Failed to sync transactions' }, 500);
  }
});

// Get unmatched transactions
app.get('/bank-feeds/transactions/unmatched', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const bankAccountId = c.req.query('bank_account_id');
    const transactions = await bankFeedsService.getUnmatchedTransactions(
      c.env.DB,
      companyId,
      bankAccountId
    );
    
    return c.json({ transactions });
  } catch (error: any) {
    console.error('Error getting unmatched transactions:', error);
    return c.json({ error: error.message || 'Failed to get transactions' }, 500);
  }
});

// Match transaction
app.post('/bank-feeds/transactions/:id/match', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const transactionId = c.req.param('id');
    const body = await c.req.json();
    
    await bankFeedsService.matchTransaction(
      c.env.DB,
      transactionId,
      body.matched_to_type,
      body.matched_to_id
    );
    
    return c.json({ message: 'Transaction matched' });
  } catch (error: any) {
    console.error('Error matching transaction:', error);
    return c.json({ error: error.message || 'Failed to match transaction' }, 500);
  }
});

// Auto-match transactions
app.post('/bank-feeds/auto-match', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json().catch(() => ({}));
    const bankAccountId = body.bank_account_id;
    
    if (!bankAccountId) {
      return c.json({ error: 'bank_account_id is required' }, 400);
    }
    
    const result = await bankFeedsService.autoMatchTransactions(c.env.DB, companyId, bankAccountId);
    return c.json(result);
  } catch (error: any) {
    console.error('Error auto-matching transactions:', error);
    return c.json({ error: error.message || 'Failed to auto-match' }, 500);
  }
});

// Disconnect bank
app.delete('/bank-feeds/connections/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const connectionId = c.req.param('id');
    const config = c.env.PLAID_CLIENT_ID && c.env.PLAID_SECRET ? {
      client_id: c.env.PLAID_CLIENT_ID,
      secret: c.env.PLAID_SECRET,
      environment: c.env.PLAID_ENV || 'sandbox'
    } : undefined;
    
    await bankFeedsService.disconnectBank(c.env.DB, companyId, connectionId, config);
    
    return c.json({ message: 'Bank disconnected' });
  } catch (error: any) {
    console.error('Error disconnecting bank:', error);
    return c.json({ error: error.message || 'Failed to disconnect bank' }, 500);
  }
});

// Get bank balance
app.get('/bank-feeds/connections/:id/balance', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const connectionId = c.req.param('id');
    
    if (!c.env.PLAID_CLIENT_ID || !c.env.PLAID_SECRET) {
      return c.json({ error: 'Plaid not configured' }, 400);
    }
    
    const balance = await bankFeedsService.getPlaidBalance(
      c.env.DB,
      connectionId,
      {
        client_id: c.env.PLAID_CLIENT_ID,
        secret: c.env.PLAID_SECRET,
        environment: c.env.PLAID_ENV || 'sandbox'
      }
    );
    
    return c.json(balance);
  } catch (error: any) {
    console.error('Error getting balance:', error);
    return c.json({ error: error.message || 'Failed to get balance' }, 500);
  }
});

// Plaid webhook
app.post('/bank-feeds/webhook', async (c) => {
  try {
    const body = await c.req.json();
    
    if (!c.env.PLAID_CLIENT_ID || !c.env.PLAID_SECRET) {
      return c.json({ error: 'Plaid not configured' }, 400);
    }
    
    await bankFeedsService.processPlaidWebhook(
      c.env.DB,
      body.webhook_type,
      body.webhook_code,
      body.item_id,
      {
        client_id: c.env.PLAID_CLIENT_ID,
        secret: c.env.PLAID_SECRET,
        environment: c.env.PLAID_ENV || 'sandbox'
      }
    );
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return c.json({ error: error.message || 'Failed to process webhook' }, 500);
  }
});

// Sync all connections (called by cron)
app.post('/bank-feeds/sync-all', async (c) => {
  try {
    if (!c.env.PLAID_CLIENT_ID || !c.env.PLAID_SECRET) {
      return c.json({ error: 'Plaid not configured' }, 400);
    }
    
    const result = await bankFeedsService.syncAllConnections(
      c.env.DB,
      {
        client_id: c.env.PLAID_CLIENT_ID,
        secret: c.env.PLAID_SECRET,
        environment: c.env.PLAID_ENV || 'sandbox'
      }
    );
    
    return c.json(result);
  } catch (error: any) {
    console.error('Error syncing all connections:', error);
    return c.json({ error: error.message || 'Failed to sync connections' }, 500);
  }
});

export default app;
