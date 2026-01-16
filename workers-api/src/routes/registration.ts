/**
 * Self-Registration Routes
 * 
 * Public endpoints for:
 * - Getting pricing plans
 * - Creating registration with Stripe checkout
 * - Handling Stripe webhooks
 * - Validating referral/promo codes
 */

import { Hono } from 'hono';
import Stripe from 'stripe';
import {
  getPlans,
  getPlan,
  validateReferralCode,
  validatePromoCode,
  createPendingRegistration,
  updatePendingRegistrationWithCheckout,
  getPendingRegistrationByCheckout,
  completeRegistration,
  buildCheckoutSessionParams,
  recordCommission,
} from '../services/registration-service';

interface Env {
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  APP_URL: string;  // e.g., https://aria-erp.pages.dev
}

const app = new Hono<{ Bindings: Env }>();

// =====================================================
// PUBLIC ENDPOINTS (no auth required)
// =====================================================

/**
 * Get all available pricing plans
 */
app.get('/plans', async (c) => {
  try {
    const plans = await getPlans(c.env.DB);
    
    // Filter out enterprise (custom pricing) for public display
    const publicPlans = plans.filter(p => p.code !== 'enterprise').map(plan => ({
      id: plan.id,
      name: plan.name,
      code: plan.code,
      description: plan.description,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      currency: plan.currency,
      features: plan.features,
      limits: plan.limits,
      annual_savings: Math.round((plan.price_monthly * 12 - plan.price_yearly) * 100) / 100,
    }));

    return c.json({
      plans: publicPlans,
      trial_days: 14,
      annual_discount_months: 2,
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return c.json({ error: 'Failed to fetch plans' }, 500);
  }
});

/**
 * Validate a referral code
 */
app.get('/validate-referral/:code', async (c) => {
  try {
    const code = c.req.param('code');
    const result = await validateReferralCode(c.env.DB, code);
    
    return c.json({
      valid: result.valid,
      discount_percent: result.discount_percent || 0,
    });
  } catch (error) {
    console.error('Error validating referral code:', error);
    return c.json({ valid: false }, 200);
  }
});

/**
 * Validate a promo code
 */
app.get('/validate-promo/:code', async (c) => {
  try {
    const code = c.req.param('code');
    const result = await validatePromoCode(c.env.DB, code);
    
    return c.json({
      valid: result.valid,
      discount_type: result.discount_type,
      discount_value: result.discount_value,
      duration_months: result.duration_months,
    });
  } catch (error) {
    console.error('Error validating promo code:', error);
    return c.json({ valid: false }, 200);
  }
});

/**
 * Start registration - creates pending registration and Stripe checkout session
 */
app.post('/start', async (c) => {
  try {
    const body = await c.req.json();
    
    // Validate required fields
    const { email, company_name, contact_name, plan_id, billing_cycle } = body;
    if (!email || !company_name || !contact_name || !plan_id) {
      return c.json({ error: 'Missing required fields: email, company_name, contact_name, plan_id' }, 400);
    }

    // Validate plan exists
    const plan = await getPlan(c.env.DB, plan_id);
    if (!plan) {
      return c.json({ error: 'Invalid plan selected' }, 400);
    }

    // Validate referral code if provided
    let referralValidation = null;
    if (body.referral_code) {
      referralValidation = await validateReferralCode(c.env.DB, body.referral_code);
      if (!referralValidation.valid) {
        return c.json({ error: 'Invalid or expired referral code' }, 400);
      }
    }

    // Validate promo code if provided
    let promoValidation = null;
    if (body.promo_code) {
      promoValidation = await validatePromoCode(c.env.DB, body.promo_code);
      if (!promoValidation.valid) {
        return c.json({ error: 'Invalid or expired promo code' }, 400);
      }
    }

    // Create pending registration
    const registration = await createPendingRegistration(c.env.DB, {
      email,
      company_name,
      contact_name,
      phone: body.phone,
      country: body.country,
      plan_id,
      billing_cycle: billing_cycle || 'monthly',
      referral_code: body.referral_code,
      promo_code: body.promo_code,
    });

    // Check if Stripe is configured
    if (!c.env.STRIPE_SECRET_KEY) {
      // Return registration without Stripe for testing
      return c.json({
        registration_id: registration.id,
        message: 'Registration created. Stripe not configured - contact support to complete setup.',
        checkout_url: null,
      });
    }

    // Create Stripe checkout session
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);

    const appUrl = c.env.APP_URL || 'https://aria-erp.pages.dev';
    const successUrl = `${appUrl}/registration/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/registration/cancelled?registration_id=${registration.id}`;

    const checkoutParams = buildCheckoutSessionParams(
      registration,
      plan,
      successUrl,
      cancelUrl,
      promoValidation || undefined
    );

    const session = await stripe.checkout.sessions.create(checkoutParams as any);

    // Update registration with checkout session ID
    await updatePendingRegistrationWithCheckout(c.env.DB, registration.id, session.id);

    return c.json({
      registration_id: registration.id,
      checkout_url: session.url,
      checkout_session_id: session.id,
    });
  } catch (error: any) {
    console.error('Error starting registration:', error);
    return c.json({ error: error.message || 'Failed to start registration' }, 500);
  }
});

/**
 * Check registration status
 */
app.get('/status/:registrationId', async (c) => {
  try {
    const registrationId = c.req.param('registrationId');
    
    const result = await c.env.DB.prepare(`
      SELECT id, status, company_id, user_id, created_at, completed_at
      FROM pending_registrations WHERE id = ?
    `).bind(registrationId).first();

    if (!result) {
      return c.json({ error: 'Registration not found' }, 404);
    }

    return c.json({
      id: (result as any).id,
      status: (result as any).status,
      company_id: (result as any).company_id,
      user_id: (result as any).user_id,
      created_at: (result as any).created_at,
      completed_at: (result as any).completed_at,
    });
  } catch (error) {
    console.error('Error checking registration status:', error);
    return c.json({ error: 'Failed to check registration status' }, 500);
  }
});

/**
 * Stripe webhook handler
 */
app.post('/webhook/stripe', async (c) => {
  try {
    const signature = c.req.header('stripe-signature');
    const rawBody = await c.req.text();

    if (!c.env.STRIPE_SECRET_KEY || !c.env.STRIPE_WEBHOOK_SECRET) {
      console.error('Stripe not configured');
      return c.json({ error: 'Stripe not configured' }, 500);
    }

    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature || '',
        c.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return c.json({ error: 'Invalid signature' }, 400);
    }

    // Check for idempotency
    const existingEvent = await c.env.DB.prepare(`
      SELECT id FROM stripe_webhook_events WHERE stripe_event_id = ?
    `).bind(event.id).first();

    if (existingEvent) {
      console.log(`Event ${event.id} already processed`);
      return c.json({ received: true, status: 'already_processed' });
    }

    // Record the event
    const eventId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO stripe_webhook_events (id, stripe_event_id, event_type, payload, processing_status, received_at, created_at)
      VALUES (?, ?, ?, ?, 'processing', datetime('now'), datetime('now'))
    `).bind(eventId, event.id, event.type, JSON.stringify(event.data)).run();

    try {
      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutCompleted(c.env.DB, session, event.id);
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice;
          await handleInvoicePaid(c.env.DB, invoice, event.id);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdated(c.env.DB, subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(c.env.DB, subscription);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailed(c.env.DB, invoice);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Mark event as completed
      await c.env.DB.prepare(`
        UPDATE stripe_webhook_events SET processing_status = 'completed', processed_at = datetime('now')
        WHERE id = ?
      `).bind(eventId).run();

    } catch (error: any) {
      // Mark event as failed
      await c.env.DB.prepare(`
        UPDATE stripe_webhook_events SET processing_status = 'failed', error_message = ?, attempts = attempts + 1
        WHERE id = ?
      `).bind(error.message, eventId).run();

      throw error;
    }

    return c.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return c.json({ error: error.message || 'Webhook processing failed' }, 500);
  }
});

// =====================================================
// WEBHOOK HANDLERS
// =====================================================

async function handleCheckoutCompleted(db: D1Database, session: Stripe.Checkout.Session, eventId: string) {
  const registrationId = session.metadata?.registration_id;
  if (!registrationId) {
    console.log('No registration_id in checkout session metadata');
    return;
  }

  const registration = await getPendingRegistrationByCheckout(db, session.id);
  if (!registration) {
    console.log(`Registration not found for checkout session: ${session.id}`);
    return;
  }

  if (registration.status === 'completed') {
    console.log(`Registration ${registrationId} already completed`);
    return;
  }

  // Complete the registration
  const result = await completeRegistration(
    db,
    registrationId,
    session.customer as string,
    session.subscription as string
  );

  console.log(`Registration completed: company=${result.company_id}, user=${result.user_id}`);
}

async function handleInvoicePaid(db: D1Database, invoice: any, eventId: string) {
  if (!invoice.subscription) return;

  // Get subscription to find company and reseller
  const subscription = await db.prepare(`
    SELECT s.*, c.reseller_id
    FROM subscriptions s
    JOIN companies c ON c.id = s.company_id
    WHERE s.stripe_subscription_id = ?
  `).bind(invoice.subscription).first();

  if (!subscription) {
    console.log(`Subscription not found for invoice: ${invoice.id}`);
    return;
  }

  const resellerId = (subscription as any).reseller_id;
  if (!resellerId) {
    console.log('No reseller for this subscription');
    return;
  }

  // Calculate commission (15% on gross, excluding tax)
  const grossAmount = (invoice.subtotal || 0) / 100; // Convert from cents
  const taxAmount = (invoice.tax || 0) / 100;

  // Record commission
  await recordCommission(
    db,
    resellerId,
    (subscription as any).company_id,
    (subscription as any).id,
    invoice.id,
    eventId,
    grossAmount,
    taxAmount,
    invoice.currency?.toUpperCase() || 'USD',
    invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : '',
    invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : ''
  );

  console.log(`Commission recorded for reseller ${resellerId}: $${grossAmount * 0.15}`);
}

async function handleSubscriptionUpdated(db: D1Database, subscription: any) {
  const now = new Date().toISOString();
  
  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    'active': 'active',
    'trialing': 'trial',
    'past_due': 'past_due',
    'canceled': 'cancelled',
    'unpaid': 'suspended',
    'incomplete': 'pending',
    'incomplete_expired': 'cancelled',
  };

  const status = statusMap[subscription.status] || 'active';

  await db.prepare(`
    UPDATE subscriptions
    SET status = ?,
        current_period_start = ?,
        current_period_end = ?,
        updated_at = ?
    WHERE stripe_subscription_id = ?
  `).bind(
    status,
    new Date(subscription.current_period_start * 1000).toISOString(),
    new Date(subscription.current_period_end * 1000).toISOString(),
    now,
    subscription.id
  ).run();

  console.log(`Subscription ${subscription.id} updated to status: ${status}`);
}

async function handleSubscriptionDeleted(db: D1Database, subscription: any) {
  const now = new Date().toISOString();

  await db.prepare(`
    UPDATE subscriptions
    SET status = 'cancelled', cancelled_at = ?, updated_at = ?
    WHERE stripe_subscription_id = ?
  `).bind(now, now, subscription.id).run();

  console.log(`Subscription ${subscription.id} cancelled`);
}

async function handlePaymentFailed(db: D1Database, invoice: any) {
  if (!invoice.subscription) return;

  await db.prepare(`
    UPDATE subscriptions
    SET status = 'past_due', updated_at = datetime('now')
    WHERE stripe_subscription_id = ?
  `).bind(invoice.subscription).run();

  console.log(`Subscription ${invoice.subscription} marked as past_due due to payment failure`);
}

export default app;
