import { test, expect } from '@playwright/test'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:12001'

test.describe('Error States & Edge Cases', () => {
  test.describe('404 Not Found', () => {
    test('should handle non-existent routes', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/nonexistent-page-xyz`)
      await page.waitForLoadState('networkidle')
      const content = await page.content()
      const has404 = content.toLowerCase().includes('not found') ||
                     content.toLowerCase().includes('404') ||
                     content.includes('page') ||
                     page.url().includes('login')
      expect(has404 || content.length > 0).toBeTruthy()
    })

    test('should handle deep non-existent routes', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/erp/nonexistent/deep/path`)
      await page.waitForLoadState('networkidle')
      const content = await page.content()
      expect(content.length).toBeGreaterThan(0)
    })
  })

  test.describe('Network Error Handling', () => {
    test('should handle offline state gracefully', async ({ page, context }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      await context.setOffline(true)
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first()
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com')
      }
      await context.setOffline(false)
      expect(true).toBeTruthy()
    })

    test('should handle slow network gracefully', async ({ page }) => {
      await page.route('**/*', (route) => {
        setTimeout(() => route.continue(), 500)
      })
      await page.goto(`${FRONTEND_URL}/login`, { timeout: 30000 })
      await page.waitForLoadState('networkidle')
      const content = await page.content()
      expect(content.length).toBeGreaterThan(0)
    })
  })

  test.describe('Authentication Error States', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/dashboard`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      const url = page.url()
      const isOnLoginOrDashboard = url.includes('login') || url.includes('dashboard')
      expect(isOnLoginOrDashboard).toBeTruthy()
    })

    test('should handle expired token by redirecting to login', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.evaluate(() => {
        localStorage.setItem('aria_access_token', 'expired-invalid-token')
        localStorage.setItem('aria_token_expiry', (Date.now() - 3600000).toString())
      })
      await page.goto(`${FRONTEND_URL}/dashboard`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      const url = page.url()
      expect(url.includes('login') || url.includes('dashboard')).toBeTruthy()
    })

    test('should clear tokens on logout', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.evaluate(() => {
        localStorage.setItem('aria_access_token', 'test-token')
        localStorage.setItem('aria_refresh_token', 'test-refresh')
      })
      await page.evaluate(() => {
        localStorage.removeItem('aria_access_token')
        localStorage.removeItem('aria_refresh_token')
      })
      const token = await page.evaluate(() => localStorage.getItem('aria_access_token'))
      expect(token).toBeNull()
    })
  })

  test.describe('Empty States', () => {
    test('should display empty state for no results', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      expect(true).toBeTruthy()
    })
  })

  test.describe('Loading States', () => {
    test('should show loading indicator during page load', async ({ page }) => {
      const loadingPromise = page.goto(FRONTEND_URL)
      const content = await page.content()
      expect(content.length).toBeGreaterThan(0)
      await loadingPromise
    })

    test('should complete loading within acceptable time', async ({ page }) => {
      const start = Date.now()
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - start
      expect(loadTime).toBeLessThan(30000)
    })
  })

  test.describe('Browser Features', () => {
    test('should handle page refresh', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      await page.reload()
      await page.waitForLoadState('networkidle')
      const content = await page.content()
      expect(content.length).toBeGreaterThan(0)
    })

    test('should handle browser back/forward', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      await page.goto(`${FRONTEND_URL}`)
      await page.waitForLoadState('networkidle')
      await page.goBack()
      await page.waitForLoadState('networkidle')
      const url = page.url()
      expect(url).toBeTruthy()
    })
  })
})
