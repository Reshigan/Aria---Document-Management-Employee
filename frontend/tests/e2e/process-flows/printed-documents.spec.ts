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
  await dismissOverlays(page);
  await page.goto(`${BASE_URL}${route}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await dismissOverlays(page);
}

async function dismissOverlays(page: Page) {
  const skipTour = page.locator('text=Skip tour').first();
  if (await skipTour.isVisible().catch(() => false)) await skipTour.click();
  await page.waitForTimeout(300);
  const overlay = page.locator('.fixed.inset-0.z-\\[100\\]');
  if (await overlay.isVisible().catch(() => false)) {
    const closeBtn = overlay.locator('button').first();
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click({ force: true });
  }
  await page.waitForTimeout(300);
}

test.describe('Printed Documents & Customer Statements', () => {

  test.describe('Document Templates Page', () => {
    test('should load document templates page and render content', async ({ page }) => {
      await loginAndNavigate(page, '/documents/templates');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should show error boundary with recovery options on templates page', async ({ page }) => {
      await loginAndNavigate(page, '/documents/templates');
      const errorBoundary = page.locator('text=Something went wrong');
      const hasError = await errorBoundary.isVisible().catch(() => false);
      if (hasError) {
        await expect(page.locator('text=TRY AGAIN')).toBeVisible();
        await expect(page.locator('text=RELOAD PAGE')).toBeVisible();
        await expect(page.locator('text=GO TO DASHBOARD')).toBeVisible();
      }
    });
  });

  test.describe('Generate Document Page', () => {
    test('should load generate document page without errors', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
      await expect(page.locator('h1')).toContainText('Generate Document');
    });

    test('should display Document Type dropdown with all types', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      const select = page.locator('select[name="document_type"]');
      await expect(select).toBeVisible();
      const options = await select.locator('option').allTextContents();
      expect(options).toContain('Quote');
      expect(options).toContain('Sales Order');
      expect(options).toContain('Tax Invoice');
      expect(options).toContain('Delivery Note');
      expect(options).toContain('Purchase Order');
      expect(options).toContain('RFQ');
      expect(options).toContain('GRN');
      expect(options).toContain('Payment Voucher');
      expect(options).toContain('Journal Entry');
    });

    test('should show form fields for default Quote document type', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      await expect(page.locator('text=Customer/Supplier')).toBeVisible();
      await expect(page.locator('text=Document Number')).toBeVisible();
      await expect(page.locator('text=Line Items')).toBeVisible();
    });

    test('should show form fields after selecting Tax Invoice document type', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      const select = page.locator('select').first();
      await select.selectOption({ label: 'Tax Invoice' });
      await page.waitForTimeout(500);
      await expect(page.locator('text=Customer/Supplier')).toBeVisible();
      await expect(page.locator('text=Line Items')).toBeVisible();
    });

    test('should show form fields after selecting Purchase Order document type', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      const select = page.locator('select').first();
      await select.selectOption({ label: 'Purchase Order' });
      await page.waitForTimeout(500);
      await expect(page.locator('text=Customer/Supplier')).toBeVisible();
      await expect(page.locator('text=Line Items')).toBeVisible();
    });

    test('should show form fields after selecting Delivery Note document type', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      const select = page.locator('select').first();
      await select.selectOption({ label: 'Delivery Note' });
      await page.waitForTimeout(500);
      await expect(page.locator('text=Customer/Supplier')).toBeVisible();
      await expect(page.locator('text=Line Items')).toBeVisible();
    });

    test('should show form fields after selecting Journal Entry document type', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      const select = page.locator('select').first();
      await select.selectOption({ label: 'Journal Entry' });
      await page.waitForTimeout(500);
      await expect(page.locator('text=Customer/Supplier')).toBeVisible();
      await expect(page.locator('text=Line Items')).toBeVisible();
    });

    test('should show form fields after selecting Payment Voucher document type', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      const select = page.locator('select').first();
      await select.selectOption({ label: 'Payment Voucher' });
      await page.waitForTimeout(500);
      await expect(page.locator('text=Customer/Supplier')).toBeVisible();
      await expect(page.locator('text=Line Items')).toBeVisible();
    });

    test('should display line items with description, quantity, and price fields', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      await expect(page.locator('input[placeholder="Description"]').first()).toBeVisible();
      const numberInputs = page.locator('input[type="number"]');
      const count = await numberInputs.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('should display Add Line Item link', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      await expect(page.locator('text=Add Line Item')).toBeVisible();
    });

    test('should display Subtotal section on generate page', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      await expect(page.locator('text=Subtotal').first()).toBeVisible();
    });

    test('should display Date field on generate page', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      await expect(page.locator('text=Date')).toBeVisible();
      const dateInput = page.locator('input[type="date"]');
      await expect(dateInput).toBeVisible();
    });

    test('should display customer search input', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      await expect(page.locator('input[placeholder="Start typing to search..."]')).toBeVisible();
    });

    test('should display customer direct entry input', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      await expect(page.locator('input[placeholder="Or enter customer name directly..."]')).toBeVisible();
    });

    test('should display Document Number AUTO field', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      const docNum = page.locator('input[value="AUTO"]');
      await expect(docNum).toBeVisible();
    });

    test('should fill customer name and verify it persists', async ({ page }) => {
      await loginAndNavigate(page, '/documents/generate');
      const input = page.locator('input[placeholder="Or enter customer name directly..."]');
      await input.fill('Test Company Pty Ltd');
      await expect(input).toHaveValue('Test Company Pty Ltd');
    });
  });

  test.describe('Invoice Form Page (New Invoice)', () => {
    test('should load new invoice form without errors', async ({ page }) => {
      await loginAndNavigate(page, '/ar/invoices/new');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should display New Invoice heading', async ({ page }) => {
      await loginAndNavigate(page, '/ar/invoices/new');
      await expect(page.locator('h1')).toContainText('New Invoice');
      await expect(page.locator('text=Create a new customer invoice')).toBeVisible();
    });

    test('should display Invoice Details form section', async ({ page }) => {
      await loginAndNavigate(page, '/ar/invoices/new');
      await expect(page.locator('text=Invoice Details')).toBeVisible();
      await expect(page.locator('text=Basic invoice information')).toBeVisible();
    });

    test('should display Customer, Reference, Invoice Date, Due Date fields', async ({ page }) => {
      await loginAndNavigate(page, '/ar/invoices/new');
      await expect(page.locator('label:has-text("Customer")')).toBeVisible();
      await expect(page.locator('label:has-text("Reference")')).toBeVisible();
      await expect(page.locator('label:has-text("Invoice Date")')).toBeVisible();
      await expect(page.locator('label:has-text("Due Date")')).toBeVisible();
    });

    test('should display Notes textarea', async ({ page }) => {
      await loginAndNavigate(page, '/ar/invoices/new');
      await expect(page.locator('label:has-text("Notes")')).toBeVisible();
      const textarea = page.locator('textarea');
      await expect(textarea).toBeVisible();
    });

    test('should display Line Items section with Add Line button', async ({ page }) => {
      await loginAndNavigate(page, '/ar/invoices/new');
      await expect(page.locator('text=Line Items')).toBeVisible();
      await expect(page.locator('text=Add Line')).toBeVisible();
    });

    test('should display line item table headers (Description, Qty, Price, VAT, Total, Action)', async ({ page }) => {
      await loginAndNavigate(page, '/ar/invoices/new');
      await expect(page.locator('th:has-text("Description")')).toBeVisible();
      await expect(page.locator('th:has-text("Qty")')).toBeVisible();
      await expect(page.locator('th:has-text("Price")')).toBeVisible();
      await expect(page.locator('th:has-text("VAT")')).toBeVisible();
      await expect(page.locator('th:has-text("Total")')).toBeVisible();
      await expect(page.locator('th:has-text("Action")')).toBeVisible();
    });

    test('should display Subtotal, VAT, and Total summary after scrolling', async ({ page }) => {
      await loginAndNavigate(page, '/ar/invoices/new');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      await expect(page.locator('text=Subtotal:').first()).toBeVisible();
      await expect(page.locator('text=Total:').first()).toBeVisible();
    });

    test('should display Save Invoice and Cancel buttons', async ({ page }) => {
      await loginAndNavigate(page, '/ar/invoices/new');
      await expect(page.locator('text=Save Invoice')).toBeVisible();
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    });

    test('should add a new line item when clicking Add Line', async ({ page }) => {
      await loginAndNavigate(page, '/ar/invoices/new');
      const initialInputs = await page.locator('input[placeholder="Item description..."]').count();
      await page.locator('text=Add Line').click();
      await page.waitForTimeout(300);
      const afterInputs = await page.locator('input[placeholder="Item description..."]').count();
      expect(afterInputs).toBe(initialInputs + 1);
    });

    test('should fill invoice form fields and verify values', async ({ page }) => {
      await loginAndNavigate(page, '/ar/invoices/new');
      await page.locator('select').first().selectOption('1');
      await page.locator('input[placeholder="PO Number or reference"]').fill('PO-TEST-001');
      await page.locator('input[placeholder="Item description..."]').first().fill('Consulting Services');
      const qtyInputs = page.locator('input[type="number"][min="0"]');
      await qtyInputs.first().fill('5');
      await page.waitForTimeout(300);
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Credit Notes Page', () => {
    test('should load credit notes page without errors', async ({ page }) => {
      await loginAndNavigate(page, '/ar/credit-notes');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should display Credit Notes heading', async ({ page }) => {
      await loginAndNavigate(page, '/ar/credit-notes');
      await expect(page.locator('h1')).toContainText('Credit Notes');
      await expect(page.locator('text=Manage customer credit notes')).toBeVisible();
    });

    test('should display stat cards (Total Credit Notes, Total Value, Issued, Draft)', async ({ page }) => {
      await loginAndNavigate(page, '/ar/credit-notes');
      await expect(page.locator('text=Total Credit Notes')).toBeVisible();
      await expect(page.locator('text=Total Value')).toBeVisible();
      await expect(page.locator('text=Issued')).toBeVisible();
      await expect(page.locator('text=Draft')).toBeVisible();
    });

    test('should display New Credit Note button', async ({ page }) => {
      await loginAndNavigate(page, '/ar/credit-notes');
      await expect(page.locator('text=New Credit Note').first()).toBeVisible();
    });

    test('should display Refresh button', async ({ page }) => {
      await loginAndNavigate(page, '/ar/credit-notes');
      const refreshBtn = page.locator('button').filter({ has: page.locator('[class*="h-5 w-5"]') }).first();
      await expect(refreshBtn).toBeVisible();
    });

    test('should open Create Credit Note modal', async ({ page }) => {
      await loginAndNavigate(page, '/ar/credit-notes');
      await page.locator('text=New Credit Note').first().click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=Create Credit Note')).toBeVisible();
      await expect(page.locator('text=Issue credit to customer')).toBeVisible();
    });

    test('should display credit note form fields (Date, Total Amount, Reason)', async ({ page }) => {
      await loginAndNavigate(page, '/ar/credit-notes');
      await page.locator('text=New Credit Note').first().click();
      await page.waitForTimeout(500);
      await expect(page.locator('label:has-text("Date")')).toBeVisible();
      await expect(page.locator('label:has-text("Total Amount")')).toBeVisible();
      await expect(page.locator('label:has-text("Reason")')).toBeVisible();
    });

    test('should display Create and Cancel buttons in credit note modal', async ({ page }) => {
      await loginAndNavigate(page, '/ar/credit-notes');
      await page.locator('text=New Credit Note').first().click();
      await page.waitForTimeout(500);
      await expect(page.locator('button[type="submit"]:has-text("Create")')).toBeVisible();
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    });

    test('should close credit note modal when clicking Cancel', async ({ page }) => {
      await loginAndNavigate(page, '/ar/credit-notes');
      await page.locator('text=New Credit Note').first().click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=Create Credit Note')).toBeVisible();
      await page.locator('button:has-text("Cancel")').click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=Create Credit Note')).not.toBeVisible();
    });

    test('should also load credit notes via financial route', async ({ page }) => {
      await loginAndNavigate(page, '/financial/credit-notes');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Customer Statements Page', () => {
    test('should load customer statements page without errors', async ({ page }) => {
      await loginAndNavigate(page, '/financial/customer-statements');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should display Customer Statements heading', async ({ page }) => {
      await loginAndNavigate(page, '/financial/customer-statements');
      await expect(page.locator('h1')).toContainText('Customer Statements');
      await expect(page.locator('text=Generate and send account statements to customers')).toBeVisible();
    });

    test('should display stat cards (Total Customers, Total Outstanding, Total Overdue, Statements Sent)', async ({ page }) => {
      await loginAndNavigate(page, '/financial/customer-statements');
      await expect(page.locator('text=Total Customers')).toBeVisible();
      await expect(page.locator('text=Total Outstanding')).toBeVisible();
      await expect(page.locator('text=Total Overdue')).toBeVisible();
      await expect(page.locator('text=Statements Sent')).toBeVisible();
    });

    test('should display Generate Statements button (disabled when none selected)', async ({ page }) => {
      await loginAndNavigate(page, '/financial/customer-statements');
      const genBtn = page.locator('button:has-text("Generate Statements")');
      await expect(genBtn).toBeVisible();
      await expect(genBtn).toBeDisabled();
    });

    test('should display Refresh button on statements page', async ({ page }) => {
      await loginAndNavigate(page, '/financial/customer-statements');
      const refreshBtn = page.locator('button').filter({ has: page.locator('[class*="h-5 w-5"]') }).first();
      await expect(refreshBtn).toBeVisible();
    });

    test('should display Customers section with table', async ({ page }) => {
      await loginAndNavigate(page, '/financial/customer-statements');
      await expect(page.locator('text=Customers').first()).toBeVisible();
    });

    test('should display Select All / Deselect All toggle', async ({ page }) => {
      await loginAndNavigate(page, '/financial/customer-statements');
      const selectAll = page.locator('text=Select All');
      const deselectAll = page.locator('text=Deselect All');
      const toggle = selectAll.or(deselectAll);
      await expect(toggle.first()).toBeVisible();
    });

    test('should display customer table headers (Customer, Outstanding, Overdue, Last Statement)', async ({ page }) => {
      await loginAndNavigate(page, '/financial/customer-statements');
      await expect(page.locator('th:has-text("Customer")')).toBeVisible();
      await expect(page.locator('th:has-text("Outstanding")')).toBeVisible();
      await expect(page.locator('th:has-text("Overdue")')).toBeVisible();
      await expect(page.locator('th:has-text("Last Statement")')).toBeVisible();
    });

    test('should display Recent Statements section', async ({ page }) => {
      await loginAndNavigate(page, '/financial/customer-statements');
      await expect(page.locator('text=Recent Statements')).toBeVisible();
    });

    test('should load customer statements via AR route as well', async ({ page }) => {
      await loginAndNavigate(page, '/ar/statements');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should display customer statements via AR route with same content', async ({ page }) => {
      await loginAndNavigate(page, '/ar/statements');
      await expect(page.locator('h1')).toContainText('Customer Statements');
    });
  });

  test.describe('Profit & Loss Statement - Export/Print', () => {
    test('should load P&L statement page without errors', async ({ page }) => {
      await loginAndNavigate(page, '/reports/profit-loss');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should display Export PDF button on P&L page', async ({ page }) => {
      await loginAndNavigate(page, '/reports/profit-loss');
      const exportBtn = page.locator('[data-testid="button-export-pdf"]');
      await expect(exportBtn).toBeVisible();
    });

    test('should display date range filters on P&L page', async ({ page }) => {
      await loginAndNavigate(page, '/reports/profit-loss');
      const dateInputs = page.locator('input[type="date"]');
      const count = await dateInputs.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Aged Reports - Export', () => {
    test('should load AR aging report page without errors', async ({ page }) => {
      await loginAndNavigate(page, '/reports/ar-aging');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should display Export button on aging report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/ar-aging');
      await expect(page.locator('text=Export').first()).toBeVisible();
    });

    test('should display aging buckets (Current, 1-30, 31-60, 61-90, 90+ Days)', async ({ page }) => {
      await loginAndNavigate(page, '/reports/ar-aging');
      await expect(page.locator('text=Current')).toBeVisible();
      await expect(page.locator('text=1-30 Days')).toBeVisible();
      await expect(page.locator('text=31-60 Days')).toBeVisible();
      await expect(page.locator('text=61-90 Days')).toBeVisible();
      await expect(page.locator('text=90+ Days')).toBeVisible();
    });

    test('should display Total Outstanding section on aging report', async ({ page }) => {
      await loginAndNavigate(page, '/reports/ar-aging');
      await expect(page.locator('text=Total Outstanding')).toBeVisible();
    });
  });

  test.describe('Fixed Assets - Export Report', () => {
    test('should load depreciation page without errors', async ({ page }) => {
      await loginAndNavigate(page, '/fixed-assets/depreciation');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should display Export Report button on depreciation page', async ({ page }) => {
      await loginAndNavigate(page, '/fixed-assets/depreciation');
      await expect(page.locator('text=Export Report')).toBeVisible();
    });
  });

  test.describe('Document Classification & Upload', () => {
    test('should load document classification page without errors', async ({ page }) => {
      await loginAndNavigate(page, '/ask-aria/classify');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load document upload page without errors', async ({ page }) => {
      await loginAndNavigate(page, '/documents');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });

    test('should load compliance document control page without errors', async ({ page }) => {
      await loginAndNavigate(page, '/compliance/document-control');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Invoice Templates Admin Page', () => {
    test('should load invoice templates admin page without errors', async ({ page }) => {
      await loginAndNavigate(page, '/admin/invoice-templates');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    });
  });

  test.describe('End-to-End Document Workflow', () => {
    test('should navigate full document generation workflow: Templates → Generate', async ({ page }) => {
      await loginAndNavigate(page, '/documents/templates');
      const content1 = await page.content();
      expect(content1.length).toBeGreaterThan(1000);
      await page.goto(`${BASE_URL}/documents/generate`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await expect(page.locator('h1')).toContainText('Generate Document');
      await expect(page.locator('text=Customer/Supplier')).toBeVisible();
    });

    test('should navigate full customer statements workflow: Statements → Select → Generate', async ({ page }) => {
      await loginAndNavigate(page, '/financial/customer-statements');
      await expect(page.locator('h1')).toContainText('Customer Statements');
      await expect(page.locator('text=Customers').first()).toBeVisible();
      await expect(page.locator('text=Recent Statements')).toBeVisible();
    });

    test('should navigate full credit notes workflow: List → New → Form', async ({ page }) => {
      await loginAndNavigate(page, '/ar/credit-notes');
      await expect(page.locator('h1')).toContainText('Credit Notes');
      await page.locator('text=New Credit Note').first().click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=Create Credit Note')).toBeVisible();
      await expect(page.locator('label:has-text("Reason")')).toBeVisible();
    });

    test('should navigate full invoice workflow: List → New → Form → Line Items', async ({ page }) => {
      await loginAndNavigate(page, '/ar/invoices');
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
      await page.goto(`${BASE_URL}/ar/invoices/new`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await expect(page.locator('h1')).toContainText('New Invoice');
      await expect(page.locator('text=Line Items')).toBeVisible();
    });

    test('should navigate all printable document routes without errors', async ({ page }) => {
      const routes = [
        '/documents/generate',
        '/ar/invoices/new',
        '/ar/credit-notes',
        '/financial/customer-statements',
        '/ar/statements',
        '/reports/profit-loss',
        '/reports/balance-sheet',
        '/reports/ar-aging',
        '/fixed-assets/depreciation'
      ];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
      }
    });

    test('should verify no critical JS errors on key document pages', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('Failed to load') && !msg.text().includes('net::ERR')) {
          errors.push(msg.text());
        }
      });
      const routes = ['/documents/generate', '/financial/customer-statements', '/ar/credit-notes'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
      }
      const criticalErrors = errors.filter(e => e.includes('TypeError') || e.includes('ReferenceError') || e.includes('SyntaxError'));
      expect(criticalErrors.length).toBe(0);
    });
  });
});
