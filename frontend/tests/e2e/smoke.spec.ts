import { test, expect } from '@playwright/test'

test('homepage loads successfully', async ({ page }) => {
  // Navigate to the app (CI starts it on port 12000)
  await page.goto('http://localhost:12000')
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle')
  
  // Check that the page loaded (basic smoke test)
  expect(await page.title()).toBeTruthy()
  
  // Check that the body exists
  const body = await page.locator('body')
  await expect(body).toBeVisible()
})
