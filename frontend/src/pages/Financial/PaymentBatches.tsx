import { useState, useEffect } from 'react';
import { paymentBatchesApi } from '../../services/newPagesApi';
import { Layers, Plus, RefreshCw, AlertCircle, X, DollarSign, Clock, CheckCircle, Send, CreditCard } from 'lucide-react';

interface PaymentBatch {
  id: string;
  batch_number: string;
  batch_date: string;
  bank_account_name?: string;
  payment_method: string;
  total_amount: number;
  payment_count: number;
  status: string;
  approved_at?: string;
  processed_at?: string;
}

export default function PaymentBatches() {
  const [batches, setBatches] = useState<PaymentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ batch_date: '', bank_account_id: '', payment_method: 'eft', notes: '' });

  useEffect(() => { fetchBatches(); }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await paymentBatchesApi.getAll();
      setBatches(response.data.payment_batches || []);
      setError(null);
    } catch (err) { setError('Failed to load payment batches'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await paymentBatchesApi.create(formData);
      setShowForm(false);
      setFormData({ batch_date: '', bank_account_id: '', payment_method: 'eft', notes: '' });
      fetchBatches();
    } catch (err) { setError('Failed to create payment batch'); }
  };

  const handleApprove = async (id: string) => {
    try { await paymentBatchesApi.approve(id); fetchBatches(); } catch (err) { setError('Failed to approve batch'); }
  };

  const handleProcess = async (id: string) => {
    try { await paymentBatchesApi.process(id); fetchBatches(); } catch (err) { setError('Failed to process batch'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount) || 0);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      processed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      approved: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.draft;
  };

  const getStatusIcon = (status: string) => {
    switch (status) { case 'processed': return <CheckCircle className="h-3.5 w-3.5" />; case 'approved': return <Send className="h-3.5 w-3.5" />; default: return <Clock className="h-3.5 w-3.5" />; }
  };

  const stats = {
    total: batches.length,
    totalAmount: batches.reduce((sum, b) => sum + b.total_amount, 0),
    totalPayments: batches.reduce((sum, b) => sum + b.payment_count, 0),
    processed: batches.filter(b => b.status === 'processed').length,
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Payment Batches</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Manage supplier payment batches</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchBatches} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-violet-700 transition-all "><Plus className="h-5 w-5" />New Batch</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl "><Layers className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Batches</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalAmount)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Value</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><CreditCard className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalPayments}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Payments</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.processed}</p><p className="text-xs text-gray-500 dark:text-gray-300">Processed</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Layers className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Create Payment Batch</h2><p className="text-white/80 text-sm">Group payments for processing</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Batch Date *</label><input type="date" value={formData.batch_date} onChange={(e) => setFormData({ ...formData, batch_date: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method *</label><select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"><option value="eft">EFT</option><option value="cheque">Cheque</option><option value="cash">Cash</option></select></div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-violet-700 transition-all ">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading payment batches...</p></div>
          ) : batches.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Layers className="h-8 w-8 text-gray-300" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No payment batches</h3><p className="text-gray-500 dark:text-gray-300 mb-6">Create your first payment batch</p><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-violet-700 transition-all">New Batch</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Batch #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bank Account</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Method</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Payments</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-indigo-600 dark:text-indigo-400">{batch.batch_number}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{batch.batch_date}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{batch.bank_account_name || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 uppercase">{batch.payment_method}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(batch.total_amount)}</td>
                      <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">{batch.payment_count}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(batch.status)}`}>{getStatusIcon(batch.status)}{batch.status}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {batch.status === 'draft' && <button onClick={() => handleApprove(batch.id)} className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">Approve</button>}
                          {batch.status === 'approved' && <button onClick={() => handleProcess(batch.id)} className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">Process</button>}
                        </div>
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
