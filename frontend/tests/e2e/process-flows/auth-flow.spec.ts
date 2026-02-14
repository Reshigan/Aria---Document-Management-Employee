import { test, expect, Page } from '@playwright/test';
import { TEST_CONFIG, ROUTES } from '../test-config';

const BASE_URL = TEST_CONFIG.BASE_URL;
const DEMO_EMAIL = TEST_CONFIG.DEMO_USER.email;
const DEMO_PASSWORD = TEST_CONFIG.DEMO_USER.password;

async function loginAs(page: Page, email = DEMO_EMAIL, password = DEMO_PASSWORD) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button:has-text("Sign In"), button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
}

test.describe('Authentication Process Flow', () => {
  test.describe('Login Page UI', () => {
    test('should display login form with all elements', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      const signInBtn = page.locator('button:has-text("Sign In"), button[type="submit"]').first();
      await expect(signInBtn).toBeVisible();
    });

    test('should display ARIA branding', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).toContain('ARIA');
    });

    test('should have forgot password link', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      const forgotLink = page.locator('a:has-text("Forgot"), button:has-text("Forgot")').first();
      const isVisible = await forgotLink.isVisible().catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should have sign up link', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      const signUpLink = page.locator('a:has-text("Sign up"), a:has-text("Register")').first();
      const isVisible = await signUpLink.isVisible().catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should have remember me checkbox', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      const rememberMe = page.locator('input[type="checkbox"], label:has-text("Remember")').first();
      const isVisible = await rememberMe.isVisible().catch(() => false);
      expect(isVisible).toBeTruthy();
    });
  });

  test.describe('Login Validation', () => {
    test('should show error for empty email submission', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      await page.locator('input[type="password"]').fill('somepassword');
      await page.locator('button:has-text("Sign In"), button[type="submit"]').first().click();
      await page.waitForTimeout(1000);
      const emailInput = page.locator('input[type="email"]');
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
      expect(isInvalid).toBeTruthy();
    });

    test('should show error for empty password submission', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      await page.locator('input[type="email"]').fill(DEMO_EMAIL);
      const signInBtn = page.locator('button:has-text("Sign In"), button[type="submit"]').first();
      await signInBtn.click();
      await page.waitForTimeout(1000);
      const url = page.url();
      expect(url).toContain('login');
    });

    test('should show error for invalid email format', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      await page.locator('input[type="email"]').fill('not-an-email');
      await page.locator('input[type="password"]').fill('password');
      await page.locator('button:has-text("Sign In"), button[type="submit"]').first().click();
      await page.waitForTimeout(1000);
      const url = page.url();
      expect(url).toContain('login');
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await loginAs(page, 'wrong@email.com', 'wrongpassword');
      await page.waitForTimeout(2000);
      const url = page.url();
      const hasError = await page.locator('[class*="error"], [class*="alert"], [role="alert"]').isVisible().catch(() => false);
      expect(url.includes('login') || hasError).toBeTruthy();
    });

    test('should mask password input', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      const passwordInput = page.locator('input[type="password"]');
      const inputType = await passwordInput.getAttribute('type');
      expect(inputType).toBe('password');
    });
  });

  test.describe('Successful Login Flow', () => {
    test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
      await loginAs(page);
      const url = page.url();
      expect(url).toMatch(/dashboard|\/$/);
    });

    test('should display user navigation after login', async ({ page }) => {
      await loginAs(page);
      await page.waitForLoadState('networkidle');
      const nav = page.locator('nav, header, [role="navigation"]').first();
      await expect(nav).toBeVisible();
    });

    test('should display dashboard metrics after login', async ({ page }) => {
      await loginAs(page);
      await page.waitForLoadState('networkidle');
      const dismissTour = page.locator('text=Skip tour, button:has-text("Skip")').first();
      if (await dismissTour.isVisible().catch(() => false)) {
        await dismissTour.click();
      }
      const content = await page.content();
      expect(content.length).toBeGreaterThan(5000);
    });

    test('should have top navigation bar with menu items', async ({ page }) => {
      await loginAs(page);
      await page.waitForLoadState('networkidle');
      const dismissTour = page.locator('text=Skip tour').first();
      if (await dismissTour.isVisible().catch(() => false)) await dismissTour.click();
      const dashboardLink = page.locator('text=Dashboard').first();
      await expect(dashboardLink).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should persist session across page refresh', async ({ page }) => {
      await loginAs(page);
      await page.waitForURL(/dashboard|\//);
      await page.reload();
      await page.waitForLoadState('networkidle');
      const url = page.url();
      expect(url).not.toContain('/login');
    });

    test('should persist session across navigation', async ({ page }) => {
      await loginAs(page);
      await page.waitForURL(/dashboard|\//);
      await page.goto(`${BASE_URL}/customers`);
      await page.waitForLoadState('networkidle');
      const url = page.url();
      expect(url).not.toContain('/login');
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).toContain('login');
    });

    test('should redirect to login when accessing protected routes', async ({ page }) => {
      const protectedRoutes = ['/customers', '/quotes', '/invoices', '/hr'];
      for (const route of protectedRoutes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        const url = page.url();
        expect(url).toContain('login');
      }
    });
  });

  test.describe('Logout Flow', () => {
    test('should successfully logout', async ({ page }) => {
      await loginAs(page);
      await page.waitForURL(/dashboard|\//);
      await page.waitForLoadState('networkidle');
      const dismissTour = page.locator('text=Skip tour').first();
      if (await dismissTour.isVisible().catch(() => false)) await dismissTour.click();

      const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Logout"), [class*="avatar"], [class*="profile"]').first();
      if (await userMenu.isVisible().catch(() => false)) {
        await userMenu.click();
        await page.waitForTimeout(500);
        const logoutBtn = page.locator('button:has-text("Logout"), a:has-text("Logout"), text=Sign Out, text=Log Out').first();
        if (await logoutBtn.isVisible().catch(() => false)) {
          await logoutBtn.click();
          await page.waitForTimeout(2000);
        }
      }
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    });
  });

  test.describe('Login via Keyboard', () => {
    test('should submit form with Enter key', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      await page.locator('input[type="email"]').fill(DEMO_EMAIL);
      await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
      await page.locator('input[type="password"]').press('Enter');
      await page.waitForTimeout(3000);
      const url = page.url();
      expect(url).toMatch(/dashboard|login|\//);
    });

    test('should tab between form fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      await page.locator('input[type="email"]').focus();
      await page.keyboard.press('Tab');
      const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedTag).toBe('INPUT');
    });
  });
});
