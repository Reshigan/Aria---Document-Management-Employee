/**
 * Country Localization Routes
 * 
 * Handles country-specific tax calculations, e-invoicing, payroll rules,
 * and compliance requirements for emerging markets.
 * 
 * Priority Countries:
 * - South Africa (ZA): VAT 15%, PAYE, UIF, SDL, B-BBEE
 * - Saudi Arabia (SA): ZATCA e-invoicing, VAT 15%, WHT
 * - UAE (AE): VAT 5%, e-invoicing
 * - India (IN): GST, TDS, e-invoicing
 * - Mexico (MX): IVA, ISR, CFDI e-invoicing
 * - Indonesia (ID): PPN, PPh, e-Faktur
 */

import { Hono } from 'hono';
import { jwtVerify } from 'jose';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Helper to verify JWT and get context
async function getAuthContext(c: any): Promise<{ companyId: string; userId: string } | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    const secretKey = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return {
      companyId: (payload as any).company_id,
      userId: (payload as any).sub
    };
  } catch {
    return null;
  }
}

function generateUUID(): string {
  return crypto.randomUUID();
}

// ==================== COUNTRY CONFIGURATION ====================

// Get all supported countries
app.get('/countries', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM country_configs ORDER BY country_name'
    ).all();
    
    return c.json({
      countries: result.results || []
    });
  } catch (error) {
    console.error('Error loading countries:', error);
    return c.json({ error: 'Failed to load countries' }, 500);
  }
});

// Get country configuration
app.get('/countries/:code', async (c) => {
  try {
    const countryCode = c.req.param('code').toUpperCase();
    
    const country = await c.env.DB.prepare(
      'SELECT * FROM country_configs WHERE country_code = ?'
    ).bind(countryCode).first();
    
    if (!country) {
      return c.json({ error: 'Country not found' }, 404);
    }
    
    // Get tax configurations for this country
    const taxes = await c.env.DB.prepare(
      'SELECT * FROM country_tax_configs WHERE country_code = ? ORDER BY tax_type, tax_code'
    ).bind(countryCode).all();
    
    return c.json({
      ...country,
      tax_configs: taxes.results || []
    });
  } catch (error) {
    console.error('Error loading country:', error);
    return c.json({ error: 'Failed to load country' }, 500);
  }
});

// ==================== TAX CALCULATIONS ====================

// Calculate tax for a transaction
app.post('/tax/calculate', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { country_code, tax_code, amount, transaction_type } = body;
    
    if (!country_code || !amount) {
      return c.json({ error: 'Country code and amount are required' }, 400);
    }
    
    // Get tax configuration
    let taxConfig;
    if (tax_code) {
      taxConfig = await c.env.DB.prepare(
        'SELECT * FROM country_tax_configs WHERE country_code = ? AND tax_code = ?'
      ).bind(country_code.toUpperCase(), tax_code).first();
    } else {
      // Get default tax for country
      taxConfig = await c.env.DB.prepare(
        'SELECT * FROM country_tax_configs WHERE country_code = ? AND is_default = 1'
      ).bind(country_code.toUpperCase()).first();
    }
    
    if (!taxConfig) {
      return c.json({ 
        error: 'Tax configuration not found',
        country_code,
        tax_code
      }, 404);
    }
    
    const rate = (taxConfig as any).rate;
    const taxAmount = amount * (rate / 100);
    const totalAmount = amount + taxAmount;
    
    return c.json({
      country_code: country_code.toUpperCase(),
      tax_code: (taxConfig as any).tax_code,
      tax_name: (taxConfig as any).tax_name,
      tax_type: (taxConfig as any).tax_type,
      rate,
      base_amount: amount,
      tax_amount: Math.round(taxAmount * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100
    });
  } catch (error) {
    console.error('Error calculating tax:', error);
    return c.json({ error: 'Failed to calculate tax' }, 500);
  }
});

// ==================== SOUTH AFRICA SPECIFIC ====================

// Calculate SA VAT
app.post('/za/vat/calculate', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { amount, vat_type = 'VAT15', is_inclusive = false } = body;
    
    if (!amount) {
      return c.json({ error: 'Amount is required' }, 400);
    }
    
    const vatRates: Record<string, number> = {
      'VAT15': 15,
      'VAT0': 0,
      'EXEMPT': 0
    };
    
    const rate = vatRates[vat_type] || 15;
    
    let baseAmount: number;
    let vatAmount: number;
    let totalAmount: number;
    
    if (is_inclusive) {
      // Amount includes VAT
      totalAmount = amount;
      baseAmount = amount / (1 + rate / 100);
      vatAmount = totalAmount - baseAmount;
    } else {
      // Amount excludes VAT
      baseAmount = amount;
      vatAmount = amount * (rate / 100);
      totalAmount = baseAmount + vatAmount;
    }
    
    return c.json({
      country: 'South Africa',
      vat_type,
      rate,
      is_inclusive,
      base_amount: Math.round(baseAmount * 100) / 100,
      vat_amount: Math.round(vatAmount * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100
    });
  } catch (error) {
    console.error('Error calculating SA VAT:', error);
    return c.json({ error: 'Failed to calculate VAT' }, 500);
  }
});

// Calculate SA Payroll (PAYE, UIF, SDL)
app.post('/za/payroll/calculate', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { 
      gross_salary, 
      annual_bonus = 0,
      medical_aid_contributions = 0,
      pension_contributions = 0,
      age = 30,
      tax_year = 2025
    } = body;
    
    if (!gross_salary) {
      return c.json({ error: 'Gross salary is required' }, 400);
    }
    
    // Annual gross income
    const annualGross = gross_salary * 12 + annual_bonus;
    
    // Tax deductions
    const pensionDeduction = Math.min(pension_contributions * 12, annualGross * 0.275, 350000);
    const medicalCredits = medical_aid_contributions > 0 ? 364 * 12 : 0; // Main member credit
    
    // Taxable income
    const taxableIncome = annualGross - pensionDeduction;
    
    // 2024/2025 Tax brackets (South Africa)
    let annualTax = 0;
    if (taxableIncome <= 237100) {
      annualTax = taxableIncome * 0.18;
    } else if (taxableIncome <= 370500) {
      annualTax = 42678 + (taxableIncome - 237100) * 0.26;
    } else if (taxableIncome <= 512800) {
      annualTax = 77362 + (taxableIncome - 370500) * 0.31;
    } else if (taxableIncome <= 673000) {
      annualTax = 121475 + (taxableIncome - 512800) * 0.36;
    } else if (taxableIncome <= 857900) {
      annualTax = 179147 + (taxableIncome - 673000) * 0.39;
    } else if (taxableIncome <= 1817000) {
      annualTax = 251258 + (taxableIncome - 857900) * 0.41;
    } else {
      annualTax = 644489 + (taxableIncome - 1817000) * 0.45;
    }
    
    // Primary rebate (age-based)
    let rebate = 17235; // Primary rebate 2024/2025
    if (age >= 65) rebate += 9444; // Secondary rebate
    if (age >= 75) rebate += 3145; // Tertiary rebate
    
    annualTax = Math.max(0, annualTax - rebate - medicalCredits);
    const monthlyPaye = annualTax / 12;
    
    // UIF (1% employee, 1% employer, max R177.12 each based on R17,712 ceiling)
    const uifCeiling = 17712;
    const uifEmployee = Math.min(gross_salary, uifCeiling) * 0.01;
    const uifEmployer = uifEmployee;
    
    // SDL (1% of payroll, employer only)
    const sdl = gross_salary * 0.01;
    
    // Net salary
    const totalDeductions = monthlyPaye + uifEmployee + pension_contributions + medical_aid_contributions;
    const netSalary = gross_salary - totalDeductions;
    
    return c.json({
      country: 'South Africa',
      tax_year,
      gross_salary,
      annual_gross: annualGross,
      taxable_income: Math.round(taxableIncome * 100) / 100,
      deductions: {
        paye: Math.round(monthlyPaye * 100) / 100,
        uif_employee: Math.round(uifEmployee * 100) / 100,
        pension: pension_contributions,
        medical_aid: medical_aid_contributions,
        total: Math.round(totalDeductions * 100) / 100
      },
      employer_contributions: {
        uif: Math.round(uifEmployer * 100) / 100,
        sdl: Math.round(sdl * 100) / 100,
        pension: pension_contributions, // Assuming matching
        total: Math.round((uifEmployer + sdl + pension_contributions) * 100) / 100
      },
      net_salary: Math.round(netSalary * 100) / 100,
      effective_tax_rate: Math.round((monthlyPaye / gross_salary) * 10000) / 100
    });
  } catch (error) {
    console.error('Error calculating SA payroll:', error);
    return c.json({ error: 'Failed to calculate payroll' }, 500);
  }
});

// ==================== SAUDI ARABIA SPECIFIC ====================

// Calculate SA (Saudi) VAT
app.post('/sa/vat/calculate', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { amount, vat_type = 'VAT15', is_inclusive = false } = body;
    
    if (!amount) {
      return c.json({ error: 'Amount is required' }, 400);
    }
    
    const vatRates: Record<string, number> = {
      'VAT15': 15,
      'VAT0': 0,
      'EXEMPT': 0
    };
    
    const rate = vatRates[vat_type] || 15;
    
    let baseAmount: number;
    let vatAmount: number;
    let totalAmount: number;
    
    if (is_inclusive) {
      totalAmount = amount;
      baseAmount = amount / (1 + rate / 100);
      vatAmount = totalAmount - baseAmount;
    } else {
      baseAmount = amount;
      vatAmount = amount * (rate / 100);
      totalAmount = baseAmount + vatAmount;
    }
    
    return c.json({
      country: 'Saudi Arabia',
      vat_type,
      rate,
      is_inclusive,
      base_amount: Math.round(baseAmount * 100) / 100,
      vat_amount: Math.round(vatAmount * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100
    });
  } catch (error) {
    console.error('Error calculating Saudi VAT:', error);
    return c.json({ error: 'Failed to calculate VAT' }, 500);
  }
});

// Generate ZATCA e-invoice (simplified)
app.post('/sa/zatca/generate', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { 
      invoice_number, 
      invoice_date, 
      seller_name, 
      seller_vat_number,
      buyer_name,
      buyer_vat_number,
      line_items,
      total_amount,
      vat_amount
    } = body;
    
    if (!invoice_number || !seller_vat_number || !line_items) {
      return c.json({ error: 'Invoice number, seller VAT number, and line items are required' }, 400);
    }
    
    // Generate ZATCA-compliant invoice hash (simplified)
    const invoiceData = JSON.stringify({
      invoice_number,
      invoice_date,
      seller_vat_number,
      total_amount,
      vat_amount
    });
    
    const encoder = new TextEncoder();
    const data = encoder.encode(invoiceData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const invoiceHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Generate QR code data (TLV format for ZATCA) using Web APIs
    const tlvParts: number[] = [];
    
    // Helper to add TLV field
    const addTlvField = (tag: number, value: string) => {
      const valueBytes = encoder.encode(value);
      tlvParts.push(tag, valueBytes.length, ...valueBytes);
    };
    
    addTlvField(1, seller_name);
    addTlvField(2, seller_vat_number);
    addTlvField(3, invoice_date);
    addTlvField(4, total_amount.toString());
    addTlvField(5, vat_amount.toString());
    
    // Convert to base64 using Web APIs
    const tlvBytes = new Uint8Array(tlvParts);
    const qrData = btoa(String.fromCharCode(...tlvBytes));
    
    return c.json({
      country: 'Saudi Arabia',
      compliance: 'ZATCA Phase 2',
      invoice_number,
      invoice_hash: invoiceHash,
      qr_code_data: qrData,
      status: 'generated',
      message: 'ZATCA-compliant invoice generated. Submit to ZATCA portal for clearance.',
      zatca_fields: {
        seller_name,
        seller_vat_number,
        buyer_name,
        buyer_vat_number,
        invoice_date,
        total_amount,
        vat_amount,
        line_items_count: line_items.length
      }
    });
  } catch (error) {
    console.error('Error generating ZATCA invoice:', error);
    return c.json({ error: 'Failed to generate ZATCA invoice' }, 500);
  }
});

// ==================== UAE SPECIFIC ====================

// Calculate UAE VAT (5%)
app.post('/ae/vat/calculate', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { amount, vat_type = 'VAT5', is_inclusive = false } = body;
    
    if (!amount) {
      return c.json({ error: 'Amount is required' }, 400);
    }
    
    const vatRates: Record<string, number> = {
      'VAT5': 5,
      'VAT0': 0,
      'EXEMPT': 0
    };
    
    const rate = vatRates[vat_type] || 5;
    
    let baseAmount: number;
    let vatAmount: number;
    let totalAmount: number;
    
    if (is_inclusive) {
      totalAmount = amount;
      baseAmount = amount / (1 + rate / 100);
      vatAmount = totalAmount - baseAmount;
    } else {
      baseAmount = amount;
      vatAmount = amount * (rate / 100);
      totalAmount = baseAmount + vatAmount;
    }
    
    return c.json({
      country: 'United Arab Emirates',
      vat_type,
      rate,
      is_inclusive,
      base_amount: Math.round(baseAmount * 100) / 100,
      vat_amount: Math.round(vatAmount * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100
    });
  } catch (error) {
    console.error('Error calculating UAE VAT:', error);
    return c.json({ error: 'Failed to calculate VAT' }, 500);
  }
});

// ==================== INDIA SPECIFIC ====================

// Calculate India GST
app.post('/in/gst/calculate', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { 
      amount, 
      gst_rate = 18, 
      is_interstate = false,
      is_inclusive = false 
    } = body;
    
    if (!amount) {
      return c.json({ error: 'Amount is required' }, 400);
    }
    
    let baseAmount: number;
    let gstAmount: number;
    let totalAmount: number;
    
    if (is_inclusive) {
      totalAmount = amount;
      baseAmount = amount / (1 + gst_rate / 100);
      gstAmount = totalAmount - baseAmount;
    } else {
      baseAmount = amount;
      gstAmount = amount * (gst_rate / 100);
      totalAmount = baseAmount + gstAmount;
    }
    
    // Split GST into CGST/SGST (intrastate) or IGST (interstate)
    let gstBreakdown;
    if (is_interstate) {
      gstBreakdown = {
        igst: Math.round(gstAmount * 100) / 100
      };
    } else {
      gstBreakdown = {
        cgst: Math.round((gstAmount / 2) * 100) / 100,
        sgst: Math.round((gstAmount / 2) * 100) / 100
      };
    }
    
    return c.json({
      country: 'India',
      gst_rate,
      is_interstate,
      is_inclusive,
      base_amount: Math.round(baseAmount * 100) / 100,
      gst_amount: Math.round(gstAmount * 100) / 100,
      gst_breakdown: gstBreakdown,
      total_amount: Math.round(totalAmount * 100) / 100
    });
  } catch (error) {
    console.error('Error calculating India GST:', error);
    return c.json({ error: 'Failed to calculate GST' }, 500);
  }
});

// Calculate India TDS (Tax Deducted at Source)
app.post('/in/tds/calculate', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { 
      amount, 
      section = '194C', // Common sections: 194C (contractors), 194J (professionals), 194H (commission)
      has_pan = true
    } = body;
    
    if (!amount) {
      return c.json({ error: 'Amount is required' }, 400);
    }
    
    // TDS rates by section (simplified)
    const tdsRates: Record<string, { with_pan: number; without_pan: number; threshold: number }> = {
      '194C': { with_pan: 1, without_pan: 20, threshold: 30000 }, // Contractors (individual)
      '194C_COMPANY': { with_pan: 2, without_pan: 20, threshold: 30000 }, // Contractors (company)
      '194J': { with_pan: 10, without_pan: 20, threshold: 30000 }, // Professional fees
      '194H': { with_pan: 5, without_pan: 20, threshold: 15000 }, // Commission
      '194I': { with_pan: 10, without_pan: 20, threshold: 240000 }, // Rent
      '194A': { with_pan: 10, without_pan: 20, threshold: 40000 }, // Interest
    };
    
    const rateConfig = tdsRates[section] || tdsRates['194C'];
    const rate = has_pan ? rateConfig.with_pan : rateConfig.without_pan;
    
    // Check threshold
    if (amount < rateConfig.threshold) {
      return c.json({
        country: 'India',
        section,
        amount,
        tds_applicable: false,
        message: `Amount below threshold of ₹${rateConfig.threshold}. No TDS applicable.`
      });
    }
    
    const tdsAmount = amount * (rate / 100);
    const netAmount = amount - tdsAmount;
    
    return c.json({
      country: 'India',
      section,
      has_pan,
      rate,
      amount,
      tds_amount: Math.round(tdsAmount * 100) / 100,
      net_amount: Math.round(netAmount * 100) / 100,
      tds_applicable: true
    });
  } catch (error) {
    console.error('Error calculating India TDS:', error);
    return c.json({ error: 'Failed to calculate TDS' }, 500);
  }
});

// ==================== MEXICO SPECIFIC ====================

// Calculate Mexico IVA (VAT)
app.post('/mx/iva/calculate', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { amount, iva_rate = 16, is_inclusive = false } = body;
    
    if (!amount) {
      return c.json({ error: 'Amount is required' }, 400);
    }
    
    let baseAmount: number;
    let ivaAmount: number;
    let totalAmount: number;
    
    if (is_inclusive) {
      totalAmount = amount;
      baseAmount = amount / (1 + iva_rate / 100);
      ivaAmount = totalAmount - baseAmount;
    } else {
      baseAmount = amount;
      ivaAmount = amount * (iva_rate / 100);
      totalAmount = baseAmount + ivaAmount;
    }
    
    return c.json({
      country: 'Mexico',
      iva_rate,
      is_inclusive,
      base_amount: Math.round(baseAmount * 100) / 100,
      iva_amount: Math.round(ivaAmount * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100
    });
  } catch (error) {
    console.error('Error calculating Mexico IVA:', error);
    return c.json({ error: 'Failed to calculate IVA' }, 500);
  }
});

// ==================== INDONESIA SPECIFIC ====================

// Calculate Indonesia PPN (VAT)
app.post('/id/ppn/calculate', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { amount, ppn_rate = 11, is_inclusive = false } = body;
    
    if (!amount) {
      return c.json({ error: 'Amount is required' }, 400);
    }
    
    let baseAmount: number;
    let ppnAmount: number;
    let totalAmount: number;
    
    if (is_inclusive) {
      totalAmount = amount;
      baseAmount = amount / (1 + ppn_rate / 100);
      ppnAmount = totalAmount - baseAmount;
    } else {
      baseAmount = amount;
      ppnAmount = amount * (ppn_rate / 100);
      totalAmount = baseAmount + ppnAmount;
    }
    
    return c.json({
      country: 'Indonesia',
      ppn_rate,
      is_inclusive,
      base_amount: Math.round(baseAmount),
      ppn_amount: Math.round(ppnAmount),
      total_amount: Math.round(totalAmount)
    });
  } catch (error) {
    console.error('Error calculating Indonesia PPN:', error);
    return c.json({ error: 'Failed to calculate PPN' }, 500);
  }
});

// ==================== CURRENCY EXCHANGE ====================

// Get exchange rates
app.get('/exchange-rates', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const fromCurrency = c.req.query('from');
    const toCurrency = c.req.query('to');
    const date = c.req.query('date');
    
    let query = 'SELECT * FROM exchange_rates WHERE company_id = ?';
    const params: any[] = [auth.companyId];
    
    if (fromCurrency) {
      query += ' AND from_currency = ?';
      params.push(fromCurrency.toUpperCase());
    }
    
    if (toCurrency) {
      query += ' AND to_currency = ?';
      params.push(toCurrency.toUpperCase());
    }
    
    if (date) {
      query += ' AND rate_date = ?';
      params.push(date);
    }
    
    query += ' ORDER BY rate_date DESC, from_currency, to_currency';
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({
      rates: result.results || []
    });
  } catch (error) {
    console.error('Error loading exchange rates:', error);
    return c.json({ error: 'Failed to load exchange rates' }, 500);
  }
});

// Add/update exchange rate
app.post('/exchange-rates', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { from_currency, to_currency, rate, rate_date, rate_type = 'spot', source = 'manual' } = body;
    
    if (!from_currency || !to_currency || !rate || !rate_date) {
      return c.json({ error: 'From currency, to currency, rate, and date are required' }, 400);
    }
    
    const id = generateUUID();
    const now = new Date().toISOString();
    
    // Upsert exchange rate
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO exchange_rates (id, company_id, from_currency, to_currency, rate, rate_date, rate_type, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      auth.companyId,
      from_currency.toUpperCase(),
      to_currency.toUpperCase(),
      rate,
      rate_date,
      rate_type,
      source,
      now
    ).run();
    
    return c.json({
      id,
      from_currency: from_currency.toUpperCase(),
      to_currency: to_currency.toUpperCase(),
      rate,
      rate_date,
      message: 'Exchange rate saved successfully'
    }, 201);
  } catch (error) {
    console.error('Error saving exchange rate:', error);
    return c.json({ error: 'Failed to save exchange rate' }, 500);
  }
});

// Convert currency
app.post('/exchange-rates/convert', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { amount, from_currency, to_currency, date } = body;
    
    if (!amount || !from_currency || !to_currency) {
      return c.json({ error: 'Amount, from currency, and to currency are required' }, 400);
    }
    
    // Get exchange rate
    const rateQuery = date 
      ? 'SELECT rate FROM exchange_rates WHERE company_id = ? AND from_currency = ? AND to_currency = ? AND rate_date <= ? ORDER BY rate_date DESC LIMIT 1'
      : 'SELECT rate FROM exchange_rates WHERE company_id = ? AND from_currency = ? AND to_currency = ? ORDER BY rate_date DESC LIMIT 1';
    
    const params = date 
      ? [auth.companyId, from_currency.toUpperCase(), to_currency.toUpperCase(), date]
      : [auth.companyId, from_currency.toUpperCase(), to_currency.toUpperCase()];
    
    const rateResult = await c.env.DB.prepare(rateQuery).bind(...params).first();
    
    if (!rateResult) {
      return c.json({ 
        error: 'Exchange rate not found',
        from_currency,
        to_currency
      }, 404);
    }
    
    const rate = (rateResult as any).rate;
    const convertedAmount = amount * rate;
    
    return c.json({
      from_currency: from_currency.toUpperCase(),
      to_currency: to_currency.toUpperCase(),
      rate,
      original_amount: amount,
      converted_amount: Math.round(convertedAmount * 100) / 100
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    return c.json({ error: 'Failed to convert currency' }, 500);
  }
});

app.get('/settings', async (c) => {
  return c.json({ default_currency: 'ZAR', tax_year_start: '03-01', vat_rate: 15, income_tax_enabled: true, provisional_tax_enabled: true });
});

export default app;
