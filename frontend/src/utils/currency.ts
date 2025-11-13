/**
 * Currency and Tax Utilities
 * Centralized monetary math to ensure consistency with backend
 */

export const CURRENCY_CODE = 'ZAR';
export const CURRENCY_SYMBOL = 'R';
export const DEFAULT_VAT_RATE = 15.0; // 15% VAT for South Africa
export const DECIMAL_PLACES = 2;

/**
 * Format amount as ZAR currency
 */
export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL} ${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: DECIMAL_PLACES,
    maximumFractionDigits: DECIMAL_PLACES
  })}`;
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Round to specified decimal places using banker's rounding
 */
export function roundAmount(amount: number, decimals: number = DECIMAL_PLACES): number {
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}

/**
 * Calculate line subtotal (quantity * unit_price)
 */
export function calculateLineSubtotal(quantity: number, unitPrice: number): number {
  return roundAmount(quantity * unitPrice);
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(subtotal: number, discountPercent: number): number {
  return roundAmount(subtotal * (discountPercent / 100));
}

/**
 * Calculate tax amount
 */
export function calculateTax(amount: number, taxRate: number): number {
  return roundAmount(amount * (taxRate / 100));
}

/**
 * Calculate line total with discount and tax
 * Formula: (quantity * unit_price - discount) * (1 + tax_rate/100)
 */
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountPercent: number = 0,
  taxRate: number = DEFAULT_VAT_RATE
): number {
  const subtotal = calculateLineSubtotal(quantity, unitPrice);
  const discount = calculateDiscount(subtotal, discountPercent);
  const afterDiscount = subtotal - discount;
  const tax = calculateTax(afterDiscount, taxRate);
  return roundAmount(afterDiscount + tax);
}

/**
 * Calculate document totals from line items
 */
export interface DocumentTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

export interface LineItemCalculation {
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  tax_rate?: number;
}

export function calculateDocumentTotals(lines: LineItemCalculation[]): DocumentTotals {
  let subtotal = 0;
  let discountAmount = 0;
  let taxAmount = 0;

  for (const line of lines) {
    const lineSubtotal = calculateLineSubtotal(line.quantity, line.unit_price);
    const lineDiscount = calculateDiscount(lineSubtotal, line.discount_percent || 0);
    const afterDiscount = lineSubtotal - lineDiscount;
    const lineTax = calculateTax(afterDiscount, line.tax_rate || DEFAULT_VAT_RATE);

    subtotal += afterDiscount;
    discountAmount += lineDiscount;
    taxAmount += lineTax;
  }

  return {
    subtotal: roundAmount(subtotal),
    discountAmount: roundAmount(discountAmount),
    taxAmount: roundAmount(taxAmount),
    total: roundAmount(subtotal + taxAmount)
  };
}

/**
 * Validate that debits equal credits (for journal entries)
 */
export function validateBalance(debitAmount: number, creditAmount: number, tolerance: number = 0.01): boolean {
  return Math.abs(debitAmount - creditAmount) <= tolerance;
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calculate percentage of total
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return roundAmount((part / total) * 100);
}
