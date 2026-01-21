import { useState, useEffect } from 'react';
import { productionPlansApi } from '../../services/newPagesApi';

interface ProductionPlan {
  id: string;
  plan_number: string;
  plan_name: string;
  product_name?: string;
  planned_quantity: number;
  actual_quantity: number;
  start_date: string;
  end_date: string;
  status: string;
}

export default function ProductionPlanning() {
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ plan_name: '', product_id: '', planned_quantity: 0, start_date: '', end_date: '', notes: '' });

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await productionPlansApi.getAll();
      setPlans(response.data.production_plans || []);
    } catch (err) { setError('Failed to load production plans'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await productionPlansApi.create(formData);
      setShowForm(false);
      setFormData({ plan_name: '', product_id: '', planned_quantity: 0, start_date: '', end_date: '', notes: '' });
      fetchPlans();
    } catch (err) { setError('Failed to create production plan'); }
  };

  const handleStart = async (id: string) => {
    try { await productionPlansApi.start(id); fetchPlans(); } catch (err) { setError('Failed to start production'); }
  };

  const handleComplete = async (id: string) => {
    try { await productionPlansApi.complete(id); fetchPlans(); } catch (err) { setError('Failed to complete production'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'completed': return 'bg-green-100 text-green-800'; case 'in_progress': return 'bg-blue-100 text-blue-800'; case 'planned': return 'bg-yellow-100 text-yellow-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  const getProgress = (actual: number, planned: number) => planned > 0 ? Math.min((actual / planned) * 100, 100) : 0;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Production Planning</h1><p className="text-gray-600">Manage manufacturing production plans</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Plan</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Production Plan</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label><input type="text" value={formData.plan_name} onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Planned Quantity</label><input type="number" value={formData.planned_quantity} onChange={(e) => setFormData({ ...formData, planned_quantity: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label><input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">End Date</label><input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Planned</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {plans.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No production plans found.</td></tr>) : (
              plans.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.plan_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.plan_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.product_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.start_date} - {p.end_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{p.planned_quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{p.actual_quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${getProgress(p.actual_quantity, p.planned_quantity) >= 100 ? 'bg-green-600' : 'bg-blue-600'}`} style={{ width: `${getProgress(p.actual_quantity, p.planned_quantity)}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-500">{getProgress(p.actual_quantity, p.planned_quantity).toFixed(0)}%</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(p.status)}`}>{p.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {p.status === 'planned' && <button onClick={() => handleStart(p.id)} className="text-blue-600 hover:text-blue-900">Start</button>}
                    {p.status === 'in_progress' && <button onClick={() => handleComplete(p.id)} className="text-green-600 hover:text-green-900">Complete</button>}
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
