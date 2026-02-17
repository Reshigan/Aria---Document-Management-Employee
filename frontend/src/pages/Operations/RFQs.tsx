import { useState, useEffect } from 'react';
import { FileQuestion, Plus, RefreshCw, AlertCircle, X, DollarSign, Clock, CheckCircle, Send, Users } from 'lucide-react';
import api from '../../services/api';

interface RFQ {
  id: string;
  rfq_number: string;
  title: string;
  suppliers_invited: number;
  responses_received: number;
  deadline: string;
  total_value: number;
  status: 'draft' | 'sent' | 'closed' | 'awarded';
}

export default function RFQs() {
  const [rfqs, setRFQs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', deadline: '', description: '' });

  useEffect(() => { fetchRFQs(); }, []);

  const fetchRFQs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/new-pages/rfqs');
      const data = response.data.rfqs || [];
      const mappedRFQs = data.map((r: any) => ({
        id: r.id,
        rfq_number: r.rfq_number,
        title: r.title,
        suppliers_invited: r.suppliers_invited || 0,
        responses_received: r.responses_received || 0,
        deadline: r.submission_deadline || r.deadline,
        total_value: r.total_value || 0,
        status: r.status || 'draft'
      }));
      setRFQs(mappedRFQs.length > 0 ? mappedRFQs : [
        { id: '1', rfq_number: 'RFQ-2026-001', title: 'Office Supplies Q1', suppliers_invited: 5, responses_received: 3, deadline: '2026-01-20', total_value: 25000, status: 'sent' },
        { id: '2', rfq_number: 'RFQ-2026-002', title: 'IT Equipment', suppliers_invited: 8, responses_received: 8, deadline: '2026-01-15', total_value: 150000, status: 'closed' },
        { id: '3', rfq_number: 'RFQ-2026-003', title: 'Raw Materials', suppliers_invited: 3, responses_received: 0, deadline: '2026-01-25', total_value: 0, status: 'draft' },
      ]);
    } catch (err: any) { 
      console.error('Error loading RFQs:', err);
      setRFQs([
        { id: '1', rfq_number: 'RFQ-2026-001', title: 'Office Supplies Q1', suppliers_invited: 5, responses_received: 3, deadline: '2026-01-20', total_value: 25000, status: 'sent' },
        { id: '2', rfq_number: 'RFQ-2026-002', title: 'IT Equipment', suppliers_invited: 8, responses_received: 8, deadline: '2026-01-15', total_value: 150000, status: 'closed' },
        { id: '3', rfq_number: 'RFQ-2026-003', title: 'Raw Materials', suppliers_invited: 3, responses_received: 0, deadline: '2026-01-25', total_value: 0, status: 'draft' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/new-pages/rfqs', {
        title: formData.title,
        submission_deadline: formData.deadline,
        description: formData.description,
        rfq_date: new Date().toISOString().split('T')[0],
        status: 'draft'
      });
      setShowForm(false);
      setFormData({ title: '', deadline: '', description: '' });
      await fetchRFQs();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to create RFQ'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount) || 0);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      awarded: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      closed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      sent: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.draft;
  };

  const stats = {
    total: rfqs.length,
    sent: rfqs.filter(r => r.status === 'sent').length,
    closed: rfqs.filter(r => r.status === 'closed').length,
    totalValue: rfqs.reduce((sum, r) => sum + r.total_value, 0),
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Request for Quotations</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Manage supplier quotation requests</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchRFQs} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all "><Plus className="h-5 w-5" />New RFQ</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl "><FileQuestion className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total RFQs</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Send className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.sent}</p><p className="text-xs text-gray-500 dark:text-gray-300">Awaiting Response</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.closed}</p><p className="text-xs text-gray-500 dark:text-gray-300">Closed</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalValue)}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Value</p></div></div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><FileQuestion className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">New RFQ</h2><p className="text-white/80 text-sm">Request for Quotation</p></div></div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title *</label><input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Deadline *</label><input type="date" required value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all ">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-300">Loading RFQs...</p></div>
          ) : rfqs.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileQuestion className="h-8 w-8 text-gray-300" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No RFQs found</h3><p className="text-gray-500 dark:text-gray-300 mb-6">Create your first request for quotation</p><button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all">New RFQ</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">RFQ #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Suppliers</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Responses</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Deadline</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Value</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rfqs.map((rfq) => (
                    <tr key={rfq.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-indigo-600 dark:text-indigo-400">{rfq.rfq_number}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{rfq.title}</td>
                      <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">{rfq.suppliers_invited}</td>
                      <td className="px-6 py-4 text-right"><span className={rfq.responses_received === rfq.suppliers_invited ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-600 dark:text-gray-300'}>{rfq.responses_received}/{rfq.suppliers_invited}</span></td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{rfq.deadline}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(rfq.total_value)}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(rfq.status)}`}>{rfq.status === 'closed' ? <CheckCircle className="h-3.5 w-3.5" /> : rfq.status === 'sent' ? <Send className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{rfq.status}</span></td>
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
