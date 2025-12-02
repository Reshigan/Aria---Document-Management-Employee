import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface BOM {
  id: number;
  bom_code: string;
  product_name: string;
  version: string;
  total_components: number;
  total_cost: number;
  status: 'DRAFT' | 'ACTIVE' | 'OBSOLETE';
  created_at: string;
}

const BOMs: React.FC = () => {
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);
  const [form, setForm] = useState({
    bom_code: '',
    product_name: '',
    version: '',
    total_components: '',
    total_cost: '',
    status: 'DRAFT' as 'DRAFT' | 'ACTIVE' | 'OBSOLETE'
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; code: string }>({
    show: false,
    id: 0,
    code: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadBOMs();
  }, []);

  const loadBOMs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/manufacturing/boms');
      setBOMs(response.data.boms || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load BOMs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingBOM(null);
    setForm({
      bom_code: '',
      product_name: '',
      version: '1.0',
      total_components: '',
      total_cost: '',
      status: 'DRAFT'
    });
    setShowModal(true);
  };

  const handleEdit = (bom: BOM) => {
    setEditingBOM(bom);
    setForm({
      bom_code: bom.bom_code,
      product_name: bom.product_name,
      version: bom.version,
      total_components: bom.total_components.toString(),
      total_cost: bom.total_cost.toString(),
      status: bom.status
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      const payload = {
        ...form,
        total_components: parseInt(form.total_components) || 0,
        total_cost: parseFloat(form.total_cost) || 0
      };
      
      if (editingBOM) {
        await api.put(`/manufacturing/boms/${editingBOM.id}`, payload);
      } else {
        await api.post('/manufacturing/boms', payload);
      }
      setShowModal(false);
      loadBOMs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save BOM');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/manufacturing/boms/${id}`);
      loadBOMs();
      setDeleteConfirm({ show: false, id: 0, code: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete BOM');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: '#f3f4f6', text: '#374151' },
      ACTIVE: { bg: '#dcfce7', text: '#166534' },
      OBSOLETE: { bg: '#fee2e2', text: '#991b1b' }
    };
    const color = colors[status] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>{status}</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  return (
    <div style={{ padding: '24px' }} data-testid="manufacturing-boms">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Bills of Materials</h1>
        <p style={{ color: '#6b7280' }}>Manage product BOMs and component lists</p>
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
          + New BOM
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Active BOMs</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{boms.filter(b => b.status === 'ACTIVE').length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Draft</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280' }}>{boms.filter(b => b.status === 'DRAFT').length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total BOMs</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{boms.length}</div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="boms-table">
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>BOM Code</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Product</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Version</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Components</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Total Cost</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr>
            ) : boms.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No BOMs found</td></tr>
            ) : (
              boms.map((bom) => (
                <tr key={bom.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>{bom.bom_code}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{bom.product_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{bom.version}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{bom.total_components}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{formatCurrency(bom.total_cost)}</td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(bom.status)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleEdit(bom)}
                      style={{ padding: '4px 8px', marginRight: '8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ show: true, id: bom.id, code: bom.bom_code })}
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
              {editingBOM ? 'Edit BOM' : 'New BOM'}
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>BOM Code *</label>
              <input
                type="text"
                value={form.bom_code}
                onChange={(e) => setForm({ ...form, bom_code: e.target.value })}
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
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Version *</label>
                <input
                  type="text"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Total Components *</label>
                <input
                  type="number"
                  value={form.total_components}
                  onChange={(e) => setForm({ ...form, total_components: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Total Cost *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.total_cost}
                  onChange={(e) => setForm({ ...form, total_cost: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Status *</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="OBSOLETE">Obsolete</option>
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
        title="Delete BOM"
        message={`Are you sure you want to delete BOM ${deleteConfirm.code}? This action cannot be undone.`}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ show: false, id: 0, code: '' })}
      />
    </div>
  );
};

export default BOMs;
