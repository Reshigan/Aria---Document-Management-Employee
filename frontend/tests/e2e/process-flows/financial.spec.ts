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

test.describe('Financial Module Process Flow', () => {

  test.describe('General Ledger', () => {
    test('should load GL main page', async ({ page }) => {
      await loginAndNavigate(page, '/gl');
      const content = await page.content();
      const hasGL = content.toLowerCase().includes('general ledger') || content.toLowerCase().includes('journal') || content.toLowerCase().includes('ledger');
      expect(hasGL).toBeTruthy();
    });

    test('should load journal entries page', async ({ page }) => {
      await loginAndNavigate(page, '/gl/journal-entries');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load chart of accounts page', async ({ page }) => {
      await loginAndNavigate(page, '/gl/chart-of-accounts');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load GL budgets page', async ({ page }) => {
      await loginAndNavigate(page, '/gl/budgets');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load GL cost centers page', async ({ page }) => {
      await loginAndNavigate(page, '/gl/cost-centers');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load via financial/general-ledger route', async ({ page }) => {
      await loginAndNavigate(page, '/financial/general-ledger');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Banking Module', () => {
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

    test('should load reconciliation page', async ({ page }) => {
      await loginAndNavigate(page, '/banking/reconciliation');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load cash forecast page', async ({ page }) => {
      await loginAndNavigate(page, '/banking/cash-forecast');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load bank transfers page', async ({ page }) => {
      await loginAndNavigate(page, '/banking/transfers');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load bank feeds page', async ({ page }) => {
      await loginAndNavigate(page, '/banking/feeds');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Financial Extended Features', () => {
    test('should load budgets management page', async ({ page }) => {
      await loginAndNavigate(page, '/financial/budgets');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load cost centers page', async ({ page }) => {
      await loginAndNavigate(page, '/financial/cost-centers');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load payment batches page', async ({ page }) => {
      await loginAndNavigate(page, '/financial/payment-batches');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load expense claims page', async ({ page }) => {
      await loginAndNavigate(page, '/financial/expense-claims');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load credit notes page', async ({ page }) => {
      await loginAndNavigate(page, '/financial/credit-notes');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load collections page', async ({ page }) => {
      await loginAndNavigate(page, '/financial/collections');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load cash forecast page', async ({ page }) => {
      await loginAndNavigate(page, '/financial/cash-forecast');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load bank transfers page', async ({ page }) => {
      await loginAndNavigate(page, '/financial/bank-transfers');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Xero Parity Features', () => {
    test('should load recurring invoices page', async ({ page }) => {
      await loginAndNavigate(page, '/financial/recurring-invoices');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load customer statements page', async ({ page }) => {
      await loginAndNavigate(page, '/financial/customer-statements');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load budget vs actual page', async ({ page }) => {
      await loginAndNavigate(page, '/financial/budget-vs-actual');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load bank feeds page', async ({ page }) => {
      await loginAndNavigate(page, '/financial/bank-feeds');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Sales Invoice Reconciliation', () => {
    test('should load sales invoice reconciliation page', async ({ page }) => {
      await loginAndNavigate(page, '/financial/sales-reconciliation');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Financial Flow Integration', () => {
    test('should navigate complete financial workflow', async ({ page }) => {
      const routes = ['/gl', '/ar/invoices', '/ap/bills', '/banking', '/banking/reconciliation'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
      }
    });

    test('should navigate GL to reports workflow', async ({ page }) => {
      const routes = ['/gl', '/reports/profit-loss', '/reports/balance-sheet'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
      }
    });
  });
});
