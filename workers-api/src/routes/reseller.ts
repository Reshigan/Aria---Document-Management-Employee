/**
 * Reseller Routes
 * 
 * Endpoints for:
 * - Reseller application submission (public)
 * - Reseller portal (authenticated resellers)
 * - Admin management of resellers and payouts
 */

import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';
import { jwtVerify } from 'jose';
import {
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
} from '../services/reseller-service';
import { getResellerCommissionSummary } from '../services/registration-service';

interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Helper to verify JWT and get user info
async function getAuthenticatedUser(c: any): Promise<{ user_id: string; email: string; role: string; company_id?: string } | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const token = authHeader.substring(7);
    const secretKey = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return {
      user_id: (payload as any).sub || (payload as any).user_id,
      email: (payload as any).email,
      role: (payload as any).role || 'user',
      company_id: (payload as any).company_id,
    };
  } catch {
    return null;
  }
}

// Check if user is platform admin
function isPlatformAdmin(user: { role: string } | null): boolean {
  return user?.role === 'super_admin' || user?.role === 'platform_admin';
}

// =====================================================
// PUBLIC ENDPOINTS (no auth required)
// =====================================================

/**
 * Submit a reseller application
 */
app.post('/apply', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    
    // Validate required fields
    const required = ['company_name', 'contact_name', 'email', 'terms_accepted'];
    for (const field of required) {
      if (!body[field]) {
        return c.json({ error: `Missing required field: ${field}` }, 400);
      }
    }

    if (!body.terms_accepted) {
      return c.json({ error: 'You must accept the terms and conditions' }, 400);
    }

    const application = await submitResellerApplication(c.env.DB, {
      company_name: body.company_name,
      contact_name: body.contact_name,
      email: body.email,
      phone: body.phone,
      address: body.address,
      city: body.city,
      country: body.country,
      tax_number: body.tax_number,
      website: body.website,
      business_description: body.business_description,
      target_market: body.target_market,
      expected_monthly_referrals: body.expected_monthly_referrals,
      terms_accepted: body.terms_accepted,
      terms_accepted_at: body.terms_accepted ? new Date().toISOString() : undefined,
    });

    return c.json({
      message: 'Application submitted successfully',
      application_id: application.id,
      status: application.status,
    });
  } catch (error: any) {
    console.error('Error submitting application:', error);
    return c.json({ error: error.message || 'Failed to submit application' }, 500);
  }
});

/**
 * Check application status (by email)
 */
app.get('/application-status', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const email = c.req.query('email');
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    const result = await c.env.DB.prepare(`
      SELECT id, status, created_at, reviewed_at, rejection_reason
      FROM reseller_applications WHERE email = ?
      ORDER BY created_at DESC LIMIT 1
    `).bind(email).first();

    if (!result) {
      return c.json({ found: false });
    }

    return c.json({
      found: true,
      application_id: (result as any).id,
      status: (result as any).status,
      created_at: (result as any).created_at,
      reviewed_at: (result as any).reviewed_at,
      rejection_reason: (result as any).rejection_reason,
    });
  } catch (error) {
    console.error('Error checking application status:', error);
    return c.json({ error: 'Failed to check application status' }, 500);
  }
});

/**
 * Upload document for application
 */
app.post('/application/:applicationId/documents', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const applicationId = c.req.param('applicationId');
    
    // Verify application exists and is in valid state
    const application = await getResellerApplication(c.env.DB, applicationId);
    if (!application) {
      return c.json({ error: 'Application not found' }, 404);
    }

    if (application.status !== 'submitted' && application.status !== 'under_review') {
      return c.json({ error: 'Cannot upload documents for this application' }, 400);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as unknown as File;
    const documentType = formData.get('document_type') as string;

    if (!file || !documentType) {
      return c.json({ error: 'File and document_type are required' }, 400);
    }

    // Validate document type
    const validTypes = ['business_registration', 'tax_certificate', 'bank_proof', 'id_document', 'address_proof', 'signed_agreement'];
    if (!validTypes.includes(documentType)) {
      return c.json({ error: `Invalid document type. Must be one of: ${validTypes.join(', ')}` }, 400);
    }

    // Upload to R2
    const r2Key = `reseller-docs/${applicationId}/${documentType}-${Date.now()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    
    if (c.env.R2_BUCKET) {
      await c.env.R2_BUCKET.put(r2Key, arrayBuffer, {
        httpMetadata: { contentType: file.type },
      });
    }

    // Record in database
    const document = await addResellerDocument(
      c.env.DB,
      applicationId,
      documentType,
      file.name,
      r2Key,
      file.size,
      file.type
    );

    return c.json({
      message: 'Document uploaded successfully',
      document_id: document.id,
      document_type: document.document_type,
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return c.json({ error: error.message || 'Failed to upload document' }, 500);
  }
});

// =====================================================
// RESELLER PORTAL (authenticated resellers)
// =====================================================

/**
 * Get reseller dashboard
 */
app.get('/portal/dashboard', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    // Get reseller by email
    const reseller = await getResellerByEmail(c.env.DB, user.email);
    if (!reseller) {
      return c.json({ error: 'Reseller account not found' }, 404);
    }

    // Get commission summary
    const summary = await getResellerCommissionSummary(c.env.DB, reseller.id);

    // Get referral codes
    const referralCodes = await getResellerReferralCodes(c.env.DB, reseller.id);

    // Get recent commissions
    const { commissions: recentCommissions } = await getResellerCommissions(c.env.DB, reseller.id, { limit: 5 });

    // Get referred companies
    const referredCompanies = await getResellerReferredCompanies(c.env.DB, reseller.id);

    return c.json({
      reseller: {
        id: reseller.id,
        company_name: reseller.company_name,
        contact_name: reseller.contact_name,
        email: reseller.email,
        status: reseller.status,
        commission_rate: reseller.commission_rate,
      },
      summary,
      referral_codes: referralCodes,
      recent_commissions: recentCommissions,
      referred_companies: referredCompanies,
    });
  } catch (error) {
    console.error('Error fetching reseller dashboard:', error);
    return c.json({ error: 'Failed to fetch dashboard' }, 500);
  }
});

/**
 * Get reseller's commissions
 */
app.get('/portal/commissions', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const reseller = await getResellerByEmail(c.env.DB, user.email);
    if (!reseller) {
      return c.json({ error: 'Reseller account not found' }, 404);
    }

    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const { commissions, total } = await getResellerCommissions(c.env.DB, reseller.id, {
      status,
      limit,
      offset,
    });

    return c.json({ commissions, total, limit, offset });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    return c.json({ error: 'Failed to fetch commissions' }, 500);
  }
});

/**
 * Get reseller's payouts
 */
app.get('/portal/payouts', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const reseller = await getResellerByEmail(c.env.DB, user.email);
    if (!reseller) {
      return c.json({ error: 'Reseller account not found' }, 404);
    }

    const payouts = await getResellerPayouts(c.env.DB, reseller.id);
    return c.json({ payouts });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return c.json({ error: 'Failed to fetch payouts' }, 500);
  }
});

/**
 * Create a new referral code
 */
app.post('/portal/referral-codes', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const reseller = await getResellerByEmail(c.env.DB, user.email);
    if (!reseller) {
      return c.json({ error: 'Reseller account not found' }, 404);
    }

    const body = await c.req.json();
    const referralCode = await createReferralCode(c.env.DB, reseller.id, {
      code: body.code,
      description: body.description,
      discount_percent: body.discount_percent,
      max_uses: body.max_uses,
      expires_at: body.expires_at,
    });

    return c.json({ referral_code: referralCode });
  } catch (error: any) {
    console.error('Error creating referral code:', error);
    return c.json({ error: error.message || 'Failed to create referral code' }, 500);
  }
});

/**
 * Update bank details
 */
app.put('/portal/bank-details', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const reseller = await getResellerByEmail(c.env.DB, user.email);
    if (!reseller) {
      return c.json({ error: 'Reseller account not found' }, 404);
    }

    const body = await c.req.json();
    await updateResellerBankDetails(c.env.DB, reseller.id, {
      bank_name: body.bank_name,
      bank_account_number: body.bank_account_number,
      bank_routing_number: body.bank_routing_number,
      bank_swift_code: body.bank_swift_code,
    });

    return c.json({ message: 'Bank details updated successfully' });
  } catch (error) {
    console.error('Error updating bank details:', error);
    return c.json({ error: 'Failed to update bank details' }, 500);
  }
});

// =====================================================
// ADMIN ENDPOINTS (platform admin only)
// =====================================================

/**
 * List all reseller applications (admin)
 */
app.get('/admin/applications', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!isPlatformAdmin(user)) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const { applications, total } = await listResellerApplications(c.env.DB, {
      status,
      limit,
      offset,
    });

    return c.json({ applications, total, limit, offset });
  } catch (error) {
    console.error('Error listing applications:', error);
    return c.json({ error: 'Failed to list applications' }, 500);
  }
});

/**
 * Get application details (admin)
 */
app.get('/admin/applications/:applicationId', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!isPlatformAdmin(user)) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const applicationId = c.req.param('applicationId');
    const application = await getResellerApplication(c.env.DB, applicationId);
    
    if (!application) {
      return c.json({ error: 'Application not found' }, 404);
    }

    const documents = await getApplicationDocuments(c.env.DB, applicationId);

    return c.json({ application, documents });
  } catch (error) {
    console.error('Error fetching application:', error);
    return c.json({ error: 'Failed to fetch application' }, 500);
  }
});

/**
 * Approve application (admin)
 */
app.post('/admin/applications/:applicationId/approve', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!isPlatformAdmin(user)) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const applicationId = c.req.param('applicationId');
    const reseller = await approveResellerApplication(c.env.DB, applicationId, user!.user_id);

    return c.json({
      message: 'Application approved successfully',
      reseller_id: reseller.id,
      referral_code: (await getResellerReferralCodes(c.env.DB, reseller.id))[0]?.code,
    });
  } catch (error: any) {
    console.error('Error approving application:', error);
    return c.json({ error: error.message || 'Failed to approve application' }, 500);
  }
});

/**
 * Reject application (admin)
 */
app.post('/admin/applications/:applicationId/reject', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!isPlatformAdmin(user)) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const applicationId = c.req.param('applicationId');
    const body = await c.req.json();

    if (!body.reason) {
      return c.json({ error: 'Rejection reason is required' }, 400);
    }

    await rejectResellerApplication(c.env.DB, applicationId, user!.user_id, body.reason);

    return c.json({ message: 'Application rejected' });
  } catch (error: any) {
    console.error('Error rejecting application:', error);
    return c.json({ error: error.message || 'Failed to reject application' }, 500);
  }
});

/**
 * List all resellers (admin)
 */
app.get('/admin/resellers', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!isPlatformAdmin(user)) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const { resellers, total } = await listResellers(c.env.DB, { status, limit, offset });

    // Get commission summary for each reseller
    const resellersWithStats = await Promise.all(
      resellers.map(async (reseller) => {
        const summary = await getResellerCommissionSummary(c.env.DB, reseller.id);
        return { ...reseller, ...summary };
      })
    );

    return c.json({ resellers: resellersWithStats, total, limit, offset });
  } catch (error) {
    console.error('Error listing resellers:', error);
    return c.json({ error: 'Failed to list resellers' }, 500);
  }
});

/**
 * Get reseller details (admin)
 */
app.get('/admin/resellers/:resellerId', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!isPlatformAdmin(user)) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const resellerId = c.req.param('resellerId');
    const reseller = await getReseller(c.env.DB, resellerId);
    
    if (!reseller) {
      return c.json({ error: 'Reseller not found' }, 404);
    }

    const summary = await getResellerCommissionSummary(c.env.DB, resellerId);
    const referralCodes = await getResellerReferralCodes(c.env.DB, resellerId);
    const referredCompanies = await getResellerReferredCompanies(c.env.DB, resellerId);
    const { commissions } = await getResellerCommissions(c.env.DB, resellerId, { limit: 20 });
    const payouts = await getResellerPayouts(c.env.DB, resellerId);

    return c.json({
      reseller,
      summary,
      referral_codes: referralCodes,
      referred_companies: referredCompanies,
      recent_commissions: commissions,
      payouts,
    });
  } catch (error) {
    console.error('Error fetching reseller:', error);
    return c.json({ error: 'Failed to fetch reseller' }, 500);
  }
});

/**
 * List all payouts (admin)
 */
app.get('/admin/payouts', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!isPlatformAdmin(user)) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const { payouts, total } = await listAllPayouts(c.env.DB, { status, limit, offset });

    return c.json({ payouts, total, limit, offset });
  } catch (error) {
    console.error('Error listing payouts:', error);
    return c.json({ error: 'Failed to list payouts' }, 500);
  }
});

/**
 * Create payout for reseller (admin)
 */
app.post('/admin/resellers/:resellerId/payouts', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!isPlatformAdmin(user)) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const resellerId = c.req.param('resellerId');
    const body = await c.req.json();

    if (!body.commission_ids || !Array.isArray(body.commission_ids) || body.commission_ids.length === 0) {
      return c.json({ error: 'commission_ids array is required' }, 400);
    }

    const payout = await createPayout(c.env.DB, resellerId, body.commission_ids, user!.user_id);

    return c.json({
      message: 'Payout created successfully',
      payout,
    });
  } catch (error: any) {
    console.error('Error creating payout:', error);
    return c.json({ error: error.message || 'Failed to create payout' }, 500);
  }
});

/**
 * Mark payout as paid (admin)
 */
app.post('/admin/payouts/:payoutId/mark-paid', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!isPlatformAdmin(user)) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const payoutId = c.req.param('payoutId');
    const body = await c.req.json();

    if (!body.payment_method || !body.payment_reference) {
      return c.json({ error: 'payment_method and payment_reference are required' }, 400);
    }

    await markPayoutAsPaid(c.env.DB, payoutId, user!.user_id, {
      payment_method: body.payment_method,
      payment_reference: body.payment_reference,
      payment_proof_r2_key: body.payment_proof_r2_key,
      notes: body.notes,
    });

    return c.json({ message: 'Payout marked as paid' });
  } catch (error: any) {
    console.error('Error marking payout as paid:', error);
    return c.json({ error: error.message || 'Failed to mark payout as paid' }, 500);
  }
});

/**
 * Get commission statistics (admin)
 */
app.get('/admin/stats', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!isPlatformAdmin(user)) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const stats = await c.env.DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM resellers WHERE status = 'active') as active_resellers,
        (SELECT COUNT(*) FROM reseller_applications WHERE status = 'submitted') as pending_applications,
        (SELECT COALESCE(SUM(commission_amount), 0) FROM commission_ledger WHERE status != 'void') as total_commissions,
        (SELECT COALESCE(SUM(commission_amount), 0) FROM commission_ledger WHERE status = 'paid') as paid_commissions,
        (SELECT COALESCE(SUM(commission_amount), 0) FROM commission_ledger WHERE status IN ('accrued', 'approved')) as pending_commissions,
        (SELECT COUNT(DISTINCT company_id) FROM commission_ledger) as referred_companies,
        (SELECT COUNT(*) FROM payouts WHERE status = 'pending') as pending_payouts
    `).first();

    return c.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

export default app;
