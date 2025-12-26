/**
 * Multi-Currency Service
 * 
 * Provides comprehensive multi-currency support:
 * - Exchange rate management (manual and API-based)
 * - Currency conversion for transactions
 * - Realized and unrealized gain/loss calculation
 * - Period-end revaluation
 * - Multi-currency reporting
 */

export interface Currency {
  code: string;           // ISO 4217 code (USD, EUR, ZAR, etc.)
  name: string;
  symbol: string;
  decimal_places: number;
  is_active: boolean;
}

export interface ExchangeRate {
  id: string;
  company_id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  rate_type: 'spot' | 'average' | 'closing';
  effective_date: string;
  source: 'manual' | 'api' | 'bank';
  created_at: string;
}

export interface CurrencyRevaluation {
  id: string;
  company_id: string;
  period_end_date: string;
  currency: string;
  account_type: 'ar' | 'ap' | 'bank';
  original_amount: number;
  original_rate: number;
  revalued_amount: number;
  revaluation_rate: number;
  gain_loss: number;
  gl_entry_id: string | null;
  created_at: string;
  created_by: string;
}

// Common currencies with their details
const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', decimal_places: 2, is_active: true },
  { code: 'EUR', name: 'Euro', symbol: '€', decimal_places: 2, is_active: true },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimal_places: 2, is_active: true },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimal_places: 2, is_active: true },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', decimal_places: 2, is_active: true },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', decimal_places: 2, is_active: true },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', decimal_places: 2, is_active: true },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', decimal_places: 2, is_active: true },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimal_places: 2, is_active: true },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimal_places: 2, is_active: true },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimal_places: 2, is_active: true },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimal_places: 2, is_active: true },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimal_places: 2, is_active: true },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimal_places: 2, is_active: true },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimal_places: 0, is_active: true },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimal_places: 2, is_active: true },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimal_places: 2, is_active: true },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimal_places: 2, is_active: true },
];

/**
 * Get all available currencies
 */
export function getCurrencies(): Currency[] {
  return CURRENCIES;
}

/**
 * Get currency details by code
 */
export function getCurrency(code: string): Currency | undefined {
  return CURRENCIES.find(c => c.code === code.toUpperCase());
}

/**
 * Format amount in currency
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  if (!currency) return amount.toFixed(2);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currency.decimal_places,
    maximumFractionDigits: currency.decimal_places,
  }).format(amount);
}

/**
 * Set exchange rate
 */
export async function setExchangeRate(
  db: D1Database,
  companyId: string,
  fromCurrency: string,
  toCurrency: string,
  rate: number,
  rateType: ExchangeRate['rate_type'] = 'spot',
  effectiveDate: string = new Date().toISOString().split('T')[0],
  source: ExchangeRate['source'] = 'manual'
): Promise<ExchangeRate> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  await db.prepare(`
    INSERT INTO exchange_rates (
      id, company_id, from_currency, to_currency, rate, rate_type,
      effective_date, source, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, companyId, fromCurrency.toUpperCase(), toCurrency.toUpperCase(),
    rate, rateType, effectiveDate, source, timestamp
  ).run();

  return {
    id,
    company_id: companyId,
    from_currency: fromCurrency.toUpperCase(),
    to_currency: toCurrency.toUpperCase(),
    rate,
    rate_type: rateType,
    effective_date: effectiveDate,
    source,
    created_at: timestamp,
  };
}

/**
 * Get exchange rate for a date
 */
export async function getExchangeRate(
  db: D1Database,
  companyId: string,
  fromCurrency: string,
  toCurrency: string,
  date: string = new Date().toISOString().split('T')[0],
  rateType: ExchangeRate['rate_type'] = 'spot'
): Promise<number | null> {
  // Same currency
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return 1;
  }

  // Try direct rate
  const directRate = await db.prepare(`
    SELECT rate FROM exchange_rates
    WHERE company_id = ? AND from_currency = ? AND to_currency = ?
    AND rate_type = ? AND effective_date <= ?
    ORDER BY effective_date DESC
    LIMIT 1
  `).bind(companyId, fromCurrency.toUpperCase(), toCurrency.toUpperCase(), rateType, date).first();

  if (directRate) {
    return (directRate as any).rate;
  }

  // Try inverse rate
  const inverseRate = await db.prepare(`
    SELECT rate FROM exchange_rates
    WHERE company_id = ? AND from_currency = ? AND to_currency = ?
    AND rate_type = ? AND effective_date <= ?
    ORDER BY effective_date DESC
    LIMIT 1
  `).bind(companyId, toCurrency.toUpperCase(), fromCurrency.toUpperCase(), rateType, date).first();

  if (inverseRate) {
    return 1 / (inverseRate as any).rate;
  }

  // Try triangulation through USD
  if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
    const fromToUsd = await getExchangeRate(db, companyId, fromCurrency, 'USD', date, rateType);
    const usdToTo = await getExchangeRate(db, companyId, 'USD', toCurrency, date, rateType);
    
    if (fromToUsd && usdToTo) {
      return fromToUsd * usdToTo;
    }
  }

  return null;
}

/**
 * Convert amount between currencies
 */
export async function convertCurrency(
  db: D1Database,
  companyId: string,
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date?: string
): Promise<{ amount: number; rate: number } | null> {
  const rate = await getExchangeRate(db, companyId, fromCurrency, toCurrency, date);
  
  if (rate === null) {
    return null;
  }

  return {
    amount: Math.round(amount * rate * 100) / 100,
    rate,
  };
}

/**
 * Get all exchange rates for a company
 */
export async function listExchangeRates(
  db: D1Database,
  companyId: string,
  fromDate?: string,
  toDate?: string
): Promise<ExchangeRate[]> {
  let query = 'SELECT * FROM exchange_rates WHERE company_id = ?';
  const params: any[] = [companyId];

  if (fromDate) {
    query += ' AND effective_date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND effective_date <= ?';
    params.push(toDate);
  }

  query += ' ORDER BY effective_date DESC, from_currency, to_currency';

  const result = await db.prepare(query).bind(...params).all();
  return (result.results || []) as unknown as ExchangeRate[];
}

/**
 * Calculate realized gain/loss on payment
 */
export async function calculateRealizedGainLoss(
  db: D1Database,
  companyId: string,
  invoiceAmount: number,
  invoiceCurrency: string,
  invoiceRate: number,
  paymentAmount: number,
  paymentCurrency: string,
  paymentRate: number,
  baseCurrency: string
): Promise<{ gainLoss: number; isGain: boolean }> {
  // Convert invoice amount to base currency at invoice rate
  const invoiceInBase = invoiceAmount * invoiceRate;
  
  // Convert payment amount to base currency at payment rate
  const paymentInBase = paymentAmount * paymentRate;
  
  // Calculate gain/loss
  const gainLoss = paymentInBase - invoiceInBase;
  
  return {
    gainLoss: Math.abs(gainLoss),
    isGain: gainLoss > 0,
  };
}

/**
 * Perform period-end revaluation
 */
export async function performRevaluation(
  db: D1Database,
  companyId: string,
  periodEndDate: string,
  baseCurrency: string,
  userId: string
): Promise<CurrencyRevaluation[]> {
  const revaluations: CurrencyRevaluation[] = [];
  const timestamp = new Date().toISOString();

  // Get all open AR invoices in foreign currencies
  const arInvoices = await db.prepare(`
    SELECT id, currency, total_amount, exchange_rate
    FROM customer_invoices
    WHERE company_id = ? AND status != 'paid' AND currency != ?
  `).bind(companyId, baseCurrency).all();

  for (const invoice of (arInvoices.results || []) as any[]) {
    const newRate = await getExchangeRate(db, companyId, invoice.currency, baseCurrency, periodEndDate, 'closing');
    if (!newRate) continue;

    const originalAmount = invoice.total_amount * invoice.exchange_rate;
    const revaluedAmount = invoice.total_amount * newRate;
    const gainLoss = revaluedAmount - originalAmount;

    if (Math.abs(gainLoss) > 0.01) {
      const revaluation: CurrencyRevaluation = {
        id: crypto.randomUUID(),
        company_id: companyId,
        period_end_date: periodEndDate,
        currency: invoice.currency,
        account_type: 'ar',
        original_amount: originalAmount,
        original_rate: invoice.exchange_rate,
        revalued_amount: revaluedAmount,
        revaluation_rate: newRate,
        gain_loss: gainLoss,
        gl_entry_id: null,
        created_at: timestamp,
        created_by: userId,
      };

      await db.prepare(`
        INSERT INTO currency_revaluations (
          id, company_id, period_end_date, currency, account_type,
          original_amount, original_rate, revalued_amount, revaluation_rate,
          gain_loss, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        revaluation.id, companyId, periodEndDate, invoice.currency, 'ar',
        originalAmount, invoice.exchange_rate, revaluedAmount, newRate,
        gainLoss, timestamp, userId
      ).run();

      revaluations.push(revaluation);
    }
  }

  // Get all open AP invoices in foreign currencies
  const apInvoices = await db.prepare(`
    SELECT id, currency, total_amount, exchange_rate
    FROM supplier_invoices
    WHERE company_id = ? AND status != 'paid' AND currency != ?
  `).bind(companyId, baseCurrency).all();

  for (const invoice of (apInvoices.results || []) as any[]) {
    const newRate = await getExchangeRate(db, companyId, invoice.currency, baseCurrency, periodEndDate, 'closing');
    if (!newRate) continue;

    const originalAmount = invoice.total_amount * invoice.exchange_rate;
    const revaluedAmount = invoice.total_amount * newRate;
    const gainLoss = originalAmount - revaluedAmount; // Opposite for AP

    if (Math.abs(gainLoss) > 0.01) {
      const revaluation: CurrencyRevaluation = {
        id: crypto.randomUUID(),
        company_id: companyId,
        period_end_date: periodEndDate,
        currency: invoice.currency,
        account_type: 'ap',
        original_amount: originalAmount,
        original_rate: invoice.exchange_rate,
        revalued_amount: revaluedAmount,
        revaluation_rate: newRate,
        gain_loss: gainLoss,
        gl_entry_id: null,
        created_at: timestamp,
        created_by: userId,
      };

      await db.prepare(`
        INSERT INTO currency_revaluations (
          id, company_id, period_end_date, currency, account_type,
          original_amount, original_rate, revalued_amount, revaluation_rate,
          gain_loss, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        revaluation.id, companyId, periodEndDate, invoice.currency, 'ap',
        originalAmount, invoice.exchange_rate, revaluedAmount, newRate,
        gainLoss, timestamp, userId
      ).run();

      revaluations.push(revaluation);
    }
  }

  return revaluations;
}

/**
 * Get revaluation history
 */
export async function getRevaluationHistory(
  db: D1Database,
  companyId: string,
  periodEndDate?: string
): Promise<CurrencyRevaluation[]> {
  let query = 'SELECT * FROM currency_revaluations WHERE company_id = ?';
  const params: any[] = [companyId];

  if (periodEndDate) {
    query += ' AND period_end_date = ?';
    params.push(periodEndDate);
  }

  query += ' ORDER BY period_end_date DESC, currency';

  const result = await db.prepare(query).bind(...params).all();
  return (result.results || []) as unknown as CurrencyRevaluation[];
}

/**
 * Get unrealized gain/loss summary
 */
export async function getUnrealizedGainLossSummary(
  db: D1Database,
  companyId: string,
  baseCurrency: string,
  asOfDate: string = new Date().toISOString().split('T')[0]
): Promise<{
  ar_gain_loss: number;
  ap_gain_loss: number;
  total_gain_loss: number;
  by_currency: { currency: string; ar: number; ap: number; total: number }[];
}> {
  const byCurrency: Record<string, { ar: number; ap: number }> = {};

  // Calculate AR unrealized gain/loss
  const arInvoices = await db.prepare(`
    SELECT currency, SUM(total_amount) as total, AVG(exchange_rate) as avg_rate
    FROM customer_invoices
    WHERE company_id = ? AND status != 'paid' AND currency != ?
    GROUP BY currency
  `).bind(companyId, baseCurrency).all();

  for (const row of (arInvoices.results || []) as any[]) {
    const currentRate = await getExchangeRate(db, companyId, row.currency, baseCurrency, asOfDate);
    if (!currentRate) continue;

    const originalValue = row.total * row.avg_rate;
    const currentValue = row.total * currentRate;
    const gainLoss = currentValue - originalValue;

    if (!byCurrency[row.currency]) {
      byCurrency[row.currency] = { ar: 0, ap: 0 };
    }
    byCurrency[row.currency].ar = gainLoss;
  }

  // Calculate AP unrealized gain/loss
  const apInvoices = await db.prepare(`
    SELECT currency, SUM(total_amount) as total, AVG(exchange_rate) as avg_rate
    FROM supplier_invoices
    WHERE company_id = ? AND status != 'paid' AND currency != ?
    GROUP BY currency
  `).bind(companyId, baseCurrency).all();

  for (const row of (apInvoices.results || []) as any[]) {
    const currentRate = await getExchangeRate(db, companyId, row.currency, baseCurrency, asOfDate);
    if (!currentRate) continue;

    const originalValue = row.total * row.avg_rate;
    const currentValue = row.total * currentRate;
    const gainLoss = originalValue - currentValue; // Opposite for AP

    if (!byCurrency[row.currency]) {
      byCurrency[row.currency] = { ar: 0, ap: 0 };
    }
    byCurrency[row.currency].ap = gainLoss;
  }

  const byArray = Object.entries(byCurrency).map(([currency, values]) => ({
    currency,
    ar: Math.round(values.ar * 100) / 100,
    ap: Math.round(values.ap * 100) / 100,
    total: Math.round((values.ar + values.ap) * 100) / 100,
  }));

  const arTotal = byArray.reduce((sum, c) => sum + c.ar, 0);
  const apTotal = byArray.reduce((sum, c) => sum + c.ap, 0);

  return {
    ar_gain_loss: Math.round(arTotal * 100) / 100,
    ap_gain_loss: Math.round(apTotal * 100) / 100,
    total_gain_loss: Math.round((arTotal + apTotal) * 100) / 100,
    by_currency: byArray,
  };
}

export default {
  getCurrencies,
  getCurrency,
  formatCurrency,
  setExchangeRate,
  getExchangeRate,
  convertCurrency,
  listExchangeRates,
  calculateRealizedGainLoss,
  performRevaluation,
  getRevaluationHistory,
  getUnrealizedGainLossSummary,
};
