import { useState, useEffect } from 'react';
import { uifReturnsApi } from '../../services/newPagesApi';

interface UIFReturn {
  id: string;
  return_number: string;
  return_period: string;
  return_year: string;
  total_employees: number;
  total_remuneration: number;
  uif_contribution: number;
  employer_contribution: number;
  total_contribution: number;
  due_date: string;
  submission_date?: string;
  status: string;
}

export default function UIFReturns() {
  const [returns, setReturns] = useState<UIFReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ return_period: '', return_year: new Date().getFullYear().toString(), total_employees: 0, total_remuneration: 0, uif_contribution: 0, employer_contribution: 0, due_date: '' });

  useEffect(() => { fetchReturns(); }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await uifReturnsApi.getAll();
      setReturns(response.data.uif_returns || []);
    } catch (err) { setError('Failed to load UIF returns'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalContribution = formData.uif_contribution + formData.employer_contribution;
    try {
      await uifReturnsApi.create({ ...formData, total_contribution: totalContribution });
      setShowForm(false);
      setFormData({ return_period: '', return_year: new Date().getFullYear().toString(), total_employees: 0, total_remuneration: 0, uif_contribution: 0, employer_contribution: 0, due_date: '' });
      fetchReturns();
    } catch (err) { setError('Failed to create UIF return'); }
  };

  const handleFileReturn = async (id: string) => {
    try { await uifReturnsApi.file(id); fetchReturns(); } catch (err) { setError('Failed to file return'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const getStatusColor = (status: string) => {
    switch (status) { case 'filed': return 'bg-green-100 text-green-800'; case 'draft': return 'bg-gray-100 text-gray-800'; case 'overdue': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">UIF Returns</h1><p className="text-gray-600">Manage Unemployment Insurance Fund submissions</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Return</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create UIF Return</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Return Period</label><select value={formData.return_period} onChange={(e) => setFormData({ ...formData, return_period: e.target.value })} className="w-full border rounded-lg px-3 py-2" required><option value="">Select</option>{['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Return Year</label><input type="text" value={formData.return_year} onChange={(e) => setFormData({ ...formData, return_year: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Employees</label><input type="number" value={formData.total_employees} onChange={(e) => setFormData({ ...formData, total_employees: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Remuneration</label><input type="number" value={formData.total_remuneration} onChange={(e) => setFormData({ ...formData, total_remuneration: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">UIF Contribution (Employee)</label><input type="number" value={formData.uif_contribution} onChange={(e) => setFormData({ ...formData, uif_contribution: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Employer Contribution</label><input type="number" value={formData.employer_contribution} onChange={(e) => setFormData({ ...formData, employer_contribution: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label><input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Employees</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remuneration</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Employee UIF</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Employer UIF</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {returns.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No UIF returns found.</td></tr>) : (
              returns.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.return_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.return_period}/{r.return_year}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{r.total_employees}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(r.total_remuneration)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(r.uif_contribution)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(r.employer_contribution)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{formatCurrency(r.total_contribution)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(r.status)}`}>{r.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">{r.status === 'draft' && <button onClick={() => handleFileReturn(r.id)} className="text-green-600 hover:text-green-900">File</button>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
