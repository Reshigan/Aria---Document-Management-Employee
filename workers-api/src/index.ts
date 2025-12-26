/**
 * ARIA ERP - Cloudflare Workers API
 * Phase 1: Authentication endpoints
 * Phase 2: Core ERP CRUD (Customers, Suppliers, Products, O2C, P2P)
 * Phase 3: Dashboard and Reports
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SignJWT, jwtVerify } from 'jose';

// Import route modules
import customers from './routes/customers';
import suppliers from './routes/suppliers';
import products from './routes/products';
import quotes from './routes/quotes';
import salesOrders from './routes/sales-orders';
import purchaseOrders from './routes/purchase-orders';
import invoices from './routes/invoices';
import dashboard from './routes/dashboard';
import askAria from './routes/ask-aria';
import bots from './routes/bots';
import gl from './routes/gl';
import admin from './routes/admin';
import hr from './routes/hr';
import reports from './routes/reports';
import onboarding from './routes/onboarding';
import periods from './routes/periods';
import approvals from './routes/approvals';
import localization from './routes/localization';
import verticals from './routes/verticals';
import differentiators from './routes/differentiators';
import bi from './routes/bi';
import documents from './routes/documents';
import banking from './routes/banking';
import botObservability from './routes/bot-observability';
import payments from './routes/payments';
import onboardingWizard from './routes/onboarding-wizard';
import manufacturing from './routes/manufacturing';
import enterprise from './routes/enterprise';
import marketing from './routes/marketing';
import criticalFeatures from './routes/critical-features';
import { executeScheduledBots as runScheduledBots } from './services/bot-executor';
import { processPendingDeliveries } from './services/webhook-service';
import { processDueScheduledReports } from './services/report-builder-service';
import { processScheduledPosts, generateDailyPosts } from './services/marketing-service';

// Types
interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  is_active: number;
  is_superuser: number;
  company_id: string | null;
  role: string;
  locked_until: string | null;
  failed_login_attempts: number;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface TokenPayload {
  sub: string;
  email: string;
  company_id: string | null;
  role: string;
  exp: number;
}

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// CORS middleware - allow all aria-erp.pages.dev subdomains for preview deployments
app.use('*', cors({
  origin: (origin) => {
    // Allow localhost for development
    if (origin?.startsWith('http://localhost:')) return origin;
    // Allow main production domains
    if (origin === 'https://aria.vantax.co.za') return origin;
    if (origin === 'https://aria-erp.pages.dev') return origin;
    // Allow all Cloudflare Pages preview subdomains
    if (origin?.endsWith('.aria-erp.pages.dev')) return origin;
    // Reject unknown origins
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

// API info endpoint
app.get('/api', (c) => {
  return c.json({
    name: 'ARIA ERP API',
    version: '2.0.0',
    phase: 'Phase 2-3 - Full ERP',
    endpoints: {
      auth: [
        'POST /api/auth/login',
        'POST /api/auth/logout',
        'GET /api/auth/me',
        'POST /api/auth/refresh',
        'POST /api/auth/register',
      ],
      master_data: [
        'GET/POST /api/erp/master-data/customers',
        'GET/PUT/DELETE /api/erp/master-data/customers/:id',
        'GET/POST /api/erp/master-data/suppliers',
        'GET/PUT/DELETE /api/erp/master-data/suppliers/:id',
        'GET/POST /api/erp/order-to-cash/products',
        'GET/PUT/DELETE /api/erp/order-to-cash/products/:id',
      ],
      order_to_cash: [
        'GET/POST /api/erp/order-to-cash/quotes',
        'GET/DELETE /api/erp/order-to-cash/quotes/:id',
        'PUT /api/erp/order-to-cash/quotes/:id/status',
        'POST /api/erp/order-to-cash/quotes/:id/convert',
        'GET/POST /api/erp/order-to-cash/sales-orders',
        'GET/DELETE /api/erp/order-to-cash/sales-orders/:id',
        'PUT /api/erp/order-to-cash/sales-orders/:id/status',
        'POST /api/erp/order-to-cash/sales-orders/:id/invoice',
      ],
      procure_to_pay: [
        'GET/POST /api/erp/procure-to-pay/purchase-orders',
        'GET/DELETE /api/erp/procure-to-pay/purchase-orders/:id',
        'PUT /api/erp/procure-to-pay/purchase-orders/:id/status',
        'POST /api/erp/procure-to-pay/purchase-orders/:id/receive',
        'POST /api/erp/procure-to-pay/purchase-orders/:id/invoice',
      ],
      invoices: [
        'GET /api/erp/invoices/customer',
        'GET /api/erp/invoices/customer/:id',
        'PUT /api/erp/invoices/customer/:id/status',
        'POST /api/erp/invoices/customer/:id/payment',
        'GET /api/erp/invoices/supplier',
        'GET /api/erp/invoices/supplier/:id',
        'PUT /api/erp/invoices/supplier/:id/status',
        'POST /api/erp/invoices/supplier/:id/payment',
      ],
      dashboard: [
        'GET /api/dashboard/executive',
        'GET /api/dashboard/sales-summary',
        'GET /api/dashboard/purchasing-summary',
        'GET /api/dashboard/ar-aging',
        'GET /api/dashboard/ap-aging',
        'GET /api/dashboard/inventory-summary',
      ],
      ask_aria: [
        'POST /api/ask-aria/session',
        'POST /api/ask-aria/message',
        'POST /api/ask-aria/message/stream',
        'POST /api/ask-aria/upload',
        'POST /api/ask-aria/classify/:documentId',
        'POST /api/ask-aria/extract/:documentId',
        'POST /api/ask-aria/documents/:documentId/validate',
        'POST /api/ask-aria/documents/:documentId/post-to-aria',
        'POST /api/ask-aria/documents/:documentId/export-to-sap',
        'GET /api/ask-aria/sap/export-templates',
      ],
      bots: [
        'GET /api/agents/marketplace',
        'GET /api/agents/marketplace/:botId',
        'POST /api/agents/marketplace/:botId/execute',
        'GET /api/admin/agents/config',
        'PUT /api/admin/agents/config',
        'POST /api/admin/agents/:botId/toggle',
        'GET /api/agents/runs',
        'GET /api/agents/runs/:runId',
      ],
    },
  });
});

// Mount route modules - primary paths
app.route('/api/erp/master-data/customers', customers);
app.route('/api/erp/master-data/suppliers', suppliers);
app.route('/api/erp/order-to-cash/products', products);
app.route('/api/erp/order-to-cash/quotes', quotes);
app.route('/api/erp/order-to-cash/sales-orders', salesOrders);
app.route('/api/erp/procure-to-pay/purchase-orders', purchaseOrders);
app.route('/api/erp/invoices', invoices);
app.route('/api/dashboard', dashboard);

// Route aliases for legacy frontend paths (without /api prefix)
app.route('/erp/master-data/customers', customers);
app.route('/erp/master-data/suppliers', suppliers);
app.route('/erp/order-to-cash/products', products);
app.route('/erp/order-to-cash/quotes', quotes);
app.route('/erp/order-to-cash/sales-orders', salesOrders);
app.route('/erp/procure-to-pay/purchase-orders', purchaseOrders);
app.route('/erp/invoices', invoices);
app.route('/dashboard', dashboard);

// Additional legacy path aliases for procurement pages
app.route('/erp/procurement/suppliers', suppliers);
app.route('/erp/procurement/purchase-orders', purchaseOrders);

// Route aliases with /api prefix for procurement pages (frontend uses /api baseURL)
app.route('/api/erp/procurement/suppliers', suppliers);
app.route('/api/erp/procurement/purchase-orders', purchaseOrders);

// Route aliases for order-to-cash paths that frontend uses
app.route('/api/erp/order-to-cash/customers', customers);
app.route('/erp/order-to-cash/customers', customers);
app.route('/api/erp/order-to-cash/invoices', invoices);
app.route('/erp/order-to-cash/invoices', invoices);

// Route aliases for AR/AP invoice paths
app.route('/api/ar/invoices', invoices);
app.route('/ar/invoices', invoices);
app.route('/api/ap/invoices', invoices);
app.route('/ap/invoices', invoices);

// Ask ARIA routes
app.route('/api/ask-aria', askAria);
app.route('/ask-aria', askAria);

// Bot/Agent routes
app.route('/api/agents', bots);
app.route('/agents', bots);
app.route('/api/admin/agents', bots);
app.route('/admin/agents', bots);
// Route alias for frontend Agents.tsx which calls /api/bots
app.route('/api/bots', bots);
app.route('/bots', bots);

// General Ledger routes
app.route('/api/erp/gl', gl);
app.route('/erp/gl', gl);

// Admin routes (company settings)
app.route('/api/admin', admin);
app.route('/admin', admin);

// HR routes (employees, departments)
app.route('/api/hr', hr);
app.route('/hr', hr);

// Reports routes (trial balance, income statement, balance sheet)
app.route('/api/erp/reports', reports);
app.route('/erp/reports', reports);

// Onboarding routes (guided setup wizard)
app.route('/api/onboarding', onboarding);
app.route('/onboarding', onboarding);

// Financial Period Management routes
app.route('/api/erp/periods', periods);
app.route('/erp/periods', periods);

// Approval Workflow routes
app.route('/api/approvals', approvals);
app.route('/approvals', approvals);

// Country Localization routes (tax calculations, e-invoicing, payroll)
app.route('/api/localization', localization);
app.route('/localization', localization);

// Vertical Industry Packs (Distribution, Retail, Services/Projects)
app.route('/api/verticals', verticals);
app.route('/verticals', verticals);

// Phase D Differentiators (WhatsApp, Mobile/Offline, Spreadsheet Migration)
app.route('/api/differentiators', differentiators);
app.route('/differentiators', differentiators);

// Business Intelligence & Reporting
app.route('/api/bi', bi);
app.route('/bi', bi);

// Document Generation & Management (branded documents, print, email)
app.route('/api/documents', documents);
app.route('/documents', documents);

// Banking & Reconciliation
app.route('/api/banking', banking);
app.route('/banking', banking);

// Bot Observability & Exception Handling
app.route('/api/bot-observability', botObservability);
app.route('/bot-observability', botObservability);

// Payment Integrations
app.route('/api/payments', payments);
app.route('/payments', payments);

// Enhanced Onboarding Wizard
app.route('/api/onboarding-wizard', onboardingWizard);
app.route('/onboarding-wizard', onboardingWizard);

// Manufacturing routes (Work Orders, BOMs, Production, Quality)
app.route('/api/erp/manufacturing', manufacturing);
app.route('/erp/manufacturing', manufacturing);

// Enterprise routes (API Keys, Webhooks, Audit Logs, Subscriptions, Reports, Multi-Currency, Inventory Valuation, Three-Way Match)
app.route('/api/enterprise', enterprise);
app.route('/enterprise', enterprise);

// Marketing Automation routes (Social Media, Content Generation, Influencer Tracking)
app.route('/api/marketing', marketing);
app.route('/marketing', marketing);

// Critical Features routes (Token Vault, Connectors, Bank, Tax, SSO, Accounting Sync, E-Commerce, Shipping, Fixed Assets, Payroll, E-Invoicing, MRP, Monitoring, Admin, Backup)
app.route('/api/critical', criticalFeatures);
app.route('/critical', criticalFeatures);

// Simple password hashing(for demo - use proper bcrypt in production)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Generate JWT token
async function generateToken(user: User, secret: string, expiresIn: number = 3600): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    company_id: user.company_id,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(secretKey);
  
  return token;
}

// Verify JWT token
async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// Generate UUID
function generateUUID(): string {
  return crypto.randomUUID();
}

// Login endpoint
app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json<LoginRequest>();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Find user by email
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ? AND is_active = 1'
    ).bind(email.toLowerCase()).first<User>();

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Check if account is locked
    if (user.locked_until) {
      const lockTime = new Date(user.locked_until);
      if (lockTime > new Date()) {
        return c.json({ error: 'Account is temporarily locked. Please try again later.' }, 423);
      }
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      // Increment failed login attempts
      await c.env.DB.prepare(
        'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?'
      ).bind(user.id).run();

      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Reset failed login attempts and update last login
    await c.env.DB.prepare(
      'UPDATE users SET failed_login_attempts = 0, last_login_at = ? WHERE id = ?'
    ).bind(new Date().toISOString(), user.id).run();

    // Generate tokens
    const accessToken = await generateToken(user, c.env.JWT_SECRET, 1800); // 30 minutes
    const refreshToken = await generateToken(user, c.env.JWT_SECRET, 604800); // 7 days

    // Create session
    const sessionId = generateUUID();
    const expiresAt = new Date(Date.now() + 604800000).toISOString(); // 7 days

    await c.env.DB.prepare(`
      INSERT INTO user_sessions (id, user_id, session_token, refresh_token, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      user.id,
      accessToken.substring(0, 50), // Store partial token for lookup
      refreshToken.substring(0, 50),
      expiresAt,
      c.req.header('CF-Connecting-IP') || 'unknown',
      c.req.header('User-Agent') || 'unknown'
    ).run();

    // Log audit event with new schema
    await c.env.DB.prepare(`
      INSERT INTO audit_logs (id, user_id, company_id, action, event_type, resource_type, details, metadata, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      generateUUID(),
      user.id,
      user.company_id,
      'LOGIN',
      'AUTH',
      'user',
      JSON.stringify({ email: user.email }),
      JSON.stringify({ login_method: 'password' }),
      c.req.header('CF-Connecting-IP') || 'unknown',
      c.req.header('User-Agent') || 'unknown',
      new Date().toISOString()
    ).run();

    return c.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 1800,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        first_name: user.first_name,
        last_name: user.last_name,
        company_id: user.company_id,
        role: user.role,
        is_superuser: user.is_superuser === 1,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get current user endpoint
app.get('/api/auth/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header required' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token, c.env.JWT_SECRET);

    if (!payload) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    const user = await c.env.DB.prepare(
      'SELECT id, email, full_name, first_name, last_name, company_id, role, is_superuser, is_active FROM users WHERE id = ?'
    ).bind(payload.sub).first<User>();

    if (!user || user.is_active !== 1) {
      return c.json({ error: 'User not found or inactive' }, 404);
    }

    return c.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      first_name: user.first_name,
      last_name: user.last_name,
      company_id: user.company_id,
      role: user.role,
      is_superuser: user.is_superuser === 1,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Refresh token endpoint
app.post('/api/auth/refresh', async (c) => {
  try {
    const body = await c.req.json<{ refresh_token: string }>();
    const { refresh_token } = body;

    if (!refresh_token) {
      return c.json({ error: 'Refresh token required' }, 400);
    }

    const payload = await verifyToken(refresh_token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ error: 'Invalid or expired refresh token' }, 401);
    }

    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ? AND is_active = 1'
    ).bind(payload.sub).first<User>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Generate new access token
    const accessToken = await generateToken(user, c.env.JWT_SECRET, 1800);

    return c.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 1800,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Logout endpoint
app.post('/api/auth/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await verifyToken(token, c.env.JWT_SECRET);

      if (payload) {
        // Invalidate all sessions for this user
        await c.env.DB.prepare(
          'UPDATE user_sessions SET is_active = 0 WHERE user_id = ?'
        ).bind(payload.sub).run();

        // Log audit event with new schema
        await c.env.DB.prepare(`
          INSERT INTO audit_logs (id, user_id, company_id, action, event_type, resource_type, metadata, ip_address, user_agent, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          generateUUID(),
          payload.sub,
          payload.company_id,
          'LOGOUT',
          'AUTH',
          'user',
          JSON.stringify({ logout_method: 'manual' }),
          c.req.header('CF-Connecting-IP') || 'unknown',
          c.req.header('User-Agent') || 'unknown',
          new Date().toISOString()
        ).run();
      }
    }

    return c.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Register endpoint (for creating demo users)
app.post('/api/auth/register', async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      password: string;
      full_name?: string;
      company_id?: string;
    }>();

    const { email, password, full_name, company_id } = body;

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Check if user already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    if (existing) {
      return c.json({ error: 'User with this email already exists' }, 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = generateUUID();
    const nameParts = full_name?.split(' ') || [];
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(' ') || null;

    await c.env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, first_name, last_name, company_id, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      email.toLowerCase(),
      passwordHash,
      full_name || null,
      firstName,
      lastName,
      company_id || 'b0598135-52fd-4f67-ac56-8f0237e6355e', // Default demo company
      'user'
    ).run();

    return c.json({
      message: 'User registered successfully',
      user: {
        id: userId,
        email: email.toLowerCase(),
        full_name,
      },
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// ============================================
// SCHEDULED HANDLER FOR AUTONOMOUS BOT EXECUTION
// ============================================
// Runs every hour to execute scheduled bots automatically
// This enables fully autonomous ERP operation
// 
// CRITICAL: This now calls REAL bot execution logic via bot-executor service
// Previously this was a stub that just logged "completed" without running bots

async function executeScheduledBots(env: Env): Promise<void> {
  console.log('Starting scheduled bot execution with REAL bot logic...');
  
  try {
    // Call the shared bot executor service that runs actual bot implementations
    const result = await runScheduledBots(env.DB);
    console.log(`Scheduled bot execution completed. Executed ${result.executed} bots.`);
    
    // Log summary of results
    for (const botResult of result.results) {
      console.log(`  - ${botResult.bot_id}: ${botResult.success ? 'SUCCESS' : 'FAILED'} - ${botResult.message}`);
    }
  } catch (error) {
    console.error('Error in scheduled bot execution:', error);
  }
}

async function executeScheduledTasks(env: Env): Promise<void> {
  console.log('Starting scheduled tasks execution...');
  
  try {
    // 1. Execute scheduled bots
    await executeScheduledBots(env);
    
    // 2. Process pending webhook deliveries (retries)
    console.log('Processing pending webhook deliveries...');
    const webhookResult = await processPendingDeliveries(env.DB);
    console.log(`Webhook deliveries: ${webhookResult.processed} processed, ${webhookResult.succeeded} succeeded, ${webhookResult.failed} failed`);
    
    // 3. Process due scheduled reports
    console.log('Processing due scheduled reports...');
    const reportResult = await processDueScheduledReports(env.DB);
    console.log(`Scheduled reports: ${reportResult.processed} processed, ${reportResult.succeeded} succeeded, ${reportResult.failed} failed`);
    
    // 4. Process scheduled marketing posts
    console.log('Processing scheduled marketing posts...');
    const marketingResult = await processScheduledPosts(env.DB);
    console.log(`Marketing posts: ${marketingResult.processed} processed, ${marketingResult.succeeded} succeeded, ${marketingResult.failed} failed`);
    
    // 5. Generate new marketing posts for tomorrow (once daily at midnight)
    const now = new Date();
    if (now.getUTCHours() === 0) {
      console.log('Generating daily marketing posts...');
      const newPosts = await generateDailyPosts(env.DB, 3);
      console.log(`Generated ${newPosts.length} new marketing posts for today`);
    }
    
  } catch (error) {
    console.error('Error in scheduled tasks execution:', error);
  }
}

// Export with both fetch and scheduled handlers
export default {
  fetch: app.fetch,
  
  // Scheduled handler for cron triggers
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Cron trigger fired at ${new Date().toISOString()}`);
    ctx.waitUntil(executeScheduledTasks(env));
  },
};
