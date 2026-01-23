/**
 * Customer Portal Service
 * 
 * Provides functionality for:
 * - Customer self-service portal access
 * - View and pay invoices online
 * - View statements and payment history
 * - Secure token-based access
 */

import { D1Database } from '@cloudflare/workers-types';

export interface PortalAccess {
  id: string;
  company_id: string;
  customer_id: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  last_login_at: string | null;
  login_count: number;
  created_at: string;
  updated_at: string;
}

export interface PortalInvite {
  id: string;
  company_id: string;
  customer_id: string;
  email: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface PortalSession {
  id: string;
  portal_access_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface CustomerPortalData {
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
  };
  summary: {
    total_outstanding: number;
    total_overdue: number;
    invoices_count: number;
    overdue_count: number;
  };
  invoices: Array<{
    id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    total_amount: number;
    amount_paid: number;
    balance_due: number;
    status: string;
    is_overdue: boolean;
  }>;
  payments: Array<{
    id: string;
    payment_date: string;
    amount: number;
    payment_method: string;
    reference: string | null;
    invoice_number: string | null;
  }>;
}

// Generate a secure random token
function generateToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Hash password using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Create portal invite for a customer
export async function createPortalInvite(
  db: D1Database,
  companyId: string,
  customerId: string,
  email: string
): Promise<{ inviteId: string; token: string; inviteUrl: string }> {
  const id = crypto.randomUUID();
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  await db.prepare(`
    INSERT INTO portal_invites (
      id, company_id, customer_id, email, token, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    companyId,
    customerId,
    email,
    token,
    expiresAt.toISOString(),
    now.toISOString()
  ).run();
  
  // Get company domain for invite URL
  const company = await db.prepare(`
    SELECT domain FROM companies WHERE id = ?
  `).bind(companyId).first<{ domain: string }>();
  
  const domain = company?.domain || 'aria.vantax.co.za';
  const inviteUrl = `https://${domain}/portal/accept-invite?token=${token}`;
  
  return { inviteId: id, token, inviteUrl };
}

// Accept portal invite and create access
export async function acceptPortalInvite(
  db: D1Database,
  token: string,
  password: string
): Promise<{ success: boolean; error?: string; accessId?: string }> {
  const now = new Date().toISOString();
  
  // Find valid invite
  const invite = await db.prepare(`
    SELECT * FROM portal_invites
    WHERE token = ? AND accepted_at IS NULL AND expires_at > ?
  `).bind(token, now).first<PortalInvite>();
  
  if (!invite) {
    return { success: false, error: 'Invalid or expired invite' };
  }
  
  // Check if access already exists
  const existingAccess = await db.prepare(`
    SELECT id FROM portal_access WHERE customer_id = ? AND company_id = ?
  `).bind(invite.customer_id, invite.company_id).first();
  
  if (existingAccess) {
    return { success: false, error: 'Portal access already exists for this customer' };
  }
  
  // Create portal access
  const accessId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  
  await db.prepare(`
    INSERT INTO portal_access (
      id, company_id, customer_id, email, password_hash,
      is_active, login_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)
  `).bind(
    accessId,
    invite.company_id,
    invite.customer_id,
    invite.email,
    passwordHash,
    now,
    now
  ).run();
  
  // Mark invite as accepted
  await db.prepare(`
    UPDATE portal_invites SET accepted_at = ? WHERE id = ?
  `).bind(now, invite.id).run();
  
  return { success: true, accessId };
}

// Portal login
export async function portalLogin(
  db: D1Database,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; token?: string; expiresAt?: string; customerId?: string; companyId?: string }> {
  const access = await db.prepare(`
    SELECT * FROM portal_access WHERE email = ? AND is_active = 1
  `).bind(email).first<PortalAccess>();
  
  if (!access) {
    return { success: false, error: 'Invalid email or password' };
  }
  
  const passwordValid = await verifyPassword(password, access.password_hash);
  if (!passwordValid) {
    return { success: false, error: 'Invalid email or password' };
  }
  
  // Create session
  const sessionId = crypto.randomUUID();
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  
  await db.prepare(`
    INSERT INTO portal_sessions (id, portal_access_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(sessionId, access.id, token, expiresAt.toISOString(), now.toISOString()).run();
  
  // Update login stats
  await db.prepare(`
    UPDATE portal_access SET last_login_at = ?, login_count = login_count + 1, updated_at = ?
    WHERE id = ?
  `).bind(now.toISOString(), now.toISOString(), access.id).run();
  
  return {
    success: true,
    token,
    expiresAt: expiresAt.toISOString(),
    customerId: access.customer_id,
    companyId: access.company_id
  };
}

// Validate portal session
export async function validatePortalSession(
  db: D1Database,
  token: string
): Promise<{ valid: boolean; customerId?: string; companyId?: string }> {
  const now = new Date().toISOString();
  
  const session = await db.prepare(`
    SELECT ps.*, pa.customer_id, pa.company_id
    FROM portal_sessions ps
    JOIN portal_access pa ON ps.portal_access_id = pa.id
    WHERE ps.token = ? AND ps.expires_at > ? AND pa.is_active = 1
  `).bind(token, now).first<any>();
  
  if (!session) {
    return { valid: false };
  }
  
  return {
    valid: true,
    customerId: session.customer_id,
    companyId: session.company_id
  };
}

// Portal logout
export async function portalLogout(db: D1Database, token: string): Promise<void> {
  await db.prepare(`
    DELETE FROM portal_sessions WHERE token = ?
  `).bind(token).run();
}

// Get customer portal data
export async function getCustomerPortalData(
  db: D1Database,
  companyId: string,
  customerId: string
): Promise<CustomerPortalData> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get customer details
  const customer = await db.prepare(`
    SELECT id, customer_name as name, email, phone, address
    FROM customers WHERE id = ? AND company_id = ?
  `).bind(customerId, companyId).first<any>();
  
  if (!customer) {
    throw new Error('Customer not found');
  }
  
  // Get invoices
  const invoices = await db.prepare(`
    SELECT id, invoice_number, invoice_date, due_date, total_amount,
           amount_paid, balance_due, status
    FROM customer_invoices
    WHERE customer_id = ? AND company_id = ?
      AND status NOT IN ('draft', 'cancelled')
    ORDER BY invoice_date DESC
    LIMIT 50
  `).bind(customerId, companyId).all();
  
  // Get payments
  const payments = await db.prepare(`
    SELECT pt.id, pt.payment_date, pt.amount, pt.payment_method,
           pt.payer_reference as reference, ci.invoice_number
    FROM payment_transactions pt
    LEFT JOIN customer_invoices ci ON pt.invoice_id = ci.id
    WHERE pt.payer_reference = ? AND pt.company_id = ? AND pt.status = 'completed'
    ORDER BY pt.payment_date DESC
    LIMIT 50
  `).bind(customerId, companyId).all();
  
  // Calculate summary
  const invoiceList = (invoices.results || []) as any[];
  const totalOutstanding = invoiceList.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
  const overdueInvoices = invoiceList.filter(inv => inv.due_date < today && inv.balance_due > 0);
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
  
  return {
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address
    },
    summary: {
      total_outstanding: totalOutstanding,
      total_overdue: totalOverdue,
      invoices_count: invoiceList.filter(inv => inv.balance_due > 0).length,
      overdue_count: overdueInvoices.length
    },
    invoices: invoiceList.map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date,
      total_amount: inv.total_amount,
      amount_paid: inv.amount_paid,
      balance_due: inv.balance_due,
      status: inv.status,
      is_overdue: inv.due_date < today && inv.balance_due > 0
    })),
    payments: (payments.results || []).map((pmt: any) => ({
      id: pmt.id,
      payment_date: pmt.payment_date,
      amount: pmt.amount,
      payment_method: pmt.payment_method,
      reference: pmt.reference,
      invoice_number: pmt.invoice_number
    }))
  };
}

// Get invoice details for portal
export async function getPortalInvoiceDetails(
  db: D1Database,
  companyId: string,
  customerId: string,
  invoiceId: string
): Promise<any> {
  const invoice = await db.prepare(`
    SELECT ci.*, c.customer_name, co.name as company_name, co.address as company_address,
           co.phone as company_phone, co.email as company_email
    FROM customer_invoices ci
    JOIN customers c ON ci.customer_id = c.id
    JOIN companies co ON ci.company_id = co.id
    WHERE ci.id = ? AND ci.company_id = ? AND ci.customer_id = ?
  `).bind(invoiceId, companyId, customerId).first<any>();
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  const items = await db.prepare(`
    SELECT * FROM customer_invoice_items WHERE invoice_id = ? ORDER BY sort_order
  `).bind(invoiceId).all();
  
  return {
    ...invoice,
    items: items.results || []
  };
}

// Create payment link for invoice
export async function createPortalPaymentLink(
  db: D1Database,
  companyId: string,
  customerId: string,
  invoiceId: string
): Promise<{ paymentUrl: string; transactionId: string }> {
  const invoice = await db.prepare(`
    SELECT id, invoice_number, balance_due, currency
    FROM customer_invoices
    WHERE id = ? AND company_id = ? AND customer_id = ? AND balance_due > 0
  `).bind(invoiceId, companyId, customerId).first<any>();
  
  if (!invoice) {
    throw new Error('Invoice not found or already paid');
  }
  
  // Create payment transaction
  const transactionId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO payment_transactions (
      id, company_id, payment_type, amount, currency, status,
      payer_reference, invoice_id, created_at
    ) VALUES (?, ?, 'invoice', ?, ?, 'pending', ?, ?, ?)
  `).bind(
    transactionId,
    companyId,
    invoice.balance_due,
    invoice.currency || 'ZAR',
    customerId,
    invoiceId,
    now
  ).run();
  
  // Generate payment URL (would integrate with payment provider in production)
  const paymentUrl = `https://pay.aria-erp.com/${transactionId}`;
  
  return { paymentUrl, transactionId };
}

// Reset portal password
export async function resetPortalPassword(
  db: D1Database,
  email: string
): Promise<{ success: boolean; token?: string }> {
  const access = await db.prepare(`
    SELECT id, company_id FROM portal_access WHERE email = ? AND is_active = 1
  `).bind(email).first<any>();
  
  if (!access) {
    // Don't reveal if email exists
    return { success: true };
  }
  
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour
  
  await db.prepare(`
    INSERT INTO password_reset_tokens (id, portal_access_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), access.id, token, expiresAt.toISOString(), now.toISOString()).run();
  
  return { success: true, token };
}

// Complete password reset
export async function completePasswordReset(
  db: D1Database,
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();
  
  const resetToken = await db.prepare(`
    SELECT * FROM password_reset_tokens
    WHERE token = ? AND used_at IS NULL AND expires_at > ?
  `).bind(token, now).first<any>();
  
  if (!resetToken) {
    return { success: false, error: 'Invalid or expired reset token' };
  }
  
  const passwordHash = await hashPassword(newPassword);
  
  await db.prepare(`
    UPDATE portal_access SET password_hash = ?, updated_at = ? WHERE id = ?
  `).bind(passwordHash, now, resetToken.portal_access_id).run();
  
  await db.prepare(`
    UPDATE password_reset_tokens SET used_at = ? WHERE id = ?
  `).bind(now, resetToken.id).run();
  
  // Invalidate all sessions
  await db.prepare(`
    DELETE FROM portal_sessions WHERE portal_access_id = ?
  `).bind(resetToken.portal_access_id).run();
  
  return { success: true };
}

// List portal users for a company
export async function listPortalUsers(
  db: D1Database,
  companyId: string
): Promise<Array<{
  id: string;
  customer_id: string;
  customer_name: string;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  login_count: number;
}>> {
  const result = await db.prepare(`
    SELECT pa.id, pa.customer_id, c.customer_name, pa.email, pa.is_active,
           pa.last_login_at, pa.login_count
    FROM portal_access pa
    JOIN customers c ON pa.customer_id = c.id
    WHERE pa.company_id = ?
    ORDER BY c.customer_name
  `).bind(companyId).all();
  
  return (result.results || []).map((row: any) => ({
    id: row.id,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    email: row.email,
    is_active: Boolean(row.is_active),
    last_login_at: row.last_login_at,
    login_count: row.login_count
  }));
}

// Disable portal access
export async function disablePortalAccess(
  db: D1Database,
  companyId: string,
  accessId: string
): Promise<void> {
  await db.prepare(`
    UPDATE portal_access SET is_active = 0, updated_at = ? WHERE id = ? AND company_id = ?
  `).bind(new Date().toISOString(), accessId, companyId).run();
  
  // Delete all sessions
  await db.prepare(`
    DELETE FROM portal_sessions WHERE portal_access_id = ?
  `).bind(accessId).run();
}

export default {
  createPortalInvite,
  acceptPortalInvite,
  portalLogin,
  validatePortalSession,
  portalLogout,
  getCustomerPortalData,
  getPortalInvoiceDetails,
  createPortalPaymentLink,
  resetPortalPassword,
  completePasswordReset,
  listPortalUsers,
  disablePortalAccess
};
