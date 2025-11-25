import { test, expect } from '@playwright/test'

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:12001';

test('homepage loads successfully', async ({ page }) => {
  // Navigate to the app (CI starts it on port 12001)
  await page.goto(BASE_URL)
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle')
  
  // Check that the page loaded (basic smoke test)
  expect(await page.title()).toBeTruthy()
  
  // Check that the body exists
  const body = await page.locator('body')
  await expect(body).toBeVisible()
})
