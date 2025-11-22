/**
 * End-to-End tests for authentication flows
 * Tests: Registration, Login, Logout, Protected routes
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:12001';
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
    
    // Check logo
    await expect(page.locator('text=ARIA')).toBeVisible();
    await expect(page.locator('text=AI-Native ERP for South Africa')).toBeVisible();
    
    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check links
    await expect(page.locator('text=Forgot password?')).toBeVisible();
    await expect(page.locator('text=Start Free Trial')).toBeVisible();
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

  test('should redirect to dashboard if already logged in', async ({ page, context }) => {
    // First, register and login
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';
    
    // Quick registration via API
    const response = await context.request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: testEmail,
        password: testPassword,
        first_name: 'Test',
        last_name: 'User',
        company_name: 'Test Corp',
        phone: '+27123456789',
        province: 'Gauteng'
      }
    });
    
    const data = await response.json();
    
    // Set tokens in localStorage
    await page.evaluate((tokens) => {
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
    }, data);
    
    // Try to access login page
    await page.goto(`${BASE_URL}/login`);
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 5000 });
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

  test('should handle session expiration', async ({ page, context }) => {
    // Register and get tokens
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';
    
    const response = await context.request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: testEmail,
        password: testPassword,
        first_name: 'Test',
        last_name: 'User',
        company_name: 'Test Corp',
        phone: '+27123456789',
        province: 'Gauteng'
      }
    });
    
    const data = await response.json();
    
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
  let accessToken: string;
  
  test.beforeEach(async ({ page, context }) => {
    // Register user via API
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';
    
    const response = await context.request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: testEmail,
        password: testPassword,
        first_name: 'Dashboard',
        last_name: 'Tester',
        company_name: 'Dashboard Test Corp',
        phone: '+27123456789',
        province: 'Gauteng'
      }
    });
    
    const data = await response.json();
    accessToken = data.access_token;
    
    // Set tokens in localStorage
    await page.evaluate((tokens) => {
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
    }, data);
    
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
  });

  test('should display dashboard correctly', async ({ page }) => {
    // Check welcome message
    await expect(page.locator('text=/welcome.*dashboard/i')).toBeVisible({ timeout: 5000 });
    
    // Check stats cards
    await expect(page.locator('text=Bot Requests')).toBeVisible();
    await expect(page.locator('text=Active Users')).toBeVisible();
    await expect(page.locator('text=Storage Used')).toBeVisible();
    await expect(page.locator('text=BBBEE Status')).toBeVisible();
    
    // Check bot list section
    await expect(page.locator('text=Your AI Bots')).toBeVisible();
    
    // Should show search and filter
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
  });

  test('should search bots', async ({ page }) => {
    // Wait for bots to load
    await page.waitForSelector('text=Your AI Bots', { timeout: 5000 });
    
    // Type in search box
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('invoice');
    
    // Should filter bots
    await page.waitForTimeout(500); // Debounce delay
    
    // Should show invoice-related bots
    await expect(page.locator('text=/invoice/i')).toBeVisible();
  });

  test('should filter bots by category', async ({ page }) => {
    // Wait for bots to load
    await page.waitForSelector('text=Your AI Bots', { timeout: 5000 });
    
    // Select category
    await page.selectOption('select', 'financial');
    
    // Should filter bots
    await page.waitForTimeout(500);
    
    // Should show only financial bots
    const categoryBadges = page.locator('text=financial');
    await expect(categoryBadges.first()).toBeVisible();
  });

  test('should navigate to bot chat', async ({ page }) => {
    // Wait for bots to load
    await page.waitForSelector('text=Your AI Bots', { timeout: 5000 });
    
    // Click on a bot
    const firstBot = page.locator('[class*="border"][class*="rounded"]').first();
    await firstBot.click();
    
    // Should navigate to chat
    await expect(page).toHaveURL(/.*chat/, { timeout: 5000 });
  });

  test('should navigate to settings', async ({ page }) => {
    // Click settings button
    await page.click('button:has([class*="Settings"])');
    
    // Should navigate to settings
    await expect(page).toHaveURL(/.*settings/, { timeout: 5000 });
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });
  
  test('should display login page correctly on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Check that elements are visible and properly sized
    await expect(page.locator('text=ARIA')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Button should be full width on mobile
    const submitButton = page.locator('button[type="submit"]');
    const box = await submitButton.boundingBox();
    expect(box?.width).toBeGreaterThan(300); // Should be nearly full width
  });

  test('should display dashboard correctly on mobile', async ({ page, context }) => {
    // Register and login
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';
    
    const response = await context.request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: testEmail,
        password: testPassword,
        first_name: 'Mobile',
        last_name: 'User',
        company_name: 'Mobile Test Corp',
        phone: '+27123456789',
        province: 'Gauteng'
      }
    });
    
    const data = await response.json();
    
    await page.evaluate((tokens) => {
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
    }, data);
    
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Check that stats cards stack vertically on mobile
    const statsCards = page.locator('[class*="grid"]').first();
    await expect(statsCards).toBeVisible();
    
    // Check that bots are displayed in single column
    const botsGrid = page.locator('text=Your AI Bots').locator('..');
    await expect(botsGrid).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('login page should be accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Check form labels
    const emailLabel = page.locator('label[for="email"]');
    await expect(emailLabel).toBeVisible();
    
    const passwordLabel = page.locator('label[for="password"]');
    await expect(passwordLabel).toBeVisible();
    
    // Check that inputs have proper attributes
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required', '');
    
    // Check focus management
    await page.keyboard.press('Tab');
    await expect(emailInput).toBeFocused();
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

  test('dashboard should load quickly', async ({ page, context }) => {
    // Register and login
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';
    
    const response = await context.request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: testEmail,
        password: testPassword,
        first_name: 'Performance',
        last_name: 'Test',
        company_name: 'Performance Test Corp',
        phone: '+27123456789',
        province: 'Gauteng'
      }
    });
    
    const data = await response.json();
    
    await page.evaluate((tokens) => {
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
    }, data);
    
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForSelector('text=Your AI Bots', { timeout: 10000 });
    const loadTime = Date.now() - startTime;
    
    // Should load in less than 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
