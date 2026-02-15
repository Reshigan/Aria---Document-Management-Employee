import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
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

  const handleCancel = async () => {
    if (!id || isNew) return;

    const reason = prompt('Enter cancellation reason (optional):');
    if (reason === null) return;

    try {
      setLoading(true);
      setError(null);
      await api.post(`/erp/procure-to-pay/invoices/${id}/cancel`, {
        reason: reason || 'User cancelled'
      });
      await loadBill(id);
    } catch (err: any) {
      console.error('Error cancelling bill:', err);
      setError(err.response?.data?.detail || 'Failed to cancel bill');
    } finally {
      setLoading(false);
    }
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
      onCancel={bill?.status === 'draft' && !isNew ? handleCancel : undefined}
      onPrint={!isNew ? () => window.print() : undefined}
      loading={loading}
    >
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TransactionCard title="Bill Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="mt-4">
              <TransactionField
                label="Notes"
                type="textarea"
                value={notes}
                onChange={setNotes}
                rows={2}
                disabled={bill?.status !== 'draft' && !isNew}
              />
            </div>
            <div className="mt-4">
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
              <div className="flex flex-col gap-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total Amount:</span>
                  <span className="font-medium text-gray-900 dark:text-white">R {Number(bill.total_amount ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Amount Paid:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">R {Number(bill.amount_paid ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t-2 border-gray-200 dark:border-gray-700 text-lg font-semibold">
                  <span className="text-gray-900 dark:text-white">Outstanding:</span>
                  <span className={bill.amount_outstanding > 0 ? 'text-red-500' : 'text-emerald-500'}>
                    R {Number(bill.amount_outstanding ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white uppercase ${
                    bill.payment_status === 'paid' ? 'bg-emerald-500' : bill.payment_status === 'partial' ? 'bg-purple-500' : 'bg-amber-500'
                  }`}>
                    {bill.payment_status}
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

          {bill?.status === 'posted' && bill.amount_outstanding > 0 && (
            <TransactionCard title="Actions">
              <button
                onClick={handleCreatePayment}
                disabled={loading}
                className={`w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/30 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <DollarSign size={16} />
                Record Payment
              </button>
            </TransactionCard>
          )}

          {bill && (
            <TransactionCard title="Metadata">
              <div className="flex flex-col gap-2 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Created:</span>
                  <br />
                  <span className="text-gray-900 dark:text-white">{new Date(bill.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
                  <br />
                  <span className="text-gray-900 dark:text-white">{new Date(bill.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </TransactionCard>
          )}
        </div>
      </div>
    </TransactionLayout>
  );
}
