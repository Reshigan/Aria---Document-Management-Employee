import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { LineItemsTable, LineItem } from '../../components/LineItemsTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Eye, Edit, Trash2, Check, Send, X, FileText, RefreshCw, FileCheck, Clock, CheckCircle, AlertCircle, TrendingUp, Download, Printer, Mail, ArrowRight } from 'lucide-react';
import { documentGenerationService, auditTrailService, emailNotificationService, workflowService } from '../../services';

interface Quote {
  id: string;
  quote_number: string;
  customer_email: string;
  customer_name: string;
  quote_date: string;
  valid_until: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
  warehouse_id?: string;
  customer_id?: string;
  lines?: LineItem[];
}

interface Product {
  id: string;
  code: string;
  name: string;
  selling_price: number;
  unit_of_measure: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  pricelist_id?: string;
}

interface Pricelist {
  id: string;
  name: string;
  currency: string;
}

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPricelistId, setSelectedPricelistId] = useState<string>('');
  const [formData, setFormData] = useState<Partial<Quote>>({
    customer_name: '',
    customer_email: '',
    quote_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    status: 'draft'
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuotes();
    loadProducts();
    loadCustomers();
    loadPricelists();
  }, [searchTerm, statusFilter]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      
      const response = await api.get('/erp/order-to-cash/quotes', { params });
      const data = response.data?.data || response.data || [];
      setQuotes(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading quotes:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get('/erp/order-to-cash/products');
      const data = response.data?.data || response.data || [];
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.get('/erp/order-to-cash/customers');
      const data = response.data?.data || response.data || [];
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  };

  const loadPricelists = async () => {
    try {
      const response = await api.get('/pricing/pricelists');
      const data = response.data?.data || response.data || [];
      setPricelists(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading pricelists:', err);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customer_id: customerId,
        customer_name: customer.name,
        customer_email: customer.email
      });
      if (customer.pricelist_id) {
        setSelectedPricelistId(customer.pricelist_id);
      }
    }
  };

  const handleCreate = () => {
    setFormData({
      customer_name: '',
      customer_email: '',
      quote_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
      status: 'draft'
    });
    setSelectedCustomerId('');
    setSelectedPricelistId('');
    setLineItems([]);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (lineItems.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    if (!formData.customer_name) {
      setError('Please select a customer');
      return;
    }

    try {
      const payload = {
        ...formData,
        lines: lineItems.map((item, index) => ({
          line_number: index + 1,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          tax_rate: item.tax_rate
        }))
      };

      await api.post('/erp/order-to-cash/quotes', payload);
      loadQuotes();
      setShowCreateModal(false);
      setError(null);
    } catch (err: unknown) {
      console.error('Error creating quote:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to create quote');
    }
  };

  const approveQuote = async (quoteId: string) => {
    try {
      await api.post(`/erp/order-to-cash/quotes/${quoteId}/approve`);
      loadQuotes();
    } catch (err: unknown) {
      console.error('Error approving quote:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to approve quote');
    }
  };

  const sendQuote = async (quoteId: string) => {
    try {
      await api.post(`/erp/order-to-cash/quotes/${quoteId}/send`);
      loadQuotes();
    } catch (err: unknown) {
      console.error('Error sending quote:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to send quote');
    }
  };

    const acceptQuote = async (quoteId: string) => {
      try {
        const response = await api.post(`/erp/order-to-cash/quotes/${quoteId}/accept`);
        await auditTrailService.log({
          eventType: 'status_change',
          resourceType: 'quote',
          resourceId: quoteId,
          description: `Quote accepted and converted to Sales Order ${response.data.sales_order_number}`
        });
        alert(`Quote accepted! Sales Order ${response.data.sales_order_number} created.`);
        loadQuotes();
      } catch (err: unknown) {
        console.error('Error accepting quote:', err);
        const error = err as { response?: { data?: { detail?: string } } };
        setError(error.response?.data?.detail || 'Failed to accept quote');
      }
    };

    const handleDownloadPDF = async (quote: Quote) => {
      try {
        const documentData = {
          id: quote.id,
          number: quote.quote_number,
          date: quote.quote_date,
          validUntil: quote.valid_until,
          customer: {
            name: quote.customer_name || '',
            email: quote.customer_email || ''
          },
          items: (quote.lines || []).map(line => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unit_price,
            total: line.quantity * line.unit_price
          })),
          subtotal: quote.subtotal,
          tax: quote.tax_amount,
          total: quote.total_amount,
          notes: quote.notes
        };
        await documentGenerationService.downloadDocument('quote', documentData, `Quote-${quote.quote_number}.pdf`);
        await auditTrailService.log({
          eventType: 'export',
          resourceType: 'quote',
          resourceId: quote.id,
          description: `Quote ${quote.quote_number} downloaded as PDF`
        });
      } catch (err) {
        console.error('Error downloading PDF:', err);
        setError('Failed to download PDF');
      }
    };

    const handlePrintQuote = async (quote: Quote) => {
      try {
        const documentData = {
          id: quote.id,
          number: quote.quote_number,
          date: quote.quote_date,
          validUntil: quote.valid_until,
          customer: {
            name: quote.customer_name || '',
            email: quote.customer_email || ''
          },
          items: (quote.lines || []).map(line => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unit_price,
            total: line.quantity * line.unit_price
          })),
          subtotal: quote.subtotal,
          tax: quote.tax_amount,
          total: quote.total_amount,
          notes: quote.notes
        };
        await documentGenerationService.printDocument('quote', documentData);
        await auditTrailService.log({
          eventType: 'view',
          resourceType: 'quote',
          resourceId: quote.id,
          description: `Quote ${quote.quote_number} printed`
        });
      } catch (err) {
        console.error('Error printing quote:', err);
        setError('Failed to print quote');
      }
    };

    const handleEmailQuote = async (quote: Quote) => {
      if (!quote.customer_email) {
        setError('No customer email address available');
        return;
      }
      try {
        await emailNotificationService.sendQuoteEmail(quote.id, [quote.customer_email]);
        await auditTrailService.log({
          eventType: 'email_sent',
          resourceType: 'quote',
          resourceId: quote.id,
          description: `Quote ${quote.quote_number} emailed to ${quote.customer_email}`
        });
        alert(`Quote emailed to ${quote.customer_email}!`);
      } catch (err) {
        console.error('Error emailing quote:', err);
        setError('Failed to email quote');
      }
    };

    const handleConvertToOrder = async (quote: Quote) => {
      try {
        const result = await workflowService.convertQuoteToOrder(quote.id);
        await auditTrailService.log({
          eventType: 'workflow_completed',
          resourceType: 'quote',
          resourceId: quote.id,
          description: `Quote ${quote.quote_number} converted to Sales Order`
        });
        alert(`Quote converted to Sales Order successfully!`);
        loadQuotes();
      } catch (err) {
        console.error('Error converting quote to order:', err);
        setError('Failed to convert quote to order');
      }
    };

    const getStatusConfig= (status: string) => {
    const configs: Record<string, { bg: string; text: string; border: string }> = {
      draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
      approved: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
      sent: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
      accepted: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
      rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
      expired: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' }
    };
    return configs[status] || configs.draft;
  };

  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === 'draft').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    totalValue: quotes.reduce((sum, q) => sum + q.total_amount, 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-violet-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Quotes</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage customer quotes and convert to sales orders</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => loadQuotes()} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleCreate} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/30">
              <Plus className="h-5 w-5" />New Quote
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
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-violet-500/30"><FileCheck className="h-6 w-6 text-white" /></div>
              <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Quotes</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg shadow-gray-500/30"><Clock className="h-6 w-6 text-white" /></div>
              <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.draft}</p><p className="text-sm text-gray-500 dark:text-gray-400">Draft</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30"><Send className="h-6 w-6 text-white" /></div>
              <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.sent}</p><p className="text-sm text-gray-500 dark:text-gray-400">Sent</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30"><TrendingUp className="h-6 w-6 text-white" /></div>
              <div><p className="text-2xl font-bold text-gray-900 dark:text-white">R {stats.totalValue.toLocaleString()}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" placeholder="Search by customer, quote number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all min-w-[180px]">
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-violet-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading quotes...</p>
            </div>
          ) : quotes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileCheck className="h-8 w-8 text-gray-400" /></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No quotes found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">{searchTerm || statusFilter ? 'Try adjusting your filters' : 'Get started by creating your first quote'}</p>
              {!searchTerm && !statusFilter && (
                <button onClick={handleCreate} className="px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all">Create First Quote</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quote #</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valid Until</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {quotes.map((quote) => {
                    const statusConfig = getStatusConfig(quote.status);
                    return (
                      <tr key={quote.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <Link to={`/quotes/${quote.id}`} className="font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300">{quote.quote_number}</Link>
                        </td>
                        <td className="px-6 py-4">
                          <div><p className="font-medium text-gray-900 dark:text-white">{quote.customer_name || '-'}</p>{quote.customer_email && (<p className="text-sm text-gray-500 dark:text-gray-400">{quote.customer_email}</p>)}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(quote.quote_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">R {quote.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border} capitalize`}>{quote.status}</span>
                        </td>
                        <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                      <button onClick={() => handleDownloadPDF(quote)} title="Download PDF" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"><Download className="h-4 w-4" /></button>
                                                      <button onClick={() => handlePrintQuote(quote)} title="Print" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"><Printer className="h-4 w-4" /></button>
                                                      {quote.customer_email && (
                                                        <button onClick={() => handleEmailQuote(quote)} title="Email Quote" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"><Mail className="h-4 w-4" /></button>
                                                      )}
                                                      {quote.status === 'draft' && (
                                                        <button onClick={() => approveQuote(quote.id)} className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-xs font-medium hover:from-blue-600 hover:to-indigo-600 transition-all"><Check className="h-3.5 w-3.5" />Approve</button>
                                                      )}
                                                      {quote.status === 'approved' && (
                                                        <button onClick={() => sendQuote(quote.id)} className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-xs font-medium hover:from-amber-600 hover:to-orange-600 transition-all"><Send className="h-3.5 w-3.5" />Send</button>
                                                      )}
                                                      {quote.status === 'sent' && (
                                                        <>
                                                          <button onClick={() => acceptQuote(quote.id)} className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-xs font-medium hover:from-green-600 hover:to-emerald-600 transition-all"><CheckCircle className="h-3.5 w-3.5" />Accept</button>
                                                          <button onClick={() => handleConvertToOrder(quote)} title="Convert to Sales Order" className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-lg text-xs font-medium hover:from-purple-600 hover:to-violet-600 transition-all"><ArrowRight className="h-3.5 w-3.5" />To Order</button>
                                                        </>
                                                      )}
                                                    </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg"><FileCheck className="h-6 w-6" /></div>
                  <div>
                    <h2 className="text-xl font-semibold">Create Quote</h2>
                    <p className="text-white/80 text-sm">Fill in the details below</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
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
                    <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs">1</span>
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer *</label>
                      <select value={selectedCustomerId} onChange={(e) => handleCustomerChange(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all">
                        <option value="">Select a customer...</option>
                        {customers.map(customer => (<option key={customer.id} value={customer.id}>{customer.name} ({customer.email})</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pricelist</label>
                      <select value={selectedPricelistId} onChange={(e) => setSelectedPricelistId(e.target.value)} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all">
                        <option value="">Default pricing</option>
                        {pricelists.map(pricelist => (<option key={pricelist.id} value={pricelist.id}>{pricelist.name} ({pricelist.currency})</option>))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs">2</span>
                    Quote Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quote Date *</label>
                      <input type="date" value={formData.quote_date || ''} onChange={(e) => setFormData({ ...formData, quote_date: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Valid Until</label>
                      <input type="date" value={formData.valid_until || ''} onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                    <textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none" placeholder="Add any notes..." />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs">3</span>
                    Line Items
                  </h3>
                  <LineItemsTable items={lineItems} onChange={setLineItems} products={products} pricingContext={{ customer_id: selectedCustomerId || undefined, pricelist_id: selectedPricelistId || undefined, date: formData.quote_date }} />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/30">Create Quote</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
