import React, { useState, useEffect } from 'react';
import { Plus, FileText, X, Edit, Trash2 } from 'lucide-react';

interface RFQ {
  rfq_id: string;
  title: string;
  description: string;
  status: string;
  issue_date: string;
  due_date: string;
  suppliers: string[];
}

interface FormData {
  title: string;
  description: string;
  issue_date: string;
  due_date: string;
  suppliers: string;
}

const RFQManagement: React.FC = () => {
  const [rfqs, setRFQs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRfq, setEditingRfq] = useState<RFQ | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    suppliers: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRFQs();
  }, []);

  const fetchRFQs = async () => {
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/procurement/rfq');
      const data = await response.json();
      setRFQs(data.rfqs || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: '',
      suppliers: ''
    });
    setEditingRfq(null);
    setError(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (rfq: RFQ) => {
    setEditingRfq(rfq);
    setFormData({
      title: rfq.title,
      description: rfq.description || '',
      issue_date: rfq.issue_date?.split('T')[0] || '',
      due_date: rfq.due_date?.split('T')[0] || '',
      suppliers: rfq.suppliers?.join(', ') || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (rfqId: string) => {
    if (!confirm('Are you sure you want to delete this RFQ?')) return;
    try {
      await fetch(`https://aria.vantax.co.za/api/erp/procurement/rfq/${rfqId}`, {
        method: 'DELETE'
      });
      fetchRFQs();
    } catch (error) {
      setError('Failed to delete RFQ');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingRfq 
        ? `https://aria.vantax.co.za/api/erp/procurement/rfq/${editingRfq.rfq_id}`
        : 'https://aria.vantax.co.za/api/erp/procurement/rfq';
      const method = editingRfq ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        suppliers: formData.suppliers.split(',').map(s => s.trim()).filter(s => s)
      };
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      setShowModal(false);
      resetForm();
      fetchRFQs();
    } catch (error) {
      setError('Failed to save RFQ');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      open: 'bg-blue-100 text-blue-800',
      closed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Request for Quotation (RFQ)</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage RFQs and supplier quotes</p>
          </div>
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Create RFQ
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button onClick={() => setError(null)} className="float-right">&times;</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total RFQs</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{rfqs.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <p className="text-sm text-gray-600 dark:text-gray-400">Open</p>
            <p className="text-2xl font-bold text-blue-600">{rfqs.filter(r => r.status === 'open').length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <p className="text-sm text-gray-600 dark:text-gray-400">Closed</p>
            <p className="text-2xl font-bold text-green-600">{rfqs.filter(r => r.status === 'closed').length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <p className="text-sm text-gray-600 dark:text-gray-400">Draft</p>
            <p className="text-2xl font-bold text-gray-600">{rfqs.filter(r => r.status === 'draft').length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">RFQ ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Issue Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center">Loading...</td></tr>
              ) : rfqs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center">No RFQs found</td></tr>
              ) : (
                rfqs.map((rfq) => (
                  <tr key={rfq.rfq_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-medium">{rfq.rfq_id}</td>
                    <td className="px-6 py-4 text-sm">{rfq.title}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(rfq.status)}`}>{rfq.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">{new Date(rfq.issue_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm">{new Date(rfq.due_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm">
                      <button onClick={() => handleEdit(rfq)} className="text-blue-600 hover:text-blue-900 mr-3"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(rfq.rfq_id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingRfq ? 'Edit RFQ' : 'Create RFQ'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Suppliers (comma-separated)</label>
                <input
                  type="text"
                  value={formData.suppliers}
                  onChange={(e) => setFormData({ ...formData, suppliers: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Supplier A, Supplier B, Supplier C"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingRfq ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RFQManagement;
