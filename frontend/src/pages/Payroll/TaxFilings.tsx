import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface TaxFiling {
  id: number;
  filing_code: string;
  tax_type: 'PAYE' | 'UIF' | 'SDL' | 'VAT';
  period_start: string;
  period_end: string;
  amount: number;
  status: 'PENDING' | 'SUBMITTED' | 'PAID';
  due_date: string;
  created_at: string;
}

const TaxFilings: React.FC = () => {
  const [filings, setFilings] = useState<TaxFiling[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingFiling, setEditingFiling] = useState<TaxFiling | null>(null);
  const [form, setForm] = useState({
    filing_code: '',
    tax_type: 'PAYE' as 'PAYE' | 'UIF' | 'SDL' | 'VAT',
    period_start: '',
    period_end: '',
    amount: '',
    due_date: '',
    status: 'PENDING' as 'PENDING' | 'SUBMITTED' | 'PAID'
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; code: string }>({
    show: false,
    id: 0,
    code: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadFilings();
  }, []);

  const loadFilings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/erp/payroll/tax-filings');
      setFilings(response.data.filings || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load tax filings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingFiling(null);
    setForm({
      filing_code: '',
      tax_type: 'PAYE',
      period_start: '',
      period_end: '',
      amount: '',
      due_date: '',
      status: 'PENDING'
    });
    setShowModal(true);
  };

  const handleEdit = (filing: TaxFiling) => {
    setEditingFiling(filing);
    setForm({
      filing_code: filing.filing_code,
      tax_type: filing.tax_type,
      period_start: filing.period_start,
      period_end: filing.period_end,
      amount: filing.amount.toString(),
      due_date: filing.due_date,
      status: filing.status
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
      
      if (editingFiling) {
        await api.put(`/erp/payroll/tax-filings/${editingFiling.id}`, payload);
      } else {
        await api.post('/erp/payroll/tax-filings', payload);
      }
      setShowModal(false);
      loadFilings();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save tax filing');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/erp/payroll/tax-filings/${id}`);
      loadFilings();
      setDeleteConfirm({ show: false, id: 0, code: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete tax filing');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: '#fef3c7', text: '#92400e' },
      SUBMITTED: { bg: '#dbeafe', text: '#1e40af' },
      PAID: { bg: '#dcfce7', text: '#166534' }
    };
    const color = colors[status] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>{status}</span>;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      PAYE: { bg: '#dbeafe', text: '#1e40af' },
      UIF: { bg: '#dcfce7', text: '#166534' },
      SDL: { bg: '#fef3c7', text: '#92400e' },
      VAT: { bg: '#e0e7ff', text: '#4338ca' }
    };
    const color = colors[type] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>{type}</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  return (
    <div style={{ padding: '24px' }} data-testid="payroll-tax">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Tax Filings</h1>
        <p style={{ color: '#6b7280' }}>Manage PAYE, UIF, SDL, and VAT tax filings</p>
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
          + New Tax Filing
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>PAYE</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
            {formatCurrency(filings.filter(f => f.tax_type === 'PAYE').reduce((sum, f) => sum + f.amount, 0))}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>UIF</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
            {formatCurrency(filings.filter(f => f.tax_type === 'UIF').reduce((sum, f) => sum + f.amount, 0))}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>SDL</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
            {formatCurrency(filings.filter(f => f.tax_type === 'SDL').reduce((sum, f) => sum + f.amount, 0))}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Pending</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
            {filings.filter(f => f.status === 'PENDING').length}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="filings-table">
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Filing Code</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Tax Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Period</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Due Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr>
            ) : filings.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No tax filings found</td></tr>
            ) : (
              filings.map((filing) => (
                <tr key={filing.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>{filing.filing_code}</td>
                  <td style={{ padding: '12px 16px' }}>{getTypeBadge(filing.tax_type)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                    {formatDate(filing.period_start)} - {formatDate(filing.period_end)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{formatCurrency(filing.amount)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{formatDate(filing.due_date)}</td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(filing.status)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleEdit(filing)}
                      style={{ padding: '4px 8px', marginRight: '8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ show: true, id: filing.id, code: filing.filing_code })}
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
              {editingFiling ? 'Edit Tax Filing' : 'New Tax Filing'}
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Filing Code *</label>
              <input
                type="text"
                value={form.filing_code}
                onChange={(e) => setForm({ ...form, filing_code: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Tax Type *</label>
              <select
                value={form.tax_type}
                onChange={(e) => setForm({ ...form, tax_type: e.target.value as any })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                <option value="PAYE">PAYE</option>
                <option value="UIF">UIF</option>
                <option value="SDL">SDL</option>
                <option value="VAT">VAT</option>
              </select>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Due Date *</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
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
                <option value="SUBMITTED">Submitted</option>
                <option value="PAID">Paid</option>
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
        title="Delete Tax Filing"
        message={`Are you sure you want to delete tax filing ${deleteConfirm.code}? This action cannot be undone.`}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ show: false, id: 0, code: '' })}
      />
    </div>
  );
};

export default TaxFilings;
