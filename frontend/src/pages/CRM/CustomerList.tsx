import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Building2, X, Edit2, Trash2, RefreshCw, AlertCircle, DollarSign, CheckCircle } from 'lucide-react';
import { formatCurrency, formatPhoneNumber } from '../../utils/formatters';

interface Customer {
  id: number;
  customer_code: string;
  customer_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  bbbee_level: number | null;
  credit_limit: number;
  is_active: boolean;
}

interface FormData {
  customer_name: string;
  contact_person: string;
  email: string;
  phone: string;
  bbbee_level: number;
  credit_limit: number;
}

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<FormData>({
    customer_name: '',
    contact_person: '',
    email: '',
    phone: '',
    bbbee_level: 4,
    credit_limit: 50000
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://aria.vantax.co.za/api/customers');
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      contact_person: '',
      email: '',
      phone: '',
      bbbee_level: 4,
      credit_limit: 50000
    });
    setEditingCustomer(null);
    setError(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      customer_name: customer.customer_name,
      contact_person: customer.contact_person || '',
      email: customer.email || '',
      phone: customer.phone || '',
      bbbee_level: customer.bbbee_level || 4,
      credit_limit: customer.credit_limit
    });
    setShowModal(true);
  };

  const handleDelete = async (customerId: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await fetch(`https://aria.vantax.co.za/api/customers/${customerId}`, {
        method: 'DELETE'
      });
      fetchCustomers();
    } catch (error) {
      setError('Failed to delete customer');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCustomer 
        ? `https://aria.vantax.co.za/api/customers/${editingCustomer.id}`
        : 'https://aria.vantax.co.za/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      setShowModal(false);
      resetForm();
      fetchCustomers();
    } catch (error) {
      setError('Failed to save customer');
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBBBEEBadge = (level: number | null) => {
    if (!level) return <span className="text-gray-400 text-sm">N/A</span>;
    const colors = ['bg-green-100 text-green-800', 'bg-blue-100 text-blue-800', 'bg-yellow-100 text-yellow-800', 'bg-orange-100 text-orange-800'];
    const colorClass = colors[Math.min(level - 1, 3)] || 'bg-gray-100 text-gray-800';
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>Level {level}</span>;
  };

  const stats = { total: customers.length, active: customers.filter(c => c.is_active).length, totalCredit: customers.reduce((sum, c) => sum + c.credit_limit, 0) };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div><h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Customers</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Manage your customer database</p></div>
          <div className="flex items-center gap-3">
            <button onClick={fetchCustomers} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={handleCreate} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/30"><Plus className="h-5 w-5" />New Customer</button>
          </div>
        </div>
        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4 text-red-500" /></button></div>)}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl shadow-lg shadow-cyan-500/30"><Users className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Customers</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30"><CheckCircle className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p><p className="text-sm text-gray-500 dark:text-gray-400">Active Customers</p></div></div></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl shadow-lg shadow-purple-500/30"><DollarSign className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats.totalCredit)}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Credit Limit</p></div></div></div>
        </div>
        <div className="relative"><Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" /><input type="text" placeholder="Search customers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500" /></div>
        {showModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}><div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"><div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-6"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Users className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">{editingCustomer ? 'Edit Customer' : 'New Customer'}</h2></div></div><button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-lg"><X className="h-5 w-5" /></button></div></div><form onSubmit={handleSubmit} className="p-6 space-y-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Name *</label><input type="text" required value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Person</label><input type="text" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label><input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500" /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">BBBEE Level</label><select value={formData.bbbee_level} onChange={(e) => setFormData({ ...formData, bbbee_level: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"><option value={1}>Level 1</option><option value={2}>Level 2</option><option value={3}>Level 3</option><option value={4}>Level 4</option><option value={5}>Level 5</option><option value={6}>Level 6</option><option value={7}>Level 7</option><option value={8}>Level 8</option></select></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Credit Limit</label><input type="number" value={formData.credit_limit} onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500" /></div></div><div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button><button type="submit" className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-700 hover:to-blue-700 shadow-lg shadow-cyan-500/30">{editingCustomer ? 'Update' : 'Create'}</button></div></form></div></div>)}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (<div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-cyan-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>) : filteredCustomers.length === 0 ? (<div className="p-12 text-center"><Users className="h-8 w-8 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No customers found</h3><button onClick={handleCreate} className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium">New Customer</button></div>) : (
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Code</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Customer Name</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Contact</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Email</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Phone</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">BBBEE</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Credit Limit</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{filteredCustomers.map((customer) => (<tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-6 py-4"><Link to={`/crm/customers/${customer.id}`} className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium">{customer.customer_code}</Link></td><td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{customer.customer_name}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{customer.contact_person || '-'}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{customer.email || '-'}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{customer.phone ? formatPhoneNumber(customer.phone) : '-'}</td><td className="px-6 py-4">{getBBBEEBadge(customer.bbbee_level)}</td><td className="px-6 py-4 text-right font-semibold text-cyan-600 dark:text-cyan-400">{formatCurrency(customer.credit_limit)}</td><td className="px-6 py-4 text-right flex items-center justify-end gap-1"><Link to={`/crm/customers/${customer.id}`} className="p-2 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 rounded-lg text-cyan-600 dark:text-cyan-400 text-sm font-medium">View</Link><button onClick={() => handleEdit(customer)} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"><Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /></button><button onClick={() => handleDelete(customer.id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" /></button></td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
