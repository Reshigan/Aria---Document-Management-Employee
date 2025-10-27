import React, { useState, useEffect } from 'react';
import { Plus, ClipboardList } from 'lucide-react';

const WorkOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/manufacturing/work-orders');
      const data = await response.json();
      setOrders(data.work_orders || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Work Orders</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track production work orders</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} />
            Create Work Order
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {['pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
            <div key={status} className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
              <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{status.replace('_', ' ')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {orders.filter(o => o.status === status).length}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Start Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center">No work orders found</td></tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.order_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm font-medium">{order.order_id}</td>
                      <td className="px-6 py-4 text-sm">{order.product_name}</td>
                      <td className="px-6 py-4 text-sm">{order.quantity}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{new Date(order.start_date).toLocaleDateString()}</td>
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

export default WorkOrders;
