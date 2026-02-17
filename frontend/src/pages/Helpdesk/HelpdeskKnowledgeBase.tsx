import { useState, useEffect } from 'react';
import { BookOpen, Search, Plus, Edit2, Trash2, Tag, Eye, ChevronRight } from 'lucide-react';
import api from '../../lib/api';

interface Article {
  id: string;
  title: string;
  body: string;
  category: string;
  tags: string;
  is_published: boolean;
  views: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ['Getting Started', 'Account & Billing', 'Technical Support', 'Product Guide', 'Troubleshooting', 'FAQs', 'Policies'];

export default function HelpdeskKnowledgeBase() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [viewArticle, setViewArticle] = useState<Article | null>(null);
  const [form, setForm] = useState({ title: '', body: '', category: 'Getting Started', tags: '', is_published: true });

  useEffect(() => { loadArticles(); }, []);

  const loadArticles = async () => {
    try {
      const response = await api.get('/odoo/helpdesk/knowledge-base');
      const d = response.data.data || response.data;
      setArticles(Array.isArray(d) ? d : d.articles || []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingArticle) {
        await api.put(`/odoo/helpdesk/knowledge-base/${editingArticle.id}`, form);
      } else {
        await api.post('/odoo/helpdesk/knowledge-base', form);
      }
      setShowForm(false);
      setEditingArticle(null);
      setForm({ title: '', body: '', category: 'Getting Started', tags: '', is_published: true });
      loadArticles();
    } catch {
      alert('Failed to save article');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    try {
      await api.delete(`/odoo/helpdesk/knowledge-base/${id}`);
      loadArticles();
    } catch {
      alert('Failed to delete article');
    }
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setForm({ title: article.title, body: article.body, category: article.category, tags: article.tags || '', is_published: article.is_published });
    setShowForm(true);
  };

  const filtered = articles.filter(a => {
    const matchesSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.body.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !selectedCategory || a.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categoryCounts = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = articles.filter(a => a.category === cat).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-300">Loading knowledge base...</p>
        </div>
      </div>
    );
  }

  if (viewArticle) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <button onClick={() => setViewArticle(null)} className="text-sm text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1">
          &larr; Back to Knowledge Base
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">{viewArticle.category}</span>
            {viewArticle.tags && viewArticle.tags.split(',').map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{tag.trim()}</span>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{viewArticle.title}</h1>
          <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{viewArticle.body}</div>
          <div className="mt-6 text-xs text-gray-400">
            Last updated: {viewArticle.updated_at ? new Date(viewArticle.updated_at).toLocaleDateString() : '-'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          Knowledge Base
        </h1>
        <button
          onClick={() => { setShowForm(true); setEditingArticle(null); setForm({ title: '', body: '', category: 'Getting Started', tags: '', is_published: true }); }}
          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Plus size={16} /> New Article
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat} ({categoryCounts[cat] || 0})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
            className={`p-3 rounded-xl border text-left transition-all ${selectedCategory === cat ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:shadow-md'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">{cat}</span>
              <span className="text-xs text-gray-400">{categoryCounts[cat] || 0}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(article => (
          <div key={article.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">{article.category}</span>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(article)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(article.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">{article.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{article.body}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {article.tags && article.tags.split(',').slice(0, 2).map((tag, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs text-gray-400"><Tag size={10} />{tag.trim()}</span>
                ))}
              </div>
              <button onClick={() => setViewArticle(article)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                Read <ChevronRight size={12} />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
              <Eye size={10} /> {article.views || 0} views
              {!article.is_published && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Draft</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            {search || selectedCategory ? 'No articles match your search' : 'No articles yet. Create your first knowledge base article!'}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{editingArticle ? 'Edit Article' : 'New Article'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Article title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Article content..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={e => setForm({ ...form, tags: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g. billing, setup, login"
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })} id="published" />
                <label htmlFor="published" className="text-sm text-gray-700 dark:text-gray-300">Published</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditingArticle(null); }} className="px-4 py-2 text-sm border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Save Article</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
