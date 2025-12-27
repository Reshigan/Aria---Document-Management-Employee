// Payroll & HR Statutory Reporting Service

import { D1Database } from '@cloudflare/workers-types';

interface PayrollConfig {
  id: string;
  company_id: string;
  country: string;
  pay_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  pay_day: number;
  tax_year_start?: string;
  currency: string;
  overtime_multiplier: number;
  statutory_deductions?: StatutoryDeduction[];
  employer_contributions?: EmployerContribution[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface StatutoryDeduction {
  code: string;
  name: string;
  type: 'percentage' | 'fixed' | 'tiered';
  rate?: number;
  tiers?: Array<{ min: number; max: number; rate: number }>;
  cap?: number;
  employee_portion: number;
  employer_portion: number;
}

interface EmployerContribution {
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  rate: number;
  cap?: number;
}

interface EmployeePayroll {
  id: string;
  company_id: string;
  employee_id: string;
  pay_type: 'salary' | 'hourly' | 'commission';
  base_salary?: number;
  hourly_rate?: number;
  pay_frequency?: string;
  bank_account_name?: string;
  bank_account_number_encrypted?: string;
  bank_routing_number?: string;
  tax_id_encrypted?: string;
  tax_filing_status?: string;
  allowances: number;
  additional_withholding: number;
  deductions?: VoluntaryDeduction[];
  benefits?: Benefit[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VoluntaryDeduction {
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  amount: number;
  pre_tax: boolean;
}

interface Benefit {
  code: string;
  name: string;
  employee_cost: number;
  employer_cost: number;
}

interface PayrollRun {
  id: string;
  company_id: string;
  config_id: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: 'draft' | 'calculated' | 'approved' | 'paid' | 'cancelled';
  total_gross: number;
  total_deductions: number;
  total_employer_cost: number;
  total_net: number;
  employee_count: number;
  approved_by?: string;
  approved_at?: string;
  paid_at?: string;
  journal_entry_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface PayrollItem {
  id: string;
  company_id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_payroll_id: string;
  regular_hours: number;
  overtime_hours: number;
  gross_pay: number;
  deductions: DeductionBreakdown;
  employer_contributions: ContributionBreakdown;
  net_pay: number;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed';
  payment_reference?: string;
  created_at: string;
}

interface DeductionBreakdown {
  federal_tax: number;
  state_tax: number;
  social_security: number;
  medicare: number;
  voluntary: Array<{ code: string; amount: number }>;
  total: number;
}

interface ContributionBreakdown {
  social_security: number;
  medicare: number;
  unemployment: number;
  benefits: Array<{ code: string; amount: number }>;
  total: number;
}

// Country-specific tax configurations
const TAX_CONFIGS: Record<string, { brackets: Array<{ min: number; max: number; rate: number }>; standard_deduction: number }> = {
  US: {
    brackets: [
      { min: 0, max: 11600, rate: 0.10 },
      { min: 11600, max: 47150, rate: 0.12 },
      { min: 47150, max: 100525, rate: 0.22 },
      { min: 100525, max: 191950, rate: 0.24 },
      { min: 191950, max: 243725, rate: 0.32 },
      { min: 243725, max: 609350, rate: 0.35 },
      { min: 609350, max: Infinity, rate: 0.37 }
    ],
    standard_deduction: 14600
  },
  ZA: {
    brackets: [
      { min: 0, max: 237100, rate: 0.18 },
      { min: 237100, max: 370500, rate: 0.26 },
      { min: 370500, max: 512800, rate: 0.31 },
      { min: 512800, max: 673000, rate: 0.36 },
      { min: 673000, max: 857900, rate: 0.39 },
      { min: 857900, max: 1817000, rate: 0.41 },
      { min: 1817000, max: Infinity, rate: 0.45 }
    ],
    standard_deduction: 0
  },
  GB: {
    brackets: [
      { min: 0, max: 12570, rate: 0 },
      { min: 12570, max: 50270, rate: 0.20 },
      { min: 50270, max: 125140, rate: 0.40 },
      { min: 125140, max: Infinity, rate: 0.45 }
    ],
    standard_deduction: 12570
  }
};

// Create payroll configuration
export async function createPayrollConfig(
  db: D1Database,
  input: Omit<PayrollConfig, 'id' | 'created_at' | 'updated_at' | 'is_active'>
): Promise<PayrollConfig> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO payroll_configs (
      id, company_id, country, pay_frequency, pay_day, tax_year_start,
      currency, overtime_multiplier, statutory_deductions, employer_contributions,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.country,
    input.pay_frequency,
    input.pay_day,
    input.tax_year_start || null,
    input.currency || 'USD',
    input.overtime_multiplier || 1.5,
    input.statutory_deductions ? JSON.stringify(input.statutory_deductions) : null,
    input.employer_contributions ? JSON.stringify(input.employer_contributions) : null,
    now,
    now
  ).run();
  
  return {
    id,
    ...input,
    is_active: true,
    created_at: now,
    updated_at: now
  };
}

// Get payroll config
export async function getPayrollConfig(db: D1Database, configId: string): Promise<PayrollConfig | null> {
  const result = await db.prepare(`
    SELECT * FROM payroll_configs WHERE id = ?
  `).bind(configId).first();
  
  if (!result) return null;
  
  return {
    ...result,
    statutory_deductions: result.statutory_deductions ? JSON.parse(result.statutory_deductions as string) : undefined,
    employer_contributions: result.employer_contributions ? JSON.parse(result.employer_contributions as string) : undefined,
    is_active: Boolean(result.is_active)
  } as PayrollConfig;
}

// Create employee payroll record
export async function createEmployeePayroll(
  db: D1Database,
  input: Omit<EmployeePayroll, 'id' | 'created_at' | 'updated_at' | 'is_active'>
): Promise<EmployeePayroll> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO employee_payroll (
      id, company_id, employee_id, pay_type, base_salary, hourly_rate,
      pay_frequency, bank_account_name, bank_account_number_encrypted,
      bank_routing_number, tax_id_encrypted, tax_filing_status, allowances,
      additional_withholding, deductions, benefits, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.employee_id,
    input.pay_type,
    input.base_salary || null,
    input.hourly_rate || null,
    input.pay_frequency || null,
    input.bank_account_name || null,
    input.bank_account_number_encrypted || null,
    input.bank_routing_number || null,
    input.tax_id_encrypted || null,
    input.tax_filing_status || null,
    input.allowances || 0,
    input.additional_withholding || 0,
    input.deductions ? JSON.stringify(input.deductions) : null,
    input.benefits ? JSON.stringify(input.benefits) : null,
    now,
    now
  ).run();
  
  return {
    id,
    ...input,
    is_active: true,
    created_at: now,
    updated_at: now
  };
}

// Get employee payroll
export async function getEmployeePayroll(db: D1Database, employeeId: string): Promise<EmployeePayroll | null> {
  const result = await db.prepare(`
    SELECT * FROM employee_payroll WHERE employee_id = ? AND is_active = 1
  `).bind(employeeId).first();
  
  if (!result) return null;
  
  return {
    ...result,
    deductions: result.deductions ? JSON.parse(result.deductions as string) : undefined,
    benefits: result.benefits ? JSON.parse(result.benefits as string) : undefined,
    is_active: Boolean(result.is_active)
  } as EmployeePayroll;
}

// Calculate income tax
function calculateIncomeTax(annualIncome: number, country: string): number {
  const config = TAX_CONFIGS[country] || TAX_CONFIGS.US;
  const taxableIncome = Math.max(0, annualIncome - config.standard_deduction);
  
  let tax = 0;
  let remainingIncome = taxableIncome;
  
  for (const bracket of config.brackets) {
    if (remainingIncome <= 0) break;
    
    const taxableInBracket = Math.min(remainingIncome, bracket.max - bracket.min);
    tax += taxableInBracket * bracket.rate;
    remainingIncome -= taxableInBracket;
  }
  
  return tax;
}

// Calculate payroll for an employee
export function calculateEmployeePay(
  employee: EmployeePayroll,
  config: PayrollConfig,
  regularHours: number,
  overtimeHours: number = 0
): {
  gross_pay: number;
  deductions: DeductionBreakdown;
  employer_contributions: ContributionBreakdown;
  net_pay: number;
} {
  // Calculate gross pay
  let grossPay: number;
  
  if (employee.pay_type === 'salary') {
    // Convert annual salary to period pay
    const periodsPerYear = config.pay_frequency === 'weekly' ? 52 :
      config.pay_frequency === 'biweekly' ? 26 :
      config.pay_frequency === 'semimonthly' ? 24 : 12;
    grossPay = (employee.base_salary || 0) / periodsPerYear;
  } else {
    // Hourly calculation
    const regularPay = regularHours * (employee.hourly_rate || 0);
    const overtimePay = overtimeHours * (employee.hourly_rate || 0) * config.overtime_multiplier;
    grossPay = regularPay + overtimePay;
  }
  
  // Calculate annual equivalent for tax purposes
  const periodsPerYear = config.pay_frequency === 'weekly' ? 52 :
    config.pay_frequency === 'biweekly' ? 26 :
    config.pay_frequency === 'semimonthly' ? 24 : 12;
  const annualGross = grossPay * periodsPerYear;
  
  // Calculate deductions
  const federalTax = calculateIncomeTax(annualGross, config.country) / periodsPerYear;
  const stateTax = grossPay * 0.05; // Simplified state tax
  
  // Social Security (6.2% up to $168,600 for 2024)
  const socialSecurityRate = 0.062;
  const socialSecurityCap = 168600;
  const socialSecurity = Math.min(grossPay * socialSecurityRate, (socialSecurityCap / periodsPerYear) * socialSecurityRate);
  
  // Medicare (1.45%)
  const medicareRate = 0.0145;
  const medicare = grossPay * medicareRate;
  
  // Voluntary deductions
  const voluntaryDeductions: Array<{ code: string; amount: number }> = [];
  let voluntaryTotal = 0;
  
  if (employee.deductions) {
    for (const deduction of employee.deductions) {
      const amount = deduction.type === 'percentage' 
        ? grossPay * (deduction.amount / 100)
        : deduction.amount;
      voluntaryDeductions.push({ code: deduction.code, amount });
      voluntaryTotal += amount;
    }
  }
  
  const totalDeductions = federalTax + stateTax + socialSecurity + medicare + voluntaryTotal + employee.additional_withholding;
  
  // Employer contributions
  const employerSocialSecurity = socialSecurity; // Employer matches
  const employerMedicare = medicare; // Employer matches
  const unemploymentRate = 0.006; // FUTA
  const unemployment = Math.min(grossPay * unemploymentRate, 7000 / periodsPerYear * unemploymentRate);
  
  const benefitContributions: Array<{ code: string; amount: number }> = [];
  let benefitTotal = 0;
  
  if (employee.benefits) {
    for (const benefit of employee.benefits) {
      benefitContributions.push({ code: benefit.code, amount: benefit.employer_cost });
      benefitTotal += benefit.employer_cost;
    }
  }
  
  const totalEmployerContributions = employerSocialSecurity + employerMedicare + unemployment + benefitTotal;
  
  return {
    gross_pay: Math.round(grossPay * 100) / 100,
    deductions: {
      federal_tax: Math.round(federalTax * 100) / 100,
      state_tax: Math.round(stateTax * 100) / 100,
      social_security: Math.round(socialSecurity * 100) / 100,
      medicare: Math.round(medicare * 100) / 100,
      voluntary: voluntaryDeductions,
      total: Math.round(totalDeductions * 100) / 100
    },
    employer_contributions: {
      social_security: Math.round(employerSocialSecurity * 100) / 100,
      medicare: Math.round(employerMedicare * 100) / 100,
      unemployment: Math.round(unemployment * 100) / 100,
      benefits: benefitContributions,
      total: Math.round(totalEmployerContributions * 100) / 100
    },
    net_pay: Math.round((grossPay - totalDeductions) * 100) / 100
  };
}

// Create a payroll run
export async function createPayrollRun(
  db: D1Database,
  input: {
    company_id: string;
    config_id: string;
    pay_period_start: string;
    pay_period_end: string;
    pay_date: string;
    notes?: string;
  }
): Promise<PayrollRun> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO payroll_runs (
      id, company_id, config_id, pay_period_start, pay_period_end, pay_date,
      status, total_gross, total_deductions, total_employer_cost, total_net,
      employee_count, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'draft', 0, 0, 0, 0, 0, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.config_id,
    input.pay_period_start,
    input.pay_period_end,
    input.pay_date,
    input.notes || null,
    now,
    now
  ).run();
  
  return {
    id,
    company_id: input.company_id,
    config_id: input.config_id,
    pay_period_start: input.pay_period_start,
    pay_period_end: input.pay_period_end,
    pay_date: input.pay_date,
    status: 'draft',
    total_gross: 0,
    total_deductions: 0,
    total_employer_cost: 0,
    total_net: 0,
    employee_count: 0,
    notes: input.notes,
    created_at: now,
    updated_at: now
  };
}

// Calculate payroll run
export async function calculatePayrollRun(
  db: D1Database,
  payrollRunId: string,
  timeEntries: Array<{ employee_id: string; regular_hours: number; overtime_hours: number }>
): Promise<PayrollRun> {
  const run = await db.prepare(`
    SELECT * FROM payroll_runs WHERE id = ?
  `).bind(payrollRunId).first<PayrollRun>();
  
  if (!run) throw new Error('Payroll run not found');
  
  const config = await getPayrollConfig(db, run.config_id);
  if (!config) throw new Error('Payroll config not found');
  
  let totalGross = 0;
  let totalDeductions = 0;
  let totalEmployerCost = 0;
  let totalNet = 0;
  let employeeCount = 0;
  
  const now = new Date().toISOString();
  
  for (const entry of timeEntries) {
    const employeePayroll = await getEmployeePayroll(db, entry.employee_id);
    if (!employeePayroll) continue;
    
    const calculation = calculateEmployeePay(
      employeePayroll,
      config,
      entry.regular_hours,
      entry.overtime_hours
    );
    
    // Create payroll item
    const itemId = crypto.randomUUID();
    
    await db.prepare(`
      INSERT INTO payroll_items (
        id, company_id, payroll_run_id, employee_id, employee_payroll_id,
        regular_hours, overtime_hours, gross_pay, deductions, employer_contributions,
        net_pay, payment_method, payment_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'direct_deposit', 'pending', ?)
    `).bind(
      itemId,
      run.company_id,
      payrollRunId,
      entry.employee_id,
      employeePayroll.id,
      entry.regular_hours,
      entry.overtime_hours,
      calculation.gross_pay,
      JSON.stringify(calculation.deductions),
      JSON.stringify(calculation.employer_contributions),
      calculation.net_pay,
      now
    ).run();
    
    totalGross += calculation.gross_pay;
    totalDeductions += calculation.deductions.total;
    totalEmployerCost += calculation.employer_contributions.total;
    totalNet += calculation.net_pay;
    employeeCount++;
  }
  
  // Update payroll run
  await db.prepare(`
    UPDATE payroll_runs 
    SET status = 'calculated', total_gross = ?, total_deductions = ?,
        total_employer_cost = ?, total_net = ?, employee_count = ?, updated_at = ?
    WHERE id = ?
  `).bind(totalGross, totalDeductions, totalEmployerCost, totalNet, employeeCount, now, payrollRunId).run();
  
  return {
    ...run,
    status: 'calculated',
    total_gross: totalGross,
    total_deductions: totalDeductions,
    total_employer_cost: totalEmployerCost,
    total_net: totalNet,
    employee_count: employeeCount,
    updated_at: now
  };
}

// Approve payroll run
export async function approvePayrollRun(
  db: D1Database,
  payrollRunId: string,
  approvedBy: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE payroll_runs 
    SET status = 'approved', approved_by = ?, approved_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(approvedBy, now, now, payrollRunId).run();
}

// Process payroll payments
export async function processPayrollPayments(
  db: D1Database,
  payrollRunId: string
): Promise<{ processed: number; failed: number }> {
  const items = await db.prepare(`
    SELECT * FROM payroll_items WHERE payroll_run_id = ? AND payment_status = 'pending'
  `).bind(payrollRunId).all();
  
  let processed = 0;
  let failed = 0;
  const now = new Date().toISOString();
  
  for (const item of items.results || []) {
    // In production, this would initiate actual bank transfers
    // For now, we'll simulate successful payments
    const paymentRef = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    await db.prepare(`
      UPDATE payroll_items 
      SET payment_status = 'paid', payment_reference = ?
      WHERE id = ?
    `).bind(paymentRef, (item as { id: string }).id).run();
    
    processed++;
  }
  
  // Update payroll run status
  await db.prepare(`
    UPDATE payroll_runs SET status = 'paid', paid_at = ?, updated_at = ? WHERE id = ?
  `).bind(now, now, payrollRunId).run();
  
  return { processed, failed };
}

// Get payroll summary
export async function getPayrollSummary(
  db: D1Database,
  companyId: string,
  year: number
): Promise<{
  total_gross: number;
  total_deductions: number;
  total_employer_cost: number;
  total_net: number;
  payroll_runs: number;
  employees_paid: number;
}> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  
  const result = await db.prepare(`
    SELECT 
      COALESCE(SUM(total_gross), 0) as total_gross,
      COALESCE(SUM(total_deductions), 0) as total_deductions,
      COALESCE(SUM(total_employer_cost), 0) as total_employer_cost,
      COALESCE(SUM(total_net), 0) as total_net,
      COUNT(*) as payroll_runs,
      COALESCE(SUM(employee_count), 0) as employees_paid
    FROM payroll_runs 
    WHERE company_id = ? 
      AND pay_date BETWEEN ? AND ?
      AND status IN ('approved', 'paid')
  `).bind(companyId, yearStart, yearEnd).first();
  
  return result as {
    total_gross: number;
    total_deductions: number;
    total_employer_cost: number;
    total_net: number;
    payroll_runs: number;
    employees_paid: number;
  };
}

// Generate pay stub
export async function generatePayStub(
  db: D1Database,
  payrollItemId: string
): Promise<{
  employee_name: string;
  pay_period: string;
  pay_date: string;
  earnings: Array<{ description: string; hours?: number; rate?: number; amount: number }>;
  deductions: Array<{ description: string; amount: number }>;
  employer_contributions: Array<{ description: string; amount: number }>;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  ytd_gross: number;
  ytd_deductions: number;
  ytd_net: number;
}> {
  const item = await db.prepare(`
    SELECT pi.*, pr.pay_period_start, pr.pay_period_end, pr.pay_date
    FROM payroll_items pi
    JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
    WHERE pi.id = ?
  `).bind(payrollItemId).first();
  
  if (!item) throw new Error('Payroll item not found');
  
  const employee = await db.prepare(`
    SELECT name FROM employees WHERE id = ?
  `).bind((item as { employee_id: string }).employee_id).first<{ name: string }>();
  
  const deductions = JSON.parse((item as { deductions: string }).deductions) as DeductionBreakdown;
  const contributions = JSON.parse((item as { employer_contributions: string }).employer_contributions) as ContributionBreakdown;
  
  // Calculate YTD
  const yearStart = `${new Date((item as { pay_date: string }).pay_date).getFullYear()}-01-01`;
  const ytd = await db.prepare(`
    SELECT 
      COALESCE(SUM(gross_pay), 0) as ytd_gross,
      COALESCE(SUM(CAST(json_extract(deductions, '$.total') AS REAL)), 0) as ytd_deductions,
      COALESCE(SUM(net_pay), 0) as ytd_net
    FROM payroll_items pi
    JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
    WHERE pi.employee_id = ? AND pr.pay_date >= ? AND pr.pay_date <= ?
  `).bind(
    (item as { employee_id: string }).employee_id,
    yearStart,
    (item as { pay_date: string }).pay_date
  ).first();
  
  return {
    employee_name: employee?.name || 'Unknown',
    pay_period: `${(item as { pay_period_start: string }).pay_period_start} - ${(item as { pay_period_end: string }).pay_period_end}`,
    pay_date: (item as { pay_date: string }).pay_date,
    earnings: [
      { description: 'Regular Hours', hours: (item as { regular_hours: number }).regular_hours, amount: (item as { gross_pay: number }).gross_pay },
      ...(item as { overtime_hours: number }).overtime_hours > 0 ? [{ description: 'Overtime Hours', hours: (item as { overtime_hours: number }).overtime_hours, amount: 0 }] : []
    ],
    deductions: [
      { description: 'Federal Tax', amount: deductions.federal_tax },
      { description: 'State Tax', amount: deductions.state_tax },
      { description: 'Social Security', amount: deductions.social_security },
      { description: 'Medicare', amount: deductions.medicare },
      ...deductions.voluntary.map(v => ({ description: v.code, amount: v.amount }))
    ],
    employer_contributions: [
      { description: 'Social Security (Employer)', amount: contributions.social_security },
      { description: 'Medicare (Employer)', amount: contributions.medicare },
      { description: 'Unemployment', amount: contributions.unemployment },
      ...contributions.benefits.map(b => ({ description: b.code, amount: b.amount }))
    ],
    gross_pay: (item as { gross_pay: number }).gross_pay,
    total_deductions: deductions.total,
    net_pay: (item as { net_pay: number }).net_pay,
    ytd_gross: (ytd as { ytd_gross: number })?.ytd_gross || 0,
    ytd_deductions: (ytd as { ytd_deductions: number })?.ytd_deductions || 0,
    ytd_net: (ytd as { ytd_net: number })?.ytd_net || 0
  };
}
