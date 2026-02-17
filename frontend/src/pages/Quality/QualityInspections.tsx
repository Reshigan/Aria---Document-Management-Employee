import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, X, Edit, Trash2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev/api';

interface Inspection {
  inspection_id: string;
  work_order_id: string;
  inspector: string;
  result: string;
  inspection_date: string;
  notes: string;
}

interface FormData {
  work_order_id: string;
  inspector: string;
  result: string;
  inspection_date: string;
  notes: string;
}

const QualityInspections: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [formData, setFormData] = useState<FormData>({
    work_order_id: '',
    inspector: '',
    result: 'pending',
    inspection_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      const response = await fetch(`${API_BASE}/erp/quality/inspections`);
      const ct = response.headers.get('content-type');
      if (!response.ok || !ct?.includes('application/json')) { setInspections([]); return; }
      const data = await response.json();
      setInspections(data.inspections || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      work_order_id: '',
      inspector: '',
      result: 'pending',
      inspection_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingInspection(null);
    setError(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (inspection: Inspection) => {
    setEditingInspection(inspection);
    setFormData({
      work_order_id: inspection.work_order_id,
      inspector: inspection.inspector,
      result: inspection.result,
      inspection_date: inspection.inspection_date?.split('T')[0] || '',
      notes: inspection.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (inspectionId: string) => {
    if (!confirm('Are you sure you want to delete this inspection?')) return;
    try {
      await fetch(`${API_BASE}/erp/quality/inspections/${inspectionId}`, {
        method: 'DELETE'
      });
      fetchInspections();
    } catch (error) {
      setError('Failed to delete inspection');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingInspection 
                ? `${API_BASE}/erp/quality/inspections/${editingInspection.inspection_id}`
                : `${API_BASE}/erp/quality/inspections`;
      const method = editingInspection ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      setShowModal(false);
      resetForm();
      fetchInspections();
    } catch (error) {
      setError('Failed to save inspection');
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Quality Inspections</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track quality control inspections</p>
          </div>
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} />
            New Inspection
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Inspections</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{inspections.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <p className="text-sm text-gray-600 dark:text-gray-400">Passed</p>
            <p className="text-2xl font-bold text-green-600">
              {inspections.filter(i => i.result === 'passed').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
            <p className="text-2xl font-bold text-red-600">
              {inspections.filter(i => i.result === 'failed').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {inspections.filter(i => i.result === 'pending').length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Work Order</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Inspector</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Result</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center">Loading...</td></tr>
              ) : inspections.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center">No inspections found</td></tr>
              ) : (
                inspections.map((inspection) => (
                  <tr key={inspection.inspection_id}>
                    <td className="px-6 py-4 text-sm">{inspection.inspection_id}</td>
                    <td className="px-6 py-4 text-sm">{inspection.work_order_id}</td>
                    <td className="px-6 py-4 text-sm">{inspection.inspector}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        inspection.result === 'passed' ? 'bg-green-100 text-green-800' : 
                        inspection.result === 'failed' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {inspection.result}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{(inspection.inspection_date ? new Date(inspection.inspection_date).toLocaleDateString() : "-")}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleEdit(inspection)} className="text-gray-600 hover:text-blue-600">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(inspection.inspection_id)} className="text-gray-600 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700-xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-xl font-semibold dark:text-white">
                  {editingInspection ? 'Edit Inspection' : 'New Inspection'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Work Order ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.work_order_id}
                    onChange={(e) => setFormData({ ...formData, work_order_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inspector *</label>
                  <input
                    type="text"
                    required
                    value={formData.inspector}
                    onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Result</label>
                    <select
                      value={formData.result}
                      onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inspection Date</label>
                    <input
                      type="date"
                      value={formData.inspection_date}
                      onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingInspection ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QualityInspections;
