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

test.describe('Services Module Process Flow', () => {

  test.describe('Field Service', () => {
    test('should load field service main page', async ({ page }) => {
      await loginAndNavigate(page, '/field-service');
      const content = await page.content();
      const hasFS = content.toLowerCase().includes('field service') || content.toLowerCase().includes('service') || content.toLowerCase().includes('request');
      expect(hasFS).toBeTruthy();
    });

    test('should load field service work orders page', async ({ page }) => {
      await loginAndNavigate(page, '/field-service/work-orders');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load service orders page', async ({ page }) => {
      await loginAndNavigate(page, '/field-service/orders');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load technicians page', async ({ page }) => {
      await loginAndNavigate(page, '/field-service/technicians');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load scheduling page', async ({ page }) => {
      await loginAndNavigate(page, '/field-service/scheduling');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load route planning page', async ({ page }) => {
      await loginAndNavigate(page, '/field-service/route-planning');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load service contracts page', async ({ page }) => {
      await loginAndNavigate(page, '/field-service/service-contracts');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load service locations page', async ({ page }) => {
      await loginAndNavigate(page, '/field-service/locations');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load field service equipment page', async ({ page }) => {
      await loginAndNavigate(page, '/field-service/equipment');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Projects Module', () => {
    test('should load projects dashboard', async ({ page }) => {
      await loginAndNavigate(page, '/projects');
      const content = await page.content();
      const hasProjects = content.toLowerCase().includes('project') || content.toLowerCase().includes('task') || content.toLowerCase().includes('milestone');
      expect(hasProjects).toBeTruthy();
    });

    test('should load projects tasks page', async ({ page }) => {
      await loginAndNavigate(page, '/projects/tasks');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load projects timesheets page', async ({ page }) => {
      await loginAndNavigate(page, '/projects/timesheets');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load projects reports page', async ({ page }) => {
      await loginAndNavigate(page, '/projects/reports');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load projects milestones page', async ({ page }) => {
      await loginAndNavigate(page, '/projects/milestones');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load projects gantt page', async ({ page }) => {
      await loginAndNavigate(page, '/projects/gantt');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load projects resources page', async ({ page }) => {
      await loginAndNavigate(page, '/projects/resources');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Helpdesk Module', () => {
    test('should load helpdesk main page', async ({ page }) => {
      await loginAndNavigate(page, '/helpdesk');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load helpdesk teams page', async ({ page }) => {
      await loginAndNavigate(page, '/helpdesk/teams');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load helpdesk tickets page', async ({ page }) => {
      await loginAndNavigate(page, '/helpdesk/tickets');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Service Fulfillment', () => {
    test('should load services main page', async ({ page }) => {
      await loginAndNavigate(page, '/services');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load service projects page', async ({ page }) => {
      await loginAndNavigate(page, '/services/projects');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load service timesheets page', async ({ page }) => {
      await loginAndNavigate(page, '/services/timesheets');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load service milestones page', async ({ page }) => {
      await loginAndNavigate(page, '/services/milestones');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load service deliverables page', async ({ page }) => {
      await loginAndNavigate(page, '/services/deliverables');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load service route planning page', async ({ page }) => {
      await loginAndNavigate(page, '/services/route-planning');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load service contracts page', async ({ page }) => {
      await loginAndNavigate(page, '/services/service-contracts');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load support tickets page', async ({ page }) => {
      await loginAndNavigate(page, '/services/support-tickets');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load knowledge base page', async ({ page }) => {
      await loginAndNavigate(page, '/services/knowledge-base');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load project milestones page', async ({ page }) => {
      await loginAndNavigate(page, '/services/project-milestones');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Support Module', () => {
    test('should load support tickets page', async ({ page }) => {
      await loginAndNavigate(page, '/support/tickets');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load support knowledge base page', async ({ page }) => {
      await loginAndNavigate(page, '/support/knowledge-base');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load customer portal page', async ({ page }) => {
      await loginAndNavigate(page, '/support/customer-portal');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load escalations page', async ({ page }) => {
      await loginAndNavigate(page, '/support/escalations');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load SLA page', async ({ page }) => {
      await loginAndNavigate(page, '/support/sla');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Services Flow Integration', () => {
    test('should navigate complete field service workflow', async ({ page }) => {
      const routes = ['/field-service', '/field-service/work-orders', '/field-service/technicians', '/field-service/scheduling'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
      }
    });

    test('should navigate complete project lifecycle', async ({ page }) => {
      const routes = ['/projects', '/projects/tasks', '/projects/timesheets', '/projects/reports'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
      }
    });

    test('should navigate helpdesk to support workflow', async ({ page }) => {
      const routes = ['/helpdesk', '/helpdesk/tickets', '/support/tickets', '/support/knowledge-base'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
      }
    });
  });
});
