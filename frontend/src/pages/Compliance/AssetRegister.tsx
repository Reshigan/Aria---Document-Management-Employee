import { useState, useEffect } from 'react';
import { Package, Plus, RefreshCw, AlertCircle, X, Clock, CheckCircle, DollarSign, TrendingDown, Archive, Trash2, MapPin } from 'lucide-react';
import { assetRegisterApi } from '../../services/newPagesApi';

interface Asset {
  id: string;
  asset_number: string;
  asset_name: string;
  category: string;
  location?: string;
  purchase_date: string;
  purchase_cost: number;
  current_value: number;
  depreciation_method: string;
  useful_life_years: number;
  status: string;
}

export default function AssetRegister() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ asset_name: '', category: 'equipment', location: '', purchase_date: '', purchase_cost: 0, depreciation_method: 'straight_line', useful_life_years: 5, serial_number: '', description: '' });

  useEffect(() => { fetchAssets(); }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await assetRegisterApi.getAll();
      setAssets(response.data.assets || []);
    } catch (err) { setError('Failed to load assets'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await assetRegisterApi.create(formData);
      setShowForm(false);
      setFormData({ asset_name: '', category: 'equipment', location: '', purchase_date: '', purchase_cost: 0, depreciation_method: 'straight_line', useful_life_years: 5, serial_number: '', description: '' });
      fetchAssets();
    } catch (err) { setError('Failed to create asset'); }
  };

  const handleDispose = async (id: string) => {
    if (!confirm('Are you sure you want to dispose this asset?')) return;
    try { await assetRegisterApi.dispose(id, { disposal_date: new Date().toISOString().split('T')[0], disposal_amount: 0 }); fetchAssets(); } catch (err) { setError('Failed to dispose asset'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await assetRegisterApi.delete(id); fetchAssets(); } catch (err) { setError('Failed to delete asset'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount) || 0);
  
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      disposed: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      under_maintenance: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      written_off: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.disposed;
  };

  const stats = { total: assets.length, active: assets.filter(a => a.status === 'active').length, totalCost: assets.reduce((sum, a) => sum + (a.purchase_cost || 0), 0), totalValue: assets.reduce((sum, a) => sum + (a.current_value || 0), 0) };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Asset Register</h1><p className="text-gray-500 dark:text-gray-300 mt-1">Track fixed assets and depreciation</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchAssets} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-orange-700 transition-all "><Plus className="h-5 w-5" />New Asset</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Package className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Assets</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p><p className="text-xs text-gray-500 dark:text-gray-300">Active</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(stats.totalCost)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Cost</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><TrendingDown className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats.totalValue)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Book Value</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto"><div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-4 sticky top-0"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Package className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Add Fixed Asset</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-4 space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Asset Name *</label><input type="text" required value={formData.asset_name} onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"><option value="equipment">Equipment</option><option value="furniture">Furniture</option><option value="vehicles">Vehicles</option><option value="computers">Computers</option><option value="buildings">Buildings</option><option value="land">Land</option></select></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label><input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Serial Number</label><input type="text" value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Purchase Date *</label><input type="date" required value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Purchase Cost *</label><input type="number" required step="0.01" value={formData.purchase_cost} onChange={(e) => setFormData({ ...formData, purchase_cost: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Depreciation Method *</label><select value={formData.depreciation_method} onChange={(e) => setFormData({ ...formData, depreciation_method: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"><option value="straight_line">Straight Line</option><option value="reducing_balance">Reducing Balance</option><option value="units_of_production">Units of Production</option></select></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Useful Life (Years) *</label><input type="number" required value={formData.useful_life_years} onChange={(e) => setFormData({ ...formData, useful_life_years: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" /></div></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" /></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-orange-700 ">Add Asset</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading...</p></div>) : assets.length === 0 ? (<div className="p-12 text-center"><Package className="h-8 w-8 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No assets found</h3><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium">New Asset</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Asset #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Name</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Category</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Location</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Purchase Date</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Cost</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Book Value</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{assets.map((a) => (<tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-amber-600 dark:text-amber-400">{a.asset_number}</td><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{a.asset_name}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">{a.category}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{a.location ? <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{a.location}</span> : '-'}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{a.purchase_date}</td><td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(a.purchase_cost)}</td><td className="px-6 py-4 text-right font-semibold text-purple-600 dark:text-purple-400">{formatCurrency(a.current_value)}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(a.status)}`}>{a.status === 'active' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{a.status.replace('_', ' ')}</span></td><td className="px-6 py-4 text-right space-x-1">{a.status === 'active' && <button onClick={() => handleDispose(a.id)} className="px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg"><Archive className="h-4 w-4 inline mr-1" />Dispose</button>}<button onClick={() => handleDelete(a.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4 inline mr-1" />Delete</button></td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
