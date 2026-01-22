/**
 * ARIA ERP - Master Test Configuration
 * Centralized configuration for all E2E tests
 */

// Environment configuration
export const TEST_CONFIG = {
  // Base URLs
  BASE_URL: process.env.FRONTEND_URL || 'https://aria.vantax.co.za',
  API_URL: process.env.API_URL || 'https://aria-api.reshigan-085.workers.dev',
  
  // Timeouts
  DEFAULT_TIMEOUT: 30000,
  NAVIGATION_TIMEOUT: 15000,
  API_TIMEOUT: 10000,
  
  // Test credentials
  DEMO_USER: {
    email: process.env.TEST_EMAIL || 'demo@aria.vantax.co.za',
    password: process.env.TEST_PASSWORD || 'Demo123!'
  },
  
  // Test data prefixes (for cleanup)
  TEST_PREFIX: 'TEST_',
  
  // Retry configuration
  RETRIES: 2,
  
  // Screenshot on failure
  SCREENSHOT_ON_FAILURE: true
};

// All routes in the system organized by module
export const ROUTES = {
  // Authentication
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    LOGOUT: '/logout'
  },
  
  // Dashboard
  DASHBOARD: {
    MAIN: '/dashboard',
    EXECUTIVE: '/dashboard',
    ANALYTICS: '/analytics'
  },
  
  // Financial Module
  FINANCIAL: {
    // General Ledger
    GL: '/gl',
    GL_JOURNAL_ENTRIES: '/gl/journal-entries',
    GL_CHART_OF_ACCOUNTS: '/gl/chart-of-accounts',
    GL_BUDGETS: '/gl/budgets',
    GL_COST_CENTERS: '/gl/cost-centers',
    
    // Accounts Payable
    AP: '/ap',
    AP_INVOICES: '/ap/invoices',
    AP_BILLS: '/ap/bills',
    AP_PAYMENTS: '/ap/payments',
    AP_SUPPLIERS: '/ap/suppliers',
    AP_PAYMENT_BATCHES: '/ap/payment-batches',
    AP_EXPENSE_CLAIMS: '/ap/expense-claims',
    
    // Accounts Receivable
    AR: '/ar',
    AR_CUSTOMERS: '/ar/customers',
    AR_INVOICES: '/ar/invoices',
    AR_INVOICES_NEW: '/ar/invoices/new',
    AR_RECEIPTS: '/ar/receipts',
    AR_CREDIT_NOTES: '/ar/credit-notes',
    AR_COLLECTIONS: '/ar/collections',
    
    // Banking
    BANKING: '/banking',
    BANKING_ACCOUNTS: '/banking/accounts',
    BANKING_RECONCILIATION: '/banking/reconciliation',
    BANKING_CASH_FORECAST: '/banking/cash-forecast',
    BANKING_TRANSFERS: '/banking/transfers',
    
    // Reports
    REPORTS_PL: '/reports/profit-loss',
    REPORTS_BALANCE_SHEET: '/reports/balance-sheet',
    REPORTS_AR_AGING: '/reports/ar-aging',
    REPORTS_VAT_SUMMARY: '/reports/vat-summary'
  },
  
  // Operations Module
  OPERATIONS: {
    // Sales & CRM
    CRM: '/crm',
    CRM_CUSTOMERS: '/crm/customers',
    QUOTES: '/quotes',
    SALES_ORDERS: '/sales-orders',
    DELIVERIES: '/deliveries',
    PRICE_LISTS: '/sales/price-lists',
    DISCOUNTS: '/sales/discounts',
    SALES_TARGETS: '/sales/targets',
    COMMISSIONS: '/sales/commissions',
    
    // Inventory
    INVENTORY: '/inventory',
    INVENTORY_PRODUCTS: '/inventory/products',
    INVENTORY_STOCK: '/inventory/stock',
    INVENTORY_WAREHOUSES: '/inventory/warehouses',
    INVENTORY_STOCK_MOVEMENTS: '/inventory/stock-movements',
    INVENTORY_STOCK_ADJUSTMENTS: '/inventory/stock-adjustments',
    INVENTORY_STOCK_TRANSFERS: '/inventory/stock-transfers',
    INVENTORY_REORDER_POINTS: '/inventory/reorder-points',
    
    // Procurement
    PROCUREMENT: '/procurement',
    PROCUREMENT_PO: '/procurement/purchase-orders',
    PROCUREMENT_GOODS_RECEIPTS: '/procurement/goods-receipts',
    PROCUREMENT_SUPPLIERS: '/procurement/suppliers',
    PROCUREMENT_RFQ: '/procurement/rfq',
    PROCUREMENT_REQUISITIONS: '/procurement/requisitions',
    PROCUREMENT_RFQS: '/procurement/rfqs',
    
    // ERP Procure-to-Pay (alias routes)
    ERP_PO: '/erp/procure-to-pay/purchase-orders',
    ERP_GOODS_RECEIPTS: '/erp/procure-to-pay/goods-receipts',
    ERP_SUPPLIERS: '/erp/procure-to-pay/suppliers',
    
    // Manufacturing
    MANUFACTURING: '/manufacturing',
    MANUFACTURING_WORK_ORDERS: '/manufacturing/work-orders',
    MANUFACTURING_BOM: '/manufacturing/bom',
    MANUFACTURING_PRODUCTION: '/manufacturing/production',
    MANUFACTURING_PLANNING: '/manufacturing/planning',
    MANUFACTURING_MAINTENANCE: '/manufacturing/maintenance'
  },
  
  // People Module
  PEOPLE: {
    // HR
    HR: '/hr',
    HR_DASHBOARD: '/hr/dashboard',
    HR_EMPLOYEES: '/hr/employees',
    HR_DEPARTMENTS: '/hr/departments',
    HR_ATTENDANCE: '/hr/attendance',
    HR_LEAVE: '/hr/leave',
    HR_POSITIONS: '/hr/positions',
    HR_PERFORMANCE_REVIEWS: '/hr/performance-reviews',
    HR_TRAINING: '/hr/training',
    HR_SKILLS_MATRIX: '/hr/skills-matrix',
    
    // Payroll
    PAYROLL: '/payroll',
    PAYROLL_EMPLOYEES: '/payroll/employees',
    PAYROLL_PAYSLIPS: '/payroll/payslips',
    PAYROLL_RUNS: '/payroll/runs',
    PAYROLL_TAX: '/payroll/tax',
    PAYROLL_SALARY_STRUCTURES: '/payroll/salary-structures',
    PAYROLL_DEDUCTIONS: '/payroll/deductions',
    PAYROLL_PAYE_RETURNS: '/payroll/paye-returns',
    PAYROLL_UIF_RETURNS: '/payroll/uif-returns',
    
    // Recruitment
    RECRUITMENT_JOB_POSTINGS: '/recruitment/job-postings',
    RECRUITMENT_APPLICANTS: '/recruitment/applicants',
    RECRUITMENT_ONBOARDING: '/recruitment/onboarding'
  },
  
  // Services Module
  SERVICES: {
    // Field Service
    FIELD_SERVICE: '/field-service',
    FIELD_SERVICE_REQUESTS: '/field-service/requests',
    FIELD_SERVICE_WORK_ORDERS: '/field-service/work-orders',
    FIELD_SERVICE_ORDERS: '/field-service/orders',
    FIELD_SERVICE_TECHNICIANS: '/field-service/technicians',
    FIELD_SERVICE_SCHEDULING: '/field-service/scheduling',
    FIELD_SERVICE_ROUTE_PLANNING: '/field-service/route-planning',
    FIELD_SERVICE_SERVICE_CONTRACTS: '/field-service/service-contracts',
    FIELD_SERVICE_LOCATIONS: '/field-service/locations',
    
    // Projects
    PROJECTS: '/projects',
    PROJECTS_DASHBOARD: '/projects/dashboard',
    PROJECTS_TASKS: '/projects/tasks',
    PROJECTS_TIMESHEETS: '/projects/timesheets',
    PROJECTS_REPORTS: '/projects/reports',
    PROJECTS_MILESTONES: '/projects/milestones',
    
    // Support
    SUPPORT_TICKETS: '/support/tickets',
    SUPPORT_KNOWLEDGE_BASE: '/support/knowledge-base',
    
    // Helpdesk
    HELPDESK: '/helpdesk',
    HELPDESK_TEAMS: '/helpdesk/teams',
    HELPDESK_TICKETS: '/helpdesk/tickets',
    
    // Services
    SERVICES: '/services',
    SERVICES_PROJECTS: '/services/projects',
    SERVICES_TIMESHEETS: '/services/timesheets',
    SERVICES_MILESTONES: '/services/milestones',
    SERVICES_DELIVERABLES: '/services/deliverables',
    SERVICES_ROUTE_PLANNING: '/services/route-planning',
    SERVICES_SERVICE_CONTRACTS: '/services/service-contracts',
    SERVICES_SUPPORT_TICKETS: '/services/support-tickets',
    SERVICES_KNOWLEDGE_BASE: '/services/knowledge-base',
    SERVICES_PROJECT_MILESTONES: '/services/project-milestones'
  },
  
  // Compliance Module
  COMPLIANCE: {
    COMPLIANCE: '/compliance',
    VAT_RETURNS: '/compliance/vat-returns',
    ASSET_REGISTER: '/compliance/asset-register',
    BBBEE: '/compliance/bbbee',
    AUDIT_TRAIL: '/compliance/audit-trail',
    RISK_REGISTER: '/compliance/risk-register',
    DOCUMENT_CONTROL: '/compliance/document-control',
    POLICIES: '/compliance/policies',
    TAX: '/tax',
    TAX_VAT_RETURNS: '/tax/vat-returns',
    LEGAL: '/legal',
    FIXED_ASSETS: '/fixed-assets',
    FIXED_ASSETS_REGISTER: '/fixed-assets/register'
  },
  
  // Admin Module
  ADMIN: {
    SETTINGS: '/settings',
    ADMIN_SYSTEM: '/admin/system',
    ADMIN_COMPANY: '/admin/company',
    ADMIN_COMPANY_SETTINGS: '/admin/company-settings',
    ADMIN_AGENTS: '/admin/agents',
    ADMIN_USERS: '/admin/users',
    ADMIN_DATA_IMPORT: '/admin/data-import',
    ADMIN_DASHBOARD: '/admin/dashboard',
    ADMIN_RBAC: '/admin/rbac',
    INTEGRATIONS: '/integrations',
    MOBILE: '/mobile'
  },
  
  // Agents & Bots
  AGENTS: {
    AGENTS: '/agents',
    AGENTS_DETAIL: '/agents/:agentId'
  },
  
  // Documents
  DOCUMENTS: {
    DOCUMENTS: '/documents',
    DOCUMENTS_TEMPLATES: '/documents/templates',
    DOCUMENTS_GENERATE: '/documents/generate',
    DOCUMENT_CLASSIFICATION: '/document-classification'
  },
  
  // Reports
  REPORTS: {
    REPORTS: '/reports',
    BOT_DASHBOARD: '/reports/bot-dashboard',
    PROFIT_LOSS: '/reports/profit-loss',
    BALANCE_SHEET: '/reports/balance-sheet',
    AR_AGING: '/reports/ar-aging',
    STOCK_VALUATION: '/reports/stock-valuation',
    VAT_SUMMARY: '/reports/vat-summary',
    PAYROLL_ACTIVITY: '/reports/payroll/activity',
    EXPENSE_MANAGEMENT: '/reports/expense/management',
    BBBEE_COMPLIANCE: '/reports/compliance/bbbee'
  },
  
  // Chat & AI
  CHAT: {
    CHAT: '/chat',
    ARIA: '/aria',
    ASK_ARIA: '/ask-aria',
    ASK_ARIA_CLASSIFY: '/ask-aria/classify'
  },
  
  // Pricing
  PRICING: {
    PRICING: '/pricing',
    CUSTOMER_GROUPS: '/pricing/customer-groups',
    PRICELISTS: '/pricing/pricelists',
    RULES: '/pricing/rules',
    CALCULATOR: '/pricing/calculator'
  },
  
  // Product Hierarchy
  PRODUCTS: {
    CATEGORIES: '/products/categories',
    TEMPLATES: '/products/templates',
    ATTRIBUTES: '/products/attributes',
    VARIANTS: '/products/variants'
  },
  
  // Quality
  QUALITY: {
    QUALITY: '/quality'
  },
  
  // Migration
  MIGRATION: {
    MIGRATION: '/migration',
    JOBS: '/migration/jobs',
    VALIDATION: '/migration/validation'
  },
  
  // Pending Actions
  ACTIONS: {
    PENDING: '/actions'
  },
  
  // Master Data
  MASTER_DATA: {
    CUSTOMERS: '/customers',
    SUPPLIERS: '/suppliers',
    MASTER_DATA: '/master-data',
    MASTER_DATA_CUSTOMERS: '/master-data/customers',
    MASTER_DATA_SUPPLIERS: '/master-data/suppliers',
    MASTER_DATA_PRODUCTS: '/master-data/products'
  }
};

// API endpoints for integration tests
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me'
  },
  
  // Dashboard
  DASHBOARD: {
    EXECUTIVE: '/api/dashboard/executive',
    METRICS: '/api/dashboard/metrics'
  },
  
  // BI & Analytics
  BI: {
    EXECUTIVE: '/api/bi/executive-dashboard',
    AR_AGING: '/api/bi/ar-aging',
    AP_AGING: '/api/bi/ap-aging',
    SALES_ANALYTICS: '/api/bi/sales-analytics',
    PROCUREMENT_ANALYTICS: '/api/bi/procurement-analytics'
  },
  
  // ERP
  ERP: {
    CUSTOMERS: '/api/erp/master-data/customers',
    SUPPLIERS: '/api/erp/master-data/suppliers',
    PRODUCTS: '/api/erp/master-data/products',
    PURCHASE_ORDERS: '/api/erp/procure-to-pay/purchase-orders',
    GOODS_RECEIPTS: '/api/erp/procure-to-pay/goods-receipts',
    QUOTES: '/api/erp/order-to-cash/quotes',
    SALES_ORDERS: '/api/erp/order-to-cash/sales-orders',
    INVOICES: '/api/erp/order-to-cash/invoices'
  },
  
  // Bots
  BOTS: {
    LIST: '/api/bots',
    CONFIGS: '/api/bots/configs',
    EXECUTE: '/api/bots/execute',
    RUNS: '/api/bots/runs'
  },
  
  // Documents
  DOCUMENTS: {
    TYPES: '/api/documents/types',
    GENERATE: '/api/documents/generate',
    SEND: '/api/documents/send'
  },
  
  // New Pages
  NEW_PAGES: {
    BUDGETS: '/api/new-pages/budgets',
    COST_CENTERS: '/api/new-pages/cost-centers',
    EXPENSE_CLAIMS: '/api/new-pages/expense-claims',
    COLLECTIONS: '/api/new-pages/collections',
    REQUISITIONS: '/api/new-pages/requisitions',
    POSITIONS: '/api/new-pages/positions',
    PERFORMANCE_REVIEWS: '/api/new-pages/performance-reviews',
    TRAINING_COURSES: '/api/new-pages/training-courses',
    VAT_RETURNS: '/api/new-pages/vat-returns',
    BBBEE_SCORECARDS: '/api/new-pages/bbbee-scorecards',
    SUPPORT_TICKETS: '/api/new-pages/support-tickets'
  },
  
  // Microfeatures
  MICROFEATURES: {
    NOTIFICATIONS: '/api/microfeatures/notifications',
    RECENT_ITEMS: '/api/microfeatures/recent-items',
    FAVORITES: '/api/microfeatures/favorites',
    COMMENTS: '/api/microfeatures/comments',
    TAGS: '/api/microfeatures/tags',
    ACTIVITY: '/api/microfeatures/activity'
  },
  
  // Menu
  MENU: {
    STRUCTURE: '/api/menu/structure'
  },
  
  // Health
  HEALTH: {
    CHECK: '/health'
  }
};

// Test data generators
export const generateTestData = {
  customer: (prefix = TEST_CONFIG.TEST_PREFIX) => ({
    name: `${prefix}Customer_${Date.now()}`,
    email: `${prefix.toLowerCase()}customer_${Date.now()}@test.com`,
    phone: '+27 11 123 4567',
    address: '123 Test Street',
    city: 'Johannesburg',
    postal_code: '2000',
    country: 'South Africa',
    tax_number: `4${Date.now().toString().slice(-9)}`,
    is_active: true
  }),
  
  supplier: (prefix = TEST_CONFIG.TEST_PREFIX) => ({
    name: `${prefix}Supplier_${Date.now()}`,
    email: `${prefix.toLowerCase()}supplier_${Date.now()}@test.com`,
    phone: '+27 11 987 6543',
    address: '456 Test Avenue',
    city: 'Cape Town',
    postal_code: '8000',
    country: 'South Africa',
    tax_number: `4${Date.now().toString().slice(-9)}`,
    is_active: true
  }),
  
  product: (prefix = TEST_CONFIG.TEST_PREFIX) => ({
    name: `${prefix}Product_${Date.now()}`,
    sku: `${prefix}SKU_${Date.now()}`,
    description: 'Test product description',
    unit_price: 100.00,
    cost_price: 50.00,
    quantity_on_hand: 100,
    reorder_level: 10,
    is_active: true
  }),
  
  invoice: (customerId: string, prefix = TEST_CONFIG.TEST_PREFIX) => ({
    customer_id: customerId,
    invoice_number: `${prefix}INV_${Date.now()}`,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subtotal: 1000.00,
    vat_amount: 150.00,
    total: 1150.00,
    status: 'draft',
    line_items: [
      {
        description: 'Test Item 1',
        quantity: 10,
        unit_price: 100.00,
        line_total: 1000.00
      }
    ]
  }),
  
  purchaseOrder: (supplierId: string, prefix = TEST_CONFIG.TEST_PREFIX) => ({
    supplier_id: supplierId,
    po_number: `${prefix}PO_${Date.now()}`,
    po_date: new Date().toISOString().split('T')[0],
    expected_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subtotal: 500.00,
    vat_amount: 75.00,
    total: 575.00,
    status: 'draft',
    line_items: [
      {
        description: 'Test Purchase Item',
        quantity: 5,
        unit_price: 100.00,
        line_total: 500.00
      }
    ]
  }),
  
  quote: (customerId: string, prefix = TEST_CONFIG.TEST_PREFIX) => ({
    customer_id: customerId,
    quote_number: `${prefix}QT_${Date.now()}`,
    quote_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subtotal: 2000.00,
    vat_amount: 300.00,
    total: 2300.00,
    status: 'draft',
    line_items: [
      {
        description: 'Test Quote Item',
        quantity: 20,
        unit_price: 100.00,
        line_total: 2000.00
      }
    ]
  })
};

// Common test selectors
export const SELECTORS = {
  // Navigation
  NAV_MENU: 'nav, [role="navigation"]',
  NAV_ITEM: '[data-testid="nav-item"]',
  
  // Forms
  FORM: 'form',
  INPUT_EMAIL: 'input[name="email"], input[type="email"]',
  INPUT_PASSWORD: 'input[name="password"], input[type="password"]',
  INPUT_SEARCH: 'input[placeholder*="Search"], input[name="search"]',
  BUTTON_SUBMIT: 'button[type="submit"]',
  BUTTON_SAVE: 'button:has-text("Save"), button:has-text("Submit")',
  BUTTON_CANCEL: 'button:has-text("Cancel"), button:has-text("Close")',
  BUTTON_CREATE: 'button:has-text("Create"), button:has-text("Add"), button:has-text("New")',
  BUTTON_EDIT: 'button:has-text("Edit")',
  BUTTON_DELETE: 'button:has-text("Delete")',
  
  // Tables
  TABLE: 'table',
  TABLE_ROW: 'tr',
  TABLE_CELL: 'td',
  
  // Modals
  MODAL: '[role="dialog"], .modal, [data-testid="modal"]',
  MODAL_CLOSE: '[data-testid="modal-close"], button:has-text("Close")',
  
  // Messages
  SUCCESS_MESSAGE: '[data-testid="success-message"], .success, [class*="success"]',
  ERROR_MESSAGE: '[data-testid="error-message"], .error, [class*="error"]',
  
  // Loading
  LOADING: '[data-testid="loading"], .loading, [class*="loading"]',
  SPINNER: '[data-testid="spinner"], .spinner, [class*="spinner"]',
  
  // Cards
  CARD: '[data-testid="card"], .card, [class*="card"]',
  METRIC_CARD: '[data-testid="metric-card"]',
  
  // Dropdowns
  DROPDOWN: 'select, [role="listbox"]',
  DROPDOWN_OPTION: 'option, [role="option"]',
  
  // Tabs
  TAB: '[role="tab"]',
  TAB_PANEL: '[role="tabpanel"]',
  
  // Pagination
  PAGINATION: '[data-testid="pagination"], .pagination',
  PAGINATION_NEXT: 'button:has-text("Next")',
  PAGINATION_PREV: 'button:has-text("Previous")'
};
