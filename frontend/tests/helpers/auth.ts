/**
 * Authentication helper functions for E2E tests
 */
import { Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:12001';

/**
 * Login helper - logs in with provided credentials
 * @param page - Playwright page object
 * @param email - User email
 * @param password - User password
 */
export async function login(page: Page, email: string = 'admin@vantax.co.za', password: string = 'admin123') {
  await page.goto(`${BASE_URL}/login`);
  
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  await page.waitForURL(/dashboard|customers|suppliers|documents|banking|inventory/, { timeout: 10000 });
  
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}

/**
 * Logout helper - logs out the current user
 * @param page - Playwright page object
 */
export async function logout(page: Page) {
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")');
  
  if (await logoutButton.count() > 0) {
    await logoutButton.first().click();
    await page.waitForURL(/login/, { timeout: 5000 });
  }
}

/**
 * Check if user is authenticated by checking for auth token
 * @param page - Playwright page object
 * @returns boolean indicating if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    const token = await page.evaluate(() => {
      return localStorage.getItem('aria_access_token');
    });
    return !!token;
  } catch (error) {
    return false;
  }
}
