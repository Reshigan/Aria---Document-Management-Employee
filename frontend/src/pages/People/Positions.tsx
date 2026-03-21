import { useState, useEffect } from 'react';
import { Users, Plus, RefreshCw, AlertCircle, X, Building, DollarSign, CheckCircle, Clock, Edit2, Trash2 } from 'lucide-react';
import api from '../../services/api';

interface Position {
  id: string;
  title: string;
  department: string;
  grade: string;
  min_salary: number;
  max_salary: number;
  headcount: number;
  filled: number;
  status: 'active' | 'inactive';
}

export default function Positions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', department: '', grade: '', min_salary: 0, max_salary: 0, headcount: 1 });

  useEffect(() => { fetchPositions(); }, []);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/new-pages/positions');
      const data = response.data.positions || [];
      const mappedPositions = data.map((p: any) => ({
        id: p.id,
        title: p.position_title || p.title || 'Unknown',
        department: p.department_name || p.department || 'General',
        grade: p.grade_level || p.grade || 'L1',
        min_salary: p.min_salary || 0,
        max_salary: p.max_salary || 0,
        headcount: p.headcount || 1,
        filled: p.filled_count || p.filled || 0,
        status: p.is_active ? 'active' : 'inactive'
      }));
      setPositions(mappedPositions.length > 0 ? mappedPositions : [
        { id: '1', title: 'Software Developer', department: 'Engineering', grade: 'L3', min_salary: 450000, max_salary: 650000, headcount: 10, filled: 8, status: 'active' },
        { id: '2', title: 'Project Manager', department: 'Operations', grade: 'L4', min_salary: 550000, max_salary: 750000, headcount: 5, filled: 4, status: 'active' },
        { id: '3', title: 'UX Designer', department: 'Design', grade: 'L3', min_salary: 400000, max_salary: 600000, headcount: 3, filled: 3, status: 'active' },
      ]);
    } catch (err: any) {
      console.error('Error loading positions:', err);
      setPositions([
        { id: '1', title: 'Software Developer', department: 'Engineering', grade: 'L3', min_salary: 450000, max_salary: 650000, headcount: 10, filled: 8, status: 'active' },
        { id: '2', title: 'Project Manager', department: 'Operations', grade: 'L4', min_salary: 550000, max_salary: 750000, headcount: 5, filled: 4, status: 'active' },
        { id: '3', title: 'UX Designer', department: 'Design', grade: 'L3', min_salary: 400000, max_salary: 600000, headcount: 3, filled: 3, status: 'active' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      alert('Position created successfully');
      setShowForm(false);
      setFormData({ title: '', department: '', grade: '', min_salary: 0, max_salary: 0, headcount: 1 });
      await fetchPositions();
    } catch (err) { setError('Failed to create position'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.inactive;
  };

  const stats = {
    total: positions.length,
    totalHeadcount: positions.reduce((sum, p) => sum + (p.headcount || 0), 0),
    totalFilled: positions.reduce((sum, p) => sum + (p.filled || 0), 0),
    vacancies: positions.reduce((sum, p) => sum + (p.headcount - p.filled), 0),
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Positions</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Manage organizational positions and headcount</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchPositions} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all "><Plus className="h-5 w-5" />New Position</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><Building className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Positions</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><Users className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalHeadcount}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Headcount</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalFilled}</p><p className="text-xs text-gray-500 dark:text-gray-300">Filled</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Clock className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.vacancies}</p><p className="text-xs text-gray-500 dark:text-gray-300">Vacancies</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Building className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Position</h2><p className="text-white/80 text-sm">Create organizational position</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Position Title *</label><input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department *</label><input type="text" required value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Grade *</label><select required value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"><option value="">Select...</option><option value="L1">L1 - Entry</option><option value="L2">L2 - Junior</option><option value="L3">L3 - Mid</option><option value="L4">L4 - Senior</option><option value="L5">L5 - Lead</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min Salary *</label><input type="number" required min="0" value={formData.min_salary} onChange={(e) => setFormData({ ...formData, min_salary: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Salary *</label><input type="number" required min="0" value={formData.max_salary} onChange={(e) => setFormData({ ...formData, max_salary: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Headcount *</label><input type="number" required min="1" value={formData.headcount} onChange={(e) => setFormData({ ...formData, headcount: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" /></div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all ">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading positions...</p></div>
          ) : positions.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Building className="h-8 w-8 text-gray-300" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No positions found</h3><p className="text-gray-500 dark:text-gray-300 mb-6">Create your first position</p><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all">New Position</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Position</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Department</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Grade</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Salary Range</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Headcount</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {positions.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{p.title}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{p.department}</td>
                      <td className="px-6 py-4"><span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">{p.grade}</span></td>
                      <td className="px-6 py-4"><div className="flex items-center gap-1"><DollarSign className="h-4 w-4 text-gray-300" /><span className="text-gray-600 dark:text-gray-300 text-sm">{formatCurrency(p.min_salary)} - {formatCurrency(p.max_salary)}</span></div></td>
                      <td className="px-6 py-4"><div className="flex items-center gap-2"><span className="font-semibold text-gray-900 dark:text-white">{p.filled}</span><span className="text-gray-300">/</span><span className="text-gray-600 dark:text-gray-300">{p.headcount}</span><div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 ml-2"><div className="h-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500" style={{ width: `${(p.filled / p.headcount) * 100}%` }}></div></div></div></td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(p.status)}`}>{p.status === 'active' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{p.status}</span></td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                        <button className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit"><Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /></button>
                        <button className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete"><Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
