import { useState, useEffect } from 'react';
import { Award, Plus, RefreshCw, AlertCircle, X, Clock, CheckCircle, TrendingUp, Trash2, Shield } from 'lucide-react';
import { bbbeeScorecardsApi } from '../../services/newPagesApi';

interface BBBEEScorecard {
  id: string;
  scorecard_number: string;
  assessment_year: string;
  verification_agency?: string;
  ownership_score: number;
  management_control_score: number;
  skills_development_score: number;
  enterprise_development_score: number;
  supplier_development_score: number;
  socio_economic_score: number;
  total_score: number;
  level: number;
  valid_from: string;
  valid_to: string;
  status: string;
}

export default function BBBEE() {
  const [scorecards, setScorecards] = useState<BBBEEScorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ assessment_year: new Date().getFullYear().toString(), verification_agency: '', ownership_score: 0, management_control_score: 0, skills_development_score: 0, enterprise_development_score: 0, supplier_development_score: 0, socio_economic_score: 0, valid_from: '', valid_to: '' });

  useEffect(() => { fetchScorecards(); }, []);

  const fetchScorecards = async () => {
    try {
      setLoading(true);
      const response = await bbbeeScorecardsApi.getAll();
      setScorecards(response.data.bbbee_scorecards || []);
    } catch (err) { setError('Failed to load B-BBEE scorecards'); } finally { setLoading(false); }
  };

  const calculateTotal = () => formData.ownership_score + formData.management_control_score + formData.skills_development_score + formData.enterprise_development_score + formData.supplier_development_score + formData.socio_economic_score;
  const calculateLevel = (total: number) => { if (total >= 100) return 1; if (total >= 95) return 2; if (total >= 90) return 3; if (total >= 80) return 4; if (total >= 75) return 5; if (total >= 70) return 6; if (total >= 55) return 7; if (total >= 40) return 8; return 'NC'; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const total = calculateTotal();
      await bbbeeScorecardsApi.create({ ...formData, total_score: total, level: calculateLevel(total) });
      setShowForm(false);
      setFormData({ assessment_year: new Date().getFullYear().toString(), verification_agency: '', ownership_score: 0, management_control_score: 0, skills_development_score: 0, enterprise_development_score: 0, supplier_development_score: 0, socio_economic_score: 0, valid_from: '', valid_to: '' });
      fetchScorecards();
    } catch (err) { setError('Failed to create B-BBEE scorecard'); }
  };

  const handleVerify = async (id: string) => {
    try { await bbbeeScorecardsApi.verify(id); fetchScorecards(); } catch (err) { setError('Failed to verify scorecard'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await bbbeeScorecardsApi.delete(id); fetchScorecards(); } catch (err) { setError('Failed to delete scorecard'); }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      verified: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      expired: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.draft;
  };

  const getLevelBadge = (level: number) => {
    if (level <= 2) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    if (level <= 4) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    if (level <= 6) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  };

  const stats = { total: scorecards.length, verified: scorecards.filter(s => s.status === 'verified').length, avgScore: scorecards.length > 0 ? Math.round(scorecards.reduce((sum, s) => sum + (s.total_score || 0), 0) / scorecards.length) : 0, bestLevel: scorecards.length > 0 ? Math.min(...scorecards.map(s => s.level)) : 0 };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-green-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">B-BBEE Compliance</h1><p className="text-gray-500 dark:text-gray-300 mt-1">Manage Broad-Based Black Economic Empowerment scorecards</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchScorecards} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all "><Plus className="h-5 w-5" />New Scorecard</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><Award className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Scorecards</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.verified}</p><p className="text-xs text-gray-500 dark:text-gray-300">Verified</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><TrendingUp className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.avgScore}/100</p><p className="text-xs text-gray-500 dark:text-gray-300">Avg Score</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Shield className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">Level {stats.bestLevel || '-'}</p><p className="text-xs text-gray-500 dark:text-gray-300">Best Level</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] overflow-y-auto"><div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 sticky top-0"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Award className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Create B-BBEE Scorecard</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-4 space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assessment Year *</label><input type="text" required value={formData.assessment_year} onChange={(e) => setFormData({ ...formData, assessment_year: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Verification Agency</label><input type="text" value={formData.verification_agency} onChange={(e) => setFormData({ ...formData, verification_agency: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Valid From *</label><input type="date" required value={formData.valid_from} onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Valid To *</label><input type="date" required value={formData.valid_to} onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" /></div></div><div className="border-t border-gray-200 dark:border-gray-700 pt-4"><h3 className="font-semibold text-gray-900 dark:text-white mb-4">Scorecard Elements (Max Points)</h3><div className="grid grid-cols-3 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ownership (25)</label><input type="number" max={25} value={formData.ownership_score} onChange={(e) => setFormData({ ...formData, ownership_score: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Management (19)</label><input type="number" max={19} value={formData.management_control_score} onChange={(e) => setFormData({ ...formData, management_control_score: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skills Dev (20)</label><input type="number" max={20} value={formData.skills_development_score} onChange={(e) => setFormData({ ...formData, skills_development_score: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enterprise Dev (15)</label><input type="number" max={15} value={formData.enterprise_development_score} onChange={(e) => setFormData({ ...formData, enterprise_development_score: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Supplier Dev (16)</label><input type="number" max={16} value={formData.supplier_development_score} onChange={(e) => setFormData({ ...formData, supplier_development_score: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Socio-Economic (5)</label><input type="number" max={5} value={formData.socio_economic_score} onChange={(e) => setFormData({ ...formData, socio_economic_score: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" /></div></div></div><div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl flex justify-between items-center"><div><span className="text-sm text-gray-600 dark:text-gray-300">Total Score: </span><span className="text-xl font-bold text-gray-900 dark:text-white">{calculateTotal()}/100</span></div><div><span className="text-sm text-gray-600 dark:text-gray-300 mr-2">B-BBEE Level: </span><span className={`px-4 py-2 rounded-full font-bold ${getLevelBadge(calculateLevel(calculateTotal()) as number)}`}>Level {calculateLevel(calculateTotal())}</span></div></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 ">Create Scorecard</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-green-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading...</p></div>) : scorecards.length === 0 ? (<div className="p-12 text-center"><Award className="h-8 w-8 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No B-BBEE scorecards</h3><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium">New Scorecard</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Scorecard #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Year</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Agency</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Total</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Level</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Valid Period</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{scorecards.map((s) => (<tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-green-600 dark:text-green-400">{s.scorecard_number}</td><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{s.assessment_year}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{s.verification_agency || '-'}</td><td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{s.total_score}/100</td><td className="px-6 py-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold ${getLevelBadge(s.level)}`}>Level {s.level}</span></td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{s.valid_from} - {s.valid_to}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(s.status)}`}>{s.status === 'verified' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{s.status}</span></td><td className="px-6 py-4 text-right space-x-1">{s.status === 'draft' && <button onClick={() => handleVerify(s.id)} className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"><CheckCircle className="h-4 w-4 inline mr-1" />Verify</button>}<button onClick={() => handleDelete(s.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4 inline mr-1" />Delete</button></td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
