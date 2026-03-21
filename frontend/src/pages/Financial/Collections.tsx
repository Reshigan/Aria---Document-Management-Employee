import { useState, useEffect } from 'react';
import { collectionsApi } from '../../services/newPagesApi';
import { Phone, Plus, RefreshCw, AlertCircle, X, DollarSign, Calendar, Users, Clock, Mail, MapPin, FileText } from 'lucide-react';

interface Collection {
  id: string;
  collection_number: string;
  customer_name?: string;
  contact_date: string;
  contact_method: string;
  contact_person: string;
  amount_outstanding: number;
  promise_to_pay_date?: string;
  promise_to_pay_amount?: number;
  outcome: string;
  follow_up_date?: string;
  assigned_to_name?: string;
  notes?: string;
}

export default function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ customer_id: '', invoice_id: '', contact_date: '', contact_method: 'phone', contact_person: '', amount_outstanding: 0, promise_to_pay_date: '', promise_to_pay_amount: 0, outcome: '', follow_up_date: '', assigned_to: '', notes: '' });

  useEffect(() => { fetchCollections(); }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await collectionsApi.getAll();
      setCollections(response.data.collections || []);
      setError(null);
    } catch (err) { setError('Failed to load collections'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await collectionsApi.create(formData);
      setShowForm(false);
      setFormData({ customer_id: '', invoice_id: '', contact_date: '', contact_method: 'phone', contact_person: '', amount_outstanding: 0, promise_to_pay_date: '', promise_to_pay_amount: 0, outcome: '', follow_up_date: '', assigned_to: '', notes: '' });
      fetchCollections();
    } catch (err) { setError('Failed to create collection record'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount) || 0);

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'visit': return <MapPin className="h-4 w-4" />;
      case 'letter': return <FileText className="h-4 w-4" />;
      default: return <Phone className="h-4 w-4" />;
    }
  };

  const getMethodBadge = (method: string) => {
    const styles: Record<string, string> = {
      phone: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      email: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      visit: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      letter: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
    return styles[method] || styles.phone;
  };

  const stats = {
    total: collections.length,
    totalOutstanding: collections.reduce((sum, c) => sum + (c.amount_outstanding || 0), 0),
    withPromise: collections.filter(c => c.promise_to_pay_date).length,
    followUps: collections.filter(c => c.follow_up_date && new Date(c.follow_up_date) >= new Date()).length,
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Collections</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Track customer collection activities</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchCollections} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700" aria-label="Refresh collections"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-red-700 transition-all "><Plus className="h-5 w-5" />Log Collection</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg" aria-label="Dismiss error"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl "><Phone className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Activities</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalOutstanding)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Outstanding</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><Calendar className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.withPromise}</p><p className="text-xs text-gray-500 dark:text-gray-300">With Promise</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><Clock className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.followUps}</p><p className="text-xs text-gray-500 dark:text-gray-300">Pending Follow-ups</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Phone className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Log Collection Activity</h2><p className="text-white/80 text-sm">Record customer contact</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors" aria-label="Close form"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Date *</label><input type="date" value={formData.contact_date} onChange={(e) => setFormData({ ...formData, contact_date: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" aria-label="Contact date" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Method *</label><select value={formData.contact_method} onChange={(e) => setFormData({ ...formData, contact_method: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" aria-label="Contact method"><option value="phone">Phone</option><option value="email">Email</option><option value="visit">Visit</option><option value="letter">Letter</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Person *</label><input type="text" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" aria-label="Contact person" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount Outstanding *</label><input type="number" value={formData.amount_outstanding} onChange={(e) => setFormData({ ...formData, amount_outstanding: parseFloat(e.target.value) })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" aria-label="Amount outstanding" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Promise to Pay Date</label><input type="date" value={formData.promise_to_pay_date} onChange={(e) => setFormData({ ...formData, promise_to_pay_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" aria-label="Promise to pay date" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Follow-up Date</label><input type="date" value={formData.follow_up_date} onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" aria-label="Follow-up date" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Outcome</label><textarea value={formData.outcome} onChange={(e) => setFormData({ ...formData, outcome: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none" aria-label="Outcome" /></div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-red-700 transition-all ">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading collections...</p></div>
          ) : collections.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Phone className="h-8 w-8 text-gray-300" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No collection records</h3><p className="text-gray-500 dark:text-gray-300 mb-6">Log your first collection activity</p><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-red-700 transition-all">Log Collection</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ref #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Method</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Outstanding</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Promise Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Outcome</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Assigned To</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {collections.map((col) => (
                    <tr key={col.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-orange-600 dark:text-orange-400">{col.collection_number}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{col.customer_name || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{col.contact_date}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getMethodBadge(col.contact_method)}`}>{getMethodIcon(col.contact_method)}{col.contact_method}</span></td>
                      <td className="px-6 py-4 text-right font-semibold text-red-600 dark:text-red-400">{formatCurrency(col.amount_outstanding)}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{col.promise_to_pay_date || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 max-w-xs truncate">{col.outcome || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{col.assigned_to_name || '-'}</td>
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
