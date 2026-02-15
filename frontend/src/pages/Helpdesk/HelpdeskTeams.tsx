import { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit, Trash2, Mail, Clock } from 'lucide-react';
import api from '../../lib/api';

interface HelpdeskTeam {
  id: string;
  name: string;
  description?: string;
  email_alias?: string;
  assignment_method: string;
  auto_close_days?: number;
  member_count?: number;
  open_ticket_count?: number;
  is_active: boolean;
  created_at: string;
}

export default function HelpdeskTeams() {
  const [teams, setTeams] = useState<HelpdeskTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<HelpdeskTeam | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email_alias: '',
    assignment_method: 'round_robin',
    auto_close_days: 7,
    is_active: true
  });

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await api.get('/odoo/helpdesk/teams');
      const data = response.data.data || response.data || [];
      setTeams(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTeam) {
        await api.put(`/odoo/helpdesk/teams/${editingTeam.id}`, formData);
      } else {
        await api.post('/odoo/helpdesk/teams', formData);
      }
      setShowForm(false);
      setEditingTeam(null);
      resetForm();
      loadTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Error saving team. Please try again.');
    }
  };

  const handleEdit = (team: HelpdeskTeam) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      email_alias: team.email_alias || '',
      assignment_method: team.assignment_method,
      auto_close_days: team.auto_close_days || 7,
      is_active: team.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    try {
      await api.delete(`/odoo/helpdesk/teams/${id}`);
      loadTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Error deleting team. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      email_alias: '',
      assignment_method: 'round_robin',
      auto_close_days: 7,
      is_active: true
    });
  };

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.email_alias && t.email_alias.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const assignmentLabels: Record<string, string> = {
    manual: 'Manual Assignment',
    round_robin: 'Round Robin',
    load_balanced: 'Load Balanced',
    random: 'Random'
  };

  const totalOpenTickets = teams.reduce((sum, t) => sum + (t.open_ticket_count || 0), 0);
  const totalMembers = teams.reduce((sum, t) => sum + (t.member_count || 0), 0);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
          <Users size={28} className="text-blue-500" />
          Helpdesk Teams
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Organize support staff into teams with auto-assignment rules</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Teams</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{teams.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Active Teams</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {teams.filter(t => t.is_active).length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Members</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalMembers}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Open Tickets</div>
          <div className="text-2xl font-bold text-orange-600">{totalOpenTickets}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b flex gap-3">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
          <button
            onClick={() => { setEditingTeam(null); resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus size={16} />
            Add Team
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Team</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email Alias</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Assignment</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Members</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Open Tickets</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Auto-Close</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTeams.map((team) => (
                <tr key={team.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{team.name}</div>
                    {team.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{team.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {team.email_alias ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Mail size={14} className="text-gray-400" />
                        {team.email_alias}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {assignmentLabels[team.assignment_method] || team.assignment_method}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 text-xs rounded-full">
                      {team.member_count || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      (team.open_ticket_count || 0) > 10 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {team.open_ticket_count || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {team.auto_close_days ? (
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <Clock size={14} className="text-gray-400" />
                        {team.auto_close_days} days
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      team.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {team.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(team)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100 mr-2"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(team.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTeams.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No teams found matching your search' : 'No teams yet. Create your first one!'}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700-xl w-full max-w-md p-4">
            <h2 className="text-xl font-bold mb-4">
              {editingTeam ? 'Edit Team' : 'Add Team'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Technical Support, Billing"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Alias</label>
                <input
                  type="email"
                  value={formData.email_alias}
                  onChange={(e) => setFormData({ ...formData, email_alias: e.target.value })}
                  placeholder="support@company.com"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignment Method</label>
                <select
                  value={formData.assignment_method}
                  onChange={(e) => setFormData({ ...formData, assignment_method: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="manual">Manual Assignment</option>
                  <option value="round_robin">Round Robin</option>
                  <option value="load_balanced">Load Balanced</option>
                  <option value="random">Random</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Auto-Close After (days)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.auto_close_days}
                  onChange={(e) => setFormData({ ...formData, auto_close_days: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Set to 0 to disable auto-close</p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded"
                />
                <label className="ml-2 text-sm text-gray-900 dark:text-white">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingTeam(null); resetForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700"
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
