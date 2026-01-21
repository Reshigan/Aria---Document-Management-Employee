import { useState, useEffect } from 'react';
import { controlledDocumentsApi } from '../../services/newPagesApi';

interface ControlledDocument {
  id: string;
  document_number: string;
  document_title: string;
  document_type: string;
  version: string;
  owner_name?: string;
  effective_date: string;
  review_date: string;
  retention_period_years: number;
  status: string;
}

export default function DocumentControl() {
  const [documents, setDocuments] = useState<ControlledDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ document_title: '', document_type: 'policy', version: '1.0', owner_id: '', effective_date: '', review_date: '', retention_period_years: 7, description: '', content: '' });

  useEffect(() => { fetchDocuments(); }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await controlledDocumentsApi.getAll();
      setDocuments(response.data.controlled_documents || []);
    } catch (err) { setError('Failed to load controlled documents'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await controlledDocumentsApi.create(formData);
      setShowForm(false);
      setFormData({ document_title: '', document_type: 'policy', version: '1.0', owner_id: '', effective_date: '', review_date: '', retention_period_years: 7, description: '', content: '' });
      fetchDocuments();
    } catch (err) { setError('Failed to create controlled document'); }
  };

  const handleApprove = async (id: string) => {
    try { await controlledDocumentsApi.approve(id); fetchDocuments(); } catch (err) { setError('Failed to approve document'); }
  };

  const handleArchive = async (id: string) => {
    try { await controlledDocumentsApi.archive(id); fetchDocuments(); } catch (err) { setError('Failed to archive document'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await controlledDocumentsApi.delete(id); fetchDocuments(); } catch (err) { setError('Failed to delete document'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'approved': return 'bg-green-100 text-green-800'; case 'draft': return 'bg-gray-100 text-gray-800'; case 'pending_review': return 'bg-yellow-100 text-yellow-800'; case 'archived': return 'bg-blue-100 text-blue-800'; case 'expired': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Document Control</h1><p className="text-gray-600">Manage controlled documents and versions</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Document</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Controlled Document</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Document Title</label><input type="text" value={formData.document_title} onChange={(e) => setFormData({ ...formData, document_title: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label><select value={formData.document_type} onChange={(e) => setFormData({ ...formData, document_type: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="policy">Policy</option><option value="procedure">Procedure</option><option value="work_instruction">Work Instruction</option><option value="form">Form</option><option value="template">Template</option><option value="manual">Manual</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Version</label><input type="text" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Retention Period (Years)</label><input type="number" value={formData.retention_period_years} onChange={(e) => setFormData({ ...formData, retention_period_years: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label><input type="date" value={formData.effective_date} onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Review Date</label><input type="date" value={formData.review_date} onChange={(e) => setFormData({ ...formData, review_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Content</label><textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={6} /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doc #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Review</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No controlled documents found.</td></tr>) : (
              documents.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{d.document_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.document_title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{d.document_type.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d.version}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d.owner_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d.effective_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d.review_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(d.status)}`}>{d.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {d.status === 'draft' && <button onClick={() => handleApprove(d.id)} className="text-green-600 hover:text-green-900">Approve</button>}
                    {d.status === 'approved' && <button onClick={() => handleArchive(d.id)} className="text-yellow-600 hover:text-yellow-900">Archive</button>}
                    <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:text-red-900">Delete</button>
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
