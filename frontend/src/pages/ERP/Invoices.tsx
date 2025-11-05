import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { LineItemsTable, LineItem } from '../../components/LineItemsTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, Send, DollarSign, FileText, X } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_email?: string;
  customer_name?: string;
  customer_id?: string;
  invoice_date: string;
  due_date?: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid?: number;
  notes?: string;
  delivery_id?: string;
  delivery_number?: string;
  lines?: LineItem[];
}

interface Product {
  id: string;
  code: string;
  name: string;
  selling_price: number;
  unit_of_measure: string;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState<Partial<Invoice>>({
    customer_name: '',
    customer_email: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
    loadProducts();
  }, [searchTerm, statusFilter]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      
      const response = await api.get('/erp/order-to-cash/invoices', { params });
      setInvoices(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading invoices:', err);
      setError(err.response?.data?.detail || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get('/erp/order-to-cash/products');
      setProducts(response.data);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const handleCreate = () => {
    setFormData({
      customer_name: '',
      customer_email: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ''
    });
    setLineItems([]);
    setShowCreateModal(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      customer_name: invoice.customer_name,
      customer_email: invoice.customer_email,
      customer_id: invoice.customer_id,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      notes: invoice.notes
    });
    setLineItems(invoice.lines || []);
    setShowEditModal(true);
  };

  const handleDelete = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedInvoice) return;
    
    try {
      await api.delete(`/erp/order-to-cash/invoices/${selectedInvoice.id}`);
      loadInvoices();
      setSelectedInvoice(null);
    } catch (err: any) {
      console.error('Error deleting invoice:', err);
      setError(err.response?.data?.detail || 'Failed to delete invoice');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (lineItems.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    if (!formData.customer_name) {
      setError('Please fill in customer details');
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

      if (showEditModal && selectedInvoice) {
        await api.put(`/erp/order-to-cash/invoices/${selectedInvoice.id}`, payload);
      } else {
        await api.post('/erp/order-to-cash/invoices', payload);
      }

      loadInvoices();
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedInvoice(null);
      setError(null);
    } catch (err: any) {
      console.error('Error saving invoice:', err);
      setError(err.response?.data?.detail || 'Failed to save invoice');
    }
  };

  const handlePost = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPostDialog(true);
  };

  const confirmPost = async () => {
    if (!selectedInvoice) return;
    
    try {
      await api.post(`/erp/order-to-cash/invoices/${selectedInvoice.id}/post`);
      alert('Invoice posted to AR successfully!');
      loadInvoices();
      setShowPostDialog(false);
      setSelectedInvoice(null);
    } catch (err: any) {
      console.error('Error posting invoice:', err);
      setError(err.response?.data?.detail || 'Failed to post invoice');
    }
  };

  const handleSend = async (invoice: Invoice) => {
    try {
      await api.post(`/erp/order-to-cash/invoices/${invoice.id}/send`);
      alert(`Invoice sent to ${invoice.customer_email}!`);
      loadInvoices();
    } catch (err: any) {
      console.error('Error sending invoice:', err);
      setError(err.response?.data?.detail || 'Failed to send invoice');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#6b7280',
      posted: '#3b82f6',
      sent: '#8b5cf6',
      paid: '#10b981',
      overdue: '#ef4444',
      cancelled: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const renderFormModal = (isEdit: boolean) => {
    const isOpen = isEdit ? showEditModal : showCreateModal;
    const onClose = () => isEdit ? setShowEditModal(false) : setShowCreateModal(false);

    if (!isOpen) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          overflow: 'auto'
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            maxWidth: '1200px',
            width: '95%',
            maxHeight: '95vh',
            overflow: 'auto',
            margin: '2rem'
          }}
        >
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'white',
            zIndex: 10
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
              {isEdit ? 'Edit Invoice' : 'Create Invoice'}
            </h2>
            <button
              onClick={onClose}
              style={{
                padding: '0.25rem',
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ padding: '1.5rem' }}>
              {error && (
                <div style={{
                  padding: '1rem',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.375rem',
                  color: '#991b1b',
                  marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name || ''}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    required
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
                    Customer Email *
                  </label>
                  <input
                    type="email"
                    value={formData.customer_email || ''}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    required
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
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={formData.invoice_date || ''}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    required
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
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date || ''}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <LineItemsTable
                items={lineItems}
                onChange={setLineItems}
                products={products}
              />
            </div>

            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              position: 'sticky',
              bottom: 0,
              background: 'white'
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '0.5rem 1rem',
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {isEdit ? 'Update Invoice' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Invoices</h1>
          <p style={{ color: '#6b7280' }}>Manage customer invoices and track payments</p>
        </div>
        <button
          onClick={handleCreate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <Plus size={20} />
          New Invoice
        </button>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
              <Search
                size={20}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }}
              />
              <input
                type="text"
                placeholder="Search by customer, invoice number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ minWidth: '200px' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  background: 'white'
                }}
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="posted">Posted</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <FileText size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No invoices found</h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              {searchTerm || statusFilter ? 'Try adjusting your filters' : 'Get started by creating your first invoice'}
            </p>
            {!searchTerm && !statusFilter && (
              <button
                onClick={handleCreate}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Create First Invoice
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Invoice #</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Customer</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Invoice Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Due Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Total</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Balance</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const balance = invoice.total_amount - (invoice.amount_paid || 0);
                  return (
                    <tr key={invoice.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>{invoice.invoice_number}</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{invoice.customer_name}</div>
                        {invoice.customer_email && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{invoice.customer_email}</div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          background: `${getStatusColor(invoice.status)}20`,
                          color: getStatusColor(invoice.status)
                        }}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '600', textAlign: 'right' }}>
                        R {invoice.total_amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '600', textAlign: 'right', color: balance > 0 ? '#ef4444' : '#10b981' }}>
                        R {balance.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {invoice.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handleEdit(invoice)}
                                title="Edit"
                                style={{
                                  padding: '0.5rem',
                                  background: 'transparent',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '0.375rem',
                                  color: '#2563eb',
                                  cursor: 'pointer'
                                }}
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handlePost(invoice)}
                                title="Post to AR"
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: '#10b981',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  color: 'white',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <DollarSign size={14} />
                                Post
                              </button>
                              <button
                                onClick={() => handleDelete(invoice)}
                                title="Delete"
                                style={{
                                  padding: '0.5rem',
                                  background: 'transparent',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '0.375rem',
                                  color: '#ef4444',
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                          {(invoice.status === 'posted' || invoice.status === 'sent') && invoice.customer_email && (
                            <button
                              onClick={() => handleSend(invoice)}
                              title="Send to Customer"
                              style={{
                                padding: '0.5rem 1rem',
                                background: '#8b5cf6',
                                border: 'none',
                                borderRadius: '0.375rem',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Send size={14} />
                              Send
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {renderFormModal(false)}
      {renderFormModal(true)}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${selectedInvoice?.invoice_number}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showPostDialog}
        onClose={() => setShowPostDialog(false)}
        onConfirm={confirmPost}
        title="Post Invoice"
        message={`Post invoice ${selectedInvoice?.invoice_number} to Accounts Receivable? This will make it official and cannot be undone.`}
        confirmText="Post to AR"
        variant="info"
      />
    </div>
  );
}
