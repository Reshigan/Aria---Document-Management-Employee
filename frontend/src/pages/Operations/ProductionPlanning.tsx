import { useState, useEffect } from 'react';
import { Calendar, Plus, RefreshCw, AlertCircle, X, Factory, Clock, CheckCircle, Play, BarChart3 } from 'lucide-react';

interface ProductionPlan {
  id: string;
  plan_number: string;
  product_name: string;
  planned_quantity: number;
  start_date: string;
  end_date: string;
  capacity_utilization: number;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed';
}

export default function ProductionPlanning() {
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ product_id: '', planned_quantity: 0, start_date: '', end_date: '' });

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setPlans([
        { id: '1', plan_number: 'PLN-2026-001', product_name: 'Widget A', planned_quantity: 1000, start_date: '2026-01-20', end_date: '2026-01-30', capacity_utilization: 85, status: 'scheduled' },
        { id: '2', plan_number: 'PLN-2026-002', product_name: 'Component X', planned_quantity: 500, start_date: '2026-01-15', end_date: '2026-01-25', capacity_utilization: 60, status: 'in_progress' },
        { id: '3', plan_number: 'PLN-2026-003', product_name: 'Assembly Y', planned_quantity: 200, start_date: '2026-02-01', end_date: '2026-02-10', capacity_utilization: 40, status: 'draft' },
      ]);
    } catch (err) { setError('Failed to load production plans'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      alert('Production plan created successfully');
      setShowForm(false);
      setFormData({ product_id: '', planned_quantity: 0, start_date: '', end_date: '' });
      await fetchPlans();
    } catch (err) { setError('Failed to create production plan'); }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      scheduled: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.draft;
  };

  const getCapacityColor = (utilization: number) => {
    if (utilization >= 80) return 'from-red-500 to-rose-500';
    if (utilization >= 60) return 'from-amber-500 to-orange-500';
    return 'from-green-500 to-emerald-500';
  };

  const stats = {
    total: plans.length,
    scheduled: plans.filter(p => p.status === 'scheduled').length,
    inProgress: plans.filter(p => p.status === 'in_progress').length,
    avgCapacity: plans.length > 0 ? Math.round(plans.reduce((sum, p) => sum + p.capacity_utilization, 0) / plans.length) : 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Production Planning</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Plan and schedule manufacturing operations</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchPlans} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30"><Plus className="h-5 w-5" />New Plan</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30"><Calendar className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Plans</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30"><Clock className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.scheduled}</p><p className="text-sm text-gray-500 dark:text-gray-400">Scheduled</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30"><Play className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.inProgress}</p><p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl shadow-lg shadow-purple-500/30"><BarChart3 className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgCapacity}%</p><p className="text-sm text-gray-500 dark:text-gray-400">Avg Capacity</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Calendar className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Production Plan</h2><p className="text-white/80 text-sm">Schedule manufacturing operations</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Planned Quantity *</label><input type="number" required min="1" value={formData.planned_quantity} onChange={(e) => setFormData({ ...formData, planned_quantity: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date *</label><input type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date *</label><input type="date" required value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading production plans...</p></div>
          ) : plans.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Calendar className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No production plans</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Create your first production plan</p><button onClick={() => setShowForm(true)} className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all">New Plan</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Start</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">End</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capacity</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-blue-600 dark:text-blue-400">{plan.plan_number}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{plan.product_name}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{plan.planned_quantity.toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{plan.start_date}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{plan.end_date}</td>
                      <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2"><div className={`h-2 rounded-full bg-gradient-to-r ${getCapacityColor(plan.capacity_utilization)}`} style={{ width: `${plan.capacity_utilization}%` }}></div></div><span className="text-sm text-gray-600 dark:text-gray-400">{plan.capacity_utilization}%</span></div></td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(plan.status)}`}>{plan.status === 'completed' ? <CheckCircle className="h-3.5 w-3.5" /> : plan.status === 'in_progress' ? <Play className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{plan.status.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
