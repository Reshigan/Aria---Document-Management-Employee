/**
 * GL Posting Engine
 * 
 * This is the core accounting engine that automatically creates balanced journal entries
 * when subledger transactions are posted (invoices, payments, inventory movements, etc.)
 * 
 * This is what makes ARIA a real ERP vs a demo system.
 */

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

interface PostingContext {
  companyId: string;
  userId: string;
  transactionType: string;
  transactionId: string;
  transactionDate: string;
  description: string;
  reference?: string;
  currency?: string;
  exchangeRate?: number;
}

interface PostingLine {
  accountCode: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  costCenter?: string;
}

interface PostingResult {
  success: boolean;
  journalEntryId?: string;
  journalEntryNumber?: string;
  error?: string;
}

// Generate UUID
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Get the next journal entry number for a company
 */
async function getNextJournalEntryNumber(db: D1Database, companyId: string): Promise<string> {
  const lastEntry = await db.prepare(
    "SELECT entry_number FROM journal_entries WHERE company_id = ? ORDER BY created_at DESC LIMIT 1"
  ).bind(companyId).first();
  
  if (lastEntry && (lastEntry as any).entry_number) {
    const lastNum = parseInt((lastEntry as any).entry_number.replace('JE-', '')) || 0;
    return `JE-${String(lastNum + 1).padStart(6, '0')}`;
  }
  return 'JE-000001';
}

/**
 * Check if a period is open for posting
 */
async function isPeriodOpen(db: D1Database, companyId: string, date: string, module: string): Promise<boolean> {
  const period = date.substring(0, 7); // YYYY-MM
  
  const lock = await db.prepare(
    "SELECT is_locked FROM period_locks WHERE company_id = ? AND period = ? AND module = ?"
  ).bind(companyId, period, module).first();
  
  // If no lock record exists, period is open
  if (!lock) return true;
  
  return (lock as any).is_locked !== 1;
}

/**
 * Get GL account ID by account code
 */
async function getAccountId(db: D1Database, companyId: string, accountCode: string): Promise<string | null> {
  const account = await db.prepare(
    "SELECT id FROM gl_accounts WHERE company_id = ? AND account_code = ?"
  ).bind(companyId, accountCode).first();
  
  return account ? (account as any).id : null;
}

/**
 * Create a journal entry with lines
 */
async function createJournalEntry(
  db: D1Database,
  context: PostingContext,
  lines: PostingLine[]
): Promise<PostingResult> {
  // Validate balanced entry
  const totalDebits = lines.reduce((sum, line) => sum + line.debitAmount, 0);
  const totalCredits = lines.reduce((sum, line) => sum + line.creditAmount, 0);
  
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    return {
      success: false,
      error: `Journal entry not balanced: Debits ${totalDebits.toFixed(2)} != Credits ${totalCredits.toFixed(2)}`
    };
  }
  
  // Check period is open
  const isOpen = await isPeriodOpen(db, context.companyId, context.transactionDate, 'gl');
  if (!isOpen) {
    return {
      success: false,
      error: `Period ${context.transactionDate.substring(0, 7)} is closed for GL posting`
    };
  }
  
  const journalEntryId = generateUUID();
  const entryNumber = await getNextJournalEntryNumber(db, context.companyId);
  const now = new Date().toISOString();
  
  try {
    // Pre-validate all account codes exist before starting any writes
    const accountIds: Map<string, string> = new Map();
    for (const line of lines) {
      if (line.debitAmount === 0 && line.creditAmount === 0) continue;
      if (!accountIds.has(line.accountCode)) {
        const accountId = await getAccountId(db, context.companyId, line.accountCode);
        if (!accountId) {
          return {
            success: false,
            error: `Account ${line.accountCode} not found`
          };
        }
        accountIds.set(line.accountCode, accountId);
      }
    }

    // Use D1 batch() for atomic execution - all statements succeed or all fail
    const batchStatements: D1PreparedStatement[] = [];

    // 1. Insert journal entry header with status = 'pending'
    batchStatements.push(
      db.prepare(`
        INSERT INTO journal_entries (
          id, company_id, entry_number, entry_date, description, 
          reference_type, reference_id, status, total_debit, total_credit,
          posted_by, posted_at, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
      `).bind(
        journalEntryId,
        context.companyId,
        entryNumber,
        context.transactionDate,
        context.description,
        context.transactionType,
        context.transactionId,
        totalDebits,
        totalCredits,
        context.userId,
        now,
        context.userId,
        now
      )
    );

    // 2. Insert all journal entry lines
    let lineNum = 0;
    for (const line of lines) {
      if (line.debitAmount === 0 && line.creditAmount === 0) continue;
      lineNum++;
      const accountId = accountIds.get(line.accountCode)!;
      const lineId = generateUUID();
      
      batchStatements.push(
        db.prepare(`
          INSERT INTO journal_entry_lines (
            id, journal_entry_id, line_number, account_id, description,
            debit_amount, credit_amount, cost_center, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          lineId, journalEntryId, lineNum, accountId,
          line.description, line.debitAmount, line.creditAmount,
          line.costCenter || null, now
        )
      );

      // Update GL account balance
      const balanceChange = line.debitAmount - line.creditAmount;
      batchStatements.push(
        db.prepare(`
          UPDATE gl_accounts 
          SET current_balance = current_balance + ?, updated_at = ?
          WHERE id = ?
        `).bind(balanceChange, now, accountId)
      );
    }

    // 3. Create subledger link
    const linkId = generateUUID();
    batchStatements.push(
      db.prepare(`
        INSERT INTO subledger_gl_links (
          id, company_id, subledger_type, transaction_type, transaction_id, journal_entry_id, posted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        linkId, context.companyId,
        getSubledgerType(context.transactionType),
        context.transactionType, context.transactionId,
        journalEntryId, now
      )
    );

    // 4. Record status change in audit trail
    const historyId = generateUUID();
    batchStatements.push(
      db.prepare(`
        INSERT INTO transaction_status_history (
          id, company_id, transaction_type, transaction_id, from_status, to_status, changed_by, changed_at, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        historyId, context.companyId,
        context.transactionType, context.transactionId,
        'draft', 'posted', context.userId, now,
        'GL posting completed'
      )
    );

    // Execute all statements atomically via D1 batch
    await db.batch(batchStatements);

    // 5. Update header status to 'posted' after successful batch
    await db.prepare(
      "UPDATE journal_entries SET status = 'posted' WHERE id = ?"
    ).bind(journalEntryId).run();
    
    return {
      success: true,
      journalEntryId,
      journalEntryNumber: entryNumber
    };
  } catch (error) {
    console.error('GL Posting Error:', error);
    
    // Compensating transaction: mark header as failed if it was created
    try {
      await db.prepare(
        "UPDATE journal_entries SET status = 'failed', description = description || ' [FAILED: ' || ? || ']' WHERE id = ? AND status = 'pending'"
      ).bind(error instanceof Error ? error.message : 'Unknown error', journalEntryId).run();
      
      // Clean up any partial lines
      await db.prepare(
        "DELETE FROM journal_entry_lines WHERE journal_entry_id = ?"
      ).bind(journalEntryId).run();
    } catch (cleanupError) {
      console.error('GL Posting cleanup error:', cleanupError);
    }
    
    return {
      success: false,
      error: `GL posting failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

function getSubledgerType(transactionType: string): string {
  const mapping: Record<string, string> = {
    'customer_invoice': 'ar',
    'customer_payment': 'ar',
    'customer_credit_note': 'ar',
    'supplier_invoice': 'ap',
    'supplier_payment': 'ap',
    'supplier_credit_note': 'ap',
    'goods_receipt': 'inventory',
    'goods_issue': 'inventory',
    'stock_adjustment': 'inventory',
    'payroll': 'payroll',
    'depreciation': 'fixed_assets'
  };
  return mapping[transactionType] || 'gl';
}

/**
 * Post a customer invoice to GL
 * DR: Accounts Receivable (1200)
 * CR: Sales Revenue (4000)
 * CR: VAT Output (2100)
 */
export async function postCustomerInvoice(
  db: D1Database,
  companyId: string,
  userId: string,
  invoice: {
    id: string;
    invoice_number: string;
    invoice_date: string;
    customer_name: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
  }
): Promise<PostingResult> {
  const lines: PostingLine[] = [
    {
      accountCode: '1200', // Accounts Receivable
      description: `AR - ${invoice.customer_name} - ${invoice.invoice_number}`,
      debitAmount: invoice.total_amount,
      creditAmount: 0
    },
    {
      accountCode: '4000', // Sales Revenue
      description: `Sales - ${invoice.invoice_number}`,
      debitAmount: 0,
      creditAmount: invoice.subtotal
    }
  ];
  
  // Only add tax line if there's tax
  if (invoice.tax_amount > 0) {
    lines.push({
      accountCode: '2100', // VAT Output
      description: `VAT Output - ${invoice.invoice_number}`,
      debitAmount: 0,
      creditAmount: invoice.tax_amount
    });
  }
  
  return createJournalEntry(db, {
    companyId,
    userId,
    transactionType: 'customer_invoice',
    transactionId: invoice.id,
    transactionDate: invoice.invoice_date,
    description: `Customer Invoice ${invoice.invoice_number} - ${invoice.customer_name}`,
    reference: invoice.invoice_number
  }, lines);
}

/**
 * Post a supplier invoice to GL
 * DR: Expense/Inventory (varies)
 * DR: VAT Input (2110)
 * CR: Accounts Payable (2000)
 */
export async function postSupplierInvoice(
  db: D1Database,
  companyId: string,
  userId: string,
  invoice: {
    id: string;
    invoice_number: string;
    invoice_date: string;
    supplier_name: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    expense_account?: string; // Default to 5000 (COGS) if not specified
  }
): Promise<PostingResult> {
  const expenseAccount = invoice.expense_account || '5000';
  
  const lines: PostingLine[] = [
    {
      accountCode: expenseAccount,
      description: `Purchase - ${invoice.supplier_name} - ${invoice.invoice_number}`,
      debitAmount: invoice.subtotal,
      creditAmount: 0
    }
  ];
  
  // Add VAT input if there's tax
  if (invoice.tax_amount > 0) {
    lines.push({
      accountCode: '2110', // VAT Input
      description: `VAT Input - ${invoice.invoice_number}`,
      debitAmount: invoice.tax_amount,
      creditAmount: 0
    });
  }
  
  lines.push({
    accountCode: '2000', // Accounts Payable
    description: `AP - ${invoice.supplier_name} - ${invoice.invoice_number}`,
    debitAmount: 0,
    creditAmount: invoice.total_amount
  });
  
  return createJournalEntry(db, {
    companyId,
    userId,
    transactionType: 'supplier_invoice',
    transactionId: invoice.id,
    transactionDate: invoice.invoice_date,
    description: `Supplier Invoice ${invoice.invoice_number} - ${invoice.supplier_name}`,
    reference: invoice.invoice_number
  }, lines);
}

/**
 * Post a customer payment to GL
 * DR: Bank (1000)
 * CR: Accounts Receivable (1200)
 */
export async function postCustomerPayment(
  db: D1Database,
  companyId: string,
  userId: string,
  payment: {
    id: string;
    payment_number: string;
    payment_date: string;
    customer_name: string;
    amount: number;
    bank_account_code?: string;
  }
): Promise<PostingResult> {
  const bankAccount = payment.bank_account_code || '1000';
  
  const lines: PostingLine[] = [
    {
      accountCode: bankAccount,
      description: `Receipt - ${payment.customer_name} - ${payment.payment_number}`,
      debitAmount: payment.amount,
      creditAmount: 0
    },
    {
      accountCode: '1200', // Accounts Receivable
      description: `AR Payment - ${payment.payment_number}`,
      debitAmount: 0,
      creditAmount: payment.amount
    }
  ];
  
  return createJournalEntry(db, {
    companyId,
    userId,
    transactionType: 'customer_payment',
    transactionId: payment.id,
    transactionDate: payment.payment_date,
    description: `Customer Payment ${payment.payment_number} - ${payment.customer_name}`,
    reference: payment.payment_number
  }, lines);
}

/**
 * Post a supplier payment to GL
 * DR: Accounts Payable (2000)
 * CR: Bank (1000)
 */
export async function postSupplierPayment(
  db: D1Database,
  companyId: string,
  userId: string,
  payment: {
    id: string;
    payment_number: string;
    payment_date: string;
    supplier_name: string;
    amount: number;
    bank_account_code?: string;
  }
): Promise<PostingResult> {
  const bankAccount = payment.bank_account_code || '1000';
  
  const lines: PostingLine[] = [
    {
      accountCode: '2000', // Accounts Payable
      description: `AP Payment - ${payment.supplier_name} - ${payment.payment_number}`,
      debitAmount: payment.amount,
      creditAmount: 0
    },
    {
      accountCode: bankAccount,
      description: `Payment - ${payment.payment_number}`,
      debitAmount: 0,
      creditAmount: payment.amount
    }
  ];
  
  return createJournalEntry(db, {
    companyId,
    userId,
    transactionType: 'supplier_payment',
    transactionId: payment.id,
    transactionDate: payment.payment_date,
    description: `Supplier Payment ${payment.payment_number} - ${payment.supplier_name}`,
    reference: payment.payment_number
  }, lines);
}

/**
 * Post inventory receipt to GL (goods received from supplier)
 * DR: Inventory (1300)
 * CR: Goods Received Not Invoiced (2050) or AP if invoice exists
 */
export async function postGoodsReceipt(
  db: D1Database,
  companyId: string,
  userId: string,
  receipt: {
    id: string;
    receipt_number: string;
    receipt_date: string;
    supplier_name: string;
    total_cost: number;
    has_invoice: boolean;
  }
): Promise<PostingResult> {
  const creditAccount = receipt.has_invoice ? '2000' : '2050'; // AP or GRNI
  
  const lines: PostingLine[] = [
    {
      accountCode: '1300', // Inventory
      description: `Goods Receipt - ${receipt.supplier_name} - ${receipt.receipt_number}`,
      debitAmount: receipt.total_cost,
      creditAmount: 0
    },
    {
      accountCode: creditAccount,
      description: receipt.has_invoice ? `AP - ${receipt.receipt_number}` : `GRNI - ${receipt.receipt_number}`,
      debitAmount: 0,
      creditAmount: receipt.total_cost
    }
  ];
  
  return createJournalEntry(db, {
    companyId,
    userId,
    transactionType: 'goods_receipt',
    transactionId: receipt.id,
    transactionDate: receipt.receipt_date,
    description: `Goods Receipt ${receipt.receipt_number} - ${receipt.supplier_name}`,
    reference: receipt.receipt_number
  }, lines);
}

/**
 * Post inventory issue to GL (goods shipped to customer)
 * DR: Cost of Goods Sold (5000)
 * CR: Inventory (1300)
 */
export async function postGoodsIssue(
  db: D1Database,
  companyId: string,
  userId: string,
  issue: {
    id: string;
    issue_number: string;
    issue_date: string;
    customer_name: string;
    total_cost: number;
  }
): Promise<PostingResult> {
  const lines: PostingLine[] = [
    {
      accountCode: '5000', // COGS
      description: `COGS - ${issue.customer_name} - ${issue.issue_number}`,
      debitAmount: issue.total_cost,
      creditAmount: 0
    },
    {
      accountCode: '1300', // Inventory
      description: `Inventory Issue - ${issue.issue_number}`,
      debitAmount: 0,
      creditAmount: issue.total_cost
    }
  ];
  
  return createJournalEntry(db, {
    companyId,
    userId,
    transactionType: 'goods_issue',
    transactionId: issue.id,
    transactionDate: issue.issue_date,
    description: `Goods Issue ${issue.issue_number} - ${issue.customer_name}`,
    reference: issue.issue_number
  }, lines);
}

/**
 * Post payroll to GL
 * DR: Salaries & Wages (6000)
 * DR: Employer Contributions (6010)
 * CR: PAYE Payable (2200)
 * CR: UIF Payable (2210)
 * CR: Pension Payable (2220)
 * CR: Net Salaries Payable (2230)
 */
export async function postPayroll(
  db: D1Database,
  companyId: string,
  userId: string,
  payroll: {
    id: string;
    payroll_period: string;
    run_date: string;
    total_gross: number;
    total_paye: number;
    total_uif_employee: number;
    total_uif_employer: number;
    total_pension_employee: number;
    total_pension_employer: number;
    total_net: number;
  }
): Promise<PostingResult> {
  const employerContributions = payroll.total_uif_employer + payroll.total_pension_employer;
  
  const lines: PostingLine[] = [
    {
      accountCode: '6000', // Salaries & Wages
      description: `Gross Salaries - ${payroll.payroll_period}`,
      debitAmount: payroll.total_gross,
      creditAmount: 0
    },
    {
      accountCode: '6010', // Employer Contributions
      description: `Employer Contributions - ${payroll.payroll_period}`,
      debitAmount: employerContributions,
      creditAmount: 0
    },
    {
      accountCode: '2200', // PAYE Payable
      description: `PAYE - ${payroll.payroll_period}`,
      debitAmount: 0,
      creditAmount: payroll.total_paye
    },
    {
      accountCode: '2210', // UIF Payable
      description: `UIF - ${payroll.payroll_period}`,
      debitAmount: 0,
      creditAmount: payroll.total_uif_employee + payroll.total_uif_employer
    },
    {
      accountCode: '2220', // Pension Payable
      description: `Pension - ${payroll.payroll_period}`,
      debitAmount: 0,
      creditAmount: payroll.total_pension_employee + payroll.total_pension_employer
    },
    {
      accountCode: '2230', // Net Salaries Payable
      description: `Net Salaries - ${payroll.payroll_period}`,
      debitAmount: 0,
      creditAmount: payroll.total_net
    }
  ];
  
  return createJournalEntry(db, {
    companyId,
    userId,
    transactionType: 'payroll',
    transactionId: payroll.id,
    transactionDate: payroll.run_date,
    description: `Payroll ${payroll.payroll_period}`,
    reference: payroll.payroll_period
  }, lines);
}

/**
 * Reverse a posted journal entry
 */
export async function reverseJournalEntry(
  db: D1Database,
  companyId: string,
  userId: string,
  journalEntryId: string,
  reversalDate: string,
  reason: string
): Promise<PostingResult> {
  // Get original entry
  const original = await db.prepare(
    "SELECT * FROM journal_entries WHERE id = ? AND company_id = ?"
  ).bind(journalEntryId, companyId).first();
  
  if (!original) {
    return { success: false, error: 'Journal entry not found' };
  }
  
  if ((original as any).status === 'reversed') {
    return { success: false, error: 'Journal entry is already reversed' };
  }
  
  // Get original lines
  const originalLines = await db.prepare(
    "SELECT jel.*, ga.account_code FROM journal_entry_lines jel JOIN gl_accounts ga ON jel.account_id = ga.id WHERE jel.journal_entry_id = ?"
  ).bind(journalEntryId).all();
  
  // Create reversal lines (swap debits and credits)
  const reversalLines: PostingLine[] = (originalLines.results || []).map((line: any) => ({
    accountCode: line.account_code,
    description: `Reversal: ${line.description}`,
    debitAmount: line.credit_amount,
    creditAmount: line.debit_amount
  }));
  
  // Create reversal entry
  const result = await createJournalEntry(db, {
    companyId,
    userId,
    transactionType: 'reversal',
    transactionId: journalEntryId,
    transactionDate: reversalDate,
    description: `Reversal of ${(original as any).entry_number}: ${reason}`,
    reference: (original as any).entry_number
  }, reversalLines);
  
  if (result.success) {
    // Mark original as reversed
    await db.prepare(
      "UPDATE journal_entries SET status = 'reversed', updated_at = ? WHERE id = ?"
    ).bind(new Date().toISOString(), journalEntryId).run();
  }
  
  return result;
}

export default {
  postCustomerInvoice,
  postSupplierInvoice,
  postCustomerPayment,
  postSupplierPayment,
  postGoodsReceipt,
  postGoodsIssue,
  postPayroll,
  reverseJournalEntry
};
