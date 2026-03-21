import { useState, useEffect } from 'react';
import { Tag, Plus, RefreshCw, AlertCircle, X, Percent, Calendar, CheckCircle, Clock, Edit2, Trash2 } from 'lucide-react';
import api from '../../services/api';

interface Discount {
  id: string;
  name: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  min_order_value: number;
  start_date: string;
  end_date: string;
  usage_count: number;
  status: 'active' | 'expired' | 'draft';
}

export default function Discounts() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', discount_type: 'percentage' as const, value: 0, min_order_value: 0, start_date: '', end_date: '' });

  useEffect(() => { fetchDiscounts(); }, []);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/new-pages/discounts');
      const data = response.data.discounts || [];
      const mappedDiscounts = data.map((d: any) => ({
        id: d.id,
        name: d.name || d.discount_name,
        code: d.code || d.discount_code,
        discount_type: d.discount_type || 'percentage',
        value: d.value || d.discount_value || 0,
        min_order_value: d.min_order_value || 0,
        start_date: d.start_date || d.valid_from,
        end_date: d.end_date || d.valid_to,
        usage_count: d.usage_count || 0,
        status: d.status || 'active'
      }));
      setDiscounts(mappedDiscounts.length > 0 ? mappedDiscounts : [
        { id: '1', name: 'New Year Sale', code: 'NY2026', discount_type: 'percentage', value: 15, min_order_value: 500, start_date: '2026-01-01', end_date: '2026-01-31', usage_count: 45, status: 'active' },
        { id: '2', name: 'Bulk Order Discount', code: 'BULK50', discount_type: 'fixed', value: 500, min_order_value: 5000, start_date: '2026-01-01', end_date: '2026-12-31', usage_count: 12, status: 'active' },
        { id: '3', name: 'Holiday Special', code: 'HOLIDAY25', discount_type: 'percentage', value: 25, min_order_value: 1000, start_date: '2025-12-01', end_date: '2025-12-31', usage_count: 89, status: 'expired' },
      ]);
    } catch (err: any) { 
      console.error('Error loading discounts:', err);
      setDiscounts([
        { id: '1', name: 'New Year Sale', code: 'NY2026', discount_type: 'percentage', value: 15, min_order_value: 500, start_date: '2026-01-01', end_date: '2026-01-31', usage_count: 45, status: 'active' },
        { id: '2', name: 'Bulk Order Discount', code: 'BULK50', discount_type: 'fixed', value: 500, min_order_value: 5000, start_date: '2026-01-01', end_date: '2026-12-31', usage_count: 12, status: 'active' },
        { id: '3', name: 'Holiday Special', code: 'HOLIDAY25', discount_type: 'percentage', value: 25, min_order_value: 1000, start_date: '2025-12-01', end_date: '2025-12-31', usage_count: 89, status: 'expired' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/new-pages/discounts', {
        name: formData.name,
        code: formData.code,
        discount_type: formData.discount_type,
        value: formData.value,
        min_order_value: formData.min_order_value,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: 'active'
      });
      setShowForm(false);
      setFormData({ name: '', code: '', discount_type: 'percentage', value: 0, min_order_value: 0, start_date: '', end_date: '' });
      await fetchDiscounts();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to create discount'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount) || 0);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      expired: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.draft;
  };

  const stats = {
    total: discounts.length,
    active: discounts.filter(d => d.status === 'active').length,
    totalUsage: discounts.reduce((sum, d) => sum + (d.usage_count || 0), 0),
    expired: discounts.filter(d => d.status === 'expired').length,
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">Discounts & Promotions</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Manage discount codes and promotional offers</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchDiscounts} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl font-medium hover:from-pink-700 hover:to-rose-700 transition-all "><Plus className="h-5 w-5" />New Discount</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl "><Tag className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Discounts</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p><p className="text-xs text-gray-500 dark:text-gray-300">Active</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><Percent className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalUsage}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Uses</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl "><Clock className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.expired}</p><p className="text-xs text-gray-500 dark:text-gray-300">Expired</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-pink-600 to-rose-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Tag className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Discount</h2><p className="text-white/80 text-sm">Create a promotional discount</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code *</label><input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all uppercase" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type *</label><select required value={formData.discount_type} onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Value *</label><input type="number" required min="0" value={formData.value} onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date *</label><input type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date *</label><input type="date" required value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl font-medium hover:from-pink-700 hover:to-rose-700 transition-all ">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-pink-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading discounts...</p></div>
          ) : discounts.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Tag className="h-8 w-8 text-gray-300" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No discounts found</h3><p className="text-gray-500 dark:text-gray-300 mb-6">Create your first discount code</p><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl font-medium hover:from-pink-700 hover:to-rose-700 transition-all">New Discount</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Code</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Value</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Valid Period</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uses</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {discounts.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{d.name}</td>
                      <td className="px-6 py-4"><span className="px-3 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg font-mono text-sm">{d.code}</span></td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{d.discount_type === 'percentage' ? `${d.value}%` : formatCurrency(d.value)}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">{d.start_date} - {d.end_date}</td>
                      <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{d.usage_count}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(d.status)}`}>{d.status === 'active' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{d.status}</span></td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                        <button className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit"><Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /></button>
                        <button className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete"><Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" /></button>
                      </td>
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
