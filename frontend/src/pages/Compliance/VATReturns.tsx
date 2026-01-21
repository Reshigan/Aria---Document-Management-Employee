import { useState, useEffect } from 'react';
import { vatReturnsApi } from '../../services/newPagesApi';

interface VATReturn {
  id: string;
  return_number: string;
  tax_period: string;
  period_start: string;
  period_end: string;
  output_vat: number;
  input_vat: number;
  net_vat: number;
  due_date: string;
  submitted_date?: string;
  status: string;
}

export default function VATReturns() {
  const [returns, setReturns] = useState<VATReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ tax_period: '', period_start: '', period_end: '', output_vat: 0, input_vat: 0, due_date: '' });

  useEffect(() => { fetchReturns(); }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await vatReturnsApi.getAll();
      setReturns(response.data.vat_returns || []);
    } catch (err) { setError('Failed to load VAT returns'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await vatReturnsApi.create({ ...formData, net_vat: formData.output_vat - formData.input_vat });
      setShowForm(false);
      setFormData({ tax_period: '', period_start: '', period_end: '', output_vat: 0, input_vat: 0, due_date: '' });
      fetchReturns();
    } catch (err) { setError('Failed to create VAT return'); }
  };

  const handleFile = async (id: string) => {
    try { await vatReturnsApi.file(id); fetchReturns(); } catch (err) { setError('Failed to file VAT return'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await vatReturnsApi.delete(id); fetchReturns(); } catch (err) { setError('Failed to delete VAT return'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const getStatusColor = (status: string) => {
    switch (status) { case 'filed': return 'bg-green-100 text-green-800'; case 'draft': return 'bg-gray-100 text-gray-800'; case 'overdue': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">VAT Returns</h1><p className="text-gray-600">Manage SARS VAT201 submissions</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Return</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create VAT Return</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tax Period</label><input type="text" placeholder="e.g., 2026/01" value={formData.tax_period} onChange={(e) => setFormData({ ...formData, tax_period: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label><input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label><input type="date" value={formData.period_start} onChange={(e) => setFormData({ ...formData, period_start: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Period End</label><input type="date" value={formData.period_end} onChange={(e) => setFormData({ ...formData, period_end: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Output VAT (Sales)</label><input type="number" step="0.01" value={formData.output_vat} onChange={(e) => setFormData({ ...formData, output_vat: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Input VAT (Purchases)</label><input type="number" step="0.01" value={formData.input_vat} onChange={(e) => setFormData({ ...formData, input_vat: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="col-span-2 bg-gray-50 p-3 rounded-lg"><span className="text-sm text-gray-600">Net VAT: </span><span className="font-bold">{formatCurrency(formData.output_vat - formData.input_vat)}</span><span className="text-sm text-gray-500 ml-2">{formData.output_vat - formData.input_vat > 0 ? '(Payable to SARS)' : '(Refund from SARS)'}</span></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Output VAT</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Input VAT</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net VAT</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {returns.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No VAT returns found.</td></tr>) : (
              returns.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.return_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.tax_period}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.period_start} - {r.period_end}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(r.output_vat)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(r.input_vat)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right"><span className={r.net_vat > 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(r.net_vat)}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.due_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(r.status)}`}>{r.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {r.status === 'draft' && <button onClick={() => handleFile(r.id)} className="text-green-600 hover:text-green-900">File</button>}
                    {r.status === 'draft' && <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-900">Delete</button>}
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
