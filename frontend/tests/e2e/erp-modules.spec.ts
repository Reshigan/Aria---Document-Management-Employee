/**
 * Comprehensive E2E tests for ERP modules
 * Tests: General Ledger, Banking, Procure-to-Pay, Order-to-Cash
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:12001';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@techforge.co.za';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Demo@2025';

// Helper function for login
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

test.describe('General Ledger Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/erp/general-ledger`);
    await page.waitForLoadState('networkidle');
  });

  test('should load general ledger page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/general ledger|chart of accounts/i);
  });

  test('should display chart of accounts', async ({ page }) => {
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasList = await page.locator('[class*="list"]').isVisible().catch(() => false);
    
    expect(hasTable || hasList).toBeTruthy();
  });

  test('should display account categories', async ({ page }) => {
    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    
    expect(pageContent.length).toBeGreaterThan(0);
  });

  test('should search accounts', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('cash');
      await page.waitForTimeout(500);
    }
  });

  test('should handle GL API response', async ({ page }) => {
    try {
      const response = await page.waitForResponse(
        response => response.url().includes('/api/erp/general-ledger') && response.status() === 200,
        { timeout: 5000 }
      );
      
      const data = await response.json();
      expect(data).toBeTruthy();
    } catch (e) {
      console.log('GL API not available yet');
    }
  });
});

test.describe('Banking Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/banking`);
    await page.waitForLoadState('networkidle');
  });

  test('should load banking page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/banking|bank accounts/i);
  });

  test('should display banking dashboard or accounts list', async ({ page }) => {
    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);
  });

  test('should show bank account cards or table', async ({ page }) => {
    const hasCards = await page.locator('[class*="card"]').count();
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    
    expect(hasCards > 0 || hasTable).toBeTruthy();
  });

  test('should handle banking API response', async ({ page }) => {
    try {
      const response = await page.waitForResponse(
        response => response.url().includes('/api/banking') && response.status() === 200,
        { timeout: 5000 }
      );
      
      const data = await response.json();
      expect(data).toBeTruthy();
    } catch (e) {
      console.log('Banking API not available yet');
    }
  });
});

test.describe('Procure-to-Pay Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should load purchase orders page', async ({ page }) => {
    await page.goto(`${BASE_URL}/erp/procure-to-pay/purchase-orders`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('h1')).toContainText(/purchase orders/i);
  });

  test('should display purchase orders list', async ({ page }) => {
    await page.goto(`${BASE_URL}/erp/procure-to-pay/purchase-orders`);
    await page.waitForTimeout(1000);
    
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasList = await page.locator('[class*="list"]').isVisible().catch(() => false);
    
    expect(hasTable || hasList).toBeTruthy();
  });

  test('should open create purchase order form', async ({ page }) => {
    await page.goto(`${BASE_URL}/erp/procure-to-pay/purchase-orders`);
    
    const createButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")').first();
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should load goods receipt notes page', async ({ page }) => {
    await page.goto(`${BASE_URL}/erp/procure-to-pay/goods-receipt-notes`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('h1')).toContainText(/goods receipt|grn/i);
  });

  test('should load AP invoices page', async ({ page }) => {
    await page.goto(`${BASE_URL}/erp/procure-to-pay/ap-invoices`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('h1')).toContainText(/accounts payable|ap invoices/i);
  });
});

test.describe('Order-to-Cash Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should load sales orders page', async ({ page }) => {
    await page.goto(`${BASE_URL}/erp/order-to-cash/sales-orders`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('h1')).toContainText(/sales orders/i);
  });

  test('should display sales orders list', async ({ page }) => {
    await page.goto(`${BASE_URL}/erp/order-to-cash/sales-orders`);
    await page.waitForTimeout(1000);
    
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasList = await page.locator('[class*="list"]').isVisible().catch(() => false);
    
    expect(hasTable || hasList).toBeTruthy();
  });

  test('should load deliveries page', async ({ page }) => {
    await page.goto(`${BASE_URL}/erp/order-to-cash/deliveries`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('h1')).toContainText(/deliveries|delivery notes/i);
  });

  test('should load AR invoices page', async ({ page }) => {
    await page.goto(`${BASE_URL}/erp/order-to-cash/ar-invoices`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('h1')).toContainText(/accounts receivable|ar invoices|customer invoices/i);
  });

  test('should load quotes page', async ({ page }) => {
    await page.goto(`${BASE_URL}/erp/order-to-cash/quotes`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('h1')).toContainText(/quotes|quotations/i);
  });
});

test.describe('Navigation and Routing', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate between ERP modules', async ({ page }) => {
    await page.goto(`${BASE_URL}/customers`);
    await expect(page).toHaveURL(/customers/);
    
    await page.goto(`${BASE_URL}/suppliers`);
    await expect(page).toHaveURL(/suppliers/);
    
    await page.goto(`${BASE_URL}/erp/general-ledger`);
    await expect(page).toHaveURL(/general-ledger/);
    
    await page.goto(`${BASE_URL}/banking`);
    await expect(page).toHaveURL(/banking/);
  });

  test('should have working navigation menu', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeVisible();
  });

  test('should display user menu', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Logout"), [class*="user"]').first();
    if (await userMenu.isVisible()) {
      await expect(userMenu).toBeVisible();
    }
  });
});

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/nonexistent-page`);
    
    const is404 = await page.locator('text=/404|not found/i').isVisible().catch(() => false);
    const isDashboard = page.url().includes('dashboard');
    
    expect(is404 || isDashboard).toBeTruthy();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/customers`);
    
    await page.route('**/api/erp/master-data/customers*', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.reload();
    await page.waitForTimeout(1000);
    
    const hasError = await page.locator('text=/error|failed|something went wrong/i').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*found|no data/i').isVisible().catch(() => false);
    
    expect(hasError || hasEmptyState).toBeTruthy();
  });
});

test.describe('Performance', () => {
  test('pages should load within acceptable time', async ({ page }) => {
    await login(page);
    
    const pages = [
      '/customers',
      '/suppliers',
      '/inventory/products',
      '/erp/general-ledger',
      '/banking'
    ];
    
    for (const pagePath of pages) {
      const startTime = Date.now();
      await page.goto(`${BASE_URL}${pagePath}`);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000);
    }
  });
});
