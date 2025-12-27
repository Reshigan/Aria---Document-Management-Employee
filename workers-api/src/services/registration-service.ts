/**
 * Self-Registration Service
 * 
 * Handles the complete self-registration flow:
 * - Create pending registration
 * - Create Stripe Checkout Session
 * - Process successful checkout (webhook)
 * - Create company, user, and subscription
 * - Track referral codes for reseller commissions
 */

import { D1Database } from '@cloudflare/workers-types';

export interface RegistrationInput {
  email: string;
  company_name: string;
  contact_name: string;
  phone?: string;
  country?: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  referral_code?: string;
  promo_code?: string;
}

export interface PendingRegistration {
  id: string;
  email: string;
  company_name: string;
  contact_name: string;
  phone?: string;
  country?: string;
  plan_id: string;
  billing_cycle: string;
  referral_code?: string;
  promo_code?: string;
  stripe_checkout_session_id?: string;
  status: string;
  expires_at?: string;
  completed_at?: string;
  company_id?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  features: Record<string, any>;
  limits: Record<string, any>;
  is_active: boolean;
}

/**
 * Get all active subscription plans
 */
export async function getPlans(db: D1Database): Promise<SubscriptionPlan[]> {
  const result = await db.prepare(`
    SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order ASC
  `).all();

  return (result.results || []).map((row: any) => ({
    ...row,
    features: JSON.parse(row.features || '{}'),
    limits: JSON.parse(row.limits || '{}'),
    is_active: row.is_active === 1,
  }));
}

/**
 * Get a specific plan by ID
 */
export async function getPlan(db: D1Database, planId: string): Promise<SubscriptionPlan | null> {
  const result = await db.prepare(`
    SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1
  `).bind(planId).first();

  if (!result) return null;

  return {
    ...result,
    features: JSON.parse((result as any).features || '{}'),
    limits: JSON.parse((result as any).limits || '{}'),
    is_active: (result as any).is_active === 1,
  } as SubscriptionPlan;
}

/**
 * Validate a referral code and get the reseller
 */
export async function validateReferralCode(
  db: D1Database,
  code: string
): Promise<{ valid: boolean; reseller_id?: string; discount_percent?: number }> {
  const result = await db.prepare(`
    SELECT rc.*, r.status as reseller_status
    FROM referral_codes rc
    JOIN resellers r ON rc.reseller_id = r.id
    WHERE rc.code = ? AND rc.is_active = 1 AND r.status = 'active'
    AND (rc.expires_at IS NULL OR rc.expires_at > datetime('now'))
    AND (rc.max_uses IS NULL OR rc.usage_count < rc.max_uses)
  `).bind(code.toUpperCase()).first();

  if (!result) {
    return { valid: false };
  }

  return {
    valid: true,
    reseller_id: (result as any).reseller_id,
    discount_percent: (result as any).discount_percent || 0,
  };
}

/**
 * Validate a promo code
 */
export async function validatePromoCode(
  db: D1Database,
  code: string
): Promise<{ valid: boolean; discount_type?: string; discount_value?: number; duration_months?: number; stripe_coupon_id?: string }> {
  const result = await db.prepare(`
    SELECT * FROM promo_codes
    WHERE code = ? AND is_active = 1
    AND (valid_from IS NULL OR valid_from <= datetime('now'))
    AND (valid_until IS NULL OR valid_until > datetime('now'))
    AND (max_uses IS NULL OR usage_count < max_uses)
  `).bind(code.toUpperCase()).first();

  if (!result) {
    return { valid: false };
  }

  return {
    valid: true,
    discount_type: (result as any).discount_type,
    discount_value: (result as any).discount_value,
    duration_months: (result as any).duration_months,
    stripe_coupon_id: (result as any).stripe_coupon_id,
  };
}

/**
 * Create a pending registration
 */
export async function createPendingRegistration(
  db: D1Database,
  input: RegistrationInput
): Promise<PendingRegistration> {
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  // Check if email already has a pending registration
  const existing = await db.prepare(`
    SELECT id FROM pending_registrations 
    WHERE email = ? AND status = 'pending' AND expires_at > datetime('now')
  `).bind(input.email).first();

  if (existing) {
    // Return existing pending registration
    const existingReg = await db.prepare(`
      SELECT * FROM pending_registrations WHERE id = ?
    `).bind((existing as any).id).first();
    return existingReg as unknown as PendingRegistration;
  }

  // Check if email already has a company
  const existingCompany = await db.prepare(`
    SELECT c.id FROM companies c
    JOIN users u ON u.company_id = c.id
    WHERE u.email = ?
  `).bind(input.email).first();

  if (existingCompany) {
    throw new Error('An account with this email already exists. Please sign in.');
  }

  await db.prepare(`
    INSERT INTO pending_registrations (
      id, email, company_name, contact_name, phone, country,
      plan_id, billing_cycle, referral_code, promo_code,
      status, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))
  `).bind(
    id,
    input.email,
    input.company_name,
    input.contact_name,
    input.phone || null,
    input.country || null,
    input.plan_id,
    input.billing_cycle,
    input.referral_code || null,
    input.promo_code || null,
    expiresAt.toISOString()
  ).run();

  return {
    id,
    email: input.email,
    company_name: input.company_name,
    contact_name: input.contact_name,
    phone: input.phone,
    country: input.country,
    plan_id: input.plan_id,
    billing_cycle: input.billing_cycle,
    referral_code: input.referral_code,
    promo_code: input.promo_code,
    status: 'pending',
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

/**
 * Update pending registration with Stripe checkout session
 */
export async function updatePendingRegistrationWithCheckout(
  db: D1Database,
  registrationId: string,
  checkoutSessionId: string
): Promise<void> {
  await db.prepare(`
    UPDATE pending_registrations
    SET stripe_checkout_session_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(checkoutSessionId, registrationId).run();
}

/**
 * Get pending registration by checkout session ID
 */
export async function getPendingRegistrationByCheckout(
  db: D1Database,
  checkoutSessionId: string
): Promise<PendingRegistration | null> {
  const result = await db.prepare(`
    SELECT * FROM pending_registrations WHERE stripe_checkout_session_id = ?
  `).bind(checkoutSessionId).first();

  return result as unknown as PendingRegistration | null;
}

/**
 * Complete registration after successful payment
 * Creates company, user, subscription, and tracks referral
 */
export async function completeRegistration(
  db: D1Database,
  registrationId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string
): Promise<{ company_id: string; user_id: string; subscription_id: string }> {
  // Get the pending registration
  const registration = await db.prepare(`
    SELECT * FROM pending_registrations WHERE id = ? AND status = 'pending'
  `).bind(registrationId).first();

  if (!registration) {
    throw new Error('Registration not found or already completed');
  }

  const reg = registration as unknown as PendingRegistration;
  const now = new Date().toISOString();
  const companyId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const subscriptionId = crypto.randomUUID();

  // Get reseller ID from referral code if present
  let resellerId: string | null = null;
  if (reg.referral_code) {
    const referralResult = await validateReferralCode(db, reg.referral_code);
    if (referralResult.valid && referralResult.reseller_id) {
      resellerId = referralResult.reseller_id;
      
      // Increment referral code usage
      await db.prepare(`
        UPDATE referral_codes SET usage_count = usage_count + 1, updated_at = datetime('now')
        WHERE code = ?
      `).bind(reg.referral_code.toUpperCase()).run();
    }
  }

  // Increment promo code usage if present
  if (reg.promo_code) {
    await db.prepare(`
      UPDATE promo_codes SET usage_count = usage_count + 1, updated_at = datetime('now')
      WHERE code = ?
    `).bind(reg.promo_code.toUpperCase()).run();
  }

  // Create company
  await db.prepare(`
    INSERT INTO companies (id, name, country, reseller_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(companyId, reg.company_name, reg.country || null, resellerId, now, now).run();

  // Create user (admin)
  const tempPassword = crypto.randomUUID().substring(0, 12);
  await db.prepare(`
    INSERT INTO users (id, company_id, email, name, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'admin', 1, ?, ?)
  `).bind(userId, companyId, reg.email, reg.contact_name, now, now).run();

  // Create Stripe customer record
  await db.prepare(`
    INSERT INTO stripe_customers (id, company_id, stripe_customer_id, email, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), companyId, stripeCustomerId, reg.email, reg.contact_name, now, now).run();

  // Calculate subscription period
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + (reg.billing_cycle === 'yearly' ? 12 : 1));

  // Create subscription
  await db.prepare(`
    INSERT INTO subscriptions (
      id, company_id, plan_id, status, billing_cycle,
      current_period_start, current_period_end,
      stripe_subscription_id, stripe_customer_id,
      referral_code, reseller_id, created_at, updated_at
    ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    subscriptionId,
    companyId,
    reg.plan_id,
    reg.billing_cycle,
    now,
    periodEnd.toISOString(),
    stripeSubscriptionId,
    stripeCustomerId,
    reg.referral_code || null,
    resellerId,
    now,
    now
  ).run();

  // Mark registration as completed
  await db.prepare(`
    UPDATE pending_registrations
    SET status = 'completed', completed_at = ?, company_id = ?, user_id = ?, updated_at = ?
    WHERE id = ?
  `).bind(now, companyId, userId, now, registrationId).run();

  return {
    company_id: companyId,
    user_id: userId,
    subscription_id: subscriptionId,
  };
}

/**
 * Create Stripe Checkout Session
 * This function prepares the data for Stripe - actual API call happens in route
 */
export function buildCheckoutSessionParams(
  registration: PendingRegistration,
  plan: SubscriptionPlan,
  successUrl: string,
  cancelUrl: string,
  promoDiscount?: { stripe_coupon_id?: string }
): {
  mode: string;
  customer_email: string;
  line_items: Array<{ price_data: any; quantity: number }>;
  subscription_data: any;
  success_url: string;
  cancel_url: string;
  metadata: Record<string, string>;
  discounts?: Array<{ coupon: string }>;
} {
  const price = registration.billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
  const interval = registration.billing_cycle === 'yearly' ? 'year' : 'month';

  const params: any = {
    mode: 'subscription',
    customer_email: registration.email,
    line_items: [
      {
        price_data: {
          currency: plan.currency.toLowerCase(),
          product_data: {
            name: `ARIA ERP - ${plan.name}`,
            description: plan.description,
          },
          unit_amount: Math.round(price * 100), // Stripe uses cents
          recurring: {
            interval: interval,
          },
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        registration_id: registration.id,
        plan_id: plan.id,
        referral_code: registration.referral_code || '',
      },
      trial_period_days: 14, // 14-day free trial
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      registration_id: registration.id,
      plan_id: plan.id,
      company_name: registration.company_name,
      referral_code: registration.referral_code || '',
    },
  };

  // Add coupon if promo code has a Stripe coupon
  if (promoDiscount?.stripe_coupon_id) {
    params.discounts = [{ coupon: promoDiscount.stripe_coupon_id }];
  }

  return params;
}

/**
 * Record a commission for a reseller
 */
export async function recordCommission(
  db: D1Database,
  resellerId: string,
  companyId: string,
  subscriptionId: string,
  stripeInvoiceId: string,
  stripeEventId: string,
  grossAmount: number,
  taxAmount: number,
  currency: string,
  periodStart: string,
  periodEnd: string
): Promise<string> {
  // Check for idempotency - don't record same event twice
  const existing = await db.prepare(`
    SELECT id FROM commission_ledger WHERE stripe_event_id = ?
  `).bind(stripeEventId).first();

  if (existing) {
    return (existing as any).id;
  }

  // Get reseller's commission rate
  const reseller = await db.prepare(`
    SELECT commission_rate FROM resellers WHERE id = ? AND status = 'active'
  `).bind(resellerId).first();

  if (!reseller) {
    throw new Error('Reseller not found or not active');
  }

  const commissionRate = (reseller as any).commission_rate || 0.15;
  const netAmount = grossAmount - taxAmount;
  const commissionAmount = grossAmount * commissionRate; // 15% on gross (pre-tax)

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO commission_ledger (
      id, reseller_id, company_id, subscription_id,
      stripe_invoice_id, stripe_event_id,
      period_start, period_end,
      gross_amount, tax_amount, net_amount,
      commission_rate, commission_amount, currency,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'accrued', ?, ?)
  `).bind(
    id,
    resellerId,
    companyId,
    subscriptionId,
    stripeInvoiceId,
    stripeEventId,
    periodStart,
    periodEnd,
    grossAmount,
    taxAmount,
    netAmount,
    commissionRate,
    commissionAmount,
    currency,
    now,
    now
  ).run();

  return id;
}

/**
 * Get reseller's commission summary
 */
export async function getResellerCommissionSummary(
  db: D1Database,
  resellerId: string
): Promise<{
  total_earned: number;
  total_paid: number;
  pending_payout: number;
  commission_count: number;
  referred_companies: number;
}> {
  const stats = await db.prepare(`
    SELECT
      COALESCE(SUM(commission_amount), 0) as total_earned,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as total_paid,
      COALESCE(SUM(CASE WHEN status IN ('accrued', 'approved') THEN commission_amount ELSE 0 END), 0) as pending_payout,
      COUNT(*) as commission_count,
      COUNT(DISTINCT company_id) as referred_companies
    FROM commission_ledger
    WHERE reseller_id = ? AND status != 'void'
  `).bind(resellerId).first();

  return {
    total_earned: (stats as any)?.total_earned || 0,
    total_paid: (stats as any)?.total_paid || 0,
    pending_payout: (stats as any)?.pending_payout || 0,
    commission_count: (stats as any)?.commission_count || 0,
    referred_companies: (stats as any)?.referred_companies || 0,
  };
}

export default {
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
  getResellerCommissionSummary,
};
