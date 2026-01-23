/**
 * Customer Statement Service
 * 
 * Provides functionality for:
 * - Generating customer statements
 * - Statement PDF generation
 * - Email delivery of statements
 * - Statement history tracking
 */

import { D1Database } from '@cloudflare/workers-types';

export interface StatementLine {
  date: string;
  type: 'invoice' | 'payment' | 'credit_note' | 'opening_balance';
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface CustomerStatement {
  id: string;
  company_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  statement_date: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  total_invoiced: number;
  total_payments: number;
  total_credits: number;
  closing_balance: number;
  lines: StatementLine[];
  generated_at: string;
  sent_at: string | null;
  sent_to: string | null;
}

export interface StatementRecord {
  id: string;
  company_id: string;
  customer_id: string;
  statement_date: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  closing_balance: number;
  pdf_url: string | null;
  sent_at: string | null;
  sent_to: string | null;
  created_at: string;
}

// Generate a customer statement
export async function generateStatement(
  db: D1Database,
  companyId: string,
  customerId: string,
  periodStart: string,
  periodEnd: string
): Promise<CustomerStatement> {
  const statementDate = new Date().toISOString().split('T')[0];
  
  // Get customer details
  const customer = await db.prepare(`
    SELECT id, customer_name, email, address, phone
    FROM customers
    WHERE id = ? AND company_id = ?
  `).bind(customerId, companyId).first<any>();
  
  if (!customer) {
    throw new Error('Customer not found');
  }
  
  // Calculate opening balance (sum of all transactions before period_start)
  const openingBalanceResult = await db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'invoice' THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN type IN ('payment', 'credit_note') THEN amount ELSE 0 END), 0) as balance
    FROM (
      SELECT 'invoice' as type, total_amount as amount, invoice_date as txn_date
      FROM customer_invoices
      WHERE customer_id = ? AND company_id = ? AND invoice_date < ?
        AND status NOT IN ('draft', 'cancelled')
      UNION ALL
      SELECT 'payment' as type, amount, payment_date as txn_date
      FROM payment_transactions
      WHERE payer_reference = ? AND company_id = ? AND payment_date < ?
        AND status = 'completed'
      UNION ALL
      SELECT 'credit_note' as type, total_amount as amount, credit_date as txn_date
      FROM credit_notes
      WHERE customer_id = ? AND company_id = ? AND credit_date < ?
        AND status = 'applied'
    )
  `).bind(
    customerId, companyId, periodStart,
    customerId, companyId, periodStart,
    customerId, companyId, periodStart
  ).first<{ balance: number }>();
  
  const openingBalance = openingBalanceResult?.balance || 0;
  
  // Get all transactions in the period
  const invoices = await db.prepare(`
    SELECT id, invoice_number, invoice_date, total_amount, notes
    FROM customer_invoices
    WHERE customer_id = ? AND company_id = ?
      AND invoice_date >= ? AND invoice_date <= ?
      AND status NOT IN ('draft', 'cancelled')
    ORDER BY invoice_date
  `).bind(customerId, companyId, periodStart, periodEnd).all();
  
  const payments = await db.prepare(`
    SELECT id, payer_reference as reference, payment_date, amount, payment_method
    FROM payment_transactions
    WHERE payer_reference = ? AND company_id = ?
      AND payment_date >= ? AND payment_date <= ?
      AND status = 'completed'
    ORDER BY payment_date
  `).bind(customerId, companyId, periodStart, periodEnd).all();
  
  const creditNotes = await db.prepare(`
    SELECT id, credit_note_number, credit_date, total_amount, reason
    FROM credit_notes
    WHERE customer_id = ? AND company_id = ?
      AND credit_date >= ? AND credit_date <= ?
      AND status = 'applied'
    ORDER BY credit_date
  `).bind(customerId, companyId, periodStart, periodEnd).all();
  
  // Build statement lines
  const lines: StatementLine[] = [];
  let runningBalance = openingBalance;
  
  // Add opening balance line
  if (openingBalance !== 0) {
    lines.push({
      date: periodStart,
      type: 'opening_balance',
      reference: '-',
      description: 'Opening Balance',
      debit: openingBalance > 0 ? openingBalance : 0,
      credit: openingBalance < 0 ? -openingBalance : 0,
      balance: runningBalance
    });
  }
  
  // Combine and sort all transactions
  const allTransactions: Array<{
    date: string;
    type: 'invoice' | 'payment' | 'credit_note';
    reference: string;
    description: string;
    amount: number;
  }> = [];
  
  for (const inv of (invoices.results || []) as any[]) {
    allTransactions.push({
      date: inv.invoice_date,
      type: 'invoice',
      reference: inv.invoice_number,
      description: inv.notes || `Invoice ${inv.invoice_number}`,
      amount: inv.total_amount
    });
  }
  
  for (const pmt of (payments.results || []) as any[]) {
    allTransactions.push({
      date: pmt.payment_date,
      type: 'payment',
      reference: pmt.reference || 'Payment',
      description: `Payment received - ${pmt.payment_method || 'Unknown'}`,
      amount: pmt.amount
    });
  }
  
  for (const cn of (creditNotes.results || []) as any[]) {
    allTransactions.push({
      date: cn.credit_date,
      type: 'credit_note',
      reference: cn.credit_note_number,
      description: cn.reason || `Credit Note ${cn.credit_note_number}`,
      amount: cn.total_amount
    });
  }
  
  // Sort by date
  allTransactions.sort((a, b) => a.date.localeCompare(b.date));
  
  // Calculate totals and build lines
  let totalInvoiced = 0;
  let totalPayments = 0;
  let totalCredits = 0;
  
  for (const txn of allTransactions) {
    if (txn.type === 'invoice') {
      runningBalance += txn.amount;
      totalInvoiced += txn.amount;
      lines.push({
        date: txn.date,
        type: txn.type,
        reference: txn.reference,
        description: txn.description,
        debit: txn.amount,
        credit: 0,
        balance: runningBalance
      });
    } else if (txn.type === 'payment') {
      runningBalance -= txn.amount;
      totalPayments += txn.amount;
      lines.push({
        date: txn.date,
        type: txn.type,
        reference: txn.reference,
        description: txn.description,
        debit: 0,
        credit: txn.amount,
        balance: runningBalance
      });
    } else if (txn.type === 'credit_note') {
      runningBalance -= txn.amount;
      totalCredits += txn.amount;
      lines.push({
        date: txn.date,
        type: txn.type,
        reference: txn.reference,
        description: txn.description,
        debit: 0,
        credit: txn.amount,
        balance: runningBalance
      });
    }
  }
  
  const statement: CustomerStatement = {
    id: crypto.randomUUID(),
    company_id: companyId,
    customer_id: customerId,
    customer_name: customer.customer_name,
    customer_email: customer.email,
    statement_date: statementDate,
    period_start: periodStart,
    period_end: periodEnd,
    opening_balance: openingBalance,
    total_invoiced: totalInvoiced,
    total_payments: totalPayments,
    total_credits: totalCredits,
    closing_balance: runningBalance,
    lines,
    generated_at: new Date().toISOString(),
    sent_at: null,
    sent_to: null
  };
  
  return statement;
}

// Save statement record
export async function saveStatementRecord(
  db: D1Database,
  statement: CustomerStatement,
  pdfUrl?: string
): Promise<void> {
  await db.prepare(`
    INSERT INTO customer_statements (
      id, company_id, customer_id, statement_date, period_start, period_end,
      opening_balance, closing_balance, pdf_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    statement.id,
    statement.company_id,
    statement.customer_id,
    statement.statement_date,
    statement.period_start,
    statement.period_end,
    statement.opening_balance,
    statement.closing_balance,
    pdfUrl || null,
    statement.generated_at
  ).run();
}

// Generate statement HTML for PDF conversion
export function generateStatementHTML(
  statement: CustomerStatement,
  companyInfo: { name: string; address?: string; phone?: string; email?: string; logo_url?: string }
): string {
  const formatCurrency = (amount: number) => `R ${amount.toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-ZA');
  
  const linesHTML = statement.lines.map(line => `
    <tr>
      <td>${formatDate(line.date)}</td>
      <td>${line.type === 'opening_balance' ? 'B/F' : line.type.charAt(0).toUpperCase()}</td>
      <td>${line.reference}</td>
      <td>${line.description}</td>
      <td class="amount">${line.debit > 0 ? formatCurrency(line.debit) : ''}</td>
      <td class="amount">${line.credit > 0 ? formatCurrency(line.credit) : ''}</td>
      <td class="amount">${formatCurrency(line.balance)}</td>
    </tr>
  `).join('');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Customer Statement - ${statement.customer_name}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #333; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .company-info { text-align: left; }
    .company-name { font-size: 24px; font-weight: bold; color: #2563eb; }
    .statement-title { text-align: right; }
    .statement-title h1 { font-size: 28px; margin: 0; color: #1f2937; }
    .customer-info { margin-bottom: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; }
    .period-info { margin-bottom: 20px; }
    .period-info span { margin-right: 30px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #2563eb; color: white; padding: 10px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
    .amount { text-align: right; }
    .summary { margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; }
    .summary-row { display: flex; justify-content: space-between; margin: 5px 0; }
    .summary-total { font-weight: bold; font-size: 16px; border-top: 2px solid #2563eb; padding-top: 10px; margin-top: 10px; }
    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #6b7280; }
    .aging { margin-top: 20px; }
    .aging-table { width: 50%; }
    .aging-table th, .aging-table td { padding: 8px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      ${companyInfo.logo_url ? `<img src="${companyInfo.logo_url}" alt="Logo" style="max-height: 60px;">` : ''}
      <div class="company-name">${companyInfo.name}</div>
      ${companyInfo.address ? `<div>${companyInfo.address}</div>` : ''}
      ${companyInfo.phone ? `<div>Tel: ${companyInfo.phone}</div>` : ''}
      ${companyInfo.email ? `<div>Email: ${companyInfo.email}</div>` : ''}
    </div>
    <div class="statement-title">
      <h1>STATEMENT</h1>
      <div>Date: ${formatDate(statement.statement_date)}</div>
    </div>
  </div>
  
  <div class="customer-info">
    <strong>${statement.customer_name}</strong>
    <div>Customer ID: ${statement.customer_id.substring(0, 8).toUpperCase()}</div>
  </div>
  
  <div class="period-info">
    <span><strong>Period:</strong> ${formatDate(statement.period_start)} to ${formatDate(statement.period_end)}</span>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Reference</th>
        <th>Description</th>
        <th class="amount">Debit</th>
        <th class="amount">Credit</th>
        <th class="amount">Balance</th>
      </tr>
    </thead>
    <tbody>
      ${linesHTML}
    </tbody>
  </table>
  
  <div class="summary">
    <div class="summary-row">
      <span>Opening Balance:</span>
      <span>${formatCurrency(statement.opening_balance)}</span>
    </div>
    <div class="summary-row">
      <span>Total Invoiced:</span>
      <span>${formatCurrency(statement.total_invoiced)}</span>
    </div>
    <div class="summary-row">
      <span>Total Payments:</span>
      <span>(${formatCurrency(statement.total_payments)})</span>
    </div>
    <div class="summary-row">
      <span>Total Credits:</span>
      <span>(${formatCurrency(statement.total_credits)})</span>
    </div>
    <div class="summary-row summary-total">
      <span>Amount Due:</span>
      <span>${formatCurrency(statement.closing_balance)}</span>
    </div>
  </div>
  
  <div class="footer">
    <p>This statement was generated on ${formatDate(statement.generated_at.split('T')[0])}.</p>
    <p>If you have any questions about this statement, please contact us.</p>
  </div>
</body>
</html>
  `;
}

// Email statement to customer
export async function emailStatement(
  db: D1Database,
  statement: CustomerStatement,
  companyInfo: { name: string; email?: string },
  emailService: { sendEmail: (to: string, subject: string, body: string, html?: string) => Promise<boolean> }
): Promise<{ success: boolean; error?: string }> {
  if (!statement.customer_email) {
    return { success: false, error: 'Customer has no email address' };
  }
  
  const subject = `Statement of Account - ${companyInfo.name} - ${statement.statement_date}`;
  
  const textBody = `
Dear ${statement.customer_name},

Please find attached your statement of account for the period ${statement.period_start} to ${statement.period_end}.

Summary:
- Opening Balance: R ${statement.opening_balance.toFixed(2)}
- Total Invoiced: R ${statement.total_invoiced.toFixed(2)}
- Total Payments: R ${statement.total_payments.toFixed(2)}
- Total Credits: R ${statement.total_credits.toFixed(2)}
- Amount Due: R ${statement.closing_balance.toFixed(2)}

If you have any questions about this statement, please don't hesitate to contact us.

Thank you for your business.

Best regards,
${companyInfo.name}
  `;
  
  const htmlBody = generateStatementHTML(statement, companyInfo);
  
  try {
    const sent = await emailService.sendEmail(statement.customer_email, subject, textBody, htmlBody);
    
    if (sent) {
      // Update statement record
      await db.prepare(`
        UPDATE customer_statements SET sent_at = ?, sent_to = ? WHERE id = ?
      `).bind(new Date().toISOString(), statement.customer_email, statement.id).run();
      
      return { success: true };
    } else {
      return { success: false, error: 'Email service returned false' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get statement history for a customer
export async function getStatementHistory(
  db: D1Database,
  companyId: string,
  customerId: string
): Promise<StatementRecord[]> {
  const result = await db.prepare(`
    SELECT * FROM customer_statements
    WHERE company_id = ? AND customer_id = ?
    ORDER BY statement_date DESC
  `).bind(companyId, customerId).all();
  
  return (result.results || []) as unknown as StatementRecord[];
}

// Bulk generate statements for all customers with balances
export async function bulkGenerateStatements(
  db: D1Database,
  companyId: string,
  periodStart: string,
  periodEnd: string
): Promise<{ generated: number; customers: string[] }> {
  // Get all customers with outstanding balances
  const customers = await db.prepare(`
    SELECT DISTINCT c.id, c.customer_name
    FROM customers c
    INNER JOIN customer_invoices ci ON c.id = ci.customer_id
    WHERE c.company_id = ? AND ci.balance_due > 0
  `).bind(companyId).all();
  
  const generated: string[] = [];
  
  for (const customer of (customers.results || []) as any[]) {
    try {
      const statement = await generateStatement(db, companyId, customer.id, periodStart, periodEnd);
      await saveStatementRecord(db, statement);
      generated.push(customer.customer_name);
    } catch (error) {
      console.error(`Failed to generate statement for ${customer.customer_name}:`, error);
    }
  }
  
  return { generated: generated.length, customers: generated };
}

export default {
  generateStatement,
  saveStatementRecord,
  generateStatementHTML,
  emailStatement,
  getStatementHistory,
  bulkGenerateStatements
};
