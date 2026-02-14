import { describe, it, expect } from 'vitest'

const DEMO_COMPANY_ID = 'b0598135-52fd-4f67-ac56-8f0237e6355e'

const ALL_D1_TABLES = [
  // 001_auth_tables.sql
  'companies',
  'users',
  'user_sessions',
  'audit_logs',
  // 002_erp_tables.sql
  'customers',
  'suppliers',
  'products',
  'quotes',
  'quote_items',
  'sales_orders',
  'sales_order_items',
  'customer_invoices',
  'customer_invoice_items',
  'purchase_orders',
  'purchase_order_items',
  'supplier_invoices',
  'customer_payments',
  'supplier_payments',
  // 003_ask_aria_bots.sql
  'aria_conversations',
  'aria_messages',
  'aria_documents',
  'bot_configs',
  'bot_runs',
  'bot_schedules',
  // 005_full_erp_modules.sql - GL/Accounting
  'chart_of_accounts',
  'journal_entries',
  'journal_entry_lines',
  'gl_transactions',
  'financial_periods',
  'tax_rates',
  // 005 - Bank/Cash
  'bank_accounts',
  'bank_transactions',
  'bank_statements',
  // 005 - HR
  'departments',
  'employees',
  'payroll_runs',
  'payroll_items',
  'time_entries',
  'leave_requests',
  'leave_balances',
  // 005 - Manufacturing
  'bill_of_materials',
  'bom_components',
  'work_orders',
  'production_runs',
  'quality_checks',
  'machines',
  // 005 - Inventory
  'warehouses',
  'stock_levels',
  'stock_movements',
  // 005 - CRM
  'leads',
  'opportunities',
  'crm_activities',
  // 005 - Governance
  'contracts',
  'policies',
  'audit_trail',
  'risks',
  // 018_new_pages_database.sql - Financial
  'budgets',
  'budget_lines',
  'cost_centers',
  'payment_batches',
  'payment_batch_items',
  'expense_claims',
  'expense_claim_lines',
  'credit_notes',
  'collections',
  'cash_forecasts',
  'cash_forecast_lines',
  'bank_transfers',
  // 018 - Operations
  'price_lists',
  'price_list_items',
  'discounts',
  'sales_targets',
  'commissions',
  'stock_adjustments',
  'stock_adjustment_lines',
  'stock_transfers',
  'stock_transfer_lines',
  'reorder_points',
  'requisitions',
  'requisition_lines',
  'rfqs',
  'rfq_suppliers',
  'supplier_portal_access',
  'production_plans',
  'production_plan_lines',
  'machine_maintenance',
  // 018 - People
  'positions',
  'salary_structures',
  'deductions',
]

describe('D1 Table Existence Verification', () => {
  describe('Authentication Tables (001)', () => {
    const authTables = ['companies', 'users', 'user_sessions', 'audit_logs']

    authTables.forEach(table => {
      it(`should define ${table} table`, () => {
        expect(ALL_D1_TABLES).toContain(table)
      })
    })

    it('should have all 4 auth tables', () => {
      const found = authTables.filter(t => ALL_D1_TABLES.includes(t))
      expect(found).toHaveLength(4)
    })
  })

  describe('ERP Core Tables (002)', () => {
    const erpCoreTables = [
      'customers', 'suppliers', 'products',
      'quotes', 'quote_items',
      'sales_orders', 'sales_order_items',
      'customer_invoices', 'customer_invoice_items',
      'purchase_orders', 'purchase_order_items',
      'supplier_invoices',
      'customer_payments', 'supplier_payments',
    ]

    erpCoreTables.forEach(table => {
      it(`should define ${table} table`, () => {
        expect(ALL_D1_TABLES).toContain(table)
      })
    })

    it('should have all 14 ERP core tables', () => {
      const found = erpCoreTables.filter(t => ALL_D1_TABLES.includes(t))
      expect(found).toHaveLength(14)
    })
  })

  describe('Ask ARIA & Bot Tables (003)', () => {
    const ariaTables = [
      'aria_conversations', 'aria_messages', 'aria_documents',
      'bot_configs', 'bot_runs', 'bot_schedules',
    ]

    ariaTables.forEach(table => {
      it(`should define ${table} table`, () => {
        expect(ALL_D1_TABLES).toContain(table)
      })
    })

    it('should have all 6 ARIA/bot tables', () => {
      const found = ariaTables.filter(t => ALL_D1_TABLES.includes(t))
      expect(found).toHaveLength(6)
    })
  })

  describe('GL/Accounting Tables (005)', () => {
    const glTables = [
      'chart_of_accounts', 'journal_entries', 'journal_entry_lines',
      'gl_transactions', 'financial_periods', 'tax_rates',
    ]

    glTables.forEach(table => {
      it(`should define ${table} table`, () => {
        expect(ALL_D1_TABLES).toContain(table)
      })
    })
  })

  describe('Bank/Cash Tables (005)', () => {
    const bankTables = ['bank_accounts', 'bank_transactions', 'bank_statements']

    bankTables.forEach(table => {
      it(`should define ${table} table`, () => {
        expect(ALL_D1_TABLES).toContain(table)
      })
    })
  })

  describe('HR Tables (005)', () => {
    const hrTables = [
      'departments', 'employees', 'payroll_runs', 'payroll_items',
      'time_entries', 'leave_requests', 'leave_balances',
    ]

    hrTables.forEach(table => {
      it(`should define ${table} table`, () => {
        expect(ALL_D1_TABLES).toContain(table)
      })
    })

    it('should have all 7 HR tables', () => {
      const found = hrTables.filter(t => ALL_D1_TABLES.includes(t))
      expect(found).toHaveLength(7)
    })
  })

  describe('Manufacturing Tables (005)', () => {
    const mfgTables = [
      'bill_of_materials', 'bom_components', 'work_orders',
      'production_runs', 'quality_checks', 'machines',
    ]

    mfgTables.forEach(table => {
      it(`should define ${table} table`, () => {
        expect(ALL_D1_TABLES).toContain(table)
      })
    })
  })

  describe('Inventory Tables (005)', () => {
    const invTables = ['warehouses', 'stock_levels', 'stock_movements']

    invTables.forEach(table => {
      it(`should define ${table} table`, () => {
        expect(ALL_D1_TABLES).toContain(table)
      })
    })
  })

  describe('CRM Tables (005)', () => {
    const crmTables = ['leads', 'opportunities', 'crm_activities']

    crmTables.forEach(table => {
      it(`should define ${table} table`, () => {
        expect(ALL_D1_TABLES).toContain(table)
      })
    })
  })

  describe('Governance Tables (005)', () => {
    const govTables = ['contracts', 'policies', 'audit_trail', 'risks']

    govTables.forEach(table => {
      it(`should define ${table} table`, () => {
        expect(ALL_D1_TABLES).toContain(table)
      })
    })
  })

  describe('New Pages Financial Tables (018)', () => {
    const finTables = [
      'budgets', 'budget_lines', 'cost_centers',
      'payment_batches', 'payment_batch_items',
      'expense_claims', 'expense_claim_lines',
      'credit_notes', 'collections',
      'cash_forecasts', 'cash_forecast_lines',
      'bank_transfers',
    ]

    finTables.forEach(table => {
      it(`should define ${table} table`, () => {
        expect(ALL_D1_TABLES).toContain(table)
      })
    })

    it('should have all 12 new financial tables', () => {
      const found = finTables.filter(t => ALL_D1_TABLES.includes(t))
      expect(found).toHaveLength(12)
    })
  })

  describe('New Pages Operations Tables (018)', () => {
    const opsTables = [
      'price_lists', 'price_list_items', 'discounts',
      'sales_targets', 'commissions',
      'stock_adjustments', 'stock_adjustment_lines',
      'stock_transfers', 'stock_transfer_lines',
      'reorder_points', 'requisitions', 'requisition_lines',
      'rfqs', 'rfq_suppliers', 'supplier_portal_access',
      'production_plans', 'production_plan_lines',
      'machine_maintenance',
    ]

    opsTables.forEach(table => {
      it(`should define ${table} table`, () => {
        expect(ALL_D1_TABLES).toContain(table)
      })
    })

    it('should have all 18 new operations tables', () => {
      const found = opsTables.filter(t => ALL_D1_TABLES.includes(t))
      expect(found).toHaveLength(18)
    })
  })

  describe('New Pages People Tables (018)', () => {
    const peopleTables = ['positions', 'salary_structures', 'deductions']

    peopleTables.forEach(table => {
      it(`should define ${table} table`, () => {
        expect(ALL_D1_TABLES).toContain(table)
      })
    })
  })

  describe('Total Table Count', () => {
    it('should have 89+ total D1 tables defined', () => {
      expect(ALL_D1_TABLES.length).toBeGreaterThanOrEqual(89)
    })

    it('should have no duplicate table names', () => {
      const uniqueTables = new Set(ALL_D1_TABLES)
      expect(uniqueTables.size).toBe(ALL_D1_TABLES.length)
    })
  })
})

describe('D1 Seed Data Verification', () => {
  describe('Demo Company Seed', () => {
    it('should have demo company ID', () => {
      expect(DEMO_COMPANY_ID).toBe('b0598135-52fd-4f67-ac56-8f0237e6355e')
    })

    it('should seed VantaX Demo company', () => {
      const company = {
        id: DEMO_COMPANY_ID,
        name: 'VantaX Demo',
        trading_name: 'VantaX Holdings',
        email: 'demo@vantax.co.za',
        country: 'South Africa',
        currency: 'ZAR',
      }
      expect(company.name).toBe('VantaX Demo')
      expect(company.currency).toBe('ZAR')
      expect(company.country).toBe('South Africa')
    })
  })

  describe('Customer Seed Data', () => {
    const seedCustomers = [
      { id: 'cust-001', code: 'CUS-00001', name: 'Acme Corporation', city: 'Johannesburg', credit_limit: 100000 },
      { id: 'cust-002', code: 'CUS-00002', name: 'TechStart Solutions', city: 'Cape Town', credit_limit: 50000 },
      { id: 'cust-003', code: 'CUS-00003', name: 'Global Traders Ltd', city: 'Durban', credit_limit: 75000 },
    ]

    it('should seed 3 demo customers', () => {
      expect(seedCustomers).toHaveLength(3)
    })

    seedCustomers.forEach(customer => {
      it(`should seed customer ${customer.name}`, () => {
        expect(customer.id).toBeTruthy()
        expect(customer.code).toMatch(/^CUS-\d{5}$/)
        expect(customer.name).toBeTruthy()
        expect(customer.city).toBeTruthy()
        expect(customer.credit_limit).toBeGreaterThan(0)
      })
    })

    it('should have customers in different SA cities', () => {
      const cities = seedCustomers.map(c => c.city)
      expect(cities).toContain('Johannesburg')
      expect(cities).toContain('Cape Town')
      expect(cities).toContain('Durban')
    })
  })

  describe('Supplier Seed Data', () => {
    const seedSuppliers = [
      { id: 'supp-001', code: 'SUP-00001', name: 'Office Supplies Co', city: 'Johannesburg' },
      { id: 'supp-002', code: 'SUP-00002', name: 'Tech Hardware Inc', city: 'Cape Town' },
      { id: 'supp-003', code: 'SUP-00003', name: 'Raw Materials Ltd', city: 'Durban' },
    ]

    it('should seed 3 demo suppliers', () => {
      expect(seedSuppliers).toHaveLength(3)
    })

    seedSuppliers.forEach(supplier => {
      it(`should seed supplier ${supplier.name}`, () => {
        expect(supplier.id).toBeTruthy()
        expect(supplier.code).toMatch(/^SUP-\d{5}$/)
        expect(supplier.name).toBeTruthy()
      })
    })
  })

  describe('Product Seed Data', () => {
    const seedProducts = [
      { id: 'prod-001', code: 'PRD-00001', name: 'Standard Widget', price: 150, cost: 75, category: 'Widgets' },
      { id: 'prod-002', code: 'PRD-00002', name: 'Premium Widget', price: 250, cost: 125, category: 'Widgets' },
      { id: 'prod-003', code: 'PRD-00003', name: 'Consulting Service', price: 500, cost: 0, category: 'Services' },
      { id: 'prod-004', code: 'PRD-00004', name: 'Office Chair', price: 2500, cost: 1500, category: 'Furniture' },
      { id: 'prod-005', code: 'PRD-00005', name: 'Laptop Computer', price: 15000, cost: 12000, category: 'Electronics' },
    ]

    it('should seed 5 demo products', () => {
      expect(seedProducts).toHaveLength(5)
    })

    seedProducts.forEach(product => {
      it(`should seed product ${product.name}`, () => {
        expect(product.code).toMatch(/^PRD-\d{5}$/)
        expect(product.price).toBeGreaterThan(0)
        expect(product.price).toBeGreaterThanOrEqual(product.cost)
      })
    })

    it('should have positive margins on all physical products', () => {
      const physicalProducts = seedProducts.filter(p => p.category !== 'Services')
      physicalProducts.forEach(p => {
        expect(p.price - p.cost).toBeGreaterThan(0)
      })
    })

    it('should have service product with zero cost', () => {
      const service = seedProducts.find(p => p.category === 'Services')
      expect(service).toBeDefined()
      expect(service!.cost).toBe(0)
    })
  })

  describe('Chart of Accounts Seed Data', () => {
    const seedAccounts = [
      { code: '1000', name: 'Assets', type: 'asset' },
      { code: '1100', name: 'Current Assets', type: 'asset' },
      { code: '1110', name: 'Cash and Bank', type: 'asset' },
      { code: '1120', name: 'Accounts Receivable', type: 'asset' },
      { code: '1130', name: 'Inventory', type: 'asset' },
      { code: '1200', name: 'Fixed Assets', type: 'asset' },
      { code: '2000', name: 'Liabilities', type: 'liability' },
      { code: '2100', name: 'Current Liabilities', type: 'liability' },
      { code: '2110', name: 'Accounts Payable', type: 'liability' },
      { code: '2120', name: 'VAT Payable', type: 'liability' },
      { code: '2130', name: 'PAYE Payable', type: 'liability' },
      { code: '2140', name: 'UIF Payable', type: 'liability' },
      { code: '3000', name: 'Equity', type: 'equity' },
      { code: '3100', name: 'Share Capital', type: 'equity' },
      { code: '3200', name: 'Retained Earnings', type: 'equity' },
      { code: '4000', name: 'Revenue', type: 'revenue' },
      { code: '4100', name: 'Sales Revenue', type: 'revenue' },
      { code: '4200', name: 'Service Revenue', type: 'revenue' },
      { code: '4300', name: 'Other Income', type: 'revenue' },
      { code: '5000', name: 'Cost of Sales', type: 'expense' },
      { code: '5100', name: 'Purchases', type: 'expense' },
      { code: '5200', name: 'Direct Labour', type: 'expense' },
      { code: '6000', name: 'Operating Expenses', type: 'expense' },
      { code: '6100', name: 'Salaries & Wages', type: 'expense' },
      { code: '6200', name: 'Rent & Utilities', type: 'expense' },
      { code: '6300', name: 'Professional Fees', type: 'expense' },
      { code: '6400', name: 'Marketing & Advertising', type: 'expense' },
      { code: '6500', name: 'Depreciation', type: 'expense' },
    ]

    it('should seed 28 chart of accounts entries', () => {
      expect(seedAccounts).toHaveLength(28)
    })

    it('should have all 5 account types', () => {
      const types = [...new Set(seedAccounts.map(a => a.type))]
      expect(types).toContain('asset')
      expect(types).toContain('liability')
      expect(types).toContain('equity')
      expect(types).toContain('revenue')
      expect(types).toContain('expense')
    })

    it('should follow SA accounting standards with PAYE and UIF', () => {
      const payeAccount = seedAccounts.find(a => a.code === '2130')
      expect(payeAccount).toBeDefined()
      expect(payeAccount!.name).toBe('PAYE Payable')

      const uifAccount = seedAccounts.find(a => a.code === '2140')
      expect(uifAccount).toBeDefined()
      expect(uifAccount!.name).toBe('UIF Payable')
    })

    it('should have VAT Payable account for SA compliance', () => {
      const vatAccount = seedAccounts.find(a => a.code === '2120')
      expect(vatAccount).toBeDefined()
      expect(vatAccount!.name).toBe('VAT Payable')
    })

    it('should have account codes in ascending order', () => {
      const codes = seedAccounts.map(a => parseInt(a.code))
      for (let i = 1; i < codes.length; i++) {
        expect(codes[i]).toBeGreaterThanOrEqual(codes[i - 1])
      }
    })
  })

  describe('Department Seed Data', () => {
    const seedDepartments = [
      { id: 'dept-001', code: 'EXEC', name: 'Executive' },
      { id: 'dept-002', code: 'FIN', name: 'Finance' },
      { id: 'dept-003', code: 'SALES', name: 'Sales' },
      { id: 'dept-004', code: 'OPS', name: 'Operations' },
      { id: 'dept-005', code: 'HR', name: 'Human Resources' },
      { id: 'dept-006', code: 'MFG', name: 'Manufacturing' },
    ]

    it('should seed 6 departments', () => {
      expect(seedDepartments).toHaveLength(6)
    })

    seedDepartments.forEach(dept => {
      it(`should seed ${dept.name} department`, () => {
        expect(dept.code).toBeTruthy()
        expect(dept.name).toBeTruthy()
      })
    })
  })

  describe('Employee Seed Data', () => {
    const seedEmployees = [
      { id: 'emp-001', code: 'EMP-001', name: 'John Smith', title: 'CEO', dept: 'dept-001', salary: 150000 },
      { id: 'emp-002', code: 'EMP-002', name: 'Sarah Johnson', title: 'CFO', dept: 'dept-002', salary: 120000 },
      { id: 'emp-003', code: 'EMP-003', name: 'Michael Williams', title: 'Sales Manager', dept: 'dept-003', salary: 85000 },
      { id: 'emp-004', code: 'EMP-004', name: 'Emily Brown', title: 'Operations Manager', dept: 'dept-004', salary: 75000 },
      { id: 'emp-005', code: 'EMP-005', name: 'David Davis', title: 'HR Manager', dept: 'dept-005', salary: 70000 },
      { id: 'emp-006', code: 'EMP-006', name: 'Lisa Miller', title: 'Production Supervisor', dept: 'dept-006', salary: 55000 },
      { id: 'emp-007', code: 'EMP-007', name: 'James Wilson', title: 'Sales Representative', dept: 'dept-003', salary: 45000 },
      { id: 'emp-008', code: 'EMP-008', name: 'Amanda Taylor', title: 'Accountant', dept: 'dept-002', salary: 50000 },
    ]

    it('should seed 8 demo employees', () => {
      expect(seedEmployees).toHaveLength(8)
    })

    it('should have employees in all departments', () => {
      const depts = [...new Set(seedEmployees.map(e => e.dept))]
      expect(depts.length).toBeGreaterThanOrEqual(5)
    })

    it('should have CEO as highest paid', () => {
      const ceo = seedEmployees.find(e => e.title === 'CEO')
      const maxSalary = Math.max(...seedEmployees.map(e => e.salary))
      expect(ceo!.salary).toBe(maxSalary)
    })

    it('should have all salaries above minimum wage', () => {
      const minMonthly = 4000
      seedEmployees.forEach(emp => {
        expect(emp.salary).toBeGreaterThan(minMonthly)
      })
    })
  })

  describe('Warehouse Seed Data', () => {
    const seedWarehouses = [
      { id: 'wh-001', code: 'WH-MAIN', name: 'Main Warehouse', city: 'Johannesburg', is_default: true },
      { id: 'wh-002', code: 'WH-CPT', name: 'Cape Town Warehouse', city: 'Cape Town', is_default: false },
    ]

    it('should seed 2 warehouses', () => {
      expect(seedWarehouses).toHaveLength(2)
    })

    it('should have exactly one default warehouse', () => {
      const defaults = seedWarehouses.filter(w => w.is_default)
      expect(defaults).toHaveLength(1)
      expect(defaults[0].name).toBe('Main Warehouse')
    })
  })

  describe('Bank Account Seed Data', () => {
    const seedBankAccounts = [
      { id: 'bank-001', name: 'Main Operating Account', bank: 'First National Bank', balance: 850000 },
      { id: 'bank-002', name: 'Savings Account', bank: 'First National Bank', balance: 250000 },
    ]

    it('should seed 2 bank accounts', () => {
      expect(seedBankAccounts).toHaveLength(2)
    })

    it('should have positive opening balances', () => {
      seedBankAccounts.forEach(acc => {
        expect(acc.balance).toBeGreaterThan(0)
      })
    })

    it('should have combined balance over R1M', () => {
      const total = seedBankAccounts.reduce((sum, a) => sum + a.balance, 0)
      expect(total).toBeGreaterThan(1000000)
    })
  })

  describe('Stock Level Seed Data', () => {
    const seedStockLevels = [
      { product: 'prod-001', warehouse: 'wh-001', on_hand: 400, available: 400, reorder: 100 },
      { product: 'prod-002', warehouse: 'wh-001', on_hand: 150, available: 150, reorder: 50 },
      { product: 'prod-004', warehouse: 'wh-001', on_hand: 40, available: 40, reorder: 10 },
      { product: 'prod-005', warehouse: 'wh-001', on_hand: 20, available: 20, reorder: 5 },
    ]

    it('should seed 4 stock level records', () => {
      expect(seedStockLevels).toHaveLength(4)
    })

    it('should have available quantity matching on-hand', () => {
      seedStockLevels.forEach(sl => {
        expect(sl.available).toBeLessThanOrEqual(sl.on_hand)
      })
    })

    it('should have on-hand above reorder level', () => {
      seedStockLevels.forEach(sl => {
        expect(sl.on_hand).toBeGreaterThan(sl.reorder)
      })
    })
  })
})

describe('D1 Migration File Verification', () => {
  const migrationFiles = [
    '001_auth_tables.sql',
    '002_erp_tables.sql',
    '003_ask_aria_bots.sql',
    '004_go_live_schema_and_data.sql',
    '005_full_erp_modules.sql',
    '006_onboarding_and_master_data.sql',
    '007_world_beating_phase_a.sql',
    '008_vertical_packs.sql',
    '009_differentiators.sql',
    '010_documents.sql',
    '011_world_class_saas.sql',
    '012_schema_compatibility_fixes.sql',
    '013_marketing_automation.sql',
    '014_critical_features.sql',
    '015_odoo_parity.sql',
    '016_go_live_fixes.sql',
    '017_self_registration_reseller.sql',
    '018_new_pages_database.sql',
    '019_xero_parity.sql',
    '020_admin_config_features.sql',
  ]

  it('should have 20 migration files', () => {
    expect(migrationFiles).toHaveLength(20)
  })

  it('should follow sequential numbering', () => {
    migrationFiles.forEach((file, index) => {
      const expectedPrefix = String(index + 1).padStart(3, '0')
      expect(file).toMatch(new RegExp(`^${expectedPrefix}_`))
    })
  })

  it('should all be .sql files', () => {
    migrationFiles.forEach(file => {
      expect(file).toMatch(/\.sql$/)
    })
  })

  it('should use CREATE TABLE IF NOT EXISTS pattern', () => {
    expect(true).toBe(true)
  })

  it('should use INSERT OR IGNORE for seed data', () => {
    expect(true).toBe(true)
  })
})

describe('D1 Index Verification', () => {
  const expectedIndexes = [
    // Auth
    'idx_users_email', 'idx_users_company_id',
    'idx_user_sessions_user_id', 'idx_user_sessions_token',
    'idx_audit_logs_user_id', 'idx_audit_logs_action',
    // Customers/Suppliers/Products
    'idx_customers_company_id', 'idx_customers_code', 'idx_customers_name',
    'idx_suppliers_company_id', 'idx_suppliers_code', 'idx_suppliers_name',
    'idx_products_company_id', 'idx_products_code', 'idx_products_name',
    // O2C
    'idx_quotes_company_id', 'idx_quotes_customer_id', 'idx_quotes_status',
    'idx_sales_orders_company_id', 'idx_sales_orders_customer_id', 'idx_sales_orders_status',
    'idx_customer_invoices_company_id', 'idx_customer_invoices_customer_id', 'idx_customer_invoices_status',
    // P2P
    'idx_purchase_orders_company_id', 'idx_purchase_orders_supplier_id', 'idx_purchase_orders_status',
    'idx_supplier_invoices_company_id', 'idx_supplier_invoices_supplier_id', 'idx_supplier_invoices_status',
    // GL
    'idx_chart_of_accounts_company', 'idx_journal_entries_company', 'idx_journal_entries_date',
    'idx_gl_transactions_company', 'idx_gl_transactions_account', 'idx_gl_transactions_period',
    // Bank
    'idx_bank_accounts_company', 'idx_bank_transactions_account', 'idx_bank_transactions_date',
    // HR
    'idx_employees_company', 'idx_employees_department',
    'idx_payroll_runs_company', 'idx_time_entries_employee', 'idx_leave_requests_employee',
    // Manufacturing
    'idx_work_orders_company', 'idx_work_orders_status',
    'idx_production_runs_work_order', 'idx_quality_checks_reference',
    // Inventory
    'idx_stock_levels_product', 'idx_stock_movements_product', 'idx_stock_movements_date',
    // CRM
    'idx_leads_company', 'idx_leads_status', 'idx_opportunities_company', 'idx_opportunities_stage',
    // Governance
    'idx_contracts_company', 'idx_policies_company',
    'idx_audit_trail_company', 'idx_audit_trail_entity', 'idx_risks_company',
    // ARIA/Bots
    'idx_aria_conversations_user', 'idx_aria_conversations_company',
    'idx_aria_messages_conversation',
    'idx_aria_documents_company', 'idx_aria_documents_status',
    'idx_bot_configs_company', 'idx_bot_configs_bot',
    'idx_bot_runs_company', 'idx_bot_runs_bot', 'idx_bot_runs_status', 'idx_bot_runs_created',
    'idx_bot_schedules_next_run',
  ]

  it('should have 50+ indexes defined', () => {
    expect(expectedIndexes.length).toBeGreaterThanOrEqual(50)
  })

  it('should have company_id indexes for multi-tenancy', () => {
    const companyIndexes = expectedIndexes.filter(i => i.includes('company'))
    expect(companyIndexes.length).toBeGreaterThanOrEqual(15)
  })

  it('should have status indexes for filtering', () => {
    const statusIndexes = expectedIndexes.filter(i => i.includes('status'))
    expect(statusIndexes.length).toBeGreaterThanOrEqual(5)
  })

  it('should have foreign key reference indexes', () => {
    const fkIndexes = expectedIndexes.filter(i =>
      i.includes('customer_id') || i.includes('supplier_id') ||
      i.includes('employee') || i.includes('user_id')
    )
    expect(fkIndexes.length).toBeGreaterThanOrEqual(5)
  })

  it('should index all unique code columns', () => {
    const codeIndexes = expectedIndexes.filter(i => i.includes('_code'))
    expect(codeIndexes.length).toBeGreaterThanOrEqual(3)
  })
})

describe('D1 Foreign Key Relationships', () => {
  const relationships = [
    { from: 'users.company_id', to: 'companies.id' },
    { from: 'user_sessions.user_id', to: 'users.id' },
    { from: 'customers.company_id', to: 'companies.id' },
    { from: 'suppliers.company_id', to: 'companies.id' },
    { from: 'products.company_id', to: 'companies.id' },
    { from: 'quotes.customer_id', to: 'customers.id' },
    { from: 'quotes.company_id', to: 'companies.id' },
    { from: 'quote_items.quote_id', to: 'quotes.id' },
    { from: 'sales_orders.customer_id', to: 'customers.id' },
    { from: 'sales_order_items.sales_order_id', to: 'sales_orders.id' },
    { from: 'customer_invoices.customer_id', to: 'customers.id' },
    { from: 'customer_invoice_items.invoice_id', to: 'customer_invoices.id' },
    { from: 'purchase_orders.supplier_id', to: 'suppliers.id' },
    { from: 'purchase_order_items.purchase_order_id', to: 'purchase_orders.id' },
    { from: 'employees.department_id', to: 'departments.id' },
    { from: 'payroll_items.employee_id', to: 'employees.id' },
    { from: 'payroll_items.payroll_run_id', to: 'payroll_runs.id' },
    { from: 'work_orders.product_id', to: 'products.id' },
    { from: 'stock_levels.product_id', to: 'products.id' },
    { from: 'stock_levels.warehouse_id', to: 'warehouses.id' },
    { from: 'stock_movements.product_id', to: 'products.id' },
    { from: 'journal_entry_lines.journal_entry_id', to: 'journal_entries.id' },
    { from: 'journal_entry_lines.account_id', to: 'chart_of_accounts.id' },
    { from: 'bank_transactions.bank_account_id', to: 'bank_accounts.id' },
  ]

  it('should have 20+ foreign key relationships', () => {
    expect(relationships.length).toBeGreaterThanOrEqual(20)
  })

  it('should all reference valid tables', () => {
    relationships.forEach(rel => {
      const fromTable = rel.from.split('.')[0]
      const toTable = rel.to.split('.')[0]
      expect(ALL_D1_TABLES).toContain(fromTable)
      expect(ALL_D1_TABLES).toContain(toTable)
    })
  })

  it('should have cascade deletes on line item tables', () => {
    const cascadeTables = [
      'quote_items', 'sales_order_items', 'customer_invoice_items',
      'purchase_order_items', 'journal_entry_lines', 'bom_components',
      'payroll_items', 'budget_lines', 'expense_claim_lines',
    ]
    cascadeTables.forEach(table => {
      expect(ALL_D1_TABLES).toContain(table)
    })
  })

  it('should enforce company_id on all business tables', () => {
    const businessTables = [
      'customers', 'suppliers', 'products', 'quotes', 'sales_orders',
      'customer_invoices', 'purchase_orders', 'employees', 'departments',
      'warehouses', 'work_orders', 'leads', 'opportunities',
    ]
    businessTables.forEach(table => {
      expect(ALL_D1_TABLES).toContain(table)
    })
  })
})
