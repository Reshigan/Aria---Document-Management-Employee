import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { TransactionLayout, TransactionCard, TransactionField } from '../../components/TransactionLayout';
import { LineItemsTable, LineItem } from '../../components/LineItemsTable';
import { FileText } from 'lucide-react';

interface Delivery {
  id: string;
  delivery_number: string;
  sales_order_id?: string;
  sales_order_number?: string;
  customer_id: string;
  customer_name?: string;
  delivery_date: string;
  status: string;
  warehouse_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  lines: LineItem[];
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

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

export default function DeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  useEffect(() => {
    loadMasterData();
    if (!isNew && id) {
      loadDelivery(id);
    }
  }, [id, isNew]);

  const loadMasterData = async () => {
    try {
      const [customersRes, productsRes, warehousesRes] = await Promise.all([
        api.get('/erp/master-data/customers'),
        api.get('/erp/order-to-cash/products'),
        api.get('/erp/order-to-cash/warehouses')
      ]);
      setCustomers(customersRes.data);
      setProducts(productsRes.data);
      setWarehouses(warehousesRes.data);
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  const loadDelivery = async (deliveryId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/erp/order-to-cash/deliveries/${deliveryId}`);
      const deliveryData = response.data;
      setDelivery(deliveryData);
      setCustomerId(deliveryData.customer_id);
      setDeliveryDate(deliveryData.delivery_date);
      setWarehouseId(deliveryData.warehouse_id || '');
      setNotes(deliveryData.notes || '');
      setLineItems(deliveryData.lines || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading delivery:', err);
      setError(err.response?.data?.detail || 'Failed to load delivery');
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
        delivery_date: deliveryDate,
        warehouse_id: warehouseId || null,
        notes: notes || null,
        lines: lineItems.map((item, index) => ({
          line_number: index + 1,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          storage_location_id: null
        }))
      };

      if (isNew) {
        const response = await api.post('/erp/order-to-cash/deliveries', payload);
        navigate(`/deliveries/${response.data.id}`);
      } else {
        await api.put(`/erp/order-to-cash/deliveries/${id}`, payload);
        await loadDelivery(id!);
      }
    } catch (err: any) {
      console.error('Error saving delivery:', err);
      setError(err.response?.data?.detail || 'Failed to save delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleShip = async () => {
    if (!id || isNew) return;

    try {
      setLoading(true);
      setError(null);
      await api.post(`/erp/order-to-cash/deliveries/${id}/ship`);
      await loadDelivery(id);
    } catch (err: any) {
      console.error('Error shipping delivery:', err);
      setError(err.response?.data?.detail || 'Failed to ship delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!id || isNew) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/erp/order-to-cash/invoices', {
        customer_id: customerId,
        delivery_id: id,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        lines: lineItems.map((item, index) => ({
          line_number: index + 1,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent || 0,
          tax_rate: item.tax_rate || 15
        }))
      });
      navigate(`/ar/invoices/${response.data.id}`);
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      setError(err.response?.data?.detail || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TransactionLayout
      title={isNew ? 'New Delivery' : 'Delivery'}
      documentNumber={delivery?.delivery_number}
      status={delivery?.status || 'draft'}
      backUrl="/deliveries"
      onSave={delivery?.status === 'draft' || isNew ? handleSave : undefined}
      onPost={delivery?.status === 'draft' && !isNew ? handleShip : undefined}
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
          <TransactionCard title="Delivery Information">
            {delivery?.sales_order_number && (
              <div style={{
                padding: '0.75rem',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '0.375rem',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                <strong>Sales Order:</strong> {delivery.sales_order_number}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <TransactionField
                label="Customer"
                type="select"
                value={customerId}
                onChange={setCustomerId}
                options={customers.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
                required
                disabled={delivery?.status !== 'draft' && !isNew}
              />
              <TransactionField
                label="Warehouse"
                type="select"
                value={warehouseId}
                onChange={setWarehouseId}
                options={warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
                disabled={delivery?.status !== 'draft' && !isNew}
              />
              <TransactionField
                label="Delivery Date"
                type="date"
                value={deliveryDate}
                onChange={setDeliveryDate}
                required
                disabled={delivery?.status !== 'draft' && !isNew}
              />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <TransactionField
                label="Notes"
                type="textarea"
                value={notes}
                onChange={setNotes}
                rows={3}
                disabled={delivery?.status !== 'draft' && !isNew}
              />
            </div>
          </TransactionCard>

          <TransactionCard title="Line Items">
            <LineItemsTable
              items={lineItems}
              onChange={setLineItems}
              products={products}
              disabled={delivery?.status !== 'draft' && !isNew}
            />
          </TransactionCard>
        </div>

        <div>
          {delivery?.status === 'shipped' && (
            <TransactionCard title="Actions">
              <button
                onClick={handleCreateInvoice}
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
                <FileText size={16} />
                Create Invoice
              </button>
            </TransactionCard>
          )}

          {delivery && (
            <TransactionCard title="Metadata">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: '#6b7280' }}>Created:</span>
                  <br />
                  <span>{new Date(delivery.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>Last Updated:</span>
                  <br />
                  <span>{new Date(delivery.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </TransactionCard>
          )}
        </div>
      </div>
    </TransactionLayout>
  );
}
