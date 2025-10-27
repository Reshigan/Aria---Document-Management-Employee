import React, { useState, useEffect } from 'react';
import { Plus, Wrench } from 'lucide-react';

const AssetManagement: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/maintenance/assets');
      const data = await response.json();
      setAssets(data.assets || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Asset Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track and manage equipment assets</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} />
            Add Asset
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Asset ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">No assets found</td></tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.asset_id}>
                    <td className="px-6 py-4 text-sm font-medium">{asset.asset_id}</td>
                    <td className="px-6 py-4 text-sm">{asset.asset_name}</td>
                    <td className="px-6 py-4 text-sm">{asset.asset_type}</td>
                    <td className="px-6 py-4 text-sm">{asset.location}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{asset.status}</span>
                    </td>
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
