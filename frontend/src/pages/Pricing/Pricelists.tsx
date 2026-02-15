import { useState, useEffect } from 'react';
import { Tag, Plus, Search, Edit, Trash2, DollarSign, Calendar, Users } from 'lucide-react';
import api from '../../lib/api';

interface Pricelist {
  id: string;
  name: string;
  code?: string;
  currency: string;
  is_default: boolean;
  start_date?: string;
  end_date?: string;
  customer_group_id?: string;
  customer_group_name?: string;
  rule_count?: number;
  is_active: boolean;
  created_at: string;
}

interface CustomerGroup {
  id: string;
  name: string;
}

export default function Pricelists() {
  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPricelist, setEditingPricelist] = useState<Pricelist | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    currency: 'ZAR',
    is_default: false,
    start_date: '',
    end_date: '',
    customer_group_id: '',
    is_active: true
  });

  useEffect(() => {
    loadPricelists();
    loadCustomerGroups();
  }, []);

  const loadPricelists = async () => {
    try {
      setLoading(true);
      const response = await api.get('/odoo/pricing/pricelists');
      const data = response.data.data || response.data || [];
      setPricelists(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading pricelists:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerGroups = async () => {
    try {
      const response = await api.get('/odoo/pricing/customer-groups');
      const data = response.data.data || response.data || [];
      setCustomerGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading customer groups:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        customer_group_id: formData.customer_group_id || null
      };
      if (editingPricelist) {
        await api.put(`/odoo/pricing/pricelists/${editingPricelist.id}`, payload);
      } else {
        await api.post('/odoo/pricing/pricelists', payload);
      }
      setShowForm(false);
      setEditingPricelist(null);
      resetForm();
      loadPricelists();
    } catch (error) {
      console.error('Error saving pricelist:', error);
      alert('Error saving pricelist. Please try again.');
    }
  };

  const handleEdit = (pricelist: Pricelist) => {
    setEditingPricelist(pricelist);
    setFormData({
      name: pricelist.name,
      code: pricelist.code || '',
      currency: pricelist.currency,
      is_default: pricelist.is_default,
      start_date: pricelist.start_date || '',
      end_date: pricelist.end_date || '',
      customer_group_id: pricelist.customer_group_id || '',
      is_active: pricelist.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricelist?')) return;
    try {
      await api.delete(`/odoo/pricing/pricelists/${id}`);
      loadPricelists();
    } catch (error) {
      console.error('Error deleting pricelist:', error);
      alert('Error deleting pricelist. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      currency: 'ZAR',
      is_default: false,
      start_date: '',
      end_date: '',
      customer_group_id: '',
      is_active: true
    });
  };

  const filteredPricelists = pricelists.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isActive = (pricelist: Pricelist) => {
    if (!pricelist.is_active) return false;
    const now = new Date();
    if (pricelist.start_date && new Date(pricelist.start_date) > now) return false;
    if (pricelist.end_date && new Date(pricelist.end_date) < now) return false;
    return true;
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
          <Tag size={28} className="text-green-500" />
          Pricelists
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage pricing strategies with date ranges and customer segments</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Pricelists</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{pricelists.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Active Now</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {pricelists.filter(isActive).length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Default Pricelist</div>
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400 truncate">
            {pricelists.find(p => p.is_default)?.name || 'None'}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Rules</div>
          <div className="text-2xl font-bold text-orange-600">
            {pricelists.reduce((sum, p) => sum + (p.rule_count || 0), 0)}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b flex gap-3">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search pricelists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={() => { setEditingPricelist(null); resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <Plus size={16} />
            Add Pricelist
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pricelist</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Currency</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer Group</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Valid Period</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rules</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPricelists.map((pricelist) => (
                <tr key={pricelist.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <DollarSign size={18} className="text-green-500" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{pricelist.name}</div>
                        {pricelist.code && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{pricelist.code}</div>
                        )}
                      </div>
                      {pricelist.is_default && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 text-xs rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{pricelist.currency}</td>
                  <td className="px-6 py-4">
                    {pricelist.customer_group_name ? (
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{pricelist.customer_group_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">All Customers</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {pricelist.start_date || pricelist.end_date ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar size={14} className="text-gray-400" />
                        {pricelist.start_date ? new Date(pricelist.start_date).toLocaleDateString() : 'Start'} 
                        {' - '}
                        {pricelist.end_date ? new Date(pricelist.end_date).toLocaleDateString() : 'No End'}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Always Valid</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs rounded-full">
                      {pricelist.rule_count || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      isActive(pricelist) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {isActive(pricelist) ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(pricelist)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100 mr-2"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(pricelist.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPricelists.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No pricelists found matching your search' : 'No pricelists yet. Create your first one!'}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700-xl w-full max-w-lg p-4">
            <h2 className="text-xl font-bold mb-4">
              {editingPricelist ? 'Edit Pricelist' : 'Add Pricelist'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Retail Prices, Wholesale Prices"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="ZAR">ZAR - South African Rand</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Group</label>
                  <select
                    value={formData.customer_group_id}
                    onChange={(e) => setFormData({ ...formData, customer_group_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">All Customers</option>
                    {customerGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="h-4 w-4 text-green-600 dark:text-green-400 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">Default Pricelist</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-green-600 dark:text-green-400 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">Active</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingPricelist(null); resetForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
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
