import { useState, useEffect } from 'react';
import { cashForecastsApi } from '../../services/newPagesApi';

interface CashForecast {
  id: string;
  forecast_name: string;
  forecast_date: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  projected_inflows: number;
  projected_outflows: number;
  closing_balance: number;
  status: string;
}

export default function CashForecast() {
  const [forecasts, setForecasts] = useState<CashForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ forecast_name: '', forecast_date: '', period_start: '', period_end: '', opening_balance: 0, projected_inflows: 0, projected_outflows: 0, closing_balance: 0, notes: '' });

  useEffect(() => { fetchForecasts(); }, []);

  const fetchForecasts = async () => {
    try {
      setLoading(true);
      const response = await cashForecastsApi.getAll();
      setForecasts(response.data.cash_forecasts || []);
    } catch (err) { setError('Failed to load cash forecasts'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const closingBalance = formData.opening_balance + formData.projected_inflows - formData.projected_outflows;
    try {
      await cashForecastsApi.create({ ...formData, closing_balance: closingBalance });
      setShowForm(false);
      setFormData({ forecast_name: '', forecast_date: '', period_start: '', period_end: '', opening_balance: 0, projected_inflows: 0, projected_outflows: 0, closing_balance: 0, notes: '' });
      fetchForecasts();
    } catch (err) { setError('Failed to create cash forecast'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const getStatusColor = (status: string) => {
    switch (status) { case 'approved': return 'bg-green-100 text-green-800'; case 'draft': return 'bg-gray-100 text-gray-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Cash Forecast</h1><p className="text-gray-600">Project future cash flows and balances</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Forecast</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Cash Forecast</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Forecast Name</label><input type="text" value={formData.forecast_name} onChange={(e) => setFormData({ ...formData, forecast_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Forecast Date</label><input type="date" value={formData.forecast_date} onChange={(e) => setFormData({ ...formData, forecast_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label><input type="date" value={formData.period_start} onChange={(e) => setFormData({ ...formData, period_start: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Period End</label><input type="date" value={formData.period_end} onChange={(e) => setFormData({ ...formData, period_end: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label><input type="number" value={formData.opening_balance} onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Projected Inflows</label><input type="number" value={formData.projected_inflows} onChange={(e) => setFormData({ ...formData, projected_inflows: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Projected Outflows</label><input type="number" value={formData.projected_outflows} onChange={(e) => setFormData({ ...formData, projected_outflows: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Closing Balance (Calculated)</label><input type="number" value={formData.opening_balance + formData.projected_inflows - formData.projected_outflows} className="w-full border rounded-lg px-3 py-2 bg-gray-100" disabled /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Opening</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Inflows</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outflows</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Closing</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {forecasts.length === 0 ? (<tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No cash forecasts found.</td></tr>) : (
              forecasts.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{f.forecast_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{f.period_start} to {f.period_end}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(f.opening_balance)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">+{formatCurrency(f.projected_inflows)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">-{formatCurrency(f.projected_outflows)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{formatCurrency(f.closing_balance)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(f.status)}`}>{f.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
