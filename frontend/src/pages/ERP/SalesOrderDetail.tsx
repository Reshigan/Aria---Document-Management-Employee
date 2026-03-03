import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { ArrowLeft, Check, Truck, FileText, User, Calendar, Package, DollarSign, Edit, Trash2, AlertCircle, Printer } from 'lucide-react';
import { LineItemsTable, LineItem } from '../../components/LineItemsTable';
import { PostingStatus } from '../../components/PostingStatus';
import { AutomationPanel } from '../../components/AutomationPanel';

interface SalesOrderDetail {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  quote_id?: string;
  quote_number?: string;
  order_date: string;
  required_date?: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  warehouse_id?: string;
  customer_po_number?: string;
  customer_reference?: string;
  delivery_address?: string;
  shipping_method?: string;
  created_at: string;
  updated_at: string;
  lines: OrderLine[];
  gl_entry_id?: string;
  gl_posted?: boolean;
  posted_at?: string;
  posted_by?: string;
}

interface OrderLine {
  id: string;
  line_number: number;
  product_id: string;
  product_code?: string;
  product_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  line_total: number;
  quantity_delivered: number;
  quantity_remaining: number;
}

interface Delivery {
  id: string;
  delivery_number: string;
  delivery_date: string;
  status: string;
  notes?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
}

export default function SalesOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<SalesOrderDetail | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadOrderDetail();
    }
  }, [id]);

  const loadOrderDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/erp/order-to-cash/sales-orders/${id}`);
      setOrder(response.data);

      loadDeliveries(id);
      loadInvoices(id);
    } catch (error: any) {
      console.error('Error loading sales order:', error);
      setError(error.response?.data?.detail || 'Failed to load sales order details');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async (orderId: string) => {
    try {
      const response = await api.get('/erp/order-to-cash/deliveries', {
        params: { sales_order_id: orderId }
      });
      const data = response.data?.data || response.data || [];
      setDeliveries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    }
  };

  const loadInvoices = async (orderId: string) => {
    try {
      const response = await api.get('/erp/order-to-cash/invoices', {
        params: { sales_order_id: orderId }
      });
      const data = response.data?.data || response.data || [];
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const handleApprove = async () => {
    if (!order) return;
    try {
      await api.post(`/erp/order-to-cash/sales-orders/${order.id}/approve`);
      loadOrderDetail();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to approve sales order');
    }
  };

  const handleCreateDelivery = async () => {
    if (!order) return;
    try {
      const response = await api.post('/erp/order-to-cash/deliveries', {
        sales_order_id: order.id
      });
      alert(`Delivery ${response.data.delivery_number} created successfully!`);
      loadDeliveries(order.id);
      loadOrderDetail();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create delivery');
    }
  };

  const handleDelete = async () => {
    if (!order) return;
    if (!confirm('Are you sure you want to delete this sales order? This action cannot be undone.')) return;
    try {
      await api.delete(`/erp/order-to-cash/sales-orders/${order.id}`);
      navigate('/erp/sales-orders');
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete sales order');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      draft: { bg: '#f3f4f6', text: '#6b7280' },
      approved: { bg: '#dbeafe', text: '#2563eb' },
      in_progress: { bg: '#fef3c7', text: '#d97706' },
      completed: { bg: '#d1fae5', text: '#059669' },
      cancelled: { bg: '#fee2e2', text: '#dc2626' }
    };
    return colors[status] || colors.draft;
  };

  const calculateFulfillmentProgress = () => {
    if (!order) return 0;
    const totalQuantity = order.lines.reduce((sum, line) => sum + (line.quantity || 0), 0);
    const deliveredQuantity = order.lines.reduce((sum, line) => sum + (line.quantity_delivered || 0), 0);
    return totalQuantity > 0 ? (deliveredQuantity / totalQuantity) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-lg text-gray-500 dark:text-gray-300">Loading sales order details...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 mb-4">
          {error || 'Sales order not found'}
        </div>
        <button
          onClick={() => navigate('/erp/sales-orders')}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700  transition-all"
        >
          Back to Sales Orders
        </button>
      </div>
    );
  }

  const statusStyle = getStatusColor(order.status);
  const fulfillmentProgress = calculateFulfillmentProgress();

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => navigate('/erp/sales-orders')}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Sales Orders
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Printer size={16} />
            Print Order
          </button>
        </div>

        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Sales Order {order.order_number}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                order.status === 'draft' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                order.status === 'approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                order.status === 'in_progress' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                order.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {order.status.toUpperCase()}
              </span>
              {order.quote_number && (
                <span className="text-xs text-gray-500 dark:text-gray-300">
                  From Quote: <a href={`/erp/quotes/${order.quote_id}`} className="text-blue-600 dark:text-blue-400 underline">{order.quote_number}</a>
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-300">
                Created {(order.created_at ? new Date(order.created_at).toLocaleDateString() : "-")}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {order.status === 'draft' && (
              <>
                <button
                  onClick={handleApprove}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-blue-700  transition-all"
                >
                  <Check size={16} />
                  Approve
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-sm font-medium hover:from-red-600 hover:to-red-700  transition-all"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </>
            )}
            {(order.status === 'approved' || order.status === 'in_progress') && (
              <button
                onClick={handleCreateDelivery}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-emerald-700  transition-all"
              >
                <Truck size={16} />
                Create Delivery
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fulfillment Progress */}
      {order.status !== 'draft' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fulfillment Progress</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{Number(fulfillmentProgress ?? 0).toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${fulfillmentProgress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${fulfillmentProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Order Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Order Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">Customer</div>
                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <User size={16} className="text-gray-300" />
                  {order.customer_name}
                </div>
              </div>
              {order.customer_email && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">Email</div>
                  <div className="font-medium text-gray-900 dark:text-white">{order.customer_email}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">Order Date</div>
                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar size={16} className="text-gray-300" />
                  {(order.order_date ? new Date(order.order_date).toLocaleDateString() : "-")}
                </div>
              </div>
              {order.required_date && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">Required Date</div>
                  <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar size={16} className="text-gray-300" />
                    {(order.required_date ? new Date(order.required_date).toLocaleDateString() : "-")}
                  </div>
                </div>
              )}
            </div>

            {(order.customer_po_number || order.customer_reference || order.delivery_address || order.shipping_method) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {order.customer_po_number && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">Customer PO Number</div>
                    <div className="font-medium text-gray-900 dark:text-white">{order.customer_po_number}</div>
                  </div>
                )}
                {order.customer_reference && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">Customer Reference</div>
                    <div className="font-medium text-gray-900 dark:text-white">{order.customer_reference}</div>
                  </div>
                )}
                {order.delivery_address && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">Delivery Address</div>
                    <div className="font-medium text-gray-900 dark:text-white">{order.delivery_address}</div>
                  </div>
                )}
                {order.shipping_method && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">Shipping Method</div>
                    <div className="font-medium text-gray-900 dark:text-white">{order.shipping_method}</div>
                  </div>
                )}
              </div>
            )}

            {order.notes && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{order.notes}</div>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <LineItemsTable
              items={order.lines}
              onChange={() => {}}
              products={[]}
              readOnly={true}
            />
          </div>

          {/* Audit Trail */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Audit Trail</h2>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-xs text-gray-500 dark:text-gray-300">Created</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {order.created_at ? new Date(order.created_at).toLocaleString() : '-'}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-xs text-gray-500 dark:text-gray-300">Last Updated</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {order.updated_at ? new Date(order.updated_at).toLocaleString() : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Posting Status */}
          <PostingStatus
            status={order.status}
            glEntryId={order.gl_entry_id}
            glPosted={order.gl_posted}
            postedAt={order.posted_at}
            postedBy={order.posted_by}
            onViewJournal={(entryId) => navigate(`/erp/general-ledger?entry=${entryId}`)}
          />

          {/* Automation Panel */}
          <AutomationPanel
            documentType="sales_order"
            documentId={order.id}
            documentData={order}
            onExecutionComplete={() => loadOrderDetail()}
          />

          {/* Deliveries */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Truck size={18} />
              Deliveries ({deliveries.length})
            </h3>
            {deliveries.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-300">No deliveries yet</p>
            ) : (
              <div className="flex flex-col gap-3">
                {deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    onClick={() => navigate(`/erp/deliveries/${delivery.id}`)}
                    className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{delivery.delivery_number}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-300">{delivery.status}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-300">
                      {(delivery.delivery_date ? new Date(delivery.delivery_date).toLocaleDateString() : "-")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoices */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText size={18} />
              Invoices ({invoices.length})
            </h3>
            {invoices.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-300">No invoices yet</p>
            ) : (
              <div className="flex flex-col gap-3">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    onClick={() => navigate(`/erp/invoices/${invoice.id}`)}
                    className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-300">{invoice.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-300">
                        {(invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : "-")}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        R {Number(invoice.total_amount ?? 0).toFixed(2)}
                      </span>
                    </div>
                    {invoice.amount_due > 0 && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Due: R {Number(invoice.amount_due ?? 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-300">Total Items</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {order.lines.reduce((sum, line) => sum + (line.quantity || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-300">Items Delivered</span>
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {order.lines.reduce((sum, line) => sum + (line.quantity_delivered || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-300">Items Remaining</span>
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {order.lines.reduce((sum, line) => sum + (line.quantity_remaining || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-300">Order Value</span>
                <span className="text-base font-semibold text-gray-900 dark:text-white">
                  R {Number(order.total_amount ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
