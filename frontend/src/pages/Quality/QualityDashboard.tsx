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
    const colors: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      PASSED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    const colorClass = colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>{status}</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4" data-testid="quality-dashboard">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Quality Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor quality inspections and metrics</p>
        </div>

        {error && (
          <div className="px-4 py-3 mb-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quality Score</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.overall_quality_score}%</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Completed</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.inspections_completed}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pass Rate</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.pass_rate}%</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Non-Conformances</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{metrics.non_conformances}</div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quality Inspections</h2>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold  transition-all"
            data-testid="create-button"
          >
            + New Inspection
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
          <table className="w-full" data-testid="inspections-table">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Inspection #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Batch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Inspector</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Defects</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={9} className="py-10 text-center text-gray-500 dark:text-gray-400">Loading...</td></tr>
              ) : inspections.length === 0 ? (
                <tr><td colSpan={9} className="py-10 text-center text-gray-500 dark:text-gray-400">No inspections found</td></tr>
              ) : (
                inspections.map((inspection) => (
                  <tr key={inspection.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{inspection.inspection_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{inspection.inspection_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{inspection.product_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{inspection.batch_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{inspection.inspector}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(inspection.inspection_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{inspection.defects_found}</td>
                    <td className="px-4 py-3">{getStatusBadge(inspection.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleEdit(inspection)}
                        className="px-2 py-1 mr-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ show: true, id: inspection.id, number: inspection.inspection_number })}
                        className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium transition-colors"
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

      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 w-[500px] max-h-[90vh] overflow-auto shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingInspection ? 'Edit Inspection' : 'New Inspection'}
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Inspection Type *</label>
              <input
                type="text"
                value={form.inspection_type}
                onChange={(e) => setForm({ ...form, inspection_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="e.g., Incoming, In-Process, Final"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Product Name *</label>
              <input
                type="text"
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Batch Number *</label>
                <input
                  type="text"
                  value={form.batch_number}
                  onChange={(e) => setForm({ ...form, batch_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Inspector *</label>
                <input
                  type="text"
                  value={form.inspector}
                  onChange={(e) => setForm({ ...form, inspector: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Inspection Date *</label>
                <input
                  type="date"
                  value={form.inspection_date}
                  onChange={(e) => setForm({ ...form, inspection_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Defects Found *</label>
                <input
                  type="number"
                  value={form.defects_found}
                  onChange={(e) => setForm({ ...form, defects_found: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Status *</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="PENDING">Pending</option>
                  <option value="PASSED">Passed</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold  transition-all"
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
        onClose={() => setDeleteConfirm({ show: false, id: 0, number: '' })}
      />
    </div>
  );
};

export default QualityDashboard;
