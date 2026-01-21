import { useState, useEffect } from 'react';
import { salesTargetsApi } from '../../services/newPagesApi';

interface SalesTarget {
  id: string;
  target_name: string;
  salesperson_name?: string;
  target_type: string;
  target_amount: number;
  achieved_amount: number;
  period_start: string;
  period_end: string;
  status: string;
}

export default function SalesTargets() {
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ target_name: '', salesperson_id: '', target_type: 'revenue', target_amount: 0, period_start: '', period_end: '' });

  useEffect(() => { fetchTargets(); }, []);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const response = await salesTargetsApi.getAll();
      setTargets(response.data.sales_targets || []);
    } catch (err) { setError('Failed to load sales targets'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await salesTargetsApi.create(formData);
      setShowForm(false);
      setFormData({ target_name: '', salesperson_id: '', target_type: 'revenue', target_amount: 0, period_start: '', period_end: '' });
      fetchTargets();
    } catch (err) { setError('Failed to create sales target'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const getProgress = (achieved: number, target: number) => target > 0 ? Math.min((achieved / target) * 100, 100) : 0;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Sales Targets</h1><p className="text-gray-600">Track sales performance against targets</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Target</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Sales Target</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Target Name</label><input type="text" value={formData.target_name} onChange={(e) => setFormData({ ...formData, target_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Target Type</label><select value={formData.target_type} onChange={(e) => setFormData({ ...formData, target_type: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="revenue">Revenue</option><option value="units">Units</option><option value="orders">Orders</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Target Amount</label><input type="number" value={formData.target_amount} onChange={(e) => setFormData({ ...formData, target_amount: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label><input type="date" value={formData.period_start} onChange={(e) => setFormData({ ...formData, period_start: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Period End</label><input type="date" value={formData.period_end} onChange={(e) => setFormData({ ...formData, period_end: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salesperson</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Target</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Achieved</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {targets.length === 0 ? (<tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No sales targets found.</td></tr>) : (
              targets.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.target_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.salesperson_name || 'All'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{t.target_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.period_start} - {t.period_end}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{t.target_type === 'revenue' ? formatCurrency(t.target_amount) : t.target_amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{t.target_type === 'revenue' ? formatCurrency(t.achieved_amount) : t.achieved_amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${getProgress(t.achieved_amount, t.target_amount) >= 100 ? 'bg-green-600' : getProgress(t.achieved_amount, t.target_amount) >= 75 ? 'bg-blue-600' : 'bg-yellow-600'}`} style={{ width: `${getProgress(t.achieved_amount, t.target_amount)}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-500">{getProgress(t.achieved_amount, t.target_amount).toFixed(0)}%</span>
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
