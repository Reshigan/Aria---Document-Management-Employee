import { useState, useEffect } from 'react';
import { assetRegisterApi } from '../../services/newPagesApi';

interface Asset {
  id: string;
  asset_number: string;
  asset_name: string;
  category: string;
  location?: string;
  purchase_date: string;
  purchase_cost: number;
  current_value: number;
  depreciation_method: string;
  useful_life_years: number;
  status: string;
}

export default function AssetRegister() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ asset_name: '', category: 'equipment', location: '', purchase_date: '', purchase_cost: 0, depreciation_method: 'straight_line', useful_life_years: 5, serial_number: '', description: '' });

  useEffect(() => { fetchAssets(); }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await assetRegisterApi.getAll();
      setAssets(response.data.assets || []);
    } catch (err) { setError('Failed to load assets'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await assetRegisterApi.create(formData);
      setShowForm(false);
      setFormData({ asset_name: '', category: 'equipment', location: '', purchase_date: '', purchase_cost: 0, depreciation_method: 'straight_line', useful_life_years: 5, serial_number: '', description: '' });
      fetchAssets();
    } catch (err) { setError('Failed to create asset'); }
  };

  const handleDispose = async (id: string) => {
    if (!confirm('Are you sure you want to dispose this asset?')) return;
    try { await assetRegisterApi.dispose(id, { disposal_date: new Date().toISOString().split('T')[0], disposal_amount: 0 }); fetchAssets(); } catch (err) { setError('Failed to dispose asset'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await assetRegisterApi.delete(id); fetchAssets(); } catch (err) { setError('Failed to delete asset'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const getStatusColor = (status: string) => {
    switch (status) { case 'active': return 'bg-green-100 text-green-800'; case 'disposed': return 'bg-gray-100 text-gray-800'; case 'under_maintenance': return 'bg-yellow-100 text-yellow-800'; case 'written_off': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Asset Register</h1><p className="text-gray-600">Track fixed assets and depreciation</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Asset</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Fixed Asset</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label><input type="text" value={formData.asset_name} onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="equipment">Equipment</option><option value="furniture">Furniture</option><option value="vehicles">Vehicles</option><option value="computers">Computers</option><option value="buildings">Buildings</option><option value="land">Land</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Location</label><input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label><input type="text" value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label><input type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Purchase Cost</label><input type="number" step="0.01" value={formData.purchase_cost} onChange={(e) => setFormData({ ...formData, purchase_cost: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Depreciation Method</label><select value={formData.depreciation_method} onChange={(e) => setFormData({ ...formData, depreciation_method: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="straight_line">Straight Line</option><option value="reducing_balance">Reducing Balance</option><option value="units_of_production">Units of Production</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Useful Life (Years)</label><input type="number" value={formData.useful_life_years} onChange={(e) => setFormData({ ...formData, useful_life_years: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Add Asset</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Book Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {assets.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No assets found.</td></tr>) : (
              assets.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.asset_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{a.asset_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{a.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.location || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.purchase_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(a.purchase_cost)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(a.current_value)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(a.status)}`}>{a.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {a.status === 'active' && <button onClick={() => handleDispose(a.id)} className="text-yellow-600 hover:text-yellow-900">Dispose</button>}
                    <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
