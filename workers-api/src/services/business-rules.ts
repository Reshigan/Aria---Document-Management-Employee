/**
 * Business Rules Engine
 * 
 * Centralized business rules for cross-module validation, integrity,
 * and seamless integration between all ERP modules.
 * 
 * Covers: Order-to-Cash, Procure-to-Pay, Financial, Inventory,
 * HR, Manufacturing, and cross-module integration rules.
 */

const SA_VAT_RATE = 15;
const PAYMENT_TERMS_DEFAULT = 30;

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface BusinessContext {
  companyId: string;
  userId: string;
  module: string;
}

// ==================== NUMBER SAFETY ====================

export function safeNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

export function safeFixed(value: unknown, decimals: number = 2): string {
  return safeNumber(value).toFixed(decimals);
}

// ==================== DOCUMENT NUMBER GENERATION ====================

export async function generateDocumentNumber(
  db: D1Database,
  companyId: string,
  prefix: string,
  table: string,
  column: string
): Promise<string> {
  const last = await db.prepare(
    `SELECT ${column} FROM ${table} WHERE company_id = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(companyId).first();

  let nextNum = 1;
  if (last && (last as Record<string, unknown>)[column]) {
    const val = String((last as Record<string, unknown>)[column]);
    const match = val.match(/(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1]) + 1;
    }
  }
  return `${prefix}-${String(nextNum).padStart(5, '0')}`;
}

// ==================== LINE ITEM CALCULATIONS ====================

interface LineItemInput {
  quantity?: number;
  unit_price?: number;
  discount_percent?: number;
  tax_rate?: number;
}

interface CalculatedTotals {
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
}

export function calculateLineTotals(items: LineItemInput[]): CalculatedTotals {
  let subtotal = 0;
  let discountAmount = 0;
  let taxAmount = 0;

  for (const item of items) {
    const qty = safeNumber(item.quantity) || 1;
    const price = safeNumber(item.unit_price);
    const discPct = safeNumber(item.discount_percent);
    const taxRate = safeNumber(item.tax_rate) || SA_VAT_RATE;

    const lineGross = qty * price;
    const lineDiscount = lineGross * (discPct / 100);
    const lineNet = lineGross - lineDiscount;
    const lineTax = lineNet * (taxRate / 100);

    subtotal += lineNet;
    discountAmount += lineDiscount;
    taxAmount += lineTax;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount_amount: Math.round(discountAmount * 100) / 100,
    tax_amount: Math.round(taxAmount * 100) / 100,
    total_amount: Math.round((subtotal + taxAmount) * 100) / 100,
  };
}

export function calculateLineTotal(item: LineItemInput): number {
  const qty = safeNumber(item.quantity) || 1;
  const price = safeNumber(item.unit_price);
  const discPct = safeNumber(item.discount_percent);
  const taxRate = safeNumber(item.tax_rate) || SA_VAT_RATE;

  const lineGross = qty * price;
  const lineDiscount = lineGross * (discPct / 100);
  const lineNet = lineGross - lineDiscount;
  return Math.round(lineNet * 100) / 100;
}

// ==================== STATUS TRANSITION RULES ====================

const STATUS_TRANSITIONS: Record<string, Record<string, string[]>> = {
  quote: {
    draft: ['sent', 'approved', 'cancelled'],
    sent: ['accepted', 'approved', 'rejected', 'expired', 'cancelled'],
    accepted: ['converted'],
    approved: ['converted'],
    rejected: [],
    expired: ['draft'],
    converted: [],
    cancelled: ['draft'],
  },
  sales_order: {
    draft: ['pending', 'cancelled'],
    pending: ['confirmed', 'approved', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    approved: ['processing', 'cancelled'],
    processing: ['shipped', 'invoiced'],
    shipped: ['delivered', 'invoiced'],
    delivered: ['invoiced', 'completed'],
    invoiced: ['completed'],
    completed: [],
    cancelled: [],
  },
  purchase_order: {
    draft: ['sent', 'approved', 'cancelled'],
    sent: ['confirmed', 'approved', 'cancelled'],
    approved: ['partial', 'received', 'cancelled'],
    confirmed: ['partial', 'received', 'cancelled'],
    partial: ['received', 'cancelled'],
    received: ['invoiced'],
    invoiced: ['completed'],
    completed: [],
    cancelled: ['draft'],
  },
  customer_invoice: {
    draft: ['sent', 'posted', 'cancelled'],
    sent: ['posted', 'cancelled'],
    posted: ['partial', 'paid', 'overdue', 'cancelled'],
    partial: ['paid', 'overdue'],
    paid: [],
    overdue: ['partial', 'paid'],
    cancelled: [],
  },
  supplier_invoice: {
    draft: ['received', 'cancelled'],
    received: ['approved', 'cancelled'],
    approved: ['partial', 'paid', 'overdue'],
    partial: ['paid', 'overdue'],
    paid: [],
    overdue: ['partial', 'paid'],
    cancelled: [],
  },
  delivery: {
    draft: ['picking', 'shipped', 'cancelled'],
    picking: ['shipped', 'cancelled'],
    shipped: ['delivered', 'completed'],
    delivered: ['completed'],
    completed: [],
    cancelled: ['draft'],
  },
};

export function validateStatusTransition(
  module: string,
  currentStatus: string,
  newStatus: string
): ValidationResult {
  const transitions = STATUS_TRANSITIONS[module];
  if (!transitions) {
    return { valid: true, errors: [], warnings: [`No status rules defined for module: ${module}`] };
  }

  const allowed = transitions[currentStatus];
  if (!allowed) {
    return { valid: false, errors: [`Unknown current status: ${currentStatus}`], warnings: [] };
  }

  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      errors: [`Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.join(', ') || 'none'}`],
      warnings: [],
    };
  }

  return { valid: true, errors: [], warnings: [] };
}

// ==================== QUOTE VALIDATION ====================

export function validateQuote(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.customer_id) errors.push('Customer is required');
  if (!data.quote_date) errors.push('Quote date is required');

  const items = (data.items as LineItemInput[]) || (data.lines as LineItemInput[]) || [];
  if (items.length === 0) warnings.push('Quote has no line items');

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (safeNumber(item.quantity) <= 0) errors.push(`Line ${i + 1}: Quantity must be greater than 0`);
    if (safeNumber(item.unit_price) < 0) errors.push(`Line ${i + 1}: Unit price cannot be negative`);
    if (safeNumber(item.discount_percent) > 100) errors.push(`Line ${i + 1}: Discount cannot exceed 100%`);
    if (safeNumber(item.discount_percent) > 30) warnings.push(`Line ${i + 1}: Discount exceeds 30% - requires approval`);
  }

  const totals = calculateLineTotals(items);
  if (totals.total_amount <= 0 && items.length > 0) {
    warnings.push('Quote total is zero or negative');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ==================== SALES ORDER VALIDATION ====================

export function validateSalesOrder(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.customer_id) errors.push('Customer is required');
  if (!data.order_date) warnings.push('Order date not specified, will use today');

  const items = (data.items as LineItemInput[]) || (data.lines as LineItemInput[]) || [];
  if (items.length === 0) errors.push('Sales order must have at least one line item');

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (safeNumber(item.quantity) <= 0) errors.push(`Line ${i + 1}: Quantity must be greater than 0`);
    if (safeNumber(item.unit_price) <= 0) warnings.push(`Line ${i + 1}: Unit price is zero`);
    if (safeNumber(item.discount_percent) > 100) errors.push(`Line ${i + 1}: Discount cannot exceed 100%`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ==================== PURCHASE ORDER VALIDATION ====================

export function validatePurchaseOrder(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.supplier_id) errors.push('Supplier is required');

  const items = (data.items as LineItemInput[]) || (data.lines as LineItemInput[]) || [];
  if (items.length === 0) errors.push('Purchase order must have at least one line item');

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (safeNumber(item.quantity) <= 0) errors.push(`Line ${i + 1}: Quantity must be greater than 0`);
    if (safeNumber(item.unit_price) < 0) errors.push(`Line ${i + 1}: Unit price cannot be negative`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ==================== INVOICE VALIDATION ====================

export function validateInvoice(data: Record<string, unknown>, type: 'customer' | 'supplier'): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (type === 'customer' && !data.customer_id) errors.push('Customer is required');
  if (type === 'supplier' && !data.supplier_id) errors.push('Supplier is required');
  if (!data.invoice_date) warnings.push('Invoice date not specified');
  if (!data.due_date) warnings.push('Due date not specified, will default to NET 30');

  const totalAmount = safeNumber(data.total_amount);
  if (totalAmount <= 0) warnings.push('Invoice total is zero or negative');

  return { valid: errors.length === 0, errors, warnings };
}

// ==================== PAYMENT VALIDATION ====================

export function validatePayment(
  amount: number,
  invoiceTotal: number,
  amountPaid: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (amount <= 0) errors.push('Payment amount must be greater than 0');

  const outstanding = invoiceTotal - amountPaid;
  if (amount > outstanding + 0.01) {
    warnings.push(`Payment (R ${safeFixed(amount)}) exceeds outstanding balance (R ${safeFixed(outstanding)}). Overpayment of R ${safeFixed(amount - outstanding)}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ==================== DELIVERY VALIDATION ====================

export function validateDelivery(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.customer_id) errors.push('Customer is required');
  if (!data.delivery_date) warnings.push('Delivery date not specified');

  const lines = (data.lines as Array<Record<string, unknown>>) || [];
  if (lines.length === 0) warnings.push('Delivery has no line items');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (safeNumber(line.quantity) <= 0) errors.push(`Line ${i + 1}: Quantity must be greater than 0`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ==================== INVENTORY RULES ====================

export async function checkStockAvailability(
  db: D1Database,
  companyId: string,
  productId: string,
  requiredQty: number
): Promise<{ available: boolean; on_hand: number; shortfall: number }> {
  const product = await db.prepare(
    'SELECT quantity_on_hand FROM products WHERE id = ? AND company_id = ?'
  ).bind(productId, companyId).first<{ quantity_on_hand: number }>();

  const onHand = safeNumber(product?.quantity_on_hand);
  const shortfall = Math.max(0, requiredQty - onHand);

  return {
    available: onHand >= requiredQty,
    on_hand: onHand,
    shortfall,
  };
}

export async function checkReorderPoint(
  db: D1Database,
  companyId: string,
  productId: string
): Promise<{ needs_reorder: boolean; quantity_on_hand: number; reorder_level: number }> {
  const product = await db.prepare(
    'SELECT quantity_on_hand, reorder_level FROM products WHERE id = ? AND company_id = ?'
  ).bind(productId, companyId).first<{ quantity_on_hand: number; reorder_level: number }>();

  const onHand = safeNumber(product?.quantity_on_hand);
  const reorderLevel = safeNumber(product?.reorder_level);

  return {
    needs_reorder: onHand <= reorderLevel,
    quantity_on_hand: onHand,
    reorder_level: reorderLevel,
  };
}

export async function updateStockQuantity(
  db: D1Database,
  companyId: string,
  productId: string,
  quantityChange: number,
  movementType: string,
  reference: string
): Promise<void> {
  const now = new Date().toISOString();

  await db.prepare(
    'UPDATE products SET quantity_on_hand = quantity_on_hand + ?, updated_at = ? WHERE id = ? AND company_id = ?'
  ).bind(quantityChange, now, productId, companyId).run();

  await db.prepare(
    'INSERT INTO stock_movements (id, company_id, product_id, movement_type, quantity, reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), companyId, productId, movementType, quantityChange, reference, now).run();
}

// ==================== CREDIT LIMIT CHECK ====================

export async function checkCustomerCreditLimit(
  db: D1Database,
  companyId: string,
  customerId: string,
  newOrderAmount: number
): Promise<{ allowed: boolean; credit_limit: number; current_balance: number; available_credit: number }> {
  const customer = await db.prepare(
    'SELECT credit_limit FROM customers WHERE id = ? AND company_id = ?'
  ).bind(customerId, companyId).first<{ credit_limit: number }>();

  const creditLimit = safeNumber(customer?.credit_limit);
  if (creditLimit <= 0) {
    return { allowed: true, credit_limit: 0, current_balance: 0, available_credit: 0 };
  }

  const outstanding = await db.prepare(
    'SELECT COALESCE(SUM(balance_due), 0) as total FROM customer_invoices WHERE customer_id = ? AND company_id = ? AND status NOT IN (?, ?)'
  ).bind(customerId, companyId, 'paid', 'cancelled').first<{ total: number }>();

  const currentBalance = safeNumber(outstanding?.total);
  const availableCredit = creditLimit - currentBalance;

  return {
    allowed: (currentBalance + newOrderAmount) <= creditLimit,
    credit_limit: creditLimit,
    current_balance: currentBalance,
    available_credit: Math.max(0, availableCredit),
  };
}

// ==================== DUPLICATE DETECTION ====================

export async function checkDuplicateDocument(
  db: D1Database,
  companyId: string,
  table: string,
  referenceField: string,
  referenceValue: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; existingId?: string }> {
  let query = `SELECT id FROM ${table} WHERE company_id = ? AND ${referenceField} = ?`;
  const params: string[] = [companyId, referenceValue];

  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }

  const existing = await db.prepare(query).bind(...params).first<{ id: string }>();

  return {
    isDuplicate: !!existing,
    existingId: existing?.id,
  };
}

// ==================== PERIOD VALIDATION ====================

export async function validateFinancialPeriod(
  db: D1Database,
  companyId: string,
  date: string,
  module: string = 'gl'
): Promise<{ isOpen: boolean; period: string }> {
  const period = date.substring(0, 7);

  const lock = await db.prepare(
    'SELECT is_locked FROM period_locks WHERE company_id = ? AND period = ? AND module = ?'
  ).bind(companyId, period, module).first<{ is_locked: number }>();

  return {
    isOpen: !lock || lock.is_locked !== 1,
    period,
  };
}

// ==================== CROSS-MODULE INTEGRATION ====================

export async function getOrderToInvoiceTrail(
  db: D1Database,
  companyId: string,
  salesOrderId: string
): Promise<{
  order: Record<string, unknown> | null;
  deliveries: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
}> {
  const order = await db.prepare(
    'SELECT * FROM sales_orders WHERE id = ? AND company_id = ?'
  ).bind(salesOrderId, companyId).first();

  const deliveries = await db.prepare(
    'SELECT * FROM deliveries WHERE sales_order_id = ? AND company_id = ?'
  ).bind(salesOrderId, companyId).all();

  const invoices = await db.prepare(
    'SELECT * FROM customer_invoices WHERE sales_order_id = ? AND company_id = ?'
  ).bind(salesOrderId, companyId).all();

  let payments: Array<Record<string, unknown>> = [];
  if (invoices.results.length > 0) {
    const invoiceIds = invoices.results.map((inv: Record<string, unknown>) => inv.id);
    for (const invId of invoiceIds) {
      const invPayments = await db.prepare(
        'SELECT * FROM customer_payments WHERE invoice_id = ? AND company_id = ?'
      ).bind(invId, companyId).all();
      payments = payments.concat(invPayments.results as Array<Record<string, unknown>>);
    }
  }

  return {
    order: order as Record<string, unknown> | null,
    deliveries: (deliveries.results || []) as Array<Record<string, unknown>>,
    invoices: (invoices.results || []) as Array<Record<string, unknown>>,
    payments,
  };
}

export async function getPurchaseToPayTrail(
  db: D1Database,
  companyId: string,
  purchaseOrderId: string
): Promise<{
  order: Record<string, unknown> | null;
  invoices: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
}> {
  const order = await db.prepare(
    'SELECT * FROM purchase_orders WHERE id = ? AND company_id = ?'
  ).bind(purchaseOrderId, companyId).first();

  const invoices = await db.prepare(
    'SELECT * FROM supplier_invoices WHERE purchase_order_id = ? AND company_id = ?'
  ).bind(purchaseOrderId, companyId).all();

  let payments: Array<Record<string, unknown>> = [];
  if (invoices.results.length > 0) {
    const invoiceIds = invoices.results.map((inv: Record<string, unknown>) => inv.id);
    for (const invId of invoiceIds) {
      const invPayments = await db.prepare(
        'SELECT * FROM supplier_payments WHERE invoice_id = ? AND company_id = ?'
      ).bind(invId, companyId).all();
      payments = payments.concat(invPayments.results as Array<Record<string, unknown>>);
    }
  }

  return {
    order: order as Record<string, unknown> | null,
    invoices: (invoices.results || []) as Array<Record<string, unknown>>,
    payments,
  };
}

// ==================== WAREHOUSE VALIDATION ====================

export function validateWarehouse(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.warehouse_code) errors.push('Warehouse code is required');
  if (!data.warehouse_name) errors.push('Warehouse name is required');

  const capacity = safeNumber(data.capacity);
  if (capacity < 0) errors.push('Capacity cannot be negative');
  if (capacity === 0) warnings.push('Warehouse capacity is set to 0');

  return { valid: errors.length === 0, errors, warnings };
}

// ==================== PRODUCT VALIDATION ====================

export function validateProduct(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.product_name) errors.push('Product name is required');

  const unitPrice = safeNumber(data.unit_price);
  const costPrice = safeNumber(data.cost_price);

  if (unitPrice < 0) errors.push('Selling price cannot be negative');
  if (costPrice < 0) errors.push('Cost price cannot be negative');
  if (unitPrice > 0 && costPrice > 0 && costPrice > unitPrice) {
    warnings.push('Cost price exceeds selling price - negative margin');
  }

  const taxRate = safeNumber(data.tax_rate);
  if (taxRate < 0 || taxRate > 100) errors.push('Tax rate must be between 0% and 100%');

  const reorderLevel = safeNumber(data.reorder_level);
  if (reorderLevel < 0) errors.push('Reorder level cannot be negative');

  return { valid: errors.length === 0, errors, warnings };
}

// ==================== CUSTOMER VALIDATION ====================

export function validateCustomer(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.customer_name && !data.name) errors.push('Customer name is required');

  const email = data.email as string;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Invalid email format');
  }

  const vatNumber = data.vat_number as string;
  if (vatNumber && !/^4\d{9}$/.test(vatNumber.replace(/\s/g, ''))) {
    warnings.push('VAT number does not match SA format (should start with 4 and be 10 digits)');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ==================== SUPPLIER VALIDATION ====================

export function validateSupplier(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.supplier_name && !data.name) errors.push('Supplier name is required');

  const email = data.email as string;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Invalid email format');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ==================== JOURNAL ENTRY VALIDATION ====================

export function validateJournalEntry(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.entry_date) errors.push('Entry date is required');
  if (!data.description) warnings.push('Description is recommended');

  const lines = (data.lines as Array<Record<string, unknown>>) || [];
  if (lines.length < 2) errors.push('Journal entry must have at least 2 lines');

  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const debit = safeNumber(line.debit_amount);
    const credit = safeNumber(line.credit_amount);

    if (debit === 0 && credit === 0) errors.push(`Line ${i + 1}: Must have either debit or credit amount`);
    if (debit > 0 && credit > 0) errors.push(`Line ${i + 1}: Cannot have both debit and credit on same line`);
    if (!line.account_id && !line.account_code) errors.push(`Line ${i + 1}: GL account is required`);

    totalDebit += debit;
    totalCredit += credit;
  }

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    errors.push(`Journal entry not balanced: Debits R ${safeFixed(totalDebit)} != Credits R ${safeFixed(totalCredit)}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ==================== SA TAX RULES ====================

export function calculateVAT(amount: number, inclusive: boolean = false): { exclusive: number; vat: number; inclusive: number } {
  const rate = SA_VAT_RATE / 100;

  if (inclusive) {
    const exclusive = amount / (1 + rate);
    const vat = amount - exclusive;
    return {
      exclusive: Math.round(exclusive * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      inclusive: amount,
    };
  }

  const vat = amount * rate;
  return {
    exclusive: amount,
    vat: Math.round(vat * 100) / 100,
    inclusive: Math.round((amount + vat) * 100) / 100,
  };
}

// ==================== AGING BUCKETS ====================

export function calculateAgingBucket(dueDate: string): string {
  const due = new Date(dueDate);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'current';
  if (diffDays <= 30) return '1-30';
  if (diffDays <= 60) return '31-60';
  if (diffDays <= 90) return '61-90';
  return '90+';
}

// ==================== SAFE RESPONSE HELPER ====================

export function safeResponse(data: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      if (typeof value === 'number' || key.includes('amount') || key.includes('price') ||
          key.includes('total') || key.includes('balance') || key.includes('quantity') ||
          key.includes('rate') || key.includes('cost') || key.includes('value')) {
        safe[key] = 0;
      } else {
        safe[key] = value;
      }
    } else {
      safe[key] = value;
    }
  }
  return safe;
}
