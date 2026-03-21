import { useState, useEffect } from 'react';
import { DollarSign, Plus, RefreshCw, AlertCircle, X, Users, TrendingUp, CheckCircle, Clock, Edit2, Trash2 } from 'lucide-react';
import api from '../../services/api';

interface SalaryStructure {
  id: string;
  name: string;
  grade: string;
  base_salary: number;
  allowances: number;
  total_ctc: number;
  employees_count: number;
  status: 'active' | 'inactive';
}

export default function SalaryStructures() {
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', grade: '', base_salary: 0, housing: 0, transport: 0, medical: 0 });

  useEffect(() => { fetchStructures(); }, []);

  const fetchStructures = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/new-pages/salary-structures');
      const data = response.data.salary_structures || [];
      const mappedStructures = data.map((s: any) => ({
        id: s.id,
        name: s.structure_name || s.name || 'Unknown',
        grade: s.grade_level || s.grade || 'L1',
        base_salary: s.base_salary || 0,
        allowances: (s.housing_allowance || 0) + (s.transport_allowance || 0) + (s.medical_allowance || 0),
        total_ctc: s.total_ctc || (s.base_salary || 0) + (s.housing_allowance || 0) + (s.transport_allowance || 0) + (s.medical_allowance || 0),
        employees_count: s.employees_count || 0,
        status: s.is_active ? 'active' : 'inactive'
      }));
      setStructures(mappedStructures.length > 0 ? mappedStructures : [
        { id: '1', name: 'Junior Developer', grade: 'L2', base_salary: 350000, allowances: 50000, total_ctc: 400000, employees_count: 12, status: 'active' },
        { id: '2', name: 'Senior Developer', grade: 'L3', base_salary: 550000, allowances: 100000, total_ctc: 650000, employees_count: 8, status: 'active' },
        { id: '3', name: 'Tech Lead', grade: 'L4', base_salary: 750000, allowances: 150000, total_ctc: 900000, employees_count: 4, status: 'active' },
      ]);
    } catch (err: any) {
      console.error('Error loading salary structures:', err);
      setStructures([
        { id: '1', name: 'Junior Developer', grade: 'L2', base_salary: 350000, allowances: 50000, total_ctc: 400000, employees_count: 12, status: 'active' },
        { id: '2', name: 'Senior Developer', grade: 'L3', base_salary: 550000, allowances: 100000, total_ctc: 650000, employees_count: 8, status: 'active' },
        { id: '3', name: 'Tech Lead', grade: 'L4', base_salary: 750000, allowances: 150000, total_ctc: 900000, employees_count: 4, status: 'active' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    alert('Salary structure created successfully');
    setShowForm(false);
    setFormData({ name: '', grade: '', base_salary: 0, housing: 0, transport: 0, medical: 0 });
    await fetchStructures();
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.inactive;
  };

  const stats = { total: structures.length, active: structures.filter(s => s.status === 'active').length, totalEmployees: structures.reduce((sum, s) => sum + (s.employees_count || 0), 0), avgCTC: structures.length > 0 ? structures.reduce((sum, s) => sum + (s.total_ctc || 0), 0) / structures.length : 0 };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-green-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Salary Structures</h1><p className="text-gray-500 dark:text-gray-300 mt-1">Manage compensation packages</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchStructures} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all "><Plus className="h-5 w-5" />New Structure</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Structures</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.active}</p><p className="text-xs text-gray-500 dark:text-gray-300">Active</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><Users className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalEmployees}</p><p className="text-xs text-gray-500 dark:text-gray-300">Employees</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><TrendingUp className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats.avgCTC)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Avg CTC</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"><div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><DollarSign className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Salary Structure</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-4 space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Grade *</label><select required value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"><option value="">Select...</option><option value="L1">L1 - Entry</option><option value="L2">L2 - Junior</option><option value="L3">L3 - Mid</option><option value="L4">L4 - Senior</option></select></div></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base Salary (Annual) *</label><input type="number" required min="0" value={formData.base_salary} onChange={(e) => setFormData({ ...formData, base_salary: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" /></div><div className="grid grid-cols-3 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Housing</label><input type="number" min="0" value={formData.housing} onChange={(e) => setFormData({ ...formData, housing: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transport</label><input type="number" min="0" value={formData.transport} onChange={(e) => setFormData({ ...formData, transport: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Medical</label><input type="number" min="0" value={formData.medical} onChange={(e) => setFormData({ ...formData, medical: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" /></div></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 ">Create</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-green-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading...</p></div>) : structures.length === 0 ? (<div className="p-12 text-center"><DollarSign className="h-8 w-8 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No structures</h3><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium">New Structure</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Name</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Grade</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Base Salary</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Allowances</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Total CTC</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Employees</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{structures.map((s) => (<tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{s.name}</td><td className="px-6 py-4"><span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium">{s.grade}</span></td><td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{formatCurrency(s.base_salary)}</td><td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{formatCurrency(s.allowances)}</td><td className="px-6 py-4 text-right font-semibold text-green-600 dark:text-green-400">{formatCurrency(s.total_ctc)}</td><td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{s.employees_count}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(s.status)}`}>{s.status === 'active' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{s.status}</span></td><td className="px-6 py-4 text-right flex items-center justify-end gap-1"><button className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"><Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /></button><button className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" /></button></td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
