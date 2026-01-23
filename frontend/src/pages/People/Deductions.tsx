import { useState, useEffect } from 'react';
import { MinusCircle, Plus, RefreshCw, AlertCircle, X, DollarSign, Users, CheckCircle, Clock, Edit2, Trash2 } from 'lucide-react';

interface Deduction {
  id: string;
  name: string;
  code: string;
  type: 'fixed' | 'percentage';
  value: number;
  applies_to: string;
  employees_count: number;
  status: 'active' | 'inactive';
}

export default function Deductions() {
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', type: 'fixed' as const, value: 0, applies_to: 'all' });

  useEffect(() => { fetchDeductions(); }, []);

  const fetchDeductions = async () => {
    try {
      setLoading(true);
      setDeductions([
        { id: '1', name: 'Medical Aid', code: 'MED', type: 'fixed', value: 2500, applies_to: 'All Employees', employees_count: 45, status: 'active' },
        { id: '2', name: 'Pension Fund', code: 'PEN', type: 'percentage', value: 7.5, applies_to: 'Permanent Staff', employees_count: 38, status: 'active' },
        { id: '3', name: 'Union Fees', code: 'UNI', type: 'fixed', value: 150, applies_to: 'Union Members', employees_count: 12, status: 'active' },
      ]);
    } catch (err) { setError('Failed to load deductions'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    alert('Deduction created successfully');
    setShowForm(false);
    setFormData({ name: '', code: '', type: 'fixed', value: 0, applies_to: 'all' });
    await fetchDeductions();
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.inactive;
  };

  const stats = { total: deductions.length, active: deductions.filter(d => d.status === 'active').length, totalEmployees: deductions.reduce((sum, d) => sum + d.employees_count, 0), fixed: deductions.filter(d => d.type === 'fixed').length };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-rose-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div><h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">Deductions</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Manage payroll deductions</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchDeductions} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl font-medium hover:from-rose-700 hover:to-pink-700 transition-all shadow-lg shadow-rose-500/30"><Plus className="h-5 w-5" />New Deduction</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl shadow-lg shadow-rose-500/30"><MinusCircle className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30"><CheckCircle className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p><p className="text-sm text-gray-500 dark:text-gray-400">Active</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30"><Users className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalEmployees}</p><p className="text-sm text-gray-500 dark:text-gray-400">Employees</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl shadow-lg shadow-purple-500/30"><DollarSign className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.fixed}</p><p className="text-sm text-gray-500 dark:text-gray-400">Fixed</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"><div className="bg-gradient-to-r from-rose-600 to-pink-600 text-white p-6"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><MinusCircle className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Deduction</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-6 space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code *</label><input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 uppercase" /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type *</label><select required value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as 'fixed' | 'percentage' })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"><option value="fixed">Fixed</option><option value="percentage">Percentage</option></select></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Value *</label><input type="number" required min="0" step="0.01" value={formData.value} onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500" /></div></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl font-medium hover:from-rose-700 hover:to-pink-700 shadow-lg shadow-rose-500/30">Create</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-rose-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>) : deductions.length === 0 ? (<div className="p-12 text-center"><MinusCircle className="h-8 w-8 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No deductions</h3><button onClick={() => setShowForm(true)} className="px-5 py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl font-medium">New Deduction</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Name</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Code</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Value</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Employees</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{deductions.map((d) => (<tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{d.name}</td><td className="px-6 py-4"><span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-lg font-mono text-sm">{d.code}</span></td><td className="px-6 py-4"><span className={`px-3 py-1 rounded-lg text-xs font-medium ${d.type === 'fixed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'}`}>{d.type}</span></td><td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{d.type === 'fixed' ? formatCurrency(d.value) : `${d.value}%`}</td><td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{d.employees_count}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(d.status)}`}>{d.status === 'active' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{d.status}</span></td><td className="px-6 py-4 text-right flex items-center justify-end gap-1"><button className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"><Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /></button><button className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" /></button></td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
