import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { ArrowLeft, Check, Truck, FileText, User, Calendar, Package, DollarSign, Edit, Trash2, AlertCircle, Printer } from 'lucide-react';
import { LineItemsTable, LineItem } from '../../components/LineItemsTable';

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
  created_at: string;
  updated_at: string;
  lines: OrderLine[];
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
      setDeliveries(response.data);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    }
  };

  const loadInvoices = async (orderId: string) => {
    try {
      const response = await api.get('/erp/order-to-cash/invoices', {
        params: { sales_order_id: orderId }
      });
      setInvoices(response.data);
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
    const totalQuantity = order.lines.reduce((sum, line) => sum + line.quantity, 0);
    const deliveredQuantity = order.lines.reduce((sum, line) => sum + line.quantity_delivered, 0);
    return totalQuantity > 0 ? (deliveredQuantity / totalQuantity) * 100 : 0;
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.125rem', color: '#6b7280' }}>Loading sales order details...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{
          padding: '1rem',
          background: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '0.5rem',
          color: '#dc2626',
          marginBottom: '1rem'
        }}>
          {error || 'Sales order not found'}
        </div>
        <button
          onClick={() => navigate('/erp/sales-orders')}
          style={{
            padding: '0.5rem 1rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}
        >
          Back to Sales Orders
        </button>
      </div>
    );
  }

  const statusStyle = getStatusColor(order.status);
  const fulfillmentProgress = calculateFulfillmentProgress();

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            onClick={() => navigate('/erp/sales-orders')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} />
            Back to Sales Orders
          </button>
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            <Printer size={16} />
            Print Order
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Sales Order {order.order_number}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: '500',
                background: statusStyle.bg,
                color: statusStyle.text
              }}>
                {order.status.toUpperCase()}
              </span>
              {order.quote_number && (
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  From Quote: <a href={`/erp/quotes/${order.quote_id}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>{order.quote_number}</a>
                </span>
              )}
              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Created {new Date(order.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {order.status === 'draft' && (
              <>
                <button
                  onClick={handleApprove}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  <Check size={16} />
                  Approve
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </>
            )}
            {(order.status === 'approved' || order.status === 'in_progress') && (
              <button
                onClick={handleCreateDelivery}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
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
        <div style={{ 
          background: 'white', 
          borderRadius: '0.5rem', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Fulfillment Progress</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{fulfillmentProgress.toFixed(0)}%</span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            background: '#e5e7eb', 
            borderRadius: '9999px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${fulfillmentProgress}%`, 
              height: '100%', 
              background: fulfillmentProgress === 100 ? '#10b981' : '#3b82f6',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Order Details Card */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Order Details</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Customer</div>
                <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={16} style={{ color: '#6b7280' }} />
                  {order.customer_name}
                </div>
              </div>
              {order.customer_email && (
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Email</div>
                  <div style={{ fontWeight: '500' }}>{order.customer_email}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Order Date</div>
                <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={16} style={{ color: '#6b7280' }} />
                  {new Date(order.order_date).toLocaleDateString()}
                </div>
              </div>
              {order.required_date && (
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Required Date</div>
                  <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} style={{ color: '#6b7280' }} />
                    {new Date(order.required_date).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {order.notes && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.375rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Notes</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{order.notes}</div>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
            <LineItemsTable
              items={order.lines}
              onChange={() => {}}
              products={[]}
              readOnly={true}
            />
          </div>

          {/* Audit Trail */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Audit Trail</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f9fafb', borderRadius: '0.375rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Created</span>
                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                  {new Date(order.created_at).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f9fafb', borderRadius: '0.375rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Last Updated</span>
                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                  {new Date(order.updated_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Deliveries */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={18} />
              Deliveries ({deliveries.length})
            </h3>
            {deliveries.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>No deliveries yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    onClick={() => navigate(`/erp/deliveries/${delivery.id}`)}
                    style={{
                      padding: '0.75rem',
                      background: '#f9fafb',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f9fafb'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{delivery.delivery_number}</span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{delivery.status}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {new Date(delivery.delivery_date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoices */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} />
              Invoices ({invoices.length})
            </h3>
            {invoices.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>No invoices yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    onClick={() => navigate(`/erp/invoices/${invoice.id}`)}
                    style={{
                      padding: '0.75rem',
                      background: '#f9fafb',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f9fafb'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{invoice.invoice_number}</span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{invoice.status}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                        R {invoice.total_amount.toFixed(2)}
                      </span>
                    </div>
                    {invoice.amount_due > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '0.25rem' }}>
                        Due: R {invoice.amount_due.toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Order Summary</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Items</span>
                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                  {order.lines.reduce((sum, line) => sum + line.quantity, 0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Items Delivered</span>
                <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#059669' }}>
                  {order.lines.reduce((sum, line) => sum + line.quantity_delivered, 0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Items Remaining</span>
                <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#d97706' }}>
                  {order.lines.reduce((sum, line) => sum + line.quantity_remaining, 0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Order Value</span>
                <span style={{ fontSize: '1rem', fontWeight: '600' }}>
                  R {order.total_amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
