import { useState, useEffect } from 'react';
import { requisitionsApi } from '../../services/newPagesApi';
import { FileText, Plus, RefreshCw, AlertCircle, X, DollarSign, Clock, CheckCircle, Users, Calendar } from 'lucide-react';

interface Requisition {
  id: string;
  requisition_number: string;
  requester_name?: string;
  department_name?: string;
  requisition_date: string;
  required_date: string;
  description: string;
  total_amount: number;
  status: string;
}

export default function Requisitions() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ requester_id: '', department_id: '', requisition_date: '', required_date: '', description: '', total_amount: 0, priority: 'medium' });

  useEffect(() => { fetchRequisitions(); }, []);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const response = await requisitionsApi.getAll();
      setRequisitions(response.data.requisitions || []);
    } catch (err) { setError('Failed to load requisitions'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requisitionsApi.create(formData);
      setShowForm(false);
      setFormData({ requester_id: '', department_id: '', requisition_date: '', required_date: '', description: '', total_amount: 0, priority: 'medium' });
      fetchRequisitions();
    } catch (err) { setError('Failed to create requisition'); }
  };

  const handleApprove = async (id: string) => {
    try { await requisitionsApi.approve(id); fetchRequisitions(); } catch (err) { setError('Failed to approve requisition'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      converted: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.draft;
  };

  const stats = {
    total: requisitions.length,
    pending: requisitions.filter(r => r.status === 'pending').length,
    approved: requisitions.filter(r => r.status === 'approved').length,
    totalValue: requisitions.reduce((sum, r) => sum + r.total_amount, 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Requisitions</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage purchase requisitions</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchRequisitions} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/30"><Plus className="h-5 w-5" />New Requisition</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg shadow-purple-500/30"><FileText className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Requisitions</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30"><Clock className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p><p className="text-sm text-gray-500 dark:text-gray-400">Pending</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30"><CheckCircle className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p><p className="text-sm text-gray-500 dark:text-gray-400">Approved</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/30"><DollarSign className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalValue)}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><FileText className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Requisition</h2><p className="text-white/80 text-sm">Create a purchase requisition</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Requisition Date *</label><input type="date" required value={formData.requisition_date} onChange={(e) => setFormData({ ...formData, requisition_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Required Date *</label><input type="date" required value={formData.required_date} onChange={(e) => setFormData({ ...formData, required_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority *</label><select required value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estimated Amount</label><input type="number" value={formData.total_amount} onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label><textarea required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" /></div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/30">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading requisitions...</p></div>
          ) : requisitions.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileText className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No requisitions found</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Create your first purchase requisition</p><button onClick={() => setShowForm(true)} className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all">New Requisition</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Req #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requester</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Required By</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {requisitions.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-purple-600 dark:text-purple-400">{r.requisition_number}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{r.requester_name || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.department_name || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.requisition_date}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.required_date}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(r.total_amount)}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(r.status)}`}>{r.status === 'approved' ? <CheckCircle className="h-3.5 w-3.5" /> : r.status === 'pending' ? <Clock className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}{r.status}</span></td>
                      <td className="px-6 py-4 text-right">{r.status === 'pending' && <button onClick={() => handleApprove(r.id)} className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">Approve</button>}</td>
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
