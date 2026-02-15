import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, FileText, X, DollarSign, RefreshCw, AlertCircle, Users, Clock, CheckCircle, TrendingUp } from 'lucide-react';

interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  is_active: boolean;
  created_at?: string;
}

interface APInvoice {
  id: string;
  invoice_number: string;
  vendor_id: string;
  vendor_name?: string;
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
  vendor_id: string;
  vendor_name?: string;
  payment_date: string;
  payment_method: string;
  amount: number;
  reference?: string;
  status: string;
  created_at?: string;
}

interface AgingBucket {
  vendor_id: string;
  vendor_name: string;
  current: number;
  days_30: number;
  days_60: number;
  days_90: number;
  over_90: number;
  total: number;
}

export default function AccountsPayable() {
  const [activeTab, setActiveTab] = useState<'vendors' | 'invoices' | 'payments' | 'aging'>('vendors');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [invoices, setInvoices] = useState<APInvoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [aging, setAging] = useState<AgingBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateVendorModal, setShowCreateVendorModal] = useState(false);
  const [showEditVendorModal, setShowEditVendorModal] = useState(false);
  const [showDeleteVendorDialog, setShowDeleteVendorDialog] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showCreatePaymentModal, setShowCreatePaymentModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorFormData, setVendorFormData] = useState<Partial<Vendor>>({
    vendor_code: '', vendor_name: '', contact_person: '', email: '', phone: '', address: '', payment_terms: 'Net 30', is_active: true
  });
  const [invoiceFormData, setInvoiceFormData] = useState({
    invoice_number: '', vendor_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', total_amount: 0, description: ''
  });
  const [paymentFormData, setPaymentFormData] = useState({
    vendor_id: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'EFT', amount: 0, reference: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'vendors') loadVendors();
    else if (activeTab === 'invoices') { loadInvoices(); loadVendors(); }
    else if (activeTab === 'payments') { loadPayments(); loadVendors(); }
    else if (activeTab === 'aging') loadAging();
  }, [activeTab, searchTerm, statusFilter]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      const response = await api.get('/erp/master-data/suppliers', { params });
      const data = response.data?.data || response.data || [];
      setVendors(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading vendors:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load vendors');
    } finally { setLoading(false); }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      const response = await api.get('/ap/invoices', { params });
      const data = response.data?.data || response.data || [];
      setInvoices(Array.isArray(data) ? data : []);
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
      const response = await api.get('/payments');
      const data = response.data?.data || response.data || [];
      setPayments(Array.isArray(data) ? data : []);
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
      const response = await api.get('/reports/ap-aging');
      const data = response.data?.data || response.data || [];
      setAging(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading aging report:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load aging report');
    } finally { setLoading(false); }
  };

  const handleCreateVendor = () => {
    setVendorFormData({ vendor_code: '', vendor_name: '', contact_person: '', email: '', phone: '', address: '', payment_terms: 'Net 30', is_active: true });
    setShowCreateVendorModal(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setVendorFormData({ ...vendor });
    setShowEditVendorModal(true);
  };

  const handleDeleteVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowDeleteVendorDialog(true);
  };

  const confirmDeleteVendor = async () => {
    if (!selectedVendor) return;
    try {
      await api.delete(`/erp/master-data/suppliers/${selectedVendor.id}`);
      loadVendors();
      setSelectedVendor(null);
    } catch (err: unknown) {
      console.error('Error deleting vendor:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete vendor');
    }
  };

  const handleSubmitVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorFormData.vendor_code || !vendorFormData.vendor_name) { setError('Please fill in all required fields'); return; }
    try {
      if (showEditVendorModal && selectedVendor) await api.put(`/erp/master-data/suppliers/${selectedVendor.id}`, vendorFormData);
      else await api.post('/erp/master-data/suppliers', vendorFormData);
      loadVendors();
      setShowCreateVendorModal(false);
      setShowEditVendorModal(false);
      setSelectedVendor(null);
      setError(null);
    } catch (err: unknown) {
      console.error('Error saving vendor:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save vendor');
    }
  };

  const handleCreateInvoice = () => {
    setInvoiceFormData({ invoice_number: '', vendor_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', total_amount: 0, description: '' });
    setShowCreateInvoiceModal(true);
  };

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceFormData.invoice_number || !invoiceFormData.vendor_id) { setError('Please fill in all required fields'); return; }
    try {
      await api.post('/ap/invoices', invoiceFormData);
      loadInvoices();
      setShowCreateInvoiceModal(false);
      setError(null);
    } catch (err: unknown) {
      console.error('Error saving invoice:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save invoice');
    }
  };

  const handleCreatePayment = () => {
    setPaymentFormData({ vendor_id: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'EFT', amount: 0, reference: '' });
    setShowCreatePaymentModal(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentFormData.vendor_id || !paymentFormData.amount) { setError('Please fill in all required fields'); return; }
    try {
      await api.post('/payments', paymentFormData);
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
      approved: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      paid: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.draft;
  };

  const stats = {
    totalVendors: vendors.length,
    activeVendors: vendors.filter(v => v.is_active).length,
    totalInvoices: invoices.length,
    totalOwed: invoices.reduce((sum, inv) => sum + inv.balance, 0),
    overdueInvoices: invoices.filter(inv => inv.status === 'overdue').length,
    totalPayments: payments.reduce((sum, p) => sum + p.amount, 0)
  };

  const renderVendorModal = (isEdit: boolean) => {
    const isOpen = isEdit ? showEditVendorModal : showCreateVendorModal;
    const onClose = () => isEdit ? setShowEditVendorModal(false) : setShowCreateVendorModal(false);
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><Users className="h-6 w-6" /></div>
                <div><h2 className="text-xl font-semibold">{isEdit ? 'Edit Vendor' : 'Create Vendor'}</h2><p className="text-white/80 text-sm">Vendor details</p></div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <form onSubmit={handleSubmitVendor}>
            <div className="p-6 space-y-4">
              {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p></div>)}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vendor Code *</label><input type="text" value={vendorFormData.vendor_code || ''} onChange={(e) => setVendorFormData({ ...vendorFormData, vendor_code: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Terms</label><select value={vendorFormData.payment_terms || 'Net 30'} onChange={(e) => setVendorFormData({ ...vendorFormData, payment_terms: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"><option value="Net 30">Net 30</option><option value="Net 60">Net 60</option><option value="Net 90">Net 90</option><option value="COD">Cash on Delivery</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vendor Name *</label><input type="text" value={vendorFormData.vendor_name || ''} onChange={(e) => setVendorFormData({ ...vendorFormData, vendor_name: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Person</label><input type="text" value={vendorFormData.contact_person || ''} onChange={(e) => setVendorFormData({ ...vendorFormData, contact_person: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label><input type="tel" value={vendorFormData.phone || ''} onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label><input type="email" value={vendorFormData.email || ''} onChange={(e) => setVendorFormData({ ...vendorFormData, email: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label><textarea value={vendorFormData.address || ''} onChange={(e) => setVendorFormData({ ...vendorFormData, address: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none" /></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={vendorFormData.is_active || false} onChange={(e) => setVendorFormData({ ...vendorFormData, is_active: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span></label>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-medium hover:from-red-700 hover:to-rose-700 transition-all shadow-lg shadow-red-500/30">{isEdit ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderInvoiceModal = () => {
    if (!showCreateInvoiceModal) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateInvoiceModal(false)}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><FileText className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Create AP Invoice</h2><p className="text-white/80 text-sm">Record vendor invoice</p></div></div>
              <button onClick={() => setShowCreateInvoiceModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <form onSubmit={handleSubmitInvoice}>
            <div className="p-6 space-y-4">
              {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p></div>)}
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vendor *</label><select value={invoiceFormData.vendor_id} onChange={(e) => setInvoiceFormData({ ...invoiceFormData, vendor_id: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"><option value="">Select vendor...</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Invoice Number *</label><input type="text" value={invoiceFormData.invoice_number} onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoice_number: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount *</label><input type="number" min="0" step="0.01" value={invoiceFormData.total_amount} onChange={(e) => setInvoiceFormData({ ...invoiceFormData, total_amount: parseFloat(e.target.value) || 0 })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Invoice Date</label><input type="date" value={invoiceFormData.invoice_date} onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoice_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label><input type="date" value={invoiceFormData.due_date} onChange={(e) => setInvoiceFormData({ ...invoiceFormData, due_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label><textarea value={invoiceFormData.description} onChange={(e) => setInvoiceFormData({ ...invoiceFormData, description: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none" /></div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateInvoiceModal(false)} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-medium hover:from-red-700 hover:to-rose-700 transition-all shadow-lg shadow-red-500/30">Create Invoice</button>
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
          <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><DollarSign className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Record Payment</h2><p className="text-white/80 text-sm">Pay vendor invoice</p></div></div>
              <button onClick={() => setShowCreatePaymentModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <form onSubmit={handleSubmitPayment}>
            <div className="p-6 space-y-4">
              {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p></div>)}
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vendor *</label><select value={paymentFormData.vendor_id} onChange={(e) => setPaymentFormData({ ...paymentFormData, vendor_id: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"><option value="">Select vendor...</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount *</label><input type="number" min="0" step="0.01" value={paymentFormData.amount} onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: parseFloat(e.target.value) || 0 })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label><select value={paymentFormData.payment_method} onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"><option value="EFT">EFT</option><option value="Cheque">Cheque</option><option value="Cash">Cash</option><option value="Card">Card</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Date</label><input type="date" value={paymentFormData.payment_date} onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reference</label><input type="text" value={paymentFormData.reference} onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" /></div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreatePaymentModal(false)} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-medium hover:from-red-700 hover:to-rose-700 transition-all shadow-lg shadow-red-500/30">Record Payment</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const getCreateButton = () => {
    if (activeTab === 'vendors') return <button onClick={handleCreateVendor} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-medium hover:from-red-700 hover:to-rose-700 transition-all shadow-lg shadow-red-500/30"><Plus className="h-5 w-5" />Add Vendor</button>;
    if (activeTab === 'invoices') return <button onClick={handleCreateInvoice} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-medium hover:from-red-700 hover:to-rose-700 transition-all shadow-lg shadow-red-500/30"><Plus className="h-5 w-5" />New Invoice</button>;
    if (activeTab === 'payments') return <button onClick={handleCreatePayment} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-medium hover:from-red-700 hover:to-rose-700 transition-all shadow-lg shadow-red-500/30"><Plus className="h-5 w-5" />Record Payment</button>;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">Accounts Payable</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage vendors, invoices, and payments</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { if (activeTab === 'vendors') loadVendors(); else if (activeTab === 'invoices') loadInvoices(); else if (activeTab === 'payments') loadPayments(); else loadAging(); }} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            {getCreateButton()}
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl shadow-lg shadow-red-500/30"><Users className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalVendors}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Vendors</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30"><FileText className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalInvoices}</p><p className="text-sm text-gray-500 dark:text-gray-400">Open Invoices</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl shadow-lg shadow-rose-500/30"><DollarSign className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">R {Number(stats.totalOwed ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Owed</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg shadow-red-600/30"><Clock className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overdueInvoices}</p><p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p></div></div>
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {(['vendors', 'invoices', 'payments', 'aging'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 font-medium capitalize transition-all ${activeTab === tab ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>{tab}</button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {activeTab !== 'aging' && (
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" /></div>
                {activeTab === 'invoices' && (<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all min-w-[150px]"><option value="">All Statuses</option><option value="draft">Draft</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select>)}
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-red-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>
          ) : activeTab === 'vendors' ? (
            vendors.length === 0 ? (<div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Users className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No vendors found</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Get started by adding your first vendor</p><button onClick={handleCreateVendor} className="px-5 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-medium hover:from-red-700 hover:to-rose-700 transition-all">Add First Vendor</button></div>) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Terms</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {vendors.map(vendor => (
                      <tr key={vendor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-red-600 dark:text-red-400">{vendor.vendor_code}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{vendor.vendor_name}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{vendor.contact_person || '-'}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{vendor.payment_terms || 'Net 30'}</td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${vendor.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>{vendor.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td className="px-6 py-4"><div className="flex items-center justify-end gap-2"><button onClick={() => handleEditVendor(vendor)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button><button onClick={() => handleDeleteVendor(vendor)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === 'invoices' ? (
            invoices.length === 0 ? (<div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileText className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No invoices found</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Get started by creating your first invoice</p><button onClick={handleCreateInvoice} className="px-5 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-medium hover:from-red-700 hover:to-rose-700 transition-all">Create First Invoice</button></div>) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-red-600 dark:text-red-400">{inv.invoice_number}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{inv.vendor_name}</td>
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
            payments.length === 0 ? (<div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><DollarSign className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No payments found</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Get started by recording your first payment</p><button onClick={handleCreatePayment} className="px-5 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-medium hover:from-red-700 hover:to-rose-700 transition-all">Record First Payment</button></div>) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {payments.map(pmt => (
                      <tr key={pmt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-red-600 dark:text-red-400">{pmt.payment_number}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{pmt.vendor_name}</td>
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
            aging.length === 0 ? (<div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><TrendingUp className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No aging data</h3><p className="text-gray-500 dark:text-gray-400">No outstanding payables to display</p></div>) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">1-30 Days</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">31-60 Days</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">61-90 Days</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">90+ Days</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {aging.map(row => (
                      <tr key={row.vendor_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{row.vendor_name}</td>
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

      {renderVendorModal(false)}
      {renderVendorModal(true)}
      {renderInvoiceModal()}
      {renderPaymentModal()}
      <ConfirmDialog isOpen={showDeleteVendorDialog} onClose={() => setShowDeleteVendorDialog(false)} onConfirm={confirmDeleteVendor} title="Delete Vendor" message={`Are you sure you want to delete ${selectedVendor?.vendor_name}? This action cannot be undone.`} confirmText="Delete" confirmVariant="danger" />
    </div>
  );
}
