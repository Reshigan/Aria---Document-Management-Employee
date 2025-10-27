import React, { useState, useEffect } from 'react';
import { Plus, Package, Edit, Trash2 } from 'lucide-react';

const BOMManagement: React.FC = () => {
  const [boms, setBOMs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBOMs();
  }, []);

  const fetchBOMs = async () => {
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/manufacturing/bom');
      const data = await response.json();
      setBOMs(data.boms || []);
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bill of Materials (BOM)</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage product BOMs and material requirements</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} />
            Create BOM
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total BOMs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{boms.length}</p>
              </div>
              <Package className="text-blue-600" size={32} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">BOM ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Version</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
                ) : boms.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center">No BOMs found</td></tr>
                ) : (
                  boms.map((bom) => (
                    <tr key={bom.bom_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm">{bom.bom_id}</td>
                      <td className="px-6 py-4 text-sm">{bom.product_name}</td>
                      <td className="px-6 py-4 text-sm">{bom.version}</td>
                      <td className="px-6 py-4 text-sm">{bom.items?.length || 0}</td>
                      <td className="px-6 py-4 text-sm">
                        <button className="text-blue-600 hover:text-blue-900 mr-3"><Edit size={18} /></button>
                        <button className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BOMManagement;
