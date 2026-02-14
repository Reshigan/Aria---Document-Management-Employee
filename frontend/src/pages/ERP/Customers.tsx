import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, Eye, FileText, DollarSign, TrendingUp, X, Users, RefreshCw, AlertCircle, CheckCircle, Building2 } from 'lucide-react';

interface Customer {
  id: string;
  code: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  tax_number?: string;
  payment_terms?: string;
  credit_limit?: number;
  parent_customer_id?: string;
  parent_customer_name?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface CustomerTransaction {
  id: string;
  type: 'quote' | 'sales_order' | 'delivery' | 'invoice' | 'payment';
  number: string;
  date: string;
  amount: number;
  status: string;
}

interface CustomerStats {
  total_quotes: number;
  total_orders: number;
  total_invoices: number;
  total_revenue: number;
  outstanding_balance: number;
  last_order_date?: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<CustomerTransaction[]>([]);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'South Africa',
    tax_number: '',
    payment_terms: 'Net 30',
    credit_limit: 0,
    is_active: true
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/order-to-cash/customers');
      const data = response.data?.data || response.data || [];
      setCustomers(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to load customers:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerDetails = async (customerId: string) => {
    try {
      // Load transactions from sales orders, quotes, and invoices for this customer
      const [ordersRes, quotesRes, invoicesRes] = await Promise.all([
        api.get('/erp/order-to-cash/sales-orders', { params: { customer_id: customerId } }).catch(() => ({ data: [] })),
        api.get('/erp/order-to-cash/quotes', { params: { customer_id: customerId } }).catch(() => ({ data: [] })),
        api.get('/ar/invoices', { params: { customer_id: customerId } }).catch(() => ({ data: [] }))
      ]);
      
      const orders = (ordersRes.data?.data || ordersRes.data || []).map((o: { id: string; order_number: string; order_date: string; total_amount: number; status: string }) => ({
        id: o.id, type: 'sales_order' as const, number: o.order_number, date: o.order_date, amount: o.total_amount, status: o.status
      }));
      const quotes = (quotesRes.data?.data || quotesRes.data || []).map((q: { id: string; quote_number: string; quote_date: string; total_amount: number; status: string }) => ({
        id: q.id, type: 'quote' as const, number: q.quote_number, date: q.quote_date, amount: q.total_amount, status: q.status
      }));
      const invoices = (invoicesRes.data?.data || invoicesRes.data || []).map((i: { id: string; invoice_number: string; invoice_date: string; total_amount: number; status: string }) => ({
        id: i.id, type: 'invoice' as const, number: i.invoice_number, date: i.invoice_date, amount: i.total_amount, status: i.status
      }));
      
      setCustomerTransactions([...orders, ...quotes, ...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      
      // Calculate stats from the loaded data
      const totalRevenue = invoices.filter((i: { status: string }) => i.status === 'paid').reduce((sum: number, i: { amount: number }) => sum + i.amount, 0);
      const outstandingBalance = invoices.filter((i: { status: string }) => i.status !== 'paid').reduce((sum: number, i: { amount: number }) => sum + i.amount, 0);
      setCustomerStats({
        total_quotes: quotes.length,
        total_orders: orders.length,
        total_invoices: invoices.length,
        total_revenue: totalRevenue,
        outstanding_balance: outstandingBalance,
        last_order_date: orders.length > 0 ? orders[0].date : undefined
      });
    } catch (err) {
      console.error('Failed to load customer details:', err);
      setCustomerTransactions([]);
      setCustomerStats(null);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '', email: '', phone: '', address: '', city: '', postal_code: '',
      country: 'South Africa', tax_number: '', payment_terms: 'Net 30', credit_limit: 0, is_active: true
    });
    setShowCreateModal(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(customer);
    setShowEditModal(true);
  };

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeleteDialog(true);
  };

  const handleViewDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
    await loadCustomerDetails(customer.id);
  };

  const confirmDelete = async () => {
    if (!selectedCustomer) return;
    try {
      await api.delete(`/erp/order-to-cash/customers/${selectedCustomer.id}`);
      setShowDeleteDialog(false);
      setSelectedCustomer(null);
      loadCustomers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete customer');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.name || !formData.email) {
        setError('Customer name and email are required');
        return;
      }
      if (showEditModal && selectedCustomer) {
        await api.put(`/api/erp/order-to-cash/customers/${selectedCustomer.id}`, formData);
      } else {
        await api.post('/erp/order-to-cash/customers', formData);
      }
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedCustomer(null);
      setError(null);
      loadCustomers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save customer');
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.code && customer.code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && customer.is_active) ||
      (statusFilter === 'inactive' && !customer.is_active);
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.is_active).length,
    inactive: customers.filter(c => !c.is_active).length,
    totalCredit: customers.reduce((sum, c) => sum + (c.credit_limit || 0), 0)
  };

  const renderFormModal = (isEdit: boolean) => {
    const isOpen = isEdit ? showEditModal : showCreateModal;
    const onClose = () => isEdit ? setShowEditModal(false) : setShowCreateModal(false);
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><Users className="h-6 w-6" /></div>
                <div>
                  <h2 className="text-xl font-semibold">{isEdit ? 'Edit Customer' : 'Create Customer'}</h2>
                  <p className="text-white/80 text-sm">Fill in the customer details</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xs">1</span>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Name *</label>
                    <input type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" placeholder="Enter customer name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address *</label>
                    <input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" placeholder="customer@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                    <input type="tel" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" placeholder="+27 11 123 4567" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">VAT/Tax Number</label>
                    <input type="text" value={formData.tax_number || ''} onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" placeholder="4123456789" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xs">2</span>
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Street Address</label>
                    <input type="text" value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" placeholder="123 Main Street" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                    <input type="text" value={formData.city || ''} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" placeholder="Johannesburg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Postal Code</label>
                    <input type="text" value={formData.postal_code || ''} onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" placeholder="2000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country</label>
                    <input type="text" value={formData.country || ''} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" placeholder="South Africa" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xs">3</span>
                  Payment Terms
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Terms</label>
                    <select value={formData.payment_terms || 'Net 30'} onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all">
                      <option value="COD">Cash on Delivery</option>
                      <option value="Net 7">Net 7 Days</option>
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days</option>
                      <option value="Net 60">Net 60 Days</option>
                      <option value="Net 90">Net 90 Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Credit Limit (R)</label>
                    <input type="number" value={formData.credit_limit || 0} onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" placeholder="0.00" step="0.01" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={formData.is_active ?? true} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Customer</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/30">{isEdit ? 'Update Customer' : 'Create Customer'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!selectedCustomer || !showDetailModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{selectedCustomer.name}</h2>
                <p className="text-white/80 text-sm">{selectedCustomer.code}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {customerStats && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Quotes</div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{customerStats.total_quotes}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium">Total Orders</div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">{customerStats.total_orders}</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                  <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Total Invoices</div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">{customerStats.total_invoices}</div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                  <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Total Revenue</div>
                  <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">R {customerStats.total_revenue.toLocaleString()}</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                  <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">Outstanding</div>
                  <div className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">R {customerStats.outstanding_balance.toLocaleString()}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div><span className="text-sm text-gray-500 dark:text-gray-400">Email:</span><p className="font-medium text-gray-900 dark:text-white">{selectedCustomer.email}</p></div>
                  <div><span className="text-sm text-gray-500 dark:text-gray-400">Phone:</span><p className="font-medium text-gray-900 dark:text-white">{selectedCustomer.phone || '-'}</p></div>
                  <div><span className="text-sm text-gray-500 dark:text-gray-400">Address:</span><p className="font-medium text-gray-900 dark:text-white">{selectedCustomer.address || '-'}, {selectedCustomer.city || ''} {selectedCustomer.postal_code || ''}</p></div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Payment Details</h3>
                <div className="space-y-3">
                  <div><span className="text-sm text-gray-500 dark:text-gray-400">Payment Terms:</span><p className="font-medium text-gray-900 dark:text-white">{selectedCustomer.payment_terms || 'Net 30'}</p></div>
                  <div><span className="text-sm text-gray-500 dark:text-gray-400">Credit Limit:</span><p className="font-medium text-gray-900 dark:text-white">R {(selectedCustomer.credit_limit || 0).toLocaleString()}</p></div>
                  <div><span className="text-sm text-gray-500 dark:text-gray-400">VAT Number:</span><p className="font-medium text-gray-900 dark:text-white">{selectedCustomer.tax_number || '-'}</p></div>
                </div>
              </div>
            </div>

            {customerTransactions.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Recent Transactions</h3>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Number</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {customerTransactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm capitalize text-gray-900 dark:text-white">{txn.type.replace('_', ' ')}</td>
                          <td className="px-4 py-3 text-sm font-medium text-cyan-600 dark:text-cyan-400">{txn.number}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(txn.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">R {txn.amount.toLocaleString()}</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">{txn.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Customers</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your customer database</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => loadCustomers()} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleCreate} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/30">
              <Plus className="h-5 w-5" />New Customer
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl shadow-lg shadow-cyan-500/30"><Users className="h-6 w-6 text-white" /></div>
              <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Customers</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30"><CheckCircle className="h-6 w-6 text-white" /></div>
              <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p><p className="text-sm text-gray-500 dark:text-gray-400">Active</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg shadow-gray-500/30"><Building2 className="h-6 w-6 text-white" /></div>
              <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inactive}</p><p className="text-sm text-gray-500 dark:text-gray-400">Inactive</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30"><TrendingUp className="h-6 w-6 text-white" /></div>
              <div><p className="text-2xl font-bold text-gray-900 dark:text-white">R {stats.totalCredit.toLocaleString()}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Credit</p></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" placeholder="Search by name, email, or code..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all min-w-[180px]">
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-cyan-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading customers...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Users className="h-8 w-8 text-gray-400" /></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No customers found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">{searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by adding your first customer'}</p>
              {!searchTerm && statusFilter === 'all' && (
                <button onClick={handleCreate} className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-blue-700 transition-all">Add First Customer</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Terms</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credit Limit</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div><p className="font-semibold text-gray-900 dark:text-white">{customer.name}</p><p className="text-sm text-gray-500 dark:text-gray-400">{customer.code}</p></div>
                      </td>
                      <td className="px-6 py-4">
                        <div><p className="text-gray-900 dark:text-white">{customer.email}</p>{customer.phone && (<p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</p>)}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{customer.payment_terms || 'Net 30'}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">R {(customer.credit_limit || 0).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${customer.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>{customer.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleViewDetail(customer)} className="p-2 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg transition-colors"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => handleEdit(customer)} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(customer)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
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

      {renderFormModal(false)}
      {renderFormModal(true)}
      {renderDetailModal()}

      <ConfirmDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={confirmDelete} title="Delete Customer" message={`Are you sure you want to delete ${selectedCustomer?.name}? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  );
}
