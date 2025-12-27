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

export default dashboard;
