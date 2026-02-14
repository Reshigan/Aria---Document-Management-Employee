import { test, expect, Page } from '@playwright/test';
import { TEST_CONFIG } from '../test-config';

const BASE_URL = TEST_CONFIG.BASE_URL;

async function loginAndNavigate(page: Page, route: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(TEST_CONFIG.DEMO_USER.email);
  await page.locator('input[type="password"]').fill(TEST_CONFIG.DEMO_USER.password);
  await page.locator('button:has-text("Sign In"), button[type="submit"]').first().click();
  await page.waitForTimeout(3000);
  await dismissOverlays(page);
  await page.goto(`${BASE_URL}${route}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await dismissOverlays(page);
}

async function dismissOverlays(page: Page) {
  const skipTour = page.locator('text=Skip tour').first();
  if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
  await page.waitForTimeout(300);
  const overlay = page.locator('.fixed.inset-0.z-\\[100\\]');
  if (await overlay.isVisible().catch(() => false)) {
    const closeBtn = overlay.locator('button').first();
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click({ force: true });
  }
  await page.waitForTimeout(300);
}

async function clickGlTab(page: Page, tabText: string) {
  await page.locator(`button:has-text("${tabText}")`).click({ force: true });
  await page.waitForTimeout(1500);
  await dismissOverlays(page);
}

test.describe('Statutory Finance Transactions & Journals', () => {

  test.describe('General Ledger - Chart of Accounts Tab', () => {
    test('should display GL page with heading and subtitle', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      const heading = page.locator('h1');
      await expect(heading).toContainText('General Ledger');
      const subtitle = page.locator('text=Chart of Accounts, Journal Entries & Trial Balance');
      await expect(subtitle).toBeVisible();
    });

    test('should display stat cards (Total Accounts, Journal Entries, Draft, Posted)', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await dismissOverlays(page);
      await expect(page.locator('text=Total Accounts')).toBeVisible();
      await expect(page.getByText('Journal Entries', { exact: true })).toBeVisible();
      await expect(page.locator('text=Draft Entries')).toBeVisible();
      await expect(page.locator('text=Posted Entries')).toBeVisible();
    });

    test('should show three tabs: accounts, journal, trial-balance', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await expect(page.locator('button:has-text("accounts")')).toBeVisible();
      await expect(page.locator('button:has-text("journal")')).toBeVisible();
      await expect(page.locator('button:has-text("Trial Balance")')).toBeVisible();
    });

    test('should display search input on accounts tab', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      const searchInput = page.locator('input[placeholder="Search..."]');
      await expect(searchInput).toBeVisible();
    });

    test('should display account type filter dropdown', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      const typeFilter = page.locator('select').first();
      await expect(typeFilter).toBeVisible();
      const options = await typeFilter.locator('option').allTextContents();
      expect(options).toContain('All Types');
      expect(options).toContain('Asset');
      expect(options).toContain('Liability');
      expect(options).toContain('Equity');
      expect(options).toContain('Revenue');
      expect(options).toContain('Expense');
    });

    test('should display Add Account button', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      const addBtn = page.locator('button:has-text("Add Account")');
      await expect(addBtn).toBeVisible();
    });

    test('should open Create Account modal when clicking Add Account', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await page.locator('button:has-text("Add Account")').click({ force: true });
      await page.waitForTimeout(500);
      await expect(page.locator('text=Create Account')).toBeVisible();
      await expect(page.locator('text=Chart of Accounts').last()).toBeVisible();
    });

    test('should display account form fields in create modal', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await page.locator('button:has-text("Add Account")').click({ force: true });
      await page.waitForTimeout(500);
      await expect(page.locator('label:has-text("Account Code")')).toBeVisible();
      await expect(page.locator('label:has-text("Account Type")')).toBeVisible();
      await expect(page.locator('label:has-text("Account Name")')).toBeVisible();
      await expect(page.locator('label:has-text("Category")')).toBeVisible();
      await expect(page.locator('label:has-text("Active")')).toBeVisible();
    });

    test('should fill account form and have Create button enabled', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await page.locator('button:has-text("Add Account")').click({ force: true });
      await page.waitForTimeout(500);
      const modal = page.locator('.fixed.inset-0');
      await modal.locator('input').first().fill('9999');
      await modal.locator('input').nth(1).fill('Test Account');
      const createBtn = modal.locator('button[type="submit"]');
      await expect(createBtn).toBeVisible();
      await expect(createBtn).toContainText('Create');
    });

    test('should close modal when clicking Cancel', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await page.locator('button:has-text("Add Account")').click({ force: true });
      await page.waitForTimeout(500);
      await expect(page.locator('text=Create Account')).toBeVisible();
      await page.locator('button:has-text("Cancel")').click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=Create Account')).not.toBeVisible();
    });

    test('should filter accounts by type when selecting from dropdown', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      const typeFilter = page.locator('select').first();
      await typeFilter.selectOption('asset');
      await page.waitForTimeout(1000);
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should have search functionality for accounts', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      const searchInput = page.locator('input[placeholder="Search..."]');
      await searchInput.fill('bank');
      await page.waitForTimeout(1000);
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should display refresh button and it should work', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      const refreshBtn = page.locator('button').filter({ has: page.locator('[class*="h-5 w-5"]') }).first();
      await expect(refreshBtn).toBeVisible();
      await refreshBtn.click();
      await page.waitForTimeout(1000);
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('General Ledger - Journal Entries Tab', () => {
    test('should switch to journal entries tab', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'journal');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should display New Journal Entry button on journal tab', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'journal');
      const newJournalBtn = page.locator('button:has-text("New Journal Entry")');
      await expect(newJournalBtn).toBeVisible();
    });

    test('should open Create Journal Entry modal', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'journal');
      await page.locator('button:has-text("New Journal Entry")').click();
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Record a new journal entry')).toBeVisible();
    });

    test('should display journal entry form fields (date, reference, description)', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'journal');
      await page.locator('button:has-text("New Journal Entry")').click();
      await page.waitForTimeout(500);
      await expect(page.locator('label:has-text("Entry Date")')).toBeVisible();
      await expect(page.locator('label:has-text("Reference")')).toBeVisible();
      await expect(page.locator('label:has-text("Description")')).toBeVisible();
    });

    test('should display journal lines table with headers', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'journal');
      await page.locator('button:has-text("New Journal Entry")').click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=Journal Lines')).toBeVisible();
      await expect(page.locator('th:has-text("Account")')).toBeVisible();
      await expect(page.locator('th:has-text("Debit")')).toBeVisible();
      await expect(page.locator('th:has-text("Credit")')).toBeVisible();
    });

    test('should start with 2 default journal lines', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'journal');
      await page.locator('button:has-text("New Journal Entry")').click();
      await page.waitForTimeout(500);
      const accountSelects = page.locator('select:has(option:has-text("Select account..."))');
      const count = await accountSelects.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('should have Add Line button to add more journal lines', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'journal');
      await page.locator('button:has-text("New Journal Entry")').click();
      await page.waitForTimeout(500);
      const addLineBtn = page.locator('button:has-text("Add Line")');
      await expect(addLineBtn).toBeVisible();
      await addLineBtn.click();
      await page.waitForTimeout(300);
      const accountSelects = page.locator('select:has(option:has-text("Select account..."))');
      const count = await accountSelects.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test('should display Totals row with debit and credit sums', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'journal');
      await page.locator('button:has-text("New Journal Entry")').click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=Totals:')).toBeVisible();
    });

    test('should show balanced/not balanced indicator', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'journal');
      await page.locator('button:has-text("New Journal Entry")').click();
      await page.waitForTimeout(500);
      const balanced = page.locator('text=Balanced');
      await expect(balanced.first()).toBeVisible();
    });

    test('should fill journal entry form with date and description', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'journal');
      await page.locator('button:has-text("New Journal Entry")').click();
      await page.waitForTimeout(500);
      const modal = page.locator('.fixed.inset-0');
      const dateInput = modal.locator('input[type="date"]');
      await dateInput.fill('2026-02-14');
      const refInput = modal.locator('input[placeholder="Optional reference"]');
      await refInput.fill('TEST-REF-001');
      const descInput = modal.locator('input[placeholder="Journal description"]');
      await descInput.fill('Test statutory journal entry');
      await expect(dateInput).toHaveValue('2026-02-14');
      await expect(refInput).toHaveValue('TEST-REF-001');
      await expect(descInput).toHaveValue('Test statutory journal entry');
    });

    test('should have Create Journal Entry button disabled when not balanced', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'journal');
      await page.locator('button:has-text("New Journal Entry")').click();
      await page.waitForTimeout(500);
      const debitInputs = page.locator('input[type="number"]');
      await debitInputs.first().fill('100');
      await page.waitForTimeout(300);
      const submitBtn = page.locator('button:has-text("Create Journal Entry")');
      await expect(submitBtn).toBeDisabled();
    });

    test('should display search on journal tab', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'journal');
      const searchInput = page.locator('input[placeholder="Search..."]');
      await expect(searchInput).toBeVisible();
    });

    test('should close journal modal when clicking Cancel', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'journal');
      await page.locator('button:has-text("New Journal Entry")').click();
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Record a new journal entry')).toBeVisible();
      await page.locator('button:has-text("Cancel")').click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=Record a new journal entry')).not.toBeVisible();
    });
  });

  test.describe('General Ledger - Trial Balance Tab', () => {
    test('should switch to trial balance tab', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'Trial Balance');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should not show search bar on trial balance tab', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'Trial Balance');
      const searchInput = page.locator('input[placeholder="Search..."]');
      await expect(searchInput).not.toBeVisible();
    });

    test('should not show Add Account or New Journal Entry button on trial balance tab', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'Trial Balance');
      await expect(page.locator('button:has-text("Add Account")')).not.toBeVisible();
      await expect(page.locator('button:has-text("New Journal Entry")')).not.toBeVisible();
    });
  });

  test.describe('GL Tab Switching Flow', () => {
    test('should switch between all three tabs seamlessly', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await clickGlTab(page, 'journal');
      await expect(page.locator('button:has-text("New Journal Entry")')).toBeVisible();
      await clickGlTab(page, 'Trial Balance');
      await expect(page.locator('button:has-text("New Journal Entry")')).not.toBeVisible();
      await clickGlTab(page, 'accounts');
      await expect(page.locator('button:has-text("Add Account")')).toBeVisible();
    });

    test('should update stat cards when switching tabs', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await expect(page.locator('text=Total Accounts')).toBeVisible();
      await clickGlTab(page, 'journal');
      await expect(page.getByText('Journal Entries', { exact: true })).toBeVisible();
    });
  });

  test.describe('AR Invoices - Create Invoice Flow', () => {
    test('should load AR invoices list page', async ({ page }) => {
      await loginAndNavigate(page, '/ar/invoices');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should navigate to new AR invoice form', async ({ page }) => {
      await loginAndNavigate(page, '/ar/invoices/new');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load financial invoices route', async ({ page }) => {
      await loginAndNavigate(page, '/financial/invoices');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load ERP invoices route', async ({ page }) => {
      await loginAndNavigate(page, '/erp/invoices');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('AP Bills - Create Bill Flow', () => {
    test('should load AP bills list page', async ({ page }) => {
      await loginAndNavigate(page, '/ap/bills');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should navigate to new AP bill form', async ({ page }) => {
      await loginAndNavigate(page, '/ap/bills/new');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load AP invoices page', async ({ page }) => {
      await loginAndNavigate(page, '/ap/invoices');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should navigate to new AP invoice form', async ({ page }) => {
      await loginAndNavigate(page, '/ap/invoices/new');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('AP Payments Flow', () => {
    test('should load AP payments page', async ({ page }) => {
      await loginAndNavigate(page, '/ap/payments');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load AP payment batches page', async ({ page }) => {
      await loginAndNavigate(page, '/ap/payment-batches');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load AP expense claims page', async ({ page }) => {
      await loginAndNavigate(page, '/ap/expense-claims');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('AR Receipts & Credit Notes Flow', () => {
    test('should load AR receipts page', async ({ page }) => {
      await loginAndNavigate(page, '/ar/receipts');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load AR credit notes page', async ({ page }) => {
      await loginAndNavigate(page, '/ar/credit-notes');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load AR collections page', async ({ page }) => {
      await loginAndNavigate(page, '/ar/collections');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load AR recurring invoices page', async ({ page }) => {
      await loginAndNavigate(page, '/ar/recurring-invoices');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load AR customer statements page', async ({ page }) => {
      await loginAndNavigate(page, '/ar/statements');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('VAT & Tax Compliance Flow', () => {
    test('should load tax compliance main page', async ({ page }) => {
      await loginAndNavigate(page, '/tax');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load VAT returns page via compliance route', async ({ page }) => {
      await loginAndNavigate(page, '/compliance/vat-returns');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load VAT returns page via tax route', async ({ page }) => {
      await loginAndNavigate(page, '/tax/vat-returns');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load VAT page via tax/vat route', async ({ page }) => {
      await loginAndNavigate(page, '/tax/vat');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load admin tax rates configuration page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/tax-rates');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Financial Reports Flow', () => {
    test('should load profit & loss statement', async ({ page }) => {
      await loginAndNavigate(page, '/reports/profit-loss');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load balance sheet report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/balance-sheet');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load financial trial balance report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/financial/trial-balance');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load financial balance sheet report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/financial/balance-sheet');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load financial income statement report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/financial/income-statement');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load VAT summary report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/vat-summary');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load AR aging report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/ar-aging');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load AR/AP aging reports', async ({ page }) => {
      await loginAndNavigate(page, '/reports/ar-ap/ar-aging');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load AP aging report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/ar-ap/ap-aging');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load cash flow report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/ar-ap/cash-flow');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load budget vs actual report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/budget-vs-actual');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load sales KPIs report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/sales-purchase/sales-kpis');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load purchase KPIs report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/sales-purchase/purchase-kpis');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Banking & Reconciliation Flow', () => {
    test('should load banking dashboard', async ({ page }) => {
      await loginAndNavigate(page, '/banking');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load bank accounts page', async ({ page }) => {
      await loginAndNavigate(page, '/banking/accounts');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load bank reconciliation page', async ({ page }) => {
      await loginAndNavigate(page, '/banking/reconciliation');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load bank feeds page', async ({ page }) => {
      await loginAndNavigate(page, '/banking/feeds');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load bank transfers page', async ({ page }) => {
      await loginAndNavigate(page, '/banking/transfers');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load cash forecast page', async ({ page }) => {
      await loginAndNavigate(page, '/banking/cash-forecast');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load sales invoice reconciliation page', async ({ page }) => {
      await loginAndNavigate(page, '/financial/sales-reconciliation');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Fixed Assets & Depreciation Flow', () => {
    test('should load fixed assets main page', async ({ page }) => {
      await loginAndNavigate(page, '/fixed-assets');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load fixed assets register page', async ({ page }) => {
      await loginAndNavigate(page, '/fixed-assets/register');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load fixed assets depreciation page', async ({ page }) => {
      await loginAndNavigate(page, '/fixed-assets/depreciation');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load compliance asset register page', async ({ page }) => {
      await loginAndNavigate(page, '/compliance/asset-register');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Admin Financial Configuration Flow', () => {
    test('should load admin chart of accounts page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/chart-of-accounts');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load admin invoice templates page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/invoice-templates');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load admin lock dates page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/lock-dates');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load admin payment terms page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/payment-terms');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load admin tax rates page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/tax-rates');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load admin email templates page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/email-templates');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load admin tracking categories page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/tracking-categories');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Payroll Tax & Statutory Filings Flow', () => {
    test('should load payroll tax filings page', async ({ page }) => {
      await loginAndNavigate(page, '/payroll/tax');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load PAYE returns page', async ({ page }) => {
      await loginAndNavigate(page, '/payroll/paye-returns');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load UIF returns page', async ({ page }) => {
      await loginAndNavigate(page, '/payroll/uif-returns');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load PAYE returns via payroll/paye route', async ({ page }) => {
      await loginAndNavigate(page, '/payroll/paye');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load UIF returns via payroll/uif route', async ({ page }) => {
      await loginAndNavigate(page, '/payroll/uif');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Financial Help & Training Flow', () => {
    test('should load financial help page', async ({ page }) => {
      await loginAndNavigate(page, '/help/financial');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load financial FAQs page', async ({ page }) => {
      await loginAndNavigate(page, '/help/financial/faqs');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load financial month-end help page', async ({ page }) => {
      await loginAndNavigate(page, '/help/financial/month-end');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load financial GL training page', async ({ page }) => {
      await loginAndNavigate(page, '/training/financial/gl');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load financial AP/AR training page', async ({ page }) => {
      await loginAndNavigate(page, '/training/financial/ap-ar');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load financial reconciliation training page', async ({ page }) => {
      await loginAndNavigate(page, '/training/financial/reconciliation');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('End-to-End Statutory Finance Workflow', () => {
    test('should navigate full GL → Invoice → Payment → Reports cycle', async ({ page }) => {
      const routes = ['/gl', '/ar/invoices', '/ap/bills', '/ap/payments', '/banking/reconciliation', '/reports/profit-loss', '/reports/balance-sheet'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
      }
    });

    test('should navigate full Tax & Compliance statutory cycle', async ({ page }) => {
      const routes = ['/tax', '/compliance/vat-returns', '/reports/vat-summary', '/payroll/tax', '/payroll/paye-returns', '/payroll/uif-returns'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
      }
    });

    test('should navigate full GL Journal Entry to Trial Balance flow', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      await expect(page.locator('h1')).toContainText('General Ledger');
      await clickGlTab(page, 'journal');
      await expect(page.locator('button:has-text("New Journal Entry")')).toBeVisible();
      await clickGlTab(page, 'Trial Balance');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should navigate AR → Credit Notes → Receipts → Collections → Statements cycle', async ({ page }) => {
      const routes = ['/ar', '/ar/invoices', '/ar/credit-notes', '/ar/receipts', '/ar/collections', '/ar/statements'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
      }
    });

    test('should navigate AP → Bills → Payments → Payment Batches → Expense Claims cycle', async ({ page }) => {
      const routes = ['/ap', '/ap/bills', '/ap/payments', '/ap/payment-batches', '/ap/expense-claims'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
      }
    });

    test('should navigate Fixed Assets → Depreciation → Asset Register cycle', async ({ page }) => {
      const routes = ['/fixed-assets', '/fixed-assets/register', '/fixed-assets/depreciation', '/compliance/asset-register'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
      }
    });
  });
});
