import { useState, useEffect } from 'react';
import { riskRegisterApi } from '../../services/newPagesApi';

interface Risk {
  id: string;
  risk_number: string;
  risk_title: string;
  category: string;
  description?: string;
  likelihood: number;
  impact: number;
  risk_score: number;
  owner_name?: string;
  mitigation_strategy?: string;
  review_date: string;
  status: string;
}

export default function RiskRegister() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ risk_title: '', category: 'operational', description: '', likelihood: 3, impact: 3, owner_id: '', mitigation_strategy: '', review_date: '' });

  useEffect(() => { fetchRisks(); }, []);

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const response = await riskRegisterApi.getAll();
      setRisks(response.data.risks || []);
    } catch (err) { setError('Failed to load risks'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await riskRegisterApi.create({ ...formData, risk_score: formData.likelihood * formData.impact });
      setShowForm(false);
      setFormData({ risk_title: '', category: 'operational', description: '', likelihood: 3, impact: 3, owner_id: '', mitigation_strategy: '', review_date: '' });
      fetchRisks();
    } catch (err) { setError('Failed to create risk'); }
  };

  const handleMitigate = async (id: string) => {
    try { await riskRegisterApi.mitigate(id); fetchRisks(); } catch (err) { setError('Failed to mitigate risk'); }
  };

  const handleClose = async (id: string) => {
    try { await riskRegisterApi.close(id); fetchRisks(); } catch (err) { setError('Failed to close risk'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await riskRegisterApi.delete(id); fetchRisks(); } catch (err) { setError('Failed to delete risk'); }
  };

  const getRiskColor = (score: number) => {
    if (score >= 15) return 'bg-red-100 text-red-800';
    if (score >= 10) return 'bg-orange-100 text-orange-800';
    if (score >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'closed': return 'bg-gray-100 text-gray-800'; case 'mitigated': return 'bg-green-100 text-green-800'; case 'open': return 'bg-red-100 text-red-800'; case 'monitoring': return 'bg-blue-100 text-blue-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Risk Register</h1><p className="text-gray-600">Identify and manage organizational risks</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Risk</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Risk</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Risk Title</label><input type="text" value={formData.risk_title} onChange={(e) => setFormData({ ...formData, risk_title: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="operational">Operational</option><option value="financial">Financial</option><option value="strategic">Strategic</option><option value="compliance">Compliance</option><option value="reputational">Reputational</option><option value="technology">Technology</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Likelihood (1-5)</label><select value={formData.likelihood} onChange={(e) => setFormData({ ...formData, likelihood: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2"><option value={1}>1 - Rare</option><option value={2}>2 - Unlikely</option><option value={3}>3 - Possible</option><option value={4}>4 - Likely</option><option value={5}>5 - Almost Certain</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Impact (1-5)</label><select value={formData.impact} onChange={(e) => setFormData({ ...formData, impact: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2"><option value={1}>1 - Insignificant</option><option value={2}>2 - Minor</option><option value={3}>3 - Moderate</option><option value={4}>4 - Major</option><option value={5}>5 - Catastrophic</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Review Date</label><input type="date" value={formData.review_date} onChange={(e) => setFormData({ ...formData, review_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="bg-gray-50 p-3 rounded-lg flex items-center"><span className="text-sm text-gray-600">Risk Score: </span><span className={`ml-2 px-3 py-1 rounded-full font-bold ${getRiskColor(formData.likelihood * formData.impact)}`}>{formData.likelihood * formData.impact}</span></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Mitigation Strategy</label><textarea value={formData.mitigation_strategy} onChange={(e) => setFormData({ ...formData, mitigation_strategy: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Add Risk</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">L</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">I</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Review</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {risks.length === 0 ? (<tr><td colSpan={10} className="px-6 py-8 text-center text-gray-500">No risks found.</td></tr>) : (
              risks.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.risk_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.risk_title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{r.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{r.likelihood}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{r.impact}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center"><span className={`px-2 py-1 text-xs font-bold rounded-full ${getRiskColor(r.risk_score)}`}>{r.risk_score}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.owner_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.review_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(r.status)}`}>{r.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {r.status === 'open' && <button onClick={() => handleMitigate(r.id)} className="text-blue-600 hover:text-blue-900">Mitigate</button>}
                    {r.status === 'mitigated' && <button onClick={() => handleClose(r.id)} className="text-green-600 hover:text-green-900">Close</button>}
                    <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-900">Delete</button>
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
