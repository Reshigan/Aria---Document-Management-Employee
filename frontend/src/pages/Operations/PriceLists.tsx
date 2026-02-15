import { useState, useEffect } from 'react';
import { DollarSign, Plus, RefreshCw, AlertCircle, X, Tag, CheckCircle, Clock, Edit2, Trash2, Users } from 'lucide-react';
import api from '../../services/api';

interface PriceList {
  id: string;
  name: string;
  code: string;
  currency: string;
  customer_group: string;
  products_count: number;
  effective_date: string;
  status: 'active' | 'draft' | 'expired';
}

export default function PriceLists() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', currency: 'ZAR', customer_group: '', effective_date: '' });

  useEffect(() => { fetchPriceLists(); }, []);

  const fetchPriceLists = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/new-pages/price-lists');
      const data = response.data.price_lists || [];
      const mappedPriceLists = data.map((p: any) => ({
        id: p.id,
        name: p.name || p.price_list_name,
        code: p.code || p.price_list_code,
        currency: p.currency || 'ZAR',
        customer_group: p.customer_group || 'All Customers',
        products_count: p.products_count || 0,
        effective_date: p.effective_date || p.valid_from,
        status: p.status || 'active'
      }));
      setPriceLists(mappedPriceLists.length > 0 ? mappedPriceLists : [
        { id: '1', name: 'Standard Retail', code: 'STD-RET', currency: 'ZAR', customer_group: 'Retail Customers', products_count: 150, effective_date: '2026-01-01', status: 'active' },
        { id: '2', name: 'Wholesale Pricing', code: 'WHL-001', currency: 'ZAR', customer_group: 'Wholesalers', products_count: 150, effective_date: '2026-01-01', status: 'active' },
        { id: '3', name: 'VIP Customers', code: 'VIP-001', currency: 'ZAR', customer_group: 'VIP', products_count: 150, effective_date: '2026-02-01', status: 'draft' },
      ]);
    } catch (err: any) { 
      console.error('Error loading price lists:', err);
      setPriceLists([
        { id: '1', name: 'Standard Retail', code: 'STD-RET', currency: 'ZAR', customer_group: 'Retail Customers', products_count: 150, effective_date: '2026-01-01', status: 'active' },
        { id: '2', name: 'Wholesale Pricing', code: 'WHL-001', currency: 'ZAR', customer_group: 'Wholesalers', products_count: 150, effective_date: '2026-01-01', status: 'active' },
        { id: '3', name: 'VIP Customers', code: 'VIP-001', currency: 'ZAR', customer_group: 'VIP', products_count: 150, effective_date: '2026-02-01', status: 'draft' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/new-pages/price-lists', {
        name: formData.name,
        code: formData.code,
        currency: formData.currency,
        customer_group: formData.customer_group,
        effective_date: formData.effective_date,
        status: 'active'
      });
      setShowForm(false);
      setFormData({ name: '', code: '', currency: 'ZAR', customer_group: '', effective_date: '' });
      await fetchPriceLists();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to create price list'); }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      draft: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      expired: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.draft;
  };

  const stats = {
    total: priceLists.length,
    active: priceLists.filter(p => p.status === 'active').length,
    draft: priceLists.filter(p => p.status === 'draft').length,
    totalProducts: priceLists.reduce((sum, p) => sum + p.products_count, 0),
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Price Lists</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage customer-specific pricing</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchPriceLists} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium hover:from-teal-700 hover:to-cyan-700 transition-all "><Plus className="h-5 w-5" />New Price List</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Price Lists</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p><p className="text-xs text-gray-500 dark:text-gray-400">Active</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Clock className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.draft}</p><p className="text-xs text-gray-500 dark:text-gray-400">Draft</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><Tag className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalProducts}</p><p className="text-xs text-gray-500 dark:text-gray-400">Products Priced</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><DollarSign className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Price List</h2><p className="text-white/80 text-sm">Create customer pricing</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code *</label><input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all uppercase" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency *</label><select required value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"><option value="ZAR">ZAR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Effective Date *</label><input type="date" required value={formData.effective_date} onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Group *</label><select required value={formData.customer_group} onChange={(e) => setFormData({ ...formData, customer_group: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"><option value="">Select group...</option><option value="retail">Retail Customers</option><option value="wholesale">Wholesalers</option><option value="vip">VIP</option><option value="all">All Customers</option></select></div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium hover:from-teal-700 hover:to-cyan-700 transition-all ">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-teal-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading price lists...</p></div>
          ) : priceLists.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><DollarSign className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No price lists found</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Create your first price list</p><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium hover:from-teal-700 hover:to-cyan-700 transition-all">New Price List</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer Group</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Products</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Effective</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {priceLists.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{p.name}</td>
                      <td className="px-6 py-4"><span className="px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg font-mono text-sm">{p.code}</span></td>
                      <td className="px-6 py-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-gray-400" /><span className="text-gray-600 dark:text-gray-300">{p.customer_group}</span></div></td>
                      <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{p.products_count}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{p.effective_date}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(p.status)}`}>{p.status === 'active' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{p.status}</span></td>
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
