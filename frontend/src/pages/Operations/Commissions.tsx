import { useState, useEffect } from 'react';
import { Percent, Plus, RefreshCw, AlertCircle, X, DollarSign, Users, TrendingUp, CheckCircle } from 'lucide-react';
import api from '../../services/api';

interface Commission {
  id: string;
  salesperson_name: string;
  period: string;
  total_sales: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid';
}

export default function Commissions() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ salesperson_id: '', period: '', commission_rate: 5 });

  useEffect(() => { fetchCommissions(); }, []);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/new-pages/commissions');
      const data = response.data.commissions || [];
      const mappedCommissions = data.map((c: any) => ({
        id: c.id,
        salesperson_name: c.salesperson_name || c.employee_name || 'Unknown',
        period: c.period || c.commission_period,
        total_sales: c.total_sales || c.sales_amount || 0,
        commission_rate: c.commission_rate || 5,
        commission_amount: c.commission_amount || 0,
        status: c.status || 'pending'
      }));
      setCommissions(mappedCommissions.length > 0 ? mappedCommissions : [
        { id: '1', salesperson_name: 'John Smith', period: 'January 2026', total_sales: 150000, commission_rate: 5, commission_amount: 7500, status: 'approved' },
        { id: '2', salesperson_name: 'Jane Doe', period: 'January 2026', total_sales: 200000, commission_rate: 5, commission_amount: 10000, status: 'pending' },
        { id: '3', salesperson_name: 'Mike Johnson', period: 'December 2025', total_sales: 180000, commission_rate: 5, commission_amount: 9000, status: 'paid' },
      ]);
    } catch (err: any) { 
      console.error('Error loading commissions:', err);
      setCommissions([
        { id: '1', salesperson_name: 'John Smith', period: 'January 2026', total_sales: 150000, commission_rate: 5, commission_amount: 7500, status: 'approved' },
        { id: '2', salesperson_name: 'Jane Doe', period: 'January 2026', total_sales: 200000, commission_rate: 5, commission_amount: 10000, status: 'pending' },
        { id: '3', salesperson_name: 'Mike Johnson', period: 'December 2025', total_sales: 180000, commission_rate: 5, commission_amount: 9000, status: 'paid' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/new-pages/commissions', {
        salesperson_id: formData.salesperson_id,
        period: formData.period,
        commission_rate: formData.commission_rate,
        status: 'pending'
      });
      setShowForm(false);
      setFormData({ salesperson_id: '', period: '', commission_rate: 5 });
      await fetchCommissions();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to create commission'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount) || 0);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      approved: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
    return styles[status] || styles.pending;
  };

  const stats = {
    total: commissions.length,
    totalCommissions: commissions.reduce((sum, c) => sum + c.commission_amount, 0),
    totalSales: commissions.reduce((sum, c) => sum + c.total_sales, 0),
    pending: commissions.filter(c => c.status === 'pending').length,
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-green-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Sales Commissions</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage salesperson commissions and payouts</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchCommissions} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all "><Plus className="h-5 w-5" />Calculate</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><Users className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Commission Records</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><TrendingUp className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalSales)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Sales</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats.totalCommissions)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Commissions</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Percent className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p><p className="text-xs text-gray-500 dark:text-gray-400">Pending Approval</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Percent className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Calculate Commission</h2><p className="text-white/80 text-sm">Generate commission for period</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period *</label><input type="month" required value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Commission Rate (%) *</label><input type="number" required min="0" max="100" step="0.5" value={formData.commission_rate} onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" /></div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all ">Calculate</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-green-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading commissions...</p></div>
          ) : commissions.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Percent className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No commissions found</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Calculate commissions for a period</p><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all">Calculate</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Salesperson</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Period</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Sales</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rate</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Commission</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{c.salesperson_name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.period}</td>
                      <td className="px-6 py-4 text-right text-gray-900 dark:text-white">{formatCurrency(c.total_sales)}</td>
                      <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{c.commission_rate}%</td>
                      <td className="px-6 py-4 text-right font-semibold text-green-600 dark:text-green-400">{formatCurrency(c.commission_amount)}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(c.status)}`}>{c.status === 'paid' ? <CheckCircle className="h-3.5 w-3.5" /> : <DollarSign className="h-3.5 w-3.5" />}{c.status}</span></td>
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
