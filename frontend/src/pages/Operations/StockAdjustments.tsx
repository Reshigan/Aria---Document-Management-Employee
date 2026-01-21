import { useState, useEffect } from 'react';
import { stockAdjustmentsApi } from '../../services/newPagesApi';

interface StockAdjustment {
  id: string;
  adjustment_number: string;
  product_name?: string;
  warehouse_name?: string;
  adjustment_date: string;
  adjustment_type: string;
  quantity_before: number;
  quantity_adjusted: number;
  quantity_after: number;
  reason: string;
  status: string;
}

export default function StockAdjustments() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ product_id: '', warehouse_id: '', adjustment_date: '', adjustment_type: 'increase', quantity_adjusted: 0, reason: '' });

  useEffect(() => { fetchAdjustments(); }, []);

  const fetchAdjustments = async () => {
    try {
      setLoading(true);
      const response = await stockAdjustmentsApi.getAll();
      setAdjustments(response.data.stock_adjustments || []);
    } catch (err) { setError('Failed to load stock adjustments'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await stockAdjustmentsApi.create(formData);
      setShowForm(false);
      setFormData({ product_id: '', warehouse_id: '', adjustment_date: '', adjustment_type: 'increase', quantity_adjusted: 0, reason: '' });
      fetchAdjustments();
    } catch (err) { setError('Failed to create stock adjustment'); }
  };

  const handleApprove = async (id: string) => {
    try { await stockAdjustmentsApi.approve(id); fetchAdjustments(); } catch (err) { setError('Failed to approve adjustment'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'approved': return 'bg-green-100 text-green-800'; case 'pending': return 'bg-yellow-100 text-yellow-800'; case 'rejected': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Stock Adjustments</h1><p className="text-gray-600">Manage inventory adjustments</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Adjustment</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Stock Adjustment</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Date</label><input type="date" value={formData.adjustment_date} onChange={(e) => setFormData({ ...formData, adjustment_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={formData.adjustment_type} onChange={(e) => setFormData({ ...formData, adjustment_type: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="increase">Increase</option><option value="decrease">Decrease</option><option value="write_off">Write Off</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label><input type="number" value={formData.quantity_adjusted} onChange={(e) => setFormData({ ...formData, quantity_adjusted: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Reason</label><input type="text" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adj #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Before</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Adjusted</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">After</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {adjustments.length === 0 ? (<tr><td colSpan={10} className="px-6 py-8 text-center text-gray-500">No stock adjustments found.</td></tr>) : (
              adjustments.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.adjustment_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.product_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.warehouse_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.adjustment_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{a.adjustment_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{a.quantity_before}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{a.adjustment_type === 'increase' ? <span className="text-green-600">+{a.quantity_adjusted}</span> : <span className="text-red-600">-{a.quantity_adjusted}</span>}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{a.quantity_after}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(a.status)}`}>{a.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">{a.status === 'pending' && <button onClick={() => handleApprove(a.id)} className="text-blue-600 hover:text-blue-900">Approve</button>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
