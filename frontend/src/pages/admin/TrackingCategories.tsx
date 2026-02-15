import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, X, Tag, ChevronRight, ChevronDown, Layers, FolderTree, Settings } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';

interface TrackingOption {
  id: string;
  name: string;
  is_active: boolean;
}

interface TrackingCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  options: TrackingOption[];
}

export default function TrackingCategories() {
  const [categories, setCategories] = useState<TrackingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TrackingCategory | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true, options: '' });

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/admin-config/tracking-categories`);
      const data = await response.json();
      if (data.success) setCategories(data.data || []);
    } catch (error) {
      setCategories([
        { id: '1', name: 'Department', description: 'Track by department', is_active: true, options: [{ id: '1a', name: 'Sales', is_active: true }, { id: '1b', name: 'Marketing', is_active: true }, { id: '1c', name: 'Operations', is_active: true }, { id: '1d', name: 'Finance', is_active: true }, { id: '1e', name: 'HR', is_active: true }] },
        { id: '2', name: 'Project', description: 'Track by project', is_active: true, options: [{ id: '2a', name: 'Project Alpha', is_active: true }, { id: '2b', name: 'Project Beta', is_active: true }, { id: '2c', name: 'Project Gamma', is_active: false }] },
        { id: '3', name: 'Cost Center', description: 'Track by cost center', is_active: true, options: [{ id: '3a', name: 'Head Office', is_active: true }, { id: '3b', name: 'Branch 1', is_active: true }, { id: '3c', name: 'Branch 2', is_active: true }] },
        { id: '4', name: 'Region', description: 'Track by geographic region', is_active: true, options: [{ id: '4a', name: 'Gauteng', is_active: true }, { id: '4b', name: 'Western Cape', is_active: true }, { id: '4c', name: 'KwaZulu-Natal', is_active: true }] },
      ]);
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const optionsArray = formData.options.split('\n').filter(o => o.trim()).map(o => ({ name: o.trim(), is_active: true }));
      const payload = { name: formData.name, description: formData.description, is_active: formData.is_active, options: optionsArray };
      const url = editingCategory ? `${API_BASE}/api/admin-config/tracking-categories/${editingCategory.id}` : `${API_BASE}/api/admin-config/tracking-categories`;
      const response = await fetch(url, { method: editingCategory ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (data.success) { alert(editingCategory ? 'Category updated' : 'Category created'); setShowModal(false); setEditingCategory(null); fetchCategories(); }
      else alert(data.error || 'Failed to save');
    } catch (error) { alert('Failed to save category'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tracking category and all its options?')) return;
    try {
      const response = await fetch(`${API_BASE}/api/admin-config/tracking-categories/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) { alert('Category deleted'); fetchCategories(); } else alert(data.error || 'Failed to delete');
    } catch (error) { alert('Failed to delete'); }
  };

  const openEdit = (category: TrackingCategory) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || '', is_active: category.is_active, options: category.options.map(o => o.name).join('\n') });
    setShowModal(true);
  };

  const toggleExpand = (id: string) => {
    const n = new Set(expandedCategories);
    n.has(id) ? n.delete(id) : n.add(id);
    setExpandedCategories(n);
  };

  const totalOptions = categories.reduce((sum, c) => sum + c.options.length, 0);
  const activeOptions = categories.reduce((sum, c) => sum + c.options.filter(o => o.is_active).length, 0);

  return (
    <div className="p-4 space-y-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">Tracking Categories</h1>
          <p className="text-gray-500 mt-1">Define dimensions for reporting and analysis</p>
        </div>
        <button onClick={() => { setEditingCategory(null); setFormData({ name: '', description: '', is_active: true, options: '' }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-lg font-medium"><Plus className="h-4 w-4" />Add Category</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4"><div className="flex items-center gap-3"><div className="p-2 bg-rose-100 dark:bg-rose-900/50 rounded-lg"><Layers className="h-5 w-5 text-rose-600" /></div><div><p className="text-2xl font-bold">{categories.length}</p><p className="text-xs text-gray-500">Categories</p></div></div></div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4"><div className="flex items-center gap-3"><div className="p-2 bg-pink-100 dark:bg-pink-900/50 rounded-lg"><Tag className="h-5 w-5 text-pink-600" /></div><div><p className="text-2xl font-bold">{totalOptions}</p><p className="text-xs text-gray-500">Total Options</p></div></div></div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg"><FolderTree className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{activeOptions}</p><p className="text-xs text-gray-500">Active Options</p></div></div></div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg"><Settings className="h-5 w-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{categories.filter(c => c.is_active).length}</p><p className="text-xs text-gray-500">Active Categories</p></div></div></div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-rose-500" /></div>
      ) : (
        <div className="space-y-4">
          {categories.map(category => {
            const isExpanded = expandedCategories.has(category.id);
            return (
              <div key={category.id} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => toggleExpand(category.id)}>
                  <div className="flex items-center gap-3">
                    <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">{isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</button>
                    <div className="p-2 bg-gradient-to-r from-rose-500 to-pink-500 rounded-lg text-white"><Layers className="h-5 w-5" /></div>
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">{category.name}<span className={`px-2 py-0.5 rounded-full text-xs ${category.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{category.is_active ? 'Active' : 'Inactive'}</span></h3>
                      <p className="text-xs text-gray-500">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-full text-sm font-medium">{category.options.length} options</span>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(category)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(category.id)} className="p-2 hover:bg-red-100 text-red-600 rounded"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {category.options.map(option => (
                        <div key={option.id} className={`p-3 rounded-lg border ${option.is_active ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50'}`}>
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-rose-500" />
                            <span className="text-sm font-medium">{option.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold">{editingCategory ? 'Edit Tracking Category' : 'New Tracking Category'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Category Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" placeholder="e.g., Department, Project, Region" /></div>
              <div><label className="block text-sm font-medium mb-1">Description</label><input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" placeholder="Brief description of this category" /></div>
              <div>
                <label className="block text-sm font-medium mb-1">Options (one per line)</label>
                <textarea value={formData.options} onChange={(e) => setFormData({ ...formData, options: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" rows={6} placeholder="Sales&#10;Marketing&#10;Operations&#10;Finance&#10;HR" />
                <p className="text-xs text-gray-500 mt-1">Enter each option on a new line</p>
              </div>
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer"><input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 rounded" /><span>Category is Active</span></label>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
