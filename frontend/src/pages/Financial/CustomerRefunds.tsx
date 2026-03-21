import { useState, useEffect } from 'react';
import { customerRefundsApi } from '../../services/newPagesApi';
import { Banknote, Plus, RefreshCw, AlertCircle, X, DollarSign, Clock, CheckCircle, ArrowRight } from 'lucide-react';

interface Refund {
  id: string;
  refund_number: string;
  customer_id: string;
  customer_name?: string;
  refund_date: string;
  refund_method: string;
  amount: number;
  currency: string;
  status: string;
  reference?: string;
  reason?: string;
  transaction_reference?: string;
}

export default function CustomerRefunds() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ customer_id: '', amount: 0, refund_method: 'bank_transfer', reason: '', reference: '', notes: '' });

  useEffect(() => { fetchRefunds(); }, []);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const response = await customerRefundsApi.getAll();
      setRefunds(response.data.refunds || []);
      setError(null);
    } catch (err) { setError('Failed to load refunds'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await customerRefundsApi.create(formData);
      setShowForm(false);
      setFormData({ customer_id: '', amount: 0, refund_method: 'bank_transfer', reason: '', reference: '', notes: '' });
      fetchRefunds();
    } catch (err) { setError('Failed to create refund'); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try { await customerRefundsApi.updateStatus(id, { status }); fetchRefunds(); } catch (err) { setError('Failed to update status'); }
  };

  const handleProcess = async (id: string) => {
    try { await customerRefundsApi.process(id); fetchRefunds(); } catch (err) { setError('Failed to process refund'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount) || 0);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      approved: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      processing: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      cancelled: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    };
    return styles[status] || styles.pending;
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = { bank_transfer: 'Bank Transfer', credit_card: 'Credit Card', cash: 'Cash', store_credit: 'Store Credit', offset: 'Offset' };
    return labels[method] || method;
  };

  const stats = {
    total: refunds.length,
    totalRefunded: refunds.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.amount || 0), 0),
    pending: refunds.filter(r => ['pending', 'approved', 'processing'].includes(r.status)).length,
    completed: refunds.filter(r => r.status === 'completed').length,
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Customer Refunds</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Process and track customer refunds</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchRefunds} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 transition-all"><Plus className="h-5 w-5" />New Refund</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl"><Banknote className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Refunds</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl"><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalRefunded)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Refunded</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl"><Clock className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.pending}</p><p className="text-xs text-gray-500 dark:text-gray-300">Pending</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl"><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.completed}</p><p className="text-xs text-gray-500 dark:text-gray-300">Completed</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Banknote className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Create Refund</h2><p className="text-white/80 text-sm">Process customer refund</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer ID *</label><input value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label><input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} min={0.01} step="0.01" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Refund Method</label><select value={formData.refund_method} onChange={(e) => setFormData({ ...formData, refund_method: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"><option value="bank_transfer">Bank Transfer</option><option value="credit_card">Credit Card</option><option value="cash">Cash</option><option value="store_credit">Store Credit</option><option value="offset">Offset Against Invoice</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference</label><input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label><textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 resize-none" /></div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700">Create Refund</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading refunds...</p></div>
          ) : refunds.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Banknote className="h-8 w-8 text-gray-300" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No refunds</h3><p className="text-gray-500 dark:text-gray-300 mb-6">Create your first customer refund</p><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700">New Refund</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Refund #</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Customer</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Method</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Amount</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Status</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {refunds.map((ref) => (
                    <tr key={ref.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{ref.refund_number}</td>
                      <td className="px-6 py-3 text-gray-900 dark:text-white">{ref.customer_name || ref.customer_id}</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{ref.refund_date}</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{getMethodLabel(ref.refund_method)}</td>
                      <td className="px-6 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(ref.amount)}</td>
                      <td className="px-6 py-3"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(ref.status)}`}>{ref.status}</span></td>
                      <td className="px-6 py-3 text-right flex justify-end gap-1">
                        {ref.status === 'pending' && <button onClick={() => handleStatusUpdate(ref.id, 'approved')} className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-200">Approve</button>}
                        {ref.status === 'approved' && <button onClick={() => handleProcess(ref.id)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium hover:bg-emerald-200"><ArrowRight className="h-3 w-3" />Process</button>}
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
