import { useState, useEffect } from 'react';
import { FileText, RefreshCw, AlertCircle, X, DollarSign, Users, Send, Download, Calendar, Clock, CheckCircle } from 'lucide-react';
import api from '../../services/api';

interface Customer {
  id: string;
  name: string;
  email: string;
  outstanding_balance: number;
  overdue_amount: number;
  last_statement_date: string | null;
}

interface Statement {
  id: string;
  customer_id: string;
  customer_name: string;
  statement_date: string;
  opening_balance: number;
  total_invoiced: number;
  total_payments: number;
  closing_balance: number;
  status: 'draft' | 'sent' | 'viewed';
}

export default function CustomerStatements() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [customersRes, statementsRes] = await Promise.all([
        api.get('/customers'),
        api.get('/customer-statements').catch(() => ({ data: [] })),
      ]);
      const cData = customersRes.data?.data || customersRes.data || [];
      setCustomers(Array.isArray(cData) ? cData : []);
      const sData = statementsRes.data?.data || statementsRes.data || [];
      setStatements(Array.isArray(sData) ? sData : []);
    } catch (err) {
      setError('Failed to load data');
      setCustomers([]);
      setStatements([]);
    } finally { setLoading(false); }
  };

  const handleGenerateStatements = async () => {
    if (selectedCustomers.length === 0) return;
    try {
      setLoading(true);
      await api.post('/go-live/statements/generate', {
        customer_ids: selectedCustomers,
        statement_date: statementDate,
      });
      setShowGenerateModal(false);
      setSelectedCustomers([]);
      await fetchData();
    } catch (err) { setError('Failed to generate statements'); } finally { setLoading(false); }
  };

  const handleSendStatement = async (statementId: string) => {
    try {
      await api.post(`/go-live/email/send`, {
        document_type: 'statement',
        document_id: statementId,
      });
      await fetchData();
    } catch (err) { setError('Failed to send statement'); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount) || 0);
  const formatDate = (date: string) => { if (!date) return "-"; const _d = new Date(date); return isNaN(_d.getTime()) ? date : _d.toLocaleDateString("en-ZA"); };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      sent: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      viewed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    };
    return styles[status] || styles.draft;
  };

  const stats = {
    totalCustomers: customers.length,
    totalOutstanding: customers.reduce((sum, c) => sum + c.outstanding_balance, 0),
    totalOverdue: customers.reduce((sum, c) => sum + c.overdue_amount, 0),
    statementsSent: statements.filter(s => s.status === 'sent' || s.status === 'viewed').length,
  };

  const toggleCustomer = (id: string) => {
    setSelectedCustomers(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelectedCustomers(selectedCustomers.length === customers.length ? [] : customers.map(c => c.id));
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Customer Statements</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Generate and send account statements to customers</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setShowGenerateModal(true)} disabled={selectedCustomers.length === 0} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-violet-700 transition-all  disabled:opacity-50 disabled:cursor-not-allowed"><FileText className="h-5 w-5" />Generate Statements ({selectedCustomers.length})</button>
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl "><Users className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalCustomers}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Customers</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalOutstanding)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Outstanding</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl "><Clock className="h-5 w-5 text-white" /></div><div><p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.totalOverdue)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Overdue</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3"><div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><Send className="h-5 w-5 text-white" /></div><div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.statementsSent}</p><p className="text-xs text-gray-500 dark:text-gray-400">Statements Sent</p></div></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Customers</h2>
            <button onClick={selectAll} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">{selectedCustomers.length === customers.length ? 'Deselect All' : 'Select All'}</button>
          </div>
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading customers...</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12"><input type="checkbox" checked={selectedCustomers.length === customers.length} onChange={selectAll} className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500" /></th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outstanding</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Overdue</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Statement</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {customers.map((customer) => (
                    <tr key={customer.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedCustomers.includes(customer.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                      <td className="px-6 py-4"><input type="checkbox" checked={selectedCustomers.includes(customer.id)} onChange={() => toggleCustomer(customer.id)} className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500" /></td>
                      <td className="px-6 py-4"><div className="font-semibold text-gray-900 dark:text-white">{customer.name}</div><div className="text-xs text-gray-500 dark:text-gray-400">{customer.email}</div></td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(customer.outstanding_balance)}</td>
                      <td className="px-6 py-4 text-right"><span className={customer.overdue_amount > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}>{formatCurrency(customer.overdue_amount)}</span></td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{customer.last_statement_date ? formatDate(customer.last_statement_date) : 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Statements</h2></div>
          {statements.length === 0 ? (
            <div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileText className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No statements yet</h3><p className="text-gray-500 dark:text-gray-400">Select customers and generate statements</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Opening</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoiced</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payments</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Closing</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {statements.map((statement) => (
                    <tr key={statement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{statement.customer_name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{formatDate(statement.statement_date)}</td>
                      <td className="px-6 py-4 text-right text-gray-900 dark:text-white">{formatCurrency(statement.opening_balance)}</td>
                      <td className="px-6 py-4 text-right text-blue-600 dark:text-blue-400">{formatCurrency(statement.total_invoiced)}</td>
                      <td className="px-6 py-4 text-right text-green-600 dark:text-green-400">{formatCurrency(statement.total_payments)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(statement.closing_balance)}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(statement.status)}`}>{statement.status === 'viewed' ? <CheckCircle className="h-3.5 w-3.5" /> : statement.status === 'sent' ? <Send className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}{statement.status}</span></td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Download"><Download className="h-4 w-4 text-gray-600 dark:text-gray-400" /></button>
                        {statement.status === 'draft' && <button onClick={() => handleSendStatement(statement.id)} className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Send"><Send className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showGenerateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowGenerateModal(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><FileText className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Generate Statements</h2><p className="text-white/80 text-sm">{selectedCustomers.length} customers selected</p></div></div>
                  <button onClick={() => setShowGenerateModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statement Date</label><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" /></div></div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4"><p className="text-sm text-indigo-700 dark:text-indigo-300">Statements will be generated for {selectedCustomers.length} customers showing all transactions up to {formatDate(statementDate)}.</p></div>
                <div className="flex gap-3 pt-4">
                  <button onClick={handleGenerateStatements} className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-violet-700 transition-all ">Generate & Send</button>
                  <button onClick={() => setShowGenerateModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
