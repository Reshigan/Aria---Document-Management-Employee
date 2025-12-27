/**
 * Reseller Service
 * 
 * Handles reseller management:
 * - Reseller applications
 * - Document management (R2)
 * - Referral codes
 * - Commission tracking
 * - Payout management
 */

import { D1Database } from '@cloudflare/workers-types';

export interface ResellerApplication {
  id: string;
  reseller_id?: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_number?: string;
  website?: string;
  business_description?: string;
  target_market?: string;
  expected_monthly_referrals?: number;
  status: string;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  terms_accepted: boolean;
  terms_accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Reseller {
  id: string;
  user_id?: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_routing_number?: string;
  bank_swift_code?: string;
  commission_rate: number;
  status: string;
  approved_at?: string;
  approved_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ResellerDocument {
  id: string;
  application_id: string;
  reseller_id?: string;
  document_type: string;
  file_name: string;
  r2_key: string;
  file_size?: number;
  mime_type?: string;
  status: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface ReferralCode {
  id: string;
  reseller_id: string;
  code: string;
  description?: string;
  discount_percent: number;
  is_active: boolean;
  usage_count: number;
  max_uses?: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CommissionEntry {
  id: string;
  reseller_id: string;
  company_id: string;
  subscription_id?: string;
  stripe_invoice_id?: string;
  stripe_event_id?: string;
  period_start?: string;
  period_end?: string;
  gross_amount: number;
  tax_amount: number;
  net_amount: number;
  commission_rate: number;
  commission_amount: number;
  currency: string;
  status: string;
  payout_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Payout {
  id: string;
  reseller_id: string;
  payout_number: string;
  total_amount: number;
  currency: string;
  commission_count: number;
  period_start?: string;
  period_end?: string;
  status: string;
  payment_method?: string;
  payment_reference?: string;
  payment_proof_r2_key?: string;
  approved_by?: string;
  approved_at?: string;
  paid_by?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// RESELLER APPLICATIONS
// =====================================================

/**
 * Submit a new reseller application
 */
export async function submitResellerApplication(
  db: D1Database,
  input: Omit<ResellerApplication, 'id' | 'status' | 'created_at' | 'updated_at'>
): Promise<ResellerApplication> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Check if email already has an application
  const existing = await db.prepare(`
    SELECT id, status FROM reseller_applications WHERE email = ?
  `).bind(input.email).first();

  if (existing) {
    const status = (existing as any).status;
    if (status === 'submitted' || status === 'under_review') {
      throw new Error('An application with this email is already pending review.');
    }
    if (status === 'approved') {
      throw new Error('An application with this email has already been approved.');
    }
  }

  await db.prepare(`
    INSERT INTO reseller_applications (
      id, company_name, contact_name, email, phone, address, city, country,
      tax_number, website, business_description, target_market,
      expected_monthly_referrals, status, terms_accepted, terms_accepted_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?)
  `).bind(
    id,
    input.company_name,
    input.contact_name,
    input.email,
    input.phone || null,
    input.address || null,
    input.city || null,
    input.country || null,
    input.tax_number || null,
    input.website || null,
    input.business_description || null,
    input.target_market || null,
    input.expected_monthly_referrals || null,
    input.terms_accepted ? 1 : 0,
    input.terms_accepted ? now : null,
    now,
    now
  ).run();

  return {
    id,
    ...input,
    status: 'submitted',
    terms_accepted: input.terms_accepted,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get reseller application by ID
 */
export async function getResellerApplication(
  db: D1Database,
  applicationId: string
): Promise<ResellerApplication | null> {
  const result = await db.prepare(`
    SELECT * FROM reseller_applications WHERE id = ?
  `).bind(applicationId).first();

  if (!result) return null;

  return {
    ...result,
    terms_accepted: (result as any).terms_accepted === 1,
  } as unknown as ResellerApplication;
}

/**
 * List reseller applications (for admin)
 */
export async function listResellerApplications(
  db: D1Database,
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<{ applications: ResellerApplication[]; total: number }> {
  let query = 'SELECT * FROM reseller_applications WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as count FROM reseller_applications WHERE 1=1';
  const params: any[] = [];

  if (options.status) {
    query += ' AND status = ?';
    countQuery += ' AND status = ?';
    params.push(options.status);
  }

  query += ' ORDER BY created_at DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  if (options.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }

  const [results, countResult] = await Promise.all([
    db.prepare(query).bind(...params).all(),
    db.prepare(countQuery).bind(...(options.status ? [options.status] : [])).first(),
  ]);

  return {
    applications: (results.results || []).map((row: any) => ({
      ...row,
      terms_accepted: row.terms_accepted === 1,
    })) as ResellerApplication[],
    total: (countResult as any)?.count || 0,
  };
}

/**
 * Approve a reseller application
 */
export async function approveResellerApplication(
  db: D1Database,
  applicationId: string,
  approvedBy: string
): Promise<Reseller> {
  const application = await getResellerApplication(db, applicationId);
  if (!application) {
    throw new Error('Application not found');
  }

  if (application.status !== 'submitted' && application.status !== 'under_review') {
    throw new Error(`Cannot approve application with status: ${application.status}`);
  }

  const now = new Date().toISOString();
  const resellerId = crypto.randomUUID();

  // Create reseller record
  await db.prepare(`
    INSERT INTO resellers (
      id, company_name, contact_name, email, phone, address, city, country,
      tax_number, commission_rate, status, approved_at, approved_by,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.15, 'active', ?, ?, ?, ?)
  `).bind(
    resellerId,
    application.company_name,
    application.contact_name,
    application.email,
    application.phone || null,
    application.address || null,
    application.city || null,
    application.country || null,
    application.tax_number || null,
    now,
    approvedBy,
    now,
    now
  ).run();

  // Update application status
  await db.prepare(`
    UPDATE reseller_applications
    SET status = 'approved', reseller_id = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(resellerId, approvedBy, now, now, applicationId).run();

  // Create default referral code
  const referralCode = generateReferralCode(application.company_name);
  await db.prepare(`
    INSERT INTO referral_codes (id, reseller_id, code, description, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).bind(
    crypto.randomUUID(),
    resellerId,
    referralCode,
    `Default referral code for ${application.company_name}`,
    now,
    now
  ).run();

  // Update documents to link to reseller
  await db.prepare(`
    UPDATE reseller_documents SET reseller_id = ? WHERE application_id = ?
  `).bind(resellerId, applicationId).run();

  return {
    id: resellerId,
    company_name: application.company_name,
    contact_name: application.contact_name,
    email: application.email,
    phone: application.phone,
    address: application.address,
    city: application.city,
    country: application.country,
    tax_number: application.tax_number,
    commission_rate: 0.15,
    status: 'active',
    approved_at: now,
    approved_by: approvedBy,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Reject a reseller application
 */
export async function rejectResellerApplication(
  db: D1Database,
  applicationId: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  const now = new Date().toISOString();

  await db.prepare(`
    UPDATE reseller_applications
    SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(reason, rejectedBy, now, now, applicationId).run();
}

// =====================================================
// RESELLER DOCUMENTS
// =====================================================

/**
 * Add a document to an application
 */
export async function addResellerDocument(
  db: D1Database,
  applicationId: string,
  documentType: string,
  fileName: string,
  r2Key: string,
  fileSize?: number,
  mimeType?: string
): Promise<ResellerDocument> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO reseller_documents (
      id, application_id, document_type, file_name, r2_key, file_size, mime_type, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).bind(id, applicationId, documentType, fileName, r2Key, fileSize || null, mimeType || null, now).run();

  return {
    id,
    application_id: applicationId,
    document_type: documentType,
    file_name: fileName,
    r2_key: r2Key,
    file_size: fileSize,
    mime_type: mimeType,
    status: 'pending',
    created_at: now,
  };
}

/**
 * Get documents for an application
 */
export async function getApplicationDocuments(
  db: D1Database,
  applicationId: string
): Promise<ResellerDocument[]> {
  const result = await db.prepare(`
    SELECT * FROM reseller_documents WHERE application_id = ? ORDER BY created_at ASC
  `).bind(applicationId).all();

  return (result.results || []) as unknown as ResellerDocument[];
}

// =====================================================
// RESELLERS
// =====================================================

/**
 * Get reseller by ID
 */
export async function getReseller(
  db: D1Database,
  resellerId: string
): Promise<Reseller | null> {
  const result = await db.prepare(`
    SELECT * FROM resellers WHERE id = ?
  `).bind(resellerId).first();

  return result as unknown as Reseller | null;
}

/**
 * Get reseller by email
 */
export async function getResellerByEmail(
  db: D1Database,
  email: string
): Promise<Reseller | null> {
  const result = await db.prepare(`
    SELECT * FROM resellers WHERE email = ?
  `).bind(email).first();

  return result as unknown as Reseller | null;
}

/**
 * List all resellers (for admin)
 */
export async function listResellers(
  db: D1Database,
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<{ resellers: Reseller[]; total: number }> {
  let query = 'SELECT * FROM resellers WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as count FROM resellers WHERE 1=1';
  const params: any[] = [];

  if (options.status) {
    query += ' AND status = ?';
    countQuery += ' AND status = ?';
    params.push(options.status);
  }

  query += ' ORDER BY created_at DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  if (options.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }

  const [results, countResult] = await Promise.all([
    db.prepare(query).bind(...params).all(),
    db.prepare(countQuery).bind(...(options.status ? [options.status] : [])).first(),
  ]);

  return {
    resellers: (results.results || []) as unknown as Reseller[],
    total: (countResult as any)?.count || 0,
  };
}

/**
 * Update reseller bank details
 */
export async function updateResellerBankDetails(
  db: D1Database,
  resellerId: string,
  bankDetails: {
    bank_name?: string;
    bank_account_number?: string;
    bank_routing_number?: string;
    bank_swift_code?: string;
  }
): Promise<void> {
  const now = new Date().toISOString();

  await db.prepare(`
    UPDATE resellers
    SET bank_name = ?, bank_account_number = ?, bank_routing_number = ?, bank_swift_code = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    bankDetails.bank_name || null,
    bankDetails.bank_account_number || null,
    bankDetails.bank_routing_number || null,
    bankDetails.bank_swift_code || null,
    now,
    resellerId
  ).run();
}

// =====================================================
// REFERRAL CODES
// =====================================================

/**
 * Generate a referral code from company name
 */
function generateReferralCode(companyName: string): string {
  const prefix = companyName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 6);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${suffix}`;
}

/**
 * Create a new referral code for a reseller
 */
export async function createReferralCode(
  db: D1Database,
  resellerId: string,
  options: {
    code?: string;
    description?: string;
    discount_percent?: number;
    max_uses?: number;
    expires_at?: string;
  } = {}
): Promise<ReferralCode> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Get reseller to generate code if not provided
  let code = options.code;
  if (!code) {
    const reseller = await getReseller(db, resellerId);
    if (!reseller) throw new Error('Reseller not found');
    code = generateReferralCode(reseller.company_name);
  }

  // Ensure code is unique
  const existing = await db.prepare(`
    SELECT id FROM referral_codes WHERE code = ?
  `).bind(code.toUpperCase()).first();

  if (existing) {
    throw new Error('Referral code already exists');
  }

  await db.prepare(`
    INSERT INTO referral_codes (
      id, reseller_id, code, description, discount_percent, is_active,
      max_uses, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
  `).bind(
    id,
    resellerId,
    code.toUpperCase(),
    options.description || null,
    options.discount_percent || 0,
    options.max_uses || null,
    options.expires_at || null,
    now,
    now
  ).run();

  return {
    id,
    reseller_id: resellerId,
    code: code.toUpperCase(),
    description: options.description,
    discount_percent: options.discount_percent || 0,
    is_active: true,
    usage_count: 0,
    max_uses: options.max_uses,
    expires_at: options.expires_at,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get referral codes for a reseller
 */
export async function getResellerReferralCodes(
  db: D1Database,
  resellerId: string
): Promise<ReferralCode[]> {
  const result = await db.prepare(`
    SELECT * FROM referral_codes WHERE reseller_id = ? ORDER BY created_at DESC
  `).bind(resellerId).all();

  return (result.results || []).map((row: any) => ({
    ...row,
    is_active: row.is_active === 1,
  })) as ReferralCode[];
}

// =====================================================
// COMMISSIONS
// =====================================================

/**
 * Get commission entries for a reseller
 */
export async function getResellerCommissions(
  db: D1Database,
  resellerId: string,
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<{ commissions: CommissionEntry[]; total: number }> {
  let query = 'SELECT * FROM commission_ledger WHERE reseller_id = ?';
  let countQuery = 'SELECT COUNT(*) as count FROM commission_ledger WHERE reseller_id = ?';
  const params: any[] = [resellerId];

  if (options.status) {
    query += ' AND status = ?';
    countQuery += ' AND status = ?';
    params.push(options.status);
  }

  query += ' ORDER BY created_at DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  if (options.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }

  const [results, countResult] = await Promise.all([
    db.prepare(query).bind(...params).all(),
    db.prepare(countQuery).bind(...(options.status ? [resellerId, options.status] : [resellerId])).first(),
  ]);

  return {
    commissions: (results.results || []) as unknown as CommissionEntry[],
    total: (countResult as any)?.count || 0,
  };
}

/**
 * Get referred companies for a reseller
 */
export async function getResellerReferredCompanies(
  db: D1Database,
  resellerId: string
): Promise<Array<{ company_id: string; company_name: string; plan: string; status: string; created_at: string; total_commission: number }>> {
  const result = await db.prepare(`
    SELECT 
      c.id as company_id,
      c.name as company_name,
      sp.name as plan,
      s.status,
      s.created_at,
      COALESCE(SUM(cl.commission_amount), 0) as total_commission
    FROM companies c
    JOIN subscriptions s ON s.company_id = c.id
    JOIN subscription_plans sp ON sp.id = s.plan_id
    LEFT JOIN commission_ledger cl ON cl.company_id = c.id AND cl.reseller_id = ?
    WHERE c.reseller_id = ?
    GROUP BY c.id, c.name, sp.name, s.status, s.created_at
    ORDER BY s.created_at DESC
  `).bind(resellerId, resellerId).all();

  return (result.results || []) as any[];
}

// =====================================================
// PAYOUTS
// =====================================================

/**
 * Generate payout number
 */
async function generatePayoutNumber(db: D1Database): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}`;

  const lastPayout = await db.prepare(`
    SELECT payout_number FROM payouts
    WHERE payout_number LIKE ?
    ORDER BY payout_number DESC LIMIT 1
  `).bind(`${prefix}%`).first();

  let sequence = 1;
  if (lastPayout) {
    const lastNum = (lastPayout as any).payout_number.split('-')[2];
    sequence = parseInt(lastNum || '0') + 1;
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Create a payout for a reseller
 */
export async function createPayout(
  db: D1Database,
  resellerId: string,
  commissionIds: string[],
  createdBy: string
): Promise<Payout> {
  if (commissionIds.length === 0) {
    throw new Error('No commissions selected for payout');
  }

  // Get commissions and verify they're all for this reseller and unpaid
  const placeholders = commissionIds.map(() => '?').join(',');
  const commissions = await db.prepare(`
    SELECT * FROM commission_ledger
    WHERE id IN (${placeholders}) AND reseller_id = ? AND status IN ('accrued', 'approved')
  `).bind(...commissionIds, resellerId).all();

  if ((commissions.results || []).length !== commissionIds.length) {
    throw new Error('Some commissions are invalid, already paid, or belong to another reseller');
  }

  const totalAmount = (commissions.results || []).reduce(
    (sum: number, c: any) => sum + c.commission_amount,
    0
  );

  const periods = (commissions.results || []).map((c: any) => ({
    start: c.period_start,
    end: c.period_end,
  }));
  const periodStart = periods.reduce((min: string, p: any) => (!min || p.start < min ? p.start : min), '');
  const periodEnd = periods.reduce((max: string, p: any) => (!max || p.end > max ? p.end : max), '');

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const payoutNumber = await generatePayoutNumber(db);

  // Create payout
  await db.prepare(`
    INSERT INTO payouts (
      id, reseller_id, payout_number, total_amount, currency, commission_count,
      period_start, period_end, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'USD', ?, ?, ?, 'pending', ?, ?)
  `).bind(
    id,
    resellerId,
    payoutNumber,
    totalAmount,
    commissionIds.length,
    periodStart || null,
    periodEnd || null,
    now,
    now
  ).run();

  // Create payout items and update commissions
  for (const commissionId of commissionIds) {
    const commission = (commissions.results || []).find((c: any) => c.id === commissionId) as any;
    
    await db.prepare(`
      INSERT INTO payout_items (id, payout_id, commission_id, amount, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), id, commissionId, commission.commission_amount, now).run();

    await db.prepare(`
      UPDATE commission_ledger SET payout_id = ?, status = 'approved', updated_at = ?
      WHERE id = ?
    `).bind(id, now, commissionId).run();
  }

  return {
    id,
    reseller_id: resellerId,
    payout_number: payoutNumber,
    total_amount: totalAmount,
    currency: 'USD',
    commission_count: commissionIds.length,
    period_start: periodStart,
    period_end: periodEnd,
    status: 'pending',
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get payouts for a reseller
 */
export async function getResellerPayouts(
  db: D1Database,
  resellerId: string,
  options: { status?: string; limit?: number } = {}
): Promise<Payout[]> {
  let query = 'SELECT * FROM payouts WHERE reseller_id = ?';
  const params: any[] = [resellerId];

  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }

  query += ' ORDER BY created_at DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const result = await db.prepare(query).bind(...params).all();
  return (result.results || []) as unknown as Payout[];
}

/**
 * Mark payout as paid (admin action)
 */
export async function markPayoutAsPaid(
  db: D1Database,
  payoutId: string,
  paidBy: string,
  paymentDetails: {
    payment_method: string;
    payment_reference: string;
    payment_proof_r2_key?: string;
    notes?: string;
  }
): Promise<void> {
  const now = new Date().toISOString();

  // Update payout
  await db.prepare(`
    UPDATE payouts
    SET status = 'paid', payment_method = ?, payment_reference = ?,
        payment_proof_r2_key = ?, notes = ?, paid_by = ?, paid_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    paymentDetails.payment_method,
    paymentDetails.payment_reference,
    paymentDetails.payment_proof_r2_key || null,
    paymentDetails.notes || null,
    paidBy,
    now,
    now,
    payoutId
  ).run();

  // Update all commissions in this payout
  await db.prepare(`
    UPDATE commission_ledger SET status = 'paid', updated_at = ?
    WHERE payout_id = ?
  `).bind(now, payoutId).run();
}

/**
 * Get all payouts (for admin)
 */
export async function listAllPayouts(
  db: D1Database,
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<{ payouts: (Payout & { reseller_name: string; reseller_email: string })[]; total: number }> {
  let query = `
    SELECT p.*, r.company_name as reseller_name, r.email as reseller_email
    FROM payouts p
    JOIN resellers r ON r.id = p.reseller_id
    WHERE 1=1
  `;
  let countQuery = 'SELECT COUNT(*) as count FROM payouts WHERE 1=1';
  const params: any[] = [];

  if (options.status) {
    query += ' AND p.status = ?';
    countQuery += ' AND status = ?';
    params.push(options.status);
  }

  query += ' ORDER BY p.created_at DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  if (options.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }

  const [results, countResult] = await Promise.all([
    db.prepare(query).bind(...params).all(),
    db.prepare(countQuery).bind(...(options.status ? [options.status] : [])).first(),
  ]);

  return {
    payouts: (results.results || []) as any[],
    total: (countResult as any)?.count || 0,
  };
}

export default {
  submitResellerApplication,
  getResellerApplication,
  listResellerApplications,
  approveResellerApplication,
  rejectResellerApplication,
  addResellerDocument,
  getApplicationDocuments,
  getReseller,
  getResellerByEmail,
  listResellers,
  updateResellerBankDetails,
  createReferralCode,
  getResellerReferralCodes,
  getResellerCommissions,
  getResellerReferredCompanies,
  createPayout,
  getResellerPayouts,
  markPayoutAsPaid,
  listAllPayouts,
};
