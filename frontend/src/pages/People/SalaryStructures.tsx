import { useState, useEffect } from 'react';
import { salaryStructuresApi } from '../../services/newPagesApi';

interface SalaryStructure {
  id: string;
  structure_name: string;
  structure_code: string;
  base_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  medical_allowance: number;
  other_allowances: number;
  total_package: number;
  currency: string;
  is_active: boolean;
}

export default function SalaryStructures() {
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ structure_name: '', structure_code: '', base_salary: 0, housing_allowance: 0, transport_allowance: 0, medical_allowance: 0, other_allowances: 0, currency: 'ZAR' });

  useEffect(() => { fetchStructures(); }, []);

  const fetchStructures = async () => {
    try {
      setLoading(true);
      const response = await salaryStructuresApi.getAll();
      setStructures(response.data.salary_structures || []);
    } catch (err) { setError('Failed to load salary structures'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalPackage = formData.base_salary + formData.housing_allowance + formData.transport_allowance + formData.medical_allowance + formData.other_allowances;
    try {
      await salaryStructuresApi.create({ ...formData, total_package: totalPackage });
      setShowForm(false);
      setFormData({ structure_name: '', structure_code: '', base_salary: 0, housing_allowance: 0, transport_allowance: 0, medical_allowance: 0, other_allowances: 0, currency: 'ZAR' });
      fetchStructures();
    } catch (err) { setError('Failed to create salary structure'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await salaryStructuresApi.delete(id); fetchStructures(); } catch (err) { setError('Failed to delete salary structure'); }
  };

  const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Salary Structures</h1><p className="text-gray-600">Manage compensation packages</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Structure</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Salary Structure</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Structure Name</label><input type="text" value={formData.structure_name} onChange={(e) => setFormData({ ...formData, structure_name: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Structure Code</label><input type="text" value={formData.structure_code} onChange={(e) => setFormData({ ...formData, structure_code: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label><input type="number" value={formData.base_salary} onChange={(e) => setFormData({ ...formData, base_salary: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Housing Allowance</label><input type="number" value={formData.housing_allowance} onChange={(e) => setFormData({ ...formData, housing_allowance: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Transport Allowance</label><input type="number" value={formData.transport_allowance} onChange={(e) => setFormData({ ...formData, transport_allowance: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Medical Allowance</label><input type="number" value={formData.medical_allowance} onChange={(e) => setFormData({ ...formData, medical_allowance: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Other Allowances</label><input type="number" value={formData.other_allowances} onChange={(e) => setFormData({ ...formData, other_allowances: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Package</label><input type="number" value={formData.base_salary + formData.housing_allowance + formData.transport_allowance + formData.medical_allowance + formData.other_allowances} className="w-full border rounded-lg px-3 py-2 bg-gray-100" disabled /></div>
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Salary</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Allowances</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Package</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {structures.length === 0 ? (<tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No salary structures found.</td></tr>) : (
              structures.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.structure_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.structure_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(s.base_salary, s.currency)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(s.housing_allowance + s.transport_allowance + s.medical_allowance + s.other_allowances, s.currency)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{formatCurrency(s.total_package, s.currency)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm"><button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-900">Delete</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
