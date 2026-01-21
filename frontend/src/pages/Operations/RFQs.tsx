import { useState, useEffect } from 'react';
import { rfqsApi } from '../../services/newPagesApi';

interface RFQ {
  id: string;
  rfq_number: string;
  title: string;
  issue_date: string;
  closing_date: string;
  description: string;
  status: string;
  responses_count: number;
}

export default function RFQs() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', issue_date: '', closing_date: '', description: '', terms_conditions: '' });

  useEffect(() => { fetchRFQs(); }, []);

  const fetchRFQs = async () => {
    try {
      setLoading(true);
      const response = await rfqsApi.getAll();
      setRfqs(response.data.rfqs || []);
    } catch (err) { setError('Failed to load RFQs'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rfqsApi.create(formData);
      setShowForm(false);
      setFormData({ title: '', issue_date: '', closing_date: '', description: '', terms_conditions: '' });
      fetchRFQs();
    } catch (err) { setError('Failed to create RFQ'); }
  };

  const handleClose = async (id: string) => {
    try { await rfqsApi.close(id); fetchRFQs(); } catch (err) { setError('Failed to close RFQ'); }
  };

  const handleAward = async (id: string) => {
    try { await rfqsApi.award(id, ''); fetchRFQs(); } catch (err) { setError('Failed to award RFQ'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'awarded': return 'bg-green-100 text-green-800'; case 'open': return 'bg-blue-100 text-blue-800'; case 'closed': return 'bg-gray-100 text-gray-800'; case 'draft': return 'bg-yellow-100 text-yellow-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Request for Quotations</h1><p className="text-gray-600">Manage supplier RFQs</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New RFQ</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create RFQ</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label><input type="date" value={formData.issue_date} onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Closing Date</label><input type="date" value={formData.closing_date} onChange={(e) => setFormData({ ...formData, closing_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={3} required /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RFQ #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Closing Date</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Responses</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rfqs.length === 0 ? (<tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No RFQs found.</td></tr>) : (
              rfqs.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.rfq_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{r.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.issue_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.closing_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{r.responses_count || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(r.status)}`}>{r.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {r.status === 'open' && <button onClick={() => handleClose(r.id)} className="text-gray-600 hover:text-gray-900">Close</button>}
                    {r.status === 'closed' && <button onClick={() => handleAward(r.id)} className="text-green-600 hover:text-green-900">Award</button>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
