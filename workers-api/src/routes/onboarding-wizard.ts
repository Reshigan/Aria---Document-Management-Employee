import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';

interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Onboarding steps definition
const ONBOARDING_STEPS = [
  {
    id: 'company_profile',
    title: 'Company Profile',
    description: 'Set up your company details, registration numbers, and contact information',
    required: true,
    order: 1
  },
  {
    id: 'branding',
    title: 'Branding & Documents',
    description: 'Upload your logo and customize document templates',
    required: false,
    order: 2
  },
  {
    id: 'chart_of_accounts',
    title: 'Chart of Accounts',
    description: 'Set up your GL accounts or use a template for your industry',
    required: true,
    order: 3
  },
  {
    id: 'bank_accounts',
    title: 'Bank Accounts',
    description: 'Add your bank accounts for reconciliation',
    required: true,
    order: 4
  },
  {
    id: 'opening_balances',
    title: 'Opening Balances',
    description: 'Enter your opening balances as of your go-live date',
    required: false,
    order: 5
  },
  {
    id: 'customers',
    title: 'Import Customers',
    description: 'Import your customer list from a spreadsheet',
    required: false,
    order: 6
  },
  {
    id: 'suppliers',
    title: 'Import Suppliers',
    description: 'Import your supplier list from a spreadsheet',
    required: false,
    order: 7
  },
  {
    id: 'products',
    title: 'Import Products',
    description: 'Import your product catalog from a spreadsheet',
    required: false,
    order: 8
  },
  {
    id: 'users',
    title: 'Invite Users',
    description: 'Invite team members and set their roles',
    required: false,
    order: 9
  },
  {
    id: 'payment_gateway',
    title: 'Payment Gateway',
    description: 'Connect a payment gateway to accept online payments',
    required: false,
    order: 10
  },
  {
    id: 'first_invoice',
    title: 'Create First Invoice',
    description: 'Create your first invoice to test the system',
    required: false,
    order: 11
  },
  {
    id: 'go_live',
    title: 'Go Live',
    description: 'Review settings and activate your account',
    required: true,
    order: 12
  }
];

// Chart of accounts templates by industry
const COA_TEMPLATES = {
  general: {
    name: 'General Business',
    description: 'Standard chart of accounts for most businesses',
    accounts: [
      { code: '1000', name: 'Cash and Cash Equivalents', type: 'asset', category: 'current_asset' },
      { code: '1100', name: 'Accounts Receivable', type: 'asset', category: 'current_asset' },
      { code: '1200', name: 'Inventory', type: 'asset', category: 'current_asset' },
      { code: '1300', name: 'Prepaid Expenses', type: 'asset', category: 'current_asset' },
      { code: '1500', name: 'Fixed Assets', type: 'asset', category: 'fixed_asset' },
      { code: '1510', name: 'Accumulated Depreciation', type: 'asset', category: 'fixed_asset' },
      { code: '2000', name: 'Accounts Payable', type: 'liability', category: 'current_liability' },
      { code: '2100', name: 'Accrued Expenses', type: 'liability', category: 'current_liability' },
      { code: '2200', name: 'VAT Payable', type: 'liability', category: 'current_liability' },
      { code: '2300', name: 'PAYE Payable', type: 'liability', category: 'current_liability' },
      { code: '2500', name: 'Long-term Loans', type: 'liability', category: 'long_term_liability' },
      { code: '3000', name: 'Share Capital', type: 'equity', category: 'equity' },
      { code: '3100', name: 'Retained Earnings', type: 'equity', category: 'equity' },
      { code: '4000', name: 'Sales Revenue', type: 'revenue', category: 'operating_revenue' },
      { code: '4100', name: 'Service Revenue', type: 'revenue', category: 'operating_revenue' },
      { code: '4200', name: 'Other Income', type: 'revenue', category: 'other_income' },
      { code: '5000', name: 'Cost of Goods Sold', type: 'expense', category: 'cost_of_sales' },
      { code: '5100', name: 'Direct Labor', type: 'expense', category: 'cost_of_sales' },
      { code: '6000', name: 'Salaries and Wages', type: 'expense', category: 'operating_expense' },
      { code: '6100', name: 'Rent Expense', type: 'expense', category: 'operating_expense' },
      { code: '6200', name: 'Utilities', type: 'expense', category: 'operating_expense' },
      { code: '6300', name: 'Insurance', type: 'expense', category: 'operating_expense' },
      { code: '6400', name: 'Depreciation Expense', type: 'expense', category: 'operating_expense' },
      { code: '6500', name: 'Professional Fees', type: 'expense', category: 'operating_expense' },
      { code: '6600', name: 'Marketing and Advertising', type: 'expense', category: 'operating_expense' },
      { code: '6700', name: 'Office Supplies', type: 'expense', category: 'operating_expense' },
      { code: '6800', name: 'Travel and Entertainment', type: 'expense', category: 'operating_expense' },
      { code: '7000', name: 'Interest Expense', type: 'expense', category: 'finance_cost' },
      { code: '7100', name: 'Bank Charges', type: 'expense', category: 'finance_cost' }
    ]
  },
  retail: {
    name: 'Retail Business',
    description: 'Chart of accounts optimized for retail operations',
    accounts: [
      { code: '1000', name: 'Cash on Hand', type: 'asset', category: 'current_asset' },
      { code: '1010', name: 'Cash at Bank', type: 'asset', category: 'current_asset' },
      { code: '1020', name: 'Credit Card Clearing', type: 'asset', category: 'current_asset' },
      { code: '1100', name: 'Accounts Receivable', type: 'asset', category: 'current_asset' },
      { code: '1200', name: 'Inventory - Merchandise', type: 'asset', category: 'current_asset' },
      { code: '1210', name: 'Inventory - Consignment', type: 'asset', category: 'current_asset' },
      { code: '4000', name: 'Sales - Retail', type: 'revenue', category: 'operating_revenue' },
      { code: '4010', name: 'Sales - Online', type: 'revenue', category: 'operating_revenue' },
      { code: '4020', name: 'Sales - Wholesale', type: 'revenue', category: 'operating_revenue' },
      { code: '4100', name: 'Sales Returns and Allowances', type: 'revenue', category: 'operating_revenue' },
      { code: '4200', name: 'Sales Discounts', type: 'revenue', category: 'operating_revenue' },
      { code: '5000', name: 'Cost of Goods Sold', type: 'expense', category: 'cost_of_sales' },
      { code: '5010', name: 'Freight In', type: 'expense', category: 'cost_of_sales' },
      { code: '5020', name: 'Purchase Discounts', type: 'expense', category: 'cost_of_sales' },
      { code: '6000', name: 'Store Wages', type: 'expense', category: 'operating_expense' },
      { code: '6100', name: 'Store Rent', type: 'expense', category: 'operating_expense' },
      { code: '6200', name: 'Point of Sale Fees', type: 'expense', category: 'operating_expense' },
      { code: '6300', name: 'Shrinkage', type: 'expense', category: 'operating_expense' }
    ]
  },
  services: {
    name: 'Professional Services',
    description: 'Chart of accounts for consulting and professional services',
    accounts: [
      { code: '1000', name: 'Cash at Bank', type: 'asset', category: 'current_asset' },
      { code: '1100', name: 'Accounts Receivable', type: 'asset', category: 'current_asset' },
      { code: '1110', name: 'Unbilled Revenue', type: 'asset', category: 'current_asset' },
      { code: '1120', name: 'Work in Progress', type: 'asset', category: 'current_asset' },
      { code: '2000', name: 'Accounts Payable', type: 'liability', category: 'current_liability' },
      { code: '2100', name: 'Deferred Revenue', type: 'liability', category: 'current_liability' },
      { code: '4000', name: 'Consulting Revenue', type: 'revenue', category: 'operating_revenue' },
      { code: '4010', name: 'Project Revenue', type: 'revenue', category: 'operating_revenue' },
      { code: '4020', name: 'Retainer Revenue', type: 'revenue', category: 'operating_revenue' },
      { code: '4030', name: 'Training Revenue', type: 'revenue', category: 'operating_revenue' },
      { code: '5000', name: 'Direct Labor', type: 'expense', category: 'cost_of_sales' },
      { code: '5010', name: 'Subcontractor Costs', type: 'expense', category: 'cost_of_sales' },
      { code: '5020', name: 'Project Expenses', type: 'expense', category: 'cost_of_sales' },
      { code: '6000', name: 'Salaries - Staff', type: 'expense', category: 'operating_expense' },
      { code: '6010', name: 'Salaries - Admin', type: 'expense', category: 'operating_expense' },
      { code: '6100', name: 'Professional Development', type: 'expense', category: 'operating_expense' },
      { code: '6200', name: 'Software Subscriptions', type: 'expense', category: 'operating_expense' }
    ]
  },
  manufacturing: {
    name: 'Manufacturing',
    description: 'Chart of accounts for manufacturing businesses',
    accounts: [
      { code: '1000', name: 'Cash at Bank', type: 'asset', category: 'current_asset' },
      { code: '1100', name: 'Accounts Receivable', type: 'asset', category: 'current_asset' },
      { code: '1200', name: 'Raw Materials Inventory', type: 'asset', category: 'current_asset' },
      { code: '1210', name: 'Work in Progress Inventory', type: 'asset', category: 'current_asset' },
      { code: '1220', name: 'Finished Goods Inventory', type: 'asset', category: 'current_asset' },
      { code: '1500', name: 'Plant and Equipment', type: 'asset', category: 'fixed_asset' },
      { code: '1510', name: 'Accumulated Depreciation - P&E', type: 'asset', category: 'fixed_asset' },
      { code: '4000', name: 'Product Sales', type: 'revenue', category: 'operating_revenue' },
      { code: '5000', name: 'Raw Materials Used', type: 'expense', category: 'cost_of_sales' },
      { code: '5010', name: 'Direct Labor', type: 'expense', category: 'cost_of_sales' },
      { code: '5020', name: 'Manufacturing Overhead', type: 'expense', category: 'cost_of_sales' },
      { code: '5030', name: 'Factory Utilities', type: 'expense', category: 'cost_of_sales' },
      { code: '5040', name: 'Equipment Maintenance', type: 'expense', category: 'cost_of_sales' },
      { code: '6000', name: 'Admin Salaries', type: 'expense', category: 'operating_expense' },
      { code: '6100', name: 'Quality Control', type: 'expense', category: 'operating_expense' }
    ]
  }
};

// ============================================================================
// ONBOARDING PROGRESS
// ============================================================================

// Get onboarding steps
app.get('/steps', async (c) => {
  return c.json({ steps: ONBOARDING_STEPS });
});

// Get onboarding progress
app.get('/progress', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const db = c.env.DB;
    
    let progress = await db.prepare(`
      SELECT * FROM onboarding_progress WHERE company_id = ?
    `).bind(companyId).first<any>();
    
    if (!progress) {
      // Create initial progress record
      const progressId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO onboarding_progress (id, company_id, current_step, completed_steps, skipped_steps)
        VALUES (?, ?, 'company_profile', '[]', '[]')
      `).bind(progressId, companyId).run();
      
      progress = {
        id: progressId,
        company_id: companyId,
        current_step: 'company_profile',
        completed_steps: '[]',
        skipped_steps: '[]'
      };
    }
    
    const completedSteps = JSON.parse(progress.completed_steps || '[]');
    const skippedSteps = JSON.parse(progress.skipped_steps || '[]');
    
    // Calculate completion percentage
    const requiredSteps = ONBOARDING_STEPS.filter(s => s.required);
    const completedRequired = requiredSteps.filter(s => completedSteps.includes(s.id));
    const completionPercent = Math.round((completedRequired.length / requiredSteps.length) * 100);
    
    return c.json({
      current_step: progress.current_step,
      completed_steps: completedSteps,
      skipped_steps: skippedSteps,
      completion_percent: completionPercent,
      is_complete: progress.onboarding_completed_at !== null,
      go_live_date: progress.go_live_date,
      steps: ONBOARDING_STEPS.map(step => ({
        ...step,
        status: completedSteps.includes(step.id) ? 'completed' :
                skippedSteps.includes(step.id) ? 'skipped' :
                step.id === progress.current_step ? 'current' : 'pending'
      }))
    });
  } catch (error: any) {
    console.error('Onboarding progress error:', error);
    return c.json({ error: error.message || 'Failed to get progress' }, 500);
  }
});

// Complete a step
app.post('/steps/:stepId/complete', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const stepId = c.req.param('stepId');
    const db = c.env.DB;
    
    const progress = await db.prepare(`
      SELECT * FROM onboarding_progress WHERE company_id = ?
    `).bind(companyId).first<any>();
    
    if (!progress) {
      return c.json({ error: 'Onboarding not started' }, 400);
    }
    
    const completedSteps = JSON.parse(progress.completed_steps || '[]');
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
    }
    
    // Find next step
    const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === stepId);
    const nextStep = ONBOARDING_STEPS[currentIndex + 1];
    
    // Update specific completion flags
    const updates: string[] = ['completed_steps = ?', 'updated_at = ?'];
    const params: any[] = [JSON.stringify(completedSteps), new Date().toISOString()];
    
    if (nextStep) {
      updates.push('current_step = ?');
      params.push(nextStep.id);
    }
    
    // Set specific flags based on step
    switch (stepId) {
      case 'company_profile':
        updates.push('company_profile_complete = 1');
        break;
      case 'branding':
        updates.push('branding_complete = 1');
        break;
      case 'chart_of_accounts':
        updates.push('chart_of_accounts_complete = 1');
        break;
      case 'bank_accounts':
        updates.push('bank_accounts_complete = 1');
        break;
      case 'opening_balances':
        updates.push('opening_balances_complete = 1');
        break;
      case 'customers':
        updates.push('customers_imported = 1');
        break;
      case 'suppliers':
        updates.push('suppliers_imported = 1');
        break;
      case 'products':
        updates.push('products_imported = 1');
        break;
      case 'users':
        updates.push('users_invited = 1');
        break;
      case 'payment_gateway':
        updates.push('payment_gateway_connected = 1');
        break;
      case 'first_invoice':
        updates.push('first_invoice_created = 1');
        break;
      case 'go_live':
        updates.push('onboarding_completed_at = ?');
        params.push(new Date().toISOString());
        break;
    }
    
    params.push(companyId);
    
    await db.prepare(`
      UPDATE onboarding_progress SET ${updates.join(', ')} WHERE company_id = ?
    `).bind(...params).run();
    
    return c.json({
      success: true,
      next_step: nextStep?.id || null,
      is_complete: stepId === 'go_live'
    });
  } catch (error: any) {
    console.error('Complete step error:', error);
    return c.json({ error: error.message || 'Failed to complete step' }, 500);
  }
});

// Skip a step
app.post('/steps/:stepId/skip', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const stepId = c.req.param('stepId');
    const db = c.env.DB;
    
    const step = ONBOARDING_STEPS.find(s => s.id === stepId);
    if (step?.required) {
      return c.json({ error: 'Cannot skip required step' }, 400);
    }
    
    const progress = await db.prepare(`
      SELECT * FROM onboarding_progress WHERE company_id = ?
    `).bind(companyId).first<any>();
    
    if (!progress) {
      return c.json({ error: 'Onboarding not started' }, 400);
    }
    
    const skippedSteps = JSON.parse(progress.skipped_steps || '[]');
    if (!skippedSteps.includes(stepId)) {
      skippedSteps.push(stepId);
    }
    
    // Find next step
    const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === stepId);
    const nextStep = ONBOARDING_STEPS[currentIndex + 1];
    
    await db.prepare(`
      UPDATE onboarding_progress SET
        skipped_steps = ?,
        current_step = ?,
        updated_at = ?
      WHERE company_id = ?
    `).bind(
      JSON.stringify(skippedSteps),
      nextStep?.id || progress.current_step,
      new Date().toISOString(),
      companyId
    ).run();
    
    return c.json({
      success: true,
      next_step: nextStep?.id || null
    });
  } catch (error: any) {
    console.error('Skip step error:', error);
    return c.json({ error: error.message || 'Failed to skip step' }, 500);
  }
});

// ============================================================================
// CHART OF ACCOUNTS TEMPLATES
// ============================================================================

// Get COA templates
app.get('/coa-templates', async (c) => {
  return c.json({
    templates: Object.entries(COA_TEMPLATES).map(([id, template]) => ({
      id,
      name: template.name,
      description: template.description,
      account_count: template.accounts.length
    }))
  });
});

// Get COA template details
app.get('/coa-templates/:templateId', async (c) => {
  const templateId = c.req.param('templateId');
  const template = COA_TEMPLATES[templateId as keyof typeof COA_TEMPLATES];
  
  if (!template) {
    return c.json({ error: 'Template not found' }, 404);
  }
  
  return c.json(template);
});

// Apply COA template
app.post('/coa-templates/:templateId/apply', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const templateId = c.req.param('templateId');
    const template = COA_TEMPLATES[templateId as keyof typeof COA_TEMPLATES];
    
    if (!template) {
      return c.json({ error: 'Template not found' }, 404);
    }
    
    const db = c.env.DB;
    
    // Check if company already has accounts
    const existing = await db.prepare(`
      SELECT COUNT(*) as count FROM gl_accounts WHERE company_id = ?
    `).bind(companyId).first<{ count: number }>();
    
    if ((existing?.count || 0) > 0) {
      return c.json({ error: 'Company already has GL accounts. Delete existing accounts first or merge manually.' }, 400);
    }
    
    // Insert accounts
    let created = 0;
    for (const account of template.accounts) {
      const accountId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO gl_accounts (id, company_id, account_code, account_name, account_type, category, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).bind(
        accountId,
        companyId,
        account.code,
        account.name,
        account.type,
        account.category
      ).run();
      created++;
    }
    
    return c.json({
      success: true,
      accounts_created: created,
      template_name: template.name
    });
  } catch (error: any) {
    console.error('Apply COA template error:', error);
    return c.json({ error: error.message || 'Failed to apply template' }, 500);
  }
});

// ============================================================================
// DATA IMPORT
// ============================================================================

// Get import templates (CSV column mappings)
app.get('/import/templates/:type', async (c) => {
  const importType = c.req.param('type');
  
  const templates: Record<string, any> = {
    customers: {
      required_columns: ['name'],
      optional_columns: ['email', 'phone', 'billing_address', 'shipping_address', 'vat_number', 'credit_limit', 'payment_terms'],
      sample_data: [
        { name: 'ABC Company', email: 'info@abc.com', phone: '+27 11 123 4567', billing_address: '123 Main St, Johannesburg', vat_number: '4123456789' }
      ]
    },
    suppliers: {
      required_columns: ['name'],
      optional_columns: ['email', 'phone', 'address', 'vat_number', 'payment_terms', 'bank_name', 'bank_account', 'bank_branch'],
      sample_data: [
        { name: 'XYZ Suppliers', email: 'orders@xyz.com', phone: '+27 11 987 6543', address: '456 Industrial Rd, Pretoria' }
      ]
    },
    products: {
      required_columns: ['name', 'sku'],
      optional_columns: ['description', 'category', 'unit_price', 'cost_price', 'quantity_on_hand', 'reorder_level', 'unit_of_measure', 'barcode'],
      sample_data: [
        { name: 'Widget A', sku: 'WGT-001', unit_price: 99.99, cost_price: 50.00, quantity_on_hand: 100 }
      ]
    },
    opening_balances: {
      required_columns: ['account_code', 'debit', 'credit'],
      optional_columns: ['description'],
      sample_data: [
        { account_code: '1000', debit: 100000, credit: 0, description: 'Cash opening balance' },
        { account_code: '3100', debit: 0, credit: 100000, description: 'Retained earnings opening' }
      ]
    }
  };
  
  const template = templates[importType];
  if (!template) {
    return c.json({ error: 'Unknown import type' }, 404);
  }
  
  return c.json(template);
});

// Validate import data
app.post('/import/validate', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const body = await c.req.json();
    const { import_type, data, column_mapping } = body;
    
    const errors: any[] = [];
    const warnings: any[] = [];
    let validRows = 0;
    
    const requiredColumns: Record<string, string[]> = {
      customers: ['name'],
      suppliers: ['name'],
      products: ['name', 'sku'],
      opening_balances: ['account_code']
    };
    
    const required = requiredColumns[import_type] || [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Account for header row
      
      // Check required fields
      for (const field of required) {
        const mappedColumn = column_mapping[field];
        if (!mappedColumn || !row[mappedColumn]) {
          errors.push({
            row: rowNum,
            field,
            message: `Missing required field: ${field}`
          });
        }
      }
      
      // Type-specific validation
      if (import_type === 'products') {
        const price = parseFloat(row[column_mapping.unit_price]);
        if (column_mapping.unit_price && isNaN(price)) {
          warnings.push({
            row: rowNum,
            field: 'unit_price',
            message: 'Invalid price format'
          });
        }
      }
      
      if (import_type === 'opening_balances') {
        const debit = parseFloat(row[column_mapping.debit] || '0');
        const credit = parseFloat(row[column_mapping.credit] || '0');
        if (isNaN(debit) || isNaN(credit)) {
          errors.push({
            row: rowNum,
            field: 'debit/credit',
            message: 'Invalid amount format'
          });
        }
      }
      
      if (errors.filter(e => e.row === rowNum).length === 0) {
        validRows++;
      }
    }
    
    // Check opening balances total
    if (import_type === 'opening_balances') {
      let totalDebit = 0;
      let totalCredit = 0;
      for (const row of data) {
        totalDebit += parseFloat(row[column_mapping.debit] || '0') || 0;
        totalCredit += parseFloat(row[column_mapping.credit] || '0') || 0;
      }
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        warnings.push({
          row: null,
          field: null,
          message: `Opening balances don't balance. Debits: ${totalDebit.toFixed(2)}, Credits: ${totalCredit.toFixed(2)}, Difference: ${(totalDebit - totalCredit).toFixed(2)}`
        });
      }
    }
    
    return c.json({
      valid: errors.length === 0,
      total_rows: data.length,
      valid_rows: validRows,
      error_rows: data.length - validRows,
      errors,
      warnings
    });
  } catch (error: any) {
    console.error('Validate import error:', error);
    return c.json({ error: error.message || 'Failed to validate import' }, 500);
  }
});

// Execute import
app.post('/import/execute', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const body = await c.req.json();
    const { import_type, data, column_mapping } = body;
    const db = c.env.DB;
    const userId = 'system';
    
    const batchId = crypto.randomUUID();
    let imported = 0;
    let failed = 0;
    const errors: any[] = [];
    
    // Create import batch record
    await db.prepare(`
      INSERT INTO import_batches (id, company_id, import_type, total_rows, status, created_by, started_at)
      VALUES (?, ?, ?, ?, 'processing', ?, ?)
    `).bind(batchId, companyId, import_type, data.length, userId, new Date().toISOString()).run();
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        switch (import_type) {
          case 'customers':
            const customerId = crypto.randomUUID();
            await db.prepare(`
              INSERT INTO customers (id, company_id, name, email, phone, billing_address, shipping_address, vat_number, credit_limit, payment_terms, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              customerId,
              companyId,
              row[column_mapping.name],
              row[column_mapping.email] || null,
              row[column_mapping.phone] || null,
              row[column_mapping.billing_address] || null,
              row[column_mapping.shipping_address] || null,
              row[column_mapping.vat_number] || null,
              parseFloat(row[column_mapping.credit_limit]) || null,
              row[column_mapping.payment_terms] || null,
              new Date().toISOString()
            ).run();
            imported++;
            break;
            
          case 'suppliers':
            const supplierId = crypto.randomUUID();
            await db.prepare(`
              INSERT INTO suppliers (id, company_id, name, email, phone, address, vat_number, payment_terms, bank_name, bank_account, bank_branch, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              supplierId,
              companyId,
              row[column_mapping.name],
              row[column_mapping.email] || null,
              row[column_mapping.phone] || null,
              row[column_mapping.address] || null,
              row[column_mapping.vat_number] || null,
              row[column_mapping.payment_terms] || null,
              row[column_mapping.bank_name] || null,
              row[column_mapping.bank_account] || null,
              row[column_mapping.bank_branch] || null,
              new Date().toISOString()
            ).run();
            imported++;
            break;
            
          case 'products':
            const productId = crypto.randomUUID();
            await db.prepare(`
              INSERT INTO products (id, company_id, name, sku, description, category, unit_price, cost_price, quantity_on_hand, reorder_level, unit_of_measure, barcode, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              productId,
              companyId,
              row[column_mapping.name],
              row[column_mapping.sku],
              row[column_mapping.description] || null,
              row[column_mapping.category] || null,
              parseFloat(row[column_mapping.unit_price]) || 0,
              parseFloat(row[column_mapping.cost_price]) || 0,
              parseInt(row[column_mapping.quantity_on_hand]) || 0,
              parseInt(row[column_mapping.reorder_level]) || 0,
              row[column_mapping.unit_of_measure] || 'each',
              row[column_mapping.barcode] || null,
              new Date().toISOString()
            ).run();
            imported++;
            break;
        }
      } catch (err: any) {
        failed++;
        errors.push({ row: i + 2, error: err.message });
      }
    }
    
    // Update batch record
    await db.prepare(`
      UPDATE import_batches SET
        processed_rows = ?,
        success_rows = ?,
        error_rows = ?,
        status = 'completed',
        errors_json = ?,
        completed_at = ?
      WHERE id = ?
    `).bind(
      data.length,
      imported,
      failed,
      JSON.stringify(errors),
      new Date().toISOString(),
      batchId
    ).run();
    
    return c.json({
      success: true,
      batch_id: batchId,
      imported,
      failed,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Execute import error:', error);
    return c.json({ error: error.message || 'Failed to execute import' }, 500);
  }
});

// ============================================================================
// GO LIVE
// ============================================================================

// Set go-live date
app.post('/go-live', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const body = await c.req.json();
    const db = c.env.DB;
    
    // Validate required steps are complete
    const progress = await db.prepare(`
      SELECT * FROM onboarding_progress WHERE company_id = ?
    `).bind(companyId).first<any>();
    
    if (!progress) {
      return c.json({ error: 'Onboarding not started' }, 400);
    }
    
    const completedSteps = JSON.parse(progress.completed_steps || '[]');
    const requiredSteps = ONBOARDING_STEPS.filter(s => s.required && s.id !== 'go_live');
    const missingSteps = requiredSteps.filter(s => !completedSteps.includes(s.id));
    
    if (missingSteps.length > 0) {
      return c.json({
        error: 'Required steps not complete',
        missing_steps: missingSteps.map(s => ({ id: s.id, title: s.title }))
      }, 400);
    }
    
    // Set go-live date and mark complete
    await db.prepare(`
      UPDATE onboarding_progress SET
        go_live_date = ?,
        onboarding_completed_at = ?,
        current_step = 'complete',
        updated_at = ?
      WHERE company_id = ?
    `).bind(
      body.go_live_date || new Date().toISOString().split('T')[0],
      new Date().toISOString(),
      new Date().toISOString(),
      companyId
    ).run();
    
    // Update company status
    await db.prepare(`
      UPDATE companies SET status = 'active', updated_at = ? WHERE id = ?
    `).bind(new Date().toISOString(), companyId).run();
    
    return c.json({
      success: true,
      go_live_date: body.go_live_date || new Date().toISOString().split('T')[0],
      message: 'Congratulations! Your ARIA ERP is now live.'
    });
  } catch (error: any) {
    console.error('Go live error:', error);
    return c.json({ error: error.message || 'Failed to go live' }, 500);
  }
});

export default app;
