import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { TransactionLayout, TransactionCard, TransactionField } from '../../components/TransactionLayout';
import { LineItemsTable, LineItem } from '../../components/LineItemsTable';
import { PostingStatus } from '../../components/PostingStatus';
import { AutomationPanel } from '../../components/AutomationPanel';
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
  gl_entry_id?: string;
  gl_posted?: boolean;
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
        api.get('/odoo/inventory/warehouses').catch(() => ({ data: [] }))
      ]);
      const customersData = customersRes.data?.data || customersRes.data || [];
      const productsData = productsRes.data?.data || productsRes.data || [];
      const warehousesData = warehousesRes.data?.data || warehousesRes.data || [];
      setCustomers(Array.isArray(customersData) ? customersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
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
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TransactionCard title="Delivery Information">
            {delivery?.sales_order_number && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl mb-4 text-sm">
                <strong>Sales Order:</strong> {delivery.sales_order_number}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <div className="mt-4">
              <TransactionField
                label="Notes"
                type="textarea"
                value={notes}
                onChange={setNotes}
                rows={2}
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
          {delivery && (
            <>
              <div className="mb-6">
                <PostingStatus
                  status={delivery.status}
                  glEntryId={delivery.gl_entry_id}
                  glPosted={delivery.gl_posted}
                  postedAt={delivery.posted_at}
                  postedBy={delivery.posted_by}
                  onViewJournal={(entryId) => navigate(`/erp/general-ledger?entry=${entryId}`)}
                />
              </div>

              <div className="mb-6">
                <AutomationPanel
                  documentType="delivery"
                  documentId={delivery.id}
                  documentData={delivery}
                  onExecutionComplete={() => loadDelivery(id!)}
                />
              </div>
            </>
          )}

          {delivery?.status === 'shipped' && (
            <TransactionCard title="Actions">
              <button
                onClick={handleCreateInvoice}
                disabled={loading}
                className={`w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-emerald-700  transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <FileText size={16} />
                Create Invoice
              </button>
            </TransactionCard>
          )}

          {delivery && (
            <TransactionCard title="Metadata">
              <div className="flex flex-col gap-2 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Created:</span>
                  <br />
                  <span className="text-gray-900 dark:text-white">{new Date(delivery.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
                  <br />
                  <span className="text-gray-900 dark:text-white">{new Date(delivery.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </TransactionCard>
          )}
        </div>
      </div>
    </TransactionLayout>
  );
}
