import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface QualityInspection {
  id: number;
  inspection_number: string;
  inspection_type: string;
  product_name: string;
  batch_number: string;
  inspector: string;
  inspection_date: string;
  status: 'PENDING' | 'PASSED' | 'FAILED';
  defects_found: number;
}

const QualityDashboard: React.FC = () => {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [metrics, setMetrics] = useState({
    overall_quality_score: 0,
    inspections_completed: 0,
    inspections_pending: 0,
    pass_rate: 0,
    defect_rate: 0,
    non_conformances: 0
  });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingInspection, setEditingInspection] = useState<QualityInspection | null>(null);
  const [form, setForm] = useState({
    inspection_type: '',
    product_name: '',
    batch_number: '',
    inspector: '',
    inspection_date: '',
    status: 'PENDING' as 'PENDING' | 'PASSED' | 'FAILED',
    defects_found: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; number: string }>({
    show: false,
    id: 0,
    number: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadMetrics();
    loadInspections();
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await api.get('/quality/metrics');
      setMetrics(response.data);
    } catch (err: any) {
      console.error('Failed to load metrics:', err);
    }
  };

  const loadInspections = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/quality/inspections');
      setInspections(response.data.inspections || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load inspections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingInspection(null);
    setForm({
      inspection_type: '',
      product_name: '',
      batch_number: '',
      inspector: '',
      inspection_date: new Date().toISOString().split('T')[0],
      status: 'PENDING',
      defects_found: '0'
    });
    setShowModal(true);
  };

  const handleEdit = (inspection: QualityInspection) => {
    setEditingInspection(inspection);
    setForm({
      inspection_type: inspection.inspection_type,
      product_name: inspection.product_name,
      batch_number: inspection.batch_number,
      inspector: inspection.inspector,
      inspection_date: inspection.inspection_date,
      status: inspection.status,
      defects_found: inspection.defects_found.toString()
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      const payload = {
        ...form,
        defects_found: parseInt(form.defects_found) || 0
      };
      
      if (editingInspection) {
        await api.put(`/quality/inspections/${editingInspection.id}`, payload);
      } else {
        await api.post('/quality/inspections', payload);
      }
      setShowModal(false);
      loadInspections();
      loadMetrics();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save inspection');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/quality/inspections/${id}`);
      loadInspections();
      loadMetrics();
      setDeleteConfirm({ show: false, id: 0, number: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete inspection');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: '#fef3c7', text: '#92400e' },
      PASSED: { bg: '#dcfce7', text: '#166534' },
      FAILED: { bg: '#fee2e2', text: '#991b1b' }
    };
    const color = colors[status] || { bg: '#f3f4f6', text: '#374151' };
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: color.bg, color: color.text }}>{status}</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  return (
    <div style={{ padding: '24px' }} data-testid="quality-dashboard">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Quality Management</h1>
        <p style={{ color: '#6b7280' }}>Monitor quality inspections and metrics</p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Quality Score</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{metrics.overall_quality_score}%</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Completed</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{metrics.inspections_completed}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Pass Rate</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{metrics.pass_rate}%</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Non-Conformances</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{metrics.non_conformances}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>Quality Inspections</h2>
        <button
          onClick={handleCreate}
          style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
          data-testid="create-button"
        >
          + New Inspection
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="inspections-table">
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Inspection #</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Product</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Batch</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Inspector</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Defects</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr>
            ) : inspections.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No inspections found</td></tr>
            ) : (
              inspections.map((inspection) => (
                <tr key={inspection.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>{inspection.inspection_number}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{inspection.inspection_type}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{inspection.product_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{inspection.batch_number}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{inspection.inspector}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{formatDate(inspection.inspection_date)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{inspection.defects_found}</td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(inspection.status)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleEdit(inspection)}
                      style={{ padding: '4px 8px', marginRight: '8px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ show: true, id: inspection.id, number: inspection.inspection_number })}
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
              {editingInspection ? 'Edit Inspection' : 'New Inspection'}
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Inspection Type *</label>
              <input
                type="text"
                value={form.inspection_type}
                onChange={(e) => setForm({ ...form, inspection_type: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                placeholder="e.g., Incoming, In-Process, Final"
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
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Batch Number *</label>
                <input
                  type="text"
                  value={form.batch_number}
                  onChange={(e) => setForm({ ...form, batch_number: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Inspector *</label>
                <input
                  type="text"
                  value={form.inspector}
                  onChange={(e) => setForm({ ...form, inspector: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Inspection Date *</label>
                <input
                  type="date"
                  value={form.inspection_date}
                  onChange={(e) => setForm({ ...form, inspection_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Defects Found *</label>
                <input
                  type="number"
                  value={form.defects_found}
                  onChange={(e) => setForm({ ...form, defects_found: e.target.value })}
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
                  <option value="PENDING">Pending</option>
                  <option value="PASSED">Passed</option>
                  <option value="FAILED">Failed</option>
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
        title="Delete Inspection"
        message={`Are you sure you want to delete inspection ${deleteConfirm.number}? This action cannot be undone.`}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ show: false, id: 0, number: '' })}
      />
    </div>
  );
};

export default QualityDashboard;
