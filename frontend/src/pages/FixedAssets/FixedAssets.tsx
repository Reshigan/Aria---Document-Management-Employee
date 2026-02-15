import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Package, Plus, RefreshCw, Edit2, Trash2, X, DollarSign, TrendingDown, CheckCircle } from 'lucide-react';

interface FixedAsset {
  id: number;
  asset_code: string;
  asset_name: string;
  category: string;
  purchase_date: string;
  purchase_cost: number;
  accumulated_depreciation: number;
  book_value: number;
  status: 'ACTIVE' | 'DISPOSED' | 'UNDER_MAINTENANCE';
}

const FixedAssets: React.FC = () => {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const [form, setForm] = useState({
    asset_code: '',
    asset_name: '',
    category: '',
    purchase_date: '',
    purchase_cost: '',
    accumulated_depreciation: '',
    book_value: '',
    status: 'ACTIVE' as 'ACTIVE' | 'DISPOSED' | 'UNDER_MAINTENANCE'
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; code: string }>({
    show: false,
    id: 0,
    code: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/fixed-assets');
      setAssets(response.data.assets || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load fixed assets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAsset(null);
    setForm({
      asset_code: '',
      asset_name: '',
      category: '',
      purchase_date: '',
      purchase_cost: '',
      accumulated_depreciation: '0',
      book_value: '',
      status: 'ACTIVE'
    });
    setShowModal(true);
  };

  const handleEdit = (asset: FixedAsset) => {
    setEditingAsset(asset);
    setForm({
      asset_code: asset.asset_code,
      asset_name: asset.asset_name,
      category: asset.category,
      purchase_date: asset.purchase_date,
      purchase_cost: asset.purchase_cost.toString(),
      accumulated_depreciation: asset.accumulated_depreciation.toString(),
      book_value: asset.book_value.toString(),
      status: asset.status
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      const payload = {
        ...form,
        purchase_cost: parseFloat(form.purchase_cost) || 0,
        accumulated_depreciation: parseFloat(form.accumulated_depreciation) || 0,
        book_value: parseFloat(form.book_value) || 0
      };
      
      if (editingAsset) {
        await api.put(`/fixed-assets/${editingAsset.id}`, payload);
      } else {
        await api.post('/fixed-assets', payload);
      }
      setShowModal(false);
      loadAssets();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save fixed asset');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/fixed-assets/${id}`);
      loadAssets();
      setDeleteConfirm({ show: false, id: 0, code: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete fixed asset');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      DISPOSED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      UNDER_MAINTENANCE: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
    };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{status.replace('_', ' ')}</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  const totalPurchaseCost = assets.reduce((sum, a) => sum + a.purchase_cost, 0);
  const totalDepreciation = assets.reduce((sum, a) => sum + a.accumulated_depreciation, 0);
  const totalBookValue = assets.reduce((sum, a) => sum + a.book_value, 0);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4" data-testid="fixed-assets">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Fixed Assets</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage company fixed assets and depreciation</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadAssets} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all " data-testid="create-button">
              <Plus className="h-5 w-5" />New Fixed Asset
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <span className="text-red-700 dark:text-red-300">{error}</span>
            <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg">
              <X className="h-4 w-4 text-red-500" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl ">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{assets.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Assets</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl ">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalPurchaseCost)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Purchase Cost</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl ">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalDepreciation)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Depreciation</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl ">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalBookValue)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Book Value</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="assets-table">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset Code</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Purchase Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Purchase Cost</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Book Value</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"><RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />Loading...</td></tr>
                ) : assets.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"><Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />No fixed assets found</td></tr>
                ) : (
                  assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{asset.asset_code}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{asset.asset_name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{asset.category}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{formatDate(asset.purchase_date)}</td>
                      <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{formatCurrency(asset.purchase_cost)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-green-600 dark:text-green-400">{formatCurrency(asset.book_value)}</td>
                      <td className="px-6 py-4">{getStatusBadge(asset.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(asset)} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm({ show: true, id: asset.id, code: asset.asset_code })} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{editingAsset ? 'Edit Fixed Asset' : 'New Fixed Asset'}</h2>
                      <p className="text-white/80 text-sm">Manage asset details</p>
                    </div>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Asset Code *</label>
                  <input type="text" value={form.asset_code} onChange={(e) => setForm({ ...form, asset_code: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Asset Name *</label>
                  <input type="text" value={form.asset_name} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                    <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Purchase Date *</label>
                    <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Purchase Cost *</label>
                    <input type="number" step="0.01" value={form.purchase_cost} onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Depreciation *</label>
                    <input type="number" step="0.01" value={form.accumulated_depreciation} onChange={(e) => setForm({ ...form, accumulated_depreciation: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Book Value *</label>
                    <input type="number" step="0.01" value={form.book_value} onChange={(e) => setForm({ ...form, book_value: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status *</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                    <option value="ACTIVE">Active</option>
                    <option value="DISPOSED">Disposed</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="button" onClick={handleSave} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all ">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={deleteConfirm.show}
          title="Delete Fixed Asset"
          message={`Are you sure you want to delete asset ${deleteConfirm.code}? This action cannot be undone.`}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onClose={() => setDeleteConfirm({ show: false, id: 0, code: '' })}
        />
      </div>
    </div>
  );
};

export default FixedAssets;
