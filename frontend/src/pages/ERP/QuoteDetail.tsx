import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { ArrowLeft, Mail, Check, X, FileText, User, Calendar, DollarSign, Package, Clock, Edit, Trash2, Printer } from 'lucide-react';
import { LineItemsTable, LineItem } from '../../components/LineItemsTable';
import { PostingStatus } from '../../components/PostingStatus';
import { AutomationPanel } from '../../components/AutomationPanel';

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
  gl_entry_id?: string;
  gl_posted?: boolean;
  posted_at?: string;
  posted_by?: string;
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
      const response = await api.get(`/erp/order-to-cash/quotes/${id}`);
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
      const response = await api.get(`/erp/order-to-cash/customers/${customerId}`);
      setCustomer(response.data);
    } catch (error) {
      console.error('Error loading customer:', error);
    }
  };

  const loadRelatedOrders = async (customerId: string) => {
    try {
      const response = await api.get(`/erp/order-to-cash/sales-orders`, {
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
      await api.post(`/erp/order-to-cash/quotes/${quote.id}/approve`);
      loadQuoteDetail();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to approve quote');
    }
  };

  const handleSend = async () => {
    if (!quote) return;
    try {
      await api.post(`/erp/order-to-cash/quotes/${quote.id}/send`);
      alert('Quote sent successfully to customer email');
      loadQuoteDetail();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to send quote');
    }
  };

  const handleAccept = async () => {
    if (!quote) return;
    try {
      const response = await api.post(`/erp/order-to-cash/quotes/${quote.id}/accept`);
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
      await api.post(`/erp/order-to-cash/quotes/${quote.id}/reject`);
      loadQuoteDetail();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to reject quote');
    }
  };

  const handleDelete = async () => {
    if (!quote) return;
    if (!confirm('Are you sure you want to delete this quote? This action cannot be undone.')) return;
    try {
      await api.delete(`/erp/order-to-cash/quotes/${quote.id}`);
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
      <div className="p-8 text-center">
        <div className="text-lg text-gray-500 dark:text-gray-400">Loading quote details...</div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 mb-4">
          {error || 'Quote not found'}
        </div>
        <button
          onClick={() => navigate('/erp/quotes')}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30 transition-all"
        >
          Back to Quotes
        </button>
      </div>
    );
  }

  const statusStyle = getStatusColor(quote.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => navigate('/erp/quotes')}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Quotes
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Printer size={16} />
            Print Quote
          </button>
        </div>

        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Quote {quote.quote_number}
            </h1>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                quote.status === 'draft' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                quote.status === 'approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                quote.status === 'sent' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                quote.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                quote.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {quote.status.toUpperCase()}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Created {new Date(quote.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {quote.status === 'draft' && (
              <>
                <button
                  onClick={handleApprove}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30 transition-all"
                >
                  <Check size={16} />
                  Approve
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-sm font-medium hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30 transition-all"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </>
            )}
            {quote.status === 'approved' && (
              <button
                onClick={handleSend}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/30 transition-all"
              >
                <Mail size={16} />
                Send to Customer
              </button>
            )}
            {quote.status === 'sent' && (
              <>
                <button
                  onClick={handleAccept}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/30 transition-all"
                >
                  <Check size={16} />
                  Accept & Create SO
                </button>
                <button
                  onClick={handleReject}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-sm font-medium hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30 transition-all"
                >
                  <X size={16} />
                  Reject
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Quote Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quote Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Customer</div>
                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  {quote.customer_name}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</div>
                <div className="font-medium text-gray-900 dark:text-white">{quote.customer_email}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Quote Date</div>
                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  {new Date(quote.quote_date).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Valid Until</div>
                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock size={16} className="text-gray-400" />
                  {new Date(quote.valid_until).toLocaleDateString()}
                </div>
              </div>
            </div>

            {quote.notes && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{quote.notes}</div>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <LineItemsTable
              items={quote.lines}
              onChange={() => {}}
              products={[]}
              readOnly={true}
            />
          </div>

          {/* Audit Trail */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Audit Trail</h2>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-sm text-gray-500 dark:text-gray-400">Created</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(quote.created_at).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-sm text-gray-500 dark:text-gray-400">Last Updated</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(quote.updated_at).toLocaleString()}
                </span>
              </div>
              {quote.created_by && (
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Created By</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{quote.created_by}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Posting Status */}
          <PostingStatus
            status={quote.status}
            glEntryId={quote.gl_entry_id}
            glPosted={quote.gl_posted}
            postedAt={quote.posted_at}
            postedBy={quote.posted_by}
            onViewJournal={(entryId) => navigate(`/erp/general-ledger?entry=${entryId}`)}
          />

          {/* Automation Panel */}
          <AutomationPanel
            documentType="quote"
            documentId={quote.id}
            documentData={quote}
            onExecutionComplete={() => loadQuoteDetail()}
          />

          {/* Customer Info */}
          {customer && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Information</h3>
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Name</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{customer.customer_name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Code</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{customer.customer_code}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</div>
                  <div className="text-sm text-gray-900 dark:text-white">{customer.email}</div>
                </div>
                {customer.phone && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phone</div>
                    <div className="text-sm text-gray-900 dark:text-white">{customer.phone}</div>
                  </div>
                )}
                <div className="mt-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Customer Stats</div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Total Quotes</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{customer.total_quotes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Total Orders</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{customer.total_orders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        R {customer.total_revenue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/erp/customers/${customer.id}`)}
                  className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  View Customer Details →
                </button>
              </div>
            </div>
          )}

          {/* Related Sales Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Related Sales Orders</h3>
            {relatedOrders.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No sales orders yet</p>
            ) : (
              <div className="flex flex-col gap-3">
                {relatedOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/erp/sales-orders/${order.id}`)}
                    className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{order.order_number}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{order.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(order.order_date).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        R {order.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
                {relatedOrders.length > 5 && (
                  <button
                    onClick={() => navigate(`/erp/sales-orders?customer_id=${quote.customer_id}`)}
                    className="p-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
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
    </div>
  );
}
