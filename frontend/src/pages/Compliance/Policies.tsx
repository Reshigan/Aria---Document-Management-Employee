import { useState, useEffect } from 'react';
import { policiesApi } from '../../services/newPagesApi';

interface Policy {
  id: string;
  policy_number: string;
  policy_name: string;
  category: string;
  version: string;
  owner_name?: string;
  effective_date: string;
  review_date: string;
  acknowledgement_required: boolean;
  acknowledged_count: number;
  total_employees: number;
  status: string;
}

export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ policy_name: '', category: 'hr', version: '1.0', owner_id: '', effective_date: '', review_date: '', acknowledgement_required: false, summary: '', content: '' });

  useEffect(() => { fetchPolicies(); }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await policiesApi.getAll();
      setPolicies(response.data.policies || []);
    } catch (err) { setError('Failed to load policies'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await policiesApi.create(formData);
      setShowForm(false);
      setFormData({ policy_name: '', category: 'hr', version: '1.0', owner_id: '', effective_date: '', review_date: '', acknowledgement_required: false, summary: '', content: '' });
      fetchPolicies();
    } catch (err) { setError('Failed to create policy'); }
  };

  const handlePublish = async (id: string) => {
    try { await policiesApi.publish(id); fetchPolicies(); } catch (err) { setError('Failed to publish policy'); }
  };

  const handleArchive = async (id: string) => {
    try { await policiesApi.archive(id); fetchPolicies(); } catch (err) { setError('Failed to archive policy'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await policiesApi.delete(id); fetchPolicies(); } catch (err) { setError('Failed to delete policy'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'published': return 'bg-green-100 text-green-800'; case 'draft': return 'bg-gray-100 text-gray-800'; case 'archived': return 'bg-blue-100 text-blue-800'; case 'expired': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Company Policies</h1><p className="text-gray-600">Manage organizational policies and acknowledgements</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Policy</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Policy</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Policy Name</label><input type="text" value={formData.policy_name} onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="hr">HR</option><option value="it">IT</option><option value="finance">Finance</option><option value="operations">Operations</option><option value="compliance">Compliance</option><option value="safety">Safety</option><option value="security">Security</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Version</label><input type="text" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="flex items-center"><label className="flex items-center"><input type="checkbox" checked={formData.acknowledgement_required} onChange={(e) => setFormData({ ...formData, acknowledgement_required: e.target.checked })} className="mr-2" /><span className="text-sm text-gray-700">Acknowledgement Required</span></label></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label><input type="date" value={formData.effective_date} onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Review Date</label><input type="date" value={formData.review_date} onChange={(e) => setFormData({ ...formData, review_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Summary</label><textarea value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Content</label><textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={6} /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Policy #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acknowledged</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {policies.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No policies found.</td></tr>) : (
              policies.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.policy_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.policy_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{p.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.version}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.owner_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.effective_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{p.acknowledgement_required ? `${p.acknowledged_count}/${p.total_employees}` : 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(p.status)}`}>{p.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {p.status === 'draft' && <button onClick={() => handlePublish(p.id)} className="text-green-600 hover:text-green-900">Publish</button>}
                    {p.status === 'published' && <button onClick={() => handleArchive(p.id)} className="text-yellow-600 hover:text-yellow-900">Archive</button>}
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900">Delete</button>
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
