/**
 * Admin Configuration Routes
 * 
 * API endpoints for:
 * - Chart of Accounts management
 * - Invoice Template Designer
 * - Lock Dates configuration
 * - Payment Terms management
 * - Tax Rates management
 * - Email Template customization
 * - Tracking Categories (dimensions)
 */

import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';
import * as AdminConfigService from '../services/admin-config-service';

type Bindings = {
  DB: D1Database;
};

const adminConfigRoutes = new Hono<{ Bindings: Bindings }>();

// ==================== CHART OF ACCOUNTS ====================

adminConfigRoutes.get('/chart-of-accounts', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const accountType = c.req.query('account_type');
    const isActive = c.req.query('is_active');
    const parentId = c.req.query('parent_id');

    const accounts = await AdminConfigService.listChartOfAccounts(c.env.DB, companyId, {
      accountType: accountType || undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      parentId: parentId || undefined
    });

    return c.json({ success: true, data: accounts });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.get('/chart-of-accounts/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const accountId = c.req.param('id');

    const account = await AdminConfigService.getChartOfAccount(c.env.DB, companyId, accountId);
    if (!account) {
      return c.json({ success: false, error: 'Account not found' }, 404);
    }

    return c.json({ success: true, data: account });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.post('/chart-of-accounts', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const body = await c.req.json();

    const id = await AdminConfigService.createChartOfAccount(c.env.DB, companyId, body);

    return c.json({ success: true, data: { id } }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.put('/chart-of-accounts/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const accountId = c.req.param('id');
    const body = await c.req.json();

    await AdminConfigService.updateChartOfAccount(c.env.DB, companyId, accountId, body);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.delete('/chart-of-accounts/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const accountId = c.req.param('id');

    await AdminConfigService.deleteChartOfAccount(c.env.DB, companyId, accountId);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== INVOICE TEMPLATES ====================

adminConfigRoutes.get('/invoice-templates', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const templateType = c.req.query('template_type');

    const templates = await AdminConfigService.listInvoiceTemplates(c.env.DB, companyId, templateType || undefined);

    return c.json({ success: true, data: templates });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.get('/invoice-templates/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const templateId = c.req.param('id');

    const template = await AdminConfigService.getInvoiceTemplate(c.env.DB, companyId, templateId);
    if (!template) {
      return c.json({ success: false, error: 'Template not found' }, 404);
    }

    return c.json({ success: true, data: template });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.post('/invoice-templates', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const body = await c.req.json();

    const id = await AdminConfigService.createInvoiceTemplate(c.env.DB, companyId, body);

    return c.json({ success: true, data: { id } }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.put('/invoice-templates/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const templateId = c.req.param('id');
    const body = await c.req.json();

    await AdminConfigService.updateInvoiceTemplate(c.env.DB, companyId, templateId, body);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.delete('/invoice-templates/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const templateId = c.req.param('id');

    await AdminConfigService.deleteInvoiceTemplate(c.env.DB, companyId, templateId);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== FINANCIAL SETTINGS & LOCK DATES ====================

adminConfigRoutes.get('/financial-settings', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';

    const settings = await AdminConfigService.getFinancialSettings(c.env.DB, companyId);

    return c.json({ success: true, data: settings || {} });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.put('/financial-settings', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const body = await c.req.json();

    await AdminConfigService.updateFinancialSettings(c.env.DB, companyId, body);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.post('/check-lock-date', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const body = await c.req.json();

    const result = await AdminConfigService.checkLockDate(
      c.env.DB,
      companyId,
      body.transaction_date,
      body.is_admin || false
    );

    return c.json({ success: true, data: result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== PAYMENT TERMS ====================

adminConfigRoutes.get('/payment-terms', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const activeOnly = c.req.query('active_only') !== 'false';

    const terms = await AdminConfigService.listPaymentTerms(c.env.DB, companyId, activeOnly);

    return c.json({ success: true, data: terms });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.get('/payment-terms/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const termId = c.req.param('id');

    const term = await AdminConfigService.getPaymentTerm(c.env.DB, companyId, termId);
    if (!term) {
      return c.json({ success: false, error: 'Payment term not found' }, 404);
    }

    return c.json({ success: true, data: term });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.post('/payment-terms', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const body = await c.req.json();

    const id = await AdminConfigService.createPaymentTerm(c.env.DB, companyId, body);

    return c.json({ success: true, data: { id } }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.put('/payment-terms/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const termId = c.req.param('id');
    const body = await c.req.json();

    await AdminConfigService.updatePaymentTerm(c.env.DB, companyId, termId, body);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.delete('/payment-terms/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const termId = c.req.param('id');

    await AdminConfigService.deletePaymentTerm(c.env.DB, companyId, termId);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.post('/payment-terms/calculate-due-date', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const body = await c.req.json();

    const term = await AdminConfigService.getPaymentTerm(c.env.DB, companyId, body.term_id);
    if (!term) {
      return c.json({ success: false, error: 'Payment term not found' }, 404);
    }

    const dueDate = AdminConfigService.calculateDueDate(term, new Date(body.invoice_date));

    return c.json({ success: true, data: { due_date: dueDate.toISOString().split('T')[0] } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== TAX RATES ====================

adminConfigRoutes.get('/tax-rates', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const taxType = c.req.query('tax_type');
    const appliesTo = c.req.query('applies_to');
    const activeOnly = c.req.query('active_only') !== 'false';

    const rates = await AdminConfigService.listTaxRates(c.env.DB, companyId, {
      taxType: taxType || undefined,
      appliesTo: appliesTo || undefined,
      activeOnly
    });

    return c.json({ success: true, data: rates });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.get('/tax-rates/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const taxRateId = c.req.param('id');

    const rate = await AdminConfigService.getTaxRate(c.env.DB, companyId, taxRateId);
    if (!rate) {
      return c.json({ success: false, error: 'Tax rate not found' }, 404);
    }

    return c.json({ success: true, data: rate });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.post('/tax-rates', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const body = await c.req.json();

    const id = await AdminConfigService.createTaxRate(c.env.DB, companyId, body);

    return c.json({ success: true, data: { id } }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.put('/tax-rates/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const taxRateId = c.req.param('id');
    const body = await c.req.json();

    await AdminConfigService.updateTaxRate(c.env.DB, companyId, taxRateId, body);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.delete('/tax-rates/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const taxRateId = c.req.param('id');

    await AdminConfigService.deleteTaxRate(c.env.DB, companyId, taxRateId);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== EMAIL TEMPLATES ====================

adminConfigRoutes.get('/email-templates', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const templateType = c.req.query('template_type');

    const templates = await AdminConfigService.listEmailTemplates(c.env.DB, companyId, templateType || undefined);

    return c.json({ success: true, data: templates });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.get('/email-templates/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const templateId = c.req.param('id');

    const template = await AdminConfigService.getEmailTemplate(c.env.DB, companyId, templateId);
    if (!template) {
      return c.json({ success: false, error: 'Email template not found' }, 404);
    }

    return c.json({ success: true, data: template });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.post('/email-templates', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const body = await c.req.json();

    const id = await AdminConfigService.createEmailTemplate(c.env.DB, companyId, body);

    return c.json({ success: true, data: { id } }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.put('/email-templates/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const templateId = c.req.param('id');
    const body = await c.req.json();

    await AdminConfigService.updateEmailTemplate(c.env.DB, companyId, templateId, body);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.delete('/email-templates/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const templateId = c.req.param('id');

    await AdminConfigService.deleteEmailTemplate(c.env.DB, companyId, templateId);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.post('/email-templates/:id/preview', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const templateId = c.req.param('id');
    const body = await c.req.json();

    const template = await AdminConfigService.getEmailTemplate(c.env.DB, companyId, templateId);
    if (!template) {
      return c.json({ success: false, error: 'Email template not found' }, 404);
    }

    const rendered = AdminConfigService.renderEmailTemplate(template, body.variables || {});

    return c.json({ success: true, data: rendered });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== TRACKING CATEGORIES ====================

adminConfigRoutes.get('/tracking-categories', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const includeOptions = c.req.query('include_options') !== 'false';

    const categories = await AdminConfigService.listTrackingCategories(c.env.DB, companyId, includeOptions);

    return c.json({ success: true, data: categories });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.get('/tracking-categories/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const categoryId = c.req.param('id');

    const category = await AdminConfigService.getTrackingCategory(c.env.DB, companyId, categoryId);
    if (!category) {
      return c.json({ success: false, error: 'Tracking category not found' }, 404);
    }

    return c.json({ success: true, data: category });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.post('/tracking-categories', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const body = await c.req.json();

    const id = await AdminConfigService.createTrackingCategory(c.env.DB, companyId, body);

    return c.json({ success: true, data: { id } }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.put('/tracking-categories/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const categoryId = c.req.param('id');
    const body = await c.req.json();

    await AdminConfigService.updateTrackingCategory(c.env.DB, companyId, categoryId, body);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.delete('/tracking-categories/:id', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'demo-company';
    const categoryId = c.req.param('id');

    await AdminConfigService.deleteTrackingCategory(c.env.DB, companyId, categoryId);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.post('/tracking-categories/:id/options', async (c) => {
  try {
    const categoryId = c.req.param('id');
    const body = await c.req.json();

    const id = await AdminConfigService.addTrackingCategoryOption(c.env.DB, categoryId, body);

    return c.json({ success: true, data: { id } }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.put('/tracking-categories/:categoryId/options/:optionId', async (c) => {
  try {
    const optionId = c.req.param('optionId');
    const body = await c.req.json();

    await AdminConfigService.updateTrackingCategoryOption(c.env.DB, optionId, body);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

adminConfigRoutes.delete('/tracking-categories/:categoryId/options/:optionId', async (c) => {
  try {
    const optionId = c.req.param('optionId');

    await AdminConfigService.deleteTrackingCategoryOption(c.env.DB, optionId);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default adminConfigRoutes;
