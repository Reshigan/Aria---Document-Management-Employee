import React, { useState, useEffect } from 'react';
import { Package, ClipboardList, TrendingUp, AlertCircle } from 'lucide-react';

const ManufacturingDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/manufacturing/dashboard');
      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Manufacturing Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total BOMs</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboard?.total_boms || 0}
                </p>
              </div>
              <Package className="text-blue-600" size={40} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Work Orders</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboard?.active_work_orders || 0}
                </p>
              </div>
              <ClipboardList className="text-green-600" size={40} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Production Plans</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboard?.production_plans || 0}
                </p>
              </div>
              <TrendingUp className="text-purple-600" size={40} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Orders</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboard?.pending_orders || 0}
                </p>
              </div>
              <AlertCircle className="text-orange-600" size={40} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <h2 className="text-xl font-bold mb-4">Recent Work Orders</h2>
            <div className="space-y-2">
              {dashboard?.recent_orders?.slice(0, 5).map((order: any) => (
                <div key={order.order_id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div>
                    <p className="font-medium">{order.order_id}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{order.product_name}</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{order.status}</span>
                </div>
              )) || <p className="text-gray-500">No recent orders</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <h2 className="text-xl font-bold mb-4">Production Capacity</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Utilization</span>
                  <span className="text-sm font-medium">{dashboard?.capacity_utilization || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: `${dashboard?.capacity_utilization || 0}%`}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManufacturingDashboard;
