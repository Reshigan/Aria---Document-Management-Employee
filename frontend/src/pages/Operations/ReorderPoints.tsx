import { useState, useEffect } from 'react';
import { reorderPointsApi } from '../../services/newPagesApi';

interface ReorderPoint {
  id: string;
  product_name?: string;
  warehouse_name?: string;
  current_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  lead_time_days: number;
  is_active: boolean;
}

export default function ReorderPoints() {
  const [reorderPoints, setReorderPoints] = useState<ReorderPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ product_id: '', warehouse_id: '', reorder_point: 0, reorder_quantity: 0, lead_time_days: 7 });

  useEffect(() => { fetchReorderPoints(); }, []);

  const fetchReorderPoints = async () => {
    try {
      setLoading(true);
      const response = await reorderPointsApi.getAll();
      setReorderPoints(response.data.reorder_points || []);
    } catch (err) { setError('Failed to load reorder points'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reorderPointsApi.create(formData);
      setShowForm(false);
      setFormData({ product_id: '', warehouse_id: '', reorder_point: 0, reorder_quantity: 0, lead_time_days: 7 });
      fetchReorderPoints();
    } catch (err) { setError('Failed to create reorder point'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await reorderPointsApi.delete(id); fetchReorderPoints(); } catch (err) { setError('Failed to delete reorder point'); }
  };

  const getStockStatus = (current: number, reorder: number) => {
    if (current <= reorder) return { color: 'bg-red-100 text-red-800', text: 'Below Reorder' };
    if (current <= reorder * 1.5) return { color: 'bg-yellow-100 text-yellow-800', text: 'Low Stock' };
    return { color: 'bg-green-100 text-green-800', text: 'In Stock' };
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Reorder Points</h1><p className="text-gray-600">Configure automatic reorder thresholds</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Reorder Point</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Reorder Point</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label><input type="number" value={formData.reorder_point} onChange={(e) => setFormData({ ...formData, reorder_point: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Reorder Quantity</label><input type="number" value={formData.reorder_quantity} onChange={(e) => setFormData({ ...formData, reorder_quantity: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (Days)</label><input type="number" value={formData.lead_time_days} onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Stock</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reorder Qty</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lead Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reorderPoints.length === 0 ? (<tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No reorder points configured.</td></tr>) : (
              reorderPoints.map((rp) => {
                const status = getStockStatus(rp.current_stock, rp.reorder_point);
                return (
                  <tr key={rp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rp.product_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rp.warehouse_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{rp.current_stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{rp.reorder_point}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{rp.reorder_quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{rp.lead_time_days} days</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>{status.text}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm"><button onClick={() => handleDelete(rp.id)} className="text-red-600 hover:text-red-900">Delete</button></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
