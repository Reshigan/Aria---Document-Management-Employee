/**
 * ARIA ERP - Test Helper Functions
 * Reusable helper functions for all E2E tests
 */

import { Page, expect } from '@playwright/test';
import { TEST_CONFIG, SELECTORS, ROUTES } from './test-config';

/**
 * Login to the application
 */
export async function login(page: Page, email?: string, password?: string): Promise<void> {
  const userEmail = email || TEST_CONFIG.DEMO_USER.email;
  const userPassword = password || TEST_CONFIG.DEMO_USER.password;
  
  await page.goto(`${TEST_CONFIG.BASE_URL}${ROUTES.AUTH.LOGIN}`);
  await page.waitForLoadState('networkidle');
  
  // Fill email
  const emailInput = page.locator(SELECTORS.INPUT_EMAIL).first();
  await emailInput.fill(userEmail);
  
  // Fill password
  const passwordInput = page.locator(SELECTORS.INPUT_PASSWORD).first();
  await passwordInput.fill(userPassword);
  
  // Submit
  await page.click(SELECTORS.BUTTON_SUBMIT);
  
  // Wait for navigation to dashboard
  await page.waitForURL(/dashboard|\/$/);
  await page.waitForLoadState('networkidle');
}

/**
 * Logout from the application
 */
export async function logout(page: Page): Promise<void> {
  // Try to find and click logout button
  const logoutButton = page.locator('button:has-text("Logout"), [data-testid="logout"]').first();
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL(/login/);
  }
}

/**
 * Navigate to a specific route
 */
export async function navigateTo(page: Page, route: string): Promise<void> {
  await page.goto(`${TEST_CONFIG.BASE_URL}${route}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Wait for any loading spinners to disappear
  const spinner = page.locator(SELECTORS.SPINNER);
  if (await spinner.isVisible()) {
    await spinner.waitFor({ state: 'hidden', timeout: TEST_CONFIG.DEFAULT_TIMEOUT });
  }
}

/**
 * Check if page loaded successfully (not redirected to dashboard for 404)
 */
export async function verifyPageLoaded(page: Page, expectedUrlPattern: RegExp | string): Promise<boolean> {
  const currentUrl = page.url();
  if (typeof expectedUrlPattern === 'string') {
    return currentUrl.includes(expectedUrlPattern);
  }
  return expectedUrlPattern.test(currentUrl);
}

/**
 * Check if page has content (not empty)
 */
export async function verifyPageHasContent(page: Page): Promise<boolean> {
  const content = await page.content();
  return content.length > 1000; // Basic check for non-empty page
}

/**
 * Check if page has a heading
 */
export async function verifyPageHasHeading(page: Page, headingPattern?: RegExp): Promise<boolean> {
  const heading = page.locator('h1, h2').first();
  if (!await heading.isVisible()) {
    return false;
  }
  if (headingPattern) {
    const text = await heading.textContent();
    return headingPattern.test(text || '');
  }
  return true;
}

/**
 * Check if page has a table or list
 */
export async function verifyPageHasDataDisplay(page: Page): Promise<boolean> {
  const hasTable = await page.locator(SELECTORS.TABLE).isVisible().catch(() => false);
  const hasList = await page.locator('[class*="list"], [class*="grid"]').isVisible().catch(() => false);
  const hasCards = await page.locator(SELECTORS.CARD).count() > 0;
  return hasTable || hasList || hasCards;
}

/**
 * Click a button by text
 */
export async function clickButton(page: Page, buttonText: string): Promise<void> {
  const button = page.locator(`button:has-text("${buttonText}")`).first();
  await button.click();
}

/**
 * Fill a form field
 */
export async function fillField(page: Page, fieldName: string, value: string): Promise<void> {
  const field = page.locator(`input[name="${fieldName}"], textarea[name="${fieldName}"]`).first();
  await field.fill(value);
}

/**
 * Select an option from a dropdown
 */
export async function selectOption(page: Page, selectName: string, value: string): Promise<void> {
  const select = page.locator(`select[name="${selectName}"]`).first();
  await select.selectOption(value);
}

/**
 * Check if a modal is visible
 */
export async function isModalVisible(page: Page): Promise<boolean> {
  return await page.locator(SELECTORS.MODAL).isVisible().catch(() => false);
}

/**
 * Close a modal
 */
export async function closeModal(page: Page): Promise<void> {
  const closeButton = page.locator(SELECTORS.MODAL_CLOSE).first();
  if (await closeButton.isVisible()) {
    await closeButton.click();
  } else {
    // Try pressing Escape
    await page.keyboard.press('Escape');
  }
}

/**
 * Wait for success message
 */
export async function waitForSuccessMessage(page: Page): Promise<boolean> {
  try {
    await page.locator(SELECTORS.SUCCESS_MESSAGE).waitFor({ timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for error message
 */
export async function waitForErrorMessage(page: Page): Promise<boolean> {
  try {
    await page.locator(SELECTORS.ERROR_MESSAGE).waitFor({ timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Search in a search box
 */
export async function search(page: Page, searchTerm: string): Promise<void> {
  const searchInput = page.locator(SELECTORS.INPUT_SEARCH).first();
  if (await searchInput.isVisible()) {
    await searchInput.fill(searchTerm);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  }
}

/**
 * Get table row count
 */
export async function getTableRowCount(page: Page): Promise<number> {
  const rows = page.locator(`${SELECTORS.TABLE} tbody tr`);
  return await rows.count();
}

/**
 * Click on a table row action button
 */
export async function clickTableRowAction(page: Page, rowIndex: number, actionText: string): Promise<void> {
  const row = page.locator(`${SELECTORS.TABLE} tbody tr`).nth(rowIndex);
  const actionButton = row.locator(`button:has-text("${actionText}")`).first();
  await actionButton.click();
}

/**
 * Verify API response
 */
export async function verifyApiResponse(page: Page, urlPattern: string | RegExp, expectedStatus = 200): Promise<boolean> {
  try {
    const response = await page.waitForResponse(
      response => {
        const url = response.url();
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern);
        }
        return urlPattern.test(url);
      },
      { timeout: TEST_CONFIG.API_TIMEOUT }
    );
    return response.status() === expectedStatus;
  } catch {
    return false;
  }
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `screenshots/${name}-${Date.now()}.png` });
}

/**
 * Check if element exists
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).count() > 0;
}

/**
 * Wait for element to be visible
 */
export async function waitForElement(page: Page, selector: string, timeout = TEST_CONFIG.DEFAULT_TIMEOUT): Promise<boolean> {
  try {
    await page.locator(selector).waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get text content of an element
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector).first();
  return await element.textContent() || '';
}

/**
 * Check if navigation menu is visible
 */
export async function verifyNavigationVisible(page: Page): Promise<boolean> {
  return await page.locator(SELECTORS.NAV_MENU).isVisible().catch(() => false);
}

/**
 * Open command palette (Ctrl+K)
 */
export async function openCommandPalette(page: Page): Promise<void> {
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
}

/**
 * Close command palette
 */
export async function closeCommandPalette(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

/**
 * Test page navigation and basic rendering
 */
export async function testPageBasics(page: Page, route: string, expectedHeading?: RegExp): Promise<{
  loaded: boolean;
  hasContent: boolean;
  hasHeading: boolean;
  hasNavigation: boolean;
  url: string;
}> {
  await navigateTo(page, route);
  
  const url = page.url();
  const loaded = !url.includes('/dashboard') || route.includes('dashboard');
  const hasContent = await verifyPageHasContent(page);
  const hasHeading = await verifyPageHasHeading(page, expectedHeading);
  const hasNavigation = await verifyNavigationVisible(page);
  
  return { loaded, hasContent, hasHeading, hasNavigation, url };
}

/**
 * Test CRUD operations on a page
 */
export async function testCRUDOperations(page: Page, route: string): Promise<{
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}> {
  await navigateTo(page, route);
  
  // Check if Create button exists
  const createButton = page.locator(SELECTORS.BUTTON_CREATE).first();
  const canCreate = await createButton.isVisible().catch(() => false);
  
  // Check if data is displayed (Read)
  const canRead = await verifyPageHasDataDisplay(page);
  
  // Check if Edit button exists
  const editButton = page.locator(SELECTORS.BUTTON_EDIT).first();
  const canUpdate = await editButton.isVisible().catch(() => false);
  
  // Check if Delete button exists
  const deleteButton = page.locator(SELECTORS.BUTTON_DELETE).first();
  const canDelete = await deleteButton.isVisible().catch(() => false);
  
  return { canCreate, canRead, canUpdate, canDelete };
}

/**
 * Test form submission
 */
export async function testFormSubmission(page: Page, formData: Record<string, string>): Promise<boolean> {
  // Fill form fields
  for (const [fieldName, value] of Object.entries(formData)) {
    await fillField(page, fieldName, value);
  }
  
  // Submit form
  const submitButton = page.locator(SELECTORS.BUTTON_SAVE).first();
  if (await submitButton.isVisible()) {
    await submitButton.click();
    return await waitForSuccessMessage(page);
  }
  
  return false;
}

/**
 * Verify page metrics/cards are displayed
 */
export async function verifyMetricsDisplayed(page: Page): Promise<boolean> {
  const metricCards = page.locator(SELECTORS.METRIC_CARD);
  const cardCount = await metricCards.count();
  return cardCount > 0;
}

/**
 * Test pagination
 */
export async function testPagination(page: Page): Promise<boolean> {
  const pagination = page.locator(SELECTORS.PAGINATION);
  if (!await pagination.isVisible()) {
    return true; // No pagination needed
  }
  
  const nextButton = page.locator(SELECTORS.PAGINATION_NEXT);
  if (await nextButton.isEnabled()) {
    await nextButton.click();
    await page.waitForTimeout(500);
    return true;
  }
  
  return true;
}

/**
 * Test tab navigation
 */
export async function testTabs(page: Page): Promise<boolean> {
  const tabs = page.locator(SELECTORS.TAB);
  const tabCount = await tabs.count();
  
  if (tabCount === 0) {
    return true; // No tabs on this page
  }
  
  // Click each tab
  for (let i = 0; i < Math.min(tabCount, 5); i++) {
    await tabs.nth(i).click();
    await page.waitForTimeout(300);
  }
  
  return true;
}

/**
 * Generate unique test ID
 */
export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Clean up test data
 */
export async function cleanupTestData(page: Page, apiEndpoint: string, testPrefix: string): Promise<void> {
  // This would typically call an API to delete test data
  // For now, we'll just log the cleanup
  console.log(`Cleanup: ${apiEndpoint} with prefix ${testPrefix}`);
}
