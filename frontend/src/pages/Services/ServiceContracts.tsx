import { useState, useEffect } from 'react';
import { FileText, Plus, RefreshCw, AlertCircle, X, Clock, CheckCircle, DollarSign, Calendar, RotateCcw, XCircle } from 'lucide-react';
import { serviceContractsApi } from '../../services/newPagesApi';

interface ServiceContract {
  id: string;
  contract_number: string;
  customer_name?: string;
  contract_type: string;
  start_date: string;
  end_date: string;
  contract_value: number;
  billing_frequency: string;
  auto_renew: boolean;
  status: string;
}

export default function ServiceContracts() {
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ customer_id: '', contract_type: 'maintenance', start_date: '', end_date: '', contract_value: 0, billing_frequency: 'monthly', auto_renew: false, terms: '', scope_of_work: '' });

  useEffect(() => { fetchContracts(); }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await serviceContractsApi.getAll();
      setContracts(response.data.service_contracts || []);
    } catch (err) { setError('Failed to load service contracts'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await serviceContractsApi.create(formData);
      setShowForm(false);
      setFormData({ customer_id: '', contract_type: 'maintenance', start_date: '', end_date: '', contract_value: 0, billing_frequency: 'monthly', auto_renew: false, terms: '', scope_of_work: '' });
      fetchContracts();
    } catch (err) { setError('Failed to create service contract'); }
  };

  const handleRenew = async (id: string) => {
    try { await serviceContractsApi.renew(id); fetchContracts(); } catch (err) { setError('Failed to renew contract'); }
  };

  const handleTerminate = async (id: string) => {
    if (!confirm('Are you sure you want to terminate this contract?')) return;
    try { await serviceContractsApi.terminate(id); fetchContracts(); } catch (err) { setError('Failed to terminate contract'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      expired: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      terminated: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.pending;
  };

  const stats = { total: contracts.length, active: contracts.filter(c => c.status === 'active').length, totalValue: contracts.reduce((sum, c) => sum + c.contract_value, 0), expiring: contracts.filter(c => c.status === 'active' && new Date(c.end_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Service Contracts</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Manage customer service agreements</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchContracts} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium hover:from-teal-700 hover:to-cyan-700 transition-all "><Plus className="h-5 w-5" />New Contract</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl "><FileText className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Contracts</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p><p className="text-xs text-gray-500 dark:text-gray-400">Active</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats.totalValue)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Value</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Calendar className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.expiring}</p><p className="text-xs text-gray-500 dark:text-gray-400">Expiring Soon</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"><div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 sticky top-0"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><FileText className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Service Contract</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-4 space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contract Type</label><select value={formData.contract_type} onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"><option value="maintenance">Maintenance</option><option value="support">Support</option><option value="sla">SLA</option><option value="subscription">Subscription</option></select></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contract Value</label><input type="number" required value={formData.contract_value} onChange={(e) => setFormData({ ...formData, contract_value: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label><input type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label><input type="date" required value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Billing Frequency</label><select value={formData.billing_frequency} onChange={(e) => setFormData({ ...formData, billing_frequency: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annually">Annually</option><option value="once_off">Once-off</option></select></div><div className="flex items-center pt-8"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.auto_renew} onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto Renew</span></label></div></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scope of Work</label><textarea value={formData.scope_of_work} onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" /></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium hover:from-teal-700 hover:to-cyan-700 ">Create Contract</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-teal-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>) : contracts.length === 0 ? (<div className="p-12 text-center"><FileText className="h-8 w-8 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No service contracts</h3><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium">New Contract</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Contract #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Customer</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Period</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Value</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Billing</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Auto Renew</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{contracts.map((c) => (<tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-teal-600 dark:text-teal-400">{c.contract_number}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.customer_name || '-'}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">{c.contract_type}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.start_date} - {c.end_date}</td><td className="px-6 py-4 text-right font-semibold text-teal-600 dark:text-teal-400">{formatCurrency(c.contract_value)}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">{c.billing_frequency}</td><td className="px-6 py-4"><span className={`px-3 py-1 rounded-lg text-xs font-medium ${c.auto_renew ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>{c.auto_renew ? 'Yes' : 'No'}</span></td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(c.status)}`}>{c.status === 'active' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{c.status}</span></td><td className="px-6 py-4 text-right space-x-2">{c.status === 'active' && <button onClick={() => handleRenew(c.id)} className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"><RotateCcw className="h-4 w-4 inline mr-1" />Renew</button>}{c.status === 'active' && <button onClick={() => handleTerminate(c.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><XCircle className="h-4 w-4 inline mr-1" />Terminate</button>}</td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
