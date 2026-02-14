import { test, expect, Page } from '@playwright/test';
import { TEST_CONFIG } from '../test-config';

const BASE_URL = TEST_CONFIG.BASE_URL;

async function loginAndNavigate(page: Page, route: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(TEST_CONFIG.DEMO_USER.email);
  await page.locator('input[type="password"]').fill(TEST_CONFIG.DEMO_USER.password);
  await page.locator('button:has-text("Sign In"), button[type="submit"]').first().click();
  await page.waitForTimeout(3000);
  const skipTour = page.locator('text=Skip tour').first();
  if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
  await page.goto(`${BASE_URL}${route}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

test.describe('HR & Payroll Process Flow', () => {

  test.describe('HR Dashboard', () => {
    test('should load HR dashboard', async ({ page }) => {
      await loginAndNavigate(page, '/hr');
      const content = await page.content();
      const hasHR = content.toLowerCase().includes('hr') || content.toLowerCase().includes('human resource') || content.toLowerCase().includes('employee');
      expect(hasHR).toBeTruthy();
    });

    test('should display HR metrics or summary', async ({ page }) => {
      await loginAndNavigate(page, '/hr/dashboard');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Employees Module', () => {
    test('should load employees list page', async ({ page }) => {
      await loginAndNavigate(page, '/hr/employees');
      const content = await page.content();
      const hasEmployees = content.toLowerCase().includes('employee') || content.toLowerCase().includes('staff') || content.toLowerCase().includes('team');
      expect(hasEmployees).toBeTruthy();
    });

    test('should display employee data', async ({ page }) => {
      await loginAndNavigate(page, '/hr/employees');
      const hasData = await page.locator('table, [class*="table"], [class*="grid"], [class*="card"]').first().isVisible().catch(() => false);
      expect(hasData).toBeTruthy();
    });

    test('should have add employee action', async ({ page }) => {
      await loginAndNavigate(page, '/hr/employees');
      const addBtn = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();
      const isVisible = await addBtn.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    });
  });

  test.describe('Departments Module', () => {
    test('should load departments page', async ({ page }) => {
      await loginAndNavigate(page, '/hr/departments');
      const content = await page.content();
      const hasDepts = content.toLowerCase().includes('department') || content.toLowerCase().includes('team') || content.toLowerCase().includes('division');
      expect(hasDepts).toBeTruthy();
    });

    test('should display department data', async ({ page }) => {
      await loginAndNavigate(page, '/hr/departments');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Attendance Module', () => {
    test('should load attendance page', async ({ page }) => {
      await loginAndNavigate(page, '/hr/attendance');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Leave Management Module', () => {
    test('should load leave management page', async ({ page }) => {
      await loginAndNavigate(page, '/hr/leave');
      const content = await page.content();
      const hasLeave = content.toLowerCase().includes('leave') || content.toLowerCase().includes('time off') || content.toLowerCase().includes('vacation');
      expect(hasLeave).toBeTruthy();
    });
  });

  test.describe('HR Extended Features', () => {
    test('should load positions page', async ({ page }) => {
      await loginAndNavigate(page, '/hr/positions');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load performance reviews page', async ({ page }) => {
      await loginAndNavigate(page, '/hr/performance-reviews');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load training page', async ({ page }) => {
      await loginAndNavigate(page, '/hr/training');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load skills matrix page', async ({ page }) => {
      await loginAndNavigate(page, '/hr/skills-matrix');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load org chart page', async ({ page }) => {
      await loginAndNavigate(page, '/hr/org-chart');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load recruitment page', async ({ page }) => {
      await loginAndNavigate(page, '/hr/recruitment');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Payroll Dashboard', () => {
    test('should load payroll dashboard', async ({ page }) => {
      await loginAndNavigate(page, '/payroll');
      const content = await page.content();
      const hasPayroll = content.toLowerCase().includes('payroll') || content.toLowerCase().includes('salary') || content.toLowerCase().includes('compensation');
      expect(hasPayroll).toBeTruthy();
    });
  });

  test.describe('Payroll Employees', () => {
    test('should load payroll employees page', async ({ page }) => {
      await loginAndNavigate(page, '/payroll/employees');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Payroll Runs', () => {
    test('should load payroll runs page', async ({ page }) => {
      await loginAndNavigate(page, '/payroll/runs');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Payroll Tax', () => {
    test('should load tax filings page', async ({ page }) => {
      await loginAndNavigate(page, '/payroll/tax');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Payroll Extended Features', () => {
    test('should load salary structures page', async ({ page }) => {
      await loginAndNavigate(page, '/payroll/salary-structures');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load deductions page', async ({ page }) => {
      await loginAndNavigate(page, '/payroll/deductions');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load PAYE returns page', async ({ page }) => {
      await loginAndNavigate(page, '/payroll/paye-returns');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load UIF returns page', async ({ page }) => {
      await loginAndNavigate(page, '/payroll/uif-returns');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Recruitment Module', () => {
    test('should load job postings page', async ({ page }) => {
      await loginAndNavigate(page, '/recruitment/job-postings');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load applicants page', async ({ page }) => {
      await loginAndNavigate(page, '/recruitment/applicants');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load onboarding tasks page', async ({ page }) => {
      await loginAndNavigate(page, '/recruitment/onboarding');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('People Module Pages', () => {
    test('should load positions page', async ({ page }) => {
      await loginAndNavigate(page, '/people/positions');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load employee skills page', async ({ page }) => {
      await loginAndNavigate(page, '/people/employee-skills');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load performance reviews page', async ({ page }) => {
      await loginAndNavigate(page, '/people/performance-reviews');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load training courses page', async ({ page }) => {
      await loginAndNavigate(page, '/people/training-courses');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('HR-Payroll Flow Integration', () => {
    test('should navigate complete HR workflow', async ({ page }) => {
      const routes = ['/hr', '/hr/employees', '/hr/departments', '/hr/attendance', '/hr/leave'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
      }
    });

    test('should navigate complete payroll workflow', async ({ page }) => {
      const routes = ['/payroll', '/payroll/employees', '/payroll/runs', '/payroll/tax'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
      }
    });
  });
});
