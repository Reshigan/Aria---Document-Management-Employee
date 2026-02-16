import { useState, useEffect } from 'react';
import { History, RefreshCw, AlertCircle, X, Download, Search, Plus, Edit, Trash2, LogIn, LogOut, Filter } from 'lucide-react';
import api from '../../services/api';

interface AuditEntry {
  id: string;
  timestamp: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  old_values?: string;
  new_values?: string;
  ip_address?: string;
}

export default function AuditTrail() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ entity_type: '', action: '', date_from: '', date_to: '' });

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await api.get('/go-live/audit-trail');
      const data = response.data?.data || response.data || {};
      setEntries(data.audit_entries || []);
    } catch (err) { setError('Failed to load audit trail'); } finally { setLoading(false); }
  };

  const handleFilter = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.action) params.append('action', filters.action);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      const response = await api.get(`/go-live/audit-trail?${params.toString()}`);
      const data = response.data?.data || response.data || {};
      setEntries(data.audit_entries || []);
    } catch (err) { setError('Failed to filter audit trail'); } finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.action) params.append('action', filters.action);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      const response = await api.get(`/go-live/audit-trail?${params.toString()}`);
      const data = response.data?.data || response.data || {};
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (err) { setError('Failed to export audit trail'); }
  };

  const getActionBadge = (action: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      create: { bg: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800', icon: <Plus className="h-3.5 w-3.5" /> },
      update: { bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', icon: <Edit className="h-3.5 w-3.5" /> },
      delete: { bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800', icon: <Trash2 className="h-3.5 w-3.5" /> },
      login: { bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800', icon: <LogIn className="h-3.5 w-3.5" /> },
      logout: { bg: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600', icon: <LogOut className="h-3.5 w-3.5" /> },
    };
    return styles[action] || styles.logout;
  };

  const stats = { total: entries.length, creates: entries.filter(e => e.action === 'create').length, updates: entries.filter(e => e.action === 'update').length, deletes: entries.filter(e => e.action === 'delete').length };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-slate-600 to-gray-600 bg-clip-text text-transparent">Audit Trail</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Track all system activities and changes</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchEntries} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all "><Download className="h-5 w-5" />Export</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-slate-500 to-gray-500 rounded-xl "><History className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Entries</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><Plus className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.creates}</p><p className="text-xs text-gray-500 dark:text-gray-400">Creates</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><Edit className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.updates}</p><p className="text-xs text-gray-500 dark:text-gray-400">Updates</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl "><Trash2 className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.deletes}</p><p className="text-xs text-gray-500 dark:text-gray-400">Deletes</p></div></div></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-4"><Filter className="h-5 w-5 text-gray-500" /><h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Entity Type</label><select value={filters.entity_type} onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"><option value="">All Types</option><option value="customer">Customer</option><option value="invoice">Invoice</option><option value="purchase_order">Purchase Order</option><option value="employee">Employee</option><option value="product">Product</option><option value="user">User</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action</label><select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500"><option value="">All Actions</option><option value="create">Create</option><option value="update">Update</option><option value="delete">Delete</option><option value="login">Login</option><option value="logout">Logout</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date From</label><input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date To</label><input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500" /></div>
            <div className="flex items-end"><button onClick={handleFilter} className="w-full px-4 py-2 bg-gradient-to-r from-slate-600 to-gray-600 text-white rounded-xl font-medium hover:from-slate-700 hover:to-gray-700 transition-all  flex items-center justify-center gap-2"><Search className="h-5 w-5" />Filter</button></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-slate-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>) : entries.length === 0 ? (<div className="p-12 text-center"><History className="h-8 w-8 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No audit entries</h3><p className="text-gray-500 dark:text-gray-400">System activities will appear here</p></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Timestamp</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Action</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Entity Type</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Entity</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">IP Address</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Changes</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{entries.map((e) => { const badge = getActionBadge(e.action); return (<tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(e.timestamp).toLocaleString()}</td><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{e.user_name || '-'}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${badge.bg}`}>{badge.icon}{e.action}</span></td><td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">{e.entity_type.replace('_', ' ')}</td><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{e.entity_name || e.entity_id}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-mono text-sm">{e.ip_address || '-'}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300 max-w-xs truncate text-sm">{e.new_values ? JSON.stringify(JSON.parse(e.new_values)).substring(0, 50) + '...' : '-'}</td></tr>); })}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
