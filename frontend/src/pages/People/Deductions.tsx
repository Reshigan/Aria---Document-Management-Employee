import { useState, useEffect } from 'react';
import { deductionsApi } from '../../services/newPagesApi';

interface Deduction {
  id: string;
  deduction_code: string;
  deduction_name: string;
  deduction_type: string;
  calculation_method: string;
  amount: number;
  percentage?: number;
  is_taxable: boolean;
  is_active: boolean;
}

export default function Deductions() {
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ deduction_code: '', deduction_name: '', deduction_type: 'statutory', calculation_method: 'fixed', amount: 0, percentage: 0, is_taxable: false });

  useEffect(() => { fetchDeductions(); }, []);

  const fetchDeductions = async () => {
    try {
      setLoading(true);
      const response = await deductionsApi.getAll();
      setDeductions(response.data.deductions || []);
    } catch (err) { setError('Failed to load deductions'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await deductionsApi.create(formData);
      setShowForm(false);
      setFormData({ deduction_code: '', deduction_name: '', deduction_type: 'statutory', calculation_method: 'fixed', amount: 0, percentage: 0, is_taxable: false });
      fetchDeductions();
    } catch (err) { setError('Failed to create deduction'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await deductionsApi.delete(id); fetchDeductions(); } catch (err) { setError('Failed to delete deduction'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Deductions</h1><p className="text-gray-600">Manage payroll deductions</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Deduction</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Deduction</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Code</label><input type="text" value={formData.deduction_code} onChange={(e) => setFormData({ ...formData, deduction_code: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" value={formData.deduction_name} onChange={(e) => setFormData({ ...formData, deduction_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={formData.deduction_type} onChange={(e) => setFormData({ ...formData, deduction_type: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="statutory">Statutory</option><option value="voluntary">Voluntary</option><option value="loan">Loan</option><option value="garnishment">Garnishment</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Calculation Method</label><select value={formData.calculation_method} onChange={(e) => setFormData({ ...formData, calculation_method: e.target.value })} className="w-full border rounded-lg px-3 py-2"><option value="fixed">Fixed Amount</option><option value="percentage">Percentage</option></select></div>
            {formData.calculation_method === 'fixed' ? (
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount</label><input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            ) : (
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Percentage</label><input type="number" value={formData.percentage} onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            )}
            <div className="flex items-center"><label className="flex items-center"><input type="checkbox" checked={formData.is_taxable} onChange={(e) => setFormData({ ...formData, is_taxable: e.target.checked })} className="mr-2" /><span className="text-sm text-gray-700">Taxable</span></label></div>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount/Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taxable</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {deductions.length === 0 ? (<tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No deductions found.</td></tr>) : (
              deductions.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{d.deduction_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.deduction_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{d.deduction_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{d.calculation_method}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{d.calculation_method === 'percentage' ? `${d.percentage}%` : formatCurrency(d.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${d.is_taxable ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{d.is_taxable ? 'Yes' : 'No'}</span></td>
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
