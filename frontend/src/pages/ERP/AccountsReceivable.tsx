import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, FileText, X, DollarSign, RefreshCw, AlertCircle, Users, Clock, CheckCircle, TrendingUp } from 'lucide-react';

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  credit_limit?: number;
  is_active: boolean;
  created_at?: string;
}

interface ARInvoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name?: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  description?: string;
  created_at?: string;
}

interface Payment {
  id: string;
  payment_number: string;
  customer_id: string;
  customer_name?: string;
  payment_date: string;
  payment_method: string;
  amount: number;
  reference?: string;
  status: string;
  created_at?: string;
}

interface AgingBucket {
  customer_id: string;
  customer_name: string;
  current: number;
  days_30: number;
  days_60: number;
  days_90: number;
  over_90: number;
  total: number;
}

export default function AccountsReceivable() {
  const [activeTab, setActiveTab] = useState<'customers' | 'invoices' | 'payments' | 'aging'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<ARInvoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [aging, setAging] = useState<AgingBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showDeleteCustomerDialog, setShowDeleteCustomerDialog] = useState(false);
  const [showCreatePaymentModal, setShowCreatePaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerFormData, setCustomerFormData] = useState<Partial<Customer>>({
    customer_code: '', customer_name: '', contact_person: '', email: '', phone: '', address: '', payment_terms: 'Net 30', credit_limit: 0, is_active: true
  });
  const [paymentFormData, setPaymentFormData] = useState({
    customer_id: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'EFT', amount: 0, reference: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'customers') loadCustomers();
    else if (activeTab === 'invoices') { loadInvoices(); loadCustomers(); }
    else if (activeTab === 'payments') { loadPayments(); loadCustomers(); }
    else if (activeTab === 'aging') loadAging();
  }, [activeTab, searchTerm, statusFilter]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      const response = await api.get('/erp/ar/customers', { params });
      setCustomers(response.data.customers || response.data || []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading customers:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load customers');
    } finally { setLoading(false); }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      const response = await api.get('/erp/ar/invoices', { params });
      setInvoices(response.data.invoices || response.data || []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading invoices:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load invoices');
    } finally { setLoading(false); }
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/ar/payments');
      setPayments(response.data.payments || response.data || []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading payments:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load payments');
    } finally { setLoading(false); }
  };

  const loadAging = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/reports/ar-aging');
      setAging(response.data.aging || response.data || []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading aging report:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load aging report');
    } finally { setLoading(false); }
  };

  const handleCreateCustomer = () => {
    setCustomerFormData({ customer_code: '', customer_name: '', contact_person: '', email: '', phone: '', address: '', payment_terms: 'Net 30', credit_limit: 0, is_active: true });
    setShowCreateCustomerModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerFormData({ ...customer });
    setShowEditCustomerModal(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeleteCustomerDialog(true);
  };

  const confirmDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    try {
      await api.delete(`/erp/ar/customers/${selectedCustomer.id}`);
      loadCustomers();
      setSelectedCustomer(null);
    } catch (err: unknown) {
      console.error('Error deleting customer:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete customer');
    }
  };

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerFormData.customer_code || !customerFormData.customer_name) { setError('Please fill in all required fields'); return; }
    try {
      if (showEditCustomerModal && selectedCustomer) await api.put(`/erp/ar/customers/${selectedCustomer.id}`, customerFormData);
      else await api.post('/erp/ar/customers', customerFormData);
      loadCustomers();
      setShowCreateCustomerModal(false);
      setShowEditCustomerModal(false);
      setSelectedCustomer(null);
      setError(null);
    } catch (err: unknown) {
      console.error('Error saving customer:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save customer');
    }
  };

  const handleCreatePayment = () => {
    setPaymentFormData({ customer_id: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'EFT', amount: 0, reference: '' });
    setShowCreatePaymentModal(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentFormData.customer_id || !paymentFormData.amount) { setError('Please fill in all required fields'); return; }
    try {
      await api.post('/erp/ar/payments', paymentFormData);
      loadPayments();
      setShowCreatePaymentModal(false);
      setError(null);
    } catch (err: unknown) {
      console.error('Error saving payment:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save payment');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      sent: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      paid: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      partial: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
    return styles[status] || styles.draft;
  };

  const stats = {
    totalCustomers: customers.length,
    activeCustomers: customers.filter(c => c.is_active).length,
    totalInvoices: invoices.length,
    totalReceivable: invoices.reduce((sum, inv) => sum + inv.balance, 0),
    overdueInvoices: invoices.filter(inv => inv.status === 'overdue').length,
    totalPayments: payments.reduce((sum, p) => sum + p.amount, 0)
  };

  const renderCustomerModal = (isEdit: boolean) => {
    const isOpen = isEdit ? showEditCustomerModal : showCreateCustomerModal;
    const onClose = () => isEdit ? setShowEditCustomerModal(false) : setShowCreateCustomerModal(false);
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><Users className="h-6 w-6" /></div>
                <div><h2 className="text-xl font-semibold">{isEdit ? 'Edit Customer' : 'Create Customer'}</h2><p className="text-white/80 text-sm">Customer details</p></div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <form onSubmit={handleSubmitCustomer}>
            <div className="p-6 space-y-4">
              {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p></div>)}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Code *</label><input type="text" value={customerFormData.customer_code || ''} onChange={(e) => setCustomerFormData({ ...customerFormData, customer_code: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Terms</label><select value={customerFormData.payment_terms || 'Net 30'} onChange={(e) => setCustomerFormData({ ...customerFormData, payment_terms: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"><option value="Net 30">Net 30</option><option value="Net 60">Net 60</option><option value="Net 90">Net 90</option><option value="COD">Cash on Delivery</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Name *</label><input type="text" value={customerFormData.customer_name || ''} onChange={(e) => setCustomerFormData({ ...customerFormData, customer_name: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Person</label><input type="text" value={customerFormData.contact_person || ''} onChange={(e) => setCustomerFormData({ ...customerFormData, contact_person: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label><input type="tel" value={customerFormData.phone || ''} onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label><input type="email" value={customerFormData.email || ''} onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label><textarea value={customerFormData.address || ''} onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Credit Limit (R)</label><input type="number" min="0" step="0.01" value={customerFormData.credit_limit || 0} onChange={(e) => setCustomerFormData({ ...customerFormData, credit_limit: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" /></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={customerFormData.is_active || false} onChange={(e) => setCustomerFormData({ ...customerFormData, is_active: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span></label>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/30">{isEdit ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderPaymentModal = () => {
    if (!showCreatePaymentModal) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreatePaymentModal(false)}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><DollarSign className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Record Payment</h2><p className="text-white/80 text-sm">Receive customer payment</p></div></div>
              <button onClick={() => setShowCreatePaymentModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <form onSubmit={handleSubmitPayment}>
            <div className="p-6 space-y-4">
              {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p></div>)}
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer *</label><select value={paymentFormData.customer_id} onChange={(e) => setPaymentFormData({ ...paymentFormData, customer_id: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"><option value="">Select customer...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount *</label><input type="number" min="0" step="0.01" value={paymentFormData.amount} onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: parseFloat(e.target.value) || 0 })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label><select value={paymentFormData.payment_method} onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"><option value="EFT">EFT</option><option value="Cheque">Cheque</option><option value="Cash">Cash</option><option value="Card">Card</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Date</label><input type="date" value={paymentFormData.payment_date} onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reference</label><input type="text" value={paymentFormData.reference} onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" /></div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreatePaymentModal(false)} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/30">Record Payment</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const getCreateButton = () => {
    if (activeTab === 'customers') return <button onClick={handleCreateCustomer} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/30"><Plus className="h-5 w-5" />Add Customer</button>;
    if (activeTab === 'payments') return <button onClick={handleCreatePayment} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/30"><Plus className="h-5 w-5" />Record Payment</button>;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Accounts Receivable</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage customers, invoices, and payments</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { if (activeTab === 'customers') loadCustomers(); else if (activeTab === 'invoices') loadInvoices(); else if (activeTab === 'payments') loadPayments(); else loadAging(); }} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            {getCreateButton()}
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30"><Users className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCustomers}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Customers</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30"><FileText className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalInvoices}</p><p className="text-sm text-gray-500 dark:text-gray-400">Open Invoices</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/30"><DollarSign className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">R {Number(stats.totalReceivable ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Receivable</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl shadow-lg shadow-red-500/30"><Clock className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overdueInvoices}</p><p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p></div></div>
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {(['customers', 'invoices', 'payments', 'aging'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 font-medium capitalize transition-all ${activeTab === tab ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>{tab}</button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {activeTab !== 'aging' && (
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" /></div>
                {activeTab === 'invoices' && (<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all min-w-[150px]"><option value="">All Statuses</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="partial">Partial</option></select>)}
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-green-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>
          ) : activeTab === 'customers' ? (
            customers.length === 0 ? (<div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Users className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No customers found</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Get started by adding your first customer</p><button onClick={handleCreateCustomer} className="px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all">Add First Customer</button></div>) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credit Limit</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {customers.map(customer => (
                      <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-green-600 dark:text-green-400">{customer.customer_code}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{customer.customer_name}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{customer.contact_person || '-'}</td>
                        <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">R {(customer.credit_limit || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${customer.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>{customer.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td className="px-6 py-4"><div className="flex items-center justify-end gap-2"><button onClick={() => handleEditCustomer(customer)} className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button><button onClick={() => handleDeleteCustomer(customer)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === 'invoices' ? (
            invoices.length === 0 ? (<div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileText className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No invoices found</h3><p className="text-gray-500 dark:text-gray-400">No AR invoices to display</p></div>) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-green-600 dark:text-green-400">{inv.invoice_number}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{inv.customer_name}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(inv.due_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right text-gray-900 dark:text-white">R {Number(inv.total_amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">R {Number(inv.balance ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(inv.status)}`}>{inv.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === 'payments' ? (
            payments.length === 0 ? (<div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><DollarSign className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No payments found</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Get started by recording your first payment</p><button onClick={handleCreatePayment} className="px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all">Record First Payment</button></div>) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {payments.map(pmt => (
                      <tr key={pmt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-green-600 dark:text-green-400">{pmt.payment_number}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{pmt.customer_name}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(pmt.payment_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{pmt.payment_method}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">R {Number(pmt.amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{pmt.reference || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            aging.length === 0 ? (<div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><TrendingUp className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No aging data</h3><p className="text-gray-500 dark:text-gray-400">No outstanding receivables to display</p></div>) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">1-30 Days</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">31-60 Days</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">61-90 Days</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">90+ Days</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {aging.map(row => (
                      <tr key={row.customer_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{row.customer_name}</td>
                        <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">R {Number(row.current ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">R {Number(row.days_30 ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-right text-amber-600 dark:text-amber-400">R {Number(row.days_60 ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-right text-orange-600 dark:text-orange-400">R {Number(row.days_90 ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-right text-red-600 dark:text-red-400">R {Number(row.over_90 ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">R {Number(row.total ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {renderCustomerModal(false)}
      {renderCustomerModal(true)}
      {renderPaymentModal()}
      <ConfirmDialog isOpen={showDeleteCustomerDialog} onClose={() => setShowDeleteCustomerDialog(false)} onConfirm={confirmDeleteCustomer} title="Delete Customer" message={`Are you sure you want to delete ${selectedCustomer?.customer_name}? This action cannot be undone.`} confirmText="Delete" confirmVariant="danger" />
    </div>
  );
}
