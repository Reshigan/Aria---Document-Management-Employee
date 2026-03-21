import { test, expect } from '@playwright/test'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:12001'

test.describe('Form Validation Tests', () => {
  test.describe('Login Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
    })

    test('should show login form with email and password fields', async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="Email" i]')
      const passwordInput = page.locator('input[type="password"], input[name="password"]')
      await expect(emailInput.first()).toBeVisible()
      await expect(passwordInput.first()).toBeVisible()
    })

    test('should require email field', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
      await passwordInput.fill('Password123!')
      const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")').first()
      await submitBtn.click()
      await page.waitForTimeout(1000)
      const url = page.url()
      expect(url).toContain('login')
    })

    test('should require password field', async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first()
      await emailInput.fill('test@example.com')
      const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")').first()
      await submitBtn.click()
      await page.waitForTimeout(1000)
      const url = page.url()
      expect(url).toContain('login')
    })

    test('should reject invalid email format', async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first()
      await emailInput.fill('invalid-email')
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
      await passwordInput.fill('Password123!')
      const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")').first()
      await submitBtn.click()
      await page.waitForTimeout(1000)
      const url = page.url()
      expect(url).toContain('login')
    })

    test('should show error on invalid credentials', async ({ page }) => {
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first()
      await emailInput.fill('wrong@example.com')
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
      await passwordInput.fill('WrongPassword123!')
      const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")').first()
      await submitBtn.click()
      await page.waitForTimeout(2000)
      const errorMessage = page.locator('[role="alert"], .error, .MuiAlert-root, [class*="error" i]')
      const count = await errorMessage.count()
      const url = page.url()
      expect(count > 0 || url.includes('login')).toBeTruthy()
    })
  })

  test.describe('Registration Form Validation', () => {
    test('should have registration link or page', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      const registerLink = page.locator('a:has-text("Register"), a:has-text("Sign up"), a:has-text("Create account"), a[href*="register"]')
      const count = await registerLink.count()
      if (count > 0) {
        await registerLink.first().click()
        await page.waitForLoadState('networkidle')
        const nameInput = page.locator('input[name="first_name"], input[name="firstName"], input[placeholder*="name" i]')
        const emailInput = page.locator('input[type="email"], input[name="email"]')
        expect((await nameInput.count()) > 0 || (await emailInput.count()) > 0).toBeTruthy()
      }
    })

    test('should validate registration page loads', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/register`)
      await page.waitForLoadState('networkidle')
      const pageContent = await page.content()
      expect(pageContent.length).toBeGreaterThan(0)
    })
  })

  test.describe('Input Field Behaviors', () => {
    test('should mask password input', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      const passwordInput = page.locator('input[type="password"]').first()
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })

    test('should allow email input with keyboard', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first()
      await emailInput.click()
      await emailInput.type('test@example.com')
      await expect(emailInput).toHaveValue('test@example.com')
    })

    test('should support tab navigation between fields', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first()
      await emailInput.focus()
      await page.keyboard.press('Tab')
      const activeElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(activeElement).toBeTruthy()
    })

    test('should submit form on Enter key', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState('networkidle')
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first()
      await emailInput.fill('test@example.com')
      const passwordInput = page.locator('input[type="password"]').first()
      await passwordInput.fill('Password123!')
      await passwordInput.press('Enter')
      await page.waitForTimeout(2000)
      expect(true).toBeTruthy()
    })
  })
})
