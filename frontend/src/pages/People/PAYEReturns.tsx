import { useState, useEffect } from 'react';
import { payeReturnsApi } from '../../services/newPagesApi';

interface PAYEReturn {
  id: string;
  return_number: string;
  tax_period: string;
  tax_year: string;
  total_employees: number;
  gross_remuneration: number;
  paye_deducted: number;
  uif_employee: number;
  uif_employer: number;
  sdl_amount: number;
  total_liability: number;
  due_date: string;
  submission_date?: string;
  status: string;
}

export default function PAYEReturns() {
  const [returns, setReturns] = useState<PAYEReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ tax_period: '', tax_year: new Date().getFullYear().toString(), total_employees: 0, gross_remuneration: 0, paye_deducted: 0, uif_employee: 0, uif_employer: 0, sdl_amount: 0, due_date: '' });

  useEffect(() => { fetchReturns(); }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await payeReturnsApi.getAll();
      setReturns(response.data.paye_returns || []);
    } catch (err) { setError('Failed to load PAYE returns'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalLiability = formData.paye_deducted + formData.uif_employee + formData.uif_employer + formData.sdl_amount;
    try {
      await payeReturnsApi.create({ ...formData, total_liability: totalLiability });
      setShowForm(false);
      setFormData({ tax_period: '', tax_year: new Date().getFullYear().toString(), total_employees: 0, gross_remuneration: 0, paye_deducted: 0, uif_employee: 0, uif_employer: 0, sdl_amount: 0, due_date: '' });
      fetchReturns();
    } catch (err) { setError('Failed to create PAYE return'); }
  };

  const handleFileReturn = async (id: string) => {
    try { await payeReturnsApi.file(id); fetchReturns(); } catch (err) { setError('Failed to file return'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const getStatusColor = (status: string) => {
    switch (status) { case 'filed': return 'bg-green-100 text-green-800'; case 'draft': return 'bg-gray-100 text-gray-800'; case 'overdue': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">PAYE Returns</h1><p className="text-gray-600">Manage SARS PAYE submissions (EMP201)</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Return</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create PAYE Return</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tax Period</label><select value={formData.tax_period} onChange={(e) => setFormData({ ...formData, tax_period: e.target.value })} className="w-full border rounded-lg px-3 py-2" required><option value="">Select</option>{['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tax Year</label><input type="text" value={formData.tax_year} onChange={(e) => setFormData({ ...formData, tax_year: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label><input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Employees</label><input type="number" value={formData.total_employees} onChange={(e) => setFormData({ ...formData, total_employees: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Gross Remuneration</label><input type="number" value={formData.gross_remuneration} onChange={(e) => setFormData({ ...formData, gross_remuneration: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">PAYE Deducted</label><input type="number" value={formData.paye_deducted} onChange={(e) => setFormData({ ...formData, paye_deducted: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">UIF (Employee)</label><input type="number" value={formData.uif_employee} onChange={(e) => setFormData({ ...formData, uif_employee: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">UIF (Employer)</label><input type="number" value={formData.uif_employer} onChange={(e) => setFormData({ ...formData, uif_employer: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">SDL Amount</label><input type="number" value={formData.sdl_amount} onChange={(e) => setFormData({ ...formData, sdl_amount: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div className="col-span-3 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">PAYE</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Liability</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {returns.length === 0 ? (<tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No PAYE returns found.</td></tr>) : (
              returns.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.return_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.tax_period}/{r.tax_year}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{r.total_employees}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(r.gross_remuneration)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(r.paye_deducted)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{formatCurrency(r.total_liability)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.due_date}</td>
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
