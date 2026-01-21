import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Plus, Search, Eye, Check, Truck, FileText } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  po_date: string;
  expected_delivery_date: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  approved_by?: string;
  approved_at?: string;
  lines?: POLine[];
}

interface POLine {
  id: string;
  line_number: number;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percentage: number;
  line_total: number;
  received_quantity: number;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  standard_cost: number;
  unit_of_measure: string;
}

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    supplier_id: '',
    po_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    notes: '',
    lines: [{ product_id: '', description: '', quantity: '1', unit_price: '0' }]
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOrders();
    loadSuppliers();
    loadProducts();
  }, [searchTerm, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/procure-to-pay/purchase-orders');
      const data = response.data?.data || response.data || [];
      setOrders(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading purchase orders:', err);
      setError(err.response?.data?.detail || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await api.get('/erp/procure-to-pay/suppliers');
      const data = response.data?.data || response.data || [];
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading suppliers:', err);
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

  const approvePO = async (poId: string) => {
    try {
      await api.post(`/erp/procure-to-pay/purchase-orders/${poId}/approve`);
      loadOrders();
    } catch (err: any) {
      console.error('Error approving PO:', err);
      setError(err.response?.data?.detail || 'Failed to approve purchase order');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      approved: 'bg-blue-100 text-blue-800',
      ordered: 'bg-yellow-100 text-yellow-800',
      receiving: 'bg-purple-100 text-purple-800',
      received: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      po_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      notes: '',
      lines: [{ product_id: '', description: '', quantity: '1', unit_price: '0' }]
    });
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier_id) {
      setError('Please select a supplier');
      return;
    }
    if (formData.lines.every(line => !line.product_id && !line.description)) {
      setError('Please add at least one line item');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        supplier_id: formData.supplier_id,
        po_date: formData.po_date,
        expected_delivery_date: formData.expected_delivery_date || null,
        notes: formData.notes,
        lines: formData.lines.filter(line => line.product_id || line.description).map(line => ({
          product_id: line.product_id || null,
          description: line.description || products.find(p => p.id === line.product_id)?.name || '',
          quantity: parseFloat(line.quantity) || 1,
          unit_price: parseFloat(line.unit_price) || 0
        }))
      };

      await api.post('/erp/procure-to-pay/purchase-orders', payload);
      setShowCreateModal(false);
      resetForm();
      loadOrders();
    } catch (err: any) {
      console.error('Error creating purchase order:', err);
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { product_id: '', description: '', quantity: '1', unit_price: '0' }]
    });
  };

  const removeLine = (index: number) => {
    if (formData.lines.length > 1) {
      setFormData({
        ...formData,
        lines: formData.lines.filter((_, i) => i !== index)
      });
    }
  };

  const updateLine = (index: number, field: string, value: string) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newLines[index].unit_price = String(product.standard_cost || 0);
        newLines[index].description = product.name;
      }
    }
    setFormData({ ...formData, lines: newLines });
  };

  const calculateLineTotal = (line: typeof formData.lines[0]) => {
    return (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0);
  };

  const calculateTotal = () => {
    return formData.lines.reduce((sum, line) => sum + calculateLineTotal(line), 0);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Purchase Orders</h1>
        <p style={{ color: '#6b7280' }}>Manage purchase orders and procurement workflow</p>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          color: '#991b1b'
        }}>
          {error}
        </div>
      )}

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
          placeholder="Search by PO number or supplier..."
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
          <option value="ordered">Ordered</option>
          <option value="receiving">Receiving</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '0.5rem 1.5rem',
            background: '#2563eb',
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
          Create PO
        </button>
      </div>

      {/* Purchase Orders Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading purchase orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#6b7280' }}>No purchase orders found</p>
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
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>PO #</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Supplier</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>PO Date</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Expected Delivery</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Total</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    <Link to={`/procurement/purchase-orders/${order.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {order.po_number}
                    </Link>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{order.supplier_name}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{new Date(order.po_date).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : '-'}
                  </td>
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
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {order.status === 'draft' && (
                        <button
                          onClick={() => approvePO(order.id)}
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Check size={12} />
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedOrder(order)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Eye size={12} />
                        View
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
        {['draft', 'approved', 'receiving', 'received'].map((status) => {
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
                {status} POs
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

      {/* Create PO Modal */}
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
            padding: '2rem',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              New Purchase Order
            </h2>
            <form onSubmit={handleCreatePO}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Supplier *
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    PO Date *
                  </label>
                  <input
                    type="date"
                    value={formData.po_date}
                    onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
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
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
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
                    Notes
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes"
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Line Items *</label>
                  <button
                    type="button"
                    onClick={addLine}
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    + Add Line
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Product</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Description</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', width: '100px' }}>Qty</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', width: '120px' }}>Unit Price</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', width: '120px' }}>Total</th>
                      <th style={{ padding: '0.5rem', width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lines.map((line, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.5rem' }}>
                          <select
                            value={line.product_id}
                            onChange={(e) => updateLine(index, 'product_id', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.25rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.25rem',
                              fontSize: '0.875rem'
                            }}
                          >
                            <option value="">Select Product</option>
                            {products.map(product => (
                              <option key={product.id} value={product.id}>{product.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => updateLine(index, 'description', e.target.value)}
                            placeholder="Description"
                            style={{
                              width: '100%',
                              padding: '0.25rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.25rem',
                              fontSize: '0.875rem'
                            }}
                          />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input
                            type="number"
                            value={line.quantity}
                            onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                            min="1"
                            style={{
                              width: '100%',
                              padding: '0.25rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.25rem',
                              fontSize: '0.875rem',
                              textAlign: 'right'
                            }}
                          />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input
                            type="number"
                            value={line.unit_price}
                            onChange={(e) => updateLine(index, 'unit_price', e.target.value)}
                            min="0"
                            step="0.01"
                            style={{
                              width: '100%',
                              padding: '0.25rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.25rem',
                              fontSize: '0.875rem',
                              textAlign: 'right'
                            }}
                          />
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '500' }}>
                          R {calculateLineTotal(line).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          {formData.lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLine(index)}
                              style={{
                                padding: '0.25rem',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              X
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f9fafb' }}>
                      <td colSpan={4} style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>
                        Total:
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>
                        R {calculateTotal().toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
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
                  disabled={submitting}
                  style={{
                    padding: '0.5rem 1.5rem',
                    background: submitting ? '#9ca3af' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Creating...' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
