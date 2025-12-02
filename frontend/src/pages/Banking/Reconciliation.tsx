import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface Reconciliation {
  id: number;
  account_name: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  closing_balance: number;
  statement_balance: number;
  difference: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED';
}

const Reconciliation: React.FC = () => {
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRecon, setEditingRecon] = useState<Reconciliation | null>(null);
  const [form, setForm] = useState({
    account_name: '',
    period_start: '',
    period_end: '',
    opening_balance: '',
    closing_balance: '',
    statement_balance: '',
    status: 'IN_PROGRESS' as 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED'
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; account: string }>({
    show: false,
    id: 0,
    account: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadReconciliations();
  }, []);

  const loadReconciliations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/banking/reconciliations');
      setReconciliations(response.data.reconciliations || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load reconciliations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRecon(null);
    setForm({
      account_name: '',
      period_start: '',
      period_end: '',
      opening_balance: '',
      closing_balance: '',
      statement_balance: '',
      status: 'IN_PROGRESS'
    });
    setShowModal(true);
  };

  const handleEdit = (recon: Reconciliation) => {
    setEditingRecon(recon);
    setForm({
      account_name: recon.account_name,
      period_start: recon.period_start,
      period_end: recon.period_end,
      opening_balance: recon.opening_balance.toString(),
      closing_balance: recon.closing_balance.toString(),
      statement_balance: recon.statement_balance.toString(),
      status: recon.status
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      const payload = {
        ...form,
        opening_balance: parseFloat(form.opening_balance) || 0,
        closing_balance: parseFloat(form.closing_balance) || 0,
        statement_balance: parseFloat(form.statement_balance) || 0
      };
      
      if (editingRecon) {
        await api.put(`/banking/reconciliations/${editingRecon.id}`, payload);
      } else {
        await api.post('/banking/reconciliations', payload);
      }
      setShowModal(false);
      loadReconciliations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save reconciliation');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/banking/reconciliations/${id}`);
      loadReconciliations();
      setDeleteConfirm({ show: false, id: 0, account: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete reconciliation');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      IN_PROGRESS: { bg: '#fef3c7', text: '#92400e' },
      COMPLETED: { bg: '#dbeafe', text: '#1e40af' },
      APPROVED: { bg: '#dcfce7', text: '#166534' }
    };
    const color = colors[status] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>{status.replace('_', ' ')}</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  return (
    <div style={{ padding: '24px' }} data-testid="banking-reconciliation">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Bank Reconciliation</h1>
        <p style={{ color: '#6b7280' }}>Reconcile bank statements with accounting records</p>
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
          + New Reconciliation
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>In Progress</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{reconciliations.filter(r => r.status === 'IN_PROGRESS').length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Completed</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{reconciliations.filter(r => r.status === 'COMPLETED').length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Approved</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{reconciliations.filter(r => r.status === 'APPROVED').length}</div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="reconciliations-table">
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Account</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Period</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Opening</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Closing</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Statement</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Difference</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr>
            ) : reconciliations.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No reconciliations found</td></tr>
            ) : (
              reconciliations.map((recon) => (
                <tr key={recon.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>{recon.account_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                    {formatDate(recon.period_start)} - {formatDate(recon.period_end)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{formatCurrency(recon.opening_balance)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{formatCurrency(recon.closing_balance)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{formatCurrency(recon.statement_balance)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: recon.difference !== 0 ? '#dc2626' : '#059669' }}>
                    {formatCurrency(recon.difference)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(recon.status)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleEdit(recon)}
                      style={{ padding: '4px 8px', marginRight: '8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ show: true, id: recon.id, account: recon.account_name })}
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
              {editingRecon ? 'Edit Reconciliation' : 'New Reconciliation'}
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Account Name *</label>
              <input
                type="text"
                value={form.account_name}
                onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Period Start *</label>
                <input
                  type="date"
                  value={form.period_start}
                  onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Period End *</label>
                <input
                  type="date"
                  value={form.period_end}
                  onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Opening Balance *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.opening_balance}
                  onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Closing Balance *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.closing_balance}
                  onChange={(e) => setForm({ ...form, closing_balance: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Statement Balance *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.statement_balance}
                  onChange={(e) => setForm({ ...form, statement_balance: e.target.value })}
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
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="APPROVED">Approved</option>
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
        title="Delete Reconciliation"
        message={`Are you sure you want to delete reconciliation for ${deleteConfirm.account}? This action cannot be undone.`}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ show: false, id: 0, account: '' })}
      />
    </div>
  );
};

export default Reconciliation;
