import { useState, useEffect } from 'react';
import { DollarSign, Plus, RefreshCw, AlertCircle, X, Users, CheckCircle, Clock, Calendar, Edit2, Trash2, Play } from 'lucide-react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface PayrollRun {
  id: number;
  run_code: string;
  period_start: string;
  period_end: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'PAID';
  created_at: string;
}

export default function PayrollRuns() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRun, setEditingRun] = useState<PayrollRun | null>(null);
  const [formData, setFormData] = useState({ run_code: '', period_start: '', period_end: '', status: 'DRAFT' as const });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; code: string }>({ show: false, id: 0, code: '' });

  useEffect(() => { fetchRuns(); }, []);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/payroll/runs');
      setRuns(response.data.runs || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load payroll runs');
    } finally { setLoading(false); }
  };

  const handleCreate = () => {
    setEditingRun(null);
    setFormData({ run_code: '', period_start: '', period_end: '', status: 'DRAFT' });
    setShowForm(true);
  };

  const handleEdit = (run: PayrollRun) => {
    setEditingRun(run);
    setFormData({ run_code: run.run_code, period_start: run.period_start, period_end: run.period_end, status: run.status });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRun) {
        await api.put(`/erp/payroll/runs/${editingRun.id}`, formData);
      } else {
        await api.post('/erp/payroll/runs', formData);
      }
      setShowForm(false);
      fetchRuns();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save payroll run');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/erp/payroll/runs/${id}`);
      fetchRuns();
      setDeleteConfirm({ show: false, id: 0, code: '' });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete payroll run');
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-ZA');

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PAID: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      COMPLETED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      PROCESSING: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      DRAFT: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.DRAFT;
  };

  const stats = { total: runs.length, completed: runs.filter(r => r.status === 'COMPLETED' || r.status === 'PAID').length, totalPaid: runs.filter(r => r.status === 'PAID').reduce((sum, r) => sum + r.total_net, 0), processing: runs.filter(r => r.status === 'PROCESSING').length };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 p-4" data-testid="payroll-runs">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Payroll Runs</h1><p className="text-gray-500 dark:text-gray-400 mt-1">View and manage payroll processing runs</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchRuns} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={handleCreate} data-testid="create-button" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 transition-all "><Plus className="h-5 w-5" />New Payroll Run</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Runs</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p><p className="text-xs text-gray-500 dark:text-gray-400">Completed</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><Users className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats.totalPaid)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Clock className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.processing}</p><p className="text-xs text-gray-500 dark:text-gray-400">Processing</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"><div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><DollarSign className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">{editingRun ? 'Edit Payroll Run' : 'New Payroll Run'}</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-4 space-y-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Run Code *</label><input type="text" required value={formData.run_code} onChange={(e) => setFormData({ ...formData, run_code: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500" /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period Start *</label><input type="date" required value={formData.period_start} onChange={(e) => setFormData({ ...formData, period_start: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period End *</label><input type="date" required value={formData.period_end} onChange={(e) => setFormData({ ...formData, period_end: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500" /></div></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status *</label><select required value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'PAID' })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"><option value="DRAFT">Draft</option><option value="PROCESSING">Processing</option><option value="COMPLETED">Completed</option><option value="PAID">Paid</option></select></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 ">Save</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>) : runs.length === 0 ? (<div className="p-12 text-center"><DollarSign className="h-8 w-8 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No payroll runs</h3><button onClick={handleCreate} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium">New Payroll Run</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full" data-testid="runs-table"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Run Code</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Period</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Employees</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Gross</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Deductions</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Net</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{runs.map((run) => (<tr key={run.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{run.run_code}</td><td className="px-6 py-4"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-gray-600 dark:text-gray-300">{formatDate(run.period_start)} - {formatDate(run.period_end)}</span></div></td><td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{run.employee_count}</td><td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{formatCurrency(run.total_gross)}</td><td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{formatCurrency(run.total_deductions)}</td><td className="px-6 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(run.total_net)}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(run.status)}`}>{run.status === 'PAID' ? <CheckCircle className="h-3.5 w-3.5" /> : run.status === 'PROCESSING' ? <Play className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{run.status.toLowerCase()}</span></td><td className="px-6 py-4 text-right flex items-center justify-end gap-1"><button onClick={() => handleEdit(run)} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"><Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /></button><button onClick={() => setDeleteConfirm({ show: true, id: run.id, code: run.run_code })} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" /></button></td></tr>))}</tbody></table></div>
          )}
        </div>
        <ConfirmDialog isOpen={deleteConfirm.show} title="Delete Payroll Run" message={`Are you sure you want to delete payroll run ${deleteConfirm.code}? This action cannot be undone.`} onConfirm={() => handleDelete(deleteConfirm.id)} onClose={() => setDeleteConfirm({ show: false, id: 0, code: '' })} />
      </div>
    </div>
  );
}
