import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { LineItemsTable, LineItem } from '../../components/LineItemsTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Filter, Eye, Edit, Trash2, Check, Send, X, FileText } from 'lucide-react';

interface Quote {
  id: string;
  quote_number: string;
  customer_email: string;
  customer_name: string;
  quote_date: string;
  valid_until: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
  warehouse_id?: string;
  customer_id?: string;
  lines?: LineItem[];
}

interface Product {
  id: string;
  code: string;
  name: string;
  selling_price: number;
  unit_of_measure: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  pricelist_id?: string;
}

interface Pricelist {
  id: string;
  name: string;
  currency: string;
}

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPricelistId, setSelectedPricelistId] = useState<string>('');
  const [formData, setFormData] = useState<Partial<Quote>>({
    customer_name: '',
    customer_email: '',
    quote_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    status: 'draft'
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      loadQuotes();
      loadProducts();
      loadCustomers();
      loadPricelists();
    }, [searchTerm, statusFilter]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      
      const response = await api.get('/erp/order-to-cash/quotes', { params });
      const data = response.data?.data || response.data || [];
      setQuotes(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading quotes:', err);
      setError(err.response?.data?.detail || 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get('/erp/order-to-cash/products');
      const data = response.data?.data || response.data || [];
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

    const loadCustomers = async () => {
      try {
        const response = await api.get('/erp/order-to-cash/customers');
        const data = response.data?.data || response.data || [];
        setCustomers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading customers:', err);
      }
    };

    const loadPricelists = async () => {
      try {
        const response = await api.get('/pricing/pricelists');
        const data = response.data?.data || response.data || [];
        setPricelists(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading pricelists:', err);
      }
    };

    const handleCustomerChange = (customerId: string) => {
      setSelectedCustomerId(customerId);
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setFormData({
          ...formData,
          customer_id: customerId,
          customer_name: customer.name,
          customer_email: customer.email
        });
        if (customer.pricelist_id) {
          setSelectedPricelistId(customer.pricelist_id);
        }
      }
    };

    const handleCreate = () => {
      setFormData({
        customer_name: '',
        customer_email: '',
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        status: 'draft'
      });
      setSelectedCustomerId('');
      setSelectedPricelistId('');
      setLineItems([]);
      setShowCreateModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
    
      if (lineItems.length === 0) {
        setError('Please add at least one line item');
        return;
      }

      if (!formData.customer_name) {
        setError('Please select a customer');
        return;
      }

      try {
        const payload = {
          ...formData,
          lines: lineItems.map((item, index) => ({
            line_number: index + 1,
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
            tax_rate: item.tax_rate
          }))
        };

        await api.post('/erp/order-to-cash/quotes', payload);
        loadQuotes();
        setShowCreateModal(false);
        setError(null);
      } catch (err: any) {
        console.error('Error creating quote:', err);
        setError(err.response?.data?.detail || 'Failed to create quote');
      }
    };

    const approveQuote = async (quoteId: string) => {
    try {
      await api.post(`/erp/order-to-cash/quotes/${quoteId}/approve`);
      loadQuotes();
    } catch (err: any) {
      console.error('Error approving quote:', err);
      setError(err.response?.data?.detail || 'Failed to approve quote');
    }
  };

  const sendQuote = async (quoteId: string) => {
    try {
      await api.post(`/erp/order-to-cash/quotes/${quoteId}/send`);
      loadQuotes();
    } catch (err: any) {
      console.error('Error sending quote:', err);
      setError(err.response?.data?.detail || 'Failed to send quote');
    }
  };

  const acceptQuote = async (quoteId: string) => {
    try {
      const response = await api.post(`/erp/order-to-cash/quotes/${quoteId}/accept`);
      alert(`Quote accepted! Sales Order ${response.data.sales_order_number} created.`);
      loadQuotes();
    } catch (err: any) {
      console.error('Error accepting quote:', err);
      setError(err.response?.data?.detail || 'Failed to accept quote');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      approved: 'bg-blue-100 text-blue-800',
      sent: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-600',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Quotes</h1>
        <p style={{ color: '#6b7280' }}>Manage customer quotes and convert to sales orders</p>
      </div>

      {/* Search and Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        padding: '1.5rem',
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <input
          type="text"
          placeholder="Search by email, customer name, or content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            minWidth: '150px'
          }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
              <button
                onClick={loadQuotes}
                style={{
                  padding: '0.5rem 1.5rem',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Search
              </button>
              <button
                onClick={handleCreate}
                style={{
                  padding: '0.5rem 1.5rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                + New Quote
              </button>
            </div>

      {/* Quotes Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading quotes...</div>
      ) : quotes.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#6b7280' }}>No quotes found</p>
        </div>
      ) : (
        <div style={{ 
          background: 'white', 
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Quote #</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Customer</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Valid Until</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Total</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    <Link to={`/quotes/${quote.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {quote.quote_number}
                    </Link>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{quote.customer_name || '-'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>{quote.customer_email || '-'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{new Date(quote.quote_date).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '-'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '500' }}>
                    R {quote.total_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }} className={getStatusColor(quote.status)}>
                      {quote.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {quote.status === 'draft' && (
                        <button
                          onClick={() => approveQuote(quote.id)}
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          Approve
                        </button>
                      )}
                      {quote.status === 'approved' && (
                        <button
                          onClick={() => sendQuote(quote.id)}
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          Send
                        </button>
                      )}
                      {quote.status === 'sent' && (
                        <button
                          onClick={() => acceptQuote(quote.id)}
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          Accept → SO
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '1rem',
        marginTop: '2rem'
      }}>
        {['draft', 'sent', 'accepted', 'expired'].map((status) => {
          const count = quotes.filter(q => q.status === status).length;
          const total = quotes.filter(q => q.status === status).reduce((sum, q) => sum + q.total_amount, 0);
          return (
            <div key={status} style={{
              padding: '1.5rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'capitalize', marginBottom: '0.5rem' }}>
                {status} Quotes
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                {count}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                R {total.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Create New Quote</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {error && (
              <div style={{
                padding: '1rem',
                background: '#fee2e2',
                color: '#dc2626',
                borderRadius: '0.375rem',
                marginBottom: '1rem'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Customer *
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select a customer...</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Pricelist
                  </label>
                  <select
                    value={selectedPricelistId}
                    onChange={(e) => setSelectedPricelistId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Default pricing</option>
                    {pricelists.map(pricelist => (
                      <option key={pricelist.id} value={pricelist.id}>
                        {pricelist.name} ({pricelist.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Quote Date
                  </label>
                  <input
                    type="date"
                    value={formData.quote_date || ''}
                    onChange={(e) => setFormData({ ...formData, quote_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={formData.valid_until || ''}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Line Items</h3>
                <LineItemsTable
                  items={lineItems}
                  onChange={setLineItems}
                  products={products}
                  pricingContext={{
                    customer_id: selectedCustomerId || undefined,
                    pricelist_id: selectedPricelistId || undefined,
                    date: formData.quote_date
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '0.5rem 1.5rem',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1.5rem',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Create Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
