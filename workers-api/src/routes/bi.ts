/**
 * Business Intelligence & Reporting Routes
 * Comprehensive BI system with metrics registry, query endpoints, and data integrity checks
 */

import { Hono } from 'hono';
import { jwtVerify } from 'jose';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Helper to verify JWT and get auth context
async function getAuthContext(c: any): Promise<{ company_id: string; user_id: string } | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    const secretKey = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return {
      company_id: (payload as any).company_id,
      user_id: (payload as any).sub
    };
  } catch {
    return null;
  }
}

// ==================== METRICS REGISTRY ====================
// Define all available metrics with their SQL fragments and allowed dimensions

const METRICS_REGISTRY: Record<string, {
  name: string;
  description: string;
  sql: string;
  table: string;
  aggregation: 'sum' | 'count' | 'avg';
  dimensions: string[];
  category: string;
}> = {
  // Revenue metrics
  total_revenue: {
    name: 'Total Revenue',
    description: 'Sum of all customer invoice amounts',
    sql: 'COALESCE(SUM(total_amount), 0)',
    table: 'customer_invoices',
    aggregation: 'sum',
    dimensions: ['customer_id', 'invoice_date', 'status'],
    category: 'financial'
  },
  invoice_count: {
    name: 'Invoice Count',
    description: 'Number of customer invoices',
    sql: 'COUNT(*)',
    table: 'customer_invoices',
    aggregation: 'count',
    dimensions: ['customer_id', 'invoice_date', 'status'],
    category: 'financial'
  },
  avg_invoice_value: {
    name: 'Average Invoice Value',
    description: 'Average customer invoice amount',
    sql: 'COALESCE(AVG(total_amount), 0)',
    table: 'customer_invoices',
    aggregation: 'avg',
    dimensions: ['customer_id', 'invoice_date', 'status'],
    category: 'financial'
  },
  
  // AR metrics
  ar_outstanding: {
    name: 'AR Outstanding',
    description: 'Total outstanding accounts receivable',
    sql: 'COALESCE(SUM(CASE WHEN status IN (\'sent\', \'overdue\') THEN total_amount - COALESCE(amount_paid, 0) ELSE 0 END), 0)',
    table: 'customer_invoices',
    aggregation: 'sum',
    dimensions: ['customer_id', 'due_date', 'status'],
    category: 'financial'
  },
  ar_overdue: {
    name: 'AR Overdue',
    description: 'Total overdue accounts receivable',
    sql: 'COALESCE(SUM(CASE WHEN status = \'overdue\' THEN total_amount - COALESCE(amount_paid, 0) ELSE 0 END), 0)',
    table: 'customer_invoices',
    aggregation: 'sum',
    dimensions: ['customer_id', 'due_date'],
    category: 'financial'
  },
  
  // AP metrics
  ap_outstanding: {
    name: 'AP Outstanding',
    description: 'Total outstanding accounts payable',
    sql: 'COALESCE(SUM(CASE WHEN status IN (\'pending\', \'approved\') THEN total_amount - COALESCE(amount_paid, 0) ELSE 0 END), 0)',
    table: 'supplier_invoices',
    aggregation: 'sum',
    dimensions: ['supplier_id', 'due_date', 'status'],
    category: 'financial'
  },
  total_purchases: {
    name: 'Total Purchases',
    description: 'Sum of all supplier invoice amounts',
    sql: 'COALESCE(SUM(total_amount), 0)',
    table: 'supplier_invoices',
    aggregation: 'sum',
    dimensions: ['supplier_id', 'invoice_date', 'status'],
    category: 'financial'
  },
  
  // Sales metrics
  sales_order_count: {
    name: 'Sales Order Count',
    description: 'Number of sales orders',
    sql: 'COUNT(*)',
    table: 'sales_orders',
    aggregation: 'count',
    dimensions: ['customer_id', 'order_date', 'status'],
    category: 'sales'
  },
  sales_order_value: {
    name: 'Sales Order Value',
    description: 'Total value of sales orders',
    sql: 'COALESCE(SUM(total_amount), 0)',
    table: 'sales_orders',
    aggregation: 'sum',
    dimensions: ['customer_id', 'order_date', 'status'],
    category: 'sales'
  },
  quote_count: {
    name: 'Quote Count',
    description: 'Number of quotes',
    sql: 'COUNT(*)',
    table: 'quotes',
    aggregation: 'count',
    dimensions: ['customer_id', 'quote_date', 'status'],
    category: 'sales'
  },
  quote_conversion_rate: {
    name: 'Quote Conversion Rate',
    description: 'Percentage of quotes converted to orders',
    sql: 'COALESCE(AVG(CASE WHEN status = \'converted\' THEN 100.0 ELSE 0 END), 0)',
    table: 'quotes',
    aggregation: 'avg',
    dimensions: ['customer_id', 'quote_date'],
    category: 'sales'
  },
  
  // Procurement metrics
  po_count: {
    name: 'Purchase Order Count',
    description: 'Number of purchase orders',
    sql: 'COUNT(*)',
    table: 'purchase_orders',
    aggregation: 'count',
    dimensions: ['supplier_id', 'order_date', 'status'],
    category: 'procurement'
  },
  po_value: {
    name: 'Purchase Order Value',
    description: 'Total value of purchase orders',
    sql: 'COALESCE(SUM(total_amount), 0)',
    table: 'purchase_orders',
    aggregation: 'sum',
    dimensions: ['supplier_id', 'order_date', 'status'],
    category: 'procurement'
  },
  
  // Inventory metrics
  product_count: {
    name: 'Product Count',
    description: 'Number of active products',
    sql: 'COUNT(*)',
    table: 'products',
    aggregation: 'count',
    dimensions: ['category', 'is_active'],
    category: 'inventory'
  },
  total_inventory_value: {
    name: 'Total Inventory Value',
    description: 'Total value of inventory on hand',
    sql: 'COALESCE(SUM(quantity_on_hand * unit_price), 0)',
    table: 'products',
    aggregation: 'sum',
    dimensions: ['category'],
    category: 'inventory'
  },
  
  // Customer metrics
  customer_count: {
    name: 'Customer Count',
    description: 'Number of active customers',
    sql: 'COUNT(*)',
    table: 'customers',
    aggregation: 'count',
    dimensions: ['is_active', 'created_at'],
    category: 'master_data'
  },
  
  // Supplier metrics
  supplier_count: {
    name: 'Supplier Count',
    description: 'Number of active suppliers',
    sql: 'COUNT(*)',
    table: 'suppliers',
    aggregation: 'count',
    dimensions: ['is_active', 'created_at'],
    category: 'master_data'
  },
  
  // Bot metrics
  bot_execution_count: {
    name: 'Bot Execution Count',
    description: 'Number of bot executions',
    sql: 'COUNT(*)',
    table: 'bot_runs',
    aggregation: 'count',
    dimensions: ['bot_id', 'status', 'started_at'],
    category: 'automation'
  },
  bot_success_rate: {
    name: 'Bot Success Rate',
    description: 'Percentage of successful bot executions',
    sql: 'COALESCE(AVG(CASE WHEN status = \'completed\' THEN 100.0 ELSE 0 END), 0)',
    table: 'bot_runs',
    aggregation: 'avg',
    dimensions: ['bot_id', 'started_at'],
    category: 'automation'
  },
  
  // GL metrics
  gl_balance: {
    name: 'GL Balance',
    description: 'General ledger account balance',
    sql: 'COALESCE(SUM(debit_amount) - SUM(credit_amount), 0)',
    table: 'journal_entry_lines',
    aggregation: 'sum',
    dimensions: ['account_id'],
    category: 'accounting'
  }
};

// ==================== GET METRICS REGISTRY ====================

app.get('/metrics', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) return c.json({ error: 'Authentication required' }, 401);

  const category = c.req.query('category');
  
  let metrics = Object.entries(METRICS_REGISTRY).map(([key, value]) => ({
    id: key,
    ...value
  }));
  
  if (category) {
    metrics = metrics.filter(m => m.category === category);
  }
  
  const categories = [...new Set(Object.values(METRICS_REGISTRY).map(m => m.category))];
  
  return c.json({
    metrics,
    categories,
    total: metrics.length
  });
});

// ==================== QUERY METRICS ====================

app.post('/query', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) return c.json({ error: 'Authentication required' }, 401);

  try {
    const body = await c.req.json();
    const { metric, dimensions, filters, date_range, granularity } = body;
    
    // Validate metric exists
    const metricDef = METRICS_REGISTRY[metric];
    if (!metricDef) {
      return c.json({ error: `Unknown metric: ${metric}` }, 400);
    }
    
    // Validate dimensions are allowed
    if (dimensions) {
      for (const dim of dimensions) {
        if (!metricDef.dimensions.includes(dim)) {
          return c.json({ error: `Dimension '${dim}' not allowed for metric '${metric}'` }, 400);
        }
      }
    }
    
    // Build query
    let selectParts = [metricDef.sql + ' as value'];
    let groupByParts: string[] = [];
    
    if (dimensions && dimensions.length > 0) {
      selectParts = [...dimensions, ...selectParts];
      groupByParts = dimensions;
    }
    
    // Add date grouping if granularity specified
    if (granularity && date_range) {
      const dateColumn = metricDef.dimensions.find(d => d.includes('date') || d.includes('_at')) || 'created_at';
      let dateFormat = '';
      switch (granularity) {
        case 'day':
          dateFormat = `date(${dateColumn})`;
          break;
        case 'week':
          dateFormat = `strftime('%Y-W%W', ${dateColumn})`;
          break;
        case 'month':
          dateFormat = `strftime('%Y-%m', ${dateColumn})`;
          break;
        case 'quarter':
          dateFormat = `strftime('%Y-Q', ${dateColumn}) || ((cast(strftime('%m', ${dateColumn}) as integer) + 2) / 3)`;
          break;
        case 'year':
          dateFormat = `strftime('%Y', ${dateColumn})`;
          break;
        default:
          dateFormat = `date(${dateColumn})`;
      }
      selectParts.unshift(`${dateFormat} as period`);
      groupByParts.unshift('period');
    }
    
    // Build WHERE clause
    let whereClauses = ['company_id = ?'];
    let params: any[] = [auth.company_id];
    
    if (date_range) {
      const dateColumn = metricDef.dimensions.find(d => d.includes('date') || d.includes('_at')) || 'created_at';
      if (date_range.start) {
        whereClauses.push(`${dateColumn} >= ?`);
        params.push(date_range.start);
      }
      if (date_range.end) {
        whereClauses.push(`${dateColumn} <= ?`);
        params.push(date_range.end);
      }
    }
    
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (metricDef.dimensions.includes(key)) {
          whereClauses.push(`${key} = ?`);
          params.push(value);
        }
      }
    }
    
    // Construct final query
    let sql = `SELECT ${selectParts.join(', ')} FROM ${metricDef.table} WHERE ${whereClauses.join(' AND ')}`;
    
    if (groupByParts.length > 0) {
      sql += ` GROUP BY ${groupByParts.join(', ')}`;
    }
    
    sql += ' ORDER BY value DESC LIMIT 1000';
    
    const result = await c.env.DB.prepare(sql).bind(...params).all();
    
    return c.json({
      metric: metric,
      metric_name: metricDef.name,
      dimensions: dimensions || [],
      granularity: granularity || null,
      date_range: date_range || null,
      data: result.results || [],
      query_time: new Date().toISOString()
    });
  } catch (error) {
    console.error('BI query error:', error);
    return c.json({ error: 'Failed to execute query' }, 500);
  }
});

// ==================== EXECUTIVE DASHBOARD ====================

app.get('/dashboard/executive', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) return c.json({ error: 'Authentication required' }, 401);

  try {
    const db = c.env.DB;
    const companyId = auth.company_id;
    const today = new Date().toISOString().split('T')[0];
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    // Execute all queries in parallel
    const [
      revenueYTD,
      revenueMonth,
      arOutstanding,
      arOverdue,
      apOutstanding,
      customerCount,
      supplierCount,
      productCount,
      salesOrdersMonth,
      purchaseOrdersMonth,
      invoicesMonth,
      topCustomers,
      topProducts
    ] = await Promise.all([
      // Revenue YTD
      db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as value 
        FROM customer_invoices 
        WHERE company_id = ? AND status = 'paid' AND invoice_date >= ?
      `).bind(companyId, yearStart).first(),
      
      // Revenue this month
      db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as value 
        FROM customer_invoices 
        WHERE company_id = ? AND status = 'paid' AND invoice_date >= ?
      `).bind(companyId, monthStart).first(),
      
      // AR Outstanding
      db.prepare(`
        SELECT COALESCE(SUM(total_amount - COALESCE(amount_paid, 0)), 0) as value 
        FROM customer_invoices 
        WHERE company_id = ? AND status IN ('sent', 'overdue')
      `).bind(companyId).first(),
      
      // AR Overdue
      db.prepare(`
        SELECT COALESCE(SUM(total_amount - COALESCE(amount_paid, 0)), 0) as value 
        FROM customer_invoices 
        WHERE company_id = ? AND status = 'overdue'
      `).bind(companyId).first(),
      
      // AP Outstanding
      db.prepare(`
        SELECT COALESCE(SUM(total_amount - COALESCE(amount_paid, 0)), 0) as value 
        FROM supplier_invoices 
        WHERE company_id = ? AND status IN ('pending', 'approved')
      `).bind(companyId).first(),
      
      // Customer count
      db.prepare(`
        SELECT COUNT(*) as value FROM customers WHERE company_id = ? AND is_active = 1
      `).bind(companyId).first(),
      
      // Supplier count
      db.prepare(`
        SELECT COUNT(*) as value FROM suppliers WHERE company_id = ? AND is_active = 1
      `).bind(companyId).first(),
      
      // Product count
      db.prepare(`
        SELECT COUNT(*) as value FROM products WHERE company_id = ? AND is_active = 1
      `).bind(companyId).first(),
      
      // Sales orders this month
      db.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as value 
        FROM sales_orders 
        WHERE company_id = ? AND order_date >= ?
      `).bind(companyId, monthStart).first(),
      
      // Purchase orders this month
      db.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as value 
        FROM purchase_orders 
        WHERE company_id = ? AND order_date >= ?
      `).bind(companyId, monthStart).first(),
      
      // Invoices this month
      db.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as value 
        FROM customer_invoices 
        WHERE company_id = ? AND invoice_date >= ?
      `).bind(companyId, monthStart).first(),
      
      // Top 5 customers by revenue
      db.prepare(`
        SELECT c.name, COALESCE(SUM(ci.total_amount), 0) as revenue
        FROM customers c
        LEFT JOIN customer_invoices ci ON ci.customer_id = c.id AND ci.status = 'paid'
        WHERE c.company_id = ?
        GROUP BY c.id, c.name
        ORDER BY revenue DESC
        LIMIT 5
      `).bind(companyId).all(),
      
      // Top 5 products by sales
      db.prepare(`
        SELECT p.name, COALESCE(SUM(soi.quantity * soi.unit_price), 0) as sales
        FROM products p
        LEFT JOIN sales_order_items soi ON soi.product_id = p.id
        LEFT JOIN sales_orders so ON so.id = soi.sales_order_id AND so.status IN ('confirmed', 'shipped', 'delivered')
        WHERE p.company_id = ?
        GROUP BY p.id, p.name
        ORDER BY sales DESC
        LIMIT 5
      `).bind(companyId).all()
    ]);
    
    return c.json({
      summary: {
        revenue_ytd: Number((revenueYTD as any)?.value) || 0,
        revenue_month: Number((revenueMonth as any)?.value) || 0,
        ar_outstanding: Number((arOutstanding as any)?.value) || 0,
        ar_overdue: Number((arOverdue as any)?.value) || 0,
        ap_outstanding: Number((apOutstanding as any)?.value) || 0,
        net_position: (Number((arOutstanding as any)?.value) || 0) - (Number((apOutstanding as any)?.value) || 0)
      },
      counts: {
        customers: Number((customerCount as any)?.value) || 0,
        suppliers: Number((supplierCount as any)?.value) || 0,
        products: Number((productCount as any)?.value) || 0
      },
      activity_this_month: {
        sales_orders: {
          count: Number((salesOrdersMonth as any)?.count) || 0,
          value: Number((salesOrdersMonth as any)?.value) || 0
        },
        purchase_orders: {
          count: Number((purchaseOrdersMonth as any)?.count) || 0,
          value: Number((purchaseOrdersMonth as any)?.value) || 0
        },
        invoices: {
          count: Number((invoicesMonth as any)?.count) || 0,
          value: Number((invoicesMonth as any)?.value) || 0
        }
      },
      top_customers: topCustomers.results || [],
      top_products: topProducts.results || [],
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Executive dashboard error:', error);
    return c.json({ error: 'Failed to generate dashboard' }, 500);
  }
});

// ==================== FINANCIAL REPORTS ====================

app.get('/reports/profit-loss', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) return c.json({ error: 'Authentication required' }, 401);

  try {
    const db = c.env.DB;
    const companyId = auth.company_id;
    const startDate = c.req.query('start_date') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = c.req.query('end_date') || new Date().toISOString().split('T')[0];
    
    // Get revenue from posted journal entries
    const revenueResult = await db.prepare(`
      SELECT 
        ga.account_code,
        ga.account_name,
        ga.account_category,
        COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) as balance
      FROM gl_accounts ga
      LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
        AND je.status = 'posted' 
        AND je.entry_date BETWEEN ? AND ?
      WHERE ga.company_id = ? AND ga.account_type = 'revenue' AND ga.is_active = 1
      GROUP BY ga.id, ga.account_code, ga.account_name, ga.account_category
      ORDER BY ga.account_code
    `).bind(startDate, endDate, companyId).all();
    
    // Get COGS
    const cogsResult = await db.prepare(`
      SELECT 
        ga.account_code,
        ga.account_name,
        ga.account_category,
        COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) as balance
      FROM gl_accounts ga
      LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
        AND je.status = 'posted' 
        AND je.entry_date BETWEEN ? AND ?
      WHERE ga.company_id = ? AND ga.account_type = 'expense' AND ga.account_category = 'cost_of_sales' AND ga.is_active = 1
      GROUP BY ga.id, ga.account_code, ga.account_name, ga.account_category
      ORDER BY ga.account_code
    `).bind(startDate, endDate, companyId).all();
    
    // Get operating expenses
    const expenseResult = await db.prepare(`
      SELECT 
        ga.account_code,
        ga.account_name,
        ga.account_category,
        COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) as balance
      FROM gl_accounts ga
      LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
        AND je.status = 'posted' 
        AND je.entry_date BETWEEN ? AND ?
      WHERE ga.company_id = ? AND ga.account_type = 'expense' AND (ga.account_category IS NULL OR ga.account_category != 'cost_of_sales') AND ga.is_active = 1
      GROUP BY ga.id, ga.account_code, ga.account_name, ga.account_category
      ORDER BY ga.account_code
    `).bind(startDate, endDate, companyId).all();
    
    const totalRevenue = (revenueResult.results || []).reduce((sum: number, acc: any) => sum + (Number(acc.balance) || 0), 0);
    const totalCOGS = (cogsResult.results || []).reduce((sum: number, acc: any) => sum + (Number(acc.balance) || 0), 0);
    const totalExpenses = (expenseResult.results || []).reduce((sum: number, acc: any) => sum + (Number(acc.balance) || 0), 0);
    const grossProfit = totalRevenue - totalCOGS;
    const netIncome = grossProfit - totalExpenses;
    
    return c.json({
      period: { start_date: startDate, end_date: endDate },
      revenue: {
        accounts: revenueResult.results || [],
        total: totalRevenue
      },
      cost_of_sales: {
        accounts: cogsResult.results || [],
        total: totalCOGS
      },
      gross_profit: grossProfit,
      gross_margin: totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(2) : 0,
      operating_expenses: {
        accounts: expenseResult.results || [],
        total: totalExpenses
      },
      net_income: netIncome,
      net_margin: totalRevenue > 0 ? (netIncome / totalRevenue * 100).toFixed(2) : 0,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('P&L report error:', error);
    return c.json({ error: 'Failed to generate P&L report' }, 500);
  }
});

app.get('/reports/balance-sheet', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) return c.json({ error: 'Authentication required' }, 401);

  try {
    const db = c.env.DB;
    const companyId = auth.company_id;
    const asOfDate = c.req.query('as_of_date') || new Date().toISOString().split('T')[0];
    
    // Get assets
    const assetResult = await db.prepare(`
      SELECT 
        ga.account_code,
        ga.account_name,
        ga.account_category,
        COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) as balance
      FROM gl_accounts ga
      LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
        AND je.status = 'posted' 
        AND je.entry_date <= ?
      WHERE ga.company_id = ? AND ga.account_type = 'asset' AND ga.is_active = 1
      GROUP BY ga.id, ga.account_code, ga.account_name, ga.account_category
      HAVING balance != 0
      ORDER BY ga.account_code
    `).bind(asOfDate, companyId).all();
    
    // Get liabilities
    const liabilityResult = await db.prepare(`
      SELECT 
        ga.account_code,
        ga.account_name,
        ga.account_category,
        COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) as balance
      FROM gl_accounts ga
      LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
        AND je.status = 'posted' 
        AND je.entry_date <= ?
      WHERE ga.company_id = ? AND ga.account_type = 'liability' AND ga.is_active = 1
      GROUP BY ga.id, ga.account_code, ga.account_name, ga.account_category
      HAVING balance != 0
      ORDER BY ga.account_code
    `).bind(asOfDate, companyId).all();
    
    // Get equity
    const equityResult = await db.prepare(`
      SELECT 
        ga.account_code,
        ga.account_name,
        ga.account_category,
        COALESCE(SUM(jel.credit_amount) - SUM(jel.debit_amount), 0) as balance
      FROM gl_accounts ga
      LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
        AND je.status = 'posted' 
        AND je.entry_date <= ?
      WHERE ga.company_id = ? AND ga.account_type = 'equity' AND ga.is_active = 1
      GROUP BY ga.id, ga.account_code, ga.account_name, ga.account_category
      HAVING balance != 0
      ORDER BY ga.account_code
    `).bind(asOfDate, companyId).all();
    
    // Group assets by category
    const currentAssets = (assetResult.results || []).filter((a: any) => 
      ['cash', 'bank', 'accounts_receivable', 'inventory', 'prepaid'].includes(a.account_category || '')
    );
    const nonCurrentAssets = (assetResult.results || []).filter((a: any) => 
      !['cash', 'bank', 'accounts_receivable', 'inventory', 'prepaid'].includes(a.account_category || '')
    );
    
    // Group liabilities by category
    const currentLiabilities = (liabilityResult.results || []).filter((a: any) => 
      ['accounts_payable', 'accrued', 'short_term_debt', 'tax_payable'].includes(a.account_category || '')
    );
    const nonCurrentLiabilities = (liabilityResult.results || []).filter((a: any) => 
      !['accounts_payable', 'accrued', 'short_term_debt', 'tax_payable'].includes(a.account_category || '')
    );
    
    const totalCurrentAssets = currentAssets.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
    const totalNonCurrentAssets = nonCurrentAssets.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;
    
    const totalCurrentLiabilities = currentLiabilities.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
    const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
    const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;
    
    const totalEquity = (equityResult.results || []).reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
    
    return c.json({
      as_of_date: asOfDate,
      assets: {
        current: {
          accounts: currentAssets,
          total: totalCurrentAssets
        },
        non_current: {
          accounts: nonCurrentAssets,
          total: totalNonCurrentAssets
        },
        total: totalAssets
      },
      liabilities: {
        current: {
          accounts: currentLiabilities,
          total: totalCurrentLiabilities
        },
        non_current: {
          accounts: nonCurrentLiabilities,
          total: totalNonCurrentLiabilities
        },
        total: totalLiabilities
      },
      equity: {
        accounts: equityResult.results || [],
        total: totalEquity
      },
      total_liabilities_and_equity: totalLiabilities + totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      working_capital: totalCurrentAssets - totalCurrentLiabilities,
      current_ratio: totalCurrentLiabilities > 0 ? (totalCurrentAssets / totalCurrentLiabilities).toFixed(2) : 'N/A',
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Balance sheet error:', error);
    return c.json({ error: 'Failed to generate balance sheet' }, 500);
  }
});

app.get('/reports/cash-flow', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) return c.json({ error: 'Authentication required' }, 401);

  try {
    const db = c.env.DB;
    const companyId = auth.company_id;
    const startDate = c.req.query('start_date') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = c.req.query('end_date') || new Date().toISOString().split('T')[0];
    
    // Cash from operations - customer receipts
    const customerReceipts = await db.prepare(`
      SELECT COALESCE(SUM(amount_paid), 0) as value
      FROM customer_invoices
      WHERE company_id = ? AND payment_date BETWEEN ? AND ?
    `).bind(companyId, startDate, endDate).first();
    
    // Cash from operations - supplier payments
    const supplierPayments = await db.prepare(`
      SELECT COALESCE(SUM(amount_paid), 0) as value
      FROM supplier_invoices
      WHERE company_id = ? AND payment_date BETWEEN ? AND ?
    `).bind(companyId, startDate, endDate).first();
    
    // Get opening and closing cash balances from GL
    const openingCash = await db.prepare(`
      SELECT COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) as value
      FROM gl_accounts ga
      LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted' AND je.entry_date < ?
      WHERE ga.company_id = ? AND ga.account_category IN ('cash', 'bank')
    `).bind(startDate, companyId).first();
    
    const closingCash = await db.prepare(`
      SELECT COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) as value
      FROM gl_accounts ga
      LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted' AND je.entry_date <= ?
      WHERE ga.company_id = ? AND ga.account_category IN ('cash', 'bank')
    `).bind(endDate, companyId).first();
    
    const receipts = Number((customerReceipts as any)?.value) || 0;
    const payments = Number((supplierPayments as any)?.value) || 0;
    const operatingCashFlow = receipts - payments;
    
    return c.json({
      period: { start_date: startDate, end_date: endDate },
      operating_activities: {
        customer_receipts: receipts,
        supplier_payments: payments,
        net_operating: operatingCashFlow
      },
      investing_activities: {
        capital_expenditure: 0,
        asset_sales: 0,
        net_investing: 0
      },
      financing_activities: {
        debt_proceeds: 0,
        debt_repayments: 0,
        dividends: 0,
        net_financing: 0
      },
      net_change_in_cash: operatingCashFlow,
      opening_cash: Number((openingCash as any)?.value) || 0,
      closing_cash: Number((closingCash as any)?.value) || 0,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cash flow error:', error);
    return c.json({ error: 'Failed to generate cash flow statement' }, 500);
  }
});

// ==================== AR/AP AGING ====================

app.get('/reports/ar-aging', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) return c.json({ error: 'Authentication required' }, 401);

  try {
    const db = c.env.DB;
    const companyId = auth.company_id;
    const asOfDate = c.req.query('as_of_date') || new Date().toISOString().split('T')[0];
    
    const result = await db.prepare(`
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        ci.invoice_number,
        ci.invoice_date,
        ci.due_date,
        ci.total_amount,
        COALESCE(ci.amount_paid, 0) as amount_paid,
        ci.total_amount - COALESCE(ci.amount_paid, 0) as outstanding,
        julianday(?) - julianday(ci.due_date) as days_overdue
      FROM customer_invoices ci
      JOIN customers c ON c.id = ci.customer_id
      WHERE ci.company_id = ? 
        AND ci.status IN ('sent', 'overdue')
        AND ci.total_amount > COALESCE(ci.amount_paid, 0)
      ORDER BY days_overdue DESC
    `).bind(asOfDate, companyId).all();
    
    const invoices = result.results || [];
    
    // Bucket the aging
    const buckets = {
      current: invoices.filter((i: any) => i.days_overdue <= 0),
      days_1_30: invoices.filter((i: any) => i.days_overdue > 0 && i.days_overdue <= 30),
      days_31_60: invoices.filter((i: any) => i.days_overdue > 30 && i.days_overdue <= 60),
      days_61_90: invoices.filter((i: any) => i.days_overdue > 60 && i.days_overdue <= 90),
      over_90: invoices.filter((i: any) => i.days_overdue > 90)
    };
    
    const totals = {
      current: buckets.current.reduce((sum: number, i: any) => sum + Number(i.outstanding), 0),
      days_1_30: buckets.days_1_30.reduce((sum: number, i: any) => sum + Number(i.outstanding), 0),
      days_31_60: buckets.days_31_60.reduce((sum: number, i: any) => sum + Number(i.outstanding), 0),
      days_61_90: buckets.days_61_90.reduce((sum: number, i: any) => sum + Number(i.outstanding), 0),
      over_90: buckets.over_90.reduce((sum: number, i: any) => sum + Number(i.outstanding), 0)
    };
    
    return c.json({
      as_of_date: asOfDate,
      buckets,
      totals,
      grand_total: Object.values(totals).reduce((a, b) => a + b, 0),
      invoice_count: invoices.length,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('AR aging error:', error);
    return c.json({ error: 'Failed to generate AR aging report' }, 500);
  }
});

app.get('/reports/ap-aging', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) return c.json({ error: 'Authentication required' }, 401);

  try {
    const db = c.env.DB;
    const companyId = auth.company_id;
    const asOfDate = c.req.query('as_of_date') || new Date().toISOString().split('T')[0];
    
    const result = await db.prepare(`
      SELECT 
        s.id as supplier_id,
        s.name as supplier_name,
        si.invoice_number,
        si.invoice_date,
        si.due_date,
        si.total_amount,
        COALESCE(si.amount_paid, 0) as amount_paid,
        si.total_amount - COALESCE(si.amount_paid, 0) as outstanding,
        julianday(?) - julianday(si.due_date) as days_overdue
      FROM supplier_invoices si
      JOIN suppliers s ON s.id = si.supplier_id
      WHERE si.company_id = ? 
        AND si.status IN ('pending', 'approved')
        AND si.total_amount > COALESCE(si.amount_paid, 0)
      ORDER BY days_overdue DESC
    `).bind(asOfDate, companyId).all();
    
    const invoices = result.results || [];
    
    const buckets = {
      current: invoices.filter((i: any) => i.days_overdue <= 0),
      days_1_30: invoices.filter((i: any) => i.days_overdue > 0 && i.days_overdue <= 30),
      days_31_60: invoices.filter((i: any) => i.days_overdue > 30 && i.days_overdue <= 60),
      days_61_90: invoices.filter((i: any) => i.days_overdue > 60 && i.days_overdue <= 90),
      over_90: invoices.filter((i: any) => i.days_overdue > 90)
    };
    
    const totals = {
      current: buckets.current.reduce((sum: number, i: any) => sum + Number(i.outstanding), 0),
      days_1_30: buckets.days_1_30.reduce((sum: number, i: any) => sum + Number(i.outstanding), 0),
      days_31_60: buckets.days_31_60.reduce((sum: number, i: any) => sum + Number(i.outstanding), 0),
      days_61_90: buckets.days_61_90.reduce((sum: number, i: any) => sum + Number(i.outstanding), 0),
      over_90: buckets.over_90.reduce((sum: number, i: any) => sum + Number(i.outstanding), 0)
    };
    
    return c.json({
      as_of_date: asOfDate,
      buckets,
      totals,
      grand_total: Object.values(totals).reduce((a, b) => a + b, 0),
      invoice_count: invoices.length,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('AP aging error:', error);
    return c.json({ error: 'Failed to generate AP aging report' }, 500);
  }
});

// ==================== SALES ANALYTICS ====================

app.get('/reports/sales-analytics', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) return c.json({ error: 'Authentication required' }, 401);

  try {
    const db = c.env.DB;
    const companyId = auth.company_id;
    const startDate = c.req.query('start_date') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = c.req.query('end_date') || new Date().toISOString().split('T')[0];
    
    // Sales by month
    const salesByMonth = await db.prepare(`
      SELECT 
        strftime('%Y-%m', invoice_date) as month,
        COUNT(*) as invoice_count,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM customer_invoices
      WHERE company_id = ? AND invoice_date BETWEEN ? AND ?
      GROUP BY month
      ORDER BY month
    `).bind(companyId, startDate, endDate).all();
    
    // Sales by customer
    const salesByCustomer = await db.prepare(`
      SELECT 
        c.name as customer_name,
        COUNT(ci.id) as invoice_count,
        COALESCE(SUM(ci.total_amount), 0) as revenue
      FROM customers c
      LEFT JOIN customer_invoices ci ON ci.customer_id = c.id AND ci.invoice_date BETWEEN ? AND ?
      WHERE c.company_id = ?
      GROUP BY c.id, c.name
      HAVING revenue > 0
      ORDER BY revenue DESC
      LIMIT 10
    `).bind(startDate, endDate, companyId).all();
    
    // Sales by product
    const salesByProduct = await db.prepare(`
      SELECT 
        p.name as product_name,
        COALESCE(SUM(soi.quantity), 0) as quantity_sold,
        COALESCE(SUM(soi.quantity * soi.unit_price), 0) as revenue
      FROM products p
      LEFT JOIN sales_order_items soi ON soi.product_id = p.id
      LEFT JOIN sales_orders so ON so.id = soi.sales_order_id AND so.order_date BETWEEN ? AND ?
      WHERE p.company_id = ?
      GROUP BY p.id, p.name
      HAVING revenue > 0
      ORDER BY revenue DESC
      LIMIT 10
    `).bind(startDate, endDate, companyId).all();
    
    // Quote to order conversion
    const quoteConversion = await db.prepare(`
      SELECT 
        COUNT(*) as total_quotes,
        SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted_quotes,
        COALESCE(SUM(total_amount), 0) as total_quote_value,
        COALESCE(SUM(CASE WHEN status = 'converted' THEN total_amount ELSE 0 END), 0) as converted_value
      FROM quotes
      WHERE company_id = ? AND quote_date BETWEEN ? AND ?
    `).bind(companyId, startDate, endDate).first();
    
    const totalQuotes = Number((quoteConversion as any)?.total_quotes) || 0;
    const convertedQuotes = Number((quoteConversion as any)?.converted_quotes) || 0;
    
    return c.json({
      period: { start_date: startDate, end_date: endDate },
      sales_by_month: salesByMonth.results || [],
      sales_by_customer: salesByCustomer.results || [],
      sales_by_product: salesByProduct.results || [],
      quote_conversion: {
        total_quotes: totalQuotes,
        converted_quotes: convertedQuotes,
        conversion_rate: totalQuotes > 0 ? ((convertedQuotes / totalQuotes) * 100).toFixed(2) : 0,
        total_quote_value: Number((quoteConversion as any)?.total_quote_value) || 0,
        converted_value: Number((quoteConversion as any)?.converted_value) || 0
      },
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sales analytics error:', error);
    return c.json({ error: 'Failed to generate sales analytics' }, 500);
  }
});

// ==================== PROCUREMENT ANALYTICS ====================

app.get('/reports/procurement-analytics', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) return c.json({ error: 'Authentication required' }, 401);

  try {
    const db = c.env.DB;
    const companyId = auth.company_id;
    const startDate = c.req.query('start_date') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = c.req.query('end_date') || new Date().toISOString().split('T')[0];
    
    // Spend by month
    const spendByMonth = await db.prepare(`
      SELECT 
        strftime('%Y-%m', invoice_date) as month,
        COUNT(*) as invoice_count,
        COALESCE(SUM(total_amount), 0) as spend
      FROM supplier_invoices
      WHERE company_id = ? AND invoice_date BETWEEN ? AND ?
      GROUP BY month
      ORDER BY month
    `).bind(companyId, startDate, endDate).all();
    
    // Spend by supplier
    const spendBySupplier = await db.prepare(`
      SELECT 
        s.name as supplier_name,
        COUNT(si.id) as invoice_count,
        COALESCE(SUM(si.total_amount), 0) as spend
      FROM suppliers s
      LEFT JOIN supplier_invoices si ON si.supplier_id = s.id AND si.invoice_date BETWEEN ? AND ?
      WHERE s.company_id = ?
      GROUP BY s.id, s.name
      HAVING spend > 0
      ORDER BY spend DESC
      LIMIT 10
    `).bind(startDate, endDate, companyId).all();
    
    // PO fulfillment
    const poFulfillment = await db.prepare(`
      SELECT 
        COUNT(*) as total_pos,
        SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as received_pos,
        SUM(CASE WHEN status = 'invoiced' THEN 1 ELSE 0 END) as invoiced_pos,
        COALESCE(SUM(total_amount), 0) as total_po_value
      FROM purchase_orders
      WHERE company_id = ? AND order_date BETWEEN ? AND ?
    `).bind(companyId, startDate, endDate).first();
    
    return c.json({
      period: { start_date: startDate, end_date: endDate },
      spend_by_month: spendByMonth.results || [],
      spend_by_supplier: spendBySupplier.results || [],
      po_fulfillment: {
        total_pos: Number((poFulfillment as any)?.total_pos) || 0,
        received_pos: Number((poFulfillment as any)?.received_pos) || 0,
        invoiced_pos: Number((poFulfillment as any)?.invoiced_pos) || 0,
        total_po_value: Number((poFulfillment as any)?.total_po_value) || 0
      },
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Procurement analytics error:', error);
    return c.json({ error: 'Failed to generate procurement analytics' }, 500);
  }
});

// ==================== DATA INTEGRITY CHECKS ====================

app.get('/integrity/run', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) return c.json({ error: 'Authentication required' }, 401);

  try {
    const db = c.env.DB;
    const companyId = auth.company_id;
    const checks: any[] = [];
    
    // Check 1: Trial balance is balanced
    const trialBalance = await db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN ga.account_type IN ('asset', 'expense') THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) as debit_balance,
        COALESCE(SUM(CASE WHEN ga.account_type IN ('liability', 'equity', 'revenue') THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0) as credit_balance
      FROM journal_entry_lines jel
      JOIN gl_accounts ga ON ga.id = jel.account_id
      JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
      WHERE ga.company_id = ?
    `).bind(companyId).first();
    
    const debitBal = Number((trialBalance as any)?.debit_balance) || 0;
    const creditBal = Number((trialBalance as any)?.credit_balance) || 0;
    checks.push({
      name: 'Trial Balance',
      description: 'Verify debits equal credits in trial balance',
      status: Math.abs(debitBal - creditBal) < 0.01 ? 'pass' : 'fail',
      details: { debit_balance: debitBal, credit_balance: creditBal, difference: Math.abs(debitBal - creditBal) }
    });
    
    // Check 2: All journal entries are balanced
    const unbalancedEntries = await db.prepare(`
      SELECT je.id, je.entry_number,
        COALESCE(SUM(jel.debit_amount), 0) as total_debits,
        COALESCE(SUM(jel.credit_amount), 0) as total_credits
      FROM journal_entries je
      JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
      WHERE je.company_id = ?
      GROUP BY je.id
      HAVING ABS(total_debits - total_credits) > 0.01
    `).bind(companyId).all();
    
    checks.push({
      name: 'Journal Entry Balance',
      description: 'All journal entries have balanced debits and credits',
      status: (unbalancedEntries.results || []).length === 0 ? 'pass' : 'fail',
      details: { unbalanced_count: (unbalancedEntries.results || []).length, entries: unbalancedEntries.results || [] }
    });
    
    // Check 3: AR subledger reconciles to GL control account
    const arSubledger = await db.prepare(`
      SELECT COALESCE(SUM(total_amount - COALESCE(amount_paid, 0)), 0) as balance
      FROM customer_invoices
      WHERE company_id = ? AND status IN ('sent', 'overdue')
    `).bind(companyId).first();
    
    const arControl = await db.prepare(`
      SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as balance
      FROM journal_entry_lines jel
      JOIN gl_accounts ga ON ga.id = jel.account_id AND ga.account_category = 'accounts_receivable'
      JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
      WHERE ga.company_id = ?
    `).bind(companyId).first();
    
    const arSubBal = Number((arSubledger as any)?.balance) || 0;
    const arCtrlBal = Number((arControl as any)?.balance) || 0;
    checks.push({
      name: 'AR Reconciliation',
      description: 'AR subledger reconciles to GL control account',
      status: Math.abs(arSubBal - arCtrlBal) < 0.01 ? 'pass' : 'warning',
      details: { subledger_balance: arSubBal, control_balance: arCtrlBal, difference: Math.abs(arSubBal - arCtrlBal) }
    });
    
    // Check 4: AP subledger reconciles to GL control account
    const apSubledger = await db.prepare(`
      SELECT COALESCE(SUM(total_amount - COALESCE(amount_paid, 0)), 0) as balance
      FROM supplier_invoices
      WHERE company_id = ? AND status IN ('pending', 'approved')
    `).bind(companyId).first();
    
    const apControl = await db.prepare(`
      SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as balance
      FROM journal_entry_lines jel
      JOIN gl_accounts ga ON ga.id = jel.account_id AND ga.account_category = 'accounts_payable'
      JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
      WHERE ga.company_id = ?
    `).bind(companyId).first();
    
    const apSubBal = Number((apSubledger as any)?.balance) || 0;
    const apCtrlBal = Number((apControl as any)?.balance) || 0;
    checks.push({
      name: 'AP Reconciliation',
      description: 'AP subledger reconciles to GL control account',
      status: Math.abs(apSubBal - apCtrlBal) < 0.01 ? 'pass' : 'warning',
      details: { subledger_balance: apSubBal, control_balance: apCtrlBal, difference: Math.abs(apSubBal - apCtrlBal) }
    });
    
    // Check 5: No orphaned records
    const orphanedInvoiceLines = await db.prepare(`
      SELECT COUNT(*) as count FROM customer_invoice_items 
      WHERE customer_invoice_id NOT IN (SELECT id FROM customer_invoices WHERE company_id = ?)
    `).bind(companyId).first();
    
    checks.push({
      name: 'Orphaned Records',
      description: 'No orphaned invoice line items',
      status: Number((orphanedInvoiceLines as any)?.count) === 0 ? 'pass' : 'fail',
      details: { orphaned_invoice_lines: Number((orphanedInvoiceLines as any)?.count) || 0 }
    });
    
    // Check 6: Document number uniqueness
    const duplicateInvoiceNumbers = await db.prepare(`
      SELECT invoice_number, COUNT(*) as count
      FROM customer_invoices
      WHERE company_id = ?
      GROUP BY invoice_number
      HAVING count > 1
    `).bind(companyId).all();
    
    checks.push({
      name: 'Document Number Uniqueness',
      description: 'All invoice numbers are unique',
      status: (duplicateInvoiceNumbers.results || []).length === 0 ? 'pass' : 'fail',
      details: { duplicate_count: (duplicateInvoiceNumbers.results || []).length, duplicates: duplicateInvoiceNumbers.results || [] }
    });
    
    // Check 7: Period lock enforcement
    const lockedPeriodPostings = await db.prepare(`
      SELECT COUNT(*) as count
      FROM journal_entries je
      JOIN fiscal_periods fp ON fp.company_id = je.company_id 
        AND je.entry_date BETWEEN fp.start_date AND fp.end_date
        AND fp.status = 'closed'
      WHERE je.company_id = ? AND je.status = 'posted'
    `).bind(companyId).first();
    
    checks.push({
      name: 'Period Lock Enforcement',
      description: 'No postings in closed periods',
      status: Number((lockedPeriodPostings as any)?.count) === 0 ? 'pass' : 'warning',
      details: { postings_in_closed_periods: Number((lockedPeriodPostings as any)?.count) || 0 }
    });
    
    // Check 8: Tenant isolation
    const crossTenantRefs = await db.prepare(`
      SELECT COUNT(*) as count
      FROM customer_invoices ci
      JOIN customers c ON c.id = ci.customer_id
      WHERE ci.company_id = ? AND c.company_id != ci.company_id
    `).bind(companyId).first();
    
    checks.push({
      name: 'Tenant Isolation',
      description: 'No cross-tenant references',
      status: Number((crossTenantRefs as any)?.count) === 0 ? 'pass' : 'fail',
      details: { cross_tenant_refs: Number((crossTenantRefs as any)?.count) || 0 }
    });
    
    const passCount = checks.filter(c => c.status === 'pass').length;
    const warnCount = checks.filter(c => c.status === 'warning').length;
    const failCount = checks.filter(c => c.status === 'fail').length;
    
    return c.json({
      summary: {
        total_checks: checks.length,
        passed: passCount,
        warnings: warnCount,
        failed: failCount,
        overall_status: failCount > 0 ? 'fail' : (warnCount > 0 ? 'warning' : 'pass')
      },
      checks,
      run_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Integrity check error:', error);
    return c.json({ error: 'Failed to run integrity checks' }, 500);
  }
});

// ==================== EXPORT ENDPOINTS ====================

app.get('/export/csv/:report', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) return c.json({ error: 'Authentication required' }, 401);

  const report = c.req.param('report');
  const companyId = auth.company_id;
  const db = c.env.DB;
  
  try {
    let data: any[] = [];
    let headers: string[] = [];
    
    switch (report) {
      case 'customers':
        headers = ['Code', 'Name', 'Email', 'Phone', 'Tax Number', 'Payment Terms', 'Credit Limit', 'Status'];
        const customers = await db.prepare(`
          SELECT customer_code, name, email, phone, tax_number, payment_terms, credit_limit, 
            CASE WHEN is_active = 1 THEN 'Active' ELSE 'Inactive' END as status
          FROM customers WHERE company_id = ?
        `).bind(companyId).all();
        data = customers.results || [];
        break;
        
      case 'suppliers':
        headers = ['Code', 'Name', 'Email', 'Phone', 'Tax Number', 'Payment Terms', 'Status'];
        const suppliers = await db.prepare(`
          SELECT supplier_code, name, email, phone, tax_number, payment_terms,
            CASE WHEN is_active = 1 THEN 'Active' ELSE 'Inactive' END as status
          FROM suppliers WHERE company_id = ?
        `).bind(companyId).all();
        data = suppliers.results || [];
        break;
        
      case 'products':
        headers = ['SKU', 'Name', 'Category', 'Unit Price', 'Cost Price', 'Quantity On Hand', 'Status'];
        const products = await db.prepare(`
          SELECT sku, name, category, unit_price, cost_price, quantity_on_hand,
            CASE WHEN is_active = 1 THEN 'Active' ELSE 'Inactive' END as status
          FROM products WHERE company_id = ?
        `).bind(companyId).all();
        data = products.results || [];
        break;
        
      case 'invoices':
        headers = ['Invoice Number', 'Customer', 'Date', 'Due Date', 'Total', 'Paid', 'Status'];
        const invoices = await db.prepare(`
          SELECT ci.invoice_number, c.name as customer, ci.invoice_date, ci.due_date, 
            ci.total_amount, COALESCE(ci.amount_paid, 0) as paid, ci.status
          FROM customer_invoices ci
          JOIN customers c ON c.id = ci.customer_id
          WHERE ci.company_id = ?
          ORDER BY ci.invoice_date DESC
        `).bind(companyId).all();
        data = invoices.results || [];
        break;
        
      case 'trial-balance':
        headers = ['Account Code', 'Account Name', 'Type', 'Debit', 'Credit'];
        const tb = await db.prepare(`
          SELECT 
            ga.account_code,
            ga.account_name,
            ga.account_type,
            CASE WHEN ga.account_type IN ('asset', 'expense') 
              THEN COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) ELSE 0 END as debit,
            CASE WHEN ga.account_type IN ('liability', 'equity', 'revenue') 
              THEN COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) ELSE 0 END as credit
          FROM gl_accounts ga
          LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
          LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
          WHERE ga.company_id = ? AND ga.is_active = 1
          GROUP BY ga.id
          HAVING debit != 0 OR credit != 0
          ORDER BY ga.account_code
        `).bind(companyId).all();
        data = tb.results || [];
        break;
        
      default:
        return c.json({ error: `Unknown report: ${report}` }, 400);
    }
    
    // Convert to CSV
    const csvRows = [headers.join(',')];
    for (const row of data) {
      const values = Object.values(row).map(v => {
        if (v === null || v === undefined) return '';
        const str = String(v);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvRows.push(values.join(','));
    }
    
    const csv = csvRows.join('\n');
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${report}_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return c.json({ error: 'Failed to export data' }, 500);
  }
});

export default app;
