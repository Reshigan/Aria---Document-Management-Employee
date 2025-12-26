import { useState, useEffect } from 'react';
import { Calculator, Plus, Search, Edit, Trash2, Percent, DollarSign, Package } from 'lucide-react';
import api from '../../lib/api';

interface PricingRule {
  id: string;
  pricelist_id: string;
  pricelist_name?: string;
  name: string;
  applied_on: string;
  product_id?: string;
  product_name?: string;
  category_id?: string;
  category_name?: string;
  compute_price: string;
  fixed_price?: number;
  percent_price?: number;
  min_quantity: number;
  date_start?: string;
  date_end?: string;
  sequence: number;
  is_active: boolean;
}

interface Pricelist {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  path?: string;
}

export default function PricingRules() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPricelist, setSelectedPricelist] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [formData, setFormData] = useState({
    pricelist_id: '',
    name: '',
    applied_on: 'all_products',
    product_id: '',
    category_id: '',
    compute_price: 'fixed',
    fixed_price: 0,
    percent_price: 0,
    min_quantity: 1,
    date_start: '',
    date_end: '',
    sequence: 10,
    is_active: true
  });

  useEffect(() => {
    loadPricelists();
    loadCategories();
    loadRules();
  }, []);

  useEffect(() => {
    loadRules();
  }, [selectedPricelist]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const url = selectedPricelist 
        ? `/odoo/pricing/rules?pricelist_id=${selectedPricelist}`
        : '/odoo/pricing/rules';
      const response = await api.get(url);
      const data = response.data.data || response.data || [];
      setRules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPricelists = async () => {
    try {
      const response = await api.get('/odoo/pricing/pricelists');
      const data = response.data.data || response.data || [];
      setPricelists(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading pricelists:', error);
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
      const payload = {
        ...formData,
        product_id: formData.product_id || null,
        category_id: formData.category_id || null,
        date_start: formData.date_start || null,
        date_end: formData.date_end || null
      };
      if (editingRule) {
        await api.put(`/odoo/pricing/rules/${editingRule.id}`, payload);
      } else {
        await api.post('/odoo/pricing/rules', payload);
      }
      setShowForm(false);
      setEditingRule(null);
      resetForm();
      loadRules();
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('Error saving rule. Please try again.');
    }
  };

  const handleEdit = (rule: PricingRule) => {
    setEditingRule(rule);
    setFormData({
      pricelist_id: rule.pricelist_id,
      name: rule.name,
      applied_on: rule.applied_on,
      product_id: rule.product_id || '',
      category_id: rule.category_id || '',
      compute_price: rule.compute_price,
      fixed_price: rule.fixed_price || 0,
      percent_price: rule.percent_price || 0,
      min_quantity: rule.min_quantity,
      date_start: rule.date_start || '',
      date_end: rule.date_end || '',
      sequence: rule.sequence,
      is_active: rule.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await api.delete(`/odoo/pricing/rules/${id}`);
      loadRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Error deleting rule. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      pricelist_id: selectedPricelist || '',
      name: '',
      applied_on: 'all_products',
      product_id: '',
      category_id: '',
      compute_price: 'fixed',
      fixed_price: 0,
      percent_price: 0,
      min_quantity: 1,
      date_start: '',
      date_end: '',
      sequence: 10,
      is_active: true
    });
  };

  const filteredRules = rules.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.pricelist_name && r.pricelist_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const appliedOnLabels: Record<string, string> = {
    all_products: 'All Products',
    product_category: 'Product Category',
    product: 'Specific Product'
  };

  const computePriceLabels: Record<string, string> = {
    fixed: 'Fixed Price',
    percentage: 'Percentage Discount',
    formula: 'Formula'
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Calculator size={28} className="text-green-500" />
          Pricing Rules
        </h1>
        <p className="text-gray-600 mt-1">Define pricing rules with conditions, discounts, and formulas</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Rules</div>
          <div className="text-2xl font-bold text-green-600">{rules.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Fixed Price Rules</div>
          <div className="text-2xl font-bold text-blue-600">
            {rules.filter(r => r.compute_price === 'fixed').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Discount Rules</div>
          <div className="text-2xl font-bold text-orange-600">
            {rules.filter(r => r.compute_price === 'percentage').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Active Rules</div>
          <div className="text-2xl font-bold text-purple-600">
            {rules.filter(r => r.is_active).length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search rules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <select
            value={selectedPricelist}
            onChange={(e) => setSelectedPricelist(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Pricelists</option>
            {pricelists.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditingRule(null); resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <Plus size={16} />
            Add Rule
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rule</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pricelist</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied On</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pricing</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Min Qty</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sequence</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{rule.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {rule.pricelist_name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-900">
                          {appliedOnLabels[rule.applied_on] || rule.applied_on}
                        </div>
                        {rule.category_name && (
                          <div className="text-xs text-gray-500">{rule.category_name}</div>
                        )}
                        {rule.product_name && (
                          <div className="text-xs text-gray-500">{rule.product_name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {rule.compute_price === 'fixed' ? (
                        <>
                          <DollarSign size={14} className="text-green-500" />
                          <span className="text-sm font-medium">
                            R {(rule.fixed_price || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </span>
                        </>
                      ) : rule.compute_price === 'percentage' ? (
                        <>
                          <Percent size={14} className="text-orange-500" />
                          <span className="text-sm font-medium text-orange-600">
                            {rule.percent_price}% off
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-600">Formula</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600">
                    {rule.min_quantity}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">
                    {rule.sequence}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRules.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {searchTerm || selectedPricelist 
                ? 'No rules found matching your criteria' 
                : 'No pricing rules yet. Create your first one!'}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingRule ? 'Edit Pricing Rule' : 'Add Pricing Rule'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., 10% off Electronics, Bulk Discount"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pricelist *</label>
                  <select
                    required
                    value={formData.pricelist_id}
                    onChange={(e) => setFormData({ ...formData, pricelist_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select Pricelist</option>
                    {pricelists.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Applied On</label>
                  <select
                    value={formData.applied_on}
                    onChange={(e) => setFormData({ ...formData, applied_on: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all_products">All Products</option>
                    <option value="product_category">Product Category</option>
                    <option value="product">Specific Product</option>
                  </select>
                </div>
                {formData.applied_on === 'product_category' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.path || c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compute Price</label>
                  <select
                    value={formData.compute_price}
                    onChange={(e) => setFormData({ ...formData, compute_price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="percentage">Percentage Discount</option>
                    <option value="formula">Formula</option>
                  </select>
                </div>
                {formData.compute_price === 'fixed' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Price (R)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.fixed_price}
                      onChange={(e) => setFormData({ ...formData, fixed_price: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
                {formData.compute_price === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.percent_price}
                      onChange={(e) => setFormData({ ...formData, percent_price: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.min_quantity}
                    onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sequence</label>
                  <input
                    type="number"
                    value={formData.sequence}
                    onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.date_start}
                    onChange={(e) => setFormData({ ...formData, date_start: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.date_end}
                    onChange={(e) => setFormData({ ...formData, date_end: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-900">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingRule(null); resetForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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
