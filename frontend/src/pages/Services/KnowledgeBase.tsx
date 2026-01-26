import { useState, useEffect } from 'react';
import { BookOpen, Plus, RefreshCw, AlertCircle, X, Eye, ThumbsUp, CheckCircle, Clock, Archive, Trash2, Send } from 'lucide-react';
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      draft: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      archived: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.draft;
  };

  const stats = { total: articles.length, published: articles.filter(a => a.status === 'published').length, totalViews: articles.reduce((sum, a) => sum + a.view_count, 0), totalHelpful: articles.reduce((sum, a) => sum + a.helpful_count, 0) };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div><h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Knowledge Base</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Manage help articles and documentation</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchArticles} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30"><Plus className="h-5 w-5" />New Article</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-500/30"><BookOpen className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Articles</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30"><CheckCircle className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.published}</p><p className="text-sm text-gray-500 dark:text-gray-400">Published</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/30"><Eye className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalViews}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Views</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30"><ThumbsUp className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.totalHelpful}</p><p className="text-sm text-gray-500 dark:text-gray-400">Helpful Votes</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"><div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 sticky top-0"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><BookOpen className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Knowledge Article</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-6 space-y-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title *</label><input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"><option value="general">General</option><option value="getting_started">Getting Started</option><option value="how_to">How To</option><option value="troubleshooting">Troubleshooting</option><option value="faq">FAQ</option><option value="release_notes">Release Notes</option></select></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label><input type="text" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="e.g., invoicing, setup" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" /></div></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content *</label><textarea required value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={6} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" /></div><div className="flex items-center"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.is_public} onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Public Article</span></label></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30">Create Article</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>) : articles.length === 0 ? (<div className="p-12 text-center"><BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No knowledge articles</h3><button onClick={() => setShowForm(true)} className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium">New Article</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Article #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Title</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Author</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Views</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Helpful</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Updated</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{articles.map((a) => (<tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-indigo-600 dark:text-indigo-400">{a.article_number}</td><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{a.title}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">{a.category.replace('_', ' ')}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{a.author_name || '-'}</td><td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{a.view_count}</td><td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{a.helpful_count}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{a.updated_at?.split('T')[0]}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(a.status)}`}>{a.status === 'published' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{a.status}</span></td><td className="px-6 py-4 text-right space-x-1">{a.status === 'draft' && <button onClick={() => handlePublish(a.id)} className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"><Send className="h-4 w-4 inline mr-1" />Publish</button>}{a.status === 'published' && <button onClick={() => handleArchive(a.id)} className="px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg"><Archive className="h-4 w-4 inline mr-1" />Archive</button>}<button onClick={() => handleDelete(a.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4 inline mr-1" />Delete</button></td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
