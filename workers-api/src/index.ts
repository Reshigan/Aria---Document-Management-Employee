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

// Types
interface Env {
  DB: D1Database;
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

// Simple password hashing (for demo - use proper bcrypt in production)
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

    // Log audit event
    await c.env.DB.prepare(`
      INSERT INTO audit_logs (id, user_id, company_id, action, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      generateUUID(),
      user.id,
      user.company_id,
      'LOGIN',
      JSON.stringify({ email: user.email }),
      c.req.header('CF-Connecting-IP') || 'unknown',
      c.req.header('User-Agent') || 'unknown'
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

        // Log audit event
        await c.env.DB.prepare(`
          INSERT INTO audit_logs (id, user_id, company_id, action, ip_address, user_agent)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          generateUUID(),
          payload.sub,
          payload.company_id,
          'LOGOUT',
          c.req.header('CF-Connecting-IP') || 'unknown',
          c.req.header('User-Agent') || 'unknown'
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

export default app;
