import { test, expect } from '@playwright/test'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:12001'

const viewports = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
}

test.describe('Responsive Layout Tests', () => {
  test.describe('Desktop Layout', () => {
    test.use({ viewport: viewports.desktop })

    test('should display full navigation on desktop', async ({ page }) => {
      await page.goto(FRONTEND_URL)
      await page.waitForLoadState('networkidle')
      const nav = page.locator('nav, [role="navigation"], header')
      await expect(nav.first()).toBeVisible()
    })

    test('should render login page properly on desktop', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      const loginForm = page.locator('form, [data-testid="login-form"], input[type="email"], input[type="text"]')
      await expect(loginForm.first()).toBeVisible()
    })

    test('should not show mobile menu hamburger on desktop', async ({ page }) => {
      await page.goto(FRONTEND_URL)
      await page.waitForLoadState('networkidle')
      const hamburger = page.locator('[data-testid="mobile-menu-button"], .hamburger-menu')
      const count = await hamburger.count()
      if (count > 0) {
        await expect(hamburger.first()).not.toBeVisible()
      }
    })
  })

  test.describe('Tablet Layout', () => {
    test.use({ viewport: viewports.tablet })

    test('should render login page on tablet', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/login/)
    })

    test('should adapt content width for tablet', async ({ page }) => {
      await page.goto(FRONTEND_URL)
      await page.waitForLoadState('networkidle')
      const body = page.locator('body')
      const box = await body.boundingBox()
      expect(box).toBeTruthy()
      if (box) {
        expect(box.width).toBeLessThanOrEqual(768)
      }
    })
  })

  test.describe('Mobile Layout', () => {
    test.use({ viewport: viewports.mobile })

    test('should render login page on mobile', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/login/)
    })

    test('should have touch-friendly button sizes on mobile', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      const buttons = page.locator('button')
      const count = await buttons.count()
      for (let i = 0; i < Math.min(count, 5); i++) {
        const box = await buttons.nth(i).boundingBox()
        if (box && box.height > 0) {
          expect(box.height).toBeGreaterThanOrEqual(30)
        }
      }
    })

    test('should stack form fields vertically on mobile', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      const inputs = page.locator('input:visible')
      const count = await inputs.count()
      if (count >= 2) {
        const box1 = await inputs.first().boundingBox()
        const box2 = await inputs.nth(1).boundingBox()
        if (box1 && box2) {
          expect(box2.y).toBeGreaterThan(box1.y)
        }
      }
    })

    test('should fit content within viewport width', async ({ page }) => {
      await page.goto(FRONTEND_URL)
      await page.waitForLoadState('networkidle')
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      expect(hasHorizontalScroll).toBe(false)
    })
  })

  test.describe('Cross-Viewport Consistency', () => {
    for (const [name, viewport] of Object.entries(viewports)) {
      test(`should load login page on ${name}`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await page.goto(`${FRONTEND_URL}/login`)
        await page.waitForLoadState('networkidle')
        const pageTitle = await page.title()
        expect(pageTitle).toBeTruthy()
      })
    }

    test('should maintain font readability across viewports', async ({ page }) => {
      for (const [name, viewport] of Object.entries(viewports)) {
        await page.setViewportSize(viewport)
        await page.goto(`${FRONTEND_URL}/login`)
        await page.waitForLoadState('networkidle')
        const fontSize = await page.evaluate(() => {
          const body = document.body
          return parseFloat(window.getComputedStyle(body).fontSize)
        })
        expect(fontSize).toBeGreaterThanOrEqual(12)
      }
    })
  })
})
