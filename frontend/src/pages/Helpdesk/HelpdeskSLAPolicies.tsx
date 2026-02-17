import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Clock, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';

interface SLAPolicy {
  id: string;
  team_id: string;
  team_name?: string;
  name: string;
  priority?: string;
  ticket_type?: string;
  time_to_first_response_hours?: number;
  time_to_resolve_hours?: number;
  target_stage_id?: string;
  is_active: boolean;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
}

export default function HelpdeskSLAPolicies() {
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SLAPolicy | null>(null);
  const [form, setForm] = useState({
    team_id: '',
    name: '',
    priority: '',
    ticket_type: '',
    time_to_first_response_hours: '',
    time_to_resolve_hours: '',
    is_active: true,
  });

  useEffect(() => {
    loadPolicies();
    loadTeams();
  }, []);

  const loadPolicies = async () => {
    try {
      const response = await api.get('/odoo/helpdesk/sla-policies');
      const d = response.data.data || response.data;
      setPolicies(Array.isArray(d) ? d : d.policies || []);
    } catch {
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await api.get('/odoo/helpdesk/teams');
      const d = response.data.data || response.data;
      const list = Array.isArray(d) ? d : d.teams || [];
      setTeams(list);
    } catch {
      setTeams([]);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        time_to_first_response_hours: form.time_to_first_response_hours ? Number(form.time_to_first_response_hours) : null,
        time_to_resolve_hours: form.time_to_resolve_hours ? Number(form.time_to_resolve_hours) : null,
        priority: form.priority || null,
        ticket_type: form.ticket_type || null,
      };
      if (editingPolicy) {
        await api.put(`/odoo/helpdesk/sla-policies/${editingPolicy.id}`, payload);
      } else {
        await api.post('/odoo/helpdesk/sla-policies', payload);
      }
      setShowForm(false);
      setEditingPolicy(null);
      resetForm();
      loadPolicies();
    } catch {
      alert('Failed to save SLA policy');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this SLA policy?')) return;
    try {
      await api.delete(`/odoo/helpdesk/sla-policies/${id}`);
      loadPolicies();
    } catch {
      alert('Failed to delete SLA policy');
    }
  };

  const handleEdit = (policy: SLAPolicy) => {
    setEditingPolicy(policy);
    setForm({
      team_id: policy.team_id,
      name: policy.name,
      priority: policy.priority || '',
      ticket_type: policy.ticket_type || '',
      time_to_first_response_hours: policy.time_to_first_response_hours?.toString() || '',
      time_to_resolve_hours: policy.time_to_resolve_hours?.toString() || '',
      is_active: policy.is_active,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ team_id: '', name: '', priority: '', ticket_type: '', time_to_first_response_hours: '', time_to_resolve_hours: '', is_active: true });
  };

  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || teamId;

  const priorityBadge = (p?: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return p ? <span className={`px-2 py-0.5 text-xs rounded-full ${colors[p] || 'bg-gray-100 text-gray-800'}`}>{p}</span> : <span className="text-xs text-gray-400">Any</span>;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-300">Loading SLA policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
            <Shield className="h-7 w-7 text-white" />
          </div>
          SLA Policies
        </h1>
        <button
          onClick={() => { setShowForm(true); setEditingPolicy(null); resetForm(); }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus size={16} /> New Policy
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-indigo-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{policies.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Total Policies</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{policies.filter(p => p.is_active).length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Active Policies</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{new Set(policies.map(p => p.team_id)).size}</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Teams Covered</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Policy Name</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Team</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Priority</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">First Response</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Resolution</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Status</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {policies.map(policy => (
              <tr key={policy.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{policy.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{policy.team_name || getTeamName(policy.team_id)}</td>
                <td className="px-4 py-3 text-center">{priorityBadge(policy.priority)}</td>
                <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-300">
                  {policy.time_to_first_response_hours ? `${policy.time_to_first_response_hours}h` : '-'}
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-300">
                  {policy.time_to_resolve_hours ? `${policy.time_to_resolve_hours}h` : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${policy.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {policy.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleEdit(policy)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(policy.id)} className="p-1 text-gray-400 hover:text-red-600 ml-1"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {policies.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No SLA policies yet. Create your first policy!</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{editingPolicy ? 'Edit SLA Policy' : 'New SLA Policy'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Policy Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="e.g. Urgent Priority SLA" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team</label>
                <select value={form.team_id} onChange={e => setForm({ ...form, team_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">Select Team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="">Any Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ticket Type</label>
                  <input type="text" value={form.ticket_type} onChange={e => setForm({ ...form, ticket_type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Optional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Response (hours)</label>
                  <input type="number" value={form.time_to_first_response_hours} onChange={e => setForm({ ...form, time_to_first_response_hours: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="e.g. 4" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution (hours)</label>
                  <input type="number" value={form.time_to_resolve_hours} onChange={e => setForm({ ...form, time_to_resolve_hours: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="e.g. 24" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} id="active" />
                <label htmlFor="active" className="text-sm text-gray-700 dark:text-gray-300">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditingPolicy(null); }} className="px-4 py-2 text-sm border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Policy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
