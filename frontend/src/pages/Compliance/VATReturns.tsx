import { useState, useEffect } from 'react';
import { Receipt, Plus, RefreshCw, AlertCircle, X, Clock, CheckCircle, DollarSign, TrendingUp, TrendingDown, Send, Trash2 } from 'lucide-react';
import { vatReturnsApi } from '../../services/newPagesApi';

interface VATReturn {
  id: string;
  return_number: string;
  tax_period: string;
  period_start: string;
  period_end: string;
  output_vat: number;
  input_vat: number;
  net_vat: number;
  due_date: string;
  submitted_date?: string;
  status: string;
}

export default function VATReturns() {
  const [returns, setReturns] = useState<VATReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ tax_period: '', period_start: '', period_end: '', output_vat: 0, input_vat: 0, due_date: '' });

  useEffect(() => { fetchReturns(); }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await vatReturnsApi.getAll();
      setReturns(response.data.vat_returns || []);
    } catch (err) { setError('Failed to load VAT returns'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await vatReturnsApi.create({ ...formData, net_vat: formData.output_vat - formData.input_vat });
      setShowForm(false);
      setFormData({ tax_period: '', period_start: '', period_end: '', output_vat: 0, input_vat: 0, due_date: '' });
      fetchReturns();
    } catch (err) { setError('Failed to create VAT return'); }
  };

  const handleFile = async (id: string) => {
    try { await vatReturnsApi.file(id); fetchReturns(); } catch (err) { setError('Failed to file VAT return'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await vatReturnsApi.delete(id); fetchReturns(); } catch (err) { setError('Failed to delete VAT return'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      filed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.draft;
  };

  const stats = { total: returns.length, filed: returns.filter(r => r.status === 'filed').length, totalOutput: returns.reduce((sum, r) => sum + r.output_vat, 0), totalNet: returns.reduce((sum, r) => sum + r.net_vat, 0) };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">VAT Returns</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Manage SARS VAT201 submissions</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchReturns} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all "><Plus className="h-5 w-5" />New Return</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><Receipt className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Returns</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.filed}</p><p className="text-xs text-gray-500 dark:text-gray-400">Filed</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><TrendingUp className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats.totalOutput)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Output VAT</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className={`p-2 bg-gradient-to-br ${stats.totalNet > 0 ? 'from-red-500 to-rose-500' : 'from-green-500 to-emerald-500'} rounded-lg`}><DollarSign className="h-5 w-5 text-white" /></div><div><p className={`text-2xl font-bold ${stats.totalNet > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(stats.totalNet)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Net VAT</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"><div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sticky top-0"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Receipt className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New VAT Return</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-4 space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tax Period *</label><input type="text" required placeholder="e.g., 2026/01" value={formData.tax_period} onChange={(e) => setFormData({ ...formData, tax_period: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date *</label><input type="date" required value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period Start *</label><input type="date" required value={formData.period_start} onChange={(e) => setFormData({ ...formData, period_start: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period End *</label><input type="date" required value={formData.period_end} onChange={(e) => setFormData({ ...formData, period_end: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Output VAT (Sales) *</label><input type="number" required step="0.01" value={formData.output_vat} onChange={(e) => setFormData({ ...formData, output_vat: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Input VAT (Purchases) *</label><input type="number" required step="0.01" value={formData.input_vat} onChange={(e) => setFormData({ ...formData, input_vat: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" /></div></div><div className={`p-4 rounded-xl ${formData.output_vat - formData.input_vat > 0 ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`}><div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Net VAT:</span><span className={`text-lg font-bold ${formData.output_vat - formData.input_vat > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(formData.output_vat - formData.input_vat)}</span></div><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formData.output_vat - formData.input_vat > 0 ? 'Payable to SARS' : 'Refund from SARS'}</p></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 ">Create Return</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>) : returns.length === 0 ? (<div className="p-12 text-center"><Receipt className="h-8 w-8 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No VAT returns</h3><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium">New Return</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Return #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tax Period</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Period</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Output VAT</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Input VAT</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Net VAT</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Due Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{returns.map((r) => (<tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-blue-600 dark:text-blue-400">{r.return_number}</td><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{r.tax_period}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.period_start} - {r.period_end}</td><td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{formatCurrency(r.output_vat)}</td><td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{formatCurrency(r.input_vat)}</td><td className="px-6 py-4 text-right"><span className={`font-bold ${r.net_vat > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(r.net_vat)}</span></td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.due_date}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(r.status)}`}>{r.status === 'filed' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{r.status}</span></td><td className="px-6 py-4 text-right space-x-1">{r.status === 'draft' && <button onClick={() => handleFile(r.id)} className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"><Send className="h-4 w-4 inline mr-1" />File</button>}{r.status === 'draft' && <button onClick={() => handleDelete(r.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4 inline mr-1" />Delete</button>}</td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
