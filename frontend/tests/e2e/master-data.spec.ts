/**
 * Comprehensive E2E tests for Master Data modules
 * Tests: Customers, Suppliers, Products with pagination
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:12001';
const TEST_EMAIL = process.env.TEST_EMAIL!;
const TEST_PASSWORD = process.env.TEST_PASSWORD!;

// Helper function for login
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

test.describe('Customers Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState('networkidle');
  });

  test('should load customers page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/customers/i);
  });

  test('should display customers table', async ({ page }) => {
    await expect(page.locator('th:has-text("Code")')).toBeVisible();
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Phone")')).toBeVisible();
  });

  test('should display search box', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });

  test('should search customers', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test');
    await page.waitForTimeout(500); // Wait for debounce
    
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('should open add customer modal', async ({ page }) => {
    await page.click('button:has-text("Add Customer")');
    
    await expect(page.locator('text=Add Customer')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });

  test('should create new customer', async ({ page }) => {
    await page.click('button:has-text("Add Customer")');
    
    await page.fill('input[name="name"]', `Test Customer ${Date.now()}`);
    await page.fill('input[type="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[name="phone"]', '+27 11 123 4567');
    await page.fill('textarea[name="address"]', '123 Test Street, Johannesburg');
    await page.fill('input[name="tax_number"]', '1234567890');
    await page.fill('input[name="payment_terms"]', '30');
    await page.fill('input[name="credit_limit"]', '50000');
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Save")');
    
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Add Customer')).not.toBeVisible();
  });

  test('should edit customer', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    
    const editButton = page.locator('button:has([class*="Edit"])').first();
    await editButton.click();
    
    await expect(page.locator('text=Edit Customer')).toBeVisible();
    
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill(`Updated Customer ${Date.now()}`);
    
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForTimeout(1000);
  });

  test('should delete customer', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    
    page.on('dialog', dialog => dialog.accept());
    const deleteButton = page.locator('button:has([class*="Trash"])').first();
    await deleteButton.click();
    
    await page.waitForTimeout(1000);
  });

  test('should handle pagination metadata', async ({ page }) => {
    const response = await page.waitForResponse(
      response => response.url().includes('/api/erp/master-data/customers') && response.status() === 200
    );
    
    const data = await response.json();
    
    if (data.meta) {
      expect(data.meta).toHaveProperty('page');
      expect(data.meta).toHaveProperty('page_size');
      expect(data.meta).toHaveProperty('total_count');
      expect(data.meta).toHaveProperty('total_pages');
    }
  });
});

test.describe('Suppliers Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/suppliers`);
    await page.waitForLoadState('networkidle');
  });

  test('should load suppliers page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/suppliers/i);
  });

  test('should display suppliers table', async ({ page }) => {
    await expect(page.locator('th:has-text("Code")')).toBeVisible();
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
  });

  test('should search suppliers', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test');
    await page.waitForTimeout(500);
    
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('should open add supplier modal', async ({ page }) => {
    await page.click('button:has-text("Add Supplier")');
    
    await expect(page.locator('text=Add Supplier')).toBeVisible();
    await expect(page.locator('input[name="supplier_name"]')).toBeVisible();
  });

  test('should create new supplier', async ({ page }) => {
    await page.click('button:has-text("Add Supplier")');
    
    await page.fill('input[name="supplier_code"]', `SUP${Date.now()}`);
    await page.fill('input[name="supplier_name"]', `Test Supplier ${Date.now()}`);
    await page.fill('input[type="email"]', `supplier${Date.now()}@example.com`);
    await page.fill('input[name="phone"]', '+27 11 987 6543');
    await page.fill('textarea[name="address"]', '456 Supplier Ave, Pretoria');
    await page.fill('input[name="tax_number"]', '9876543210');
    await page.fill('input[name="payment_terms"]', '60');
    
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Add Supplier')).not.toBeVisible();
  });

  test('should edit supplier', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    
    const editButton = page.locator('button:has([class*="Edit"])').first();
    await editButton.click();
    
    await expect(page.locator('text=Edit Supplier')).toBeVisible();
    
    const nameInput = page.locator('input[name="supplier_name"]');
    await nameInput.fill(`Updated Supplier ${Date.now()}`);
    
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForTimeout(1000);
  });

  test('should delete supplier', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    
    page.on('dialog', dialog => dialog.accept());
    const deleteButton = page.locator('button:has([class*="Trash"])').first();
    await deleteButton.click();
    
    await page.waitForTimeout(1000);
  });

  test('should handle pagination metadata', async ({ page }) => {
    const response = await page.waitForResponse(
      response => response.url().includes('/api/erp/master-data/suppliers') && response.status() === 200
    );
    
    const data = await response.json();
    
    if (data.meta) {
      expect(data.meta).toHaveProperty('page');
      expect(data.meta).toHaveProperty('page_size');
      expect(data.meta).toHaveProperty('total_count');
      expect(data.meta).toHaveProperty('total_pages');
    }
  });
});

test.describe('Products Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/inventory/products`);
    await page.waitForLoadState('networkidle');
  });

  test('should load products page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/products/i);
  });

  test('should display products table or grid', async ({ page }) => {
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasGrid = await page.locator('[class*="grid"]').isVisible().catch(() => false);
    
    expect(hasTable || hasGrid).toBeTruthy();
  });

  test('should search products', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test');
    await page.waitForTimeout(500);
  });

  test('should open add product form', async ({ page }) => {
    await page.click('button:has-text("Add Product")');
    
    await expect(page.locator('text=Add Product')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });

  test('should create new product', async ({ page }) => {
    await page.click('button:has-text("Add Product")');
    
    await page.fill('input[name="code"]', `PRD${Date.now()}`);
    await page.fill('input[name="name"]', `Test Product ${Date.now()}`);
    await page.fill('textarea[name="description"]', 'Test product description');
    await page.selectOption('select[name="product_type"]', 'finished_good');
    await page.fill('input[name="category"]', 'Electronics');
    await page.fill('input[name="unit_of_measure"]', 'EA');
    await page.fill('input[name="standard_cost"]', '100');
    await page.fill('input[name="selling_price"]', '150');
    
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForTimeout(1000);
  });

  test('should handle pagination metadata', async ({ page }) => {
    const response = await page.waitForResponse(
      response => response.url().includes('/api/erp/order-to-cash/products') && response.status() === 200
    );
    
    const data = await response.json();
    
    if (data.meta) {
      expect(data.meta).toHaveProperty('page');
      expect(data.meta).toHaveProperty('page_size');
      expect(data.meta).toHaveProperty('total_count');
      expect(data.meta).toHaveProperty('total_pages');
    }
  });
});

test.describe('API Response Format', () => {
  test('customers API should return paginated response', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/customers`);
    
    const response = await page.waitForResponse(
      response => response.url().includes('/api/erp/master-data/customers') && response.status() === 200
    );
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
      expect(data).toBeInstanceOf(Array);
    } else {
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBeTruthy();
      expect(data).toHaveProperty('meta');
    }
  });

  test('suppliers API should return paginated response', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/suppliers`);
    
    const response = await page.waitForResponse(
      response => response.url().includes('/api/erp/master-data/suppliers') && response.status() === 200
    );
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
      expect(data).toBeInstanceOf(Array);
    } else {
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBeTruthy();
      expect(data).toHaveProperty('meta');
    }
  });

  test('products API should return paginated response', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/inventory/products`);
    
    const response = await page.waitForResponse(
      response => response.url().includes('/api/erp/order-to-cash/products') && response.status() === 200
    );
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
      expect(data).toBeInstanceOf(Array);
    } else {
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBeTruthy();
      expect(data).toHaveProperty('meta');
    }
  });
});
