import { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit, Trash2, Calendar, CheckCircle, XCircle, FileText } from 'lucide-react';
import api from '../../lib/api';

interface Deliverable {
  id: string;
  project_id: string;
  project_name?: string;
  milestone_id?: string;
  milestone_name?: string;
  name: string;
  description?: string;
  due_date?: string;
  delivered_date?: string;
  accepted_date?: string;
  rejected_date?: string;
  rejection_reason?: string;
  status: string;
  file_url?: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

interface Milestone {
  id: string;
  name: string;
  project_id: string;
}

export default function Deliverables() {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);
  const [formData, setFormData] = useState({
    project_id: '',
    milestone_id: '',
    name: '',
    description: '',
    due_date: '',
    status: 'pending'
  });

  useEffect(() => {
    loadDeliverables();
    loadProjects();
    loadMilestones();
  }, []);

  useEffect(() => {
    loadDeliverables();
  }, [filterProject, filterStatus]);

  const loadDeliverables = async () => {
    try {
      setLoading(true);
      let url = '/odoo/services/deliverables';
      const params = new URLSearchParams();
      if (filterProject) params.append('project_id', filterProject);
      if (filterStatus) params.append('status', filterStatus);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await api.get(url);
      const data = response.data.data || response.data || [];
      setDeliverables(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading deliverables:', error);
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

  const loadMilestones = async () => {
    try {
      const response = await api.get('/odoo/services/milestones');
      const data = response.data.data || response.data || [];
      setMilestones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading milestones:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        milestone_id: formData.milestone_id || null,
        due_date: formData.due_date || null
      };
      if (editingDeliverable) {
        await api.put(`/odoo/services/deliverables/${editingDeliverable.id}`, payload);
      } else {
        await api.post('/odoo/services/deliverables', payload);
      }
      setShowForm(false);
      setEditingDeliverable(null);
      resetForm();
      loadDeliverables();
    } catch (error) {
      console.error('Error saving deliverable:', error);
      alert('Error saving deliverable. Please try again.');
    }
  };

  const handleEdit = (deliverable: Deliverable) => {
    setEditingDeliverable(deliverable);
    setFormData({
      project_id: deliverable.project_id,
      milestone_id: deliverable.milestone_id || '',
      name: deliverable.name,
      description: deliverable.description || '',
      due_date: deliverable.due_date || '',
      status: deliverable.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deliverable?')) return;
    try {
      await api.delete(`/odoo/services/deliverables/${id}`);
      loadDeliverables();
    } catch (error) {
      console.error('Error deleting deliverable:', error);
      alert('Error deleting deliverable. Please try again.');
    }
  };

  const handleAccept = async (deliverable: Deliverable) => {
    try {
      await api.put(`/odoo/services/deliverables/${deliverable.id}`, {
        ...deliverable,
        status: 'accepted',
        accepted_date: new Date().toISOString().split('T')[0]
      });
      loadDeliverables();
    } catch (error) {
      console.error('Error accepting deliverable:', error);
    }
  };

  const handleReject = async (deliverable: Deliverable) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    try {
      await api.put(`/odoo/services/deliverables/${deliverable.id}`, {
        ...deliverable,
        status: 'rejected',
        rejected_date: new Date().toISOString().split('T')[0],
        rejection_reason: reason
      });
      loadDeliverables();
    } catch (error) {
      console.error('Error rejecting deliverable:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      project_id: filterProject || '',
      milestone_id: '',
      name: '',
      description: '',
      due_date: '',
      status: 'pending'
    });
  };

  const filteredDeliverables = deliverables.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.project_name && d.project_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredMilestones = formData.project_id 
    ? milestones.filter(m => m.project_id === formData.project_id)
    : milestones;

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    delivered: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Package size={28} className="text-indigo-500" />
          Project Deliverables
        </h1>
        <p className="text-gray-600 mt-1">Track and manage project deliverables with customer acceptance</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Deliverables</div>
          <div className="text-2xl font-bold text-indigo-600">{deliverables.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-gray-600">
            {deliverables.filter(d => d.status === 'pending' || d.status === 'in_progress').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Accepted</div>
          <div className="text-2xl font-bold text-green-600">
            {deliverables.filter(d => d.status === 'accepted').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Rejected</div>
          <div className="text-2xl font-bold text-red-600">
            {deliverables.filter(d => d.status === 'rejected').length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search deliverables..."
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
            <option value="delivered">Delivered</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={() => { setEditingDeliverable(null); resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700"
          >
            <Plus size={16} />
            Add Deliverable
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deliverable</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Milestone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDeliverables.map((deliverable) => (
                <tr key={deliverable.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">{deliverable.name}</div>
                        {deliverable.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{deliverable.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {deliverable.project_name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {deliverable.milestone_name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {deliverable.due_date ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={14} className="text-gray-400" />
                        {new Date(deliverable.due_date).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[deliverable.status]}`}>
                      {deliverable.status.replace('_', ' ')}
                    </span>
                    {deliverable.rejection_reason && (
                      <div className="text-xs text-red-500 mt-1 truncate max-w-[150px]" title={deliverable.rejection_reason}>
                        {deliverable.rejection_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {deliverable.status === 'delivered' && (
                      <>
                        <button
                          onClick={() => handleAccept(deliverable)}
                          className="text-green-600 hover:text-green-900 mr-2"
                          title="Accept"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => handleReject(deliverable)}
                          className="text-red-600 hover:text-red-900 mr-2"
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleEdit(deliverable)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(deliverable.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredDeliverables.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {searchTerm || filterProject || filterStatus 
                ? 'No deliverables found matching your criteria' 
                : 'No deliverables yet. Add your first one!'}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingDeliverable ? 'Edit Deliverable' : 'Add Deliverable'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                <select
                  required
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value, milestone_id: '' })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Milestone</label>
                <select
                  value={formData.milestone_id}
                  onChange={(e) => setFormData({ ...formData, milestone_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No Milestone</option>
                  {filteredMilestones.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deliverable Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Design Mockups, API Documentation"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {editingDeliverable && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="delivered">Delivered</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
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
                  onClick={() => { setShowForm(false); setEditingDeliverable(null); resetForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingDeliverable ? 'Update' : 'Add'} Deliverable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
