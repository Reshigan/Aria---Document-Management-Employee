import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { TransactionLayout, TransactionCard, TransactionField } from '../../components/TransactionLayout';
import { LineItemsTable, LineItem } from '../../components/LineItemsTable';
import { DollarSign, Printer } from 'lucide-react';

interface Bill {
  id: string;
  bill_number: string;
  supplier_id: string;
  supplier_name?: string;
  bill_date: string;
  due_date: string;
  status: string;
  payment_status: string;
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
}

interface Supplier {
  id: string;
  code: string;
  name: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  cost_price: number;
  unit_of_measure: string;
}

export default function BillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [bill, setBill] = useState<Bill | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  useEffect(() => {
    loadMasterData();
    if (!isNew && id) {
      loadBill(id);
    }
  }, [id, isNew]);

  const loadMasterData = async () => {
    try {
      const [suppliersRes, productsRes] = await Promise.all([
        api.get('/erp/master-data/suppliers'),
        api.get('/erp/order-to-cash/products')
      ]);
      setSuppliers(suppliersRes.data);
      setProducts(productsRes.data);
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  const loadBill = async (billId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/ap/bills/${billId}`);
      const billData = response.data;
      setBill(billData);
      setSupplierId(billData.supplier_id);
      setBillDate(billData.bill_date);
      setDueDate(billData.due_date);
      setNotes(billData.notes || '');
      setTermsAndConditions(billData.terms_and_conditions || '');
      setLineItems(billData.lines || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading bill:', err);
      setError(err.response?.data?.detail || 'Failed to load bill');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!supplierId) {
      setError('Please select a supplier');
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
        supplier_id: supplierId,
        bill_date: billDate,
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
        const response = await api.post('/api/ap/bills', payload);
        navigate(`/ap/bills/${response.data.id}`);
      } else {
        await api.put(`/api/ap/bills/${id}`, payload);
        await loadBill(id!);
      }
    } catch (err: any) {
      console.error('Error saving bill:', err);
      setError(err.response?.data?.detail || 'Failed to save bill');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id || isNew) return;

    try {
      setLoading(true);
      setError(null);
      await api.post(`/api/ap/bills/${id}/approve`);
      await loadBill(id);
    } catch (err: any) {
      console.error('Error approving bill:', err);
      setError(err.response?.data?.detail || 'Failed to approve bill');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!id || isNew) return;

    try {
      setLoading(true);
      setError(null);
      await api.post(`/api/ap/bills/${id}/post`);
      await loadBill(id);
    } catch (err: any) {
      console.error('Error posting bill:', err);
      setError(err.response?.data?.detail || 'Failed to post bill');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = () => {
    navigate(`/ap/payments/new?bill_id=${id}`);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100);
      return sum + lineTotal;
    }, 0);

    const taxAmount = lineItems.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100);
      const lineTax = lineTotal * ((item.tax_rate || 0) / 100);
      return sum + lineTax;
    }, 0);

    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount
    };
  };

  const totals = calculateTotals();

  return (
    <TransactionLayout
      title={isNew ? 'New Bill' : 'Bill'}
      documentNumber={bill?.bill_number}
      status={bill?.status || 'draft'}
      backUrl="/ap/bills"
      onSave={bill?.status === 'draft' || isNew ? handleSave : undefined}
      onApprove={bill?.status === 'draft' && !isNew ? handleApprove : undefined}
      onPost={(bill?.status === 'approved' || bill?.status === 'draft') && !isNew ? handlePost : undefined}
      onPrint={!isNew ? () => window.print() : undefined}
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
          <TransactionCard title="Bill Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <TransactionField
                label="Supplier"
                type="select"
                value={supplierId}
                onChange={setSupplierId}
                options={suppliers.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }))}
                required
                disabled={bill?.status !== 'draft' && !isNew}
              />
              <TransactionField
                label="Bill Date"
                type="date"
                value={billDate}
                onChange={setBillDate}
                required
                disabled={bill?.status !== 'draft' && !isNew}
              />
              <TransactionField
                label="Due Date"
                type="date"
                value={dueDate}
                onChange={setDueDate}
                required
                disabled={bill?.status !== 'draft' && !isNew}
              />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <TransactionField
                label="Notes"
                type="textarea"
                value={notes}
                onChange={setNotes}
                rows={2}
                disabled={bill?.status !== 'draft' && !isNew}
              />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <TransactionField
                label="Terms and Conditions"
                type="textarea"
                value={termsAndConditions}
                onChange={setTermsAndConditions}
                rows={3}
                disabled={bill?.status !== 'draft' && !isNew}
              />
            </div>
          </TransactionCard>

          <TransactionCard title="Line Items">
            <LineItemsTable
              items={lineItems}
              onChange={setLineItems}
              products={products}
              disabled={bill?.status !== 'draft' && !isNew}
            />
          </TransactionCard>
        </div>

        <div>
          {bill && bill.status === 'posted' && (
            <TransactionCard title="Payment Status">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Total Amount:</span>
                  <span style={{ fontWeight: '500' }}>R {bill.total_amount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Amount Paid:</span>
                  <span style={{ fontWeight: '500', color: '#10b981' }}>R {bill.amount_paid.toFixed(2)}</span>
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
                  <span style={{ color: bill.amount_outstanding > 0 ? '#ef4444' : '#10b981' }}>
                    R {bill.amount_outstanding.toFixed(2)}
                  </span>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: 'white',
                    background: bill.payment_status === 'paid' ? '#10b981' : bill.payment_status === 'partial' ? '#8b5cf6' : '#f59e0b',
                    textTransform: 'uppercase'
                  }}>
                    {bill.payment_status}
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

          {bill?.status === 'posted' && bill.amount_outstanding > 0 && (
            <TransactionCard title="Actions">
              <button
                onClick={handleCreatePayment}
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

          {bill && (
            <TransactionCard title="Metadata">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: '#6b7280' }}>Created:</span>
                  <br />
                  <span>{new Date(bill.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>Last Updated:</span>
                  <br />
                  <span>{new Date(bill.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </TransactionCard>
          )}
        </div>
      </div>
    </TransactionLayout>
  );
}
