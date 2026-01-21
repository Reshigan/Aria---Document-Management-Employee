import { useState, useEffect } from 'react';
import { positionsApi } from '../../services/newPagesApi';

interface Position {
  id: string;
  position_code: string;
  position_title: string;
  department_name?: string;
  grade_level?: string;
  min_salary: number;
  max_salary: number;
  is_active: boolean;
  headcount: number;
  filled_count: number;
}

export default function Positions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ position_code: '', position_title: '', department_id: '', grade_level: '', min_salary: 0, max_salary: 0, job_description: '', requirements: '' });

  useEffect(() => { fetchPositions(); }, []);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const response = await positionsApi.getAll();
      setPositions(response.data.positions || []);
    } catch (err) { setError('Failed to load positions'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await positionsApi.create(formData);
      setShowForm(false);
      setFormData({ position_code: '', position_title: '', department_id: '', grade_level: '', min_salary: 0, max_salary: 0, job_description: '', requirements: '' });
      fetchPositions();
    } catch (err) { setError('Failed to create position'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await positionsApi.delete(id); fetchPositions(); } catch (err) { setError('Failed to delete position'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Positions</h1><p className="text-gray-600">Manage organizational positions</p></div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ New Position</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Position</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Position Code</label><input type="text" value={formData.position_code} onChange={(e) => setFormData({ ...formData, position_code: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Position Title</label><input type="text" value={formData.position_title} onChange={(e) => setFormData({ ...formData, position_title: e.target.value })} className="w-full border rounded-lg px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label><input type="text" value={formData.grade_level} onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Min Salary</label><input type="number" value={formData.min_salary} onChange={(e) => setFormData({ ...formData, min_salary: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Salary</label><input type="number" value={formData.max_salary} onChange={(e) => setFormData({ ...formData, max_salary: parseFloat(e.target.value) })} className="w-full border rounded-lg px-3 py-2" /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label><textarea value={formData.job_description} onChange={(e) => setFormData({ ...formData, job_description: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={3} /></div>
            <div className="col-span-2 flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button><button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Salary Range</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Headcount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {positions.length === 0 ? (<tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No positions found.</td></tr>) : (
              positions.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.position_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.position_title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.department_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.grade_level || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(p.min_salary)} - {formatCurrency(p.max_salary)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{p.filled_count}/{p.headcount}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm"><button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900">Delete</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
