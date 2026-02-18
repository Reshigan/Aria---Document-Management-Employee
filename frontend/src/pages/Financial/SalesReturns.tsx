import { useState, useEffect } from 'react';
import { salesReturnsApi } from '../../services/newPagesApi';
import { RotateCcw, Plus, RefreshCw, AlertCircle, X, DollarSign, Clock, CheckCircle, Package, Eye, ArrowRight } from 'lucide-react';

interface SalesReturn {
  id: string;
  return_number: string;
  customer_id: string;
  customer_name?: string;
  return_date: string;
  reason: string;
  return_type: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  resolution: string;
}

export default function SalesReturns() {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ customer_id: '', reason: '', return_type: 'full', resolution: 'credit_note', notes: '', items: [{ description: '', quantity_returned: 1, unit_price: 0, tax_rate: 15, condition: 'unknown' }] });

  useEffect(() => { fetchReturns(); }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await salesReturnsApi.getAll();
      setReturns(response.data.returns || []);
      setError(null);
    } catch (err) { setError('Failed to load returns'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await salesReturnsApi.create(formData);
      setShowForm(false);
      setFormData({ customer_id: '', reason: '', return_type: 'full', resolution: 'credit_note', notes: '', items: [{ description: '', quantity_returned: 1, unit_price: 0, tax_rate: 15, condition: 'unknown' }] });
      fetchReturns();
    } catch (err) { setError('Failed to create return'); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try { await salesReturnsApi.updateStatus(id, { status }); fetchReturns(); } catch (err) { setError('Failed to update status'); }
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { description: '', quantity_returned: 1, unit_price: 0, tax_rate: 15, condition: 'unknown' }] });
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const items = [...formData.items];
    (items[index] as any)[field] = value;
    setFormData({ ...formData, items });
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount) || 0);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      pending_approval: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      approved: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      received: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
      inspected: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      cancelled: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    };
    return styles[status] || styles.draft;
  };

  const getNextAction = (status: string): { label: string; nextStatus: string } | null => {
    const actions: Record<string, { label: string; nextStatus: string }> = {
      draft: { label: 'Submit', nextStatus: 'pending_approval' },
      pending_approval: { label: 'Approve', nextStatus: 'approved' },
      approved: { label: 'Mark Received', nextStatus: 'received' },
      received: { label: 'Mark Inspected', nextStatus: 'inspected' },
      inspected: { label: 'Complete', nextStatus: 'completed' },
    };
    return actions[status] || null;
  };

  const stats = {
    total: returns.length,
    totalValue: returns.reduce((sum, r) => sum + (r.total_amount || 0), 0),
    open: returns.filter(r => !['completed', 'rejected', 'cancelled'].includes(r.status)).length,
    completed: returns.filter(r => r.status === 'completed').length,
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">Sales Returns</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Manage customer returns and exchanges</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchReturns} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 transition-all"><Plus className="h-5 w-5" />New Return</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl"><RotateCcw className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Returns</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl"><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalValue)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Value</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl"><Clock className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.open}</p><p className="text-xs text-gray-500 dark:text-gray-300">Open</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl"><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.completed}</p><p className="text-xs text-gray-500 dark:text-gray-300">Completed</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><RotateCcw className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Create Sales Return</h2><p className="text-white/80 text-sm">Process customer return</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer ID *</label><input value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Return Type</label><select value={formData.return_type} onChange={(e) => setFormData({ ...formData, return_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"><option value="full">Full Return</option><option value="partial">Partial Return</option><option value="exchange">Exchange</option></select></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason *</label><textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} rows={2} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 resize-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution</label><select value={formData.resolution} onChange={(e) => setFormData({ ...formData, resolution: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"><option value="credit_note">Credit Note</option><option value="refund">Refund</option><option value="exchange">Exchange</option><option value="repair">Repair</option></select></div>
                <div>
                  <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Return Items</label><button type="button" onClick={addItem} className="text-sm text-orange-600 hover:text-orange-700 font-medium">+ Add Item</button></div>
                  {formData.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
                      <div className="col-span-4"><input placeholder="Description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} required className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" /></div>
                      <div className="col-span-2"><input type="number" placeholder="Qty" value={item.quantity_returned} onChange={(e) => updateItem(i, 'quantity_returned', parseInt(e.target.value))} min={1} required className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" /></div>
                      <div className="col-span-3"><input type="number" placeholder="Unit Price" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value))} min={0} step="0.01" required className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" /></div>
                      <div className="col-span-2"><select value={item.condition} onChange={(e) => updateItem(i, 'condition', e.target.value)} className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"><option value="new">New</option><option value="good">Good</option><option value="damaged">Damaged</option><option value="defective">Defective</option><option value="unknown">Unknown</option></select></div>
                      <div className="col-span-1">{formData.items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><X className="h-4 w-4" /></button>}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-amber-700">Create Return</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading returns...</p></div>
          ) : returns.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><RotateCcw className="h-8 w-8 text-gray-300" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No returns</h3><p className="text-gray-500 dark:text-gray-300 mb-6">Create your first sales return</p><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-amber-700">New Return</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Return #</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Customer</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Reason</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Type</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Amount</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Status</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {returns.map((ret) => {
                    const nextAction = getNextAction(ret.status);
                    return (
                      <tr key={ret.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-3 font-semibold text-orange-600 dark:text-orange-400">{ret.return_number}</td>
                        <td className="px-6 py-3 text-gray-900 dark:text-white">{ret.customer_name || ret.customer_id}</td>
                        <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{ret.return_date}</td>
                        <td className="px-6 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate">{ret.reason}</td>
                        <td className="px-6 py-3"><span className="capitalize text-sm text-gray-600 dark:text-gray-300">{ret.return_type}</span></td>
                        <td className="px-6 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(ret.total_amount)}</td>
                        <td className="px-6 py-3"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(ret.status)}`}>{ret.status.replace('_', ' ')}</span></td>
                        <td className="px-6 py-3 text-right">{nextAction && <button onClick={() => handleStatusUpdate(ret.id, nextAction.nextStatus)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-xs font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50"><ArrowRight className="h-3 w-3" />{nextAction.label}</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
