/**
 * API Routes for New Pages (60+ pages)
 * Covers Financial, Operations, People, Services, and Compliance modules
 */

import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

interface JWTPayload {
  sub: string;
  email: string;
  company_id: string;
  role: string;
}

const app = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// Helper to generate UUID
function generateUUID(): string {
  return crypto.randomUUID();
}

// ============================================
// FINANCIAL MODULE
// ============================================

// --- Budgets ---
app.get('/budgets', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT b.*, d.department_name 
    FROM budgets b
    LEFT JOIN departments d ON b.department_id = d.id
    WHERE b.company_id = ?
    ORDER BY b.fiscal_year DESC, b.created_at DESC
  `).bind(companyId).all();
  
  return c.json({ budgets: result.results || [] });
});

app.get('/budgets/:id', async (c) => {
  const id = c.req.param('id');
  const budget = await c.env.DB.prepare(`SELECT * FROM budgets WHERE id = ?`).bind(id).first();
  if (!budget) return c.json({ error: 'Budget not found' }, 404);
  
  const lines = await c.env.DB.prepare(`
    SELECT bl.*, coa.account_name 
    FROM budget_lines bl
    LEFT JOIN chart_of_accounts coa ON bl.account_id = coa.id
    WHERE bl.budget_id = ?
    ORDER BY bl.period
  `).bind(id).all();
  
  return c.json({ budget, lines: lines.results || [] });
});

app.post('/budgets', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO budgets (id, company_id, budget_code, budget_name, fiscal_year, department_id, cost_center, total_amount, status, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.budget_code, body.budget_name, body.fiscal_year, body.department_id, body.cost_center, body.total_amount || 0, 'draft', body.notes, user.sub).run();
  
  return c.json({ id, message: 'Budget created successfully' }, 201);
});

app.put('/budgets/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  await c.env.DB.prepare(`
    UPDATE budgets SET budget_name = ?, department_id = ?, cost_center = ?, total_amount = ?, allocated_amount = ?, status = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.budget_name, body.department_id, body.cost_center, body.total_amount, body.allocated_amount, body.status, body.notes, id).run();
  
  return c.json({ message: 'Budget updated successfully' });
});

app.delete('/budgets/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare(`DELETE FROM budgets WHERE id = ?`).bind(id).run();
  return c.json({ message: 'Budget deleted successfully' });
});

// --- Cost Centers ---
app.get('/cost-centers', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT cc.*, d.department_name, e.first_name || ' ' || e.last_name as manager_name
    FROM cost_centers cc
    LEFT JOIN departments d ON cc.department_id = d.id
    LEFT JOIN employees e ON cc.manager_id = e.id
    WHERE cc.company_id = ?
    ORDER BY cc.cost_center_code
  `).bind(companyId).all();
  
  return c.json({ cost_centers: result.results || [] });
});

app.post('/cost-centers', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO cost_centers (id, company_id, cost_center_code, cost_center_name, parent_id, manager_id, department_id, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.cost_center_code, body.cost_center_name, body.parent_id, body.manager_id, body.department_id, 1).run();
  
  return c.json({ id, message: 'Cost center created successfully' }, 201);
});

app.put('/cost-centers/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  await c.env.DB.prepare(`
    UPDATE cost_centers SET cost_center_name = ?, parent_id = ?, manager_id = ?, department_id = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.cost_center_name, body.parent_id, body.manager_id, body.department_id, body.is_active ? 1 : 0, id).run();
  
  return c.json({ message: 'Cost center updated successfully' });
});

app.delete('/cost-centers/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare(`DELETE FROM cost_centers WHERE id = ?`).bind(id).run();
  return c.json({ message: 'Cost center deleted successfully' });
});

// --- Payment Batches ---
app.get('/payment-batches', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT pb.*, ba.account_name as bank_account_name
    FROM payment_batches pb
    LEFT JOIN bank_accounts ba ON pb.bank_account_id = ba.id
    WHERE pb.company_id = ?
    ORDER BY pb.batch_date DESC
  `).bind(companyId).all();
  
  return c.json({ payment_batches: result.results || [] });
});

app.get('/payment-batches/:id', async (c) => {
  const id = c.req.param('id');
  const batch = await c.env.DB.prepare(`SELECT * FROM payment_batches WHERE id = ?`).bind(id).first();
  if (!batch) return c.json({ error: 'Payment batch not found' }, 404);
  
  const items = await c.env.DB.prepare(`
    SELECT pbi.*, s.supplier_name
    FROM payment_batch_items pbi
    LEFT JOIN suppliers s ON pbi.supplier_id = s.id
    WHERE pbi.batch_id = ?
  `).bind(id).all();
  
  return c.json({ batch, items: items.results || [] });
});

app.post('/payment-batches', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const batchNumber = `PB-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO payment_batches (id, company_id, batch_number, batch_date, bank_account_id, payment_method, total_amount, payment_count, status, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, batchNumber, body.batch_date, body.bank_account_id, body.payment_method || 'eft', body.total_amount || 0, body.payment_count || 0, 'draft', body.notes, user.sub).run();
  
  return c.json({ id, batch_number: batchNumber, message: 'Payment batch created successfully' }, 201);
});

app.put('/payment-batches/:id/approve', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  
  await c.env.DB.prepare(`
    UPDATE payment_batches SET status = 'approved', approved_by = ?, approved_at = datetime('now')
    WHERE id = ?
  `).bind(user.sub, id).run();
  
  return c.json({ message: 'Payment batch approved successfully' });
});

app.put('/payment-batches/:id/process', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  
  await c.env.DB.prepare(`
    UPDATE payment_batches SET status = 'processed', processed_by = ?, processed_at = datetime('now')
    WHERE id = ?
  `).bind(user.sub, id).run();
  
  return c.json({ message: 'Payment batch processed successfully' });
});

// --- Expense Claims ---
app.get('/expense-claims', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT ec.*, e.first_name || ' ' || e.last_name as employee_name
    FROM expense_claims ec
    LEFT JOIN employees e ON ec.employee_id = e.id
    WHERE ec.company_id = ?
    ORDER BY ec.claim_date DESC
  `).bind(companyId).all();
  
  return c.json({ expense_claims: result.results || [] });
});

app.get('/expense-claims/:id', async (c) => {
  const id = c.req.param('id');
  const claim = await c.env.DB.prepare(`SELECT * FROM expense_claims WHERE id = ?`).bind(id).first();
  if (!claim) return c.json({ error: 'Expense claim not found' }, 404);
  
  const lines = await c.env.DB.prepare(`SELECT * FROM expense_claim_lines WHERE claim_id = ? ORDER BY expense_date`).bind(id).all();
  
  return c.json({ claim, lines: lines.results || [] });
});

app.post('/expense-claims', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const claimNumber = `EXP-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO expense_claims (id, company_id, claim_number, employee_id, claim_date, description, total_amount, currency, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, claimNumber, body.employee_id, body.claim_date, body.description, body.total_amount || 0, body.currency || 'ZAR', 'draft').run();
  
  return c.json({ id, claim_number: claimNumber, message: 'Expense claim created successfully' }, 201);
});

app.put('/expense-claims/:id/submit', async (c) => {
  const id = c.req.param('id');
  
  await c.env.DB.prepare(`
    UPDATE expense_claims SET status = 'submitted', submitted_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).bind(id).run();
  
  return c.json({ message: 'Expense claim submitted successfully' });
});

app.put('/expense-claims/:id/approve', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  
  await c.env.DB.prepare(`
    UPDATE expense_claims SET status = 'approved', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).bind(user.sub, id).run();
  
  return c.json({ message: 'Expense claim approved successfully' });
});

app.put('/expense-claims/:id/reject', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  await c.env.DB.prepare(`
    UPDATE expense_claims SET status = 'rejected', rejected_reason = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.reason, id).run();
  
  return c.json({ message: 'Expense claim rejected' });
});

// --- Credit Notes ---
app.get('/credit-notes', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT cn.*, c.customer_name
    FROM credit_notes cn
    LEFT JOIN customers c ON cn.customer_id = c.id
    WHERE cn.company_id = ?
    ORDER BY cn.credit_note_date DESC
  `).bind(companyId).all();
  
  return c.json({ credit_notes: result.results || [] });
});

app.post('/credit-notes', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const creditNoteNumber = `CN-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO credit_notes (id, company_id, credit_note_number, customer_id, invoice_id, credit_note_date, reason, subtotal, tax_amount, total_amount, currency, status, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, creditNoteNumber, body.customer_id, body.invoice_id, body.credit_note_date, body.reason, body.subtotal || 0, body.tax_amount || 0, body.total_amount || 0, body.currency || 'ZAR', 'draft', body.notes, user.sub).run();
  
  return c.json({ id, credit_note_number: creditNoteNumber, message: 'Credit note created successfully' }, 201);
});

app.put('/credit-notes/:id/issue', async (c) => {
  const id = c.req.param('id');
  
  await c.env.DB.prepare(`
    UPDATE credit_notes SET status = 'issued', updated_at = datetime('now')
    WHERE id = ?
  `).bind(id).run();
  
  return c.json({ message: 'Credit note issued successfully' });
});

// --- Collections ---
app.get('/collections', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT col.*, c.customer_name, e.first_name || ' ' || e.last_name as assigned_to_name
    FROM collections col
    LEFT JOIN customers c ON col.customer_id = c.id
    LEFT JOIN employees e ON col.assigned_to = e.id
    WHERE col.company_id = ?
    ORDER BY col.contact_date DESC
  `).bind(companyId).all();
  
  return c.json({ collections: result.results || [] });
});

app.post('/collections', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const collectionNumber = `COL-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO collections (id, company_id, collection_number, customer_id, invoice_id, contact_date, contact_method, contact_person, amount_outstanding, promise_to_pay_date, promise_to_pay_amount, outcome, follow_up_date, assigned_to, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, collectionNumber, body.customer_id, body.invoice_id, body.contact_date, body.contact_method, body.contact_person, body.amount_outstanding || 0, body.promise_to_pay_date, body.promise_to_pay_amount, body.outcome, body.follow_up_date, body.assigned_to, body.notes, user.sub).run();
  
  return c.json({ id, collection_number: collectionNumber, message: 'Collection record created successfully' }, 201);
});

// --- Cash Forecasts ---
app.get('/cash-forecasts', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT * FROM cash_forecasts WHERE company_id = ? ORDER BY forecast_date DESC
  `).bind(companyId).all();
  
  return c.json({ cash_forecasts: result.results || [] });
});

app.get('/cash-forecasts/:id', async (c) => {
  const id = c.req.param('id');
  const forecast = await c.env.DB.prepare(`SELECT * FROM cash_forecasts WHERE id = ?`).bind(id).first();
  if (!forecast) return c.json({ error: 'Cash forecast not found' }, 404);
  
  const lines = await c.env.DB.prepare(`SELECT * FROM cash_forecast_lines WHERE forecast_id = ? ORDER BY line_date`).bind(id).all();
  
  return c.json({ forecast, lines: lines.results || [] });
});

app.post('/cash-forecasts', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO cash_forecasts (id, company_id, forecast_name, forecast_date, period_start, period_end, opening_balance, projected_inflows, projected_outflows, closing_balance, status, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.forecast_name, body.forecast_date, body.period_start, body.period_end, body.opening_balance || 0, body.projected_inflows || 0, body.projected_outflows || 0, body.closing_balance || 0, 'draft', body.notes, user.sub).run();
  
  return c.json({ id, message: 'Cash forecast created successfully' }, 201);
});

// --- Bank Transfers ---
app.get('/bank-transfers', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT bt.*, 
           fa.account_name as from_account_name,
           ta.account_name as to_account_name
    FROM bank_transfers bt
    LEFT JOIN bank_accounts fa ON bt.from_account_id = fa.id
    LEFT JOIN bank_accounts ta ON bt.to_account_id = ta.id
    WHERE bt.company_id = ?
    ORDER BY bt.transfer_date DESC
  `).bind(companyId).all();
  
  return c.json({ bank_transfers: result.results || [] });
});

app.post('/bank-transfers', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const transferNumber = `TRF-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO bank_transfers (id, company_id, transfer_number, transfer_date, from_account_id, to_account_id, amount, currency, exchange_rate, reference, status, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, transferNumber, body.transfer_date, body.from_account_id, body.to_account_id, body.amount, body.currency || 'ZAR', body.exchange_rate || 1, body.reference, 'pending', body.notes, user.sub).run();
  
  return c.json({ id, transfer_number: transferNumber, message: 'Bank transfer created successfully' }, 201);
});

app.put('/bank-transfers/:id/complete', async (c) => {
  const id = c.req.param('id');
  
  await c.env.DB.prepare(`
    UPDATE bank_transfers SET status = 'completed', completed_at = datetime('now')
    WHERE id = ?
  `).bind(id).run();
  
  return c.json({ message: 'Bank transfer completed successfully' });
});

// ============================================
// OPERATIONS MODULE
// ============================================

// --- Price Lists ---
app.get('/price-lists', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT * FROM price_lists WHERE company_id = ? ORDER BY price_list_name
  `).bind(companyId).all();
  
  return c.json({ price_lists: result.results || [] });
});

app.get('/price-lists/:id', async (c) => {
  const id = c.req.param('id');
  const priceList = await c.env.DB.prepare(`SELECT * FROM price_lists WHERE id = ?`).bind(id).first();
  if (!priceList) return c.json({ error: 'Price list not found' }, 404);
  
  const items = await c.env.DB.prepare(`
    SELECT pli.*, p.product_name, p.sku
    FROM price_list_items pli
    LEFT JOIN products p ON pli.product_id = p.id
    WHERE pli.price_list_id = ?
  `).bind(id).all();
  
  return c.json({ price_list: priceList, items: items.results || [] });
});

app.post('/price-lists', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO price_lists (id, company_id, price_list_code, price_list_name, currency, is_default, valid_from, valid_to, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.price_list_code, body.price_list_name, body.currency || 'ZAR', body.is_default ? 1 : 0, body.valid_from, body.valid_to, 1).run();
  
  return c.json({ id, message: 'Price list created successfully' }, 201);
});

// --- Discounts ---
app.get('/discounts', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT * FROM discounts WHERE company_id = ? ORDER BY discount_name
  `).bind(companyId).all();
  
  return c.json({ discounts: result.results || [] });
});

app.post('/discounts', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO discounts (id, company_id, discount_code, discount_name, discount_type, discount_value, applies_to, applies_to_id, min_order_amount, max_discount_amount, valid_from, valid_to, usage_limit, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.discount_code, body.discount_name, body.discount_type, body.discount_value, body.applies_to || 'all', body.applies_to_id, body.min_order_amount, body.max_discount_amount, body.valid_from, body.valid_to, body.usage_limit, 1).run();
  
  return c.json({ id, message: 'Discount created successfully' }, 201);
});

// --- Sales Targets ---
app.get('/sales-targets', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT st.*, e.first_name || ' ' || e.last_name as employee_name
    FROM sales_targets st
    LEFT JOIN employees e ON st.employee_id = e.id
    WHERE st.company_id = ?
    ORDER BY st.target_period DESC
  `).bind(companyId).all();
  
  return c.json({ sales_targets: result.results || [] });
});

app.post('/sales-targets', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO sales_targets (id, company_id, target_period, target_type, employee_id, team_id, product_category, target_amount, achieved_amount, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.target_period, body.target_type, body.employee_id, body.team_id, body.product_category, body.target_amount, 0, 'active', body.notes).run();
  
  return c.json({ id, message: 'Sales target created successfully' }, 201);
});

// --- Commissions ---
app.get('/commissions', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT com.*, e.first_name || ' ' || e.last_name as employee_name
    FROM commissions com
    LEFT JOIN employees e ON com.employee_id = e.id
    WHERE com.company_id = ?
    ORDER BY com.period DESC
  `).bind(companyId).all();
  
  return c.json({ commissions: result.results || [] });
});

app.post('/commissions', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  const commissionAmount = (body.sales_amount || 0) * (body.commission_rate || 0) / 100;
  const finalAmount = commissionAmount + (body.adjustments || 0);
  
  await c.env.DB.prepare(`
    INSERT INTO commissions (id, company_id, employee_id, period, sales_amount, commission_rate, commission_amount, adjustments, final_amount, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.employee_id, body.period, body.sales_amount || 0, body.commission_rate || 0, commissionAmount, body.adjustments || 0, finalAmount, 'calculated', body.notes).run();
  
  return c.json({ id, message: 'Commission calculated successfully' }, 201);
});

// --- Stock Adjustments ---
app.get('/stock-adjustments', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT sa.*, w.warehouse_name
    FROM stock_adjustments sa
    LEFT JOIN warehouses w ON sa.warehouse_id = w.id
    WHERE sa.company_id = ?
    ORDER BY sa.adjustment_date DESC
  `).bind(companyId).all();
  
  return c.json({ stock_adjustments: result.results || [] });
});

app.get('/stock-adjustments/:id', async (c) => {
  const id = c.req.param('id');
  const adjustment = await c.env.DB.prepare(`SELECT * FROM stock_adjustments WHERE id = ?`).bind(id).first();
  if (!adjustment) return c.json({ error: 'Stock adjustment not found' }, 404);
  
  const lines = await c.env.DB.prepare(`
    SELECT sal.*, p.product_name, p.sku
    FROM stock_adjustment_lines sal
    LEFT JOIN products p ON sal.product_id = p.id
    WHERE sal.adjustment_id = ?
  `).bind(id).all();
  
  return c.json({ adjustment, lines: lines.results || [] });
});

app.post('/stock-adjustments', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const adjustmentNumber = `ADJ-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO stock_adjustments (id, company_id, adjustment_number, adjustment_date, warehouse_id, adjustment_type, reason, status, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, adjustmentNumber, body.adjustment_date, body.warehouse_id, body.adjustment_type, body.reason, 'draft', body.notes, user.sub).run();
  
  return c.json({ id, adjustment_number: adjustmentNumber, message: 'Stock adjustment created successfully' }, 201);
});

// --- Stock Transfers ---
app.get('/stock-transfers', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT st.*, 
           fw.warehouse_name as from_warehouse_name,
           tw.warehouse_name as to_warehouse_name
    FROM stock_transfers st
    LEFT JOIN warehouses fw ON st.from_warehouse_id = fw.id
    LEFT JOIN warehouses tw ON st.to_warehouse_id = tw.id
    WHERE st.company_id = ?
    ORDER BY st.transfer_date DESC
  `).bind(companyId).all();
  
  return c.json({ stock_transfers: result.results || [] });
});

app.post('/stock-transfers', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const transferNumber = `STK-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO stock_transfers (id, company_id, transfer_number, transfer_date, from_warehouse_id, to_warehouse_id, status, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, transferNumber, body.transfer_date, body.from_warehouse_id, body.to_warehouse_id, 'draft', body.notes, user.sub).run();
  
  return c.json({ id, transfer_number: transferNumber, message: 'Stock transfer created successfully' }, 201);
});

// --- Reorder Points ---
app.get('/reorder-points', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT rp.*, p.product_name, p.sku, w.warehouse_name,
           sl.quantity_on_hand, sl.quantity_available
    FROM reorder_points rp
    LEFT JOIN products p ON rp.product_id = p.id
    LEFT JOIN warehouses w ON rp.warehouse_id = w.id
    LEFT JOIN stock_levels sl ON rp.product_id = sl.product_id AND rp.warehouse_id = sl.warehouse_id
    WHERE rp.company_id = ?
    ORDER BY p.product_name
  `).bind(companyId).all();
  
  return c.json({ reorder_points: result.results || [] });
});

app.post('/reorder-points', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO reorder_points (id, company_id, product_id, warehouse_id, reorder_level, reorder_quantity, max_stock_level, lead_time_days, safety_stock, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.product_id, body.warehouse_id, body.reorder_level, body.reorder_quantity, body.max_stock_level, body.lead_time_days || 7, body.safety_stock || 0, 1).run();
  
  return c.json({ id, message: 'Reorder point created successfully' }, 201);
});

// --- Requisitions ---
app.get('/requisitions', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT r.*, e.first_name || ' ' || e.last_name as requested_by_name, d.department_name
    FROM requisitions r
    LEFT JOIN employees e ON r.requested_by = e.id
    LEFT JOIN departments d ON r.department_id = d.id
    WHERE r.company_id = ?
    ORDER BY r.requisition_date DESC
  `).bind(companyId).all();
  
  return c.json({ requisitions: result.results || [] });
});

app.get('/requisitions/:id', async (c) => {
  const id = c.req.param('id');
  const requisition = await c.env.DB.prepare(`SELECT * FROM requisitions WHERE id = ?`).bind(id).first();
  if (!requisition) return c.json({ error: 'Requisition not found' }, 404);
  
  const lines = await c.env.DB.prepare(`
    SELECT rl.*, p.product_name, s.supplier_name as preferred_supplier_name
    FROM requisition_lines rl
    LEFT JOIN products p ON rl.product_id = p.id
    LEFT JOIN suppliers s ON rl.preferred_supplier_id = s.id
    WHERE rl.requisition_id = ?
  `).bind(id).all();
  
  return c.json({ requisition, lines: lines.results || [] });
});

app.post('/requisitions', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const requisitionNumber = `REQ-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO requisitions (id, company_id, requisition_number, requisition_date, requested_by, department_id, required_date, priority, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, requisitionNumber, body.requisition_date, body.requested_by || user.sub, body.department_id, body.required_date, body.priority || 'normal', 'draft', body.notes).run();
  
  return c.json({ id, requisition_number: requisitionNumber, message: 'Requisition created successfully' }, 201);
});

app.put('/requisitions/:id/approve', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  
  await c.env.DB.prepare(`
    UPDATE requisitions SET status = 'approved', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).bind(user.sub, id).run();
  
  return c.json({ message: 'Requisition approved successfully' });
});

// --- RFQs ---
app.get('/rfqs', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT r.*, s.supplier_name as awarded_supplier_name
    FROM rfqs r
    LEFT JOIN suppliers s ON r.awarded_supplier_id = s.id
    WHERE r.company_id = ?
    ORDER BY r.rfq_date DESC
  `).bind(companyId).all();
  
  return c.json({ rfqs: result.results || [] });
});

app.post('/rfqs', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const rfqNumber = `RFQ-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO rfqs (id, company_id, rfq_number, rfq_date, requisition_id, title, description, submission_deadline, status, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, rfqNumber, body.rfq_date, body.requisition_id, body.title, body.description, body.submission_deadline, 'draft', body.notes, user.sub).run();
  
  return c.json({ id, rfq_number: rfqNumber, message: 'RFQ created successfully' }, 201);
});

// --- Production Plans ---
app.get('/production-plans', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT * FROM production_plans WHERE company_id = ? ORDER BY plan_period DESC
  `).bind(companyId).all();
  
  return c.json({ production_plans: result.results || [] });
});

app.post('/production-plans', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const planNumber = `PP-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO production_plans (id, company_id, plan_number, plan_name, plan_period, status, total_planned_quantity, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, planNumber, body.plan_name, body.plan_period, 'draft', body.total_planned_quantity || 0, body.notes, user.sub).run();
  
  return c.json({ id, plan_number: planNumber, message: 'Production plan created successfully' }, 201);
});

// --- Machine Maintenance ---
app.get('/machine-maintenance', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT mm.*, m.machine_name, e.first_name || ' ' || e.last_name as technician_name
    FROM machine_maintenance mm
    LEFT JOIN machines m ON mm.machine_id = m.id
    LEFT JOIN employees e ON mm.technician_id = e.id
    WHERE mm.company_id = ?
    ORDER BY mm.scheduled_date DESC
  `).bind(companyId).all();
  
  return c.json({ maintenance_records: result.results || [] });
});

app.post('/machine-maintenance', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const maintenanceNumber = `MNT-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO machine_maintenance (id, company_id, maintenance_number, machine_id, maintenance_type, scheduled_date, technician_id, description, status, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, maintenanceNumber, body.machine_id, body.maintenance_type, body.scheduled_date, body.technician_id, body.description, 'scheduled', body.notes, user.sub).run();
  
  return c.json({ id, maintenance_number: maintenanceNumber, message: 'Maintenance record created successfully' }, 201);
});

// ============================================
// PEOPLE MODULE
// ============================================

// --- Positions ---
app.get('/positions', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT p.*, d.department_name
    FROM positions p
    LEFT JOIN departments d ON p.department_id = d.id
    WHERE p.company_id = ?
    ORDER BY p.position_title
  `).bind(companyId).all();
  
  return c.json({ positions: result.results || [] });
});

app.post('/positions', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO positions (id, company_id, position_code, position_title, department_id, reports_to_position_id, job_description, requirements, min_salary, max_salary, headcount, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.position_code, body.position_title, body.department_id, body.reports_to_position_id, body.job_description, body.requirements, body.min_salary, body.max_salary, body.headcount || 1, 1).run();
  
  return c.json({ id, message: 'Position created successfully' }, 201);
});

// --- Salary Structures ---
app.get('/salary-structures', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT * FROM salary_structures WHERE company_id = ? ORDER BY structure_name
  `).bind(companyId).all();
  
  return c.json({ salary_structures: result.results || [] });
});

app.post('/salary-structures', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  const totalPackage = (body.base_salary || 0) + (body.housing_allowance || 0) + (body.transport_allowance || 0) + (body.medical_allowance || 0) + (body.other_allowances || 0);
  
  await c.env.DB.prepare(`
    INSERT INTO salary_structures (id, company_id, structure_code, structure_name, base_salary, housing_allowance, transport_allowance, medical_allowance, other_allowances, total_package, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.structure_code, body.structure_name, body.base_salary || 0, body.housing_allowance || 0, body.transport_allowance || 0, body.medical_allowance || 0, body.other_allowances || 0, totalPackage, 1).run();
  
  return c.json({ id, message: 'Salary structure created successfully' }, 201);
});

// --- Deductions ---
app.get('/deductions', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT * FROM deductions WHERE company_id = ? ORDER BY deduction_name
  `).bind(companyId).all();
  
  return c.json({ deductions: result.results || [] });
});

app.post('/deductions', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO deductions (id, company_id, deduction_code, deduction_name, deduction_type, calculation_type, amount, percentage, max_amount, is_pre_tax, is_employer_contribution, employer_amount, employer_percentage, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.deduction_code, body.deduction_name, body.deduction_type, body.calculation_type, body.amount, body.percentage, body.max_amount, body.is_pre_tax ? 1 : 0, body.is_employer_contribution ? 1 : 0, body.employer_amount, body.employer_percentage, 1).run();
  
  return c.json({ id, message: 'Deduction created successfully' }, 201);
});

// --- PAYE Returns ---
app.get('/paye-returns', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT * FROM paye_returns WHERE company_id = ? ORDER BY return_period DESC
  `).bind(companyId).all();
  
  return c.json({ paye_returns: result.results || [] });
});

app.post('/paye-returns', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO paye_returns (id, company_id, return_period, submission_date, total_employees, total_gross_remuneration, total_paye, total_uif_employee, total_uif_employer, total_sdl, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.return_period, body.submission_date, body.total_employees || 0, body.total_gross_remuneration || 0, body.total_paye || 0, body.total_uif_employee || 0, body.total_uif_employer || 0, body.total_sdl || 0, 'draft', body.notes).run();
  
  return c.json({ id, message: 'PAYE return created successfully' }, 201);
});

// --- UIF Returns ---
app.get('/uif-returns', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT * FROM uif_returns WHERE company_id = ? ORDER BY return_period DESC
  `).bind(companyId).all();
  
  return c.json({ uif_returns: result.results || [] });
});

app.post('/uif-returns', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  const totalUif = (body.total_uif_employee || 0) + (body.total_uif_employer || 0);
  
  await c.env.DB.prepare(`
    INSERT INTO uif_returns (id, company_id, return_period, submission_date, total_employees, total_remuneration, total_uif_employee, total_uif_employer, total_uif, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.return_period, body.submission_date, body.total_employees || 0, body.total_remuneration || 0, body.total_uif_employee || 0, body.total_uif_employer || 0, totalUif, 'draft', body.notes).run();
  
  return c.json({ id, message: 'UIF return created successfully' }, 201);
});

// --- Job Postings ---
app.get('/job-postings', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT jp.*, d.department_name, p.position_title
    FROM job_postings jp
    LEFT JOIN departments d ON jp.department_id = d.id
    LEFT JOIN positions p ON jp.position_id = p.id
    WHERE jp.company_id = ?
    ORDER BY jp.posted_date DESC
  `).bind(companyId).all();
  
  return c.json({ job_postings: result.results || [] });
});

app.post('/job-postings', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const jobCode = `JOB-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO job_postings (id, company_id, job_code, position_id, job_title, department_id, location, employment_type, description, requirements, salary_range_min, salary_range_max, show_salary, posted_date, closing_date, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, jobCode, body.position_id, body.job_title, body.department_id, body.location, body.employment_type || 'permanent', body.description, body.requirements, body.salary_range_min, body.salary_range_max, body.show_salary ? 1 : 0, body.posted_date, body.closing_date, 'draft', user.sub).run();
  
  return c.json({ id, job_code: jobCode, message: 'Job posting created successfully' }, 201);
});

// --- Applicants ---
app.get('/applicants', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT a.*, jp.job_title
    FROM applicants a
    LEFT JOIN job_postings jp ON a.job_posting_id = jp.id
    WHERE a.company_id = ?
    ORDER BY a.applied_date DESC
  `).bind(companyId).all();
  
  return c.json({ applicants: result.results || [] });
});

app.post('/applicants', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const applicantNumber = `APP-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO applicants (id, company_id, applicant_number, job_posting_id, first_name, last_name, email, phone, resume_url, cover_letter, source, applied_date, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, applicantNumber, body.job_posting_id, body.first_name, body.last_name, body.email, body.phone, body.resume_url, body.cover_letter, body.source, body.applied_date || new Date().toISOString().split('T')[0], 'new', body.notes).run();
  
  // Update applicant count on job posting
  if (body.job_posting_id) {
    await c.env.DB.prepare(`
      UPDATE job_postings SET applicant_count = applicant_count + 1, updated_at = datetime('now')
      WHERE id = ?
    `).bind(body.job_posting_id).run();
  }
  
  return c.json({ id, applicant_number: applicantNumber, message: 'Applicant created successfully' }, 201);
});

// --- Onboarding Tasks ---
app.get('/onboarding-tasks', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  const employeeId = c.req.query('employee_id');
  
  let query = `
    SELECT ot.*, e.first_name || ' ' || e.last_name as employee_name
    FROM onboarding_tasks ot
    LEFT JOIN employees e ON ot.employee_id = e.id
    WHERE ot.company_id = ?
  `;
  const params: any[] = [companyId];
  
  if (employeeId) {
    query += ` AND ot.employee_id = ?`;
    params.push(employeeId);
  }
  
  query += ` ORDER BY ot.due_date`;
  
  const result = await c.env.DB.prepare(query).bind(...params).all();
  
  return c.json({ onboarding_tasks: result.results || [] });
});

app.post('/onboarding-tasks', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO onboarding_tasks (id, company_id, employee_id, task_name, task_category, description, assigned_to, due_date, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.employee_id, body.task_name, body.task_category, body.description, body.assigned_to, body.due_date, 'pending', body.notes).run();
  
  return c.json({ id, message: 'Onboarding task created successfully' }, 201);
});

// --- Performance Reviews ---
app.get('/performance-reviews', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT pr.*, 
           e.first_name || ' ' || e.last_name as employee_name,
           r.first_name || ' ' || r.last_name as reviewer_name
    FROM performance_reviews pr
    LEFT JOIN employees e ON pr.employee_id = e.id
    LEFT JOIN employees r ON pr.reviewer_id = r.id
    WHERE pr.company_id = ?
    ORDER BY pr.review_period DESC
  `).bind(companyId).all();
  
  return c.json({ performance_reviews: result.results || [] });
});

app.post('/performance-reviews', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO performance_reviews (id, company_id, employee_id, review_period, reviewer_id, review_date, overall_rating, goals_achieved, goals_total, strengths, improvements, comments, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.employee_id, body.review_period, body.reviewer_id, body.review_date, body.overall_rating, body.goals_achieved || 0, body.goals_total || 0, body.strengths, body.improvements, body.comments, 'draft').run();
  
  return c.json({ id, message: 'Performance review created successfully' }, 201);
});

// --- Training Courses ---
app.get('/training-courses', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT * FROM training_courses WHERE company_id = ? ORDER BY course_name
  `).bind(companyId).all();
  
  return c.json({ training_courses: result.results || [] });
});

app.post('/training-courses', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO training_courses (id, company_id, course_code, course_name, category, description, duration_hours, instructor, max_participants, is_mandatory, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.course_code, body.course_name, body.category, body.description, body.duration_hours, body.instructor, body.max_participants, body.is_mandatory ? 1 : 0, 1).run();
  
  return c.json({ id, message: 'Training course created successfully' }, 201);
});

// --- Employee Skills ---
app.get('/employee-skills', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  const employeeId = c.req.query('employee_id');
  
  let query = `
    SELECT es.*, e.first_name || ' ' || e.last_name as employee_name
    FROM employee_skills es
    LEFT JOIN employees e ON es.employee_id = e.id
    WHERE es.company_id = ?
  `;
  const params: any[] = [companyId];
  
  if (employeeId) {
    query += ` AND es.employee_id = ?`;
    params.push(employeeId);
  }
  
  query += ` ORDER BY e.last_name, es.skill_name`;
  
  const result = await c.env.DB.prepare(query).bind(...params).all();
  
  return c.json({ employee_skills: result.results || [] });
});

app.post('/employee-skills', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO employee_skills (id, company_id, employee_id, skill_name, skill_category, proficiency_level, certified, certification_date, certification_expiry, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.employee_id, body.skill_name, body.skill_category, body.proficiency_level || 1, body.certified ? 1 : 0, body.certification_date, body.certification_expiry, body.notes).run();
  
  return c.json({ id, message: 'Employee skill added successfully' }, 201);
});

// ============================================
// SERVICES MODULE
// ============================================

// --- Route Plans ---
app.get('/route-plans', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT rp.*, e.first_name || ' ' || e.last_name as technician_name
    FROM route_plans rp
    LEFT JOIN employees e ON rp.technician_id = e.id
    WHERE rp.company_id = ?
    ORDER BY rp.route_date DESC
  `).bind(companyId).all();
  
  return c.json({ route_plans: result.results || [] });
});

app.get('/route-plans/:id', async (c) => {
  const id = c.req.param('id');
  const route = await c.env.DB.prepare(`SELECT * FROM route_plans WHERE id = ?`).bind(id).first();
  if (!route) return c.json({ error: 'Route plan not found' }, 404);
  
  const stops = await c.env.DB.prepare(`
    SELECT rs.*, c.customer_name
    FROM route_stops rs
    LEFT JOIN customers c ON rs.customer_id = c.id
    WHERE rs.route_id = ?
    ORDER BY rs.stop_order
  `).bind(id).all();
  
  return c.json({ route, stops: stops.results || [] });
});

app.post('/route-plans', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const routeNumber = `RTE-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO route_plans (id, company_id, route_number, route_date, technician_id, vehicle_id, start_location, end_location, total_stops, total_distance, estimated_duration, status, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, routeNumber, body.route_date, body.technician_id, body.vehicle_id, body.start_location, body.end_location, body.total_stops || 0, body.total_distance || 0, body.estimated_duration || 0, 'planned', body.notes, user.sub).run();
  
  return c.json({ id, route_number: routeNumber, message: 'Route plan created successfully' }, 201);
});

// --- Service Contracts ---
app.get('/service-contracts', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT sc.*, c.customer_name
    FROM service_contracts sc
    LEFT JOIN customers c ON sc.customer_id = c.id
    WHERE sc.company_id = ?
    ORDER BY sc.start_date DESC
  `).bind(companyId).all();
  
  return c.json({ service_contracts: result.results || [] });
});

app.post('/service-contracts', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const contractNumber = `SVC-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO service_contracts (id, company_id, contract_number, customer_id, contract_name, contract_type, start_date, end_date, billing_frequency, contract_value, monthly_value, response_time_hours, resolution_time_hours, included_visits, status, auto_renew, renewal_notice_days, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, contractNumber, body.customer_id, body.contract_name, body.contract_type, body.start_date, body.end_date, body.billing_frequency || 'monthly', body.contract_value || 0, body.monthly_value || 0, body.response_time_hours, body.resolution_time_hours, body.included_visits, 'draft', body.auto_renew ? 1 : 0, body.renewal_notice_days || 30, body.notes, user.sub).run();
  
  return c.json({ id, contract_number: contractNumber, message: 'Service contract created successfully' }, 201);
});

// --- Knowledge Base ---
app.get('/knowledge-base', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  const isPublic = c.req.query('public');
  
  let query = `SELECT * FROM knowledge_base_articles WHERE company_id = ?`;
  const params: any[] = [companyId];
  
  if (isPublic === 'true') {
    query += ` AND is_public = 1 AND status = 'published'`;
  }
  
  query += ` ORDER BY title`;
  
  const result = await c.env.DB.prepare(query).bind(...params).all();
  
  return c.json({ articles: result.results || [] });
});

app.post('/knowledge-base', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const articleCode = `KB-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO knowledge_base_articles (id, company_id, article_code, title, category, content, tags, is_public, status, author_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, articleCode, body.title, body.category, body.content, JSON.stringify(body.tags || []), body.is_public ? 1 : 0, 'draft', user.sub).run();
  
  return c.json({ id, article_code: articleCode, message: 'Knowledge base article created successfully' }, 201);
});

// --- Project Milestones ---
app.get('/project-milestones', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  const projectId = c.req.query('project_id');
  
  let query = `
    SELECT pm.*, e.first_name || ' ' || e.last_name as owner_name
    FROM project_milestones pm
    LEFT JOIN employees e ON pm.owner_id = e.id
    WHERE pm.company_id = ?
  `;
  const params: any[] = [companyId];
  
  if (projectId) {
    query += ` AND pm.project_id = ?`;
    params.push(projectId);
  }
  
  query += ` ORDER BY pm.due_date`;
  
  const result = await c.env.DB.prepare(query).bind(...params).all();
  
  return c.json({ milestones: result.results || [] });
});

app.post('/project-milestones', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  const milestoneCode = `MS-${Date.now()}`;
  
  await c.env.DB.prepare(`
    INSERT INTO project_milestones (id, company_id, project_id, milestone_code, milestone_name, description, due_date, budget, deliverables, owner_id, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.project_id, milestoneCode, body.milestone_name, body.description, body.due_date, body.budget || 0, body.deliverables, body.owner_id, 'not_started', body.notes).run();
  
  return c.json({ id, milestone_code: milestoneCode, message: 'Project milestone created successfully' }, 201);
});

// ============================================
// COMPLIANCE MODULE
// ============================================

// --- VAT Returns ---
app.get('/vat-returns', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT * FROM vat_returns WHERE company_id = ? ORDER BY return_period DESC
  `).bind(companyId).all();
  
  return c.json({ vat_returns: result.results || [] });
});

app.post('/vat-returns', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  const netVat = (body.output_vat_standard || 0) - (body.input_vat || 0);
  const amountPayable = netVat > 0 ? netVat : 0;
  const amountRefundable = netVat < 0 ? Math.abs(netVat) : 0;
  
  await c.env.DB.prepare(`
    INSERT INTO vat_returns (id, company_id, return_period, vat_period, output_vat_standard, output_vat_zero_rated, output_vat_exempt, input_vat, net_vat, adjustments, amount_payable, amount_refundable, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.return_period, body.vat_period, body.output_vat_standard || 0, body.output_vat_zero_rated || 0, body.output_vat_exempt || 0, body.input_vat || 0, netVat, body.adjustments || 0, amountPayable, amountRefundable, 'draft', body.notes).run();
  
  return c.json({ id, message: 'VAT return created successfully' }, 201);
});

// --- B-BBEE Scorecards ---
app.get('/bbbee-scorecards', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT * FROM bbbee_scorecards WHERE company_id = ? ORDER BY scorecard_year DESC
  `).bind(companyId).all();
  
  return c.json({ bbbee_scorecards: result.results || [] });
});

app.post('/bbbee-scorecards', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  const overallScore = (body.ownership_score || 0) + (body.management_control_score || 0) + (body.skills_development_score || 0) + (body.enterprise_development_score || 0) + (body.supplier_development_score || 0) + (body.socio_economic_score || 0);
  
  await c.env.DB.prepare(`
    INSERT INTO bbbee_scorecards (id, company_id, scorecard_year, verification_date, certificate_number, certificate_expiry, overall_score, bbbee_level, ownership_score, management_control_score, skills_development_score, enterprise_development_score, supplier_development_score, socio_economic_score, status, verification_agency, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.scorecard_year, body.verification_date, body.certificate_number, body.certificate_expiry, overallScore, body.bbbee_level, body.ownership_score || 0, body.management_control_score || 0, body.skills_development_score || 0, body.enterprise_development_score || 0, body.supplier_development_score || 0, body.socio_economic_score || 0, 'draft', body.verification_agency, body.notes).run();
  
  return c.json({ id, message: 'B-BBEE scorecard created successfully' }, 201);
});

// --- Controlled Documents ---
app.get('/controlled-documents', async (c) => {
  const user = c.get('user');
  const companyId = user?.company_id || c.req.query('company_id');
  
  const result = await c.env.DB.prepare(`
    SELECT cd.*, e.first_name || ' ' || e.last_name as owner_name
    FROM controlled_documents cd
    LEFT JOIN employees e ON cd.owner_id = e.id
    WHERE cd.company_id = ?
    ORDER BY cd.document_number
  `).bind(companyId).all();
  
  return c.json({ controlled_documents: result.results || [] });
});

app.post('/controlled-documents', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const id = generateUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO controlled_documents (id, company_id, document_number, title, category, version, description, content_url, owner_id, effective_date, review_date, status, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.company_id, body.document_number, body.title, body.category, body.version || '1.0', body.description, body.content_url, body.owner_id, body.effective_date, body.review_date, 'draft', body.notes, user.sub).run();
  
  return c.json({ id, message: 'Controlled document created successfully' }, 201);
});

export default app;
