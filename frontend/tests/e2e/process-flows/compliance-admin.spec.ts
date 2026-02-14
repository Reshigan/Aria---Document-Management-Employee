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
  const skipTour = page.locator('text=Skip tour').first();
  if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
  await page.goto(`${BASE_URL}${route}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

test.describe('Compliance & Admin Process Flow', () => {

  test.describe('Compliance Dashboard', () => {
    test('should load compliance dashboard', async ({ page }) => {
      await loginAndNavigate(page, '/compliance');
      const content = await page.content();
      const hasCompliance = content.toLowerCase().includes('compliance') || content.toLowerCase().includes('audit') || content.toLowerCase().includes('risk');
      expect(hasCompliance).toBeTruthy();
    });
  });

  test.describe('Compliance Modules', () => {
    test('should load VAT returns page', async ({ page }) => {
      await loginAndNavigate(page, '/compliance/vat-returns');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load asset register page', async ({ page }) => {
      await loginAndNavigate(page, '/compliance/asset-register');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load B-BBEE page', async ({ page }) => {
      await loginAndNavigate(page, '/compliance/bbbee');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load audit trail page', async ({ page }) => {
      await loginAndNavigate(page, '/compliance/audit-trail');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load risk register page', async ({ page }) => {
      await loginAndNavigate(page, '/compliance/risk-register');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load document control page', async ({ page }) => {
      await loginAndNavigate(page, '/compliance/document-control');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load policies page', async ({ page }) => {
      await loginAndNavigate(page, '/compliance/policies');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Tax & Legal', () => {
    test('should load tax compliance page', async ({ page }) => {
      await loginAndNavigate(page, '/tax');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load tax VAT returns page', async ({ page }) => {
      await loginAndNavigate(page, '/tax/vat-returns');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load legal compliance page', async ({ page }) => {
      await loginAndNavigate(page, '/legal');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load legal contracts page', async ({ page }) => {
      await loginAndNavigate(page, '/legal/contracts');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load fixed assets page', async ({ page }) => {
      await loginAndNavigate(page, '/fixed-assets');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load fixed assets depreciation page', async ({ page }) => {
      await loginAndNavigate(page, '/fixed-assets/depreciation');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Reports Module', () => {
    test('should load reports dashboard', async ({ page }) => {
      await loginAndNavigate(page, '/reports');
      const content = await page.content();
      const hasReports = content.toLowerCase().includes('report') || content.toLowerCase().includes('dashboard');
      expect(hasReports).toBeTruthy();
    });

    test('should load profit & loss report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/profit-loss');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load balance sheet report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/balance-sheet');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load AR aging report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/ar-aging');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load stock valuation report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/stock-valuation');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load VAT summary report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/vat-summary');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load payroll activity report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/payroll/activity');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load expense management report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/expense/management');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load B-BBEE compliance report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/compliance/bbbee');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load bot dashboard report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/bot-dashboard');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load financial trial balance report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/financial/trial-balance');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load budget vs actual report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/budget-vs-actual');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Admin Settings', () => {
    test('should load settings page', async ({ page }) => {
      await loginAndNavigate(page, '/settings');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load system settings page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/system');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load company settings page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/company');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load user management page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/users');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load RBAC management page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/rbac');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load data import page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/data-import');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load role dashboard page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/dashboard');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load agent/bot configuration page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/agents');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Admin Configuration (Xero Parity)', () => {
    test('should load chart of accounts admin page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/chart-of-accounts');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load invoice templates admin page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/invoice-templates');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load lock dates admin page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/lock-dates');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load payment terms admin page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/payment-terms');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load tax rates admin page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/tax-rates');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load email templates admin page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/email-templates');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load tracking categories admin page', async ({ page }) => {
      await loginAndNavigate(page, '/admin/tracking-categories');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Documents & AI', () => {
    test('should load document templates page', async ({ page }) => {
      await loginAndNavigate(page, '/documents/templates');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load document generation page', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load Ask ARIA chat page', async ({ page }) => {
      await loginAndNavigate(page, '/ask-aria');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load document classification page', async ({ page }) => {
      await loginAndNavigate(page, '/ask-aria/classify');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load chat interface page', async ({ page }) => {
      await loginAndNavigate(page, '/chat');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Integrations & Mobile', () => {
    test('should load integrations page', async ({ page }) => {
      await loginAndNavigate(page, '/integrations');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load mobile management page', async ({ page }) => {
      await loginAndNavigate(page, '/mobile');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load pending actions page', async ({ page }) => {
      await loginAndNavigate(page, '/actions');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Quality & Analytics', () => {
    test('should load quality dashboard', async ({ page }) => {
      await loginAndNavigate(page, '/quality');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load quality inspections page', async ({ page }) => {
      await loginAndNavigate(page, '/quality/inspections');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load analytics dashboard', async ({ page }) => {
      await loginAndNavigate(page, '/analytics');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load BI dashboard via alias', async ({ page }) => {
      await loginAndNavigate(page, '/bi');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Agents Module', () => {
    test('should load agents page', async ({ page }) => {
      await loginAndNavigate(page, '/agents');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Migration Module', () => {
    test('should load migration jobs page', async ({ page }) => {
      await loginAndNavigate(page, '/migration/jobs');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load migration validation page', async ({ page }) => {
      await loginAndNavigate(page, '/migration/validation');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });
});
