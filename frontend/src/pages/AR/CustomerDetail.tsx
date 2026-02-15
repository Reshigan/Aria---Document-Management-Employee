import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Users, ArrowLeft, Edit, Mail, Phone, MapPin, Building2, 
  DollarSign, FileText, ShoppingCart, Package, Clock, CheckCircle,
  AlertCircle, TrendingUp
} from 'lucide-react';
import api from '../../lib/api';

interface Customer {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  city?: string;
  country?: string;
  credit_limit?: number;
  payment_terms?: string;
  is_active: boolean;
  created_at: string;
}

interface Transaction {
  id: string;
  number: string;
  date: string;
  total: number;
  status: string;
  type: 'quote' | 'order' | 'invoice' | 'receipt';
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'invoices'>('overview');
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    outstandingBalance: 0,
    avgOrderValue: 0
  });

  useEffect(() => {
    if (id) {
      loadCustomer();
      loadTransactions();
    }
  }, [id]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/erp/master-data/customers/${id}`);
      setCustomer(response.data);
    } catch (error) {
      console.error('Error loading customer:', error);
      // Try to find customer from list if direct fetch fails
      try {
        const listResponse = await api.get('/erp/master-data/customers');
        const customers = listResponse.data?.data || listResponse.data || [];
        const found = customers.find((c: Customer) => c.id === id);
        if (found) setCustomer(found);
      } catch (e) {
        console.error('Error loading customer from list:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      // Load quotes, orders, and invoices for this customer
      const [quotesRes, ordersRes, invoicesRes] = await Promise.allSettled([
        api.get(`/erp/order-to-cash/quotes?customer_id=${id}`),
        api.get(`/erp/order-to-cash/sales-orders?customer_id=${id}`),
        api.get(`/ar/invoices?customer_id=${id}`)
      ]);

      const allTransactions: Transaction[] = [];
      let totalRevenue = 0;
      let totalOrders = 0;

      if (quotesRes.status === 'fulfilled') {
        const quotes = quotesRes.value.data?.data || quotesRes.value.data || [];
        quotes.forEach((q: any) => {
          allTransactions.push({
            id: q.id,
            number: q.quote_number || q.id,
            date: q.quote_date || q.created_at,
            total: q.total_amount || 0,
            status: q.status,
            type: 'quote'
          });
        });
      }

      if (ordersRes.status === 'fulfilled') {
        const orders = ordersRes.value.data?.data || ordersRes.value.data || [];
        orders.forEach((o: any) => {
          allTransactions.push({
            id: o.id,
            number: o.order_number || o.id,
            date: o.order_date || o.created_at,
            total: o.total_amount || 0,
            status: o.status,
            type: 'order'
          });
          totalOrders++;
          totalRevenue += o.total_amount || 0;
        });
      }

      if (invoicesRes.status === 'fulfilled') {
        const invoices = invoicesRes.value.data?.data || invoicesRes.value.data || [];
        invoices.forEach((i: any) => {
          allTransactions.push({
            id: i.id,
            number: i.invoice_number || i.id,
            date: i.invoice_date || i.created_at,
            total: i.total_amount || 0,
            status: i.status,
            type: 'invoice'
          });
        });
      }

      // Sort by date descending
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(allTransactions);

      setStats({
        totalOrders,
        totalRevenue,
        outstandingBalance: allTransactions
          .filter(t => t.type === 'invoice' && t.status !== 'paid')
          .reduce((sum, t) => sum + t.total, 0),
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
      });
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  const getStatusBadge = (status: string, type: string) => {
    const statusColors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
      overdue: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
    };
    return statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quote': return <FileText className="h-4 w-4" />;
      case 'order': return <ShoppingCart className="h-4 w-4" />;
      case 'invoice': return <DollarSign className="h-4 w-4" />;
      case 'receipt': return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-indigo-500 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-500 dark:text-gray-400">Loading customer...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Customer Not Found</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">The customer you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/ar/customers')}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/ar/customers')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl ">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{customer.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">Customer Code: {customer.code}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${customer.is_active ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'}`}>
              {customer.is_active ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={() => navigate(`/ar/customers?edit=${customer.id}`)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all  flex items-center gap-2 font-medium"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl ">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalOrders}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Orders</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl ">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl ">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.outstandingBalance)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl ">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.avgOrderValue)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Order Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['overview', 'transactions'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab
                ? 'bg-indigo-500 text-white '
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              Contact Information
            </h3>
            <div className="space-y-4">
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-gray-900 dark:text-white">{customer.email}</p>
                  </div>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="text-gray-900 dark:text-white">{customer.phone}</p>
                  </div>
                </div>
              )}
              {(customer.address_line1 || customer.city || customer.country) && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                    <p className="text-gray-900 dark:text-white">
                      {[customer.address_line1, customer.city, customer.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Financial Information
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Credit Limit</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(customer.credit_limit || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Payment Terms</span>
                <span className="font-semibold text-gray-900 dark:text-white">{customer.payment_terms || 'Net 30'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Available Credit</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency((customer.credit_limit || 0) - stats.outstandingBalance)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500 dark:text-gray-400">Customer Since</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatDate(customer.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No transactions yet</h3>
              <p className="text-gray-500 dark:text-gray-400">This customer doesn't have any transactions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Number</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((transaction) => (
                    <tr key={`${transaction.type}-${transaction.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-lg ${
                            transaction.type === 'quote' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' :
                            transaction.type === 'order' ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' :
                            'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                          }`}>
                            {getTypeIcon(transaction.type)}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{transaction.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-indigo-600 dark:text-indigo-400 font-medium">{transaction.number}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(transaction.date)}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-gray-900 dark:text-white">{formatCurrency(transaction.total)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusBadge(transaction.status, transaction.type)}`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
