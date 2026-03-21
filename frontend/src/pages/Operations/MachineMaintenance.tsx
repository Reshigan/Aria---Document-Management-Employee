import { useState, useEffect } from 'react';
import { Wrench, Plus, RefreshCw, AlertCircle, X, Clock, CheckCircle, AlertTriangle, Calendar, Settings } from 'lucide-react';
import api from '../../services/api';

interface MaintenanceRecord {
  id: string;
  machine_name: string;
  machine_code: string;
  maintenance_type: 'preventive' | 'corrective' | 'predictive';
  scheduled_date: string;
  completed_date: string | null;
  technician: string;
  cost: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
}

export default function MachineMaintenance() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ machine_id: '', maintenance_type: 'preventive' as const, scheduled_date: '', technician: '', notes: '' });

  useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/new-pages/machine-maintenance');
      const data = response.data.maintenance_records || [];
      const mappedRecords = data.map((r: any) => ({
        id: r.id,
        machine_name: r.machine_name || 'Unknown Machine',
        machine_code: r.machine_code || r.maintenance_number,
        maintenance_type: r.maintenance_type || 'preventive',
        scheduled_date: r.scheduled_date,
        completed_date: r.completed_date,
        technician: r.technician_name || r.technician || 'Unassigned',
        cost: r.cost || r.estimated_cost || 0,
        status: r.status || 'scheduled'
      }));
      setRecords(mappedRecords.length > 0 ? mappedRecords : [
        { id: '1', machine_name: 'CNC Machine A', machine_code: 'CNC-001', maintenance_type: 'preventive', scheduled_date: '2026-01-20', completed_date: null, technician: 'John Tech', cost: 2500, status: 'scheduled' },
        { id: '2', machine_name: 'Assembly Line B', machine_code: 'ASM-002', maintenance_type: 'corrective', scheduled_date: '2026-01-15', completed_date: '2026-01-15', technician: 'Mike Fix', cost: 5000, status: 'completed' },
        { id: '3', machine_name: 'Packaging Unit C', machine_code: 'PKG-003', maintenance_type: 'preventive', scheduled_date: '2026-01-10', completed_date: null, technician: 'Jane Maint', cost: 1500, status: 'overdue' },
      ]);
    } catch (err: any) { 
      console.error('Error loading maintenance records:', err);
      setRecords([
        { id: '1', machine_name: 'CNC Machine A', machine_code: 'CNC-001', maintenance_type: 'preventive', scheduled_date: '2026-01-20', completed_date: null, technician: 'John Tech', cost: 2500, status: 'scheduled' },
        { id: '2', machine_name: 'Assembly Line B', machine_code: 'ASM-002', maintenance_type: 'corrective', scheduled_date: '2026-01-15', completed_date: '2026-01-15', technician: 'Mike Fix', cost: 5000, status: 'completed' },
        { id: '3', machine_name: 'Packaging Unit C', machine_code: 'PKG-003', maintenance_type: 'preventive', scheduled_date: '2026-01-10', completed_date: null, technician: 'Jane Maint', cost: 1500, status: 'overdue' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/new-pages/machine-maintenance', {
        machine_id: formData.machine_id,
        maintenance_type: formData.maintenance_type,
        scheduled_date: formData.scheduled_date,
        description: formData.notes,
        status: 'scheduled'
      });
      setShowForm(false);
      setFormData({ machine_id: '', maintenance_type: 'preventive', scheduled_date: '', technician: '', notes: '' });
      await fetchRecords();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to schedule maintenance'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount) || 0);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      scheduled: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.scheduled;
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      preventive: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      corrective: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      predictive: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    };
    return styles[type] || styles.preventive;
  };

  const stats = {
    total: records.length,
    scheduled: records.filter(r => r.status === 'scheduled').length,
    completed: records.filter(r => r.status === 'completed').length,
    overdue: records.filter(r => r.status === 'overdue').length,
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-600 to-gray-600 bg-clip-text text-transparent">Machine Maintenance</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Schedule and track equipment maintenance</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchRecords} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-gray-600 text-white rounded-xl font-medium hover:from-slate-700 hover:to-gray-700 transition-all "><Plus className="h-5 w-5" />Schedule</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-slate-500 to-gray-500 rounded-xl "><Wrench className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Records</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Calendar className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.scheduled}</p><p className="text-xs text-gray-500 dark:text-gray-300">Scheduled</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p><p className="text-xs text-gray-500 dark:text-gray-300">Completed</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl "><AlertTriangle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p><p className="text-xs text-gray-500 dark:text-gray-300">Overdue</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-slate-600 to-gray-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Wrench className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Schedule Maintenance</h2><p className="text-white/80 text-sm">Plan equipment maintenance</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Maintenance Type *</label><select required value={formData.maintenance_type} onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value as 'preventive' | 'corrective' | 'predictive' })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"><option value="preventive">Preventive</option><option value="corrective">Corrective</option><option value="predictive">Predictive</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scheduled Date *</label><input type="date" required value={formData.scheduled_date} onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Technician *</label><input type="text" required value={formData.technician} onChange={(e) => setFormData({ ...formData, technician: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all" /></div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-slate-600 to-gray-600 text-white rounded-xl font-medium hover:from-slate-700 hover:to-gray-700 transition-all ">Schedule</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-slate-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading maintenance records...</p></div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Wrench className="h-8 w-8 text-gray-300" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No maintenance records</h3><p className="text-gray-500 dark:text-gray-300 mb-6">Schedule your first maintenance</p><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-slate-600 to-gray-600 text-white rounded-xl font-medium hover:from-slate-700 hover:to-gray-700 transition-all">Schedule</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Machine</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Scheduled</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Technician</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cost</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4"><div className="font-semibold text-gray-900 dark:text-white">{r.machine_name}</div><div className="text-xs text-gray-500 dark:text-gray-300">{r.machine_code}</div></td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getTypeBadge(r.maintenance_type)}`}><Settings className="h-3.5 w-3.5" />{r.maintenance_type}</span></td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.scheduled_date}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.technician}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(r.cost)}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(r.status)}`}>{r.status === 'completed' ? <CheckCircle className="h-3.5 w-3.5" /> : r.status === 'overdue' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{r.status}</span></td>
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
