import { useState, useEffect } from 'react';
import { priceListsApi } from '../../services/newPagesApi';

interface PriceList {
  id: string;
  price_list_name: string;
  price_list_code: string;
  currency: string;
  effective_from: string;
  effective_to?: string;
  is_default: boolean;
  is_active: boolean;
}

export default function PriceLists() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ price_list_name: '', price_list_code: '', currency: 'ZAR', effective_from: '', effective_to: '', is_default: false });

  useEffect(() => { fetchPriceLists(); }, []);

  const fetchPriceLists = async () => {
    try {
      setLoading(true);
      const response = await priceListsApi.getAll();
      setPriceLists(response.data.price_lists || []);
    } catch (err) { setError('Failed to load price lists'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await priceListsApi.create(formData);
      setShowForm(false);
      setFormData({ price_list_name: '', price_list_code: '', currency: 'ZAR', effective_from: '', effective_to: '', is_default: false });
      fetchPriceLists();
    } catch (err) { setError('Failed to create price list'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await priceListsApi.delete(id); fetchPriceLists(); } catch (err) { setError('Failed to delete price list'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Price Lists</h1><p className="text-gray-600">Manage product pricing tiers</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Price List</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Price List</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" value={formData.price_list_name} onChange={(e) => setFormData({ ...formData, price_list_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Code</label><input type="text" value={formData.price_list_code} onChange={(e) => setFormData({ ...formData, price_list_code: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Currency</label><select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="ZAR">ZAR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Effective From</label><input type="date" value={formData.effective_from} onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Effective To</label><input type="date" value={formData.effective_to} onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div className="flex items-center"><label className="flex items-center"><input type="checkbox" checked={formData.is_default} onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })} className="mr-2" /><span className="text-sm text-gray-700">Default Price List</span></label></div>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {priceLists.length === 0 ? (<tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No price lists found.</td></tr>) : (
              priceLists.map((pl) => (
                <tr key={pl.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pl.price_list_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pl.price_list_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pl.currency}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pl.effective_from} - {pl.effective_to || 'Ongoing'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{pl.is_default && <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Default</span>}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${pl.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{pl.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm"><button onClick={() => handleDelete(pl.id)} className="text-red-600 hover:text-red-900">Delete</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
