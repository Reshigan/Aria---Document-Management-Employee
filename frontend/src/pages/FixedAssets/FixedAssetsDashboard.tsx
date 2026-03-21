import { useState, useEffect } from 'react';
import { FolderOpen, Plus, Search, TrendingDown, DollarSign, Package, X } from 'lucide-react';
import api from '../../lib/api';

interface AssetCategory {
  id: string;
  code: string;
  name: string;
  depreciation_method: string;
  useful_life_years: number;
}

interface FixedAsset {
  id: string;
  asset_number: string;
  category_name: string;
  description: string;
  acquisition_date: string;
  acquisition_cost: number;
  accumulated_depreciation: number;
  book_value: number;
  status: string;
}

interface AssetsSummary {
  total_assets: number;
  total_cost: number;
  total_depreciation: number;
  total_book_value: number;
}

export default function FixedAssetsDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [summary, setSummary] = useState<AssetsSummary>({
    total_assets: 0,
    total_cost: 0,
    total_depreciation: 0,
    total_book_value: 0
  });
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    category_id: '',
    description: '',
    acquisition_date: new Date().toISOString().split('T')[0],
    acquisition_cost: '',
    location: '',
    serial_number: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetsRes, categoriesRes, summaryRes] = await Promise.all([
        api.get('/erp/fixed-assets/assets'),
        api.get('/erp/fixed-assets/categories'),
        api.get('/erp/fixed-assets/summary')
      ]);
      setAssets(assetsRes.data || []);
      setCategories(categoriesRes.data || []);
      setSummary(summaryRes.data || {
        total_assets: 0,
        total_cost: 0,
        total_depreciation: 0,
        total_book_value: 0
      });
    } catch (error) {
      console.error('Failed to load fixed assets data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async () => {
    try {
      await api.post('/erp/fixed-assets/assets', {
        ...newAsset,
        acquisition_cost: parseFloat(newAsset.acquisition_cost)
      });
      setShowAddModal(false);
      setNewAsset({
        category_id: '',
        description: '',
        acquisition_date: new Date().toISOString().split('T')[0],
        acquisition_cost: '',
        location: '',
        serial_number: ''
      });
      loadData();
    } catch (error) {
      console.error('Failed to add asset:', error);
      alert('Failed to add asset. Please try again.');
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.asset_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => { if (!dateString) return "-"; const _d = new Date(dateString); return isNaN(_d.getTime()) ? dateString : _d.toLocaleDateString("en-ZA"); };

  if (loading && assets.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-300">Loading fixed assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl ">
            <FolderOpen className="h-7 w-7 text-white" />
          </div>
          Fixed Assets
        </h1>
        <p className="text-gray-500 dark:text-gray-300 mt-1">Manage fixed assets, depreciation, and asset disposals</p>
      </div>

      {/* Action Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-slate-500/40 transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            Add Asset
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl ">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.total_assets}</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Total Assets</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl ">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.total_book_value)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Book Value</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl ">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.total_depreciation)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Accumulated Depreciation</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl ">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.total_cost)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Total Cost</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <FolderOpen className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No fixed assets yet</h3>
          <p className="text-gray-500 dark:text-gray-300 mb-6">
            Start by adding your first fixed asset to track depreciation and book value
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-slate-500/40 transition-all"
          >
            Add Your First Asset
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Asset Number</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acquisition Cost</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Depreciation</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Book Value</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acquisition Date</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{asset.asset_number}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{asset.description}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-300 text-sm">{asset.category_name}</td>
                  <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{formatCurrency(asset.acquisition_cost)}</td>
                  <td className="px-6 py-4 text-right text-red-600 dark:text-red-400">{formatCurrency(asset.accumulated_depreciation)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(asset.book_value)}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-300 text-sm">{formatDate(asset.acquisition_date)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      asset.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-gradient-to-r from-slate-500 to-gray-600 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <FolderOpen className="h-6 w-6" />
                Add Fixed Asset
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                <select
                  value={newAsset.category_id}
                  onChange={(e) => setNewAsset({ ...newAsset, category_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                <input
                  type="text"
                  value={newAsset.description}
                  onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Acquisition Date *</label>
                  <input
                    type="date"
                    value={newAsset.acquisition_date}
                    onChange={(e) => setNewAsset({ ...newAsset, acquisition_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Acquisition Cost *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAsset.acquisition_cost}
                    onChange={(e) => setNewAsset({ ...newAsset, acquisition_cost: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    value={newAsset.location}
                    onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Serial Number</label>
                  <input
                    type="text"
                    value={newAsset.serial_number}
                    onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAsset}
                disabled={!newAsset.category_id || !newAsset.description || !newAsset.acquisition_cost}
                className="px-5 py-2.5 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-slate-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
