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
                    <td>R ${Number(line.unit_price ?? 0).toFixed(2)}</td>
                    <td>${line.tax_rate || 15}%</td>
                    <td>R ${Number(lineTotal ?? 0).toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        
          <div class="totals">
            <div class="row"><span>Subtotal:</span><span>R ${Number(invoice.subtotal ?? 0).toFixed(2)}</span></div>
            <div class="row"><span>VAT (15%):</span><span>R ${Number(invoice.tax_amount ?? 0).toFixed(2)}</span></div>
            <div class="row total"><span>Total:</span><span>R ${Number(invoice.total_amount ?? 0).toFixed(2)}</span></div>
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
  - Total Amount: R ${Number(invoice.total_amount ?? 0).toFixed(2)}

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
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TransactionCard title="Invoice Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="mt-4">
              <TransactionField
                label="Notes"
                type="textarea"
                value={notes}
                onChange={setNotes}
                rows={2}
                disabled={invoice?.status !== 'draft' && !isNew}
              />
            </div>
            <div className="mt-4">
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
              <div className="mb-6">
                <PostingStatus
                  status={invoice.status}
                  glEntryId={invoice.journal_entry_id}
                  glPosted={invoice.status === 'posted'}
                  postedAt={invoice.posted_at}
                  postedBy={invoice.posted_by}
                  onViewJournal={(entryId) => navigate(`/erp/general-ledger?entry=${entryId}`)}
                />
              </div>

              <div className="mb-6">
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
              <div className="flex flex-col gap-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total Amount:</span>
                  <span className="font-medium text-gray-900 dark:text-white">R {Number(invoice.total_amount ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Amount Paid:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">R {Number(invoice.amount_paid ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t-2 border-gray-200 dark:border-gray-700 text-lg font-semibold">
                  <span className="text-gray-900 dark:text-white">Outstanding:</span>
                  <span className={invoice.amount_outstanding > 0 ? 'text-red-500' : 'text-emerald-500'}>
                    R {Number(invoice.amount_outstanding ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white uppercase ${
                    invoice.payment_status === 'paid' ? 'bg-emerald-500' : invoice.payment_status === 'partial' ? 'bg-purple-500' : 'bg-amber-500'
                  }`}>
                    {invoice.payment_status}
                  </span>
                </div>
              </div>
            </TransactionCard>
          )}

          <TransactionCard title="Totals">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
                <span className="font-medium text-gray-900 dark:text-white">R {Number(totals.subtotal ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Tax (VAT):</span>
                <span className="font-medium text-gray-900 dark:text-white">R {Number(totals.taxAmount ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t-2 border-gray-200 dark:border-gray-700 text-lg font-semibold">
                <span className="text-gray-900 dark:text-white">Total:</span>
                <span className="text-gray-900 dark:text-white">R {Number(totals.total ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </TransactionCard>

          {invoice?.status === 'posted' && invoice.amount_outstanding > 0 && (
            <TransactionCard title="Actions">
              <button
                onClick={handleCreateReceipt}
                disabled={loading}
                className={`w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/30 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <DollarSign size={16} />
                Record Payment
              </button>
            </TransactionCard>
          )}

          {invoice && (
            <TransactionCard title="Metadata">
              <div className="flex flex-col gap-2 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Created:</span>
                  <br />
                  <span className="text-gray-900 dark:text-white">{new Date(invoice.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
                  <br />
                  <span className="text-gray-900 dark:text-white">{new Date(invoice.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </TransactionCard>
          )}
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-[600px] max-h-[90vh] overflow-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Mail size={20} />
                Send Invoice via Email
              </h2>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">To *</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Message</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                />
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-xl text-sm text-gray-600 dark:text-gray-300">
                <strong>Note:</strong> The invoice PDF will be automatically attached to this email.
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailTo}
                className={`px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium flex items-center gap-2 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30 transition-all ${sendingEmail || !emailTo ? 'opacity-50 cursor-not-allowed' : ''}`}
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
