import { useState, useEffect } from 'react';
import { FileText, Plus, RefreshCw, AlertCircle, X, DollarSign, CheckCircle, Clock, Calendar, Edit2, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface TaxFiling {
  id: number;
  filing_code: string;
  tax_type: 'PAYE' | 'UIF' | 'SDL' | 'VAT';
  period_start: string;
  period_end: string;
  amount: number;
  status: 'PENDING' | 'SUBMITTED' | 'PAID';
  due_date: string;
  created_at: string;
}

export default function TaxFilings() {
  const [filings, setFilings] = useState<TaxFiling[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFiling, setEditingFiling] = useState<TaxFiling | null>(null);
  const [formData, setFormData] = useState({
    filing_code: '',
    tax_type: 'PAYE' as 'PAYE' | 'UIF' | 'SDL' | 'VAT',
    period_start: '',
    period_end: '',
    amount: '',
    due_date: '',
    status: 'PENDING' as 'PENDING' | 'SUBMITTED' | 'PAID'
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; code: string }>({
    show: false,
    id: 0,
    code: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadFilings(); }, []);

  const loadFilings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/payroll/tax-filings');
      setFilings(response.data.filings || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load tax filings');
    } finally { setLoading(false); }
  };

  const handleCreate = () => {
    setEditingFiling(null);
    setFormData({ filing_code: '', tax_type: 'PAYE', period_start: '', period_end: '', amount: '', due_date: '', status: 'PENDING' });
    setShowForm(true);
  };

  const handleEdit = (filing: TaxFiling) => {
    setEditingFiling(filing);
    setFormData({ filing_code: filing.filing_code, tax_type: filing.tax_type, period_start: filing.period_start, period_end: filing.period_end, amount: filing.amount.toString(), due_date: filing.due_date, status: filing.status });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, amount: parseFloat(formData.amount) || 0 };
      if (editingFiling) {
        await api.put(`/erp/payroll/tax-filings/${editingFiling.id}`, payload);
      } else {
        await api.post('/erp/payroll/tax-filings', payload);
      }
      setShowForm(false);
      loadFilings();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save tax filing');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/erp/payroll/tax-filings/${id}`);
      loadFilings();
      setDeleteConfirm({ show: false, id: 0, code: '' });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete tax filing');
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-ZA');

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PAID: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      SUBMITTED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      PENDING: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
    return styles[status] || styles.PENDING;
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      PAYE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      UIF: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      SDL: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      VAT: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    };
    return styles[type] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  };

  const stats = { paye: filings.filter(f => f.tax_type === 'PAYE').reduce((sum, f) => sum + f.amount, 0), uif: filings.filter(f => f.tax_type === 'UIF').reduce((sum, f) => sum + f.amount, 0), sdl: filings.filter(f => f.tax_type === 'SDL').reduce((sum, f) => sum + f.amount, 0), pending: filings.filter(f => f.status === 'PENDING').length };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4" data-testid="payroll-tax">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Tax Filings</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Manage PAYE, UIF, SDL, and VAT tax filings</p></div>
          <div className="flex items-center gap-3">
            <button onClick={loadFilings} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={handleCreate} data-testid="create-button" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all "><Plus className="h-5 w-5" />New Tax Filing</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><FileText className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(stats.paye)}</p><p className="text-xs text-gray-500 dark:text-gray-400">PAYE</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.uif)}</p><p className="text-xs text-gray-500 dark:text-gray-400">UIF</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats.sdl)}</p><p className="text-xs text-gray-500 dark:text-gray-400">SDL</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><Clock className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.pending}</p><p className="text-xs text-gray-500 dark:text-gray-400">Pending</p></div></div></div>
        </div>
        {showForm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"><div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 sticky top-0"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><FileText className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">{editingFiling ? 'Edit Tax Filing' : 'New Tax Filing'}</h2></div></div><button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-4 space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filing Code *</label><input type="text" required value={formData.filing_code} onChange={(e) => setFormData({ ...formData, filing_code: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tax Type *</label><select required value={formData.tax_type} onChange={(e) => setFormData({ ...formData, tax_type: e.target.value as 'PAYE' | 'UIF' | 'SDL' | 'VAT' })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"><option value="PAYE">PAYE</option><option value="UIF">UIF</option><option value="SDL">SDL</option><option value="VAT">VAT</option></select></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period Start *</label><input type="date" required value={formData.period_start} onChange={(e) => setFormData({ ...formData, period_start: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period End *</label><input type="date" required value={formData.period_end} onChange={(e) => setFormData({ ...formData, period_end: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount *</label><input type="number" step="0.01" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date *</label><input type="date" required value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" /></div></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status *</label><select required value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'PENDING' | 'SUBMITTED' | 'PAID' })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"><option value="PENDING">Pending</option><option value="SUBMITTED">Submitted</option><option value="PAID">Paid</option></select></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 ">Save</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>) : filings.length === 0 ? (<div className="p-12 text-center"><FileText className="h-8 w-8 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No tax filings</h3><button onClick={handleCreate} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium">New Tax Filing</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full" data-testid="filings-table"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Filing Code</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tax Type</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Period</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Due Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{filings.map((filing) => (<tr key={filing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{filing.filing_code}</td><td className="px-6 py-4"><span className={`px-3 py-1 rounded-lg text-xs font-medium ${getTypeBadge(filing.tax_type)}`}>{filing.tax_type}</span></td><td className="px-6 py-4"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-gray-600 dark:text-gray-300">{formatDate(filing.period_start)} - {formatDate(filing.period_end)}</span></div></td><td className="px-6 py-4 text-right font-semibold text-indigo-600 dark:text-indigo-400">{formatCurrency(filing.amount)}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{formatDate(filing.due_date)}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(filing.status)}`}>{filing.status === 'PAID' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{filing.status.toLowerCase()}</span></td><td className="px-6 py-4 text-right flex items-center justify-end gap-1"><button onClick={() => handleEdit(filing)} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"><Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /></button><button onClick={() => setDeleteConfirm({ show: true, id: filing.id, code: filing.filing_code })} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" /></button></td></tr>))}</tbody></table></div>
          )}
        </div>
        <ConfirmDialog isOpen={deleteConfirm.show} title="Delete Tax Filing" message={`Are you sure you want to delete tax filing ${deleteConfirm.code}? This action cannot be undone.`} onConfirm={() => handleDelete(deleteConfirm.id)} onClose={() => setDeleteConfirm({ show: false, id: 0, code: '' })} />
      </div>
    </div>
  );
}
