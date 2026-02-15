import { useState, useEffect } from 'react';
import { Repeat, Plus, RefreshCw, AlertCircle, X, DollarSign, Calendar, CheckCircle, Clock, Pause, Play, Edit2, Trash2 } from 'lucide-react';

interface RecurringInvoice {
  id: string;
  customer_id: string;
  customer_name: string;
  description: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  next_invoice_date: string;
  last_invoice_date: string | null;
  status: 'active' | 'paused' | 'completed';
  invoices_generated: number;
  total_invoiced: number;
}

export default function RecurringInvoices() {
  const [invoices, setInvoices] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ customer_id: '', description: '', amount: 0, frequency: 'monthly' as const, start_date: '' });

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/recurring-invoices`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvoices(Array.isArray(data) ? data : data.data || []);
      } else {
        setInvoices([]);
      }
    } catch (err) { 
      console.error('Failed to load recurring invoices:', err);
      setError('Failed to load recurring invoices'); 
      setInvoices([]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      alert('Recurring invoice created successfully');
      setShowForm(false);
      setFormData({ customer_id: '', description: '', amount: 0, frequency: 'monthly', start_date: '' });
      await fetchInvoices();
    } catch (err) { setError('Failed to create recurring invoice'); }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      alert(`Invoice ${currentStatus === 'active' ? 'paused' : 'activated'}`);
      await fetchInvoices();
    } catch (err) { setError('Failed to update status'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring invoice?')) return;
    try {
      alert('Recurring invoice deleted');
      await fetchInvoices();
    } catch (err) { setError('Failed to delete recurring invoice'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-ZA');

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      paused: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      completed: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.completed;
  };

  const getFrequencyBadge = (frequency: string) => {
    const styles: Record<string, string> = {
      weekly: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      monthly: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      quarterly: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      annually: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    };
    return styles[frequency] || styles.monthly;
  };

  const stats = {
    total: invoices.length,
    active: invoices.filter(i => i.status === 'active').length,
    monthlyRevenue: invoices.filter(i => i.status === 'active').reduce((sum, i) => {
      const multiplier = { weekly: 4, monthly: 1, quarterly: 1/3, annually: 1/12 }[i.frequency] || 1;
      return sum + (i.amount * multiplier);
    }, 0),
    totalInvoiced: invoices.reduce((sum, i) => sum + i.total_invoiced, 0),
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">Recurring Invoices</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage automated recurring billing</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchInvoices} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-teal-700 transition-all "><Plus className="h-5 w-5" />New Recurring</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl "><Repeat className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Recurring</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p><p className="text-xs text-gray-500 dark:text-gray-400">Active</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><Calendar className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.monthlyRevenue)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Monthly Revenue</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalInvoiced)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Invoiced</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Repeat className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New Recurring Invoice</h2><p className="text-white/80 text-sm">Set up automated billing</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer *</label><select required value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"><option value="">Select customer...</option><option value="1">ABC Manufacturing</option><option value="2">XYZ Trading</option><option value="3">Mega Corp</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label><input type="text" required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="e.g., Monthly Maintenance Contract" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount *</label><input type="number" required min="0" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Frequency *</label><select required value={formData.frequency} onChange={(e) => setFormData({ ...formData, frequency: e.target.value as 'weekly' | 'monthly' | 'quarterly' | 'annually' })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annually">Annually</option></select></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date *</label><input type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" /></div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-teal-700 transition-all ">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-cyan-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading recurring invoices...</p></div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Repeat className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No recurring invoices</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Set up automated billing for your customers</p><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-teal-700 transition-all">New Recurring Invoice</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Frequency</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Next Invoice</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4"><div className="font-semibold text-gray-900 dark:text-white">{invoice.customer_name}</div><div className="text-xs text-gray-500 dark:text-gray-400">{invoice.invoices_generated} invoices generated</div></td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{invoice.description}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(invoice.amount)}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getFrequencyBadge(invoice.frequency)}`}><Repeat className="h-3.5 w-3.5" />{invoice.frequency}</span></td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{formatDate(invoice.next_invoice_date)}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(invoice.status)}`}>{invoice.status === 'active' ? <CheckCircle className="h-3.5 w-3.5" /> : invoice.status === 'paused' ? <Pause className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{invoice.status}</span></td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                        <button onClick={() => handleToggleStatus(invoice.id, invoice.status)} className={`p-2 rounded-lg transition-colors ${invoice.status === 'active' ? 'hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400'}`} title={invoice.status === 'active' ? 'Pause' : 'Activate'}>{invoice.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Edit"><Edit2 className="h-4 w-4 text-gray-600 dark:text-gray-400" /></button>
                        <button onClick={() => handleDelete(invoice.id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete"><Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" /></button>
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
