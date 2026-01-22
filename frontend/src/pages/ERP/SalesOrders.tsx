import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { LineItemsTable, LineItem } from '../../components/LineItemsTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, Check, Truck, X, FileText } from 'lucide-react';

interface SalesOrder {
  id: string;
  order_number: string;
  customer_email?: string;
  customer_name?: string;
  customer_id?: string;
  order_date: string;
  required_date?: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  warehouse_id?: string;
  quote_id?: string;
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

export default function SalesOrders() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPricelistId, setSelectedPricelistId] = useState<string>('');
  const [formData, setFormData] = useState<Partial<SalesOrder>>({
    customer_name: '',
    customer_email: '',
    order_date: new Date().toISOString().split('T')[0],
    required_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      loadOrders();
      loadProducts();
      loadCustomers();
      loadPricelists();
    }, [searchTerm, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      
      const response = await api.get('/erp/order-to-cash/sales-orders', { params });
      const data = response.data?.data || response.data || [];
      setOrders(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading sales orders:', err);
      setError(err.response?.data?.detail || 'Failed to load sales orders');
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
        const response = await api.get('/odoo/pricing/pricelists');
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
        order_date: new Date().toISOString().split('T')[0],
        required_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
      });
      setSelectedCustomerId('');
      setSelectedPricelistId('');
      setLineItems([]);
      setShowCreateModal(true);
    };

  const handleEdit = (order: SalesOrder) => {
    setSelectedOrder(order);
    setFormData({
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_id: order.customer_id,
      order_date: order.order_date,
      required_date: order.required_date,
      notes: order.notes,
      warehouse_id: order.warehouse_id
    });
    setLineItems(order.lines || []);
    setShowEditModal(true);
  };

  const handleDelete = (order: SalesOrder) => {
    setSelectedOrder(order);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedOrder) return;
    
    try {
      await api.delete(`/erp/order-to-cash/sales-orders/${selectedOrder.id}`);
      loadOrders();
      setSelectedOrder(null);
    } catch (err: any) {
      console.error('Error deleting sales order:', err);
      setError(err.response?.data?.detail || 'Failed to delete sales order');
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

      if (showEditModal && selectedOrder) {
        await api.put(`/erp/order-to-cash/sales-orders/${selectedOrder.id}`, payload);
      } else {
        await api.post('/erp/order-to-cash/sales-orders', payload);
      }

      loadOrders();
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedOrder(null);
      setError(null);
    } catch (err: any) {
      console.error('Error saving sales order:', err);
      setError(err.response?.data?.detail || 'Failed to save sales order');
    }
  };

  const handleApprove = async (order: SalesOrder) => {
    try {
      await api.post(`/erp/order-to-cash/sales-orders/${order.id}/approve`);
      loadOrders();
    } catch (err: any) {
      console.error('Error approving sales order:', err);
      setError(err.response?.data?.detail || 'Failed to approve sales order');
    }
  };

    const handleCreateDelivery = async (order: SalesOrder) => {
      try {
        const response = await api.post('/erp/order-to-cash/deliveries', {
          sales_order_id: order.id
        });
        alert(`Delivery ${response.data.delivery_number} created successfully!`);
        loadOrders();
      } catch (err: any) {
        console.error('Error creating delivery:', err);
        setError(err.response?.data?.detail || 'Failed to create delivery');
      }
    };

    const handleCancel = async (order: SalesOrder) => {
      if (!confirm(`Are you sure you want to cancel order ${order.order_number}? This action cannot be undone.`)) {
        return;
      }
      try {
        await api.post(`/erp/order-to-cash/sales-orders/${order.id}/cancel`);
        alert(`Order ${order.order_number} has been cancelled`);
        loadOrders();
      } catch (err: any) {
        console.error('Error cancelling order:', err);
        setError(err.response?.data?.detail || 'Failed to cancel order');
      }
    };

    const handleCreateCreditNote = async (order: SalesOrder) => {
      if (!confirm(`Create a credit note for order ${order.order_number}?`)) {
        return;
      }
      try {
        const response = await api.post('/erp/order-to-cash/credit-notes', {
          sales_order_id: order.id,
          reason: 'Customer request',
          lines: order.lines?.map(line => ({
            product_id: line.product_id,
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unit_price,
            tax_rate: line.tax_rate
          }))
        });
        alert(`Credit note ${response.data.credit_note_number || 'CN-' + Date.now()} created successfully!`);
        loadOrders();
      } catch (err: any) {
        console.error('Error creating credit note:', err);
        setError(err.response?.data?.detail || 'Failed to create credit note');
      }
    };

    const handlePartialDelivery = async (order: SalesOrder) => {
      const quantityStr = prompt('Enter the percentage of order to deliver (1-100):');
      if (!quantityStr) return;
      const percentage = parseInt(quantityStr, 10);
      if (isNaN(percentage) || percentage < 1 || percentage > 100) {
        alert('Please enter a valid percentage between 1 and 100');
        return;
      }
      try {
        const response = await api.post('/erp/order-to-cash/deliveries', {
          sales_order_id: order.id,
          partial_percentage: percentage,
          is_partial: true
        });
        alert(`Partial delivery (${percentage}%) created: ${response.data.delivery_number}`);
        loadOrders();
      } catch (err: any) {
        console.error('Error creating partial delivery:', err);
        setError(err.response?.data?.detail || 'Failed to create partial delivery');
      }
    };

    const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#6b7280',
      approved: '#3b82f6',
      in_progress: '#8b5cf6',
      completed: '#10b981',
      cancelled: '#ef4444'
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
              {isEdit ? 'Edit Sales Order' : 'Create Sales Order'}
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
                    Order Date *
                  </label>
                  <input
                    type="date"
                    value={formData.order_date || ''}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
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
                    Required Date
                  </label>
                  <input
                    type="date"
                    value={formData.required_date || ''}
                    onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
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
                              pricingContext={{
                                customer_id: selectedCustomerId || undefined,
                                pricelist_id: selectedPricelistId || undefined,
                                date: formData.order_date
                              }}
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
                {isEdit ? 'Update Sales Order' : 'Create Sales Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Sales Orders</h1>
        <p style={{ color: '#6b7280' }}>Manage customer orders and track fulfillment</p>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        padding: '1.5rem',
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
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
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          onClick={loadOrders}
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
          Refresh
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
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus size={16} />
          Create Sales Order
        </button>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading sales orders...</div>
      ) : orders.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#6b7280' }}>No sales orders found</p>
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
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Order #</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Customer</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Order Date</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Required Date</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Total</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    <Link to={`/sales-orders/${order.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {order.order_number}
                    </Link>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{order.customer_name || '-'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{new Date(order.order_date).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{order.required_date ? new Date(order.required_date).toLocaleDateString() : '-'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '500' }}>
                    R {order.total_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }} className={getStatusColor(order.status)}>
                      {order.status}
                    </span>
                  </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                        {order.status === 'draft' && (
                                          <button
                                            onClick={() => handleApprove(order)}
                                            style={{
                                              padding: '0.25rem 0.5rem',
                                              background: '#10b981',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '0.25rem',
                                              fontSize: '0.7rem',
                                              cursor: 'pointer'
                                            }}
                                            title="Approve Order"
                                          >
                                            <Check size={12} />
                                          </button>
                                        )}
                                        {order.status === 'approved' && (
                                          <>
                                            <button
                                              onClick={() => handleCreateDelivery(order)}
                                              style={{
                                                padding: '0.25rem 0.5rem',
                                                background: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.25rem',
                                                fontSize: '0.7rem',
                                                cursor: 'pointer'
                                              }}
                                              title="Create Full Delivery"
                                            >
                                              <Truck size={12} />
                                            </button>
                                            <button
                                              onClick={() => handlePartialDelivery(order)}
                                              style={{
                                                padding: '0.25rem 0.5rem',
                                                background: '#8b5cf6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.25rem',
                                                fontSize: '0.7rem',
                                                cursor: 'pointer'
                                              }}
                                              title="Partial Delivery"
                                            >
                                              %
                                            </button>
                                          </>
                                        )}
                                        {(order.status === 'completed' || order.status === 'in_progress') && (
                                          <button
                                            onClick={() => handleCreateCreditNote(order)}
                                            style={{
                                              padding: '0.25rem 0.5rem',
                                              background: '#f59e0b',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '0.25rem',
                                              fontSize: '0.7rem',
                                              cursor: 'pointer'
                                            }}
                                            title="Create Credit Note"
                                          >
                                            <FileText size={12} />
                                          </button>
                                        )}
                                        {order.status !== 'cancelled' && order.status !== 'completed' && (
                                          <button
                                            onClick={() => handleCancel(order)}
                                            style={{
                                              padding: '0.25rem 0.5rem',
                                              background: '#ef4444',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '0.25rem',
                                              fontSize: '0.7rem',
                                              cursor: 'pointer'
                                            }}
                                            title="Cancel Order"
                                          >
                                            <X size={12} />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleEdit(order)}
                                          style={{
                                            padding: '0.25rem 0.5rem',
                                            background: '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '0.25rem',
                                            fontSize: '0.7rem',
                                            cursor: 'pointer'
                                          }}
                                          title="Edit Order"
                                        >
                                          <Edit size={12} />
                                        </button>
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
        {['draft', 'approved', 'in_progress', 'completed'].map((status) => {
          const count = orders.filter(o => o.status === status).length;
          const total = orders.filter(o => o.status === status).reduce((sum, o) => sum + o.total_amount, 0);
          return (
            <div key={status} style={{
              padding: '1.5rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'capitalize', marginBottom: '0.5rem' }}>
                {status.replace('_', ' ')} Orders
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

      {/* Create/Edit Modal */}
      {renderFormModal(false)}
      {renderFormModal(true)}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Delete Sales Order"
        message={`Are you sure you want to delete order ${selectedOrder?.order_number}? This action cannot be undone.`}
      />
    </div>
  );
}
