import { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit, Trash2, UserCheck } from 'lucide-react';
import api from '../../lib/api';

interface CustomerGroup {
  id: string;
  name: string;
  code?: string;
  description?: string;
  discount_percentage: number;
  member_count?: number;
  is_active: boolean;
  created_at: string;
}

export default function CustomerGroups() {
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    discount_percentage: 0,
    is_active: true
  });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await api.get('/odoo/pricing/customer-groups');
      const data = response.data.data || response.data || [];
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading customer groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await api.put(`/odoo/pricing/customer-groups/${editingGroup.id}`, formData);
      } else {
        await api.post('/odoo/pricing/customer-groups', formData);
      }
      setShowForm(false);
      setEditingGroup(null);
      resetForm();
      loadGroups();
    } catch (error) {
      console.error('Error saving customer group:', error);
      alert('Error saving customer group. Please try again.');
    }
  };

  const handleEdit = (group: CustomerGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      code: group.code || '',
      description: group.description || '',
      discount_percentage: group.discount_percentage,
      is_active: group.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer group?')) return;
    try {
      await api.delete(`/odoo/pricing/customer-groups/${id}`);
      loadGroups();
    } catch (error) {
      console.error('Error deleting customer group:', error);
      alert('Error deleting customer group. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      discount_percentage: 0,
      is_active: true
    });
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.code && g.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalMembers = groups.reduce((sum, g) => sum + (g.member_count || 0), 0);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
          <Users size={28} className="text-green-500" />
          Customer Groups
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Segment customers for targeted pricing and discounts</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-300">Total Groups</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{groups.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-300">Total Members</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalMembers}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-300">Avg Discount</div>
          <div className="text-2xl font-bold text-orange-600">
            {groups.length > 0 
              ? (groups.reduce((sum, g) => sum + (g.discount_percentage || 0), 0) / groups.length).toFixed(1)
              : 0}%
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b flex gap-3">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Search customer groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={() => { setEditingGroup(null); resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <Plus size={16} />
            Add Group
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Group</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Code</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Discount %</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Members</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredGroups.map((group) => (
                <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <UserCheck size={18} className="text-green-500" />
                      <span className="font-medium text-gray-900 dark:text-white">{group.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{group.code || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                    {group.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-medium ${
                      group.discount_percentage > 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {group.discount_percentage}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-300">
                    {group.member_count || 0}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      group.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {group.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(group)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100 mr-2"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredGroups.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-300">
              {searchTerm ? 'No groups found matching your search' : 'No customer groups yet. Create your first one!'}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700-xl w-full max-w-md p-4">
            <h2 className="text-xl font-bold mb-4">
              {editingGroup ? 'Edit Customer Group' : 'Add Customer Group'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., VIP Customers, Wholesale"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., VIP, WHOLESALE"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Discount %</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-green-600 dark:text-green-400 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label className="ml-2 text-sm text-gray-900 dark:text-white">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingGroup(null); resetForm(); }}
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
