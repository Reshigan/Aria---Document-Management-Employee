import { useState, useEffect } from 'react';
import { FileCheck, Plus, RefreshCw, AlertCircle, X, Clock, CheckCircle, Archive, Trash2, Send } from 'lucide-react';
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      pending_review: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      archived: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      expired: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.draft;
  };

  const stats = { total: documents.length, approved: documents.filter(d => d.status === 'approved').length, draft: documents.filter(d => d.status === 'draft').length, archived: documents.filter(d => d.status === 'archived').length };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Document Control</h1><p className="text-gray-500 dark:text-gray-300 mt-1">Manage controlled documents and versions</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchDocuments} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-blue-700 transition-all "><Plus className="h-5 w-5" />New Document</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl "><FileCheck className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Documents</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p><p className="text-xs text-gray-500 dark:text-gray-300">Approved</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Clock className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.draft}</p><p className="text-xs text-gray-500 dark:text-gray-300">Draft</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><Archive className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.archived}</p><p className="text-xs text-gray-500 dark:text-gray-300">Archived</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto"><div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-4 sticky top-0"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><FileCheck className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Create Controlled Document</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-4 space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Document Title *</label><input type="text" required value={formData.document_title} onChange={(e) => setFormData({ ...formData, document_title: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Document Type *</label><select value={formData.document_type} onChange={(e) => setFormData({ ...formData, document_type: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"><option value="policy">Policy</option><option value="procedure">Procedure</option><option value="work_instruction">Work Instruction</option><option value="form">Form</option><option value="template">Template</option><option value="manual">Manual</option></select></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Version *</label><input type="text" required value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Retention (Years)</label><input type="number" value={formData.retention_period_years} onChange={(e) => setFormData({ ...formData, retention_period_years: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Effective Date *</label><input type="date" required value={formData.effective_date} onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Review Date *</label><input type="date" required value={formData.review_date} onChange={(e) => setFormData({ ...formData, review_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500" /></div></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content</label><textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={6} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500" /></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-blue-700 ">Create Document</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-cyan-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading...</p></div>) : documents.length === 0 ? (<div className="p-12 text-center"><FileCheck className="h-8 w-8 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No controlled documents</h3><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium">New Document</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Doc #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Title</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Type</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Version</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Owner</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Effective</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Review</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{documents.map((d) => (<tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-cyan-600 dark:text-cyan-400">{d.document_number}</td><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{d.document_title}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">{d.document_type.replace('_', ' ')}</td><td className="px-6 py-4"><span className="px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">v{d.version}</span></td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{d.owner_name || '-'}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{d.effective_date}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{d.review_date}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(d.status)}`}>{d.status === 'approved' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{d.status.replace('_', ' ')}</span></td><td className="px-6 py-4 text-right space-x-1">{d.status === 'draft' && <button onClick={() => handleApprove(d.id)} className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"><Send className="h-4 w-4 inline mr-1" />Approve</button>}{d.status === 'approved' && <button onClick={() => handleArchive(d.id)} className="px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg"><Archive className="h-4 w-4 inline mr-1" />Archive</button>}<button onClick={() => handleDelete(d.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4 inline mr-1" />Delete</button></td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
