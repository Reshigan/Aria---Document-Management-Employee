import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface Receipt {
  id: number;
  receipt_number: string;
  customer_name: string;
  invoice_number: string;
  amount: number;
  receipt_date: string;
  payment_method: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'CARD';
  status: 'PENDING' | 'CLEARED';
}

const Receipts: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [form, setForm] = useState({
    receipt_number: '',
    customer_name: '',
    invoice_number: '',
    amount: '',
    receipt_date: '',
    payment_method: 'BANK_TRANSFER' as 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'CARD',
    status: 'PENDING' as 'PENDING' | 'CLEARED'
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; number: string }>({
    show: false,
    id: 0,
    number: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/ar/receipts');
      setReceipts(response.data.receipts || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingReceipt(null);
    setForm({
      receipt_number: '',
      customer_name: '',
      invoice_number: '',
      amount: '',
      receipt_date: new Date().toISOString().split('T')[0],
      payment_method: 'BANK_TRANSFER',
      status: 'PENDING'
    });
    setShowModal(true);
  };

  const handleEdit = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setForm({
      receipt_number: receipt.receipt_number,
      customer_name: receipt.customer_name,
      invoice_number: receipt.invoice_number,
      amount: receipt.amount.toString(),
      receipt_date: receipt.receipt_date,
      payment_method: receipt.payment_method,
      status: receipt.status
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
      
      if (editingReceipt) {
        await api.put(`/ar/receipts/${editingReceipt.id}`, payload);
      } else {
        await api.post('/ar/receipts', payload);
      }
      setShowModal(false);
      loadReceipts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save receipt');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/ar/receipts/${id}`);
      loadReceipts();
      setDeleteConfirm({ show: false, id: 0, number: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete receipt');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: '#fef3c7', text: '#92400e' },
      CLEARED: { bg: '#dcfce7', text: '#166534' }
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
    <div style={{ padding: '24px' }} data-testid="ar-receipts">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Customer Receipts</h1>
        <p style={{ color: '#6b7280' }}>Track and manage customer payments received</p>
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
          + New Receipt
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Received</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
            {formatCurrency(receipts.reduce((sum, r) => sum + r.amount, 0))}
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Pending</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{receipts.filter(r => r.status === 'PENDING').length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Cleared</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{receipts.filter(r => r.status === 'CLEARED').length}</div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="receipts-table">
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Receipt #</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Customer</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Invoice #</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Method</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr>
            ) : receipts.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No receipts found</td></tr>
            ) : (
              receipts.map((receipt) => (
                <tr key={receipt.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>{receipt.receipt_number}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{receipt.customer_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{receipt.invoice_number}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{formatCurrency(receipt.amount)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{receipt.payment_method.replace('_', ' ')}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{formatDate(receipt.receipt_date)}</td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(receipt.status)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleEdit(receipt)}
                      style={{ padding: '4px 8px', marginRight: '8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ show: true, id: receipt.id, number: receipt.receipt_number })}
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
              {editingReceipt ? 'Edit Receipt' : 'New Receipt'}
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Receipt Number *</label>
              <input
                type="text"
                value={form.receipt_number}
                onChange={(e) => setForm({ ...form, receipt_number: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Customer Name *</label>
              <input
                type="text"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Invoice Number *</label>
              <input
                type="text"
                value={form.invoice_number}
                onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
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
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Receipt Date *</label>
                <input
                  type="date"
                  value={form.receipt_date}
                  onChange={(e) => setForm({ ...form, receipt_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Payment Method *</label>
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value as any })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Status *</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="PENDING">Pending</option>
                  <option value="CLEARED">Cleared</option>
                </select>
              </div>
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
        title="Delete Receipt"
        message={`Are you sure you want to delete receipt ${deleteConfirm.number}? This action cannot be undone.`}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ show: false, id: 0, number: '' })}
      />
    </div>
  );
};

export default Receipts;
