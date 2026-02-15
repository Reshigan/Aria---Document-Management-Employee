import { useState, useEffect } from 'react';
import { Flag, Plus, Search, Edit, Trash2, Calendar, DollarSign, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

interface Milestone {
  id: string;
  project_id: string;
  project_name?: string;
  name: string;
  description?: string;
  due_date?: string;
  completed_date?: string;
  amount?: number;
  percentage?: number;
  status: string;
  sequence: number;
  deliverables_count?: number;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

export default function Milestones() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [formData, setFormData] = useState({
    project_id: '',
    name: '',
    description: '',
    due_date: '',
    amount: 0,
    percentage: 0,
    status: 'pending',
    sequence: 1
  });

  useEffect(() => {
    loadMilestones();
    loadProjects();
  }, []);

  useEffect(() => {
    loadMilestones();
  }, [filterProject, filterStatus]);

  const loadMilestones = async () => {
    try {
      setLoading(true);
      let url = '/odoo/services/milestones';
      const params = new URLSearchParams();
      if (filterProject) params.append('project_id', filterProject);
      if (filterStatus) params.append('status', filterStatus);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await api.get(url);
      const data = response.data.data || response.data || [];
      setMilestones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await api.get('/odoo/services/projects');
      const data = response.data.data || response.data || [];
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        due_date: formData.due_date || null
      };
      if (editingMilestone) {
        await api.put(`/odoo/services/milestones/${editingMilestone.id}`, payload);
      } else {
        await api.post('/odoo/services/milestones', payload);
      }
      setShowForm(false);
      setEditingMilestone(null);
      resetForm();
      loadMilestones();
    } catch (error) {
      console.error('Error saving milestone:', error);
      alert('Error saving milestone. Please try again.');
    }
  };

  const handleEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setFormData({
      project_id: milestone.project_id,
      name: milestone.name,
      description: milestone.description || '',
      due_date: milestone.due_date || '',
      amount: milestone.amount || 0,
      percentage: milestone.percentage || 0,
      status: milestone.status,
      sequence: milestone.sequence
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;
    try {
      await api.delete(`/odoo/services/milestones/${id}`);
      loadMilestones();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      alert('Error deleting milestone. Please try again.');
    }
  };

  const handleMarkComplete = async (milestone: Milestone) => {
    try {
      await api.put(`/odoo/services/milestones/${milestone.id}`, {
        ...milestone,
        status: 'completed',
        completed_date: new Date().toISOString().split('T')[0]
      });
      loadMilestones();
    } catch (error) {
      console.error('Error completing milestone:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      project_id: filterProject || '',
      name: '',
      description: '',
      due_date: '',
      amount: 0,
      percentage: 0,
      status: 'pending',
      sequence: milestones.length + 1
    });
  };

  const filteredMilestones = milestones.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.project_name && m.project_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    invoiced: 'bg-purple-100 text-purple-800'
  };

  const totalAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const completedAmount = milestones.filter(m => m.status === 'completed' || m.status === 'invoiced')
    .reduce((sum, m) => sum + (m.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
          <Flag size={28} className="text-indigo-500" />
          Project Milestones
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Track project milestones for billing and delivery</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Milestones</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{milestones.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {milestones.filter(m => m.status === 'completed' || m.status === 'invoiced').length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Value</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            R {totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Completed Value</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            R {completedAmount.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search milestones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="invoiced">Invoiced</option>
          </select>
          <button
            onClick={() => { setEditingMilestone(null); resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700"
          >
            <Plus size={16} />
            Add Milestone
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Milestone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Due Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMilestones.map((milestone) => (
                <tr key={milestone.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{milestone.sequence}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{milestone.name}</div>
                    {milestone.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{milestone.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {milestone.project_name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {milestone.due_date ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar size={14} className="text-gray-400" />
                        {new Date(milestone.due_date).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {milestone.amount ? (
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign size={14} className="text-gray-400" />
                        <span className="text-sm font-medium">
                          R {Number(milestone.amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                    ) : milestone.percentage ? (
                      <span className="text-sm font-medium">{milestone.percentage}%</span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[milestone.status]}`}>
                      {milestone.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {milestone.status === 'pending' || milestone.status === 'in_progress' ? (
                      <button
                        onClick={() => handleMarkComplete(milestone)}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 mr-2"
                        title="Mark Complete"
                      >
                        <CheckCircle size={16} />
                      </button>
                    ) : null}
                    <button
                      onClick={() => handleEdit(milestone)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100 mr-2"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(milestone.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMilestones.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {searchTerm || filterProject || filterStatus 
                ? 'No milestones found matching your criteria' 
                : 'No milestones yet. Add your first one!'}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project *</label>
                <select
                  required
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Milestone Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Phase 1 Completion"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sequence</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.sequence}
                    onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Or Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.percentage}
                    onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              {editingMilestone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="invoiced">Invoiced</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingMilestone(null); resetForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingMilestone ? 'Update' : 'Add'} Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
