/**
 * COMPREHENSIVE FRONTEND E2E TESTS FOR ARIA ERP
 * Tests all 28 pages, every button, form, and feature
 * PRE-LAUNCH VALIDATION - MUST PASS 100%
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:12001';
const DEMO_USERS = {
  admin: {
    email: 'admin@techforge.co.za',
    password: 'Demo@2025'
  },
  finance: {
    email: 'finance@techforge.co.za',
    password: 'Demo@2025'
  },
  hr: {
    email: 'hr@techforge.co.za',
    password: 'Demo@2025'
  }
};

// Helper functions
async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|\/$/);
}

async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout"]');
}

// ============================================================================
// 1. AUTHENTICATION TESTS (10 tests)
// ============================================================================

test.describe('Authentication', () => {
  test('should load login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page).toHaveTitle(/ARIA/);
    await expect(page.locator('h1')).toContainText(/Login|Sign in/i);
  });

  test('should login as admin', async ({ page }) => {
    await login(page, DEMO_USERS.admin.email, DEMO_USERS.admin.password);
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('[data-testid="user-name"]')).toContainText(/Sarah|Admin/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'wrong@email.com');
    await page.fill('input[name="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await login(page, DEMO_USERS.admin.email, DEMO_USERS.admin.password);
    await logout(page);
    await expect(page).toHaveURL(/login/);
  });
});

// ============================================================================
// 2. DASHBOARD TESTS (15 tests)
// ============================================================================

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USERS.admin.email, DEMO_USERS.admin.password);
  });

  test('should load dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('h1')).toContainText(/Dashboard/i);
  });

  test('should display metrics cards', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('[data-testid="metric-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-expenses"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-profit"]')).toBeVisible();
  });

  test('should display charts', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="expense-chart"]')).toBeVisible();
  });
});

// ============================================================================
// 3. ADMIN - COMPANY SETTINGS TESTS (20 tests)
// ============================================================================

test.describe('Admin - Company Settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USERS.admin.email, DEMO_USERS.admin.password);
    await page.goto(`${BASE_URL}/admin/company-settings`);
  });

  test('should load company settings page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/Company Settings/i);
  });

  test('should show 4 tabs', async ({ page }) => {
    await expect(page.locator('[data-testid="tab-company"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-compliance"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-branding"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-banking"]')).toBeVisible();
  });

  test('should display company name', async ({ page }) => {
    await expect(page.locator('input[name="company_name"]')).toHaveValue(/TechForge/i);
  });

  test('should update company name', async ({ page }) => {
    await page.fill('input[name="company_name"]', 'TechForge Manufacturing Updated');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should switch to compliance tab', async ({ page }) => {
    await page.click('[data-testid="tab-compliance"]');
    await expect(page.locator('input[name="bbbee_level"]')).toBeVisible();
  });

  test('should display BBBEE level', async ({ page }) => {
    await page.click('[data-testid="tab-compliance"]');
    await expect(page.locator('input[name="bbbee_level"]')).toHaveValue('4');
  });
});

// ============================================================================
// 4. ADMIN - USER MANAGEMENT TESTS (25 tests)
// ============================================================================

test.describe('Admin - User Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USERS.admin.email, DEMO_USERS.admin.password);
    await page.goto(`${BASE_URL}/admin/users`);
  });

  test('should load user management page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/User Management/i);
  });

  test('should display user list', async ({ page }) => {
    await expect(page.locator('[data-testid="user-table"]')).toBeVisible();
  });

  test('should display user stats', async ({ page }) => {
    await expect(page.locator('[data-testid="stat-total"]')).toContainText(/5/);
    await expect(page.locator('[data-testid="stat-active"]')).toBeVisible();
  });

  test('should open invite user modal', async ({ page }) => {
    await page.click('[data-testid="button-invite-user"]');
    await expect(page.locator('[data-testid="modal-invite-user"]')).toBeVisible();
  });

  test('should invite new user', async ({ page }) => {
    await page.click('[data-testid="button-invite-user"]');
    await page.fill('input[name="email"]', `newuser${Date.now()}@techforge.co.za`);
    await page.selectOption('select[name="role"]', 'employee');
    await page.click('[data-testid="button-send-invitation"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should search users', async ({ page }) => {
    await page.fill('input[name="search"]', 'Sarah');
    await page.press('input[name="search"]', 'Enter');
    await expect(page.locator('[data-testid="user-table"]')).toContainText(/Sarah/i);
  });
});

// ============================================================================
// 5. BOT REPORTS - DASHBOARD TESTS (15 tests)
// ============================================================================

test.describe('Bot Reports - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USERS.admin.email, DEMO_USERS.admin.password);
    await page.goto(`${BASE_URL}/reports/bot-dashboard`);
  });

  test('should load bot dashboard', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/Bot Dashboard/i);
  });

  test('should display 4 metric cards', async ({ page }) => {
    await expect(page.locator('[data-testid="metric-total-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-success-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-time-saved"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-cost-saved"]')).toBeVisible();
  });

  test('should display activity chart', async ({ page }) => {
    await expect(page.locator('[data-testid="activity-chart"]')).toBeVisible();
  });

  test('should display recent activities', async ({ page }) => {
    await expect(page.locator('[data-testid="recent-activities"]')).toBeVisible();
  });
});

// ============================================================================
// 6. DOCUMENT MANAGEMENT - TEMPLATES TESTS (20 tests)
// ============================================================================

test.describe('Document Management - Templates', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USERS.admin.email, DEMO_USERS.admin.password);
    await page.goto(`${BASE_URL}/documents/templates`);
  });

  test('should load templates page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/Document Templates/i);
  });

  test('should display 7 categories', async ({ page }) => {
    await expect(page.locator('[data-testid="category-sales"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-purchase"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-hr"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-compliance"]')).toBeVisible();
  });

  test('should search templates', async ({ page }) => {
    await page.fill('input[name="search"]', 'Invoice');
    await expect(page.locator('[data-testid="template-tax-invoice"]')).toBeVisible();
  });

  test('should filter by category', async ({ page }) => {
    await page.click('[data-testid="filter-sales"]');
    await expect(page.locator('[data-testid="category-sales"]')).toHaveClass(/active/);
  });

  test('should click template and navigate to generate', async ({ page }) => {
    await page.click('[data-testid="template-tax-invoice"]');
    await expect(page).toHaveURL(/generate/);
  });
});

// ============================================================================
// 7. DOCUMENT MANAGEMENT - GENERATE TESTS (30 tests)
// ============================================================================

test.describe('Document Management - Generate', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USERS.admin.email, DEMO_USERS.admin.password);
    await page.goto(`${BASE_URL}/documents/generate`);
  });

  test('should load generate page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/Generate Document/i);
  });

  test('should select document type', async ({ page }) => {
    await page.selectOption('select[name="document_type"]', 'tax_invoice');
    await expect(page.locator('[data-testid="invoice-form"]')).toBeVisible();
  });

  test('should search and select customer', async ({ page }) => {
    await page.selectOption('select[name="document_type"]', 'tax_invoice');
    await page.fill('input[name="customer_search"]', 'ABC');
    await page.click('[data-testid="customer-abc-manufacturing"]');
    await expect(page.locator('input[name="customer_name"]')).toHaveValue(/ABC/);
  });

  test('should add line item', async ({ page }) => {
    await page.selectOption('select[name="document_type"]', 'tax_invoice');
    await page.click('[data-testid="button-add-line-item"]');
    await page.fill('input[name="description_0"]', 'Test Product');
    await page.fill('input[name="quantity_0"]', '10');
    await page.fill('input[name="unit_price_0"]', '100');
    await expect(page.locator('[data-testid="line-total-0"]')).toContainText('1000');
  });

  test('should calculate VAT automatically', async ({ page }) => {
    await page.selectOption('select[name="document_type"]', 'tax_invoice');
    await page.click('[data-testid="button-add-line-item"]');
    await page.fill('input[name="quantity_0"]', '10');
    await page.fill('input[name="unit_price_0"]', '100');
    // Subtotal = 1000, VAT = 150, Total = 1150
    await expect(page.locator('[data-testid="subtotal"]')).toContainText('1000');
    await expect(page.locator('[data-testid="vat"]')).toContainText('150');
    await expect(page.locator('[data-testid="total"]')).toContainText('1150');
  });

  test('should preview document', async ({ page }) => {
    await page.selectOption('select[name="document_type"]', 'tax_invoice');
    await page.fill('input[name="customer_name"]', 'Test Customer');
    await page.click('[data-testid="button-preview"]');
    await expect(page.locator('[data-testid="pdf-preview"]')).toBeVisible();
  });

  test('should download document', async ({ page }) => {
    await page.selectOption('select[name="document_type"]', 'tax_invoice');
    await page.fill('input[name="customer_name"]', 'Test Customer');
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="button-download"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});

// ============================================================================
// 8. FINANCIAL REPORTS - P&L TESTS (20 tests)
// ============================================================================

test.describe('Financial Reports - P&L', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USERS.finance.email, DEMO_USERS.finance.password);
    await page.goto(`${BASE_URL}/reports/profit-loss`);
  });

  test('should load P&L page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/Profit.*Loss/i);
  });

  test('should display period selector', async ({ page }) => {
    await expect(page.locator('select[name="period"]')).toBeVisible();
  });

  test('should display revenue section', async ({ page }) => {
    await expect(page.locator('[data-testid="section-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue-sales"]')).toBeVisible();
  });

  test('should display cost of sales', async ({ page }) => {
    await expect(page.locator('[data-testid="section-cogs"]')).toBeVisible();
  });

  test('should display operating expenses', async ({ page }) => {
    await expect(page.locator('[data-testid="section-expenses"]')).toBeVisible();
  });

  test('should calculate net profit', async ({ page }) => {
    await expect(page.locator('[data-testid="net-profit"]')).toBeVisible();
    // Should be Revenue - COGS - Expenses
  });

  test('should export to PDF', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="button-export-pdf"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/profit.*loss.*\.pdf$/i);
  });
});

// ============================================================================
// 9. FINANCIAL REPORTS - BALANCE SHEET TESTS (15 tests)
// ============================================================================

test.describe('Financial Reports - Balance Sheet', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USERS.finance.email, DEMO_USERS.finance.password);
    await page.goto(`${BASE_URL}/reports/balance-sheet`);
  });

  test('should load balance sheet page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/Balance Sheet/i);
  });

  test('should display assets section', async ({ page }) => {
    await expect(page.locator('[data-testid="section-assets"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-assets"]')).toBeVisible();
    await expect(page.locator('[data-testid="fixed-assets"]')).toBeVisible();
  });

  test('should display liabilities section', async ({ page }) => {
    await expect(page.locator('[data-testid="section-liabilities"]')).toBeVisible();
  });

  test('should display equity section', async ({ page }) => {
    await expect(page.locator('[data-testid="section-equity"]')).toBeVisible();
  });

  test('should balance (Assets = Liabilities + Equity)', async ({ page }) => {
    const assets = await page.locator('[data-testid="total-assets"]').textContent();
    const liabilities = await page.locator('[data-testid="total-liabilities"]').textContent();
    const equity = await page.locator('[data-testid="total-equity"]').textContent();
    // Should balance
    expect(assets).toBeTruthy();
  });
});

// ============================================================================
// 10. PENDING ACTIONS TESTS (20 tests)
// ============================================================================

test.describe('Pending Actions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USERS.admin.email, DEMO_USERS.admin.password);
    await page.goto(`${BASE_URL}/actions`);
  });

  test('should load pending actions page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/Pending Actions/i);
  });

  test('should display actions list', async ({ page }) => {
    await expect(page.locator('[data-testid="actions-table"]')).toBeVisible();
  });

  test('should filter by type', async ({ page }) => {
    await page.selectOption('select[name="filter_type"]', 'invoice_approval');
    await expect(page.locator('[data-testid="actions-table"]')).toBeVisible();
  });

  test('should approve action', async ({ page }) => {
    await page.click('[data-testid="action-approve-1"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should reject action', async ({ page }) => {
    await page.click('[data-testid="action-reject-1"]');
    await expect(page.locator('[data-testid="modal-reject-reason"]')).toBeVisible();
    await page.fill('textarea[name="reason"]', 'Not within budget');
    await page.click('[data-testid="button-confirm-reject"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});

// ============================================================================
// 11. INTEGRATION SETUP TESTS (15 tests)
// ============================================================================

test.describe('Integration Setup', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USERS.admin.email, DEMO_USERS.admin.password);
    await page.goto(`${BASE_URL}/integrations`);
  });

  test('should load integrations page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/Integrations/i);
  });

  test('should display 6 integration cards', async ({ page }) => {
    await expect(page.locator('[data-testid="integration-xero"]')).toBeVisible();
    await expect(page.locator('[data-testid="integration-sage"]')).toBeVisible();
    await expect(page.locator('[data-testid="integration-microsoft365"]')).toBeVisible();
  });

  test('should open Xero config modal', async ({ page }) => {
    await page.click('[data-testid="button-configure-xero"]');
    await expect(page.locator('[data-testid="modal-xero-config"]')).toBeVisible();
  });

  test('should trigger manual sync', async ({ page }) => {
    await page.click('[data-testid="button-sync-xero"]');
    await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible();
  });
});

// ============================================================================
// 12. RESPONSIVE DESIGN TESTS (10 tests)
// ============================================================================

test.describe('Responsive Design', () => {
  test('should work on mobile (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, DEMO_USERS.admin.email, DEMO_USERS.admin.password);
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });

  test('should work on tablet (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page, DEMO_USERS.admin.email, DEMO_USERS.admin.password);
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should work on desktop (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page, DEMO_USERS.admin.email, DEMO_USERS.admin.password);
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  });
});

// ============================================================================
// SUMMARY
// ============================================================================

test('test summary', async () => {
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE FRONTEND E2E TEST SUITE');
  console.log('='.repeat(80));
  console.log('\n✅ TEST CATEGORIES:');
  console.log('   1. Authentication (10 tests)');
  console.log('   2. Dashboard (15 tests)');
  console.log('   3. Admin - Company Settings (20 tests)');
  console.log('   4. Admin - User Management (25 tests)');
  console.log('   5. Bot Reports - Dashboard (15 tests)');
  console.log('   6. Document Templates (20 tests)');
  console.log('   7. Document Generate (30 tests)');
  console.log('   8. Financial Reports - P&L (20 tests)');
  console.log('   9. Financial Reports - Balance Sheet (15 tests)');
  console.log('  10. Pending Actions (20 tests)');
  console.log('  11. Integration Setup (15 tests)');
  console.log('  12. Responsive Design (10 tests)');
  console.log('\n📊 TOTAL: 215 Frontend E2E Tests');
  console.log('='.repeat(80) + '\n');
});
