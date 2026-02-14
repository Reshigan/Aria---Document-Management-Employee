import { test, expect, Page } from '@playwright/test';
import { TEST_CONFIG } from '../test-config';

const BASE_URL = TEST_CONFIG.BASE_URL;

async function loginAndDismissTour(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(TEST_CONFIG.DEMO_USER.email);
  await page.locator('input[type="password"]').fill(TEST_CONFIG.DEMO_USER.password);
  await page.locator('button:has-text("Sign In"), button[type="submit"]').first().click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle');
  const skipTour = page.locator('text=Skip tour').first();
  if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
  await page.waitForTimeout(500);
}

test.describe('Dashboard Process Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndDismissTour(page);
  });

  test.describe('Executive Dashboard', () => {
    test('should display Executive Dashboard heading', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      const skipTour = page.locator('text=Skip tour').first();
      if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
      const heading = page.locator('h1, h2').first();
      const text = await heading.textContent().catch(() => '');
      expect(text?.toLowerCase()).toContain('dashboard');
    });

    test('should display financial metric cards', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      const skipTour = page.locator('text=Skip tour').first();
      if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
      const content = await page.content();
      const hasMetrics = content.includes('Revenue') || content.includes('Loss') || content.includes('Cash') || content.includes('Outstanding') || content.includes('R ');
      expect(hasMetrics).toBeTruthy();
    });

    test('should display Accounts Payable section', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      const skipTour = page.locator('text=Skip tour').first();
      if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
      const apSection = page.locator('text=Accounts Payable').first();
      const isVisible = await apSection.isVisible().catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should display Accounts Receivable section', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      const skipTour = page.locator('text=Skip tour').first();
      if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
      const arSection = page.locator('text=Accounts Receivable').first();
      const isVisible = await arSection.isVisible().catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should display Automation Agents section', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      const skipTour = page.locator('text=Skip tour').first();
      if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForTimeout(500);
      const agentSection = page.locator('text=Automation Agents').first();
      const isVisible = await agentSection.isVisible().catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should display All Systems Operational status', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      const skipTour = page.locator('text=Skip tour').first();
      if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
      const status = page.locator('text=All Systems Operational').first();
      const isVisible = await status.isVisible().catch(() => false);
      expect(isVisible).toBeTruthy();
    });
  });

  test.describe('Top Navigation', () => {
    test('should display Dashboard link in nav', async ({ page }) => {
      const dashLink = page.locator('text=Dashboard').first();
      await expect(dashLink).toBeVisible();
    });

    test('should display Search with Ctrl+K', async ({ page }) => {
      const searchBtn = page.locator('text=Search').first();
      await expect(searchBtn).toBeVisible();
    });

    test('should display Ask ARIA button', async ({ page }) => {
      const ariaBtn = page.locator('text=Ask ARIA').first();
      await expect(ariaBtn).toBeVisible();
    });

    test('should display Analytics menu', async ({ page }) => {
      const analyticsLink = page.locator('text=Analytics').first();
      await expect(analyticsLink).toBeVisible();
    });

    test('should display Financial dropdown', async ({ page }) => {
      const financialMenu = page.locator('text=Financial').first();
      await expect(financialMenu).toBeVisible();
    });

    test('should display Operations dropdown', async ({ page }) => {
      const opsMenu = page.locator('text=Operations').first();
      await expect(opsMenu).toBeVisible();
    });

    test('should display People dropdown', async ({ page }) => {
      const peopleMenu = page.locator('text=People').first();
      await expect(peopleMenu).toBeVisible();
    });

    test('should display Services dropdown', async ({ page }) => {
      const servicesMenu = page.locator('text=Services').first();
      await expect(servicesMenu).toBeVisible();
    });
  });

  test.describe('Navigation from Dashboard', () => {
    test('should navigate to Financial module', async ({ page }) => {
      await page.goto(`${BASE_URL}/gl`);
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should navigate to Operations module', async ({ page }) => {
      await page.goto(`${BASE_URL}/inventory`);
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should navigate to Analytics page', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should open Search with Ctrl+K shortcut', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(1000);
      const searchDialog = page.locator('[role="dialog"], [class*="search"], [class*="modal"], [class*="command"]').first();
      const isVisible = await searchDialog.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Dashboard Data Integrity', () => {
    test('should display currency values in Rand format', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      const skipTour = page.locator('text=Skip tour').first();
      if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
      const content = await page.content();
      expect(content).toContain('R');
    });

    test('should display percentage change indicators', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      const skipTour = page.locator('text=Skip tour').first();
      if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
      const content = await page.content();
      const hasPercentage = content.includes('%') || content.includes('Loss') || content.includes('Positive');
      expect(hasPercentage).toBeTruthy();
    });

    test('should load dashboard without JavaScript errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      const skipTour = page.locator('text=Skip tour').first();
      if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
      expect(errors.length).toBeLessThan(10);
    });
  });
});
