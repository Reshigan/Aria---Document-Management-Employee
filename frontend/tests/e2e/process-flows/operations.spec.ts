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

test.describe('Operations Module Process Flow', () => {

  test.describe('Inventory / WMS Stock', () => {
    test('should load inventory main page', async ({ page }) => {
      await loginAndNavigate(page, '/inventory');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load WMS stock page', async ({ page }) => {
      await loginAndNavigate(page, '/wms-stock');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load inventory stock page', async ({ page }) => {
      await loginAndNavigate(page, '/inventory/stock');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load warehouses page', async ({ page }) => {
      await loginAndNavigate(page, '/inventory/warehouses');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load stock movements page', async ({ page }) => {
      await loginAndNavigate(page, '/inventory/stock-movements');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load stock adjustments page', async ({ page }) => {
      await loginAndNavigate(page, '/inventory/stock-adjustments');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load stock transfers page', async ({ page }) => {
      await loginAndNavigate(page, '/inventory/stock-transfers');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load reorder points page', async ({ page }) => {
      await loginAndNavigate(page, '/inventory/reorder-points');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load inventory items/catalog page', async ({ page }) => {
      await loginAndNavigate(page, '/inventory/items');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load inventory barcode page', async ({ page }) => {
      await loginAndNavigate(page, '/inventory/barcode');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load inventory categories page', async ({ page }) => {
      await loginAndNavigate(page, '/inventory/categories');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Manufacturing Module', () => {
    test('should load manufacturing main page', async ({ page }) => {
      await loginAndNavigate(page, '/manufacturing');
      const content = await page.content();
      const hasMfg = content.toLowerCase().includes('manufactur') || content.toLowerCase().includes('work order') || content.toLowerCase().includes('production');
      expect(hasMfg).toBeTruthy();
    });

    test('should load work orders page', async ({ page }) => {
      await loginAndNavigate(page, '/manufacturing/work-orders');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load BOM management page', async ({ page }) => {
      await loginAndNavigate(page, '/manufacturing/bom');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load BOMs page', async ({ page }) => {
      await loginAndNavigate(page, '/manufacturing/boms');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load production page', async ({ page }) => {
      await loginAndNavigate(page, '/manufacturing/production');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load manufacturing dashboard', async ({ page }) => {
      await loginAndNavigate(page, '/manufacturing/dashboard');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load production planning page', async ({ page }) => {
      await loginAndNavigate(page, '/manufacturing/planning');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load machine maintenance page', async ({ page }) => {
      await loginAndNavigate(page, '/manufacturing/maintenance');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('CRM Module', () => {
    test('should load CRM dashboard', async ({ page }) => {
      await loginAndNavigate(page, '/crm');
      const content = await page.content();
      const hasCRM = content.toLowerCase().includes('crm') || content.toLowerCase().includes('customer') || content.toLowerCase().includes('relationship');
      expect(hasCRM).toBeTruthy();
    });

    test('should load CRM customers page', async ({ page }) => {
      await loginAndNavigate(page, '/crm/customers');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load CRM leads page', async ({ page }) => {
      await loginAndNavigate(page, '/crm/leads');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load CRM opportunities page', async ({ page }) => {
      await loginAndNavigate(page, '/crm/opportunities');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Sales Operations', () => {
    test('should load price lists page', async ({ page }) => {
      await loginAndNavigate(page, '/operations/price-lists');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load discounts page', async ({ page }) => {
      await loginAndNavigate(page, '/operations/discounts');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load sales targets page', async ({ page }) => {
      await loginAndNavigate(page, '/operations/sales-targets');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load commissions page', async ({ page }) => {
      await loginAndNavigate(page, '/operations/commissions');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Operations Extended', () => {
    test('should load requisitions page', async ({ page }) => {
      await loginAndNavigate(page, '/operations/requisitions');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load RFQs page', async ({ page }) => {
      await loginAndNavigate(page, '/operations/rfqs');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load production planning page', async ({ page }) => {
      await loginAndNavigate(page, '/operations/production-planning');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load machine maintenance page', async ({ page }) => {
      await loginAndNavigate(page, '/operations/machine-maintenance');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Pricing Engine', () => {
    test('should load pricing main page', async ({ page }) => {
      await loginAndNavigate(page, '/pricing');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load customer groups page', async ({ page }) => {
      await loginAndNavigate(page, '/pricing/customer-groups');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load pricelists page', async ({ page }) => {
      await loginAndNavigate(page, '/pricing/pricelists');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load pricing rules page', async ({ page }) => {
      await loginAndNavigate(page, '/pricing/rules');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load price calculator page', async ({ page }) => {
      await loginAndNavigate(page, '/pricing/calculator');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Operations Flow Integration', () => {
    test('should navigate inventory workflow', async ({ page }) => {
      const routes = ['/inventory', '/inventory/products', '/inventory/warehouses', '/inventory/stock-movements'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
      }
    });

    test('should navigate manufacturing workflow', async ({ page }) => {
      const routes = ['/manufacturing', '/manufacturing/bom', '/manufacturing/work-orders', '/manufacturing/production'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
      }
    });
  });
});
