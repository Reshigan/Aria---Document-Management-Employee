import { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit, Trash2, Copy, Eye } from 'lucide-react';
import api from '../../lib/api';

interface ProductTemplate {
  id: string;
  name: string;
  sku_prefix?: string;
  description?: string;
  category_id?: string;
  category_name?: string;
  product_type: string;
  list_price: number;
  cost_price: number;
  can_be_sold: boolean;
  can_be_purchased: boolean;
  track_inventory: boolean;
  is_active: boolean;
  variant_count?: number;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  path?: string;
}

export default function ProductTemplates() {
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProductTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku_prefix: '',
    description: '',
    category_id: '',
    product_type: 'physical',
    list_price: 0,
    cost_price: 0,
    can_be_sold: true,
    can_be_purchased: true,
    track_inventory: true,
    weight: 0,
    volume: 0,
    is_active: true
  });

  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/odoo/products/templates');
      const data = response.data.data || response.data || [];
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/odoo/products/categories');
      const data = response.data.data || response.data || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await api.put(`/odoo/products/templates/${editingTemplate.id}`, formData);
      } else {
        await api.post('/odoo/products/templates', formData);
      }
      setShowForm(false);
      setEditingTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template. Please try again.');
    }
  };

  const handleEdit = (template: ProductTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      sku_prefix: template.sku_prefix || '',
      description: template.description || '',
      category_id: template.category_id || '',
      product_type: template.product_type,
      list_price: template.list_price,
      cost_price: template.cost_price,
      can_be_sold: template.can_be_sold,
      can_be_purchased: template.can_be_purchased,
      track_inventory: template.track_inventory,
      weight: 0,
      volume: 0,
      is_active: template.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.delete(`/odoo/products/templates/${id}`);
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template. Please try again.');
    }
  };

  const handleGenerateVariants = async (templateId: string) => {
    try {
      await api.post(`/odoo/products/templates/${templateId}/generate-variants`);
      alert('Variants generated successfully!');
      loadTemplates();
    } catch (error) {
      console.error('Error generating variants:', error);
      alert('Error generating variants. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku_prefix: '',
      description: '',
      category_id: '',
      product_type: 'physical',
      list_price: 0,
      cost_price: 0,
      can_be_sold: true,
      can_be_purchased: true,
      track_inventory: true,
      weight: 0,
      volume: 0,
      is_active: true
    });
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.sku_prefix && t.sku_prefix.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const productTypeLabels: Record<string, string> = {
    physical: 'Physical',
    service: 'Service',
    consumable: 'Consumable',
    bundle: 'Bundle'
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Package size={28} className="text-purple-500" />
          Product Templates
        </h1>
        <p className="text-gray-600 mt-1">Manage product templates with configurable attributes and variants</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Templates</div>
          <div className="text-2xl font-bold text-purple-600">{templates.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Physical Products</div>
          <div className="text-2xl font-bold text-blue-600">
            {templates.filter(t => t.product_type === 'physical').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Services</div>
          <div className="text-2xl font-bold text-green-600">
            {templates.filter(t => t.product_type === 'service').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Variants</div>
          <div className="text-2xl font-bold text-orange-600">
            {templates.reduce((sum, t) => sum + (t.variant_count || 0), 0)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={() => { setEditingTemplate(null); resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700"
          >
            <Plus size={16} />
            Add Template
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">List Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Variants</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTemplates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{template.name}</div>
                    {template.sku_prefix && (
                      <div className="text-sm text-gray-500">SKU: {template.sku_prefix}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {template.category_name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      template.product_type === 'physical' ? 'bg-blue-100 text-blue-800' :
                      template.product_type === 'service' ? 'bg-green-100 text-green-800' :
                      template.product_type === 'consumable' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {productTypeLabels[template.product_type] || template.product_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    R {template.list_price.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600">
                    R {template.cost_price.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                      {template.variant_count || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleGenerateVariants(template.id)}
                      className="text-purple-600 hover:text-purple-900 mr-2"
                      title="Generate Variants"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(template)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTemplates.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {searchTerm ? 'No templates found matching your search' : 'No templates yet. Create your first one!'}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingTemplate ? 'Edit Template' : 'Add Template'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU Prefix</label>
                  <input
                    type="text"
                    value={formData.sku_prefix}
                    onChange={(e) => setFormData({ ...formData, sku_prefix: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.path || c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                  <select
                    value={formData.product_type}
                    onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="physical">Physical</option>
                    <option value="service">Service</option>
                    <option value="consumable">Consumable</option>
                    <option value="bundle">Bundle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">List Price (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.list_price}
                    onChange={(e) => setFormData({ ...formData, list_price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.can_be_sold}
                    onChange={(e) => setFormData({ ...formData, can_be_sold: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">Can be Sold</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.can_be_purchased}
                    onChange={(e) => setFormData({ ...formData, can_be_purchased: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">Can be Purchased</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.track_inventory}
                    onChange={(e) => setFormData({ ...formData, track_inventory: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">Track Inventory</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">Active</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingTemplate(null); resetForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
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
