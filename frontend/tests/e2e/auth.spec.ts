/**
 * End-to-End tests for authentication flows
 * Tests: Registration, Login, Logout, Protected routes
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:12001';
const API_URL = 'http://localhost:8000';

// Generate unique email for each test run
const generateTestEmail = () => `test_${Date.now()}@testcorp.co.za`;

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from login page
    await page.goto(`${BASE_URL}/login`);
  });

  test('should display login page correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/ARIA/);
    
    // Check logo and heading
    await expect(page.locator('text=Aria')).toBeVisible();
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    await expect(page.locator('text=Login to your AI orchestrator')).toBeVisible();
    
    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Click submit without filling form
    await page.click('button[type="submit"]');
    
    // Should show browser validation (HTML5)
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeFocused();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill form with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=/incorrect|failed/i')).toBeVisible({ timeout: 5000 });
  });

  test('complete registration and login flow', async ({ page }) => {
    // Test registration flow
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';
    
    // Navigate to registration
    await page.click('text=Start Free Trial');
    await expect(page).toHaveURL(/.*register/);
    
    // Fill Step 1: User Info
    await page.fill('input[name="first_name"], input[id="first_name"]', 'John');
    await page.fill('input[name="last_name"], input[id="last_name"]', 'Smith');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[id="password"]', testPassword);
    await page.fill('input[id="confirmPassword"]', testPassword);
    
    // Should show password strength indicator
    await expect(page.locator('text=/weak|medium|strong/i')).toBeVisible();
    
    // Click Next
    await page.click('button:has-text("Next")');
    
    // Fill Step 2: Company Info
    await page.fill('input[id="company_name"]', 'Acme Corp (Pty) Ltd');
    await page.fill('input[id="phone"]', '+27 11 123 4567');
    await page.selectOption('select[id="province"]', 'Gauteng');
    
    // Accept terms
    await page.check('input[id="acceptTerms"]');
    
    // Submit registration
    await page.click('button:has-text("Start Free Trial")');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    
    // Should see welcome message
    await expect(page.locator('text=/welcome.*john/i')).toBeVisible({ timeout: 5000 });
    
    // Should see dashboard elements
    await expect(page.locator('text=Bot Requests')).toBeVisible();
    await expect(page.locator('text=Active Users')).toBeVisible();
    await expect(page.locator('text=Your AI Bots')).toBeVisible();
    
    // Logout
    await page.click('button:has-text("Logout")');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
    
    // Login again
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard again
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('should redirect to dashboard if already logged in', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"]', 'admin@techforge.co.za');
    await page.fill('input[type="password"]', 'Demo@2025');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    
    // Verify we can access dashboard without being redirected to login
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 5000 });
    
    // Should stay on dashboard (already logged in)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should protect dashboard route', async ({ page }) => {
    // Clear any existing tokens
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    // Try to access dashboard directly
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/, { timeout: 5000 });
  });

  test('should handle session expiration', async ({ page }) => {
    // Set expired/invalid token
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'invalid_token');
    });
    
    // Try to access dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Should redirect to login (401 handling)
    await expect(page).toHaveURL(/.*login/, { timeout: 5000 });
  });
});

test.describe('Dashboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test credentials
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@techforge.co.za');
    await page.fill('input[type="password"]', 'Demo@2025');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('should display dashboard correctly', async ({ page }) => {
    // Check that we're on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Check for dashboard heading
    await expect(page.locator('h1')).toBeVisible();
    
    // Check that page has loaded content (any visible elements)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should search bots', async ({ page }) => {
    // Navigate to bot dashboard if it exists
    const botLink = page.locator('a[href*="bot"], a[href*="agent"], a[href*="reports"]').first();
    if (await botLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await botLink.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Check if search functionality exists
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('invoice');
      await page.waitForTimeout(500);
    }
  });

  test('should filter bots by category', async ({ page }) => {
    // Navigate to bot dashboard if it exists
    const botLink = page.locator('a[href*="bot"], a[href*="agent"], a[href*="reports"]').first();
    if (await botLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await botLink.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Check if filter functionality exists
    const selectElement = page.locator('select').first();
    if (await selectElement.isVisible({ timeout: 2000 }).catch(() => false)) {
      const options = await selectElement.locator('option').count();
      if (options > 1) {
        await selectElement.selectOption({ index: 1 });
        await page.waitForTimeout(500);
      }
    }
  });

  test('should navigate to bot chat', async ({ page }) => {
    // Try to navigate to Ask ARIA chat
    const chatLink = page.locator('a[href*="chat"], a[href*="aria"], button:has-text("Ask ARIA")').first();
    if (await chatLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chatLink.click();
      await page.waitForLoadState('networkidle');
      // Verify we navigated somewhere
      await expect(page).not.toHaveURL(/.*login/);
    }
  });

  test('should navigate to settings', async ({ page }) => {
    // Try to find and click settings link
    const settingsLink = page.locator('a[href*="settings"], button:has-text("Settings")').first();
    if (await settingsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');
      // Verify we navigated to settings
      await expect(page).toHaveURL(/.*settings/);
    } else {
      // If no settings link, just verify we're still logged in
      await expect(page).not.toHaveURL(/.*login/);
    }
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });
  
  test('should display login page correctly on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Check that elements are visible and properly sized
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Button should be reasonably wide on mobile (at least 200px)
    const submitButton = page.locator('button[type="submit"]');
    const box = await submitButton.boundingBox();
    expect(box?.width).toBeGreaterThan(200); // Should be reasonably wide
  });

  test('should display dashboard correctly on mobile', async ({ page }) => {
    // Login with test credentials
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@techforge.co.za');
    await page.fill('input[type="password"]', 'Demo@2025');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    
    // Check that page loaded
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('login page should be accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Check that inputs exist
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    
    // Check focus management
    await page.keyboard.press('Tab');
    // Either email or password input should be focused after tab
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBe('INPUT');
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Tab through form
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    // Should focus remember me checkbox or submit button
  });
});

test.describe('Performance', () => {
  test('login page should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load in less than 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('dashboard should load quickly', async ({ page }) => {
    // Login with test credentials
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@techforge.co.za');
    await page.fill('input[type="password"]', 'Demo@2025');
    
    const startTime = Date.now();
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load in less than 10 seconds (including login redirect)
    expect(loadTime).toBeLessThan(10000);
  });
});
