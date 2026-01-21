import { useState, useEffect } from 'react';
import { knowledgeBaseApi } from '../../services/newPagesApi';

interface KnowledgeArticle {
  id: string;
  article_number: string;
  title: string;
  category: string;
  author_name?: string;
  view_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  status: string;
}

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', category: 'general', content: '', tags: '', is_public: true });

  useEffect(() => { fetchArticles(); }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await knowledgeBaseApi.getAll();
      setArticles(response.data.knowledge_articles || []);
    } catch (err) { setError('Failed to load knowledge articles'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await knowledgeBaseApi.create(formData);
      setShowForm(false);
      setFormData({ title: '', category: 'general', content: '', tags: '', is_public: true });
      fetchArticles();
    } catch (err) { setError('Failed to create knowledge article'); }
  };

  const handlePublish = async (id: string) => {
    try { await knowledgeBaseApi.publish(id); fetchArticles(); } catch (err) { setError('Failed to publish article'); }
  };

  const handleArchive = async (id: string) => {
    try { await knowledgeBaseApi.archive(id); fetchArticles(); } catch (err) { setError('Failed to archive article'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await knowledgeBaseApi.delete(id); fetchArticles(); } catch (err) { setError('Failed to delete article'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'published': return 'bg-green-100 text-green-800'; case 'draft': return 'bg-yellow-100 text-yellow-800'; case 'archived': return 'bg-gray-100 text-gray-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1><p className="text-gray-600">Manage help articles and documentation</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Article</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Knowledge Article</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="general">General</option><option value="getting_started">Getting Started</option><option value="how_to">How To</option><option value="troubleshooting">Troubleshooting</option><option value="faq">FAQ</option><option value="release_notes">Release Notes</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label><input type="text" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="e.g., invoicing, setup, billing" /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Content</label><textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={6} required /></div>
            <div className="flex items-center"><label className="flex items-center"><input type="checkbox" checked={formData.is_public} onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })} className="mr-2" /><span className="text-sm text-gray-700">Public Article</span></label></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Article #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Helpful</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {articles.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No knowledge articles found.</td></tr>) : (
              articles.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.article_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{a.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{a.category.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.author_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{a.view_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{a.helpful_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.updated_at?.split('T')[0]}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(a.status)}`}>{a.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {a.status === 'draft' && <button onClick={() => handlePublish(a.id)} className="text-green-600 hover:text-green-900">Publish</button>}
                    {a.status === 'published' && <button onClick={() => handleArchive(a.id)} className="text-yellow-600 hover:text-yellow-900">Archive</button>}
                    <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-900">Delete</button>
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
