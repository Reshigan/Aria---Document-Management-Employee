import { useState, useEffect } from 'react';
import { Flag, Plus, RefreshCw, AlertCircle, X, Clock, CheckCircle, DollarSign, Target, Play, Trash2 } from 'lucide-react';
import { projectMilestonesApi } from '../../services/newPagesApi';

interface ProjectMilestone {
  id: string;
  milestone_number: string;
  project_name?: string;
  milestone_name: string;
  description?: string;
  due_date: string;
  completed_date?: string;
  deliverables_count: number;
  completed_deliverables: number;
  budget_amount: number;
  actual_amount: number;
  status: string;
}

export default function ProjectMilestones() {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ project_id: '', milestone_name: '', description: '', due_date: '', budget_amount: 0, deliverables: '' });

  useEffect(() => { fetchMilestones(); }, []);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const response = await projectMilestonesApi.getAll();
      setMilestones(response.data.project_milestones || []);
    } catch (err) { setError('Failed to load project milestones'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await projectMilestonesApi.create(formData);
      setShowForm(false);
      setFormData({ project_id: '', milestone_name: '', description: '', due_date: '', budget_amount: 0, deliverables: '' });
      fetchMilestones();
    } catch (err) { setError('Failed to create project milestone'); }
  };

  const handleStart = async (id: string) => {
    try { await projectMilestonesApi.start(id); fetchMilestones(); } catch (err) { setError('Failed to start milestone'); }
  };

  const handleComplete = async (id: string) => {
    try { await projectMilestonesApi.complete(id); fetchMilestones(); } catch (err) { setError('Failed to complete milestone'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await projectMilestonesApi.delete(id); fetchMilestones(); } catch (err) { setError('Failed to delete milestone'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.pending;
  };

  const stats = { total: milestones.length, completed: milestones.filter(m => m.status === 'completed').length, inProgress: milestones.filter(m => m.status === 'in_progress').length, totalBudget: milestones.reduce((sum, m) => sum + m.budget_amount, 0) };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-violet-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div><h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Project Milestones</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Track project deliverables and milestones</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchMilestones} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/30"><Plus className="h-5 w-5" />New Milestone</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-violet-500/30"><Flag className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Milestones</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30"><CheckCircle className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p><p className="text-sm text-gray-500 dark:text-gray-400">Completed</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/30"><Target className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</p><p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30"><DollarSign className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats.totalBudget)}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Budget</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"><div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-6 sticky top-0"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Flag className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Project Milestone</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-6 space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Milestone Name *</label><input type="text" required value={formData.milestone_name} onChange={(e) => setFormData({ ...formData, milestone_name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date *</label><input type="date" required value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500" /></div></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Budget Amount</label><input type="number" value={formData.budget_amount} onChange={(e) => setFormData({ ...formData, budget_amount: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Deliverables (one per line)</label><textarea value={formData.deliverables} onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })} rows={3} placeholder="Enter each deliverable on a new line" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500" /></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/30">Create Milestone</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-violet-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>) : milestones.length === 0 ? (<div className="p-12 text-center"><Flag className="h-8 w-8 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No project milestones</h3><button onClick={() => setShowForm(true)} className="px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium">New Milestone</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Milestone #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Project</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Milestone</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Due Date</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Deliverables</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Budget</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actual</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{milestones.map((m) => (<tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-violet-600 dark:text-violet-400">{m.milestone_number}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{m.project_name || '-'}</td><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{m.milestone_name}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{m.due_date}</td><td className="px-6 py-4 text-center"><span className="px-3 py-1 rounded-lg text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">{m.completed_deliverables}/{m.deliverables_count}</span></td><td className="px-6 py-4 text-right font-semibold text-violet-600 dark:text-violet-400">{formatCurrency(m.budget_amount)}</td><td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{formatCurrency(m.actual_amount)}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(m.status)}`}>{m.status === 'completed' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{m.status.replace('_', ' ')}</span></td><td className="px-6 py-4 text-right space-x-1">{m.status === 'pending' && <button onClick={() => handleStart(m.id)} className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"><Play className="h-4 w-4 inline mr-1" />Start</button>}{m.status === 'in_progress' && <button onClick={() => handleComplete(m.id)} className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"><CheckCircle className="h-4 w-4 inline mr-1" />Complete</button>}<button onClick={() => handleDelete(m.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4 inline mr-1" />Delete</button></td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
