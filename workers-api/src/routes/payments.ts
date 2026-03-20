import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';
import { verifyWebhook, getWebhookSecrets } from '../services/webhook-verification';
import { sendPaymentConfirmation } from '../services/email-service';

interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Supported payment providers
const PAYMENT_PROVIDERS = {
  stripe: {
    name: 'Stripe',
    currencies: ['USD', 'EUR', 'GBP', 'ZAR', 'AED', 'SAR'],
    features: ['cards', 'bank_transfers', 'subscriptions']
  },
  payfast: {
    name: 'PayFast',
    currencies: ['ZAR'],
    features: ['cards', 'eft', 'instant_eft']
  },
  paypal: {
    name: 'PayPal',
    currencies: ['USD', 'EUR', 'GBP', 'ZAR'],
    features: ['paypal_balance', 'cards']
  },
  flutterwave: {
    name: 'Flutterwave',
    currencies: ['NGN', 'GHS', 'KES', 'ZAR', 'USD'],
    features: ['cards', 'mobile_money', 'bank_transfers']
  },
  razorpay: {
    name: 'Razorpay',
    currencies: ['INR'],
    features: ['cards', 'upi', 'netbanking', 'wallets']
  }
};

// ============================================================================
// PAYMENT INTEGRATIONS
// ============================================================================

// List available payment providers
app.get('/providers', async (c) => {
  return c.json({ providers: PAYMENT_PROVIDERS });
});

// List configured integrations
app.get('/integrations', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

  try {
    const db = c.env.DB;
    
    const integrations = await db.prepare(`
      SELECT id, provider, is_active, is_test_mode, supported_currencies, last_sync_at, created_at
      FROM payment_integrations
      WHERE company_id = ?
    `).bind(companyId).all();
    
    return c.json({
      integrations: integrations.results.map((i: any) => ({
        ...i,
        provider_info: PAYMENT_PROVIDERS[i.provider as keyof typeof PAYMENT_PROVIDERS]
      }))
    });
  } catch (error: any) {
    console.error('Payment integrations list error:', error);
    return c.json({ error: error.message || 'Failed to list integrations' }, 500);
  }
});

// Add payment integration
app.post('/integrations', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

  try {
    const body = await c.req.json();
    const db = c.env.DB;
    
    if (!PAYMENT_PROVIDERS[body.provider as keyof typeof PAYMENT_PROVIDERS]) {
      return c.json({ error: 'Invalid payment provider' }, 400);
    }
    
    const integrationId = crypto.randomUUID();
    
    // In production, encrypt API keys before storing
    await db.prepare(`
      INSERT INTO payment_integrations (
        id, company_id, provider, provider_account_id,
        api_key_encrypted, webhook_secret_encrypted,
        is_active, is_test_mode, supported_currencies, settings_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      integrationId,
      companyId,
      body.provider,
      body.provider_account_id || null,
      body.api_key || null, // Should be encrypted in production
      body.webhook_secret || null, // Should be encrypted in production
      body.is_active !== false ? 1 : 0,
      body.is_test_mode ? 1 : 0,
      body.supported_currencies || PAYMENT_PROVIDERS[body.provider as keyof typeof PAYMENT_PROVIDERS].currencies.join(','),
      JSON.stringify(body.settings || {})
    ).run();
    
    return c.json({ success: true, id: integrationId });
  } catch (error: any) {
    console.error('Add payment integration error:', error);
    return c.json({ error: error.message || 'Failed to add integration' }, 500);
  }
});

// Update payment integration
app.put('/integrations/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

  try {
    const integrationId = c.req.param('id');
    const body = await c.req.json();
    const db = c.env.DB;
    
    await db.prepare(`
      UPDATE payment_integrations SET
        is_active = ?,
        is_test_mode = ?,
        supported_currencies = ?,
        settings_json = ?,
        updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(
      body.is_active !== false ? 1 : 0,
      body.is_test_mode ? 1 : 0,
      body.supported_currencies || null,
      JSON.stringify(body.settings || {}),
      new Date().toISOString(),
      integrationId,
      companyId
    ).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Update payment integration error:', error);
    return c.json({ error: error.message || 'Failed to update integration' }, 500);
  }
});

// Delete payment integration
app.delete('/integrations/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

  try {
    const integrationId = c.req.param('id');
    const db = c.env.DB;
    
    await db.prepare(`
      DELETE FROM payment_integrations WHERE id = ? AND company_id = ?
    `).bind(integrationId, companyId).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Delete payment integration error:', error);
    return c.json({ error: error.message || 'Failed to delete integration' }, 500);
  }
});

// ============================================================================
// PAYMENT TRANSACTIONS
// ============================================================================

// List payment transactions
app.get('/transactions', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

  try {
    const db = c.env.DB;
    
    const status = c.req.query('status');
    const paymentType = c.req.query('type');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    let query = `
      SELECT pt.*, pi.provider
      FROM payment_transactions pt
      LEFT JOIN payment_integrations pi ON pi.id = pt.integration_id
      WHERE pt.company_id = ?
    `;
    const params: any[] = [companyId];
    
    if (status) {
      query += ' AND pt.status = ?';
      params.push(status);
    }
    
    if (paymentType) {
      query += ' AND pt.payment_type = ?';
      params.push(paymentType);
    }
    
    if (startDate) {
      query += ' AND pt.created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND pt.created_at <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY pt.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const transactions = await db.prepare(query).bind(...params).all();
    
    // Get summary
    const summary = await db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_received,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM payment_transactions
      WHERE company_id = ?
    `).bind(companyId).first();
    
    return c.json({
      transactions: transactions.results.map((t: any) => ({
        ...t,
        metadata: JSON.parse(t.metadata_json || '{}')
      })),
      summary,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Payment transactions list error:', error);
    return c.json({ error: error.message || 'Failed to list transactions' }, 500);
  }
});

// Get payment transaction by ID
app.get('/transactions/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

  try {
    const txnId = c.req.param('id');
    const db = c.env.DB;
    
    const transaction = await db.prepare(`
      SELECT pt.*, pi.provider
      FROM payment_transactions pt
      LEFT JOIN payment_integrations pi ON pi.id = pt.integration_id
      WHERE pt.id = ? AND pt.company_id = ?
    `).bind(txnId, companyId).first();
    
    if (!transaction) {
      return c.json({ error: 'Transaction not found' }, 404);
    }
    
    return c.json({
      ...(transaction as any),
      metadata: JSON.parse((transaction as any).metadata_json || '{}')
    });
  } catch (error: any) {
    console.error('Payment transaction fetch error:', error);
    return c.json({ error: error.message || 'Failed to fetch transaction' }, 500);
  }
});

// Create payment request (for invoice payment links)
app.post('/request', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

  try {
    const body = await c.req.json();
    const db = c.env.DB;
    
    // Get active payment integration
    const integration = await db.prepare(`
      SELECT * FROM payment_integrations
      WHERE company_id = ? AND is_active = 1
      ORDER BY created_at LIMIT 1
    `).bind(companyId).first<any>();
    
    const txnId = crypto.randomUUID();
    
    await db.prepare(`
      INSERT INTO payment_transactions (
        id, company_id, integration_id, payment_type, amount, currency,
        status, payer_name, payer_email, payer_reference,
        invoice_id, document_id, payment_method, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      txnId,
      companyId,
      integration?.id || null,
      body.payment_type || 'invoice',
      body.amount,
      body.currency || 'ZAR',
      body.payer_name || null,
      body.payer_email || null,
      body.payer_reference || null,
      body.invoice_id || null,
      body.document_id || null,
      body.payment_method || null,
      JSON.stringify(body.metadata || {})
    ).run();
    
    // Generate payment link (in production, this would call the payment provider API)
    const paymentLink = `https://pay.aria-erp.com/${txnId}`;
    
    return c.json({
      success: true,
      transaction_id: txnId,
      payment_link: paymentLink,
      provider: integration?.provider || 'manual'
    });
  } catch (error: any) {
    console.error('Create payment request error:', error);
    return c.json({ error: error.message || 'Failed to create payment request' }, 500);
  }
});

// Record manual payment
app.post('/manual', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

  try {
    const body = await c.req.json();
    const db = c.env.DB;
    
    const txnId = crypto.randomUUID();
    
    await db.prepare(`
      INSERT INTO payment_transactions (
        id, company_id, payment_type, amount, currency,
        status, payer_name, payer_email, payer_reference,
        invoice_id, document_id, bank_account_id, payment_method,
        payment_date, processed_at, metadata_json
      ) VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      txnId,
      companyId,
      body.payment_type || 'receipt',
      body.amount,
      body.currency || 'ZAR',
      body.payer_name || null,
      body.payer_email || null,
      body.payer_reference || null,
      body.invoice_id || null,
      body.document_id || null,
      body.bank_account_id || null,
      body.payment_method || 'manual',
      body.payment_date || new Date().toISOString().split('T')[0],
      new Date().toISOString(),
      JSON.stringify(body.metadata || {})
    ).run();
    
    // If linked to an invoice, update invoice status
    if (body.invoice_id) {
      // Get invoice total and payments
      const invoice = await db.prepare(`
        SELECT total_amount FROM customer_invoices WHERE id = ? AND company_id = ?
      `).bind(body.invoice_id, companyId).first<{ total_amount: number }>();
      
      const payments = await db.prepare(`
        SELECT SUM(amount) as total_paid FROM payment_transactions
        WHERE invoice_id = ? AND company_id = ? AND status = 'completed'
      `).bind(body.invoice_id, companyId).first<{ total_paid: number }>();
      
      if (invoice && payments && payments.total_paid >= invoice.total_amount) {
        await db.prepare(`
          UPDATE customer_invoices SET status = 'paid', updated_at = ? WHERE id = ?
        `).bind(new Date().toISOString(), body.invoice_id).run();
      }
    }
    
    return c.json({ success: true, transaction_id: txnId });
  } catch (error: any) {
    console.error('Record manual payment error:', error);
    return c.json({ error: error.message || 'Failed to record payment' }, 500);
  }
});

// Webhook handler (for payment provider callbacks)
app.post('/webhook/:provider', async (c) => {
  try {
    const provider = c.req.param('provider');
    const rawBody = await c.req.text();
    const body = JSON.parse(rawBody);
    const db = c.env.DB;
    
    // Get all headers for signature verification
    const headers: Record<string, string> = {};
    c.req.raw.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    
    // Find the company associated with this webhook (from metadata or lookup)
    let companyId: string | null = null;
    
    // Try to extract company ID from webhook metadata
    if (provider === 'stripe' && body.data?.object?.metadata?.company_id) {
      companyId = body.data.object.metadata.company_id;
    } else if (provider === 'payfast' && body.custom_str1) {
      companyId = body.custom_str1;
    } else if (provider === 'paypal' && body.resource?.custom_id) {
      try {
        const customData = JSON.parse(body.resource.custom_id);
        companyId = customData.company_id;
      } catch {
        companyId = body.resource.custom_id;
      }
    } else if (provider === 'flutterwave' && body.data?.meta?.company_id) {
      companyId = body.data.meta.company_id;
    } else if (provider === 'razorpay' && body.payload?.payment?.entity?.notes?.company_id) {
      companyId = body.payload.payment.entity.notes.company_id;
    }
    
    // Verify webhook signature if company is identified
    if (companyId) {
      const secrets = await getWebhookSecrets(db, companyId, provider);
      
      if (Object.keys(secrets).length > 0) {
        const verification = await verifyWebhook(provider, rawBody, headers, {
          stripeWebhookSecret: secrets.webhookSecret,
          payfastPassphrase: secrets.passphrase,
          paypalWebhookId: secrets.webhookId,
          flutterwaveSecretHash: secrets.secretHash,
          razorpayWebhookSecret: secrets.webhookSecret
        });
        
        if (!verification.valid) {
          console.error(`Webhook verification failed for ${provider}:`, verification.error);
          return c.json({ error: 'Webhook signature verification failed' }, 401);
        }
        
        console.log(`Webhook verified successfully for ${provider}`);
      }
    }
    
    let externalId: string | null = null;
    let status: string = 'pending';
    let amount: number = 0;
    let currency: string = 'ZAR';
    let metadata: any = {};
    let payerEmail: string | null = null;
    let payerName: string | null = null;
    
    // Parse webhook based on provider
    switch (provider) {
      case 'stripe':
        externalId = body.data?.object?.id;
        status = body.data?.object?.status === 'succeeded' ? 'completed' : 
                 body.data?.object?.status === 'failed' ? 'failed' : 'pending';
        amount = (body.data?.object?.amount || 0) / 100; // Stripe uses cents
        currency = (body.data?.object?.currency || 'usd').toUpperCase();
        metadata = body.data?.object?.metadata || {};
        payerEmail = body.data?.object?.receipt_email || body.data?.object?.billing_details?.email;
        payerName = body.data?.object?.billing_details?.name;
        break;
        
      case 'payfast':
        externalId = body.pf_payment_id;
        status = body.payment_status === 'COMPLETE' ? 'completed' : 
                 body.payment_status === 'FAILED' ? 'failed' : 'pending';
        amount = parseFloat(body.amount_gross || '0');
        currency = 'ZAR';
        metadata = { item_name: body.item_name, item_description: body.item_description };
        payerEmail = body.email_address;
        payerName = `${body.name_first || ''} ${body.name_last || ''}`.trim();
        break;
        
      case 'paypal':
        externalId = body.resource?.id;
        status = body.event_type?.includes('COMPLETED') ? 'completed' : 
                 body.event_type?.includes('DENIED') ? 'failed' : 'pending';
        amount = parseFloat(body.resource?.amount?.value || '0');
        currency = body.resource?.amount?.currency_code || 'USD';
        metadata = body.resource?.custom_id ? { custom_id: body.resource.custom_id } : {};
        payerEmail = body.resource?.payer?.email_address;
        payerName = body.resource?.payer?.name?.given_name ? 
          `${body.resource.payer.name.given_name} ${body.resource.payer.name.surname || ''}`.trim() : null;
        break;
        
      case 'flutterwave':
        externalId = body.data?.id?.toString();
        status = body.data?.status === 'successful' ? 'completed' : 
                 body.data?.status === 'failed' ? 'failed' : 'pending';
        amount = body.data?.amount || 0;
        currency = body.data?.currency || 'NGN';
        metadata = body.data?.meta || {};
        payerEmail = body.data?.customer?.email;
        payerName = body.data?.customer?.name;
        break;
        
      case 'razorpay':
        const payment = body.payload?.payment?.entity;
        externalId = payment?.id;
        status = body.event === 'payment.captured' ? 'completed' : 
                 body.event === 'payment.failed' ? 'failed' : 'pending';
        amount = (payment?.amount || 0) / 100; // Razorpay uses paise
        currency = (payment?.currency || 'INR').toUpperCase();
        metadata = payment?.notes || {};
        payerEmail = payment?.email;
        payerName = payment?.contact;
        break;
        
      default:
        return c.json({ error: 'Unknown provider' }, 400);
    }
    
    // Find and update transaction
    if (externalId) {
      const existing = await db.prepare(`
        SELECT id, company_id FROM payment_transactions WHERE external_id = ?
      `).bind(externalId).first<{ id: string; company_id: string }>();
      
      if (existing) {
        await db.prepare(`
          UPDATE payment_transactions SET
            status = ?,
            processed_at = ?,
            metadata_json = ?,
            updated_at = ?
          WHERE id = ?
        `).bind(
          status,
          status === 'completed' ? new Date().toISOString() : null,
          JSON.stringify(metadata),
          new Date().toISOString(),
          existing.id
        ).run();
        
        // If completed and linked to invoice, update invoice
        if (status === 'completed') {
          const txn = await db.prepare(`
            SELECT invoice_id, amount FROM payment_transactions WHERE id = ?
          `).bind(existing.id).first<{ invoice_id: string; amount: number }>();
          
          if (txn?.invoice_id) {
            const invoice = await db.prepare(`
              SELECT total_amount FROM customer_invoices WHERE id = ?
            `).bind(txn.invoice_id).first<{ total_amount: number }>();
            
            const payments = await db.prepare(`
              SELECT SUM(amount) as total_paid FROM payment_transactions
              WHERE invoice_id = ? AND status = 'completed'
            `).bind(txn.invoice_id).first<{ total_paid: number }>();
            
            if (invoice && payments && payments.total_paid >= invoice.total_amount) {
              await db.prepare(`
                UPDATE customer_invoices SET status = 'paid', updated_at = ? WHERE id = ?
              `).bind(new Date().toISOString(), txn.invoice_id).run();
            }
          }
        }
      }
    }
    
    return c.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return c.json({ error: error.message || 'Webhook processing failed' }, 500);
  }
});

// ============================================================================
// PAYMENT ANALYTICS
// ============================================================================

// Get payment analytics
app.get('/analytics', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

  try {
    const db = c.env.DB;
    const period = c.req.query('period') || '30d';
    
    let dateFilter = "datetime('now', '-30 days')";
    if (period === '7d') dateFilter = "datetime('now', '-7 days')";
    if (period === '90d') dateFilter = "datetime('now', '-90 days')";
    if (period === '1y') dateFilter = "datetime('now', '-1 year')";
    
    // Summary metrics
    const summary = await db.prepare(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_received,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as avg_transaction,
        COUNT(DISTINCT payer_email) as unique_payers
      FROM payment_transactions
      WHERE company_id = ? AND created_at >= ${dateFilter}
    `).bind(companyId).first();
    
    // By payment method
    const byMethod = await db.prepare(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total
      FROM payment_transactions
      WHERE company_id = ? AND created_at >= ${dateFilter}
      GROUP BY payment_method
      ORDER BY total DESC
    `).bind(companyId).all();
    
    // By day
    const byDay = await db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total
      FROM payment_transactions
      WHERE company_id = ? AND created_at >= ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date
    `).bind(companyId).all();
    
    // Top payers
    const topPayers = await db.prepare(`
      SELECT 
        payer_name,
        payer_email,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_paid
      FROM payment_transactions
      WHERE company_id = ? AND created_at >= ${dateFilter} AND payer_email IS NOT NULL
      GROUP BY payer_email
      ORDER BY total_paid DESC
      LIMIT 10
    `).bind(companyId).all();
    
    return c.json({
      period,
      summary,
      by_method: byMethod.results,
      by_day: byDay.results,
      top_payers: topPayers.results
    });
  } catch (error: any) {
    console.error('Payment analytics error:', error);
    return c.json({ error: error.message || 'Failed to get analytics' }, 500);
  }
});

export default app;
