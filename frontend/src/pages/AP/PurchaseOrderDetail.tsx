import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
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
          <TransactionCard title="Purchase Order Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
            <div style={{ marginTop: '1rem' }}>
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

          {purchaseOrder?.status === 'sent' && (
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
                <ShoppingCart size={16} />
                Create Receipt
              </button>
            </TransactionCard>
          )}

          {purchaseOrder && (
            <TransactionCard title="Metadata">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: '#6b7280' }}>Created:</span>
                  <br />
                  <span>{new Date(purchaseOrder.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>Last Updated:</span>
                  <br />
                  <span>{new Date(purchaseOrder.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </TransactionCard>
          )}
        </div>
      </div>
    </TransactionLayout>
  );
}
