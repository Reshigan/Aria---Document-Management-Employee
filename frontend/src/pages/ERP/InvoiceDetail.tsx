import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { TransactionLayout, TransactionCard, TransactionField } from '../../components/TransactionLayout';
import { LineItemsTable, LineItem } from '../../components/LineItemsTable';
import { PostingStatus } from '../../components/PostingStatus';
import { AutomationPanel } from '../../components/AutomationPanel';
import { DollarSign, Printer } from 'lucide-react';

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
      onPrint={invoice?.status === 'posted' ? () => alert('Print functionality coming soon') : undefined}
      onEmail={invoice?.status === 'posted' ? () => alert('Email functionality coming soon') : undefined}
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
    </TransactionLayout>
  );
}
