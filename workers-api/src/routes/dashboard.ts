/**
 * ARIA ERP - Dashboard API Routes
 * Phase 3: Dashboard and Reports
 */

import { Hono } from 'hono';
import { getSecureCompanyId } from '../middleware/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT?: string;
}

const dashboard = new Hono<{ Bindings: Env }>();

// Get executive dashboard metrics
dashboard.get('/executive', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);

    // Get revenue metrics
    const revenueResult = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as invoice_count
      FROM customer_invoices 
      WHERE company_id = ? AND status IN ('posted', 'paid', 'partial')
    `).bind(companyId).first<{ total_revenue: number; invoice_count: number }>();

    // Get expenses metrics
    const expensesResult = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_expenses,
        COUNT(*) as invoice_count
      FROM supplier_invoices 
      WHERE company_id = ? AND status IN ('approved', 'paid', 'partial')
    `).bind(companyId).first<{ total_expenses: number; invoice_count: number }>();

    // Get AR balance - include all unpaid invoice statuses
    const arResult = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(balance_due), 0) as ar_balance
      FROM customer_invoices 
      WHERE company_id = ? AND status IN ('posted', 'sent', 'partial', 'overdue') AND balance_due > 0
    `).bind(companyId).first<{ ar_balance: number }>();

    // Get AP balance - include all unpaid invoice statuses
    const apResult = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(balance_due), 0) as ap_balance
      FROM supplier_invoices 
      WHERE company_id = ? AND status IN ('approved', 'pending', 'partial', 'overdue') AND balance_due > 0
    `).bind(companyId).first<{ ap_balance: number }>();

    // Get order counts
    const ordersResult = await c.env.DB.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM sales_orders WHERE company_id = ? AND status = 'pending') as pending_sales_orders,
        (SELECT COUNT(*) FROM purchase_orders WHERE company_id = ? AND status = 'pending') as pending_purchase_orders,
        (SELECT COUNT(*) FROM quotes WHERE company_id = ? AND status = 'sent') as pending_quotes
    `).bind(companyId, companyId, companyId).first<{ pending_sales_orders: number; pending_purchase_orders: number; pending_quotes: number }>();

    // Get customer/supplier counts
    const countsResult = await c.env.DB.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM customers WHERE company_id = ? AND is_active = 1) as active_customers,
        (SELECT COUNT(*) FROM suppliers WHERE company_id = ? AND is_active = 1) as active_suppliers,
        (SELECT COUNT(*) FROM products WHERE company_id = ? AND is_active = 1) as active_products
    `).bind(companyId, companyId, companyId).first<{ active_customers: number; active_suppliers: number; active_products: number }>();

    const revenue = revenueResult?.total_revenue || 0;
    const expenses = expensesResult?.total_expenses || 0;
    const netProfit = revenue - expenses;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    // Get real bot telemetry from bot_runs table (with fallback if table doesn't exist)
    const today = new Date().toISOString().split('T')[0];
    let totalRuns = 0;
    let successfulRuns = 0;
    let invoicesProcessedToday = 0;
    let pendingPayments = 0;

    try {
      const botTelemetry = await c.env.DB.prepare(`
        SELECT 
          COUNT(*) as total_runs,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_runs,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_runs
        FROM bot_runs 
        WHERE company_id = ? AND DATE(executed_at) = ?
      `).bind(companyId, today).first<{ total_runs: number; successful_runs: number; failed_runs: number }>();
      totalRuns = botTelemetry?.total_runs || 0;
      successfulRuns = botTelemetry?.successful_runs || 0;

      const invoiceReconciliation = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM bot_runs 
        WHERE company_id = ? AND bot_id = 'invoice_reconciliation' AND DATE(executed_at) = ?
      `).bind(companyId, today).first<{ count: number }>();
      invoicesProcessedToday = invoiceReconciliation?.count || 0;
    } catch (e) {
      // bot_runs table may not exist - use defaults
      console.log('Bot telemetry query failed, using defaults:', e);
    }

    try {
      const paymentPrediction = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM customer_invoices 
        WHERE company_id = ? AND status IN ('posted', 'sent') AND balance_due > 0
      `).bind(companyId).first<{ count: number }>();
      pendingPayments = paymentPrediction?.count || 0;
    } catch (e) {
      console.log('Payment prediction query failed:', e);
    }

    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 100;

    return c.json({
      financial: {
        revenue: revenue,
        expenses: expenses,
        net_profit: netProfit,
        profit_margin: profitMargin.toFixed(1),
        ar_balance: arResult?.ar_balance || 0,
        ap_balance: apResult?.ap_balance || 0,
        cash_position: (arResult?.ar_balance || 0) - (apResult?.ap_balance || 0),
        is_loss: netProfit < 0,
      },
      orders: {
        pending_sales_orders: ordersResult?.pending_sales_orders || 0,
        pending_purchase_orders: ordersResult?.pending_purchase_orders || 0,
        pending_quotes: ordersResult?.pending_quotes || 0,
      },
      master_data: {
        active_customers: countsResult?.active_customers || 0,
        active_suppliers: countsResult?.active_suppliers || 0,
        active_products: countsResult?.active_products || 0,
      },
      automation: {
        active_agents: 58,
        transactions_today: totalRuns,
        success_rate: parseFloat(successRate.toFixed(1)),
        invoices_processed_today: invoicesProcessedToday,
        pending_payments: pendingPayments,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get sales summary
dashboard.get('/sales-summary', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const period = c.req.query('period') || 'month';

    // Get sales by status
    const salesByStatus = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM sales_orders
      WHERE company_id = ?
      GROUP BY status
    `).bind(companyId).all<{ status: string; count: number; total: number }>();

    // Get top customers
    const topCustomers = await c.env.DB.prepare(`
      SELECT c.customer_name, c.customer_code, 
             COUNT(so.id) as order_count,
             COALESCE(SUM(so.total_amount), 0) as total_value
      FROM customers c
      LEFT JOIN sales_orders so ON c.id = so.customer_id
      WHERE c.company_id = ?
      GROUP BY c.id
      ORDER BY total_value DESC
      LIMIT 5
    `).bind(companyId).all<{ customer_name: string; customer_code: string; order_count: number; total_value: number }>();

    // Get top products
    const topProducts = await c.env.DB.prepare(`
      SELECT p.product_name, p.product_code,
             COALESCE(SUM(soi.quantity), 0) as quantity_sold,
             COALESCE(SUM(soi.line_total), 0) as total_revenue
      FROM products p
      LEFT JOIN sales_order_items soi ON p.id = soi.product_id
      WHERE p.company_id = ?
      GROUP BY p.id
      ORDER BY total_revenue DESC
      LIMIT 5
    `).bind(companyId).all<{ product_name: string; product_code: string; quantity_sold: number; total_revenue: number }>();

    return c.json({
      by_status: salesByStatus.results,
      top_customers: topCustomers.results,
      top_products: topProducts.results,
    });
  } catch (error) {
    console.error('Sales summary error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get purchasing summary
dashboard.get('/purchasing-summary', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);

    // Get PO by status
    const poByStatus = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM purchase_orders
      WHERE company_id = ?
      GROUP BY status
    `).bind(companyId).all<{ status: string; count: number; total: number }>();

    // Get top suppliers
    const topSuppliers = await c.env.DB.prepare(`
      SELECT s.supplier_name, s.supplier_code,
             COUNT(po.id) as order_count,
             COALESCE(SUM(po.total_amount), 0) as total_value
      FROM suppliers s
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      WHERE s.company_id = ?
      GROUP BY s.id
      ORDER BY total_value DESC
      LIMIT 5
    `).bind(companyId).all<{ supplier_name: string; supplier_code: string; order_count: number; total_value: number }>();

    return c.json({
      by_status: poByStatus.results,
      top_suppliers: topSuppliers.results,
    });
  } catch (error) {
    console.error('Purchasing summary error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get AR aging report
dashboard.get('/ar-aging', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);

    const aging = await c.env.DB.prepare(`
      SELECT 
        c.customer_name,
        c.customer_code,
        ci.invoice_number,
        ci.invoice_date,
        ci.due_date,
        ci.total_amount,
        ci.balance_due,
        CAST((julianday('now') - julianday(ci.due_date)) AS INTEGER) as days_overdue
      FROM customer_invoices ci
      JOIN customers c ON ci.customer_id = c.id
      WHERE ci.company_id = ? AND ci.balance_due > 0
      ORDER BY days_overdue DESC
    `).bind(companyId).all();

    // Calculate aging buckets
    let current = 0, days30 = 0, days60 = 0, days90 = 0, over90 = 0;
    
    for (const inv of aging.results as { balance_due: number; days_overdue: number }[]) {
      if (inv.days_overdue <= 0) current += inv.balance_due;
      else if (inv.days_overdue <= 30) days30 += inv.balance_due;
      else if (inv.days_overdue <= 60) days60 += inv.balance_due;
      else if (inv.days_overdue <= 90) days90 += inv.balance_due;
      else over90 += inv.balance_due;
    }

    return c.json({
      summary: {
        current,
        '1-30_days': days30,
        '31-60_days': days60,
        '61-90_days': days90,
        'over_90_days': over90,
        total: current + days30 + days60 + days90 + over90,
      },
      details: aging.results,
    });
  } catch (error) {
    console.error('AR aging error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get AP aging report
dashboard.get('/ap-aging', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);

    const aging = await c.env.DB.prepare(`
      SELECT 
        s.supplier_name,
        s.supplier_code,
        si.invoice_number,
        si.invoice_date,
        si.due_date,
        si.total_amount,
        si.balance_due,
        CAST((julianday('now') - julianday(si.due_date)) AS INTEGER) as days_overdue
      FROM supplier_invoices si
      JOIN suppliers s ON si.supplier_id = s.id
      WHERE si.company_id = ? AND si.balance_due > 0
      ORDER BY days_overdue DESC
    `).bind(companyId).all();

    // Calculate aging buckets
    let current = 0, days30 = 0, days60 = 0, days90 = 0, over90 = 0;
    
    for (const inv of aging.results as { balance_due: number; days_overdue: number }[]) {
      if (inv.days_overdue <= 0) current += inv.balance_due;
      else if (inv.days_overdue <= 30) days30 += inv.balance_due;
      else if (inv.days_overdue <= 60) days60 += inv.balance_due;
      else if (inv.days_overdue <= 90) days90 += inv.balance_due;
      else over90 += inv.balance_due;
    }

    return c.json({
      summary: {
        current,
        '1-30_days': days30,
        '31-60_days': days60,
        '61-90_days': days90,
        'over_90_days': over90,
        total: current + days30 + days60 + days90 + over90,
      },
      details: aging.results,
    });
  } catch (error) {
    console.error('AP aging error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get inventory summary
dashboard.get('/inventory-summary', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);

    // Get inventory value
    const inventoryValue = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(quantity_on_hand * cost_price), 0) as total_value,
        COALESCE(SUM(quantity_on_hand), 0) as total_quantity,
        COUNT(*) as product_count
      FROM products
      WHERE company_id = ? AND is_active = 1 AND is_service = 0
    `).bind(companyId).first<{ total_value: number; total_quantity: number; product_count: number }>();

    // Get low stock items
    const lowStock = await c.env.DB.prepare(`
      SELECT product_code, product_name, quantity_on_hand, reorder_level
      FROM products
      WHERE company_id = ? AND is_active = 1 AND is_service = 0 
            AND quantity_on_hand <= reorder_level AND reorder_level > 0
      ORDER BY (quantity_on_hand / reorder_level)
      LIMIT 10
    `).bind(companyId).all();

    // Get inventory by category
    const byCategory = await c.env.DB.prepare(`
      SELECT 
        COALESCE(category, 'Uncategorized') as category,
        COUNT(*) as product_count,
        COALESCE(SUM(quantity_on_hand * cost_price), 0) as value
      FROM products
      WHERE company_id = ? AND is_active = 1 AND is_service = 0
      GROUP BY category
      ORDER BY value DESC
    `).bind(companyId).all();

    return c.json({
      summary: {
        total_value: inventoryValue?.total_value || 0,
        total_quantity: inventoryValue?.total_quantity || 0,
        product_count: inventoryValue?.product_count || 0,
      },
      low_stock_items: lowStock.results,
      by_category: byCategory.results,
    });
  } catch (error) {
    console.error('Inventory summary error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get pending approvals for dashboard widget
dashboard.get('/pending-approvals', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const approvals: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      link: string;
      created_at: string;
    }> = [];

    // Get draft purchase orders awaiting approval
    const draftPOs = await c.env.DB.prepare(`
      SELECT po.id, po.po_number, po.total_amount, s.supplier_name, po.created_at
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.company_id = ? AND po.status = 'draft'
      ORDER BY po.created_at DESC
      LIMIT 5
    `).bind(companyId).all();

    for (const po of draftPOs.results as any[]) {
      const amount = po.total_amount || 0;
      approvals.push({
        id: po.id,
        type: 'PO',
        title: po.po_number || 'New PO',
        description: `Purchase order for ${po.supplier_name || 'Unknown'} - R ${amount.toLocaleString()}`,
        priority: amount > 50000 ? 'high' : amount > 10000 ? 'medium' : 'low',
        link: '/erp/purchase-orders',
        created_at: po.created_at
      });
    }

    // Get draft sales orders awaiting approval
    const draftSOs = await c.env.DB.prepare(`
      SELECT so.id, so.order_number, so.total_amount, c.customer_name, so.created_at
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE so.company_id = ? AND so.status = 'draft'
      ORDER BY so.created_at DESC
      LIMIT 5
    `).bind(companyId).all();

    for (const so of draftSOs.results as any[]) {
      const amount = so.total_amount || 0;
      approvals.push({
        id: so.id,
        type: 'SO',
        title: so.order_number || 'New SO',
        description: `Sales order for ${so.customer_name || 'Unknown'} - R ${amount.toLocaleString()}`,
        priority: amount > 100000 ? 'high' : amount > 25000 ? 'medium' : 'low',
        link: '/erp/sales-orders',
        created_at: so.created_at
      });
    }

    // Get pending expense claims
    try {
      const pendingExpenses = await c.env.DB.prepare(`
        SELECT id, claim_number, total_amount, description, created_at
        FROM expense_claims
        WHERE company_id = ? AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 5
      `).bind(companyId).all();

      for (const exp of pendingExpenses.results as any[]) {
        const amount = exp.total_amount || 0;
        approvals.push({
          id: exp.id,
          type: 'Expense',
          title: exp.claim_number || 'Expense Claim',
          description: `${exp.description || 'Expense claim'} - R ${amount.toLocaleString()}`,
          priority: amount > 5000 ? 'high' : amount > 1000 ? 'medium' : 'low',
          link: '/financial/expense-claims',
          created_at: exp.created_at
        });
      }
    } catch (e) {
      // expense_claims table may not exist
    }

    // Get pending quotes
    const pendingQuotes = await c.env.DB.prepare(`
      SELECT q.id, q.quote_number, q.total_amount, c.customer_name, q.created_at
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.company_id = ? AND q.status = 'draft'
      ORDER BY q.created_at DESC
      LIMIT 3
    `).bind(companyId).all();

    for (const quote of pendingQuotes.results as any[]) {
      const amount = quote.total_amount || 0;
      approvals.push({
        id: quote.id,
        type: 'Quote',
        title: quote.quote_number || 'New Quote',
        description: `Quote for ${quote.customer_name || 'Unknown'} - R ${amount.toLocaleString()}`,
        priority: amount > 50000 ? 'high' : amount > 10000 ? 'medium' : 'low',
        link: '/quotes',
        created_at: quote.created_at
      });
    }

    // Sort by priority (high first) then by date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    approvals.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return c.json({ approvals: approvals.slice(0, 10) });
  } catch (error) {
    console.error('Pending approvals error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get alerts for dashboard widget
dashboard.get('/alerts', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const alerts: Array<{
      id: string;
      type: string;
      message: string;
      severity: 'critical' | 'warning' | 'info';
      link: string;
    }> = [];

    // Check for overdue customer invoices
    const overdueInvoices = await c.env.DB.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(balance_due), 0) as total
      FROM customer_invoices
      WHERE company_id = ? AND status IN ('posted', 'sent', 'overdue') 
        AND due_date < date('now') AND balance_due > 0
    `).bind(companyId).first<{ count: number; total: number }>();

    if (overdueInvoices && overdueInvoices.count > 0) {
      alerts.push({
        id: 'overdue-invoices',
        type: 'overdue',
        message: `${overdueInvoices.count} invoice${overdueInvoices.count > 1 ? 's are' : ' is'} overdue totaling R ${(overdueInvoices.total || 0).toLocaleString()}`,
        severity: overdueInvoices.count > 5 ? 'critical' : 'warning',
        link: '/ar/invoices?status=overdue'
      });
    }

    // Check for low stock products
    const lowStockProducts = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM products
      WHERE company_id = ? AND is_active = 1 AND is_service = 0 
        AND quantity_on_hand <= reorder_level AND reorder_level > 0
    `).bind(companyId).first<{ count: number }>();

    if (lowStockProducts && lowStockProducts.count > 0) {
      alerts.push({
        id: 'low-stock',
        type: 'low_stock',
        message: `${lowStockProducts.count} product${lowStockProducts.count > 1 ? 's' : ''} below reorder level`,
        severity: lowStockProducts.count > 10 ? 'critical' : 'warning',
        link: '/erp/products?filter=low_stock'
      });
    }

    // Check for unreconciled bank transactions
    try {
      const unreconciledTx = await c.env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM bank_transactions
        WHERE company_id = ? AND is_reconciled = 0
      `).bind(companyId).first<{ count: number }>();

      if (unreconciledTx && unreconciledTx.count > 0) {
        alerts.push({
          id: 'bank-reconciliation',
          type: 'pending',
          message: `${unreconciledTx.count} bank transaction${unreconciledTx.count > 1 ? 's need' : ' needs'} reconciliation`,
          severity: unreconciledTx.count > 20 ? 'warning' : 'info',
          link: '/financial/bank-reconciliation'
        });
      }
    } catch (e) {
      // bank_transactions table may not exist
    }

    // Check for pending supplier invoices due soon
    const dueSoonInvoices = await c.env.DB.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(balance_due), 0) as total
      FROM supplier_invoices
      WHERE company_id = ? AND status IN ('approved', 'pending') 
        AND due_date BETWEEN date('now') AND date('now', '+7 days') AND balance_due > 0
    `).bind(companyId).first<{ count: number; total: number }>();

    if (dueSoonInvoices && dueSoonInvoices.count > 0) {
      alerts.push({
        id: 'due-soon',
        type: 'due_soon',
        message: `${dueSoonInvoices.count} supplier invoice${dueSoonInvoices.count > 1 ? 's' : ''} due within 7 days (R ${(dueSoonInvoices.total || 0).toLocaleString()})`,
        severity: 'info',
        link: '/ap/invoices'
      });
    }

    // Check for failed bot runs today
    try {
      const today = new Date().toISOString().split('T')[0];
      const failedBots = await c.env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM bot_runs
        WHERE company_id = ? AND status = 'failed' AND DATE(executed_at) = ?
      `).bind(companyId, today).first<{ count: number }>();

      if (failedBots && failedBots.count > 0) {
        alerts.push({
          id: 'failed-bots',
          type: 'bot_failure',
          message: `${failedBots.count} automation bot${failedBots.count > 1 ? 's' : ''} failed today`,
          severity: failedBots.count > 3 ? 'critical' : 'warning',
          link: '/automation/bots'
        });
      }
    } catch (e) {
      // bot_runs table may not exist
    }

    // Sort by severity (critical first)
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return c.json({ alerts });
  } catch (error) {
    console.error('Alerts error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ==================== DASHBOARD STATS ====================

dashboard.get('/stats', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const revenue = await c.env.DB.prepare(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM customer_invoices WHERE company_id = ? AND status IN (\'posted\', \'paid\', \'partial\')'
    ).bind(companyId).first<{ total: number }>();
    const expenses = await c.env.DB.prepare(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM supplier_invoices WHERE company_id = ? AND status IN (\'approved\', \'paid\', \'partial\')'
    ).bind(companyId).first<{ total: number }>();
    const customers = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM customers WHERE company_id = ? AND is_active = 1'
    ).bind(companyId).first<{ count: number }>();
    const orders = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM sales_orders WHERE company_id = ?'
    ).bind(companyId).first<{ count: number }>();
    return c.json({
      revenue: revenue?.total || 0,
      expenses: expenses?.total || 0,
      net_profit: (revenue?.total || 0) - (expenses?.total || 0),
      total_customers: customers?.count || 0,
      total_orders: orders?.count || 0
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return c.json({ revenue: 0, expenses: 0, net_profit: 0, total_customers: 0, total_orders: 0 });
  }
});

// ==================== RECENT ACTIVITY ====================

dashboard.get('/recent-activity', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    const activities: Array<{ id: string; type: string; description: string; timestamp: string; user: string }> = [];

    const recentInvoices = await c.env.DB.prepare(
      'SELECT id, invoice_number, total_amount, created_at FROM customer_invoices WHERE company_id = ? ORDER BY created_at DESC LIMIT 5'
    ).bind(companyId).all();
    for (const inv of recentInvoices.results as any[]) {
      activities.push({ id: inv.id, type: 'invoice', description: `Invoice ${inv.invoice_number || 'N/A'} created - R ${(inv.total_amount || 0).toLocaleString()}`, timestamp: inv.created_at, user: 'System' });
    }

    const recentOrders = await c.env.DB.prepare(
      'SELECT id, order_number, total_amount, created_at FROM sales_orders WHERE company_id = ? ORDER BY created_at DESC LIMIT 5'
    ).bind(companyId).all();
    for (const ord of recentOrders.results as any[]) {
      activities.push({ id: ord.id, type: 'sales_order', description: `Sales Order ${ord.order_number || 'N/A'} created - R ${(ord.total_amount || 0).toLocaleString()}`, timestamp: ord.created_at, user: 'System' });
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return c.json({ activities: activities.slice(0, 10) });
  } catch (error) {
    console.error('Recent activity error:', error);
    return c.json({ activities: [] });
  }
});

export default dashboard;
