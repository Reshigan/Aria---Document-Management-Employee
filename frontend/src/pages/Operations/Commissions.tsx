import { useState, useEffect } from 'react';
import { commissionsApi } from '../../services/newPagesApi';

interface Commission {
  id: string;
  salesperson_name?: string;
  period_start: string;
  period_end: string;
  sales_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  paid_date?: string;
}

export default function Commissions() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ salesperson_id: '', period_start: '', period_end: '', sales_amount: 0, commission_rate: 5, commission_amount: 0 });

  useEffect(() => { fetchCommissions(); }, []);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const response = await commissionsApi.getAll();
      setCommissions(response.data.commissions || []);
    } catch (err) { setError('Failed to load commissions'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const commissionAmount = (formData.sales_amount * formData.commission_rate) / 100;
    try {
      await commissionsApi.create({ ...formData, commission_amount: commissionAmount });
      setShowForm(false);
      setFormData({ salesperson_id: '', period_start: '', period_end: '', sales_amount: 0, commission_rate: 5, commission_amount: 0 });
      fetchCommissions();
    } catch (err) { setError('Failed to create commission'); }
  };

  const handleApprove = async (id: string) => {
    try { await commissionsApi.approve(id); fetchCommissions(); } catch (err) { setError('Failed to approve commission'); }
  };

  const handlePay = async (id: string) => {
    try { await commissionsApi.pay(id); fetchCommissions(); } catch (err) { setError('Failed to mark as paid'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const getStatusColor = (status: string) => {
    switch (status) { case 'paid': return 'bg-green-100 text-green-800'; case 'approved': return 'bg-blue-100 text-blue-800'; case 'pending': return 'bg-yellow-100 text-yellow-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Commissions</h1><p className="text-gray-600">Manage sales commissions</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Commission</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Commission</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label><input type="date" value={formData.period_start} onChange={(e) => setFormData({ ...formData, period_start: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Period End</label><input type="date" value={formData.period_end} onChange={(e) => setFormData({ ...formData, period_end: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Sales Amount</label><input type="number" value={formData.sales_amount} onChange={(e) => setFormData({ ...formData, sales_amount: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label><input type="number" value={formData.commission_rate} onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Commission Amount</label><input type="number" value={(formData.sales_amount * formData.commission_rate) / 100} className="w-full border rounded-lg px-3 py-2 bg-gray-100" disabled /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salesperson</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commission</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {commissions.length === 0 ? (<tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No commissions found.</td></tr>) : (
              commissions.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.salesperson_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.period_start} - {c.period_end}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(c.sales_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{c.commission_rate}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{formatCurrency(c.commission_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(c.status)}`}>{c.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {c.status === 'pending' && <button onClick={() => handleApprove(c.id)} className="text-blue-600 hover:text-blue-900">Approve</button>}
                    {c.status === 'approved' && <button onClick={() => handlePay(c.id)} className="text-green-600 hover:text-green-900">Mark Paid</button>}
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
