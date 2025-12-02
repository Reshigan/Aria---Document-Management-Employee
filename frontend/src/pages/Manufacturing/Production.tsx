import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface ProductionOrder {
  id: number;
  order_number: string;
  product_name: string;
  quantity_planned: number;
  quantity_produced: number;
  start_date: string;
  end_date: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

const Production: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(null);
  const [form, setForm] = useState({
    order_number: '',
    product_name: '',
    quantity_planned: '',
    quantity_produced: '',
    start_date: '',
    end_date: '',
    status: 'PLANNED' as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; number: string }>({
    show: false,
    id: 0,
    number: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/manufacturing/production-orders');
      setOrders(response.data.orders || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load production orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingOrder(null);
    setForm({
      order_number: '',
      product_name: '',
      quantity_planned: '',
      quantity_produced: '0',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      status: 'PLANNED'
    });
    setShowModal(true);
  };

  const handleEdit = (order: ProductionOrder) => {
    setEditingOrder(order);
    setForm({
      order_number: order.order_number,
      product_name: order.product_name,
      quantity_planned: order.quantity_planned.toString(),
      quantity_produced: order.quantity_produced.toString(),
      start_date: order.start_date,
      end_date: order.end_date,
      status: order.status
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      const payload = {
        ...form,
        quantity_planned: parseInt(form.quantity_planned) || 0,
        quantity_produced: parseInt(form.quantity_produced) || 0
      };
      
      if (editingOrder) {
        await api.put(`/manufacturing/production-orders/${editingOrder.id}`, payload);
      } else {
        await api.post('/manufacturing/production-orders', payload);
      }
      setShowModal(false);
      loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save production order');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/manufacturing/production-orders/${id}`);
      loadOrders();
      setDeleteConfirm({ show: false, id: 0, number: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete production order');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      PLANNED: { bg: '#dbeafe', text: '#1e40af' },
      IN_PROGRESS: { bg: '#fef3c7', text: '#92400e' },
      COMPLETED: { bg: '#dcfce7', text: '#166534' },
      CANCELLED: { bg: '#fee2e2', text: '#991b1b' }
    };
    const color = colors[status] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>{status.replace('_', ' ')}</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  return (
    <div style={{ padding: '24px' }} data-testid="manufacturing-production">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Production Orders</h1>
        <p style={{ color: '#6b7280' }}>Manage manufacturing production orders</p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button
          onClick={handleCreate}
          style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
          data-testid="create-button"
        >
          + New Production Order
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Planned</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{orders.filter(o => o.status === 'PLANNED').length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>In Progress</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{orders.filter(o => o.status === 'IN_PROGRESS').length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Completed</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{orders.filter(o => o.status === 'COMPLETED').length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Orders</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{orders.length}</div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="production-table">
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Order #</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Product</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Planned</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Produced</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Start Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>End Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No production orders found</td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>{order.order_number}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{order.product_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{order.quantity_planned}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{order.quantity_produced}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{formatDate(order.start_date)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{formatDate(order.end_date)}</td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(order.status)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleEdit(order)}
                      style={{ padding: '4px 8px', marginRight: '8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ show: true, id: order.id, number: order.order_number })}
                      style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', width: '500px', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              {editingOrder ? 'Edit Production Order' : 'New Production Order'}
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Order Number *</label>
              <input
                type="text"
                value={form.order_number}
                onChange={(e) => setForm({ ...form, order_number: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Product Name *</label>
              <input
                type="text"
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Quantity Planned *</label>
                <input
                  type="number"
                  value={form.quantity_planned}
                  onChange={(e) => setForm({ ...form, quantity_planned: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Quantity Produced *</label>
                <input
                  type="number"
                  value={form.quantity_produced}
                  onChange={(e) => setForm({ ...form, quantity_produced: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Start Date *</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>End Date *</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Status *</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="Delete Production Order"
        message={`Are you sure you want to delete production order ${deleteConfirm.number}? This action cannot be undone.`}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ show: false, id: 0, number: '' })}
      />
    </div>
  );
};

export default Production;
