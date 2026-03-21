import { useState, useEffect } from 'react';
import { FolderTree, Plus, Search, Edit, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import api from '../../lib/api';

interface Category {
  id: string;
  name: string;
  code?: string;
  parent_id?: string;
  level: number;
  path?: string;
  is_active: boolean;
  created_at: string;
}

export default function ProductCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    parent_id: '',
    is_active: true
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/odoo/products/categories');
      const data = response.data.data || response.data || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/odoo/products/categories/${editingCategory.id}`, formData);
      } else {
        await api.post('/odoo/products/categories', formData);
      }
      setShowForm(false);
      setEditingCategory(null);
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error saving category. Please try again.');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      code: category.code || '',
      parent_id: category.parent_id || '',
      is_active: category.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/odoo/products/categories/${id}`);
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      parent_id: '',
      is_active: true
    });
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const rootCategories = filteredCategories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => filteredCategories.filter(c => c.parent_id === parentId);

  const renderCategory = (category: Category, depth: number = 0) => {
    const children = getChildren(category.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(category.id);

    return (
      <div key={category.id}>
        <div 
          className="flex items-center py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 border-b"
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
        >
          <button
            onClick={() => hasChildren && toggleExpand(category.id)}
            className="mr-2 text-gray-300"
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            ) : (
              <span className="w-4" />
            )}
          </button>
          <FolderTree size={18} className="text-purple-500 mr-3" />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white">{category.name}</div>
            {category.code && (
              <div className="text-xs text-gray-500 dark:text-gray-300">Code: {category.code}</div>
            )}
          </div>
          <span className={`px-2 py-1 text-xs rounded-full mr-4 ${
            category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {category.is_active ? 'Active' : 'Inactive'}
          </span>
          <button
            onClick={() => handleEdit(category)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100 mr-2"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDelete(category.id)}
            className="text-red-600 dark:text-red-400 hover:text-red-900"
          >
            <Trash2 size={16} />
          </button>
        </div>
        {hasChildren && isExpanded && children.map(child => renderCategory(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
          <FolderTree size={28} className="text-purple-500" />
          Product Categories
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Organize products with multi-level category hierarchy</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="p-4 border-b flex gap-3">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={() => { setEditingCategory(null); resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700"
          >
            <Plus size={16} />
            Add Category
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-300">Loading categories...</div>
        ) : rootCategories.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-300">
            {searchTerm ? 'No categories found matching your search' : 'No categories yet. Create your first one!'}
          </div>
        ) : (
          <div>
            {rootCategories.map(category => renderCategory(category))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700-xl w-full max-w-md p-4">
            <h2 className="text-xl font-bold mb-4">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parent Category</label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">None (Root Category)</option>
                  {categories.filter(c => c.id !== editingCategory?.id).map(c => (
                    <option key={c.id} value={c.id}>{c.path || c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-purple-600 dark:text-purple-400 focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label className="ml-2 text-sm text-gray-900 dark:text-white">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingCategory(null); resetForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
