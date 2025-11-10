import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Mail, Check, X, FileText, User, Calendar, DollarSign, Package, Clock, Edit, Trash2 } from 'lucide-react';

interface QuoteDetail {
  id: string;
  quote_number: string;
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  quote_date: string;
  valid_until: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  terms_and_conditions?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  lines: QuoteLine[];
}

interface QuoteLine {
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
}

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  email: string;
  phone?: string;
  address?: string;
  total_quotes: number;
  total_orders: number;
  total_revenue: number;
}

interface RelatedOrder {
  id: string;
  order_number: string;
  order_date: string;
  status: string;
  total_amount: number;
}

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [relatedOrders, setRelatedOrders] = useState<RelatedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadQuoteDetail();
    }
  }, [id]);

  const loadQuoteDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/erp/order-to-cash/quotes/${id}`);
      setQuote(response.data);

      if (response.data.customer_id) {
        loadCustomerDetails(response.data.customer_id);
        loadRelatedOrders(response.data.customer_id);
      }
    } catch (error: any) {
      console.error('Error loading quote:', error);
      setError(error.response?.data?.detail || 'Failed to load quote details');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerDetails = async (customerId: string) => {
    try {
      const response = await axios.get(`/api/erp/order-to-cash/customers/${customerId}`);
      setCustomer(response.data);
    } catch (error) {
      console.error('Error loading customer:', error);
    }
  };

  const loadRelatedOrders = async (customerId: string) => {
    try {
      const response = await axios.get(`/api/erp/order-to-cash/sales-orders`, {
        params: { customer_id: customerId }
      });
      setRelatedOrders(response.data);
    } catch (error) {
      console.error('Error loading related orders:', error);
    }
  };

  const handleApprove = async () => {
    if (!quote) return;
    try {
      await axios.post(`/api/erp/order-to-cash/quotes/${quote.id}/approve`);
      loadQuoteDetail();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to approve quote');
    }
  };

  const handleSend = async () => {
    if (!quote) return;
    try {
      await axios.post(`/api/erp/order-to-cash/quotes/${quote.id}/send`);
      alert('Quote sent successfully to customer email');
      loadQuoteDetail();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to send quote');
    }
  };

  const handleAccept = async () => {
    if (!quote) return;
    try {
      const response = await axios.post(`/api/erp/order-to-cash/quotes/${quote.id}/accept`);
      alert(`Quote accepted! Sales Order ${response.data.sales_order_number} created.`);
      navigate(`/erp/sales-orders/${response.data.sales_order_id}`);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to accept quote');
    }
  };

  const handleReject = async () => {
    if (!quote) return;
    if (!confirm('Are you sure you want to reject this quote?')) return;
    try {
      await axios.post(`/api/erp/order-to-cash/quotes/${quote.id}/reject`);
      loadQuoteDetail();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to reject quote');
    }
  };

  const handleDelete = async () => {
    if (!quote) return;
    if (!confirm('Are you sure you want to delete this quote? This action cannot be undone.')) return;
    try {
      await axios.delete(`/api/erp/order-to-cash/quotes/${quote.id}`);
      navigate('/erp/quotes');
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete quote');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      draft: { bg: '#f3f4f6', text: '#6b7280' },
      approved: { bg: '#dbeafe', text: '#2563eb' },
      sent: { bg: '#fef3c7', text: '#d97706' },
      accepted: { bg: '#d1fae5', text: '#059669' },
      rejected: { bg: '#fee2e2', text: '#dc2626' },
      expired: { bg: '#f3f4f6', text: '#6b7280' }
    };
    return colors[status] || colors.draft;
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.125rem', color: '#6b7280' }}>Loading quote details...</div>
      </div>
    );
  }

  if (error || !quote) {
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
          {error || 'Quote not found'}
        </div>
        <button
          onClick={() => navigate('/erp/quotes')}
          style={{
            padding: '0.5rem 1rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}
        >
          Back to Quotes
        </button>
      </div>
    );
  }

  const statusStyle = getStatusColor(quote.status);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/erp/quotes')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          <ArrowLeft size={16} />
          Back to Quotes
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Quote {quote.quote_number}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: '500',
                background: statusStyle.bg,
                color: statusStyle.text
              }}>
                {quote.status.toUpperCase()}
              </span>
              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Created {new Date(quote.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {quote.status === 'draft' && (
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
            {quote.status === 'approved' && (
              <button
                onClick={handleSend}
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
                <Mail size={16} />
                Send to Customer
              </button>
            )}
            {quote.status === 'sent' && (
              <>
                <button
                  onClick={handleAccept}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  <Check size={16} />
                  Accept & Create SO
                </button>
                <button
                  onClick={handleReject}
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
                  <X size={16} />
                  Reject
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quote Details Card */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Quote Details</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Customer</div>
                <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={16} style={{ color: '#6b7280' }} />
                  {quote.customer_name}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Email</div>
                <div style={{ fontWeight: '500' }}>{quote.customer_email}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Quote Date</div>
                <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={16} style={{ color: '#6b7280' }} />
                  {new Date(quote.quote_date).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Valid Until</div>
                <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} style={{ color: '#6b7280' }} />
                  {new Date(quote.valid_until).toLocaleDateString()}
                </div>
              </div>
            </div>

            {quote.notes && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.375rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Notes</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{quote.notes}</div>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={20} />
              Line Items
            </h2>
            
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>#</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Product</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Qty</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Unit Price</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Discount</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Tax</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lines.map((line) => (
                    <tr key={line.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{line.line_number}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: '500' }}>
                        {line.product_code || line.product_name || '-'}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>{line.description}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right' }}>{line.quantity}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right' }}>
                        R {line.unit_price.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right' }}>
                        {line.discount_percent}%
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right' }}>
                        {line.tax_rate}%
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '500' }}>
                        R {line.line_total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4rem' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Subtotal</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Tax</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: '600', marginTop: '0.5rem' }}>Total</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>R {quote.subtotal.toFixed(2)}</div>
                  <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>R {quote.tax_amount.toFixed(2)}</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: '600', marginTop: '0.5rem' }}>
                    R {quote.total_amount.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Trail */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Audit Trail</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f9fafb', borderRadius: '0.375rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Created</span>
                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                  {new Date(quote.created_at).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f9fafb', borderRadius: '0.375rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Last Updated</span>
                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                  {new Date(quote.updated_at).toLocaleString()}
                </span>
              </div>
              {quote.created_by && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f9fafb', borderRadius: '0.375rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Created By</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{quote.created_by}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Customer Info */}
          {customer && (
            <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Customer Information</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Name</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{customer.customer_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Code</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{customer.customer_code}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Email</div>
                  <div style={{ fontSize: '0.875rem' }}>{customer.email}</div>
                </div>
                {customer.phone && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Phone</div>
                    <div style={{ fontSize: '0.875rem' }}>{customer.phone}</div>
                  </div>
                )}
                <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Customer Stats</div>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Quotes</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{customer.total_quotes}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Orders</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{customer.total_orders}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Revenue</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                        R {customer.total_revenue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/erp/customers/${customer.id}`)}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    color: '#2563eb'
                  }}
                >
                  View Customer Details →
                </button>
              </div>
            </div>
          )}

          {/* Related Sales Orders */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Related Sales Orders</h3>
            {relatedOrders.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>No sales orders yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {relatedOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/erp/sales-orders/${order.id}`)}
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
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{order.order_number}</span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{order.status}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {new Date(order.order_date).toLocaleDateString()}
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                        R {order.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
                {relatedOrders.length > 5 && (
                  <button
                    onClick={() => navigate(`/erp/sales-orders?customer_id=${quote.customer_id}`)}
                    style={{
                      padding: '0.5rem',
                      background: 'transparent',
                      border: 'none',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#2563eb',
                      cursor: 'pointer'
                    }}
                  >
                    View all {relatedOrders.length} orders →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
