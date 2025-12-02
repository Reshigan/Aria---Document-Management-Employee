import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface TaxObligation {
  id: number;
  tax_type: string;
  period: string;
  due_date: string;
  amount: number;
  status: 'PENDING' | 'FILED' | 'PAID' | 'OVERDUE';
}

const TaxCompliance: React.FC = () => {
  const [obligations, setObligations] = useState<TaxObligation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingObligation, setEditingObligation] = useState<TaxObligation | null>(null);
  const [form, setForm] = useState({
    tax_type: '',
    period: '',
    due_date: '',
    amount: '',
    status: 'PENDING' as 'PENDING' | 'FILED' | 'PAID' | 'OVERDUE'
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; type: string }>({
    show: false,
    id: 0,
    type: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadObligations();
  }, []);

  const loadObligations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/tax/obligations');
      setObligations(response.data.obligations || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load tax obligations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingObligation(null);
    setForm({
      tax_type: '',
      period: '',
      due_date: '',
      amount: '',
      status: 'PENDING'
    });
    setShowModal(true);
  };

  const handleEdit = (obligation: TaxObligation) => {
    setEditingObligation(obligation);
    setForm({
      tax_type: obligation.tax_type,
      period: obligation.period,
      due_date: obligation.due_date,
      amount: obligation.amount.toString(),
      status: obligation.status
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount) || 0
      };
      
      if (editingObligation) {
        await api.put(`/tax/obligations/${editingObligation.id}`, payload);
      } else {
        await api.post('/tax/obligations', payload);
      }
      setShowModal(false);
      loadObligations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save tax obligation');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/tax/obligations/${id}`);
      loadObligations();
      setDeleteConfirm({ show: false, id: 0, type: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete tax obligation');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: '#fef3c7', text: '#92400e' },
      FILED: { bg: '#dbeafe', text: '#1e40af' },
      PAID: { bg: '#dcfce7', text: '#166534' },
      OVERDUE: { bg: '#fee2e2', text: '#991b1b' }
    };
    const color = colors[status] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>{status}</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  return (
    <div style={{ padding: '24px' }} data-testid="tax-compliance">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Tax Compliance</h1>
        <p style={{ color: '#6b7280' }}>Manage tax obligations and filings</p>
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
          + New Tax Obligation
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Pending</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{obligations.filter(o => o.status === 'PENDING').length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Filed</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{obligations.filter(o => o.status === 'FILED').length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Paid</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{obligations.filter(o => o.status === 'PAID').length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Overdue</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{obligations.filter(o => o.status === 'OVERDUE').length}</div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="obligations-table">
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Tax Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Period</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Due Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr>
            ) : obligations.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No tax obligations found</td></tr>
            ) : (
              obligations.map((obligation) => (
                <tr key={obligation.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>{obligation.tax_type}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{obligation.period}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{formatDate(obligation.due_date)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{formatCurrency(obligation.amount)}</td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(obligation.status)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleEdit(obligation)}
                      style={{ padding: '4px 8px', marginRight: '8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ show: true, id: obligation.id, type: obligation.tax_type })}
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
              {editingObligation ? 'Edit Tax Obligation' : 'New Tax Obligation'}
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Tax Type *</label>
              <input
                type="text"
                value={form.tax_type}
                onChange={(e) => setForm({ ...form, tax_type: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Period *</label>
              <input
                type="text"
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                placeholder="e.g., Q1 2024"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Due Date *</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
                <option value="PENDING">Pending</option>
                <option value="FILED">Filed</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
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
        title="Delete Tax Obligation"
        message={`Are you sure you want to delete ${deleteConfirm.type} tax obligation? This action cannot be undone.`}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ show: false, id: 0, type: '' })}
      />
    </div>
  );
};

export default TaxCompliance;
