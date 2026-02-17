import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, RefreshCw, AlertCircle, X, Clock, CheckCircle, Shield, Trash2, Activity } from 'lucide-react';
import { riskRegisterApi } from '../../services/newPagesApi';

interface Risk {
  id: string;
  risk_number: string;
  risk_title: string;
  category: string;
  description?: string;
  likelihood: number;
  impact: number;
  risk_score: number;
  owner_name?: string;
  mitigation_strategy?: string;
  review_date: string;
  status: string;
}

export default function RiskRegister() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ risk_title: '', category: 'operational', description: '', likelihood: 3, impact: 3, owner_id: '', mitigation_strategy: '', review_date: '' });

  useEffect(() => { fetchRisks(); }, []);

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const response = await riskRegisterApi.getAll();
      setRisks(response.data.risks || []);
    } catch (err) { setError('Failed to load risks'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await riskRegisterApi.create({ ...formData, risk_score: formData.likelihood * formData.impact });
      setShowForm(false);
      setFormData({ risk_title: '', category: 'operational', description: '', likelihood: 3, impact: 3, owner_id: '', mitigation_strategy: '', review_date: '' });
      fetchRisks();
    } catch (err) { setError('Failed to create risk'); }
  };

  const handleMitigate = async (id: string) => {
    try { await riskRegisterApi.mitigate(id); fetchRisks(); } catch (err) { setError('Failed to mitigate risk'); }
  };

  const handleClose = async (id: string) => {
    try { await riskRegisterApi.close(id); fetchRisks(); } catch (err) { setError('Failed to close risk'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await riskRegisterApi.delete(id); fetchRisks(); } catch (err) { setError('Failed to delete risk'); }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 15) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    if (score >= 10) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
    if (score >= 5) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
    return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      closed: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      mitigated: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      open: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      monitoring: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    };
    return styles[status] || styles.closed;
  };

  const stats = { total: risks.length, open: risks.filter(r => r.status === 'open').length, mitigated: risks.filter(r => r.status === 'mitigated').length, highRisk: risks.filter(r => r.risk_score >= 15).length };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-rose-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-transparent">Risk Register</h1><p className="text-gray-500 dark:text-gray-300 mt-1">Identify and manage organizational risks</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchRisks} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-xl font-medium hover:from-rose-700 hover:to-red-700 transition-all "><Plus className="h-5 w-5" />New Risk</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-rose-500 to-red-500 rounded-xl "><AlertTriangle className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Risks</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl "><Activity className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.open}</p><p className="text-xs text-gray-500 dark:text-gray-300">Open</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><Shield className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.mitigated}</p><p className="text-xs text-gray-500 dark:text-gray-300">Mitigated</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl "><AlertCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.highRisk}</p><p className="text-xs text-gray-500 dark:text-gray-300">High Risk</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto"><div className="bg-gradient-to-r from-rose-600 to-red-600 text-white p-4 sticky top-0"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><AlertTriangle className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Add Risk</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-4 space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Risk Title *</label><input type="text" required value={formData.risk_title} onChange={(e) => setFormData({ ...formData, risk_title: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"><option value="operational">Operational</option><option value="financial">Financial</option><option value="strategic">Strategic</option><option value="compliance">Compliance</option><option value="reputational">Reputational</option><option value="technology">Technology</option></select></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Likelihood (1-5) *</label><select value={formData.likelihood} onChange={(e) => setFormData({ ...formData, likelihood: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"><option value={1}>1 - Rare</option><option value={2}>2 - Unlikely</option><option value={3}>3 - Possible</option><option value={4}>4 - Likely</option><option value={5}>5 - Almost Certain</option></select></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Impact (1-5) *</label><select value={formData.impact} onChange={(e) => setFormData({ ...formData, impact: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"><option value={1}>1 - Insignificant</option><option value={2}>2 - Minor</option><option value={3}>3 - Moderate</option><option value={4}>4 - Major</option><option value={5}>5 - Catastrophic</option></select></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Review Date *</label><input type="date" required value={formData.review_date} onChange={(e) => setFormData({ ...formData, review_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500" /></div><div className="flex items-center pt-8"><div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl flex items-center gap-3 w-full"><span className="text-sm text-gray-600 dark:text-gray-300">Risk Score:</span><span className={`px-4 py-2 rounded-full font-bold ${getRiskBadge(formData.likelihood * formData.impact)}`}>{formData.likelihood * formData.impact}</span></div></div></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mitigation Strategy</label><textarea value={formData.mitigation_strategy} onChange={(e) => setFormData({ ...formData, mitigation_strategy: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500" /></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-xl font-medium hover:from-rose-700 hover:to-red-700 ">Add Risk</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-rose-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading...</p></div>) : risks.length === 0 ? (<div className="p-12 text-center"><AlertTriangle className="h-8 w-8 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No risks found</h3><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-xl font-medium">New Risk</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Risk #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Title</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Category</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">L</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">I</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Score</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Owner</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Review</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{risks.map((r) => (<tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-rose-600 dark:text-rose-400">{r.risk_number}</td><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{r.risk_title}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">{r.category}</td><td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">{r.likelihood}</td><td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">{r.impact}</td><td className="px-6 py-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold ${getRiskBadge(r.risk_score)}`}>{r.risk_score}</span></td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.owner_name || '-'}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.review_date}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(r.status)}`}>{r.status === 'mitigated' ? <CheckCircle className="h-3.5 w-3.5" /> : r.status === 'open' ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{r.status}</span></td><td className="px-6 py-4 text-right space-x-1">{r.status === 'open' && <button onClick={() => handleMitigate(r.id)} className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"><Shield className="h-4 w-4 inline mr-1" />Mitigate</button>}{r.status === 'mitigated' && <button onClick={() => handleClose(r.id)} className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"><CheckCircle className="h-4 w-4 inline mr-1" />Close</button>}<button onClick={() => handleDelete(r.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4 inline mr-1" />Delete</button></td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
