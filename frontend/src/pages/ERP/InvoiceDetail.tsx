import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { TransactionLayout, TransactionCard, TransactionField } from '../../components/TransactionLayout';
import { LineItemsTable, LineItem } from '../../components/LineItemsTable';
import { PostingStatus } from '../../components/PostingStatus';
import { AutomationPanel } from '../../components/AutomationPanel';
import { DollarSign, Printer, Mail, X } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name?: string;
  invoice_date: string;
  due_date: string;
  status: string;
  payment_status: string;
  sales_order_id?: string;
  delivery_id?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_outstanding: number;
  notes?: string;
  terms_and_conditions?: string;
  created_at: string;
  updated_at: string;
  lines: LineItem[];
  journal_entry_id?: string;  // Backend uses journal_entry_id not gl_entry_id
  posted_at?: string;
  posted_by?: string;
}

interface Customer {
  id: string;
  code: string;
  name: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  selling_price: number;
  unit_of_measure: string;
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

    const [customerId, setCustomerId] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [notes, setNotes] = useState('');
    const [termsAndConditions, setTermsAndConditions] = useState('');
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailTo, setEmailTo] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    loadMasterData();
    if (!isNew && id) {
      loadInvoice(id);
    }
  }, [id, isNew]);

  const loadMasterData = async () => {
    try {
      const [customersRes, productsRes] = await Promise.all([
        api.get('/erp/master-data/customers'),
        api.get('/erp/order-to-cash/products')
      ]);
      setCustomers(customersRes.data);
      setProducts(productsRes.data);
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  const loadInvoice = async (invoiceId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/erp/order-to-cash/invoices/${invoiceId}`);
      const invoiceData = response.data;
      setInvoice(invoiceData);
      setCustomerId(invoiceData.customer_id);
      setInvoiceDate(invoiceData.invoice_date);
      setDueDate(invoiceData.due_date);
      setNotes(invoiceData.notes || '');
      setTermsAndConditions(invoiceData.terms_and_conditions || '');
      setLineItems(invoiceData.lines || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading invoice:', err);
      setError(err.response?.data?.detail || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customerId) {
      setError('Please select a customer');
      return;
    }

    if (lineItems.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        customer_id: customerId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        notes: notes || null,
        terms_and_conditions: termsAndConditions || null,
        lines: lineItems.map((item, index) => ({
          line_number: index + 1,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent || 0,
          tax_rate: item.tax_rate || 15
        }))
      };

      if (isNew) {
        const response = await api.post('/api/ar/invoices', payload);
        navigate(`/ar/invoices/${response.data.id}`);
      } else {
        await api.put(`/api/ar/invoices/${id}`, payload);
        await loadInvoice(id!);
      }
    } catch (err: any) {
      console.error('Error saving invoice:', err);
      setError(err.response?.data?.detail || 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id || isNew) return;

    try {
      setLoading(true);
      setError(null);
      await api.post(`/api/ar/invoices/${id}/approve`);
      await loadInvoice(id);
    } catch (err: any) {
      console.error('Error approving invoice:', err);
      setError(err.response?.data?.detail || 'Failed to approve invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!id || isNew) return;

    try {
      setLoading(true);
      setError(null);
      await api.post(`/api/ar/invoices/${id}/post`);
      await loadInvoice(id);
    } catch (err: any) {
      console.error('Error posting invoice:', err);
      setError(err.response?.data?.detail || 'Failed to post invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReceipt = () => {
    if (!id || isNew) return;
    navigate(`/ar/receipts/new?invoice_id=${id}`);
  };

  const handleCancel = async () => {
    if (!id || isNew) return;

    const reason = prompt('Enter cancellation reason (optional):');
    if (reason === null) return;

    try {
      setLoading(true);
      setError(null);
      await api.post(`/erp/order-to-cash/invoices/${id}/cancel`, {
        reason: reason || 'User cancelled'
      });
      await loadInvoice(id);
    } catch (err: any) {
      console.error('Error cancelling invoice:', err);
      setError(err.response?.data?.detail || 'Failed to cancel invoice');
    } finally {
      setLoading(false);
    }
  };

    const calculateTotals = () => {
      let subtotal = 0;
      let taxAmount = 0;

      lineItems.forEach((item) => {
        const lineSubtotal = item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100);
        const lineTax = lineSubtotal * ((item.tax_rate || 15) / 100);
        subtotal += lineSubtotal;
        taxAmount += lineTax;
      });

      return {
        subtotal,
        taxAmount,
        total: subtotal + taxAmount
      };
    };

    const handlePrint = () => {
      if (!invoice) return;
    
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print the invoice');
        return;
      }
    
      const customer = customers.find(c => c.id === invoice.customer_id);
    
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 5px 0; color: #666; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-box { background: #f5f5f5; padding: 15px; border-radius: 5px; }
            .info-box h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; }
            .info-box p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #333; color: white; }
            .totals { text-align: right; }
            .totals .row { display: flex; justify-content: flex-end; gap: 50px; margin: 5px 0; }
            .totals .total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
            .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>TAX INVOICE</h1>
            <p>Invoice #: ${invoice.invoice_number}</p>
          </div>
        
          <div class="info-grid">
            <div class="info-box">
              <h3>Bill To</h3>
              <p><strong>${customer?.name || 'Customer'}</strong></p>
              <p>Customer Code: ${customer?.code || 'N/A'}</p>
            </div>
            <div class="info-box">
              <h3>Invoice Details</h3>
              <p><strong>Invoice Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
            </div>
          </div>
        
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Tax</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.lines.map((line, idx) => {
                const lineTotal = line.quantity * line.unit_price * (1 - (line.discount_percent || 0) / 100);
                return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${line.description}</td>
                    <td>${line.quantity}</td>
                    <td>R ${line.unit_price.toFixed(2)}</td>
                    <td>${line.tax_rate || 15}%</td>
                    <td>R ${lineTotal.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        
          <div class="totals">
            <div class="row"><span>Subtotal:</span><span>R ${invoice.subtotal.toFixed(2)}</span></div>
            <div class="row"><span>VAT (15%):</span><span>R ${invoice.tax_amount.toFixed(2)}</span></div>
            <div class="row total"><span>Total:</span><span>R ${invoice.total_amount.toFixed(2)}</span></div>
          </div>
        
          ${invoice.notes ? `<div style="margin-top: 30px;"><strong>Notes:</strong><p>${invoice.notes}</p></div>` : ''}
          ${invoice.terms_and_conditions ? `<div style="margin-top: 20px;"><strong>Terms & Conditions:</strong><p>${invoice.terms_and_conditions}</p></div>` : ''}
        
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `);
    
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };

    const handleOpenEmailModal = () => {
      if (!invoice) return;
    
      const customer = customers.find(c => c.id === invoice.customer_id);
      setEmailTo('');
      setEmailSubject(`Invoice ${invoice.invoice_number} from ARIA ERP`);
      setEmailBody(`Dear ${customer?.name || 'Customer'},

  Please find attached Invoice ${invoice.invoice_number} dated ${new Date(invoice.invoice_date).toLocaleDateString()}.

  Invoice Details:
  - Invoice Number: ${invoice.invoice_number}
  - Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString()}
  - Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
  - Total Amount: R ${invoice.total_amount.toFixed(2)}

  Payment is due by ${new Date(invoice.due_date).toLocaleDateString()}.

  Thank you for your business.

  Best regards,
  ARIA ERP System`);
      setShowEmailModal(true);
    };

    const handleSendEmail = async () => {
      if (!invoice || !emailTo) {
        alert('Please enter a recipient email address');
        return;
      }
    
      setSendingEmail(true);
      try {
        await api.post('/api/email/send', {
          to: emailTo,
          subject: emailSubject,
          body: emailBody,
          document_type: 'invoice',
          document_id: invoice.id,
        });
        alert('Email sent successfully!');
        setShowEmailModal(false);
      } catch (err: any) {
        console.error('Error sending email:', err);
        alert(err.response?.data?.detail || 'Failed to send email. Please try again.');
      } finally {
        setSendingEmail(false);
      }
    };

    const totals = calculateTotals();

    return (
    <TransactionLayout
      title={isNew ? 'New Invoice' : 'Invoice'}
      documentNumber={invoice?.invoice_number}
      status={invoice?.status || 'draft'}
      backUrl="/invoices"
      onSave={invoice?.status === 'draft' || isNew ? handleSave : undefined}
      onApprove={invoice?.status === 'draft' && !isNew ? handleApprove : undefined}
      onPost={(invoice?.status === 'approved' || invoice?.status === 'draft') && !isNew ? handlePost : undefined}
      onCancel={invoice?.status === 'draft' && !isNew ? handleCancel : undefined}
            onPrint={invoice?.status === 'posted' ? handlePrint : undefined}
            onEmail={invoice?.status === 'posted' ? handleOpenEmailModal : undefined}
      loading={loading}
    >
      {error && (
        <div style={{
          padding: '1rem',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          color: '#991b1b',
          marginBottom: '1.5rem'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div>
          <TransactionCard title="Invoice Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <TransactionField
                label="Customer"
                type="select"
                value={customerId}
                onChange={setCustomerId}
                options={customers.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
                required
                disabled={invoice?.status !== 'draft' && !isNew}
              />
              <TransactionField
                label="Invoice Date"
                type="date"
                value={invoiceDate}
                onChange={setInvoiceDate}
                required
                disabled={invoice?.status !== 'draft' && !isNew}
              />
              <TransactionField
                label="Due Date"
                type="date"
                value={dueDate}
                onChange={setDueDate}
                required
                disabled={invoice?.status !== 'draft' && !isNew}
              />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <TransactionField
                label="Notes"
                type="textarea"
                value={notes}
                onChange={setNotes}
                rows={2}
                disabled={invoice?.status !== 'draft' && !isNew}
              />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <TransactionField
                label="Terms and Conditions"
                type="textarea"
                value={termsAndConditions}
                onChange={setTermsAndConditions}
                rows={3}
                disabled={invoice?.status !== 'draft' && !isNew}
              />
            </div>
          </TransactionCard>

          <TransactionCard title="Line Items">
            <LineItemsTable
              items={lineItems}
              onChange={setLineItems}
              products={products}
              disabled={invoice?.status !== 'draft' && !isNew}
            />
          </TransactionCard>
        </div>

        <div>
          {invoice && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <PostingStatus
                  status={invoice.status}
                  glEntryId={invoice.journal_entry_id}
                  glPosted={invoice.status === 'posted'}
                  postedAt={invoice.posted_at}
                  postedBy={invoice.posted_by}
                  onViewJournal={(entryId) => navigate(`/erp/general-ledger?entry=${entryId}`)}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <AutomationPanel
                  documentType="invoice"
                  documentId={invoice.id}
                  documentData={invoice}
                  onExecutionComplete={() => loadInvoice(id!)}
                />
              </div>
            </>
          )}

          {invoice && invoice.status === 'posted' && (
            <TransactionCard title="Payment Status">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Total Amount:</span>
                  <span style={{ fontWeight: '500' }}>R {invoice.total_amount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Amount Paid:</span>
                  <span style={{ fontWeight: '500', color: '#10b981' }}>R {invoice.amount_paid.toFixed(2)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '2px solid #e5e7eb',
                  fontSize: '1.125rem',
                  fontWeight: '600'
                }}>
                  <span>Outstanding:</span>
                  <span style={{ color: invoice.amount_outstanding > 0 ? '#ef4444' : '#10b981' }}>
                    R {invoice.amount_outstanding.toFixed(2)}
                  </span>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: 'white',
                    background: invoice.payment_status === 'paid' ? '#10b981' : invoice.payment_status === 'partial' ? '#8b5cf6' : '#f59e0b',
                    textTransform: 'uppercase'
                  }}>
                    {invoice.payment_status}
                  </span>
                </div>
              </div>
            </TransactionCard>
          )}

          <TransactionCard title="Totals">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Subtotal:</span>
                <span style={{ fontWeight: '500' }}>R {totals.subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Tax (VAT):</span>
                <span style={{ fontWeight: '500' }}>R {totals.taxAmount.toFixed(2)}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '0.75rem',
                borderTop: '2px solid #e5e7eb',
                fontSize: '1.125rem',
                fontWeight: '600'
              }}>
                <span>Total:</span>
                <span>R {totals.total.toFixed(2)}</span>
              </div>
            </div>
          </TransactionCard>

          {invoice?.status === 'posted' && invoice.amount_outstanding > 0 && (
            <TransactionCard title="Actions">
              <button
                onClick={handleCreateReceipt}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: loading ? 0.5 : 1
                }}
              >
                <DollarSign size={16} />
                Record Payment
              </button>
            </TransactionCard>
          )}

          {invoice && (
            <TransactionCard title="Metadata">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: '#6b7280' }}>Created:</span>
                  <br />
                  <span>{new Date(invoice.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>Last Updated:</span>
                  <br />
                  <span>{new Date(invoice.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </TransactionCard>
          )}
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={20} />
                Send Invoice via Email
              </h2>
              <button onClick={() => setShowEmailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>To *</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Message</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={10}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical' }}
                />
              </div>
              <div style={{ backgroundColor: '#f3f4f6', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#6b7280' }}>
                <strong>Note:</strong> The invoice PDF will be automatically attached to this email.
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowEmailModal(false)}
                style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', backgroundColor: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailTo}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: sendingEmail ? 'not-allowed' : 'pointer',
                  opacity: sendingEmail || !emailTo ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Mail size={16} />
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </TransactionLayout>
  );
}
