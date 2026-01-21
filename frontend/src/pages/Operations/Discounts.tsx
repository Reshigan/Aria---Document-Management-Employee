import { useState, useEffect } from 'react';
import { discountsApi } from '../../services/newPagesApi';

interface Discount {
  id: string;
  discount_name: string;
  discount_code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  valid_from: string;
  valid_to?: string;
  is_active: boolean;
}

export default function Discounts() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ discount_name: '', discount_code: '', discount_type: 'percentage', discount_value: 0, min_order_amount: 0, max_discount_amount: 0, valid_from: '', valid_to: '' });

  useEffect(() => { fetchDiscounts(); }, []);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const response = await discountsApi.getAll();
      setDiscounts(response.data.discounts || []);
    } catch (err) { setError('Failed to load discounts'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await discountsApi.create(formData);
      setShowForm(false);
      setFormData({ discount_name: '', discount_code: '', discount_type: 'percentage', discount_value: 0, min_order_amount: 0, max_discount_amount: 0, valid_from: '', valid_to: '' });
      fetchDiscounts();
    } catch (err) { setError('Failed to create discount'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await discountsApi.delete(id); fetchDiscounts(); } catch (err) { setError('Failed to delete discount'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Discounts</h1><p className="text-gray-600">Manage promotional discounts</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Discount</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Discount</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" value={formData.discount_name} onChange={(e) => setFormData({ ...formData, discount_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Code</label><input type="text" value={formData.discount_code} onChange={(e) => setFormData({ ...formData, discount_code: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={formData.discount_type} onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Value</label><input type="number" value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label><input type="date" value={formData.valid_from} onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Valid To</label><input type="date" value={formData.valid_to} onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {discounts.length === 0 ? (<tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No discounts found.</td></tr>) : (
              discounts.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{d.discount_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.discount_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{d.discount_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{d.discount_type === 'percentage' ? `${d.discount_value}%` : `R ${d.discount_value}`}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d.valid_from} - {d.valid_to || 'Ongoing'}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${d.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{d.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm"><button onClick={() => handleDelete(d.id)} className="text-red-600 hover:text-red-900">Delete</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
