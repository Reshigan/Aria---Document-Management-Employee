import React, { useState, useEffect } from 'react';
import { Plus, Wrench, Settings, CheckCircle, AlertTriangle, Package } from 'lucide-react';

const AssetManagement: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/maintenance/assets');
      const ct = response.headers.get('content-type');
      if (!response.ok || !ct?.includes('application/json')) { setAssets([]); return; }
      const data = await response.json();
      setAssets(data.assets || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      OPERATIONAL: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      MAINTENANCE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      REPAIR: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      RETIRED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
      INACTIVE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${styles[status?.toUpperCase()] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl ">
                <Wrench className="h-7 w-7 text-white" />
              </div>
              Asset Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 ml-14">Track and manage equipment assets</p>
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-teal-500/40 transition-all duration-200">
            <Plus size={20} />
            Add Asset
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl ">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{assets.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Assets</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl ">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{assets.filter(a => a.status?.toUpperCase() === 'ACTIVE' || a.status?.toUpperCase() === 'OPERATIONAL').length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Operational</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl ">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{assets.filter(a => a.status?.toUpperCase() === 'MAINTENANCE' || a.status?.toUpperCase() === 'REPAIR').length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">In Maintenance</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl ">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{assets.filter(a => a.status?.toUpperCase() === 'RETIRED' || a.status?.toUpperCase() === 'INACTIVE').length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Retired/Inactive</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Wrench className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No assets found</p>
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.asset_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{asset.asset_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{asset.asset_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{asset.asset_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{asset.location}</td>
                    <td className="px-6 py-4">{getStatusBadge(asset.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AssetManagement;
