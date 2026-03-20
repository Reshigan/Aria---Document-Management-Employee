/**
 * Onboarding Routes
 * Guided setup wizard for new company subscriptions
 * Server-side state machine stored in D1 per company
 */

import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';
import { jwtVerify } from 'jose';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Helper to verify JWT and get company_id
async function getAuthenticatedCompanyId(c: any): Promise<string | null> {
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
    return (payload as any).company_id || null;
  } catch {
    return null;
  }
}

// Generate UUID
function generateUUID(): string {
  return crypto.randomUUID();
}

// Onboarding steps definition
const ONBOARDING_STEPS = [
  { id: 'company_profile', name: 'Company Profile', description: 'Set up your company details, address, and contact information' },
  { id: 'fiscal_settings', name: 'Fiscal Settings', description: 'Configure your fiscal year, currency, and tax settings' },
  { id: 'chart_of_accounts', name: 'Chart of Accounts', description: 'Set up your chart of accounts (use template or create custom)' },
  { id: 'tax_rates', name: 'Tax Rates', description: 'Configure VAT and other tax rates' },
  { id: 'bank_accounts', name: 'Bank Accounts', description: 'Add your company bank accounts' },
  { id: 'warehouses', name: 'Warehouses', description: 'Set up warehouse/location for inventory' },
  { id: 'document_numbering', name: 'Document Numbering', description: 'Configure numbering sequences for quotes, orders, invoices' },
  { id: 'products', name: 'Products/Services', description: 'Add your first products or services' },
  { id: 'customers_suppliers', name: 'Customers & Suppliers', description: 'Add your first customer and supplier' },
  { id: 'payment_terms', name: 'Payment Terms', description: 'Set up payment terms (e.g., Net 30, COD)' },
  { id: 'users', name: 'Users & Roles', description: 'Invite team members and assign roles' },
  { id: 'demo_data', name: 'Demo Data', description: 'Optionally load demo data for testing' }
];

// ==================== ONBOARDING STATUS ====================

// Get onboarding status
app.get('/status', async (c) => {
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    // Get or create onboarding record
    let onboarding = await c.env.DB.prepare(
      'SELECT * FROM company_onboarding WHERE company_id = ?'
    ).bind(companyId).first();
    
    if (!onboarding) {
      // Create new onboarding record
      const id = generateUUID();
      const now = new Date().toISOString();
      
      await c.env.DB.prepare(`
        INSERT INTO company_onboarding (id, company_id, status, current_step, completed_steps, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(id, companyId, 'in_progress', 'company_profile', '[]', now, now).run();
      
      onboarding = {
        id,
        company_id: companyId,
        status: 'in_progress',
        current_step: 'company_profile',
        completed_steps: '[]',
        created_at: now,
        updated_at: now
      };
    }
    
    const completedSteps = JSON.parse((onboarding as any).completed_steps || '[]');
    const currentStepIndex = ONBOARDING_STEPS.findIndex(s => s.id === (onboarding as any).current_step);
    
    return c.json({
      status: (onboarding as any).status,
      current_step: (onboarding as any).current_step,
      current_step_index: currentStepIndex,
      completed_steps: completedSteps,
      total_steps: ONBOARDING_STEPS.length,
      progress_percentage: Math.round((completedSteps.length / ONBOARDING_STEPS.length) * 100),
      steps: ONBOARDING_STEPS.map(step => ({
        ...step,
        completed: completedSteps.includes(step.id),
        current: step.id === (onboarding as any).current_step
      })),
      updated_at: (onboarding as any).updated_at
    });
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    return c.json({ error: 'Failed to get onboarding status' }, 500);
  }
});

// ==================== COMPLETE STEP ====================

// Complete a step
app.post('/steps/:stepId/complete', async (c) => {
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const stepId = c.req.param('stepId');
    const body = await c.req.json().catch(() => ({}));
    
    // Validate step exists
    const stepIndex = ONBOARDING_STEPS.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      return c.json({ error: 'Invalid step ID' }, 400);
    }
    
    // Get current onboarding record
    const onboarding = await c.env.DB.prepare(
      'SELECT * FROM company_onboarding WHERE company_id = ?'
    ).bind(companyId).first();
    
    if (!onboarding) {
      return c.json({ error: 'Onboarding not started' }, 400);
    }
    
    const completedSteps = JSON.parse((onboarding as any).completed_steps || '[]');
    
    // Add step to completed if not already
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
    }
    
    // Determine next step
    let nextStep = null;
    let status = 'in_progress';
    
    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      nextStep = ONBOARDING_STEPS[stepIndex + 1].id;
    } else {
      // All steps completed
      status = 'completed';
      nextStep = null;
    }
    
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      UPDATE company_onboarding 
      SET completed_steps = ?, current_step = ?, status = ?, updated_at = ?
      WHERE company_id = ?
    `).bind(JSON.stringify(completedSteps), nextStep, status, now, companyId).run();
    
    // Execute step-specific actions
    await executeStepAction(c, stepId, body);
    
    return c.json({
      message: `Step ${stepId} completed successfully`,
      next_step: nextStep,
      status,
      completed_steps: completedSteps,
      progress_percentage: Math.round((completedSteps.length / ONBOARDING_STEPS.length) * 100)
    });
  } catch (error) {
    console.error('Error completing step:', error);
    return c.json({ error: 'Failed to complete step' }, 500);
  }
});

// Execute step-specific actions (idempotent)
async function executeStepAction(c: any, stepId: string, data: any): Promise<void> {
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) return;
  
  const now = new Date().toISOString();
  
  switch (stepId) {
    case 'chart_of_accounts':
      // Apply default chart of accounts template if requested
      if (data.use_template) {
        await applyChartOfAccountsTemplate(c, companyId);
      }
      break;
      
    case 'tax_rates':
      // Create default tax rates
      if (data.create_defaults) {
        await createDefaultTaxRates(c, companyId);
      }
      break;
      
    case 'warehouses':
      // Create default warehouse
      if (data.create_default) {
        const existing = await c.env.DB.prepare(
          'SELECT id FROM warehouses WHERE company_id = ?'
        ).bind(companyId).first();
        
        if (!existing) {
          await c.env.DB.prepare(`
            INSERT INTO warehouses (id, company_id, warehouse_code, name, is_default, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(generateUUID(), companyId, 'MAIN', 'Main Warehouse', 1, now, now).run();
        }
      }
      break;
      
    case 'document_numbering':
      // Create default numbering sequences
      if (data.create_defaults) {
        await createDefaultNumberingSequences(c, companyId);
      }
      break;
      
    case 'payment_terms':
      // Create default payment terms
      if (data.create_defaults) {
        await createDefaultPaymentTerms(c, companyId);
      }
      break;
      
    case 'demo_data':
      // Load demo data if requested
      if (data.load_demo_data) {
        await loadDemoData(c, companyId);
      }
      break;
  }
}

// Apply default chart of accounts template
async function applyChartOfAccountsTemplate(c: any, companyId: string): Promise<void> {
  const now = new Date().toISOString();
  
  // Check if accounts already exist
  const existing = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM gl_accounts WHERE company_id = ?'
  ).bind(companyId).first();
  
  if (existing && (existing as any).count > 0) return;
  
  const defaultAccounts = [
    // Assets
    { code: '1000', name: 'Cash', type: 'asset', category: 'Current Assets' },
    { code: '1100', name: 'Bank Account', type: 'asset', category: 'Current Assets' },
    { code: '1200', name: 'Accounts Receivable', type: 'asset', category: 'Current Assets' },
    { code: '1300', name: 'Inventory', type: 'asset', category: 'Current Assets' },
    { code: '1400', name: 'Prepaid Expenses', type: 'asset', category: 'Current Assets' },
    { code: '1500', name: 'Fixed Assets', type: 'asset', category: 'Non-Current Assets' },
    { code: '1510', name: 'Accumulated Depreciation', type: 'asset', category: 'Non-Current Assets' },
    // Liabilities
    { code: '2000', name: 'Accounts Payable', type: 'liability', category: 'Current Liabilities' },
    { code: '2100', name: 'VAT Payable', type: 'liability', category: 'Current Liabilities' },
    { code: '2200', name: 'Accrued Expenses', type: 'liability', category: 'Current Liabilities' },
    { code: '2300', name: 'Short-term Loans', type: 'liability', category: 'Current Liabilities' },
    { code: '2500', name: 'Long-term Loans', type: 'liability', category: 'Non-Current Liabilities' },
    // Equity
    { code: '3000', name: 'Share Capital', type: 'equity', category: 'Equity' },
    { code: '3100', name: 'Retained Earnings', type: 'equity', category: 'Equity' },
    { code: '3200', name: 'Current Year Earnings', type: 'equity', category: 'Equity' },
    // Revenue
    { code: '4000', name: 'Sales Revenue', type: 'revenue', category: 'Operating Revenue' },
    { code: '4100', name: 'Service Revenue', type: 'revenue', category: 'Operating Revenue' },
    { code: '4200', name: 'Other Income', type: 'revenue', category: 'Other Revenue' },
    // Expenses
    { code: '5000', name: 'Cost of Goods Sold', type: 'expense', category: 'Cost of Sales' },
    { code: '6000', name: 'Salaries & Wages', type: 'expense', category: 'Operating Expenses' },
    { code: '6100', name: 'Rent Expense', type: 'expense', category: 'Operating Expenses' },
    { code: '6200', name: 'Utilities', type: 'expense', category: 'Operating Expenses' },
    { code: '6300', name: 'Office Supplies', type: 'expense', category: 'Operating Expenses' },
    { code: '6400', name: 'Depreciation Expense', type: 'expense', category: 'Operating Expenses' },
    { code: '6500', name: 'Insurance', type: 'expense', category: 'Operating Expenses' },
    { code: '6600', name: 'Professional Fees', type: 'expense', category: 'Operating Expenses' },
    { code: '6700', name: 'Marketing & Advertising', type: 'expense', category: 'Operating Expenses' },
    { code: '6800', name: 'Bank Charges', type: 'expense', category: 'Operating Expenses' },
    { code: '6900', name: 'Interest Expense', type: 'expense', category: 'Finance Costs' }
  ];
  
  for (const account of defaultAccounts) {
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO gl_accounts (id, company_id, account_code, account_name, account_type, account_category, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(generateUUID(), companyId, account.code, account.name, account.type, account.category, 1, now, now).run();
  }
}

// Create default tax rates
async function createDefaultTaxRates(c: any, companyId: string): Promise<void> {
  const now = new Date().toISOString();
  
  const existing = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM tax_rates WHERE company_id = ?'
  ).bind(companyId).first();
  
  if (existing && (existing as any).count > 0) return;
  
  const defaultRates = [
    { code: 'VAT15', name: 'VAT 15%', rate: 15.0, is_default: 1 },
    { code: 'VAT0', name: 'Zero Rated', rate: 0.0, is_default: 0 },
    { code: 'EXEMPT', name: 'VAT Exempt', rate: 0.0, is_default: 0 }
  ];
  
  for (const rate of defaultRates) {
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO tax_rates (id, company_id, code, name, rate, is_default, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(generateUUID(), companyId, rate.code, rate.name, rate.rate, rate.is_default, 1, now, now).run();
  }
}

// Create default numbering sequences
async function createDefaultNumberingSequences(c: any, companyId: string): Promise<void> {
  const now = new Date().toISOString();
  
  const existing = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM numbering_sequences WHERE company_id = ?'
  ).bind(companyId).first();
  
  if (existing && (existing as any).count > 0) return;
  
  const sequences = [
    { type: 'quote', prefix: 'QT-', next_number: 1 },
    { type: 'sales_order', prefix: 'SO-', next_number: 1 },
    { type: 'delivery', prefix: 'DN-', next_number: 1 },
    { type: 'customer_invoice', prefix: 'INV-', next_number: 1 },
    { type: 'purchase_order', prefix: 'PO-', next_number: 1 },
    { type: 'goods_receipt', prefix: 'GRN-', next_number: 1 },
    { type: 'supplier_invoice', prefix: 'BILL-', next_number: 1 },
    { type: 'journal_entry', prefix: 'JE-', next_number: 1 },
    { type: 'payment', prefix: 'PAY-', next_number: 1 }
  ];
  
  for (const seq of sequences) {
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO numbering_sequences (id, company_id, document_type, prefix, next_number, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(generateUUID(), companyId, seq.type, seq.prefix, seq.next_number, now, now).run();
  }
}

// Create default payment terms
async function createDefaultPaymentTerms(c: any, companyId: string): Promise<void> {
  const now = new Date().toISOString();
  
  const existing = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM payment_terms WHERE company_id = ?'
  ).bind(companyId).first();
  
  if (existing && (existing as any).count > 0) return;
  
  const terms = [
    { code: 'COD', name: 'Cash on Delivery', days: 0, is_default: 0 },
    { code: 'NET7', name: 'Net 7 Days', days: 7, is_default: 0 },
    { code: 'NET14', name: 'Net 14 Days', days: 14, is_default: 0 },
    { code: 'NET30', name: 'Net 30 Days', days: 30, is_default: 1 },
    { code: 'NET60', name: 'Net 60 Days', days: 60, is_default: 0 }
  ];
  
  for (const term of terms) {
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO payment_terms (id, company_id, code, name, days, is_default, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(generateUUID(), companyId, term.code, term.name, term.days, term.is_default, 1, now, now).run();
  }
}

// Load demo data
async function loadDemoData(c: any, companyId: string): Promise<void> {
  const now = new Date().toISOString();
  
  // Check if demo data already loaded
  const existingCustomers = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM customers WHERE company_id = ?'
  ).bind(companyId).first();
  
  if (existingCustomers && (existingCustomers as any).count > 0) return;
  
  // Create demo customers
  const customers = [
    { code: 'CUST-001', name: 'Acme Corporation', email: 'orders@acme.co.za', phone: '+27 11 123 4567' },
    { code: 'CUST-002', name: 'TechStart Solutions', email: 'info@techstart.co.za', phone: '+27 21 987 6543' },
    { code: 'CUST-003', name: 'Global Traders', email: 'sales@globaltraders.co.za', phone: '+27 31 555 1234' }
  ];
  
  for (const cust of customers) {
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO customers (id, company_id, customer_code, name, email, phone, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(generateUUID(), companyId, cust.code, cust.name, cust.email, cust.phone, 1, now, now).run();
  }
  
  // Create demo suppliers
  const suppliers = [
    { code: 'SUP-001', name: 'Office Supplies Co', email: 'orders@officesupplies.co.za', phone: '+27 11 222 3333' },
    { code: 'SUP-002', name: 'Tech Hardware Inc', email: 'sales@techhardware.co.za', phone: '+27 21 444 5555' },
    { code: 'SUP-003', name: 'Raw Materials Ltd', email: 'info@rawmaterials.co.za', phone: '+27 31 666 7777' }
  ];
  
  for (const sup of suppliers) {
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO suppliers (id, company_id, supplier_code, name, email, phone, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(generateUUID(), companyId, sup.code, sup.name, sup.email, sup.phone, 1, now, now).run();
  }
  
  // Create demo products
  const products = [
    { code: 'PROD-001', name: 'Widget A', description: 'Standard widget', unit_price: 150.00, cost_price: 100.00 },
    { code: 'PROD-002', name: 'Widget B', description: 'Premium widget', unit_price: 250.00, cost_price: 175.00 },
    { code: 'PROD-003', name: 'Service Package', description: 'Monthly service', unit_price: 500.00, cost_price: 0.00 }
  ];
  
  for (const prod of products) {
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO products (id, company_id, product_code, name, description, unit_price, cost_price, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(generateUUID(), companyId, prod.code, prod.name, prod.description, prod.unit_price, prod.cost_price, 1, now, now).run();
  }
}

// ==================== SKIP STEP ====================

// Skip a step
app.post('/steps/:stepId/skip', async (c) => {
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const stepId = c.req.param('stepId');
    
    // Validate step exists
    const stepIndex = ONBOARDING_STEPS.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      return c.json({ error: 'Invalid step ID' }, 400);
    }
    
    // Get current onboarding record
    const onboarding = await c.env.DB.prepare(
      'SELECT * FROM company_onboarding WHERE company_id = ?'
    ).bind(companyId).first();
    
    if (!onboarding) {
      return c.json({ error: 'Onboarding not started' }, 400);
    }
    
    // Determine next step
    let nextStep = null;
    let status = 'in_progress';
    
    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      nextStep = ONBOARDING_STEPS[stepIndex + 1].id;
    } else {
      status = 'completed';
    }
    
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      UPDATE company_onboarding 
      SET current_step = ?, status = ?, updated_at = ?
      WHERE company_id = ?
    `).bind(nextStep, status, now, companyId).run();
    
    return c.json({
      message: `Step ${stepId} skipped`,
      next_step: nextStep,
      status
    });
  } catch (error) {
    console.error('Error skipping step:', error);
    return c.json({ error: 'Failed to skip step' }, 500);
  }
});

// ==================== RESET ONBOARDING ====================

// Reset onboarding (for testing)
app.post('/reset', async (c) => {
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      UPDATE company_onboarding 
      SET status = 'in_progress', current_step = 'company_profile', completed_steps = '[]', updated_at = ?
      WHERE company_id = ?
    `).bind(now, companyId).run();
    
    return c.json({ message: 'Onboarding reset successfully' });
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    return c.json({ error: 'Failed to reset onboarding' }, 500);
  }
});

export default app;
