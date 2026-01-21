import { useState, useEffect } from 'react';
import { requisitionsApi } from '../../services/newPagesApi';

interface Requisition {
  id: string;
  requisition_number: string;
  requester_name?: string;
  department_name?: string;
  requisition_date: string;
  required_date: string;
  description: string;
  total_amount: number;
  status: string;
}

export default function Requisitions() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ requester_id: '', department_id: '', requisition_date: '', required_date: '', description: '', total_amount: 0, priority: 'medium' });

  useEffect(() => { fetchRequisitions(); }, []);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const response = await requisitionsApi.getAll();
      setRequisitions(response.data.requisitions || []);
    } catch (err) { setError('Failed to load requisitions'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requisitionsApi.create(formData);
      setShowForm(false);
      setFormData({ requester_id: '', department_id: '', requisition_date: '', required_date: '', description: '', total_amount: 0, priority: 'medium' });
      fetchRequisitions();
    } catch (err) { setError('Failed to create requisition'); }
  };

  const handleApprove = async (id: string) => {
    try { await requisitionsApi.approve(id); fetchRequisitions(); } catch (err) { setError('Failed to approve requisition'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const getStatusColor = (status: string) => {
    switch (status) { case 'approved': return 'bg-green-100 text-green-800'; case 'pending': return 'bg-yellow-100 text-yellow-800'; case 'rejected': return 'bg-red-100 text-red-800'; case 'converted': return 'bg-blue-100 text-blue-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Requisitions</h1><p className="text-gray-600">Manage purchase requisitions</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Requisition</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Requisition</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Requisition Date</label><input type="date" value={formData.requisition_date} onChange={(e) => setFormData({ ...formData, requisition_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Required Date</label><input type="date" value={formData.required_date} onChange={(e) => setFormData({ ...formData, required_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Priority</label><select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Estimated Amount</label><input type="number" value={formData.total_amount} onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={3} required /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Req #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requester</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required By</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requisitions.length === 0 ? (<tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No requisitions found.</td></tr>) : (
              requisitions.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.requisition_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.requester_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.department_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.requisition_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.required_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(r.total_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(r.status)}`}>{r.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">{r.status === 'pending' && <button onClick={() => handleApprove(r.id)} className="text-blue-600 hover:text-blue-900">Approve</button>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
