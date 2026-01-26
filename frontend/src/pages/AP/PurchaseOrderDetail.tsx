import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { TransactionLayout, TransactionCard, TransactionField } from '../../components/TransactionLayout';
import { LineItemsTable, LineItem } from '../../components/LineItemsTable';
import { ShoppingCart, Printer } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  order_date: string;
  expected_delivery_date?: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
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

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  useEffect(() => {
    loadMasterData();
    if (!isNew && id) {
      loadPurchaseOrder(id);
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

  const loadPurchaseOrder = async (poId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/erp/procure-to-pay/purchase-orders/${poId}`);
      const poData = response.data;
      setPurchaseOrder(poData);
      setSupplierId(poData.supplier_id);
      setOrderDate(poData.order_date);
      setExpectedDeliveryDate(poData.expected_delivery_date || '');
      setNotes(poData.notes || '');
      setLineItems(poData.lines || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading purchase order:', err);
      setError(err.response?.data?.detail || 'Failed to load purchase order');
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
        order_date: orderDate,
        expected_delivery_date: expectedDeliveryDate || null,
        notes: notes || null,
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
        const response = await api.post('/erp/procure-to-pay/purchase-orders', payload);
        navigate(`/ap/purchase-orders/${response.data.id}`);
      } else {
        await api.put(`/erp/procure-to-pay/purchase-orders/${id}`, payload);
        await loadPurchaseOrder(id!);
      }
    } catch (err: any) {
      console.error('Error saving purchase order:', err);
      setError(err.response?.data?.detail || 'Failed to save purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id || isNew) return;

    try {
      setLoading(true);
      setError(null);
      await api.post(`/erp/procure-to-pay/purchase-orders/${id}/approve`);
      await loadPurchaseOrder(id);
    } catch (err: any) {
      console.error('Error approving purchase order:', err);
      setError(err.response?.data?.detail || 'Failed to approve purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!id || isNew) return;

    try {
      setLoading(true);
      setError(null);
      await api.post(`/erp/procure-to-pay/purchase-orders/${id}/send`);
      await loadPurchaseOrder(id);
    } catch (err: any) {
      console.error('Error sending purchase order:', err);
      setError(err.response?.data?.detail || 'Failed to send purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReceipt = () => {
    navigate(`/ap/receipts/new?purchase_order_id=${id}`);
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
      title={isNew ? 'New Purchase Order' : 'Purchase Order'}
      documentNumber={purchaseOrder?.po_number}
      status={purchaseOrder?.status || 'draft'}
      backUrl="/ap/purchase-orders"
      onSave={purchaseOrder?.status === 'draft' || isNew ? handleSave : undefined}
      onApprove={purchaseOrder?.status === 'draft' && !isNew ? handleApprove : undefined}
      onPost={purchaseOrder?.status === 'approved' && !isNew ? handleSend : undefined}
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
          <TransactionCard title="Purchase Order Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TransactionField
                label="Supplier"
                type="select"
                value={supplierId}
                onChange={setSupplierId}
                options={suppliers.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }))}
                required
                disabled={purchaseOrder?.status !== 'draft' && !isNew}
              />
              <TransactionField
                label="Order Date"
                type="date"
                value={orderDate}
                onChange={setOrderDate}
                required
                disabled={purchaseOrder?.status !== 'draft' && !isNew}
              />
              <TransactionField
                label="Expected Delivery Date"
                type="date"
                value={expectedDeliveryDate}
                onChange={setExpectedDeliveryDate}
                disabled={purchaseOrder?.status !== 'draft' && !isNew}
              />
            </div>
            <div className="mt-4">
              <TransactionField
                label="Notes"
                type="textarea"
                value={notes}
                onChange={setNotes}
                rows={3}
                disabled={purchaseOrder?.status !== 'draft' && !isNew}
              />
            </div>
          </TransactionCard>

          <TransactionCard title="Line Items">
            <LineItemsTable
              items={lineItems}
              onChange={setLineItems}
              products={products}
              disabled={purchaseOrder?.status !== 'draft' && !isNew}
            />
          </TransactionCard>
        </div>

        <div>
          <TransactionCard title="Totals">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
                <span className="font-medium text-gray-900 dark:text-white">R {totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Tax (VAT):</span>
                <span className="font-medium text-gray-900 dark:text-white">R {totals.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t-2 border-gray-200 dark:border-gray-700 text-lg font-semibold">
                <span className="text-gray-900 dark:text-white">Total:</span>
                <span className="text-gray-900 dark:text-white">R {totals.total.toFixed(2)}</span>
              </div>
            </div>
          </TransactionCard>

          {purchaseOrder?.status === 'sent' && (
            <TransactionCard title="Actions">
              <button
                onClick={handleCreateReceipt}
                disabled={loading}
                className={`w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/30 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <ShoppingCart size={16} />
                Create Receipt
              </button>
            </TransactionCard>
          )}

          {purchaseOrder && (
            <TransactionCard title="Metadata">
              <div className="flex flex-col gap-2 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Created:</span>
                  <br />
                  <span className="text-gray-900 dark:text-white">{new Date(purchaseOrder.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
                  <br />
                  <span className="text-gray-900 dark:text-white">{new Date(purchaseOrder.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </TransactionCard>
          )}
        </div>
      </div>
    </TransactionLayout>
  );
}
