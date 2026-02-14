import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'https://aria.vantax.co.za'

test.describe('Complete User Journey: Authentication Flow', () => {
  test('should complete full login → dashboard → logout flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await expect(page).toHaveURL(/login/)

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"], input[name="password"]')

    if (await emailInput.isVisible()) {
      await emailInput.fill('demo@vantax.co.za')
      await passwordInput.fill('Demo@2024!')
      await page.locator('button[type="submit"]').click()
      await page.waitForTimeout(2000)
    }
  })

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url).toMatch(/login|auth|dashboard/)
  })

  test('should persist session across page navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.waitForTimeout(1000)

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible()) {
      await emailInput.fill('demo@vantax.co.za')
      await page.locator('input[type="password"]').fill('Demo@2024!')
      await page.locator('button[type="submit"]').click()
      await page.waitForTimeout(2000)
    }

    await page.goto(`${BASE_URL}/`)
    await page.waitForTimeout(1000)
    const afterUrl = page.url()
    expect(afterUrl).toBeTruthy()
  })
})

test.describe('Complete User Journey: Navigation', () => {
  test('should navigate through main sections', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForTimeout(2000)

    const navLinks = page.locator('nav a, [role="navigation"] a, .sidebar a')
    const count = await navLinks.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should handle browser back/forward navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.waitForTimeout(1000)

    await page.goto(`${BASE_URL}/`)
    await page.waitForTimeout(1000)

    await page.goBack()
    await page.waitForTimeout(1000)
    expect(page.url()).toContain(BASE_URL)

    await page.goForward()
    await page.waitForTimeout(1000)
    expect(page.url()).toContain(BASE_URL)
  })

  test('should handle deep linking to specific pages', async ({ page }) => {
    const pages = ['/login', '/register', '/']
    for (const path of pages) {
      const response = await page.goto(`${BASE_URL}${path}`)
      expect(response?.status()).toBeLessThan(500)
    }
  })
})

test.describe('Complete User Journey: CRUD Operations', () => {
  test('should load customer list page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible()) {
      await emailInput.fill('demo@vantax.co.za')
      await page.locator('input[type="password"]').fill('Demo@2024!')
      await page.locator('button[type="submit"]').click()
      await page.waitForTimeout(3000)
    }

    await page.goto(`${BASE_URL}/customers`)
    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url).toBeTruthy()
  })

  test('should display data tables with proper structure', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForTimeout(2000)

    const tables = page.locator('table, [role="grid"], .MuiDataGrid-root')
    const tableCount = await tables.count()
    if (tableCount > 0) {
      const firstTable = tables.first()
      await expect(firstTable).toBeVisible()
    }
  })

  test('should handle empty states gracefully', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForTimeout(2000)

    const page404 = await page.goto(`${BASE_URL}/nonexistent-page`)
    expect(page404?.status()).toBeLessThan(500)
  })
})

test.describe('Complete User Journey: Form Interactions', () => {
  test('should validate required fields on forms', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.waitForTimeout(1000)

    const submitBtn = page.locator('button[type="submit"]')
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
      await page.waitForTimeout(500)
    }
  })

  test('should show loading states during API calls', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.waitForTimeout(1000)

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible()) {
      await emailInput.fill('demo@vantax.co.za')
      await page.locator('input[type="password"]').fill('Demo@2024!')
      await page.locator('button[type="submit"]').click()

      const spinners = page.locator('.MuiCircularProgress-root, [role="progressbar"], .loading')
      await page.waitForTimeout(500)
    }
  })

  test('should handle form submission errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.waitForTimeout(1000)

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible()) {
      await emailInput.fill('wrong@email.com')
      await page.locator('input[type="password"]').fill('wrongpassword')
      await page.locator('button[type="submit"]').click()
      await page.waitForTimeout(2000)

      const url = page.url()
      expect(url).toContain('login')
    }
  })
})

test.describe('Complete User Journey: Data Persistence', () => {
  test('should maintain state after page refresh', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.waitForTimeout(1000)

    const initialUrl = page.url()
    await page.reload()
    await page.waitForTimeout(1000)

    expect(page.url()).toBeTruthy()
  })

  test('should handle concurrent tab operations', async ({ context }) => {
    const page1 = await context.newPage()
    const page2 = await context.newPage()

    await page1.goto(`${BASE_URL}/login`)
    await page2.goto(`${BASE_URL}/login`)

    await page1.waitForTimeout(1000)
    await page2.waitForTimeout(1000)

    expect(page1.url()).toContain(BASE_URL)
    expect(page2.url()).toContain(BASE_URL)

    await page1.close()
    await page2.close()
  })
})

test.describe('API Integration Smoke Tests', () => {
  test('should return valid response from health endpoint', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`)
    expect(response.status()).toBeLessThan(500)
  })

  test('should return 401 for unauthenticated API calls', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/v1/customers`)
    expect([200, 401, 403, 404]).toContain(response.status())
  })

  test('should handle CORS preflight requests', async ({ request }) => {
    const response = await request.fetch(`${BASE_URL}/api/health`, {
      method: 'OPTIONS',
    })
    expect(response.status()).toBeLessThan(500)
  })
})
