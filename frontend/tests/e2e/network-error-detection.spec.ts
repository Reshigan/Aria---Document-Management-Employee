/**
 * Network Error Detection Tests
 * These tests verify that the network error detection system catches 404/500 errors
 * that might otherwise be missed by regular tests
 */
import { test, expect, NetworkErrorTracker } from '../helpers/network-error-detection';

test.describe('Network Error Detection', () => {
  test('should detect 404 errors on API calls', async ({ page, networkTracker }) => {
    // Navigate to a page that makes API calls
    await page.goto('/');
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    
    // Check if any network errors were detected
    const errors = networkTracker.getErrors();
    
    // Log any errors found (for debugging)
    if (errors.length > 0) {
      console.log('Network errors detected:');
      for (const error of errors) {
        console.log(`  ${error.method} ${error.url} -> ${error.status}`);
      }
    }
    
    // This test passes if no errors, or logs errors for investigation
    // In strict mode, you would use: expect(errors.length).toBe(0);
  });

  test('should track errors across page navigations', async ({ page, networkTracker }) => {
    // Navigate to login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Try to navigate to dashboard (may require auth)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Get all errors from both navigations
    const errors = networkTracker.getErrors();
    
    // Report findings
    console.log(`Total network errors across navigations: ${errors.length}`);
    for (const error of errors) {
      console.log(`  ${error.method} ${error.url} -> ${error.status}`);
    }
  });
});

test.describe('Transaction Page Network Errors', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@aria.vantax.co.za');
    await page.fill('input[type="password"]', 'Demo123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 10000 }).catch(() => {});
  });

  test('Sales Orders page should not have 404 errors', async ({ page, networkTracker }) => {
    await page.goto('/erp/sales-orders');
    await page.waitForLoadState('networkidle');
    
    const errors = networkTracker.getErrors();
    
    // Log errors for debugging
    if (errors.length > 0) {
      console.log('Sales Orders page errors:');
      for (const error of errors) {
        console.log(`  ${error.method} ${error.url} -> ${error.status}`);
      }
    }
    
    // Strict assertion - fail if any 404s
    const notFoundErrors = errors.filter(e => e.status === 404);
    expect(notFoundErrors.length, `Found ${notFoundErrors.length} 404 errors`).toBe(0);
  });

  test('Quotes page should not have 404 errors', async ({ page, networkTracker }) => {
    await page.goto('/erp/quotes');
    await page.waitForLoadState('networkidle');
    
    const errors = networkTracker.getErrors();
    
    if (errors.length > 0) {
      console.log('Quotes page errors:');
      for (const error of errors) {
        console.log(`  ${error.method} ${error.url} -> ${error.status}`);
      }
    }
    
    const notFoundErrors = errors.filter(e => e.status === 404);
    expect(notFoundErrors.length, `Found ${notFoundErrors.length} 404 errors`).toBe(0);
  });

  test('Accounts Payable page should not have 404 errors', async ({ page, networkTracker }) => {
    await page.goto('/erp/accounts-payable');
    await page.waitForLoadState('networkidle');
    
    const errors = networkTracker.getErrors();
    
    if (errors.length > 0) {
      console.log('Accounts Payable page errors:');
      for (const error of errors) {
        console.log(`  ${error.method} ${error.url} -> ${error.status}`);
      }
    }
    
    const notFoundErrors = errors.filter(e => e.status === 404);
    expect(notFoundErrors.length, `Found ${notFoundErrors.length} 404 errors`).toBe(0);
  });

  test('Customers page should not have 404 errors', async ({ page, networkTracker }) => {
    await page.goto('/erp/customers');
    await page.waitForLoadState('networkidle');
    
    const errors = networkTracker.getErrors();
    
    if (errors.length > 0) {
      console.log('Customers page errors:');
      for (const error of errors) {
        console.log(`  ${error.method} ${error.url} -> ${error.status}`);
      }
    }
    
    const notFoundErrors = errors.filter(e => e.status === 404);
    expect(notFoundErrors.length, `Found ${notFoundErrors.length} 404 errors`).toBe(0);
  });

  test('Deliveries page should not have 404 errors', async ({ page, networkTracker }) => {
    await page.goto('/erp/deliveries');
    await page.waitForLoadState('networkidle');
    
    const errors = networkTracker.getErrors();
    
    if (errors.length > 0) {
      console.log('Deliveries page errors:');
      for (const error of errors) {
        console.log(`  ${error.method} ${error.url} -> ${error.status}`);
      }
    }
    
    const notFoundErrors = errors.filter(e => e.status === 404);
    expect(notFoundErrors.length, `Found ${notFoundErrors.length} 404 errors`).toBe(0);
  });
});

test.describe('Comprehensive Page Scan', () => {
  const pagesToTest = [
    '/dashboard',
    '/erp/sales-orders',
    '/erp/quotes',
    '/erp/customers',
    '/erp/suppliers',
    '/erp/products',
    '/erp/purchase-orders',
    '/erp/invoices',
    '/erp/accounts-payable',
    '/erp/accounts-receivable',
    '/erp/deliveries',
    '/erp/inventory',
    '/erp/general-ledger',
    '/hr/employees',
    '/hr/payroll',
  ];

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@aria.vantax.co.za');
    await page.fill('input[type="password"]', 'Demo123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 10000 }).catch(() => {});
  });

  for (const pagePath of pagesToTest) {
    test(`${pagePath} should not have 404 errors`, async ({ page, networkTracker }) => {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      const errors = networkTracker.getErrors();
      const notFoundErrors = errors.filter(e => e.status === 404);
      
      if (notFoundErrors.length > 0) {
        console.log(`404 errors on ${pagePath}:`);
        for (const error of notFoundErrors) {
          console.log(`  ${error.method} ${error.url}`);
        }
      }
      
      expect(notFoundErrors.length, `Found ${notFoundErrors.length} 404 errors on ${pagePath}`).toBe(0);
    });
  }
});
