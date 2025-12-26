// Critical Features API Routes - Token Vault, Connectors, Bank, Tax, SSO, etc.

import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';

// Import all services
import * as tokenVault from '../services/token-vault-service';
import * as connector from '../services/connector-service';
import * as bank from '../services/bank-service';
import * as tax from '../services/tax-service';
import * as sso from '../services/sso-service';
import * as accountingSync from '../services/accounting-sync-service';
import * as ecommerce from '../services/ecommerce-service';
import * as shipping from '../services/shipping-service';
import * as fixedAssets from '../services/fixed-assets-service';
import * as payroll from '../services/payroll-service';
import * as einvoice from '../services/einvoice-service';
import * as mrp from '../services/mrp-service';
import * as monitoring from '../services/monitoring-service';
import * as admin from '../services/admin-service';
import * as backup from '../services/backup-service';

type Bindings = {
  DB: D1Database;
  TOKEN_ENCRYPTION_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Helper to get company ID from JWT
function getCompanyId(c: { req: { header: (name: string) => string | undefined }; get: (key: string) => unknown }): string {
  // First try JWT payload
  const jwtPayload = c.get('jwtPayload') as { company_id?: string } | undefined;
  if (jwtPayload?.company_id) return jwtPayload.company_id;
  
  // Fallback to header (for backwards compatibility)
  return c.req.header('X-Company-ID') || 'default';
}

// ============================================
// Token Vault Routes
// ============================================

app.post('/tokens', async (c) => {
  const db = c.env.DB;
  const secret = c.env.TOKEN_ENCRYPTION_SECRET || 'default-secret-change-me';
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const token = await tokenVault.storeToken(db, {
    company_id: companyId,
    provider: body.provider,
    token_type: body.token_type,
    value: body.access_token,
    scopes: body.scopes,
    expires_at: body.expires_at,
    metadata: body.metadata
  }, secret);
  
  return c.json(token);
});

app.get('/tokens', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const tokens = await tokenVault.listTokens(db, companyId);
  return c.json({ data: tokens });
});

app.get('/tokens/:provider', async (c) => {
  const db = c.env.DB;
  const secret = c.env.TOKEN_ENCRYPTION_SECRET || 'default-secret-change-me';
  const companyId = getCompanyId(c);
  const provider = c.req.param('provider');
  const tokenType = (c.req.query('token_type') || 'access') as 'access' | 'refresh' | 'api_key';
  
  const token = await tokenVault.getTokenByProvider(db, companyId, provider, tokenType, secret);
  if (!token) {
    return c.json({ error: 'Token not found' }, 404);
  }
  
  return c.json(token);
});

app.delete('/tokens/:id', async (c) => {
  const db = c.env.DB;
  const tokenId = c.req.param('id');
  
  await tokenVault.revokeToken(db, tokenId);
  return c.json({ success: true });
});

// ============================================
// Connector Routes
// ============================================

app.post('/connectors', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const conn = await connector.createConnector(db, {
    company_id: companyId,
    connector_type: body.connector_type,
    provider: body.provider,
    name: body.name,
    config: body.config
  });
  
  return c.json(conn);
});

app.get('/connectors', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const connectorType = c.req.query('type') as 'bank' | 'accounting' | 'ecommerce' | 'shipping' | 'social' | 'payment' | undefined;
  
  const connectors = await connector.listConnectors(db, companyId, connectorType);
  return c.json({ data: connectors });
});

app.get('/connectors/:id', async (c) => {
  const db = c.env.DB;
  const connectorId = c.req.param('id');
  
  const conn = await connector.getConnector(db, connectorId);
  if (!conn) {
    return c.json({ error: 'Connector not found' }, 404);
  }
  
  return c.json(conn);
});

app.post('/connectors/:id/sync', async (c) => {
  const db = c.env.DB;
  const connectorId = c.req.param('id');
  
  const job = await connector.triggerSync(db, connectorId);
  return c.json(job);
});

app.get('/jobs', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const stats = await connector.getJobStats(db, companyId);
  return c.json(stats);
});

// ============================================
// Bank Routes
// ============================================

app.post('/bank-accounts', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const account = await bank.createBankAccount(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(account);
});

app.get('/bank-accounts', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const accounts = await bank.listBankAccounts(db, companyId);
  return c.json({ data: accounts });
});

app.get('/bank-accounts/:id', async (c) => {
  const db = c.env.DB;
  const accountId = c.req.param('id');
  
  const account = await bank.getBankAccount(db, accountId);
  if (!account) {
    return c.json({ error: 'Bank account not found' }, 404);
  }
  
  return c.json(account);
});

app.post('/bank-accounts/:id/import', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const accountId = c.req.param('id');
  const body = await c.req.json();
  
  const result = await bank.importTransactions(db, companyId, accountId, body.transactions);
  return c.json(result);
});

app.post('/bank-accounts/:id/auto-match', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const accountId = c.req.param('id');
  
  const result = await bank.autoMatchTransactions(db, companyId, accountId);
  return c.json(result);
});

app.get('/bank-accounts/:id/unmatched', async (c) => {
  const db = c.env.DB;
  const accountId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '100');
  
  const transactions = await bank.getUnmatchedTransactions(db, accountId, limit);
  return c.json({ data: transactions });
});

app.post('/bank-reconciliations', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const reconciliation = await bank.createReconciliation(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(reconciliation);
});

// ============================================
// Tax Routes
// ============================================

app.get('/tax-rates', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const country = c.req.query('country');
  const region = c.req.query('region');
  const itemType = c.req.query('item_type') as 'goods' | 'services' | undefined;
  
  if (!country) {
    return c.json({ error: 'Country is required' }, 400);
  }
  
  const rates = await tax.getApplicableTaxRates(db, companyId, country, region, itemType);
  return c.json({ data: rates });
});

app.post('/tax-rates', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const rate = await tax.createTaxRate(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(rate);
});

app.post('/tax/calculate', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const result = await tax.calculateLineTax(db, companyId, body.amount, body.country, {
    region: body.region,
    itemType: body.item_type,
    customerId: body.customer_id,
    productId: body.product_id,
    priceIncludesTax: body.price_includes_tax
  });
  
  return c.json(result);
});

app.get('/tax-returns', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const returns = await tax.listTaxReturns(db, companyId);
  return c.json({ data: returns });
});

app.post('/tax-returns', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const taxReturn = await tax.createTaxReturn(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(taxReturn);
});

app.get('/tax/summary', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const year = parseInt(c.req.query('year') || String(new Date().getFullYear()));
  
  const summary = await tax.getTaxSummary(db, companyId, year);
  return c.json(summary);
});

// ============================================
// SSO Routes
// ============================================

app.post('/sso/providers', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const provider = await sso.createSSOProvider(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(provider);
});

app.get('/sso/providers', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const providers = await sso.listSSOProviders(db, companyId);
  return c.json({ data: providers });
});

app.get('/sso/authorize/:providerId', async (c) => {
  const db = c.env.DB;
  const providerId = c.req.param('providerId');
  const redirectUri = c.req.query('redirect_uri') || '';
  const state = c.req.query('state');
  
  const authUrl = await sso.generateAuthorizationUrl(db, providerId, redirectUri, state);
  return c.json({ authorization_url: authUrl });
});

app.post('/sso/callback', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  
  const result = await sso.completeSSOLogin(db, body.provider_id, body.code, body.state, body.redirect_uri, body.client_secret);
  return c.json(result);
});

// ============================================
// Accounting Sync Routes
// ============================================

app.get('/accounting/sync/summary', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const summary = await accountingSync.getSyncSummary(db, companyId);
  return c.json(summary);
});

app.get('/accounting/sync/logs/:connectorId', async (c) => {
  const db = c.env.DB;
  const connectorId = c.req.param('connectorId');
  const limit = parseInt(c.req.query('limit') || '50');
  
  const logs = await accountingSync.getSyncLogs(db, connectorId, limit);
  return c.json({ data: logs });
});

app.get('/accounting/export/:entityType', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const entityType = c.req.param('entityType') as 'customers' | 'suppliers' | 'products' | 'invoices' | 'bills';
  const dateFrom = c.req.query('date_from');
  const dateTo = c.req.query('date_to');
  
  const csv = await accountingSync.exportToCSV(db, companyId, entityType, dateFrom, dateTo);
  
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${entityType}_export.csv"`
    }
  });
});

// ============================================
// E-Commerce Routes
// ============================================

app.post('/ecommerce/stores', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const store = await ecommerce.createStore(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(store);
});

app.get('/ecommerce/stores', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const stores = await ecommerce.listStores(db, companyId);
  return c.json({ data: stores });
});

app.get('/ecommerce/summary', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const summary = await ecommerce.getEcommerceSummary(db, companyId);
  return c.json(summary);
});

app.post('/ecommerce/webhook/:storeId', async (c) => {
  const db = c.env.DB;
  const storeId = c.req.param('storeId');
  const eventType = c.req.header('X-Shopify-Topic') || c.req.header('X-WC-Webhook-Topic') || '';
  const body = await c.req.json();
  
  const result = await ecommerce.handleWebhook(db, storeId, eventType, body);
  return c.json(result);
});

// ============================================
// Shipping Routes
// ============================================

app.post('/shipping/carriers', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const carrier = await shipping.createCarrier(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(carrier);
});

app.get('/shipping/carriers', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const carriers = await shipping.listCarriers(db, companyId);
  return c.json({ data: carriers });
});

app.post('/shipping/rates', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const rates = await shipping.getRates(db, companyId, body.from_address, body.to_address, body.packages);
  return c.json({ data: rates });
});

app.post('/shipping/shipments', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const shipment = await shipping.createShipment(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(shipment);
});

app.get('/shipping/shipments', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const status = c.req.query('status') as 'pending' | 'label_created' | 'in_transit' | 'delivered' | undefined;
  
  const shipments = await shipping.listShipments(db, companyId, status);
  return c.json({ data: shipments });
});

app.post('/shipping/shipments/:id/label', async (c) => {
  const db = c.env.DB;
  const shipmentId = c.req.param('id');
  const body = await c.req.json();
  
  const result = await shipping.purchaseLabel(db, shipmentId, body.rate_id);
  return c.json(result);
});

app.get('/shipping/summary', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const summary = await shipping.getShippingSummary(db, companyId);
  return c.json(summary);
});

// ============================================
// Fixed Assets Routes
// ============================================

app.post('/assets/categories', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const category = await fixedAssets.createAssetCategory(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(category);
});

app.get('/assets/categories', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const categories = await fixedAssets.listAssetCategories(db, companyId);
  return c.json({ data: categories });
});

app.post('/assets', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const asset = await fixedAssets.createFixedAsset(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(asset);
});

app.get('/assets', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const status = c.req.query('status') as 'active' | 'disposed' | 'fully_depreciated' | undefined;
  
  const assets = await fixedAssets.listFixedAssets(db, companyId, { status });
  return c.json({ data: assets });
});

app.get('/assets/:id', async (c) => {
  const db = c.env.DB;
  const assetId = c.req.param('id');
  
  const asset = await fixedAssets.getFixedAsset(db, assetId);
  if (!asset) {
    return c.json({ error: 'Asset not found' }, 404);
  }
  
  return c.json(asset);
});

app.post('/assets/depreciation/run', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const result = await fixedAssets.runDepreciation(db, companyId, body.period_end);
  return c.json(result);
});

app.post('/assets/:id/dispose', async (c) => {
  const db = c.env.DB;
  const assetId = c.req.param('id');
  const body = await c.req.json();
  
  const result = await fixedAssets.disposeAsset(db, assetId, body);
  return c.json(result);
});

app.get('/assets/summary', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const summary = await fixedAssets.getAssetSummary(db, companyId);
  return c.json(summary);
});

app.get('/assets/register', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const register = await fixedAssets.generateAssetRegister(db, companyId);
  return c.json({ data: register });
});

// ============================================
// Payroll Routes
// ============================================

app.post('/payroll/config', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const config = await payroll.createPayrollConfig(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(config);
});

app.post('/payroll/employees', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const employeePayroll = await payroll.createEmployeePayroll(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(employeePayroll);
});

app.get('/payroll/employees/:employeeId', async (c) => {
  const db = c.env.DB;
  const employeeId = c.req.param('employeeId');
  
  const employeePayroll = await payroll.getEmployeePayroll(db, employeeId);
  if (!employeePayroll) {
    return c.json({ error: 'Employee payroll not found' }, 404);
  }
  
  return c.json(employeePayroll);
});

app.post('/payroll/runs', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const run = await payroll.createPayrollRun(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(run);
});

app.post('/payroll/runs/:id/calculate', async (c) => {
  const db = c.env.DB;
  const runId = c.req.param('id');
  const body = await c.req.json();
  
  const result = await payroll.calculatePayrollRun(db, runId, body.time_entries);
  return c.json(result);
});

app.post('/payroll/runs/:id/approve', async (c) => {
  const db = c.env.DB;
  const runId = c.req.param('id');
  const body = await c.req.json();
  
  await payroll.approvePayrollRun(db, runId, body.approved_by);
  return c.json({ success: true });
});

app.post('/payroll/runs/:id/process', async (c) => {
  const db = c.env.DB;
  const runId = c.req.param('id');
  
  const result = await payroll.processPayrollPayments(db, runId);
  return c.json(result);
});

app.get('/payroll/summary', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const year = parseInt(c.req.query('year') || String(new Date().getFullYear()));
  
  const summary = await payroll.getPayrollSummary(db, companyId, year);
  return c.json(summary);
});

app.get('/payroll/paystub/:itemId', async (c) => {
  const db = c.env.DB;
  const itemId = c.req.param('itemId');
  
  const paystub = await payroll.generatePayStub(db, itemId);
  return c.json(paystub);
});

// ============================================
// E-Invoicing Routes
// ============================================

app.post('/einvoice/config', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const config = await einvoice.createEInvoiceConfig(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(config);
});

app.get('/einvoice/config/:country', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const country = c.req.param('country');
  
  const config = await einvoice.getEInvoiceConfigByCountry(db, companyId, country);
  return c.json(config || { required: einvoice.isEInvoicingRequired(country), recommended: einvoice.getRecommendedScheme(country) });
});

app.post('/einvoice', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const invoice = await einvoice.createEInvoice(db, {
    company_id: companyId,
    config_id: body.config_id,
    invoice_id: body.invoice_id,
    direction: body.direction || 'outbound',
    document_type: body.document_type || 'invoice',
    recipient_id: body.recipient_id
  }, body.invoice_data);
  
  return c.json(invoice);
});

app.get('/einvoice', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const status = c.req.query('status') as 'pending' | 'sent' | 'delivered' | undefined;
  
  const invoices = await einvoice.listEInvoices(db, companyId, { status });
  return c.json({ data: invoices });
});

app.post('/einvoice/:id/validate', async (c) => {
  const db = c.env.DB;
  const einvoiceId = c.req.param('id');
  
  const result = await einvoice.validateEInvoice(db, einvoiceId);
  return c.json(result);
});

app.post('/einvoice/:id/send', async (c) => {
  const db = c.env.DB;
  const einvoiceId = c.req.param('id');
  
  const result = await einvoice.sendEInvoice(db, einvoiceId);
  return c.json(result);
});

app.get('/einvoice/summary', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const summary = await einvoice.getEInvoiceSummary(db, companyId);
  return c.json(summary);
});

// ============================================
// MRP Routes
// ============================================

app.post('/mrp/forecasts', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const forecast = await mrp.createDemandForecast(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(forecast);
});

app.post('/mrp/forecasts/generate', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const forecasts = await mrp.generateMovingAverageForecast(
    db, companyId, body.product_id, body.periods, body.forecast_months
  );
  
  return c.json({ data: forecasts });
});

app.post('/mrp/reorder-rules', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const rule = await mrp.createReorderRule(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(rule);
});

app.get('/mrp/reorder-rules', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const rules = await mrp.listReorderRules(db, companyId);
  return c.json({ data: rules });
});

app.post('/mrp/run', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const run = await mrp.runMRP(db, companyId, body.planning_horizon_days);
  return c.json(run);
});

app.get('/mrp/runs', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const runs = await mrp.getMRPRuns(db, companyId);
  return c.json({ data: runs });
});

app.get('/mrp/runs/:id/suggestions', async (c) => {
  const db = c.env.DB;
  const runId = c.req.param('id');
  const status = c.req.query('status') as 'pending' | 'approved' | undefined;
  
  const suggestions = await mrp.getMRPSuggestions(db, runId, { status });
  return c.json({ data: suggestions });
});

app.post('/mrp/suggestions/:id/approve', async (c) => {
  const db = c.env.DB;
  const suggestionId = c.req.param('id');
  
  await mrp.approveSuggestion(db, suggestionId);
  return c.json({ success: true });
});

app.get('/mrp/inventory-status', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const status = await mrp.getInventoryStatus(db, companyId);
  return c.json(status);
});

// ============================================
// Monitoring Routes
// ============================================

app.get('/monitoring/alerts', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const category = c.req.query('category') as 'system' | 'integration' | 'job' | undefined;
  
  const alerts = await monitoring.getActiveAlerts(db, companyId, category);
  return c.json({ data: alerts });
});

app.post('/monitoring/alerts/:id/acknowledge', async (c) => {
  const db = c.env.DB;
  const alertId = c.req.param('id');
  const body = await c.req.json();
  
  await monitoring.acknowledgeAlert(db, alertId, body.acknowledged_by);
  return c.json({ success: true });
});

app.post('/monitoring/alerts/:id/resolve', async (c) => {
  const db = c.env.DB;
  const alertId = c.req.param('id');
  
  await monitoring.resolveAlert(db, alertId);
  return c.json({ success: true });
});

app.get('/monitoring/health', async (c) => {
  const db = c.env.DB;
  
  const checks = await monitoring.performHealthChecks(db);
  return c.json({ data: checks });
});

app.get('/monitoring/metrics', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const metrics = await monitoring.getSystemMetrics(db, companyId);
  return c.json({ data: metrics });
});

app.get('/monitoring/summary', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const summary = await monitoring.getAlertSummary(db, companyId);
  return c.json(summary);
});

app.post('/monitoring/rules', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const rule = await monitoring.createAlertRule(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(rule);
});

app.get('/monitoring/rules', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const rules = await monitoring.getAlertRules(db, companyId);
  return c.json({ data: rules });
});

// ============================================
// Admin Routes
// ============================================

app.post('/admin/impersonate', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  
  const session = await admin.startImpersonation(
    db,
    body.admin_user_id,
    body.target_user_id,
    body.target_company_id,
    body.reason,
    c.req.header('CF-Connecting-IP'),
    c.req.header('User-Agent')
  );
  
  return c.json(session);
});

app.post('/admin/impersonate/:id/end', async (c) => {
  const db = c.env.DB;
  const sessionId = c.req.param('id');
  const body = await c.req.json();
  
  await admin.endImpersonation(db, sessionId, body.actions_performed);
  return c.json({ success: true });
});

app.get('/admin/impersonation-logs', async (c) => {
  const db = c.env.DB;
  const limit = parseInt(c.req.query('limit') || '50');
  
  const logs = await admin.getImpersonationLogs(db, { limit });
  return c.json({ data: logs });
});

app.post('/support/tickets', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const ticket = await admin.createSupportTicket(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(ticket);
});

app.get('/support/tickets', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const status = c.req.query('status') as 'open' | 'in_progress' | 'resolved' | undefined;
  
  const tickets = await admin.listSupportTickets(db, { companyId, status });
  return c.json({ data: tickets });
});

app.get('/support/tickets/:id', async (c) => {
  const db = c.env.DB;
  const ticketId = c.req.param('id');
  
  const ticket = await admin.getSupportTicket(db, ticketId);
  if (!ticket) {
    return c.json({ error: 'Ticket not found' }, 404);
  }
  
  return c.json(ticket);
});

app.post('/support/tickets/:id/comments', async (c) => {
  const db = c.env.DB;
  const ticketId = c.req.param('id');
  const body = await c.req.json();
  
  const comment = await admin.addTicketComment(db, {
    ticket_id: ticketId,
    ...body
  });
  
  return c.json(comment);
});

app.get('/support/tickets/:id/comments', async (c) => {
  const db = c.env.DB;
  const ticketId = c.req.param('id');
  const includeInternal = c.req.query('include_internal') === 'true';
  
  const comments = await admin.getTicketComments(db, ticketId, includeInternal);
  return c.json({ data: comments });
});

app.get('/support/statistics', async (c) => {
  const db = c.env.DB;
  const companyId = c.req.query('company_id');
  
  const stats = await admin.getTicketStatistics(db, companyId);
  return c.json(stats);
});

// ============================================
// Backup Routes
// ============================================

app.post('/backups', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const job = await backup.createBackupJob(db, {
    company_id: companyId,
    backup_type: body.backup_type || 'full',
    tables_included: body.tables_included,
    tables_excluded: body.tables_excluded,
    retention_days: body.retention_days
  });
  
  return c.json(job);
});

app.get('/backups', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const status = c.req.query('status') as 'pending' | 'completed' | 'failed' | undefined;
  
  const jobs = await backup.listBackupJobs(db, { companyId, status });
  return c.json({ data: jobs });
});

app.post('/backups/:id/execute', async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param('id');
  
  const result = await backup.executeBackup(db, jobId);
  return c.json(result);
});

app.post('/backups/:id/restore', async (c) => {
  const db = c.env.DB;
  const backupJobId = c.req.param('id');
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const restoreJob = await backup.createRestoreJob(db, backupJobId, companyId);
  const result = await backup.executeRestore(db, restoreJob.id, body.backup_data);
  
  return c.json(result);
});

app.get('/backups/summary', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const summary = await backup.getBackupSummary(db, companyId);
  return c.json(summary);
});

app.post('/backups/schedules', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const schedule = await backup.createBackupSchedule(db, {
    company_id: companyId,
    ...body
  });
  
  return c.json(schedule);
});

app.get('/backups/schedules', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const schedules = await backup.getBackupSchedules(db, companyId);
  return c.json({ data: schedules });
});

app.get('/backups/schema', async (c) => {
  const db = c.env.DB;
  
  const schemas = await backup.exportAllSchemas(db);
  return c.json(schemas);
});

export default app;
