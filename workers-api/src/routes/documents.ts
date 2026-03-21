import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';
import { sendDocumentEmail, getEmailConfig } from '../services/email-service';

interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Document types supported
const DOCUMENT_TYPES = {
  quote: { title: 'QUOTATION', prefix: 'QT', category: 'sales' },
  sales_order: { title: 'SALES ORDER', prefix: 'SO', category: 'sales' },
  tax_invoice: { title: 'TAX INVOICE', prefix: 'INV', category: 'sales' },
  credit_note: { title: 'CREDIT NOTE', prefix: 'CN', category: 'sales' },
  debit_note: { title: 'DEBIT NOTE', prefix: 'DN', category: 'sales' },
  delivery_note: { title: 'DELIVERY NOTE', prefix: 'DEL', category: 'sales' },
  statement: { title: 'STATEMENT OF ACCOUNT', prefix: 'STMT', category: 'sales' },
  purchase_order: { title: 'PURCHASE ORDER', prefix: 'PO', category: 'procurement' },
  goods_receipt: { title: 'GOODS RECEIVED NOTE', prefix: 'GRN', category: 'procurement' },
  payment_voucher: { title: 'PAYMENT VOUCHER', prefix: 'PV', category: 'finance' },
  receipt_voucher: { title: 'RECEIPT VOUCHER', prefix: 'RV', category: 'finance' },
  journal_entry: { title: 'JOURNAL ENTRY', prefix: 'JE', category: 'finance' },
  payslip: { title: 'PAYSLIP', prefix: 'PS', category: 'hr' },
  work_order: { title: 'WORK ORDER', prefix: 'WO', category: 'manufacturing' },
  service_order: { title: 'SERVICE ORDER', prefix: 'SVC', category: 'field_service' },
  project_invoice: { title: 'PROJECT INVOICE', prefix: 'PINV', category: 'projects' },
};

// Company branding interface
interface CompanyBranding {
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
}

// Get company settings including branding
async function getCompanySettings(db: D1Database, companyId: string): Promise<any> {
  const company = await db.prepare(`
    SELECT * FROM companies WHERE id = ?
  `).bind(companyId).first();
  
  return company || {
    name: 'Demo Company',
    registration_number: '2024/123456/07',
    vat_number: '4123456789',
    address: '123 Business Street, Sandton, 2196',
    phone: '+27 11 123 4567',
    email: 'info@company.co.za',
    website: 'www.company.co.za',
    bank_name: 'First National Bank',
    bank_account: '62123456789',
    bank_branch: '250655',
    primary_color: '#1e40af',
    secondary_color: '#64748b',
    logo_url: null
  };
}

// Generate document number
async function generateDocumentNumber(db: D1Database, companyId: string, docType: string): Promise<string> {
  const prefix = DOCUMENT_TYPES[docType as keyof typeof DOCUMENT_TYPES]?.prefix || 'DOC';
  const year = new Date().getFullYear();
  
  // Get next sequence number
  const result = await db.prepare(`
    SELECT COALESCE(MAX(CAST(SUBSTR(document_number, -6) AS INTEGER)), 0) + 1 as next_num
    FROM documents
    WHERE company_id = ? AND document_type = ? AND document_number LIKE ?
  `).bind(companyId, docType, `${prefix}-${year}-%`).first<{ next_num: number }>();
  
  const nextNum = result?.next_num || 1;
  return `${prefix}-${year}-${String(nextNum).padStart(6, '0')}`;
}

// Format currency
function formatCurrency(amount: number, currency: string = 'ZAR'): string {
  const symbols: Record<string, string> = {
    ZAR: 'R',
    USD: '$',
    EUR: '€',
    GBP: '£',
    SAR: 'SAR',
    AED: 'AED',
    INR: '₹',
    MXN: '$',
    IDR: 'Rp'
  };
  const symbol = symbols[currency] || currency;
  return `${symbol} ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

// Format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Generate HTML document template
function generateDocumentHTML(
  docType: string,
  company: any,
  recipient: any,
  documentData: any,
  lineItems: any[],
  branding: CompanyBranding
): string {
  const docConfig = DOCUMENT_TYPES[docType as keyof typeof DOCUMENT_TYPES];
  const title = docConfig?.title || 'DOCUMENT';
  
  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const discountAmount = documentData.discount_percent ? subtotal * (documentData.discount_percent / 100) : 0;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const vatRate = documentData.vat_rate || 15;
  const vatAmount = subtotalAfterDiscount * (vatRate / 100);
  const total = subtotalAfterDiscount + vatAmount;
  const currency = documentData.currency || 'ZAR';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${documentData.document_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: '${branding.font_family || 'Inter'}', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1f2937;
      background: white;
    }
    
    .document {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      background: white;
    }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid ${branding.primary_color};
    }
    
    .company-info {
      flex: 1;
    }
    
    .company-logo {
      max-height: 60px;
      max-width: 200px;
      margin-bottom: 10px;
    }
    
    .company-name {
      font-size: 24px;
      font-weight: 700;
      color: ${branding.primary_color};
      margin-bottom: 5px;
    }
    
    .company-details {
      font-size: 11px;
      color: ${branding.secondary_color};
      line-height: 1.6;
    }
    
    .document-title-section {
      text-align: right;
    }
    
    .document-title {
      font-size: 28px;
      font-weight: 700;
      color: ${branding.primary_color};
      margin-bottom: 10px;
    }
    
    .document-number {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }
    
    .document-date {
      font-size: 12px;
      color: ${branding.secondary_color};
      margin-top: 5px;
    }
    
    /* Parties Section */
    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      gap: 40px;
    }
    
    .party-box {
      flex: 1;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid ${branding.primary_color};
    }
    
    .party-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${branding.secondary_color};
      margin-bottom: 8px;
    }
    
    .party-name {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 5px;
    }
    
    .party-details {
      font-size: 11px;
      color: #4b5563;
      line-height: 1.6;
    }
    
    /* Document Details */
    .document-details {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
      padding: 15px;
      background: #f0f9ff;
      border-radius: 8px;
    }
    
    .detail-item {
      text-align: center;
    }
    
    .detail-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: ${branding.secondary_color};
      margin-bottom: 4px;
    }
    
    .detail-value {
      font-size: 12px;
      font-weight: 600;
      color: #111827;
    }
    
    /* Line Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    .items-table th {
      background: ${branding.primary_color};
      color: white;
      padding: 12px 15px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .items-table th:first-child {
      border-radius: 8px 0 0 0;
    }
    
    .items-table th:last-child {
      border-radius: 0 8px 0 0;
      text-align: right;
    }
    
    .items-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 11px;
    }
    
    .items-table tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .items-table tr:last-child td:first-child {
      border-radius: 0 0 0 8px;
    }
    
    .items-table tr:last-child td:last-child {
      border-radius: 0 0 8px 0;
    }
    
    .item-code {
      font-weight: 500;
      color: ${branding.primary_color};
    }
    
    .item-description {
      color: #374151;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    /* Totals Section */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    
    .totals-box {
      width: 300px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .total-row.grand-total {
      border-bottom: none;
      border-top: 2px solid ${branding.primary_color};
      margin-top: 10px;
      padding-top: 15px;
    }
    
    .total-label {
      font-size: 12px;
      color: #4b5563;
    }
    
    .total-value {
      font-size: 12px;
      font-weight: 600;
      color: #111827;
    }
    
    .grand-total .total-label,
    .grand-total .total-value {
      font-size: 16px;
      font-weight: 700;
      color: ${branding.primary_color};
    }
    
    /* Bank Details */
    .bank-details {
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    
    .bank-title {
      font-size: 12px;
      font-weight: 600;
      color: ${branding.primary_color};
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    .bank-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }
    
    .bank-item {
      font-size: 11px;
    }
    
    .bank-label {
      color: ${branding.secondary_color};
      margin-bottom: 2px;
    }
    
    .bank-value {
      font-weight: 600;
      color: #111827;
    }
    
    /* Terms & Notes */
    .terms-section {
      margin-bottom: 30px;
    }
    
    .terms-title {
      font-size: 12px;
      font-weight: 600;
      color: ${branding.primary_color};
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    .terms-content {
      font-size: 10px;
      color: #4b5563;
      line-height: 1.8;
    }
    
    .terms-content li {
      margin-bottom: 5px;
    }
    
    .notes-box {
      padding: 15px;
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
      margin-top: 15px;
    }
    
    .notes-title {
      font-size: 11px;
      font-weight: 600;
      color: #92400e;
      margin-bottom: 5px;
    }
    
    .notes-content {
      font-size: 11px;
      color: #78350f;
    }
    
    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }
    
    .footer-text {
      font-size: 10px;
      color: ${branding.secondary_color};
    }
    
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      gap: 40px;
    }
    
    .signature-box {
      flex: 1;
      text-align: center;
    }
    
    .signature-line {
      border-top: 1px solid #9ca3af;
      margin-top: 60px;
      padding-top: 10px;
    }
    
    .signature-label {
      font-size: 10px;
      color: ${branding.secondary_color};
    }
    
    /* Print Styles */
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .document {
        padding: 20px;
        max-width: 100%;
      }
      
      .no-print {
        display: none !important;
      }
    }
    
    /* Status Badge */
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-draft { background: #e5e7eb; color: #374151; }
    .status-sent { background: #dbeafe; color: #1e40af; }
    .status-approved { background: #d1fae5; color: #065f46; }
    .status-paid { background: #dcfce7; color: #166534; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
    .status-cancelled { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="document">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.name}" class="company-logo">` : ''}
        <div class="company-name">${company.name}</div>
        <div class="company-details">
          ${company.address}<br>
          Tel: ${company.phone} | Email: ${company.email}<br>
          ${company.website ? `Web: ${company.website}<br>` : ''}
          Reg No: ${company.registration_number} | VAT No: ${company.vat_number}
        </div>
      </div>
      <div class="document-title-section">
        <div class="document-title">${title}</div>
        <div class="document-number">${documentData.document_number}</div>
        <div class="document-date">${formatDate(documentData.document_date)}</div>
        ${documentData.status ? `<span class="status-badge status-${documentData.status}">${documentData.status}</span>` : ''}
      </div>
    </div>
    
    <!-- Parties -->
    <div class="parties">
      <div class="party-box">
        <div class="party-label">${docType.includes('purchase') || docType === 'goods_receipt' ? 'Supplier' : 'Bill To'}</div>
        <div class="party-name">${recipient.name}</div>
        <div class="party-details">
          ${recipient.address || ''}<br>
          ${recipient.phone ? `Tel: ${recipient.phone}<br>` : ''}
          ${recipient.email ? `Email: ${recipient.email}<br>` : ''}
          ${recipient.vat_number ? `VAT No: ${recipient.vat_number}` : ''}
        </div>
      </div>
      ${documentData.delivery_address ? `
      <div class="party-box">
        <div class="party-label">Ship To</div>
        <div class="party-details">${documentData.delivery_address}</div>
      </div>
      ` : ''}
    </div>
    
    <!-- Document Details -->
    <div class="document-details">
      <div class="detail-item">
        <div class="detail-label">Document Date</div>
        <div class="detail-value">${formatDate(documentData.document_date)}</div>
      </div>
      ${documentData.due_date ? `
      <div class="detail-item">
        <div class="detail-label">Due Date</div>
        <div class="detail-value">${formatDate(documentData.due_date)}</div>
      </div>
      ` : ''}
      ${documentData.reference ? `
      <div class="detail-item">
        <div class="detail-label">Reference</div>
        <div class="detail-value">${documentData.reference}</div>
      </div>
      ` : ''}
      ${documentData.payment_terms ? `
      <div class="detail-item">
        <div class="detail-label">Payment Terms</div>
        <div class="detail-value">${documentData.payment_terms}</div>
      </div>
      ` : ''}
      ${documentData.sales_rep ? `
      <div class="detail-item">
        <div class="detail-label">Sales Rep</div>
        <div class="detail-value">${documentData.sales_rep}</div>
      </div>
      ` : ''}
    </div>
    
    <!-- Line Items -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 80px;">Code</th>
          <th>Description</th>
          <th class="text-center" style="width: 80px;">Qty</th>
          <th class="text-right" style="width: 100px;">Unit Price</th>
          ${documentData.show_discount ? '<th class="text-right" style="width: 80px;">Discount</th>' : ''}
          <th class="text-right" style="width: 120px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map(item => `
        <tr>
          <td class="item-code">${item.item_code || '-'}</td>
          <td class="item-description">${item.description}</td>
          <td class="text-center">${item.quantity} ${item.unit || ''}</td>
          <td class="text-right">${formatCurrency(item.unit_price, currency)}</td>
          ${documentData.show_discount ? `<td class="text-right">${item.discount_percent ? item.discount_percent + '%' : '-'}</td>` : ''}
          <td class="text-right">${formatCurrency(item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100), currency)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    
    <!-- Totals -->
    <div class="totals-section">
      <div class="totals-box">
        <div class="total-row">
          <span class="total-label">Subtotal</span>
          <span class="total-value">${formatCurrency(subtotal, currency)}</span>
        </div>
        ${discountAmount > 0 ? `
        <div class="total-row">
          <span class="total-label">Discount (${documentData.discount_percent}%)</span>
          <span class="total-value">-${formatCurrency(discountAmount, currency)}</span>
        </div>
        ` : ''}
        <div class="total-row">
          <span class="total-label">VAT (${vatRate}%)</span>
          <span class="total-value">${formatCurrency(vatAmount, currency)}</span>
        </div>
        <div class="total-row grand-total">
          <span class="total-label">Total Due</span>
          <span class="total-value">${formatCurrency(total, currency)}</span>
        </div>
      </div>
    </div>
    
    <!-- Bank Details (for invoices) -->
    ${['tax_invoice', 'statement', 'debit_note'].includes(docType) ? `
    <div class="bank-details">
      <div class="bank-title">Banking Details</div>
      <div class="bank-grid">
        <div class="bank-item">
          <div class="bank-label">Bank</div>
          <div class="bank-value">${company.bank_name}</div>
        </div>
        <div class="bank-item">
          <div class="bank-label">Account Number</div>
          <div class="bank-value">${company.bank_account}</div>
        </div>
        <div class="bank-item">
          <div class="bank-label">Branch Code</div>
          <div class="bank-value">${company.bank_branch}</div>
        </div>
      </div>
      <div style="margin-top: 10px; font-size: 11px; color: #4b5563;">
        Reference: ${documentData.document_number}
      </div>
    </div>
    ` : ''}
    
    <!-- Terms & Conditions -->
    ${documentData.terms && documentData.terms.length > 0 ? `
    <div class="terms-section">
      <div class="terms-title">Terms & Conditions</div>
      <ul class="terms-content">
        ${documentData.terms.map((term: string) => `<li>${term}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    <!-- Notes -->
    ${documentData.notes ? `
    <div class="notes-box">
      <div class="notes-title">Notes</div>
      <div class="notes-content">${documentData.notes}</div>
    </div>
    ` : ''}
    
    <!-- Signature Section (for delivery notes, GRNs) -->
    ${['delivery_note', 'goods_receipt'].includes(docType) ? `
    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-label">Delivered By / Date</div>
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-label">Received By / Date</div>
        </div>
      </div>
    </div>
    ` : ''}
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-text">
        Thank you for your business!<br>
        ${company.name} | ${company.email} | ${company.phone}
      </div>
    </div>
  </div>
</body>
</html>
`;
}

// ============================================================================
// ROUTES
// ============================================================================

// Get document types
app.get('/types', async (c) => {
  try {
    return c.json({
      types: Object.entries(DOCUMENT_TYPES).map(([key, value]) => ({
        id: key,
        ...value
      }))
    });
  } catch (error: any) {
    console.error('Route error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Generate document preview (HTML)
app.post('/preview', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
  

    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

    try {
      const body = await c.req.json();
      const { document_type, recipient_id, recipient_type, line_items, ...documentData } = body;
    
      const db = c.env.DB;
    
      // Get company settings
      const company = await getCompanySettings(db, companyId);
    
      // Get recipient details
      let recipient: any = {};
      if (recipient_type === 'customer' && recipient_id) {
        recipient = await db.prepare(`
          SELECT name, email, phone, billing_address as address, vat_number
          FROM customers WHERE id = ? AND company_id = ?
        `).bind(recipient_id, companyId).first() || {};
      } else if (recipient_type === 'supplier' && recipient_id) {
        recipient = await db.prepare(`
          SELECT name, email, phone, address, vat_number
          FROM suppliers WHERE id = ? AND company_id = ?
        `).bind(recipient_id, companyId).first() || {};
      } else {
        recipient = body.recipient || {};
      }
    
      // Generate document number if not provided
      if (!documentData.document_number) {
        documentData.document_number = await generateDocumentNumber(db, companyId, document_type);
      }
    
      // Set document date if not provided
      if (!documentData.document_date) {
        documentData.document_date = new Date().toISOString().split('T')[0];
      }
    
      // Default terms
      if (!documentData.terms) {
        documentData.terms = [
          'Prices are valid for 30 days from the document date.',
          'Payment is due within the terms specified above.',
          'Goods remain the property of the seller until paid in full.',
          'E&OE - Errors and Omissions Excepted.'
        ];
      }
    
      const branding: CompanyBranding = {
        logo_url: company.logo_url,
        primary_color: company.primary_color || '#1e40af',
        secondary_color: company.secondary_color || '#64748b',
        font_family: company.font_family || 'Inter'
      };
    
      const html = generateDocumentHTML(
        document_type,
        company,
        recipient,
        documentData,
        line_items || [],
        branding
      );
    
      return c.html(html);
    } catch (error: any) {
      console.error('Document preview error:', error);
      return c.json({ error: error.message || 'Failed to generate preview' }, 500);
    }
  } catch (error: any) {
    console.error('Route error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Save document
app.post('/save', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
  

    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

    try {
      const body = await c.req.json();
      const { document_type, recipient_id, recipient_type, line_items, ...documentData } = body;
    
      const db = c.env.DB;
      const userId = 'system';
    
      // Generate document number
      const documentNumber = documentData.document_number || await generateDocumentNumber(db, companyId, document_type);
    
      // Calculate totals
      const subtotal = (line_items || []).reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
      const vatRate = documentData.vat_rate || 15;
      const vatAmount = subtotal * (vatRate / 100);
      const total = subtotal + vatAmount;
    
      // Save document
      const docId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO documents (
          id, company_id, document_type, document_number, document_date,
          recipient_id, recipient_type, recipient_name,
          subtotal, vat_amount, total_amount, currency, status,
          line_items_json, metadata_json,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        docId,
        companyId,
        document_type,
        documentNumber,
        documentData.document_date || new Date().toISOString().split('T')[0],
        recipient_id || null,
        recipient_type || null,
        documentData.recipient_name || null,
        subtotal,
        vatAmount,
        total,
        documentData.currency || 'ZAR',
        documentData.status || 'draft',
        JSON.stringify(line_items || []),
        JSON.stringify(documentData),
        userId,
        new Date().toISOString(),
        new Date().toISOString()
      ).run();
    
      return c.json({
        success: true,
        document_id: docId,
        document_number: documentNumber,
        total_amount: total
      });
    } catch (error: any) {
      console.error('Document save error:', error);
      return c.json({ error: error.message || 'Failed to save document' }, 500);
    }
  } catch (error: any) {
    console.error('Route error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ==================== DOCUMENT TEMPLATES ====================

app.get('/templates', async (c) => {
  return c.json({ data: Object.entries(DOCUMENT_TYPES).map(([key, val]) => ({ id: key, name: val.title, prefix: val.prefix, category: val.category })) });
});

// ==================== DOCUMENT PROCESSING ====================

app.post('/process', async (c) => {
  return c.json({ success: true, job_id: crypto.randomUUID(), status: 'processing' });
});

app.get('/processing/jobs', async (c) => {
  return c.json({ data: [] });
});

app.get('/processing/job/:jobId/status', async (c) => {
  return c.json({ status: 'completed', progress: 100 });
});

// ==================== LEGAL (contracts via /legal mount) ====================

app.get('/contracts', async (c) => {
  return c.json({ data: [] });
});

app.post('/contracts', async (c) => {
  return c.json({ success: true, id: crypto.randomUUID() });
});

app.put('/contracts/:id', async (c) => {
  return c.json({ success: true });
});

app.delete('/contracts/:id', async (c) => {
  return c.json({ success: true });
});

// Get document by ID
app.get('/:id', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
  

    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

    try {
      const docId = c.req.param('id');
      const db = c.env.DB;
    
      const doc = await db.prepare(`
        SELECT * FROM documents WHERE id = ? AND company_id = ?
      `).bind(docId, companyId).first();
    
      if (!doc) {
        return c.json({ error: 'Document not found' }, 404);
      }
    
      return c.json({
        ...doc,
        line_items: JSON.parse((doc as any).line_items_json || '[]'),
        metadata: JSON.parse((doc as any).metadata_json || '{}')
      });
    } catch (error: any) {
      console.error('Document fetch error:', error);
      return c.json({ error: error.message || 'Failed to fetch document' }, 500);
    }
  } catch (error: any) {
    console.error('Route error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get document HTML for printing
app.get('/:id/html', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
  

    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

    try {
      const docId = c.req.param('id');
      const db = c.env.DB;
    
      // Get document
      const doc = await db.prepare(`
        SELECT * FROM documents WHERE id = ? AND company_id = ?
      `).bind(docId, companyId).first<any>();
    
      if (!doc) {
        return c.json({ error: 'Document not found' }, 404);
      }
    
      // Get company settings
      const company = await getCompanySettings(db, companyId);
    
      // Get recipient details
      let recipient: any = {};
      if (doc.recipient_type === 'customer' && doc.recipient_id) {
        recipient = await db.prepare(`
          SELECT name, email, phone, billing_address as address, vat_number
          FROM customers WHERE id = ? AND company_id = ?
        `).bind(doc.recipient_id, companyId).first() || {};
      } else if (doc.recipient_type === 'supplier' && doc.recipient_id) {
        recipient = await db.prepare(`
          SELECT name, email, phone, address, vat_number
          FROM suppliers WHERE id = ? AND company_id = ?
        `).bind(doc.recipient_id, companyId).first() || {};
      }
      recipient.name = recipient.name || doc.recipient_name;
    
      const lineItems = JSON.parse(doc.line_items_json || '[]');
      const metadata = JSON.parse(doc.metadata_json || '{}');
    
      const branding: CompanyBranding = {
        logo_url: company.logo_url,
        primary_color: company.primary_color || '#1e40af',
        secondary_color: company.secondary_color || '#64748b',
        font_family: company.font_family || 'Inter'
      };
    
      const documentData = {
        document_number: doc.document_number,
        document_date: doc.document_date,
        status: doc.status,
        ...metadata
      };
    
      const html = generateDocumentHTML(
        doc.document_type,
        company,
        recipient,
        documentData,
        lineItems,
        branding
      );
    
      return c.html(html);
    } catch (error: any) {
      console.error('Document HTML error:', error);
      return c.json({ error: error.message || 'Failed to generate document HTML' }, 500);
    }
  } catch (error: any) {
    console.error('Route error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// List documents
app.get('/', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
  

    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

    try {
      const db = c.env.DB;
    
      const docType = c.req.query('type');
      const status = c.req.query('status');
      const limit = parseInt(c.req.query('limit') || '50');
      const offset = parseInt(c.req.query('offset') || '0');
    
      let query = `
        SELECT id, document_type, document_number, document_date,
               recipient_name, total_amount, currency, status, created_at
        FROM documents
        WHERE company_id = ?
      `;
      const params: any[] = [companyId];
    
      if (docType) {
        query += ' AND document_type = ?';
        params.push(docType);
      }
    
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
    
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
    
      const docs = await db.prepare(query).bind(...params).all();
    
      // Get total count
      let countQuery = 'SELECT COUNT(*) as count FROM documents WHERE company_id = ?';
      const countParams: any[] = [companyId];
      if (docType) {
        countQuery += ' AND document_type = ?';
        countParams.push(docType);
      }
      if (status) {
        countQuery += ' AND status = ?';
        countParams.push(status);
      }
      const countResult = await db.prepare(countQuery).bind(...countParams).first<{ count: number }>();
    
      return c.json({
        documents: docs.results,
        total: countResult?.count || 0,
        limit,
        offset
      });
    } catch (error: any) {
      console.error('Document list error:', error);
      return c.json({ error: error.message || 'Failed to list documents' }, 500);
    }
  } catch (error: any) {
    console.error('Route error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Update document status
app.patch('/:id/status', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
  

    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

    try {
      const docId = c.req.param('id');
      const { status } = await c.req.json();
      const db = c.env.DB;
    
      const validStatuses = ['draft', 'sent', 'approved', 'paid', 'cancelled', 'void'];
      if (!validStatuses.includes(status)) {
        return c.json({ error: 'Invalid status' }, 400);
      }
    
      await db.prepare(`
        UPDATE documents SET status = ?, updated_at = ? WHERE id = ? AND company_id = ?
      `).bind(status, new Date().toISOString(), docId, companyId).run();
    
      return c.json({ success: true, status });
    } catch (error: any) {
      console.error('Document status update error:', error);
      return c.json({ error: error.message || 'Failed to update status' }, 500);
    }
  } catch (error: any) {
    console.error('Route error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Send document via email
app.post('/:id/send', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
  

    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

    try {
      const docId = c.req.param('id');
      const { to_email, cc_email, subject, message, recipient_name } = await c.req.json();
      const db = c.env.DB;
    
      // Get document
      const doc = await db.prepare(`
        SELECT * FROM documents WHERE id = ? AND company_id = ?
      `).bind(docId, companyId).first<any>();
    
      if (!doc) {
        return c.json({ error: 'Document not found' }, 404);
      }
    
      // Get company settings
      const company = await getCompanySettings(db, companyId);
    
      // Get document HTML content
      const documentHtml = doc.html_content || '';
    
      // Prepare email record
      const emailId = crypto.randomUUID();
      const emailSubject = subject || `${DOCUMENT_TYPES[doc.document_type as keyof typeof DOCUMENT_TYPES]?.title || 'Document'} ${doc.document_number} from ${company.name}`;
      const sentAt = new Date().toISOString();
    
      // Send email using the email service
      const emailResult = await sendDocumentEmail(
        db,
        companyId,
        documentHtml,
        {
          email: to_email,
          name: recipient_name || to_email.split('@')[0]
        },
        {
          type: DOCUMENT_TYPES[doc.document_type as keyof typeof DOCUMENT_TYPES]?.title || 'Document',
          number: doc.document_number,
          companyName: company.name
        },
        message
      );
    
      // Determine email status based on result
      const emailStatus = emailResult.success ? 'sent' : 'failed';
    
      // Save email record
      await db.prepare(`
        INSERT INTO document_emails (id, document_id, company_id, to_email, cc_email, subject, message, sent_at, status, provider_message_id, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        emailId,
        docId,
        companyId,
        to_email,
        cc_email || null,
        emailSubject,
        message || null,
        sentAt,
        emailStatus,
        emailResult.messageId || null,
        emailResult.error || null
      ).run();
    
      // Update document status to sent if email was successful
      if (emailResult.success && doc.status === 'draft') {
        await db.prepare(`
          UPDATE documents SET status = 'sent', updated_at = ? WHERE id = ?
        `).bind(sentAt, docId).run();
      }
    
      if (!emailResult.success) {
        return c.json({
          success: false,
          message: 'Failed to send email',
          error: emailResult.error,
          email_id: emailId
        }, 500);
      }
    
      return c.json({
        success: true,
        message: 'Document sent successfully',
        email_id: emailId,
        provider: emailResult.provider,
        message_id: emailResult.messageId
      });
    } catch (error: any) {
      console.error('Document send error:', error);
      return c.json({ error: error.message || 'Failed to send document' }, 500);
    }
  } catch (error: any) {
    console.error('Route error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get email history for a document
app.get('/:id/emails', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
  

    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

    try {
      const docId = c.req.param('id');
      const db = c.env.DB;
    
      const emails = await db.prepare(`
        SELECT * FROM document_emails
        WHERE document_id = ? AND company_id = ?
        ORDER BY sent_at DESC
      `).bind(docId, companyId).all();
    
      return c.json({ emails: emails.results });
    } catch (error: any) {
      console.error('Email history error:', error);
      return c.json({ error: error.message || 'Failed to fetch email history' }, 500);
    }
  } catch (error: any) {
    console.error('Route error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Generate document from existing transaction
app.post('/from-transaction', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
  

    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  

    try {
      const { transaction_type, transaction_id, document_type } = await c.req.json();
      const db = c.env.DB;
    
      let transaction: any = null;
      let lineItems: any[] = [];
      let recipient: any = {};
    
      // Fetch transaction based on type
      switch (transaction_type) {
        case 'quote':
          transaction = await db.prepare(`
            SELECT q.*, c.name as customer_name, c.email as customer_email,
                   c.phone as customer_phone, c.billing_address as customer_address,
                   c.vat_number as customer_vat
            FROM quotes q
            LEFT JOIN customers c ON c.id = q.customer_id
            WHERE q.id = ? AND q.company_id = ?
          `).bind(transaction_id, companyId).first();
        
          if (transaction) {
            lineItems = JSON.parse(transaction.line_items_json || '[]');
            recipient = {
              id: transaction.customer_id,
              type: 'customer',
              name: transaction.customer_name,
              email: transaction.customer_email,
              phone: transaction.customer_phone,
              address: transaction.customer_address,
              vat_number: transaction.customer_vat
            };
          }
          break;
        
        case 'sales_order':
          transaction = await db.prepare(`
            SELECT so.*, c.name as customer_name, c.email as customer_email,
                   c.phone as customer_phone, c.billing_address as customer_address,
                   c.vat_number as customer_vat
            FROM sales_orders so
            LEFT JOIN customers c ON c.id = so.customer_id
            WHERE so.id = ? AND so.company_id = ?
          `).bind(transaction_id, companyId).first();
        
          if (transaction) {
            lineItems = JSON.parse(transaction.line_items_json || '[]');
            recipient = {
              id: transaction.customer_id,
              type: 'customer',
              name: transaction.customer_name,
              email: transaction.customer_email,
              phone: transaction.customer_phone,
              address: transaction.customer_address,
              vat_number: transaction.customer_vat
            };
          }
          break;
        
        case 'purchase_order':
          transaction = await db.prepare(`
            SELECT po.*, s.name as supplier_name, s.email as supplier_email,
                   s.phone as supplier_phone, s.address as supplier_address,
                   s.vat_number as supplier_vat
            FROM purchase_orders po
            LEFT JOIN suppliers s ON s.id = po.supplier_id
            WHERE po.id = ? AND po.company_id = ?
          `).bind(transaction_id, companyId).first();
        
          if (transaction) {
            lineItems = JSON.parse(transaction.line_items_json || '[]');
            recipient = {
              id: transaction.supplier_id,
              type: 'supplier',
              name: transaction.supplier_name,
              email: transaction.supplier_email,
              phone: transaction.supplier_phone,
              address: transaction.supplier_address,
              vat_number: transaction.supplier_vat
            };
          }
          break;
        
        case 'customer_invoice':
          transaction = await db.prepare(`
            SELECT ci.*, c.name as customer_name, c.email as customer_email,
                   c.phone as customer_phone, c.billing_address as customer_address,
                   c.vat_number as customer_vat
            FROM customer_invoices ci
            LEFT JOIN customers c ON c.id = ci.customer_id
            WHERE ci.id = ? AND ci.company_id = ?
          `).bind(transaction_id, companyId).first();
        
          if (transaction) {
            lineItems = JSON.parse(transaction.line_items_json || '[]');
            recipient = {
              id: transaction.customer_id,
              type: 'customer',
              name: transaction.customer_name,
              email: transaction.customer_email,
              phone: transaction.customer_phone,
              address: transaction.customer_address,
              vat_number: transaction.customer_vat
            };
          }
          break;
      }
    
      if (!transaction) {
        return c.json({ error: 'Transaction not found' }, 404);
      }
    
      // Generate document number
      const documentNumber = await generateDocumentNumber(db, companyId, document_type);
    
      return c.json({
        document_type,
        document_number: documentNumber,
        document_date: new Date().toISOString().split('T')[0],
        recipient,
        line_items: lineItems,
        reference: transaction.order_number || transaction.quote_number || transaction.invoice_number,
        currency: transaction.currency || 'ZAR',
        vat_rate: 15,
        source_transaction: {
          type: transaction_type,
          id: transaction_id
        }
      });
    } catch (error: any) {
      console.error('Document from transaction error:', error);
      return c.json({ error: error.message || 'Failed to generate document from transaction' }, 500);
    }
  } catch (error: any) {
    console.error('Route error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get document history - all documents for a company
app.get('/history', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }
    
    const db = c.env.DB;
    
    // Get documents from various sources
    const [invoices, quotes, purchaseOrders, salesOrders] = await Promise.all([
      db.prepare(`
        SELECT 
          invoice_number as id,
          'Tax Invoice' as type,
          customer_name as customer,
          invoice_date as date,
          total_amount as amount,
          status
        FROM invoices 
        WHERE company_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `).bind(companyId).all(),
      
      db.prepare(`
        SELECT 
          quote_number as id,
          'Quote' as type,
          customer_name as customer,
          quote_date as date,
          total_amount as amount,
          status
        FROM quotes 
        WHERE company_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `).bind(companyId).all(),
      
      db.prepare(`
        SELECT 
          po_number as id,
          'Purchase Order' as type,
          supplier_name as customer,
          order_date as date,
          total_amount as amount,
          status
        FROM purchase_orders 
        WHERE company_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `).bind(companyId).all(),
      
      db.prepare(`
        SELECT 
          order_number as id,
          'Sales Order' as type,
          customer_name as customer,
          order_date as date,
          total_amount as amount,
          status
        FROM sales_orders 
        WHERE company_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `).bind(companyId).all()
    ]);
    
    // Combine and sort all documents
    const allDocuments = [
      ...(invoices.results || []),
      ...(quotes.results || []),
      ...(purchaseOrders.results || []),
      ...(salesOrders.results || [])
    ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return c.json({ documents: allDocuments.slice(0, 100) });
  } catch (error: any) {
    console.error('Document history error:', error);
    return c.json({ error: error.message || 'Failed to fetch document history' }, 500);
  }
});

// ============================================================================
// R2 DOCUMENT UPLOAD & DOWNLOAD
// ============================================================================

const ALLOWED_FILE_TYPES = new Set([
  'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp'
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Upload a document to R2
app.post('/upload', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const userId = await getSecureUserId(c) || 'system';

    const formData = await c.req.formData();
    const fileEntry = formData.get('file');
    if (!fileEntry || typeof fileEntry === 'string') {
      return c.json({ error: 'No file provided' }, 400);
    }
    const file = fileEntry as unknown as { name: string; type: string; size: number; stream(): ReadableStream; arrayBuffer(): Promise<ArrayBuffer> };

    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: 'File size exceeds 10MB limit' }, 400);
    }

    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      return c.json({ error: `File type ${file.type} not supported. Allowed: PDF, DOCX, XLSX, CSV, JPG, PNG` }, 400);
    }

    const documentType = (formData.get('document_type') as string) || 'general';
    const documentId = crypto.randomUUID();
    const r2Key = `${companyId}/${documentType}/${documentId}/${file.name}`;

    // Upload to R2
    await c.env.DOCUMENTS.put(r2Key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { companyId, userId, documentType, originalName: file.name }
    });

    // Create database record
    const now = new Date().toISOString();
    await c.env.DB.prepare(`
      INSERT INTO documents (id, company_id, filename, original_filename, mime_type, size, r2_key, document_type, uploaded_by, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'uploaded', ?, ?)
    `).bind(documentId, companyId, file.name, file.name, file.type, file.size, r2Key, documentType, userId, now, now).run();

    return c.json({
      id: documentId,
      filename: file.name,
      mime_type: file.type,
      size: file.size,
      document_type: documentType,
      status: 'uploaded',
      created_at: now
    }, 201);
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Failed to upload document' }, 500);
  }
});

// Download a document from R2
app.get('/:id/download', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const documentId = c.req.param('id');

    const doc = await c.env.DB.prepare(
      'SELECT * FROM documents WHERE id = ? AND company_id = ?'
    ).bind(documentId, companyId).first<{ r2_key: string; filename: string; mime_type: string }>();

    if (!doc) {
      return c.json({ error: 'Document not found' }, 404);
    }

    const r2Object = await c.env.DOCUMENTS.get(doc.r2_key);
    if (!r2Object) {
      return c.json({ error: 'File not found in storage' }, 404);
    }

    return new Response(r2Object.body, {
      headers: {
        'Content-Type': doc.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${doc.filename}"`,
        'Cache-Control': 'private, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    return c.json({ error: 'Failed to download document' }, 500);
  }
});

// Delete a document from R2
app.delete('/:id', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const documentId = c.req.param('id');

    const doc = await c.env.DB.prepare(
      'SELECT r2_key FROM documents WHERE id = ? AND company_id = ?'
    ).bind(documentId, companyId).first<{ r2_key: string }>();

    if (!doc) {
      return c.json({ error: 'Document not found' }, 404);
    }

    // Delete from R2
    await c.env.DOCUMENTS.delete(doc.r2_key);

    // Delete from database
    await c.env.DB.prepare(
      'DELETE FROM documents WHERE id = ? AND company_id = ?'
    ).bind(documentId, companyId).run();

    return c.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return c.json({ error: 'Failed to delete document' }, 500);
  }
});

export default app;
