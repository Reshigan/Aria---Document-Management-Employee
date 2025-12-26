/**
 * Enterprise Routes
 * 
 * Exposes world-class SaaS ERP features:
 * - API Keys management
 * - Webhooks management
 * - Audit logs
 * - Subscription & usage metering
 * - Report builder
 * - Multi-currency
 * - Inventory valuation
 * - Three-way match
 */

import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';

// Import services
import * as auditService from '../services/audit-service';
import * as apiKeysService from '../services/api-keys-service';
import * as webhookService from '../services/webhook-service';
import * as reportBuilderService from '../services/report-builder-service';
import * as subscriptionService from '../services/subscription-service';
import * as multiCurrencyService from '../services/multi-currency-service';
import * as inventoryValuationService from '../services/inventory-valuation-service';
import * as threeWayMatchService from '../services/three-way-match-service';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// ============================================
// API KEYS ROUTES
// ============================================

// List API keys
app.get('/api-keys', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const keys = await apiKeysService.listApiKeys(c.env.DB, companyId);
    return c.json({ success: true, data: keys });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create API key
app.post('/api-keys', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const userId = await getSecureUserId(c);
    const body = await c.req.json();
    
    const { key, keyData } = await apiKeysService.createApiKey(
      c.env.DB, companyId, userId,
      body.name, body.scopes || ['read'], body.rate_limit || 100, body.expires_in_days
    );
    
    return c.json({ success: true, data: { ...keyData, key } }, 201);
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Revoke API key
app.delete('/api-keys/:keyId', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const userId = await getSecureUserId(c);
    const keyId = c.req.param('keyId');
    
    const success = await apiKeysService.revokeApiKey(c.env.DB, companyId, keyId, userId);
    return c.json({ success });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get API key usage stats
app.get('/api-keys/stats', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const keyId = c.req.query('key_id') || null;
    const days = parseInt(c.req.query('days') || '30');
    
    const stats = await apiKeysService.getApiKeyUsageStats(c.env.DB, companyId, keyId, days);
    return c.json({ success: true, data: stats });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================
// WEBHOOKS ROUTES
// ============================================

// List webhooks
app.get('/webhooks', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const webhooks = await webhookService.listWebhooks(c.env.DB, companyId);
    return c.json({ success: true, data: webhooks });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create webhook
app.post('/webhooks', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const userId = await getSecureUserId(c);
    const body = await c.req.json();
    
    const webhook = await webhookService.createWebhook(
      c.env.DB, companyId, userId, body.name, body.url, body.events
    );
    
    return c.json({ success: true, data: webhook }, 201);
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update webhook
app.put('/webhooks/:webhookId', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const webhookId = c.req.param('webhookId');
    const body = await c.req.json();
    
    const success = await webhookService.updateWebhook(c.env.DB, companyId, webhookId, body);
    return c.json({ success });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete webhook
app.delete('/webhooks/:webhookId', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const webhookId = c.req.param('webhookId');
    
    const success = await webhookService.deleteWebhook(c.env.DB, companyId, webhookId);
    return c.json({ success });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Regenerate webhook secret
app.post('/webhooks/:webhookId/regenerate-secret', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const webhookId = c.req.param('webhookId');
    
    const secret = await webhookService.regenerateSecret(c.env.DB, companyId, webhookId);
    return c.json({ success: !!secret, data: { secret } });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get webhook delivery history
app.get('/webhooks/deliveries', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const webhookId = c.req.query('webhook_id') || null;
    const limit = parseInt(c.req.query('limit') || '50');
    
    const deliveries = await webhookService.getDeliveryHistory(c.env.DB, companyId, webhookId, limit);
    return c.json({ success: true, data: deliveries });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get webhook stats
app.get('/webhooks/stats', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const days = parseInt(c.req.query('days') || '30');
    
    const stats = await webhookService.getWebhookStats(c.env.DB, companyId, days);
    return c.json({ success: true, data: stats });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================
// AUDIT LOGS ROUTES
// ============================================

// Query audit logs
app.get('/audit-logs', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const filters = {
      eventType: c.req.query('event_type') as any,
      resourceType: c.req.query('resource_type'),
      resourceId: c.req.query('resource_id'),
      userId: c.req.query('user_id'),
      action: c.req.query('action'),
      startDate: c.req.query('start_date'),
      endDate: c.req.query('end_date'),
      correlationId: c.req.query('correlation_id'),
    };
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('page_size') || '50');
    
    const result = await auditService.queryAuditLogs(c.env.DB, companyId, filters, { page, pageSize });
    return c.json({ success: true, ...result });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get audit trail for a resource
app.get('/audit-logs/resource/:resourceType/:resourceId', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const resourceType = c.req.param('resourceType');
    const resourceId = c.req.param('resourceId');
    
    const logs = await auditService.getResourceAuditTrail(c.env.DB, companyId, resourceType, resourceId);
    return c.json({ success: true, data: logs });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================
// SUBSCRIPTION & USAGE ROUTES
// ============================================

// Get available plans
app.get('/subscription/plans', async (c) => {
  try {
    const plans = await subscriptionService.getPlans(c.env.DB);
    return c.json({ success: true, data: plans });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get current subscription
app.get('/subscription', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const subscription = await subscriptionService.getSubscription(c.env.DB, companyId);
    return c.json({ success: true, data: subscription });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get current usage
app.get('/subscription/usage', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const usage = await subscriptionService.getCurrentUsage(c.env.DB, companyId);
    return c.json({ success: true, data: usage });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get usage history
app.get('/subscription/usage/history', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const months = parseInt(c.req.query('months') || '6');
    
    const history = await subscriptionService.getUsageHistory(c.env.DB, companyId, months);
    return c.json({ success: true, data: history });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Check feature access
app.get('/subscription/features/:feature', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const feature = c.req.param('feature') as any;
    
    const hasAccess = await subscriptionService.hasFeature(c.env.DB, companyId, feature);
    return c.json({ success: true, data: { feature, has_access: hasAccess } });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Check limit
app.get('/subscription/limits/:limit', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const limit = c.req.param('limit') as any;
    
    const check = await subscriptionService.checkLimit(c.env.DB, companyId, limit);
    return c.json({ success: true, data: check });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Export company data (GDPR)
app.get('/subscription/export-data', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const data = await subscriptionService.exportCompanyData(c.env.DB, companyId);
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================
// REPORT BUILDER ROUTES
// ============================================

// Get report templates
app.get('/reports/templates', async (c) => {
  try {
    const templates = reportBuilderService.getReportTemplates();
    return c.json({ success: true, data: templates });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// List saved reports
app.get('/reports', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const userId = await getSecureUserId(c);
    
    const reports = await reportBuilderService.listReports(c.env.DB, companyId, userId);
    return c.json({ success: true, data: reports });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create report from template
app.post('/reports/from-template/:templateId', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const userId = await getSecureUserId(c);
    const templateId = c.req.param('templateId');
    
    const report = await reportBuilderService.createFromTemplate(c.env.DB, companyId, userId, templateId);
    return c.json({ success: true, data: report }, 201);
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Execute report
app.post('/reports/:reportId/execute', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const reportId = c.req.param('reportId');
    const body = await c.req.json().catch(() => ({}));
    
    const result = await reportBuilderService.executeReport(
      c.env.DB, companyId, reportId,
      body.filters || [],
      { page: body.page || 1, pageSize: body.page_size || 100 }
    );
    return c.json({ success: true, ...result });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Export report to CSV
app.get('/reports/:reportId/export/csv', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const reportId = c.req.param('reportId');
    
    const result = await reportBuilderService.executeReport(c.env.DB, companyId, reportId, [], { page: 1, pageSize: 10000 });
    const csv = reportBuilderService.exportToCsv(result.data, result.columns);
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="report-${reportId}.csv"`,
      },
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// List scheduled reports
app.get('/reports/scheduled', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const scheduled = await reportBuilderService.listScheduledReports(c.env.DB, companyId);
    return c.json({ success: true, data: scheduled });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Schedule a report
app.post('/reports/:reportId/schedule', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const userId = await getSecureUserId(c);
    const reportId = c.req.param('reportId');
    const body = await c.req.json();
    
    const scheduled = await reportBuilderService.scheduleReport(
      c.env.DB, companyId, userId, reportId,
      body.name, body.schedule, body.format || 'csv', body.recipients
    );
    return c.json({ success: true, data: scheduled }, 201);
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================
// MULTI-CURRENCY ROUTES
// ============================================

// Get available currencies
app.get('/currencies', async (c) => {
  try {
    const currencies = multiCurrencyService.getCurrencies();
    return c.json({ success: true, data: currencies });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// List exchange rates
app.get('/exchange-rates', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const fromDate = c.req.query('from_date');
    const toDate = c.req.query('to_date');
    
    const rates = await multiCurrencyService.listExchangeRates(c.env.DB, companyId, fromDate, toDate);
    return c.json({ success: true, data: rates });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Set exchange rate
app.post('/exchange-rates', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const body = await c.req.json();
    
    const rate = await multiCurrencyService.setExchangeRate(
      c.env.DB, companyId,
      body.from_currency, body.to_currency, body.rate,
      body.rate_type || 'spot', body.effective_date, body.source || 'manual'
    );
    return c.json({ success: true, data: rate }, 201);
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Convert currency
app.post('/currencies/convert', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const body = await c.req.json();
    
    const result = await multiCurrencyService.convertCurrency(
      c.env.DB, companyId,
      body.amount, body.from_currency, body.to_currency, body.date
    );
    
    if (!result) {
      return c.json({ success: false, error: 'Exchange rate not found' }, 404);
    }
    
    return c.json({ success: true, data: result });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Perform period-end revaluation
app.post('/currencies/revaluation', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const userId = await getSecureUserId(c);
    const body = await c.req.json();
    
    const revaluations = await multiCurrencyService.performRevaluation(
      c.env.DB, companyId, body.period_end_date, body.base_currency, userId
    );
    return c.json({ success: true, data: revaluations });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get unrealized gain/loss summary
app.get('/currencies/unrealized-gain-loss', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const baseCurrency = c.req.query('base_currency') || 'USD';
    const asOfDate = c.req.query('as_of_date');
    
    const summary = await multiCurrencyService.getUnrealizedGainLossSummary(
      c.env.DB, companyId, baseCurrency, asOfDate
    );
    return c.json({ success: true, data: summary });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================
// INVENTORY VALUATION ROUTES
// ============================================

// Get inventory valuation report
app.get('/inventory/valuation', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const warehouseId = c.req.query('warehouse_id');
    const asOfDate = c.req.query('as_of_date');
    
    const valuation = await inventoryValuationService.getInventoryValuation(
      c.env.DB, companyId, warehouseId, asOfDate
    );
    return c.json({ success: true, data: valuation });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get FIFO layers for a product
app.get('/inventory/products/:productId/layers', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const productId = c.req.param('productId');
    
    const layers = await inventoryValuationService.getFifoLayers(c.env.DB, companyId, productId);
    return c.json({ success: true, data: layers });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get inventory movement history
app.get('/inventory/movements', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const productId = c.req.query('product_id');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    const limit = parseInt(c.req.query('limit') || '100');
    
    const movements = await inventoryValuationService.getMovementHistory(
      c.env.DB, companyId, productId, startDate, endDate, limit
    );
    return c.json({ success: true, data: movements });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Calculate COGS
app.get('/inventory/cogs', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const startDate = c.req.query('start_date') || new Date(new Date().getFullYear(), 0, 1).toISOString();
    const endDate = c.req.query('end_date') || new Date().toISOString();
    
    const cogs = await inventoryValuationService.calculateCOGS(c.env.DB, companyId, startDate, endDate);
    return c.json({ success: true, data: cogs });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Record inventory adjustment
app.post('/inventory/adjustments', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const userId = await getSecureUserId(c);
    const body = await c.req.json();
    
    await inventoryValuationService.recordAdjustment(
      c.env.DB, companyId, body.product_id, body.quantity_change,
      body.reason, body.warehouse_id || null, userId
    );
    return c.json({ success: true, message: 'Adjustment recorded' }, 201);
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================
// THREE-WAY MATCH ROUTES
// ============================================

// Get matching configuration
app.get('/matching/config', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const config = await threeWayMatchService.getMatchingConfig(c.env.DB, companyId);
    return c.json({ success: true, data: config });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update matching configuration
app.put('/matching/config', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const body = await c.req.json();
    
    const config = await threeWayMatchService.updateMatchingConfig(c.env.DB, companyId, body);
    return c.json({ success: true, data: config });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Perform match for a supplier invoice
app.post('/matching/invoices/:invoiceId/match', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const userId = await getSecureUserId(c);
    const invoiceId = c.req.param('invoiceId');
    
    const result = await threeWayMatchService.performMatch(c.env.DB, companyId, invoiceId, userId);
    return c.json({ success: true, data: result });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get match results
app.get('/matching/results', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const filters = {
      status: c.req.query('status') as any,
      supplierId: c.req.query('supplier_id'),
      startDate: c.req.query('start_date'),
      endDate: c.req.query('end_date'),
    };
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('page_size') || '50');
    
    const result = await threeWayMatchService.getMatchResults(
      c.env.DB, companyId, filters, { page, pageSize }
    );
    return c.json({ success: true, ...result });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get match details
app.get('/matching/results/:matchId', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const matchId = c.req.param('matchId');
    
    const details = await threeWayMatchService.getMatchDetails(c.env.DB, companyId, matchId);
    if (!details) {
      return c.json({ success: false, error: 'Match not found' }, 404);
    }
    return c.json({ success: true, data: details });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Approve match exception
app.post('/matching/results/:matchId/approve', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const userId = await getSecureUserId(c);
    const matchId = c.req.param('matchId');
    const body = await c.req.json().catch(() => ({}));
    
    const success = await threeWayMatchService.approveMatch(
      c.env.DB, companyId, matchId, userId, body.comments
    );
    return c.json({ success });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Reject match
app.post('/matching/results/:matchId/reject', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const userId = await getSecureUserId(c);
    const matchId = c.req.param('matchId');
    const body = await c.req.json();
    
    const success = await threeWayMatchService.rejectMatch(
      c.env.DB, companyId, matchId, userId, body.reason
    );
    return c.json({ success });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get matching statistics
app.get('/matching/stats', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const days = parseInt(c.req.query('days') || '30');
    
    const stats = await threeWayMatchService.getMatchingStats(c.env.DB, companyId, days);
    return c.json({ success: true, data: stats });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default app;
