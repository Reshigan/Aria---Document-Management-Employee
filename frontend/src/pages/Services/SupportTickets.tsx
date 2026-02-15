import { useState, useEffect } from 'react';
import { Ticket, Plus, RefreshCw, AlertCircle, X, Clock, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { supportTicketsApi } from '../../services/newPagesApi';

interface SupportTicket {
  id: string;
  ticket_number: string;
  customer_name?: string;
  subject: string;
  category: string;
  priority: string;
  assigned_to_name?: string;
  created_at: string;
  resolved_at?: string;
  status: string;
}

export default function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ customer_id: '', subject: '', description: '', category: 'general', priority: 'medium', assigned_to: '' });

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await supportTicketsApi.getAll();
      setTickets(response.data.support_tickets || []);
    } catch (err) { setError('Failed to load support tickets'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supportTicketsApi.create(formData);
      setShowForm(false);
      setFormData({ customer_id: '', subject: '', description: '', category: 'general', priority: 'medium', assigned_to: '' });
      fetchTickets();
    } catch (err) { setError('Failed to create support ticket'); }
  };

  const handleAssign = async (id: string) => {
    try { await supportTicketsApi.assign(id, { assigned_to: '' }); fetchTickets(); } catch (err) { setError('Failed to assign ticket'); }
  };

  const handleResolve = async (id: string) => {
    try { await supportTicketsApi.resolve(id); fetchTickets(); } catch (err) { setError('Failed to resolve ticket'); }
  };

  const handleClose = async (id: string) => {
    try { await supportTicketsApi.close(id); fetchTickets(); } catch (err) { setError('Failed to close ticket'); }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      closed: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      resolved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      open: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
    return styles[status] || styles.open;
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      low: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    };
    return styles[priority] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  };

  const stats = { total: tickets.length, open: tickets.filter(t => t.status === 'open').length, resolved: tickets.filter(t => t.status === 'resolved').length, critical: tickets.filter(t => t.priority === 'critical').length };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Support Tickets</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Manage customer support requests</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchTickets} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-red-700 transition-all "><Plus className="h-5 w-5" />New Ticket</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl "><Ticket className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Tickets</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Clock className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.open}</p><p className="text-xs text-gray-500 dark:text-gray-400">Open</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.resolved}</p><p className="text-xs text-gray-500 dark:text-gray-400">Resolved</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl "><AlertTriangle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p><p className="text-xs text-gray-500 dark:text-gray-400">Critical</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"><div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 sticky top-0"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Ticket className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Support Ticket</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-4 space-y-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject *</label><input type="text" required value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500" /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"><option value="general">General</option><option value="technical">Technical</option><option value="billing">Billing</option><option value="feature_request">Feature Request</option><option value="bug">Bug Report</option></select></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label><select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label><textarea required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500" /></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-red-700 ">Create Ticket</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>) : tickets.length === 0 ? (<div className="p-12 text-center"><Ticket className="h-8 w-8 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No support tickets</h3><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-medium">New Ticket</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ticket #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Subject</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Customer</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Priority</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Assigned</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Created</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{tickets.map((t) => (<tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-orange-600 dark:text-orange-400">{t.ticket_number}</td><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.subject}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{t.customer_name || '-'}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">{t.category.replace('_', ' ')}</td><td className="px-6 py-4"><span className={`px-3 py-1 rounded-lg text-xs font-medium capitalize ${getPriorityBadge(t.priority)}`}>{t.priority}</span></td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{t.assigned_to_name || '-'}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{t.created_at?.split('T')[0]}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(t.status)}`}>{t.status === 'resolved' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{t.status.replace('_', ' ')}</span></td><td className="px-6 py-4 text-right space-x-2">{t.status === 'open' && <button onClick={() => handleAssign(t.id)} className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"><Users className="h-4 w-4 inline mr-1" />Assign</button>}{(t.status === 'open' || t.status === 'in_progress') && <button onClick={() => handleResolve(t.id)} className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"><CheckCircle className="h-4 w-4 inline mr-1" />Resolve</button>}{t.status === 'resolved' && <button onClick={() => handleClose(t.id)} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Close</button>}</td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
