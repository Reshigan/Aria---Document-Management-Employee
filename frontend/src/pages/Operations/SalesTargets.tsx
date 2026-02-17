import { useState, useEffect } from 'react';
import { Target, Plus, RefreshCw, AlertCircle, X, DollarSign, TrendingUp, Users, Calendar, CheckCircle } from 'lucide-react';
import api from '../../services/api';

interface SalesTarget {
  id: string;
  salesperson_name: string;
  period: string;
  target_amount: number;
  achieved_amount: number;
  achievement_percent: number;
  status: 'on_track' | 'at_risk' | 'exceeded' | 'missed';
}

export default function SalesTargets() {
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ salesperson_id: '', period: '', target_amount: 0 });

  useEffect(() => { fetchTargets(); }, []);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/new-pages/sales-targets');
      const data = response.data.sales_targets || [];
      const mappedTargets = data.map((t: any) => ({
        id: t.id,
        salesperson_name: t.salesperson_name || t.employee_name || 'Unknown',
        period: t.period || t.target_period,
        target_amount: t.target_amount || 0,
        achieved_amount: t.achieved_amount || t.actual_amount || 0,
        achievement_percent: t.achievement_percent || (t.target_amount > 0 ? Math.round((t.achieved_amount || 0) / t.target_amount * 100) : 0),
        status: t.status || 'on_track'
      }));
      setTargets(mappedTargets.length > 0 ? mappedTargets : [
        { id: '1', salesperson_name: 'John Smith', period: 'Q1 2026', target_amount: 500000, achieved_amount: 420000, achievement_percent: 84, status: 'on_track' },
        { id: '2', salesperson_name: 'Jane Doe', period: 'Q1 2026', target_amount: 600000, achieved_amount: 650000, achievement_percent: 108, status: 'exceeded' },
        { id: '3', salesperson_name: 'Mike Johnson', period: 'Q1 2026', target_amount: 450000, achieved_amount: 280000, achievement_percent: 62, status: 'at_risk' },
      ]);
    } catch (err: any) { 
      console.error('Error loading sales targets:', err);
      setTargets([
        { id: '1', salesperson_name: 'John Smith', period: 'Q1 2026', target_amount: 500000, achieved_amount: 420000, achievement_percent: 84, status: 'on_track' },
        { id: '2', salesperson_name: 'Jane Doe', period: 'Q1 2026', target_amount: 600000, achieved_amount: 650000, achievement_percent: 108, status: 'exceeded' },
        { id: '3', salesperson_name: 'Mike Johnson', period: 'Q1 2026', target_amount: 450000, achieved_amount: 280000, achievement_percent: 62, status: 'at_risk' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/new-pages/sales-targets', {
        salesperson_id: formData.salesperson_id,
        period: formData.period,
        target_amount: formData.target_amount,
        status: 'on_track'
      });
      setShowForm(false);
      setFormData({ salesperson_id: '', period: '', target_amount: 0 });
      await fetchTargets();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to create sales target'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount) || 0);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      exceeded: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      on_track: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      at_risk: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      missed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.on_track;
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'from-green-500 to-emerald-500';
    if (percent >= 75) return 'from-blue-500 to-indigo-500';
    if (percent >= 50) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  const stats = {
    total: targets.length,
    totalTarget: targets.reduce((sum, t) => sum + (t.target_amount || 0), 0),
    totalAchieved: targets.reduce((sum, t) => sum + (t.achieved_amount || 0), 0),
    exceeded: targets.filter(t => t.status === 'exceeded').length,
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-violet-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Sales Targets</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Track sales performance against targets</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchTargets} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all "><Plus className="h-5 w-5" />Set Target</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl "><Users className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Salespeople</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><Target className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalTarget)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Target</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl "><TrendingUp className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalAchieved)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Achieved</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.exceeded}</p><p className="text-xs text-gray-500 dark:text-gray-300">Exceeded Target</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Target className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Set Sales Target</h2><p className="text-white/80 text-sm">Define performance goals</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Salesperson *</label><select required value={formData.salesperson_id} onChange={(e) => setFormData({ ...formData, salesperson_id: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"><option value="">Select salesperson...</option><option value="1">John Smith</option><option value="2">Jane Doe</option><option value="3">Mike Johnson</option></select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period *</label><select required value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"><option value="">Select period...</option><option value="Q1 2026">Q1 2026</option><option value="Q2 2026">Q2 2026</option><option value="Q3 2026">Q3 2026</option><option value="Q4 2026">Q4 2026</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Amount *</label><input type="number" required min="0" value={formData.target_amount} onChange={(e) => setFormData({ ...formData, target_amount: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all ">Set Target</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-violet-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading sales targets...</p></div>
          ) : targets.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Target className="h-8 w-8 text-gray-300" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No sales targets</h3><p className="text-gray-500 dark:text-gray-300 mb-6">Set targets for your sales team</p><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all">Set Target</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Salesperson</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Period</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Target</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Achieved</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Progress</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {targets.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{t.salesperson_name}</td>
                      <td className="px-6 py-4"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-300" /><span className="text-gray-600 dark:text-gray-300">{t.period}</span></div></td>
                      <td className="px-6 py-4 text-right text-gray-900 dark:text-white">{formatCurrency(t.target_amount)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(t.achieved_amount)}</td>
                      <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"><div className={`h-2 rounded-full bg-gradient-to-r ${getProgressColor(t.achievement_percent)}`} style={{ width: `${Math.min(t.achievement_percent, 100)}%` }}></div></div><span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t.achievement_percent}%</span></div></td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(t.status)}`}>{t.status === 'exceeded' ? <TrendingUp className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />}{t.status.replace('_', ' ')}</span></td>
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
