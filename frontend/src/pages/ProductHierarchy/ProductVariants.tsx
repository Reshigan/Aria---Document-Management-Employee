import { useState, useEffect } from 'react';
import { Layers, Search, Edit, Trash2, Package, BarChart3 } from 'lucide-react';
import api from '../../lib/api';

interface ProductVariant {
  id: string;
  template_id: string;
  template_name?: string;
  name: string;
  sku?: string;
  barcode?: string;
  attribute_value_ids?: string;
  attribute_values?: string[];
  list_price?: number;
  cost_price?: number;
  weight?: number;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
}

interface ProductTemplate {
  id: string;
  name: string;
}

export default function ProductVariants() {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    list_price: 0,
    cost_price: 0,
    weight: 0,
    stock_quantity: 0,
    is_active: true
  });

  useEffect(() => {
    loadTemplates();
    loadVariants();
  }, []);

  useEffect(() => {
    loadVariants();
  }, [selectedTemplate]);

  const loadTemplates = async () => {
    try {
      const response = await api.get('/odoo/products/templates');
      const data = response.data.data || response.data || [];
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadVariants = async () => {
    try {
      setLoading(true);
      const url = selectedTemplate 
        ? `/odoo/products/variants?template_id=${selectedTemplate}`
        : '/odoo/products/variants';
      const response = await api.get(url);
      const data = response.data.data || response.data || [];
      setVariants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading variants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariant) return;
    try {
      await api.put(`/odoo/products/variants/${editingVariant.id}`, formData);
      setShowForm(false);
      setEditingVariant(null);
      loadVariants();
    } catch (error) {
      console.error('Error saving variant:', error);
      alert('Error saving variant. Please try again.');
    }
  };

  const handleEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({
      sku: variant.sku || '',
      barcode: variant.barcode || '',
      list_price: variant.list_price || 0,
      cost_price: variant.cost_price || 0,
      weight: variant.weight || 0,
      stock_quantity: variant.stock_quantity,
      is_active: variant.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;
    try {
      await api.delete(`/odoo/products/variants/${id}`);
      loadVariants();
    } catch (error) {
      console.error('Error deleting variant:', error);
      alert('Error deleting variant. Please try again.');
    }
  };

  const filteredVariants = variants.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.sku && v.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.barcode && v.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalStock = variants.reduce((sum, v) => sum + v.stock_quantity, 0);
  const totalValue = variants.reduce((sum, v) => sum + (v.stock_quantity * (v.cost_price || 0)), 0);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
          <Layers size={28} className="text-purple-500" />
          Product Variants
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage product variants with SKUs, pricing, and stock levels</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Variants</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{variants.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Active Variants</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {variants.filter(v => v.is_active).length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Stock</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {Number(totalStock ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Stock Value</div>
          <div className="text-2xl font-bold text-orange-600">
            R {Number(totalValue ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b flex gap-3">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search variants by name, SKU, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Templates</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Variant</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Template</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">SKU</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Attributes</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">List Price</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cost</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stock</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredVariants.map((variant) => (
                <tr key={variant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Package size={18} className="text-gray-400" />
                      <div className="font-medium text-gray-900 dark:text-white">{variant.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {variant.template_name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {variant.sku || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {variant.attribute_values?.map((val, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 text-xs rounded-full">
                          {val}
                        </span>
                      )) || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    {variant.list_price 
                      ? `R ${Number(variant.list_price ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                    {variant.cost_price 
                      ? `R ${Number(variant.cost_price ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-medium ${
                      variant.stock_quantity <= 0 ? 'text-red-600' :
                      variant.stock_quantity < 10 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {variant.stock_quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      variant.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {variant.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(variant)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100 mr-2"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(variant.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredVariants.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {searchTerm || selectedTemplate 
                ? 'No variants found matching your criteria' 
                : 'No variants yet. Generate variants from product templates.'}
            </div>
          )}
        </div>
      </div>

      {showForm && editingVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700-xl w-full max-w-lg p-4">
            <h2 className="text-xl font-bold mb-4">Edit Variant</h2>
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Variant Name</div>
              <div className="font-medium">{editingVariant.name}</div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">List Price (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.list_price}
                    onChange={(e) => setFormData({ ...formData, list_price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost Price (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
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
                  onClick={() => { setShowForm(false); setEditingVariant(null); }}
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
